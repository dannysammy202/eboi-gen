import type { GoogleGenAI } from "@google/genai";

/**
 * Resilient structured-output calls for Eboi Studio.
 *
 * Gemini 503/5xx/short-term 429 errors are transient. Try once more with a
 * short exponential backoff, then fail over to a different supported model.
 * Never send raw Google API errors or any key information to the browser.
 */
export class StudioGeminiError extends Error {
  constructor(
    public readonly kind: "busy" | "quota" | "configuration" | "invalid" | "unknown",
    message: string,
  ) {
    super(message);
    this.name = "StudioGeminiError";
  }
}

const STABLE_MODELS = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"];

export function geminiModels(): string[] {
  const configured = process.env.GEMINI_MODEL?.trim();
  // A configured model has priority, but the app has independently supported
  // fallbacks. The old default 3.7 is deprecated and isn't used as a default.
  return [...new Set([configured, ...STABLE_MODELS].filter((s): s is string => Boolean(s)))];
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try { return JSON.stringify(error); } catch { return ""; }
}

function errorStatus(error: unknown): number | undefined {
  if (error && typeof error === "object") {
    const candidate = error as Record<string, unknown>;
    for (const field of ["code", "statusCode", "httpStatus"]) {
      const statusValue = candidate[field];
      if (typeof statusValue === "number") return statusValue;
    }
  }
  const message = errorMessage(error);
  const jsonCode = message.match(/"code"\s*:\s*(\d{3})/);
  if (jsonCode) return Number(jsonCode[1]);
  const prefixCode = message.match(/(?:^|\D)(400|401|403|404|429|500|502|503|504)(?:\D|$)/);
  return prefixCode ? Number(prefixCode[1]) : undefined;
}

function classify(error: unknown): "retry" | "quota" | "configuration" | "unavailable" | "unknown" {
  const message = errorMessage(error).toLowerCase();
  const status = errorStatus(error);
  if (status === 401 || status === 403 || /invalid api key|api key not valid|permission denied/.test(message)) return "configuration";
  if (status === 429 && /quota[_ ]exceeded|daily quota|billing|spending limit/.test(message)) return "quota";
  if (status === 404 || /model.*not found|model.*not supported/.test(message)) return "unavailable";
  if ([429, 500, 502, 503, 504].includes(status ?? 0) || /high demand|overloaded|temporarily unavailable|service unavailable|rate limit|timeout|timed out/.test(message)) return "retry";
  return "unknown";
}

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export async function generateStudioJson<T>(args: {
  ai: GoogleGenAI;
  prompt: string;
  maxOutputTokens: number;
  temperature?: number;
  validate: (parsed: unknown) => T | null;
}): Promise<{ value: T; model: string }> {
  let encounteredBusy = false;
  let encounteredInvalid = false;
  let lastUnknown: unknown;

  for (const model of geminiModels()) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await args.ai.models.generateContent({
          model,
          contents: args.prompt,
          config: {
            responseMimeType: "application/json",
            maxOutputTokens: args.maxOutputTokens,
            ...(args.temperature === undefined ? {} : { temperature: args.temperature }),
          },
        });
        const raw = response.text?.trim();
        if (!raw) { encounteredInvalid = true; break; }

        let parsed: unknown;
        try { parsed = JSON.parse(raw); }
        catch { encounteredInvalid = true; break; }

        const validated = args.validate(parsed);
        if (validated === null) { encounteredInvalid = true; break; }
        return { value: validated, model };
      } catch (error) {
        const type = classify(error);
        if (type === "configuration") {
          console.error("Eboi Studio Gemini: configuration or permission failure", { model, status: errorStatus(error) });
          throw new StudioGeminiError("configuration", "The AI service needs an administrator to check its configuration.");
        }
        if (type === "quota") {
          console.warn("Eboi Studio Gemini: quota exhausted", { model, status: errorStatus(error) });
          throw new StudioGeminiError("quota", "The AI service has reached its usage limit. Please try again after the limit resets.");
        }
        if (type === "retry") {
          encounteredBusy = true;
          console.warn("Eboi Studio Gemini: transient error, trying another attempt/model", { model, attempt, status: errorStatus(error) });
          if (attempt === 0) {
            await wait(550 + Math.floor(Math.random() * 300));
            continue;
          }
          break;
        }
        if (type === "unavailable") {
          console.warn("Eboi Studio Gemini: model unavailable, trying fallback", { model, status: errorStatus(error) });
          break;
        }
        lastUnknown = error;
        console.error("Eboi Studio Gemini: unexpected generation error", { model, status: errorStatus(error), message: errorMessage(error).slice(0, 180) });
        break;
      }
    }
  }

  if (encounteredBusy) throw new StudioGeminiError("busy", "Gemini is busy at the moment. Please try again shortly.");
  if (encounteredInvalid) throw new StudioGeminiError("invalid", "The AI response was incomplete. Please try again.");
  console.error("Eboi Studio Gemini: no supported model completed the request", { status: errorStatus(lastUnknown) });
  throw new StudioGeminiError("unknown", "The AI service is unavailable right now. Please try again later.");
}

export function studioGeminiResponse(error: unknown) {
  if (error instanceof StudioGeminiError) {
    const status = error.kind === "quota" ? 429
      : error.kind === "invalid" ? 502
      : error.kind === "configuration" ? 503
      : 503;
    return { status, body: { error: error.message, kind: error.kind, retryable: error.kind === "busy" || error.kind === "invalid" } };
  }
  console.error("Eboi Studio Gemini: unexpected request failure", error);
  return { status: 500, body: { error: "Something went wrong while processing your request. Please try again.", kind: "unknown", retryable: false } };
}

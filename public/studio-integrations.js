/* Eboi Studio production integration. Recording/mixing remain in BandLab. */
(()=>{"use strict";
const $=(s,p=document)=>p.querySelector(s), $$=(s,p=document)=>[...p.querySelectorAll(s)];
const storageKey="eboi-studio-prototype-b03", projectsKey="eboi-studio-projects-v1", activeKey="eboi-studio-active-project-v1";
const read=(k,fallback)=>{try{return JSON.parse(localStorage.getItem(k)||"null")??fallback}catch{return fallback}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
const esc=(s)=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const button=(label,click,cls="btn ghost")=>{const b=document.createElement("button");b.type="button";b.className=cls;b.textContent=label;b.addEventListener("click",click);return b;};
const show=(message,kind="ok")=>{let bar=$("#integration-toast");if(!bar){bar=document.createElement("div");bar.id="integration-toast";bar.setAttribute("role","status");document.body.append(bar)}bar.textContent=message;bar.dataset.kind=kind;bar.classList.add("show");clearTimeout(window.__integrationTimer);window.__integrationTimer=setTimeout(()=>bar.classList.remove("show"),4500)};
const loadButton=(b,on,label)=>{if(!b)return;b.disabled=on;b.textContent=on?"Working with Gemini...":label};
const request=async(url,payload,audio=false)=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),55000);try{const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),signal:controller.signal});if(!r.ok){const err=await r.json().catch(()=>({error:"Request failed."}));throw new Error(typeof err.error==="string"?err.error:"The AI service is temporarily unavailable. Please try again.")}return audio?r.blob():r.json()}finally{clearTimeout(timer)}};
const settings=()=>read("eboi-studio-prototype-b03",{});
const title=()=>$("#idea-title")?.value?.trim()||$("#release-title")?.value?.trim()||"Untitled song";
const genre=(id,fallback)=>$("#"+id+" .ui-picker-single")?.textContent?.trim()||$("#"+id+" .ui-picker-value")?.textContent?.trim()||fallback;
const feels=(id)=>$$("#"+id+" .ui-picker-chip").map(x=>x.textContent.trim());
const bpm=()=>Number($("#idea-bpm")?.value)||136;
const go=(name)=>{const b=$('.sidebar [data-page="'+name+'"]:not([data-tab])');b?.click()};
const openTab=(tab)=>{$('.sidebar [data-page="workspace"][data-tab="'+tab+'"]')?.click()};
const statusPanel=(target)=>{let b=$(".studio-integration-status",target);if(!b){b=document.createElement("div");b.className="studio-integration-status";b.setAttribute("role","status");target.appendChild(b)}return b};
function confirmStudio(heading,detail,action,onConfirm){const overlay=document.createElement("div");overlay.className="integration-modal";overlay.setAttribute("role","presentation");overlay.innerHTML='<div class="integration-dialog" role="dialog" aria-modal="true" aria-labelledby="integration-modal-title"><h2 id="integration-modal-title"></h2><p></p><div class="row-buttons" style="justify-content:flex-end;margin-top:20px"></div></div>';$(".integration-dialog h2",overlay).textContent=heading;$(".integration-dialog p",overlay).textContent=detail;const controls=$(".row-buttons",overlay),close=()=>overlay.remove();controls.append(button("Cancel",close),button(action,()=>{close();onConfirm()},"btn primary"));overlay.addEventListener("pointerdown",e=>{if(e.target===overlay)close()});document.body.append(overlay);$(".integration-dialog button",overlay)?.focus();}
function plan(){const shape=window.eboiStructure?.()||{sections:[],bpm:bpm()};const db=settings();const d=db.director||{};return {title:title(),theme:$("#idea-about")?.value?.trim()||"Faith, purpose and real life in a melodic trap record.",bpm:bpm(),key:$("#studio-song-key")?.value||"F minor",sound:genre("idea-sound","Melodic trap"),feels:(localStorage.getItem("eboi-studio-scripture-ref")&&feels("scripture-feel").length)?feels("scripture-feel"):feels("idea-energy").length?feels("idea-energy"):["Smooth","Energetic"],scripture:localStorage.getItem("eboi-studio-scripture-ref")||"",sections:(shape.sections||[]).map(s=>({id:s.id,title:s.title,bars:s.bars,phrasing:d.phrasing?.[s.id]||2,delivery:d.delivery?.[s.id]||(s.id.startsWith("hook")?"Smooth melodic":"Rhythmic rap"),intent:d.intent?.[s.id]||""}))}};
function addSongKey(){const bpmField=$("#idea-bpm")?.closest(".field");if(!bpmField||$("#studio-song-key"))return;const keyField=document.createElement("div");keyField.className="field";keyField.innerHTML='<label for="studio-song-key">Key</label><input id="studio-song-key" value="F minor" placeholder="e.g. F minor" autocomplete="off">';bpmField.parentElement?.after(keyField);try{keyField.querySelector("input").value=sessionStorage.getItem("eboi-song-key")||"F minor"}catch{}keyField.querySelector("input").addEventListener("input",e=>sessionStorage.setItem("eboi-song-key",e.target.value));}

const studioRoots=["C","C#","D","Eb","E","F","F#","G","Ab","A","Bb","B"];
const studioKeys=studioRoots.flatMap(root=>[root+" minor",root+" major"]);
function chosenKey(fieldId="studio-song-key"){return $("#"+fieldId)?.value.trim()||"F minor";}
function syncKeyOnScreen(){
 const key=chosenKey();
 const spans=$$("#page-workspace .workspace-meta span");
 if(spans[3])spans[3].textContent=key;
 const beatInfo=$("#tab-beat .bpm-big span");if(beatInfo)beatInfo.textContent="BPM / "+key;
 const beatTag=$("#tab-beat .beat-hero .tag-row .tiny-tag");if(beatTag)beatTag.textContent=key;
 const chordTag=$("#tab-beat .beat-hero .tag-row .tiny-tag:nth-child(2)");
 if(chordTag)chordTag.textContent="Chords matched to key";
 const productionKey=$("#tab-production .mix-master span:last-child");if(productionKey)productionKey.textContent=key;
 $$("#page-workspace .detail, #tab-production .specrow").forEach(row=>{if(row.querySelector("span")?.textContent?.trim()==="Key"||row.querySelector("span")?.textContent?.trim()==="Key / Scale"){const val=row.querySelector("strong");if(val)val.textContent=key;}});
}
function selectStudioKey(value,fieldId="studio-song-key"){
 if(!studioKeys.includes(value))return;
 for(const id of ["studio-song-key","scripture-key"]){
  const input=$("#"+id);if(!input)continue;
  input.value=value;
  input.dispatchEvent(new Event("input",{bubbles:true}));
 }
 sessionStorage.setItem("eboi-song-key",value);
 syncKeyOnScreen();syncScriptureSummary();
 show("Musical key set to "+value+".");
}
function openKeyChooser(fieldId="studio-song-key"){
 const overlay=document.createElement("div");overlay.className="integration-modal";
 overlay.innerHTML='<div class="integration-dialog music-key-dialog" role="dialog" aria-modal="true" aria-labelledby="studio-key-title"><h2 id="studio-key-title">Choose a musical key</h2><p>Choose any major or minor key. You can also type another key into the field.</p><div class="music-key-tabs" role="group" aria-label="Key scale"><button type="button" class="btn primary" data-scale="minor">Minor</button><button type="button" class="btn ghost" data-scale="major">Major</button></div><div class="music-key-grid" id="music-key-grid"></div><div class="row-buttons" style="justify-content:flex-end;margin-top:18px"><button class="btn ghost" type="button" id="close-studio-key">Close</button></div></div>';
 const close=()=>overlay.remove();
 $("#close-studio-key",overlay).addEventListener("click",close);
 overlay.addEventListener("pointerdown",e=>{if(e.target===overlay)close()});
 const grid=$("#music-key-grid",overlay);
 const render=scale=>{grid.replaceChildren();$$("[data-scale]",overlay).forEach(b=>{const on=b.dataset.scale===scale;b.classList.toggle("primary",on);b.classList.toggle("ghost",!on);});
 for(const root of studioRoots){const value=root+" "+scale,option=button(value,()=>{selectStudioKey(value,fieldId);close()},"music-key-choice");option.setAttribute("aria-pressed",String(chosenKey(fieldId)===value));grid.append(option);}};
 $$("[data-scale]",overlay).forEach(b=>b.addEventListener("click",()=>render(b.dataset.scale)));
 document.body.append(overlay);render(chosenKey(fieldId).endsWith("major")?"major":"minor");$("#close-studio-key",overlay).focus();
}
function addMusicDirection(){
 const form=$("#idea-form"),bpmField=$("#idea-bpm")?.closest(".field"),keyInput=$("#studio-song-key");
 if(!form||!bpmField||!keyInput)return;
 const label=bpmField.querySelector("label");if(label)label.textContent="Tempo (BPM)";
 bpmField.insertAdjacentHTML("beforeend",'<p class="music-direction-help">Enter your tempo, or get a recommendation below.</p>');
 keyInput.addEventListener("input",()=>{sessionStorage.setItem("eboi-song-key",keyInput.value);syncKeyOnScreen();});
 const choose=button("Choose key",openKeyChooser,"btn ghost music-select-key");keyInput.after(choose);
 const box=document.createElement("section");box.className="studio-ai-tool music-direction";box.id="studio-music-direction";
 box.innerHTML='<div class="studio-ai-head"><strong>Tempo & musical key</strong><span>AI suggestions · Your choice</span></div><p class="music-direction-help">Recommendations are based on your song concept, sound and selected feelings. You can keep your own settings.</p><div class="row-buttons" id="music-direction-actions"></div><div class="studio-ai-results" id="music-direction-result" aria-live="polite"></div>';
 const proceed=form.querySelector('[data-page="structure"]');if(proceed)proceed.before(box);else form.append(box);
 const actions=$("#music-direction-actions",box),result=$("#music-direction-result",box);
 const recommend=button("Suggest tempo & key",async()=>{
  const songTitle=$("#idea-title")?.value.trim(),theme=$("#idea-about")?.value.trim();
  if(!songTitle&&!theme){show("Add a title or song concept first.","error");return;}
  loadButton(recommend,true);
  try{
   const d=await request("/api/studio/music-direction",{title:songTitle,theme,sound:genre("idea-sound","Melodic trap"),feels:feels("idea-energy")});
   result.replaceChildren();
   const card=document.createElement("div");card.className="studio-ai-result music-recommendation";
   const header=document.createElement("div");header.className="music-recommendation-top";
   const tempo=document.createElement("div");tempo.innerHTML='<small>Suggested tempo</small><strong></strong>';tempo.querySelector("strong").textContent=d.bpm+" BPM";
   const key=document.createElement("div");key.innerHTML='<small>Suggested key</small><strong></strong>';key.querySelector("strong").textContent=d.key;header.append(tempo,key);
   const reason=document.createElement("p");reason.textContent=d.reason;
   const controls=document.createElement("div");controls.className="row-buttons music-recommendation-buttons";
   const useTempo=button("Use "+d.bpm+" BPM",()=>{$("#idea-bpm").value=String(d.bpm);$("#idea-bpm").dispatchEvent(new Event("input",{bubbles:true}));show("Tempo updated to "+d.bpm+" BPM.")},"btn ghost");
   const useKey=button("Use "+d.key,()=>selectStudioKey(d.key),"btn ghost");
   const useBoth=button("Use both",()=>{$("#idea-bpm").value=String(d.bpm);$("#idea-bpm").dispatchEvent(new Event("input",{bubbles:true}));selectStudioKey(d.key)},"btn primary");
   controls.append(useTempo,useKey,useBoth);card.append(header,reason,controls);result.append(card);
  }catch(e){show(e.message||"Recommendations are unavailable. Choose your BPM and key manually.","error");}
  finally{loadButton(recommend,false,"Suggest tempo & key")}
 },"btn ghost");
 actions.append(recommend);
 syncKeyOnScreen();
}
function addLyricsAI(){
 const actions=$("#save-lyrics-v2")?.parentElement;if(!actions)return;
 const all=button("Generate full lyrics with AI",()=>generateLyrics(null),"btn primary");
 all.id="ai-lyrics-all";actions.prepend(all);
 const note=document.createElement("p");note.className="integration-note";
 note.textContent="Edit every song section on one page, or generate the complete arrangement with Gemini. Each section also has its own Generate button.";
 actions.parentElement?.append(note);
 window.eboiGenerateLyrics=(id)=>generateLyrics(id||null);
}
async function generateLyrics(sectionId){
 const data=plan();
 if(sectionId)data.sections=data.sections.filter(s=>s.id===sectionId);
 if(!data.sections.length){show("Set the song structure first.","error");return;}
 const buttonEl=sectionId?document.querySelector('[data-song-section="'+sectionId+'"] .full-lyric-section-actions button'):$("#ai-lyrics-all");
 const normal=buttonEl?.textContent||"Generate full lyrics with AI";
 const run=async()=>{
  loadButton(buttonEl,true);
  try{
   const result=await request("/api/studio/lyrics",data);
   if(!result.sections?.length)throw new Error("Gemini did not return any lyrics.");
   if(typeof window.eboiApplyGeneratedLyrics!=="function")throw new Error("The lyrics workspace is not ready.");
   window.eboiApplyGeneratedLyrics(result.sections);
   show("Generated "+result.sections.length+" song "+(result.sections.length===1?"section":"sections")+". Review the lyrics.");
  }catch(e){show(e.message||"Lyric generation failed.","error");}
  finally{if(buttonEl?.isConnected)loadButton(buttonEl,false,normal);}
 };
 confirmStudio("Generate "+(sectionId?"this section":"full song")+"?", "This will replace "+(sectionId?"the selected section":"all visible song sections")+" in this local draft. Save a version before proceeding if you want to keep your earlier lyrics.", "Generate", run);
}
function addThemeAI(){const form=$("#idea-form");if(!form)return;const anchor=$('[data-page="structure"]',form);if(!anchor)return;const box=document.createElement("div");box.className="studio-ai-tool";box.innerHTML='<div class="studio-ai-head"><strong>Need help shaping the song?</strong><span>Gemini theme ideas</span></div><div class="row-buttons" id="theme-ai-actions"></div><div class="studio-ai-results" id="theme-ai-results"></div>';anchor.before(box);$("#theme-ai-actions",box).append(button("Suggest 5 song concepts",async()=>{const r=$("#theme-ai-results"),b=$("#theme-ai-actions button");if(!$("#idea-title")?.value.trim()){show("Add a working title first.","error");return}loadButton(b,true);try{const result=await request("/api/themes",{title:title(),tempo:String(bpm()),sound:genre("idea-sound","Melodic Trap"),feels:feels("idea-energy")});r.replaceChildren();for(const item of result.themes||[]){const card=document.createElement("article");card.className="studio-ai-result";const strong=document.createElement("strong");strong.textContent=item.name;const p=document.createElement("p");p.textContent=item.theme;const pick=button("Use this direction",()=>{$("#idea-about").value=item.theme;show("Song direction applied.")},"btn ghost");card.append(strong,p,pick);r.append(card)}}catch(e){show(e.message||"Theme suggestions failed.","error")}finally{loadButton(b,false,"Suggest 5 song concepts")}},"btn ghost"));}

let scriptureConcept=null;
function syncScriptureSummary(){
 const tempo=Number($("#scripture-bpm")?.value)||Number($("#idea-bpm")?.value)||136;
 const key=$("#scripture-key")?.value.trim()||chosenKey();
 if($("#scripture-summary-tempo"))$("#scripture-summary-tempo").textContent=tempo+" BPM";
 if($("#scripture-summary-key"))$("#scripture-summary-key").textContent=key;
}
function applyScriptureSong(){
 if(!scriptureConcept){show("Analyse the Scripture passage first.","error");return false}
 const tempo=Number($("#scripture-bpm")?.value);
 if(!Number.isInteger(tempo)||tempo<50||tempo>220){show("Enter a tempo between 50 and 220 BPM.","error");$("#scripture-bpm")?.focus();return false}
 const key=$("#scripture-key")?.value.trim();
 if(!key){show("Choose a musical key.","error");$("#scripture-key")?.focus();return false}
 $("#idea-title").value=scriptureConcept.title;
 $("#idea-about").value=(scriptureConcept.concept+" "+scriptureConcept.theme).trim();
 $("#idea-bpm").value=String(tempo);
 $("#idea-bpm").dispatchEvent(new Event("input",{bubbles:true}));
 $("#studio-song-key").value=key;
 $("#studio-song-key").dispatchEvent(new Event("input",{bubbles:true}));
 $("#idea-form").style.display="grid";
 const picker=window.eboiPicker;
 if(picker){
  const feel=picker.get("scripture-feel"),sound=picker.get("scripture-sound");
  if(Array.isArray(feel)&&feel.length)picker.set("idea-energy",feel);
  if(typeof sound==="string")picker.set("idea-sound",sound);
 }
 localStorage.setItem("eboi-studio-scripture-ref",scriptureConcept.reference);
 syncKeyOnScreen();syncScriptureSummary();
 return true;
}
function addScriptureDirection(){
 const tempo=$("#scripture-bpm"),key=$("#scripture-key"),choose=$("#scripture-choose-key"),result=$("#scripture-recommendation-result"),recommend=$("#scripture-recommend");
 if(!tempo||!key||!recommend)return;
 const manual=$("#idea-bpm"),mainKey=$("#studio-song-key");
 const initialTempo=Number(manual?.value);
 tempo.value=Number.isInteger(initialTempo)&&initialTempo>=50&&initialTempo<=220?String(initialTempo):"136";
 key.value=mainKey?.value||"F minor";
 tempo.addEventListener("input",()=>{
  const n=Number(tempo.value);
  if(Number.isInteger(n)&&n>=50&&n<=220&&manual){manual.value=String(n);manual.dispatchEvent(new Event("input",{bubbles:true}));}
  syncScriptureSummary();
 });
 key.addEventListener("input",()=>{if(mainKey){mainKey.value=key.value;mainKey.dispatchEvent(new Event("input",{bubbles:true}));}syncScriptureSummary()});
 manual?.addEventListener("input",()=>{const n=Number(manual.value);if(Number.isInteger(n)&&n>=50&&n<=220)tempo.value=manual.value;syncScriptureSummary()});
 mainKey?.addEventListener("input",()=>{key.value=mainKey.value;syncScriptureSummary()});
 choose?.addEventListener("click",()=>openKeyChooser("scripture-key"));
 const exit=$("#concept-section [data-page='structure']");
 exit?.addEventListener("click",(event)=>{if(!applyScriptureSong()){event.preventDefault();event.stopImmediatePropagation();}},true);
 $("#concept-section").hidden=true;
 const clearAnalysis=()=>{scriptureConcept=null;$("#concept-section").hidden=true;const aside=$("#page-scripture .asidecard");if(aside)aside.hidden=true;$("#scripture-passage-placeholder")?.removeAttribute("hidden");$("#page-scripture .verse")?.setAttribute("hidden","");$("#scripture-ai-result")?.replaceChildren();};
 $("#theme-text")?.addEventListener("input",clearAnalysis);
 $("#verse-ref")?.addEventListener("input",clearAnalysis);
 $$("[data-smode]").forEach(el=>el.addEventListener("click",clearAnalysis));
 recommend.addEventListener("click",async()=>{
  const verse=$(".scripturemode [data-smode='verse']")?.classList.contains("active");
  const text=verse?$("#verse-ref")?.value.trim():$("#theme-text")?.value.trim();
  if(!text){show(verse?"Enter a Bible reference first.":"Describe the song theme first.","error");return}
  loadButton(recommend,true);
  try{
   const requestData={title:verse?"Song inspired by "+text:"Scripture-inspired song",
      theme:verse?"Use the theme and musical feeling of a song inspired by "+text+". Do not infer a specific musical key from Scripture alone.":text,
      sound:window.eboiPicker?.get("scripture-sound")||genre("scripture-sound","Melodic trap"),
      feels:window.eboiPicker?.get("scripture-feel")||feels("scripture-feel")};
   const d=await request("/api/studio/music-direction",requestData);
   result.replaceChildren();
   const card=document.createElement("div");card.className="studio-ai-result music-recommendation";
   const head=document.createElement("div");head.className="music-recommendation-top";
   for(const [label,value] of [["Suggested tempo",d.bpm+" BPM"],["Suggested key",d.key]]){
     const col=document.createElement("div"),small=document.createElement("small"),strong=document.createElement("strong");
     small.textContent=label;strong.textContent=value;col.append(small,strong);head.append(col);
   }
   const detail=document.createElement("p");detail.textContent=d.reason;
   const actions=document.createElement("div");actions.className="row-buttons music-recommendation-buttons";
   const applyTempo=()=>{tempo.value=String(d.bpm);tempo.dispatchEvent(new Event("input",{bubbles:true}));show("Tempo set to "+d.bpm+" BPM.")};
   const applyKey=()=>selectStudioKey(d.key,"scripture-key");
   actions.append(button("Use "+d.bpm+" BPM",applyTempo,"btn ghost"),button("Use "+d.key,applyKey,"btn ghost"),button("Use both",()=>{applyTempo();applyKey()},"btn primary"));
   card.append(head,detail,actions);result.append(card);
  }catch(e){show(e.message||"No recommendation is available. Use manual tempo and key.","error")}
  finally{loadButton(recommend,false,"Suggest tempo & key")}
 });
 syncScriptureSummary();
}
function addScriptureAI(){
 let primary=$("#passage-btn");if(!primary)return;
 const clean=primary.cloneNode(true);primary.replaceWith(clean);primary=clean;primary.disabled=true;primary.textContent="Analyse Scripture with Gemini";
 const out=document.createElement("div");out.id="scripture-ai-result";out.className="studio-ai-results";primary.after(out);
 const aside=$("#page-scripture .asidecard");
 primary.addEventListener("click",async()=>{
  const verse=$(".scripturemode [data-smode='verse']")?.classList.contains("active");
  const payload={mode:verse?"verse":"theme",reference:$("#verse-ref")?.value,theme:$("#theme-text")?.value};
  if(!(verse?payload.reference:payload.theme)?.trim()){show("Enter a Scripture reference or song theme.","error");return}
  loadButton(primary,true);
  scriptureConcept=null;$("#concept-section").hidden=true;if(aside)aside.hidden=true;$("#scripture-passage-placeholder")?.removeAttribute("hidden");$("#page-scripture .verse")?.setAttribute("hidden","");out.replaceChildren();
  try{
   const d=await request("/api/studio/scripture",payload);scriptureConcept=d;out.replaceChildren();
   const card=document.createElement("article");card.className="studio-ai-result";
   const h=document.createElement("h3");h.textContent=d.reference+" · "+d.title;
   const context=document.createElement("p");context.textContent=d.insight;
   const concept=document.createElement("p");concept.textContent=d.concept;
   const use=button("Use this song concept",()=>{
     if(!applyScriptureSong())return;
     show("Scripture-led concept, tempo and key added to your song.");
     $("#concept-section [data-page='structure']")?.click();
   },"btn primary");
   card.append(h,context,concept,use);out.append(card);
   const proposed=$("#concept-section");if(proposed){
    $("h2",proposed).textContent=d.title;
    $("p",proposed).textContent=d.concept;
    proposed.hidden=false;
   }
   const reference=$("#page-scripture .verse .reference");
   if(reference)reference.textContent="PASSAGE REFERENCE · "+d.reference;
   const contextText=$("#page-scripture .verse blockquote");
   if(contextText)contextText.textContent=d.theme;
   const attribution=$("#page-scripture .verse small");
   if(attribution)attribution.textContent="Song theme · Not a Bible quotation";
   if(aside){
    aside.hidden=false;
    const descriptions=$$("p",aside);if(descriptions[0])descriptions[0].textContent=d.insight;
    if(descriptions[1])descriptions[1].textContent=d.concept;
   }
   syncScriptureSummary();
   $("#scripture-passage-placeholder")?.setAttribute("hidden","");$("#page-scripture .verse")?.removeAttribute("hidden");
   proposed?.scrollIntoView({behavior:"smooth",block:"center"});
   show("Scripture context and song concept ready.");
  }catch(e){
   const raw=e instanceof Error?e.message:"Scripture analysis is unavailable.";
   const message=raw.trim()&&raw.length<400&&!raw.includes('{"error"')?raw:"Gemini is temporarily unavailable. Please try again shortly.";
   out.replaceChildren();
   const card=document.createElement("article");card.className="studio-ai-result studio-ai-error";
   card.setAttribute("role","alert");
   const heading=document.createElement("h3");heading.textContent="Scripture analysis couldn't finish";
   const detail=document.createElement("p");detail.textContent=message;
   const retry=button("Try again",()=>primary.click(),"btn ghost");
   card.append(heading,detail,retry);
   out.append(card);
   show("Scripture analysis is temporarily unavailable. See the message below.","error");
  }
  finally{loadButton(primary,false,"Analyse Scripture with Gemini")}
 });
 primary.disabled=false;
}
let audioUrl=null;
function addBeatAI(){const text=$("#beat-prompt");if(!text)return;const wrap=document.createElement("div");wrap.className="studio-ai-tool";wrap.innerHTML='<div class="studio-ai-head"><strong>AI beat generation</strong><span>Lyria · original instrumentals</span></div><div class="row-buttons" id="ai-beat-actions"></div><div id="ai-beat-result" class="studio-ai-results" aria-live="polite"></div>';text.after(wrap);const actions=$("#ai-beat-actions");actions.append(button("30-second beat preview",()=>beat("preview"),"btn primary"),button("Generate full instrumental",()=>beat("full")),button("Generate BandLab guide",guide));}
async function beat(mode){const b=mode==="preview"?$("#ai-beat-actions button:first-child"):$("#ai-beat-actions button:nth-child(2)");loadButton(b,true);try{const planData=plan();const body={mode,title:title(),genre:planData.sound,tempo:String(bpm()),songKey:planData.key,feels:planData.feels,drumStyle:"Punchy trap drums, crisp hi-hats, purposeful snare",bassStyle:"Deep controlled sliding 808 bass",melodyStyle:"Hypnotic airy synth plucks and soft pads",instruments:"Warm pads, keys, synth textures and percussion",description:$("#beat-prompt").value+"\n"+(window.eboiStructureBrief?.()||""),duration:window.eboiStructure?.().estimatedDuration||"2 minutes"};const blob=await request("/api/beats",body,true);if(audioUrl)URL.revokeObjectURL(audioUrl);audioUrl=URL.createObjectURL(blob);const result=$("#ai-beat-result");result.replaceChildren();const player=document.createElement("div");player.className="studio-audio";const audio=document.createElement("audio");audio.src=audioUrl;audio.preload="metadata";const playback=button("Play beat",()=>{if(audio.paused)audio.play();else audio.pause()},"btn ghost");const progress=document.createElement("span");progress.textContent="0:00";const download=document.createElement("a");download.className="btn primary";download.textContent="Download beat";download.href=audioUrl;download.download=title().toLowerCase().replace(/[^a-z0-9]+/g,"-")+"-"+mode+".mp3";audio.addEventListener("play",()=>playback.textContent="Pause beat");audio.addEventListener("pause",()=>playback.textContent="Play beat");audio.addEventListener("timeupdate",()=>{const f=x=>Math.floor(x/60)+":"+String(Math.floor(x%60)).padStart(2,"0");progress.textContent=f(audio.currentTime)+" / "+(Number.isFinite(audio.duration)?f(audio.duration):"0:00")});player.append(audio,playback,progress,download);result.append(player);show("Instrumental ready. Download it to keep a copy.")}catch(e){show(e.message||"Beat generation failed.","error")}finally{loadButton(b,false,mode==="preview"?"30-second beat preview":"Generate full instrumental")}}
async function guide(){const b=$("#ai-beat-actions button:nth-child(3)");loadButton(b,true);try{const p=plan(),data=await request("/api/beat-guide",{title:p.title,genre:p.sound,tempo:String(p.bpm),songKey:p.key,feels:p.feels,drumStyle:"Crisp rhythmic trap drums",bassStyle:"Controlled sliding 808",melodyStyle:"Airy melodic synth",instruments:"Pads and plucks",duration:window.eboiStructure?.().estimatedDuration||"2 minutes",description:$("#beat-prompt").value});const str=JSON.stringify(data.guide,null,2);const result=$("#ai-beat-result");result.replaceChildren();const pre=document.createElement("pre");pre.className="studio-guide-code";pre.textContent=str;result.append(pre,button("Download full BandLab guide",()=>downloadFile(str,p.title+"-bandlab-guide.json","application/json"),"btn ghost"));show("Production guide generated.")}catch(e){show(e.message||"Production guide failed.","error")}finally{loadButton(b,false,"Generate BandLab guide")}}
function downloadFile(data,name,type){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement("a");a.href=url;a.download=name.toLowerCase().replace(/[^a-z0-9.-]+/g,"-");a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);}
function archive(){return read(projectsKey,[])}
function snapshot(){return {id:localStorage.getItem(activeKey)||crypto.randomUUID(),title:title(),savedAt:new Date().toISOString(),form:{title:$("#idea-title")?.value||"",about:$("#idea-about")?.value||"",bpm:$("#idea-bpm")?.value||"136",key:$("#studio-song-key")?.value||"F minor",sound:genre("idea-sound","Melodic trap")},db:settings(),scripture:localStorage.getItem("eboi-studio-scripture-ref")||""}}
function saveProject(forceNew=false,quiet=false){const record=snapshot();if(forceNew)record.id=crypto.randomUUID();const list=archive();const i=list.findIndex(x=>x.id===record.id);if(i>=0)list[i]=record;else list.unshift(record);if(!write(projectsKey,list.slice(0,100))){show("Storage is full. Export a backup.","error");return}localStorage.setItem(activeKey,record.id);if(!quiet){show("Project saved on this device.");renderLibrary()}return record;}
function loadProject(rec){const curr=localStorage.getItem(activeKey);if(curr)saveProject(false,true);localStorage.setItem(storageKey,JSON.stringify(rec.db||{}));localStorage.setItem(activeKey,rec.id);if(rec.scripture)localStorage.setItem("eboi-studio-scripture-ref",rec.scripture);else localStorage.removeItem("eboi-studio-scripture-ref");sessionStorage.setItem("eboi-next-project",JSON.stringify(rec.form||{}));location.href="/studio.html?view=workspace";}
function freshProject(){const initial={lyrics:{hook1:"",verse1:"",verse2:"",bridge:""},notes:"",beat:"",vocalNotes:"",structure:{verses:2,hooks:2,start:"hook",intro:false,outro:false,bridge:false,bpm:132,order:[],bars:{}},versions:[]};const id=localStorage.getItem(activeKey);if(id)saveProject(false,true);localStorage.setItem(storageKey,JSON.stringify(initial));localStorage.removeItem(activeKey);localStorage.removeItem("eboi-studio-scripture-ref");sessionStorage.removeItem("eboi-next-project");location.href="/studio.html?view=create&fresh=1";}
function renderLibrary(){const parent=$("#library-results");if(!parent)return;parent.replaceChildren();const query=($("#library-search")?.value||"").toLowerCase().trim();const records=archive().filter(x=>(x.title+" "+x.form?.about).toLowerCase().includes(query));for(const p of records){const row=document.createElement("div");row.className="surface studio-project-card";const info=document.createElement("div");const h=document.createElement("h3");h.textContent=p.title;const meta=document.createElement("p");meta.textContent=(p.form?.bpm||"136")+" BPM · "+(p.form?.sound||"Melodic trap")+" · "+new Date(p.savedAt).toLocaleDateString("en-GB");info.append(h,meta);const actions=document.createElement("div");actions.className="row-buttons";actions.append(button("Open",()=>loadProject(p),"btn primary"),button("Export",()=>downloadFile(JSON.stringify(p,null,2),p.title+"-project.json","application/json")),button("Delete",()=>confirmStudio("Delete this project?","This removes the local copy of "+p.title+". Export a backup first if needed.","Delete",()=>{write(projectsKey,archive().filter(x=>x.id!==p.id));renderLibrary();show("Local project deleted.")})));row.append(info,actions);parent.append(row)}const empty=$("#library-empty");if(empty)empty.hidden=records.length!==0;const dashboard=$(".projects");if(dashboard){dashboard.replaceChildren();for(const p of archive().slice(0,3)){const b=button(p.title+"  ·  "+(p.form?.sound||"Melodic trap"),()=>loadProject(p),"surface project");dashboard.append(b)}if(!dashboard.children.length){const p=document.createElement("p");p.textContent="No saved songs yet. Start your first project.";dashboard.append(p)}}}
function addProjects(){const heading=$("#page-workspace .pagehead");if(!heading)return;const actions=document.createElement("div");actions.className="row-buttons studio-project-actions";actions.append(button("Save project",()=>saveProject()),button("Save as new",()=>saveProject(true)),button("New song",()=>confirmStudio("Start a new song?","Your current changes will remain available in your saved projects if you save first.","Start new",freshProject),"btn primary"));heading.append(actions);const library=$("#page-library .pagehead");if(library){const extra=document.createElement("div");extra.className="row-buttons";extra.append(button("Export full library",()=>downloadFile(JSON.stringify(archive(),null,2),"eboi-studio-projects-backup.json","application/json")));const fileInput=document.createElement("input");fileInput.type="file";fileInput.accept="application/json,.json";fileInput.style.display="none";fileInput.addEventListener("change",async()=>{const file=fileInput.files?.[0];if(!file)return;try{const parsed=JSON.parse(await file.text()),entries=Array.isArray(parsed)?parsed:[parsed];if(entries.some(x=>!x?.title||!x.db||!x.form))throw new Error("This is not a valid Eboi Studio project backup.");const merged=[...archive()];for(const e of entries){e.id=e.id||crypto.randomUUID();const i=merged.findIndex(x=>x.id===e.id);if(i>=0)merged[i]=e;else merged.push(e)}write(projectsKey,merged.slice(0,100));renderLibrary();show("Project backup imported.")}catch(e){show(e.message||"Import failed.","error")}fileInput.value=""});extra.append(button("Import project",()=>fileInput.click()));extra.append(fileInput);library.append(extra)}$("#library-search")?.addEventListener("input",renderLibrary);$$("[data-status]").forEach(b=>b.addEventListener("click",()=>setTimeout(renderLibrary,10)));renderLibrary();}
function initialise(){
 const features=[
  ["Musical key",addSongKey],
  ["Music direction",addMusicDirection],
  ["Scripture options",addScriptureDirection],
  ["Lyrics AI",addLyricsAI],
  ["Song themes",addThemeAI],
  ["Scripture AI",addScriptureAI],
  ["Beat AI",addBeatAI],
  ["Song library",addProjects]
 ];
 const failed=[];
 for(const [name,setup] of features){
  try{setup()}catch(err){failed.push(name);console.error("Eboi Studio: failed to initialize "+name,err);}
 }
 if(failed.length)show("Some studio tools could not load: "+failed.join(", ")+". Please reload.","error");
 if($("#passage-btn")?.disabled)show("Scripture analysis is unavailable. Please reload the studio.","error");
 const classic=document.createElement("a");classic.className="navbtn";classic.href="/classic";classic.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24"><use href="#i-spark"></use></svg><span class="navtext">Classic AI tools</span>';$(".sidebar .navsection:last-of-type")?.append(classic);
 const stage=$("#page-dashboard .hero");if(stage){const badge=$(".eyebrow",stage);if(badge)badge.textContent="Your music production house";}
 const form=read("eboi-next-form",null)||JSON.parse(sessionStorage.getItem("eboi-next-project")||"null");if(form){sessionStorage.removeItem("eboi-next-project");if($("#idea-title"))$("#idea-title").value=form.title||"";if($("#idea-about"))$("#idea-about").value=form.about||"";if($("#idea-bpm"))$("#idea-bpm").value=form.bpm||"136";if($("#studio-song-key"))$("#studio-song-key").value=form.key||"F minor";$("#idea-bpm")?.dispatchEvent(new Event("input",{bubbles:true}));$("#idea-title")?.dispatchEvent(new Event("input",{bubbles:true}));syncKeyOnScreen();if($("#scripture-key"))$("#scripture-key").value=$("#studio-song-key")?.value||"F minor";syncScriptureSummary();if(form.sound){const picker=$("#idea-sound");picker?.click();const match=$$("#idea-sound-options [role=option]").find(x=>x.dataset.value?.toLowerCase()===form.sound.toLowerCase());match?.click()}}
 const query=new URLSearchParams(location.search),view=query.get("view");if(view==="workspace")go("workspace");else if(view==="create"){$('[data-method="idea"]')?.click();go("create")}else if(view==="library")go("library");
 let latest="";setInterval(()=>{const id=localStorage.getItem(activeKey);if(!id)return;const record=snapshot(),str=JSON.stringify(record.db)+"|"+JSON.stringify(record.form);if(latest===str)return;latest=str;saveProject(false,true)},4000);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialise,{once:true});else initialise();
})();

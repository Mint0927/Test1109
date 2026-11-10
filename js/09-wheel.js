"use strict";
// 無限スクロール型の時間ホイール。スクロール中に重い計算は行わない。
const dialogWheelIds={Hour:"dialogHourWheel",Min:"dialogMinWheel",Sec:"dialogSecWheel"};
const wheelUnits=["Hour","Min","Sec"];
const wheelSizes={Hour:25,Min:60,Sec:60};
const wheelRows=40;
const wheelCopies=9;
let activeWheelKey=null;
let dialogWheelDraft=null;
let previousBodyOverflow="";
let wheelInternalScroll=false;
const wheelTimers={};
function updateWheelTimeDisplay(key){
 const el=$(key==="normalBg"?"normalBgTimeText":"eventBgTimeText");
 if(el)el.textContent=secToTime(wheelState[key].seconds);
}
function wheelValuesFromSeconds(seconds){
 const n=Math.max(0,Math.floor(seconds||0));
 return {seconds:n,hour:Math.floor(n/3600),minute:Math.floor(n%3600/60),second:n%60};
}
function setWheelValue(key,seconds){
 wheelState[key]=wheelValuesFromSeconds(seconds);
 updateWheelTimeDisplay(key);
 updateDailyTimeTotal();
}
function refreshWheelLimits(){updateDailyTimeTotal();}
function getWheelMaxSeconds(key){
 const other=key==="normalBg"?"eventBg":"normalBg";
 const limit=eventDateList.length?getEventDaySeconds(selectedEventDayIndex):MAX_DAILY_SECONDS;
 return Math.max(0,limit-(wheelState[other]?.seconds||0));
}
function wheelValue(unit){return dialogWheelDraft[unit==="Hour"?"hour":unit==="Min"?"minute":"second"];}
function updateWheelHighlight(wheel){
 const options=wheel.querySelectorAll(".wheel-option");
 const index=Math.round(wheel.scrollTop/wheelRows);
 const option=options[Math.max(0,Math.min(options.length-1,index))];
 options.forEach(el=>el.classList.toggle("selected",el===option));
 return Number(option?.dataset.value||0);
}
function renderWheel(key,unit,maxValue,selectedValue){
 const wheel=$(dialogWheelIds[unit]);if(!wheel)return;
 const size=wheelSizes[unit];
 const fragment=document.createDocumentFragment();
 const spacer=document.createElement("div");spacer.className="wheel-spacer";
 spacer.style.height=`${Math.max(0,(wheel.clientHeight-wheelRows)/2)}px`;
 fragment.appendChild(spacer);
 for(let i=0;i<size*wheelCopies;i++){
  const el=document.createElement("div");el.className="wheel-option";
  el.dataset.value=String(i%size);el.textContent=String(i%size).padStart(2,"0");
  fragment.appendChild(el);
 }
 const bottom=spacer.cloneNode();fragment.appendChild(bottom);
 wheel.replaceChildren(fragment);
 wheelInternalScroll=true;
 wheel.scrollTop=(Math.floor(wheelCopies/2)*size+Math.min(size-1,selectedValue))*wheelRows;
 updateWheelHighlight(wheel);
 requestAnimationFrame(()=>{wheelInternalScroll=false;});
}
function renderDialogWheels(){if(!dialogWheelDraft)return;wheelUnits.forEach(u=>renderWheel(activeWheelKey,u,wheelSizes[u]-1,wheelValue(u)));updateWheelAdjustmentHint();}
function updateWheelValueFromScroll(unit,value){
 if(!dialogWheelDraft)return;
 dialogWheelDraft[unit==="Hour"?"hour":unit==="Min"?"minute":"second"]=value;
 dialogWheelDraft.seconds=dialogWheelDraft.hour*3600+dialogWheelDraft.minute*60+dialogWheelDraft.second;
 updateWheelAdjustmentHint();
}
function updateWheelAdjustmentHint(){
 const hint=$("wheelAdjustmentHint");if(!hint||!activeWheelKey||!dialogWheelDraft)return;
 const max=getWheelMaxSeconds(activeWheelKey);
 const target=Math.min(max,dialogWheelDraft.seconds);
 const runs=bgRunsForSeconds(activeWheelKey,target);
 const adjusted=bgSecondsForRuns(activeWheelKey,runs);
 hint.textContent=`目安：${secToTime(dialogWheelDraft.seconds)} → 自動調整：${secToTime(adjusted)}（${runs}回）`;
}
function recenterWheel(wheel,unit){
 const size=wheelSizes[unit];const index=Math.round(wheel.scrollTop/wheelRows);
 const val=((index%size)+size)%size;
 if(index<size*2||index>=size*(wheelCopies-2)){
  wheelInternalScroll=true;
  wheel.scrollTop=(Math.floor(wheelCopies/2)*size+val)*wheelRows;
  requestAnimationFrame(()=>{wheelInternalScroll=false;});
 }
 return val;
}
function wheelScrollChanged(unit){
 if(!activeWheelKey||wheelInternalScroll)return;
 const wheel=$(dialogWheelIds[unit]);
 const val=recenterWheel(wheel,unit);
 updateWheelHighlight(wheel);
 updateWheelValueFromScroll(unit,val);
}
function openTimeDialog(key){
 if(key==="eventBg"&&getEventInputTime()<=0){showDailyCheckStatus("error","曲時間が未設定","設定画面でイベント曲時間を入力してください。");return;}
 activeWheelKey=key;
 dialogWheelDraft={...wheelState[key]};
 $("timeDialogTitle").textContent=key==="normalBg"?"通常曲BG時間設定":"イベント曲BG時間設定";
 previousBodyOverflow=document.body.style.overflow;
 document.body.style.overflow="hidden";
 $("timeDialogOverlay").hidden=false;
 requestAnimationFrame(renderDialogWheels);
 $("confirmTimeDialog").focus();
}
function confirmTimeDialog(){
 if(!activeWheelKey)return;
 const key=activeWheelKey;
 const target=Math.min(dialogWheelDraft.seconds,getWheelMaxSeconds(key));
 const runs=bgRunsForSeconds(key,target);
 const adjusted=bgSecondsForRuns(key,runs);
 $(key+"Runs").value=String(runs);
 setWheelValue(key,adjusted);
 $("timeDialogOverlay").hidden=true;
 document.body.style.overflow=previousBodyOverflow;
 activeWheelKey=null;dialogWheelDraft=null;
 syncBgRunsToLegacy();
 saveCurrentDayInputs();saveLocalData();resetResult();
 invalidateDailyConfirmation();
 $(key==="normalBg"?"openNormalBgTime":"openEventBgTime").focus();
}

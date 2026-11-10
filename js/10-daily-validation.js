"use strict";
// 入力中に全日程シミュレーションを実行しない。決定時は当日の軽量チェックのみ。
const confirmedDaySignatures = new Map();
const failedDaySignatures = new Map();
function effectiveDayIndex(index){
 return index>0 && !dailySettings[index]?.useOwnSettings ? 0 : index;
}
function dailyBgLimitError(index, setting = getEffectiveDaySetting(index)) {
 if (!setting || !eventDateList[index]) return "イベント日程を設定してください。";
 const total = bgSecondsForRuns("normalBg", Number(setting.normalBgRuns || 0))
             + bgSecondsForRuns("eventBg", Number(setting.eventBgRuns || 0));
 const limit = getEventDaySeconds(index);
 return total > limit
   ? `BG合計時間が${index+1}日目の上限を${secToTime(total-limit)}超えています。BG時間を短くしてください。`
   : "";
}
function getDayDecisionStatus(index){
 const effective=effectiveDayIndex(index);
 const signature=daySignature(effective);
 // 引き継ぎ先も各日固有の時間上限で検査する（最終日は9時間）。
 // 親の日の確認済み状態を、そのまま無条件でコピーしない。
 const limitError=dailyBgLimitError(index) || (index===selectedEventDayIndex && typeof realtimeBgLimitError==="function" ? realtimeBgLimitError(index) : "");
 if (limitError) return "error";
 if(confirmedDaySignatures.get(effective)===signature)return "success";
 if(failedDaySignatures.get(effective)===signature)return "error";
 return "pending";
}
function updateDateTabStatuses(){
 document.querySelectorAll("#eventDateTabs .event-date-tab").forEach((tab,index)=>{
  const status=getDayDecisionStatus(index);
  tab.classList.remove("decision-success","decision-error","decision-pending");
  tab.classList.add("decision-"+status);
  const icon=status==="success"?"✓":status==="error"?"!":"?";
  const date=eventDateList[index]?.date?.split("-") || [];
  tab.replaceChildren();
  const mark=document.createElement("span");mark.className="decision-tab-icon";mark.textContent=icon;mark.setAttribute("aria-hidden","true");
  const label=document.createElement("span");label.textContent=`${Number(date[1])}/${Number(date[2])}（本日）`;
   tab.disabled=true;
  tab.append(mark,label);
  tab.setAttribute("aria-label",`${index+1}日目 ${status==="success"?"設定済み":status==="error"?"設定エラー":"未判定"}`);
 });
}

function showDailyCheckStatus(type,title,message){
 const area=$("dailyCheckStatus"); if(!area)return;
 area.hidden=false; area.className=`daily-check-status ${type}`;
 area.replaceChildren();
 const heading=document.createElement("div");heading.className="daily-check-title";heading.textContent=title;
 const detail=document.createElement("div");detail.className="daily-check-message";detail.textContent=message;
 area.append(heading,detail);
}
function hideDailyCheckStatus(){const area=$("dailyCheckStatus");if(area)area.hidden=true;}
function daySignature(index){
 const setting=getEffectiveDaySetting(index);
 if(!setting)return "";
 return JSON.stringify({
  date:eventDateList[index]?.date,
  normalBgRuns:setting.normalBgRuns, eventBgRuns:setting.eventBgRuns,
  accuracy:setting.accuracy,
  song:$("normalSong").value, eventTime:getEventInputTime(), network:getNetworkTime()
 });
}
function invalidateDailyConfirmation(scope="current"){
 // 全日付共通の曲・回線設定だけが、全日の確認結果に影響する。
 if(scope==="all"){
  confirmedDaySignatures.clear();
  failedDaySignatures.clear();
 }else{
  const index=effectiveDayIndex(selectedEventDayIndex);
  confirmedDaySignatures.delete(index);
  failedDaySignatures.delete(index);
 }
 updateDateTabStatuses();
 if(getSelectedPlayMode()==="both")showDailyCheckStatus("pending","未確定","入力を変更しました。「この日の設定を決定」を押してください。");
}
function checkDailySettings(){
 saveCurrentDayInputs();
 if(getSelectedPlayMode()!=="both")return true;
 const selectedIndex=selectedEventDayIndex;
 const index=effectiveDayIndex(selectedIndex);
 const setting=getEffectiveDaySetting(selectedIndex);
 const inherited=selectedIndex!==index;
 const fail=message=>{
  // 引き継ぎ先固有の時間超過は、初日の決定結果を破壊しない。
  if (!inherited) {
   confirmedDaySignatures.delete(index);
   failedDaySignatures.set(index,daySignature(index));
  }
  showDailyCheckStatus("error","設定を確認してください",message);
  updateDateTabStatuses();return false;
 };
 if(!setting||!eventDateList.length)return fail("イベント日程を設定してください。");
 if(getEventInputTime()<=0)return fail("設定画面でイベント曲の時間を入力してください。");
 for(const key of ["normalBg","eventBg"]){
  const count=Number(setting[key+"Runs"]);
  if(!Number.isSafeInteger(count)||count<0)return fail("BG時間をホイールで設定してください。");
 }
 const limitError=dailyBgLimitError(selectedIndex,setting) || (typeof realtimeBgLimitError==="function" ? realtimeBgLimitError(selectedIndex,setting) : "");
 if(limitError)return fail(limitError);
 const precision=accuracyIds.reduce((sum,id)=>sum+Number(setting.accuracy[id]||0),0);
 if(precision!==100)return fail(`精度の合計が${precision}%です。100%にしてください。`);
 confirmedDaySignatures.set(index,daySignature(index));
 failedDaySignatures.delete(index);
 updateDateTabStatuses();
 showDailyCheckStatus("success","設定を決定しました",`${selectedIndex+1}日目の入力を確定しました。アイテム・プレイ順序の詳細判定は「計測」で行います。`);
 saveLocalData();
 return true;
}
function refreshDailyConfirmationStatus(){
 if(getSelectedPlayMode()!=="both")return hideDailyCheckStatus();
 const index=selectedEventDayIndex;
 const status=getDayDecisionStatus(index);
 updateDateTabStatuses();
 if(status==="success")showDailyCheckStatus("success","設定済み",`${index+1}日目の設定は確定しています。`);
 else if(status==="error")showDailyCheckStatus("error","設定エラー",(dailyBgLimitError(index) || (typeof realtimeBgLimitError==="function" ? realtimeBgLimitError(index) : "")) || `${index+1}日目の設定に不整合があります。修正して再度「決定」を押してください。`);
 else showDailyCheckStatus("pending","未確定",`${index+1}日目の設定を確認して「この日の設定を決定」を押してください。`);
}
$("confirmDailySettings").addEventListener("click",checkDailySettings);
// 入力内容を変更したら確認状態を無効化。計算は走らせない。
document.addEventListener("input",event=>{
 if(event.target.closest("#mixedTimeArea") && event.target.id==="bgGuideHours")return;
 if(event.target.matches("#eventMin,#eventSec,#normalSong,#bonus") || event.target.closest("#bonusChanges"))invalidateDailyConfirmation("all");
 else if(event.target.matches("#normalBgRuns,#eventBgRuns"))invalidateDailyConfirmation("current");
},true);
document.addEventListener("change",event=>{
 if(event.target.matches('input[name="network"],input[name="playMode"]'))invalidateDailyConfirmation("all");
 else if(event.target.matches('select[id="フルエク"],select[id="フルコン"],select[id="Aコン"],select[id="Bコン"],select[id="Cコン"],select[id="Dコン"]'))invalidateDailyConfirmation("current");
 if(event.target.matches('input[name="playMode"]'))refreshDailyConfirmationStatus();
},true);

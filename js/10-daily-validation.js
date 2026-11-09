"use strict";
// 入力中に全日程シミュレーションを実行しない。決定時は当日の軽量チェックのみ。
const confirmedDaySignatures = new Map();
const failedDaySignatures = new Map();
function effectiveDayIndex(index){
 return index>0 && !dailySettings[index]?.useOwnSettings ? 0 : index;
}
function getDayDecisionStatus(index){
 const effective=effectiveDayIndex(index);
 const signature=daySignature(effective);
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
  const label=document.createElement("span");label.textContent=`${Number(date[1])}/${Number(date[2])}`;
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
function invalidateDailyConfirmation(){
 confirmedDaySignatures.clear();
 failedDaySignatures.clear();
 updateDateTabStatuses();
 if(getSelectedPlayMode()==="both") showDailyCheckStatus("pending","未確定","入力を変更しました。「この日の設定を決定」を押してください。");
}
function checkDailySettings(){
 saveCurrentDayInputs();
 if(getSelectedPlayMode()!=="both")return true;
 const index=selectedEventDayIndex;
 const setting=getEffectiveDaySetting(index);
 const fail=message=>{confirmedDaySignatures.delete(index);failedDaySignatures.set(index,daySignature(index));showDailyCheckStatus("error","設定を確認してください",message);updateDateTabStatuses();return false;};
 if(!setting||!eventDateList.length)return fail("イベント日程を設定してください。");
 if(getEventInputTime()<=0)return fail("設定画面でイベント曲の時間を入力してください。");
 for(const key of ["normalBg","eventBg"]){
  const input=$(key+"Runs");const count=Number(input?.value);
  if(!input||input.value.trim()===""||!Number.isSafeInteger(count)||count<0)return fail("BGプレイ回数は0以上の整数で入力してください。");
 }
 const total=bgSecondsForRuns("normalBg",readBgRuns("normalBg"))+bgSecondsForRuns("eventBg",readBgRuns("eventBg"));
 const limit=getEventDaySeconds(index);
 if(total>limit)return fail(`BG合計時間がこの日の上限を${secToTime(total-limit)}超えています。回数を減らしてください。`);
 const precision=accuracyIds.reduce((sum,id)=>sum+Number(setting.accuracy[id]||0),0);
 if(precision!==100)return fail(`精度の合計が${precision}%です。100%にしてください。`);
 confirmedDaySignatures.set(index,daySignature(index));
 failedDaySignatures.delete(index);
 updateDateTabStatuses();
 showDailyCheckStatus("success","設定を決定しました",`${index+1}日目の入力を確定しました。アイテム・プレイ順序の詳細判定は「計測」で行います。`);
 saveLocalData();
 return true;
}
function refreshDailyConfirmationStatus(){
 if(getSelectedPlayMode()!=="both")return hideDailyCheckStatus();
 const index=selectedEventDayIndex;
 const status=getDayDecisionStatus(index);
 updateDateTabStatuses();
 if(status==="success")showDailyCheckStatus("success","設定済み",`${index+1}日目の設定は確定しています。`);
 else if(status==="error")showDailyCheckStatus("error","設定エラー",`${index+1}日目の設定に不整合があります。修正して再度「決定」を押してください。`);
 else showDailyCheckStatus("pending","未確定",`${index+1}日目の設定を確認して「この日の設定を決定」を押してください。`);
}
$("confirmDailySettings").addEventListener("click",checkDailySettings);
// 入力内容を変更したら確認状態を無効化。計算は走らせない。
document.addEventListener("input",event=>{
 if(event.target.closest("#mixedTimeArea") && event.target.id==="bgGuideHours")return;
 if(event.target.matches("#normalBgRuns,#eventBgRuns,#eventMin,#eventSec,#normalSong,#bonus") || event.target.closest("#bonusChanges"))invalidateDailyConfirmation();
},true);
document.addEventListener("change",event=>{
 if(event.target.matches('select[id="フルエク"],select[id="フルコン"],select[id="Aコン"],select[id="Bコン"],select[id="Cコン"],select[id="Dコン"],input[name="network"],input[name="playMode"]'))invalidateDailyConfirmation();
 if(event.target.matches('input[name="playMode"]'))refreshDailyConfirmationStatus();
},true);

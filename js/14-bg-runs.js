"use strict";
// =============================================
// BGプレイ回数設定・目安（混合モード）
// 曲時間は設定画面の値を参照する。
// =============================================

function bgSongSeconds(key) {
  if (key === "normalBg") {
    return normalSongs[$("normalSong").selectedIndex]?.time || 0;
  }
  return getEventInputTime();
}

function bgSecondsForRuns(key, runs) {
  const count = Number(runs);
  if (!Number.isSafeInteger(count) || count <= 0) return 0;
  const duration = bgSongSeconds(key);
  if (duration <= 0) return 0;
  return count * (duration + standbyBackground) - standbyBackground;
}

function bgRunsForSeconds(key, seconds) {
  const duration = bgSongSeconds(key);
  if (duration <= 0 || seconds <= 0) return 0;
  return Math.max(0, Math.floor((Number(seconds) + standbyBackground) /
    (duration + standbyBackground)));
}

function readBgRuns(key) {
  const input = $(key === "normalBg" ? "normalBgRuns" : "eventBgRuns");
  const number = Number(input?.value);
  return input?.value !== "" && Number.isSafeInteger(number) && number >= 0
    ? number : 0;
}

function formatBgDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 3600)}時間${String(Math.floor(s % 3600 / 60)).padStart(2,"0")}分${String(s % 60).padStart(2,"0")}秒`;
}

function updateBgRunsUI(){
 let total=0;
 for(const key of ["normalBg","eventBg"]){
  const runs=readBgRuns(key);
  const seconds=bgSecondsForRuns(key,runs);
  total+=seconds;
  const duration=$(key+"RequiredTime");if(duration)duration.textContent=formatBgDuration(seconds);
  const count=$(key+"GuideRuns");if(count)count.textContent=String(runs);
 }
 $("bgRunsTotalTime").textContent=formatBgDuration(total);
 const limit=eventDateList.length?getEventDaySeconds(selectedEventDayIndex):MAX_DAILY_SECONDS;
 $("dailyTimeTotal").textContent=`BG合計：${formatBgDuration(total)} / ${formatBgDuration(limit)}`;
 $("dailyTimeTotal").style.color=total>limit?"#d00000":"#7926b9";
}

function syncBgRunsToLegacy() {
  for (const key of ["normalBg", "eventBg"]) {
    const seconds = bgSecondsForRuns(key, readBgRuns(key));
    setWheelValue(key, seconds);
  }
  updateBgRunsUI();
}

function applyBgRunsForDay(setting) {
  for (const key of ["normalBg", "eventBg"]) {
    const runs = setting[key + "Runs"] != null
      ? setting[key + "Runs"] : bgRunsForSeconds(key, setting[key]);
    $(key + "Runs").value = String(Math.max(0, Math.floor(Number(runs) || 0)));
  }
  syncBgRunsToLegacy();
}

document.addEventListener("DOMContentLoaded",()=>{
 // 保存済みの回数を時間ホイールに反映
 if(dailySettings.length)applyDayInputs(selectedEventDayIndex);
 else syncBgRunsToLegacy();
 for(const id of ["normalSong","eventMin","eventSec"]){
  $(id).addEventListener("change",()=>{
   // 曲時間が変わった場合も保存済みの回数から所要時間を再計算
   syncBgRunsToLegacy();saveCurrentDayInputs();saveLocalData();
  });
 }
});

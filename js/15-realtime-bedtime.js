"use strict";
// 端末のローカル時刻を使い、次の就寝時刻までの実行可能なBG時間を判定する。
const BEDTIME_STORAGE_KEY = "nogifesBedtimeV1";
function getBedtimeRemainingSeconds(now = new Date()) {
 const value = $("bedtimeInput")?.value || "23:00";
 const match = /^(\d{2}):(\d{2})$/.exec(value);
 if (!match) return NaN;
 const target = new Date(now);
 target.setHours(Number(match[1]),Number(match[2]),0,0);
 if (target <= now) target.setDate(target.getDate()+1);
 return Math.floor((target-now)/1000);
}
function currentBgTotalSeconds(setting) {
 if (!setting) return 0;
 return bgSecondsForRuns("normalBg",Number(setting.normalBgRuns||0)) + bgSecondsForRuns("eventBg",Number(setting.eventBgRuns||0));
}
function realtimeBgLimitError(index, setting = getEffectiveDaySetting(index)) {
 if (!setting) return "日付の設定がありません。";
 const remain = getBedtimeRemainingSeconds();
 if (!Number.isFinite(remain)) return "就寝時刻を設定してください。";
 const total = currentBgTotalSeconds(setting);
 return total > remain ? `就寝までの残り時間（${formatBgDuration(remain)}）に対して、BG合計（${formatBgDuration(total)}）が${formatBgDuration(total-remain)}超えています。` : "";
}
function refreshBedtimeClock() {
 const area=$("currentClockInfo");if(!area)return;
 const now=new Date();
 const clock=now.toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
 area.textContent=`現在 ${clock} ／ 就寝まで ${formatBgDuration(getBedtimeRemainingSeconds(now))}`;
 if(typeof updateBgRunsUI==="function"){
  const limit=getBedtimeRemainingSeconds(now);
  const total=bgSecondsForRuns("normalBg",readBgRuns("normalBg"))+bgSecondsForRuns("eventBg",readBgRuns("eventBg"));
  const el=$("dailyTimeTotal");
  if(el){el.textContent=`BG合計：${formatBgDuration(total)} / 就寝まで ${formatBgDuration(limit)}`;el.style.color=total>limit?"#d00000":"#7926b9";}
 }
}
document.addEventListener("DOMContentLoaded",()=>{
 const input=$("bedtimeInput");
 try { const saved=localStorage.getItem(BEDTIME_STORAGE_KEY);if(saved && /^\d{2}:\d{2}$/.test(saved))input.value=saved; }catch(_){}
 input.addEventListener("change",()=>{
  try{localStorage.setItem(BEDTIME_STORAGE_KEY,input.value);}catch(_){}
  invalidateDailyConfirmation("all");refreshBedtimeClock();
 });
 refreshBedtimeClock();
 setInterval(refreshBedtimeClock,1000);
});

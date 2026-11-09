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

function updateBgRunsUI() {
  const hours = Math.max(0, Number($("bgGuideHours")?.value || 3));
  const guideSeconds = hours * 3600;
  for (const [key, prefix] of [["normalBg","normalBg"],["eventBg","eventBg"]]) {
    const duration = bgSongSeconds(key);
    const runs = duration > 0
      ? Math.floor((guideSeconds + standbyBackground) / (duration + standbyBackground))
      : 0;
    $(prefix + "GuideRuns").textContent = String(runs);
    $(prefix + "SongDuration").textContent = duration > 0
      ? `${Math.floor(duration / 60)}分${String(duration % 60).padStart(2,"0")}秒`
      : "未設定";
    $(prefix + "GuideDuration").textContent = duration > 0
      ? formatBgDuration(bgSecondsForRuns(key, runs)) : "--";
    $(prefix + "RequiredTime").textContent = formatBgDuration(bgSecondsForRuns(key, readBgRuns(key)));
  }
  const total = bgSecondsForRuns("normalBg", readBgRuns("normalBg")) +
    bgSecondsForRuns("eventBg", readBgRuns("eventBg"));
  $("bgRunsTotalTime").textContent = formatBgDuration(total);
  $("dailyTimeTotal").textContent = `BG合計：${formatBgDuration(total)} / ${typeof getEventDaySeconds === "function" && eventDateList.length ? getEventDaySeconds(selectedEventDayIndex) / 3600 : 24}時間`;
  $("dailyTimeTotal").style.color = total > (eventDateList.length ? getEventDaySeconds(selectedEventDayIndex) : MAX_DAILY_SECONDS) ? "#d00000" : "#7926b9";
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

document.addEventListener("DOMContentLoaded", () => {
for (const key of ["normalBg", "eventBg"]) {
  $(key + "Runs").addEventListener("input", () => {
    const input = $(key + "Runs");
    const count = Number(input.value);
    if (input.value !== "" && (!Number.isSafeInteger(count) || count < 0)) {
      input.setCustomValidity("プレイ回数は0以上の整数で入力してください。");
    } else {
      input.setCustomValidity("");
    }
    syncBgRunsToLegacy();
    saveCurrentDayInputs();
    saveLocalData();
    resetResult();
    hideDailyCheckStatus();
  });
}
$("bgGuideHours").addEventListener("change", updateBgRunsUI);
for (const id of ["normalSong", "eventMin", "eventSec"]) {
  $(id).addEventListener("input", () => {
    syncBgRunsToLegacy();
    saveCurrentDayInputs();
    saveLocalData();
    hideDailyCheckStatus();
  });
  $(id).addEventListener("change", updateBgRunsUI);
}
// 保存済み日別設定を選択中の入力欄に反映
if (dailySettings.length) applyDayInputs(selectedEventDayIndex);
else syncBgRunsToLegacy();
});

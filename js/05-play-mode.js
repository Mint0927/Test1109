// ===================================
// 1曲あたりの所要時間
// ===================================

function getCycleTime(songTime, isManual, isEvent, networkTime) {
  const loadTime = isManual
    ? networkTime + (isEvent ? 1 : 0)
    : 0;

  const standby = isManual
    ? 0
    : standbyBackground;

  return {
    cycle: songTime + loadTime + standby,
    standby
  };
}

// ===================================
// 指定時間内にプレイできる回数
// ===================================

function capacityFor(time, cycleInfo) {
  if (time <= 0 || cycleInfo.cycle <= 0) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(
      (time + cycleInfo.standby) /
      cycleInfo.cycle +
      1e-9
    )
  );
}

// ===================================
// 実際に消費する合計時間
// ===================================

function usedTime(runs, cycleInfo) {
  if (runs <= 0) {
    return 0;
  }

  return runs * cycleInfo.cycle - cycleInfo.standby;
}

// ===================================
// プレイモード切り替え
// ===================================

function updatePlayMode() {
  const mixed = getSelectedPlayMode() === "both";

  $("networkArea").querySelectorAll("input").forEach(input => {
    input.disabled = false;
  });

  $("fullModeArea").hidden = mixed;
  $("accuracyArea").hidden = isFullBackground;
  $("mixedTimeArea").hidden = !mixed;

  $("networkArea").style.opacity = "1";

  if (mixed) {
    $("accuracyArea").hidden = false;
  }

  resetResult();
  updateMixedPreview();
}

document.querySelectorAll('input[name="playMode"]').forEach(radio => {
  radio.addEventListener("change", updatePlayMode);
});

// ===================================
// フル手打ち・フルBG切り替え
// ===================================

const manualModeButton = $("manualModeButton");
const backgroundModeButton = $("backgroundModeButton");

function setFullMode(isBackground) {
  isFullBackground = isBackground;

  manualModeButton.classList.toggle("active", !isFullBackground);
  backgroundModeButton.classList.toggle("active", isFullBackground);

  manualModeButton.setAttribute(
    "aria-pressed",
    String(!isFullBackground)
  );

  backgroundModeButton.setAttribute(
    "aria-pressed",
    String(isFullBackground)
  );

  $("accuracyArea").hidden = isFullBackground;

  resetResult();
}

manualModeButton.addEventListener("click", () => {
  setFullMode(false);
});

backgroundModeButton.addEventListener("click", () => {
  setFullMode(true);
});

// ===================================
// BG時間取得
// ===================================

function getBgTimes() {
  return {
    normalBg: wheelState.normalBg.seconds,
    eventBg: wheelState.eventBg.seconds
  };
}

// ===================================
// 1日のBG合計時間表示
// ===================================

function updateDailyTimeTotal() {
  const times = getBgTimes();

  const totalSeconds =
    times.normalBg + times.eventBg;

  $("dailyTimeTotal").textContent =
    `合計：${secToTime(totalSeconds)} / 24時間`;

  $("dailyTimeTotal").style.color =
    totalSeconds > MAX_DAILY_SECONDS
      ? "#d00000"
      : "#7926b9";
}


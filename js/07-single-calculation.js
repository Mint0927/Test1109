
// ===================================
// フル手打ち・フルBG計算
// ===================================

function calculateSingleMode(
  isManual,
  song,
  eventTime,
  networkTime,
  itemMap
) {
  const bonusSchedule = getBonusSchedule(true);

  if (!bonusSchedule) {
    return null;
  }

  const averageItem = isManual
    ? calculateManualAverage(itemMap)
    : itemMap.Dコン;

  if (averageItem === null) {
    return null;
  }

  const normalCycle = getCycleTime(
    song.time,
    isManual,
    false,
    networkTime
  );

  const eventCycle = getCycleTime(
    eventTime,
    isManual,
    true,
    networkTime
  );

  const normalFullTime =
    (requiredItems / averageItem) *
    normalCycle.cycle -
    normalCycle.standby;

  const eventFullTime = usedTime(
    eventFullCount,
    eventCycle
  );

  const daily = simulateSinglePeriod(
    MAX_DAILY_SECONDS,
    isManual,
    song,
    eventTime,
    networkTime,
    itemMap,
    bonusSchedule,
    0,
    0
  );

  const projection = simulate225Hours(
    (periodSeconds, startingItems, elapsedSeconds) => {
      return simulateSinglePeriod(
        periodSeconds,
        isManual,
        song,
        eventTime,
        networkTime,
        itemMap,
        bonusSchedule,
        startingItems,
        elapsedSeconds
      );
    }
  );

  return {
    averageItem,

    normalFullTime,
    eventFullTime,

    daySet: daily.actualEventRuns / eventFullCount,
    dayPoint: daily.dailyPoint,

    dailyEventRuns: daily.actualEventRuns,

    set225: projection.eventRuns / eventFullCount,
    point225: projection.eventPoints,

    projectedEventRuns: projection.eventRuns,
    projectedPoint: projection.eventPoints,

    daily,
    projection
  };
}

// ===================================
// 混合モードのプレビュー
// ===================================

function updateMixedPreview() {
  // 入力中は軽量な表示更新のみ。本計算は「計算」ボタンで実行する。
  updateDailyTimeTotal();
  latestMixedResult = null;
  if (typeof hideDailyCheckStatus === "function") hideDailyCheckStatus();
}

// ===================================
// 入力チェック
// ===================================

function validateCommonInputs(mode) {
  const minText = $("eventMin").value;
  const secText = $("eventSec").value;

  const min = Number(minText || 0);
  const sec = Number(secText || 0);

  const eventTime = min * 60 + sec;

  if (mode !== "both" || eventTime > 0) {
    if (
      minText === "" ||
      !Number.isInteger(min) ||
      min < 0 ||
      !Number.isInteger(sec) ||
      sec < 0 ||
      sec > 59 ||
      eventTime <= 0
    ) {
      showCalculationError("設定画面でイベント曲の時間を正しく入力してください。");
      return false;
    }
  }

  if (!getBonusSchedule(true)) {
    return false;
  }

  return true;
}

function validateBgTimes() {
  const totalSeconds =
    getWheelSeconds("normalBg") +
    getWheelSeconds("eventBg");

  if (totalSeconds > MAX_DAILY_SECONDS) {
    showCalculationError("BGの合計時間が24時間を超えています。");
    return false;
  }

  return true;
}

// ===================================
// 共通結果表示
// ===================================

function showCommonResult(song, mode, result) {
  $("resultSong").textContent = song.name;
  $("resultMode").textContent = mode;

  $("resultAverage").textContent =
    `${result.averageItem.toFixed(2)} 個`;

  $("resultNormalTime").textContent =
    secToTime(result.normalFullTime);

  $("resultEventTime").textContent =
    secToTime(result.eventFullTime);
}

// ===================================
// フル手打ち・フルBG結果表示
// ===================================

function showSingleResult(song, isManual, result) {
  $("mixedBreakdown").hidden = true;

  showCommonResult(
    song,
    isManual
      ? "フル手打ち"
      : "フルバクグラ",
    result
  );

  $("resultDailyItems").textContent =
    result.averageItem.toFixed(2);

  $("resultDailyEventRuns").textContent =
    result.dailyEventRuns.toLocaleString();

  $("resultDayPoint").textContent =
    Math.floor(result.dayPoint).toLocaleString();


  $("result225Point").textContent =
    Math.floor(result.projectedPoint).toLocaleString();
}

// ===================================
// 手打ち＆BG結果表示
// ===================================

function showMixedResult(song, result) {
  showCommonResult(
    song,
    "手打ち＆バックグラウンド（手打ち時間自動最適化）",
    result
  );

  $("mixedBreakdown").hidden = false;

  $("resultDailyItems").textContent =
    Math.floor(result.totalItems).toLocaleString();

  $("resultDailyEventRuns").textContent =
    result.actualEventRuns.toLocaleString();

  $("resultDayPoint").textContent =
    Math.floor(result.dailyPoint).toLocaleString();



  $("result225Point").textContent =
    Math.floor(result.projectedPoint).toLocaleString();

  $("resultManualNormalRuns").textContent =
    result.normalManualRuns.toLocaleString();

  $("resultBgNormalRuns").textContent =
    result.normalBgRuns.toLocaleString();

  $("resultManualItems").textContent =
    Math.floor(result.manualItems).toLocaleString();

  $("resultBgItems").textContent =
    Math.floor(result.bgItems).toLocaleString();

  $("resultManualEventRuns").textContent =
    result.manualEventRuns.toLocaleString();

  $("resultBgEventRuns").textContent =
    result.bgEventRuns.toLocaleString();

  $("resultManualEventPoints").textContent =
    Math.floor(result.manualDailyPoint).toLocaleString();

  $("resultBgEventPoints").textContent =
    Math.floor(result.bgDailyPoint).toLocaleString();

  $("resultManualNormalTime").textContent =
    secToTime(result.normalManualTime);

  $("resultManualEventTime").textContent =
    secToTime(result.eventManualTime);
}


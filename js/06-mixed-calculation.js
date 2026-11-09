
"use strict";

// ===================================
// 混合モードシミュレーション
// ===================================



function simulateMixed(
  song,
  eventTime,
  networkTime,
  itemMap,
  capacities,
  averageManual,
  bonusSchedule,
  startingItems = 0,
  elapsedStartSeconds = 0,
  periodSeconds = MAX_DAILY_SECONDS
) {
  const EPS = 1e-7;
  const errors = [];

  const config = {
    normalManual: {
      capacity: capacities.normalManual,
      cycle: getCycleTime(song.time, true, false, networkTime),
      gain: averageManual,
      type: "normal",
      manual: true
    },
    normalBg: {
      capacity: capacities.normalBg,
      cycle: getCycleTime(song.time, false, false, networkTime),
      gain: itemMap.Dコン,
      type: "normal",
      manual: false
    },
    eventManual: {
      capacity: capacities.eventManual,
      cycle: getCycleTime(eventTime, true, true, networkTime),
      gain: 0,
      type: "event",
      manual: true
    },
    eventBg: {
      capacity: capacities.eventBg,
      cycle: getCycleTime(eventTime, false, true, networkTime),
      gain: 0,
      type: "event",
      manual: false
    }
  };

  const runs = {
    normalManual: 0,
    normalBg: 0,
    eventManual: 0,
    eventBg: 0
  };

  const times = {
    normalManual: 0,
    normalBg: 0,
    eventManual: 0,
    eventBg: 0
  };

  let currentItems = startingItems;
  let totalItems = 0;
  let manualItems = 0;
  let bgItems = 0;
  let usedItems = 0;

  let manualDailyPoint = 0;
  let bgDailyPoint = 0;
  let elapsed = 0;

  let phase = "normal";

  const normalNames = ["normalManual", "normalBg"];
  const eventNames = ["eventManual", "eventBg"];

  // 各プレイ方法の初回のみBG待機時間を引く
  function playCost(name) {
    const lane = config[name];

    return lane.cycle.cycle -
      (runs[name] === 0 ? lane.cycle.standby : 0);
  }

  function canPlay(name) {
    const lane = config[name];

    if (runs[name] >= lane.capacity) return false;
    if (elapsed + playCost(name) > periodSeconds + EPS) {
      return false;
    }

    if (lane.type === "normal") {
      return currentItems + lane.gain <= requiredItems + EPS;
    }

    return (
      eventTime > 0 &&
      currentItems + EPS >= itemsPerEventSong
    );
  }

  function firstAvailable(names) {
    return names.find(canPlay) ?? null;
  }

  const maxSteps =
    Object.values(config).reduce(
      (sum, lane) => sum + lane.capacity,
      0
    );

  for (let step = 0; step < maxSteps; step++) {
    let selected = null;

    if (phase === "normal") {
      selected = firstAvailable(normalNames);

      if (selected === null) {
        selected = firstAvailable(eventNames);

        if (selected !== null) {
          phase = "event";
        }
      }
    } else {
      selected = firstAvailable(eventNames);

      if (selected === null) {
        selected = firstAvailable(normalNames);

        if (selected !== null) {
          phase = "normal";
        }
      }
    }

    if (selected === null) break;

    const lane = config[selected];
    const cost = playCost(selected);
    const playStart = elapsedStartSeconds + elapsed;

    runs[selected]++;
    times[selected] += cost;
    elapsed += cost;

    if (lane.type === "normal") {
      currentItems += lane.gain;
      totalItems += lane.gain;

      if (lane.manual) {
        manualItems += lane.gain;
      } else {
        bgItems += lane.gain;
      }
    } else {
      const bonus = getBonusAtElapsed(
        playStart,
        bonusSchedule
      );

      const point = calculateEventPoint(
        bonus + (lane.manual ? manualBonusAddition : 0)
      );

      currentItems -= itemsPerEventSong;
      usedItems += itemsPerEventSong;

      if (lane.manual) {
        manualDailyPoint += point;
      } else {
        bgDailyPoint += point;
      }
    }
  }

  // 指定した回数を実際に達成できたか
  for (const name of Object.keys(config)) {
    if (runs[name] !== config[name].capacity) {
      errors.push("schedule");
      break;
    }
  }

  if (currentItems > requiredItems + EPS) {
    errors.push("limit");
  }

  if (currentItems < -EPS) {
    errors.push("depletion");
  }

  if (elapsed > periodSeconds + EPS) {
    errors.push("time");
  }

  const normalRuns =
    runs.normalManual + runs.normalBg;

  return {
    errors,

    averageItem: normalRuns > 0
      ? totalItems / normalRuns
      : 0,

    totalItems,
    manualItems,
    bgItems,
    currentItems: Math.max(0, currentItems),
    usedItems,

    normalManualRuns: runs.normalManual,
    normalBgRuns: runs.normalBg,

    manualEventRuns: runs.eventManual,
    bgEventRuns: runs.eventBg,

    actualEventRuns:
      runs.eventManual + runs.eventBg,

    dailyPoint:
      manualDailyPoint + bgDailyPoint,

    manualDailyPoint,
    bgDailyPoint,

    normalFullTime:
      times.normalManual + times.normalBg,

    eventFullTime:
      times.eventManual + times.eventBg,

    normalManualTime: times.normalManual,
    eventManualTime: times.eventManual
  };
}





 // ===================================
 // 混合モード計算
 // ===================================


function calculateMixedMode(
  song,
  eventTime,
  networkTime,
  itemMap,
  showAlert = true,
  periodSeconds = MAX_DAILY_SECONDS,
  startingItems = 0,
  elapsedStartSeconds = 0
) {
  const EPS = 1e-7;

  const bonusSchedule = getBonusSchedule(showAlert);
  if (!bonusSchedule) return null;

  const bgTimes = getBgTimes();

  const normalBgTime = bgTimes.normalBg;
  const eventBgTime = eventTime > 0
    ? bgTimes.eventBg
    : 0;

  const remaining =
    periodSeconds - normalBgTime - eventBgTime;

  if (remaining < -EPS) {
    if (showAlert) {
      showCalculationError("BG時間がプレイ可能時間を超えています。BG回数を減らしてください。");
    }
    return null;
  }

  const averageManual = calculateManualAverage(
    itemMap,
    showAlert
  );

  if (averageManual === null) return null;

  const normalManualCycle = getCycleTime(
    song.time, true, false, networkTime
  );

  const normalBgCycle = getCycleTime(
    song.time, false, false, networkTime
  );

  const eventManualCycle = getCycleTime(
    eventTime, true, true, networkTime
  );

  const eventBgCycle = getCycleTime(
    eventTime, false, true, networkTime
  );

  // BGの指定時間から回数を計算
  const normalBgCapacity = capacityFor(
    normalBgTime,
    normalBgCycle
  );

  const eventBgCapacity = eventTime > 0
    ? capacityFor(eventBgTime, eventBgCycle)
    : 0;

  // BGで実際に消費する時間
  const actualNormalBgTime = usedTime(
    normalBgCapacity,
    normalBgCycle
  );

  const actualEventBgTime = usedTime(
    eventBgCapacity,
    eventBgCycle
  );

  // 手打ちに使用できる残り時間
  const manualAvailableTime = Math.max(
    0,
    periodSeconds -
      actualNormalBgTime -
      actualEventBgTime
  );

  const maxNormalManual = capacityFor(
    manualAvailableTime,
    normalManualCycle
  );

  let best = null;
  const failureErrors = new Set();

  // ===================================
  // 通常曲の手打ち回数を探索
  // ===================================

  for (
    let normalRuns = 0;
    normalRuns <= maxNormalManual;
    normalRuns++
  ) {
    const normalManualTime = usedTime(
      normalRuns,
      normalManualCycle
    );

    const timeLeft =
      manualAvailableTime - normalManualTime;

    if (timeLeft < -EPS) continue;

    // イベント曲の手打ち最大回数
    const maxEventByTime = eventTime > 0
      ? capacityFor(
          Math.max(0, timeLeft),
          eventManualCycle
        )
      : 0;

    // 獲得可能アイテムからの上限
    const availableItems =
      startingItems +
      normalRuns * averageManual +
      normalBgCapacity * itemMap.Dコン;

    const bgRequiredItems =
      eventBgCapacity * itemsPerEventSong;

    if (availableItems + EPS < bgRequiredItems) {
      failureErrors.add("depletion");
      continue;
    }

    const maxEventByItems = Math.floor(
      (
        availableItems -
        bgRequiredItems +
        EPS
      ) / itemsPerEventSong
    );

    const maxEventManual = Math.max(
      0,
      Math.min(maxEventByTime, maxEventByItems)
    );

    // ===================================
    // イベント曲の手打ち回数を探索
    // ===================================

    for (
      let eventRuns = maxEventManual;
      eventRuns >= 0;
      eventRuns--
    ) {
      const candidate = simulateMixed(
        song,
        eventTime,
        networkTime,
        itemMap,
        {
          normalManual: normalRuns,
          normalBg: normalBgCapacity,
          eventManual: eventRuns,
          eventBg: eventBgCapacity
        },
        averageManual,
        bonusSchedule,
        startingItems,
        elapsedStartSeconds,
        periodSeconds
      );

      // 実際に成立しない候補は除外
      if (candidate.errors.length > 0) {
        candidate.errors.forEach(error => {
          failureErrors.add(error);
        });
        continue;
      }

      // ===================================
      // 最適候補の選択
      // ===================================

      const isBetter =
        best === null ||
        candidate.dailyPoint > best.dailyPoint + EPS ||
        (
          Math.abs(
            candidate.dailyPoint - best.dailyPoint
          ) <= EPS &&
          (
            candidate.actualEventRuns >
              best.actualEventRuns ||
            (
              candidate.actualEventRuns ===
                best.actualEventRuns &&
              candidate.totalItems > best.totalItems
            )
          )
        );

      if (isBetter) {
        best = candidate;
      }

      // 同じ通常曲回数では、これより
      // イベント曲を減らす必要はない
      break;
    }
  }

  // ===================================
  // 計算できなかった場合
  // ===================================

  if (best === null) {
    console.warn("混合モード計算失敗", {
      errors: Array.from(failureErrors),
      startingItems,
      periodSeconds,
      normalBgTime,
      eventBgTime
    });

    if (showAlert) {
      showMixedCalculationError(
        Array.from(failureErrors)
      );
    }

    return null;
  }

  best.optimizedManualNormalRuns =
    best.normalManualRuns;

  best.optimizedManualEventRuns =
    best.manualEventRuns;

  return best;
}





function getEventDaySeconds(index) {
  const isLastDay = index === eventDateList.length - 1;

  return isLastDay
    ? 9 * 60 * 60
    : 24 * 60 * 60;
}

function getEventTotalSeconds() {
  return eventDateList.reduce(
    (total, item, index) =>
      total + getEventDaySeconds(index),
    0
  );
}

function getEffectiveDaySetting(index) {
  const own = dailySettings[index];

  if (!own) return null;

  if (index === 0 || own.useOwnSettings) {
    return own;
  }

  return dailySettings[0];
}


function simulateEventByDays(
  mode,
  song,
  eventTime,
  networkTime,
  itemMap
) {
  const bonusSchedule = getBonusSchedule(false);

  if (!bonusSchedule) return null;

  const results = [];

  let currentItems = 0;
  let elapsedSeconds = 0;

  let totalPoints = 0;
  let totalEventRuns = 0;

  const originalDayIndex = selectedEventDayIndex;

  for (let index = 0; index < eventDateList.length; index++) {
    const setting = getEffectiveDaySetting(index);

    if (!setting) return null;

    const periodSeconds = getEventDaySeconds(index);

    // この日の設定を画面上の計算入力へ反映
    // 先にBG時間をリセットして、前日の上限の影響を防ぐ
    setWheelValue("normalBg", 0);
    setWheelValue("eventBg", 0);

    accuracyIds.forEach(id => {
      $(id).value = String(setting.accuracy[id] ?? 0);
    });

    updateAccuracyLimit();

    setWheelValue("normalBg", setting.normalBg);
    setWheelValue("eventBg", setting.eventBg);

    let result;

    if (mode === "both") {
      const bgTotal =
        setting.normalBg +
        (eventTime > 0 ? setting.eventBg : 0);

      if (bgTotal > periodSeconds) {
        showCalculationError(
          `${index + 1}日目のBG時間が、` +
          `プレイ可能時間を超えています。`
        );
        return null;
      }

      result = calculateMixedMode(
        song,
        eventTime,
        networkTime,
        itemMap,
        false,
        periodSeconds,
        currentItems,
        elapsedSeconds
      );

    } else {
      const isManual = !isFullBackground;

      result = simulateSinglePeriod(
        periodSeconds,
        isManual,
        song,
        eventTime,
        networkTime,
        itemMap,
        bonusSchedule,
        currentItems,
        elapsedSeconds
      );
    }

    console.log("日別計算の確認", {
  day: index + 1,
  periodSeconds,
  startingItems: currentItems,
  result,
  setting: getEffectiveDaySetting(index)
});
    if (!result || result.errors?.length) {
      showCalculationError(
        `${index + 1}日目の計算に失敗しました。` +
        "精度・BG回数・アイテム数（上限99,999個）を確認してください。"
      );
      return null;
    }

    currentItems = result.currentItems;
    totalPoints += result.dailyPoint;
    totalEventRuns += result.actualEventRuns;

    results.push({
      date: eventDateList[index].date,
      day: index + 1,
      periodSeconds,
      ...result
    });

    elapsedSeconds += periodSeconds;
  }

  return {
    days: results,
    totalPoints,
    totalEventRuns,
    finalItems: currentItems,
    totalSeconds: elapsedSeconds
  };
}


// ===================================
// 225時間シミュレーション
// ===================================

function simulate225Hours(simulateDay) {
  const totalSeconds =
    eventDurationHours * 3600;

  let elapsed = 0;
  let currentItems = 0;

  const total = {
    eventRuns: 0,
    eventPoints: 0,

    manualEventRuns: 0,
    bgEventRuns: 0,

    normalManualRuns: 0,
    normalBgRuns: 0,

    earnedItems: 0
  };

  while (elapsed < totalSeconds) {
    const periodSeconds = Math.min(
      MAX_DAILY_SECONDS,
      totalSeconds - elapsed
    );

    const result = simulateDay(
      periodSeconds,
      currentItems,
      elapsed
    );

    if (!result) {
      break;
    }

    currentItems = result.currentItems;

    total.eventRuns += result.actualEventRuns;
    total.eventPoints += result.dailyPoint;

    total.manualEventRuns +=
      result.manualEventRuns || 0;

    total.bgEventRuns +=
      result.bgEventRuns || 0;

    total.normalManualRuns +=
      result.normalManualRuns || 0;

    total.normalBgRuns +=
      result.normalBgRuns || 0;

    total.earnedItems +=
      result.totalItems || 0;

    elapsed += periodSeconds;
  }

  return {
    ...total,
    currentItems,
    elapsedSeconds: elapsed,
    completed: elapsed >= totalSeconds
  };
}

// ===================================
// フル手打ち・フルBGの時間内シミュレーション
// ===================================




function simulateSinglePeriod(
  periodSeconds,
  isManual,
  song,
  eventTime,
  networkTime,
  itemMap,
  bonusSchedule,
  startingItems = 0,
  elapsedStartSeconds = 0
) {
  const EPS = 1e-7;

  const averageItem = isManual
    ? calculateManualAverage(itemMap, false)
    : itemMap.Dコン;

  if (!Number.isFinite(averageItem) || averageItem <= 0) {
    return null;
  }

  if (
    startingItems < -EPS ||
    startingItems > requiredItems + EPS
  ) {
    return null;
  }

  const normalCycle = getCycleTime(
    song.time, isManual, false, networkTime
  );

  const eventCycle = getCycleTime(
    eventTime, isManual, true, networkTime
  );

  const canUseEvent =
    eventTime > 0 && eventCycle.cycle > 0;

  const maxNormal = capacityFor(
    periodSeconds, normalCycle
  );

  const maxEvent = canUseEvent
    ? capacityFor(periodSeconds, eventCycle)
    : 0;

  // 通常曲の目標回数を変えて、
  // 実際に成立するプレイ順序を調べる
  function simulateTarget(targetNormalRuns) {
    let items = startingItems;
    let elapsed = 0;

    let earned = 0;
    let consumed = 0;

    let normalRuns = 0;
    let eventRuns = 0;

    let normalTime = 0;
    let eventTimeUsed = 0;

    let points = 0;

    let phase = "normal";
    let firstPlay = true;

    for (
      let step = 0;
      step < maxNormal + maxEvent + 2;
      step++
    ) {
      const normalCost =
        normalCycle.cycle -
        (firstPlay ? normalCycle.standby : 0);

      const eventCost =
        eventCycle.cycle -
        (firstPlay ? eventCycle.standby : 0);

      // 通常曲をプレイできるか
      const normalOK =
        normalRuns < targetNormalRuns &&
        items + averageItem <= requiredItems + EPS &&
        elapsed + normalCost <= periodSeconds + EPS;

      // イベント曲をプレイできるか
      const eventOK =
        canUseEvent &&
        items + EPS >= itemsPerEventSong &&
        elapsed + eventCost <= periodSeconds + EPS;

      let selected = null;

      if (phase === "normal") {
        if (normalOK) {
          selected = "normal";
        } else if (eventOK) {
          phase = "event";
          selected = "event";
        }
      } else {
        if (eventOK) {
          selected = "event";
        } else if (normalOK) {
          phase = "normal";
          selected = "normal";
        }
      }

      if (selected === null) {
        break;
      }

      if (selected === "normal") {
        normalRuns++;

        items += averageItem;
        earned += averageItem;

        elapsed += normalCost;
        normalTime += normalCost;
      } else {
        const bonus = getBonusAtElapsed(
          elapsedStartSeconds + elapsed,
          bonusSchedule
        );

        points += calculateEventPoint(
          bonus + (
            isManual ? manualBonusAddition : 0
          )
        );

        eventRuns++;

        items -= itemsPerEventSong;
        consumed += itemsPerEventSong;

        elapsed += eventCost;
        eventTimeUsed += eventCost;
      }

      firstPlay = false;
    }

    // 予定した通常曲の回数を実施できなければ除外
    if (normalRuns !== targetNormalRuns) {
      return null;
    }

    return {
      errors: [],

      averageItem,

      totalItems: earned,
      usedItems: consumed,
      currentItems: Math.max(0, items),

      normalManualRuns: isManual
        ? normalRuns
        : 0,

      normalBgRuns: isManual
        ? 0
        : normalRuns,

      manualEventRuns: isManual
        ? eventRuns
        : 0,

      bgEventRuns: isManual
        ? 0
        : eventRuns,

      actualEventRuns: eventRuns,

      dailyPoint: points,

      manualDailyPoint: isManual
        ? points
        : 0,

      bgDailyPoint: isManual
        ? 0
        : points,

      normalFullTime: normalTime,
      eventFullTime: eventTimeUsed,

      normalManualTime: isManual
        ? normalTime
        : 0,

      eventManualTime: isManual
        ? eventTimeUsed
        : 0
    };
  }

  // ===================================
  // 最も効率のよい候補を選択
  // ===================================

  let best = null;

  for (
    let targetNormal = 0;
    targetNormal <= maxNormal;
    targetNormal++
  ) {
    const candidate = simulateTarget(targetNormal);

    if (!candidate) {
      continue;
    }

    // 獲得ptを最優先
    // 同点ならイベント曲回数、
    // さらに通常曲の獲得アイテム数を優先
    if (
      best === null ||
      candidate.dailyPoint > best.dailyPoint + EPS ||
      (
        Math.abs(
          candidate.dailyPoint - best.dailyPoint
        ) <= EPS &&
        (
          candidate.actualEventRuns >
            best.actualEventRuns ||
          (
            candidate.actualEventRuns ===
              best.actualEventRuns &&
            candidate.totalItems > best.totalItems
          )
        )
      )
    ) {
      best = candidate;
    }
  }

  return best;
}




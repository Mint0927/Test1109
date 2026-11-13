// ===================================
// 計算実行
// ===================================






function renderDailyPointChart(days) {
  const container = document.getElementById("dailyPointChart");
  if (!container) return;

  container.replaceChildren();

  if (!Array.isArray(days) || days.length === 0) return;

  const values = days.map(day =>
    Math.max(0, Number(day.dailyPoint) || 0)
  );

  const maximum = Math.max(...values, 1);

  // 縦軸を見やすい数値に丸める
  const rawStep = maximum / 5;
  const magnitude = Math.pow(
    10,
    Math.floor(Math.log10(rawStep))
  );
  const step = Math.ceil(rawStep / magnitude) * magnitude;
  const axisMax = step * 5;

  // グラフ全体
  const chart = document.createElement("div");
  chart.className = "point-chart-layout";

  // 左側：縦軸
  const axis = document.createElement("div");
  axis.className = "point-chart-axis";

  for (let i = 5; i >= 0; i--) {
    const label = document.createElement("span");
    label.textContent = (step * i).toLocaleString();
    axis.appendChild(label);
  }

  // 右側：棒グラフ
  const plot = document.createElement("div");
  plot.className = "point-chart-plot";
  plot.style.setProperty("--chart-days", days.length);

  // 補助線
  const grid = document.createElement("div");
  grid.className = "point-chart-grid";

  for (let i = 0; i <= 5; i++) {
    const line = document.createElement("div");
    line.className = "point-chart-grid-line";
    grid.appendChild(line);
  }

  plot.appendChild(grid);

  // 棒グラフ
  days.forEach((day, index) => {
    const point = values[index];
    const percent = (point / axisMax) * 100;

    const column = document.createElement("div");
    column.className = "point-chart-column";
    if (day.forecast || day.date > new Date().toLocaleDateString("sv-SE")) column.classList.add("point-chart-forecast");

    const valueLabel = document.createElement("div");
    valueLabel.className = "point-chart-value";
    valueLabel.textContent = point.toLocaleString();

const bar = document.createElement("div");
bar.className = "point-chart-bar";

// グラフの高さ220pxを基準に計算
const barHeight = (point / axisMax) * 220;

bar.style.height = `${barHeight}px`;
    bar.title = `${index + 1}日目：${point.toLocaleString()} pt${column.classList.contains("point-chart-forecast") ? "（予測）" : ""}`;

    const dayLabel = document.createElement("div");
    dayLabel.className = "point-chart-day";
    dayLabel.textContent = `${index + 1}日目${column.classList.contains("point-chart-forecast") ? "（予測）" : ""}`;

valueLabel.style.bottom = `${barHeight + 5}px`;
valueLabel.style.top = "auto";

column.append(valueLabel, bar, dayLabel);
    plot.appendChild(column);
  });

  chart.append(axis, plot);
  container.appendChild(chart);
}





function switchResultView(isMixedMode) {
  const eventSummary = $("eventSummaryResult");
  const normalResult = $("results");

  const commonSummary = document.querySelector(".result-summary");
  const resultContent = normalResult?.querySelector(".result-content");

  if (!eventSummary || !normalResult || !commonSummary || !resultContent) {
    return;
  }

  // 共通5項目をモードに応じた場所へ移動
  if (isMixedMode) {
    // 混合モード：日別詳細の下
    eventSummary.appendChild(commonSummary);
  } else {
    // フル手打ち・フルBG：従来のResult内
    resultContent.prepend(commonSummary);
  }

  // 表示切り替え
  eventSummary.hidden = !isMixedMode;
  normalResult.hidden = isMixedMode;
}


function renderDailyResultDetails(days) {
  const tabs = document.getElementById("resultDayTabs");

  if (!tabs || !Array.isArray(days) || days.length === 0) {
    return;
  }

  tabs.replaceChildren();

  function showDay(index) {
    const day = days[index];
    if (!day) return;

    const setting = getEffectiveDaySetting(index);

    document.getElementById("resultSelectedDay").textContent =
      `${index + 1}日目（${day.forecast ? "予測" : "確定"}）`;

    document.getElementById("resultNormalBgTime").textContent =
      secToTime(day.normalBgSeconds ?? setting?.normalBg ?? 0);

    document.getElementById("resultEventBgTime").textContent =
      secToTime(day.eventBgSeconds ?? setting?.eventBg ?? 0);

    document.getElementById("resultEarnedItems").textContent =
      Math.floor(day.totalItems ?? 0).toLocaleString();

    document.getElementById("resultDailyPoints").textContent =
      Math.floor(day.dailyPoint ?? 0).toLocaleString();
    const extra=document.getElementById("resultSetDayExtra");
    if(extra){
      extra.replaceChildren();
      if(day.calculated){
        const p=document.createElement("p");
        p.textContent=`就寝前 ${Math.floor(day.preBedPoints||0).toLocaleString()} pt ＋ 夜間イベントBG ${Math.floor(day.nightPoints||0).toLocaleString()} pt ＝ ${Math.floor(day.dailyPoint||0).toLocaleString()} pt（${day.forecast ? "予測" : "確定"}）`;
        extra.appendChild(p);
      }
    }

    tabs.querySelectorAll(".result-day-tab").forEach(
      (button, buttonIndex) => {
        button.classList.toggle(
          "active",
          buttonIndex === index
        );
      }
    );
  }

  days.forEach((day, index) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "event-date-tab result-day-tab";
    button.textContent = `${index + 1}日目`;

    button.addEventListener("click", () => {
      showDay(index);
    });

    tabs.appendChild(button);
  });

  // 初期表示は1日目
  showDay(0);
}



function showEventSummaryResult(projection) {
  if (!projection || !Array.isArray(projection.days)) {
    return;
  }

  // 予測Resultはセット履歴とは別。表示時点のプレイ入力を使って独立計算。
  if(typeof window.calculateIndependentDailyForecast==='function' && getSelectedPlayMode()==='both'){
    try {
      const independent=window.calculateIndependentDailyForecast();
      if(independent?.days?.length)projection=independent;
    } catch(error) {
      console.warn('日別予測は既存の予測を表示します',error);
    }
  }
  const days=typeof window.prepareForecastDays === "function" ? window.prepareForecastDays(projection.days) : projection.days;
  if (typeof window.renderForecastDayList === "function") window.renderForecastDayList(days);
  // 総合獲得ポイント
  const totalPoints = days.reduce(
    (total, day) =>
      total + (Number(day.dailyPoint) || 0),
    0
  );

  $("eventTotalPoints").textContent =
    Math.floor(totalPoints).toLocaleString();

  $("eventTotalDays").textContent =
    `イベント全${days.length}日間の合計`;

  // 日別ポイント一覧を優先し、従来の棒グラフは非表示
  const oldChart = document.getElementById("dailyPointChart")?.closest(".result-daily-panel");
  if (oldChart) oldChart.hidden = true;

  // 日別詳細
  renderDailyResultDetails(days);

  // 新Result画面を表示
  $("eventSummaryResult").hidden = false;
}




function showCalculationError(message) {
  const area = $("calculationError");
  if (!area) { alert(message); return; }
  area.textContent = message;
  area.hidden = false;
  area.scrollIntoView({ behavior: "smooth", block: "center" });
}

function clearCalculationError() {
  const area = $("calculationError");
  if (area) { area.hidden = true; area.textContent = ""; }
}

function runCalculation() {
  clearCalculationError();
  const mode = getSelectedPlayMode();

  if (!validateCommonInputs(mode)) return;

  if (!eventDateList.length) {
    showCalculationError("イベント日程を設定してください。");
    return;
  }

  saveCurrentDayInputs();
  if (mode === "both") {
    // 未来の日付まで確定を要求しない。現在選択中の日だけを確認する。
    // 設定未変更の日は既存の初日設定の引き継ぎ機能で計算する。
    const selected = selectedEventDayIndex;
    const effective = selected > 0 && !dailySettings[selected]?.useOwnSettings ? 0 : selected;
    if (confirmedDaySignatures.get(effective) !== daySignature(effective)) {
      showCalculationError(`${selected+1}日目の設定が未確定です。「この日の設定を決定」を押してください。`);
      return;
    }
  }

  const song = normalSongs[$("normalSong").selectedIndex];
  const eventTime = getEventInputTime();
  const networkTime = getNetworkTime();
  const itemMap = getItemMap();

  const originalIndex = selectedEventDayIndex;

  let projection;

  try {
    projection = simulateEventByDays(
      mode,
      song,
      eventTime,
      networkTime,
      itemMap
    );
  } catch (error) {
    console.error('計測エラー',error);
    showCalculationError('計測できませんでした：'+(error?.message||String(error)));
    return;
  } finally {
    // 計算前に選択していた日付へ戻す
    setWheelValue("normalBg", 0);
    setWheelValue("eventBg", 0);
    applyDayInputs(originalIndex);
    renderEventDateTabs();
  }

  if (!projection) {
    // 失敗を黙って無視せず、利用者に画面上で理由を知らせる。
    if ($('calculationError')?.hidden) showCalculationError('本日の計算条件を確認してください。未来日は予測のみで確定しません。');
    return;
  }

  const firstDay = projection.days[0];

  if (mode === "both") {
    const result = {
      ...firstDay,
      projectedEventRuns: projection.totalEventRuns,
      projectedPoint: projection.totalPoints,
      projection
    };

    showMixedResult(song, result);

  } else {
    const isManual = !isFullBackground;

    const averageItem = isManual
      ? calculateManualAverage(itemMap, false)
      : itemMap.Dコン;

    const normalCycle = getCycleTime(
      song.time, isManual, false, networkTime
    );

    const eventCycle = getCycleTime(
      eventTime, isManual, true, networkTime
    );

    const result = {
      averageItem,
      normalFullTime:
        (requiredItems / averageItem) *
        normalCycle.cycle - normalCycle.standby,
      eventFullTime: usedTime(eventFullCount, eventCycle),
      dailyEventRuns: firstDay.actualEventRuns,
      dayPoint: firstDay.dailyPoint,
      projectedPoint: projection.totalPoints
    };

    showSingleResult(song, isManual, result);
  }

// プレイモードによってResult画面を切り替える
if (mode === "both") {
  // 混合モード：新しいResult画面
  showEventSummaryResult(projection);
  switchResultView(true);
} else {
  // フル手打ち・フルバックグラウンド：従来のResult画面
  switchResultView(false);
}

// 保存
saveLocalData();

// Result画面へ移動
showScreen("result");
}


$("calc").addEventListener("click", runCalculation);


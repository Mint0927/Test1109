// ===================================
// 共通ホイール設定
// ===================================

// ダイアログで使用するホイールID
const dialogWheelIds = {
  Hour: "dialogHourWheel",
  Min: "dialogMinWheel",
  Sec: "dialogSecWheel"
};

// 現在編集している時間の種類
let activeWheelKey = null;

// ダイアログ内の仮設定時間
let dialogWheelDraft = null;

// ダイアログを開く前のスクロール状態
let previousBodyOverflow = "";


// ===================================
// 時間表示更新
// ===================================

function updateWheelTimeDisplay(key) {

  const textId = key === "normalBg"
    ? "normalBgTimeText"
    : "eventBgTimeText";

  $(textId).textContent =
    secToTime(wheelState[key].seconds);
}


// ===================================
// ホイール描画
// 上下の余白と数字の高さを固定
// ===================================

function renderWheel(key, unit, maxValue, selectedValue) {

  const wheel = $(dialogWheelIds[unit]);

  if (!wheel) return;

  const rowHeight = WHEEL_ROW_HEIGHT;

  // ホイールの表示領域の高さ
  const wheelHeight = wheel.clientHeight;

  // 数字を中央に配置するための上下余白
  const spacerHeight = Math.max(
    0,
    (wheelHeight - rowHeight) / 2
  );

  wheel.innerHTML = "";

  // 上側の余白
  const topSpacer = document.createElement("div");

  topSpacer.className = "wheel-spacer";

  topSpacer.style.height = `${spacerHeight}px`;
  topSpacer.style.minHeight = `${spacerHeight}px`;
  topSpacer.style.flex = `0 0 ${spacerHeight}px`;

  wheel.appendChild(topSpacer);

  // 数字を作成
  for (let value = 0; value <= maxValue; value++) {

    const option = document.createElement("div");

    option.className = "wheel-option";
    option.dataset.value = String(value);
    option.textContent = String(value);

    // 数字の高さを40pxに固定
    option.style.height = `${rowHeight}px`;
    option.style.minHeight = `${rowHeight}px`;
    option.style.maxHeight = `${rowHeight}px`;
    option.style.flex = `0 0 ${rowHeight}px`;
    option.style.boxSizing = "border-box";
    option.style.margin = "0";

    wheel.appendChild(option);
  }

  // 下側の余白
  const bottomSpacer = document.createElement("div");

  bottomSpacer.className = "wheel-spacer";

  bottomSpacer.style.height = `${spacerHeight}px`;
  bottomSpacer.style.minHeight = `${spacerHeight}px`;
  bottomSpacer.style.flex = `0 0 ${spacerHeight}px`;

  wheel.appendChild(bottomSpacer);

  wheel.dataset.rowHeight = String(rowHeight);

  // 選択数字を中央に配置
  wheel.scrollTop = selectedValue * rowHeight;

  updateWheelHighlight(wheel);
}


// ===================================
// ホイール選択位置更新
// 実際に中央にある数字を取得
// ===================================

function updateWheelHighlight(wheel) {

  const options = [
    ...wheel.querySelectorAll(".wheel-option")
  ];

  if (options.length === 0) return 0;

  const wheelRect = wheel.getBoundingClientRect();

  const centerY =
    wheelRect.top + wheelRect.height / 2;

  let selectedOption = options[0];
  let minDistance = Infinity;

  options.forEach(option => {

    const rect = option.getBoundingClientRect();

    const optionCenter =
      rect.top + rect.height / 2;

    const distance = Math.abs(
      centerY - optionCenter
    );

    if (distance < minDistance) {
      minDistance = distance;
      selectedOption = option;
    }

  });

  options.forEach(option => {

    option.classList.toggle(
      "selected",
      option === selectedOption
    );

  });

  return Number(selectedOption.dataset.value);
}


// ===================================
// BG時間の上限
// ===================================

function getWheelMaxSeconds(key) {

  const otherKey = key === "normalBg"
    ? "eventBg"
    : "normalBg";

  const otherSeconds =
    wheelState[otherKey]?.seconds || 0;

  if (
    key === "eventBg" &&
    getEventInputTime() <= 0
  ) {
    return 0;
  }

  return Math.max(
    0,
    MAX_DAILY_SECONDS - otherSeconds
  );
}


// ===================================
// ホイールの各項目の最大値
// ===================================

function getWheelUnitMax(
  key,
  unit,
  current = wheelState[key]
) {

  const maxSeconds = getWheelMaxSeconds(key);

  if (unit === "Hour") {

    return Math.floor(maxSeconds / 3600);

  }

  if (unit === "Min") {

    if (current.hour * 3600 > maxSeconds) {
      return 0;
    }

    const remaining =
      maxSeconds - current.hour * 3600;

    return Math.min(
      59,
      Math.floor(remaining / 60)
    );

  }

  if (unit === "Sec") {

    const used =
      current.hour * 3600 +
      current.minute * 60;

    if (used > maxSeconds) {
      return 0;
    }

    return Math.min(
      59,
      maxSeconds - used
    );

  }

  return 0;
}


// ===================================
// ダイアログ内ホイール描画
// ===================================

function renderDialogWheels() {

  if (!activeWheelKey || !dialogWheelDraft) {
    return;
  }

  const key = activeWheelKey;
  const current = dialogWheelDraft;

  ["Hour", "Min", "Sec"].forEach(unit => {

    const stateValue =
      unit === "Hour"
        ? current.hour
        : unit === "Min"
          ? current.minute
          : current.second;

    renderWheel(
      key,
      unit,
      getWheelUnitMax(key, unit, current),
      stateValue
    );

  });

}


// ===================================
// 確定済みホイールの値を設定
// ===================================

function setWheelValue(key, totalSeconds) {

  totalSeconds = Math.max(
    0,
    Math.floor(totalSeconds || 0)
  );

  // 回数設定の正確な所要時間を維持（超過は検証側でエラー）

  const hour = Math.floor(totalSeconds / 3600);
  const minute = Math.floor((totalSeconds % 3600) / 60);
  const second = totalSeconds % 60;

  wheelState[key] = {
    seconds: totalSeconds,
    hour,
    minute,
    second
  };

  updateWheelTimeDisplay(key);

  updateDailyTimeTotal();

  if (activeWheelKey === key) {
    dialogWheelDraft = { ...wheelState[key] };
    renderDialogWheels();
  }

}


// ===================================
// ホイール上限更新
// ===================================

function refreshWheelLimits() {
  // BGは回数指定。曲時間変更時も回数を維持して必要時間を再計算する。
  updateDailyTimeTotal();
}


// ===================================
// ダイアログ内の仮時間を更新
// ===================================

function updateWheelValueFromScroll(unit, value) {

  if (!activeWheelKey || !dialogWheelDraft) {
    return;
  }

  const key = activeWheelKey;
  const current = { ...dialogWheelDraft };

  if (unit === "Hour") {
    current.hour = value;
  }

  if (unit === "Min") {
    current.minute = value;
  }

  if (unit === "Sec") {
    current.second = value;
  }

  const maxSeconds = getWheelMaxSeconds(key);

  let totalSeconds =
    current.hour * 3600 +
    current.minute * 60 +
    current.second;

  totalSeconds = Math.max(
    0,
    Math.min(totalSeconds, maxSeconds)
  );

  dialogWheelDraft = {
    seconds: totalSeconds,
    hour: Math.floor(totalSeconds / 3600),
    minute: Math.floor((totalSeconds % 3600) / 60),
    second: totalSeconds % 60
  };

  // 時間変更後は分・秒の選択可能範囲を更新
  if (unit === "Hour") {
    renderWheel(
      key,
      "Min",
      getWheelUnitMax(key, "Min", dialogWheelDraft),
      dialogWheelDraft.minute
    );

    renderWheel(
      key,
      "Sec",
      getWheelUnitMax(key, "Sec", dialogWheelDraft),
      dialogWheelDraft.second
    );
  }

  // 分変更後は秒の選択可能範囲を更新
  if (unit === "Min") {
    renderWheel(
      key,
      "Sec",
      getWheelUnitMax(key, "Sec", dialogWheelDraft),
      dialogWheelDraft.second
    );
  }
}


// ===================================
// ダイアログを開く
// ===================================

function openTimeDialog(key) {
  hideDailyCheckStatus();

  activeWheelKey = key;

  dialogWheelDraft = {
    ...wheelState[key]
  };

  $("timeDialogTitle").textContent =
    key === "normalBg"
      ? "通常曲BG時間設定"
      : "イベント曲BG時間設定";

  // ダイアログを表示
$("timeDialogOverlay").hidden = false;

// 表示後にホイールを描画
requestAnimationFrame(() => {
  renderDialogWheels();
});

  previousBodyOverflow =
    document.body.style.overflow;

  document.body.style.overflow = "hidden";

  $("timeDialogOverlay").hidden = false;

  $("confirmTimeDialog").focus();

}


// ===================================
// 日別設定のリアルタイム判定

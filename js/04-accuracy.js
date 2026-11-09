// ===================================
// 精度設定
// ===================================

accuracyIds.forEach(id => {
  const select = $(id);

  for (let i = 0; i <= 100; i += 10) {
    const option = document.createElement("option");

    option.value = i;
    option.textContent = `${i}%`;

    select.appendChild(option);
  }

  select.value = "0";

  select.addEventListener("change", () => {
    updateAccuracyLimit();
    // BG回数は精度変更ではリセットしない。

    depletionAlertActive = false;
    eventTimeAlertActive = false;

    resetResult();
    updateMixedPreview();
  });
});

function updateAccuracyLimit() {
  accuracyIds.forEach(id => {
    const select = $(id);

    const otherTotal = accuracyIds
      .filter(other => other !== id)
      .reduce((sum, other) => {
        return sum + Number($(other).value || 0);
      }, 0);

    Array.from(select.options).forEach(option => {
      const disabled =
        otherTotal + Number(option.value) > 100;

      option.disabled = disabled;
      option.hidden = disabled;
    });
  });
}

updateAccuracyLimit();

// ===================================
// 手打ち平均アイテム数
// ===================================

function calculateManualAverage(itemMap, showAlert = true) {
  let totalPercent = 0;
  let average = 0;

  accuracyIds.forEach(id => {
    const percent = Number($(id).value || 0);

    totalPercent += percent;
    average += itemMap[id] * percent / 100;
  });

  if (totalPercent !== 100) {
    if (showAlert) {
      alert("通常曲の精度の合計を100%にしてください。");
    }

    return null;
  }

  return average;
}

// ===================================
// イベントポイント
// ===================================

function calculateEventPoint(bonus) {
  return Math.floor(
    1150 * (1 + bonus / 100) + 288
  );
}

function updateEventPoint() {
  const input = $("bonus");
  const bonus = Number(input.value);

  if (
    input.value === "" ||
    !Number.isInteger(bonus) ||
    bonus < 0 ||
    bonus > 9999
  ) {
    $("eventPoint").textContent = "pt";
    return;
  }

  $("eventPoint").textContent =
    `${calculateEventPoint(bonus).toLocaleString()} pt`;
}

$("bonus").addEventListener("input", () => {
  updateEventPoint();
  resetResult();
  updateMixedPreview();
});

updateEventPoint();


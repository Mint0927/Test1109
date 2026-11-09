
function saveCurrentAppSettings() {
  saveCurrentDayInputs();
  saveLocalData();
}

// 通常曲・イベント曲・特攻値
[
  "normalSong",
  "eventMin",
  "eventSec",
  "bonus"
].forEach(id => {
  const element = $(id);
  if (!element) return;

  element.addEventListener("input", saveCurrentAppSettings);
  element.addEventListener("change", saveCurrentAppSettings);
});

// 精度
accuracyIds.forEach(id => {
  $(id).addEventListener("change", saveCurrentAppSettings);
});

// 特攻値変更欄（動的生成される入力欄も対象）
$("bonusChanges").addEventListener(
  "input",
  saveCurrentAppSettings
);

$("bonusChanges").addEventListener(
  "change",
  saveCurrentAppSettings
);

// 特攻値変更欄の追加・削除
$("addBonusChange").addEventListener(
  "click",
  () => saveLocalData()
);

$("bonusChanges").addEventListener("click", event => {
  if (event.target.closest(".delete-bonus-button")) {
    // 既存の削除処理が終わった後に保存
    queueMicrotask(saveLocalData);
  }
});


/* ==========================================
   回線速度・プレイ方法の自動保存
========================================== */

// プレイ方法を変更したとき
document.querySelectorAll(
  'input[name="playMode"]'
).forEach(radio => {
  radio.addEventListener("change", saveLocalData);
});

// 回線速度を変更したとき
document.querySelectorAll(
  'input[name="network"]'
).forEach(radio => {
  radio.addEventListener("change", saveLocalData);
});

// フル手打ちを選択したとき
manualModeButton.addEventListener(
  "click",
  saveLocalData
);

// フルバクグラを選択したとき
backgroundModeButton.addEventListener(
  "click",
  saveLocalData
);




  // ===================================
// 保存データの読み込み
// ===================================

loadLocalData();


/* ==========================================
   混合モード専用の日付設定表示
========================================== */

function updateMixedDaySettingsVisibility() {
  const area = document.getElementById("mixedDaySettings");

  if (!area) return;

  const selectedMode = document.querySelector(
    'input[name="playMode"]:checked'
  );

  if (!selectedMode) return;

  area.hidden = selectedMode.value !== "both";
}

document.querySelectorAll('input[name="playMode"]').forEach(radio => {
  radio.addEventListener("change", updateMixedDaySettingsVisibility);
});

updateMixedDaySettingsVisibility();

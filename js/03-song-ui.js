// エラー表示
// ===================================

function showMixedCalculationError(errors) {
  const messages = [];

  if (errors.includes("limit")) {
    messages.push(
      "通常曲で獲得するアイテムが99,999個を超えてしまいます。"
    );
  }

  if (errors.includes("depletion")) {
    messages.push(
      "イベント曲BGの設定回数を実現するためのアイテムが不足しています。"
    );
  }

  if (messages.length === 0) {
    messages.push(
      "設定した時間でプレイできる組み合わせが見つかりませんでした。"
    );
  }

  alert(
    "設定したBGプレイ回数では計算できません。\n\n" +
    messages.join("\n") +
    "\n\n通常曲BGまたはイベント曲BGの回数を調整してください。"
  );
}

// ===================================
// 画面切り替え
// ===================================

function showScreen(name) {
  $("settingsScreen").hidden = name !== "settings";
  $("playScreen").hidden = name !== "play";
  $("resultScreen").hidden = name !== "result";
}

$("openSettings").addEventListener("click", () => {
  showScreen("settings");
});


$("saveSettings").addEventListener("click", () => {
  // 現在の日別設定を保存
  saveCurrentDayInputs();

  // イベント日程を作成
  if (!createEventDateList()) {
    return;
  }

  // 1日目を表示
  selectedEventDayIndex = 0;
  applyDayInputs(0);
  renderEventDateTabs();

  // ローカル保存。明示的な保存操作が完了してから初期設定完了とする。
  saveLocalData();
  localStorage.setItem("nogifes_initial_setup_completed_v1", "1");

  showScreen("play");
  updatePlayMode();
  refreshWheelLimits();
});


$("backToPlay").addEventListener("click", () => {
  showScreen("play");
});

// ===================================
// 通常曲選択
// ===================================

normalSongs.forEach((song, index) => {
  const option = document.createElement("option");

  option.value = index;
  option.textContent = song.name;

  $("normalSong").appendChild(option);
});

function updateNormalSongTime() {
  const song = normalSongs[$("normalSong").selectedIndex];

  $("normalMin").value = Math.floor(song.time / 60);
  $("normalSec").value = song.time % 60;

  resetResult();
  updateMixedPreview();
}

$("normalSong").addEventListener("change", updateNormalSongTime);

queueMicrotask(updateNormalSongTime);


// ===================================
// ダイアログ操作イベント
// ===================================

// 通常曲BGを開く
$("openNormalBgTime")?.addEventListener("click", () => {
  openTimeDialog("normalBg");
});

// イベント曲BGを開く
$("openEventBgTime")?.addEventListener("click", () => {
  openTimeDialog("eventBg");
});

// 決定
$("confirmTimeDialog").addEventListener(
  "click",
  confirmTimeDialog
);


// ===================================
// 共通ホイールイベント
// ===================================

["Hour","Min","Sec"].forEach(unit=>{
 const wheel=$(dialogWheelIds[unit]);
 wheel.addEventListener("scroll",()=>{
  if(wheelInternalScroll)return;
  wheelScrollChanged(unit);
 },{passive:true});
 // マウスホイールを少し速める
 wheel.addEventListener("wheel",event=>{
  event.preventDefault();
  wheel.scrollTop+=Math.sign(event.deltaY)*Math.max(40,Math.abs(event.deltaY)*1.65);
 },{passive:false});
 // 中央以外の数字もタップで直接選択
 wheel.addEventListener("click",event=>{
  const option=event.target.closest(".wheel-option");if(!option)return;
  const options=[...wheel.querySelectorAll(".wheel-option")];
  const index=options.indexOf(option);
  if(index<0)return;
  wheel.scrollTo({top:index*wheelRows,behavior:"smooth"});
  updateWheelValueFromScroll(unit,Number(option.dataset.value));
 });
});

// ===================================
// 背景操作のロック
// ===================================

const timeDialogOverlay = $("timeDialogOverlay");

// 背景をタップしても閉じない
timeDialogOverlay.addEventListener("click", event => {

  if (event.target === timeDialogOverlay) {
    event.preventDefault();
  }

});

// 背景部分のスクロールを禁止
timeDialogOverlay.addEventListener(
  "wheel",
  event => {

    if (!event.target.closest(".time-dialog")) {
      event.preventDefault();
    }

  },
  { passive: false }
);

timeDialogOverlay.addEventListener(
  "touchmove",
  event => {

    if (!event.target.closest(".time-dialog")) {
      event.preventDefault();
    }

  },
  { passive: false }
);


// ===================================
// ダイアログ内のキーボード操作制限
// ===================================

timeDialogOverlay.addEventListener("keydown", event => {

  if (event.key === "Escape") {
    event.preventDefault();
    return;
  }

  if (event.key !== "Tab") {
    return;
  }

  const controls = [
    $("dialogHourWheel"),
    $("dialogMinWheel"),
    $("dialogSecWheel"),
    $("confirmTimeDialog")
  ];

  const first = controls[0];
  const last = controls[controls.length - 1];

  if (
    event.shiftKey &&
    document.activeElement === first
  ) {

    event.preventDefault();
    last.focus();

  } else if (
    !event.shiftKey &&
    document.activeElement === last
  ) {

    event.preventDefault();
    first.focus();

  }

});


// ===================================
// ホイール初期化
// ===================================

function initializeWheels() {

  setWheelValue("normalBg", 0);
  setWheelValue("eventBg", 0);

  refreshWheelLimits();

}

initializeWheels();

function showScreen(name) {
  $("settingsScreen").hidden = name !== "settings";
  $("playScreen").hidden = name !== "play";
  $("resultScreen").hidden = name !== "result";

  // 設定画面では設定ボタンを非表示
  $("openSettings").hidden = name === "settings";
}

// ===================================
// イベント曲時間変更
// ===================================

["eventMin", "eventSec"].forEach(id => {
  $(id).addEventListener("input", () => {
    const time = getEventInputTime();

    if (time > 0) {
      eventTimeAlertActive = false;

    } else if (
      !eventTimeAlertActive &&
      getSelectedPlayMode() === "both"
    ) {
      eventTimeAlertActive = true;

      alert(
        "イベント曲の時間が未入力です。イベント曲の時間を入力してください。"
      );
      showScreen("settings");
    }

    refreshWheelLimits();

    resetResult();
    updateMixedPreview();
  });
});

// ===================================
// 通常曲変更
// ===================================

$("normalSong").addEventListener("change", () => {
  refreshWheelLimits();
  resetResult();
  updateMixedPreview();
});

// ===================================
// 通信速度変更
// ===================================

document.querySelectorAll('input[name="network"]').forEach(input => {
  input.addEventListener("change", () => {
    refreshWheelLimits();
    resetResult();
    updateMixedPreview();
  });
});

// ===================================
// プレイモード変更
// ===================================

document.querySelectorAll('input[name="playMode"]').forEach(input => {
  input.addEventListener("change", () => {
    eventTimeAlertActive = false;
    depletionAlertActive = false;
  });
});

$("eventMin").addEventListener("change", () => {
  if (getEventInputTime() > 0) {
    eventTimeAlertActive = false;
  }
});

// ===================================
// 初期表示
// ===================================

showScreen("settings");

updatePlayMode();
updateDailyTimeTotal();
updateBonusChangePoints();

// ===================================
// イベント日程管理
// ===================================



/* ==========================================
   イベント日程・ローカル保存
========================================== */

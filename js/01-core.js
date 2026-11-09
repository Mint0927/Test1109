"use strict";

// ===================================
// DOM取得
// ===================================

const $ = id => document.getElementById(id);

// ===================================
// 曲・アイテム設定
// ===================================

const normalSongs = [
  { name: "最後のTightHug", time: 212, lp: 81 },
  { name: "サヨナラの意味 向井葉月セレモニー", time: 213, lp: 81 },
  { name: "あと7曲", time: 213, lp: 81 },
  { name: "三番目の風", time: 214, lp: 81 },
  { name: "渋谷ブルース", time: 197, lp: 75 }
];

const accuracyIds = [
  "フルエク",
  "フルコン",
  "Aコン",
  "Bコン",
  "Cコン",
  "Dコン"
];

const itemMapLP81 = {
  フルエク: 930,
  フルコン: 898,
  Aコン: 868,
  Bコン: 836,
  Cコン: 806,
  Dコン: 774
};

const itemMapLP75 = {
  フルエク: 858,
  フルコン: 828,
  Aコン: 800,
  Bコン: 772,
  Cコン: 744,
  Dコン: 714
};

// ===================================
// 定数
// ===================================
const EVENT_START_HOUR = 15;
const EVENT_DAY_SECONDS = 24 * 60 * 60;
const EVENT_FIRST_DAY_SECONDS = 9 * 60 * 60;
const standbyBackground = 15;
const requiredItems = 99999;
const eventFullCount = 114;
const itemsPerEventSong = 875;
const manualBonusAddition = 144;
const eventDurationHours = 225;

const MAX_DAILY_SECONDS = 86400;
const WHEEL_ROW_HEIGHT = 40;

// ===================================
// 状態管理
// ===================================

const wheelState = {
  normalBg: {
    seconds: 0,
    hour: 0,
    minute: 0,
    second: 0
  },
  eventBg: {
    seconds: 0,
    hour: 0,
    minute: 0,
    second: 0
  }
};

let isFullBackground = false;
let depletionAlertActive = false;
let eventTimeAlertActive = false;
let latestMixedResult = null;

// ===================================
// 共通関数
// ===================================

function secToTime(seconds) {
  seconds = Math.max(0, Math.floor(seconds || 0));

  return `${Math.floor(seconds / 3600)}時間 ${Math.floor((seconds % 3600) / 60)}分 ${seconds % 60}秒`;
}

function getInputTime(h, m, s) {
  return Number($(h).value || 0) * 3600 +
    Number($(m).value || 0) * 60 +
    Number($(s).value || 0);
}

function getWheelMinutes(key) {
  return Math.floor((wheelState[key]?.seconds || 0) / 60);
}

function getWheelSeconds(key) {
  return wheelState[key]?.seconds || 0;
}

function getSelectedPlayMode() {
  return document.querySelector(
    'input[name="playMode"]:checked'
  ).value;
}

function getNetworkTime() {
  return Number(
    document.querySelector(
      'input[name="network"]:checked'
    ).value
  );
}

function getItemMap() {
  return normalSongs[$("normalSong").selectedIndex].lp === 75
    ? itemMapLP75
    : itemMapLP81;
}

function getEventInputTime() {
  return Number($("eventMin").value || 0) * 60 +
    Number($("eventSec").value || 0);
}

function getBonus() {
  return Number($("bonus").value || 0);
}

function resetResult() {
  $("results").classList.remove("has-result");
  $("mixedBreakdown").hidden = true;
}


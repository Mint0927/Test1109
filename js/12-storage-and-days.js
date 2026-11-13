
const STORAGE_KEY = "nogifesCalculatorData";

const eventStartDateInput = $("eventStartDate");
const eventDaysInput = $("eventDays");

let eventDateList = [];

// 設定を保存
function saveLocalData() {
  try {
    const bonusChanges = Array.from(
      document.querySelectorAll(".bonus-change-row")
    ).map(row => ({
      day: row.querySelector('[data-field="day"]').value,
      hour: row.querySelector('[data-field="hour"]').value,
      minute: row.querySelector('[data-field="minute"]').value,
      bonus: row.querySelector('[data-field="bonus"]').value
    }));


const data = {
  startDate: eventStartDateInput.value,
  days: eventDaysInput.value,

  // プレイ方法
  playMode: document.querySelector(
    'input[name="playMode"]:checked'
  )?.value ?? "both",

  // フル手打ち・フルバクグラ
  fullBackground: isFullBackground,
  wakeTime: $("wakeTimeInput")?.value,
  singleWakeTime: $("singleWakeTime")?.value,
  singleBedtime: $("singleBedtime")?.value,

  // 回線速度
  network: document.querySelector(
    'input[name="network"]:checked'
  )?.value ?? "26",

  normalSong: $("normalSong").value,
  eventMin: $("eventMin").value,
  eventSec: $("eventSec").value,
  bonus: $("bonus").value,

  bonusChanges,
  dailySettings
};


    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(data)
    );
  } catch (error) {
    console.error("設定の保存に失敗しました", error);
  }
}

// 設定を復元
function loadLocalData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    const data = JSON.parse(saved);

    if (!data || typeof data !== "object") return;


    
// ===================================
// プレイ方法の復元
// ===================================

if (data.playMode !== undefined) {
  if (data.playMode === "fullManual" && data.fullBackground === true) data.playMode = "fullBackground";
  const playModeRadio = Array.from(
    document.querySelectorAll('input[name="playMode"]')
  ).find(radio => radio.value === data.playMode);

  if (playModeRadio) {
    playModeRadio.checked = true;
  }
}

// ===================================
// フル手打ち・フルバクグラの復元
// ===================================

if (typeof data.fullBackground === "boolean" && data.playMode === undefined) {
  const legacyMode = document.querySelector(`input[name="playMode"][value="${data.fullBackground ? 'fullBackground' : 'fullManual'}"]`);
  if (legacyMode) legacyMode.checked = true;
}
if (data.wakeTime && $("wakeTimeInput")) $("wakeTimeInput").value = data.wakeTime;
if (data.singleWakeTime && $("singleWakeTime")) $("singleWakeTime").value = data.singleWakeTime;
if (data.singleBedtime && $("singleBedtime")) $("singleBedtime").value = data.singleBedtime;

// ===================================
// 回線速度の復元
// ===================================

if (data.network !== undefined) {
  const networkRadio = Array.from(
    document.querySelectorAll('input[name="network"]')
  ).find(radio => radio.value === String(data.network));

  if (networkRadio) {
    networkRadio.checked = true;
  }
}

// ===================================
// プレイ方法に合わせて表示更新
// ===================================

updatePlayMode();
updateMixedDaySettingsVisibility();


    if (data.startDate) {
      eventStartDateInput.value = data.startDate;
    }

    if (data.days) {
      eventDaysInput.value = data.days;
    }

    // 通常曲
    if (data.normalSong !== undefined) {
      const optionExists = Array.from(
        $("normalSong").options
      ).some(option => option.value === String(data.normalSong));

      if (optionExists) {
        $("normalSong").value = String(data.normalSong);
      }
    }

    updateNormalSongTime();

    // イベント曲時間・初期特攻値
    ["eventMin", "eventSec", "bonus"].forEach(id => {
      if (data[id] !== undefined) {
        $(id).value = String(data[id]);
      }
    });

    updateEventPoint();

    // 特攻値の変更予定
    $("bonusChanges").replaceChildren();

    if (Array.isArray(data.bonusChanges)) {
      data.bonusChanges.forEach(savedRow => {
        addBonusChangeRow();

        const rows = document.querySelectorAll(
          ".bonus-change-row"
        );

        const row = rows[rows.length - 1];

        ["day", "hour", "minute", "bonus"].forEach(field => {
          if (savedRow[field] !== undefined) {
            row.querySelector(
              `[data-field="${field}"]`
            ).value = String(savedRow[field]);
          }
        });
      });
    }

    updateBonusChangePoints();

    // 日付別設定を復元
    if (data.startDate && createEventDateList()) {
      dailySettings = eventDateList.map((item, index) => {
        const savedDay = data.dailySettings?.find(
          day => day.date === item.date
        );

        return normalizeDailySetting(
          item.date,
          index,
          savedDay
        );
      });

      selectedEventDayIndex = 0;

      // 古いホイール上限の影響を避ける
      setWheelValue("normalBg", 0);
      setWheelValue("eventBg", 0);

      applyDayInputs(0);
      renderEventDateTabs();
    }

    refreshWheelLimits();
    updateDailyTimeTotal();

  } catch (error) {
    console.error("設定の復元に失敗しました", error);
  }
}


// ===================================
// イベント日付一覧を作成
// ===================================

function createEventDateList() {

  // 入力値を取得
  const startDateValue = eventStartDateInput.value;
  const eventDays = Number(eventDaysInput.value);

  // 入力チェック
  if (!startDateValue) {
    alert("イベント開始日を入力してください。");
    return false;
  }

  if (!eventDays || eventDays < 1 || eventDays > 10) {
    alert("イベント日数は1〜10日の範囲で選択してください。");
    return false;
  }

  // 開始日を取得
  const [year, month, day] = startDateValue.split("-").map(Number);

  // 日付一覧を初期化
  eventDateList = [];

  // 日数分の日付を作成
  for (let i = 0; i < eventDays; i++) {

    const date = new Date(year, month - 1, day + i);

    // 日付を YYYY-MM-DD 形式に変換
    const formattedDate =
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    eventDateList.push({
      day: i + 1,
      date: formattedDate
    });
  }


const previousSettings = dailySettings;

dailySettings = eventDateList.map((item, index) => {
  const saved = previousSettings.find(
    setting => setting.date === item.date
  );

  return normalizeDailySetting(
    item.date,
    index,
    saved
  );
});

return true;

}




let dailySettings = [];


function normalizeDailySetting(date, index, saved) {
  const accuracy = {};

  accuracyIds.forEach(id => {
    accuracy[id] = Number(saved?.accuracy?.[id] ?? 0);
  });

  return {
    date,
    useOwnSettings: true,
    accuracy,
    normalBg: Number(saved?.normalBgRuns != null ? bgSecondsForRuns("normalBg", saved.normalBgRuns) : saved?.normalBg ?? 0),
    eventBg: Number(saved?.eventBgRuns != null ? bgSecondsForRuns("eventBg", saved.eventBgRuns) : saved?.eventBg ?? 0),
    normalBgRuns: Number(saved?.normalBgRuns ?? bgRunsForSeconds("normalBg", saved?.normalBg ?? 0)),
    eventBgRuns: Number(saved?.eventBgRuns ?? bgRunsForSeconds("eventBg", saved?.eventBg ?? 0))
  };
}

function saveCurrentDayInputs() {
  const setting = dailySettings[selectedEventDayIndex];

  if (!setting) return;
  if (selectedEventDayIndex > 0 && !setting.useOwnSettings) return;

  setting.accuracy = Object.fromEntries(
    accuracyIds.map(id => [id, Number($(id).value || 0)])
  );

  setting.normalBgRuns = readBgRuns("normalBg");
  setting.eventBgRuns = readBgRuns("eventBg");
  setting.normalBg = bgSecondsForRuns("normalBg", setting.normalBgRuns);
  setting.eventBg = bgSecondsForRuns("eventBg", setting.eventBgRuns);
}

function applyDayInputs(index) {
  const own = dailySettings[index];
  const setting = index > 0 && !own?.useOwnSettings
    ? dailySettings[0]
    : own;

  if (!setting) return;

  accuracyIds.forEach(id => {
    $(id).value = String(setting.accuracy[id] ?? 0);
  });

  updateAccuracyLimit();

  applyBgRunsForDay(setting);

  const inherited = index > 0 && !own.useOwnSettings;

  accuracyIds.forEach(id => {
    $(id).disabled = inherited;
  });

  $("normalBgRuns").disabled = inherited;
  $("eventBgRuns").disabled = inherited;
  if ($("openNormalBgTime")) $("openNormalBgTime").disabled = inherited;
  if ($("openEventBgTime")) $("openEventBgTime").disabled = inherited;
}

// ===================================
// イベント日付タブ
// ===================================

let selectedEventDayIndex = 0;

function renderEventDateTabs() {

  const tabsArea = $("eventDateTabs");
  const settingsArea = $("eventDaySettings");

  tabsArea.innerHTML = "";
  settingsArea.innerHTML = "";

  // プレイ画面の日付は本日のみ。日付変更時は自動で選択日を切り替える。
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const todayIndex = eventDateList.findIndex(item=>item.date===today);
  if (todayIndex >= 0 && todayIndex !== selectedEventDayIndex) {
    saveCurrentDayInputs();
    selectedEventDayIndex = todayIndex;
    applyDayInputs(todayIndex);
  }
  if (todayIndex >= 0) {
    const item=eventDateList[todayIndex];
    const button=document.createElement('button');button.type='button';
    button.className='event-date-tab active';
    const [,month,day]=item.date.split('-');
    button.textContent=`${Number(month)}/${Number(day)}（本日）`;
    button.disabled=true;
    tabsArea.appendChild(button);
  } else {
    const label=document.createElement('p');label.className='set-today-note';
    label.textContent='本日はイベント期間外です。';tabsArea.appendChild(label);
  }

  updateDateTabStatuses();

  // 選択中の日付の設定
  const setting = dailySettings[selectedEventDayIndex];

  if (!setting) return;

  // 個別設定チェックは不要。すべての日付を独立して管理する。
  setting.useOwnSettings = true;
}

/* ==========================================
   入力変更時の自動保存
========================================== */

// 日付が変わった瞬間にプレイ画面の日付を更新する。
(() => {
  let date = new Date().toDateString();
  setInterval(() => {
    const current = new Date().toDateString();
    if (current === date) return;
    date = current;
    if (eventDateList.length) renderEventDateTabs();
  }, 1000);
})();

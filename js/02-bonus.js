// ===================================
// 特攻値の変更設定
// ===================================

// 変更時刻をイベント開始からの経過秒数に変換
function getBonusChangeSeconds(day, hour, minute) {
  return (
    (day - 1) * EVENT_DAY_SECONDS +
    hour * 3600 +
    minute * 60
  );
}

// ===================================
// 特攻値変更欄の追加
// ===================================

// ===================================
// 特攻値変更欄の追加
// ===================================

function addBonusChangeRow() {
  const row = document.createElement("div");

  row.className = "bonus-change-row";

  row.innerHTML = `
    <div class="bonus-change-time">
      <label>適用時間</label>

      <div class="bonus-time-inputs">
        <div class="bonus-time-unit">
          <input type="number"
            data-field="day"
            min="1"
            max="10"
            value="1"
            inputmode="numeric">
          <span>日目</span>
        </div>

        <div class="bonus-time-unit">
          <input type="number"
            data-field="hour"
            min="0"
            max="23"
            value="0"
            inputmode="numeric">
          <span>時間</span>
        </div>

        <div class="bonus-time-unit">
          <input type="number"
            data-field="minute"
            min="0"
            max="59"
            value="0"
            inputmode="numeric">
          <span>分</span>
        </div>
      </div>
    </div>

    <div class="bonus-change-value">
      <label>変更特攻値</label>

      <div class="bonus-change-controls">
        <div class="bonus-input-unit">
          <input type="number"
            data-field="bonus"
            min="0"
            max="9999"
            value="0"
            inputmode="numeric">
          <span>%</span>
        </div>

        <div class="bonus-change-point">
          <span>イベントPT</span>
          <output data-field="point">1,438 pt</output>
        </div>

        <button type="button"
          class="delete-bonus-button"
          aria-label="この変更を削除">
          削除
        </button>
      </div>
    </div>
  `;

  $("bonusChanges").appendChild(row);

  updateBonusChangePoints();
  resetResult();
  updateMixedPreview();
}

// ===================================
// 特攻値変更欄の削除
// ===================================

$("addBonusChange").addEventListener("click", () => {
  addBonusChangeRow();
});

$("bonusChanges").addEventListener("click", event => {
  const button = event.target.closest(
    ".delete-bonus-button"
  );

  if (!button) {
    return;
  }

  button.closest(".bonus-change-row").remove();

  updateBonusChangePoints();
  resetResult();
  updateMixedPreview();
});

// ===================================
// 特攻値変更欄のポイント表示
// ===================================

function updateBonusChangePoints() {
  document.querySelectorAll(
    ".bonus-change-row"
  ).forEach(row => {
    const input = row.querySelector(
      '[data-field="bonus"]'
    );

    const output = row.querySelector(
      '[data-field="point"]'
    );

    const bonus = Number(input.value);

    if (
      input.value === "" ||
      !Number.isInteger(bonus) ||
      bonus < 0 ||
      bonus > 9999
    ) {
      output.textContent = "pt";
      return;
    }

    output.textContent =
      `${calculateEventPoint(bonus).toLocaleString()} pt`;
  });
}

// ===================================
// 特攻値変更欄の入力イベント
// ===================================

$("bonusChanges").addEventListener("input", () => {
  updateBonusChangePoints();
  resetResult();
  updateMixedPreview();
});

// ===================================
// 特攻値スケジュール取得
// ===================================

function getBonusSchedule(showAlert = true) {
  const baseInput = $("bonus");
  const baseBonus = Number(baseInput.value);

  if (
    baseInput.value === "" ||
    !Number.isInteger(baseBonus) ||
    baseBonus < 0 ||
    baseBonus > 9999
  ) {
    if (showAlert) {
      alert("初期特攻値は0～9999%で入力してください。");
    }

    return null;
  }

  const schedule = [
    {
      seconds: 0,
      bonus: baseBonus
    }
  ];

  const rows = Array.from(
    document.querySelectorAll(".bonus-change-row")
  );

  for (const row of rows) {
    const dayInput = row.querySelector('[data-field="day"]');
    const hourInput = row.querySelector('[data-field="hour"]');
    const minuteInput = row.querySelector('[data-field="minute"]');
    const bonusInput = row.querySelector('[data-field="bonus"]');

    const day = Number(dayInput.value);
    const hour = Number(hourInput.value);
    const minute = Number(minuteInput.value);
    const bonus = Number(bonusInput.value);

    if (
      dayInput.value === "" ||
      hourInput.value === "" ||
      minuteInput.value === "" ||
      bonusInput.value === "" ||
      !Number.isInteger(day) ||
      !Number.isInteger(hour) ||
      !Number.isInteger(minute) ||
      !Number.isInteger(bonus) ||
      day < 1 ||
      day > 10 ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59 ||
      bonus < 0 ||
      bonus > 9999
    ) {
      if (showAlert) {
        alert(
          "追加した特攻値の適用時間・特攻値を正しく入力してください。"
        );
      }

      return null;
    }

    const seconds = getBonusChangeSeconds(
      day,
      hour,
      minute
    );

    if (seconds < 0 || seconds >= getEventTotalSeconds()) {
      if (showAlert) {
        alert(
          "特攻値の変更時刻はイベント終了前に設定してください。"
        );
      }

      return null;
    }

    schedule.push({
      seconds,
      bonus
    });
  }

  // 適用時間順に並べる
  schedule.sort((a, b) => a.seconds - b.seconds);

  // 同じ時刻の重複を確認
  for (let i = 1; i < schedule.length; i++) {
    if (schedule[i].seconds === schedule[i - 1].seconds) {
      if (showAlert) {
        alert(
          "特攻値の変更時刻が重複しています。別の時間を設定してください。"
        );
      }

      return null;
    }
  }

  return schedule;
}

// ===================================
// 経過時間に応じた特攻値を取得
// ===================================

function getBonusAtElapsed(elapsedSeconds, schedule) {
  let currentBonus = schedule[0].bonus;

  for (const item of schedule) {
    if (elapsedSeconds >= item.seconds) {
      currentBonus = item.bonus;
    } else {
      break;
    }
  }

  return currentBonus;
}

// ===================================

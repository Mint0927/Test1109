"use strict";
// Result専用。日付境界で前日までの予測値を固定し、以降の再計算では変更しない。
(() => {
  const KEY = 'nogifes_forecast_snapshots_v1';
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } };
  const dateFor = (day, index) => day.date || (typeof eventDateList !== 'undefined' && eventDateList[index]?.date) || '';
  window.prepareForecastDays = (days) => {
    const stored = read(); const now = today(); let changed = false;
    const output = days.map((day, index) => {
      const date = dateFor(day,index);
      if (!date) return {...day,forecast:true};
      if (date < now) {
        if (!stored[date]) { stored[date] = {...day, date}; changed = true; }
        return {...stored[date], forecast:false};
      }
      // 今日・未来はいつでも再計算可能
      return {...day,date,forecast:true};
    });
    if (changed) { try { localStorage.setItem(KEY,JSON.stringify(stored)); } catch(e) { console.warn('Result保存に失敗',e); } }
    return output;
  };
  window.renderForecastDayList = (days) => {
    const root = document.getElementById('dailyPointList'); if (!root) return;
    root.replaceChildren();
    days.forEach((day,index) => {
      const row=document.createElement('div');row.className='forecast-day-row';
      const name=document.createElement('span');name.className='forecast-day-name';
      const date=dateFor(day,index);
      const m=/^\d{4}-(\d{2})-(\d{2})$/.exec(date);
      name.textContent=`${index+1}日目${m ? ` ${Number(m[1])}/${Number(m[2])}` : ''}`;
      const points=document.createElement('strong');points.className='forecast-day-points';
      points.textContent=`${Math.floor(Number(day.dailyPoint)||0).toLocaleString()} pt`;
      const status=document.createElement('span');status.className=`forecast-day-status ${day.forecast?'is-forecast':'is-fixed'}`;
      status.textContent=day.forecast?'予測':'確定';
      row.append(name,points,status);root.append(row);
    });
  };
})();

"use strict";
// 時刻表示は端末時計を参照。表示のみで確定済みの計算を変更しない。
(function(){
  const clock=document.getElementById('headerLiveClock');
  function tick(){if(!clock)return;const d=new Date();clock.textContent=`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;}
  function dayStatus(){
    const label=document.getElementById('currentEventDay');if(!label)return;
    const d=new Date();const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const days=typeof eventDateList!=='undefined'?eventDateList:[];
    const i=days.findIndex(x=>x.date===key);
    label.textContent=i>=0?`本日：${i+1}日目（${d.getMonth()+1}/${d.getDate()}）`:`本日：${d.getMonth()+1}/${d.getDate()}（イベント期間外）`;
  }
  tick();dayStatus();setInterval(()=>{tick();dayStatus();},1000);
  const inputs=['wakeTimeInput','singleWakeTime','singleBedtime'];
  for(const id of inputs){const el=document.getElementById(id);if(el)el.addEventListener('change',()=>{if(typeof saveLocalData==='function')saveLocalData();});}
  // 新しい三択モードは従来のフルモードボタンを内部状態として使わず、ラジオから一意に判定する。
  document.querySelectorAll('input[name="playMode"]').forEach(r=>r.addEventListener('change',()=>{if(typeof saveLocalData==='function')saveLocalData();}));
})();

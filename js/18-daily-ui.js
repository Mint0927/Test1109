"use strict";
(() => {
 const el=id=>document.getElementById(id), STORE='nogifes_bg_confirmed_items_v2', INIT='nogifes_event_period_confirmed_v1';
 const period=el('eventPeriodPanel');
 function updatePeriod(){const yes=localStorage.getItem('nogifes_initial_setup_completed_v1')==='1';if(period)period.hidden=yes;}
 updatePeriod();el('saveSettings')?.addEventListener('click',()=>{if(localStorage.getItem('nogifes_initial_setup_completed_v1')==='1'){localStorage.setItem(INIT,'yes');updatePeriod();}});
 function ownDays(){if(typeof dailySettings!=='undefined')dailySettings.forEach(d=>{if(d)d.useOwnSettings=true;});}
 ownDays();
 const originalRender=window.renderEventDateTabs;
 if(typeof originalRender==='function')window.renderEventDateTabs=function(){ownDays();return originalRender.apply(this,arguments);};
 let all={};try{const value=JSON.parse(localStorage.getItem(STORE)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))all=value;}catch(e){}
 const dayKey=()=>eventDateList[selectedEventDayIndex]?.date||'day-'+selectedEventDayIndex;
 const localToday=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
 const isFuture=()=>Boolean(eventDateList[selectedEventDayIndex]?.date>localToday());
 const entries=()=>all[dayKey()]||(all[dayKey()]=[]);
 const persist=()=>localStorage.setItem(STORE,JSON.stringify(all));
 const fmt=s=>`${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor(s%3600/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
 const parse=v=>{const m=/^(\d{1,3}):([0-5]\d):([0-5]\d)$/.exec(v.trim());return m?Number(m[1])*3600+Number(m[2])*60+Number(m[3]):NaN;};
 const itemGain=()=>{const song=normalSongs[el('normalSong')?.selectedIndex||0];return song?.lp===75?714:774;};
 const points=()=>{const b=Number(el('bonus')?.value||0);return 1150*(1+b/100)+288;};
 const count=()=>{let items=0,pt=0,n=0,e=0;for(const a of entries()){if(a.mode==='normal'){items+=a.runs*itemGain();n+=a.runs;}else{items-=a.runs*875;pt+=a.runs*points();e+=a.runs;}}return {items,pt,n,e};};
 const limit=()=>{const x=count();return Math.min(114,Math.floor(Math.max(0,x.items)/875));};
 function updateLimit(){const mode=el('bgItemMode')?.value||'normal';const text=el('bgItemLimit');if(!text)return;if(mode==='normal'){text.textContent='1項目の上限：03:00:00（曲単位で切り下げ）';}else{const runs=limit();text.textContent=`現在のアイテムで最大 ${runs} 回（${fmt(bgSecondsForRuns('eventBg',runs))}）設定可能`;}}
 function updateAggregate(){let n=0,e=0;for(const a of entries()){if(a.mode==='normal')n+=a.runs;else e+=a.runs;}
  el('normalBgRuns').value=String(n);el('eventBgRuns').value=String(e);syncBgRunsToLegacy();saveCurrentDayInputs();ownDays();
  if(typeof saveLocalData==='function')saveLocalData();updateLimit();
 }
 function render(){const list=el('bgActivityList');if(!list)return;list.replaceChildren();entries().forEach((a,i)=>{const row=document.createElement('div');row.className='bg-item-row';const info=document.createElement('span');info.textContent=`${a.name}｜${a.mode==='normal'?'通常曲BG':'イベント曲BG'}｜${fmt(a.seconds)}（${a.runs}回）`;const del=document.createElement('button');del.type='button';del.textContent='削除';del.addEventListener('click',()=>{entries().splice(i);persist();render();updateAggregate();invalidateDailyConfirmation('current');});row.append(info,del);list.append(row);});updateLimit();}
 function error(s){el('bgActivityError').textContent=s;}
 el('bgItemMode')?.addEventListener('change',()=>{el('bgItemDuration').value=el('bgItemMode').value==='normal'?'03:00:00':'00:00:00';updateLimit();});
 el('confirmBgItem')?.addEventListener('click',()=>{
  error('');const name=el('bgItemName').value.trim(),mode=el('bgItemMode').value,seconds=parse(el('bgItemDuration').value);
  if(!name){error('項目名を入力してください。');return;}
  if(!Number.isFinite(seconds)||seconds<=0){error('時間を 時:分:秒 の形式で入力してください。');return;}
  if(mode==='normal'&&seconds>10800){error('通常曲BGは1項目につき3時間までです。');return;}
  const key=mode==='normal'?'normalBg':'eventBg',runs=bgRunsForSeconds(key,seconds),actual=bgSecondsForRuns(key,runs);
  if(runs<1){error('この時間では曲を1回完了できません。');return;}
  const balance=count().items;
  if(mode==='event'&&runs>limit()){error(`アイテム不足：イベント曲BGは最大${limit()}回までです。`);return;}
  if(mode==='normal'&&balance+runs*itemGain()>99999){error('所持アイテムの上限99,999個を超えます。');return;}
  const total=entries().reduce((sum,a)=>sum+a.seconds,0)+actual;
  const dayLimit=eventDateList.length?getEventDaySeconds(selectedEventDayIndex):MAX_DAILY_SECONDS;
  if(total>dayLimit){error('BG合計時間が当日の上限を超えます。');return;}
  entries().push({name,mode,runs,seconds:actual});persist();render();updateAggregate();invalidateDailyConfirmation('current');
  el('bgItemName').value='';el('bgItemDuration').value='00:00:00';
  const list=el('bgActivityList');list.scrollTop=list.scrollHeight;
 });
 // The legacy decision listener is replaced with a single confirmation path.
 el('confirmDailySettings')?.addEventListener('click',ev=>{
  ev.stopImmediatePropagation();updateAggregate();const output=el('daySetOutputText');
  const ok=checkDailySettings();if(!ok){output.textContent=el('dailyCheckStatus')?.textContent||'設定を確認してください。';return;}
  const x=count();output.textContent=`設定済みBG：通常曲 ${x.n}回／イベント曲 ${x.e}回\n残りアイテム：${x.items.toLocaleString()}個\nイベント曲BG獲得pt：${Math.round(x.pt).toLocaleString()}pt\n※未来日のポイントは予測扱いです。手打ち分と日全体の結果は「計測」で算出します。`;
 },true);
 // Switching dates should show each date's own BG items, not another day's values.
 el('eventDateTabs')?.addEventListener('click',()=>queueMicrotask(()=>{ownDays();render();if(entries().length)updateAggregate();}));
 render();if(entries().length)updateAggregate();
})();

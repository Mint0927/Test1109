"use strict";
// 既存の日別計算を変更せず、1セット計算を追加する。
(() => {
  const KEY = 'nogifesOneSetHistoryV2';
  const $id = id => document.getElementById(id);
  const MAX = 99999, COST = 875, WAIT = 15;
  let history = [];
  let isRecalculating = false;
  try { const saved = JSON.parse(localStorage.getItem(KEY) || '[]'); if (Array.isArray(saved)) history = saved.filter(x => x && Number.isFinite(x.end)); } catch (_) {}
  const fmt = d => new Date(d).toLocaleString('ja-JP', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const num = n => Math.floor(Number(n)||0).toLocaleString('ja-JP');
  const duration = seconds => { const t=Math.max(0,Math.floor(Number(seconds)||0)); return `${Math.floor(t/3600)}時間${String(Math.floor(t%3600/60)).padStart(2,'0')}分${String(t%60).padStart(2,'0')}秒`; };
  const addInfo = (parent, label, value) => { const p=document.createElement('p');p.className='set-result-line';const strong=document.createElement('strong');strong.textContent=label+'：';p.append(strong,document.createTextNode(value));parent.appendChild(p); };
  const show = msg => { const el = $id('setError'); el.hidden = !msg; el.textContent = msg || ''; };
  const save = () => { try {localStorage.setItem(KEY, JSON.stringify(history));} catch (_) {} };
  const effective = () => history.length ? history[history.length - 1] : null;
  // 確定した入力条件を履歴に保存し、計算結果は毎回そこから導出する。
  function captureInputs() {
    const song = normalSongs[$id('normalSong').selectedIndex];
    const accuracy = Object.fromEntries(accuracyIds.map(id => [id, Number($id(id).value || 0)]));
    const schedule = getBonusSchedule(false);
    if (!schedule) throw Error('特攻値の入力を確認してください。');
    return {
      bedtime: $id('bedtimeInput').value,
      songIndex: $id('normalSong').selectedIndex,
      songTime: song?.time, lp: song?.lp,
      eventTime: getEventInputTime(), network: getNetworkTime(),
      accuracy, schedule: structuredClone(schedule),
      normalRuns: readBgRuns('normalBg'), eventRuns: readBgRuns('eventBg'),
      eventStartDate: $id('eventStartDate').value, eventDays: Number($id('eventDays').value)
    };
  }
  function snapshotBounds(input) {
    const first = new Date(input.eventStartDate + 'T15:00:00');
    if (!Number.isFinite(first.getTime()) || !Number.isInteger(input.eventDays) || input.eventDays < 1 || input.eventDays > 10) throw Error('保存されたイベント期間が不正です。');
    const end = new Date(first); end.setDate(end.getDate()+input.eventDays); end.setHours(0,0,0,0);
    return {first:first.getTime(),end:end.getTime()};
  }
  function bedtimeFrom(start, value) {
    if (!/^\d{2}:\d{2}$/.test(value)) throw Error('保存された就寝時刻が不正です。');
    const [h,m] = value.split(':').map(Number);
    if (h>23 || m>59) throw Error('保存された就寝時刻が不正です。');
    const d = new Date(start); d.setHours(h,m,0,0);
    if (d.getTime() <= start) d.setDate(d.getDate()+1);
    return d.getTime();
  }
  function calcSnapshot(input, last) {
    const {first,end:eventEnd}=snapshotBounds(input);
    const start=last ? last.end : first;
    if (start>=eventEnd) throw Error('イベント終了後のセットです。');
    const nextBed=bedtimeFrom(start,input.bedtime);
    const isFinal=dateKey(start)===dateKey(eventEnd-1000) || nextBed>=eventEnd;
    const bed=isFinal ? eventEnd : nextBed;
    const period=Math.floor((bed-start)/1000);
    if(period<=0) throw Error('使用可能時間がありません。');
    const songTime=Number(input.songTime), eventTime=Number(input.eventTime);
    if(songTime<=0 || eventTime<=0) throw Error('曲時間が不正です。');
    const itemMap=input.lp===75?itemMapLP75:itemMapLP81;
    const accuracy=input.accuracy||{};
    const percent=accuracyIds.reduce((n,id)=>n+Number(accuracy[id]||0),0);
    if(percent!==100) throw Error('保存された精度の合計が100%ではありません。');
    const average=accuracyIds.reduce((n,id)=>n+itemMap[id]*Number(accuracy[id]||0)/100,0);
    const normalRuns=Number(input.normalRuns), eventRuns=Number(input.eventRuns);
    if(!Number.isSafeInteger(normalRuns)||normalRuns<0||!Number.isSafeInteger(eventRuns)||eventRuns<0) throw Error('BG回数が不正です。');
    const normalBgSec=normalRuns?normalRuns*(songTime+WAIT)-WAIT:0;
    const eventBgSec=eventRuns?eventRuns*(eventTime+WAIT)-WAIT:0;
    if(normalBgSec+eventBgSec>period) throw Error('BG設定時間が使用可能時間を超えています。');
    const network=Number(input.network);
    const normalManualSec=songTime+network, eventManualSec=eventTime+network+1;
    const normalBgGain=itemMap['Dコン'];
    let items=last?last.items:0;
    const startingItems=items;
    let points=0,preBedPoints=0,nightPoints=0,manualNormal=0,manualEvent=0,bgNormal=0,bgEvent=0,used=0;
    const eventPoints=(manual,at)=>calculateEventPoint(getBonusAtElapsed(Math.max(0,(at-first)/1000),input.schedule)+(manual?manualBonusAddition:0));
    for(let i=0;i<normalRuns;i++){
      if(items+normalBgGain>MAX) throw Error('通常曲BGでアイテムが99,999個を超えます。');
      items+=normalBgGain;bgNormal++;
    }
    const manualLimit=period-normalBgSec-eventBgSec;
    const reserveEventItems=eventRuns*COST;
    let guard=0;
    while(guard++<200000){
      const canNormal=used+normalManualSec<=manualLimit&&items+average<=MAX+1e-7;
      const canEvent=used+eventManualSec<=manualLimit&&items>=COST+reserveEventItems-1e-7;
      if(!canNormal&&!canEvent)break;
      const remaining=manualLimit-used;
      const nearCap=items+average>MAX-2*average;
      const needEvent=isFinal||nearCap||(items>=reserveEventItems+2*COST&&remaining<normalManualSec*4);
      if(canEvent&&(needEvent||!canNormal)){
        const earned=eventPoints(true,start+(normalBgSec+used)*1000);
        items-=COST;used+=eventManualSec;manualEvent++;points+=earned;preBedPoints+=earned;
      }else if(canNormal){items+=average;used+=normalManualSec;manualNormal++;}else break;
    }
    for(let i=0;i<eventRuns;i++){
      if(items+1e-7<COST)throw Error('就寝前イベントBGのアイテムが不足しています。');
      const at=start+(normalBgSec+manualLimit+i*(eventTime+WAIT))*1000;
      const earned=eventPoints(false,at);
      items-=COST;points+=earned;preBedPoints+=earned;bgEvent++;
    }
    items=Math.max(0,Math.min(MAX,items));
    const atBed=items;
    const possibleNightRuns=Math.floor((items+1e-7)/COST);
    const remainingNightSeconds=Math.max(0,Math.floor((eventEnd-bed)/1000));
    const maxNightRuns=Math.floor((remainingNightSeconds+WAIT)/(eventTime+WAIT));
    const nightRuns=isFinal?0:Math.min(possibleNightRuns,maxNightRuns);
    for(let i=0;i<nightRuns;i++){
      const earned=eventPoints(false,bed+i*(eventTime+WAIT)*1000);
      points+=earned;nightPoints+=earned;
    }
    items-=nightRuns*COST;
    const nightDuration=nightRuns?nightRuns*(eventTime+WAIT)-WAIT:0;
    const end=isFinal?eventEnd:bed+nightDuration*1000;
    const totalPoints=(last?last.totalPoints:0)+points;
    const earnedItems=manualNormal*average+bgNormal*normalBgGain;
    const spentItems=(manualEvent+bgEvent+nightRuns)*COST;
    if(Math.abs(startingItems+earnedItems-spentItems-items)>0.01)throw Error('アイテム収支の検算に失敗しました。');
    if(preBedPoints+nightPoints!==points)throw Error('獲得ptの検算に失敗しました。');
    return {start,bed,end,items,atBed,points,preBedPoints,nightPoints,totalPoints,nightRuns,
      normalRuns:bgNormal,eventRuns:bgEvent,manualNormal,manualEvent,manualSeconds:used,nightDuration,
      startingItems,earnedItems,spentItems,finalDay:isFinal,availableSeconds:period,inputs:input};
  }
  // 従来の日別Result用：確定履歴とは独立した、プレイ画面の条件による予測。
  // ただしセット計算と同じエンジンを使い、初日15:00・夜間BG・最終日を反映する。
  window.calculateIndependentDailyForecast = function () {
    const base=captureInputs();
    const bounds=snapshotBounds(base);
    const dayCount=base.eventDays;
    const days=Array.from({length:dayCount},(_,i)=>({
      dailyPoint:0,totalItems:0,normalBgSeconds:0,eventBgSeconds:0,
      preBedPoints:0,nightPoints:0,nightDuration:0,calculated:false
    }));
    let previous=null;
    for(let step=0;step<dayCount;step++){
      const start=previous?previous.end:bounds.first;
      if(start>=bounds.end)break;
      const index=Math.floor((new Date(start).setHours(12,0,0,0)-new Date(bounds.first).setHours(12,0,0,0))/86400000);
      if(index<0||index>=dayCount)break;
      const setting=typeof getEffectiveDaySetting==='function'?getEffectiveDaySetting(index):null;
      const input=structuredClone(base);
      if(setting){
        if(setting.accuracy)input.accuracy={...setting.accuracy};
        const normalCycle=input.songTime+WAIT, eventCycle=input.eventTime+WAIT;
        input.normalRuns=Number.isFinite(Number(setting.normalBgRuns))?Number(setting.normalBgRuns):Math.max(0,Math.floor((Number(setting.normalBg||0)+WAIT)/normalCycle));
        input.eventRuns=Number.isFinite(Number(setting.eventBgRuns))?Number(setting.eventBgRuns):Math.max(0,Math.floor((Number(setting.eventBg||0)+WAIT)/eventCycle));
      }
      const result=calcSnapshot(input,previous);
      const day=days[index];
      day.dailyPoint+=result.points;
      day.totalItems+=result.earnedItems;
      day.normalBgSeconds+=result.normalRuns?result.normalRuns*(input.songTime+WAIT)-WAIT:0;
      day.eventBgSeconds+=result.eventRuns?result.eventRuns*(input.eventTime+WAIT)-WAIT:0;
      day.preBedPoints+=result.preBedPoints;
      day.nightPoints+=result.nightPoints;
      day.nightDuration+=result.nightDuration;
      day.calculated=true;
      previous=result;
    }
    return {days,totalPoints:days.reduce((sum,d)=>sum+d.dailyPoint,0),finalItems:previous?.items||0};
  };
  function recalculateHistory() {
    if(isRecalculating)return;
    isRecalculating=true;
    try {
      const rebuilt=[];
      for(let i=0;i<history.length;i++){
        const original=history[i];
        if(!original.inputs){
          // 旧版は入力条件を保存していない。既存の確定値は保持し、後続の再計算に引き継ぐ。
          rebuilt.push(original);
          continue;
        }
        rebuilt.push(calcSnapshot(original.inputs,rebuilt.at(-1)||null));
      }
      history=rebuilt;save();render();
    }finally{isRecalculating=false;}
  }
  function showLatest(result){
    $id('setLatest').hidden=false;
    $id('setLatest').textContent=`開始 ${fmt(result.start)} ／ 就寝前 ${duration(result.availableSeconds)}・${num(result.preBedPoints)}pt ／ 夜間BG ${num(result.nightPoints)}pt ／ 合計 ${num(result.points)}pt ／ 就寝時：${num(result.atBed)}個 ／ 通常曲手打ち ${result.manualNormal}回 ／ イベント曲手打ち ${result.manualEvent}回 ／ 就寝前BG 通常${result.normalRuns}回・イベント${result.eventRuns}回 ／ ${result.finalDay?'最終日・夜間BGなし':'夜間イベントBG '+result.nightRuns+'回'} ／ BG終了 ${fmt(result.end)}`;
  }

  // 履歴はResult内に日付別表示。過去の日付と今日だけを表示し、未来は出さない。
  const dateKey = ms => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const todayKey = () => dateKey(Date.now());
  let lastRenderedDate = '';
  let selectedResultDate = null;
  // 従来の日別Resultとグラフにも、確定済みセットの同一データを流す。
  function syncLegacyDailyResult() {
    const firstDate=$id('eventStartDate')?.value;
    const count=Math.min(10,Math.max(1,Number($id('eventDays')?.value)||10));
    if(!/^\d{4}-\d{2}-\d{2}$/.test(firstDate||''))return;
    const first=new Date(firstDate+'T12:00:00');
    const today=todayKey();
    const days=Array.from({length:count},(_,i)=>{
      const date=new Date(first);date.setDate(date.getDate()+i);
      const key=dateKey(date.getTime());
      const entries=history.filter(s=>dateKey(s.start)===key);
      return {key,entries,points:entries.reduce((n,s)=>n+(Number(s.points)||0),0),
        items:entries.reduce((n,s)=>n+(Number(s.earnedItems)||0),0),
        normalSec:entries.reduce((n,s)=>n+(s.normalRuns? s.normalRuns*(Number(s.inputs?.songTime)||0)+Math.max(0,s.normalRuns-1)*WAIT:0),0),
        eventSec:entries.reduce((n,s)=>n+(s.eventRuns? s.eventRuns*(Number(s.inputs?.eventTime)||0)+Math.max(0,s.eventRuns-1)*WAIT:0),0),
        nightSec:entries.reduce((n,s)=>n+(Number(s.nightDuration)||0),0),
        nightPoints:entries.reduce((n,s)=>n+(Number(s.nightPoints)||0),0),
        preBedPoints:entries.reduce((n,s)=>n+(Number(s.preBedPoints)||0),0),
        last:entries.at(-1)||null};
    });
    const tabs=$id('resultDayTabs');
    if(!tabs)return;
    const previous=Number(tabs.dataset.selectedDay||0);
    const selected=Math.min(days.length-1,Math.max(0,previous));
    const showDay=i=>{
      tabs.dataset.selectedDay=String(i);
      const d=days[i];
      $id('resultSelectedDay').textContent=`${i+1}日目（${d.key.slice(5).replace('-','/')}）`;
      $id('resultNormalBgTime').textContent=d.entries.length?duration(d.normalSec):'未計算';
      $id('resultEventBgTime').textContent=d.entries.length?duration(d.eventSec):'未計算';
      $id('resultEarnedItems').textContent=d.entries.length?num(d.items):'未計算';
      $id('resultDailyPoints').textContent=d.entries.length?num(d.points):'未計算';
      const extra=$id('resultSetDayExtra');
      if(extra){
        extra.replaceChildren();
        if(d.entries.length){
          addInfo(extra,'就寝前の獲得pt',num(d.preBedPoints)+' pt');
          addInfo(extra,'夜間イベントBG',duration(d.nightSec)+' ／ '+num(d.nightPoints)+' pt');
          addInfo(extra,'1セット合計',num(d.points)+' pt');
          addInfo(extra,'次セットへの残りアイテム',num(d.last?.items)+' 個');
          addInfo(extra,'累計獲得pt',num(d.last?.totalPoints)+' pt');
        }else{
          addInfo(extra,'計算状況',d.key>today?'未来の日付：未計算':'セット未確定：未計算');
        }
      }
      tabs.querySelectorAll('button').forEach((b,j)=>b.classList.toggle('active',i===j));
    };
    tabs.replaceChildren();
    days.forEach((d,i)=>{
      const b=document.createElement('button');b.type='button';b.className='event-date-tab result-day-tab';
      b.textContent=`${i+1}日目${d.entries.length?'':'（未計算）'}`;
      b.addEventListener('click',()=>showDay(i));tabs.appendChild(b);
    });
    showDay(selected);
    if(typeof renderDailyPointChart==='function')renderDailyPointChart(days.map(d=>({dailyPoint:d.points})));
    const last=effective();
    $id('eventTotalPoints').textContent=num(last?.totalPoints||0);
    $id('eventTotalDays').textContent=`確定済み ${history.length}セットの累計（未計算日は含まない）`;
  }
  function render() {
    const last = effective();
    $id('setCarry').textContent = last ? `次セット開始：${fmt(last.end)} ／ アイテム ${num(last.items)}個 ／ 累計 ${num(last.totalPoints)}pt` : '初回：イベント開始日の15:00から計算 ／ アイテム0個';
    const today = todayKey(); lastRenderedDate = today;
    const dates = [];
    const firstDate = $id('eventStartDate')?.value;
    const dayCount = Math.min(10, Math.max(1, Number($id('eventDays')?.value) || 5));
    if (firstDate && /^\d{4}-\d{2}-\d{2}$/.test(firstDate)) {
      const first = new Date(firstDate + 'T12:00:00');
      for (let i=0;i<dayCount;i++) {
        const d = new Date(first);d.setDate(d.getDate()+i);dates.push(dateKey(d.getTime()));
      }
    }
    for (const entry of history) if (!dates.includes(dateKey(entry.start))) dates.push(dateKey(entry.start));
    dates.sort();
    if (!dates.length) dates.push(today);
    const tabs=$id('setDayTabs');tabs.replaceChildren();
    if (!selectedResultDate || !dates.includes(selectedResultDate)) selectedResultDate=dates.includes(today)?today:dates[0];
    dates.forEach((date,index)=>{
      const button=document.createElement('button');button.type='button';
      button.className='set-day-tab'+(date===selectedResultDate?' active':'');
      const entries=history.filter(s=>dateKey(s.start)===date);
      const [year,month,day]=date.split('-');
      button.textContent=`${Number(month)}/${Number(day)} ${entries.length?'確定済':date>today?'未計算（未来）':'未計算'}`;
      button.setAttribute('aria-pressed',String(date===selectedResultDate));
      button.addEventListener('click',()=>{selectedResultDate=date;render();});
      tabs.appendChild(button);
    });
    const entries=history.filter(s=>dateKey(s.start)===selectedResultDate);
    const detail=$id('setDayDetail');detail.replaceChildren();
    const heading=document.createElement('h3');
    const [year,month,day]=selectedResultDate.split('-');
    heading.textContent=`${Number(month)}/${Number(day)}（${selectedResultDate===today?'本日':selectedResultDate>today?'未来':'過去'}）`;
    detail.appendChild(heading);
    if (!entries.length) {
      const empty=document.createElement('p');empty.textContent='未計算：この日付の確定済みセットはありません。';detail.appendChild(empty);
    } else {
      const total=entries.reduce((sum,s)=>sum+(Number(s.points)||0),0);
      const totalRuns=entries.reduce((sum,s)=>sum+(s.manualEvent||0)+(s.eventRuns||0)+(s.nightRuns||0),0);
      const p=document.createElement('p');p.className='set-day-total';p.textContent=`1セット獲得 ${num(total)} pt ／ イベント曲 ${totalRuns}回`;
      detail.appendChild(p);
      entries.forEach(s=>{
        const row=document.createElement('div');row.className='set-detail-row';
        const before=Number(s.preBedPoints), night=Number(s.nightPoints);
        const valid=Number.isFinite(before)&&Number.isFinite(night);
        addInfo(row,'セット開始',fmt(s.start));
        addInfo(row,'就寝前の計算期間',`${fmt(s.start)} ～ ${fmt(s.bed)}（${duration(s.availableSeconds ?? (s.bed-s.start)/1000)}）`);
        addInfo(row,'就寝前の獲得pt',valid?`${num(before)} pt`:'旧履歴のため内訳なし');
        addInfo(row,'夜間イベントBG',`${s.nightRuns||0}回 ／ ${duration(s.nightDuration||0)} ／ ${fmt(s.bed)} ～ ${fmt(s.end)}`);
        addInfo(row,'夜間BGの獲得pt',valid?`${num(night)} pt`:'旧履歴のため内訳なし');
        addInfo(row,'このセットの合計',`${num(s.points)} pt`);
        addInfo(row,'累計獲得pt',`${num(s.totalPoints)} pt`);
        addInfo(row,'通常曲',`手打ち${s.manualNormal||0}回・BG${s.normalRuns||0}回`);
        addInfo(row,'イベント曲',`手打ち${s.manualEvent||0}回・就寝前BG${s.eventRuns||0}回・夜間BG${s.nightRuns||0}回`);
        addInfo(row,'残りアイテム',`就寝時${num(s.atBed)}個 ／ 次セットへ${num(s.items)}個`);
        if(s.inputs){
          const edit=document.createElement('button');edit.type='button';edit.className='secondary-button';
          edit.textContent='このセットを現在のプレイ設定で更新・以降を再計算';
          edit.addEventListener('click',()=>updateEntry(s));row.appendChild(edit);
        }else{addInfo(row,'旧履歴','入力条件が保存されていないため、このセット自体の再計算はできません。');}
        detail.appendChild(row);
      });
    }
    const list=$id('setHistory');list.replaceChildren();
    history.forEach((s,i)=>{
      const item=document.createElement('article');item.className='set-history-item';
      const head=document.createElement('strong');head.textContent=`${i+1}セット目　${fmt(s.start)} → ${fmt(s.end)}`;
      const body=document.createElement('p');body.textContent=`開始日 ${dateKey(s.start)} ／ 就寝前 ${num(s.preBedPoints)}pt ＋ 夜間BG ${num(s.nightPoints)}pt ＝ セット ${num(s.points)}pt ／ 累計 ${num(s.totalPoints)}pt`;
      item.append(head,body);list.appendChild(item);
    });
    if(!history.length){const p=document.createElement('p');p.textContent='確定済みセットはありません。';list.appendChild(p);}
    if(last && !$id('setLatest').hidden) showLatest(last);
    $id('setActualPoints').textContent=`${num(last?.totalPoints||0)} pt`;
    $id('setActualItems').textContent=`${num(last?.items||0)} 個`;
    $id('setResultSummary').textContent=last?`確定済み ${history.length}セット。未確定の日付はptに加算しません。`:'まだ確定したセットはありません。';
  }
  function updateEntry(entry){
    try{
      if(!confirm('現在のプレイ画面の設定で、このセットと後続のセットを再計算しますか？'))return;
      const idx=history.indexOf(entry);
      if(idx<0)throw Error('更新する履歴が見つかりません。');
      const original=history.map(s=>({...s}));
      history[idx]={...history[idx],inputs:captureInputs()};
      try{recalculateHistory();show('');}catch(error){history=original;render();throw error;}
    }catch(error){show(error.message||'再計算に失敗しました。');}
  }
  function recalcAndShow(){
    try{recalculateHistory();show('');}catch(error){show('再計算エラー：'+error.message);}
  }
  $id('recalculateSets')?.addEventListener('click',recalcAndShow);
  function openSetResult() {
    const panel=$id('setResultPanel');panel.hidden=false;
    if(typeof showScreen==='function')showScreen('result');
    const summary=$id('eventSummaryResult');if(summary){summary.hidden=false;summary.classList.add('set-history-mode');}
    syncLegacyDailyResult();
    const results=$id('results');if(results)results.hidden=true;
    recalcAndShow();
  }
  $id('openSetResult').addEventListener('click',openSetResult);
  // 他の「計測」Resultを開く際は、従来の結果表示を妨げない。
  $id('calc')?.addEventListener('click',()=>{ $id('setResultPanel').hidden=true; $id('eventSummaryResult')?.classList.remove('set-history-mode'); });
  setInterval(()=>{if(todayKey()!==lastRenderedDate)render();},1000);
  function bedtimeAfter(start) {
    const value = $id('bedtimeInput').value;
    if (!/^\d\d:\d\d$/.test(value)) throw Error('就寝時刻を設定してください。');
    const [h,m] = value.split(':').map(Number);
    if (h > 23 || m > 59) throw Error('就寝時刻が正しくありません。');
    const d = new Date(start); d.setHours(h,m,0,0);
    if (d.getTime() <= start) d.setDate(d.getDate()+1);
    return d.getTime();
  }
  // イベントは開始日15:00から、開催日数の最終日23:59:59まで。
  // 内部的には翌日00:00:00を排他的な終了境界として扱う。
  function eventBounds() {
    const date = $id('eventStartDate')?.value;
    const days = Number($id('eventDays')?.value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !Number.isInteger(days) || days < 1 || days > 10) {
      throw Error('イベント開始日と開催日数（1～10日）を設定してください。');
    }
    const first = new Date(date + 'T15:00:00');
    if (Number.isNaN(first.getTime())) throw Error('イベント開始日が正しくありません。');
    const exclusiveEnd = new Date(first);
    exclusiveEnd.setDate(exclusiveEnd.getDate() + days);
    exclusiveEnd.setHours(0, 0, 0, 0);
    return {first:first.getTime(), end:exclusiveEnd.getTime()};
  }
  function compute() {
    show('');
    if(getSelectedPlayMode()!=='both')throw Error('1セット計算は「手打ち＆バクグラ」で使用してください。');
    const input=captureInputs();
    const last=effective();
    const result=calcSnapshot(input,last);
    if(dateKey(result.start)>todayKey())throw Error(`次セット開始は${fmt(result.start)}です。未来の日付のセットはまだ確定できません。`);
    if(history.some(s=>dateKey(s.start)===dateKey(result.start)))throw Error('この日付のセットは確定済みです。');
    return result;
  }
  $id('runOneSet').addEventListener('click', () => {
    try {
      const result = compute();
      history.push(result); save(); selectedResultDate=dateKey(result.start); render();
      showLatest(result);
    } catch (e) { show(e.message || '計算中にエラーが発生しました。'); }
  });
  $id('undoOneSet').addEventListener('click', () => { if (!history.length) return; if (!confirm('最後の1セットを取り消しますか？')) return; history.pop(); save(); render(); $id('setLatest').hidden = true; show(''); });
  $id('resetOneSet').addEventListener('click', () => { if (!confirm('1セット履歴と引き継ぎ情報をすべて削除しますか？')) return; history=[]; save(); render(); $id('setLatest').hidden=true; show(''); });
  recalcAndShow();
})();

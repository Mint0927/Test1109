'use strict';
const PROD_KEY='nogifes_visual_v1',TEST_KEY='nogifes_date_test_v1',FLAG_KEY='nogifes_test_mode_enabled';
let testMode=localStorage.getItem(FLAG_KEY)==='1';
let KEY=testMode?TEST_KEY:PROD_KEY;
const ITEM_CAP=99999,ITEM_COST=875;
const SONGS=[['最後のTightHug',212,81],['サヨナラの意味 向井葉月セレモニー',213,81],['三番目の風',214,81],['渋谷ブルース',200,75]];
const TABLE={81:[930,898,868,836,806,774],75:[858,828,800,772,744,714]};
const TYPES=['仕事/学校','授業・勉強','食事・休憩','その他'];
const escapeAttr=v=>String(v??'').replace(/[&"'<>]/g,c=>({'&':'&amp;','"':'&quot;',"'":'&#39;','<':'&lt;','>':'&gt;'}[c]));
const defaults=()=>({initialized:false,start:'',days:10,mode:'fullBackground',song:0,eventSeconds:183,bonus:2640,network:24,day:0,daysData:{},history:[],bonusChanges:[]});
let s;try{s={...defaults(),...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{s=defaults()}
const $=id=>document.getElementById(id),save=()=>localStorage.setItem(KEY,JSON.stringify(s));
const localDayString=(date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const currentDay=()=>testMode&&s.testClock?new Date(s.testClock+'T12:00:00'):new Date();
const freezeThrough=(index)=>{
 // 計測済みの日だけを保持する。日付変更だけでは未計測の結果を確定しない。
 if(!s.initialized||!s.start||index<0)return;
 if(!s.snapshots)s.snapshots={};
 let changed=false;
 for(let i=0;i<=Math.min(index,s.days-1);i++){
  if(s.snapshots[i])continue;
  // 旧データの confirmed は設定の決定だけでも立つため、確定根拠にしない。
 }
 if(changed)save();
};
const rollover=()=>{
 if(!s.initialized||!s.start)return;
 const now=localDayString(currentDay());
 if(!s.lastSeenDate||now>s.lastSeenDate){
  // 保存済みの計測結果はそのまま固定。未計測日は未確定のまま。
  const today=todayIndex();
  if(today>=0&&today<s.days&&!s.snapshots?.[today]){
   const d=dayData(today);
   d.tabDone={accuracy:false,sleep:false,bg:false};
   d.confirmed=false;
   d.activities.forEach(a=>a.confirmed=false);
  }
  s.lastSeenDate=now;save();
 }
};
const confirmMeasuredDay=(index,result)=>{
 if(!s.snapshots)s.snapshots={};
 const record=result.days[index];
 if(!record||record.errors.length)throw Error('計算結果を確定できません');
 s.snapshots[index]={...record,confirmed:true,settings:JSON.parse(JSON.stringify(predictionData(index))),frozenAt:localDayString(currentDay())};
 dayData(index).confirmed=true;
 save();
};
const switchMode=(on)=>{
 if(on===testMode)return;
 if(on&&!localStorage.getItem(TEST_KEY)){
  const copy=JSON.parse(localStorage.getItem(PROD_KEY)||JSON.stringify(defaults()));
  copy.testClock=localDayString(new Date());copy.snapshots={};copy.lastSeenDate=copy.testClock;
  localStorage.setItem(TEST_KEY,JSON.stringify(copy));
 }
 testMode=on;KEY=on?TEST_KEY:PROD_KEY;localStorage.setItem(FLAG_KEY,on?'1':'0');
 s={...defaults(),...JSON.parse(localStorage.getItem(KEY)||'{}')};
 page=s.initialized?'settings':'setup';render();
};
const jp=(d)=>`${d.getMonth()+1}/${d.getDate()}`;
const dateAt=(i)=>{const [y,m,d]=(s.start||'2026-11-13').split('-').map(Number);return new Date(y,m-1,d+i)};
const todayIndex=()=>{if(!s.start)return 0;const d=currentDay(),t=new Date(d.getFullYear(),d.getMonth(),d.getDate());return Math.floor((t-dateAt(0))/86400000)};
const newActivity=(name='仕事/学校')=>({name,mode:'normal',duration:'00:00:00',confirmed:false});
const dayData=(i)=>{
 if(!s.daysData[i])s.daysData[i]={accuracy:[0,0,0,0,0,100],wake:'06:00:00',wakeManual:false,bedtime:'23:00',activities:[newActivity()],confirmed:false};
 const d=s.daysData[i];if(!d.bedtime)d.bedtime='23:00';
 if(d.wakeManual===undefined)d.wakeManual=false;
 // Migrate unused legacy default rows without discarding configured rows.
 if(Array.isArray(d.activities)&&d.activities.length===4&&d.activities.map(a=>a.name).join('|')==='仕事|授業・勉強|食事・休憩|その他'){
  d.activities=d.activities.filter((a,j)=>j===0||a.confirmed||sec(a.duration)>0);
  d.activities[0].name='仕事/学校';
 }
 if(!Array.isArray(d.activities)||!d.activities.length)d.activities=[newActivity()];
 return d;
};
const activeIndex=()=>Math.min(Math.max(todayIndex(),0),s.days-1);
const todayEditable=()=>todayIndex()>=0&&todayIndex()<s.days;
const predictionData=i=>{
 // Future days reuse today's settings as a forecast; no editable future data.
 if(i>todayIndex())return dayData(activeIndex());
 return dayData(i);
};
const sec=t=>{const a=String(t||'0').split(':').map(Number);return a.length===3?a[0]*3600+a[1]*60+a[2]:a.length===2?a[0]*3600+a[1]*60:0};
const fmt=t=>{t=Math.max(0,Math.floor(t));return `${String(Math.floor(t/3600)).padStart(2,'0')}:${String(Math.floor(t%3600/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`};
const num=n=>Math.round(n).toLocaleString('ja-JP');
const modeText=m=>m==='both'?'手打ち＆BG（混合）':'フルバックグラウンド';
const row=(label,control)=>`<div class="row"><span class="label">${label}</span><div class="control">${control}</div></div>`;
const panel=(title,body,ico='✦')=>`<section class="panel"><h2>${title}</h2>${body}</section>`;
const btn=(label,action,cls='primary')=>`<button class="${cls}" data-action="${action}">${label}</button>`;
const dayLabel=i=>`${i+1}日目 (${jp(dateAt(i))})`;
let page=s.initialized?'play':'setup';
let playTab='accuracy';
const tabDone=d=>{if(!d.tabDone)d.tabDone={accuracy:false,sleep:false,bg:false};return d.tabDone};
const resetTab=(d,key)=>{tabDone(d)[key]=false;d.confirmed=false};
function render(){rollover();if(!s.initialized&&page!=='setup')page='setup';const titles={setup:'初期設定画面',play:'プレイ画面',result:'Result（結果）',settings:'設定画面',history:'セット履歴',help:'使い方'};$('subtitle').textContent=titles[page];document.querySelectorAll('[data-page]').forEach(b=>{b.classList.toggle('active',b.dataset.page===page);b.disabled=!s.initialized});$('nav').classList.toggle('hidden',page==='setup');$('content').innerHTML=({setup:renderSetup,play:renderPlay,result:renderResult,settings:renderSettings,history:renderHistory,help:renderHelp}[page])();}
function settingsFields(initial){return panel('プレイの基本設定',row('プレイ方法',`<div class="seg"><button data-action="mode" data-value="both" class="${s.mode==='both'?'selected':''}">手打ち＆BG</button><button data-action="mode" data-value="fullBackground" class="${s.mode==='fullBackground'?'selected':''}">フルBG</button></div>`)+row('通常曲（共通）',`<select data-field="song">${SONGS.map((a,i)=>`<option value="${i}" ${s.song===i?'selected':''}>${a[0]}</option>`).join('')}</select>`)+row('イベント曲時間',`<button class="timebtn" data-wheel="eventSeconds">${fmt(s.eventSeconds).slice(3)}（分:秒）</button>`)+row('特攻値',`<input data-field="bonus" type="number" min="0" max="9999" value="${s.bonus}"> % <output>${num(eventPt(s.bonus))} pt</output>`),'♧')+(s.mode==='both'?panel('回線速度（手打ち時のみ）',`<div class="seg">${[24,26,28].map((n,i)=>`<button data-action="network" data-value="${n}" class="${s.network===n?'selected':''}">${['速い','普通','遅い'][i]}<br>(${n}秒)</button>`).join('')}</div>`,'◎'):'')+`<button class="primary wide" data-action="saveSettings">✓ 設定を保存</button>`+(initial?'':`<button class="danger wide" data-action="end">⚑ イベント終了</button>`)}
function testControls(){
 const shown=testMode?(s.testClock||localDayString(new Date())):localDayString(new Date());
 const snapshots=Object.keys(s.snapshots||{}).length;
 return panel('日付変更テスト',`<div class="row"><span class="label">テストモード</span><div class="control"><button class="${testMode?'primary':'ghost'}" data-action="toggleTest">${testMode?'有効（本番に戻す）':'テストモードを有効にする'}</button></div></div>`+
 `<p class="small">${testMode?'テスト用データで操作中。本番データとは別に保存されます。':'現在は本番データで操作中です。'}</p>`+
 (testMode?`<div class="row"><span class="label">テスト日付</span><div class="control"><input type="date" id="testDate" value="${shown}"></div></div><p class="small">現在のテスト日付：${shown} / 確定保存済み：${snapshots}日</p>`+
 `<button class="primary wide" data-action="testNextDay">翌日 00:00 に進める</button><button class="ghost wide" data-action="testSetDate">指定日に進める</button><button class="danger wide" data-action="resetTest">テストデータを初期化</button>`:'')+
 `<p class="small">「計測する」で設定と結果を確定保存します。日付変更だけでは未計測の日を確定しません。</p>`);
}
function renderSetup(){return testControls()+panel('イベント情報',row('イベント開始日',`<input data-field="start" type="date" value="${s.start}">`)+row('イベント日数',`<select data-field="days">${Array.from({length:10},(_,i)=>`<option value="${i+1}" ${s.days===i+1?'selected':''}>${i+1}日</option>`).join('')}</select>`)+`<p class="note">イベント初日は15:00開始、最終日は23:59:59終了です。</p>`,'▣')+settingsFields(true)}
function renderSettings(){return testControls()+panel('イベント情報',row('イベント日数',`<span class="soft">${s.days}日（変更不可）</span>`)+row('イベント終了日時',`<span class="soft">${jp(dateAt(s.days-1))} 23:59</span>`)+`<p class="note">イベント期間中は日数・終了日時を変更できません。</p>`,'▣')+settingsFields(false)}
function datebar(){return `<div class="datebar"><button data-action="prev" ${s.day<=0?'disabled':''}>❮</button><strong>▣ ${dayLabel(s.day)}</strong><button data-action="next" ${s.day>=s.days-1?'disabled':''}>❯</button></div>`}
// 設定済みの楽曲からBGの1セット実行可能時間を算出する。
// 通常曲は3時間の設定枠内に開始できる曲を最後まで再生する。
// イベント曲は最大114回、最終回後の15秒待機は含めない。
function bgDurationInfo(){
 const song=SONGS[s.song]||SONGS[0];
 const normalCycle=song[1]+15;
 const normalRuns=Math.floor(10800/normalCycle)+1;
 const normalSeconds=normalRuns*normalCycle;
 const eventSeconds=114*(s.eventSeconds+15)-15;
 const readable=t=>`${Math.floor(t/3600)}時間${Math.floor(t%3600/60)}分${t%60}秒`;
 const songTime=t=>`${Math.floor(t/60)}分${t%60}秒`;
 return {normalSeconds,eventSeconds,normalRuns,normalText:readable(normalSeconds),eventText:readable(eventSeconds),songName:song[0],songDuration:songTime(song[1]),eventDuration:songTime(s.eventSeconds)};
}
function autoWakeFromBedtime(bedtime){
 const duration=bgDurationInfo().eventSeconds;
 return fmt((sec(bedtime)+duration)%86400);
}
function bgDurationPanel(){
 const b=bgDurationInfo();
 return `<div class="bg-duration-info" aria-label="BG連続実行可能時間"><div class="bg-duration-heading">BG連続実行可能時間</div><div class="bg-duration-line"><span>通常曲BG</span><strong>${b.normalText}</strong></div><p>（${escapeAttr(b.songName)}：${b.songDuration}）</p><div class="bg-duration-line"><span>イベント曲BG</span><strong>${b.eventText}</strong></div><p>（イベント曲：${b.eventDuration}）</p></div>`;
}
// フルBG専用：日付・睡眠・日別スナップショットに依存せず225時間を一括計算。
const FULL_BG_SECONDS=225*3600;
function simulateFullBackground(){
 const song=SONGS[s.song]||SONGS[0];
 const normalTime=song[1]+15,eventTime=s.eventSeconds+15;
 const gain=TABLE[song[2]][5],pt=eventPt(s.bonus);
 if(normalTime<=0||eventTime<=15||gain<=0)return {valid:false,error:'楽曲時間を確認してください'};
 // 225時間全体でイベント曲の最大回数を探索する。
 // 通常曲を必要以上に増やさず、同じイベント回数なら残アイテムを最小化する。
 const maxEvents=Math.floor((FULL_BG_SECONDS+15)/s.eventSeconds);
 let best=null;
 for(let target=maxEvents;target>=0;target--){
  const normals=Math.ceil(target*ITEM_COST/gain);
  // 必要アイテムの理論上の最小補充時間でも間に合わなければ不採用。
  const lowerTime=normals*normalTime+target*eventTime-15*Math.ceil(target/114);
  if(lowerTime>FULL_BG_SECONDS)continue;
  let inv=0,n=0,e=0,normalSeconds=0,eventSeconds=0,sets=0;
  // 実際にアイテム上限を守れる順番で実行できるか確認。
  while(e<target){
   const canEvent=Math.min(114,target-e,Math.floor(inv/ITEM_COST));
   if(canEvent>0 && (inv+gain>ITEM_CAP || n>=normals || inv>=114*ITEM_COST)){
    e+=canEvent;inv-=canEvent*ITEM_COST;eventSeconds+=canEvent*eventTime-15;sets++;
   }else if(n<normals && inv+gain<=ITEM_CAP){
    n++;inv+=gain;normalSeconds+=normalTime;
   }else if(canEvent>0){
    e+=canEvent;inv-=canEvent*ITEM_COST;eventSeconds+=canEvent*eventTime-15;sets++;
   }else break;
  }
  if(e!==target)continue;
  const elapsed=normalSeconds+eventSeconds;
  if(elapsed>FULL_BG_SECONDS)continue;
  best={valid:true,totalPt:e*pt,totalItems:e*ITEM_COST,totalTime:elapsed,eventWindow:FULL_BG_SECONDS,
   inv,earned:n*gain,spent:e*ITEM_COST,normalRuns:n,eventRuns:e,normalSeconds,eventSeconds,sets,idleSeconds:FULL_BG_SECONDS-elapsed};
  break;
 }
 return best||{valid:false,error:'225時間内に成立するプレイ順序を計算できませんでした'};
}
function renderFullBgResult(){
 const saved=s.fullBgResult;
 const r=saved&&saved.settings?.song===s.song&&saved.settings?.eventSeconds===s.eventSeconds&&saved.settings?.bonus===s.bonus?saved:simulateFullBackground();
 if(!r.valid)return panel('計算エラー',`<p class="error">${r.error}</p>`);
 return panel('フルバックグラウンド・総合結果',`<div class="points">${num(r.totalPt)} pt</div>${row('計算時間',fmt(FULL_BG_SECONDS))}${row('実プレイ時間',fmt(r.totalTime))}${row('未使用時間',fmt(r.idleSeconds))}${row('イベント終了時の残りアイテム',num(r.inv)+' 個')}`)+
 panel('225時間のプレイ内訳',`<table class="table"><thead><tr><th>種類</th><th>回数</th><th>時間</th></tr></thead><tbody><tr><td>通常曲BG</td><td>${num(r.normalRuns)} 回</td><td>${fmt(r.normalSeconds)}</td></tr><tr><td>イベント曲BG</td><td>${num(r.eventRuns)} 回</td><td>${fmt(r.eventSeconds)}</td></tr></tbody></table>`)+
 panel('アイテム収支',`${row('獲得アイテム',num(r.earned)+' 個')}${row('消費アイテム',num(r.spent)+' 個')}${row('残りアイテム',num(r.inv)+' 個')}`)+
 `<button class="primary wide" data-action="back">戻る</button><p class="small">日付・起床就寝・日別確定データは計算に使用しません。イベント全体225時間のシミュレーション結果です。</p>`;
}
function renderPlay(){
 if(s.mode==='fullBackground')return panel('フルバックグラウンド（225時間）',`<p class="note">日付・就寝時間・精度・BG時間の設定は不要です。225時間を一括計算します。</p><button class="primary wide" data-action="measureFullBg">計測する</button>`);
 s.day=activeIndex();const d=dayData(s.day),full=s.mode==='fullBackground',editable=todayEditable(),done=tabDone(d);
 const tabs=[['accuracy','精度'],['sleep','起床・就寝'],['bg','BG時間'],['measure','計測']];
 const tabBar=`<div class="play-tabs" role="tablist" aria-label="プレイ設定">${tabs.map(([id,label])=>`<button type="button" role="tab" aria-selected="${playTab===id}" class="play-tab ${playTab===id?'active':''}" data-play-tab="${id}">${label}${id!=='measure'&&done[id]?'<span class="tab-check" aria-label="設定完了">✓</span>':''}</button>`).join('')}</div>`;
 const disabled=editable?'':'disabled';
 let body='';
 if(playTab==='accuracy'){
  body=panel('精度設定（手打ち時のみ）',full?'<p class="note">フルBGでは精度設定は不要です（Dコン100%）。</p>':`<div class="acc">${['フルエクセレント','フルコン','A','B','C','D'].map((a,i)=>`<label>${a}<select data-accuracy="${i}" ${disabled}>${Array.from({length:11},(_,j)=>`<option value="${j*10}" ${d.accuracy[i]===j*10?'selected':''}>${j*10}%</option>`).join('')}</select></label>`).join('')}</div><p class="note">合計 ${d.accuracy.reduce((a,b)=>a+b,0)}%（100%にしてください）</p>`)+`<button class="primary wide" data-action="finishAccuracy" ${disabled}>決定して次へ</button>`;
 }else if(playTab==='sleep'){
  if(s.day===s.days-1){body=panel('最終日の設定',`<p class="note">最終日は就寝せず、イベント終了の23:59:59までプレイします。起床・就寝時刻の設定は不要です。</p><button class="primary wide" data-action="finishSleep" ${disabled}>確認して次へ</button>`);}
  else body=panel('起床・就寝時刻',row('起床時刻',`<button class="timebtn" data-wheel="wake" ${disabled}>${d.wake}</button>`)+row('就寝時刻',`<button class="timebtn" data-wheel="bedtime" ${disabled}>${d.bedtime}</button>`)+row('起床から就寝まで',`<span class="soft">${fmt(awakeSeconds(d))}</span>`)+`<p class="small">就寝時刻を決定すると起床時刻を自動調整します。起床時刻は手動変更できます。就寝前はイベントBGに必要なアイテム（114回なら99,750個）を優先して確保します。</p>`+bgDurationPanel()+`<button class="primary wide" data-action="finishSleep" ${disabled}>決定して次へ</button>`);
 }else if(playTab==='bg'){
  const acts=d.activities.map((a,i)=>`<div class="activity"><div class="activity-name"><input class="activity-name-input" type="text" data-activity-name="${i}" value="${escapeAttr(a.name)}" maxlength="40" placeholder="項目名" ${disabled}></div><div class="seg"><button data-action="activityMode" data-index="${i}" data-value="normal" class="${a.mode==='normal'?'selected':''}" ${disabled}>通常BG</button><button data-action="activityMode" data-index="${i}" data-value="event" class="${a.mode==='event'?'selected':''}" ${disabled}>イベントBG</button></div><button class="timebtn" data-wheel="activity" data-index="${i}" ${disabled}>${a.duration.slice(0,5)}</button><div class="activity-confirm"><button class="primary" data-action="activityConfirm" data-index="${i}" ${disabled}>決定</button><span class="check-slot">${a.confirmed?'<span class="check">✓</span>':''}</span></div>${i>0?`<button class="remove-activity" data-action="removeActivity" data-index="${i}" ${disabled}>×</button>`:'<span class="remove-placeholder"></span>'}</div>`).join('');
  const total=d.activities.reduce((x,a)=>x+sec(a.duration),0);
  body=panel('項目ごとのBG時間',`<p class="small">項目ごとにBGの種類と時間を設定して「決定」を押してください。</p>${acts}<button class="ghost wide" data-action="addActivity" ${disabled}>＋ 項目追加</button><div class="total"><span>本日のBG合計</span><strong>${fmt(total)}</strong></div><button class="primary wide" data-action="finishBg" ${disabled}>決定して次へ</button>`);
 }else{
  const items=[['accuracy','精度設定'],['sleep','起床・就寝'],['bg','BG時間']];
  const all=items.every(([id])=>done[id]);
  body=panel('設定確認',items.map(([id,label])=>`<button class="review-row" data-play-tab="${id}"><span>${label}</span><span class="${done[id]?'check':'pending'}">${done[id]?'✓ 設定完了':'未確定'}　›</span></button>`).join('')+`<p class="small">すべての設定を決定すると計測できます。</p><button class="primary wide" data-action="measureDay" ${editable&&all?'':'disabled'}>計測する</button>${d.confirmed?'<p class="note">今日の設定は確定済みです。</p>':''}`);
 }
 return `<div class="today-label">${editable?'今日の設定':'イベント期間外：編集できません'}　${dayLabel(s.day)}</div>`+tabBar+body;
}
function awakeSeconds(d){const w=sec(d.wake),b=sec(d.bedtime);return (b-w+86400)%86400||86400}
function activityAvailableSeconds(d){
 const day=activeIndex();
 if(day!==0)return awakeSeconds(d);
 // 初日だけは起床時刻ではなくイベント開始15:00を基準にする。
 const start=15*3600,bed=sec(d.bedtime);
 return (bed<=start?bed+86400:bed)-start;
}
function activityTimeError(d,index){const a=d.activities[index];if(!a)return '項目が見つかりません';const duration=sec(a.duration);if(duration>86400)return `${a.name}：実行時間は24時間以内にしてください`;const available=activityAvailableSeconds(d);if(duration>available)return `${a.name}：実行時間が起床から就寝までの時間を超えています`;const total=d.activities.reduce((v,item)=>v+sec(item.duration),0);if(total>available)return `BG合計${fmt(total)}が活動時間${fmt(available)}を超えています。各項目の時間を調整してください`;return ''}
function allActivityTimeError(d){for(let i=0;i<d.activities.length;i++){if(!d.activities[i].name.trim()){alert('項目名を入力してください');return}const error=activityTimeError(d,i);if(error)return error}return ''}
// 起床・就寝の決定時点で、曲の途中終了をしない条件を検証する。
function sleepScheduleError(d,checkActivities=false){
 const wake=sec(d.wake),bed=sec(d.bedtime),cycle=s.eventSeconds+15;
 if(!s.eventSeconds||cycle<=15)return 'イベント曲の時間を設定してください';
 const sleepSpan=(wake-bed+86400)%86400;
 if(sleepSpan===0)return '起床時刻と就寝時刻を同じにできません';
 const count=Math.ceil((sleepSpan+15)/cycle);
 if(count>114)return `就寝中BGは最大114回です。現在の設定では${count}回必要になります。`;
 const actual=count*cycle-15;
 if(actual<sleepSpan)return `BG終了が起床時刻より早くなります（${fmt(actual)}）。起床時刻を早めるか就寝時刻を変更してください。`;
 const day=activeIndex(),start=day===0?54000:sec(d.wake);
 let bedAt=sec(d.bedtime);if(bedAt<=start)bedAt+=86400;
 // 15:00開始で翌01:00就寝など、初日の日付をまたぐ就寝も有効。
 const available=bedAt-start;
 const total=d.activities.reduce((n,a)=>n+sec(a.duration),0);
 if(checkActivities&&total>available)return `BG設定時間エラー：プレイ可能${fmt(available)}、BG設定合計${fmt(total)}、超過${fmt(total-available)}`;
 return '';
}
function eventPt(b){return 1150*(1+b/100)+288}
// 実時刻（イベント初日の0時を0秒とする）で日中・睡眠を連結する。
// BGの設定時間は短縮しない。曲の最終待機15秒は計上しない。
function simulate(){
 let inv=0,totalPt=0,totalItems=0,totalTime=0,previousSleepEnd=null;
 const days=[],song=SONGS[s.song]||SONGS[0],isFull=s.mode==='fullBackground';
 const normalBg=song[1]+15,eventBg=s.eventSeconds+15;
 const normalManual=song[1]+s.network,eventManual=s.eventSeconds+s.network+1;
 const bgGain=TABLE[song[2]][5],pt=bg=>eventPt(s.bonus+(bg?0:144));
 const eventEnd=(s.days-1)*86400+86399;
 for(let day=0;day<s.days;day++){
  const frozen=s.snapshots&&s.snapshots[day];
  if(frozen){
   const record={...frozen,errors:[],confirmed:true};
   days.push(record);inv=record.inv;previousSleepEnd=record.dayEnd;
   totalPt+=record.points;totalItems+=record.spent;
   totalTime+=(record.bgNormalSeconds||0)+(record.bgEventSeconds||0)+(record.manualNormalSeconds||0)+(record.manualEventSeconds||0);
   continue;
  }
  const d=predictionData(day),accuracy=d.accuracy||[0,0,0,0,0,100];
  const manualGain=Math.round(accuracy.reduce((v,p,j)=>v+TABLE[song[2]][j]*p/100,0));
  const errors=[];let normalRuns=0,eventRuns=0,manualNormal=0,manualEvent=0;
  let earned=0,spent=0,points=0,used=0;
  let bgNormalSeconds=0,bgEventSeconds=0,sleepEventSeconds=0,sleepEventRuns=0,manualNormalSeconds=0,manualEventSeconds=0;
  const wake=sec(d.wake),bed=sec(d.bedtime);
  const base=day*86400;
  // 日中は前夜のBG終了後から。初日は15時開始。
  const start=day===0?54000:previousSleepEnd;
  let bedAt=base+bed;
  if(bedAt<=start)bedAt+=86400;
  // 最終日は就寝開始時刻ではなくイベント終了時刻を唯一の期限とする。
  const end=day===s.days-1?eventEnd:bedAt;
  const awakeAvailable=Math.max(0,end-start);
  const sleepTarget=day===s.days-1?null:base+86400+wake;
  if(day===s.days-1&&start>=eventEnd)errors.push('最終日の開始時刻がイベント終了後です');
  if(!isFull&&accuracy.reduce((a,b)=>a+b,0)!==100)errors.push('精度の合計が100%ではありません');
  const acts=d.activities.filter(a=>a.confirmed&&sec(a.duration)>0);
  const configured=acts.reduce((v,a)=>v+sec(a.duration),0);
  if(configured>awakeAvailable)errors.push(`BG設定時間エラー：プレイ可能${fmt(awakeAvailable)}、BG設定合計${fmt(configured)}、超過${fmt(configured-awakeAvailable)}`);
  let free=Math.max(0,awakeAvailable-configured);
  const gainNormal=bg=>{
   const gain=bg?bgGain:manualGain,time=bg?normalBg:normalManual;
   if(inv+gain>ITEM_CAP||(!bg&&free<=0))return false;
   inv+=gain;earned+=gain;used+=time;
   if(bg){normalRuns++;bgNormalSeconds+=time}else{manualNormal++;manualNormalSeconds+=time;free-=time}
   return true;
  };
  const playEvent=(bg,timeOverride)=>{
   const time=timeOverride??(bg?eventBg:eventManual);
   if(inv<ITEM_COST||(!bg&&free<=0))return false;
   inv-=ITEM_COST;spent+=ITEM_COST;points+=pt(bg);used+=time;
   if(bg){eventRuns++;bgEventSeconds+=time}else{manualEvent++;manualEventSeconds+=time;free-=time}
   return true;
  };
  // 日中BGは設定時間を専有し、上限回避・アイテム補充には空き手打ち時間を使用。
  for(const a of acts){
   if(errors.length)break;
   const duration=sec(a.duration),cycle=a.mode==='normal'?normalBg:eventBg;
   // 通常BGは3時間ごとのセットに分割。最終曲は設定時間内に開始できる。
   let remaining=duration;
   while(remaining>0&&!errors.length){
    const chunk=a.mode==='normal'?Math.min(10800,remaining):remaining;
    const count=a.mode==='normal'?Math.ceil(chunk/normalBg):Math.min(114,Math.ceil(chunk/eventBg));
    if(count===0)break;
    if(a.mode==='event'&&remaining>114*eventBg-15){errors.push(`${a.name}：イベントBGの連続実行114回を超えています。設定を分割してください`);break}
    for(let j=0;j<count;j++){
     if(a.mode==='normal'){
      while(inv+bgGain>ITEM_CAP&&!errors.length){if(isFull||!playEvent(false))errors.push(`${a.name}：上限回避のイベント曲手打ち時間が不足しています`)}
      if(!errors.length&&!gainNormal(true))errors.push(`${a.name}：通常曲BGを実行できません`);
     }else{
      while(inv<ITEM_COST&&!errors.length){if(isFull||!gainNormal(false))errors.push(`${a.name}：イベントBGに必要なアイテムを補充できません`)}
      if(!errors.length&&!playEvent(true,j===count-1?s.eventSeconds:eventBg))errors.push(`${a.name}：イベントBGを実行できません`);
     }
     if(errors.length)break;
    }
    remaining-=chunk;
   }
  }
  // BGのアイテム補充・上限回避に使用した手打ち時間も日中の消費時間。
  // ここで手打ち時間を差し引かないと、同じ時間を再利用してしまう。
  // 最後の1曲は就寝予定時刻を超えても完走させる。
  free=awakeAvailable-bgNormalSeconds-bgEventSeconds-manualNormalSeconds-manualEventSeconds;
  if(!isFull&&!errors.length&&free>0){
   const requiredRuns=day<s.days-1?Math.ceil(((base+86400+wake)-bedAt+15)/eventBg):0;
   const targetItems=Math.max(0,requiredRuns)*ITEM_COST;
   const startInv=inv;
   const limitN=Math.ceil(free/normalManual)+1;
   let best=null;
   // 最終曲を含む実行回数を列挙。アイテム不足を回避しつつ、
   // まず就寝時の必要数を確保し、そのうえで日中の空白を最小化する。
   for(let n=0;n<=limitN;n++){
    const maxE=Math.min(Math.ceil(free/eventManual)+1,Math.floor((startInv+n*manualGain)/ITEM_COST));
    for(let e=0;e<=maxE;e++){
     if(n===0&&e===0)continue;
     const duration=n*normalManual+e*eventManual;
     const lastFits=(n>0&&duration-normalManual<free)||(e>0&&duration-eventManual<free);
     if(!lastFits||(day===s.days-1&&duration>free))continue;
     const balance=startInv+n*manualGain-e*ITEM_COST;
     if(balance<0||balance>ITEM_CAP)continue;
     const qualified=balance>=targetItems;
     const score=day===s.days-1?[e,-balance,Math.min(duration,free)]:[qualified?1:0,Math.min(duration,free),balance,e];
     if(!best||score.some((v,i)=>v!==best.score[i]&&score.slice(0,i).every((x,j)=>x===best.score[j])&&v>best.score[i]))best={n,e,score};
    }
   }
   if(best){
    let {n,e}=best;
    // 手打ちの最後の1曲だけが就寝予定時刻をまたぐように順序を調整。
    while((n>0||e>0)&&!errors.length){
     const remaining=n*normalManual+e*eventManual;
     let did=false;
     if(n>0&&inv+manualGain<=ITEM_CAP&&free>0&&
        (remaining<=free||remaining-normalManual>=free||e===0)){
      did=gainNormal(false);if(did)n--;
     }
     if(!did&&e>0&&inv>=ITEM_COST&&free>0){did=playEvent(false);if(did)e--}
     if(!did&&n>0&&inv+manualGain<=ITEM_CAP&&free>0){did=gainNormal(false);if(did)n--}
     if(!did)errors.push('手打ちの実行順序が成立しません');
    }
   }
  }
  // 最後の曲が就寝予定時刻を超えた場合、実際の就寝開始をその終了時刻に調整。
  const daytimeUsed=bgNormalSeconds+manualNormalSeconds+manualEventSeconds+(bgEventSeconds-sleepEventSeconds);
  if(daytimeUsed>awakeAvailable+Math.max(normalBg,eventBg,normalManual,eventManual))errors.push(`日中の実行時間が活動可能時間を超えています（使用${fmt(daytimeUsed)}、活動可能${fmt(awakeAvailable)}）。BGの補充時間を含めて確認してください`);
  const adjustedBedAt=day===s.days-1?null:Math.max(bedAt,start+daytimeUsed);
  // 就寝中114回に必要な99,750個を確保できなければ計算を成立させない。
  // アイテム上限を超えるような仮想的な補充は行わない。
  if(day<s.days-1&&!errors.length){
   const sleepSpan=sleepTarget-adjustedBedAt;
   const requiredRuns=Math.ceil((sleepSpan+15)/eventBg);
   if(requiredRuns>0&&requiredRuns<=114){
    const requiredItems=requiredRuns*ITEM_COST;
    if(inv<requiredItems)errors.push(`就寝前のアイテム不足：必要${num(requiredItems)}個（${requiredRuns}回分）、所持${num(inv)}個、不足${num(requiredItems-inv)}個。日中のBG時間や手打ち時間を調整してください`);
   }
  }
  let sleepAvailable=0,sleepEnd=null;
  if(day<s.days-1&&!errors.length){
   if(sleepTarget<=adjustedBedAt)errors.push('起床時刻は就寝時刻より後にしてください');
   else{
    sleepAvailable=sleepTarget-adjustedBedAt;
    // 起床予定時刻までに開始した曲は最後まで完了。最終待機は含めない。
    const count=Math.ceil((sleepAvailable+15)/eventBg);
    if(count>114)errors.push(`就寝中BGが114回の上限を超えます（必要${count}回）`);
    else if(inv<count*ITEM_COST)errors.push(`就寝中BGのアイテム不足：必要${num(count*ITEM_COST)}個、所持${num(inv)}個`);
    else{
     sleepEventRuns=count;
     sleepEventSeconds=count*eventBg-15;
     for(let j=0;j<count;j++){
      const elapsed=j===count-1?s.eventSeconds:eventBg;
      if(!playEvent(true,elapsed)){errors.push('就寝中BGを実行できません');break}
     }
     sleepEnd=adjustedBedAt+sleepEventSeconds;
     if(sleepEnd<sleepTarget)errors.push(`BGが起床時刻より早く終了します。BG終了${fmt(sleepEnd%86400)}、設定起床${fmt(wake)}`);
    }
   }
  }
  if(day<s.days-1&&sleepEnd!==null)previousSleepEnd=sleepEnd;
  if(inv<0||inv>ITEM_CAP)errors.push('アイテム上限エラー');
  totalPt+=points;totalItems+=spent;totalTime+=used;
  days.push({points,earned,spent,inv,normalRuns,eventRuns,manualNormal,manualEvent,
   bgNormalSeconds,bgEventSeconds,sleepEventSeconds,sleepEventRuns,manualNormalSeconds,manualEventSeconds,
   confirmed:d.confirmed,errors,awakeAvailable,sleepAvailable,daytimeUsed,dayStart:start,dayEnd:day<s.days-1?sleepEnd:end,
   adjustedBedAt, idleSeconds:Math.max(0,awakeAvailable-daytimeUsed)});
  if(errors.length)break;
 }
 return {days,totalPt,totalItems,totalTime,valid:days.length===s.days&&days.every(d=>d.errors.length===0),eventWindow:s.days*86400-54000};
}
function renderResult(){if(s.mode==='fullBackground')return renderFullBgResult();const r=simulate();if(!r.valid)return panel('計算エラー',`<p class="error">設定したBG時間を実行できないため、Resultは表示できません。</p>${r.days.flatMap((d,i)=>d.errors.map(msg=>`<p class="error">${i+1}日目：${msg}</p>`)).join('')}<button class="primary wide" data-action="back">プレイ画面へ戻る</button>`,'!');const d=r.days[s.day],actual=todayIndex();const list=r.days.map((x,i)=>`<tr><td>${i+1}日目（${jp(dateAt(i))}） <span class="pill ${Boolean(s.snapshots?.[i])?'done':''}">${Boolean(s.snapshots?.[i])?'確定':i===todayIndex()?'未計測':'予測'}</span></td><td>${num(x.points)} pt</td></tr>`).join('');const bgNormal=d.bgNormalSeconds,bgEvent=d.bgEventSeconds,manual=d.manualNormalSeconds+d.manualEventSeconds;const sum=bgNormal+bgEvent+manual||1;return panel('総合結果',`<div class="points">${num(r.totalPt)} pt</div>${row('使用アイテム数',num(r.totalItems)+' 個')}${row('イベント終了時の残りアイテム数',num(r.days.at(-1).inv)+' 個')}${row('イベント全体時間',fmt(r.eventWindow))}${row('実プレイ時間（合計）',fmt(r.totalTime))}${row('日中の未使用時間（合計）',fmt(r.days.reduce((v,x)=>v+x.idleSeconds,0)))}`,'▥')+panel('日別獲得ポイント',`<table class="table"><thead><tr><th>日付</th><th>獲得イベントpt</th></tr></thead><tbody>${list}</tbody></table>`,'▣')+panel('時間配分グラフ（選択日）',`<div class="stack"><span style="width:${bgNormal/sum*100}%;background:#8721e4"></span><span style="width:${bgEvent/sum*100}%;background:#19b5b8"></span><span style="width:${manual/sum*100}%;background:#f068b4"></span></div><div class="legend"><span><i style="background:#8721e4"></i>通常BG</span><span><i style="background:#19b5b8"></i>イベントBG</span><span><i style="background:#f068b4"></i>手打ち</span></div>`,'▥')+datebar()+panel('選択日の時間枠',`${row('活動可能時間',fmt(d.awakeAvailable))}${row('日中の未使用時間',fmt(d.idleSeconds))}${row('実際の就寝開始',d.adjustedBedAt==null?'—（最終日は就寝なし）':fmt(d.adjustedBedAt%86400))}${row('就寝中BG',s.day===s.days-1?'—（最終日は実施なし）':fmt(d.sleepEventSeconds))}`,'◷')+panel('選択日のプレイ内訳',`<table class="table"><thead><tr><th>種類</th><th>回数</th><th>時間</th></tr></thead><tbody><tr><td>通常曲（BG）</td><td>${num(d.normalRuns)} 回</td><td>${fmt(d.bgNormalSeconds)}</td></tr><tr><td>通常曲（手打ち）</td><td>${num(d.manualNormal)} 回</td><td>${fmt(d.manualNormalSeconds)}</td></tr><tr><td>イベント曲（BG・日中）</td><td>${num(d.eventRuns-d.sleepEventRuns)} 回</td><td>${fmt(d.bgEventSeconds-d.sleepEventSeconds)}</td></tr><tr><td>イベント曲（BG・就寝中）</td><td>${num(d.sleepEventRuns)} 回</td><td>${fmt(d.sleepEventSeconds)}</td></tr><tr><td>イベント曲（手打ち）</td><td>${num(d.manualEvent)} 回</td><td>${fmt(d.manualEventSeconds)}</td></tr></tbody></table>`,'◷')+(d.errors.length?panel('計算上の注意',d.errors.map(x=>`<p class="error">${x}</p>`).join(''),'!'):'')+panel('アイテム収支',`${row('獲得アイテム数',num(d.earned)+' 個')}${row('消費アイテム数',num(d.spent)+' 個')}${row('残りアイテム数',num(d.inv)+' 個')}`,'▧')+`<button class="primary wide" data-action="back">❮ 戻る</button><p class="small">※数値は設定から算出するシミュレーション値です。日付の経過だけでは実プレイの獲得実績を検証できません。</p>`}
function renderHistory(){if(s.mode==='fullBackground')return panel('セット履歴','<p class="note">フルBGは225時間一括計算のため、日別セット履歴はありません。</p>');return panel('セット履歴',`<p class="small">各日の計測確定状況です。</p><table class="table"><thead><tr><th>日付</th><th>状態</th></tr></thead><tbody>${Array.from({length:s.days},(_,i)=>`<tr><td>${dayLabel(i)}</td><td>${i>todayIndex()?'予測（編集不可）':s.snapshots?.[i]?'計測確定':'未計測'}</td></tr>`).join('')}</tbody></table>`,'◷')}
function renderHelp(){return panel('使い方',`<p>① 初期設定でイベント日程・プレイ方法・楽曲・特攻値を設定します。</p><p>② 今日のプレイ画面でBGの種類・時間と精度を設定します。未来の日付は今日の設定から予測します。</p><p>③ 各項目の「決定」を押した後、「計測する」でその日の設定と結果を確定します。</p><p>④ Resultでは計測済みの日を確定、未計測の日を予測として表示します。</p><p>⑤ イベント終了時は設定画面から「イベント終了」を押します。</p>`,'?')}
let wheelTarget=null;
function wheelOpen(target,index){
 wheelTarget={target,index};const d=dayData(s.day);
 const value=target==='eventSeconds'?fmt(s.eventSeconds):target==='activity'?d.activities[index].duration:target==='wake'?d.wake:d.bedtime+':00';
 const a=value.split(':').map(Number);
 const hourMax=(target==='wake'||target==='bedtime')?23:24;
 for(const [id,max,v] of [['wh',hourMax,a[0]],['wm',59,a[1]],['ws',59,a[2]||0]]){
  $(id).innerHTML=Array.from({length:max+1},(_,i)=>`<option value="${i}" ${i===v?'selected':''}>${String(i).padStart(2,'0')}</option>`).join('');
 }
 $('wsWrap').classList.toggle('hidden',target==='bedtime'||target==='activity');
 $('wheelTitle').textContent=target==='activity'?'BG実行時間':target==='wake'?'起床時刻':target==='bedtime'?'就寝時刻':'イベント曲時間';
 $('wheelModal').hidden=false;
 // iOS/Androidで末尾の時刻が隠れないようネイティブ選択UIを使用。
 $('wh').scrollTop=0;
}
function wheelSave(){
 const h=+$('wh').value,m=+$('wm').value,ss=+$('ws').value;
 const target=wheelTarget.target,clock=target==='wake'||target==='bedtime';
 if((clock&&h===24)||(h===24&&(m!==0||(!clock&&target!=='activity'&&ss!==0)))){alert('24時間を選択した場合、分・秒は00にしてください');return}
 const v=fmt(h*3600+m*60+(target==='bedtime'||target==='activity'?0:ss)),d=dayData(s.day);
 if(target==='eventSeconds'){
  s.eventSeconds=h*3600+m*60+ss;
  // 手動で設定した起床時刻は変更しない。
  for(const day of Object.values(s.daysData)){
   if(day&&!day.wakeManual){day.wake=autoWakeFromBedtime(day.bedtime||'23:00');resetTab(day,'sleep');}
  }
 }
 else if(target==='activity'){
  const index=wheelTarget.index,old=d.activities[index].duration;
  d.activities[index].duration=v;
  const error=activityTimeError(d,index);
  if(error){d.activities[index].duration=old;alert(error);return}
  d.activities[index].confirmed=false;resetTab(d,'bg');
 }else if(target==='wake'||target==='bedtime'){
  if(target==='bedtime'){
   d.bedtime=v.slice(0,5);
   d.wake=autoWakeFromBedtime(d.bedtime);
   d.wakeManual=false;
  }else{
   d.wake=v;
   d.wakeManual=true;
  }
  resetTab(d,'sleep');resetTab(d,'bg');
  // Revalidate all existing activity confirmations after the day length changes.
  if(allActivityTimeError(d))d.activities.forEach(a=>a.confirmed=false);
 }
 save();$('wheelModal').hidden=true;render();
}
document.addEventListener('click',e=>{const pt=e.target.closest('[data-play-tab]');if(pt){playTab=pt.dataset.playTab;render();return}const wheel=e.target.closest('[data-wheel]');if(wheel){if(page==='play'&&!todayEditable())return;wheelOpen(wheel.dataset.wheel,+wheel.dataset.index||0);return}const nav=e.target.closest('[data-page]');if(nav){if(nav.dataset.page==='result'&&s.mode!=='fullBackground'){const check=simulate();if(!check.valid){const failure=check.days.find(d=>d.errors.length);alert('計算が成立しないためResultへ移動できません。\n'+(failure?.errors.join('\n')||'BG設定を確認してください'));return}}page=nav.dataset.page;render();return}const b=e.target.closest('[data-action]');if(!b)return;const act=b.dataset.action;
 if(act==='measureFullBg'){const result=simulateFullBackground();if(!result.valid){alert(result.error);return}s.fullBgResult={...result,settings:{song:s.song,eventSeconds:s.eventSeconds,bonus:s.bonus}};save();page='result';render();return}
 if(act==='toggleTest'){switchMode(!testMode);return}
 if(act==='testNextDay'||act==='testSetDate'){
  if(!testMode)return;
  const old=s.testClock||localDayString(new Date());
  const target=act==='testNextDay'?localDayString(new Date(new Date(old+'T12:00:00').getTime()+86400000)):$('testDate')?.value;
  if(!target||target<=old){alert('現在より後の日付を選択してください');return}
  const first=dateAt(0),before=new Date(target+'T12:00:00');
  const lastIndex=Math.round((new Date(before.getFullYear(),before.getMonth(),before.getDate())-first)/86400000)-1;
  freezeThrough(lastIndex);s.testClock=target;s.lastSeenDate=target;s.day=activeIndex();save();render();return;
 }
 if(act==='resetTest'){
  if(!testMode||!confirm('テスト用データだけを初期化しますか？ 本番データは残ります。'))return;
  const copy=JSON.parse(localStorage.getItem(PROD_KEY)||JSON.stringify(defaults()));
  copy.testClock=localDayString(new Date());copy.snapshots={};copy.lastSeenDate=copy.testClock;
  s={...defaults(),...copy};save();page=s.initialized?'settings':'setup';render();return;
 }
 const d=dayData(s.day),i=+b.dataset.index;if(page==='play'&&!todayEditable()&&['activityMode','activityConfirm','confirmDay','addActivity','removeActivity'].includes(act))return;if(act==='finishAccuracy'){if(s.mode==='both'&&d.accuracy.reduce((a,v)=>a+v,0)!==100){alert('精度の合計を100%にしてください');return}tabDone(d).accuracy=true;save();playTab='sleep'}else if(act==='finishSleep'){const err=s.day===s.days-1?null:sleepScheduleError(d);if(err){alert(err);return}tabDone(d).sleep=true;save();playTab='bg'}else if(act==='finishBg'){if(!tabDone(d).sleep){alert('先に起床・就寝時刻を確定してください');playTab='sleep';render();return}const err=(s.day===s.days-1?null:sleepScheduleError(d,true))||allActivityTimeError(d);if(err){alert('BG設定不可：'+err);return}if(d.activities.some(a=>sec(a.duration)>0&&!a.confirmed)){alert('BG時間を設定した項目は、それぞれ「決定」を押してください');return}const check=simulate();if(!check.valid){const issue=check.days.find(x=>x.errors.length);alert('BG設定不可：'+(issue?.errors.join('\n')||'日中・就寝中の実行条件を満たしていません'));return}tabDone(d).bg=true;save();playTab='measure'}else if(act==='measureDay'){if(!Object.values(tabDone(d)).every(Boolean)){alert('3つの設定タブを決定してください');return}const check=simulate();if(!check.valid){const failure=check.days.find(x=>x.errors.length);alert('計測できません。\n'+(failure?.errors.join('\n')||'設定を見直してください'));return}confirmMeasuredDay(s.day,check);page='result'}else if(act==='mode'){s.mode=b.dataset.value;save()}else if(act==='network'){s.network=+b.dataset.value;save()}else if(act==='prev')s.day=Math.max(0,s.day-1);else if(act==='next')s.day=Math.min(s.days-1,s.day+1);else if(act==='addActivity'){const names=TYPES.filter(name=>!d.activities.some(a=>a.name===name));const name=names[0]||`追加項目${d.activities.length+1}`;d.activities.push(newActivity(name));resetTab(d,'bg');save()}else if(act==='removeActivity'){if(i>0&&i<d.activities.length){d.activities.splice(i,1);resetTab(d,'bg');save()}}else if(act==='activityMode'){d.activities[i].mode=b.dataset.value;d.activities[i].confirmed=false;resetTab(d,'bg');save()}else if(act==='activityConfirm'){if(Number.isInteger(i)&&i>=0&&i<d.activities.length){if(!d.activities[i].name.trim()){alert('項目名を入力してください');return}const error=activityTimeError(d,i);if(error){alert(error);return}d.activities[i].confirmed=true;resetTab(d,'bg');save()}}else if(act==='confirmDay'){if(s.mode==='both'&&d.accuracy.reduce((a,v)=>a+v,0)!==100){alert('精度の合計を100%にしてください');return}if(d.activities.some(a=>!a.name.trim())){alert('BG項目名を入力してください');return}const timeError=allActivityTimeError(d);if(timeError){alert(timeError);return}if(d.activities.some(a=>sec(a.duration)>0&&!a.confirmed)){alert('実行時間を入力した項目は「決定」を押してください');return}const check=simulate();if(!check.valid){const failure=check.days.find(x=>x.errors.length);alert('設定したBG時間を実行できないため確定できません。\n'+(failure?.errors.join('\n')||'設定を見直してください'));return}save();alert('設定を保存しました。計測するを押すと結果が確定します')}else if(act==='saveSettings'){if(!s.start){alert('イベント開始日を入力してください');return}if(!(s.eventSeconds>0)){alert('イベント曲時間を入力してください');return}if(s.bonus<0||s.bonus>9999){alert('特攻値は0～9999%で入力してください');return}s.initialized=true;s.day=activeIndex();save();page='play'}else if(act==='end'){$('confirmModal').hidden=false;return}else if(act==='back'){page='play';playTab='measure';}render()});
document.addEventListener('change',e=>{const f=e.target.dataset.field;if(f){if(f==='start')s.start=e.target.value;else s[f]=+e.target.value;save();render()}const nameIndex=e.target.dataset.activityName;if(nameIndex!==undefined){if(!todayEditable())return;const d=dayData(s.day);const name=e.target.value.trim();if(!name){alert('項目名を入力してください');render();return}if(d.activities.some((a,i)=>i!==+nameIndex&&a.name===name)){alert('同じ項目名は使用できません');render();return}d.activities[+nameIndex].name=name;d.activities[+nameIndex].confirmed=false;resetTab(d,'bg');save();render();return}const idx=e.target.dataset.accuracy;if(idx!==undefined){if(!todayEditable())return;const d=dayData(s.day);d.accuracy[+idx]=+e.target.value;resetTab(d,'accuracy');save();render()}});
$('wheelCancel').onclick=()=>$('wheelModal').hidden=true;$('wheelOk').onclick=wheelSave;$('endCancel').onclick=()=>$('confirmModal').hidden=true;$('endOk').onclick=()=>{localStorage.removeItem(KEY);s=defaults();page='setup';$('confirmModal').hidden=true;render()};render();

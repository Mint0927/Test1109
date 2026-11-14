'use strict';
const KEY='nogifes_visual_v1',ITEM_CAP=99999,ITEM_COST=875;
const SONGS=[['最後のTightHug',212,81],['サヨナラの意味 向井葉月セレモニー',213,81],['三番目の風',214,81],['渋谷ブルース',200,75]];
const TABLE={81:[930,898,868,836,806,774],75:[858,828,800,772,744,714]};
const TYPES=['仕事/学校','授業・勉強','食事・休憩','その他'];
const escapeAttr=v=>String(v??'').replace(/[&"'<>]/g,c=>({'&':'&amp;','"':'&quot;',"'":'&#39;','<':'&lt;','>':'&gt;'}[c]));
const defaults=()=>({initialized:false,start:'',days:10,mode:'fullBackground',song:0,eventSeconds:183,bonus:2640,network:24,day:0,daysData:{},history:[],bonusChanges:[]});
let s;try{s={...defaults(),...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{s=defaults()}
const $=id=>document.getElementById(id),save=()=>localStorage.setItem(KEY,JSON.stringify(s));
const jp=(d)=>`${d.getMonth()+1}/${d.getDate()}`;
const dateAt=(i)=>{const [y,m,d]=(s.start||'2026-11-13').split('-').map(Number);return new Date(y,m-1,d+i)};
const todayIndex=()=>{if(!s.start)return 0;const d=new Date(),t=new Date(d.getFullYear(),d.getMonth(),d.getDate());return Math.floor((t-dateAt(0))/86400000)};
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
const panel=(title,body,ico='✦')=>`<section class="panel"><h2><span class="ico">${ico}</span>${title}</h2>${body}</section>`;
const btn=(label,action,cls='primary')=>`<button class="${cls}" data-action="${action}">${label}</button>`;
const dayLabel=i=>`${i+1}日目 (${jp(dateAt(i))})`;
let page=s.initialized?'play':'setup';
function render(){if(!s.initialized&&page!=='setup')page='setup';const titles={setup:'初期設定画面',play:'プレイ画面',result:'Result（結果）',settings:'設定画面',history:'セット履歴',help:'使い方'};$('subtitle').textContent=titles[page];document.querySelectorAll('[data-page]').forEach(b=>{b.classList.toggle('active',b.dataset.page===page);b.disabled=!s.initialized});$('nav').classList.toggle('hidden',page==='setup');$('content').innerHTML=({setup:renderSetup,play:renderPlay,result:renderResult,settings:renderSettings,history:renderHistory,help:renderHelp}[page])();}
function settingsFields(initial){return panel('プレイの基本設定',row('プレイ方法',`<div class="seg"><button data-action="mode" data-value="both" class="${s.mode==='both'?'selected':''}">手打ち＆BG</button><button data-action="mode" data-value="fullBackground" class="${s.mode==='fullBackground'?'selected':''}">フルBG</button></div>`)+row('通常曲（共通）',`<select data-field="song">${SONGS.map((a,i)=>`<option value="${i}" ${s.song===i?'selected':''}>${a[0]}</option>`).join('')}</select>`)+row('イベント曲時間',`<button class="timebtn" data-wheel="eventSeconds">${fmt(s.eventSeconds).slice(3)}（分:秒）</button>`)+row('特攻値',`<input data-field="bonus" type="number" min="0" max="9999" value="${s.bonus}"> % <output>${num(eventPt(s.bonus))} pt</output>`),'♧')+(s.mode==='both'?panel('回線速度（手打ち時のみ）',`<div class="seg">${[24,26,28].map((n,i)=>`<button data-action="network" data-value="${n}" class="${s.network===n?'selected':''}">${['速い','普通','遅い'][i]}<br>(${n}秒)</button>`).join('')}</div>`,'◎'):'')+`<button class="primary wide" data-action="saveSettings">✓ 設定を保存</button>`+(initial?'':`<button class="danger wide" data-action="end">⚑ イベント終了</button>`)}
function renderSetup(){return panel('イベント情報',row('イベント開始日',`<input data-field="start" type="date" value="${s.start}">`)+row('イベント日数',`<select data-field="days">${Array.from({length:10},(_,i)=>`<option value="${i+1}" ${s.days===i+1?'selected':''}>${i+1}日</option>`).join('')}</select>`)+`<p class="note">イベント初日は15:00開始、最終日は23:59:59終了です。</p>`,'▣')+settingsFields(true)}
function renderSettings(){return panel('イベント情報',row('イベント日数',`<span class="soft">${s.days}日（変更不可）</span>`)+row('イベント終了日時',`<span class="soft">${jp(dateAt(s.days-1))} 23:59</span>`)+`<p class="note">イベント期間中は日数・終了日時を変更できません。</p>`,'▣')+settingsFields(false)}
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
function renderPlay(){
 s.day=activeIndex();const d=dayData(s.day),full=s.mode==='fullBackground',editable=todayEditable();
 const accuracy=full?'':panel('精度設定（手打ち時のみ）',`<div class="acc">${['フルエクセレント','フルコン','A','B','C','D'].map((a,i)=>`<label>${a}<select data-accuracy="${i}" ${editable?'':'disabled'}>${Array.from({length:11},(_,j)=>`<option value="${j*10}" ${d.accuracy[i]===j*10?'selected':''}>${j*10}%</option>`).join('')}</select></label>`).join('')}</div><p class="note">合計 ${d.accuracy.reduce((a,b)=>a+b,0)}%（100%にしてください）</p>`,'◉');
 const acts=d.activities.map((a,i)=>`<div class="activity"><div class="activity-name"><input class="activity-name-input" type="text" data-activity-name="${i}" value="${escapeAttr(a.name)}" maxlength="40" placeholder="項目名を入力" aria-label="BG項目名" ${editable?'':'disabled'}></div><div class="seg"><button data-action="activityMode" data-index="${i}" data-value="normal" class="${a.mode==='normal'?'selected':''}" ${editable?'':'disabled'}>通常BG</button><button data-action="activityMode" data-index="${i}" data-value="event" class="${a.mode==='event'?'selected':''}" ${editable?'':'disabled'}>イベントBG</button></div><button class="timebtn" data-wheel="activity" data-index="${i}" ${editable?'':'disabled'}>${a.duration.slice(0,5)}</button><div class="activity-confirm"><button class="primary" data-action="activityConfirm" data-index="${i}" ${editable?'':'disabled'}>決定</button><span class="check-slot">${a.confirmed?'<span class="check">✓</span>':''}</span></div>${i>0?`<button class="remove-activity" data-action="removeActivity" data-index="${i}" aria-label="${a.name}を削除" ${editable?'':'disabled'}>×</button>`:'<span class="remove-placeholder"></span>'}</div>`).join('');
 const total=d.activities.reduce((x,a)=>x+sec(a.duration),0);
 return `<div class="today-label">${editable?'今日の設定':'イベント期間外：編集できません'}　${dayLabel(s.day)}</div>`+panel('プレイ方法',`<div class="play-mode-caption" style="text-align:center">${modeText(s.mode)}</div>`,'▣')+accuracy+panel('起床時間・活動時間',row('起床時間',`<button class="timebtn" data-wheel="wake" ${editable?'':'disabled'}>${d.wake}</button><span class="soft" style="display:block;font-size:11px">${d.wakeManual?'手動設定':'就寝時刻から自動設定'}・変更可能</span>`)+row('就寝時刻',`<button class="timebtn" data-wheel="bedtime" ${editable?'':'disabled'}>${d.bedtime}</button>`)+row('起床から就寝までの時間',`<span class="soft" aria-live="polite">${fmt(awakeSeconds(d))}（自動計算）</span>`)+bgDurationPanel(),'☼')+panel('項目ごとのBG時間（自動実行時間）',`<p class="small">初期項目は「仕事/学校」です。必要な項目だけ追加できます。BG合計は起床から就寝までの時間以内にしてください。</p>${acts}<button class="ghost wide" data-action="addActivity" ${editable?'':'disabled'}>＋ 項目追加</button><div class="total"><span>本日のBG合計</span><strong>${fmt(total)} ${d.confirmed?'✓':''}</strong></div><button class="primary wide" data-action="confirmDay" ${editable?'':'disabled'}>✓ 決定（今日の設定を確定）</button><p class="small">${d.confirmed?'今日の設定は保存されています。':'未確定の設定です。'}　未来の日付は今日の設定を引き継いで予測します。未来の設定は編集できません。</p>`,'◷');
}
function awakeSeconds(d){const w=sec(d.wake),b=sec(d.bedtime);return (b-w+86400)%86400||86400}
function activityTimeError(d,index){const a=d.activities[index];if(!a)return '項目が見つかりません';const duration=sec(a.duration);if(duration>86400)return `${a.name}：実行時間は24時間以内にしてください`;const available=awakeSeconds(d);if(duration>available)return `${a.name}：実行時間が起床から就寝までの時間を超えています`;const total=d.activities.reduce((v,item)=>v+sec(item.duration),0);if(total>available)return `BG合計${fmt(total)}が活動時間${fmt(available)}を超えています。各項目の時間を調整してください`;return ''}
function allActivityTimeError(d){for(let i=0;i<d.activities.length;i++){if(!d.activities[i].name.trim()){alert('項目名を入力してください');return}const error=activityTimeError(d,i);if(error)return error}return ''}
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
  const end=day===s.days-1?eventEnd:bedAt;
  const awakeAvailable=Math.max(0,end-start);
  const sleepTarget=day===s.days-1?null:base+86400+wake;
  if(day===0&&bedAt>86400)errors.push('初日は15:00から当日就寝までの時間を指定してください');
  if(day===s.days-1&&start>=eventEnd)errors.push('最終日の開始時刻がイベント終了後です');
  if(!isFull&&accuracy.reduce((a,b)=>a+b,0)!==100)errors.push('精度の合計が100%ではありません');
  const acts=d.activities.filter(a=>a.confirmed&&sec(a.duration)>0);
  const configured=acts.reduce((v,a)=>v+sec(a.duration),0);
  if(configured>awakeAvailable)errors.push(`BG設定時間エラー：プレイ可能${fmt(awakeAvailable)}、BG設定合計${fmt(configured)}、超過${fmt(configured-awakeAvailable)}`);
  let free=Math.max(0,awakeAvailable-configured);
  const gainNormal=bg=>{
   const gain=bg?bgGain:manualGain,time=bg?normalBg:normalManual;
   if(inv+gain>ITEM_CAP||(!bg&&free<time))return false;
   inv+=gain;earned+=gain;used+=time;
   if(bg){normalRuns++;bgNormalSeconds+=time}else{manualNormal++;manualNormalSeconds+=time;free-=time}
   return true;
  };
  const playEvent=(bg,timeOverride)=>{
   const time=timeOverride??(bg?eventBg:eventManual);
   if(inv<ITEM_COST||(!bg&&free<time))return false;
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
  // 空き時間の手打ちは就寝時アイテム残高を最大化する。
  if(!isFull&&!errors.length){
   const startInv=inv,limitN=Math.floor(free/normalManual);
   let best={end:inv,n:0,e:0};
   for(let n=0;n<=limitN;n++){
    const remain=free-n*normalManual;
    const maxE=Math.min(Math.floor(remain/eventManual),Math.floor((startInv+n*manualGain)/ITEM_COST));
    const minE=Math.max(0,Math.ceil((startInv+n*manualGain-ITEM_CAP)/ITEM_COST));
    if(minE>maxE)continue;
    const e=minE,endInv=startInv+n*manualGain-e*ITEM_COST;
    if(endInv>best.end||(endInv===best.end&&e>best.e))best={end:endInv,n,e};
   }
   let {n,e}=best;
   while((n>0||e>0)&&!errors.length){
    if(n>0&&inv+manualGain<=ITEM_CAP&&gainNormal(false)){n--;continue}
    if(e>0&&playEvent(false)){e--;continue}
    errors.push('手打ちの実行順序が成立しません');
   }
  }
  // 曲単位の端数は日中の未使用時間として計上。24時間を超える二重計上は禁止。
  const daytimeUsed=bgNormalSeconds+manualNormalSeconds+manualEventSeconds+(bgEventSeconds-sleepEventSeconds);
  if(daytimeUsed>awakeAvailable+Math.max(normalBg,eventBg))errors.push('日中の実行時間が活動可能時間を超えています');
  let sleepAvailable=0,sleepEnd=null;
  if(day<s.days-1&&!errors.length){
   if(sleepTarget<=bedAt)errors.push('起床時刻は就寝時刻より後にしてください');
   else{
    sleepAvailable=sleepTarget-bedAt;
    // 起床予定時刻までに開始した曲は最後まで完了。最終待機は含めない。
    const count=Math.ceil(sleepAvailable/eventBg);
    if(count>114)errors.push(`就寝中BGが114回の上限を超えます（必要${count}回）`);
    else if(inv<count*ITEM_COST)errors.push(`就寝中BGのアイテム不足：必要${num(count*ITEM_COST)}個、所持${num(inv)}個`);
    else{
     sleepEventRuns=count;
     sleepEventSeconds=count*eventBg-15;
     for(let j=0;j<count;j++){
      const elapsed=j===count-1?s.eventSeconds:eventBg;
      if(!playEvent(true,elapsed)){errors.push('就寝中BGを実行できません');break}
     }
     sleepEnd=bedAt+sleepEventSeconds;
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
   idleSeconds:Math.max(0,awakeAvailable-daytimeUsed)});
  if(errors.length)break;
 }
 return {days,totalPt,totalItems,totalTime,valid:days.length===s.days&&days.every(d=>d.errors.length===0),eventWindow:s.days*86400-54000};
}
function renderResult(){const r=simulate();if(!r.valid)return panel('計算エラー',`<p class="error">設定したBG時間を実行できないため、Resultは表示できません。</p>${r.days.flatMap((d,i)=>d.errors.map(msg=>`<p class="error">${i+1}日目：${msg}</p>`)).join('')}<button class="primary wide" data-action="back">プレイ画面へ戻る</button>`,'!');const d=r.days[s.day],actual=todayIndex();const list=r.days.map((x,i)=>`<tr><td>${i+1}日目（${jp(dateAt(i))}） <span class="pill ${i<actual&&s.daysData[i]?.confirmed?'done':''}">${i<actual&&s.daysData[i]?.confirmed?'確定':'予測'}</span></td><td>${num(x.points)} pt</td></tr>`).join('');const bgNormal=d.bgNormalSeconds,bgEvent=d.bgEventSeconds,manual=d.manualNormalSeconds+d.manualEventSeconds;const sum=bgNormal+bgEvent+manual||1;return panel('総合結果',`<div class="points">${num(r.totalPt)} pt</div>${row('使用アイテム数',num(r.totalItems)+' 個')}${row('イベント全体時間',fmt(r.eventWindow))}${row('実プレイ時間（合計）',fmt(r.totalTime))}${row('日中の未使用時間（合計）',fmt(r.days.reduce((v,x)=>v+x.idleSeconds,0)))}`,'▥')+panel('日別獲得ポイント',`<table class="table"><thead><tr><th>日付</th><th>獲得イベントpt</th></tr></thead><tbody>${list}</tbody></table>`,'▣')+panel('時間配分グラフ（選択日）',`<div class="stack"><span style="width:${bgNormal/sum*100}%;background:#8721e4"></span><span style="width:${bgEvent/sum*100}%;background:#19b5b8"></span><span style="width:${manual/sum*100}%;background:#f068b4"></span></div><div class="legend"><span><i style="background:#8721e4"></i>通常BG</span><span><i style="background:#19b5b8"></i>イベントBG</span><span><i style="background:#f068b4"></i>手打ち</span></div>`,'▥')+datebar()+panel('選択日の時間枠',`${row('活動可能時間',fmt(d.awakeAvailable))}${row('日中の未使用時間',fmt(d.idleSeconds))}${row('就寝中BG',fmt(d.sleepEventSeconds))}`,'◷')+panel('選択日のプレイ内訳',`<table class="table"><thead><tr><th>種類</th><th>回数</th><th>時間</th></tr></thead><tbody><tr><td>通常曲（BG）</td><td>${num(d.normalRuns)} 回</td><td>${fmt(d.bgNormalSeconds)}</td></tr><tr><td>通常曲（手打ち）</td><td>${num(d.manualNormal)} 回</td><td>${fmt(d.manualNormalSeconds)}</td></tr><tr><td>イベント曲（BG・日中）</td><td>${num(d.eventRuns-d.sleepEventRuns)} 回</td><td>${fmt(d.bgEventSeconds-d.sleepEventSeconds)}</td></tr><tr><td>イベント曲（BG・就寝中）</td><td>${num(d.sleepEventRuns)} 回</td><td>${fmt(d.sleepEventSeconds)}</td></tr><tr><td>イベント曲（手打ち）</td><td>${num(d.manualEvent)} 回</td><td>${fmt(d.manualEventSeconds)}</td></tr></tbody></table>`,'◷')+(d.errors.length?panel('計算上の注意',d.errors.map(x=>`<p class="error">${x}</p>`).join(''),'!'):'')+panel('アイテム収支',`${row('獲得アイテム数',num(d.earned)+' 個')}${row('消費アイテム数',num(d.spent)+' 個')}${row('残りアイテム数',num(d.inv)+' 個')}`,'▧')+`<button class="primary wide" data-action="back">❮ 戻る</button><p class="small">※数値は設定から算出するシミュレーション値です。日付の経過だけでは実プレイの獲得実績を検証できません。</p>`}
function renderHistory(){return panel('セット履歴',`<p class="small">各日で「決定」した設定の履歴です。</p><table class="table"><thead><tr><th>日付</th><th>状態</th></tr></thead><tbody>${Array.from({length:s.days},(_,i)=>`<tr><td>${dayLabel(i)}</td><td>${i>todayIndex()?'予測（編集不可）':dayData(i).confirmed?'設定確定':'未確定'}</td></tr>`).join('')}</tbody></table>`,'◷')}
function renderHelp(){return panel('使い方',`<p>① 初期設定でイベント日程・プレイ方法・楽曲・特攻値を設定します。</p><p>② 今日のプレイ画面でBGの種類・時間と精度を設定します。未来の日付は今日の設定から予測します。</p><p>③ 各項目の「決定」を押した後、「この日の設定を確定」を押します。</p><p>④ Resultで日別の予測ptとアイテム収支を確認します。</p><p>⑤ イベント終了時は設定画面から「イベント終了」を押します。</p>`,'?')}
let wheelTarget=null;
function wheelOpen(target,index){
 wheelTarget={target,index};const d=dayData(s.day);
 const value=target==='eventSeconds'?fmt(s.eventSeconds):target==='activity'?d.activities[index].duration:target==='wake'?d.wake:d.bedtime+':00';
 const a=value.split(':').map(Number);
 for(const [id,max,v] of [['wh',24,a[0]],['wm',59,a[1]],['ws',59,a[2]||0]]){
  $(id).innerHTML=Array.from({length:max+1},(_,i)=>`<option value="${i}" ${i===v?'selected':''}>${String(i).padStart(2,'0')}</option>`).join('');
 }
 $('wsWrap').classList.toggle('hidden',target==='bedtime'||target==='activity');
 $('wheelTitle').textContent=target==='activity'?'BG実行時間':target==='wake'?'起床時刻':target==='bedtime'?'就寝時刻':'イベント曲時間';
 $('wheelModal').hidden=false;
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
   if(day&&!day.wakeManual){day.wake=autoWakeFromBedtime(day.bedtime||'23:00');day.confirmed=false;}
  }
 }
 else if(target==='activity'){
  const index=wheelTarget.index,old=d.activities[index].duration;
  d.activities[index].duration=v;
  const error=activityTimeError(d,index);
  if(error){d.activities[index].duration=old;alert(error);return}
  d.activities[index].confirmed=false;d.confirmed=false;
 }else if(target==='wake'||target==='bedtime'){
  if(target==='bedtime'){
   d.bedtime=v.slice(0,5);
   d.wake=autoWakeFromBedtime(d.bedtime);
   d.wakeManual=false;
  }else{
   d.wake=v;
   d.wakeManual=true;
  }
  d.confirmed=false;
  // Revalidate all existing activity confirmations after the day length changes.
  if(allActivityTimeError(d))d.activities.forEach(a=>a.confirmed=false);
 }
 save();$('wheelModal').hidden=true;render();
}
document.addEventListener('click',e=>{const wheel=e.target.closest('[data-wheel]');if(wheel){if(page==='play'&&!todayEditable())return;wheelOpen(wheel.dataset.wheel,+wheel.dataset.index||0);return}const nav=e.target.closest('[data-page]');if(nav){if(nav.dataset.page==='result'){const check=simulate();if(!check.valid){const failure=check.days.find(d=>d.errors.length);alert('計算が成立しないためResultへ移動できません。\n'+(failure?.errors.join('\n')||'BG設定を確認してください'));return}}page=nav.dataset.page;render();return}const b=e.target.closest('[data-action]');if(!b)return;const act=b.dataset.action,d=dayData(s.day),i=+b.dataset.index;if(page==='play'&&!todayEditable()&&['activityMode','activityConfirm','confirmDay','addActivity','removeActivity'].includes(act))return;if(act==='mode'){s.mode=b.dataset.value;save()}else if(act==='network'){s.network=+b.dataset.value;save()}else if(act==='prev')s.day=Math.max(0,s.day-1);else if(act==='next')s.day=Math.min(s.days-1,s.day+1);else if(act==='addActivity'){const names=TYPES.filter(name=>!d.activities.some(a=>a.name===name));const name=names[0]||`追加項目${d.activities.length+1}`;d.activities.push(newActivity(name));d.confirmed=false;save()}else if(act==='removeActivity'){if(i>0&&i<d.activities.length){d.activities.splice(i,1);d.confirmed=false;save()}}else if(act==='activityMode'){d.activities[i].mode=b.dataset.value;d.activities[i].confirmed=false;d.confirmed=false;save()}else if(act==='activityConfirm'){if(Number.isInteger(i)&&i>=0&&i<d.activities.length){if(!d.activities[i].name.trim()){alert('項目名を入力してください');return}const error=activityTimeError(d,i);if(error){alert(error);return}d.activities[i].confirmed=true;d.confirmed=false;save()}}else if(act==='confirmDay'){if(s.mode==='both'&&d.accuracy.reduce((a,v)=>a+v,0)!==100){alert('精度の合計を100%にしてください');return}if(d.activities.some(a=>!a.name.trim())){alert('BG項目名を入力してください');return}const timeError=allActivityTimeError(d);if(timeError){alert(timeError);return}if(d.activities.some(a=>sec(a.duration)>0&&!a.confirmed)){alert('実行時間を入力した項目は「決定」を押してください');return}const check=simulate();if(!check.valid){const failure=check.days.find(x=>x.errors.length);alert('設定したBG時間を実行できないため確定できません。\n'+(failure?.errors.join('\n')||'設定を見直してください'));return}d.confirmed=true;save();alert('この日の設定を保存しました')}else if(act==='saveSettings'){if(!s.start){alert('イベント開始日を入力してください');return}if(!(s.eventSeconds>0)){alert('イベント曲時間を入力してください');return}if(s.bonus<0||s.bonus>9999){alert('特攻値は0～9999%で入力してください');return}s.initialized=true;s.day=activeIndex();save();page='play'}else if(act==='end'){$('confirmModal').hidden=false;return}else if(act==='back')page='play';render()});
document.addEventListener('change',e=>{const f=e.target.dataset.field;if(f){if(f==='start')s.start=e.target.value;else s[f]=+e.target.value;save();render()}const nameIndex=e.target.dataset.activityName;if(nameIndex!==undefined){if(!todayEditable())return;const d=dayData(s.day);const name=e.target.value.trim();if(!name){alert('項目名を入力してください');render();return}if(d.activities.some((a,i)=>i!==+nameIndex&&a.name===name)){alert('同じ項目名は使用できません');render();return}d.activities[+nameIndex].name=name;d.activities[+nameIndex].confirmed=false;d.confirmed=false;save();render();return}const idx=e.target.dataset.accuracy;if(idx!==undefined){if(!todayEditable())return;const d=dayData(s.day);d.accuracy[+idx]=+e.target.value;d.confirmed=false;save();render()}});
$('wheelCancel').onclick=()=>$('wheelModal').hidden=true;$('wheelOk').onclick=wheelSave;$('endCancel').onclick=()=>$('confirmModal').hidden=true;$('endOk').onclick=()=>{localStorage.removeItem(KEY);s=defaults();page='setup';$('confirmModal').hidden=true;render()};render();

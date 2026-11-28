'use strict';
const $=id=>document.getElementById(id), fmt=n=>n==null?'未取得':Number(n).toLocaleString('ja-JP'), fields=['me','rival','bonus','normal','event','myBonus'];
let state;try{state=JSON.parse(localStorage.getItem('nogifes-rival-v1'))||{settings:null,records:[]}}catch{state={settings:null,records:[]}}let editing=null, selected=null;
function save(){try{localStorage.setItem('nogifes-rival-v1',JSON.stringify(state));return true}catch{alert('保存できませんでした。ブラウザの保存設定を確認してください。');return false}}
function tab(id){document.querySelectorAll('main section').forEach(s=>s.hidden=s.id!==id);document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));if(id==='scan')initialFields();if(id==='analysis'||id==='history')render()}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>tab(b.dataset.tab));
function localDate(d){return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,19)}
function initialFields(){}
function reset(){for(const k of ['me','rival']){$(k+'Profile').value='';const p=$(k+'ProfilePreview');p.hidden=true;p.removeAttribute('src');$(k+'ProfileStatus').textContent='';}editing=null;selected=null;$('recordForm').reset();$('file').value='';$('preview').hidden=true;$('preview').removeAttribute('src');$('date').value=localDate(new Date());$('status').textContent='';$('raw').value='';$('candidates').replaceChildren();initialFields()}
function labels(){if(!state.settings)return;$('meLabel').textContent=state.settings.me+' のpt';$('rivalLabel').textContent=state.settings.rival+' のpt';$('meCounterTitle').textContent='自分：'+state.settings.me;$('rivalCounterTitle').textContent='相手：'+state.settings.rival}
if(state.settings)fields.forEach(k=>$(k).value=state.settings[k]??(k==='myBonus'?state.settings.bonus:''));labels();reset();tab(state.settings?'analysis':'settings');
$('settingsForm').onsubmit=e=>{e.preventDefault();let s=Object.fromEntries(fields.map(k=>[k,$(k).value.trim()]));if(!s.me||!s.rival||s.me===s.rival){alert('異なる名前を入力してください');return}if(state.settings&&state.records.length&&(s.me!==state.settings.me||s.rival!==state.settings.rival)){alert('記録がある間は名前を変更できません。');return}state.settings=s;save();labels();tab('analysis')};
$('file').onchange=async()=>{selected=$('file').files[0];if(!selected)return;const url=URL.createObjectURL(selected);$('preview').onload=()=>URL.revokeObjectURL(url);$('preview').src=url;$('preview').hidden=false;const current=selected;$('status').textContent='撮影日時を確認中';try{await loadScript('https://cdn.jsdelivr.net/npm/exifr@7.1.3/dist/full.umd.js','exifr');const meta=await window.exifr.parse(current);if(selected!==current)return;const d=meta?.DateTimeOriginal||meta?.CreateDate;if(d instanceof Date&&!isNaN(d)){ $('date').value=localDate(d);$('status').textContent='画像の撮影日時候補を取得しました。確認してください。';return}}catch{}if(selected!==current)return;$('date').value=localDate(new Date(current.lastModified||Date.now()));$('status').textContent='撮影日時なし。ファイル更新日時を参考入力しました。必ず修正・確認してください。'};
const scripts={};function loadScript(url,key){if(window[key])return Promise.resolve();if(!scripts[key])scripts[key]=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.onload=resolve;s.onerror=()=>{delete scripts[key];reject(Error('通信失敗'))};document.head.append(s)});return scripts[key]}
function norm(s){return s.normalize('NFKC').replace(/[\s・･·]/g,'').toLowerCase()}
function deadline(p,ms){let timer;return Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('読み込みがタイムアウトしました')),ms)})]).finally(()=>clearTimeout(timer))}
async function makeWorker(lang,progress){let expired=false;const promise=Tesseract.createWorker(lang,1,{workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js',corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1',langPath:'https://tessdata.projectnaptha.com/4.0.0_fast',logger:m=>{if(!expired)progress(m)},errorHandler:()=>{}});promise.then(w=>{if(expired)w.terminate().catch(()=>{})},()=>{});try{return await deadline(promise,45000)}catch(e){expired=true;throw e}}
function crop(img,x,y,w,h,scale=3,mono=false){const c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*w*scale);c.height=Math.round(img.naturalHeight*h*scale);const ctx=c.getContext('2d');ctx.drawImage(img,img.naturalWidth*x,img.naturalHeight*y,img.naturalWidth*w,img.naturalHeight*h,0,0,c.width,c.height);if(mono){const d=ctx.getImageData(0,0,c.width,c.height);for(let i=0;i<d.data.length;i+=4){const v=(d.data[i]+d.data[i+1]+d.data[i+2])/3>160?0:255;d.data[i]=d.data[i+1]=d.data[i+2]=v}ctx.putImageData(d,0,0)}return c}
function points(text){const v=text.replace(/[\s,，]/g,'');return /^\d{1,12}$/.test(v)?Number(v):null}
$('ocr').onclick=async()=>{if(!state.settings||!selected){alert('設定と画像選択を先に行ってください');return}const file=selected;let names,digits;let log=[];$('ocr').disabled=true;try{await deadline(loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js','Tesseract'),20000);const progress=m=>{$('status').textContent='画像認識：'+m.status+' '+Math.round((m.progress||0)*100)+'%'};const img=new Image();const url=URL.createObjectURL(file);try{img.src=url;await img.decode()}finally{URL.revokeObjectURL(url)};if(img.naturalWidth/img.naturalHeight<1.7)throw Error('ゲームの横長ランキング画像を選択してください');names=await makeWorker('jpn+eng',progress);digits=await makeWorker('eng',progress);await names.setParameters({tessedit_pageseg_mode:'7'});await digits.setParameters({tessedit_pageseg_mode:'7',tessedit_char_whitelist:'0123456789,'});const found=[];for(let i=0;i<4;i++){if(file!==selected)return;const y=.197+i*.209;$('status').textContent='ランキング '+(i+1)+' 行目を認識中…';const nameResult=await deadline(names.recognize(crop(img,.303,y,.36,.044,3)),20000);const name=nameResult.data.text.trim();let pt=null;if(i<3){const result=await deadline(digits.recognize(crop(img,.441,.325+i*.209,.098,.051,4,true)),20000);pt=points(result.data.text)}found.push({name,pt});log.push(name+' : '+(pt??'未取得'));$('raw').value=log.join('\n')};if(file!==selected)return;for(const [id,name] of [['mp',state.settings.me],['rp',state.settings.rival]]){const hits=found.filter(r=>norm(r.name)===norm(name)&&r.pt!==null);if(hits.length===1)$(id).value=hits[0].pt} $('status').textContent='読み取り候補を確認してください。名前が一致しない場合は下の行別候補から選択できます。';$('candidates').replaceChildren();for(const r of found){if(r.pt===null)continue;const line=node('div',r.name+'：'+fmt(r.pt),'entry');for(const [id,label] of [['mp','自分に入力'],['rp','相手に入力']]){const b=node('button',label);b.type='button';b.onclick=()=>{$(id).value=r.pt;initialFields()};line.append(b)}$('candidates').append(line)}}catch(e){$('status').textContent='画像認識失敗：'+e.message+'。Safariで開き直すか、下の欄に手入力してください。'}finally{for(const w of [names,digits])if(w)w.terminate().catch(()=>{});$('ocr').disabled=false;initialFields()}};
for(const id of ['date','mp','rp'])$(id).addEventListener('input',initialFields);
$('resetHistory').onclick=()=>{if(!confirm('すべての観測履歴を削除して計測をリセットしますか？ 設定は保持されます。'))return;const old=state.records;state.records=[];if(!save()){state.records=old;return}reset();tab('scan')};
$('recordForm').onsubmit=e=>{e.preventDefault();if(!state.settings){tab('settings');return}const t=new Date($('date').value).getTime(),me=$('mp').value===''?null:Number($('mp').value),rival=$('rp').value===''?null:Number($('rp').value);if(!Number.isFinite(t)||(me===null&&rival===null)||[me,rival].some(v=>v!==null&&(!Number.isSafeInteger(v)||v<0))){alert('時刻と少なくとも片方のptを正しく入力してください');return}if(state.records.some(r=>r.id!==editing&&r.t===t&&r.me===me&&r.rival===rival)){alert('同じ記録が存在します');return}const counters={};for(const k of ['meClear','meFC','rivalClear','rivalFC']){const v=$(k).value;counters[k]=v===''?null:Number(v);if(counters[k]!==null&&(!Number.isSafeInteger(counters[k])||counters[k]<0)){alert('回数を正しく入力してください');return}}for(const k of ['me','rival']){if(counters[k+'Clear']!=null&&counters[k+'FC']!=null&&counters[k+'FC']>counters[k+'Clear']){alert('フルコン回数がクリア回数を超えています');return}}const r={...counters,id:editing||crypto.randomUUID?.()||String(Date.now()),t,me,rival};state.records=state.records.filter(x=>x.id!==editing).concat(r).sort((a,b)=>a.t-b.t);save();reset();tab('analysis')};
function node(tag,text,cls){const el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;return el}function metric(parent,label,value,detail){const d=node('div','','metric');d.append(node('span',label),node('strong',value));if(detail)d.append(node('small',detail));parent.append(d)}
function rates(s){const base=Math.round(1150*(1+Number(s.bonus)/100)+288);return {bg:base,manual:base+1656}}
function updateRates(){const r=rates({bonus:$('bonus').value});$('override').value=r.bg;$('manualOverride').value=r.manual;}
$('bonus').addEventListener('input',updateRates);updateRates();
function solveDelta(delta,bg,manual){if(!Number.isSafeInteger(delta)||delta<0)return {invalid:true};if(delta===0)return {exact:[{b:0,m:0}],count:1,min:0,max:0};let exact=[],count=0,min=Infinity,max=0;let nearest=null;const limit=Math.floor(delta/Math.min(bg,manual))+1;if(limit>2000000)return {invalid:true};for(let b=0;b<=Math.floor(delta/bg)+1;b++){const v=(delta-b*bg)/manual;for(const m of new Set([Math.max(0,Math.floor(v)),Math.max(0,Math.ceil(v))])){const error=Math.abs(delta-b*bg-m*manual);if(!nearest||error<nearest.error)nearest={b,m,error};if(error===0){count++;min=Math.min(min,b+m);max=Math.max(max,b+m);exact.push({b,m})}}}return {exact,count,min,max,nearest}}
function duration(ms){let sec=Math.floor(ms/1000);return Math.floor(sec/3600)+'時間'+Math.floor(sec%3600/60)+'分'+sec%60+'秒'}
function analyze(a,b,s,key){
 if(a[key]==null||b[key]==null)return {reason:'pt未取得'};
 const r=rates({...s,bonus:key==='me'?(s.myBonus??s.bonus):s.bonus}),delta=b[key]-a[key],q=solveDelta(delta,r.bg,r.manual);
 if(!q.count)return {delta,reason:'pt差に完全一致する回数がありません'};
 const v=counterAnalysis(a,b,s,key,q);
 if(v?.invalid)return {delta,used:[q.min*875,q.max*875],reason:'ptとクリア・フルコン回数が一致しません'};
 const used=v?v.used:[q.min*875,q.max*875];
 return {delta,used,gain:v?.gain,net:v?[Math.min(...v.candidates.map(x=>x.glo-x.used)),Math.max(...v.candidates.map(x=>x.ghi-x.used))]:null,v,q,reason:v?'':'開始・終了のクリア回数が未取得'};
}
function showRange(v){return v?range(...v):'算出不可'}
function renderIntervals(rows,s){
 const a=$('compareStart'),b=$('compareEnd'),out=$('comparison'),total=$('intervals');
 for(const el of [a,b]){el.replaceChildren();for(const r of rows){const o=node('option',new Date(r.t).toLocaleString());o.value=r.id;el.append(o)}}
 out.replaceChildren();total.replaceChildren();$('elapsed').textContent='';
 if(rows.length<2){out.textContent='スクショを2件以上登録してください。';return}
 a.value=rows.at(-2).id;b.value=rows.at(-1).id;
 function compare(){out.replaceChildren();const x=rows.find(r=>String(r.id)===a.value),y=rows.find(r=>String(r.id)===b.value);if(!x||!y||x.t>=y.t){$('elapsed').textContent='終了時刻は開始時刻より後にしてください。';return}
 $('elapsed').textContent='経過時間：'+duration(y.t-x.t);
 for(const key of ['me','rival']){const z=analyze(x,y,s,key),d=node('div','','player '+key);d.append(node('h3',(key==='me'?'自分：':'相手：')+s[key]));metric(d,'取得アイテム数（推定）',showRange(z.gain));metric(d,'消費アイテム数（反映済み）',showRange(z.used));metric(d,'アイテム収支（推定）',showRange(z.net));const detail=node('details','');detail.append(node('summary','計算詳細'),node('p','増加pt：'+fmt(z.delta)));if(z.v){detail.append(node('p','通常曲：'+z.v.normal.join('～')+' 回'),node('p','イベント曲：'+z.v.event.join('～')+' 回'),node('p','フルコン増加：'+fmt(z.v.fc)+' 回'),... [['通常曲手打ち','normalHand'],['通常曲バクグラ（推定）','normalBG'],['イベント曲手打ち','eventHand'],['イベント曲バクグラ','eventBG']].map(([label,k])=>node('p',label+'：'+[...new Set(z.v[k])].join('～')+' 回')))}if(z.v)detail.append(node('p','通常曲バクグラは残り時間から推定。混合区間は0回～推定上限（未プレイとの区別不可）。手打ち待機は26秒／27秒を仮定。'));if(z.reason)detail.append(node('p',z.reason));d.append(detail);out.append(d)}}
 a.onchange=b.onchange=compare;compare();
 for(const key of ['me','rival']){const d=node('div','','entry');d.append(node('h3',s[key]));const obs=rows.filter(r=>r[key]!=null);if(obs.length<2){d.append(node('p','観測不足'));total.append(d);continue}const sums={gain:[0,0],used:[0,0]},missing={gain:0,used:0};const history=node('details','');history.append(node('summary','区間別履歴'));for(let i=1;i<obs.length;i++){const z=analyze(obs[i-1],obs[i],s,key);for(const k of ['gain','used']){if(z[k]){sums[k][0]+=z[k][0];sums[k][1]+=z[k][1]}else missing[k]++}history.append(node('p',new Date(obs[i-1].t).toLocaleString()+' ～ '+new Date(obs[i].t).toLocaleString()+'：取得 '+showRange(z.gain)+' / 消費 '+showRange(z.used)))}for(const [k,label] of [['gain','累計取得数（推定）'],['used','累計消費数（反映済み）']])metric(d,label,missing[k]===obs.length-1?'算出不可':showRange(sums[k]),missing[k]?'算出可能区間のみ・未算出 '+missing[k]+' 区間':'');d.append(history);total.append(d)}
}
function counterAnalysis(a,b,s,key,q){
 const dc=a[key+'Clear']!=null&&b[key+'Clear']!=null?b[key+'Clear']-a[key+'Clear']:null;
 const df=a[key+'FC']!=null&&b[key+'FC']!=null?b[key+'FC']-a[key+'FC']:null;
 if(dc===null)return null;
 if(dc<0||df!==null&&(df<0||df>dc))return {invalid:true};
 const candidates=[];
 for(const x of q.exact||[]){
  const hand=dc-x.m; // バクグラはクリア回数に加算されない
  if(hand<0||df!==null&&df>hand)continue;
  // 混合区間も、既知のプレイ時間を除いた残りから通常バクグラを推定。
  // 手打ちロードは普通回線（通常26秒・イベント27秒）を仮定。
  const elapsed=(b.t-a.t)/1000;
  const normalSec=Number(s.normal),eventSec=Number(s.event);
  const spent=hand*(normalSec+26)+x.m*(eventSec+27)+Math.max(0,x.b*(eventSec+15)-15);
  const remaining=Math.max(0,elapsed-spent);
  const bgNormal=Math.max(0,Math.floor((remaining+15)/(normalSec+15)));
  const bgMin=dc===0&&x.b===0&&x.m===0?bgNormal:0;
  const fmin=df??0,fmax=df??hand;
  candidates.push({n:hand+bgNormal,normalMin:hand+bgMin,hand,bgNormal,bgMin,b:x.b,m:x.m,fmin,fmax,used:(x.b+x.m)*875,glo:fmin*930+(hand-fmin)*836+bgMin*774,ghi:fmax*930+(hand-fmax)*836+bgNormal*774});
 }
 if(!candidates.length)return {invalid:true};
 const bounds=k=>[Math.min(...candidates.map(x=>x[k])),Math.max(...candidates.map(x=>x[k]))];
 return {normal:[bounds('normalMin')[0],bounds('n')[1]],normalHand:bounds('hand'),normalBG:[bounds('bgMin')[0],bounds('bgNormal')[1]],eventHand:bounds('m'),eventBG:bounds('b'),event:[Math.min(...candidates.map(x=>x.b+x.m)),Math.max(...candidates.map(x=>x.b+x.m))],used:bounds('used'),gain:[bounds('glo')[0],bounds('ghi')[1]],fc:df,candidates};
}
function range(lo,hi){return fmt(lo)+(lo===hi?'':' ～ '+fmt(hi))+' 個'}
function render(){const rows=state.records,s=state.settings;for(const id of ['summary','records','chart'])$(id).replaceChildren();if(!s)return;const a=rows.filter(r=>r.me!=null).at(-1),b=rows.filter(r=>r.rival!=null).at(-1);metric($('summary'),'pt差（自分－相手）',a&&b?fmt(a.me-b.rival):'未取得',a&&b&&a.t!==b.t?'異なる観測時刻の参考差':'');renderIntervals(rows,s);for(const r of rows.slice().reverse()){const d=node('div','','entry');d.append(node('b',new Date(r.t).toLocaleString()),node('p',s.me+'：'+fmt(r.me)+' / '+s.rival+'：'+fmt(r.rival)),node('small','自分 クリア '+fmt(r.meClear)+' / FC '+fmt(r.meFC)+' ｜ 相手 クリア '+fmt(r.rivalClear)+' / FC '+fmt(r.rivalFC)));const edit=node('button','編集');edit.onclick=()=>{reset();editing=r.id;$('date').value=localDate(new Date(r.t));$('mp').value=r.me??'';$('rp').value=r.rival??'';for(const k of ['meClear','meFC','rivalClear','rivalFC'])$(k).value=r[k]??'';tab('scan')};const del=node('button','削除');del.onclick=()=>{if(confirm('この記録を削除しますか？')){state.records=state.records.filter(x=>x.id!==r.id);save();render()}};d.append(edit,del);$('records').append(d)}draw(rows)}
function draw(rows){if(!rows.length)return;const values=rows.flatMap(r=>[r.me,r.rival]).filter(v=>v!==null),min=Math.min(...values),max=Math.max(...values),first=rows[0].t,last=rows.at(-1).t;const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 320 170');for(const [key,color] of [['me','#8653b9'],['rival','#d36c70']]){const points=rows.filter(r=>r[key]!==null).map(r=>[12+296*(r.t-first)/Math.max(1,last-first),150-130*(r[key]-min)/Math.max(1,max-min)]);const line=document.createElementNS(ns,'polyline');line.setAttribute('points',points.map(p=>p.join(',')).join(' '));line.setAttribute('fill','none');line.setAttribute('stroke',color);line.setAttribute('stroke-width','2');svg.append(line);for(const p of points){const dot=document.createElementNS(ns,'circle');dot.setAttribute('cx',p[0]);dot.setAttribute('cy',p[1]);dot.setAttribute('r','3');dot.setAttribute('fill',color);svg.append(dot)}}$('chart').append(svg,node('small','紫：自分　赤：相手　｜　'+fmt(min)+' ～ '+fmt(max)+' pt'))}
$('export').onclick=()=>{const csv='\ufeff撮影日時,自分pt,相手pt,行動\n'+state.records.map(r=>[localDate(new Date(r.t)),r.me??'',r.rival??'',r.action].join(',')).join('\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='rival-history.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};

// プロフィールの累計回数：添付例の横長レイアウトを基準に数値欄だけ切り出す。
for(const key of ['me','rival']){
 const input=$(key+'Profile'), preview=$(key+'ProfilePreview'), button=$(key+'ProfileOCR'), status=$(key+'ProfileStatus');
 input.onchange=()=>{const f=input.files[0];preview.hidden=!f;status.textContent='';if(!f){preview.removeAttribute('src');return}const url=URL.createObjectURL(f);preview.onload=()=>URL.revokeObjectURL(url);preview.src=url;};
 button.onclick=async()=>{const file=input.files[0];if(!file){status.textContent='プロフィール画像を選択してください';return}let worker;button.disabled=true;try{
 await deadline(loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js','Tesseract'),20000);
 const img=new Image(),url=URL.createObjectURL(file);try{img.src=url;await img.decode()}finally{URL.revokeObjectURL(url)}
 if(Math.abs(img.naturalWidth/img.naturalHeight-1803/832)>.13)throw Error('添付例と同じ横長のプロフィール画面を使用してください');
 worker=await makeWorker('eng',m=>{status.textContent='認識中 '+Math.round((m.progress||0)*100)+'%'});
 await worker.setParameters({tessedit_pageseg_mode:'7',tessedit_char_whitelist:'0123456789,'});
 const values=[];
 for(const x of [.437,.727]){const c=crop(img,x,.554,.063,.042,4);const ctx=c.getContext('2d');const d=ctx.getImageData(0,0,c.width,c.height);for(let i=0;i<d.data.length;i+=4){const r=d.data[i],g=d.data[i+1],b=d.data[i+2];const v=(g>r*1.15&&g>b*1.15)||Math.max(r,g,b)>130?255:0;d.data[i]=d.data[i+1]=d.data[i+2]=v}ctx.putImageData(d,0,0);const result=await deadline(worker.recognize(c),20000);values.push(points(result.data.text));}
 if(input.files[0]!==file)return;
 if(values[0]===null||values[1]===null||values[1]>values[0])throw Error('回数を正しく取得できませんでした');
 $(key+'Clear').value=values[0];$(key+'FC').value=values[1];status.textContent='読み取り完了。数値を確認してください。';
 }catch(e){status.textContent=e.message+'。手入力も可能です。'}finally{if(worker)worker.terminate().catch(()=>{});button.disabled=false;}};
}

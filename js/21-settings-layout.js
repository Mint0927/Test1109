'use strict';
(() => {
 const screen=document.getElementById('settingsScreen');
 if(!screen)return;
 const $=id=>document.getElementById(id);
 const card=(title,icon)=>{const s=document.createElement('section');s.className='settings-design-card';s.innerHTML=`<h2 class="settings-card-heading"><span aria-hidden="true">${icon}</span>${title}</h2>`;return s};
 const row=(label,element)=>{const d=document.createElement('div');d.className='settings-design-row';const l=document.createElement('strong');l.textContent=label;d.append(l,element);return d};
 const info=card('イベント情報','▣');
 const status=document.createElement('div');status.className='settings-info-status';
 const renderInfo=()=>{const days=$('eventDays')?.value||'5';const start=$('eventStartDate')?.value;let end='未設定';if(start){const date=new Date(start+'T15:00:00');date.setDate(date.getDate()+Number(days)-1);end=`${date.getMonth()+1}/${date.getDate()} 23:59`;}
 status.innerHTML=`<div class="settings-design-row"><strong>イベント日数</strong><span class="settings-static-value">${days} 日 <small>（開始後変更不可）</small></span></div><div class="settings-design-row"><strong>イベント終了日時</strong><span class="settings-static-value">${end}</span></div><p class="settings-info-note">ⓘ イベント期間中は日数・終了日時を変更できません。</p>`};
 renderInfo();info.append(status);
 const period=$('eventPeriodPanel');
 const initial=document.createElement('details');initial.className='initial-schedule';initial.open=localStorage.getItem('nogifes_initial_setup_completed_v1')!=='1';initial.innerHTML='<summary>初回のみ：イベント開始日・日数を設定</summary>';initial.append(period);info.append(initial);
 const basic=card('プレイの基本設定','♧');
 const modes=screen.querySelector('.mode-options');
 const modeLabels=[...modes.querySelectorAll('label')].filter(l=>!l.classList.contains('legacy-manual-mode'));
 const modeWrap=document.createElement('div');modeWrap.className='settings-mode-switch';modeLabels.reverse().forEach(l=>modeWrap.append(l));
 basic.append(row('プレイ方法',modeWrap));
 const song=$('normalSong');basic.append(row('通常曲（共通）',song));
 const normalTime=screen.querySelector('.song-time');normalTime.classList.add('settings-song-time');basic.append(normalTime);
 const eventTime=screen.querySelector('.event-time');basic.append(row('イベント曲時間',eventTime));
 const bonusRow=screen.querySelector('.initial-bonus-row');bonusRow.classList.add('settings-bonus-line');basic.append(row('特攻値',bonusRow));
 const bonusExtras=document.createElement('details');bonusExtras.className='settings-bonus-extra';bonusExtras.innerHTML='<summary>日付別の特攻値変更</summary>';bonusExtras.append($('bonusChanges'),$('addBonusChange'));basic.append(bonusExtras);
 const net=card('回線速度','◎');net.id='networkSettingsCard';net.append(screen.querySelector('.network-options'));
 const netNote=document.createElement('small');netNote.className='settings-network-note';netNote.textContent='手打ち時のみ';net.querySelector('h2').append(netNote);
 const save=$('saveSettings');save.classList.add('settings-save-button');save.textContent='✓ 設定を保存';
 const end=document.createElement('button');end.type='button';end.id='endEventButton';end.className='settings-end-button';end.innerHTML='⚑ イベント終了 <small>（終了すると、このイベントの計算・保存ができなくなります）</small>';
 const ended=()=>localStorage.getItem('nogifes_event_ended')==='1';
 // 終了済みイベントから新規イベントを作成する場合のみ、明示的に初期化する。
 const restart=document.createElement('button');restart.type='button';restart.id='restartEventButton';restart.className='settings-save-button';restart.textContent='新しいイベントを初期設定する';restart.hidden=!ended();
 // イベント終了時は旧イベントのアプリ内保存情報を破棄して初期設定に戻す。
 // 他のアプリのlocalStorageキーには触れない。
 function resetForNewEvent(){
   const keys=Object.keys(localStorage).filter(k=>/nogifes|nogi|event|daily|setHistory|bonusChanges/i.test(k));
   keys.forEach(k=>localStorage.removeItem(k));
   // リロード後は初期設定完了フラグがないため設定画面から開始する。
   location.reload();
 }
 restart.addEventListener('click',()=>{
   if(!confirm('新しいイベントの初期設定に戻りますか？\n以前のイベントのResult・セット履歴・設定は削除されます。'))return;
   resetForNewEvent();
 });
 function applyEnd(){const isEnded=ended();end.disabled=isEnded;end.innerHTML=isEnded?'イベント終了済み（閲覧専用）':'⚑ イベント終了 <small>（終了すると、このイベントの計算・保存ができなくなります）</small>';save.disabled=isEnded;restart.hidden=!isEnded;document.querySelectorAll('#settingsScreen input,#settingsScreen select,#settingsScreen button:not(#endEventButton),#playScreen input,#playScreen select,#playScreen button').forEach(el=>{el.disabled=isEnded;});}
 end.addEventListener('click',()=>{if(!confirm('イベントを終了して初期設定画面に戻りますか？\n現在のイベントの設定・Result・セット履歴は削除されます。'))return;resetForNewEvent();});
 screen.replaceChildren(info,basic,net,save,end,restart);
 // Preserve old nodes for existing calculation and storage event handlers.
 const hidden=document.createElement('div');hidden.className='settings-legacy-hidden';hidden.append(modes);
 const originalNetwork=$('networkArea');if(originalNetwork)hidden.append(originalNetwork);
 const originalBonus=screen.querySelector('.bonus-settings');if(originalBonus)hidden.append(originalBonus);
 screen.append(hidden);
 $('eventDays')?.addEventListener('change',renderInfo);$('eventStartDate')?.addEventListener('change',renderInfo);
 save.addEventListener('click',()=>setTimeout(()=>{renderInfo();initial.open=false;},0));
 const syncNetwork=()=>{const isBG=document.querySelector('input[name="playMode"]:checked')?.value==='fullBackground';net.hidden=isBG;};
 document.querySelectorAll('input[name="playMode"]').forEach(el=>el.addEventListener('change',syncNetwork));syncNetwork();applyEnd();
})();

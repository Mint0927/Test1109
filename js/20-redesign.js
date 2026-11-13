"use strict";
// Navigation is a presentation layer; preserve original calculation handlers.
(() => {
 const navButtons=[...document.querySelectorAll('[data-nav]')];
 const originalShow=window.showScreen;
 const historyPanel=document.getElementById('setResultPanel');
 const historyMount=document.getElementById('historyMount');
 const resultScreen=document.getElementById('resultScreen');
 const historyScreen=document.getElementById('historyScreen');
 const helpScreen=document.getElementById('helpScreen');
 const historyAnchor=document.createComment('original history position');
 if(historyPanel) historyPanel.before(historyAnchor);
 function navigate(name){
   if(name!=="settings" && localStorage.getItem("nogifes_initial_setup_completed_v1")!=="1"){
     name="settings";
   }
   if(name==='history'){
     if(historyPanel){historyMount.append(historyPanel);historyPanel.hidden=false;historyPanel.removeAttribute('aria-hidden');}
     originalShow('result');resultScreen.hidden=true;historyScreen.hidden=false;helpScreen.hidden=true;
   }else if(name==='help'){
     originalShow('play');document.getElementById('playScreen').hidden=true;
     historyScreen.hidden=true;helpScreen.hidden=false;
   }else{
     if(historyPanel && historyPanel.parentElement===historyMount){historyAnchor.after(historyPanel);historyPanel.hidden=true;}
     historyScreen.hidden=true;helpScreen.hidden=true;originalShow(name);
   }
   navButtons.forEach(b=>{const active=b.dataset.nav===name;b.classList.toggle('active',active);b.setAttribute('aria-current',active?'page':'false');});
 }
 window.showScreen=navigate;
 navButtons.forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.nav)));
 const observer=new MutationObserver(()=>{
   if(!historyScreen.hidden||!helpScreen.hidden)return;
   const active=['settings','play','result'].find(n=>!document.getElementById(n+'Screen').hidden);
   if(active)navButtons.forEach(b=>b.classList.toggle('active',b.dataset.nav===active));
 });
 observer.observe(document.getElementById('settingsScreen'),{attributes:true,attributeFilter:['hidden']});
 observer.observe(document.getElementById('playScreen'),{attributes:true,attributeFilter:['hidden']});
 observer.observe(resultScreen,{attributes:true,attributeFilter:['hidden']});
 const start=document.getElementById('eventStartDate');
 const period=document.getElementById('eventPeriodPanel');
 const syncPeriod=()=>{const saved=!!localStorage.getItem('nogifes_event_started');period.classList.toggle('is-locked',saved)};
 syncPeriod();
 document.getElementById('saveSettings')?.addEventListener('click',()=>{if(localStorage.getItem('nogifes_initial_setup_completed_v1')==='1'){localStorage.setItem('nogifes_event_started','1');syncPeriod()} });
 navigate(document.getElementById('playScreen').hidden?'settings':'play');
})();

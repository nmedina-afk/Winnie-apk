// app.js

// --------- Common: local clock ----------
function tickLocalClock(){
  const d = new Date();
  document.getElementById('localClock').textContent = d.toLocaleTimeString();
}
setInterval(tickLocalClock, 1000); tickLocalClock();

// --------- Tabs ---------
const tabManual = document.getElementById('tabManual');
const tabMatch = document.getElementById('tabMatch');
const viewManual = document.getElementById('viewManual');
const viewMatch = document.getElementById('viewMatch');

tabManual.onclick = () => { tabManual.classList.add('active'); tabMatch.classList.remove('active'); viewManual.style.display='block'; viewMatch.style.display='none'; };
tabMatch.onclick = () => { tabMatch.classList.add('active'); tabManual.classList.remove('active'); viewMatch.style.display='block'; viewManual.style.display='none'; };

// --------- Manual timers (1:50 and 9:50) ---------
const alertAudio = new Audio('alarm.wav'); // pre-alert and final
alertAudio.preload = 'auto';

function fmt(sec){
  const m = Math.floor(sec/60).toString().padStart(2,'0');
  const s = Math.floor(sec%60).toString().padStart(2,'0');
  return `00:${m}:${s}`;
}
function setText(id, sec){ document.getElementById(id).textContent = fmt(sec); }

const manual = {
  quarter: { base: 110, left: 110, timer: null, el: 'quarterTime', infoEl: 'qInfo' }, // 1:50
  break:   { base: 590, left: 590, timer: null, el: 'breakTime', infoEl: 'bInfo' }    // 9:50
};

setText(manual.quarter.el, manual.quarter.left);
setText(manual.break.el, manual.break.left);

function runManual(key){
  const obj = manual[key];
  clearInterval(obj.timer);
  obj.left = obj.base;
  document.getElementById(obj.infoEl).textContent = `Aviso a ${fmt(obj.base-10)}`;
  obj.timer = setInterval(()=>{
    obj.left--;
    setText(obj.el, obj.left);
    if(obj.left === 10){ alertAudio.currentTime = 0; alertAudio.play(); }
    if(obj.left <= 0){ clearInterval(obj.timer); alertAudio.currentTime = 0; alertAudio.play(); }
  }, 1000);
}
function pauseManual(key){
  const obj = manual[key];
  if(obj.timer){ clearInterval(obj.timer); obj.timer = null; }
}
function resetManual(key){
  const obj = manual[key];
  pauseManual(key);
  obj.left = obj.base;
  setText(obj.el, obj.left);
}

document.getElementById('qStart').onclick = ()=> runManual('quarter');
document.getElementById('qPause').onclick = ()=> pauseManual('quarter');
document.getElementById('qReset').onclick = ()=> resetManual('quarter');
document.getElementById('bStart').onclick = ()=> runManual('break');
document.getElementById('bPause').onclick = ()=> pauseManual('break');
document.getElementById('bReset').onclick = ()=> resetManual('break');

// --------- Match automatic mode (4 quarters + breaks) ---------
const periodDisplay = document.getElementById('periodDisplay');
const periodLabel = document.getElementById('periodLabel');
const subInfo = document.getElementById('subInfo');
const statusEl = document.getElementById('status');

const btnStart = document.getElementById('mStart');
const btnPause = document.getElementById('mPause');
const btnNext  = document.getElementById('mNext');
const btnReset = document.getElementById('mReset');

const soundPre = document.getElementById('soundPre');
const soundFinal = document.getElementById('soundFinal');

const quarterInput = document.getElementById('quarterDur');
const shortBreakInput = document.getElementById('shortBreak');
const longBreakInput  = document.getElementById('longBreak');

let checkerInterval = null;
const STATE = { STOPPED:'Detenido', RUNNING:'En curso', PAUSED:'Pausado', BREAK:'Descanso' };
let match = { currentPart:0, phase:'idle', phaseEndTs:0, preWarn:false, running:false, remainingMs:0 };

function nows(){ return Date.now(); }
function formatMS(ms){
  const total = Math.max(0, Math.round(ms/1000));
  const mm = Math.floor(total/60).toString().padStart(2,'0');
  const ss = (total%60).toString().padStart(2,'0');
  return `${mm}:${ss}`;
}
function updateDisplays(){
  const t = match.phaseEndTs - nows();
  periodDisplay.textContent = t>0 ? formatMS(t) : '--:--';
  statusEl.textContent = match.running ? (match.phase==='break'?STATE.BREAK:STATE.RUNNING) : (match.currentPart?STATE.PAUSED:STATE.STOPPED);
}

function startPlayingQuarter(){
  match.phase = 'playing';
  match.preWarn = false;
  const qMin = parseInt(quarterInput.value) || 15;
  match.phaseEndTs = nows() + qMin*60*1000;
  periodLabel.textContent = `Cuarto ${match.currentPart}`;
  subInfo.textContent = 'En juego';
  updateDisplays();
}
function startBreak(){
  match.phase = 'break';
  match.preWarn = false;
  const breakSec = (match.currentPart === 2) ? (parseInt(longBreakInput.value)||600) : (parseInt(shortBreakInput.value)||120);
  match.phaseEndTs = nows() + breakSec*1000;
  periodLabel.textContent = (match.currentPart===2) ? 'Entretiempo' : 'Descanso';
  subInfo.textContent = 'Descanso';
  updateDisplays();
}
function finishQuarterOrAdvance(){
  if(match.currentPart >= 4){
    match.phase = 'idle'; match.running=false; match.currentPart=5;
    periodLabel.textContent = 'Partido finalizado'; subInfo.textContent='—'; updateDisplays(); return;
  }
  startBreak();
}
function advanceAfterBreak(){
  match.currentPart++; startPlayingQuarter(); updateDisplays();
}
function startMatch(){
  if(match.running) return;
  match.running = true; match.currentPart = 1; startPlayingQuarter(); startChecker();
}
function pauseMatch(){
  if(!match.running) return;
  match.running = false; match.remainingMs = match.phaseEndTs - nows(); clearInterval(checkerInterval);
}
function resumeMatch(){
  if(match.running) return;
  match.running = true; match.phaseEndTs = nows() + (match.remainingMs||0); startChecker();
}
function resetMatch(){
  clearInterval(checkerInterval);
  match = { currentPart:0, phase:'idle', phaseEndTs:0, preWarn:false, running:false, remainingMs:0 };
  periodLabel.textContent='—'; subInfo.textContent='—'; periodDisplay.textContent='--:--'; statusEl.textContent=STATE.STOPPED;
}
function manualNext(){
  if(match.phase === 'playing') finishQuarterOrAdvance();
  else if(match.phase === 'break') advanceAfterBreak();
  else startMatch();
}

function startChecker(){
  clearInterval(checkerInterval);
  checkerInterval = setInterval(()=>{
    if(!match.running) return;
    const t = match.phaseEndTs - nows();
    periodDisplay.textContent = formatMS(t);
    if(match.phase === 'break'){
      if(t <= 10000 && !match.preWarn){ match.preWarn = true; try{ soundPre.currentTime=0; soundPre.play(); }catch(e){} showNotification('Aviso', { body:'10s para reanudar' }); }
      if(t <= 0){ try{ soundFinal.currentTime=0; soundFinal.play(); }catch(e){} advanceAfterBreak(); }
    } else if(match.phase === 'playing'){
      if(t <= 0){ try{ soundFinal.currentTime=0; soundFinal.play(); }catch(e){} finishQuarterOrAdvance(); }
    }
  }, 500);
}

// Notifications & SW
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('self.js').catch(console.error);
  navigator.serviceWorker.addEventListener('message', ev => {
    if(ev.data === 'play-sound'){ try{ soundFinal.currentTime=0; soundFinal.play(); }catch(e){} }
  });
}
document.getElementById('btnPerm').onclick = async ()=>{
  if(Notification.permission !== 'granted') await Notification.requestPermission();
  alert('Permiso de notificaciones: ' + Notification.permission);
};
function showNotification(title, opts){
  if(Notification.permission === 'granted'){
    if(navigator.serviceWorker && navigator.serviceWorker.controller){
      navigator.serviceWorker.controller.postMessage({cmd:'show-notif', title, opts});
    } else new Notification(title, opts||{});
  }
}

// Wake Lock
let keepAwake=null;
document.getElementById('btnKeepOn').onclick = async ()=>{
  if('wakeLock' in navigator){
    try{ keepAwake = await navigator.wakeLock.request('screen'); alert('Wake Lock activo'); }catch(e){ alert('No se pudo activar Wake Lock'); }
  } else alert('Wake Lock no soportado');
};

// VTR / Cronista quick notifications
document.getElementById('btnVTR').onclick = ()=> showNotification('VTR', { body:'Tirar VTR' });
document.getElementById('btnCronista').onclick = ()=> showNotification('Cronista', { body:'Entrada cronista' });

// Buttons wiring
btnStart.onclick = ()=> { if(!match.running){ if(match.currentPart===0||match.currentPart===5) startMatch(); else resumeMatch(); } };
btnPause.onclick = ()=> { if(match.running) pauseMatch(); else resumeMatch(); };
btnNext.onclick  = manualNext;
btnReset.onclick = resetMatch;

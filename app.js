// SPA logic for Algebra Quest (polished, mobile-first, Safari-friendly)
function setVh(){document.documentElement.style.setProperty('--vh', window.innerHeight*0.01+'px');}
setVh(); window.addEventListener('resize', setVh);

function genArithmetic(){const a=Math.floor(Math.random()*12)+1; const b=Math.floor(Math.random()*12)+1; return {prompt: `${a} + ${b}`, answer: (a+b).toString(), type:'arithmetic'};}
function genLinear(){const a=Math.floor(Math.random()*9)+1; const x=Math.floor(Math.random()*11)-5; const b=Math.floor(Math.random()*11)-5; const c=a*x+b; return {prompt: `${a}x + ${b} = ${c}`, answer: x.toString(), type:'linear'};}
function genQuadratic(){const p=Math.floor(Math.random()*9)-4; const q=Math.floor(Math.random()*9)-4; const b=p+q; const c=p*q; const prompt=`x^2 ${b>=0?'+':'-'}${Math.abs(b)}x ${c>=0?'+':'-'}${Math.abs(c)}`; const roots=[(-p).toString(),(-q).toString()]; return {prompt, answer:roots, type:'quadratic'};}
const TOPICS=[genArithmetic,genLinear,genQuadratic];

let audioCtx=null;
function playTone(freq,type='sine',time=0.12){ try{ if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)(); const o=audioCtx.createOscillator(); const g=audioCtx.createGain(); o.type=type; o.frequency.value=freq; o.connect(g); g.connect(audioCtx.destination); g.gain.value=0.0001; const now=audioCtx.currentTime; g.gain.exponentialRampToValueAtTime(0.12, now+0.01); o.start(now); g.gain.exponentialRampToValueAtTime(0.0001, now+time); o.stop(now+time+0.02);}catch(e){console.warn('Audio error',e)}}

let state={settings:{problemsPerRound:5,enableSound:true},progress:{xp:0,streak:0,lastPlayed:null},round:{problems:[],index:0,correct:0}};
try{ const saved=JSON.parse(localStorage.getItem('algebra_quest_state')||'{}'); if(saved.settings) state.settings=saved.settings; if(saved.progress) state.progress=saved.progress;}catch(e){}

function saveState(){ const s={settings:state.settings,progress:state.progress}; try{localStorage.setItem('algebra_quest_state',JSON.stringify(s))}catch(e){}}

const refs = {
 home: document.getElementById('home'),
 game: document.getElementById('game'),
 result: document.getElementById('result'),
 settings: document.getElementById('settings'),
 questionText: document.getElementById('questionText'),
 answerInput: document.getElementById('answerInput'),
 feedback: document.getElementById('feedback'),
 scoreEl: document.getElementById('score'),
 progressFill: document.getElementById('progressFill'),
 qCounter: document.getElementById('qCounter'),
 problemsPerRoundInput: document.getElementById('problemsPerRound'),
 enableSoundInput: document.getElementById('enableSound'),
}

refs.problemsPerRoundInput.value = state.settings.problemsPerRound;
refs.enableSoundInput.checked = state.settings.enableSound;

function showScreen(id){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active')); document.getElementById(id).classList.add('active'); if(id==='game') setTimeout(()=>refs.answerInput.focus(),300);}

function newRound(){
  const n = Number(state.settings.problemsPerRound)||5;
  const problems = [];
  for(let i=0;i<n;i++){ const g = TOPICS[Math.floor(Math.random()*TOPICS.length)]; problems.push(g()); }
  state.round = { problems, index:0, correct:0 };
  updateUIForProblem();
  showScreen('game');
  updateProgressBar();
}

function updateUIForProblem(){
  const p = state.round.problems[state.round.index];
  refs.questionText.textContent = p.prompt;
  refs.answerInput.value = '';
  refs.feedback.textContent = '';
  refs.qCounter.textContent = `${state.round.index+1} / ${state.round.problems.length}`;
  updateProgressBar();
}

function updateProgressBar(){
  const total = state.round.problems.length || 1;
  const fill = Math.round(((state.round.index)/total)*100);
  refs.progressFill.style.width = fill + '%';
}

function finishRound(){
  const correct = state.round.correct;
  const total = state.round.problems.length;
  const today = new Date().toISOString().slice(0,10);
  if(state.progress.lastPlayed){
    const diff = Math.floor((new Date(today)-new Date(state.progress.lastPlayed))/(1000*60*60*24));
    if(diff===1) state.progress.streak=(state.progress.streak||0)+1; else state.progress.streak=1;
  } else { state.progress.streak=1; }
  state.progress.lastPlayed = today;
  state.progress.xp = (state.progress.xp||0) + correct*10;
  saveState();
  document.getElementById('resultText').textContent = `You scored ${correct} / ${total}. XP: ${state.progress.xp}  Streak: ${state.progress.streak}`;
  refs.scoreEl.textContent = `Score: ${state.progress.xp}`;
  showScreen('result');
}

function submitAnswer(){
  const p = state.round.problems[state.round.index];
  const user = refs.answerInput.value.trim();
  let correct=false;
  if(Array.isArray(p.answer)) correct = p.answer.map(String).includes(user);
  else correct = String(p.answer) === user || (Number(user) && Math.abs(Number(user)-Number(p.answer))<0.01);
  if(correct){ state.round.correct +=1; refs.feedback.textContent='✅ Correct!'; if(state.settings.enableSound) playTone(880,'sine',0.12); }
  else { refs.feedback.textContent = `❌ Incorrect — Answer: ${Array.isArray(p.answer)?p.answer.join(', '):p.answer}`; if(state.settings.enableSound) playTone(220,'sawtooth',0.22); }
  state.round.index +=1; updateProgressBar();
  setTimeout(()=>{ if(state.round.index >= state.round.problems.length) finishRound(); else updateUIForProblem(); }, 800);
}

// event bindings
document.getElementById('startBtn').onclick = ()=>newRound();
document.getElementById('settingsBtn').onclick = ()=>showScreen('settings');
document.getElementById('backBtn').onclick = ()=>showScreen('home');
document.getElementById('saveSettingsBtn').onclick = ()=>{
  state.settings.problemsPerRound = Number(refs.problemsPerRoundInput.value)||5;
  state.settings.enableSound = refs.enableSoundInput.checked;
  saveState();
  showScreen('home');
};
document.getElementById('submitBtn').onclick = submitAnswer;
refs.answerInput.addEventListener('keydown',(e)=>{ if(e.key==='Enter') submitAnswer(); });
document.getElementById('playAgainBtn').onclick = ()=>newRound();
document.getElementById('homeBtn').onclick = ()=>showScreen('home');
document.getElementById('hintBtn').onclick = ()=>{
  const p = state.round.problems[state.round.index];
  let steps = ['Try to isolate the unknown or compute the arithmetic.'];
  if(p.type==='linear') steps = ['Move constants to the other side','Divide by the coefficient of x','Compute result'];
  if(p.type==='quadratic') steps = ['Try factoring into (x + p)(x + q)','Find p and q or use quadratic formula'];
  if(p.type==='arithmetic') steps = ['Follow PEMDAS, compute sums or products'];
  alert('Steps:\n'+steps.join('\n'));
};

// register service worker
if('serviceWorker' in navigator){ navigator.serviceWorker.register('/sw.js').catch(()=>{}); }

// init
refs.scoreEl.textContent = `Score: ${state.progress.xp||0}`;
showScreen('home');

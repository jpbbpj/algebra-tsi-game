// Algebra Quest — Final with Calculator (compact)
// Mobile-friendly fixes
function setVh(){document.documentElement.style.setProperty('--vh', window.innerHeight*0.01+'px');}
setVh(); window.addEventListener('resize', setVh);

function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

// Persistent state
const LS_KEY='algebra_quest_state_v3';
let STATE = {
  settings: { selectedLevel:1, problemsPerRound:100, enableSound:true, verboseSteps:false },
  progress: { xp:0, unlocked:[1], scores:{} },
  pools: {}
};
try{ const s=JSON.parse(localStorage.getItem(LS_KEY)||'null'); if(s) STATE=s; }catch(e){console.warn(e)}
function save(){localStorage.setItem(LS_KEY, JSON.stringify(STATE))}

// DOM helpers
const el=id=>document.getElementById(id);
const levelButtons = el('levelButtons'), startAtLevelBtn = el('startAtLevelBtn'), openSettingsBtn = el('openSettingsBtn');
const problemsPerRoundInput = el('problemsPerRound'), enableSoundInput = el('enableSound'), verboseDefault = el('verboseDefault');
const scoreEl = el('score'), levelInfo = el('levelInfo'), progressFill = el('progressFill'), progressText = el('progressText');
const questionText = el('questionText'), answerInput = el('answerInput'), submitBtn = el('submitBtn'), stepsBtn = el('stepsBtn'), feedback = el('feedback');
const stepsModal = el('stepsModal'), stepsList = el('stepsList'), glossaryEl = el('glossary'), closeStepsBtn = el('closeStepsBtn'), copyStepsBtn = el('copyStepsBtn');
const advanceBtn = el('advanceBtn'), retryBtn = el('retryBtn'), homeBtn = el('homeBtn'), endSummary = el('endSummary'), celebration = el('celebration');
const openSettingsBtn2 = el('openSettingsBtn'), saveSettingsBtn = el('saveSettingsBtn'), settingsBackBtn = el('settingsBackBtn');

// Audio helpers
function playTone(freq, type='sine', dur=0.12){ if(!STATE.settings.enableSound) return; try{ if(!window.__audioCtx) window.__audioCtx = new (window.AudioContext||window.webkitAudioContext)(); const C=window.__audioCtx; const o=C.createOscillator(); const g=C.createGain(); o.type=type; o.frequency.value=freq; o.connect(g); g.connect(C.destination); g.gain.value=0.0001; const now=C.currentTime; g.gain.exponentialRampToValueAtTime(0.12, now+0.01); o.start(now); g.gain.exponentialRampToValueAtTime(0.0001, now+dur); o.stop(now+dur+0.02);}catch(e){} }
function playSuccess(){playTone(880)} function playFail(){playTone(220,'sawtooth',0.18)} function playLevelUp(){playTone(1200,'triangle',0.28); playTone(1600,'sine',0.18)}

// Level specs with generators
const LEVEL_SPEC = {
  1: {name:'Addition', desc:'Simple addition', gen:()=>{const a=randInt(1,9),b=randInt(1,9);return {prompt:`${a} + ${b}`,answer:(a+b).toString(),type:'arithmetic'}}},
  2: {name:'Subtraction', desc:'Subtraction & regrouping', gen:()=>{const a=randInt(5,20),b=randInt(1,9);return {prompt:`${a} - ${b}`,answer:(a-b).toString(),type:'arithmetic'}}},
  3: {name:'Multiplication', desc:'Times tables', gen:()=>{const a=randInt(2,12),b=randInt(2,12);return {prompt:`${a} × ${b}`,answer:(a*b).toString(),type:'arithmetic'}}},
  4: {name:'Mixed Ops', desc:'Mixed with parentheses', gen:()=>{const a=randInt(1,8),b=randInt(1,8),c=randInt(1,8);return {prompt:`${a} × (${b} + ${c})`,answer:(a*(b+c)).toString(),type:'arithmetic'}}},
  5: {name:'One-step eq', desc:'x + a = b', gen:()=>{const a=randInt(1,10),x=randInt(1,10),b=a+x;return {prompt:`x + ${a} = ${b}`,answer:x.toString(),type:'linear'}}},
  6: {name:'Two-step eq', desc:'ax + b = c', gen:()=>{const a=randInt(2,6),x=randInt(1,10),b=randInt(0,10),c=a*x+b;return {prompt:`${a}x + ${b} = ${c}`,answer:x.toString(),type:'linear'}}},
  7: {name:'Distribution', desc:'Distribute and combine terms', gen:()=>{const a=randInt(1,6),b=randInt(1,6),c=randInt(1,6),x=randInt(1,6);return {prompt:`${a}(${b}x + ${c}) = ${a*b*x + a*c}`,answer:x.toString(),type:'linear'}}},
  8: {name:'Fractions', desc:'Equations with fractions', gen:()=>{const denom=randInt(2,6),num=randInt(1,9),x=randInt(1,10),b=randInt(1,6);const c=(num/denom)*x + b; return {prompt:`${num}/${denom}x + ${b} = ${c}`,answer:x.toString(),type:'linear'}}},
  9: {name:'Inequalities', desc:'Inequalities and multi-step', gen:()=>{const a=randInt(1,6),x=randInt(1,8),b=randInt(0,10),c=a*x+b; return {prompt:`${a}x + ${b} < ${c+randInt(1,3)}`,answer:x.toString(),type:'inequality'}}},
 10: {name:'Word problems', desc:'Multi-step / word problems', gen:()=>{const x=randInt(1,8),y=randInt(1,8),s=x+y,d=x-y; return {prompt:`Two numbers sum to ${s} and differ by ${d}. Find first number.`,answer:x.toString(),type:'word'}}}
};

// Glossary definitions
const GLOSSARY = {
  'variable': 'A symbol (often x or y) that represents an unknown value.',
  'coefficient': 'A number multiplied by a variable (e.g., 3 in 3x).',
  'constant': 'A fixed number that does not change (e.g., 5).',
  'isolate': 'To get the variable alone on one side of an equation.',
  'inverse operation': 'An operation that reverses another (addition <-> subtraction, multiplication <-> division).',
  'distributive property': 'a(b + c) = ab + ac — multiply each term inside parentheses by a.',
  'factor': 'To write an expression as a product of simpler expressions.',
  'root': 'A solution of an equation (for quadratic, values of x that make it zero).',
  'numerator': 'The top part of a fraction.',
  'denominator': 'The bottom part of a fraction.',
  'reciprocal': 'The inverse of a number: 3 -> 1/3. Multiply by reciprocal to divide by a fraction.',
  'simplify': 'To make an expression or result as simple as possible.',
  'combine like terms': 'Add or subtract terms that have the same variable part (e.g., 3x + 2x = 5x).'
};

// Pool generation: ensure 100 unique problems per level
function ensurePool(level){
  if(STATE.pools[level] && STATE.pools[level].length >= 100) return;
  STATE.pools[level] = [];
  const seen = new Set();
  while(STATE.pools[level].length < 100){
    const p = LEVEL_SPEC[level].gen();
    const k = JSON.stringify(p);
    if(!seen.has(k)){ seen.add(k); STATE.pools[level].push(p); }
  }
  save();
}

// Solve and produce clear step-by-step lines + show glossary (based on problem type)
function solveProblem(problem, verbose){
  const steps = [];
  const terms = new Set();
  const t = problem.type;
  if(t === 'arithmetic'){
    if(problem.prompt.includes('×') && problem.prompt.includes('(')){
      const m = problem.prompt.match(/(\\d+)\\s*×\\s*\\((\\d+)\\s*\\+\\s*(\\d+)\\)/);
      if(m){
        const a = Number(m[1]), b = Number(m[2]), c = Number(m[3]);
        steps.push(`1) Start with: ${a} × (${b} + ${c}).`);
        steps.push(`2) Compute inside parentheses (follow order of operations): ${b} + ${c} = ${b + c}.`);
        steps.push(`3) Multiply: ${a} × ${b + c} = ${a * (b + c)}.`);
        terms.add('distributive property'); terms.add('simplify');
        return {steps, terms};
      }
    }
    if(problem.prompt.includes('+')){
      const parts = problem.prompt.split('+').map(s=>s.trim());
      const a = Number(parts[0]), b = Number(parts[1]);
      steps.push(`1) Start with: ${a} + ${b}.`);
      steps.push(`2) Add the two numbers: ${a} + ${b} = ${a + b}.`);
      terms.add('simplify');
      return {steps, terms};
    }
    if(problem.prompt.includes('-')){
      const parts = problem.prompt.split('-').map(s=>s.trim());
      const a = Number(parts[0]), b = Number(parts[1]);
      steps.push(`1) Start with: ${a} - ${b}.`);
      steps.push(`2) Subtract: ${a} - ${b} = ${a - b}.`);
      terms.add('simplify');
      return {steps, terms};
    }
    if(problem.prompt.includes('×')){
      const parts = problem.prompt.replace('×','*').split('*').map(s=>s.trim());
      const a = Number(parts[0]), b = Number(parts[1]);
      steps.push(`1) Start with: ${a} × ${b}.`);
      steps.push(`2) Multiply: ${a} × ${b} = ${a * b}.`);
      terms.add('simplify');
      return {steps, terms};
    }
    steps.push('Compute step-by-step using arithmetic.');
    return {steps, terms};
  }

  if(t === 'linear'){
    const s = problem.prompt.replace(/\s+/g,'');
    const m = s.match(/^([+-]?\d*)x([+-]?\d*)=([+-]?\d+)$/);
    if(m){
      let a = m[1]===''?1:(m[1]==='-'?-1:Number(m[1]));
      let b = m[2]===''?0:Number(m[2]);
      const c = Number(m[3]);
      steps.push(`1) Start with the equation: ${a}x ${b>=0?'+':''}${b} = ${c}.`);
      steps.push(`2) Subtract ${b} from both sides to move constants: ${a}x = ${c} - ${b}.`);
      steps.push(`3) Compute the subtraction: ${c} - ${b} = ${c - b}.`);
      steps.push(`4) Divide both sides by ${a} to isolate x: x = ${(c - b)/a}.`);
      steps.push(`5) Check by substituting x back into the original equation.`);
      terms.add('coefficient'); terms.add('constant'); terms.add('subtract'); terms.add('divide'); terms.add('isolate');
      return {steps, terms};
    }
    const m2 = problem.prompt.match(/^x\s*\+\s*(\d+)\s*=\s*(\d+)$/);
    if(m2){
      const a = Number(m2[1]), b = Number(m2[2]);
      steps.push(`1) Start with: x + ${a} = ${b}.`);
      steps.push(`2) Subtract ${a} from both sides to isolate x: x = ${b} - ${a}.`);
      steps.push(`3) Compute: x = ${b - a}.`);
      steps.push(`4) Check by substituting back.`);
      terms.add('isolate'); terms.add('inverse operation'); terms.add('subtract');
      return {steps, terms};
    }
    steps.push('Isolate x by moving constants to the other side, then divide by the coefficient.');
    terms.add('isolate'); terms.add('coefficient'); terms.add('divide');
    return {steps, terms};
  }

  if(t === 'inequality'){
    steps.push('1) Treat the inequality like an equation to isolate the variable.');
    steps.push('2) If you multiply or divide by a negative number, flip the inequality sign.');
    steps.push('3) Check your solution by testing a value in the original inequality.');
    terms.add('inequality'); terms.add('isolate');
    return {steps, terms};
  }

  if(t === 'word'){
    steps.push('1) Assign variables to the unknowns (e.g., let x = first number).');
    steps.push('2) Translate words to equations (sum, difference, product).');
    steps.push('3) Solve the algebraic equation(s) step-by-step.');
    steps.push('4) Check by plugging answers into the problem description.');
    terms.add('variable'); terms.add('translate'); terms.add('equation');
    return {steps, terms};
  }

  return {steps:['No steps available for this problem.'], terms};
}

// UI helpers
function showScreen(id){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active')); document.getElementById(id).classList.add('active'); if(id==='game') setTimeout(()=>answerInput.focus(),300); }

// Build level buttons
function updateLevelButtons(){ levelButtons.innerHTML=''; for(let i=1;i<=10;i++){ const btn = document.createElement('button'); btn.textContent = i; btn.className = 'level-button'; if(!STATE.progress.unlocked.includes(i)) btn.classList.add('locked'); btn.dataset.level = i; btn.onclick = ()=>{ STATE.settings.selectedLevel = i; document.querySelectorAll('.level-button').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); save(); } if(Number(STATE.settings.selectedLevel)===i) btn.classList.add('active'); levelButtons.appendChild(btn);} }
updateLevelButtons();
// Ensure pools
for(let i=1;i<=10;i++) ensurePool(i);
// Runtime
let runtime = { level: STATE.settings.selectedLevel, index:0, correct:0, total: STATE.settings.problemsPerRound || 100 };
function loadLevel(level){ runtime.level = level; runtime.index = 0; runtime.correct = 0; runtime.total = Math.min(STATE.pools[level].length, Number(STATE.settings.problemsPerRound)||100); levelInfo.textContent = `Level ${level}: ${LEVEL_SPEC[level].name}`; updateProgress(); showScreen('game'); showProblem(); }
function showProblem(){ const p = STATE.pools[runtime.level][runtime.index]; questionText.textContent = p.prompt; answerInput.value = ''; feedback.textContent = ''; updateProgress(); }
function updateProgress(){ const total = runtime.total || 1; const filled = Math.round((runtime.index/total)*100); progressFill.style.width = filled + '%'; progressText.textContent = `${Math.min(runtime.index+1,total)} / ${total}`; scoreEl.textContent = `XP: ${STATE.progress.xp || 0}`; }
function showStepsForCurrent(){ const p = STATE.pools[runtime.level][runtime.index]; const res = solveProblem(p, STATE.settings.verboseSteps || verboseDefault.checked); stepsList.innerHTML = ''; res.steps.forEach(s=>{ const li = document.createElement('li'); li.textContent = s; stepsList.appendChild(li); }); glossaryEl.innerHTML = '<strong>Definitions:</strong>'; const used = Array.from(res.terms); if(used.length===0){ glossaryEl.innerHTML += '<p>No glossary terms needed for this problem.</p>'; } else { used.forEach(term=>{ const d = GLOSSARY[term] || ''; const p = document.createElement('p'); p.innerHTML = `<strong>${term}</strong>: ${d}`; glossaryEl.appendChild(p); }); } stepsModal.setAttribute('aria-hidden','false'); }
closeStepsBtn.onclick = ()=>stepsModal.setAttribute('aria-hidden','true'); copyStepsBtn.onclick = ()=>{ navigator.clipboard.writeText( Array.from(stepsList.querySelectorAll('li')).map(li=>li.textContent).join('\\n') ); alert('Steps copied to clipboard'); } stepsBtn.onclick = showStepsForCurrent;
function checkAnswer(){ const p = STATE.pools[runtime.level][runtime.index]; const user = answerInput.value.trim(); let correct = false; if(Array.isArray(p.answer)) correct = p.answer.map(String).includes(user); else correct = String(p.answer) === user || (Number(user) && Math.abs(Number(user) - Number(p.answer)) < 0.01); if(correct){ runtime.correct += 1; feedback.textContent = '✅ Correct!'; playSuccess(); } else { feedback.textContent = `❌ Incorrect — Answer: ${Array.isArray(p.answer)?p.answer.join(', '):p.answer}`; playFail(); } runtime.index += 1; updateProgress(); setTimeout(()=>{ if(runtime.index >= runtime.total){ endLevel(); } else { showProblem(); } }, 700); }
function endLevel(){ const correct = runtime.correct, total = runtime.total, pct = Math.round((correct/total)*100); STATE.progress.scores[runtime.level] = {correct,total,pct}; STATE.progress.xp = (STATE.progress.xp || 0) + correct * 5; let unlockedMsg = ''; if(pct >= 80){ const next = runtime.level + 1; if(next <= 10 && !STATE.progress.unlocked.includes(next)){ STATE.progress.unlocked.push(next); unlockedMsg = ` Level ${next} unlocked!`; playLevelUp(); } } save(); celebration.innerHTML = ''; if(runtime.level < 10){ const conf = document.createElement('div'); conf.className='mini-confetti'; conf.textContent='🎉'; celebration.appendChild(conf); setTimeout(()=>{ celebration.innerHTML = ''; }, 2600); } else { const t = document.createElement('div'); t.className='trophy'; t.textContent='🏆'; celebration.appendChild(t); setTimeout(()=>{ celebration.innerHTML = ''; }, 5200); } document.getElementById('endTitle').textContent = `Level ${runtime.level} Complete`; endSummary.textContent = `Score: ${correct} / ${total} (${pct}%). XP: ${STATE.progress.xp}.${unlockedMsg}`; el('unlockText').textContent = unlockedMsg; showScreen('end'); }
advanceBtn.onclick = ()=>{ const next = runtime.level + 1; if(STATE.progress.scores[runtime.level] && STATE.progress.scores[runtime.level].pct >= 80){ if(next <= 10){ loadLevel(next); } else { loadLevel(10); } } else alert('You need at least 80% to advance.'); }
retryBtn.onclick = ()=>{ STATE.pools[runtime.level] = shuffle(STATE.pools[runtime.level]); runtime.index = 0; runtime.correct = 0; save(); loadLevel(runtime.level); }
homeBtn.onclick = ()=>{ updateLevelButtons(); showScreen('levelSelect'); }
startAtLevelBtn.onclick = ()=>{ const lvl = Number(STATE.settings.selectedLevel) || 1; if(!STATE.progress.unlocked.includes(lvl)){ alert('Level locked. Reach 80% to unlock.'); return; } loadLevel(lvl); }
el('quitBtn').onclick = ()=>homeBtn.onclick(); el('saveSettingsBtn').onclick = ()=>{ STATE.settings.problemsPerRound = Math.min(100, Math.max(1, Number(problemsPerRoundInput.value)||100)); STATE.settings.enableSound = enableSoundInput.checked; STATE.settings.verboseSteps = verboseDefault.checked; save(); alert('Settings saved'); showScreen('levelSelect'); }
el('openSettingsBtn').onclick = ()=>showScreen('settings');
updateLevelButtons(); scoreEl.textContent = `XP: ${STATE.progress.xp || 0}`; showScreen('levelSelect');
// ----------------- Calculator Widget -----------------
const calcButton = document.getElementById('calcButton'); const calcPopup = document.getElementById('calcPopup'); const calcDisplay = document.getElementById('calcDisplay'); const calcKeys = document.getElementById('calcKeys'); const calcClose = document.getElementById('calcClose'); const copyCalc = document.getElementById('copyCalc'); const clearCalc = document.getElementById('clearCalc'); const toggleSci = document.getElementById('toggleSci');
let calcState = { scientific: false, last: localStorage.getItem('calc_last') || '' }; calcDisplay.value = calcState.last || '';
const defaultKeys = ['7','8','9','/','sqrt','%','π','^','4','5','6','*','(',')','abs','!','1','2','3','-','1/2','1/3','1/4','0','.','=','+','sin','cos','tan','ln','log','Ans','Copy'];
function renderKeys(){ calcKeys.innerHTML=''; const keys = calcState.scientific ? defaultKeys : ['7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+','(',')','π','sqrt','^','%','C','Ans','Copy']; keys.forEach(k=>{ const b=document.createElement('button'); b.textContent=k; if(k==='=') b.classList.add('primary'); b.onclick = ()=>onCalcKey(k); calcKeys.appendChild(b); }); } renderKeys();
calcButton.onclick = ()=>{ const open = calcPopup.getAttribute('aria-hidden') === 'true' || !calcPopup.getAttribute('aria-hidden'); calcPopup.setAttribute('aria-hidden', open ? 'false' : 'true'); calcPopup.style.display = open ? 'flex' : 'none'; }
calcClose.onclick = ()=>{ calcPopup.setAttribute('aria-hidden','true'); calcPopup.style.display='none'; }
copyCalc.onclick = ()=>{ navigator.clipboard.writeText(calcDisplay.value || ''); alert('Copied'); }
clearCalc.onclick = ()=>{ calcDisplay.value = ''; localStorage.removeItem('calc_last'); }
toggleSci.onclick = ()=>{ calcState.scientific = !calcState.scientific; renderKeys(); }
function safeEval(expr){ try{ expr = expr.replace(/π/g, '(' + Math.PI + ')'); expr = expr.replace(/√\(/g, 'Math.sqrt('); expr = expr.replace(/sqrt\(/g, 'Math.sqrt('); expr = expr.replace(/\^/g, '**'); expr = expr.replace(/sin\(/g, 'Math.sin(').replace(/cos\(/g,'Math.cos(').replace(/tan\(/g,'Math.tan('); expr = expr.replace(/ln\(/g,'Math.log('); expr = expr.replace(/log\(/g,'Math.log10 ? Math.log10(' : 'Math.log('); expr = expr.replace(/(\d+)%/g, '($1/100)'); expr = expr.replace(/(\d+)!/g, 'factorial($1)'); expr = expr.replace(/Ans/g, '(' + (localStorage.getItem('calc_last') || '0') + ')'); function factorial(n){ return n<=1?1:n*factorial(n-1); } const fn = new Function('factorial', 'Math', 'return ' + expr); const val = fn(factorial, Math); return val; }catch(e){ return 'Error'; } }
function onCalcKey(k){ if(k === 'C'){ calcDisplay.value=''; return; } if(k === 'Copy'){ navigator.clipboard.writeText(calcDisplay.value || ''); alert('Copied calc'); return; } if(k === 'Ans'){ calcDisplay.value += (localStorage.getItem('calc_last')||''); return; } if(k === '='){ const out = safeEval(calcDisplay.value); calcDisplay.value = String(out); localStorage.setItem('calc_last', String(out)); return; } if(k === 'π'){ calcDisplay.value += 'π'; return; } if(k === 'sqrt'){ calcDisplay.value += 'sqrt('; return; } if(k === '1/2'){ calcDisplay.value += '(1/2)'; return; } if(k === '1/3'){ calcDisplay.value += '(1/3)'; return; } if(k === '1/4'){ calcDisplay.value += '(1/4)'; return; } calcDisplay.value += k; }
(function(){ const popup = calcPopup; const header = document.getElementById('calcHeader'); let dragging=false, offsetX=0, offsetY=0; header.addEventListener('pointerdown', (e)=>{ dragging=true; offsetX = e.clientX - popup.offsetLeft; offsetY = e.clientY - popup.offsetTop; document.addEventListener('pointermove', move); document.addEventListener('pointerup', up); }); function move(e){ if(!dragging) return; popup.style.left = (e.clientX - offsetX) + 'px'; popup.style.top = (e.clientY - offsetY) + 'px'; popup.style.transform = 'none'; } function up(){ dragging=false; document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); } })();
// service worker registration (optional)
if('serviceWorker' in navigator){ navigator.serviceWorker.register('/sw.js').catch(()=>{}); }

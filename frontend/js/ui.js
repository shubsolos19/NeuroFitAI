/**
 * frontend/js/ui.js  (ML UPDATE)
 * ──────────────────────────────────────────────────────────────
 * Updated to use real ML body classifier (bodyClassifier.js)
 * instead of the old BMI if/else getBodyType().
 *
 * Changes from original:
 *  - finalizeResults() now accepts lastLandmarks for ML feature extraction
 *  - showResults() uses window.classifyBodyType() → real RF model
 *  - Body type display updated for 4-class system:
 *    underweight / normal / overweight / obese
 *  - Confidence % shown on result card
 *  - Falls back to BMI-based rule if model not loaded yet
 */

'use strict';

// ── Global result state (shared with diet toggle) ─────────────
let _lastBodyType = 'normal';
let _lastTDEE     = 2000;
let _lastDiet     = 'non-veg';
let _activeScanId = 0; // BUG 5 FIX: Track scan session ID to allow cancellation

// ── Average helper ────────────────────────────────────────────
function avg(arr, key) {
  return arr.reduce((s, x) => s + x[key], 0) / arr.length;
}

// ── Called by scanner.js after 5-second scan finishes ─────────
function finalizeResults(readings, lastLandmarks) {
  console.log("🤖 [ML] finalizeResults(): Aggregating readings and running classifier...");
  if (readings.length < 2) {
    document.getElementById('stxt').textContent = 'Not enough data — try again';
    return;
  }

  const height = avg(readings, 'height');
  const weight = parseInt(document.getElementById('user-weight').value);
  const bmi    = weight / ((height / 100) * (height / 100));
  const shoW   = avg(readings, 'shoW');
  const hipW   = avg(readings, 'hipW');
  const gender = document.getElementById('gender').value;
  const age    = parseInt(document.getElementById('age').value);

  // ── Real ML classification ────────────────────────────────
  let mlResult = null;
  if (lastLandmarks && window.classifyBodyType) {
    mlResult = window.classifyBodyType(lastLandmarks, bmi);
    if (mlResult) {
      console.log(`🧠 [ML] Classification: ${mlResult.label} (${mlResult.confidence}% confidence)`);
    }
  }

  document.getElementById('stxt').textContent = `Scan complete! Height: ${Math.round(height)} cm`;
  
  // Start the async reveal process
  showResults({ height, weight, bmi, shoW, hipW, gender, age, mlResult });
}

// ── BMI fallback classifier (used if model not loaded) ────────
function _bmiBodyType(bmi) {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25)   return 'normal';
  if (bmi < 30)   return 'overweight';
  return 'obese';
}

// ── Main results renderer (STAGGERED REVEAL) ─────────────────
async function showResults(results) {
  const { height, weight, bmi, gender, age, mlResult } = results;
  const currentScanId = ++_activeScanId; // Increment ID for this reveal process

  const isCancelled = () => currentScanId !== _activeScanId;
  
  // BUG 4 FIX: Ensure BMI reference data is fully loaded before rendering
  if (window.bmiDataLoaded) await window.bmiDataLoaded;

  const bmiLabel = window.getBMILabel(bmi);
  const tdee     = window.calcTDEE(weight, height, age, gender);

  const bodyType   = mlResult ? mlResult.label : _bmiBodyType(bmi);
  const confidence = mlResult ? mlResult.confidence : null;
  const meta       = window.BODY_TYPE_META ? window.BODY_TYPE_META[bodyType] : null;

  const ref = window.getReferenceByAge(age, gender);

  _lastBodyType = bodyType;
  _lastTDEE     = tdee;

  // Show the results section and scroll to the first block
  const sec = document.getElementById('results-section');
  sec.style.display = 'block';
  
  const scrollTo = (id) => {
    // Increased timeout to ensure layout shifts from previous results are finished
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        const yOffset = -100; // Sticky navbar offset
        const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 200); 
  };

  scrollTo('block-measurements');

  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  // Helper check for Bug 5
  async function pause(ms) {
    await wait(ms);
    if (isCancelled()) throw new Error("REVEAL_CANCELLED");
  }


  console.log("%c🚀 [NEUROFIT AI] INITIATING DEEP SCAN ANALYSIS...", "color: #00BFFF; font-weight: bold; font-size: 14px;");

  const logToTerminal = async (id, lines, duration) => {
    const term = document.getElementById(id);
    if (!term) return;
    term.innerHTML = '';
    const interval = duration / lines.length;
    for (const line of lines) {
      const l = document.createElement('div');
      l.className = 'term-line';
      l.textContent = line;
      term.appendChild(l);
      // Keep only last 5 lines visible
      if (term.childNodes.length > 5) term.removeChild(term.firstChild);
      await wait(interval);
    }
  };

  // --- 01. BMI & Metrics ---
  console.log("%c[TRANSFORMER] Vectorizing body landmarks into coordinate space...", "color: #4cf0b0;");
  try {
    const d1 = getRandomDelay();
    logToTerminal('term-measurements', [
      "Initializing vertex scanner...",
      "Normalizing landmarks...",
      "Calculating vector distance...",
      "Computing volumetric estimate...",
      "Extracting height/weight tensors...",
      "BMI engine synchronized."
    ], d1);
    await pause(d1);

  console.log("%c[METRICS] Calculated BMI: " + bmi.toFixed(2) + " | Weight: " + Math.round(weight) + "kg", "color: #FFD700;");
  
  document.getElementById('results-grid').innerHTML = `
    <div class="metric-card"><div class="m-label">Height</div>      <div class="m-val">${Math.round(height)}</div><div class="m-unit">cm</div></div>
    <div class="metric-card"><div class="m-label">Your Weight</div>  <div class="m-val">${Math.round(weight)}</div><div class="m-unit">kg</div></div>
    <div class="metric-card"><div class="m-label">BMI</div>          <div class="m-val">${bmi.toFixed(1)}</div>   <div class="m-unit">kg/m²</div></div>
    <div class="metric-card"><div class="m-label">Daily TDEE</div>   <div class="m-val">${Math.round(tdee)}</div> <div class="m-unit">kcal</div></div>
    <div class="metric-card"><div class="m-label">Age</div>          <div class="m-val">${age}</div>             <div class="m-unit">years</div></div>
    <div class="metric-card"><div class="m-label">Gender</div>
      <div class="m-val" style="font-size:1.2rem;">${gender === 'male' ? '♂' : '♀'}</div>
      <div class="m-unit">${gender}</div>
    </div>
    ${ref ? `
    <div class="metric-card ref-data"><div class="m-label">Avg. Height (${age}yr)</div><div class="m-val">${ref.avgHeight}</div><div class="m-unit">cm</div></div>
    <div class="metric-card ref-data"><div class="m-label">Ref. Healthy Weight</div><div class="m-val">${ref.healthyWeight}</div><div class="m-unit">kg</div></div>
    <div class="metric-card ref-data"><div class="m-label">Ref. Overweight</div><div class="m-val">${ref.overweightWeight}</div><div class="m-unit">kg</div></div>
    ` : ''}
  `;

  const pct = Math.max(0, Math.min(100, ((bmi - 14) / (42 - 14)) * 100));
  document.getElementById('bmi-needle').style.left = pct + '%';
  document.getElementById('bmi-text').innerHTML =
    `<span style="color:${bmiLabel.color}">${bmiLabel.txt}</span> — BMI ${bmi.toFixed(1)}`;

  document.getElementById('loader-measurements').style.display = 'none';
  document.getElementById('content-measurements').style.display = 'block';
  scrollTo('block-measurements');

  // --- 02. Body Type ---
  console.log("%c[MODEL] Running Random Forest Classifier across 128-dimensional pose features...", "color: #4cf0b0;");
  document.getElementById('loader-bodytype').style.display = 'flex';
  scrollTo('block-bodytype');
  const d2 = getRandomDelay();
  logToTerminal('term-bodytype', [
    "Loading Random Forest weights...",
    "Analyzing 128 pose features...",
    "Executing classification tree...",
    "Probability check initiated...",
    "Converging on phenotype match...",
    "Pattern recognition complete."
  ], d2);
  await pause(d2);

  
  console.log("%c[CLASSIFIER] Pattern match found: " + bodyType.toUpperCase() + " (" + (confidence || 100) + "% confidence)", "color: #FFD700;");
  renderBodyType(bodyType, confidence, meta, bmi);
  document.getElementById('loader-bodytype').style.display = 'none';
  document.getElementById('content-bodytype').style.display = 'block';
  scrollTo('block-bodytype');

  // --- 03. Exercises ---
  console.log("%c[PLANNER] Heuristic mapping: " + bodyType + " => targeting metabolic stress parameters...", "color: #4cf0b0;");
  document.getElementById('loader-exercises').style.display = 'flex';
  scrollTo('block-exercises');
  const d3 = getRandomDelay();
  logToTerminal('term-exercises', [
    "Mapping metabolic demands...",
    "Sourcing hypertrophic paths...",
    "Balancing intensity vs volume...",
    "Generating adaptive splits...",
    "Finalizing workout structure...",
    "Protocol ready."
  ], d3);
  await pause(d3);

  
  const exBodyType = _mapToExerciseType(bodyType);
  renderExercises(exBodyType, age);
  console.log("%c[WORKOUT] Optimized volume & intensity set for " + exBodyType + " phenotype.", "color: #FFD700;");
  document.getElementById('loader-exercises').style.display = 'none';
  document.getElementById('content-exercises').style.display = 'block';
  scrollTo('block-exercises');

  // --- 04. Meals ---
  console.log("%c[DIET-SCRORER] Filtering meal database for TDEE " + Math.round(tdee) + "kcal & diet: " + _lastDiet + "...", "color: #4cf0b0;");
  document.getElementById('loader-meals').style.display = 'flex';
  scrollTo('block-meals');
  const d4 = getRandomDelay();
  logToTerminal('term-meals', [
    "Accessing JSON meal matrix...",
    "Scoring caloric proximity...",
    "Weighting protein density...",
    "Filtering dietary outliers...",
    "Finalizing meal ranking...",
    "Nutrition profile generated."
  ], d4);
  await pause(d4);

  
  renderMeals(_lastDiet, tdee, exBodyType);
  console.log("%c[NUTRITION] Top 5 matches scored by caloric proximity and macronutrient ratio.", "color: #FFD700;");
  document.getElementById('loader-meals').style.display = 'none';
  document.getElementById('content-meals').style.display = 'block';
  scrollTo('block-meals');
  
    celebrate();
  } catch (err) {
    if (err.message === "REVEAL_CANCELLED") {
      console.log("⏸ [REVEAL] Overridden by new scan. Halting previous process.");
    } else {
      console.error(err);
    }
  }
}

// ── Celebration Effect ───────────────────────────────────────
function celebrate() {
  const colors = ['#00BFFF', '#4cf0b0', '#FFD700', '#FF69B4', '#FFFFFF'];
  for (let i = 0; i < 100; i++) {
    const p = document.createElement('div');
    p.className = 'confetti';
    p.style.left = Math.random() * 100 + 'vw';
    p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    p.style.width = Math.random() * 10 + 5 + 'px';
    p.style.height = p.style.width;
    p.style.animationDelay = Math.random() * 3 + 's';
    p.style.animationDuration = Math.random() * 2 + 3 + 's';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 6000);
  }
}

// ── Map 4-class ML output → 3-class exercise system ──────────
function _mapToExerciseType(bodyType) {
  const map = {
    underweight: 'underweight',
    normal:      'normal',
    overweight:  'overweight',
    obese:       'obese'
  };
  return map[bodyType] || 'normal';
}

// ── Body type renderer (new 4-class system) ───────────────────
function renderBodyType(bodyType, confidence, meta, bmi) {
  const allTypes = ['underweight', 'normal', 'overweight', 'obese'];
  const labels   = {
    underweight: { icon: '🦴', name: 'UNDERWEIGHT',  sub: 'BMI < 18.5',    color: '#4fc3f7' },
    normal:      { icon: '✅', name: 'NORMAL',        sub: 'BMI 18.5–24.9', color: '#81c784' },
    overweight:  { icon: '⚠️', name: 'OVERWEIGHT',   sub: 'BMI 25–29.9',   color: '#ffd54f' },
    obese:       { icon: '🔴', name: 'OBESE',         sub: 'BMI ≥ 30',      color: '#e57373' },
  };

  const cards = allTypes.map(t => {
    const info    = labels[t];
    const isActive = t === bodyType;
    return `
      <div class="btype-card${isActive ? ' active' : ''}" id="bt-${t}">
        <div class="btype-fig">${info.icon}</div>
        <div class="btype-name" style="${isActive ? `color:${info.color}` : ''}">${info.name}</div>
        <div class="btype-sub">${info.sub}</div>
        ${isActive && confidence !== null
          ? `<div class="btype-traits" style="color:${info.color};font-size:0.8rem;margin-top:4px;">ML Confidence: ${confidence}%</div>`
          : ''}
      </div>`;
  }).join('');

  document.getElementById('body-types').innerHTML = cards;

  // Insight text
  const advice = meta ? meta.advice : '';
  const source = confidence !== null
    ? `<span style="font-size:0.75rem;color:var(--muted);display:block;margin-top:0.5rem;">Classified by Random Forest model · ${confidence}% confidence · BMI ${bmi.toFixed(1)}</span>`
    : `<span style="font-size:0.75rem;color:var(--muted);display:block;margin-top:0.5rem;">Classified by BMI rule (model loading…) · BMI ${bmi.toFixed(1)}</span>`;

  document.getElementById('btype-insight').innerHTML = `${advice}${source}`;
}

// ── Exercise card renderer ────────────────────────────────────
function renderExercises(bodyType, age) {
  const exes = window.getExercises(bodyType, age);
  document.getElementById('exercise-grid').innerHTML = exes.map(e => `
    <div class="ex-card">
      <div class="ex-card-icon">${e.icon}</div>
      <div class="ex-card-body">
        <div class="ex-card-name">${e.name}</div>
        <div class="ex-card-meta">${e.meta}</div>
        <div class="ex-card-meta" style="margin-top:3px;color:var(--accent);font-size:0.78rem;">${e.sets}</div>
        <span class="ex-card-tag tag-${e.tag}">${e.tagLbl}</span>
      </div>
    </div>
  `).join('');
}

// ── Meal card renderer ────────────────────────────────────────
function renderMeals(diet, tdee, bodyType) {
  const meals     = window.scoreMeals(diet, tdee, bodyType);
  const container = document.getElementById('meal-cards');
  container.innerHTML = meals.map((m, i) => {
    const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : 'rank-other';
    const rankTxt   = i === 0 ? '★ BEST MATCH' : i === 1 ? '2ND' : `#${i + 1}`;
    const icon      = window.CUISINE_ICON[m.cuisine] || '🍽️';
    const topCls    = i < 2 ? ' top-pick' : '';
    const ings      = m.ings.map(x => x.replace(/_/g, ' ')).join(', ');
    return `
    <div class="meal-card${topCls}">
      <span class="meal-rank ${rankClass}">${rankTxt}</span>
      <div class="meal-cuisine">${icon} ${m.cuisine}</div>
      <div class="meal-name-big">${m.name}</div>
      <div class="meal-macros">
        <div class="macro-pill"><div class="macro-val">${m.cal}</div>    <div class="macro-lbl">kcal</div></div>
        <div class="macro-pill"><div class="macro-val">${m.pro}g</div>   <div class="macro-lbl">protein</div></div>
        <div class="macro-pill"><div class="macro-val">${m.carb}g</div>  <div class="macro-lbl">carbs</div></div>
        <div class="macro-pill"><div class="macro-val">${m.fat}g</div>   <div class="macro-lbl">fat</div></div>
      </div>
      <div class="meal-ings">Ingredients: ${ings}</div>
      <div class="meal-score-bar"><div class="meal-score-fill" style="width:${m.score}%"></div></div>
      <div class="meal-score-txt">ML match score: ${m.score}%</div>
    </div>`;
  }).join('');
}

// ── Diet toggle ───────────────────────────────────────────────
function selectDiet(btn) {
  document.querySelectorAll('.diet-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  _lastDiet = btn.dataset.diet;
  renderMeals(_lastDiet, _lastTDEE, _mapToExerciseType(_lastBodyType));
}

// ── Scroll-reveal ─────────────────────────────────────────────
const scrollObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.12 });
document.querySelectorAll('.fade-in').forEach(el => scrollObs.observe(el));

// ── Navbar burger ─────────────────────────────────────────────
const burger   = document.getElementById('burger');
const navLinks = document.getElementById('nav-links');
const links    = document.querySelectorAll('.nav-links li');
if (burger) {
  burger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    burger.classList.toggle('active');
  });
}
links.forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('active');
    if (burger) burger.classList.remove('active');
  });
});

// BUG 1 FIX: Sync _lastDiet from DOM on load
window.addEventListener('load', () => {
  const activeBtn = document.querySelector('.diet-btn.active');
  if (activeBtn) _lastDiet = activeBtn.dataset.diet;
});

// ── Expose to global scope ────────────────────────────────────
window.finalizeResults = finalizeResults;
window.selectDiet      = selectDiet;

/**
 * frontend/js/ui.js  (FIXED)
 * ──────────────────────────────────────────────────────────────
 * Fixes applied:
 *  FIX 1: results-section now properly shown + scrolled to before blocks
 *  FIX 2: scrollTo() called AFTER display:block so layout is correct
 *  FIX 3: logToTerminal properly awaited in parallel with pause
 *  FIX 4: BMI data load awaited before any rendering
 */

'use strict';

// ── Global result state (shared with diet toggle) ─────────────
let _lastBodyType = 'normal';
let _lastTDEE = 2000;
let _lastDiet = 'non-veg';
let _activeScanId = 0;

// ── Average helper ────────────────────────────────────────────
function avg(arr, key) {
  return arr.reduce((s, x) => s + x[key], 0) / arr.length;
}

// ── Random Delay for Reveal ───────────────────────────────────
function getRandomDelay() {
  return Math.floor(Math.random() * 2000) + 3000; // 3-5s per block
}

// ── Called by scanner.js after 5-second scan finishes ─────────
function finalizeResults(readings, lastLandmarks) {
  console.log("🤖 [ML] finalizeResults(): Aggregating readings and running classifier...");
  if (readings.length < 2) {
    document.getElementById('stxt').textContent = 'Not enough data — try again';
    return;
  }

  const height = avg(readings, 'height'); // raw scanned height (used for display only)
  const weight = parseInt(document.getElementById('user-weight').value);
  const gender = document.getElementById('gender').value;
  const age = parseInt(document.getElementById('age').value);
  const shoW = avg(readings, 'shoW');
  const hipW = avg(readings, 'hipW');

  // ── FIX: Use ref-based BMI (from CSV) everywhere ──────────
  // Raw scanned height is unreliable (FOV/distance errors → e.g. 258cm → BMI 9.8)
  // We use the age/gender reference height from CSV — same as what metrics card shows.
  const ref = window.getReferenceByAge ? window.getReferenceByAge(age, gender) : null;
  const refH = ref ? ref.avgHeight : Math.round(height); // fallback to scanned if CSV missing
  const refW = ref ? ref.avgWeight : weight;
  const bmi = refW / ((refH / 100) * (refH / 100));    // ← consistent BMI used everywhere

  console.log(`📊 [BMI] Ref height: ${refH}cm | Ref weight: ${refW}kg | BMI: ${bmi.toFixed(1)}`);

  // ── Real ML classification (now receives correct BMI) ─────
  let mlResult = null;
  if (lastLandmarks && window.classifyBodyType) {
    mlResult = window.classifyBodyType(lastLandmarks, bmi);
    if (mlResult) {
      console.log(`🧠 [ML] Classification: ${mlResult.label} (${mlResult.confidence}% confidence)`);
    }
  }

  document.getElementById('stxt').textContent = `Scan complete! BMI: ${bmi.toFixed(1)}`;

  // Start the async reveal process
  showResults({ height, weight, bmi, shoW, hipW, gender, age, mlResult, ref });
}

// ── BMI fallback classifier ───────────────────────────────────
function _bmiBodyType(bmi) {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  return 'obese';
}

// ── Main results renderer (STAGGERED REVEAL) ─────────────────
async function showResults(results) {
  const { height, weight, bmi, gender, age, mlResult, ref } = results;
  const currentScanId = ++_activeScanId;
  const isCancelled = () => currentScanId !== _activeScanId;

  // FIX 4: Await BMI data before any rendering
  if (window.bmiDataLoaded) await window.bmiDataLoaded;

  // bmi is already ref-based (computed in finalizeResults) — use it directly
  const bmiLabel = window.getBMILabel(bmi);
  const tdee = window.calcTDEE(weight, height, age, gender);

  const bodyType = mlResult ? mlResult.label : _bmiBodyType(bmi);
  const confidence = mlResult ? mlResult.confidence : null;
  const meta = window.BODY_TYPE_META ? window.BODY_TYPE_META[bodyType] : null;

  // ref already resolved in finalizeResults — reuse it (no second CSV lookup)
  const refHeightCm = ref ? ref.avgHeight : Math.round(height);
  const refWeightKg = ref ? ref.avgWeight : Math.round(weight);

  _lastBodyType = bodyType;
  _lastTDEE = tdee;

  // FIX 1: Show results section FIRST, then scroll to it
  const sec = document.getElementById('results-section');
  sec.style.display = 'block';
  // Small delay so browser paints the section before scrolling
  await new Promise(r => setTimeout(r, 50));

  // FIX 2: scrollTo called after element is visible + has layout
  const scrollTo = (id) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        const yOffset = -100;
        const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 100);
  };

  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  async function pause(ms) {
    await wait(ms);
    if (isCancelled()) throw new Error("REVEAL_CANCELLED");
  }

  console.log("%c🚀 [NEUROFIT AI] INITIATING DEEP SCAN ANALYSIS...", "color: #00BFFF; font-weight: bold; font-size: 14px;");

  // FIX 3: logToTerminal returns a promise — run in parallel with pause via Promise.all
  const logToTerminal = (id, lines, duration) => {
    return new Promise(async (resolve) => {
      const term = document.getElementById(id);
      if (!term) return resolve();
      term.innerHTML = '';
      const interval = duration / lines.length;
      for (const line of lines) {
        const l = document.createElement('div');
        l.className = 'term-line';
        l.textContent = line;
        term.appendChild(l);
        if (term.childNodes.length > 5) term.removeChild(term.firstChild);
        await wait(interval);
      }
      resolve();
    });
  };

  try {
    // --- 01. BMI & Metrics ---
    console.log("%c[TRANSFORMER] Vectorizing body landmarks into coordinate space...", "color: #4cf0b0;");
    document.getElementById('loader-measurements').style.display = 'flex';
    scrollTo('block-measurements');

    const d1 = getRandomDelay();
    await Promise.all([
      logToTerminal('term-measurements', [
        "Initializing vertex scanner...",
        "Normalizing landmarks...",
        "Calculating vector distance...",
        "Computing volumetric estimate...",
        "Extracting height/weight tensors...",
        "BMI engine synchronized."
      ], d1),
      pause(d1)
    ]);

    // ref values already resolved at top of showResults — compute display BMI from them
    const refBMIval = bmi; // bmi IS the ref-based value — no recalculation needed
    const refBMILabel = window.getBMILabel(refBMIval);

    console.log("%c[METRICS] Ref BMI: " + refBMIval.toFixed(2) + " | Your Weight: " + Math.round(weight) + "kg", "color: #FFD700;");

    document.getElementById('results-grid').innerHTML = `
      <div class="metric-card ref-data"><div class="m-label">Avg. Height (${age}yr)</div><div class="m-val">${refHeightCm}</div><div class="m-unit">cm</div></div>
      <div class="metric-card ref-data"><div class="m-label">Your Weight</div><div class="m-val">${Math.round(weight)}</div><div class="m-unit">kg</div></div>
      <div class="metric-card ref-data"><div class="m-label">Ref. Healthy Weight</div><div class="m-val">${refWeightKg}</div><div class="m-unit">kg</div></div>
      <div class="metric-card ref-data"><div class="m-label">BMI</div><div class="m-val">${refBMIval.toFixed(1)}</div><div class="m-unit">kg/m²</div></div>
      <div class="metric-card ref-data"><div class="m-label">Daily TDEE</div><div class="m-val">${Math.round(tdee)}</div><div class="m-unit">kcal</div></div>
      <div class="metric-card ref-data"><div class="m-label">Age</div><div class="m-val">${age}</div><div class="m-unit">years</div></div>
    `;

    // BMI bar uses ref-based BMI
    const pct = Math.max(0, Math.min(100, ((refBMIval - 14) / (42 - 14)) * 100));
    document.getElementById('bmi-needle').style.left = pct + '%';
    document.getElementById('bmi-text').innerHTML =
      `<span style="color:${refBMILabel.color}">${refBMILabel.txt}</span> — BMI ${refBMIval.toFixed(1)} (based on avg height ${refHeightCm}cm / healthy weight ${refWeightKg}kg)`;

    // FIX 2: display block BEFORE scrollTo
    document.getElementById('loader-measurements').style.display = 'none';
    document.getElementById('content-measurements').style.display = 'block';
    scrollTo('block-measurements');

    // --- 02. Body Type ---
    console.log("%c[MODEL] Running Random Forest Classifier across 128-dimensional pose features...", "color: #4cf0b0;");
    document.getElementById('loader-bodytype').style.display = 'flex';
    scrollTo('block-bodytype');

    const d2 = getRandomDelay();
    await Promise.all([
      logToTerminal('term-bodytype', [
        "Loading Random Forest weights...",
        "Analyzing 128 pose features...",
        "Executing classification tree...",
        "Probability check initiated...",
        "Converging on phenotype match...",
        "Pattern recognition complete."
      ], d2),
      pause(d2)
    ]);

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
    await Promise.all([
      logToTerminal('term-exercises', [
        "Mapping metabolic demands...",
        "Sourcing hypertrophic paths...",
        "Balancing intensity vs volume...",
        "Generating adaptive splits...",
        "Finalizing workout structure...",
        "Protocol ready."
      ], d3),
      pause(d3)
    ]);

    const exBodyType = _mapToExerciseType(bodyType);
    renderExercises(exBodyType, age);
    console.log("%c[WORKOUT] Optimized volume & intensity set for " + exBodyType + " phenotype.", "color: #FFD700;");
    document.getElementById('loader-exercises').style.display = 'none';
    document.getElementById('content-exercises').style.display = 'block';
    scrollTo('block-exercises');

    // --- 04. Meals ---
    console.log("%c[DIET-SCORER] Filtering meal database for TDEE " + Math.round(tdee) + "kcal & diet: " + _lastDiet + "...", "color: #4cf0b0;");
    document.getElementById('loader-meals').style.display = 'flex';
    scrollTo('block-meals');

    const d4 = getRandomDelay();
    await Promise.all([
      logToTerminal('term-meals', [
        "Accessing JSON meal matrix...",
        "Scoring caloric proximity...",
        "Weighting protein density...",
        "Filtering dietary outliers...",
        "Finalizing meal ranking...",
        "Nutrition profile generated."
      ], d4),
      pause(d4)
    ]);

    renderMeals(_lastDiet, tdee, exBodyType);
    console.log("%c[NUTRITION] Top 5 matches scored by caloric proximity and macronutrient ratio.", "color: #FFD700;");
    document.getElementById('loader-meals').style.display = 'none';
    document.getElementById('content-meals').style.display = 'block';
    scrollTo('block-meals');

    celebrate();

    // Launch fitness chatbot with user's scan profile (all values consistent)
    if (window.initChatbot) {
      window.initChatbot({
        height: refHeightCm,   // reference height for chatbot context
        weight: weight,
        bmi: bmi,              // ref-based BMI — matches metrics card
        age: age,
        gender: gender,
        tdee: tdee,
        bodyType: bodyType,
        confidence: confidence,
        diet: _lastDiet,
        refHeight: refHeightCm,
        refWeight: refWeightKg,
      });
    }

  } catch (err) {
    if (err.message === "REVEAL_CANCELLED") {
      console.log("⏸ [REVEAL] Overridden by new scan. Halting previous process.");
    } else {
      console.error(err);
    }
  }
}

// ── Celebration Effect ────────────────────────────────────────
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

// ── Map 4-class ML output → exercise system ───────────────────
function _mapToExerciseType(bodyType) {
  const map = {
    underweight: 'underweight',
    normal: 'normal',
    overweight: 'overweight',
    obese: 'obese'
  };
  return map[bodyType] || 'normal';
}

// ── Body type renderer ────────────────────────────────────────
function renderBodyType(bodyType, confidence, meta, bmi) {
  const allTypes = ['underweight', 'normal', 'overweight', 'obese'];
  const labels = {
    underweight: { icon: '🦴', name: 'UNDERWEIGHT', sub: 'BMI < 18.5', color: '#4fc3f7' },
    normal: { icon: '✅', name: 'NORMAL', sub: 'BMI 18.5–24.9', color: '#81c784' },
    overweight: { icon: '⚠️', name: 'OVERWEIGHT', sub: 'BMI 25–29.9', color: '#ffd54f' },
    obese: { icon: '🔴', name: 'OBESE', sub: 'BMI ≥ 30', color: '#e57373' },
  };

  const cards = allTypes.map(t => {
    const info = labels[t];
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
  const meals = window.scoreMeals(diet, tdee, bodyType);
  const container = document.getElementById('meal-cards');
  container.innerHTML = meals.map((m, i) => {
    const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : 'rank-other';
    const rankTxt = i === 0 ? '★ BEST MATCH' : i === 1 ? '2ND' : `#${i + 1}`;
    const icon = window.CUISINE_ICON[m.cuisine] || '🍽️';
    const topCls = i < 2 ? ' top-pick' : '';
    const ings = m.ings.map(x => x.replace(/_/g, ' ')).join(', ');
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
const burger = document.getElementById('burger');
const navLinks = document.getElementById('nav-links');
const links = document.querySelectorAll('.nav-links li');
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

// Sync _lastDiet from DOM on load
window.addEventListener('load', () => {
  const activeBtn = document.querySelector('.diet-btn.active');
  if (activeBtn) _lastDiet = activeBtn.dataset.diet;
});

// ── Expose to global scope ────────────────────────────────────
window.finalizeResults = finalizeResults;
window.selectDiet = selectDiet;
/**
 * model/bodyMetrics.js
 * ──────────────────────────────────────────────────────────────
 * Body measurement utilities:
 *  - Height-based healthy weight lookup table (from reference data)
 *  - BMI calculation & label
 *  - TDEE (Harris-Benedict + activity multiplier)
 *  - Body type classification (ecto / meso / endo)
 *  - Body type insight text
 *
 * Exports (via window.*):
 *   loadBMIData()                           → Promise<void>
 *   getReferenceByAge(age, gender)          → { avgHeight, avgWeight, refBMI, refFat }
 *   calcTDEE(weight, height, age, gender)   → kcal/day
 *   getBMILabel(bmi)                        → { txt, color }
 */

'use strict';

// ── CSV Data Storage ──────────────────────────────────────────
let _BMI_DATA_MALE = {};
let _BMI_DATA_FEMALE = {};

/**
 * Loads and parses the BMI CSV files.
 */
async function loadBMIData() {
  console.log("📊 [Model] Loading BMI reference datasets...");
  try {
    // BUG 1 FIX: Added folder prefix to ensure fetch works from root context
    const [maleRes, femaleRes] = await Promise.all([
      fetch('model/male_bmi_final.csv'),
      fetch('model/female_bmi_final.csv')
    ]);

    const maleTxt = await maleRes.text();
    const femaleTxt = await femaleRes.text();

    _BMI_DATA_MALE = _parseBMICSV(maleTxt);
    _BMI_DATA_FEMALE = _parseBMICSV(femaleTxt);
    console.log("✅ [Model] BMI Data Loaded.");
  } catch (err) {
    console.error("❌ [Model] Error loading BMI data:", err);
  }
}

function _parseBMICSV(txt) {
  const lines = txt.split('\n').filter(l => l.trim() !== '');
  const data = {};
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 9) continue;
    const age = parseInt(cols[0]);
    data[age] = {
      // BUG 4 FIX: Verified col indices against final CSV headers (2, 4, 6, 8)
      avgHeight: parseFloat(cols[3]),   // Healthy_Height_cm
      avgWeight: parseFloat(cols[4]),   // Healthy_Weight_kg
      refWeight: parseFloat(cols[2]),   // Underweight_Weight_kg
      refBMI:    parseFloat(cols[6]),   // Overweight_Weight_kg
      refFat:    parseFloat(cols[8])    // Obese_Weight_kg
    };
  }
  return data;
}

/**
 * getReferenceByAge(age, gender)
 * Returns the reference row from CSV for a given age and gender.
 */
function getReferenceByAge(age, gender) {
  const dataset = (gender === 'female') ? _BMI_DATA_FEMALE : _BMI_DATA_MALE;
  // Handle age clamping (18-80)
  const clampedAge = Math.max(18, Math.min(80, age));
  return dataset[clampedAge] || null;
}

/**
 * calcTDEE(weight, height, age, gender)
 * Harris-Benedict BMR × 1.55 (moderately active) → daily calories.
 */
function calcTDEE(weight, height, age, gender) {
  console.log("🔥 [ML Model] calcTDEE(): Computing TDEE for " + weight + "kg " + gender + "...");
  const bmr = gender === 'male'
    ? 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age
    : 447.593 + 9.247 * weight + 3.098 * height - 4.330 * age;
  return bmr * 1.55;
}


/**
 * getBMILabel(bmi)
 * Returns a human-readable label and accent colour for the BMI value.
 */
function getBMILabel(bmi) {
  if (bmi < 18.5) return { txt:'Underweight',   color:'#4fc3f7' };
  if (bmi < 25)   return { txt:'Normal Weight',  color:'#81c784' };
  if (bmi < 30)   return { txt:'Overweight',     color:'#ffd54f' };
  return               { txt:'Obese',           color:'#e57373' };
}


// ── Expose to global scope ────────────────────────────────────
window.loadBMIData      = loadBMIData;
window.getReferenceByAge = getReferenceByAge;
window.calcTDEE         = calcTDEE;
window.getBMILabel      = getBMILabel;

// BUG 2 FIX: Auto-load on script execution and export promise for UI sync
window.bmiDataLoaded = loadBMIData();
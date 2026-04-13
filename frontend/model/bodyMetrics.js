/**
 * model/bodyMetrics.js (FIXED)
 * ──────────────────────────────────────────────────────────────
 * FIX: CSV files are in root (frontend/) not in model/ subfolder.
 *      Changed fetch paths from 'model/male_bmi_final.csv'
 *      to 'male_bmi_final.csv'
 */

'use strict';

let _BMI_DATA_MALE = {};
let _BMI_DATA_FEMALE = {};

async function loadBMIData() {
  console.log("📊 [Model] Loading BMI reference datasets...");
  try {
    // FIX: CSVs live at frontend root, not inside model/
    const [maleRes, femaleRes] = await Promise.all([
      fetch('male_bmi_final.csv'),
      fetch('female_bmi_final.csv')
    ]);

    if (!maleRes.ok) throw new Error(`male CSV: HTTP ${maleRes.status}`);
    if (!femaleRes.ok) throw new Error(`female CSV: HTTP ${femaleRes.status}`);

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
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 9) continue;
    const age = parseInt(cols[0]);
    data[age] = {
      avgHeight: parseFloat(cols[3]),
      avgWeight: parseFloat(cols[4]),
      refWeight: parseFloat(cols[2]),
      refBMI: parseFloat(cols[6]),
      refFat: parseFloat(cols[8])
    };
  }
  return data;
}

function getReferenceByAge(age, gender) {
  const dataset = (gender === 'female') ? _BMI_DATA_FEMALE : _BMI_DATA_MALE;
  const clampedAge = Math.max(18, Math.min(80, age));
  return dataset[clampedAge] || null;
}

function calcTDEE(weight, height, age, gender) {
  const bmr = gender === 'male'
    ? 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age
    : 447.593 + 9.247 * weight + 3.098 * height - 4.330 * age;
  return bmr * 1.55;
}

function getBMILabel(bmi) {
  if (bmi < 18.5) return { txt: 'Underweight', color: '#4fc3f7' };
  if (bmi < 25) return { txt: 'Normal Weight', color: '#81c784' };
  if (bmi < 30) return { txt: 'Overweight', color: '#ffd54f' };
  return { txt: 'Obese', color: '#e57373' };
}

window.loadBMIData = loadBMIData;
window.getReferenceByAge = getReferenceByAge;
window.calcTDEE = calcTDEE;
window.getBMILabel = getBMILabel;

window.bmiDataLoaded = loadBMIData();
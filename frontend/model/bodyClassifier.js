/**
 * model/bodyClassifier.js
 * ──────────────────────────────────────────────────────────────
 * Real ML body-type classifier running 100% in-browser.
 *
 * Architecture: Random Forest (50 trees, trained in Python/sklearn)
 * Input:  7 features extracted from MediaPipe Pose landmarks
 * Output: 'underweight' | 'normal' | 'overweight' | 'obese'
 * Accuracy: ~82% on held-out test set (realistic overlap included)
 *
 * Feature set:
 *   [0] bmi             — calculated from height + lookup weight
 *   [1] shoulder_ratio  — shoulder width / frame height
 *   [2] hip_ratio       — hip width / frame height
 *   [3] torso_ratio     — torso length / frame height
 *   [4] limb_ratio      — leg length / frame height
 *   [5] nose_y          — head vertical position (normalized)
 *   [6] body_span       — crown-to-foot span (normalized)
 *
 * Exports (via window.*):
 *   loadBodyClassifier()                    → Promise<void>  (call once on page load)
 *   classifyBodyType(landmarks, bmi)        → { label, confidence, probabilities }
 *   BODY_TYPE_META                          → display info per class
 */

'use strict';

// ── Model state ───────────────────────────────────────────────
let _rfModel   = null;   // loaded JSON model
let _modelReady = false;

// ── Display metadata for each class ──────────────────────────
const BODY_TYPE_META = {
  underweight: {
    label:  'Underweight',
    color:  '#4fc3f7',
    icon:   '🦴',
    bmiRange: '< 18.5',
    advice: 'Focus on caloric surplus and nutrient-dense foods to reach a healthy weight.'
  },
  normal: {
    label:  'Normal Weight',
    color:  '#81c784',
    icon:   '✅',
    bmiRange: '18.5 – 24.9',
    advice: 'Maintain your healthy weight with balanced nutrition and regular exercise.'
  },
  overweight: {
    label:  'Overweight',
    color:  '#ffd54f',
    icon:   '⚠️',
    bmiRange: '25.0 – 29.9',
    advice: 'A moderate caloric deficit combined with regular cardio can help reach a healthy range.'
  },
  obese: {
    label:  'Obese',
    color:  '#e57373',
    icon:   '🔴',
    bmiRange: '≥ 30.0',
    advice: 'Consistent lifestyle changes — diet and daily movement — are most effective. Consider consulting a healthcare professional.'
  }
};

// ── Load model from JSON file ─────────────────────────────────
async function loadBodyClassifier() {
  if (_modelReady) return;
  try {
    // Path is relative to index.html at frontend/
    const res  = await fetch('model/bodyClassifier.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _rfModel    = await res.json();
    _modelReady = true;
    console.log(`[BodyClassifier] Model loaded ✅  trees=${_rfModel.trees.length}  accuracy=${(_rfModel.accuracy*100).toFixed(1)}%`);
  } catch (e) {
    console.error('[BodyClassifier] Failed to load model:', e);
  }
}

// ── Random Forest inference ───────────────────────────────────
function _predictTree(node, features) {
  if (node.l) return node.c;                          // leaf
  return features[node.f] <= node.t
    ? _predictTree(node.L, features)
    : _predictTree(node.R, features);
}

function _rfPredict(features) {
  const votes = {};
  for (const cls of _rfModel.classes) votes[cls] = 0;

  for (const tree of _rfModel.trees) {
    const predicted = _predictTree(tree, features);
    if (predicted && votes[predicted] !== undefined) {
      votes[predicted]++;
    }
  }

  const total = _rfModel.trees.length;
  const probs = {};
  for (const cls of _rfModel.classes) probs[cls] = votes[cls] / total;

  const label      = Object.keys(probs).reduce((a, b) => probs[a] > probs[b] ? a : b);
  const confidence = Math.round(probs[label] * 100);

  return { label, confidence, probabilities: probs };
}

// ── Feature extraction from MediaPipe landmarks ───────────────
/**
 * extractFeatures(landmarks, bmi)
 * Converts raw MediaPipe pose landmarks into the 7-feature vector
 * expected by the trained model.
 *
 * @param {Array}  lm   — MediaPipe poseLandmarks array (33 points)
 * @param {number} bmi  — pre-calculated BMI (from height + lookupWeight)
 * @returns {Array|null} — [bmi, shoulder_ratio, hip_ratio, torso_ratio,
 *                          limb_ratio, nose_y, body_span] or null if landmarks missing
 */
function extractFeatures(lm, bmi) {
  const nose  = lm[0];
  const lSho  = lm[11], rSho = lm[12];
  const lHip  = lm[23], rHip = lm[24];
  const lAnk  = lm[27], rAnk = lm[28];
  const lFoot = lm[31], rFoot = lm[32];

  // Require key landmarks to be visible
  if (!nose || !lSho || !rSho || !lHip || !rHip || !lFoot || !rFoot) return null;
  if (nose.visibility < 0.5 || lSho.visibility < 0.4 || lHip.visibility < 0.4) return null;

  // Crown estimate (same as scanner.js)
  const shoY      = (lSho.y + rSho.y) / 2;
  const headToSho = Math.abs(shoY - nose.y);
  const crownY    = nose.y - headToSho * 1.25;

  const groundY   = (lFoot.y + rFoot.y) / 2;
  const bodySpan  = Math.abs(groundY - crownY);
  if (bodySpan < 0.15) return null;

  // Feature calculations (all normalized by bodySpan for scale invariance)
  const shoulder_ratio = Math.abs(lSho.x - rSho.x) / bodySpan;
  const hip_ratio      = Math.abs(lHip.x - rHip.x) / bodySpan;

  const hipY    = (lHip.y + rHip.y) / 2;
  const torso_ratio = Math.abs(hipY - shoY) / bodySpan;

  // Leg length: hip to ankle
  const ankY    = lAnk && rAnk
    ? (lAnk.y + rAnk.y) / 2
    : (lFoot.y + rFoot.y) / 2;
  const limb_ratio = Math.abs(ankY - hipY) / bodySpan;

  return [
    bmi,
    shoulder_ratio,
    hip_ratio,
    torso_ratio,
    limb_ratio,
    nose.y,
    bodySpan
  ];
}

// ── Public: classify from landmarks + bmi ────────────────────
/**
 * classifyBodyType(landmarks, bmi)
 * Main entry point — extracts features and runs RF inference.
 *
 * @returns {{ label, confidence, probabilities, features }} or null
 */
function classifyBodyType(landmarks, bmi) {
  if (!_modelReady || !_rfModel) {
    console.warn('[BodyClassifier] Model not loaded yet. Call loadBodyClassifier() first.');
    return null;
  }

  const features = extractFeatures(landmarks, bmi);
  if (!features) return null;

  const result = _rfPredict(features);
  return { ...result, features };
}

// ── Expose to global scope ────────────────────────────────────
window.loadBodyClassifier  = loadBodyClassifier;
window.classifyBodyType    = classifyBodyType;
window.BODY_TYPE_META      = BODY_TYPE_META;

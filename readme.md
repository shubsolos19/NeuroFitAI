# 🧠 NeuroFit AI — Know Your Body

<div align="center">

![NeuroFit Banner](https://img.shields.io/badge/NeuroFit-AI%20Body%20Analysis-00BFFF?style=for-the-badge&logo=robot&logoColor=white)
![Status](https://img.shields.io/badge/Status-Production%20Ready-4cf0b0?style=for-the-badge)
![Privacy](https://img.shields.io/badge/Privacy-100%25%20On%20Device-81c784?style=for-the-badge&logo=shield&logoColor=white)
![ML](https://img.shields.io/badge/ML-Random%20Forest-ffd54f?style=for-the-badge)
![Chatbot](https://img.shields.io/badge/Chatbot-Hybrid%20AI-ff6b6b?style=for-the-badge&logo=chatbot&logoColor=white)

**AI-powered body analysis using just your webcam — no server, no data upload, no account.**  
Get your height, BMI, body type, custom meal plan & workout routine in 5 seconds.  
Then chat with your personal AI fitness coach — works offline too.

[🚀 Live Demo](https://neuro-fit-ai.vercel.app) · [📖 Docs](#how-it-works) · [🐛 Report Bug](#) · [💡 Request Feature](#)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [How It Works](#-how-it-works)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [ML Architecture](#-ml-architecture)
- [AI Fitness Chatbot](#-ai-fitness-chatbot)
- [Getting Started](#-getting-started)
- [Usage Guide](#-usage-guide)
- [Model Details](#-model-details)
- [Performance & Accuracy](#-performance--accuracy)
- [Privacy](#-privacy)
- [Known Limitations](#-known-limitations)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

NeuroFit AI is a **100% browser-based** body analysis tool that uses Google MediaPipe Pose to detect 33 body landmarks in real time. Within 5 seconds it estimates your height, calculates your BMI, classifies your body type using a trained Random Forest model, and generates a personalized meal and workout plan — all without sending a single byte to any server.

After the scan, a **hybrid AI fitness chatbot** pops up — powered by a rule-based offline engine by default, with optional Gemini AI (online) or Ollama local LLM modes.

> ⚠️ **Disclaimer:** NeuroFit is for wellness guidance only. It is not a medical device and results should not be used as medical advice.

---

## ✨ Features

| Feature | Description |
|--------|-------------|
| 📸 **Real-time Pose Detection** | 33-point landmark tracking at 30fps via MediaPipe |
| 📏 **Height Estimation** | Camera geometry + pixel span → real-world cm (±3–8cm) |
| ⚖️ **BMI Calculation** | Calculated from reference avg height + healthy weight for your age/gender |
| 🧠 **ML Body Classification** | Random Forest (50 trees, ~82% accuracy) — 4 classes |
| 🥗 **Meal Recommendations** | 40-meal dataset scored by TDEE proximity + body type |
| 💪 **Exercise Plans** | Age-adjusted workout routines per body type |
| 🤖 **AI Fitness Chatbot** | Hybrid offline/online coach — appears after scan with your data pre-loaded |
| 🔌 **Offline Chatbot** | Rule-based engine — works with zero internet, instant responses |
| 🌐 **Online Chatbot** | Gemini 1.5 Flash API — full natural language understanding |
| 🖥️ **Local LLM Chatbot** | Ollama integration — private AI running on your own machine |
| 🔒 **100% Private** | All processing in-browser — no server, no storage |
| 📴 **Offline Ready** | MediaPipe runs from local files — works without internet |
| 🎉 **Staggered Reveal UI** | Cinematic results reveal with terminal animations + confetti |

---

## 🔄 How It Works

```
┌─────────────────────────────────────────────────────────┐
│                     USER FLOW                           │
│                                                         │
│  1. Setup  →  Enter age, weight, gender, distance       │
│  2. Stand  →  Full body in guide box                    │
│  3. Detect →  MediaPipe maps 33 landmarks @ 30fps       │
│  4. Scan   →  5-second window averages readings         │
│  5. ML     →  Random Forest classifies body type        │
│  6. Score  →  Meals ranked by TDEE proximity            │
│  7. Plan   →  Age-adjusted exercises generated          │
│  8. Reveal →  Staggered UI reveal with animations       │
│  9. Chat   →  AI coach popup with your scan data loaded │
└─────────────────────────────────────────────────────────┘
```

### Height Calculation
```
FOV    = 60° (standard webcam)
frameH = 2 × distance × tan(FOV/2)
height = bodySpan (normalized 0–1) × frameH
```

### BMI Calculation (Updated)
BMI is now calculated using **age/gender-matched reference data** from CSV:
```
refHeight = avg height for your age + gender (from CSV)
refWeight = healthy reference weight for your age + gender
refBMI    = refWeight / (refHeight/100)²
```

### Body Type Classes
| Class | BMI Range | Focus |
|-------|-----------|-------|
| 🦴 Underweight | < 18.5 | Caloric surplus, muscle gain |
| ✅ Normal | 18.5 – 24.9 | Maintenance, definition |
| ⚠️ Overweight | 25 – 29.9 | Deficit, cardio |
| 🔴 Obese | ≥ 30 | Low-impact cardio, lifestyle |

---

## 🛠 Tech Stack

### Frontend
- **Vanilla JS** — no framework dependencies
- **HTML5 Canvas** — real-time skeleton overlay
- **CSS3** — custom design system with CSS variables

### ML & AI
- **Google MediaPipe Pose** — landmark detection (local WASM)
- **Random Forest** — body type classifier (trained in Python/sklearn, exported to JSON)
- **Harris-Benedict** — TDEE calculation
- **JS Scoring Engine** — meal ranking (ported from Python RF logic)
- **Rule-based NLP Engine** — offline fitness chatbot (keyword pattern matching)
- **Gemini 1.5 Flash API** — online chatbot mode (optional)
- **Ollama API** — local LLM chatbot mode (optional)

### Data
- **BMI Reference CSVs** — age/gender-stratified healthy weight ranges
- **40-meal dataset** — 4 diet types × 8 cuisines with macros
- **Exercise database** — 40 exercises across 4 body type profiles

---

## 📁 Project Structure

```
frontend/
├── css/
│   └── main.css              # Complete design system (CSS variables, components)
│
├── js/
│   ├── scanner.js            # MediaPipe camera loop, pose detection, auto-scan
│   ├── ui.js                 # Results reveal, ML calls, meal/exercise rendering
│   └── chatbot.js            # Hybrid AI chatbot (offline + Gemini + Ollama)
│
├── mediapipe/                # Local MediaPipe files (offline capable)
│   ├── pose.js
│   ├── camera_utils.js
│   ├── drawing_utils.js
│   ├── pose_landmark_full.tflite
│   ├── pose_solution_packed_assets.data
│   ├── pose_solution_packed_assets_loader.js
│   ├── pose_solution_simd_wasm_bin.js
│   ├── pose_solution_simd_wasm_bin.wasm
│   └── pose_web.binarypb
│
├── model/
│   ├── bodyClassifier.js     # RF inference engine (browser-native)
│   ├── bodyClassifier.json   # Trained RF model (50 trees, exported from sklearn)
│   ├── bodyMetrics.js        # BMI labels, TDEE, CSV parsing
│   ├── exercises.js          # Exercise DB + age-adjusted plan generator
│   ├── meals.js              # 40-meal DB + JS scoring engine
│   ├── male_bmi_final.csv    # Age-stratified male BMI reference data
│   └── female_bmi_final.csv  # Age-stratified female BMI reference data
│
└── index.html                # Single-page app entry point
```

---

## 🤖 ML Architecture

### Body Type Classifier

```
Input: 7 features from MediaPipe landmarks + user BMI
       [bmi, shoulder_ratio, hip_ratio, torso_ratio,
        limb_ratio, nose_y, body_span]

Model: Random Forest
       - 50 decision trees
       - Trained on synthetic + augmented pose data
       - Exported from sklearn → JSON → runs in browser

Output: { label, confidence%, probabilities }
        → underweight | normal | overweight | obese

Accuracy: ~82% on held-out test set
Fallback: BMI-rule classifier if model not loaded
```

### Meal Scoring Engine

```
Input:  diet preference, TDEE, body type
Score:  85 base
      + calorie proximity to TDEE/5 (highest weight)
      + cuisine match for body type  (+15)
      + protein ≥ 25g                (+12)
      + protein ≥ 35g                (+8 bonus)
      + carb match (underweight)     (+12)
      + low cal (overweight/obese)   (+15)
      - high cal (overweight/obese)  (-25)
      - high fat (overweight/obese)  (-15)
      + random jitter (±10)          (variety)

Output: Top 6 meals ranked 1–99
```

---

## 💬 AI Fitness Chatbot

After the scan completes and confetti fires, a **🤖 AI Coach** button appears at the bottom-right. The chatbot automatically opens with your scan data pre-loaded as context.

### 3 Modes (cycle with the toggle button)

| Mode | Button Label | Engine | Internet? |
|------|-------------|--------|-----------|
| 🔌 **Offline** | `Connect Online` | Rule-based pattern matching | ❌ None needed |
| 🌐 **Online** | `Connect LLM` | Gemini 1.5 Flash API | ✅ Required |
| 🖥️ **Local LLM** | `Disconnect` | Ollama (localhost:11434) | ❌ None needed |

### Offline Knowledge Base
The offline engine handles 12 intent categories using keyword pattern matching:

| Intent | Example triggers |
|--------|-----------------|
| BMI | "bmi", "body mass" |
| TDEE / Calories | "calories", "how much should i eat" |
| Weight Loss | "lose weight", "fat loss", "cut" |
| Muscle Gain | "gain muscle", "bulk", "build muscle" |
| Workout Plan | "workout", "exercise", "gym", "routine" |
| Diet / Nutrition | "diet", "meal", "what should i eat" |
| Sleep & Recovery | "sleep", "rest", "recovery" |
| Hydration | "water", "hydration", "drink" |
| Body Type | "body type", "classification" |
| Motivation | "struggling", "give up", "hard" |
| Greeting | "hello", "hi", "hey" |
| Thanks | "thanks", "helpful", "awesome" |

All responses are **personalized** using the user's actual scan numbers (TDEE, weight, BMI, body type, age).

### Setting Up Online Mode (Gemini)
1. Get a free API key from [Google AI Studio](https://aistudio.google.com/)
2. Open `frontend/js/chatbot.js`
3. Replace line 13:
   ```js
   const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE';
   ```

### Setting Up Local LLM Mode (Ollama)
1. Install [Ollama](https://ollama.com)
2. Run: `ollama pull llama3.2`
3. Ollama runs automatically on `localhost:11434`
4. Click the mode button twice to reach **Local LLM** mode
5. To use a different model, edit line ~120 in `chatbot.js`:
   ```js
   model: 'llama3.2', // or: mistral, phi3, gemma2
   ```

### Chatbot Behaviour
- **Auto-opens** 2 seconds after scan results appear
- **Resets** automatically on every new scan (fresh conversation)
- **Quick chips** for one-tap questions (BMI, Workout, Diet, Calories, etc.)
- Scan data (age, BMI, TDEE, body type, diet preference) is injected as system context in online/LLM modes

---

## 🚀 Getting Started

### 📦 Prerequisites

- **Hardware**: Computer with a functional webcam
- **Software**: A local web server — MediaPipe will not load via `file://` protocol due to browser WASM security restrictions
  - Recommended: [VS Code Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer), Node.js, or Python

### 📥 Installation & Running

1. **Clone the Project**
   ```bash
   git clone https://github.com/shubsolos19/neurofit-ai.git
   cd neurofit-ai
   ```

2. **Start a Local Server**

   **Option A: VS Code Live Server** (easiest — right-click `index.html` → Open with Live Server)

   **Option B: Node.js**
   ```bash
   npx serve frontend
   ```

   **Option C: Python**
   ```bash
   cd frontend
   python -m http.server 8080
   ```

3. **Open in Browser**
   - Node.js: `http://localhost:3000`
   - Python: `http://localhost:8080`

4. **(Optional) Add Gemini API Key for online chatbot**
   ```js
   // frontend/js/chatbot.js line 13
   const GEMINI_API_KEY = 'your_key_here';
   ```

---

## 📖 Usage Guide

### 1. Camera Setup
- Set **Distance to Camera** to how far you'll stand (150–200cm recommended)
- Set **Camera Height** to approximate webcam height from floor
- Enter your **Age**, **Weight**, and **Gender** accurately

### 2. Scanning
- Click **▶ Start Scan**
- Step back until your **full body** is visible in the guide box
- The scan **starts automatically** once you're detected — hold still for 5 seconds

### 3. Results
Results appear in 4 staggered blocks:
1. **Scan Measurements** — Avg reference height, your weight, ref healthy weight, BMI (ref-based), TDEE, Age
2. **Body Type** — ML classification with confidence score
3. **Exercises** — 6 age-adjusted exercises for your body type
4. **Meal Plan** — 6 scored meals (switch between Non-Veg / Vegetarian / Vegan)

### 4. AI Coach Chat
- Chatbot auto-opens 2 seconds after results
- Ask questions or tap quick-reply chips
- Toggle between Offline / Online / Local LLM using the button in the chat header
- Start a new scan anytime — chat resets automatically

### Tips for Best Accuracy
- Wear **fitted clothing** — loose clothing affects proportions
- Ensure **good lighting** — avoid backlighting
- Stand **straight** with arms slightly away from body
- Keep **feet visible** in frame
- Calibrate **distance slider** accurately

---

## 📊 Model Details

### Random Forest JSON Schema
```json
{
  "v": "2.1",
  "classes": ["normal", "obese", "overweight", "underweight"],
  "features": ["bmi", "shoulder_ratio", "hip_ratio", "torso_ratio",
               "limb_ratio", "nose_y", "body_span"],
  "accuracy": 0.8192,
  "trees": [
    {
      "l": false,
      "f": 4,
      "t": 0.50355,
      "L": { ... },
      "R": { ... }
    }
  ]
}
```

### Feature Extraction
All features normalized by `bodySpan` for scale invariance:

| Feature | Landmarks Used | Formula |
|---------|---------------|---------|
| `bmi` | user input | weight / (height/100)² |
| `shoulder_ratio` | 11, 12 | \|lSho.x − rSho.x\| / bodySpan |
| `hip_ratio` | 23, 24 | \|lHip.x − rHip.x\| / bodySpan |
| `torso_ratio` | 11–24 | \|hipY − shoY\| / bodySpan |
| `limb_ratio` | 23–28 | \|ankY − hipY\| / bodySpan |
| `nose_y` | 0 | nose.y (raw normalized) |
| `body_span` | 0, 31 | \|groundY − crownY\| |

---

## 🎯 Performance & Accuracy

| Metric | Value |
|--------|-------|
| Scan Duration | 5 seconds |
| MediaPipe FPS | ~30fps |
| Height Accuracy | ±3–8cm (calibration dependent) |
| Body Type Accuracy | ~82% on test set |
| Model Size | ~2.1MB (JSON) |
| Load Time (cold) | ~1–2s (MediaPipe WASM) |
| Chatbot Response (offline) | <500ms |
| Chatbot Response (Gemini) | ~1–3s |
| Works Offline | ✅ Yes (scanner + offline chatbot) |

---

## 🔒 Privacy

- ✅ **No video upload** — camera feed never leaves your device
- ✅ **No server** — all ML inference runs in-browser via WASM + JS
- ✅ **No account** — no login, no tracking, no cookies
- ✅ **No storage** — nothing written to localStorage or any database
- ✅ **Chatbot offline mode** — rule-based engine, zero data sent anywhere
- ✅ **Open source** — inspect every line of code yourself

---

## ⚠️ Known Limitations

- **Weight is not measured** — entered weight is used; shown reference weight is age/gender matched healthy range
- **Height accuracy varies** — depends on camera calibration; works best at 150–200cm distance
- **Clothing affects results** — loose/baggy clothing can distort shoulder/hip ratios
- **Lighting matters** — MediaPipe requires adequate lighting for accurate landmark detection
- **Single person only** — multiple people in frame will confuse the detector
- **Mobile cameras** — front cameras on phones have different FOV; accuracy may differ
- **Gemini chatbot** — requires internet + valid API key; falls back to offline mode automatically on failure
- **Ollama chatbot** — requires Ollama installed and running locally on port 11434

---

## 🗺 Roadmap

- [ ] Multi-language support
- [ ] Progress tracking across sessions (opt-in localStorage)
- [ ] Export results as PDF
- [ ] Custom calorie goal input
- [ ] More diet categories (Keto, Paleo, Gluten-free)
- [ ] Improved height model using camera intrinsics
- [ ] Mobile-optimized UI
- [ ] Chatbot voice input/output
- [ ] Save & compare scan history

---

## 🤝 Contributing

Contributions are welcome! Here's how:

```bash
# Fork the repo, then:
git checkout -b feature/your-feature-name
git commit -m "feat: add your feature"
git push origin feature/your-feature-name
# Open a Pull Request
```

### Areas to Contribute
- 🍽️ **Add meals** to `model/meals.js` (follow existing schema)
- 💪 **Add exercises** to `model/exercises.js`
- 🤖 **Expand chatbot** knowledge base in `js/chatbot.js` (`_KB` object)
- 🌐 **Translations** — i18n support
- 🐛 **Bug fixes** — check open issues
- 📱 **Mobile UX** improvements

---

## 👨‍💻 Author

**Shubham Bawari**  
B.Tech Computer Science — AKTU (2026)  
📧 shubxd18@gmail.com  
🐙 [@shubsolos19](https://github.com/shubsolos19)

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Made with ❤️ and a webcam

⭐ Star this repo if NeuroFit helped you!

</div>
/**
 * frontend/js/chatbot.js
 * ──────────────────────────────────────────────────────────────
 * NeuroFit AI Fitness Chatbot — Hybrid offline/online
 * - OFFLINE (default): rule-based engine, zero internet needed
 * - ONLINE: Gemini API for full natural language answers
 * - Toggle button in header to switch modes
 */

'use strict';

// ── CONFIG — paste your Gemini API key here ───────────────────
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE'; // Replace with your actual key from Google AI Studio
const GEMINI_MODEL = 'gemini-1.5-flash'; // High compatibility stable model
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// ── State ─────────────────────────────────────────────────────
let _chatOpen = false;
let _chatHistory = [];
let _userProfile = null;
let _isTyping = false;
let _chatInitialized = false;
let _isOnline = false;

// ── Offline Knowledge Base ────────────────────────────────────
const _KB = {
  greet: {
    patterns: ['hello', 'hi', 'hey', 'hiya', 'sup', 'start', 'begin'],
    reply: (p) => `👋 Hi! I'm your NeuroFit AI Coach. Your scan is loaded — you're **${p.age}yrs**, BMI **${p.bmi.toFixed(1)}**, body type: **${p.bodyType}**.\n\nAsk me about workouts, diet, weight goals, or your TDEE! Or tap a quick question below. 👇`
  },
  bmi: {
    patterns: ['bmi', 'body mass', 'mass index'],
    reply: (p) => {
      const s = p.bmi < 18.5 ? 'underweight' : p.bmi < 25 ? 'normal weight' : p.bmi < 30 ? 'overweight' : 'obese';
      return `📊 Your BMI is **${p.bmi.toFixed(1)}** — **${s}**.\n\nHealthy range: 18.5–24.9. ${p.bmi < 18.5 ? 'Focus on caloric surplus with nutrient-dense foods.' :
        p.bmi < 25 ? 'Great — maintain with balanced nutrition and regular exercise.' :
          p.bmi < 30 ? 'A moderate caloric deficit + cardio will help reach healthy range.' :
            'Consistent diet changes and daily movement are most effective. Consider consulting a doctor.'
        }`;
    }
  },
  tdee: {
    patterns: ['tdee', 'calories', 'calorie', 'caloric', 'energy', 'kcal', 'how much should i eat', 'daily intake'],
    reply: (p) => `🔥 Your TDEE is **${Math.round(p.tdee)} kcal/day**.\n\n• **Lose weight**: ${Math.round(p.tdee - 400)} kcal/day (−400 deficit)\n• **Maintain**: ${Math.round(p.tdee)} kcal/day\n• **Gain muscle**: ${Math.round(p.tdee + 300)} kcal/day (+300 surplus)\n\nAim for **${Math.round(p.weight * 1.8)}g protein/day** for your weight.`
  },
  weight: {
    patterns: ['lose weight', 'weight loss', 'fat loss', 'slim', 'cut', 'cutting', 'reduce weight', 'drop weight'],
    reply: (p) => `⚖️ **Weight Loss Plan** for ${Math.round(p.weight)}kg, TDEE ${Math.round(p.tdee)}kcal:\n\n• **Calories**: ${Math.round(p.tdee - 400)} kcal/day\n• **Cardio**: 3–4x/week (run, cycle, swim)\n• **Strength**: 2–3x/week to preserve muscle\n• **Protein**: ${Math.round(p.weight * 2)}g/day minimum\n• **Water**: 2.5–3L/day\n\nTarget: 0.5–1kg loss/week — sustainable pace.`
  },
  gain: {
    patterns: ['gain weight', 'bulk', 'bulking', 'gain muscle', 'build muscle', 'mass gain', 'put on weight'],
    reply: (p) => `💪 **Muscle Gain Plan** for ${Math.round(p.weight)}kg:\n\n• **Calories**: ${Math.round(p.tdee + 300)} kcal/day (lean bulk)\n• **Protein**: ${Math.round(p.weight * 2.2)}g/day\n• **Training**: Progressive overload weekly\n• **Sleep**: 7–9hrs — essential for muscle repair\n• **Focus**: Squat, deadlift, bench, rows\n\nExpect 0.5–1kg/month on a clean bulk.`
  },
  workout: {
    patterns: ['workout', 'exercise', 'training', 'routine', 'programme', 'program', 'gym', 'lifting', 'plan', 'schedule'],
    reply: (p) => ({
      underweight: `🏋️ **Underweight Workout Plan**\nFocus: Build mass\n\n• **Mon**: Upper (bench, rows, shoulder press)\n• **Wed**: Lower (squat, deadlift, lunges)\n• **Fri**: Full body + accessories\n• **Rest**: Active recovery — light walks\n\nPriority: compound lifts + progressive overload + eat in surplus.`,
      normal: `🏋️ **Normal Weight Workout Plan**\nFocus: Build & maintain\n\n• **Mon**: Push (chest, shoulders, triceps)\n• **Tue**: Pull (back, biceps)\n• **Thu**: Legs (quads, hamstrings, glutes)\n• **Sat**: Full body HIIT 30min\n\n3–4 sessions/week is ideal.`,
      overweight: `🏋️ **Overweight Workout Plan**\nFocus: Fat loss + muscle retention\n\n• **Mon/Wed/Fri**: Strength circuit (3 sets, 12–15 reps)\n• **Tue/Thu**: Cardio 30–40min (zone 2 pace)\n• **Weekend**: Active walks 45min\n\nConsistency beats intensity — start manageable.`,
      obese: `🏋️ **Getting Started Plan**\nFocus: Build habit, low-impact movement\n\n• **Daily**: 20–30min walks\n• **3x/week**: Chair exercises, resistance bands, swimming\n• Avoid high-impact initially\n• Increase duration gradually weekly\n\nEvery step counts. Progress over perfection.`
    }[p.bodyType] || `🏋️ Stay consistent with 3–4 workouts/week mixing strength and cardio.`)
  },
  diet: {
    patterns: ['diet', 'meal', 'food', 'eat', 'nutrition', 'what should i eat', 'meal plan', 'macros', 'protein', 'carb', 'fat'],
    reply: (p) => {
      const protein = Math.round(p.weight * 1.8);
      const carbs = Math.round((p.tdee * 0.45) / 4);
      const fats = Math.round((p.tdee * 0.25) / 9);
      return `🥗 **Daily Nutrition** (${p.diet} preference)\n\n• **Calories**: ${Math.round(p.tdee)} kcal\n• **Protein**: ${protein}g (meat, eggs, legumes, dairy)\n• **Carbs**: ${carbs}g (rice, oats, sweet potato)\n• **Fats**: ${fats}g (avocado, nuts, olive oil)\n\n3–4 meals/day. Avoid ultra-processed foods. 2.5–3L water/day.`;
    }
  },
  sleep: {
    patterns: ['sleep', 'rest', 'recovery', 'rest day', 'tired', 'fatigue'],
    reply: (p) => `😴 **Sleep & Recovery**\n\n• Aim for **7–9 hours** nightly\n• Consistent schedule — same time daily\n• Avoid screens 30min before bed\n• ${p.bodyType === 'underweight' ? 'For muscle gain, sleep = gains.' : 'Poor sleep raises cortisol → promotes fat storage.'}\n• 1–2 rest days/week essential`
  },
  water: {
    patterns: ['water', 'hydration', 'hydrate', 'drink', 'fluid'],
    reply: (p) => `💧 **Hydration for ${Math.round(p.weight)}kg**\n\n• **Minimum**: ${(p.weight * 0.033).toFixed(1)}L/day\n• **Active days**: ${(p.weight * 0.04).toFixed(1)}L/day\n\n• Start morning with a full glass\n• Drink before meals\n• Urine = light yellow target\n• Electrolytes if training > 1hr`
  },
  bodytype: {
    patterns: ['body type', 'bodytype', 'my type', 'what type', 'classification'],
    reply: (p) => {
      const info = {
        underweight: 'Focus on caloric surplus. Eat every 3–4hrs. Prioritise compound strength training.',
        normal: 'Maintain with balanced nutrition. Mix strength and cardio. Stay consistent.',
        overweight: 'Moderate caloric deficit. Prioritise cardio + strength. Avoid crash diets.',
        obese: 'Start with low-impact movement. Build consistency. Small changes compound over time.'
      };
      return `🧬 **Body Type: ${p.bodyType.charAt(0).toUpperCase() + p.bodyType.slice(1)}**${p.confidence ? ` (${p.confidence}% ML confidence)` : ''}\n\n${info[p.bodyType] || ''}\n\nClassified by a Random Forest model trained on body measurements.`;
    }
  },
  motivation: {
    patterns: ['motivat', 'inspire', 'struggling', 'hard', 'difficult', 'give up', 'quit'],
    reply: (p) => `💙 It's normal to find it hard. Remember:\n\n• **Progress > Perfection** — one good day at a time\n• Your body type (**${p.bodyType}**) is changeable with effort\n• Even 20min beats zero\n• Habits take ~3 weeks — push through\n• TDEE of **${Math.round(p.tdee)} kcal** means your body is working\n\nYou scanned → you started. Keep going! 🚀`
  },
  thanks: {
    patterns: ['thank', 'thanks', 'thx', 'appreciate', 'helpful', 'great', 'good', 'awesome'],
    reply: () => `😊 You're welcome! Consistency is everything. Feel free to ask anything else anytime!`
  },
  default: {
    reply: () => `🤖 I can help with:\n\n• 📊 **BMI** — "my bmi"\n• 🔥 **Calories** — "calories"\n• 🏋️ **Workout plan** — "workout"\n• 🥗 **Diet** — "diet"\n• 💧 **Hydration** — "water"\n• 😴 **Sleep** — "sleep"\n• ⚖️ **Lose weight** — "lose weight"\n• 💪 **Gain muscle** — "gain muscle"\n• 🧬 **Body type** — "body type"\n\nOr switch to **Online** for full AI! 🌐`
  }
};

function _offlineReply(message) {
  const msg = message.toLowerCase().trim();
  for (const [key, entry] of Object.entries(_KB)) {
    if (key === 'default') continue;
    if (entry.patterns && entry.patterns.some(p => msg.includes(p))) {
      return entry.reply(_userProfile);
    }
  }
  return _KB.default.reply(_userProfile);
}

// ── Ollama Local LLM API ─────────────────────────────────────
async function _ollamaReply(userText) {
  const systemPrompt = _buildGeminiSystem(); // reuse same system prompt builder
  const res = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.2', // change to your installed model e.g. mistral, phi3, gemma2
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt },
        ..._chatHistory.map(m => ({ role: m.role === 'model' ? 'assistant' : m.role, content: m.parts[0].text })),
        { role: 'user', content: userText }
      ]
    })
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const data = await res.json();
  const reply = data.message?.content || 'No response from Ollama.';
  _chatHistory.push({ role: 'user', parts: [{ text: userText }] });
  _chatHistory.push({ role: 'model', parts: [{ text: reply }] });
  return reply;
}

// ── Gemini API ────────────────────────────────────────────────
function _buildGeminiSystem() {
  const p = _userProfile;
  return `You are NeuroFit AI, a personal fitness and nutrition coach. The user completed a body scan:
- Age: ${p.age}yr, Gender: ${p.gender}
- Height: ${Math.round(p.height)}cm, Weight: ${p.weight}kg
- BMI: ${p.bmi.toFixed(1)}, Body Type: ${p.bodyType}${p.confidence ? ` (${p.confidence}% ML confidence)` : ''}
- Daily TDEE: ${Math.round(p.tdee)} kcal, Diet preference: ${p.diet}
- Ref avg height: ${p.refHeight || 'N/A'}cm, Ref healthy weight: ${p.refWeight || 'N/A'}kg
Give personalised, concise fitness/nutrition advice using their actual numbers. Max 120 words unless asked for detail. Never give medical diagnoses.`;
}

async function _geminiReply(userText) {
  if (GEMINI_API_KEY.includes('YOUR_GEMINI_API_KEY')) {
    throw new Error('API Key missing. Please paste your Gemini API key in frontend/js/chatbot.js at line 13.');
  }

  const systemPrompt = _buildGeminiSystem();
  const contents = [..._chatHistory, { role: 'user', parts: [{ text: userText }] }];

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      system_instruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.7
      }
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 404) throw new Error(`Model "${GEMINI_MODEL}" not found or API endpoint invalid.`);
    if (res.status === 403) throw new Error('CORS or Permission error. Ensure API key is valid and and doesn\'t have restricted origins.');
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!reply) {
    const feedback = data.promptFeedback?.blockReason || 'Response blocked by Safety Filters.';
    throw new Error(`Gemini blocked response: ${feedback}`);
  }

  _chatHistory.push({ role: 'user', parts: [{ text: userText }] });
  _chatHistory.push({ role: 'model', parts: [{ text: reply }] });
  return reply;
}

// ── CSS ───────────────────────────────────────────────────────
function _injectCSS() {
  const s = document.createElement('style');
  s.textContent = `
  #neurofit-chatbot { position:fixed; bottom:28px; right:28px; z-index:9999; font-family:inherit; }

  .chat-fab {
    display:flex; align-items:center; gap:8px;
    background:linear-gradient(135deg,#00BFFF,#0077cc);
    color:#fff; border:none; border-radius:50px; padding:13px 20px 13px 16px;
    cursor:pointer; font-size:0.9rem; font-weight:600; letter-spacing:.03em;
    box-shadow:0 4px 24px rgba(0,191,255,.45); transition:transform .2s,box-shadow .2s; position:relative;
  }
  .chat-fab:hover { transform:translateY(-2px); box-shadow:0 8px 32px rgba(0,191,255,.6); }
  .chat-fab-badge {
    position:absolute; top:-4px; right:-4px;
    background:#ff4757; color:#fff; border-radius:50%;
    width:18px; height:18px; font-size:.65rem;
    display:flex; align-items:center; justify-content:center; font-weight:700;
  }
  .chat-fab.pulse { animation:fabPulse 2s ease 3; }
  @keyframes fabPulse {
    0%,100% { box-shadow:0 4px 24px rgba(0,191,255,.45); }
    50%     { box-shadow:0 4px 40px rgba(0,191,255,.85),0 0 0 8px rgba(0,191,255,.1); }
  }

  .chat-window {
    display:none; flex-direction:column;
    position:absolute; bottom:70px; right:0; width:360px; height:530px;
    background:#0d1117; border:1px solid rgba(0,191,255,.2); border-radius:16px;
    box-shadow:0 20px 60px rgba(0,0,0,.6); overflow:hidden;
    animation:chatSlideIn .25s ease;
  }
  .chat-window.open { display:flex; }
  @keyframes chatSlideIn {
    from { opacity:0; transform:translateY(16px) scale(.97); }
    to   { opacity:1; transform:translateY(0)    scale(1);   }
  }

  .chat-header {
    display:flex; align-items:center; justify-content:space-between;
    padding:12px 12px; gap:8px;
    background:linear-gradient(135deg,rgba(0,191,255,.12),rgba(0,100,200,.08));
    border-bottom:1px solid rgba(0,191,255,.15);
  }
  .chat-header-left { display:flex; align-items:center; gap:10px; flex:1; min-width:0; }
  .chat-avatar {
    width:34px; height:34px; flex-shrink:0;
    background:linear-gradient(135deg,#00BFFF22,#00BFFF44);
    border:1px solid rgba(0,191,255,.4); border-radius:50%;
    display:flex; align-items:center; justify-content:center; font-size:.95rem;
  }
  .chat-title    { font-size:.85rem; font-weight:700; color:#fff; }
  .chat-subtitle { font-size:.65rem; color:#00BFFF; margin-top:1px; }

  /* Mode toggle */
  .chat-mode-btn {
    display:flex; align-items:center; gap:5px;
    background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.12);
    border-radius:20px; padding:5px 10px;
    color:rgba(255,255,255,.5); font-size:.67rem; font-weight:600;
    cursor:pointer; white-space:nowrap; transition:all .2s; flex-shrink:0;
  }
  .chat-mode-btn:hover { border-color:rgba(0,191,255,.4); color:rgba(255,255,255,.85); }
  .chat-mode-btn.online { background:rgba(0,191,255,.12); border-color:rgba(0,191,255,.4); color:#00BFFF; }
  .mode-dot { width:6px; height:6px; border-radius:50%; background:rgba(255,255,255,.25); transition:background .2s; }
  .chat-mode-btn.online .mode-dot { background:#00BFFF; box-shadow:0 0 6px #00BFFF; animation:modePulse 2s infinite; }
  .chat-mode-btn.llm { background:rgba(76,240,176,.12); border-color:rgba(76,240,176,.4); color:#4cf0b0; }
  .chat-mode-btn.llm .mode-dot { background:#4cf0b0; box-shadow:0 0 6px #4cf0b0; animation:modePulse 2s infinite; }
  .chat-mode-banner.llm { background:rgba(76,240,176,.08); color:rgba(76,240,176,.7); }
  @keyframes modePulse {
    0%,100% { opacity: 0.7; }
    50%     { opacity: 1;   }
  }

  .chat-close {
    background:none; border:none; color:rgba(255,255,255,.35);
    cursor:pointer; font-size:.95rem; padding:4px 6px; border-radius:6px;
    transition:color .15s,background .15s; flex-shrink:0;
  }
  .chat-close:hover { color:#fff; background:rgba(255,255,255,.08); }

  .chat-mode-banner {
    font-size:.68rem; text-align:center; padding:5px 12px;
    border-bottom:1px solid rgba(255,255,255,.05); transition:all .3s;
  }
  .chat-mode-banner.offline { background:rgba(255,255,255,.03); color:rgba(255,255,255,.28); }
  .chat-mode-banner.online  { background:rgba(0,191,255,.08);   color:rgba(0,191,255,.7);   }

  .chat-messages {
    flex:1; overflow-y:auto; padding:14px 12px;
    display:flex; flex-direction:column; gap:10px;
    scrollbar-width:thin; scrollbar-color:rgba(0,191,255,.2) transparent;
  }
  .chat-messages::-webkit-scrollbar       { width:4px; }
  .chat-messages::-webkit-scrollbar-thumb { background:rgba(0,191,255,.2); border-radius:4px; }

  .chat-msg { display:flex; flex-direction:column; max-width:88%; animation:msgIn .2s ease; }
  @keyframes msgIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  .chat-msg.user { align-self:flex-end;  align-items:flex-end;   }
  .chat-msg.bot  { align-self:flex-start; align-items:flex-start; }

  .chat-bubble { padding:9px 13px; border-radius:14px; font-size:.81rem; line-height:1.55; word-break:break-word; }
  .chat-msg.user .chat-bubble { background:linear-gradient(135deg,#00BFFF,#0077cc); color:#fff; border-bottom-right-radius:4px; }
  .chat-msg.bot  .chat-bubble { background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.08); color:rgba(255,255,255,.88); border-bottom-left-radius:4px; }
  .chat-time { font-size:.6rem; color:rgba(255,255,255,.2); margin-top:3px; padding:0 4px; }

  .chat-typing .chat-bubble { display:flex; align-items:center; gap:4px; padding:12px 16px; }
  .typing-dot { width:6px; height:6px; background:rgba(0,191,255,.6); border-radius:50%; animation:tdot 1.2s infinite; }
  .typing-dot:nth-child(2){animation-delay:.2s} .typing-dot:nth-child(3){animation-delay:.4s}
  @keyframes tdot { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }

  .chat-chips { display:flex; flex-wrap:wrap; gap:5px; padding:0 12px 8px; }
  .chat-chip {
    background:rgba(0,191,255,.08); border:1px solid rgba(0,191,255,.2);
    color:rgba(0,191,255,.8); border-radius:20px; padding:4px 9px;
    font-size:.68rem; cursor:pointer; transition:all .15s;
  }
  .chat-chip:hover { background:rgba(0,191,255,.18); color:#00BFFF; }

  .chat-input-row {
    display:flex; gap:8px; padding:10px 12px;
    border-top:1px solid rgba(255,255,255,.06); background:rgba(0,0,0,.2);
  }
  .chat-input {
    flex:1; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1);
    border-radius:10px; padding:9px 12px; color:#fff; font-size:.82rem; outline:none; transition:border-color .2s;
  }
  .chat-input:focus       { border-color:rgba(0,191,255,.5); }
  .chat-input::placeholder{ color:rgba(255,255,255,.22); }
  .chat-send {
    background:linear-gradient(135deg,#00BFFF,#0077cc); border:none; border-radius:10px;
    width:38px; height:38px; display:flex; align-items:center; justify-content:center;
    cursor:pointer; color:#fff; flex-shrink:0; transition:transform .15s,box-shadow .15s;
  }
  .chat-send:hover:not(:disabled){ transform:scale(1.08); box-shadow:0 4px 16px rgba(0,191,255,.4); }
  .chat-send:disabled             { opacity:.4; cursor:not-allowed; }
  .chat-footer { text-align:center; font-size:.6rem; color:rgba(255,255,255,.13); padding:4px 0 7px; }

  @media(max-width:420px){
    #neurofit-chatbot{ bottom:16px; right:12px; }
    .chat-window     { width:calc(100vw - 24px); right:0; }
  }
  `;
  document.head.appendChild(s);
}

// ── HTML ──────────────────────────────────────────────────────
function _injectHTML() {
  const el = document.createElement('div');
  el.id = 'neurofit-chatbot';
  el.innerHTML = `
    <button class="chat-fab" id="chat-fab">
      <span style="font-size:1.2rem">🤖</span>
      <span>AI Coach</span>
      <span class="chat-fab-badge" id="chat-badge" style="display:none">1</span>
    </button>

    <div class="chat-window" id="chat-window">
      <div class="chat-header">
        <div class="chat-header-left">
          <div class="chat-avatar">🤖</div>
          <div style="min-width:0">
            <div class="chat-title">NeuroFit AI Coach</div>
            <div class="chat-subtitle" id="chat-status">Offline · Rule-based engine</div>
          </div>
        </div>
        <button class="chat-mode-btn" id="chat-mode-btn" title="Toggle offline / online AI">
          <span class="mode-dot"></span>
          <span id="mode-label">Connect Online</span>
        </button>
        <button class="chat-close" id="chat-close">✕</button>
      </div>

      <div class="chat-mode-banner offline" id="chat-mode-banner">
        🔌 Offline mode — instant rule-based fitness engine
      </div>

      <div class="chat-messages" id="chat-messages"></div>

      <div class="chat-chips" id="chat-chips">
        <span class="chat-chip" data-msg="What's my BMI?">📊 BMI</span>
        <span class="chat-chip" data-msg="Give me a workout plan">🏋️ Workout</span>
        <span class="chat-chip" data-msg="What should I eat today?">🥗 Diet</span>
        <span class="chat-chip" data-msg="How many calories should I eat?">🔥 Calories</span>
        <span class="chat-chip" data-msg="Help me lose weight">⚖️ Lose weight</span>
        <span class="chat-chip" data-msg="How do I gain muscle?">💪 Gain muscle</span>
      </div>

      <div class="chat-input-row">
        <input type="text" id="chat-input" class="chat-input"
          placeholder="Ask about fitness, diet, workouts…" maxlength="300" autocomplete="off"/>
        <button class="chat-send" id="chat-send">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
      <div class="chat-footer">Not medical advice · For wellness guidance only</div>
    </div>
  `;
  document.body.appendChild(el);
}

// ── Message helpers ───────────────────────────────────────────
function _addMessage(role, text) {
  const c = document.getElementById('chat-messages');
  if (!c) return;
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const d = document.createElement('div');
  d.className = `chat-msg ${role}`;
  const html = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  d.innerHTML = `<div class="chat-bubble">${html}</div><div class="chat-time">${now}</div>`;
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
}
function _showTyping() {
  const c = document.getElementById('chat-messages');
  if (!c) return;
  const d = document.createElement('div');
  d.className = 'chat-msg bot chat-typing'; d.id = 'chat-typing-indicator';
  d.innerHTML = `<div class="chat-bubble"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>`;
  c.appendChild(d); c.scrollTop = c.scrollHeight;
}
function _removeTyping() { document.getElementById('chat-typing-indicator')?.remove(); }

// ── Mode: 'offline' | 'online' | 'llm' ───────────────────────
let _mode = 'offline';

function _applyMode(mode, announce) {
  _mode = mode;
  _isOnline = (mode === 'online');
  // Removed _chatHistory = []; to preserve context during mode switches

  const btn = document.getElementById('chat-mode-btn');
  const banner = document.getElementById('chat-mode-banner');
  const status = document.getElementById('chat-status');
  const label = document.getElementById('mode-label');
  if (!btn) return;

  btn.classList.remove('online', 'llm');

  if (mode === 'offline') {
    label.textContent = 'Connect Online';
    banner.className = 'chat-mode-banner offline';
    banner.textContent = '🔌 Offline mode — instant rule-based fitness engine';
    status.textContent = 'Offline · Rule-based engine';
    if (announce) _addMessage('bot', '🔌 **Offline mode** — local rule-based engine. Works without internet!');

  } else if (mode === 'online') {
    btn.classList.add('online');
    label.textContent = 'Connect LLM';
    banner.className = 'chat-mode-banner online';
    banner.textContent = '🌐 Online mode — Gemini AI · Full natural language';
    status.textContent = 'Online · Gemini AI';
    if (announce) _addMessage('bot', '🌐 **Online mode** — powered by Gemini AI. Ask me anything!');

  } else if (mode === 'llm') {
    btn.classList.add('llm');
    label.textContent = 'Disconnect';
    banner.className = 'chat-mode-banner llm';
    banner.textContent = '🤖 Local LLM mode — Ollama · Private & offline AI';
    status.textContent = 'Local LLM · Ollama';
    if (announce) _addMessage('bot', '🤖 **Local LLM mode** — connected to Ollama on your machine. Fully private!');
  }
}

function _cycleMode() {
  const next = { offline: 'online', online: 'llm', llm: 'offline' };
  _applyMode(next[_mode] || 'offline', true);
}

function _setMode(online) { _applyMode(online ? 'online' : 'offline', true); }

// ── Send ──────────────────────────────────────────────────────
async function _sendMessage(presetText) {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');
  const text = (presetText || input?.value || '').trim();
  if (!text || _isTyping) return;
  if (input) input.value = '';

  _addMessage('user', text);
  _isTyping = true;
  if (sendBtn) sendBtn.disabled = true;
  if (input) input.disabled = true;
  _showTyping();

  try {
    let reply;
    if (_mode === 'online') {
      await new Promise(r => setTimeout(r, 600));
      reply = await _geminiReply(text);
    } else if (_mode === 'llm') {
      // Ollama local API — assumes Ollama running on localhost:11434
      await new Promise(r => setTimeout(r, 400));
      reply = await _ollamaReply(text);
    } else {
      await new Promise(r => setTimeout(r, 350 + Math.random() * 350));
      reply = _offlineReply(text);
    }
    _removeTyping();
    _addMessage('bot', reply);
  } catch (err) {
    _removeTyping();
    if (_mode === 'online') {
      _addMessage('bot', '⚠️ Couldn\'t reach Gemini. Check your API key or internet. Switching to offline mode.');
      _applyMode('offline', false);
    } else if (_mode === 'llm') {
      _addMessage('bot', '⚠️ Couldn\'t reach Ollama. Make sure Ollama is running locally on port 11434. Switching to offline mode.');
      _applyMode('offline', false);
    } else {
      _addMessage('bot', '⚠️ Something went wrong. Please try again.');
    }
    console.error('[NeuroFit Chatbot]', err);
  } finally {
    _isTyping = false;
    if (sendBtn) sendBtn.disabled = false;
    if (input) { input.disabled = false; input.focus(); }
  }
}

// ── Toggle ────────────────────────────────────────────────────
function _toggleChat() {
  const win = document.getElementById('chat-window');
  const badge = document.getElementById('chat-badge');
  _chatOpen = !_chatOpen;
  if (_chatOpen) { win.classList.add('open'); badge.style.display = 'none'; setTimeout(() => document.getElementById('chat-input')?.focus(), 200); }
  else win.classList.remove('open');
}

// ── Public init ───────────────────────────────────────────────
function initChatbot(profile) {
  if (!_chatInitialized) {
    _injectCSS();
    _injectHTML();
    _chatInitialized = true;

    document.getElementById('chat-fab').addEventListener('click', _toggleChat);
    document.getElementById('chat-close').addEventListener('click', _toggleChat);
    document.getElementById('chat-send').addEventListener('click', () => _sendMessage());
    document.getElementById('chat-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _sendMessage(); }
    });
    document.getElementById('chat-mode-btn').addEventListener('click', _cycleMode);
    document.getElementById('chat-chips').addEventListener('click', e => {
      const chip = e.target.closest('.chat-chip');
      if (chip) _sendMessage(chip.dataset.msg);
    });
  }

  _userProfile = profile;
  _chatHistory = [];

  // Always reset mode to offline and clear chat messages on new scan
  _mode = 'offline';
  _isOnline = false;
  const msgBox = document.getElementById('chat-messages');
  if (msgBox) msgBox.innerHTML = '';
  _applyMode('offline', false); // update UI labels without announcing

  // Close chat window if open so it reopens fresh
  const win = document.getElementById('chat-window');
  if (win && _chatOpen) {
    win.classList.remove('open');
    _chatOpen = false;
  }

  const fab = document.getElementById('chat-fab');
  fab.style.display = 'flex';
  fab.classList.remove('pulse'); void fab.offsetWidth; fab.classList.add('pulse');
  document.getElementById('chat-badge').style.display = 'flex';

  // Auto-open with greeting after 2s
  setTimeout(() => {
    if (!_chatOpen) {
      _toggleChat();
      setTimeout(() => _addMessage('bot', _KB.greet.reply(profile)), 300);
    }
  }, 2000);
}

window.initChatbot = initChatbot;
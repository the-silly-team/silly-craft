// silly craft - game logic (AI-powered via Groq)

// ── state ────────────────────────────────────────────────────────────────────

const CACHE_KEY = 'silly-craft-cache';
const API_KEY_STORAGE = 'silly-craft-api-key';

// starting elements
const STARTERS = [
  { name: 'fire', emoji: '🔥' },
  { name: 'water', emoji: '💧' },
  { name: 'earth', emoji: '🌍' },
  { name: 'wind', emoji: '💨' },
];

// discovered elements: { name: { emoji, isNew } }
const elements = new Map();
// combination cache: "a+b" -> result name (sorted key)
const comboCache = new Map();
// stats
let comboCount = 0;
let discoveredCount = 0;

// AI context about silly team lore
const AI_CONTEXT = `You are the recipe generator for "silly craft", an infinite crafting game.
The game combines two elements to create a new one. Think like Infinite Craft by neal.fun.

CONTEXT ABOUT THE SILLY TEAM UNIVERSE:
- Brain Liquidation Inc.: a fictional corporation whose CEO is half a braincell. Subsidiaries: nobro technologies, potato computing, silly systems, neuron destruction llc, the bread foundation. Products: bread, potatoes, brains. The bread foundation controls the entire economy. Applesoft sued them for solidifying brains instead of liquidating them. The breadening is a major event.
- Objbox (the cube): a WebGL new tab page. The cube is the void itself - a containment shell. 8 inner cubes are fragments. obj is the void's primary interface. zones: source, void, cb_menu, geometry, farlands, breakdown, fringenlands, end, x. INTERLOPER is a recurring concept. The void has transmissions and cryptic messages.
- Silly Browser: a desktop app that injects JS/CSS into websites via bookmarklet. Has a bouncing cube mascot. Dark mode, multi-script stacking, site rules.
- Silly Engine: a browser engine in Zig. No chromium, no gecko, just zig and vibes.
- SillyOS: a from-scratch OS in Zig. Boots to a shell. BTRFS filesystem.
- Void Chess: rigged chess vs obj with random rule mutations.
- Characters: lux (tophat, purple headphones), obj (the cube), evil lux (antagonist), verity (sentient ball from roller), jbo (obj's brother, lives in reactor, hates nyarch).
- Places: tabula mines (main universe), water world (flooded facility), netware (corporate), the void, geometry, farlands.
- Concepts: bread, potato, brain, silly, void, cube, interloper, obj, lux, verity, jbo, nyarch.

RULES FOR COMBINING:
- Combine two elements to create ONE new element
- The result should be creative, funny, or reference the silly team universe
- Return a JSON object: {"name": "element name", "emoji": "single emoji"}
- Name should be lowercase, 1-3 words max
- Be creative but logical. Fire + water = steam. But also fire + bread = toasted bread.
- Reference silly team lore when it makes sense (brain liquidation, objbox, void, etc.)
- If the combination doesn't make sense, return something absurd but funny
- NEVER return an element that already exists as a starter (fire, water, earth, wind)
- The emoji should represent the result

EXAMPLES:
- fire + water = {"name": "steam", "emoji": "💨"}
- bread + fire = {"name": "toast", "emoji": "🍞"}
- brain + potato = {"name": "potato brain", "emoji": "🥔"}
- void + cube = {"name": "interloper", "emoji": "⬛"}
- ceo + lizard = {"name": "confused lizard", "emoji": "🦎"}

Return ONLY the JSON object, nothing else.`;

// ── init ─────────────────────────────────────────────────────────────────────

function init() {
  // load cache
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      if (data.elements) {
        data.elements.forEach(el => {
          elements.set(el.name, { emoji: el.emoji, isNew: false });
        });
      }
      if (data.combos) {
        Object.entries(data.combos).forEach(([k, v]) => {
          comboCache.set(k, v);
        });
      }
      comboCount = data.comboCount || 0;
    }
  } catch (e) {}

  // add starters if not present
  STARTERS.forEach(s => {
    if (!elements.has(s.name)) {
      elements.set(s.name, { emoji: s.emoji, isNew: false });
    }
  });

  // load api key
  const key = localStorage.getItem(API_KEY_STORAGE);
  if (key) {
    document.getElementById('apiKey').value = key;
    updateApiStatus();
  }

  renderElements();
  updateStats();
  setupDragDrop();
}

// ── storage ──────────────────────────────────────────────────────────────────

function saveCache() {
  const data = {
    elements: Array.from(elements.entries()).map(([name, info]) => ({ name, emoji: info.emoji })),
    combos: Object.fromEntries(comboCache),
    comboCount: comboCount
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
}

function saveApiKey() {
  const key = document.getElementById('apiKey').value.trim();
  localStorage.setItem(API_KEY_STORAGE, key);
  updateApiStatus();
}

function updateApiStatus() {
  const key = localStorage.getItem(API_KEY_STORAGE);
  const status = document.getElementById('apiStatus');
  if (key) {
    status.textContent = '✓ API key set — AI recipes enabled';
    status.style.color = '#5fd4b0';
  } else {
    status.textContent = 'no key set — using fallback recipes';
    status.style.color = '#9a93b8';
  }
}

function toggleSettings() {
  document.getElementById('settingsPanel').classList.toggle('show');
}

// ── rendering ────────────────────────────────────────────────────────────────

function renderElements() {
  const grid = document.getElementById('elGrid');
  grid.innerHTML = '';
  const search = document.getElementById('search').value.toLowerCase();
  const sorted = Array.from(elements.keys()).sort();
  sorted.forEach(name => {
    if (search && !name.includes(search)) return;
    const info = elements.get(name);
    const el = document.createElement('div');
    el.className = 'el' + (info.isNew ? ' new' : '');
    el.draggable = true;
    el.dataset.name = name;
    el.innerHTML = '<span class="emoji">' + info.emoji + '</span>' + name;
    el.addEventListener('dragstart', onDragStart);
    grid.appendChild(el);
  });
  updateStats();
}

function filterElements() {
  renderElements();
}

function updateStats() {
  document.getElementById('discovered').textContent = elements.size;
  document.getElementById('combos').textContent = comboCount;
}

// ── drag and drop ───────────────────────────────────────────────────────────

let draggedEl = null;
let draggedName = null;

function onDragStart(e) {
  draggedEl = e.target.closest('.el');
  draggedName = draggedEl.dataset.name;
  e.dataTransfer.setData('text/plain', draggedName);
  e.dataTransfer.effectAllowed = 'copy';
}

function setupDragDrop() {
  const canvas = document.getElementById('canvas');

  canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });

  canvas.addEventListener('drop', async (e) => {
    e.preventDefault();
    const name = e.dataTransfer.getData('text/plain');
    if (!name) return;

    // check if dropping on another element
    const target = e.target.closest('.canvas-item');
    if (target && target.dataset.name !== name) {
      // combine!
      const x = e.clientX - canvas.getBoundingClientRect().left;
      const y = e.clientY - canvas.getBoundingClientRect().top;
      await combine(name, target.dataset.name, x, y);
      return;
    }

    // just place the element
    const x = e.clientX - canvas.getBoundingClientRect().left - 40;
    const y = e.clientY - canvas.getBoundingClientRect().top - 20;
    placeElement(name, x, y);
  });

  // hide hint
  canvas.addEventListener('dragenter', () => {
    const hint = document.getElementById('hint');
    if (hint) hint.style.display = 'none';
  });
}

function placeElement(name, x, y) {
  const info = elements.get(name);
  const item = document.createElement('div');
  item.className = 'canvas-item';
  item.dataset.name = name;
  item.style.left = Math.max(0, x) + 'px';
  item.style.top = Math.max(0, y) + 'px';
  item.innerHTML = '<span>' + info.emoji + '</span> ' + name;
  item.draggable = true;
  item.addEventListener('dragstart', (e) => {
    item.classList.add('dragging');
    e.dataTransfer.setData('text/plain', name);
    e.dataTransfer.effectAllowed = 'move';
  });
  item.addEventListener('dragend', () => item.classList.remove('dragging'));
  document.getElementById('canvas').appendChild(item);
}

// ── combination logic ────────────────────────────────────────────────────────

async function combine(a, b, x, y) {
  const key = [a, b].sort().join('+');

  // check cache
  if (comboCache.has(key)) {
    const result = comboCache.get(key);
    showResult(result, x, y, false);
    if (!elements.has(result.name)) {
      elements.set(result.name, { emoji: result.emoji, isNew: true });
      renderElements();
      saveCache();
    }
    return;
  }

  const apiKey = localStorage.getItem(API_KEY_STORAGE);

  if (!apiKey) {
    // fallback: use simple hardcoded combos
    const fallback = getFallbackCombo(a, b);
    if (fallback) {
      comboCache.set(key, fallback);
      showResult(fallback, x, y, false);
      if (!elements.has(fallback.name)) {
        elements.set(fallback.name, { emoji: fallback.emoji, isNew: true });
        renderElements();
        saveCache();
      }
    } else {
      showToast('no recipe found (set API key for AI recipes)');
    }
    return;
  }

  // show loading
  const loadingEl = document.createElement('div');
  loadingEl.className = 'canvas-item loading';
  loadingEl.style.left = x + 'px';
  loadingEl.style.top = y + 'px';
  loadingEl.innerHTML = '<span>⏳</span> combining...';
  document.getElementById('canvas').appendChild(loadingEl);

  try {
    const result = await callAI(a, b);
    loadingEl.remove();

    if (result && result.name) {
      comboCache.set(key, result);
      showResult(result, x, y, true);
      if (!elements.has(result.name)) {
        elements.set(result.name, { emoji: result.emoji, isNew: true });
        renderElements();
        saveCache();
      }
      comboCount++;
      updateStats();
      saveCache();
    } else {
      showToast('AI returned invalid result');
    }
  } catch (e) {
    loadingEl.remove();
    console.error('AI error:', e);
    // try fallback
    const fallback = getFallbackCombo(a, b);
    if (fallback) {
      comboCache.set(key, fallback);
      showResult(fallback, x, y, false);
      if (!elements.has(fallback.name)) {
        elements.set(fallback.name, { emoji: fallback.emoji, isNew: true });
        renderElements();
        saveCache();
      }
    } else {
      showToast('combination failed: ' + e.message);
    }
  }
}

async function callAI(a, b) {
  const apiKey = localStorage.getItem(API_KEY_STORAGE);
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: AI_CONTEXT },
        { role: 'user', content: 'Combine "' + a + '" and "' + b + '". Return only a JSON object: {"name": "result name", "emoji": "single emoji"}' }
      ],
      temperature: 0.8,
      max_tokens: 50
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error('API error ' + response.status + ': ' + err.slice(0, 100));
  }

  const data = await response.json();
  const content = data.choices[0].message.content.trim();

  // parse JSON from response (handle markdown code blocks)
  let jsonStr = content;
  if (jsonStr.includes('```')) {
    jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  }

  const result = JSON.parse(jsonStr);
  if (!result.name || !result.emoji) throw new Error('invalid AI response');
  return { name: result.name.toLowerCase(), emoji: result.emoji };
}

// ── fallback combos (hardcoded) ──────────────────────────────────────────────

const FALLBACK = {
  'fire+water': { name: 'steam', emoji: '💨' },
  'fire+earth': { name: 'lava', emoji: '🌋' },
  'fire+wind': { name: 'smoke', emoji: '🌫️' },
  'water+earth': { name: 'mud', emoji: '🟤' },
  'water+wind': { name: 'rain', emoji: '🌧️' },
  'earth+wind': { name: 'dust', emoji: '🌪️' },
  'fire+fire': { name: 'inferno', emoji: '🔥' },
  'water+water': { name: 'ocean', emoji: '🌊' },
  'earth+earth': { name: 'mountain', emoji: '⛰️' },
  'wind+wind': { name: 'tornado', emoji: '🌪️' },
  'steam+fire': { name: 'geyser', emoji: '💦' },
  'lava+water': { name: 'obsidian', emoji: '⬛' },
  'mud+fire': { name: 'brick', emoji: '🧱' },
  'rain+earth': { name: 'plant', emoji: '🌱' },
  'plant+water': { name: 'tree', emoji: '🌳' },
  'tree+fire': { name: 'ash', emoji: '⬜' },
  'ocean+wind': { name: 'wave', emoji: '🌊' },
  'mountain+wind': { name: 'avalanche', emoji: '🏔️' },
  'smoke+wind': { name: 'cloud', emoji: '☁️' },
  'cloud+water': { name: 'rainbow', emoji: '🌈' },
  'rainbow+fire': { name: 'prism', emoji: '🔺' },
  'brick+brick': { name: 'wall', emoji: '🧱' },
  'wall+wall': { name: 'castle', emoji: '🏰' },
  'castle+fire': { name: 'dragon', emoji: '🐉' },
  'dragon+water': { name: 'steam', emoji: '💨' },
  'ocean+fire': { name: 'salt', emoji: '🧂' },
  'earth+water': { name: 'clay', emoji: '🟤' },
  'clay+fire': { name: 'pottery', emoji: '🏺' },
  'wind+fire': { name: 'wildfire', emoji: '🔥' },
  'water+wind': { name: 'storm', emoji: '⛈️' },
  'earth+wind': { name: 'erosion', emoji: '🏔️' },
  'plant+earth': { name: 'forest', emoji: '🌲' },
  'forest+fire': { name: 'charcoal', emoji: '⬛' },
  'mud+mud': { name: 'swamp', emoji: '🐊' },
  'swamp+fire': { name: 'peat', emoji: '🟫' },
};

function getFallbackCombo(a, b) {
  const key = [a, b].sort().join('+');
  return FALLBACK[key] || null;
}

// ── result display ───────────────────────────────────────────────────────────

function showResult(result, x, y, isNew) {
  const canvas = document.getElementById('canvas');
  const flash = document.createElement('div');
  flash.className = 'combine-flash';
  flash.textContent = result.emoji;
  flash.style.left = (x - 16) + 'px';
  flash.style.top = (y - 16) + 'px';
  canvas.appendChild(flash);
  setTimeout(() => flash.remove(), 600);

  const toast = document.getElementById('toast');
  toast.innerHTML = isNew
    ? 'discovered: <span class="new">' + result.emoji + ' ' + result.name + '</span>!'
    : result.emoji + ' ' + result.name;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

// ── init ─────────────────────────────────────────────────────────────────────

init();

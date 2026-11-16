// silly craft - game logic (AI-powered via Groq)
// silly craft - game logic (AI-powered via Groq)

// ── state ────────────────────────────────────────────────────────────────────

const CACHE_KEY = 'silly-craft-cache';
const API_KEY_STORAGE = 'silly-craft-api-key';

const STARTERS = [
  { name: 'fire', emoji: '🔥' },
  { name: 'water', emoji: '💧' },
  { name: 'earth', emoji: '🌍' },
  { name: 'wind', emoji: '💨' },
];

const elements = new Map();
const comboCache = new Map();
let comboCount = 0;

const AI_CONTEXT = `You are the recipe generator for "silly craft", an infinite crafting game.
Combine two elements to create a new one. Think like Infinite Craft by neal.fun.

CONTEXT: Brain Liquidation Inc. (corporation, CEO is half a braincell, subsidiaries: nobro, potato computing, silly systems, neuron destruction llc, bread foundation). Objbox (the cube, the void, INTERLOPER). Silly Browser (desktop app, cube mascot). Silly Engine (Zig browser engine). SillyOS (from-scratch OS). Void Chess (rigged chess vs obj). Characters: lux, obj, evil lux, verity, jbo. Places: tabula mines, water world, netware, the void, geometry, farlands.

RULES:
- Combine two elements to create ONE new element
- Return JSON: {"name": "element name", "emoji": "single emoji"}
- Name: lowercase, 1-3 words max
- Be creative but logical
- Reference silly team lore when it makes sense
- NEVER return a starter element (fire, water, earth, wind)
- Return ONLY the JSON object`;

// ── recipes (built-in cache) ─────────────────────────────────────────────────

const RECIPES = {
  // tier 1: basic
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
  // tier 2
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
  'cloud+earth': { name: 'fog', emoji: '🌫️' },
  'fog+water': { name: 'mist', emoji: '🌫️' },
  'rain+wind': { name: 'hurricane', emoji: '🌀' },
  'ocean+earth': { name: 'beach', emoji: '🏖️' },
  'beach+wind': { name: 'sand', emoji: '🏖️' },
  'sand+fire': { name: 'glass', emoji: '🪟' },
  'glass+water': { name: 'aquarium', emoji: '🐟' },
  'glass+fire': { name: 'molten glass', emoji: '🫠' },
  'salt+water': { name: 'brine', emoji: '🧂' },
  'brine+fire': { name: 'salt flat', emoji: '🏜️' },
  'charcoal+water': { name: 'ink', emoji: '🖋️' },
  'ink+fire': { name: 'soot', emoji: '⬛' },
  'ash+wind': { name: 'dust', emoji: '🌪️' },
  'ash+water': { name: 'lye', emoji: '🧪' },
  'obsidian+water': { name: 'glass', emoji: '🪟' },
  'obsidian+fire': { name: 'magma', emoji: '🌋' },
  'magma+water': { name: 'lava', emoji: '🌋' },
  'magma+earth': { name: 'volcano', emoji: '🌋' },
  'volcano+wind': { name: 'eruption', emoji: '💥' },
  'eruption+water': { name: 'geyser', emoji: '💦' },
  'cloud+wind': { name: 'sky', emoji: '🌤️' },
  'sky+earth': { name: 'horizon', emoji: '🌅' },
  'sky+fire': { name: 'sunset', emoji: '🌇' },
  'sunset+water': { name: 'reflection', emoji: '🪞' },
  'mountain+water': { name: 'waterfall', emoji: '💧' },
  'waterfall+wind': { name: 'mist', emoji: '🌫️' },
  'tornado+water': { name: 'waterspout', emoji: '🌪️' },
  'tornado+fire': { name: 'firestorm', emoji: '🔥' },
  'firestorm+water': { name: 'steam', emoji: '💨' },
  'inferno+water': { name: 'steam', emoji: '💨' },
  'inferno+earth': { name: 'glass', emoji: '🪟' },
  'tree+tree': { name: 'forest', emoji: '🌲' },
  'forest+water': { name: 'jungle', emoji: '🌴' },
  'slime+fire': { name: 'rubber', emoji: '🟡' },
  'rubber+wind': { name: 'balloon', emoji: '🎈' },
  'balloon+fire': { name: 'explosion', emoji: '💥' },
  'explosion+earth': { name: 'crater', emoji: ' ' },
  'crater+water': { name: 'lake', emoji: '💧' },
  'lake+wind': { name: 'ripples', emoji: '🌊' },
  'lake+earth': { name: 'pond', emoji: '🐸' },
  'pond+plant': { name: 'algae', emoji: '🟢' },
  'cloud+fire': { name: 'smoke', emoji: '🌫️' },
  'rain+earth': { name: 'mud', emoji: '🟤' },
  'clay+water': { name: 'slime', emoji: '🟢' },
  'clay+earth': { name: 'pottery', emoji: '🏺' },
  'peat+fire': { name: 'smoke', emoji: '🌫️' },
  'salt+water': { name: 'brine', emoji: '🧂' },
  'brine+fire': { name: 'salt flat', emoji: '🏜️' },
  'ash+earth': { name: 'soil', emoji: '🟤' },
  'soil+water': { name: 'mud', emoji: '🟤' },
  'charcoal+water': { name: 'ink', emoji: '🖋️' },
  'ink+fire': { name: 'soot', emoji: '⬛' },
  'ocean+wind': { name: 'wave', emoji: '🌊' },
  // silly team themed
  'bread+fire': { name: 'toast', emoji: '🍞' },
  'bread+water': { name: 'soggy bread', emoji: '🍞' },
  'bread+earth': { name: 'sandwich', emoji: '🥪' },
  'bread+wind': { name: 'crumbs', emoji: '🍞' },
  'bread+bread': { name: 'loaf', emoji: '🍞' },
  'potato+fire': { name: 'fries', emoji: '🍟' },
  'potato+water': { name: 'mashed potato', emoji: '🥔' },
  'potato+earth': { name: 'potato', emoji: '🥔' },
  'brain+fire': { name: 'fried brain', emoji: '🧠' },
  'brain+water': { name: 'brain soup', emoji: '🧠' },
  'brain+earth': { name: 'fossil', emoji: '🦴' },
  'brain+wind': { name: 'thought', emoji: '💭' },
  'brain+brain': { name: 'big brain', emoji: '🧠' },
  'toast+bread': { name: 'breakfast', emoji: '☕' },
  'fries+potato': { name: 'loaded fries', emoji: '🍟' },
  'sandwich+bread': { name: 'double sandwich', emoji: '🥪' },
  'bread+cheese': { name: 'grilled cheese', emoji: '🧀' },
  'void+cube': { name: 'interloper', emoji: '⬛' },
  'void+fire': { name: 'dark flame', emoji: '🔥' },
  'void+water': { name: 'abyss', emoji: '🌊' },
  'void+earth': { name: 'void stone', emoji: '🪨' },
  'void+wind': { name: 'whisper', emoji: '💨' },
  'void+void': { name: 'the void', emoji: '⬛' },
  'cube+fire': { name: 'molten cube', emoji: '🧊' },
  'cube+water': { name: 'ice cube', emoji: '🧊' },
  'cube+earth': { name: 'stone cube', emoji: '⬜' },
  'cube+wind': { name: 'floating cube', emoji: '🧊' },
  'cube+cube': { name: 'double cube', emoji: '🧊' },
  'interloper+fire': { name: 'dark flame', emoji: '🔥' },
  'interloper+water': { name: 'abyss', emoji: '🌊' },
  'bread+void': { name: 'void bread', emoji: '🍞' },
  'potato+void': { name: 'void potato', emoji: '🥔' },
  'brain+void': { name: 'void brain', emoji: '🧠' },
  'ceo+lizard': { name: 'confused lizard', emoji: '🦎' },
  'ceo+bread': { name: 'bread ceo', emoji: '🍞' },
  'ceo+potato': { name: 'potato ceo', emoji: '🥔' },
  'ceo+brain': { name: 'half a braincell', emoji: '🧠' },
  'nobro+potato': { name: 'nobro potato', emoji: '🥔' },
  'nobro+bread': { name: 'nobro bread', emoji: '🍞' },
  'silly+fire': { name: 'silly fire', emoji: '🔥' },
  'silly+water': { name: 'silly water', emoji: '💧' },
  'obj+cube': { name: 'obj cube', emoji: '⬛' },
  'obj+void': { name: 'obj void', emoji: '⬛' },
  'verity+fire': { name: 'toasted verity', emoji: '🔥' },
  'verity+water': { name: 'wet verity', emoji: '💧' },
  'jbo+fire': { name: 'angry jbo', emoji: '😡' },
  'jbo+water': { name: 'wet jbo', emoji: '💧' },
  'nyarch+fire': { name: 'burned nyarch', emoji: '🔥' },
  'nyarch+void': { name: 'voided nyarch', emoji: '⬛' },
  'coffee+fire': { name: 'hot coffee', emoji: '☕' },
  'coffee+water': { name: 'iced coffee', emoji: '🧊' },
  'coffee+earth': { name: 'coffee grounds', emoji: '☕' },
  'coffee+bread': { name: 'breakfast', emoji: '☕' },
  'coffee+brain': { name: 'caffeinated brain', emoji: '🧠' },
  'silly+earth': { name: 'silly earth', emoji: '🌍' },
  'silly+wind': { name: 'silly wind', emoji: '💨' },
  'silly+silly': { name: 'very silly', emoji: '🤪' },
  'mountain+fire': { name: 'volcano', emoji: '🌋' },
  'volcano+water': { name: 'geyser', emoji: '💦' },
  'cloud+fire': { name: 'smoke', emoji: '🌫️' },
  'forest+fire': { name: 'charcoal', emoji: '⬛' },
  'ocean+fire': { name: 'salt', emoji: '🧂' },
  'earth+water': { name: 'clay', emoji: '🟤' },
  'clay+fire': { name: 'pottery', emoji: '🏺' },
  'wind+fire': { name: 'wildfire', emoji: '🔥' },
  'water+wind': { name: 'storm', emoji: '⛈️' },
  'plant+earth': { name: 'forest', emoji: '🌲' },
  'mud+mud': { name: 'swamp', emoji: '🐊' },
  'cloud+earth': { name: 'fog', emoji: '🌫️' },
  'rain+wind': { name: 'hurricane', emoji: '🌀' },
  'ocean+earth': { name: 'beach', emoji: '🏖️' },
  'beach+wind': { name: 'sand', emoji: '🏖️' },
  'sand+fire': { name: 'glass', emoji: '🪟' },
  'glass+water': { name: 'aquarium', emoji: '🐟' },
  'mountain+water': { name: 'waterfall', emoji: '💧' },
  'sky+fire': { name: 'sunset', emoji: '🌇' },
  'cloud+fire': { name: 'smoke', emoji: '🌫️' },
};

// ── init ─────────────────────────────────────────────────────────────────────

function init() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      if (data.elements) data.elements.forEach(el => elements.set(el.name, { emoji: el.emoji, isNew: false }));
      if (data.combos) Object.entries(data.combos).forEach(([k, v]) => comboCache.set(k, v));
      comboCount = data.comboCount || 0;
    }
  } catch (e) {}

  // pre-load RECIPES into cache
  Object.entries(RECIPES).forEach(([k, v]) => {
    if (!comboCache.has(k)) comboCache.set(k, v);
  });

  STARTERS.forEach(s => {
    if (!elements.has(s.name)) elements.set(s.name, { emoji: s.emoji, isNew: false });
  });

  const key = localStorage.getItem(API_KEY_STORAGE);
  if (key) {
    const apiKeyEl = document.getElementById('apiKey');
    if (apiKeyEl) apiKeyEl.value = key;
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
  localStorage.setItem(API_KEY_STORAGE, document.getElementById('apiKey').value.trim());
  updateApiStatus();
}

function updateApiStatus() {
  const key = localStorage.getItem(API_KEY_STORAGE);
  const status = document.getElementById('apiStatus');
  if (!status) return;
  if (key) {
    status.textContent = '✓ API key set — AI recipes enabled';
    status.style.color = '#5fd4b0';
  } else {
    status.textContent = 'no key set — using cached recipes';
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
  Array.from(elements.keys()).sort().forEach(name => {
    if (search && !name.includes(search)) return;
    const info = elements.get(name);
    const el = document.createElement('div');
    el.className = 'el' + (info.isNew ? ' new' : '');
    el.draggable = true;
    el.dataset.name = name;
    el.innerHTML = '<span class="emoji">' + info.emoji + '</span>' + name;
    el.addEventListener('dragstart', onDragStart);
    el.addEventListener('dragend', onDragEnd);
    grid.appendChild(el);
  });
  updateStats();
}

function filterElements() { renderElements(); }

function updateStats() {
  document.getElementById('discovered').textContent = elements.size;
  document.getElementById('combos').textContent = comboCount;
}

// ── drag and drop ───────────────────────────────────────────────────────────

let dragName = null;
let hoverTarget = null;

function onDragStart(e) {
  const el = e.target.closest('.el') || e.target.closest('.canvas-item');
  if (!el) return;
  dragName = el.dataset.name;
  e.dataTransfer.setData('text/plain', dragName);
  e.dataTransfer.effectAllowed = 'copyMove';
  el.classList.add('dragging');
}

function onDragEnd(e) {
  const el = e.target.closest('.el') || e.target.closest('.canvas-item');
  if (el) el.classList.remove('dragging');
  // remove hover highlights
  document.querySelectorAll('.canvas-item.hover-target').forEach(el => el.classList.remove('hover-target'));
  dragName = null;
  hoverTarget = null;
}

function findCanvasItemAt(x, y) {
  const items = document.querySelectorAll('.canvas-item');
  for (const item of items) {
    const rect = item.getBoundingClientRect();
    const canvasRect = document.getElementById('canvas').getBoundingClientRect();
    const ix = rect.left - canvasRect.left;
    const iy = rect.top - canvasRect.top;
    const iw = rect.width;
    const ih = rect.height;
    if (x >= ix && x <= ix + iw && y >= iy && y <= iy + ih) {
      return item;
    }
  }
  return null;
}

function setupDragDrop() {
  const canvas = document.getElementById('canvas');

  canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // find item under cursor
    const target = findCanvasItemAt(x, y);
    if (target && target.dataset.name !== dragName) {
      if (hoverTarget !== target) {
        if (hoverTarget) hoverTarget.classList.remove('hover-target');
        hoverTarget = target;
        target.classList.add('hover-target');
      }
    } else {
      if (hoverTarget) {
        hoverTarget.classList.remove('hover-target');
        hoverTarget = null;
      }
    }
  });

  canvas.addEventListener('dragleave', (e) => {
    // only clear if leaving canvas entirely
    if (e.target === canvas) {
      if (hoverTarget) {
        hoverTarget.classList.remove('hover-target');
        hoverTarget = null;
      }
    }
  });

  canvas.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const name = e.dataTransfer.getData('text/plain') || dragName;
    if (!name) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // remove hover highlight
    if (hoverTarget) {
      hoverTarget.classList.remove('hover-target');
    }

    // check if dropping on an existing canvas item
    const target = hoverTarget || findCanvasItemAt(x, y);
    if (target && target.dataset.name !== name) {
      await combine(name, target.dataset.name, x, y);
      hoverTarget = null;
      return;
    }

    hoverTarget = null;
    // just place the element on canvas
    placeElement(name, x - 30, y - 15);
  });

  // hide hint on first drag
  canvas.addEventListener('dragenter', () => {
    const hint = document.getElementById('hint');
    if (hint) hint.style.display = 'none';
  });
}

function placeElement(name, x, y) {
  const info = elements.get(name);
  if (!info) return;
  const item = document.createElement('div');
  item.className = 'canvas-item';
  item.dataset.name = name;
  item.style.left = Math.max(0, x) + 'px';
  item.style.top = Math.max(0, y) + 'px';
  item.innerHTML = '<span>' + info.emoji + '</span> ' + name;
  item.draggable = true;
  item.addEventListener('dragstart', onDragStart);
  item.addEventListener('dragend', onDragEnd);
  document.getElementById('canvas').appendChild(item);
}

// ── combination logic ────────────────────────────────────────────────────────

async function combine(a, b, x, y) {
  const key = [a, b].sort().join('+');

  // check cache
  if (comboCache.has(key)) {
    const result = comboCache.get(key);
    showResult(result, x, y);
    if (!elements.has(result.name)) {
      elements.set(result.name, { emoji: result.emoji, isNew: true });
      renderElements();
      saveCache();
    }
    comboCount++;
    updateStats();
    return;
  }

  const apiKey = localStorage.getItem(API_KEY_STORAGE);

  if (!apiKey) {
    // check RECIPES directly as fallback
    const fallback = getFallbackCombo(a, b);
    if (fallback) {
      comboCache.set(key, fallback);
      showResult(fallback, x, y);
      if (!elements.has(fallback.name)) {
        elements.set(fallback.name, { emoji: fallback.emoji, isNew: true });
        renderElements();
        saveCache();
      }
      comboCount++;
      updateStats();
      saveCache();
    } else {
      showToast('no recipe found. set an API key in settings for AI recipes.');
    }
    return;
  }

  // show loading
  const loadingEl = document.createElement('div');
  loadingEl.className = 'canvas-item loading';
  loadingEl.style.left = (x - 40) + 'px';
  loadingEl.style.top = (y - 15) + 'px';
  loadingEl.innerHTML = '<span>⏳</span> combining...';
  document.getElementById('canvas').appendChild(loadingEl);

  try {
    const result = await callAI(a, b);
    loadingEl.remove();

    if (result && result.name) {
      comboCache.set(key, result);
      showResult(result, x, y);
      if (!elements.has(result.name)) {
        elements.set(result.name, { emoji: result.emoji, isNew: true });
        renderElements();
        saveCache();
      }
      comboCount++;
      updateStats();
      saveCache();
    }
  } catch (e) {
    loadingEl.remove();
    console.error('AI error:', e);
    const fallback = getFallbackCombo(a, b);
    if (fallback) {
      comboCache.set(key, fallback);
      showResult(fallback, x, y);
      if (!elements.has(fallback.name)) {
        elements.set(fallback.name, { emoji: fallback.emoji, isNew: true });
        renderElements();
        saveCache();
      }
      comboCount++;
      updateStats();
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
      temperature: 0.9,
      max_tokens: 50
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error('API error ' + response.status);
  }

  const data = await response.json();
  const content = data.choices[0].message.content.trim();

  let jsonStr = content;
  if (jsonStr.includes('```')) {
    jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  }

  const result = JSON.parse(jsonStr);
  if (!result.name || !result.emoji) throw new Error('invalid AI response');
  return { name: result.name.toLowerCase(), emoji: result.emoji };
}

function getFallbackCombo(a, b) {
  const key = [a, b].sort().join('+');
  return RECIPES[key] || null;
}

// ── result display ───────────────────────────────────────────────────────────

function showResult(result, x, y) {
  const canvas = document.getElementById('canvas');
  const flash = document.createElement('div');
  flash.className = 'combine-flash';
  flash.textContent = result.emoji;
  flash.style.left = (x - 16) + 'px';
  flash.style.top = (y - 16) + 'px';
  canvas.appendChild(flash);
  setTimeout(() => flash.remove(), 700);

  const toast = document.getElementById('toast');
  toast.innerHTML = (result.isNew ? 'discovered: <span class="new">' : '') + result.emoji + ' ' + result.name + (result.isNew ? '</span>!' : '');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

// ── clear canvas ─────────────────────────────────────────────────────────────

function clearCanvas() {
  document.getElementById('canvas').querySelectorAll('.canvas-item, .combine-flash').forEach(e => e.remove());
  const hint = document.getElementById('hint');
  if (hint) hint.style.display = 'block';
}

// ── start ────────────────────────────────────────────────────────────────────

init();

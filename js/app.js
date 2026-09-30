/* ============================================================
   js/app.js – Hoved-logik, global state og UI-hjælpere
   ============================================================ */

const defaultNames = [
    "Emma", "Noah", "Ida", "Victor", "Clara", "Oliver",
    "Sofia", "Oscar", "Freja", "William", "Ella", "Malthe",
    "Alma", "Lucas", "Agnes", "Emil", "Anna", "Carl",
    "Laura", "Valdemar"
];

const LS_NAMES    = 'gruppegenerator_names';
const LS_SETTINGS = 'gruppegenerator_settings';

// --- Global state -------------------------------------------
let allocationMode = 'groups';
let namingStyle    = 'number';
let drawMethod     = 'auto';
let targetValue    = 4;

let groupAssignments        = [];
let currentDrawIndex        = 0;
let remainingStudentsInPool = [];
let isDrawingRoutineActive  = false;
let animationSpeed          = 3;

// --- Lodtrækningsforløb ------------------------------------
let drawFlow = 'auto'; // 'auto', 'order', 'button', 'draw'

let remainingGroupQueue = []; // Bruges i stop-tilstand
let pendingNames        = []; // Names der køres igennem multi-trin-flowet

// Seeded random (sættes af entropy-skærmen)
let seededRandom = null;

// --- Entropy state -------------------------------------------
let entropyHash              = 0;
let entropyCurrentStudentIdx = 0;
let entropyStudentsDone      = [];
let entropyStrokesForCurrent = 0;
let entropyAbortController   = null;
let entropyStudentColors     = [];    // Unikke farver per elev (indeks = elevnummer)

// --- Farvepalet til gruppe-navne ----------------------------
const groupColors = [
    { name: "Blå Gruppe",      bg: "#e0f2fe", text: "#0369a1", border: "#7dd3fc" },
    { name: "Grøn Gruppe",     bg: "#dcfce7", text: "#15803d", border: "#86efac" },
    { name: "Gul Gruppe",      bg: "#fef9c3", text: "#a16207", border: "#fde047" },
    { name: "Rød Gruppe",      bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5" },
    { name: "Lilla Gruppe",    bg: "#f3e8ff", text: "#7e22ce", border: "#d8b4fe" },
    { name: "Orange Gruppe",   bg: "#ffedd5", text: "#c2410c", border: "#fdba74" },
    { name: "Turkis Gruppe",   bg: "#ccfbf1", text: "#0f766e", border: "#5eead4" },
    { name: "Lyserød Gruppe",  bg: "#fce7f3", text: "#be185d", border: "#f9a8d4" },
    { name: "Lime Gruppe",     bg: "#ecfccb", text: "#4d7c0f", border: "#bef264" },
    { name: "Indigo Gruppe",   bg: "#e0e7ff", text: "#4338ca", border: "#a5b4fc" }
];

// --- Toggle-knap klasser ------------------------------------
const BTN_ACTIVE   = 'flex-1 py-2 text-xs sm:text-sm rounded-md bg-teal-600 text-white font-bold shadow-sm transition-all';
const BTN_INACTIVE = 'flex-1 py-2 text-xs sm:text-sm rounded-md text-slate-500 hover:bg-stone-200 transition-all font-medium';

function activateBtn(activeEl, inactiveEl) {
    activeEl.className   = BTN_ACTIVE;
    inactiveEl.className = BTN_INACTIVE;
}

// --- DOM-referencer -----------------------------------------
const els = {
    namesInput:           document.getElementById('namesInput'),
    studentCount:         document.getElementById('studentCount'),
    numberDisplay:        document.getElementById('numberDisplay'),
    numberLabel:          document.getElementById('numberLabel'),
    groupPreview:         document.getElementById('groupPreview'),
    modeGroupsBtn:        document.getElementById('modeGroupsBtn'),
    modeSizeBtn:          document.getElementById('modeSizeBtn'),
    nameNumBtn:           document.getElementById('nameNumBtn'),
    nameColBtn:           document.getElementById('nameColBtn'),
    toggleAnimation:      document.getElementById('toggleAnimation'),
    toggleSound:          document.getElementById('toggleSound'),
    toggleConfetti:       document.getElementById('toggleConfetti'),
    speedSlider:          document.getElementById('speedSlider'),
    speedLabel:           document.getElementById('speedLabel'),
    animationSettingsBlock: document.getElementById('animationSettingsBlock'),
    stopBtnContainer:     document.getElementById('stopBtnContainer'),
    poolArea:             document.getElementById('poolArea'),
    poolTitle:            document.getElementById('poolTitle'),
    poolStatusText:       document.getElementById('poolStatusText'),
    poolCountDisplay:     document.getElementById('poolCountDisplay'),
    studentPool:          document.getElementById('studentPool'),
    groupGrid:            document.getElementById('groupGrid'),
    resultActions:        document.getElementById('resultActions'),
    emptyState:           document.getElementById('emptyState'),
    controlPanel:         document.getElementById('controlPanel'),
    resultsArea:          document.getElementById('resultsArea'),
    toastContainer:       document.getElementById('toast-container'),
    entropyModal:         document.getElementById('entropyModal'),
    entropyModalTitle:    document.getElementById('entropyModalTitle'),
    entropyModalSubtitle: document.getElementById('entropyModalSubtitle'),
    entropyCanvas:        document.getElementById('entropyCanvas'),
    entropyCurrentName:   document.getElementById('entropyCurrentName'),
    entropyProgress:      document.getElementById('entropyProgress'),
    entropySeedDisplay:   document.getElementById('entropySeedDisplay'),
    entropyBar:           document.getElementById('entropyBar'),
    entropyStudentList:   document.getElementById('entropyStudentList'),
    entropyCanvasHint:    document.getElementById('entropyCanvasHint'),
    entropyNextBtn:       document.getElementById('entropyNextBtn'),
    entropyNextBtnText:   document.getElementById('entropyNextBtnText'),
    entropyStartBtn:      document.getElementById('entropyStartBtn'),
    entropyStartBtnText:  document.getElementById('entropyStartBtnText'),
    entropyGroupReveal:   document.getElementById('entropyGroupReveal'),
    orderModal:           document.getElementById('orderModal'),
    orderModalTitle:      document.getElementById('orderModalTitle'),
    orderModalSubtitle:   document.getElementById('orderModalSubtitle'),
    orderList:            document.getElementById('orderList'),
    orderVerifyText:      document.getElementById('orderVerifyText'),
    toggleSecret:         document.getElementById('toggleSecret'),
};

// ============================================================
// localStorage
// ============================================================

function saveToStorage() {
    const s = {
        names: els.namesInput.value,
        targetValue,
        allocationMode,
        namingStyle,
        drawFlow,
        animationSpeed,
        anim: els.toggleAnimation.checked,
        sound: els.toggleSound.checked,
        conf: els.toggleConfetti.checked,
        secret: els.toggleSecret.checked
    };
    localStorage.setItem('gruppeGenState_v3', JSON.stringify(s));
}

function loadFromStorage() {
    try {
        const d = localStorage.getItem('gruppeGenState_v3');
        if (d) {
            const s = JSON.parse(d);
            els.namesInput.value = s.names || defaultNames.join('\n');
            targetValue = s.targetValue || 4;
            setMode(s.allocationMode || 'groups');
            setNamingStyle(s.namingStyle || 'number');
            setAnimationSpeed(s.animationSpeed || 3);

            if (typeof s.anim === 'boolean') els.toggleAnimation.checked = s.anim;
            if (typeof s.sound === 'boolean') els.toggleSound.checked = s.sound;
            if (typeof s.conf === 'boolean') els.toggleConfetti.checked = s.conf;
            if (typeof s.secret === 'boolean') els.toggleSecret.checked = s.secret;

            if (s.drawFlow) {
                setDrawFlow(s.drawFlow);
                const radio = document.querySelector(`input[name="drawFlow"][value="${s.drawFlow}"]`);
                if (radio) radio.checked = true;
            } else {
                // Hvis der var gamle settings gemt
                if (s.entropy) setDrawFlow('draw');
                else if (s.stopMode) setDrawFlow('button');
                else if (s.showOrder) setDrawFlow('order');
                else setDrawFlow('auto');
                
                const radio = document.querySelector(`input[name="drawFlow"][value="${drawFlow}"]`);
                if (radio) radio.checked = true;
            }
        } else {
            els.namesInput.value = defaultNames.join('\n');
        }
    } catch (e) { els.namesInput.value = defaultNames.join('\n'); }
}

// ============================================================
// Init
// ============================================================

window.onload = () => {
    loadFromStorage();
    updateStudentCount();
    updatePreview();
    els.namesInput.addEventListener('input', () => { updateStudentCount(); updatePreview(); saveToStorage(); });
    [els.toggleAnimation, els.toggleSound, els.toggleConfetti, els.toggleSecret].forEach(t => t.addEventListener('change', saveToStorage));
};

// ============================================================
// Hjælpe-funktioner
// ============================================================

/** Mulberry32 – simpel seeded random number generator. */
function mulberry32(seed) {
    return function () {
        seed |= 0;
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Fisher-Yates shuffle – bruger seededRandom hvis sat. */
function shuffleArray(arr) {
    const a   = [...arr];
    const rng = seededRandom || Math.random.bind(Math);
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * Genererer n unikke farver jævnt fordelt rundt om farvehjulet og shuffler dem,
 * så ingen to elever har samme farve og ingen forudsigelig regnbue-rækkefølge.
 */
function generateStudentColors(n) {
    const colors = [];
    for (let i = 0; i < n; i++) {
        const hue = Math.round((i / n) * 360);
        const sat = 65 + (i % 3) * 10; // 65 / 75 / 85 %
        const lit = 52 + (i % 2) * 10; // 52 / 62 %
        colors.push(`hsl(${hue}, ${sat}%, ${lit}%)`);
    }
    return shuffleArray(colors); // tilfældig fordeling af farver til elever
}

function updateStudentCount() {
    els.studentCount.innerText = els.namesInput.value.split('\n').filter(n => n.trim() !== '').length;
}

// --- Hastighed ----------------------------------------------
const SPEED_LABELS = ['Meget langsom','Langsom','Medium','Hurtig','Meget hurtig'];

function getSpeedConfig() {
    return [
        { interval: 220, maxCycles: 14, selectDelay: 1400, stepDelay: 600 },
        { interval: 160, maxCycles: 11, selectDelay: 1000, stepDelay: 450 },
        { interval: 120, maxCycles:  8, selectDelay:  800, stepDelay: 300 },
        { interval:  75, maxCycles:  6, selectDelay:  500, stepDelay: 180 },
        { interval:  35, maxCycles:  4, selectDelay:  260, stepDelay:  80 },
    ][animationSpeed - 1];
}

function setAnimationSpeed(value) {
    animationSpeed             = Number(value);
    els.speedSlider.value      = animationSpeed;
    els.speedLabel.textContent = SPEED_LABELS[animationSpeed - 1];
    saveToStorage();
}

// --- Preview ------------------------------------------------
function updatePreview() {
    const names = els.namesInput.value.split('\n').filter(n => n.trim() !== '');
    const n     = names.length;
    if (n === 0) { els.groupPreview.textContent = ''; return; }
    let text;
    if (allocationMode === 'groups') {
        const G = targetValue;
        if (G > n) { els.groupPreview.textContent = `OBS: Flere grupper (${G}) end elever (${n})`; return; }
        const base = Math.floor(n / G), rem = n % G;
        text = rem === 0
            ? `${n} elever, ${G} grupper a ${base}`
            : `${n} elever, ${rem} grupper a ${base + 1} og ${G - rem} a ${base}`;
    } else {
        const S = targetValue, numG = Math.max(1, Math.ceil(n / S));
        const last = n - (numG - 1) * S;
        text = (n % S === 0) ? `${n} elever, ${numG} grupper a ${S}` : `${n} elever, ${numG - 1} grupper a ${S} og 1 a ${last}`;
    }
    els.groupPreview.textContent = text;
}

// --- Mode-sættere -------------------------------------------
function setMode(mode) {
    allocationMode = mode;
    if (mode === 'groups') { activateBtn(els.modeGroupsBtn, els.modeSizeBtn); els.numberLabel.innerText = 'Antal Grupper'; if (targetValue > 20) targetValue = 5; }
    else                   { activateBtn(els.modeSizeBtn, els.modeGroupsBtn); els.numberLabel.innerText = 'Elever pr. gruppe'; if (targetValue > 10) targetValue = 4; }
    els.numberDisplay.innerText = targetValue;
    updatePreview(); saveToStorage();
}
function setNamingStyle(style) { namingStyle = style; style === 'number' ? activateBtn(els.nameNumBtn, els.nameColBtn) : activateBtn(els.nameColBtn, els.nameNumBtn); saveToStorage(); }
function changeNumber(delta) { const max = allocationMode === 'groups' ? 20 : 10; targetValue = Math.max(1, Math.min(max, targetValue + delta)); els.numberDisplay.innerText = targetValue; updatePreview(); saveToStorage(); }

function setDrawFlow(flow) {
    drawFlow = flow;
    saveToStorage();
}

// ============================================================
// Gruppe-kort builder (deles af normal og kombineret flow)
// ============================================================

function buildGroupCards(numGroups) {
    els.groupGrid.innerHTML = '';
    for (let i = 0; i < numGroups; i++) {
        const card = document.createElement('div');
        card.id    = `group-card-${i}`;
        card.className = 'glass-panel p-4 flex flex-col gap-2 relative h-fit';

        let groupTitle = `Gruppe ${i + 1}`, badgeText = `Grp ${i + 1}`;
        let headerStyle = '', badgeStyle = 'background-color: #f5f5f4; color: #78716c; border-color: #e7e5e4;', dotHtml = '';

        if (namingStyle === 'color') {
            const c     = groupColors[i % groupColors.length];
            const sfx   = i >= groupColors.length ? ` (${Math.floor(i / groupColors.length) + 1})` : '';
            groupTitle  = c.name + sfx; badgeText = c.name.split(' ')[0] + sfx;
            headerStyle = `color: ${c.text}; border-bottom-color: ${c.border};`;
            badgeStyle  = `background-color: ${c.bg}; color: ${c.text}; border-color: ${c.border};`;
            dotHtml     = `<span class="inline-block w-3.5 h-3.5 rounded-full mr-1.5 shadow-sm border border-black/10" style="background-color: ${c.text}"></span>`;
        }
        card.innerHTML = `
            <div class="absolute top-0 right-0 text-[10px] uppercase tracking-wider px-3 py-1 rounded-bl-xl rounded-tr-[14px] font-bold border-l border-b" style="${badgeStyle}">${badgeText}</div>
            <h3 class="text-base font-bold mb-2 border-b pb-2 flex items-center" style="${headerStyle || 'color: #334155; border-bottom-color: #f5f5f4;'}">${dotHtml}${groupTitle}</h3>
            <div id="group-content-${i}" class="flex flex-col gap-1.5 min-h-[40px]"></div>`;
        els.groupGrid.appendChild(card);
    }
}

// ============================================================
// Entropy – alle elever tegner tilfældighedstallet
// ============================================================

function showEntropyScreen(names) {
    entropyHash              = 0;
    entropyCurrentStudentIdx = 0;
    entropyStudentsDone      = names.map(() => 'pending');
    entropyStrokesForCurrent = 0;

    // Unikke shufflede farver – ingen to elever deler farve
    entropyStudentColors = generateStudentColors(names.length);

    // Tilpas header
    els.entropyModalTitle.textContent    = 'Alle elever bidrager til tilfældighedstallet';
    els.entropyModalSubtitle.textContent = 'Hvert navn I tegner blandes ind i lodtrækningens tilfældighedstal';
    els.entropyStartBtn.parentElement.classList.remove('hidden');

    // Byg elevliste
    const list = els.entropyStudentList;
    list.innerHTML = '';
    names.forEach((name, i) => {
        const li     = document.createElement('li');
        li.id        = `entropy-li-${i}`;
        li.className = 'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-default';
        li.innerHTML = `<span id="entropy-dot-${i}" class="w-4 h-4 shrink-0 rounded-full border-2 border-stone-300 flex items-center justify-center text-[8px] transition-all"></span><span class="truncate text-slate-600">${name}</span>`;
        list.appendChild(li);
    });

    // Vis modal og setup canvas
    els.entropyModal.classList.remove('hidden');
    requestAnimationFrame(() => {
        const canvas  = els.entropyCanvas;
        canvas.width  = canvas.offsetWidth  || 400;
        canvas.height = canvas.offsetHeight || 220;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setupEntropyCanvas(canvas, ctx, names);
        updateEntropyStudentDisplay(names);
    });
}

function setupEntropyCanvas(canvas, ctx, names) {
    if (entropyAbortController) entropyAbortController.abort();
    entropyAbortController = new AbortController();
    const { signal } = entropyAbortController;
    let isDown = false;

    function getXY(e) {
        const rect = canvas.getBoundingClientRect();
        const src  = e.touches ? e.touches[0] : e;
        return {
            x: Math.round((src.clientX - rect.left) * (canvas.width  / rect.width)),
            y: Math.round((src.clientY - rect.top)  * (canvas.height / rect.height)),
        };
    }

    function onStart(e) {
        e.preventDefault();
        isDown = true;
        const {x, y} = getXY(e);
        ctx.beginPath(); ctx.moveTo(x, y);
        addEntropyPoint(x, y, names);
        els.entropyCanvasHint.style.opacity = '0';
    }

    function onMove(e) {
        if (!isDown) return;
        e.preventDefault();
        const {x, y} = getXY(e);
        // Unik farve for denne elev
        const color = entropyStudentColors[entropyCurrentStudentIdx] || '#14b8a6';
        ctx.strokeStyle = color;
        ctx.lineWidth   = 3.5;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
        ctx.lineTo(x, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y);
        addEntropyPoint(x, y, names);
    }

    function onEnd() { isDown = false; ctx.beginPath(); }

    canvas.addEventListener('mousedown',  onStart, { signal, passive: false });
    canvas.addEventListener('mousemove',  onMove,  { signal, passive: false });
    canvas.addEventListener('mouseup',    onEnd,   { signal });
    canvas.addEventListener('mouseleave', onEnd,   { signal });
    canvas.addEventListener('touchstart', onStart, { signal, passive: false });
    canvas.addEventListener('touchmove',  onMove,  { signal, passive: false });
    canvas.addEventListener('touchend',   onEnd,   { signal, passive: false });
}

function addEntropyPoint(x, y, names) {
    const t     = Date.now() % 100000;
    entropyHash = ((entropyHash * 1664525 + x * 22695477 + y * 1013904223 + t * 6364136) >>> 0);
    entropyStrokesForCurrent++;

    if (entropyStrokesForCurrent === 8) enableEntropyNextBtn(names);
    updateEntropyMeter(names);
}

function enableEntropyNextBtn(names) {
    els.entropyNextBtn.disabled = false;
    els.entropyNextBtn.classList.remove('bg-stone-200', 'text-stone-400', 'cursor-not-allowed');
    els.entropyNextBtn.classList.add('bg-teal-600', 'hover:bg-teal-700', 'text-white', 'cursor-pointer');

    const next = names[entropyCurrentStudentIdx + 1];
    els.entropyNextBtnText.textContent = next ? `Næste: ${next} →` : 'Færdig! →';
}

function updateEntropyMeter(names) {
    const done    = entropyStudentsDone.filter(s => s !== 'pending').length;
    const total   = names.length;
    const fmt     = entropyHash.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
    els.entropySeedDisplay.textContent = fmt || '–';
    els.entropyBar.style.width         = (total > 0 ? (done / total) * 100 : 0) + '%';
    els.entropyProgress.textContent    = `${done} ud af ${total} elever`;
}

function updateEntropyStudentDisplay(names) {
    if (entropyCurrentStudentIdx >= names.length) {
        els.entropyCurrentName.textContent = 'Alle har tegnet!';
        els.entropyProgress.textContent    = `${names.length} ud af ${names.length} elever`;

        // Aktiver start-knap
        els.entropyStartBtn.disabled = false;
        els.entropyStartBtn.classList.remove('bg-stone-200', 'text-stone-400', 'cursor-not-allowed');
        els.entropyStartBtn.classList.add('bg-teal-600', 'hover:bg-teal-700', 'text-white', 'cursor-pointer');
        els.entropyStartBtnText.textContent = 'Brug dette tal og start lodtrækning';

        els.entropyNextBtn.disabled = true;
        els.entropyNextBtn.classList.remove('bg-teal-600','hover:bg-teal-700','text-white','cursor-pointer');
        els.entropyNextBtn.classList.add('bg-stone-200','text-stone-400','cursor-not-allowed');
        els.entropyNextBtnText.textContent = 'Alle er med!';
        return;
    }

    const name = names[entropyCurrentStudentIdx];
    els.entropyCurrentName.textContent = name;
    entropyStrokesForCurrent = 0;

    // Nulstil næste-knap
    els.entropyNextBtn.disabled = true;
    els.entropyNextBtn.classList.remove('bg-teal-600','hover:bg-teal-700','text-white','cursor-pointer');
    els.entropyNextBtn.classList.add('bg-stone-200','text-stone-400','cursor-not-allowed');
    els.entropyNextBtnText.textContent = 'Tegn noget først...';
    els.entropyCanvasHint.style.opacity = '1';
    els.entropyGroupReveal.classList.add('hidden');

    // Opdater liste-visning
    names.forEach((_, i) => {
        const li  = document.getElementById(`entropy-li-${i}`);
        const dot = document.getElementById(`entropy-dot-${i}`);
        if (!li || !dot) return;

        // Reset klasser
        li.className = 'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-default ';

        if (entropyStudentsDone[i] === 'done') {
            li.className  += 'text-slate-400';
            dot.style.borderColor = '#14b8a6';
            dot.style.color       = '#14b8a6';
            dot.textContent = 'v'; // simpelt "done"-mærke
        } else if (entropyStudentsDone[i] === 'skipped') {
            li.className    += 'text-slate-300';
            dot.style.borderColor = '#d1d5db';
            dot.style.color       = '#d1d5db';
            dot.textContent = '-';
        } else if (i === entropyCurrentStudentIdx) {
            li.className  += 'bg-teal-50 text-slate-800 font-semibold ring-1 ring-teal-300';
            const color   = entropyStudentColors[i] || '#14b8a6';
            dot.style.borderColor = color;
            dot.style.color       = color;
            dot.style.backgroundColor = color + '33';
            dot.textContent       = ''; // bare farvet cirkel
            li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else {
            li.className  += 'text-slate-400';
            dot.style.borderColor = '#d1d5db';
            dot.style.color       = '';
            dot.style.backgroundColor = '';
            dot.textContent = '';
        }
    });
}

// ── Fælles "næste"-handling: normal eller kombineret ---------

function entropyNextAction() {
    nextEntropyStudent();
}

function nextEntropyStudent() {
    entropyStudentsDone[entropyCurrentStudentIdx] = 'done';
    entropyCurrentStudentIdx++;
    updateEntropyStudentDisplay(pendingNames);
    updateEntropyMeter(pendingNames);
}

function skipEntropyStudent() {
    entropyStudentsDone[entropyCurrentStudentIdx] = 'skipped';
    entropyCurrentStudentIdx++;
    updateEntropyStudentDisplay(pendingNames);
    updateEntropyMeter(pendingNames);

    if (entropyCurrentStudentIdx >= pendingNames.length) {
        setTimeout(confirmEntropy, 800);
    }
}

function confirmEntropy() {
    // startGenerationPhase2 has a guard to prevent double execution.
    seededRandom = mulberry32(entropyHash);
    els.entropyModal.classList.add('hidden');
    if (entropyAbortController) entropyAbortController.abort();
    startGenerationPhase2(pendingNames);
}

// ============================================================
// Ordre-preview – vis trækrækkefølge inden animation
// ============================================================

function showOrderPreview(names, assignments) {
    const list = els.orderList;
    list.innerHTML = '';
    const isStopMode = (drawFlow === 'button') && els.toggleAnimation.checked;

    if (isStopMode) {
        els.orderModalTitle.textContent = "Tilfældig gruppe-kø";
        els.orderModalSubtitle.textContent = "Tjek at fordelingen af pladser er jævn";
        const hdr = document.createElement('p');
        hdr.className   = 'text-stone-500 text-xs mb-2 px-1';
        hdr.textContent = 'Gruppe-køen – fordelingen er fair og tilfældig:';
        list.appendChild(hdr);
        remainingGroupQueue.forEach((gIdx, i) => {
            const item = document.createElement('div');
            item.className = 'flex items-center gap-3 px-3 py-2 rounded-lg bg-stone-100 border border-stone-200 text-sm';
            item.innerHTML = `<span class="text-stone-400 font-mono w-5 text-right shrink-0">${i + 1}.</span><span class="font-medium text-slate-700">${getGroupNameText(gIdx)}</span>`;
            list.appendChild(item);
        });
        els.orderVerifyText.textContent = `${names.length} pladser fordelt ligeligt ✓`;
    } else if (els.toggleSecret.checked) {
        els.orderModalTitle.textContent = "Deltagerliste";
        els.orderModalSubtitle.textContent = "Tjek at alle navne er med (Alfabetisk)";
        const sortedNames = [...names].sort((a, b) => a.localeCompare(b, 'da'));
        sortedNames.forEach((n, i) => {
            const item = document.createElement('div');
            item.className = 'flex items-center gap-3 px-3 py-2 rounded-lg bg-stone-100 border border-stone-200 text-sm';
            item.innerHTML = `<span class="text-stone-400 font-mono w-5 text-right shrink-0">${i + 1}.</span><span class="font-medium text-slate-700">${n}</span>`;
            list.appendChild(item);
        });
        els.orderVerifyText.textContent = `Alle ${names.length} navne er med ✓`;
    } else {
        els.orderModalTitle.textContent = "Tilfældig trækrækkefølge";
        els.orderModalSubtitle.textContent = "Tjek at alle navne er med – i tilfældig rækkefølge";
        assignments.forEach((task, i) => {
            const item = document.createElement('div');
            item.className = 'flex items-center gap-3 px-3 py-2 rounded-lg bg-stone-100 border border-stone-200 text-sm';
            item.innerHTML = `<span class="text-stone-400 font-mono w-5 text-right shrink-0">${i + 1}.</span><span class="font-medium text-slate-700">${task.name}</span>`;
            list.appendChild(item);
        });
        els.orderVerifyText.textContent = `Alle ${names.length} navne er med ✓`;
    }
    els.orderModal.classList.remove('hidden');
}

function confirmOrderAndStart() {
    if (els.orderModal.classList.contains('hidden')) return;
    els.orderModal.classList.add('hidden');
    runAnimation();
}

// ============================================================
// Genererings-flow
// ============================================================

function startGeneration() {
    if (isDrawingRoutineActive) return;
    initAudio();

    const names = els.namesInput.value.split('\n').map(n => n.trim()).filter(n => n !== '');
    if (names.length === 0) { showMessage('Listen er tom. Indtast venligst navne først.'); return; }

    seededRandom = null;

    if (drawFlow === 'draw') {
        // Sorter alfabetisk, så eleverne tegner i rækkefølge
        pendingNames = [...names].sort((a, b) => a.localeCompare(b, 'da'));
        showEntropyScreen(pendingNames, false);
    } else {
        pendingNames = names;
        startGenerationPhase2(names);
    }
}

function startGenerationPhase2(names) {
    if (isDrawingRoutineActive) return;
    isDrawingRoutineActive = true;

    // Klargør layout
    els.emptyState.classList.add('hidden');
    els.resultActions.classList.add('hidden');
    els.groupGrid.innerHTML   = '';
    els.studentPool.innerHTML = '';
    els.resultsArea.classList.remove('hidden');
    els.resultsArea.classList.add('flex');

    if (window.innerWidth < 768) els.controlPanel.classList.add('hidden');
    else els.controlPanel.classList.add('opacity-50', 'pointer-events-none');

    const numGroups = allocationMode === 'size'
        ? Math.max(1, Math.ceil(names.length / targetValue))
        : targetValue;

    buildGroupCards(numGroups);

    // Byg assignments
    groupAssignments        = [];
    remainingGroupQueue     = [];
    const isStopMode        = (drawFlow === 'button') && els.toggleAnimation.checked;

    if (isStopMode) {
        const queueRaw = names.map((_, i) => i % numGroups);
        remainingGroupQueue     = shuffleArray(queueRaw);
        remainingStudentsInPool = shuffleArray(names.map((name, uid) => ({ name, uid })));
    } else {
        const idx = shuffleArray(names.map((_, i) => i));
        idx.forEach((uid, pos) => groupAssignments.push({ name: names[uid], uid, targetGroup: pos % numGroups }));
        groupAssignments        = shuffleArray(groupAssignments);
        remainingStudentsInPool = idx.map(uid => ({ name: names[uid], uid }));
    }

    currentDrawIndex = 0;

    if (drawFlow === 'order' && els.toggleAnimation.checked) {
        showOrderPreview(names, groupAssignments);
    } else {
        runAnimation();
    }
}

function runAnimation() {
    const isStopMode = (drawFlow === 'button') && els.toggleAnimation.checked;

    if (els.toggleAnimation.checked) {
        els.poolArea.classList.remove('hidden');
        els.poolArea.classList.add('flex');

        const chipSource = isStopMode ? remainingStudentsInPool : groupAssignments;
        chipSource.forEach(item => {
            const chip = document.createElement('div');
            chip.className   = 'student-chip in-pool px-3 py-1.5 rounded-full text-sm font-semibold border shadow-sm';
            chip.textContent = els.toggleSecret.checked ? '???' : item.name;
            chip.dataset.uid = item.uid;
            els.studentPool.appendChild(chip);
        });

        updatePoolCount();

        els.poolTitle.innerText = isStopMode ? 'Puljen – en elev trykker TRÆK!' : 'Puljen (Maskinen trækker lod)';
        setTimeout(executeAutoDrawStep, 800);
    } else {
        instantDistribute();
    }
}

function instantDistribute() {
    els.poolArea.classList.add('hidden');
    els.poolArea.classList.remove('flex');
    groupAssignments.forEach(task => {
        const container = document.getElementById(`group-content-${task.targetGroup}`);
        if (container) {
            const chip = document.createElement('div');
            chip.className   = 'student-chip placed px-3 py-2 rounded-lg text-sm font-medium flex border shadow-sm';
            chip.textContent = task.name; // Instant afslører altid alt
            container.appendChild(chip);
        }
    });
    finishGeneration();
}

function finishGeneration() {
    isDrawingRoutineActive = false;
    els.poolStatusText.innerHTML = `<span class="text-emerald-700 font-bold">Lodtrækning fuldført!</span>`;
    els.stopBtnContainer.classList.add('hidden');

    let delayBeforeHidePool = 1500;

    // Afslør navne, hvis secret mode var tændt
    if (els.toggleSecret.checked && els.toggleAnimation.checked) {
        const secretChips = document.querySelectorAll('.secret-chip');
        secretChips.forEach((chip, i) => {
            setTimeout(() => {
                chip.textContent = chip.dataset.secretName;
                chip.classList.remove('secret-chip');
                chip.classList.add('bg-teal-50', 'transition-colors', 'duration-500');
                playSound('tick');
            }, i * 150 + 500); 
        });
        delayBeforeHidePool = (secretChips.length * 150) + 1500;
    }

    setTimeout(() => {
        els.poolArea.classList.add('hidden');
        els.poolArea.classList.remove('flex');
        els.resultActions.classList.remove('hidden');
    }, delayBeforeHidePool);
    
    setTimeout(() => {
        els.controlPanel.classList.remove('opacity-50', 'pointer-events-none');
        playSound('tada');
        if (els.toggleConfetti.checked) fireConfetti();
    }, delayBeforeHidePool - 1000);
}

function resetApp() {
    els.groupGrid.innerHTML   = '';
    els.studentPool.innerHTML = '';
    els.poolArea.classList.add('hidden');
    els.poolArea.classList.remove('flex');
    els.stopBtnContainer.classList.add('hidden');
    els.resultActions.classList.add('hidden');
    els.emptyState.classList.remove('hidden');
    els.controlPanel.classList.remove('hidden', 'opacity-50', 'pointer-events-none');
    if (window.innerWidth < 768) { els.resultsArea.classList.add('hidden'); els.resultsArea.classList.remove('flex'); }
    isDrawingRoutineActive  = false;
    currentDrawIndex        = 0;
    groupAssignments        = [];
    remainingStudentsInPool = [];
    remainingGroupQueue     = [];
    pendingNames            = [];
    seededRandom            = null;
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
}

// ============================================================
// UI-hjælpere
// ============================================================

function showMessage(msg) {
    const toast = document.createElement('div');
    toast.className = 'bg-stone-800 text-stone-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 border border-stone-700';
    toast.innerHTML = `<svg class="w-5 h-5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg> ${msg}`;
    els.toastContainer.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(10px)'; setTimeout(() => toast.remove(), 300); }, 4000);
}

function getGroupNameText(groupIndex) {
    if (namingStyle === 'color') {
        const c = groupColors[groupIndex % groupColors.length];
        const sfx = groupIndex >= groupColors.length ? ` (${Math.floor(groupIndex / groupColors.length) + 1})` : '';
        return c.name + sfx;
    }
    return `Gruppe ${groupIndex + 1}`;
}

function copyResults() {
    const src = groupAssignments.length ? groupAssignments : [];
    if (src.length === 0) { showMessage('Ingen resultater at kopiere endnu.'); return; }
    const groupMap = {};
    src.forEach(t => { if (!groupMap[t.targetGroup]) groupMap[t.targetGroup] = []; groupMap[t.targetGroup].push(t.name); });
    const text = Object.entries(groupMap).sort(([a],[b]) => Number(a)-Number(b)).map(([i,ns]) => `${getGroupNameText(Number(i))}: ${ns.join(', ')}`).join('\n');
    navigator.clipboard.writeText(text).then(() => showMessage('✓ Grupper kopieret')).catch(() => showMessage('Kopiering mislykkedes'));
}

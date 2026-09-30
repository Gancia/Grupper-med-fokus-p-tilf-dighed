/* ============================================================
   js/draw.js – Lodtrækning: auto, manuel og chip-animation
   ============================================================ */

// --- Stop-tilstand state ------------------------------------
let stopRequested       = false; // Sat af STOP!-knappen
let lastHighlightedChip = null;  // Senest fremhævede chip (bruges ved stop)

/** Kaldes fra STOP!-knappens onclick. */
function requestStop() {
    stopRequested = true;
}

/** Opdater tæller for resterende elever i puljen. */
function updatePoolCount() {
    els.poolCountDisplay.innerText = remainingStudentsInPool.length;
}

// ══════════════════════════════════════════════════════════════
// Auto-draw – to separate kodestier: normal og stop-tilstand
// ══════════════════════════════════════════════════════════════

function executeAutoDrawStep() {
    const cfg            = getSpeedConfig();
    const availableChips = Array.from(els.studentPool.children);

    if (availableChips.length === 0) {
        finishGeneration();
        return;
    }

    const isStopMode = (drawFlow === 'button') && els.toggleAnimation.checked;

    if (isStopMode) {
        executeStopModeStep(cfg, availableChips);
    } else {
        executeNormalAutoStep(cfg, availableChips);
    }
}

// ── Normal auto-draw ─────────────────────────────────────────

function executeNormalAutoStep(cfg, availableChips) {
    if (currentDrawIndex >= groupAssignments.length) {
        finishGeneration();
        return;
    }

    const task            = groupAssignments[currentDrawIndex];
    const targetGroupName = getGroupNameText(task.targetGroup);

    els.poolStatusText.innerHTML = `Søger kandidat til <span class="text-teal-700 font-bold">${targetGroupName}</span>...`;

    let cycles      = 0;
    const maxCycles = Math.min(cfg.maxCycles, availableChips.length);

    const searchInterval = setInterval(() => {
        availableChips.forEach(c => c.classList.remove('highlight-search'));

        if (cycles < maxCycles && availableChips.length > 1) {
            const randomChip = availableChips[Math.floor(Math.random() * availableChips.length)];
            randomChip.classList.add('highlight-search');
            playSound('tick');
            cycles++;
        } else {
            clearInterval(searchInterval);

            const finalChip = availableChips.find(el => Number(el.dataset.uid) === task.uid);

            if (finalChip) {
                finalChip.classList.remove('highlight-search');
                finalChip.classList.add('highlight-selected');
                playSound('select');
                const displayName = els.toggleSecret.checked ? '???' : task.name;
                els.poolStatusText.innerHTML = `Valgt: <span class="text-emerald-700 font-bold">${displayName}</span>`;

                const targetCard = document.getElementById(`group-card-${task.targetGroup}`);
                if (targetCard) targetCard.classList.add('group-highlight-selected');

                setTimeout(() => {
                    moveChipToGroup(finalChip, task);
                    if (targetCard) targetCard.classList.remove('group-highlight-selected');
                    setTimeout(executeAutoDrawStep, cfg.stepDelay);
                }, cfg.selectDelay);
            } else {
                // Failsafe
                moveChipToGroup(null, task);
                executeAutoDrawStep();
            }
        }
    }, cfg.interval);
}

// ── Stop!-tilstand draw ──────────────────────────────────────

function executeStopModeStep(cfg, availableChips) {
    if (remainingStudentsInPool.length === 0) {
        finishGeneration();
        return;
    }

    stopRequested       = false;
    lastHighlightedChip = null;

    // Vis STOP!-knap
    els.stopBtnContainer.classList.remove('hidden');
    els.poolStatusText.innerHTML = 'En elev trykker <span class="text-indigo-600 font-black">TRÆK!</span> for at vælge det fremhævede navn';

    const stopInterval = setInterval(() => {
        availableChips.forEach(c => c.classList.remove('highlight-search'));

        if (stopRequested) {
            clearInterval(stopInterval);

            // Skjul STOP-knap og fjern animation-puls
            els.stopBtnContainer.classList.add('hidden');
            availableChips.forEach(c => c.classList.remove('highlight-search'));

            // Find valgte chip (brug lastHighlightedChip eller fallback til random)
            const selectedChip = (lastHighlightedChip && lastHighlightedChip.parentNode)
                ? lastHighlightedChip
                : availableChips[Math.floor(Math.random() * availableChips.length)];

            if (!selectedChip) { finishGeneration(); return; }

            const selectedUid  = Number(selectedChip.dataset.uid);
            const student      = remainingStudentsInPool.find(s => s.uid === selectedUid);
            if (!student) { finishGeneration(); return; }

            // Hent næste gruppe fra forudblandet kø
            const targetGroup     = remainingGroupQueue[groupAssignments.length];
            const targetGroupName = getGroupNameText(targetGroup);

            // Byg assignment og gem
            const task = { name: student.name, uid: student.uid, targetGroup };
            groupAssignments.push(task);

            // Fremhæv valg
            selectedChip.classList.add('highlight-selected');
            playSound('select');

            const targetCard = document.getElementById(`group-card-${targetGroup}`);
            if (targetCard) targetCard.classList.add('group-highlight-selected');

            const displayName = els.toggleSecret.checked ? '???' : student.name;
            els.poolStatusText.innerHTML = `<span class="text-indigo-700 font-bold">${displayName}</span> trækker <span class="text-emerald-700 font-bold">${targetGroupName}</span>!`;

            setTimeout(() => {
                moveChipToGroup(selectedChip, task);
                if (targetCard) targetCard.classList.remove('group-highlight-selected');

                // Fortsæt hvis der er flere
                if (remainingStudentsInPool.length > 0) {
                    setTimeout(executeAutoDrawStep, cfg.stepDelay);
                } else {
                    setTimeout(finishGeneration, cfg.stepDelay);
                }
            }, cfg.selectDelay);

        } else {
            // Vælg tilfældig chip til fremhævning
            lastHighlightedChip = availableChips[Math.floor(Math.random() * availableChips.length)];
            lastHighlightedChip.classList.add('highlight-search');
            playSound('tick');
        }
    }, cfg.interval);
}

// ══════════════════════════════════════════════════════════════
// Fælles: flyt chip til gruppe-kort
// ══════════════════════════════════════════════════════════════

function moveChipToGroup(chipElement, task) {
    if (chipElement) chipElement.remove();

    // Fjern fra pulje-array (uid-baseret)
    remainingStudentsInPool = remainingStudentsInPool.filter(item => item.uid !== task.uid);
    updatePoolCount();

    const container = document.getElementById(`group-content-${task.targetGroup}`);
    if (container) {
        const newChip       = document.createElement('div');
        newChip.className   = 'student-chip placed px-3 py-2 rounded-lg text-sm font-medium flex items-center border shadow-sm';
        newChip.textContent = els.toggleSecret.checked ? '???' : task.name;
        if (els.toggleSecret.checked) {
            newChip.dataset.secretName = task.name;
            newChip.classList.add('secret-chip');
        }
        container.appendChild(newChip);
    }

    currentDrawIndex++;
}

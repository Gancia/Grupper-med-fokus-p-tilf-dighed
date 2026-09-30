/* ============================================================
   js/audio.js – Web Audio API hjælpere
   ============================================================ */

let audioCtx = null;

/**
 * Initialiserer AudioContext (lazy + iOS-unlock via bruger-interaktion).
 * Skal kaldes fra en click-handler for at omgå browser auto-play-politikker.
 */
function initAudio() {
    if (!audioCtx && els.toggleSound.checked) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

/**
 * Afspiller en lydeffekt.
 * @param {'tick'|'select'|'tada'} type
 */
function playSound(type) {
    if (!els.toggleSound.checked || !audioCtx) return;

    try {
        const osc  = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        const nu = audioCtx.currentTime;

        if (type === 'tick') {
            // Meget rolig, blød tick (Low Arousal)
            osc.type = 'sine';
            osc.frequency.setValueAtTime(250 + Math.random() * 20, nu);
            gain.gain.setValueAtTime(0.005, nu);
            gain.gain.exponentialRampToValueAtTime(0.0001, nu + 0.05);
            osc.start(nu);
            osc.stop(nu + 0.05);

        } else if (type === 'select') {
            // Blid "ding"
            osc.type = 'sine';
            osc.frequency.setValueAtTime(350, nu);
            osc.frequency.exponentialRampToValueAtTime(500, nu + 0.1);
            gain.gain.setValueAtTime(0, nu);
            gain.gain.linearRampToValueAtTime(0.015, nu + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, nu + 0.5);
            osc.start(nu);
            osc.stop(nu + 0.5);

        } else if (type === 'tada') {
            // Blød dur-akkord (C-E-G) ved afslutning
            [261.63, 329.63, 392.00].forEach((freq, i) => {
                const o = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                o.connect(g);
                g.connect(audioCtx.destination);
                o.type         = 'sine';
                o.frequency.value = freq;
                g.gain.setValueAtTime(0, nu);
                g.gain.linearRampToValueAtTime(0.02, nu + 0.1);
                g.gain.exponentialRampToValueAtTime(0.001, nu + 1.5);
                o.start(nu + i * 0.05);
                o.stop(nu + 1.6);
            });
        }
    } catch (e) {
        console.error("Lydfejl:", e);
    }
}

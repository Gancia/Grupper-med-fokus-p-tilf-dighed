/* ============================================================
   js/confetti.js – Canvas-baseret konfetti-animation
   ============================================================ */

const confettiCanvas = document.getElementById('confetti-canvas');
const confettiCtx    = confettiCanvas.getContext('2d');
let   particles      = [];

// Rolige, dæmpede farver (Low Arousal)
const confettiColors = ['#0f766e', '#0369a1', '#b45309', '#15803d'];

/** Tilpas canvas til vinduets størrelse. */
function resizeConfettiCanvas() {
    confettiCanvas.width  = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeConfettiCanvas);
resizeConfettiCanvas();

/**
 * Start konfetti-animation.
 * Partikler falder jævnt fra toppen af skærmen (mere rolig end en eksplosion fra midten).
 * Hastighed er begrænset af terminal-hastighed for at undgå for hurtig fald.
 */
function fireConfetti() {
    particles = [];
    for (let i = 0; i < 90; i++) {
        particles.push({
            x:            Math.random() * confettiCanvas.width,    // spredt langs hele bredden
            y:            Math.random() * -80 - 10,                 // startes over toppen
            r:            Math.random() * 6 + 2,
            dx:           Math.random() * 2 - 1,                    // rolig horisontal drift
            dy:           Math.random() * 2 + 1,                    // startfart nedad
            color:        confettiColors[Math.floor(Math.random() * confettiColors.length)],
            tilt:         Math.random() * 10,
            tiltAngle:    0,
            tiltAngleInc: Math.random() * 0.04 + 0.02
        });
    }
    requestAnimationFrame(renderConfetti);
}

/** Render-løkke: opdater og tegn hvert partikel. */
function renderConfetti() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    let active = false;

    particles.forEach(p => {
        p.tiltAngle += p.tiltAngleInc;

        // Tyngdekraft med terminal-hastighed (maks 5 px/frame) – falder jævnt
        p.dy = Math.min(p.dy + 0.05, 5);

        // Position: tilt-bølge tilføjer naturlig gyngebevægelse
        p.y += p.dy + Math.cos(p.tiltAngle) * 0.5;
        p.x += p.dx + Math.sin(p.tiltAngle) * 0.8;

        if (p.y <= confettiCanvas.height) active = true;

        confettiCtx.beginPath();
        confettiCtx.lineWidth   = p.r;
        confettiCtx.strokeStyle = p.color;
        confettiCtx.moveTo(p.x + p.tilt + p.r, p.y);
        confettiCtx.lineTo(p.x + p.tilt,        p.y + p.tilt + p.r);
        confettiCtx.stroke();
    });

    if (active) {
        requestAnimationFrame(renderConfetti);
    } else {
        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
}

import confetti from 'canvas-confetti';

export function popConfetti(colors?: string[]) {
  confetti({
    particleCount: 90,
    spread: 70,
    origin: { y: 0.7 },
    colors,
    scalar: 1.1,
  });
}

export function bigConfetti(colors?: string[]) {
  const end = Date.now() + 1200;
  const frame = () => {
    confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: 0.8 }, colors });
    confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: 0.8 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
  confetti({ particleCount: 140, spread: 100, origin: { y: 0.6 }, colors, scalar: 1.3 });
}

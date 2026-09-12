import confetti from 'canvas-confetti';

/**
 * Fires dynamic 3D celebration confetti particles with customizable intensity.
 */
export const triggerMilestoneConfetti = (originY = 0.6) => {
  // Fire dual side cannons
  confetti({
    particleCount: 50,
    angle: 60,
    spread: 55,
    origin: { x: 0, y: originY },
    colors: ['#2563EB', '#10B981', '#7C3AED', '#F59E0B'],
    disableForReducedMotion: true,
  });

  confetti({
    particleCount: 50,
    angle: 120,
    spread: 55,
    origin: { x: 1, y: originY },
    colors: ['#2563EB', '#10B981', '#7C3AED', '#F59E0B'],
    disableForReducedMotion: true,
  });
};

/**
 * Rapid burst when a transaction or goal is saved.
 */
export const triggerSuccessBurst = () => {
  confetti({
    particleCount: 35,
    spread: 70,
    origin: { y: 0.75 },
    colors: ['#10B981', '#60A5FA', '#FBBF24'],
    disableForReducedMotion: true,
  });
};

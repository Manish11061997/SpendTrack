export const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' = 'light') => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  try {
    if (navigator.vibrate) {
      switch (type) {
        case 'light':
          navigator.vibrate(10);
          break;
        case 'medium':
          navigator.vibrate(20);
          break;
        case 'heavy':
          navigator.vibrate(40);
          break;
        case 'success':
          navigator.vibrate([15, 30, 20]);
          break;
        case 'warning':
          navigator.vibrate([30, 50, 30]);
          break;
      }
    }
  } catch (e) {
    // Platform does not support vibration or permission denied
  }
};

import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

// Native vibration i appen, navigator.vibrate på web – og stille fejl hvor ingen af delene findes (iOS Safari)
const safe = (run: () => Promise<unknown>) => {
  try {
    run().catch(() => {});
  } catch {
    /* ikke understøttet */
  }
};

export const haptic = {
  tap: () => safe(() => Haptics.impact({ style: ImpactStyle.Light })),
  beat: () => safe(() => Haptics.impact({ style: ImpactStyle.Medium })),
  warn: () => safe(() => Haptics.notification({ type: NotificationType.Warning })),
  lose: () => safe(() => Haptics.notification({ type: NotificationType.Error })),
  win: () => safe(() => Haptics.notification({ type: NotificationType.Success })),
};

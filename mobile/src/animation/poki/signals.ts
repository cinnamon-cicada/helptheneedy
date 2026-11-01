/** Reactions the auth forms can ask the mascot for. */
export type MascotReaction = 'glance' | 'fail' | 'success' | 'signup';

type Listener = (reaction: MascotReaction) => void;

/**
 * Fire-and-forget channel from the forms to whichever mascot renderer is
 * active (3D or fallback), without re-rendering anything.
 */
export function createMascotSignals() {
  const listeners = new Set<Listener>();
  return {
    emit(reaction: MascotReaction) {
      listeners.forEach((l) => l(reaction));
    },
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type MascotSignals = ReturnType<typeof createMascotSignals>;

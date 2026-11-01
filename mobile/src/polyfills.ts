// Globals that three.js expects but React Native's Hermes runtime lacks.
// Imported first in index.ts, before anything loads three.

// three's CommonJS entry (which @react-three/fiber/native requires) calls
// process.emitWarning on load. React Native's `process` shim has no such
// method, so startup crashed with "undefined is not a function".
const proc = (globalThis as { process?: { emitWarning?: unknown } }).process;
if (proc && typeof proc.emitWarning !== 'function') {
  proc.emitWarning = () => {};
}

// WebGLRenderer uses FinalizationRegistry, unguarded, to forget geometries
// and textures that were garbage-collected without dispose(). The auth scene
// disposes everything explicitly, so a no-op registry is safe.
if (typeof globalThis.FinalizationRegistry === 'undefined') {
  class NoopFinalizationRegistry {
    register() {}
    unregister() {
      return false;
    }
  }
  (globalThis as { FinalizationRegistry?: unknown }).FinalizationRegistry = NoopFinalizationRegistry;
}

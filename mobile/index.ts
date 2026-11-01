// Custom entry so polyfills run before any route module loads three.
// See src/polyfills.ts: without it the app crashes on startup in Hermes.
import './src/polyfills';
import 'expo-router/entry';

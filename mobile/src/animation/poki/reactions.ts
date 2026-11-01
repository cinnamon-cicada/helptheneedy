import { FACE_CAMERA_YAW } from './dims';
import { TAU, easeInOutCubic, hop, lerpAngle, progress, pulse, smoothstep } from './math';
import type { MascotPose } from './pose';
import type { MascotReaction } from './signals';

/** How long each reaction pauses the idle behaviour. */
export const REACTION_DURATION: Record<MascotReaction, number> = {
  glance: 1.4,
  fail: 1.3,
  success: 1.0,
  signup: 1.1,
};

/**
 * Layers a reaction on top of the (frozen) behaviour pose. Every reaction
 * eases in and back out, so the behaviour resumes without a pop.
 */
export function applyReaction(kind: MascotReaction, t: number, pose: MascotPose) {
  const dur = REACTION_DURATION[kind];
  const w = smoothstep(0, 0.2, t) * (1 - smoothstep(dur - 0.3, dur, t));
  pose.yaw = lerpAngle(pose.yaw, FACE_CAMERA_YAW, w);

  switch (kind) {
    case 'glance':
      // Looks down toward the form.
      pose.pitch += 0.22 * w;
      pose.roll += 0.08 * w;
      break;
    case 'fail': {
      // A small, deflated sigh.
      pose.sy *= 1 - 0.1 * w;
      pose.sx *= 1 + 0.05 * w;
      pose.sz *= 1 + 0.05 * w;
      pose.pitch += 0.3 * w;
      pose.roll += 0.1 * Math.sin(t * 6) * w;
      pose.hornBend += 0.5 * w;
      pose.eyeScale *= 1 - 0.3 * w;
      break;
    }
    case 'success':
    case 'signup': {
      const crouch = pulse(progress(t, 0, 0.16));
      const jump = progress(t, 0.14, 0.45);
      const land = pulse(progress(t, 0.59, 0.14));
      pose.sy *= (1 - 0.15 * crouch) * (1 + 0.12 * pulse(jump)) * (1 - 0.2 * land);
      pose.y += 0.3 * hop(jump);
      pose.yaw += TAU * easeInOutCubic(jump);
      pose.legLift += 0.5 * pulse(jump);
      pose.eyeScale *= 1 - 0.7 * pulse(jump);
      break;
    }
  }
}

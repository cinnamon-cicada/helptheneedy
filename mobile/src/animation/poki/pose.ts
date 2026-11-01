import { FACE_CAMERA_YAW } from './dims';

/**
 * Everything needed to pose the mascot for one frame. The rig is:
 * root (x, y, z, yaw) → lean about the feet (pitch, roll) → squash/stretch
 * from the feet → spin about the body centre (tumble, tumbleRoll).
 */
export type MascotPose = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Lean about the feet; positive tips forward (toward the face). */
  pitch: number;
  /** Sideways lean about the feet; positive tips to the mascot's left. */
  roll: number;
  /** Spin about the body centre, for tumbling and lying down. */
  tumble: number;
  tumbleRoll: number;
  sx: number;
  sy: number;
  sz: number;
  /** Alternating leg swing for walking, in radians. */
  legSwing: number;
  /** Both legs forward together, for sitting and kicking. */
  legLift: number;
  /** 0–1: the tiny arms only show while pulling the rope. */
  arms: number;
  eyeScale: number;
  /** Horn tip droop, for disappointment. */
  hornBend: number;
};

export function restPose(x = 0, z = 0, yaw: number = FACE_CAMERA_YAW): MascotPose {
  return {
    x,
    y: 0,
    z,
    yaw,
    pitch: 0,
    roll: 0,
    tumble: 0,
    tumbleRoll: 0,
    sx: 1,
    sy: 1,
    sz: 1,
    legSwing: 0,
    legLift: 0,
    arms: 0,
    eyeScale: 1,
    hornBend: 0,
  };
}

export function copyPose(from: MascotPose, to: MascotPose) {
  Object.assign(to, from);
  return to;
}

/** Keeps position and heading but resets every transient (squash, lean…). */
export function settlePose(from: MascotPose, to: MascotPose) {
  const { x, y, z, yaw } = from;
  return Object.assign(to, restPose(x, z, yaw), { y });
}

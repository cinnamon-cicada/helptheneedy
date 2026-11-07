// World units for the auth scene. The gift's body is about 1 unit tall and
// the whole closed gift is ~3.4x the mascot's height, which is what makes
// the dragging read as comedy.

export const BOX = { w: 1.3, h: 1.05, d: 1.1, radius: 0.018 } as const;
export const LID = { w: 1.42, h: 0.22, d: 1.22, radius: 0.012 } as const;
/** Lid centre height while the gift is closed. */
export const LID_CLOSED_Y = BOX.h + LID.h / 2 - 0.05;
/** Where the lid ends up: on its edge, leaning against the box's left side. */
export const LID_REST = { x: -0.855, y: 0.72, z: 0.04, rotZ: 1.3, rotY: 0.12 } as const;

export const MASCOT = {
  bodyR: 0.135,
  legLen: 0.075,
  /** Body centre above the feet when standing. */
  centerY: 0.075 + 0.135 * 0.95,
  /** Body centre height when lying on the ground. */
  lyingCenterY: 0.135 * 0.97,
} as const;

/** Rope length between the box's right face and the mascot's body while dragging. */
export const ROPE_GAP = 0.3;
/** Knot on the box's right side where the rope is tied. */
export const ROPE_KNOT = { x: BOX.w / 2 + 0.01, y: 0.42, z: 0.12 } as const;
/** The mascot walks in the depth plane just in front of the box while dragging. */
export const DRAG_Z = 0.12;

/** Loose ribbon that drapes from the rim down the front face after the burst. */
export const RIBBON = {
  // On the rim at the top of the (slightly tapered) front face.
  anchor: { x: -0.28, y: BOX.h - 0.02, z: (BOX.d * 0.97) / 2 + 0.01 },
  segments: [0.24, 0.24, 0.24, 0.24, 0.14, 0.1],
  width: 0.09,
} as const;

/** Ellipse the mascot walks along; wider on the left to clear the leaning lid. */
export const PATH = { rxLeft: 1.42, rxRight: 1.06, rz: 1.06 } as const;

/** World point that is centred in the gift area (and on screen during the intro). */
export const FOCUS_Y = 0.7;
/** World extent the final layout must fit (lid, box, mascot paths, a hop on the rim). */
export const STAGE_EXTENT = { w: 3.05, h: 2.3 } as const;
/** Closed gift extent used to size the intro. */
export const GIFT_EXTENT = { w: 1.6, h: 1.55 } as const;

export const CAMERA = {
  /** Orbit angle around the gift: a little from the right so the side face shows. */
  azimuth: 0.35,
  /** Looking slightly down so the open top reads. */
  elevation: 0.32,
  distance: 30,
} as const;
/** Mascot yaw that faces the camera (and the form below). */
export const FACE_CAMERA_YAW = CAMERA.azimuth;

export const PALETTE = {
  mascot: '#EAA647',
  mascotShade: '#D8913A',
  eye: '#2A1D16',
  ivory: '#FBF3E3',
  inside: '#E6CFAC',
  insideDeep: '#D9BD95',
  ribbon: '#EAA647',
  ribbonDeep: '#D99A3E',
  ink: '#4A3426',
  shadow: '#8A5A2B',
  rope: '#C98E4A',
} as const;

/** Mostly warm, with a little muted contrast. */
export const CONFETTI_COLORS = [
  '#EAA647',
  '#EAA647',
  '#F5C85C',
  '#F5C85C',
  '#F29B65',
  '#F29B65',
  '#FBE3BF',
  '#9DB8A0',
  '#93ABC6',
] as const;

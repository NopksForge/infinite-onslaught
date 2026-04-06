export const ITEM_W = 56;
export const ITEM_H = 68;

export function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

export function boxesOverlap(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  w: number,
  h: number
) {
  return ax < bx + w && ax + w > bx && ay < by + h && ay + h > by;
}

export function boundsFor(el: HTMLDivElement) {
  return { width: el.clientWidth, height: el.clientHeight };
}

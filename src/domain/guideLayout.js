const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// Keep the guide inside the viewport and leave space to see the highlighted page.
export function getGuideLayout(target, viewport, card) {
  const margin = 16;
  const gap = 18;
  const width = Math.min(card.width, viewport.width - margin * 2);
  const height = Math.min(card.height, viewport.height - margin * 2);
  let left = viewport.width - width - margin;
  let top = viewport.height - height - margin;
  const mobile = viewport.width <= 620;
  if (target && !mobile) {
    if (target.right + gap + width <= viewport.width - margin) {
      left = target.right + gap;
      top = target.top;
    } else if (target.left - gap - width >= margin) {
      left = target.left - gap - width;
      top = target.top;
    } else if (target.bottom + gap + height <= viewport.height - margin) {
      top = target.bottom + gap;
    } else if (target.top - gap - height >= margin) {
      top = target.top - gap - height;
    }
  }
  left = clamp(left, margin, viewport.width - width - margin);
  top = clamp(top, margin, viewport.height - height - margin);
  let spotlight = null;
  if (target) {
    const x = clamp(target.left - 6, 4, viewport.width - 4);
    const y = clamp(target.top - 6, 4, viewport.height - 4);
    const right = clamp(target.right + 6, x, viewport.width - 4);
    let bottom = clamp(target.bottom + 6, y, viewport.height - 4);
    // A tall panel can extend behind the guide. Highlight the visible part above it.
    const overlapsCard = x < left + width && right > left && y < top + height && bottom > top;
    if (overlapsCard) bottom = Math.max(y, top - gap);
    if (right > x && bottom > y) spotlight = { x, y, width: right - x, height: bottom - y };
  }
  return { left, top, spotlight };
}

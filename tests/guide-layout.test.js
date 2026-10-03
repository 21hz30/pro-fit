import assert from 'node:assert/strict';
import test from 'node:test';
import { getGuideLayout } from '../src/domain/guideLayout.js';

const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

test('a tall mobile panel leaves a visible spotlight above the guide', () => {
  const viewport = { width: 390, height: 844 };
  const card = { width: 358, height: 280 };
  const layout = getGuideLayout({ left: 16, top: 90, right: 374, bottom: 1700 }, viewport, card);
  assert.ok(layout.spotlight.height > 100);
  assert.equal(overlaps(layout.spotlight, { x: layout.left, y: layout.top, ...card }), false);
  assert.ok(layout.left >= 0 && layout.left + card.width <= viewport.width);
  assert.ok(layout.top >= 0 && layout.top + card.height <= viewport.height);
});

test('desktop guide leaves a small target unobstructed when there is room beside it', () => {
  const card = { width: 340, height: 260 };
  const layout = getGuideLayout({ left: 25, top: 600, right: 220, bottom: 650 }, { width: 1280, height: 720 }, card);
  assert.ok(layout.spotlight);
  assert.equal(overlaps(layout.spotlight, { x: layout.left, y: layout.top, ...card }), false);
});

test('short landscape viewports retain reachable guide controls and clip the spotlight', () => {
  const viewport = { width: 844, height: 390 };
  const card = { width: 340, height: 280 };
  const layout = getGuideLayout({ left: 20, top: 30, right: 1000, bottom: 1000 }, viewport, card);
  assert.ok(layout.top + card.height <= viewport.height);
  assert.ok(layout.spotlight.x + layout.spotlight.width <= viewport.width);
  assert.equal(overlaps(layout.spotlight, { x: layout.left, y: layout.top, ...card }), false);
});

test('a loading or unavailable section still has a visible guide card', () => {
  const layout = getGuideLayout(null, { width: 320, height: 568 }, { width: 340, height: 260 });
  assert.equal(layout.spotlight, null);
  assert.ok(layout.left >= 0 && layout.top >= 0);
});

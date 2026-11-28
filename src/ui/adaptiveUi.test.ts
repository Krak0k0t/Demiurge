import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyDeviceType } from '../hooks/useDeviceType';
import { computeRadialSlotOffsets } from './adaptiveUi';

test('classifyDeviceType distinguishes desktop, phone, touch tablet, and short landscape', () => {
  const desktop = classifyDeviceType(1440, 900, false);
  assert.equal(desktop.isMobile, false);
  assert.equal(desktop.isShortLandscape, false);
  assert.equal(desktop.deviceType, 'desktop');

  const phone = classifyDeviceType(390, 844, true);
  assert.equal(phone.isMobile, true);
  assert.equal(phone.isShortLandscape, false);
  assert.equal(phone.deviceType, 'mobile');

  const narrowWindowNoTouch = classifyDeviceType(390, 844, false);
  assert.equal(narrowWindowNoTouch.isMobile, true);
  assert.equal(narrowWindowNoTouch.deviceType, 'mobile');

  const touchTablet = classifyDeviceType(1100, 800, true);
  assert.equal(touchTablet.isMobile, true);
  assert.equal(touchTablet.deviceType, 'mobile');

  const shortLandscape = classifyDeviceType(844, 390, true);
  assert.equal(shortLandscape.isMobile, true);
  assert.equal(shortLandscape.isShortLandscape, true);
  assert.equal(shortLandscape.deviceType, 'mobile');
});

test('computeRadialSlotOffsets spaces radial wheel slots cleanly above-left of trigger', () => {
  assert.deepEqual(computeRadialSlotOffsets(0, 100), []);

  const single = computeRadialSlotOffsets(1, 100, 180, 270);
  assert.equal(single.length, 1);
  assert.ok(single[0].x < 0);
  assert.ok(single[0].y < 0);

  const arc = computeRadialSlotOffsets(5, 110, 185, 275);
  assert.equal(arc.length, 5);
  // Angles increase monotonically from 185° (left) to 275° (up), radius stays ~110px
  for (let i = 0; i < arc.length; i++) {
    const dist = Math.hypot(arc[i].x, arc[i].y);
    assert.ok(dist >= 108 && dist <= 112);
    if (i > 0) {
      assert.ok(arc[i].angleDeg > arc[i - 1].angleDeg);
    }
  }
});

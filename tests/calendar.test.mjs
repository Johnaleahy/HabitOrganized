import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayKey } from '../lib/calendar.mjs';
test('the same instant belongs to different days in different timezones', () => {
  const instant = new Date('2026-10-16T01:00:00Z');
  assert.equal(dayKey('America/Los_Angeles', instant), '2026-10-15');
  assert.equal(dayKey('Asia/Tokyo', instant), '2026-10-16');
});
test('spring and fall daylight-saving transitions retain the correct date', () => {
  for (const instant of ['2026-03-08T06:59:00Z', '2026-03-08T07:01:00Z', '2026-11-01T05:59:00Z', '2026-11-01T06:01:00Z']) {
    assert.equal(dayKey('America/New_York', new Date(instant)), instant.slice(0, 10));
  }
});

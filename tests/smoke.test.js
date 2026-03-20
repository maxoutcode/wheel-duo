import { test } from 'node:test';
import assert from 'node:assert/strict';

import { WheelDuo } from '../dist/index.es.js';

test('exports WheelDuo class from package entry', () => {
  assert.equal(typeof WheelDuo, 'function');
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PROVIDER_MAP } from './v1-v2-capacity-provider-map.js';

describe('PROVIDER_MAP (GOV-007 shared)', () => {
  it('maps capacity migrate/verify providers to dist filenames', () => {
    assert.equal(PROVIDER_MAP.openai, 'openai.json');
    assert.equal(PROVIDER_MAP.anthropic, 'anthropic.json');
    assert.equal(PROVIDER_MAP.google, 'gemini.json');
    assert.equal(PROVIDER_MAP.gemini, 'gemini.json');
  });

  it('keeps a stable key set', () => {
    assert.deepEqual(Object.keys(PROVIDER_MAP).sort(), [
      'anthropic',
      'gemini',
      'google',
      'openai',
    ]);
  });
});

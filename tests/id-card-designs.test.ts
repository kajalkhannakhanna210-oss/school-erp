import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { describe, it } from 'node:test';

describe('ID Card designs repo artifacts', () => {
  it('has the create-id-card-bucket script', () => {
    const path = './scripts/create-id-card-bucket.ps1';
    assert.ok(existsSync(path), `Missing ${path}`);
    const content = readFileSync(path, 'utf8');
    assert.ok(content.includes('id-card-designs'), 'Script does not reference id-card-designs');
  });

  it('has the GitHub workflow', () => {
    const path = '.github/workflows/create-id-card-bucket.yml';
    assert.ok(existsSync(path), `Missing ${path}`);
    const content = readFileSync(path, 'utf8');
    assert.ok(content.includes('create-id-card-bucket'), 'Workflow file looks incorrect');
  });
});

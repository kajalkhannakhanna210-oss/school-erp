import test from 'node:test';
import assert from 'node:assert/strict';
import { userHasPermission, getUserAdmissionScopes } from '../lib/enquiries';

test('userHasPermission with null user returns false', () => {
  // function should handle nulls safely
  return Promise.resolve().then(async () => {
    const ok = await userHasPermission(null as any, null as any, 'admission_enquiry.view');
    assert.equal(ok, false);
  });
});

test('getUserAdmissionScopes with null user returns defaults', () => {
  return Promise.resolve().then(async () => {
    const scopes = await getUserAdmissionScopes(null as any, null as any);
    assert.equal(scopes.all, false);
    assert.equal(Array.isArray(scopes.classes), true);
    assert.equal(Array.isArray(scopes.sections), true);
    assert.equal(scopes.ownAssigned, false);
  });
});

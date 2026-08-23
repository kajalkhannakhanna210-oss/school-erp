import { callServerAction } from '../lib/client-action';

describe('callServerAction', () => {
  test('returns error when promise resolves undefined', async () => {
    const res = await callServerAction(Promise.resolve(undefined as any));
    expect(res).toHaveProperty('error');
    expect(res.error).toBe('No response from server');
  });

  test('returns error when promise rejects', async () => {
    const res = await callServerAction(Promise.reject(new Error('boom')));
    expect(res).toHaveProperty('error');
    expect(res.error).toBe('boom');
  });

  test('returns the result when promise resolves to an object', async () => {
    const payload = { error: null, ok: true };
    const res = await callServerAction(Promise.resolve(payload));
    expect(res).toEqual(payload);
  });
});

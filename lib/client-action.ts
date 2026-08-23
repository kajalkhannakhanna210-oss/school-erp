export async function callServerAction<T = any>(actionPromise: Promise<T> | (() => Promise<T>)) {
  try {
    const res = typeof actionPromise === 'function' ? await actionPromise() : await actionPromise;
    if (res === undefined || res === null) return { error: 'No response from server' } as any;
    return res as any;
  } catch (e: any) {
    return { error: e?.message ?? String(e) } as any;
  }
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptedDelivery, sendInquiry, inquiryEndpoint } from '../dist/contact.js';
test('HTTP 200 with string false never claims delivery', () => {
  assert.equal(acceptedDelivery({ ok: true }, { accepted: 'false' }), false);
  assert.equal(acceptedDelivery({ ok: true }, { accepted: true }), true);
  assert.equal(acceptedDelivery({ ok: false }, { accepted: true }), false);
});
test('refused and failed requests reject', async () => {
  await assert.rejects(
    sendInquiry({}, async () => ({
      ok: true,
      json: async () => ({ accepted: false, message: 'Activation required' }),
    })),
  );
  await assert.rejects(
    sendInquiry({}, async () => {
      throw Error('offline');
    }),
  );
});
test('inquiry sends in the background and checks explicit acceptance', async () => {
  const data = { name: 'Test', email: 'test@example.com', message: 'Test inquiry' };
  await sendInquiry(data, async (url, options) => {
    assert.equal(url, inquiryEndpoint);
    assert.equal(options.headers['Content-Type'], 'text/plain;charset=UTF-8');
    assert.equal(options.mode, undefined, 'never use an unreadable no-cors response');
    assert.deepEqual(JSON.parse(options.body), data);
    return { ok: true, json: async () => ({ accepted: true }) };
  });
});

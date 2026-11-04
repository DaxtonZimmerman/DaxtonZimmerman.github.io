import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(
  new URL('../integrations/google-mail/Code.gs', import.meta.url),
  'utf8',
);

// All Google services are local fakes. These checks never send email.
function createReceiver(quota = 100) {
  const sent = [];
  const cache = new Map();
  const context = {
    MailApp: {
      getRemainingDailyQuota: () => quota,
      sendEmail: (message) => sent.push(message),
    },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    CacheService: {
      getScriptCache: () => ({
        get: (key) => cache.get(key),
        put: (key, value) => cache.set(key, value),
      }),
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'test' },
      computeDigest: (_, value) => value,
      base64EncodeWebSafe: (value) => value,
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (text) => ({ setMimeType: () => JSON.parse(text) }),
    },
  };
  runInNewContext(source, context);
  return {
    sent,
    receive: (data) => context.doPost({ postData: { contents: JSON.stringify(data) } }),
  };
}
const inquiry = {
  name: 'Setup test',
  email: 'test@example.com',
  type: 'website',
  message: 'A sample website inquiry.',
};

test('receiver sends the whole inquiry only to the fixed owner address', () => {
  const receiver = createReceiver();
  const result = receiver.receive({
    ...inquiry,
    to: 'another@example.com',
    subject: 'Ignore this',
  });
  assert.equal(result.accepted, true);
  assert.equal(receiver.sent.length, 1);
  assert.equal(receiver.sent[0].to, 'daxtonmz0021@gmail.com');
  assert.equal(receiver.sent[0].replyTo, inquiry.email);
  assert.equal(receiver.sent[0].subject, 'Website inquiry: website');
  assert(receiver.sent[0].body.includes(inquiry.name));
  assert(receiver.sent[0].body.includes(inquiry.email));
  assert(receiver.sent[0].body.includes(inquiry.message));
});

test('invalid input, a honeypot, and header injection cannot send email', () => {
  const receiver = createReceiver();
  for (const data of [
    null,
    {},
    { ...inquiry, _honey: 'bot' },
    { ...inquiry, name: 'Name\nBcc: another@example.com' },
    { ...inquiry, email: 'test@@example.com' },
    { ...inquiry, type: 'unrecognized' },
    { ...inquiry, message: 'short' },
  ]) {
    assert.equal(receiver.receive(data).accepted, false);
  }
  assert.equal(receiver.sent.length, 0);
});

test('receiver stops at its per-address send limit and when Google quota is exhausted', () => {
  const receiver = createReceiver();
  for (let count = 0; count < 3; count++) assert.equal(receiver.receive(inquiry).accepted, true);
  assert.equal(receiver.receive(inquiry).accepted, false);
  assert.equal(receiver.sent.length, 3);
  const exhausted = createReceiver(0);
  assert.equal(exhausted.receive(inquiry).accepted, false);
  assert.equal(exhausted.sent.length, 0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { flyerInquiry } from '../dist/flyers.js';

test('flyer inquiry keeps sample choice and optional project link in the emailed message', () => {
  const data = flyerInquiry({
    name: 'Test',
    email: 'test@example.com',
    design: 'Open House',
    message: 'A design for an upcoming open house.',
    photos: 'https://example.com/photos',
  });
  assert.equal(data.type, 'other');
  assert.equal(data.email, 'test@example.com');
  assert.match(data.message, /Sample: Open House/);
  assert.match(data.message, /A design for an upcoming open house\./);
  assert.match(data.message, /https:\/\/example.com\/photos/);
  assert.equal(data._honey, '');
});

test('maximum form lengths stay inside the receiver message limit', () => {
  const data = flyerInquiry({
    name: 'T',
    email: 't@example.com',
    design: 'Just Listed',
    message: 'm'.repeat(4500),
    photos: 'https://example.com/' + 'p'.repeat(280),
  });
  assert(data.message.length <= 5000);
  assert(
    !flyerInquiry({
      name: 'T',
      email: 't@example.com',
      design: 'Other',
      message: 'No photo link yet.',
    }).message.includes('undefined'),
  );
});

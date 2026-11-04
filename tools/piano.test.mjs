import test from 'node:test';
import assert from 'node:assert/strict';
import { PianoPlayer } from '../dist/piano.js';

test('releasing a note while audio permission resumes never starts a stray voice', async () => {
  let resumeAudio,
    oscillators = 0;
  class AudioContext {
    state = 'suspended';
    resume() {
      return new Promise((resolve) => (resumeAudio = resolve));
    }
    createOscillator() {
      oscillators++;
      throw Error('A released note must not reach this point');
    }
  }
  const piano = new PianoPlayer({ AudioContext });
  const note = piano.start(0);
  piano.stop(0);
  resumeAudio();
  assert.equal(await note, false);
  assert.equal(oscillators, 0);
});

test('closing the music corner cancels every pending note', async () => {
  const resumes = [];
  class AudioContext {
    state = 'suspended';
    resume() {
      return new Promise((resolve) => resumes.push(resolve));
    }
    createOscillator() {
      throw Error('A closed dialog must stay silent');
    }
  }
  const piano = new PianoPlayer({ AudioContext });
  const notes = [piano.start(0), piano.start(8)];
  piano.stopAll();
  resumes.forEach((resolve) => resolve());
  assert.deepEqual(await Promise.all(notes), [false, false]);
});

test('master gain provides true mute and updates active piano audio', async () => {
  const gains = [];
  class AudioContext {
    state = 'running';
    currentTime = 0;
    destination = {};
    createGain() {
      const node = {
        gain: {
          value: 1,
          setValueAtTime() {},
          linearRampToValueAtTime() {},
          exponentialRampToValueAtTime() {},
          cancelScheduledValues() {},
          setTargetAtTime() {},
        },
        connect() {},
        disconnect() {},
      };
      gains.push(node);
      return node;
    }
    createOscillator() {
      return { frequency: { value: 0 }, connect() {}, disconnect() {}, start() {}, stop() {} };
    }
  }
  const piano = new PianoPlayer({ AudioContext });
  piano.volume = 0;
  assert.equal(await piano.start(0), true);
  assert.equal(gains[0].gain.value, 0);
  piano.volume = 0.6;
  assert.equal(gains[0].gain.value, 0.6);
  piano.volume = 0;
  assert.equal(gains[0].gain.value, 0);
});

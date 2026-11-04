import test from 'node:test';
import assert from 'node:assert/strict';
import { GuitarPlayer, pluckedSamples } from '../dist/guitar.js';

test('a plucked string has finite samples and decays to silence', () => {
  let seed = 42;
  const random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const samples = pluckedSamples(44100, 82.4069, random);
  const energy = (segment) => segment.reduce((sum, n) => sum + n * n, 0) / segment.length;
  assert(samples.every(Number.isFinite));
  assert(energy(samples.subarray(0, 4000)) > 0.0001);
  assert(energy(samples.subarray(-4000)) < energy(samples.subarray(0, 4000)) * 0.01);
  assert(Math.abs(samples.at(-1)) < 0.00001);
});

test('closing or changing instruments during audio resume cancels a pending strum', async () => {
  let resume,
    sources = 0;
  class Audio {
    state = 'suspended';
    resume() {
      return new Promise((resolve) => (resume = resolve));
    }
    createBufferSource() {
      sources++;
      throw Error('A cancelled strum must not start');
    }
  }
  const guitar = new GuitarPlayer({ Audio });
  const pending = guitar.strum();
  guitar.stopAll();
  resume();
  assert.equal(await pending, false);
  assert.equal(sources, 0);
});

test('a strum schedules six strings and closing stops scheduled and active voices', async () => {
  const sources = [];
  class Audio {
    state = 'running';
    sampleRate = 8000;
    currentTime = 10;
    createBuffer() {
      return { copyToChannel() {} };
    }
    createGain() {
      return { gain: { value: 0 }, connect() {}, disconnect() {} };
    }
    createBufferSource() {
      const source = {
        connect() {},
        disconnect() {},
        start(time) {
          this.startTime = time;
        },
        stop() {
          this.stopped = true;
        },
      };
      sources.push(source);
      return source;
    }
  }
  const guitar = new GuitarPlayer({ Audio });
  assert.equal(await guitar.strum(), true);
  assert.equal(sources.length, 6);
  assert.equal(sources[0].startTime, 10);
  assert(sources[5].startTime > 10.2);
  guitar.stopAll();
  assert(sources.every((source) => source.stopped));
  assert.equal(guitar.voices.size, 0);
});

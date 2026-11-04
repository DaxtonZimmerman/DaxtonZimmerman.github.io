import test from 'node:test';
import assert from 'node:assert/strict';
import { ArcadeMusic } from '../dist/arcade-music.js';

function audioStub(play = () => Promise.resolve()) {
  return {
    paused: true,
    currentTime: 0,
    starts: 0,
    play() {
      this.starts++;
      this.paused = false;
      return play();
    },
    pause() {
      this.paused = true;
    },
    load() {
      this.currentTime = 0;
    },
  };
}

test('a late playback start cannot continue after closing or pausing', async () => {
  const previous = globalThis.window;
  globalThis.window = {};
  try {
    let finish;
    const audio = audioStub(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const music = new ArcadeMusic(audio);
    assert.equal(audio.starts, 0);
    music.setPlaying(true);
    music.setPlaying(false);
    // Simulate the browser completing playback after the close.
    audio.paused = false;
    finish();
    await Promise.resolve();
    assert.equal(audio.paused, true);
  } finally {
    globalThis.window = previous;
  }
});

test('mute, track changes and reset respect the current game state', () => {
  const previous = globalThis.window;
  globalThis.window = {};
  try {
    const audio = audioStub();
    const music = new ArcadeMusic(audio);
    music.setPlaying(true);
    music.setMuted(true);
    const starts = audio.starts;
    music.changeTrack('assets/audio/retro-beat.mp3');
    assert.equal(audio.src, 'assets/audio/retro-beat.mp3');
    assert.equal(audio.starts, starts);
    assert.equal(audio.paused, true);
    music.setMuted(false);
    assert.equal(audio.paused, false);
    music.setVolume(0);
    assert.equal(audio.paused, true);
    music.setVolume(0.5);
    assert.equal(audio.paused, false);
    audio.currentTime = 7;
    music.reset();
    assert.equal(audio.currentTime, 0);
    assert.equal(audio.paused, true);
    music.changeTrack('assets/audio/swinging-pants.mp3');
    assert.equal(audio.paused, true);
  } finally {
    globalThis.window = previous;
  }
});

test('music uses gain control for browsers with a fixed media-element volume', () => {
  const previous = globalThis.window;
  let connections = 0;
  const gain = {
    gain: { value: 1 },
    connect() {
      connections++;
    },
  };
  globalThis.window = {
    AudioContext: class {
      createGain() {
        return gain;
      }
      createMediaElementSource() {
        return {
          connect() {
            connections++;
          },
        };
      }
      resume() {
        return Promise.resolve();
      }
    },
  };
  try {
    const audio = audioStub();
    const music = new ArcadeMusic(audio);
    music.setPlaying(true);
    assert.equal(audio.volume, 1);
    assert.equal(gain.gain.value, 0.3);
    music.setVolume(0.6);
    assert.equal(gain.gain.value, 0.6);
    assert.equal(connections, 2);
  } finally {
    globalThis.window = previous;
  }
});

test('a playback rejection is reported without failing the game', async () => {
  const previous = globalThis.window;
  globalThis.window = {};
  try {
    let errors = 0;
    const music = new ArcadeMusic(
      audioStub(() => Promise.reject(new Error('Unavailable'))),
      () => errors++,
    );
    music.setPlaying(true);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(errors, 1);
    music.setPlaying(false);
  } finally {
    globalThis.window = previous;
  }
});

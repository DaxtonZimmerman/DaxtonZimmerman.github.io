// A short plucked-string model. The room does not play recorded performances.
export const tuning = [82.4069, 110, 146.8324, 195.9977, 246.9417, 329.6276];

export function pluckedSamples(sampleRate, frequency, random = Math.random) {
  const period = Math.round(sampleRate / frequency);
  const ring = Float32Array.from({ length: period }, () => random() * 2 - 1);
  const mean = ring.reduce((sum, value) => sum + value, 0) / period;
  ring.forEach((value, i) => {
    ring[i] = value - mean;
  });
  const samples = new Float32Array(Math.round(sampleRate * 2.4));
  for (let i = 0; i < samples.length; i++) {
    const cursor = i % period;
    const value = ring[cursor];
    ring[cursor] = (value + ring[(cursor + 1) % period]) * 0.498;
    samples[i] = value * 0.4 * (1 - i / samples.length) ** 2;
  }
  return samples;
}

export class GuitarPlayer {
  constructor({
    Audio = globalThis.AudioContext || globalThis.webkitAudioContext,
    isActive = () => true,
  } = {}) {
    this.Audio = Audio;
    this.isActive = isActive;
    this._volume = 0.25;
    this.master = null;
    this.context = null;
    this.generation = 0;
    this.voices = new Set();
    this.buffers = new Map();
  }
  get volume() {
    return this._volume;
  }
  set volume(value) {
    this._volume = Math.max(0, Math.min(1, Number(value) || 0));
    if (this.master) this.master.gain.value = this._volume;
  }
  async play(strings) {
    if (!this.Audio) throw new Error('Web Audio unavailable');
    this.context ||= new this.Audio();
    const context = this.context,
      ticket = this.generation;
    if (context.state === 'suspended') await context.resume();
    if (ticket !== this.generation || !this.isActive()) return false;
    if (!this.master) {
      this.master = context.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(context.destination);
    }
    strings.forEach((index, order) => {
      if (!this.buffers.has(index)) {
        const data = pluckedSamples(context.sampleRate, tuning[index]);
        const buffer = context.createBuffer(1, data.length, context.sampleRate);
        buffer.copyToChannel(data, 0);
        this.buffers.set(index, buffer);
      }
      // Repeated clicks have a bounded voice count.
      if (this.voices.size >= 24) this.stopVoice(this.voices.values().next().value);
      const source = context.createBufferSource(),
        gain = context.createGain();
      source.buffer = this.buffers.get(index);
      gain.gain.value = 0.4;
      source.connect(gain);
      gain.connect(this.master);
      const voice = { source, gain };
      this.voices.add(voice);
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
        this.voices.delete(voice);
      };
      source.start(context.currentTime + order * 0.045);
    });
    return true;
  }
  pluck(index) {
    return this.play([index]);
  }
  strum() {
    return this.play([0, 1, 2, 3, 4, 5]);
  }
  stopVoice(voice) {
    voice.gain.gain.value = 0;
    try {
      voice.source.stop();
    } catch {}
    voice.source.disconnect();
    voice.gain.disconnect();
    this.voices.delete(voice);
  }
  stopAll() {
    this.generation++;
    [...this.voices].forEach((voice) => this.stopVoice(voice));
  }
}

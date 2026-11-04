// Web Audio is created only inside a deliberate note action. No autoplay or files.
export function PianoPlayer({
  isActive = () => true,
  onNoteEnd = () => {},
  AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext,
} = {}) {
  let context = null;
  let generation = 0;
  const voices = new Map();
  const pending = new Map();
  let volume = 0.25,
    master = null;
  Object.defineProperty(this, 'volume', {
    get: () => volume,
    set: (value) => {
      volume = Math.max(0, Math.min(1, Number(value) || 0));
      if (master) master.gain.value = volume;
    },
  });
  const semitones = [0, 2, 4, 5, 7, 9, 11, 12, 1, 3, 6, 8, 10];
  this.start = async (index) => {
    if (voices.has(index) || pending.has(index)) return false;
    const Audio = AudioContext;
    if (!Audio) throw new Error('Web Audio unavailable');
    context ||= new Audio();
    const startedAt = generation;
    const ticket = {};
    pending.set(index, ticket);
    try {
      if (context.state === 'suspended') await context.resume();
    } catch (error) {
      if (pending.get(index) === ticket) pending.delete(index);
      throw error;
    }
    // Closing the dialog while resume waits must not start a stray note.
    if (startedAt !== generation || !isActive() || pending.get(index) !== ticket) return false;
    pending.delete(index);
    if (voices.has(index)) return false;
    if (!master) {
      master = context.createGain();
      master.gain.value = volume;
      master.connect(context.destination);
    }
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = 'triangle';
    oscillator.frequency.value = 261.625565 * 2 ** (semitones[index] / 12);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.8);
    gain.gain.linearRampToValueAtTime(0, now + 2);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(now);
    oscillator.stop(now + 2.05);
    const voice = { oscillator, gain, ended: false };
    voices.set(index, voice);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      if (voices.get(index) === voice) {
        voices.delete(index);
        onNoteEnd(index);
      }
    };
    return true;
  };
  this.stop = (index) => {
    pending.delete(index);
    const voice = voices.get(index);
    if (!voice || voice.ended) return;
    voice.ended = true;
    const now = context.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime(0, now, 0.035);
    try {
      voice.oscillator.stop(now + 0.15);
    } catch {}
    voices.delete(index);
  };
  this.stopAll = () => {
    generation++;
    pending.clear();
    [...voices.keys()].forEach((index) => this.stop(index));
  };
}

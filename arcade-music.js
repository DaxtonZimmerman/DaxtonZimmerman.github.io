// One soundtrack player, separate from the game physics.
export class ArcadeMusic {
  constructor(audio, onError = () => {}) {
    this.audio = audio;
    this.onError = onError;
    this.playing = false;
    this.muted = false;
    this.volume = 0.3;
    this.context = null;
    this.audio.volume = this.volume;
  }

  prepare() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!this.context && AudioContext) {
      this.context = new AudioContext();
      this.gain = this.context.createGain();
      this.context.createMediaElementSource(this.audio).connect(this.gain);
      this.gain.connect(this.context.destination);
      this.audio.volume = 1;
      this.gain.gain.value = this.volume;
    }
    this.context?.resume().catch(this.onError);
  }

  setPlaying(playing) {
    this.playing = playing;
    if (!playing || this.muted || this.volume === 0) {
      this.audio.pause();
      return;
    }
    try {
      this.prepare();
      this.audio
        .play()
        .then(() => {
          // Closing or pausing while playback starts must never leave music running.
          if (!this.playing || this.muted || this.volume === 0) this.audio.pause();
        })
        .catch((error) => {
          if (this.playing && !this.muted && error.name !== 'AbortError') this.onError();
        });
    } catch {
      this.onError();
    }
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gain) this.gain.gain.value = this.volume;
    else this.audio.volume = this.volume;
    this.setPlaying(this.playing);
  }

  setMuted(muted) {
    this.muted = muted;
    this.setPlaying(this.playing);
  }

  changeTrack(source) {
    this.audio.pause();
    this.audio.src = source;
    this.audio.load();
    this.setPlaying(this.playing);
  }

  reset() {
    this.setPlaying(false);
    this.audio.currentTime = 0;
  }
}

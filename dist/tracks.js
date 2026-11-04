const version = new URL(import.meta.url).searchParams.get('v') || 'local';
const { ArcadeMusic } = await import(`./arcade-music.js?v=${version}`);

export function mountTracks(panel) {
  const find = (selector) => panel.querySelector(selector);
  const audio = find('#track-audio');
  const play = find('#track-play');
  const seek = find('#track-seek');
  const status = find('#track-status');
  const canvas = find('#track-waveform');
  const context = canvas.getContext('2d');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let analyser;
  let samples;
  const player = new ArcadeMusic(audio, () => {
    status.textContent = 'This track couldn’t start. Please try Play again.';
  });

  function time(seconds) {
    const whole = Math.floor(Number.isFinite(seconds) ? seconds : 0);
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
  }

  function draw() {
    frame = 0;
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = panel.classList.contains('is-atmospheric') ? '#f59aaa' : '#78b7ff';
    context.lineWidth = 2;
    context.beginPath();
    if (analyser && !audio.paused && !reducedMotion.matches) {
      analyser.getByteTimeDomainData(samples);
      samples.forEach((value, index) => {
        const x = (index * canvas.width) / (samples.length - 1);
        const y = (value / 255) * canvas.height;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
    } else {
      context.moveTo(0, canvas.height / 2);
      context.lineTo(canvas.width, canvas.height / 2);
    }
    context.stroke();
    if (!audio.paused && !reducedMotion.matches && !panel.hidden)
      frame = requestAnimationFrame(draw);
  }

  function pause() {
    player.setPlaying(false);
    cancelAnimationFrame(frame);
    play.textContent = 'Play track';
    draw();
  }

  function select(id) {
    const button = panel.querySelector(`[data-track="${id}"]`);
    if (!button) return;
    pause();
    player.changeTrack(button.dataset.source);
    panel
      .querySelectorAll('[data-track]')
      .forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    find('#track-title').textContent = button.dataset.title;
    find('#track-credit').textContent = button.dataset.credit;
    find('#track-elapsed').textContent = '0:00';
    find('#track-duration').textContent = time(Number(button.dataset.duration));
    seek.value = 0;
    seek.disabled = true;
    panel.classList.toggle('is-atmospheric', id === 'stranger');
    status.textContent = '';
    draw();
  }

  panel
    .querySelectorAll('[data-track]')
    .forEach((button) => button.addEventListener('click', () => select(button.dataset.track)));
  play.addEventListener('click', () => {
    status.textContent = '';
    if (!audio.paused) pause();
    else player.setPlaying(true);
  });
  audio.addEventListener('play', () => {
    play.textContent = 'Pause track';
    if (!analyser && player.context) {
      analyser = player.context.createAnalyser();
      analyser.fftSize = 256;
      samples = new Uint8Array(analyser.fftSize);
      player.gain.connect(analyser);
    }
    cancelAnimationFrame(frame);
    draw();
  });
  audio.addEventListener('pause', () => {
    play.textContent = 'Play track';
    cancelAnimationFrame(frame);
    draw();
  });
  audio.addEventListener('ended', pause);
  audio.addEventListener('loadedmetadata', () => {
    if (!Number.isFinite(audio.duration)) return;
    seek.max = audio.duration;
    seek.disabled = false;
    find('#track-duration').textContent = time(audio.duration);
  });
  audio.addEventListener('timeupdate', () => {
    seek.value = audio.currentTime;
    find('#track-elapsed').textContent = time(audio.currentTime);
  });
  seek.addEventListener('input', () => {
    audio.currentTime = Number(seek.value);
    find('#track-elapsed').textContent = time(audio.currentTime);
  });
  find('#track-loop').addEventListener('change', (event) => {
    audio.loop = event.target.checked;
  });
  find('#track-volume').addEventListener('input', (event) => {
    player.setVolume(Number(event.target.value) / 100);
    find('#track-volume-output').value = `${event.target.value}%`;
  });
  reducedMotion.addEventListener('change', () => {
    cancelAnimationFrame(frame);
    draw();
  });
  draw();
  return { pause, select };
}

const moduleVersion = new URL(import.meta.url).searchParams.get('v') || 'local';
const { setupTabs } = await import(`./tabs.js?v=${moduleVersion}`);
const findElement = (selector) => document.querySelector(selector);
const findElements = (selector) => [...document.querySelectorAll(selector)];

// A native modal supplies focus containment, Escape, and a normal reading order.
const musicDialog = findElement('#music-dialog');
if (musicDialog) {
  const [{ GuitarPlayer }, { PianoPlayer }] = await Promise.all([
    import(`./guitar.js?v=${moduleVersion}`),
    import(`./piano.js?v=${moduleVersion}`),
  ]);
  const { mountTracks } = await import(`./tracks.js?v=${moduleVersion}`);
  const tracks = mountTracks(findElement('#tracks-panel'));
  let opener = null;
  const piano = new PianoPlayer({
    isActive: () => musicDialog.open,
    onNoteEnd: (index) => keys[index].classList.remove('playing'),
  });
  const keys = findElements('.piano-key');
  const activeKeys = new Set();
  const shortcuts = 'asdfghjkwetyu';
  let instrument = 'tracks';
  const guitar = new GuitarPlayer({ isActive: () => musicDialog.open && instrument === 'guitar' });
  const selectInstrument = setupTabs(musicDialog.querySelector('.instrument-tabs'), (button) => {
    stopOnBlur();
    instrument = button.dataset.instrument;
    findElement('#instrument-controls').hidden = instrument === 'tracks';
    findElement('#sound-status').textContent =
      instrument === 'guitar' ? 'Choose a string to play.' : 'Choose a piano key to play.';
  });
  findElements('[data-open-music]').forEach((button) =>
    button.addEventListener('click', () => {
      opener = button;
      const requested = button.dataset.musicInstrument || 'tracks';
      selectInstrument(musicDialog.querySelector(`[data-instrument="${requested}"]`));
      if (button.dataset.selectedTrack) tracks.select(button.dataset.selectedTrack);
      musicDialog.showModal();
    }),
  );
  musicDialog.querySelector('.dialog-close').addEventListener('click', () => musicDialog.close());
  musicDialog.addEventListener('click', (event) => {
    if (event.target !== musicDialog) return;
    const r = musicDialog.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      musicDialog.close();
  });
  musicDialog.addEventListener('close', () => {
    stopOnBlur();
    opener?.focus();
  });
  async function startNote(index) {
    try {
      if (await piano.start(index)) {
        keys[index].classList.add('playing');
        findElement('#sound-status').textContent =
          `Last note: ${['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'C♯4', 'D♯4', 'F♯4', 'G♯4', 'A♯4'][index]}`;
      }
    } catch {
      findElement('#sound-status').textContent =
        'Sound is unavailable in this browser. You can still explore the portfolio.';
    }
  }
  function endNote(index) {
    piano.stop(index);
    keys[index].classList.remove('playing');
  }
  keys.forEach((key, index) => {
    key.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      key.focus();
      key.setPointerCapture(event.pointerId);
      startNote(index);
    });
    key.addEventListener('pointerup', () => endNote(index));
    key.addEventListener('pointercancel', () => endNote(index));
    key.addEventListener('lostpointercapture', () => endNote(index));
    key.addEventListener('keydown', (event) => {
      if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
        event.preventDefault();
        startNote(index);
      }
    });
    key.addEventListener('keyup', (event) => {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        endNote(index);
      }
    });
    // A click without pointer/keyboard events can come from assistive technology.
    key.addEventListener('click', (event) => {
      if (event.detail === 0) {
        startNote(index);
        setTimeout(() => endNote(index), 280);
      }
    });
  });
  document.addEventListener('keydown', (event) => {
    if (
      !musicDialog.open ||
      instrument !== 'piano' ||
      event.repeat ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.target.matches('input,textarea,select')
    )
      return;
    const index = shortcuts.indexOf(event.key.toLowerCase());
    if (index < 0 || event.key.length !== 1 || activeKeys.has(index)) return;
    event.preventDefault();
    activeKeys.add(index);
    startNote(index);
  });
  document.addEventListener('keyup', (event) => {
    const index = shortcuts.indexOf(event.key.toLowerCase());
    if (index < 0 || !activeKeys.has(index)) return;
    activeKeys.delete(index);
    endNote(index);
  });
  function stopOnBlur() {
    tracks.pause();
    piano.stopAll();
    guitar.stopAll();
    activeKeys.clear();
    keys.forEach((key) => key.classList.remove('playing'));
  }
  window.addEventListener('blur', stopOnBlur);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopOnBlur();
  });
  findElement('#music-volume').addEventListener('input', (event) => {
    piano.volume = Number(event.target.value) / 100;
    guitar.volume = piano.volume;
    findElement('#volume-output').value = `${event.target.value}%`;
  });
  const strings = findElements('[data-string]');
  function animateString(index) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    strings[index]
      .querySelector('i')
      .animate(
        [
          { transform: 'translateY(0)' },
          { transform: 'translateY(3px)' },
          { transform: 'translateY(-2px)' },
          { transform: 'translateY(1px)' },
          { transform: 'translateY(0)' },
        ],
        { duration: 230 },
      );
  }
  async function pluck(index) {
    try {
      if (await guitar.pluck(index)) {
        animateString(index);
        findElement('#sound-status').textContent =
          `Last string: ${['E2', 'A2', 'D3', 'G3', 'B3', 'E4'][index]}`;
      }
    } catch {
      findElement('#sound-status').textContent = 'Sound is unavailable in this browser.';
    }
  }
  async function strum() {
    try {
      if (await guitar.strum()) {
        strings.forEach((_, i) => animateString(i));
        findElement('#sound-status').textContent = 'Strummed six open strings: E A D G B E.';
      }
    } catch {
      findElement('#sound-status').textContent = 'Sound is unavailable in this browser.';
    }
  }
  strings.forEach((button, index) => button.addEventListener('click', () => pluck(index)));
  findElement('#strum-guitar').addEventListener('click', strum);
  document.addEventListener('keydown', (event) => {
    if (
      !musicDialog.open ||
      instrument !== 'guitar' ||
      event.repeat ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.target.matches('input,textarea,select,[role="tab"]')
    )
      return;
    if (/^[1-6]$/.test(event.key)) {
      event.preventDefault();
      pluck(Number(event.key) - 1);
    }
    if (event.key.toLowerCase() === 's') {
      event.preventDefault();
      strum();
    }
  });
}

const arcadeDialog = findElement('#arcade-dialog');
if (arcadeDialog) {
  const { mountArcade } = await import(`./arcade.js?v=${moduleVersion}`);
  mountArcade(arcadeDialog);
}

const projectDialog = findElement('#project-dialog');
if (projectDialog) {
  let opener;
  const selectProject = setupTabs(projectDialog.querySelector('[role="tablist"]'));
  findElements('[data-preview-project]').forEach((link) =>
    link.addEventListener('click', (event) => {
      // Preserve standard open-in-new-tab actions and the ordinary href fallback.
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0)
        return;
      event.preventDefault();
      opener = link;
      const id = link.dataset.previewProject === 'all' ? 'triaswear' : link.dataset.previewProject;
      selectProject(projectDialog.querySelector(`[data-project-tab="${id}"]`));
      projectDialog.showModal();
    }),
  );
  projectDialog
    .querySelector('.dialog-close')
    .addEventListener('click', () => projectDialog.close());
  projectDialog.addEventListener('click', (event) => {
    const r = projectDialog.getBoundingClientRect();
    if (
      event.target === projectDialog &&
      (event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom)
    )
      projectDialog.close();
  });
  projectDialog.addEventListener('close', () => opener?.focus());
}

// Art, logo, labels, and object targets share one coordinate system.
const room = findElement('#room-scene'),
  layer = findElement('.room-layer');
if (room && layer) {
  const hint = findElement('#room-object-hint'),
    defaultHint = hint.textContent;
  findElements('[data-room-hint]').forEach((target) => {
    ['pointerenter', 'focus'].forEach((type) =>
      target.addEventListener(type, () => {
        hint.textContent = target.dataset.roomHint;
      }),
    );
    ['pointerleave', 'blur'].forEach((type) =>
      target.addEventListener(type, () => {
        hint.textContent = defaultHint;
      }),
    );
  });
  const motion = matchMedia('(prefers-reduced-motion: no-preference) and (pointer: fine)');
  let motionFrame = 0,
    x = 0,
    y = 0;
  function resetMotion() {
    cancelAnimationFrame(motionFrame);
    motionFrame = 0;
    layer.style.transform = '';
  }
  room.addEventListener('pointermove', (event) => {
    if (!motion.matches) return;
    const r = room.getBoundingClientRect();
    x = ((event.clientX - r.left) / r.width - 0.5) * 5;
    y = ((event.clientY - r.top) / r.height - 0.5) * 4;
    if (!motionFrame)
      motionFrame = requestAnimationFrame(() => {
        layer.style.transform = `translate(${x}px,${y}px)`;
        motionFrame = 0;
      });
  });
  room.addEventListener('pointerleave', resetMotion);
  motion.addEventListener('change', resetMotion);
}

findElement('.hotspot-music')?.removeAttribute('disabled');
document.documentElement.classList.add('enhanced');

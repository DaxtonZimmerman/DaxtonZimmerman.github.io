// A small, deterministic game model. Rendering and browser controls live below it.
export const BOARD = { width: 480, height: 320, radius: 5 };
export function newRound() {
  return {
    phase: 'ready',
    score: 0,
    lives: 3,
    paddle: { x: 198, y: 294, width: 84, height: 7 },
    ball: { x: 240, y: 283, vx: 95, vy: -190 },
    bricks: Array.from({ length: 18 }, (_, i) => ({
      x: 31 + (i % 6) * 70,
      y: 48 + Math.floor(i / 6) * 23,
      width: 62,
      height: 14,
      alive: true,
      row: Math.floor(i / 6),
    })),
  };
}
export function movePaddle(game, x) {
  game.paddle.x = Math.max(8, Math.min(BOARD.width - game.paddle.width - 8, x));
  if (['ready', 'serve'].includes(game.phase)) game.ball.x = game.paddle.x + game.paddle.width / 2;
}
export function advance(game, elapsed, direction = 0) {
  if (game.phase !== 'running') return;
  // Small substeps prevent the ball from skipping a thin brick on a slow frame.
  let remaining = Math.min(0.06, Math.max(0, elapsed));
  while (remaining > 0 && game.phase === 'running') {
    const step = Math.min(remaining, 1 / 180);
    remaining -= step;
    movePaddle(game, game.paddle.x + direction * 320 * step);
    const ball = game.ball,
      paddle = game.paddle,
      radius = BOARD.radius;
    const oldX = ball.x,
      oldY = ball.y;
    ball.x += ball.vx * step;
    ball.y += ball.vy * step;
    if (ball.x < radius) {
      ball.x = radius;
      ball.vx = Math.abs(ball.vx);
    }
    if (ball.x > BOARD.width - radius) {
      ball.x = BOARD.width - radius;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y < radius) {
      ball.y = radius;
      ball.vy = Math.abs(ball.vy);
    }
    if (
      ball.vy > 0 &&
      oldY + radius <= paddle.y &&
      ball.y + radius >= paddle.y &&
      ball.x + radius >= paddle.x &&
      ball.x - radius <= paddle.x + paddle.width
    ) {
      ball.y = paddle.y - radius;
      const angle =
        Math.max(-1, Math.min(1, (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2))) *
        1.05;
      const speed = Math.min(285, Math.hypot(ball.vx, ball.vy) + 4);
      ball.vx = Math.sin(angle) * speed;
      ball.vy = -Math.cos(angle) * speed;
    }
    const hit = game.bricks.find(
      (brick) =>
        brick.alive &&
        ball.x + radius > brick.x &&
        ball.x - radius < brick.x + brick.width &&
        ball.y + radius > brick.y &&
        ball.y - radius < brick.y + brick.height,
    );
    if (hit) {
      hit.alive = false;
      game.score += 10;
      if (oldY + radius <= hit.y || oldY - radius >= hit.y + hit.height) ball.vy *= -1;
      else if (oldX + radius <= hit.x || oldX - radius >= hit.x + hit.width) ball.vx *= -1;
      else ball.vy *= -1;
      if (game.bricks.every((brick) => !brick.alive)) game.phase = 'won';
    }
    if (ball.y - radius > BOARD.height) {
      game.lives--;
      game.phase = game.lives ? 'serve' : 'over';
      Object.assign(ball, {
        x: paddle.x + paddle.width / 2,
        y: 283,
        vx: 95 * (game.lives % 2 ? 1 : -1),
        vy: -190,
      });
    }
  }
}

export function mountArcade(dialog) {
  const findElement = (selector) => dialog.querySelector(selector);
  const canvas = findElement('canvas'),
    ctx = canvas.getContext('2d');
  const start = findElement('#arcade-start'),
    overlay = findElement('#arcade-overlay');
  if (!ctx) {
    start.disabled = true;
    findElement('#arcade-status').textContent = 'Canvas is unavailable in this browser.';
    document
      .querySelectorAll('[data-open-arcade]')
      .forEach((button) => button.addEventListener('click', () => dialog.showModal()));
    findElement('.dialog-close').addEventListener('click', () => dialog.close());
    return;
  }
  let game = newRound(),
    opener = null,
    frame = 0,
    lastTime = 0,
    best = 0;
  const pressed = new Set(),
    heldPointers = new Map();
  try {
    best = Number(localStorage.getItem('daxton.signal-break.best')) || 0;
  } catch {}
  best = Math.max(0, Math.min(180, best));
  let lastSnapshot = '';
  const phaseText = {
    ready: ['READY?', 'Press start to play.'],
    paused: ['PAUSED', 'Your round is paused.'],
    serve: ['ONE MORE SHOT.', 'Launch the next ball.'],
    won: ['ALL CLEAR', '18 bricks. Nice work.'],
    over: ['GAME OVER', 'Another round?'],
  };
  const buttonText = {
    ready: 'Start game',
    running: 'Pause game',
    paused: 'Resume game',
    serve: 'Launch ball',
    won: 'Play again',
    over: 'Play again',
  };
  function sync() {
    const snapshot = [game.phase, game.score, game.lives, best].join(':');
    if (snapshot === lastSnapshot) return;
    lastSnapshot = snapshot;
    findElement('#arcade-score').textContent = String(game.score).padStart(3, '0');
    findElement('#arcade-lives').textContent = game.lives;
    if (game.score > best) {
      best = game.score;
      try {
        localStorage.setItem('daxton.signal-break.best', String(best));
      } catch {}
    }
    findElement('#arcade-best').textContent = String(best).padStart(3, '0');
    start.replaceChildren(document.createTextNode(buttonText[game.phase]));
    overlay.hidden = game.phase === 'running';
    if (!overlay.hidden) {
      overlay.firstElementChild.textContent = phaseText[game.phase][0];
      overlay.lastElementChild.textContent = phaseText[game.phase][1];
    }
    const status = {
      ready: 'Press Start to play.',
      running: 'Round in progress. Clear all 18 bricks.',
      paused: 'Paused. Resume whenever you’re ready.',
      serve: `${game.lives} ${game.lives === 1 ? 'life' : 'lives'} left. Launch when ready.`,
      won: `All clear! Final score: ${game.score}.`,
      over: `Game over. Final score: ${game.score}.`,
    };
    findElement('#arcade-status').textContent = status[game.phase];
  }
  function draw() {
    ctx.fillStyle = '#090f24';
    ctx.fillRect(0, 0, 480, 320);
    ctx.strokeStyle = '#1a2842';
    ctx.lineWidth = 1;
    for (let x = 0; x < 480; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, 320);
      ctx.stroke();
    }
    for (let y = 0; y < 320; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(480, y + 0.5);
      ctx.stroke();
    }
    ctx.fillStyle = '#75819e';
    ctx.font = '9px monospace';
    ctx.fillText('DX / 01', 16, 22);
    ctx.textAlign = 'right';
    ctx.fillText('AFTER HOURS', 464, 22);
    ctx.textAlign = 'left';
    game.bricks
      .filter((b) => b.alive)
      .forEach((b) => {
        ctx.fillStyle = ['#eeb363', '#88c4ca', '#a89bcf'][b.row];
        ctx.fillRect(b.x, b.y, b.width, b.height);
        ctx.fillStyle = '#ffffff40';
        ctx.fillRect(b.x, b.y, b.width, 2);
        ctx.fillStyle = '#00000025';
        ctx.fillRect(b.x, b.y + b.height - 3, b.width, 3);
      });
    const p = game.paddle,
      b = game.ball;
    ctx.fillStyle = '#78b7ff20';
    ctx.fillRect(p.x - 5, p.y - 4, p.width + 10, p.height + 8);
    ctx.fillStyle = '#78b7ff';
    ctx.fillRect(p.x, p.y, p.width, p.height);
    ctx.fillStyle = '#fff0d1';
    ctx.fillRect(p.x + 3, p.y, p.width - 6, 2);
    if (game.phase === 'running') {
      ctx.fillStyle = '#78b7ff33';
      ctx.fillRect(Math.round(b.x - b.vx * 0.035) - 3, Math.round(b.y - b.vy * 0.035) - 3, 6, 6);
    }
    ctx.fillStyle = '#f9eee0';
    ctx.fillRect(Math.round(b.x) - 4, Math.round(b.y) - 4, 8, 8);
    ctx.fillStyle = '#78b7ff';
    ctx.fillRect(0, 318, 480, 2);
  }
  function direction() {
    const left =
      pressed.has('arrowleft') || pressed.has('a') || [...heldPointers.values()].includes(-1);
    const right =
      pressed.has('arrowright') || pressed.has('d') || [...heldPointers.values()].includes(1);
    return Number(right) - Number(left);
  }
  function tick(time) {
    frame = 0;
    if (!dialog.open || game.phase !== 'running') return;
    advance(game, lastTime ? (time - lastTime) / 1000 : 0, direction());
    lastTime = time;
    draw();
    sync();
    if (game.phase === 'running') frame = requestAnimationFrame(tick);
  }
  function stopLoop() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    pressed.clear();
    heldPointers.clear();
  }
  function pause() {
    if (game.phase === 'running') game.phase = 'paused';
    stopLoop();
    sync();
    draw();
  }
  function toggle() {
    if (game.phase === 'running') {
      pause();
      return;
    }
    if (['won', 'over'].includes(game.phase)) game = newRound();
    game.phase = 'running';
    sync();
    lastTime = 0;
    if (!frame) frame = requestAnimationFrame(tick);
  }
  document.querySelectorAll('[data-open-arcade]').forEach((button) =>
    button.addEventListener('click', () => {
      opener = button;
      dialog.showModal();
      sync();
      draw();
    }),
  );
  findElement('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      dialog.close();
  });
  dialog.addEventListener('close', () => {
    pause();
    opener?.focus();
  });
  start.addEventListener('click', () => {
    toggle();
    canvas.focus({ preventScroll: true });
  });
  findElement('#arcade-reset').addEventListener('click', () => {
    stopLoop();
    game = newRound();
    sync();
    draw();
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.altKey || event.metaKey || event.ctrlKey) return;
    const key = event.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'a', 'd'].includes(key)) {
      event.preventDefault();
      pressed.add(key);
    }
    if (event.target === canvas && !event.repeat && (key === ' ' || key === 'enter')) {
      event.preventDefault();
      toggle();
    }
  });
  dialog.addEventListener('keyup', (event) => pressed.delete(event.key.toLowerCase()));
  dialog.addEventListener('focusout', () => pressed.clear());
  function point(event) {
    const r = canvas.getBoundingClientRect();
    movePaddle(game, ((event.clientX - r.left) / r.width) * 480 - game.paddle.width / 2);
    draw();
  }
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(event.pointerId);
    point(event);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse' || canvas.hasPointerCapture(event.pointerId)) point(event);
  });
  dialog.querySelectorAll('[data-paddle]').forEach((button) => {
    button.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      button.focus({ preventScroll: true });
      button.setPointerCapture(event.pointerId);
      heldPointers.set(event.pointerId, Number(button.dataset.paddle));
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((type) =>
      button.addEventListener(type, (event) => heldPointers.delete(event.pointerId)),
    );
    // Normal button activation gives keyboard/assistive users a discrete step too.
    button.addEventListener('click', (event) => {
      if (event.detail === 0) {
        movePaddle(game, game.paddle.x + Number(button.dataset.paddle) * 30);
        draw();
      }
    });
  });
  window.addEventListener('blur', pause);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
  });
  sync();
  draw();
}

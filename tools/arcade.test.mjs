import test from 'node:test';
import assert from 'node:assert/strict';
import { newRound, movePaddle, advance, BOARD } from '../dist/arcade.js';

test('paddle clamps to the board and carries the ball before launch', () => {
  const g = newRound();
  movePaddle(g, -200);
  assert.equal(g.paddle.x, 8);
  assert.equal(g.ball.x, 50);
  movePaddle(g, 900);
  assert.equal(g.paddle.x, 388);
  assert.equal(g.ball.x, 430);
});
test('paused rounds freeze, and keyboard movement runs only during play', () => {
  const g = newRound();
  g.phase = 'paused';
  const before = structuredClone(g);
  advance(g, 0.05, 1);
  assert.deepEqual(g, before);
  g.phase = 'running';
  advance(g, 0.05, 1);
  assert(g.paddle.x > before.paddle.x);
  assert(g.ball.y < before.ball.y);
});
test('side walls reflect the ball back into play', () => {
  const g = newRound();
  g.phase = 'running';
  Object.assign(g.ball, { x: 6, y: 180, vx: -200, vy: 0 });
  advance(g, 0.02);
  assert(g.ball.vx > 0);
  assert(g.ball.x >= BOARD.radius);
});
test('paddle catches a descending ball and aims by impact position', () => {
  const g = newRound();
  g.phase = 'running';
  Object.assign(g.ball, { x: 265, y: 284, vx: 0, vy: 220 });
  advance(g, 0.04);
  assert(g.ball.vy < 0);
  assert(g.ball.vx > 0);
  assert.equal(g.lives, 3);
});
test('a lost ball spends one life and waits for a deliberate relaunch', () => {
  const g = newRound();
  g.phase = 'running';
  Object.assign(g.ball, { x: 10, y: 326, vx: 0, vy: 200 });
  advance(g, 0.06);
  assert.equal(g.lives, 2);
  assert.equal(g.phase, 'serve');
  assert.equal(g.score, 0);
  const held = structuredClone(g);
  advance(g, 0.06);
  assert.deepEqual(g, held);
  g.lives = 1;
  g.phase = 'running';
  g.ball.y = 326;
  g.ball.vy = 200;
  advance(g, 0.01);
  assert.equal(g.phase, 'over');
  assert.equal(g.lives, 0);
});
test('substeps catch a fast ball, score once, and detect the final brick', () => {
  const g = newRound();
  g.phase = 'running';
  g.bricks.forEach((b, i) => (b.alive = i === 0));
  Object.assign(g.ball, { x: 60, y: 90, vx: 0, vy: -800 });
  advance(g, 0.06);
  assert.equal(g.score, 10);
  assert.equal(g.phase, 'won');
  assert.equal(g.bricks.filter((b) => b.alive).length, 0);
  advance(g, 0.06);
  assert.equal(g.score, 10);
});
test('a long stalled frame cannot consume an entire round', () => {
  const g = newRound();
  g.phase = 'running';
  advance(g, 30);
  assert.equal(g.lives, 3);
  assert(g.ball.y > 250);
});

import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repository = 'DaxtonZimmerman/DaxtonZimmerman.github.io';
const remote = `https://github.com/${repository}.git`;

function run(command, args, cwd = root) {
  execFileSync(command, args, { cwd, stdio: 'inherit' });
}

// Check the source before replacing the published files.
run('npm', ['run', 'build']);
run('npm', ['run', 'check']);
run('npm', ['test']);

const temporary = mkdtempSync(join(tmpdir(), 'daxton-publish-'));
const checkout = join(temporary, 'site');
try {
  run('git', ['clone', '--depth', '1', '--branch', 'gh-pages', remote, checkout]);
  for (const entry of readdirSync(checkout)) {
    if (entry !== '.git') rmSync(join(checkout, entry), { recursive: true });
  }
  cpSync(join(root, 'dist'), checkout, { recursive: true });
  for (const key of ['user.name', 'user.email']) {
    const value = execFileSync('git', ['config', key], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
    run('git', ['config', key, value], checkout);
  }
  run('git', ['add', '--all'], checkout);
  const changes = execFileSync('git', ['status', '--porcelain'], {
    cwd: checkout,
    encoding: 'utf8',
  });
  if (changes.trim()) {
    run('git', ['commit', '-m', 'Publish checked portfolio files'], checkout);
    run('git', ['push', 'origin', 'gh-pages'], checkout);
  }
  run('gh', ['api', '--method', 'POST', `repos/${repository}/pages/builds`]);
  console.log('Publication requested: https://daxtonzimmerman.github.io/');
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

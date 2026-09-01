import { spawnSync } from 'node:child_process';

const commands = [
  ['npm', ['ci']],
  ['npm', ['run', 'format:check']],
  ['npm', ['run', 'lint']],
  ['npm', ['run', 'typecheck']],
  ['npm', ['run', 'test:coverage']],
  ['npm', ['run', 'test:accessibility']],
  ['npm', ['run', 'test:performance']],
  ['npm', ['run', 'test:scenario-content']],
  ['npm', ['run', 'check:licenses']],
  ['npm', ['run', 'check:security']],
  ['npm', ['run', 'check:bundle']],
  ['npm', ['run', 'test:e2e:release']],
  ['npm', ['run', 'test:e2e:production']],
];

for (const [command, args] of commands) {
  console.log(`\n> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

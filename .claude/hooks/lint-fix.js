#!/usr/bin/env node
// PostToolUse hook: after Claude edits or writes a .js file, run ESLint --fix on it.
// - Anything ESLint can fix is fixed automatically.
// - If real errors remain, exit 2 so Claude is shown the errors and fixes them.
// - Non-JS files, node_modules and files outside the project are ignored.

const { execFileSync } = require('node:child_process');
const path = require('node:path');

let input = '';
process.stdin.on('data', (chunk) => {
  input += chunk;
});
process.stdin.on('end', () => {
  let filePath;
  try {
    filePath = JSON.parse(input).tool_input?.file_path;
  } catch {
    process.exit(0);
  }
  if (!filePath || !filePath.endsWith('.js')) process.exit(0);

  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const rel = path.relative(projectDir, path.resolve(projectDir, filePath));
  if (rel.startsWith('..') || rel.includes('node_modules')) process.exit(0);

  try {
    execFileSync('npx', ['--no-install', 'eslint', '--fix', rel], {
      cwd: projectDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    process.exit(0);
  } catch (err) {
    const output = `${err.stdout || ''}${err.stderr || ''}`.trim();
    process.stderr.write(
      `ESLint found problems in ${rel} that it could not auto-fix. Please fix them:\n${output}\n`,
    );
    process.exit(2);
  }
});

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const eslintBin = join(
	dirname(createRequire(import.meta.url).resolve('eslint/package.json')),
	'bin',
	'eslint.js',
);

const eslintConfig = (file) =>
	fileURLToPath(new URL(`../packages/@n8n/eslint-config/${file}`, import.meta.url));

const defaultPaths = ['packages/nodes-base', 'packages/@n8n/nodes-langchain'];

const paths = process.argv.slice(2);

const { status } = spawnSync(
	process.execPath,
	[
		eslintBin,
		'-c',
		eslintConfig('request-target.config.mjs'),
		'--no-warn-ignored',
		'--no-inline-config',
		'-f',
		eslintConfig('request-target.formatter.mjs'),
		...(paths.length > 0 ? paths : defaultPaths),
	],
	{ stdio: 'inherit' },
);

process.exit(status ?? 1);

const { npm_config_user_agent: UA } = process.env;
const [packageManager] = (UA ?? '').split(' ');
const [name, version] = packageManager.split('/');
if (name !== 'pnpm') {
	const suggestion = '\033[1;92mpnpm\033[0;31m';
	console.error('\033[0;31m');
	console.error('╭───────────────────────────────────────────╮');
	console.error(`│\tPlease use ${suggestion} instead of ${name} \t    │`);
	console.error('╰───────────────────────────────────────────╯');
	console.error('\033[0m');
	process.exit(1);
}

const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
const range = pkg.engines && pkg.engines.node;
const floorMatch = typeof range === 'string' ? range.match(/^>=(\d+)(?:\.\d+){0,2}$/) : null;
const floor = floorMatch ? Number(floorMatch[1]) : NaN;
const major = Number(process.versions.node.split('.')[0]);
if (!Number.isInteger(floor) || major < floor) {
	console.error('\033[0;31m');
	console.error(
		`This repository requires Node.js ${range}. Current version is ${process.versions.node}.`,
	);
	console.error('\033[0m');
	process.exit(1);
}

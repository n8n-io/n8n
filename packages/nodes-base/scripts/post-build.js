const { execFileSync } = require('node:child_process');

function runPostBuild(runCommand = execFileSync, platform = process.platform) {
	const options = { stdio: 'inherit', shell: platform === 'win32' };

	runCommand('pnpm', ['copy-nodes-json'], options);
	runCommand('pnpm', ['exec', 'tsc-alias', '-p', 'tsconfig.build.cjs.json'], options);
	runCommand('pnpm', ['n8n-generate-metadata'], options);
}

if (require.main === module) {
	runPostBuild();
}

module.exports = { runPostBuild };

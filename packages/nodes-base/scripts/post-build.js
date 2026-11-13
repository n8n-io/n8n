const { execFileSync } = require('node:child_process');
const path = require('node:path');

const packageDir = path.resolve(__dirname, '..');

// Run each step with node directly: no pnpm startup per step and no shell on Windows.
const steps = [
	[path.join(__dirname, 'copy-nodes-json.js'), '.'],
	[require.resolve('tsc-alias/dist/bin/index.js'), '-p', 'tsconfig.build.cjs.json'],
	[require.resolve('n8n-core/bin/generate-metadata')],
];

function runPostBuild(runCommand = execFileSync) {
	for (const args of steps) {
		runCommand(process.execPath, args, { cwd: packageDir, stdio: 'inherit' });
	}
}

if (require.main === module) {
	runPostBuild();
}

module.exports = { runPostBuild };

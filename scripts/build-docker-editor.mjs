#!/usr/bin/env node
/**
 * Rebuild only the editor-ui frontend and update the Docker image.
 *
 * Requires a previous full `pnpm build:docker` so that `compiled/` exists.
 * This script:
 *   1. Builds editor-ui (and its workspace deps like design-system, i18n)
 *   2. Copies the new dist into compiled/node_modules/n8n-editor-ui/dist/
 *   3. Rebuilds the Docker image via dockerize-n8n.mjs
 *
 * Usage:
 *   pnpm build:docker:editor
 */

import { $, echo, fs, chalk } from 'zx';
import path from 'path';

$.verbose = false;
process.env.FORCE_COLOR = '1';

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const isInScriptsDir = path.basename(scriptDir) === 'scripts';
const rootDir = isInScriptsDir ? path.join(scriptDir, '..') : scriptDir;

const compiledDir = path.join(rootDir, 'compiled');
const compiledEditorDist = path.join(compiledDir, 'node_modules', 'n8n-editor-ui', 'dist');
const sourceEditorDist = path.join(rootDir, 'packages', 'frontend', 'editor-ui', 'dist');

// ===== Validation =====

if (!(await fs.pathExists(compiledDir))) {
	echo(chalk.red('Error: compiled/ directory not found.'));
	echo(chalk.yellow('Run `pnpm build:docker` first for the initial full build,'));
	echo(chalk.yellow('then use `pnpm build:docker:editor` for subsequent editor-only rebuilds.'));
	process.exit(1);
}

if (!(await fs.pathExists(path.join(compiledDir, 'node_modules', 'n8n-editor-ui')))) {
	echo(chalk.red('Error: compiled/node_modules/n8n-editor-ui/ not found.'));
	echo(chalk.yellow('The compiled/ directory may be corrupt. Run `pnpm build:docker` to rebuild.'));
	process.exit(1);
}

echo(chalk.blue.bold('===== Editor-only Docker Build ====='));
echo(
	chalk.yellow(
		'WARNING: This only rebuilds editor-ui. Backend changes require a full `pnpm build:docker`.',
	),
);
echo(chalk.gray('-'.repeat(47)));

const startTime = Date.now();

// ===== Step 1: Build editor-ui and its workspace deps =====

echo(chalk.yellow('INFO: Building editor-ui and workspace dependencies...'));
const buildStart = Date.now();

try {
	const buildProcess = $`cd ${rootDir} && pnpm --filter=n8n-editor-ui... build`;
	buildProcess.pipe(process.stdout);
	await buildProcess;
	echo(chalk.green(`✅ Editor-ui built in ${Math.floor((Date.now() - buildStart) / 1000)}s`));
} catch (error) {
	echo(chalk.red('🛑 Editor-ui build failed!'));
	process.exit(1);
}

// ===== Step 2: Copy dist into compiled/ =====

echo(chalk.yellow('INFO: Copying editor-ui dist into compiled/...'));

if (!(await fs.pathExists(sourceEditorDist))) {
	echo(chalk.red(`Error: Editor-ui dist not found at ${sourceEditorDist}`));
	echo(chalk.yellow('The build may have failed silently. Check the output above.'));
	process.exit(1);
}

await fs.remove(compiledEditorDist);
await fs.copy(sourceEditorDist, compiledEditorDist);
echo(chalk.green('✅ Editor-ui dist copied to compiled/'));

// ===== Step 3: Rebuild Docker image =====

echo(chalk.yellow('INFO: Rebuilding Docker image...'));
const dockerStart = Date.now();

try {
	const dockerProcess = $`node ${path.join(scriptDir, 'dockerize-n8n.mjs')}`;
	dockerProcess.pipe(process.stdout);
	await dockerProcess;
} catch (error) {
	echo(chalk.red('🛑 Docker build failed!'));
	process.exit(1);
}

// ===== Summary =====

const totalSeconds = Math.floor((Date.now() - startTime) / 1000);
const minutes = Math.floor(totalSeconds / 60);
const seconds = totalSeconds % 60;
const duration = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

echo('');
echo(chalk.green.bold('═'.repeat(47)));
echo(chalk.green.bold('     EDITOR-ONLY DOCKER BUILD COMPLETE'));
echo(chalk.green.bold('═'.repeat(47)));
echo(`   Build time:  ${Math.floor((Date.now() - buildStart) / 1000)}s (editor-ui)`);
echo(`   Docker time: ${Math.floor((Date.now() - dockerStart) / 1000)}s`);
echo(`   Total:       ${duration}`);
echo(chalk.green.bold('═'.repeat(47)));

process.exit(0);

// Resets the repository by deleting all untracked files except for few exceptions.
import { $, argv, echo, fs } from 'zx';

$.verbose = true;
process.env.FORCE_COLOR = '1';

const excludePatterns = ['/.vscode/', '/.idea/', '.env', '/.claude/'];
const excludeFlags = excludePatterns.map((exclude) => ['-e', exclude]).flat();

echo(
	`This will delete all untracked files except for those matching the following patterns: ${excludePatterns.map((x) => `"${x}"`).join(', ')}.`,
);

const skipConfirmation = argv.force || argv.f;

if (!skipConfirmation) {
	const answer = await question('❓ Do you want to continue? (y/n) ');

	if (!['y', 'Y', ''].includes(answer)) {
		echo('Aborting...');
		process.exit(0);
	}
}

echo('🧹 Cleaning untracked files...');
await $({ verbose: false })`git clean -fxd ${excludeFlags}`;
// In case node_modules is not removed by git clean
fs.removeSync('node_modules');

echo('⏬ Running pnpm install...');
await $`pnpm install`;

echo('🏗️ Running pnpm build...');
await $`pnpm build`;

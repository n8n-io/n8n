// Resets the repository by deleting all untracked files except for few exceptions.
import { $, echo } from 'zx';

$.verbose = true;

const excludePatterns = ['.vscode/settings.json', '.env'];
const excludeFlags = excludePatterns.map((exclude) => ['-e', exclude]).flat();

echo(
	`This will delete all untracked files except for ${excludePatterns.map((x) => `"${x}"`).join(', ')}.`,
);

const answer = await question('❓ Do you want to continue? (y/n) ');

if (!['y', 'Y', ''].includes(answer)) {
	echo('Aborting...');
	process.exit(0);
}

echo('🧹 Cleaning untracked files...');
await $({ verbose: false })`git clean -fxd ${excludeFlags}`;

echo('⏬ Running pnpm install...');
await $`pnpm install`;

echo('🏗️ Running pnpm build...');
await $`pnpm install`;

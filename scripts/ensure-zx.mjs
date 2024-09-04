import { accessSync, constants } from 'node:fs';
import { execSync } from 'node:child_process';

const ZX_PATH = 'node_modules/.bin/zx';

if (!zxExists()) {
	execSync('pnpm --frozen-lockfile --filter n8n-monorepo install', { stdio: 'inherit' });
}

function zxExists() {
	try {
		accessSync(ZX_PATH, constants.F_OK);
		return true;
	} catch {
		return false;
	}
}

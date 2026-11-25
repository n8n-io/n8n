import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll } from 'vitest';

// Keep tests away from the real ~/.config/rig, for example global secrets and profiles.
const root = mkdtempSync(join(tmpdir(), 'rig-home-'));
process.env.RIG_CONFIG_DIR = join(root, 'config');
process.env.RIG_DATA_DIR = join(root, 'data');
process.env.RIG_CACHE_DIR = join(root, 'cache');
delete process.env.RIG_LAUNCHER_PATH;
delete process.env.RIG_ENV;

afterAll(() => {
	rmSync(root, { recursive: true, force: true });
});

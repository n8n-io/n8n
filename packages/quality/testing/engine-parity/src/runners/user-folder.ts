import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * n8n settings read this folder when n8n-core loads, so call this before the
 * runners load. It always uses a new temporary folder, also when
 * `N8N_USER_FOLDER` is set, so the runs stay out of the user's own n8n folder.
 * Returns a function that removes the folder and restores the variable.
 */
export function useTestUserFolder(): () => void {
	const previous = process.env.N8N_USER_FOLDER;
	const folder = mkdtempSync(join(tmpdir(), 'n8n-engine-parity-'));
	process.env.N8N_USER_FOLDER = folder;
	return () => {
		if (previous === undefined) delete process.env.N8N_USER_FOLDER;
		else process.env.N8N_USER_FOLDER = previous;
		rmSync(folder, { recursive: true, force: true });
	};
}

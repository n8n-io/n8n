import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * n8n settings read this folder when n8n-core loads, so call this before the
 * runners load. It keeps the runs out of the user's own n8n folder.
 * Returns a function that removes the folder, if this call made it.
 */
export function useTestUserFolder(): () => void {
	if (process.env.N8N_USER_FOLDER) return () => {};
	const folder = mkdtempSync(join(tmpdir(), 'n8n-engine-parity-'));
	process.env.N8N_USER_FOLDER = folder;
	return () => rmSync(folder, { recursive: true, force: true });
}

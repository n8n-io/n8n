import { randomBytes } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type { IVolumeManager, VolumeMetadata } from './ICommandExecutor';

const MANIFEST_FILE = '.n8n-volume.manifest.json';
const DATA_DIR = 'data';

/**
 * Manages volumes as directories on the local host filesystem.
 * Mirrors the S3-backed VolumesService from @n8n/command-execution-service
 * but stores everything under a configurable local directory.
 *
 * Volume layout on disk:
 * ```
 * <root>/
 *   vol_xxxxxxxxxxxx/
 *     .n8n-volume.manifest.json   ← metadata (id, name, createdAt)
 *     data/                        ← user files (bind-mounted into sandbox)
 *   vol_yyyyyyyyyyyy/
 *     .n8n-volume.manifest.json
 *     data/
 * ```
 *
 * The root directory is read from the `N8N_SECURE_EXEC_VOLUMES_DIR` env var,
 * defaulting to `~/.n8n/secure-exec-volumes/`.
 */
export class LocalVolumeManager implements IVolumeManager {
	private readonly rootDir: string;

	constructor() {
		this.rootDir =
			process.env.N8N_SECURE_EXEC_VOLUMES_DIR ?? join(homedir(), '.n8n', 'secure-exec-volumes');
	}

	async createVolume(name?: string): Promise<VolumeMetadata> {
		const id = `vol_${randomBytes(9).toString('base64url')}`;
		const volumeName = name ?? id;

		const volumeDir = join(this.rootDir, id);
		const dataDir = join(volumeDir, DATA_DIR);

		// Create both the volume directory and its data subdirectory
		await mkdir(dataDir, { recursive: true });

		const metadata: VolumeMetadata = {
			id,
			name: volumeName,
			createdAt: new Date().toISOString(),
		};

		await writeFile(join(volumeDir, MANIFEST_FILE), JSON.stringify(metadata));

		return metadata;
	}

	async listVolumes(): Promise<VolumeMetadata[]> {
		// Ensure root directory exists before listing
		await mkdir(this.rootDir, { recursive: true });

		const entries = await readdir(this.rootDir, { withFileTypes: true });
		const volumes: VolumeMetadata[] = [];

		for (const entry of entries) {
			if (!entry.isDirectory() || !entry.name.startsWith('vol_')) continue;

			try {
				const manifestPath = join(this.rootDir, entry.name, MANIFEST_FILE);
				const raw = await readFile(manifestPath, 'utf-8');
				const metadata = JSON.parse(raw) as VolumeMetadata;
				volumes.push(metadata);
			} catch {
				// Skip volumes with corrupted/missing manifests
			}
		}

		return volumes;
	}

	async deleteVolume(id: string): Promise<void> {
		const volumeDir = join(this.rootDir, id);
		await rm(volumeDir, { recursive: true, force: true });
	}

	/**
	 * Check whether a volume exists by looking for its manifest file.
	 */
	async exists(id: string): Promise<boolean> {
		try {
			await readFile(join(this.rootDir, id, MANIFEST_FILE));
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Returns the absolute host path to a volume's data directory.
	 * This path is used for bind-mounting into the bwrap sandbox.
	 */
	getDataPath(id: string): string {
		return join(this.rootDir, id, DATA_DIR);
	}
}

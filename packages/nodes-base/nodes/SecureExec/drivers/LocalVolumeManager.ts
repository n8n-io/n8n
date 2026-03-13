import { randomBytes } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type { IVolumeManager, VolumeMetadata } from './ICommandExecutor';

const MANIFEST_FILE = '.n8n-volume.manifest.json';
const DATA_DIR = 'data';

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

	async exists(id: string): Promise<boolean> {
		try {
			await readFile(join(this.rootDir, id, MANIFEST_FILE));
			return true;
		} catch {
			return false;
		}
	}

	getDataPath(id: string): string {
		return join(this.rootDir, id, DATA_DIR);
	}
}

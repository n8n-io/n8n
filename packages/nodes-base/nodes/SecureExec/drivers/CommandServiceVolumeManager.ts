import type { IVolumeManager, VolumeMetadata } from './ICommandExecutor';
import { commandServiceRequest } from './commandServiceRequest';

export class CommandServiceVolumeManager implements IVolumeManager {
	private readonly serviceUrl: string;

	constructor(serviceUrl: string) {
		// Strip trailing slash
		this.serviceUrl = serviceUrl.replace(/\/+$/, '');
	}

	async createVolume(name?: string): Promise<VolumeMetadata> {
		const body = name ? { name } : {};
		return await commandServiceRequest<VolumeMetadata>(this.serviceUrl, 'POST', '/volumes', body);
	}

	async listVolumes(): Promise<VolumeMetadata[]> {
		const response = await commandServiceRequest<{ volumes: VolumeMetadata[] }>(
			this.serviceUrl,
			'GET',
			'/volumes',
		);
		return response.volumes;
	}

	async deleteVolume(id: string): Promise<void> {
		await commandServiceRequest(this.serviceUrl, 'DELETE', `/volumes/${encodeURIComponent(id)}`);
	}
}

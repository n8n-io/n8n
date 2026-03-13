import type {
	ExecutionOptions,
	ExecutionResult,
	ICommandExecutor,
	IVolumeManager,
	VolumeMetadata,
} from './ICommandExecutor';

export class CommandServiceDriver implements ICommandExecutor, IVolumeManager {
	constructor(private readonly serviceUrl: string) {
		// Strip trailing slash
		this.serviceUrl = serviceUrl.replace(/\/+$/, '');
	}

	async execute(options: ExecutionOptions): Promise<ExecutionResult> {
		const body: Record<string, unknown> = {
			command: options.command,
		};

		if (options.timeoutMs !== undefined) {
			body.timeoutMs = options.timeoutMs;
		}

		if (options.env && Object.keys(options.env).length > 0) {
			body.env = options.env;
		}

		if (options.volumes && options.volumes.length > 0) {
			body.volumes = options.volumes.map((v) => ({
				volumeId: v.volumeId,
				mountPath: v.mountPath,
				...(v.readOnly ? { readOnly: true } : {}),
			}));
		}

		if (options.workspacePath) {
			body.workspacePath = options.workspacePath;
		}

		const response = await this.request<ExecutionResult>('POST', '/execute', body);
		return response;
	}

	async createVolume(name?: string): Promise<VolumeMetadata> {
		const body = name ? { name } : {};
		return await this.request<VolumeMetadata>('POST', '/volumes', body);
	}

	async listVolumes(): Promise<VolumeMetadata[]> {
		const response = await this.request<{ volumes: VolumeMetadata[] }>('GET', '/volumes');
		return response.volumes;
	}

	async deleteVolume(id: string): Promise<void> {
		await this.request('DELETE', `/volumes/${encodeURIComponent(id)}`);
	}

	private async request<T>(
		method: string,
		path: string,
		body?: Record<string, unknown>,
	): Promise<T> {
		const url = `${this.serviceUrl}${path}`;

		const headers: Record<string, string> = {};
		if (body) {
			headers['Content-Type'] = 'application/json';
		}

		const response = await fetch(url, {
			method,
			headers,
			body: body ? JSON.stringify(body) : undefined,
		});

		// DELETE /volumes/:id returns 204 No Content
		if (response.status === 204) {
			return undefined as T;
		}

		if (!response.ok) {
			let errorMessage: string;
			try {
				const errorBody = (await response.json()) as { message?: string };
				errorMessage = errorBody.message ?? response.statusText;
			} catch {
				errorMessage = response.statusText;
			}
			throw new Error(
				`Command service request failed: ${method} ${path} → ${response.status} ${errorMessage}`,
			);
		}

		return (await response.json()) as T;
	}
}

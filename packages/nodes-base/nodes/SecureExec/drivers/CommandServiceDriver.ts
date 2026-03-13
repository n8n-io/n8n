import type {
	ExecutionOptions,
	ExecutionResult,
	ICommandExecutor,
	IVolumeManager,
	VolumeMetadata,
} from './ICommandExecutor';

/**
 * HTTP client driver that delegates command execution and volume management
 * to the @n8n/command-execution-service over HTTP.
 *
 * Unlike local drivers (Docker, Bubblewrap, Host), this driver:
 * - Supports volume mounts (S3-backed persistent volumes)
 * - Implements IVolumeManager for volume CRUD
 * - Runs no local processes — all work happens on the remote service
 */
export class CommandServiceDriver implements ICommandExecutor, IVolumeManager {
	constructor(private readonly serviceUrl: string) {
		// Strip trailing slash for consistent URL construction
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
		await this.request<void>('DELETE', `/volumes/${encodeURIComponent(id)}`);
	}

	/**
	 * Verify the command-execution-service is reachable.
	 */
	async healthCheck(): Promise<boolean> {
		try {
			await this.request<{ status: string }>('GET', '/health');
			return true;
		} catch {
			return false;
		}
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

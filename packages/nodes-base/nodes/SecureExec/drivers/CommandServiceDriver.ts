import type { ExecutionOptions, ExecutionResult, ICommandExecutor } from './ICommandExecutor';
import { commandServiceRequest } from './commandServiceRequest';

export class CommandServiceDriver implements ICommandExecutor {
	private readonly serviceUrl: string;

	constructor(serviceUrl: string) {
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

		return await commandServiceRequest<ExecutionResult>(this.serviceUrl, 'POST', '/execute', body);
	}
}

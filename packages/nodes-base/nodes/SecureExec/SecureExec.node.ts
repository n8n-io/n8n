import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { createDriver, type DriverType } from './DriverFactory';

export class SecureExec implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Secure Exec',
		name: 'secureExec',
		icon: 'fa:shield-alt',
		iconColor: 'green',
		group: ['transform'],
		version: 1,
		description:
			'Executes a shell command in an isolated environment (Docker or Bubblewrap sandbox)',
		defaults: {
			name: 'Secure Exec',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Command',
				name: 'command',
				type: 'string',
				typeOptions: { rows: 5, editor: 'codeNodeEditor' },
				default: '',
				placeholder: 'echo "hello world"',
				description: 'The shell command to execute inside the sandbox',
				required: true,
			},
			{
				displayName: 'Execute Once',
				name: 'executeOnce',
				type: 'boolean',
				default: true,
				description: 'Whether to execute only once instead of once for each input item',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Driver',
						name: 'driver',
						type: 'options',
						default: 'auto',
						description:
							'Isolation backend to use. Auto-detect picks Docker → Bubblewrap → Host in order of preference.',
						options: [
							{ name: 'Auto-detect', value: 'auto' },
							{ name: 'Docker', value: 'docker' },
							{ name: 'Bubblewrap (Linux only)', value: 'bubblewrap' },
							{ name: 'Host (no isolation)', value: 'host' },
						],
					},
					{
						displayName: 'Container Image',
						name: 'containerImage',
						type: 'string',
						default: 'ubuntu:24.04',
						description: 'Docker image to use when the Docker driver is active',
						displayOptions: {
							show: { driver: ['docker', 'auto'] },
						},
					},
					{
						displayName: 'Working Directory',
						name: 'workspacePath',
						type: 'string',
						default: '',
						placeholder: '/data/my-workspace',
						description:
							'Host path to mount into the sandbox as the working directory. Leave empty to use a temporary directory.',
					},
					{
						displayName: 'Timeout (ms)',
						name: 'timeoutMs',
						type: 'number',
						default: 30_000,
						description: 'Maximum time in milliseconds before the command is killed',
					},
					{
						displayName: 'Memory Limit (MB)',
						name: 'memoryMB',
						type: 'number',
						default: 512,
						description: 'Maximum memory the container may use (Docker only)',
						displayOptions: {
							show: { driver: ['docker', 'auto'] },
						},
					},
					{
						displayName: 'Environment Variables',
						name: 'envVars',
						type: 'fixedCollection',
						typeOptions: { multipleValues: true },
						default: {},
						options: [
							{
								name: 'variable',
								displayName: 'Variable',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
									},
								],
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let items = this.getInputData();
		const executeOnce = this.getNodeParameter('executeOnce', 0) as boolean;

		if (executeOnce) {
			items = [items[0]];
		}

		const returnItems: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const command = this.getNodeParameter('command', itemIndex) as string;
				const options = this.getNodeParameter('options', itemIndex, {}) as {
					driver?: DriverType;
					containerImage?: string;
					workspacePath?: string;
					timeoutMs?: number;
					memoryMB?: number;
					envVars?: { variable?: Array<{ name: string; value: string }> };
				};

				const driverType = options.driver ?? 'auto';
				const { driver, type: activeDriver, isUnsafeFallback } = createDriver(driverType);

				if (isUnsafeFallback) {
					this.logger.warn(
						'SecureExec: No Docker socket or bwrap found — falling back to direct host execution. Commands run with n8n process permissions.',
					);
				}

				const env: Record<string, string> = {};
				for (const { name, value } of options.envVars?.variable ?? []) {
					if (name) env[name] = value;
				}

				const result = await driver.execute({
					command,
					containerImage: options.containerImage,
					workspacePath: options.workspacePath || undefined,
					timeoutMs: options.timeoutMs,
					memoryMB: options.memoryMB,
					env: Object.keys(env).length > 0 ? env : undefined,
				});

				returnItems.push({
					json: {
						stdout: result.stdout,
						stderr: result.stderr,
						exitCode: result.exitCode,
						driver: activeDriver,
					},
					pairedItem: { item: itemIndex },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnItems.push({
						json: { error: (error as Error).message },
						pairedItem: { item: itemIndex },
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex });
			}
		}

		return [returnItems];
	}
}

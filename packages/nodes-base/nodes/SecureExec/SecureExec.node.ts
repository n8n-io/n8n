import { NodesConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { createDriver, type DriverType } from './DriverFactory';
import type { ICommandExecutor, IVolumeManager, VolumeMount } from './drivers/ICommandExecutor';

export class SecureExec implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Secure Exec',
		name: 'secureExec',
		icon: 'fa:shield',
		iconColor: 'green',
		group: ['transform'],
		version: 1,
		description: 'Executes shell commands in an isolated sandbox with optional persistent volumes',
		defaults: {
			name: 'Secure Exec',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-class-description-credentials-name-unsuffixed
				name: 'secureExecEnvironmentVariables',
				required: false,
				displayOptions: {
					show: {
						sendSensitiveEnvVars: [true],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'command',
				options: [
					{
						name: 'Command',
						value: 'command',
					},
					{
						name: 'Volume',
						value: 'volume',
					},
				],
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				default: 'execute',
				displayOptions: {
					show: {
						resource: ['command'],
					},
				},
				options: [
					{
						name: 'Execute',
						value: 'execute',
						description: 'Execute a shell command in the sandbox',
						action: 'Execute a command',
					},
				],
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				default: 'create',
				displayOptions: {
					show: {
						resource: ['volume'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new volume',
						action: 'Create a volume',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a volume',
						action: 'Delete a volume',
					},
					{
						name: 'List',
						value: 'list',
						description: 'List all volumes',
						action: 'List volumes',
					},
				],
			},
			{
				displayName: 'Send Sensitive Environment Variables',
				name: 'sendSensitiveEnvVars',
				type: 'boolean',
				default: false,
				description:
					'Whether to inject environment variables from stored credentials into the sandbox',
				displayOptions: {
					show: {
						resource: ['command'],
						operation: ['execute'],
					},
				},
			},
			{
				displayName: 'Command',
				name: 'command',
				type: 'string',
				typeOptions: { rows: 5 },
				default: '',
				placeholder: 'echo "hello world"',
				description: 'The shell command to execute inside the sandbox',
				required: true,
				displayOptions: {
					show: {
						resource: ['command'],
						operation: ['execute'],
					},
				},
			},
			{
				displayName: 'Execute Once',
				name: 'executeOnce',
				type: 'boolean',
				default: true,
				description: 'Whether to execute only once instead of once for each input item',
				displayOptions: {
					show: {
						resource: ['command'],
						operation: ['execute'],
					},
				},
			},
			{
				displayName: 'Volumes',
				name: 'volumes',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				placeholder: 'Add Volume Mount',
				description: 'Volumes to mount inside the sandbox',
				displayOptions: {
					show: {
						resource: ['command'],
						operation: ['execute'],
					},
				},
				options: [
					{
						name: 'mount',
						displayName: 'Mount',
						values: [
							{
								displayName: 'Volume ID',
								name: 'volumeId',
								type: 'string',
								default: '',
								placeholder: 'vol_xxxxxxxxxxxx',
								description: 'ID of an existing volume',
								required: true,
							},
							{
								displayName: 'Mount Path',
								name: 'mountPath',
								type: 'string',
								default: '',
								placeholder: '/data',
								description: 'Absolute path inside the sandbox where the volume will be mounted',
								required: true,
							},
							{
								displayName: 'Read Only',
								name: 'readOnly',
								type: 'boolean',
								default: false,
								description:
									'Whether the volume is mounted read-only. Read-only volumes are not synced back after execution.',
							},
						],
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: {
					show: {
						resource: ['command'],
						operation: ['execute'],
					},
				},
				options: [
					{
						displayName: 'Working Directory',
						name: 'workspacePath',
						type: 'string',
						default: '',
						placeholder: '/data/my-workspace',
						description:
							'Working directory for command execution inside the sandbox. Defaults to /workspace.',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						displayName: 'Timeout (ms)',
						name: 'timeoutMs',
						type: 'number',
						default: 30_000,
						description: 'Maximum time in milliseconds before the command is killed',
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
			{
				displayName: 'Volume Name',
				name: 'volumeName',
				type: 'string',
				default: '',
				placeholder: 'my-workspace',
				description: 'Optional name for the volume. If empty, an auto-generated ID is used.',
				displayOptions: {
					show: {
						resource: ['volume'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Volume ID',
				name: 'volumeId',
				type: 'string',
				default: '',
				placeholder: 'vol_xxxxxxxxxxxx',
				description: 'ID of the volume to delete',
				required: true,
				displayOptions: {
					show: {
						resource: ['volume'],
						operation: ['delete'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const nodesConfig = Container.get(NodesConfig);
		const supportedDrivers: DriverType[] = ['bubblewrap', 'command-service'];
		if (!supportedDrivers.includes(nodesConfig.secureExecDriver as DriverType)) {
			throw new NodeOperationError(
				this.getNode(),
				"The Secure Exec node requires N8N_SECURE_EXEC_DRIVER to be set to 'bubblewrap' or 'command-service'.",
			);
		}

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		const isExecuteCommandOperation = resource === 'command' && operation === 'execute';

		const { driver, volumeManager, type: activeDriver } = createDriver();
		try {
			if (isExecuteCommandOperation) {
				if (driver.initialize) {
					await driver.initialize();
				}

				return await executeCommand(this, driver, activeDriver);
			}

			if (resource === 'volume') {
				return await executeVolumeOperation(this, volumeManager, operation);
			}

			throw new NodeOperationError(
				this.getNode(),
				`Unknown resource/operation: ${resource}/${operation}`,
			);
		} finally {
			if (isExecuteCommandOperation && driver.cleanup) {
				await driver.cleanup();
			}
		}
	}
}

async function executeCommand(
	context: IExecuteFunctions,
	driver: ICommandExecutor,
	activeDriver: string,
): Promise<INodeExecutionData[][]> {
	let items = context.getInputData();
	const executeOnce = context.getNodeParameter('executeOnce', 0) as boolean;

	if (executeOnce) {
		items = [items[0]];
	}

	const returnItems: INodeExecutionData[] = [];

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		try {
			const command = context.getNodeParameter('command', itemIndex) as string;
			const options = context.getNodeParameter('options', itemIndex, {}) as {
				workspacePath?: string;
				timeoutMs?: number;
				envVars?: { variable?: Array<{ name: string; value: string }> };
			};

			const env: Record<string, string> = {};

			// Merge env vars from credential (stored securely) first, so inline vars can override
			try {
				const credentialData = await context.getCredentials(
					'secureExecEnvironmentVariables',
					itemIndex,
				);
				const credVars = (
					credentialData.variables as {
						values?: Array<{ name: string; value: string }>;
					}
				)?.values;
				for (const { name, value } of credVars ?? []) {
					if (name) env[name] = value;
				}
			} catch {
				// credential not configured — skip
			}

			for (const { name, value } of options.envVars?.variable ?? []) {
				if (name) env[name] = value;
			}

			const volumesParam = context.getNodeParameter('volumes', itemIndex, {}) as {
				mount?: Array<{ volumeId: string; mountPath: string; readOnly?: boolean }>;
			};
			const volumeMounts: VolumeMount[] = (volumesParam.mount ?? [])
				.filter((m) => m.volumeId && m.mountPath)
				.map((m) => ({
					volumeId: m.volumeId,
					mountPath: m.mountPath,
					readOnly: m.readOnly,
				}));

			const result = await driver.execute({
				command,
				workspacePath: options.workspacePath ?? undefined,
				timeoutMs: options.timeoutMs,
				env: Object.keys(env).length > 0 ? env : undefined,
				volumes: volumeMounts.length > 0 ? volumeMounts : undefined,
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
			if (context.continueOnFail()) {
				returnItems.push({
					json: { error: (error as Error).message },
					pairedItem: { item: itemIndex },
				});
				continue;
			}
			throw new NodeOperationError(context.getNode(), error as Error, { itemIndex });
		}
	}

	return [returnItems];
}

async function executeVolumeOperation(
	context: IExecuteFunctions,
	volumeManager: IVolumeManager,
	operation: string,
): Promise<INodeExecutionData[][]> {
	const items = context.getInputData();
	const returnItems: INodeExecutionData[] = [];

	switch (operation) {
		case 'create': {
			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				try {
					const volumeName = context.getNodeParameter('volumeName', itemIndex, '') as string;
					const volume = await volumeManager.createVolume(volumeName || undefined);
					returnItems.push({
						json: {
							id: volume.id,
							name: volume.name,
							createdAt: volume.createdAt,
						},
						pairedItem: { item: itemIndex },
					});
				} catch (error) {
					if (context.continueOnFail()) {
						returnItems.push({
							json: { error: (error as Error).message },
							pairedItem: { item: itemIndex },
						});
						continue;
					}
					throw new NodeOperationError(context.getNode(), error as Error, { itemIndex });
				}
			}
			break;
		}
		case 'list': {
			try {
				const volumes = await volumeManager.listVolumes();
				for (const volume of volumes) {
					returnItems.push({
						json: {
							id: volume.id,
							name: volume.name,
							createdAt: volume.createdAt,
						},
					});
				}
			} catch (error) {
				if (context.continueOnFail()) {
					returnItems.push({
						json: { error: (error as Error).message },
					});
				} else {
					throw new NodeOperationError(context.getNode(), error as Error);
				}
			}
			break;
		}
		case 'delete': {
			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				try {
					const volumeId = context.getNodeParameter('volumeId', itemIndex) as string;
					if (!volumeId) {
						throw new NodeOperationError(context.getNode(), 'Volume ID is required');
					}
					await volumeManager.deleteVolume(volumeId);
					returnItems.push({
						json: { deleted: true, volumeId },
						pairedItem: { item: itemIndex },
					});
				} catch (error) {
					if (context.continueOnFail()) {
						returnItems.push({
							json: { error: (error as Error).message },
							pairedItem: { item: itemIndex },
						});
						continue;
					}
					throw new NodeOperationError(context.getNode(), error as Error, { itemIndex });
				}
			}
			break;
		}
		default:
			throw new NodeOperationError(context.getNode(), `Unknown volume operation: ${operation}`);
	}

	return [returnItems];
}

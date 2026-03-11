import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { createDriver, isVolumeManager } from './DriverFactory';
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
		properties: [
			// ── Resource selector ──
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

			// ── Operation selectors ──
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

			// ── Command: Execute fields ──
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
				description:
					'Volumes to mount inside the sandbox. Requires the command-service driver (N8N_SECURE_EXEC_DRIVER=command-service). Ignored by local drivers.',
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
						displayName: 'Container Image',
						name: 'containerImage',
						type: 'string',
						default: 'ubuntu:24.04',
						description:
							'Docker image to use when the Docker driver is active (controlled via N8N_SECURE_EXEC_DRIVER)',
					},
					{
						displayName: 'Working Directory',
						name: 'workspacePath',
						type: 'string',
						default: '',
						placeholder: '/data/my-workspace',
						description:
							'Host path to mount into the sandbox as the working directory. Leave empty to use a temporary directory. Only used by local drivers.',
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
						displayName: 'Memory Limit (MB)',
						name: 'memoryMB',
						type: 'number',
						default: 512,
						description: 'Maximum memory the container may use (Docker only)',
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

			// ── Volume: Create fields ──
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

			// ── Volume: Delete fields ──
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

			// ── Volume: List has no extra fields ──
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		const { driver, type: activeDriver, isUnsafeFallback } = createDriver();

		if (isUnsafeFallback) {
			this.logger.warn(
				'SecureExec: No Docker socket or bwrap found — falling back to direct host execution. Commands run with n8n process permissions.',
			);
		}

		if (driver.initialize) {
			await driver.initialize();
		}

		try {
			if (resource === 'command' && operation === 'execute') {
				return await executeCommand(this, driver, activeDriver);
			}

			if (resource === 'volume') {
				return await executeVolumeOperation(this, driver, operation);
			}

			throw new NodeOperationError(
				this.getNode(),
				`Unknown resource/operation: ${resource}/${operation}`,
			);
		} finally {
			if (driver.cleanup) {
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
				containerImage?: string;
				workspacePath?: string;
				timeoutMs?: number;
				memoryMB?: number;
				envVars?: { variable?: Array<{ name: string; value: string }> };
			};

			const env: Record<string, string> = {};
			for (const { name, value } of options.envVars?.variable ?? []) {
				if (name) env[name] = value;
			}

			// Parse volume mounts from the UI
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

			// Warn if volumes are specified but the driver doesn't support them
			if (volumeMounts.length > 0 && !isVolumeManager(driver)) {
				context.logger.warn(
					`SecureExec: Volume mounts are ignored by the '${activeDriver}' driver. Use the 'command-service' driver for volume support.`,
				);
			}

			const result = await driver.execute({
				command,
				containerImage: options.containerImage,
				workspacePath: options.workspacePath ?? undefined,
				timeoutMs: options.timeoutMs,
				memoryMB: options.memoryMB,
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
	driver: ICommandExecutor,
	operation: string,
): Promise<INodeExecutionData[][]> {
	if (!isVolumeManager(driver)) {
		throw new NodeOperationError(
			context.getNode(),
			'Volume operations require the command-service driver. Set N8N_SECURE_EXEC_DRIVER=command-service and N8N_SECURE_EXEC_COMMAND_SERVICE_URL to use volumes.',
		);
	}

	const volumeDriver = driver as ICommandExecutor & IVolumeManager;
	const items = context.getInputData();
	const returnItems: INodeExecutionData[] = [];

	switch (operation) {
		case 'create': {
			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				try {
					const volumeName = context.getNodeParameter('volumeName', itemIndex, '') as string;
					const volume = await volumeDriver.createVolume(volumeName || undefined);
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
				const volumes = await volumeDriver.listVolumes();
				for (const volume of volumes) {
					returnItems.push({
						json: {
							id: volume.id,
							name: volume.name,
							createdAt: volume.createdAt,
						},
					});
				}
				// If no volumes, return empty item so downstream nodes don't fail
				if (returnItems.length === 0) {
					returnItems.push({ json: {} });
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
						throw new Error('Volume ID is required');
					}
					await volumeDriver.deleteVolume(volumeId);
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

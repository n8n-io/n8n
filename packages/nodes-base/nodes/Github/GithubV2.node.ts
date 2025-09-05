/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable n8n-nodes-base/node-param-default-missing */
import capitalize from 'lodash/capitalize';
import type {
	IExecuteFunctions,
	INodeCredentialDescription,
	INodeExecutionData,
	INodeProperties,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError, updateDisplayOptions } from 'n8n-workflow';

type NodeMetadata = Omit<INodeTypeDescription, 'properties' | 'credentials'>;

type NodeAction = {
	label?: string;
	description?: string;
	runOnce?: boolean;
	parameters: INodeProperties[];
	run(
		context: IExecuteFunctions,
		items: INodeExecutionData[],
		itemIndex?: number,
	): Promise<INodeExecutionData[] | INodeExecutionData>;
};

type NodeResources = {
	[resource: string]: {
		label?: string;
		description?: string;
		defaultAction?: string;
		actions: {
			[action: string]: NodeAction;
		};
	};
};

type NodeConfig = {
	metadata: NodeMetadata;
	resources: NodeResources;
	credentials?: Array<{ type: string; label: string; name?: string; default?: boolean }>;
	config?: {
		defaultResource?: string;
		hideResourcesSelector?: boolean;
		hideActionsSelector?: boolean;
	};
};

class StructuredNode extends Node {
	description: INodeTypeDescription;

	nodeConfig: NodeConfig;

	constructor(node: NodeConfig) {
		super();
		this.description = { ...node.metadata, properties: this.getProperties(node) };
		this.nodeConfig = node;
		this.setAuthentication();
	}

	private getProperties(node: NodeConfig): INodeProperties[] {
		const resources = Object.keys(node.resources);

		const resourceDescription: INodeProperties = {
			displayName: 'Resource',
			name: 'resource',
			type: node.config?.hideResourcesSelector ? 'hidden' : 'options',
			default: node.config?.defaultResource ?? resources[0] ?? '',
			noDataExpression: true,
			options: [],
		};
		const actions: INodeProperties[] = [];
		const properties: INodeProperties[] = [];

		for (const resourceName of resources) {
			resourceDescription.options?.push({
				name: node.resources[resourceName].label ?? capitalize(resourceName),
				value: resourceName,
			});

			const actionsNames = Object.keys(node.resources[resourceName].actions);

			const actionDescription: INodeProperties = {
				displayName: 'Operation',
				name: 'operation',
				type: node.config?.hideActionsSelector ? 'hidden' : 'options',
				default: node.resources[resourceName].defaultAction ?? actionsNames[0] ?? '',
				noDataExpression: true,
				options: [],
				displayOptions: {
					show: {
						resource: [resourceName],
					},
				},
			};

			for (const actionName of actionsNames) {
				actionDescription.options?.push({
					name: node.resources[resourceName].actions[actionName].label ?? capitalize(actionName),
					value: actionName,
				});

				properties.push(
					...updateDisplayOptions(
						{ show: { action: [actionName] } },
						node.resources[resourceName].actions[actionName].parameters,
					),
				);

				// parameters already added to properties, no need to have them in config
				node.resources[resourceName].actions[actionName].parameters = [];
			}

			actions.push(actionDescription);
		}

		return [resourceDescription, ...actions, ...properties];
	}

	private setAuthentication() {
		if (this.nodeConfig.credentials) {
			const authentication: INodeProperties = {
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [],
				default: '',
			};
			const credentials: INodeCredentialDescription[] = [];

			for (const credential of this.nodeConfig.credentials) {
				const value = credential.name ?? credential.type;

				if (credential.default) {
					authentication.default = value;
				}

				authentication.options?.push({
					name: credential.label,
					value,
				});

				credentials.push({
					name: credential.type,
					required: true,
					displayOptions: {
						show: {
							authentication: [value],
						},
					},
				});
			}

			this.description.properties?.unshift(authentication);
			this.description.credentials = credentials;
		}
	}

	async execute(context: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = context.getInputData();
		const resource = context.getNodeParameter('resource', 0);
		const operation = context.getNodeParameter('operation', 0) as string;

		const { run, runOnce } = this.nodeConfig.resources[resource]?.actions[operation];

		if (!run) {
			throw new NodeOperationError(
				context.getNode(),
				`Operation ${operation} does not exist on resource ${resource}`,
			);
		}

		if (runOnce) {
			try {
				return [(await run(context, items)) as INodeExecutionData[]];
			} catch (error) {
				if (context.continueOnFail()) {
					return [[{ json: { error: error.message }, pairedItem: { item: 0 } }]];
				}
				throw error;
			}
		}

		const returnData: INodeExecutionData[] = [];
		let actionData;

		for (let i = 0; i < items.length; i++) {
			try {
				actionData = (await run(context, items, i)) as INodeExecutionData;
				returnData.push(actionData);
			} catch (error) {
				if (context.continueOnFail()) {
					returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}

// ------------------------------------------------------------------------------

// e.g. 'file/create.action.ts'
const fileCreateDescription: INodeProperties[] = [];
async function fileCreateExecute(_context: IExecuteFunctions) {
	return [];
}

// 'GitHubV2.node.ts', no routing setup or defining resources and operation properties needed
const gitHubV2: NodeConfig = {
	// properties excluded as resource and operations would be constructed from config
	metadata: {
		displayName: 'GitHub',
		name: 'github',
		icon: { light: 'file:github.svg', dark: 'file:github.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume GitHub API',
		defaults: {
			name: 'GitHub',
		},
		usableAsTool: true,
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
	},

	// separated becouse it's tied with authentication,
	// this.setAuthentication() would be used to add credentials to the node description and add authentication property
	credentials: [
		{
			type: 'githubApi',
			label: 'GitHub Access Token',
			default: true,
		},
		{
			type: 'githubOAuth2Api',
			label: 'GitHub OAuth2',
		},
	],

	resources: {
		file: {
			label: 'File',
			defaultAction: 'create',
			actions: {
				create: {
					label: 'Create File',
					parameters: fileCreateDescription,
					run: fileCreateExecute,
				},
				// delete: {},
				// update: {},
			},
		},
		// issue: {},
		// release: {},
	},
};

export class GithubV2 extends StructuredNode {
	constructor() {
		super(gitHubV2);
	}
}

// ------------------------------------------------------------------------------

// e.g. 'if.action.ts'
const ifV2Description: INodeProperties[] = [];
async function ifV2Execute(_context: IExecuteFunctions) {
	return [];
}

// 'IFV2.node.ts', hide resources and operations selectors, run once, logic for looping custom in run function
const ifV2: NodeConfig = {
	metadata: {
		displayName: 'If',
		name: 'if',
		icon: 'fa:map-signs',
		iconColor: 'green',
		group: ['transform'],
		description: 'Route items to different branches (true/false)',
		version: [2, 2.1, 2.2],
		defaults: {
			name: 'If',
			color: '#408000',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main, NodeConnectionType.Main],
		outputNames: ['true', 'false'],
		parameterPane: 'wide',
	},

	resources: {
		default: {
			actions: {
				default: {
					runOnce: true,
					parameters: ifV2Description,
					run: ifV2Execute,
				},
			},
		},
	},

	config: {
		hideResourcesSelector: true,
		hideActionsSelector: true,
	},
};

export class IFV2 extends StructuredNode {
	constructor() {
		super(ifV2);
	}
}

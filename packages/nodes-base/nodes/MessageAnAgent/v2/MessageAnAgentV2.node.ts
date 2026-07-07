import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';

import { commonProperties, execute, sharedVersionDescription } from '../shared';

// Prompt source selector, mirroring the legacy `@n8n/n8n-nodes-langchain.agent`
// node (promptType + text). Defined inline to avoid a cross-package dependency
// on nodes-langchain.
const promptProperties: INodeProperties[] = [
	{
		displayName: 'Source for Prompt (User Message)',
		name: 'promptType',
		type: 'options',
		options: [
			{
				name: 'Connected Chat Trigger Node',
				value: 'auto',
				description:
					"Looks for an input field called 'chatInput' that is coming from a directly connected Chat Trigger",
			},
			{
				name: 'Define Below',
				value: 'define',
				description: 'Use an expression to reference data in previous nodes or enter static text',
			},
		],
		default: 'auto',
	},
	{
		displayName: 'Prompt (User Message)',
		name: 'text',
		type: 'string',
		required: true,
		default: '={{ $json.chatInput }}',
		typeOptions: {
			rows: 2,
		},
		disabledOptions: { show: { promptType: ['auto'] } },
		displayOptions: { show: { promptType: ['auto'] } },
	},
	{
		displayName: 'Prompt (User Message)',
		name: 'text',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. Hello, how can you help me?',
		typeOptions: {
			rows: 2,
		},
		displayOptions: { show: { promptType: ['define'] } },
	},
];

export class MessageAnAgentV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(thisBaseDescription: INodeTypeBaseDescription) {
		this.description = {
			...thisBaseDescription,
			...sharedVersionDescription,
			version: 2,
			properties: [
				{
					displayName: 'Agent',
					name: 'agentId',
					type: 'agentSelector',
					default: { __rl: true, mode: 'list', value: '' },
					required: true,
					description: 'The agent to send the message to',
				},
				...promptProperties,
				...commonProperties,
			],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await execute.call(this);
	}
}

import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ITriggerFunctions,
	ITriggerResponse,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

type SampleKind = 'workflow' | 'agent';

const SAMPLE_WORKFLOW: IDataObject = {
	id: 'sample-workflow-id',
	name: 'Lead export',
	nodes: [
		{
			name: 'Incoming lead',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 2,
			position: [0, 0],
			parameters: { httpMethod: 'POST', path: 'lead-export', authentication: 'none' },
		},
		{
			name: 'Send lead',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.2,
			position: [260, 0],
			parameters: { method: 'POST', url: 'https://example.com/leads' },
		},
	],
	connections: {
		'Incoming lead': { main: [[{ node: 'Send lead', type: 'main', index: 0 }]] },
	},
	settings: { errorWorkflow: 'sample-error-workflow-id', executionTimeout: 300 },
};

const SAMPLE_AGENT: IDataObject = {
	id: 'sample-agent-id',
	name: 'Support helper',
	config: {
		name: 'Support helper',
		model: 'anthropic/claude-haiku-5-5',
		instructions: 'Answer questions about our opening hours. Be brief and polite.',
		tools: [],
	},
};

/** The item a judge workflow gets for a review, with example content. */
function sampleReview(kind: SampleKind): IDataObject {
	return kind === 'agent'
		? { event: 'agentPublish', kind, projectId: 'sample-project-id', agent: SAMPLE_AGENT }
		: { event: 'workflowPublish', kind, projectId: 'sample-project-id', workflow: SAMPLE_WORKFLOW };
}

export class JudgeTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Judge Trigger',
		name: 'judgeTrigger',
		icon: 'fa:balance-scale-left',
		iconColor: 'blue',
		group: ['trigger'],
		version: 1,
		subtitle: '={{ "Reviews a " + $parameter["sampleKind"] }}',
		description: 'Starts the workflow when n8n asks it to review a workflow or an agent',
		eventTriggerDescription: '',
		mockManualExecution: true,
		maxNodes: 1,
		defaults: {
			name: 'Judge Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName:
					'This node starts the workflow when an admin sets it as a judge. It gives one item with <code>event</code>, <code>kind</code>, <code>projectId</code>, and the <code>workflow</code> or the <code>agent</code> to review. The last node of the workflow must return one item with <code>allow</code> (true or false) and <code>reason</code> (text for the builder).',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Sample to Test With',
				name: 'sampleKind',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Workflow',
						value: 'workflow',
						description: 'A test run gives an example workflow to review',
					},
					{
						name: 'Agent',
						value: 'agent',
						description: 'A test run gives an example agent to review',
					},
				],
				default: 'workflow',
				description: 'Which example a test run in the editor gives. A real review gives real data.',
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		// n8n starts a judge workflow itself, so there is nothing to listen to.
		return {};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const isEmptyManualRun =
			this.getMode() === 'manual' &&
			items.length === 1 &&
			Object.keys(items[0].json).length === 0 &&
			items[0].binary === undefined;

		if (!isEmptyManualRun) return [items];

		const sampleKind = this.getNodeParameter('sampleKind', 0, 'workflow') as SampleKind;

		return [[{ json: sampleReview(sampleKind) }]];
	}
}

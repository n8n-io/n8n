import {
	type INodeProperties,
	type IExecuteFunctions,
	type INodeExecutionData,
	sleep,
	NodeOperationError,
} from 'n8n-workflow';
import { updateDisplayOptions } from '../../../../../utils/utilities';
import { apiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Assistant',
		name: 'assistantId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'assistantSearch',
					searchable: true,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. asst_abc123',
			},
		],
	},
	{
		displayName: 'Text Input',
		name: 'content',
		type: 'string',
		placeholder: 'e.g. How does AI work? Explain it in simple terms.',
		default: '',
		typeOptions: {
			rows: 2,
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Thread ID',
				name: 'threadId',
				type: 'string',
				default: '',
				description:
					'The ID of the thread to send the message to, if not set a new thread will be created',
			},
			{
				displayName: 'Return Entire Thread',
				name: 'returnEntireThread',
				type: 'boolean',
				default: false,
				description: 'Whether to return the entire thread or just the asssistant response',
			},
			{
				displayName: 'Polling Interval (MS)',
				name: 'pollingInterval',
				type: 'number',
				description:
					'Assistant takes time to respond, this option sets how often to n8n will check for a response, helps to avoid rate limits',
				default: 2000,
				typeOptions: {
					minValue: 1000,
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['messageAssistant'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const assistant_id = this.getNodeParameter('assistantId', i, '', { extractValue: true });
	const content = this.getNodeParameter('content', i) as string;
	const options = this.getNodeParameter('options', i);

	let theradId = options.threadId as string;

	const headers = {
		'OpenAI-Beta': 'assistants=v1',
	};

	let runId;
	if (theradId) {
		const body = {
			role: 'user',
			content,
		};

		await apiRequest.call(this, 'POST', `/threads/${theradId}/messages`, { body, headers });

		runId = (
			await apiRequest.call(this, 'POST', `/threads/${theradId}/runs`, {
				body: { assistant_id },
				headers,
			})
		).id;
	} else {
		const body = {
			assistant_id,
			thread: {
				messages: [{ role: 'user', content }],
			},
		};

		const { id, thread_id } = await apiRequest.call(this, 'POST', '/threads/runs', {
			body,
			headers,
		});

		theradId = thread_id;
		runId = id;
	}

	const pollingInterval = (options.pollingInterval as number) || 2000;

	while (true) {
		await sleep(pollingInterval);

		const { status } = await apiRequest.call(this, 'GET', `/threads/${theradId}/runs/${runId}`, {
			headers,
		});

		if (status === 'completed') {
			break;
		}

		if (['expired', 'cancelled', 'failed', 'requires_action'].includes(status)) {
			throw new NodeOperationError(this.getNode(), `Run stopped with status: '${status}'`);
		}
	}

	const { data } = await apiRequest.call(this, 'GET', `/threads/${theradId}/messages`, { headers });

	return [
		{
			json: options.returnEntireThread ? { data } : data[0],
			pairedItem: { item: i },
		},
	];
}

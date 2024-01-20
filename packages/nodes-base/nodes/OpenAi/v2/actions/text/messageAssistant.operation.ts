import type {
	INodeProperties,
	IExecuteFunctions,
	INodeExecutionData,
	IDataObject,
} from 'n8n-workflow';
import { sleep, NodeOperationError, jsonParse } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../../../utils/utilities';
import { apiRequest } from '../../transport';
import type { ThreadMessage } from '../../helpers/interfaces';

const properties: INodeProperties[] = [
	{
		displayName: 'Assistant',
		name: 'assistantId',
		type: 'resourceLocator',
		description:
			'Assistant to respond to the message. You can add, modify or remove assistants in the <a href="https://platform.openai.com/playground?mode=assistant" target="_blank">playground</a>.',
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
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
		default: {},
		options: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Files',
				name: 'files',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-missing-from-dynamic-multi-options
				type: 'multiOptions',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-multi-options
				description:
					'Files that the message should use. There can be a maximum of 10 files attached to a message. Useful for tools like retrieval and code_interpreter that can access and use files.',
				typeOptions: {
					loadOptionsMethod: 'getAssistantFiles',
				},
				default: [],
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				placeholder: 'e.g. {"issue_type": "order_problem", "priority": "high"}',
				type: 'json',
				default: '={}',
				typeOptions: {
					rows: 2,
				},
				validateType: 'object',
			},
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
			{
				displayName: 'Delete Thread',
				name: 'deleteThread',
				type: 'boolean',
				default: false,
				description: 'Whether to delete the thread after the assistant has responded',
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['messageAssistant'],
		resource: ['text'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const assistant_id = this.getNodeParameter('assistantId', i, '', { extractValue: true });
	const content = this.getNodeParameter('content', i) as string;
	const options = this.getNodeParameter('options', i);

	const headers = {
		'OpenAI-Beta': 'assistants=v1',
	};

	const file_ids = options.files as string[];

	let metadata = options.metadata as IDataObject;
	if (typeof metadata === 'string') {
		metadata = jsonParse(metadata as string);
	}

	let theradId = options.threadId as string;

	let runId;
	if (theradId) {
		const body = {
			role: 'user',
			content,
			file_ids,
			metadata,
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
				messages: [{ role: 'user', content, file_ids, metadata }],
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

	let data = (
		await apiRequest.call(this, 'GET', `/threads/${theradId}/messages`, {
			headers,
		})
	).data;

	const simplify = this.getNodeParameter('simplify', i) as boolean;

	if (simplify) {
		data = (data as ThreadMessage[]).map((message) => ({
			id: message.id,
			thread_id: message.thread_id,
			role: message.role,
			...message.content[0],
		}));
	}

	if (options.deleteThread) {
		await apiRequest.call(this, 'DELETE', `/threads/${theradId}`, { headers });
	}

	return [
		{
			json: options.returnEntireThread ? { thread: data } : data[0],
			pairedItem: { item: i },
		},
	];
}

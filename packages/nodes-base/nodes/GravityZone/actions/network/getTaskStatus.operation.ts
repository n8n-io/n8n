import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { processJsonInput, updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-440638-gettaskstatus.html" target="_blank" rel="noopener noreferrer">Get Task Status</a>',
		name: 'getTaskStatusDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the task to retrieve the status of',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Return Subtasks',
				name: 'returnSubtasks',
				type: 'boolean',
				default: false,
				description: 'Whether to include information on individual subtasks in the response',
			},
			{
				displayName: 'Subtask Filters (JSON)',
				name: 'subtaskFilters',
				type: 'json',
				default: '{}',
				description: 'A subtask filters object',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 1,
				description: 'Page number for pagination',
			},
			{
				displayName: 'Per Page',
				name: 'perPage',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 100 },
				default: 50,
				description: 'Number of results per page',
			},
		],
	},
];

const displayOptions = {
	show: { category: ['network'], action: ['getTaskStatus'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const taskId = this.getNodeParameter('taskId', i) as string;
	const optionsInput = this.getNodeParameter('options', i, {});

	const taskOptions: IDataObject = {};

	if (optionsInput.returnSubtasks !== undefined)
		taskOptions.returnSubtasks = optionsInput.returnSubtasks;
	if (optionsInput.page !== undefined) taskOptions.page = optionsInput.page;
	if (optionsInput.perPage !== undefined) taskOptions.perPage = optionsInput.perPage;

	const params: IDataObject = { taskId };

	if (Object.keys(taskOptions).length > 0) params.options = taskOptions;
	if (optionsInput.subtaskFilters !== undefined) {
		const subtaskFilters = processJsonInput(
			optionsInput.subtaskFilters,
			'Subtask Filters',
		) as IDataObject;
		if (Object.keys(subtaskFilters).length > 0) params.subtaskFilters = subtaskFilters;
	}

	const responseData = await gravityZoneApiRequest.call(
		this,
		'network',
		'getTaskStatus',
		params,
		'v1.1',
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}

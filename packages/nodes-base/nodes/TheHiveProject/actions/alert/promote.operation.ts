import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { alertRLC } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	alertRLC,
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Field',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Case Template Name or ID',
				name: 'caseTemplate',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'loadCaseTemplate',
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['alert'],
		operation: ['promote'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const alertId = this.getNodeParameter('alertId', i, '', { extractValue: true }) as string;
	const caseTemplate = this.getNodeParameter('options.caseTemplate', i, '') as string;

	const body: IDataObject = {};

	// await theHiveApiRequest.call(this, 'POST', '/v1/caseTemplate', {
	// 	name: 'test template 001',
	// 	displayName: 'Test Template 001',
	// 	description: 'test',
	// });

	if (caseTemplate) {
		body.caseTemplate = caseTemplate;
	}

	responseData = await theHiveApiRequest.call(this, 'POST', `/v1/alert/${alertId}/case`, body);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}

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
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Include Similar Alerts',
				name: 'includeSimilarAlerts',
				type: 'boolean',
				description: 'Whether to include similar cases',
				default: false,
			},
			{
				displayName: 'Include Similar Cases',
				name: 'includeSimilarCases',
				type: 'boolean',
				description: 'Whether to include similar cases',
				default: false,
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['alert'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject;

	const alertId = this.getNodeParameter('alertId', i, '', { extractValue: true }) as string;
	const options = this.getNodeParameter('options', i, {});

	responseData = await theHiveApiRequest.call(this, 'GET', `/v1/alert/${alertId}`);

	if (responseData && options.includeSimilarAlerts) {
		const similarAlerts = await theHiveApiRequest.call(this, 'POST', '/v1/query', {
			query: [
				{
					_name: 'getAlert',
					idOrName: alertId,
				},
				{
					_name: 'similarAlerts',
				},
			],
		});

		responseData = {
			...responseData,
			similarAlerts,
		};
	}

	if (responseData && options.includeSimilarCases) {
		const similarCases = await theHiveApiRequest.call(this, 'POST', '/v1/query', {
			query: [
				{
					_name: 'getAlert',
					idOrName: alertId,
				},
				{
					_name: 'similarCases',
				},
			],
		});

		responseData = {
			...responseData,
			similarCases,
		};
	}

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}

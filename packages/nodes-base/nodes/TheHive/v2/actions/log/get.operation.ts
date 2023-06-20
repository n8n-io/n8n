import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Log ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
	},
];

const displayOptions = {
	show: {
		resource: ['log'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const logId = this.getNodeParameter('id', i) as string;

	const credentials = await this.getCredentials('theHiveApi');

	const version = credentials.apiVersion;

	let endpoint;

	let method;

	let body: IDataObject = {};

	const qs: IDataObject = {};

	if (version === 'v1') {
		endpoint = '/v1/query';

		method = 'POST';

		body = {
			query: [
				{
					_name: 'getLog',
					idOrName: logId,
				},
			],
		};

		qs.name = `get-log-${logId}`;
	} else {
		method = 'POST';

		endpoint = '/case/task/log/_search';

		body.query = { _id: logId };
	}

	responseData = await theHiveApiRequest.call(this, method, endpoint, body, qs);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}

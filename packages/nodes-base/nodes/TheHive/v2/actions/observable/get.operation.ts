import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Observable ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the observable',
	},
];

const displayOptions = {
	show: {
		resource: ['observable'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const observableId = this.getNodeParameter('id', i) as string;

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
					_name: 'getObservable',
					idOrName: observableId,
				},
			],
		};

		qs.name = `get-observable-${observableId}`;
	} else {
		method = 'GET';

		endpoint = `/case/artifact/${observableId}`;
	}

	responseData = await theHiveApiRequest.call(this, method, endpoint, body, qs);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}

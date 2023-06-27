import type { IExecuteFunctions } from 'n8n-core';
import type {
	IDataObject,
	IHttpRequestMethods,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Case ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		description: 'ID of the case',
	},
];

const displayOptions = {
	show: {
		resource: ['case'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const caseId = this.getNodeParameter('id', i) as string;

	const credentials = await this.getCredentials('theHiveApi');

	const version = credentials.apiVersion;

	let endpoint;

	let method: IHttpRequestMethods;

	let body: IDataObject = {};

	const qs: IDataObject = {};

	if (version === 'v1') {
		endpoint = '/v1/query';

		method = 'POST';

		body = {
			query: [
				{
					_name: 'getCase',
					idOrName: caseId,
				},
			],
		};

		qs.name = `get-case-${caseId}`;
	} else {
		method = 'GET';

		endpoint = `/case/${caseId}`;
	}

	responseData = await theHiveApiRequest.call(this, method, endpoint, body, qs);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}

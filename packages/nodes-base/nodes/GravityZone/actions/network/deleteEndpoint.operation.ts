import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-128491-deleteendpoint.html" target="_blank" rel="noopener noreferrer">Delete Endpoint</a>',
		name: 'deleteEndpointDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Endpoint ID',
		name: 'endpointId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the endpoint to delete',
	},
];

const displayOptions = { show: { category: ['network'], action: ['deleteEndpoint'] } };

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const endpointId = this.getNodeParameter('endpointId', i) as string;

	const params: IDataObject = { endpointId };

	const responseData = await gravityZoneApiRequest.call(this, 'network', 'deleteEndpoint', params);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), { itemData: { item: i } });
}

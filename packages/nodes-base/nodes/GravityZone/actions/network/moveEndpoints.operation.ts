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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-128489-moveendpoints.html" target="_blank" rel="noopener noreferrer">Move Endpoints</a>',
		name: 'moveEndpointsDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Endpoint IDs',
		name: 'endpointIds',
		type: 'string',
		required: true,
		default: '',
		description: 'A comma-separated list of endpoint IDs to move (e.g. "id1, id2, id3")',
	},
	{
		displayName: 'Group ID',
		name: 'groupId',
		type: 'string',
		required: true,
		default: '',
		description: 'The target group ID to move endpoints to',
	},
];

const displayOptions = { show: { category: ['network'], action: ['moveEndpoints'] } };

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const groupId = this.getNodeParameter('groupId', i) as string;

	const endpointIdsStr = this.getNodeParameter('endpointIds', i) as string;
	const endpointIds = endpointIdsStr
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean);

	const params: IDataObject = { endpointIds, groupId };

	const responseData = await gravityZoneApiRequest.call(this, 'network', 'moveEndpoints', params);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), { itemData: { item: i } });
}

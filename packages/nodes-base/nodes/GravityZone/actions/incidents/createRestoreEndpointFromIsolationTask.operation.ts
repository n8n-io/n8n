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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-135331-createrestoreendpointfromisolationtask.html" target="_blank" rel="noopener noreferrer">Create Restore Endpoint From Isolation Task</a>',
		name: 'createRestoreEndpointFromIsolationTaskDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Endpoint ID',
		name: 'endpointId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the endpoint to restore from isolation',
	},
];

const displayOptions = {
	show: { category: ['incidents'], action: ['createRestoreEndpointFromIsolationTask'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const endpointId = this.getNodeParameter('endpointId', i) as string;

	const params: IDataObject = { endpointId };

	const responseData = await gravityZoneApiRequest.call(
		this,
		'incidents',
		'createRestoreEndpointFromIsolationTask',
		params,
		'v1.1',
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), { itemData: { item: i } });
}

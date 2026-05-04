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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-952304-killprocess.html" target="_blank" rel="noopener noreferrer">Kill Process</a>',
		name: 'killProcessDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Process ID',
		name: 'processId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the process to terminate',
	},
	{
		displayName: 'Path',
		name: 'path',
		type: 'string',
		required: true,
		default: '',
		description: 'The location of the file that starts the process on the endpoint',
	},
	{
		displayName: 'Endpoint ID',
		name: 'endpointId',
		type: 'string',
		required: true,
		default: '',
		description: 'The endpoint ID of the endpoint where the process is running',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Incident ID',
				name: 'incidentId',
				type: 'string',
				default: '',
				description: 'The ID of the incident generated as a result of this process',
			},
		],
	},
];

const displayOptions = {
	show: { category: ['network'], action: ['killProcess'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const processId = this.getNodeParameter('processId', i) as string;
	const path = this.getNodeParameter('path', i) as string;
	const endpointId = this.getNodeParameter('endpointId', i) as string;
	const options = this.getNodeParameter('options', i, {});

	const params: IDataObject = { processId, path, endpointId };

	if (options.incidentId !== undefined && (options.incidentId as string) !== '')
		params.incidentId = options.incidentId;

	const responseData = await gravityZoneApiRequest.call(this, 'network', 'killProcess', params);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}

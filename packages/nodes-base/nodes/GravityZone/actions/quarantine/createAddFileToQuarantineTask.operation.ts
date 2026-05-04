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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-140261-createaddfiletoquarantinetask.html" target="_blank" rel="noopener noreferrer">Create Add File To Quarantine Task</a>',
		name: 'createAddFileToQuarantineTaskDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Service',
		name: 'service',
		type: 'options',
		default: 'computers',
		options: [
			{ name: 'Computers', value: 'computers', description: 'Computers quarantine' },
			{ name: 'Exchange', value: 'exchange', description: 'Exchange quarantine' },
		],
		description: 'Service type for quarantine',
	},
	{
		displayName: 'Endpoint IDs',
		name: 'endpointIds',
		type: 'string',
		required: true,
		default: '',
		description:
			'A comma-separated list of target endpoint IDs (e.g. "id1, id2, id3"). Only endpoints with security agents in "Detection and prevention" mode and active "EDR Sensor" module are valid targets.',
	},
	{
		displayName: 'File Path',
		name: 'filePath',
		type: 'string',
		required: true,
		default: '',
		description: 'The absolute file path on disk',
	},
];

const displayOptions = {
	show: { category: ['quarantine'], action: ['createAddFileToQuarantineTask'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const service = this.getNodeParameter('service', i) as string;
	const filePath = this.getNodeParameter('filePath', i);

	const endpointIdsRaw = this.getNodeParameter('endpointIds', i) as string;
	const endpointIds = endpointIdsRaw
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean);

	const params: IDataObject = { endpointIds, filePath };

	const responseData = await gravityZoneApiRequest.call(
		this,
		`quarantine/${service}`,
		'createAddFileToQuarantineTask',
		params,
		'v1.1',
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}

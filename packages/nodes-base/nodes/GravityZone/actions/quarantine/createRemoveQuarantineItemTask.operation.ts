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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-140257-createremovequarantineitemtask.html" target="_blank" rel="noopener noreferrer">Create Remove Quarantine Item Task</a>',
		name: 'createRemoveQuarantineItemTaskDocsNotice',
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
		description: 'Service type for quarantine items',
	},
	{
		displayName: 'Quarantine Items IDs',
		name: 'quarantineItemsIds',
		type: 'string',
		required: true,
		default: '',
		description: 'A comma-separated list of quarantine item IDs (e.g. "id1, id2, id3")',
	},
];

const displayOptions = {
	show: { category: ['quarantine'], action: ['createRemoveQuarantineItemTask'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const service = this.getNodeParameter('service', i) as string;

	const quarantineItemsIdsStr = this.getNodeParameter('quarantineItemsIds', i) as string;
	const quarantineItemsIds = quarantineItemsIdsStr
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean);

	const params: IDataObject = { quarantineItemsIds };

	const responseData = await gravityZoneApiRequest.call(
		this,
		`quarantine/${service}`,
		'createRemoveQuarantineItemTask',
		params,
		'v1.1',
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), { itemData: { item: i } });
}

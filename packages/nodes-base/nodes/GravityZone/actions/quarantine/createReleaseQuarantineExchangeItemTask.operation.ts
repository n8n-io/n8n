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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-449016-createreleasequarantineexchangeitemtask.html" target="_blank" rel="noopener noreferrer">Create Release Quarantine Exchange Item Task</a>',
		name: 'createReleaseQuarantineExchangeItemTaskDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Quarantine Items IDs',
		name: 'quarantineItemsIds',
		type: 'string',
		required: true,
		default: '',
		description:
			'A comma-separated list of quarantine item IDs to release to their intended recipients (e.g. "id1, id2, id3")',
	},
];

const displayOptions = {
	show: { category: ['quarantine'], action: ['createReleaseQuarantineExchangeItemTask'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const quarantineItemsIdsRaw = this.getNodeParameter('quarantineItemsIds', i) as string;
	const quarantineItemsIds = quarantineItemsIdsRaw
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean);

	const params: IDataObject = { quarantineItemsIds };

	const responseData = await gravityZoneApiRequest.call(
		this,
		'quarantine/computers',
		'createReleaseQuarantineExchangeItemTask',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}

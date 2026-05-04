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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-140259-createrestorequarantineitemtask.html" target="_blank" rel="noopener noreferrer">Create Restore Quarantine Item Task</a>',
		name: 'createRestoreQuarantineItemTaskDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Quarantine Items IDs',
		name: 'quarantineItemsIds',
		type: 'string',
		required: true,
		default: '',
		description: 'A comma-separated list of quarantine item IDs to restore (e.g. "id1, id2, id3")',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Location to Restore',
				name: 'locationToRestore',
				type: 'string',
				default: '',
				description:
					'The absolute path to the folder where the items will be restored. If not set, the original location will be used.',
			},
			{
				displayName: 'Add Exclusion in Policy',
				name: 'addExclusionInPolicy',
				type: 'boolean',
				default: false,
				description:
					'Whether to exclude the files to be restored from future scans. Exclusions do not apply to items with the default policy assigned.',
			},
		],
	},
];

const displayOptions = {
	show: { category: ['quarantine'], action: ['createRestoreQuarantineItemTask'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const options = this.getNodeParameter('options', i, {});

	const quarantineItemsIdsStr = this.getNodeParameter('quarantineItemsIds', i) as string;
	const quarantineItemsIds = quarantineItemsIdsStr
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean);

	const params: IDataObject = { quarantineItemsIds };

	if (options.locationToRestore !== undefined && (options.locationToRestore as string) !== '')
		params.locationToRestore = options.locationToRestore;
	if (options.addExclusionInPolicy !== undefined)
		params.addExclusionInPolicy = options.addExclusionInPolicy;

	const responseData = await gravityZoneApiRequest.call(
		this,
		'quarantine/computers',
		'createRestoreQuarantineItemTask',
		params,
		'v1.1',
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), { itemData: { item: i } });
}

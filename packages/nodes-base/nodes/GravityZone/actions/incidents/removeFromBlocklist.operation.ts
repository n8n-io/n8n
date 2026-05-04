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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-135329-removefromblocklist.html" target="_blank" rel="noopener noreferrer">Remove From Blocklist</a>',
		name: 'removeFromBlocklistDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'IDs',
		name: 'ids',
		type: 'string',
		required: true,
		default: '',
		description: 'A comma-separated list of blocklist item IDs to remove (e.g. "id1, id2, id3")',
	},
];

const displayOptions = { show: { category: ['incidents'], action: ['removeFromBlocklist'] } };

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const idsStr = this.getNodeParameter('ids', i) as string;
	const ids = idsStr
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean);

	const params: IDataObject = { ids };

	const responseData = await gravityZoneApiRequest.call(
		this,
		'incidents',
		'removeFromBlocklist',
		params,
		'v1.2',
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), { itemData: { item: i } });
}

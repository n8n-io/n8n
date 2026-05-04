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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-1300809-removeintegrators.html" target="_blank" rel="noopener noreferrer">Remove Integrators</a>',
		name: 'removeIntegratorsDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Target IDs',
		name: 'targetIds',
		type: 'string',
		required: true,
		default: '',
		description:
			'A comma-separated list of endpoint IDs to unassign as integrators (e.g. "id1, id2, id3")',
	},
];

const displayOptions = {
	show: { category: ['network'], action: ['removeIntegrators'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const targetIdsRaw = this.getNodeParameter('targetIds', i) as string;
	const targetIds = targetIdsRaw
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean);

	const params: IDataObject = { targetIds };

	const responseData = await gravityZoneApiRequest.call(
		this,
		'network',
		'removeIntegrators',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}

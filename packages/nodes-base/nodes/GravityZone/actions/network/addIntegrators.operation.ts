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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-1300740-addintegrators.html" target="_blank" rel="noopener noreferrer">Add Integrators</a>',
		name: 'addIntegratorsDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Integration ID',
		name: 'integrationId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the integration to assign the endpoint as an integrator for',
	},
	{
		displayName: 'Target IDs',
		name: 'targetIds',
		type: 'string',
		required: true,
		default: '',
		description:
			'A comma-separated list of endpoint IDs to set as integrators (e.g. "id1, id2, id3"). Endpoints must belong to the same company where the integration is configured.',
	},
];

const displayOptions = {
	show: { category: ['network'], action: ['addIntegrators'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const integrationId = this.getNodeParameter('integrationId', i) as string;

	const targetIdsRaw = this.getNodeParameter('targetIds', i) as string;
	const targetIds = targetIdsRaw
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean);

	const params: IDataObject = { integrationId, targetIds };

	const responseData = await gravityZoneApiRequest.call(this, 'network', 'addIntegrators', params);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}

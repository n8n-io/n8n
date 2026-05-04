import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';

import { processJsonInput, updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-1300590-updateintegration.html" target="_blank" rel="noopener noreferrer">Update Integration</a>',
		name: 'updateIntegrationDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Integration ID',
		name: 'integrationId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the integration to update',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The new name for the integration',
			},
			{
				displayName: 'Specifics (JSON)',
				name: 'specificsJson',
				type: 'json',
				default: '{}',
				description: 'A specifics object',
				typeOptions: { alwaysOpenEditWindow: true },
			},
		],
	},
];

const displayOptions = {
	show: { category: ['integrations'], action: ['updateIntegration'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const integrationId = this.getNodeParameter('integrationId', i) as string;
	const options = this.getNodeParameter('options', i, {});

	const params: IDataObject = { integrationId };

	if (options.name) params.name = options.name;
	if (options.specificsJson !== undefined) {
		const specifics = processJsonInput(options.specificsJson, 'Specifics') as IDataObject;
		if (Object.keys(specifics).length > 0) params.specifics = specifics;
	}

	const responseData = await gravityZoneApiRequest.call(
		this,
		'integrations',
		'updateIntegration',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}

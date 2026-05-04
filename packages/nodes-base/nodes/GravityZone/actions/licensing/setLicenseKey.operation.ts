import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { processJsonInput, updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-127107-setlicensekey.html" target="_blank" rel="noopener noreferrer">Set License Key</a>',
		name: 'setLicenseKeyDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'License Key',
		name: 'licenseKey',
		type: 'string',
		required: true,
		default: '',
		description: 'The license key to set for the company',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'MDR Contact Information (JSON)',
				name: 'mdrContactInformationJson',
				type: 'json',
				default: '{}',
				description: 'An MDR contact information object',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
		],
	},
];

const displayOptions = {
	show: { category: ['licensing'], action: ['setLicenseKey'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const licenseKey = this.getNodeParameter('licenseKey', i) as string;
	const options = this.getNodeParameter('options', i, {});

	const params: IDataObject = { licenseKey };

	if (options.mdrContactInformationJson !== undefined) {
		const mdrContactInformation = processJsonInput(
			options.mdrContactInformationJson,
			'MDR Contact Information',
		) as IDataObject;
		if (Object.keys(mdrContactInformation).length > 0)
			params.mdrContactInformation = mdrContactInformation;
	}

	const responseData = await gravityZoneApiRequest.call(this, 'licensing', 'setLicenseKey', params);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}

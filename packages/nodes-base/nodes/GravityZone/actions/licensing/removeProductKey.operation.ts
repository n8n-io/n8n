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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-127108-removeproductkey.html" target="_blank" rel="noopener noreferrer">Remove Product Key</a>',
		name: 'removeProductKeyDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'License Key',
		name: 'licenseKey',
		type: 'string',
		required: true,
		default: '',
		description: 'The key of the license to be removed from the company',
	},
];

const displayOptions = {
	show: { category: ['licensing'], action: ['removeProductKey'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const licenseKey = this.getNodeParameter('licenseKey', i) as string;

	const params: IDataObject = { licenseKey };

	const responseData = await gravityZoneApiRequest.call(
		this,
		'licensing',
		'removeProductKey',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}

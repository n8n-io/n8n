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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-126239-getcompanydetails.html" target="_blank" rel="noopener noreferrer">Get Company Details</a>',
		name: 'getCompanyDetailsDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Company ID',
		name: 'companyId',
		type: 'string',
		default: '',
		description:
			'The target company ID. If not provided, defaults to the company linked to the user who generated the API key.',
	},
];

const displayOptions = { show: { category: ['companies'], action: ['getCompanyDetails'] } };

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const companyId = this.getNodeParameter('companyId', i) as string;

	const params: IDataObject = {};

	if (companyId) params.companyId = companyId;

	const responseData = await gravityZoneApiRequest.call(
		this,
		'companies',
		'getCompanyDetails',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), { itemData: { item: i } });
}

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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-127110-getmonthlyusageperproducttype.html" target="_blank" rel="noopener noreferrer">Get Monthly Usage Per Product Type</a>',
		name: 'getMonthlyUsagePerProductTypeDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Target Month',
				name: 'targetMonth',
				type: 'string',
				default: '',
				description:
					'The month for which the usage is returned, in "mm/yyyy" format (e.g. 04/2026). Defaults to the current month.',
			},
		],
	},
];

const displayOptions = {
	show: { category: ['licensing'], action: ['getMonthlyUsagePerProductType'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const options = this.getNodeParameter('options', i, {});

	const params: IDataObject = {};

	if (options.targetMonth) params.targetMonth = options.targetMonth;

	const responseData = await gravityZoneApiRequest.call(
		this,
		'licensing',
		'getMonthlyUsagePerProductType',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}

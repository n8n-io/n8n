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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-140258-createemptyquarantinetask.html" target="_blank" rel="noopener noreferrer">Create Empty Quarantine Task</a>',
		name: 'createEmptyQuarantineTaskDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Service',
		name: 'service',
		type: 'options',
		default: 'computers',
		options: [
			{ name: 'Computers', value: 'computers', description: 'Computers quarantine' },
			{ name: 'Exchange', value: 'exchange', description: 'Exchange quarantine' },
		],
		description: 'Service type for quarantine',
	},
];

const displayOptions = {
	show: { category: ['quarantine'], action: ['createEmptyQuarantineTask'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const service = this.getNodeParameter('service', i) as string;

	const params: IDataObject = {};

	const responseData = await gravityZoneApiRequest.call(
		this,
		`quarantine/${service}`,
		'createEmptyQuarantineTask',
		params,
		'v1.1',
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), { itemData: { item: i } });
}

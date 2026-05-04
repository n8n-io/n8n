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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-128484-getmanagedendpointdetails.html" target="_blank" rel="noopener noreferrer">Get Managed Endpoint Details</a>',
		name: 'getManagedEndpointDetailsDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Endpoint ID',
		name: 'endpointId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the managed endpoint',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Include Scan Logs',
				name: 'includeScanLogs',
				type: 'boolean',
				default: false,
				description: 'Whether to include the lastSuccessfulScan attribute in the response',
			},
		],
	},
];

const displayOptions = { show: { category: ['network'], action: ['getManagedEndpointDetails'] } };

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const endpointId = this.getNodeParameter('endpointId', i) as string;
	const options = this.getNodeParameter('options', i, {});

	const params: IDataObject = { endpointId };

	if (options.includeScanLogs !== undefined) {
		params.options = { includeScanLogs: options.includeScanLogs };
	}

	const responseData = await gravityZoneApiRequest.call(
		this,
		'network',
		'getManagedEndpointDetails',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), { itemData: { item: i } });
}

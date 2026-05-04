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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-128492-setendpointlabel.html" target="_blank" rel="noopener noreferrer">Set Endpoint Label</a>',
		name: 'setEndpointLabelDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Endpoint ID',
		name: 'endpointId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the endpoint',
	},
	{
		displayName: 'Label',
		name: 'label',
		type: 'string',
		required: true,
		default: '',
		description: 'The label to set for the endpoint',
	},
];

const displayOptions = { show: { category: ['network'], action: ['setEndpointLabel'] } };

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const endpointId = this.getNodeParameter('endpointId', i) as string;
	const label = this.getNodeParameter('label', i) as string;

	const params: IDataObject = { endpointId, label };

	const responseData = await gravityZoneApiRequest.call(
		this,
		'network',
		'setEndpointLabel',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), { itemData: { item: i } });
}

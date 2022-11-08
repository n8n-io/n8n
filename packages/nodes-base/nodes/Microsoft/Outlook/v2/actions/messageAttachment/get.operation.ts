import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { microsoftApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['messageAttachment'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'multiOptions',
				default: [],
				options: [
					{
						name: 'contentType',
						value: 'contentType',
					},
					{
						name: 'isInline',
						value: 'isInline',
					},
					{
						name: 'lastModifiedDateTime',
						value: 'lastModifiedDateTime',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'name',
						value: 'name',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'size',
						value: 'size',
					},
				],
				description: 'Fields the response will contain',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	let responseData;
	const qs: IDataObject = {};

	const messageId = this.getNodeParameter('messageId', index) as string;
	const attachmentId = this.getNodeParameter('attachmentId', index) as string;
	const options = this.getNodeParameter('options', index) as IDataObject;

	// Have sane defaults so we don't fetch attachment data in this operation
	qs['$select'] = 'id,lastModifiedDateTime,name,contentType,size,isInline';

	if (options.fields && (options.fields as string[]).length) {
		qs['$select'] = (options.fields as string[]).map((field) => field.trim()).join(',');
	}

	responseData = await microsoftApiRequest.call(
		this,
		'GET',
		`/messages/${messageId}/attachments/${attachmentId}`,
		undefined,
		qs,
	);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData),
		{ itemData: { item: index } },
	);

	return executionData;
}

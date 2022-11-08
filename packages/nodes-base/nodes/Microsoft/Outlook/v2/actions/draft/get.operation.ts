import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { messageFields, simplifyOutputMessages } from '../../helpers/utils';
import { downloadAttachments, microsoftApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Output',
		name: 'output',
		type: 'options',
		default: 'simple',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['draft'],
			},
		},
		options: [
			{
				name: 'Simplified',
				value: 'simple',
			},
			{
				name: 'Raw',
				value: 'raw',
			},
			{
				name: 'Select Included Fields',
				value: 'fields',
			},
		],
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'multiOptions',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['draft'],
				output: ['fields'],
			},
		},
		options: messageFields,
		default: [],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['draft'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Attachments Prefix',
				name: 'attachmentsPrefix',
				type: 'string',
				default: 'attachment_',
				description:
					'Prefix for name of the binary property to which to write the attachments. An index starting with 0 will be added. So if name is "attachment_" the first attachment is saved to "attachment_0"',
			},
			{
				displayName: 'Download Attachments',
				name: 'downloadAttachments',
				type: 'boolean',
				default: false,
				description:
					"Whether the message's attachments will be downloaded and included in the output",
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

	const draftId = this.getNodeParameter('draftId', index) as string;
	const options = this.getNodeParameter('options', index, {}) as IDataObject;
	const output = this.getNodeParameter('output', index) as string;

	if (output === 'fields') {
		const fields = this.getNodeParameter('fields', index) as string[];
		qs['$select'] = fields.join(',');
	}

	if (output === 'simple') {
		qs['$select'] =
			'id,conversationId,subject,bodyPreview,from,toRecipients,categories,hasAttachments';
	}

	responseData = await microsoftApiRequest.call(this, 'GET', `/messages/${draftId}`, undefined, qs);

	if (output === 'simple') {
		responseData = simplifyOutputMessages([responseData]);
	}

	let executionData: INodeExecutionData[] = [];

	if (options.downloadAttachments) {
		const prefix = (options.attachmentsPrefix as string) || 'attachment_';
		executionData = await downloadAttachments.call(this, responseData, prefix);
	} else {
		executionData = this.helpers.constructExecutionMetaData(
			this.helpers.returnJsonArray(responseData),
			{ itemData: { item: index } },
		);
	}

	return executionData;
}

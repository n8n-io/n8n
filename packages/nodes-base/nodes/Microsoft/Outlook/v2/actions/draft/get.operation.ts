import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { downloadAttachments, microsoftApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['draft'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
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
				name: 'dataPropertyAttachmentsPrefixName',
				type: 'string',
				default: 'attachment_',
				description:
					'Prefix for name of the binary property to which to write the attachments. An index starting with 0 will be added. So if name is "attachment_" the first attachment is saved to "attachment_0"',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Fields the response will contain. Multiple can be added separated by comma.',
			},
			{
				displayName: 'Filter',
				name: 'filter',
				type: 'string',
				default: '',
				placeholder: 'isRead eq false',
				description:
					'Microsoft Graph API OData $filter query. Information about the syntax can be found <a href="https://docs.microsoft.com/en-us/graph/query-parameters#filter-parameter">here</a>.',
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
	const additionalFields = this.getNodeParameter('additionalFields', index) as IDataObject;

	if (additionalFields.fields) {
		qs['$select'] = additionalFields.fields;
	}

	if (additionalFields.filter) {
		qs['$filter'] = additionalFields.filter;
	}

	responseData = await microsoftApiRequest.call(
		this,
		'GET',
		`/messages/${messageId}`,
		undefined,
		qs,
	);

	if (additionalFields.dataPropertyAttachmentsPrefixName) {
		const prefix = additionalFields.dataPropertyAttachmentsPrefixName as string;
		const data = await downloadAttachments.call(this, responseData, prefix);
		return data;
	}

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData),
		{ itemData: { item: index } },
	);

	return executionData;
}

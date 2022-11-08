import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { makeRecipient } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['draft'],
				operation: ['send'],
			},
		},
		options: [
			{
				displayName: 'Recipients',
				name: 'recipients',
				description: 'Email addresses of recipients. Mutiple can be set separated by comma.',
				type: 'string',
				default: '',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const draftId = this.getNodeParameter('draftId', index);
	const additionalFields = this.getNodeParameter('additionalFields', index, {}) as IDataObject;

	if (additionalFields && additionalFields.recipients) {
		const recipients = ((additionalFields.recipients as string).split(',') as string[]).filter(
			(email) => !!email,
		);
		if (recipients.length !== 0) {
			await microsoftApiRequest.call(this, 'PATCH', `/messages/${draftId}`, {
				toRecipients: recipients.map((recipient: string) => makeRecipient(recipient)),
			});
		}
	}

	await microsoftApiRequest.call(this, 'POST', `/messages/${draftId}/send`);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray({ success: true }),
		{ itemData: { item: index } },
	);

	return executionData;
}

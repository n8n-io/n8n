import type { IExecuteFunctions } from 'n8n-core';

import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

import { apiRequest } from '../../../transport';

export async function createTicket(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const id = this.getNodeParameter('customerId', index) as IDataObject;
	const subject = this.getNodeParameter('subject', index) as IDataObject;
	const { assetId, issueType, status, contactId } = this.getNodeParameter(
		'additionalFields',
		index,
	);

	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = 'tickets';
	let body = {} as IDataObject;

	body = {
		asset_id: assetId,
		//due_date: dueDate,
		problem_type: issueType,
		status,
		contact_id: contactId,
	};

	body.customer_id = id;
	body.subject = subject;

	const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);

	return this.helpers.returnJsonArray(responseData.ticket as IDataObject[]);
}

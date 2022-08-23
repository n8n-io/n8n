import { IExecuteFunctions } from 'n8n-core';

import { IDataObject, INodeExecutionData, NodeOperationError } from 'n8n-workflow';

import { apiRequest } from '../../../transport';

export async function updateTicket(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const id = this.getNodeParameter('ticketId', index) as IDataObject;
	const { assetId, customerId, dueDate, issueType, status, subject, ticketType, contactId } =
		this.getNodeParameter('updateFields', index) as IDataObject;

	const qs = {} as IDataObject;
	const requestMethod = 'PUT';
	const endpoint = `tickets/${id}`;
	let body = {} as IDataObject;

	body = {
		...(assetId && { asset_id: assetId }),
		...(customerId && { customer_id: customerId }),
		...(dueDate && { due_date: dueDate }),
		...(issueType && { problem_type: issueType }),
		...(status && { status }),
		...(subject && { subject }),
		...(ticketType && { ticket_type: ticketType }),
		...(contactId && { contact_id: contactId }),
	};

	if (!Object.keys(body).length) {
		throw new NodeOperationError(this.getNode(), 'At least one update fields has to be defined', {
			itemIndex: index,
		});
	}

	let responseData;
	responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);

	return this.helpers.returnJsonArray(responseData.ticket);
}

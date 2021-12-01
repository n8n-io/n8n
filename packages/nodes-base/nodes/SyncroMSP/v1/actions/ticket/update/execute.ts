import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import {
	apiRequest,
} from '../../../transport';


export async function updateTicket(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const id = this.getNodeParameter('id', index) as IDataObject;
	const {assetId, customerId, dueDate, problemType, status, subject, ticketType} = this.getNodeParameter('additionalFields', index) as IDataObject;


	const qs = {} as IDataObject;
	const requestMethod = 'PUT';
	const endpoint = `tickets/${id}`;
	let body = {} as IDataObject;

	body ={
		asset_id : assetId,
		customer_id : customerId,
		due_date : dueDate,
		problem_type : problemType,
		status,
		subject,
		ticket_type : ticketType,
	};

	let responseData;
	responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);

	return this.helpers.returnJsonArray(responseData.ticket);
}

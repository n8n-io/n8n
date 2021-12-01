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


export async function updateCustomer(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const id = this.getNodeParameter('id', index) as IDataObject;
	const { address, businessName, city, email, firstName, getSms, invoiceCcEmail,
		lastName, noEmail, notes, notificationEmail, phone,
		referredBy, state, zip} = this.getNodeParameter('additionalFields', index) as IDataObject;

	const qs = {} as IDataObject;
	const requestMethod = 'PUT';
	const endpoint = `customers/${id}`;
	let body = {} as IDataObject;

	body={
		address,
		business_name : businessName,
		city,
		email,
		first_name : firstName,
		get_sms : getSms,
		invoice_cc_email : invoiceCcEmail,
		last_name : lastName,
		no_email : noEmail,
		notes,
		notification_email : notificationEmail,
		phone,
		referred_by : referredBy,
		state,
		zip,
	};

	let responseData;
	responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);

	return this.helpers.returnJsonArray(responseData.customer);
}

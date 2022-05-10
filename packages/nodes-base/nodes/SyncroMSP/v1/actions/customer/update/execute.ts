import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	NodeApiError,
} from 'n8n-workflow';

import {
	apiRequest,
} from '../../../transport';


export async function updateCustomer(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const id = this.getNodeParameter('customerId', index) as IDataObject;
	const { address, businessName, email, firstName, getSms, invoiceCcEmails,
		lastName, noEmail, notes, notificationEmail, phone, referredBy } = this.getNodeParameter('updateFields', index) as IDataObject;

	const qs = {} as IDataObject;
	const requestMethod = 'PUT';
	const endpoint = `customers/${id}`;
	let body = {} as IDataObject;
	let addressData = address as IDataObject;

	if (addressData) {
		addressData = addressData['addressFields'] as IDataObject;
		addressData.address_2 = addressData.address2;
	}

	body = {
		...addressData,
		business_name: businessName,
		email,
		firstname: firstName,
		get_sms: getSms,
		invoice_cc_emails: (invoiceCcEmails as string[] || []).join(','),
		lastname: lastName,
		no_email: noEmail,
		notes,
		notification_email: notificationEmail,
		phone,
		referred_by: referredBy,
	};

	let responseData;
	responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
	if (!responseData.customer) {
		throw new NodeApiError(this.getNode(), responseData, { httpCode: '404', message: 'Customer ID not found' });
	}
	return this.helpers.returnJsonArray(responseData.customer);
}

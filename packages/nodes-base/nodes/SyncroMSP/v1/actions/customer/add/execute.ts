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


export async function addCustomer(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const firstname = this.getNodeParameter('firstname', index) as IDataObject;
	const lastname = this.getNodeParameter('lastname', index) as IDataObject;
	const email = this.getNodeParameter('email', index) as IDataObject;
	const businessName = this.getNodeParameter('businessName', index) as IDataObject;
	const { address, city, getSms, invoiceCcEmail, noEmail, notes, notificationEmail, phone, referredBy, state, zip} = this.getNodeParameter('additionalFields', index) as IDataObject;

	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = 'customers';
	let body = {} as IDataObject;

	body={
		address,
		city,
		get_sms : getSms,
		invoice_cc_email : invoiceCcEmail,
		no_email : noEmail,
		notes,
		notification_email : notificationEmail,
		phone,
		referred_by : referredBy,
		state,
		zip,
	};


	body.firstname=firstname;
	body.lastname=lastname;
	body.email=email;
	body.business_name=businessName;

	let responseData;
	responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);

	return this.helpers.returnJsonArray(responseData.customer);
}

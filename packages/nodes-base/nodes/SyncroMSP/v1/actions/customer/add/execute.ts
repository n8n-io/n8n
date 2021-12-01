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
	const additionalFields = this.getNodeParameter('additionalFields', index) as IDataObject;

	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = 'customers';
	let body = {} as IDataObject;

	if (additionalFields) {
		body = additionalFields;
	}

	body.firstname=firstname;
	body.lastname=lastname;
	body.email=email;
	body.business_name=businessName;

	let responseData;
	responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);

	return this.helpers.returnJsonArray(responseData.customer);
}

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


export async function getAll(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const firstname = this.getNodeParameter('firstname', index) as IDataObject;
	const lastname = this.getNodeParameter('lastname', index) as IDataObject;
	const email = this.getNodeParameter('email', index) as IDataObject;
	const business_name = this.getNodeParameter('business_name', index) as IDataObject;
	const additionalFields = this.getNodeParameter('additionalFields', index) as IDataObject;

	let qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = 'customers';
	let body = {} as IDataObject;

	if (additionalFields) {
		body = additionalFields;
	}

	body.firstname=firstname;
	body.lastname=lastname;
	body.email=email;
	body.business_name=business_name;

	let responseData;
	responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);

	return this.helpers.returnJsonArray(responseData.customer);
}

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


export async function addContact(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const id = this.getNodeParameter('customerId',index) as IDataObject;
	const name = this.getNodeParameter('name', index) as IDataObject;
	const email = this.getNodeParameter('email', index) as IDataObject;
	const additionalFields = this.getNodeParameter('additionalFields', index) as IDataObject;

	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = 'contacts';
	let body = {} as IDataObject;

	if (additionalFields) {
		body = additionalFields;
	}

	if(body.address){
		body.address1=body.address;
		delete body.address;
	}

	body.name=name;
	body.email=email;
	body.customer_id=id;

	let responseData;
	responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);

	return this.helpers.returnJsonArray(responseData);
}

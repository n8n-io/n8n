import { IExecuteFunctions } from 'n8n-core';

import { IDataObject, INodeExecutionData } from 'n8n-workflow';

import { apiRequest } from '../../../transport';

export async function addAlert(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const customerId = this.getNodeParameter('customerId', index) as IDataObject;
	const assetId = this.getNodeParameter('assetId', index) as IDataObject;
	const description = this.getNodeParameter('description', index) as IDataObject;
	const additionalFields = this.getNodeParameter('additionalFields', index);

	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = 'rmm_alerts';
	let body = {} as IDataObject;

	if (additionalFields) {
		body = additionalFields;
	}

	body.customer_id = customerId;
	body.asset_id = assetId;
	body.description = description;

	let responseData;
	responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);

	return this.helpers.returnJsonArray(responseData.alert);
}

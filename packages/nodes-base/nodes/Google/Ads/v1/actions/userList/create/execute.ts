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

export async function create(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const customerId = this.getNodeParameter('customerId', index) as string;
	const devToken = this.getNodeParameter('devToken', index) as string;
	const name = this.getNodeParameter('name', index) as string;
	const uploadKeyType = this.getNodeParameter('uploadKeyType', index) as string;
	let appId;
	if (uploadKeyType === 'MOBILE_ADVERTISING_ID') {
		appId = this.getNodeParameter('app_id', index) as string;
	}
	const dataSourceType = this.getNodeParameter('dataSourceType', index) as IDataObject;
	const additionalFields = this.getNodeParameter('additionalFields', index) as IDataObject;
	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = `customers/${customerId}/userLists:mutate`;
	const headers = {
		'developer-token': devToken,
		'login-customer-id': customerId,
	} as IDataObject;

	const userList: IDataObject = {
		name,
		crm_based_user_list: {
			upload_key_type: uploadKeyType,
			app_id: appId,
			data_source_type: dataSourceType,
		},
	};

	Object.assign(userList, additionalFields);

	const form = {
		operations: [
			{
				create: userList,
			},
		],
	} as IDataObject;

	const responseData = await apiRequest.call(this, requestMethod, endpoint, form, qs, undefined, headers);

	return this.helpers.returnJsonArray(responseData);
}

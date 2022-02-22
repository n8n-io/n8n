import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import {
	apiRequest
} from '../../../transport';

import {
	selectableFields
} from '../selectableFields';

import {
	simplify
} from '../../../methods';

export async function getAll(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const customerId = this.getNodeParameter('customerId', index) as string;
	const devToken = this.getNodeParameter('devToken', index) as string;
	const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
	const simplifyOutput = this.getNodeParameter('simplifyOutput', 0) as boolean;
	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = `customers/${customerId}/googleAds:search`;
	const headers = {
		'developer-token': devToken,
		'login-customer-id': customerId,
	} as IDataObject;

	let form: IDataObject;
	if (returnAll) {
		form = {
			query: `SELECT ${selectableFields} FROM user_list ORDER BY user_list.id DESC`,
		};
	} else {
		const limit = this.getNodeParameter('limit', 0) as number;
		form = {
			query: `SELECT ${selectableFields} FROM user_list ORDER BY user_list.id DESC LIMIT ${limit}`,
		};
	}

	let responseData = await apiRequest.call(this, requestMethod, endpoint, form, qs, undefined, headers);

	if (simplifyOutput) {
		responseData = simplify(responseData);
	}
	return this.helpers.returnJsonArray(responseData);
}

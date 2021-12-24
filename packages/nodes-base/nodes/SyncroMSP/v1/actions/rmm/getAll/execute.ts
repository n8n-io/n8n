import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import {
	apiRequest, apiRequestAllItems
} from '../../../transport';


export async function getAll(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const returnAll = this.getNodeParameter('returnAll', index) as boolean;
	const additionalFilters = this.getNodeParameter('additionalFilters', index) as IDataObject;

	let qs = {} as IDataObject;
	const requestMethod = 'GET';
	const endpoint = 'rmm_alerts';
	const body = {} as IDataObject;

	if (additionalFilters) {
		qs = additionalFilters;
	}

	if (qs.status === undefined) {
		qs.status = 'all';
	}

	if (returnAll === false) {
		qs.per_page = this.getNodeParameter('limit', index) as number;
	}

	let responseData;
	if (returnAll) {
		responseData = await apiRequestAllItems.call(this, requestMethod, endpoint, body, qs);
		return this.helpers.returnJsonArray(responseData);
	} else {
		responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
		return this.helpers.returnJsonArray(responseData.rmm_alerts);
	}
}

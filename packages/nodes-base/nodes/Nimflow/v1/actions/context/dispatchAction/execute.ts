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

import {
	getNodeParameterAsObject
} from '../../../GenericFunctions';

export async function dispatchAction(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const contextTypeName = this.getNodeParameter('contextTypeName', index) as string;
	const action = this.getNodeParameter('action', index) as string;
	const reference = this.getNodeParameter('reference', index) as string;
	const payload = getNodeParameterAsObject.call(this,'payload', index);

	const method = 'POST';
	const endpoint = '/Contexts/DispatchAction';
	const body = {
		contextTypeName,
		action,
		reference,
		payload,
	};
	const responseData = await apiRequest.call(this, method, endpoint, body);
	return this.helpers.returnJsonArray(responseData);
}

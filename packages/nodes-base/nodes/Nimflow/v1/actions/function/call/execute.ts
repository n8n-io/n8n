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
} from '../../../GenericFunctions'

export async function call(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const moduleName = this.getNodeParameter('moduleName', index) as string;
	const name = this.getNodeParameter('name', index) as string;
	const parameters = getNodeParameterAsObject.call(this,'parameters', index);

	const method = 'POST';
	const endpoint = '/Functions/Call';
	const body = {
		moduleName,
		name,
		parameters
	};
	const responseData = await apiRequest.call(this, method, endpoint, body);
	return this.helpers.returnJsonArray(responseData);
}

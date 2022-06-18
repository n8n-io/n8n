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

export async function addResponse(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const contextTypeName = this.getNodeParameter('contextTypeName', index) as string;
	const contextReference = this.getNodeParameter('contextReference', index) as string;
	const taskTypeName = this.getNodeParameter('taskTypeName', index) as string;
	const responseTypeName = this.getNodeParameter('responseTypeName', index) as string;
	const payload = getNodeParameterAsObject.call(this,'payload', index);
	const additionalFields = this.getNodeParameter('additionalFields', index) as IDataObject;

	const method = 'POST';
	const endpoint = '/Tasks/addResponse';
	const body = {
		contextTypeName,
		contextReference,
		taskTypeName,
		responseTypeName,
		payload,
		...additionalFields
	};
	const responseData = await apiRequest.call(this, method, endpoint, body);
	return this.helpers.returnJsonArray(responseData);
}

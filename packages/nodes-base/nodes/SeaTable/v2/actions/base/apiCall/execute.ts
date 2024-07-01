import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';
import { seaTableApiRequest } from '../../../GenericFunctions';
import type { APITypes } from '../../../types';

export async function apiCall(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const apiMethod = this.getNodeParameter('apiMethod', index) as APITypes;
	const apiEndpoint = this.getNodeParameter('apiEndpoint', index) as APITypes;
	const responseObjectName = this.getNodeParameter('responseObjectName', index) as string;

	// body params
	const apiBody = this.getNodeParameter('apiBody', index) as any;

	// query params
	const apiParams: IDataObject = {};
	const params = this.getNodeParameter('apiParams.apiParamsValues', index, []) as any;
	for (const param of params) {
		apiParams[`${param.key}`] = param.value;
	}

	const responseData = await seaTableApiRequest.call(
		this,
		{},
		apiMethod,
		apiEndpoint,
		apiBody,
		apiParams,
	);

	if (responseObjectName) {
		return this.helpers.returnJsonArray(responseData[responseObjectName] as IDataObject[]);
	} else {
		return this.helpers.returnJsonArray(responseData as IDataObject[]);
	}
}

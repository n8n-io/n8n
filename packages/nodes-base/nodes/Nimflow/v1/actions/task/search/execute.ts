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

export async function search(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const contextTypeName = this.getNodeParameter('contextTypeName', index) as string;
	const typeName = this.getNodeParameter('typeName', index) as string;
	const archived = this.getNodeParameter('archived', index) as boolean;
	const unassigned = this.getNodeParameter('unassigned', index) as boolean;
	const assignedToCurrentUser = this.getNodeParameter('assignedToCurrentUser', index) as boolean;
	const startEnabled = this.getNodeParameter('startEnabled', index) as boolean;
	const additionalFields = this.getNodeParameter('additionalFields', index) as IDataObject;

	const method = 'POST';
	const endpoint = '/Tasks/Search';
	const body = {
		...(contextTypeName && { contextTypeName} ),
		...(typeName && {typeName}),
		archived,
		unassigned,
		assignedToCurrentUser,
		startEnabled,
		...additionalFields,
	};
	const responseData = await apiRequest.call(this, method, endpoint, body);
	return this.helpers.returnJsonArray(responseData);
}

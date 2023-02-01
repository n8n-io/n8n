import type { IExecuteFunctions } from 'n8n-core';

import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

import { apiRequest } from '../../../transport';

export async function create(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const username = this.getNodeParameter('username', index) as string;
	const authService = this.getNodeParameter('authService', index) as string;
	const additionalFields = this.getNodeParameter('additionalFields', index);

	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = 'users';
	const body = {} as IDataObject;

	body.auth_service = authService;

	body.username = username;
	Object.assign(body, additionalFields);

	if (body.notificationUi) {
		body.notify_props = (body.notificationUi as IDataObject).notificationValues;
	}

	if (authService === 'email') {
		body.email = this.getNodeParameter('email', index) as string;
		body.password = this.getNodeParameter('password', index) as string;
	} else {
		body.auth_data = this.getNodeParameter('authData', index) as string;
	}

	const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);

	return this.helpers.returnJsonArray(responseData);
}

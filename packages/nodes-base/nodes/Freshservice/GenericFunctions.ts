import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

import {
	FreshserviceCredentials, RolesParameter,
} from './types';

export async function freshserviceApiRequest(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const { apiKey, domain } = this.getCredentials('freshserviceApi') as FreshserviceCredentials;
	const encodedApiKey = Buffer.from(`${apiKey}:X`).toString('base64');

	const options: OptionsWithUri = {
		headers: {
			Authorization: `Basic ${encodedApiKey}`,
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: `https://${domain}.freshservice.com/api/v2${endpoint}`,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function freshserviceApiRequestAllItems(
	this: IExecuteFunctions | IHookFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const returnData: IDataObject[] = [];
	let responseData: any; // tslint:disable-line:no-any

	do {
		responseData = await freshserviceApiRequest.call(this, method, endpoint, body, qs);
		// TODO: Get next page
		returnData.push(...responseData);
	} while (
		false // TODO: Add condition for total not yet reached
	);

	return returnData;
}

export async function handleListing(
	this: IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const returnAll = this.getNodeParameter('returnAll', 0) as boolean;

	if (returnAll) {
		return await freshserviceApiRequestAllItems.call(this, method, endpoint, body, qs);
	}

	const responseData = await freshserviceApiRequestAllItems.call(this, method, endpoint, body, qs);
	const limit = this.getNodeParameter('limit', 0) as number;

	return responseData.slice(0, limit);
}

/**
 * Transform a loaded resources into load options.
 */
export const toOptions = (loadedResources: LoadedResource[]) => {
	return loadedResources
		.map(({ id, name }) => ({ value: id, name }))
		.sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Ensure at least one role has been specified.
 */
export function validateAssignmentScopeGroup(
	this: IExecuteFunctions,
	roles: RolesParameter,
) {
	if (!roles.roleProperties.length) {
		throw new NodeOperationError(
			this.getNode(),
			'Please specify a role for the agent to create.',
		);
	}
}

/**
 * Remove the `groups` param when `specified_groups` has been selected.
 */
export function sanitizeAssignmentScopeGroup(
	this: IExecuteFunctions,
	roles: RolesParameter,
) {
	roles.roleProperties.forEach(roleProperty => {
		if (roleProperty.groups && roleProperty.assignment_scope !== 'specified_groups') {
			delete roleProperty.groups;
		}
	});
}

/**
 * Adjust a roles fixed collection into the format expected by Freshservice API.
 */
export function adjustAgentRoles(roles: RolesParameter) {
	return {
		roles: roles.roleProperties.map(({ role, assignment_scope, groups }) => {
			return {
				role_id: role,
				assignment_scope,
				groups,
			};
		}),
	};
}

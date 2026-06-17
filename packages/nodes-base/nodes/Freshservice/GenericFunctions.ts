import omit from 'lodash/omit';
import type {
	IExecuteFunctions,
	IHookFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import type {
	AddressFixedCollection,
	FreshserviceCredentials,
	LoadedResource,
	LoadedUser,
	RolesParameter,
} from './types';

export async function freshserviceApiRequest(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const { apiKey, domain } = await this.getCredentials<FreshserviceCredentials>('freshserviceApi');
	const encodedApiKey = Buffer.from(`${apiKey}:X`).toString('base64');

	const options: IRequestOptions = {
		headers: {
			Authorization: `Basic ${encodedApiKey}`,
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
		return await this.helpers.request(options);
	} catch (error) {
		if (error.error.description === 'Validation failed') {
			const numberOfErrors = error.error.errors.length;
			const message = 'Please check your parameters';

			if (numberOfErrors === 1) {
				const [validationError] = error.error.errors;
				throw new NodeApiError(this.getNode(), error as JsonObject, {
					message,
					description: `For ${validationError.field}: ${validationError.message}`,
				});
			} else if (numberOfErrors > 1) {
				throw new NodeApiError(this.getNode(), error as JsonObject, {
					message,
					description: "For more information, expand 'details' below and look at 'cause' section",
				});
			}
		}

		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function freshserviceApiRequestAllItems(
	this: IExecuteFunctions | IHookFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const returnData: IDataObject[] = [];
	qs.page = 1;
	let items;

	do {
		const responseData = await freshserviceApiRequest.call(this, method, endpoint, body, qs);
		const key = Object.keys(responseData as IDataObject)[0];
		items = responseData[key];
		if (!items.length) return returnData;
		returnData.push(...(items as IDataObject[]));
		qs.page++;
	} while (items.length >= 30);

	return returnData;
}

export async function handleListing(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const returnAll = this.getNodeParameter('returnAll', 0);

	if (returnAll) {
		return await freshserviceApiRequestAllItems.call(this, method, endpoint, body, qs);
	}

	const responseData = await freshserviceApiRequestAllItems.call(this, method, endpoint, body, qs);
	const limit = this.getNodeParameter('limit', 0);

	return responseData.slice(0, limit);
}

export const toOptions = (loadedResources: LoadedResource[]) => {
	return loadedResources
		.map(({ id, name }) => ({ value: id, name }))
		.sort((a, b) => a.name.localeCompare(b.name));
};

export const toUserOptions = (loadedUsers: LoadedUser[]) => {
	return loadedUsers
		.map(({ id, last_name, first_name }) => {
			return {
				value: id,
				name: last_name ? `${last_name}, ${first_name}` : `${first_name}`,
			};
		})
		.sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Ensure at least one role has been specified.
 */
export function validateAssignmentScopeGroup(this: IExecuteFunctions, roles: RolesParameter) {
	if (!roles.roleProperties?.length) {
		throw new NodeOperationError(this.getNode(), 'Please specify a role for the agent to create.');
	}
}

export function sanitizeAssignmentScopeGroup(this: IExecuteFunctions, roles: RolesParameter) {
	roles.roleProperties.forEach((roleProperty) => {
		if (roleProperty.assignment_scope === 'specified_groups' && !roleProperty?.groups?.length) {
			throw new NodeOperationError(
				this.getNode(),
				'Please specify a group for every role of the agent to create.',
			);
		}

		// remove the `groups` param, only needed for scopes other than `specified_groups`
		if (roleProperty.assignment_scope !== 'specified_groups' && roleProperty.groups) {
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

export function formatFilters(filters: IDataObject) {
	const query = Object.keys(filters)
		.map((key) => {
			const value = filters[key];

			if (!isNaN(Number(value))) {
				return `${key}:${filters[key]}`; // number
			}

			if (typeof value === 'string' && value.endsWith('Z')) {
				return `${key}:'${value.split('T')[0]}'`; // date
			}

			return `${key}:'${filters[key]}'`; // string
		})
		.join(' AND ');

	return {
		query: `"${query}"`,
	};
}

export function validateUpdateFields(
	this: IExecuteFunctions,
	updateFields: IDataObject,
	resource: string,
) {
	if (!Object.keys(updateFields).length) {
		const twoWordResources: { [key: string]: string } = {
			agentGroup: 'agent group',
			agentRole: 'agent role',
			assetType: 'asset type',
			requesterGroup: 'requester group',
		};

		throw new NodeOperationError(
			this.getNode(),
			`Please enter at least one field to update for the ${
				twoWordResources[resource] ?? resource
			}.`,
		);
	}
}

export const toArray = (str: string) => str.split(',').map((e) => e.trim());

export function adjustAddress(fixedCollection: IDataObject & AddressFixedCollection) {
	if (!fixedCollection.address) return fixedCollection;

	const adjusted = omit(fixedCollection, ['address']);
	adjusted.address = fixedCollection.address.addressFields;

	return adjusted;
}

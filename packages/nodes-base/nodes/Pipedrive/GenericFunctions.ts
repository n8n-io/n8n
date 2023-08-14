import type {
	JsonObject,
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import type { OptionsWithUri } from 'request';

export interface ICustomInterface {
	name: string;
	key: string;
	field_type: string;
	options?: Array<{
		id: number;
		label: string;
	}>;
}

export interface ICustomProperties {
	[key: string]: ICustomInterface;
}

/**
 * Make an API request to Pipedrive
 *
 */
export async function pipedriveApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: IDataObject,
	query: IDataObject = {},
	formData?: IDataObject,
	downloadFile?: boolean,
): Promise<any> {
	const authenticationMethod = this.getNodeParameter('authentication', 0);

	const options: OptionsWithUri = {
		headers: {
			Accept: 'application/json',
		},
		method,
		qs: query,
		uri: `https://api.pipedrive.com/v1${endpoint}`,
	};

	if (downloadFile === true) {
		options.encoding = null;
	} else {
		options.json = true;
	}

	if (Object.keys(body).length !== 0) {
		options.body = body;
	}

	if (formData !== undefined && Object.keys(formData).length !== 0) {
		options.formData = formData;
	}

	if (query === undefined) {
		query = {};
	}

	try {
		const credentialType =
			authenticationMethod === 'apiToken' ? 'pipedriveApi' : 'pipedriveOAuth2Api';
		const responseData = await this.helpers.requestWithAuthentication.call(
			this,
			credentialType,
			options,
		);

		if (downloadFile === true) {
			return {
				data: responseData,
			};
		}

		if (responseData.success === false) {
			throw new NodeApiError(this.getNode(), responseData as JsonObject);
		}

		return {
			additionalData: responseData.additional_data,
			data: responseData.data === null ? [] : responseData.data,
		};
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Make an API request to paginated Pipedrive endpoint
 * and return all results
 *
 * @param {(IHookFunctions | IExecuteFunctions)} this
 */
export async function pipedriveApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject,
	query?: IDataObject,
): Promise<any> {
	if (query === undefined) {
		query = {};
	}
	query.limit = 100;
	query.start = 0;

	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await pipedriveApiRequest.call(this, method, endpoint, body, query);
		// the search path returns data diferently
		if (responseData.data.items) {
			returnData.push.apply(returnData, responseData.data.items as IDataObject[]);
		} else {
			returnData.push.apply(returnData, responseData.data as IDataObject[]);
		}

		query.start = responseData.additionalData.pagination.next_start;
	} while (responseData.additionalData?.pagination?.more_items_in_collection === true);

	return {
		data: returnData,
	};
}

/**
 * Gets the custom properties from Pipedrive
 *
 * @param {(IHookFunctions | IExecuteFunctions)} this
 */
export async function pipedriveGetCustomProperties(
	this: IHookFunctions | IExecuteFunctions,
	resource: string,
): Promise<ICustomProperties> {
	const endpoints: { [key: string]: string } = {
		activity: '/activityFields',
		deal: '/dealFields',
		organization: '/organizationFields',
		person: '/personFields',
		product: '/productFields',
	};

	if (endpoints[resource] === undefined) {
		throw new NodeOperationError(
			this.getNode(),
			`The resource "${resource}" is not supported for resolving custom values!`,
		);
	}

	const requestMethod = 'GET';

	const body = {};
	const qs = {};
	// Get the custom properties and their values
	const responseData = await pipedriveApiRequest.call(
		this,
		requestMethod,
		endpoints[resource],
		body,
		qs,
	);

	const customProperties: ICustomProperties = {};

	for (const customPropertyData of responseData.data) {
		customProperties[customPropertyData.key] = customPropertyData;
	}
	return customProperties;
}

/**
 * Converts names and values of custom properties from their actual values to the
 * Pipedrive internal ones
 *
 */
export function pipedriveEncodeCustomProperties(
	customProperties: ICustomProperties,
	item: IDataObject,
): void {
	let customPropertyData;

	for (const key of Object.keys(item)) {
		customPropertyData = Object.values(customProperties).find(
			(propertyData) => propertyData.name === key,
		);

		if (customPropertyData !== undefined) {
			// Is a custom property

			// Check if also the value has to be resolved or just the key
			if (
				item[key] !== null &&
				item[key] !== undefined &&
				customPropertyData.options !== undefined &&
				Array.isArray(customPropertyData.options)
			) {
				// Has an option key so get the actual option-value
				const propertyOption = customPropertyData.options.find(
					(option) => option.label.toString() === item[key]!.toString(),
				);

				if (propertyOption !== undefined) {
					item[customPropertyData.key] = propertyOption.id;
					delete item[key];
				}
			} else {
				// Does already represent the actual value or is null
				item[customPropertyData.key] = item[key];
				delete item[key];
			}
		}
	}
}

/**
 * Converts names and values of custom properties to their actual values
 *
 */
export function pipedriveResolveCustomProperties(
	customProperties: ICustomProperties,
	item: IDataObject,
): void {
	let customPropertyData;

	const json = item.json as IDataObject;

	// Iterate over all keys and replace the custom ones
	for (const key of Object.keys(json)) {
		if (customProperties[key] !== undefined) {
			// Is a custom property
			customPropertyData = customProperties[key];

			// value is not set, so nothing to resolve
			if (json[key] === null) {
				json[customPropertyData.name] = json[key];
				delete json[key];
				continue;
			}

			if (
				[
					'date',
					'address',
					'double',
					'monetary',
					'org',
					'people',
					'phone',
					'text',
					'time',
					'user',
					'varchar',
					'varchar_auto',
					'int',
					'time',
					'timerange',
				].includes(customPropertyData.field_type)
			) {
				json[customPropertyData.name] = json[key];
				delete json[key];
				// type options
			} else if (
				['enum', 'visible_to'].includes(customPropertyData.field_type) &&
				customPropertyData.options
			) {
				const propertyOption = customPropertyData.options.find(
					(option) => option.id.toString() === json[key]!.toString(),
				);
				if (propertyOption !== undefined) {
					json[customPropertyData.name] = propertyOption.label;
					delete json[key];
				}
				// type multioptions
			} else if (['set'].includes(customPropertyData.field_type) && customPropertyData.options) {
				const selectedIds = (json[key] as string).split(',');
				const selectedLabels = customPropertyData.options
					.filter((option) => selectedIds.includes(option.id.toString()))
					.map((option) => option.label);
				json[customPropertyData.name] = selectedLabels;
				delete json[key];
			}
		}
	}
	item.json = json;
}

export function sortOptionParameters(
	optionParameters: INodePropertyOptions[],
): INodePropertyOptions[] {
	optionParameters.sort((a, b) => {
		const aName = a.name.toLowerCase();
		const bName = b.name.toLowerCase();
		if (aName < bName) {
			return -1;
		}
		if (aName > bName) {
			return 1;
		}
		return 0;
	});

	return optionParameters;
}

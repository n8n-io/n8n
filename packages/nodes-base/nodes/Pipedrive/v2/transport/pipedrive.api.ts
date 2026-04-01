import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	IRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

export interface ICustomInterface {
	name: string;
	key: string;
	field_type: string;
	options?: Array<{ id: number; label: string }>;
}

export interface ICustomProperties {
	[key: string]: ICustomInterface;
}

export interface IPipedriveApiOption {
	formData?: IDataObject;
	downloadFile?: boolean;
	apiVersion?: 'v1' | 'v2';
}

export async function pipedriveApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject,
	query: IDataObject = {},
	option: IPipedriveApiOption = {},
): Promise<{ additionalData: IDataObject; data: IDataObject[] | IDataObject }> {
	const apiVersion = option.apiVersion ?? 'v2';
	const baseUrl =
		apiVersion === 'v1' ? 'https://api.pipedrive.com/v1' : 'https://api.pipedrive.com/api/v2';

	const authenticationMethod = this.getNodeParameter('authentication', 0) as string;

	const options: IRequestOptions = {
		headers: {
			Accept: 'application/json',
		},
		method,
		qs: query,
		uri: `${baseUrl}${endpoint}`,
	};

	if (option.downloadFile === true) {
		options.encoding = null;
	} else {
		options.json = true;
	}

	if (Object.keys(body).length !== 0) {
		options.body = body;
	}

	if (option.formData !== undefined && Object.keys(option.formData).length !== 0) {
		options.formData = option.formData;
	}

	try {
		const credentialType =
			authenticationMethod === 'apiToken' ? 'pipedriveApi' : 'pipedriveOAuth2Api';
		const responseData = await this.helpers.requestWithAuthentication.call(
			this,
			credentialType,
			options,
		);

		if (option.downloadFile === true) {
			return {
				additionalData: {} as IDataObject,
				data: responseData as IDataObject,
			};
		}

		if (responseData.success === false) {
			throw new NodeApiError(this.getNode(), responseData as JsonObject);
		}

		return {
			additionalData: responseData.additional_data ?? ({} as IDataObject),
			data: responseData.data ?? [],
		};
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function pipedriveApiRequestAllItemsCursor(
	this: IHookFunctions | IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject,
	query: IDataObject = {},
): Promise<{ data: IDataObject[] }> {
	query.limit = 500;

	const returnData: IDataObject[] = [];
	let responseData;

	do {
		responseData = await pipedriveApiRequest.call(this, method, endpoint, body, query);
		const data = Array.isArray(responseData.data) ? responseData.data : [];
		returnData.push(...data);

		const nextCursor = (responseData.additionalData as IDataObject)?.next_cursor as
			| string
			| undefined;
		if (nextCursor) {
			query.cursor = nextCursor;
		} else {
			break;
		}
	} while (true);

	return { data: returnData };
}

export async function pipedriveApiRequestAllItemsOffset(
	this: IHookFunctions | IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject,
	query: IDataObject = {},
): Promise<{ data: IDataObject[] }> {
	query.limit = 100;
	query.start = 0;

	const returnData: IDataObject[] = [];
	let responseData;

	do {
		responseData = await pipedriveApiRequest.call(this, method, endpoint, body, query, {
			apiVersion: 'v1',
		});

		const data = responseData.data as IDataObject[] | IDataObject;
		if (Array.isArray(data)) {
			if (data.length > 0 && (data[0] as IDataObject).item !== undefined) {
				returnData.push(...(data as IDataObject[]));
			} else if (data.length > 0 && (data[0] as IDataObject).items !== undefined) {
				returnData.push(...(data as IDataObject[]));
			} else {
				returnData.push(...data);
			}
		} else if (data && typeof data === 'object' && 'items' in data) {
			returnData.push(...((data as IDataObject).items as IDataObject[]));
		}

		const pagination = (responseData.additionalData as IDataObject)?.pagination as
			| IDataObject
			| undefined;
		if (pagination?.more_items_in_collection === true) {
			query.start = pagination.next_start as number;
		} else {
			break;
		}
	} while (true);

	return { data: returnData };
}

export async function pipedriveGetCustomProperties(
	this: IHookFunctions | IExecuteFunctions,
	resource: string,
): Promise<ICustomProperties> {
	const v2Endpoints: Record<string, string> = {
		activity: '/activityFields',
		deal: '/dealFields',
		organization: '/organizationFields',
		person: '/personFields',
		product: '/productFields',
	};

	const v1Endpoints: Record<string, string> = {
		lead: '/leadFields',
	};

	let responseData;

	if (v2Endpoints[resource] !== undefined) {
		responseData = await pipedriveApiRequestAllItemsCursor.call(
			this,
			'GET',
			v2Endpoints[resource],
			{},
		);
	} else if (v1Endpoints[resource] !== undefined) {
		responseData = await pipedriveApiRequestAllItemsOffset.call(
			this,
			'GET',
			v1Endpoints[resource],
			{},
		);
	} else {
		throw new NodeOperationError(
			this.getNode(),
			`The resource "${resource}" is not supported for resolving custom values!`,
		);
	}

	const customProperties: ICustomProperties = {};

	for (const field of responseData.data) {
		// v2 Fields API uses field_code/field_name, v1 uses key/name
		const fieldKey = (field.field_code ?? field.key) as string;
		const fieldName = (field.field_name ?? field.name) as string;

		if (fieldKey && fieldName) {
			customProperties[fieldKey] = {
				name: fieldName,
				key: fieldKey,
				field_type: field.field_type as string,
				options: field.options as ICustomInterface['options'],
			};
		}
	}

	return customProperties;
}

export function sortOptionParameters(
	optionParameters: INodePropertyOptions[],
): INodePropertyOptions[] {
	optionParameters.sort((a, b) => {
		const aName = a.name.toLowerCase();
		const bName = b.name.toLowerCase();
		if (aName < bName) return -1;
		if (aName > bName) return 1;
		return 0;
	});

	return optionParameters;
}

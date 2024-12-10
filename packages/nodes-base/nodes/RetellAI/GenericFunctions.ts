import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IHttpRequestOptions,
    IHttpRequestMethods,
    IDataObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';


export async function retellApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject | FormData = {}, 
	qs: IDataObject = {},
	uri?: string,
	options: Partial<IHttpRequestOptions> = {},
): Promise<any> {
	const credentials = await this.getCredentials('retellAIApi');

	const baseOptions: IHttpRequestOptions = {
		headers: {
			'Authorization': `Bearer ${credentials.apiKey}`,
			// Set content type dynamically for FormData
			'Content-Type': body instanceof FormData ? undefined : 'application/json',
		},
		method,
		qs,
		url: uri || `https://api.retellai.com${resource}`,
		json: !(body instanceof FormData), // Disable JSON parsing for FormData
	};

	// Add body or FormData
	if (body instanceof FormData) {
		baseOptions.body = body; 
	} else {
		baseOptions.body = body; 
	}

	const requestOptions: IHttpRequestOptions = {
		...baseOptions,
		...options,
	};

	try {
		return await this.helpers.request(requestOptions);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}


export async function validateRetellCredentials(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
): Promise<void> {
	try {
		await retellApiRequest.call(this, 'GET', '/get-concurrency');
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Invalid API key provided');
	}
}

export function validateE164Number(phoneNumber: string): boolean {
	const e164Regex = /^\+[1-9]\d{10,14}$/;
	return e164Regex.test(phoneNumber);
}

export function validatePhoneNumber(
	this: IExecuteFunctions,
	phoneNumber: string,
	parameterName: string,
	itemIndex: number,
): void {
	if (!validateE164Number(phoneNumber)) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid phone number format for ${parameterName}. Must be in E.164 format (e.g., +14157774444)`,
			{ itemIndex },
		);
	}
}

export function convertKeysToSnakeCase(obj: any): any {
	if (Array.isArray(obj)) {
		// If the value is an array, recursively process each item
		return obj.map((item) => convertKeysToSnakeCase(item));
	} else if (obj !== null && typeof obj === 'object') {
		// If the value is an object, process each key
		return Object.keys(obj).reduce((acc: any, key) => {
			const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase(); // Convert to snake_case
			acc[snakeKey] = convertKeysToSnakeCase(obj[key]); // Recurse for nested objects/arrays
			return acc;
		}, {});
	}
	// Return the value if it's neither an object nor an array
	return obj;
}

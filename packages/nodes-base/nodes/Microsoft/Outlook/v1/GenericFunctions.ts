import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	INodeExecutionData,
	IRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function microsoftApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
	option: IDataObject = { json: true },
): Promise<any> {
	const credentials = await this.getCredentials('microsoftOutlookOAuth2Api');

	let apiUrl = `https://graph.microsoft.com/v1.0/me${resource}`;
	// If accessing shared mailbox
	if (credentials.useShared && credentials.userPrincipalName) {
		apiUrl = `https://graph.microsoft.com/v1.0/users/${credentials.userPrincipalName}${resource}`;
	}

	const options: IRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || apiUrl,
	};
	try {
		Object.assign(options, option);

		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}

		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}

		return await this.helpers.requestOAuth2.call(this, 'microsoftOutlookOAuth2Api', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function microsoftApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
	headers: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	let uri: string | undefined;
	query.$top = 100;

	do {
		responseData = await microsoftApiRequest.call(
			this,
			method,
			endpoint,
			body,
			query,
			uri,
			headers,
		);
		uri = responseData['@odata.nextLink'];
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData['@odata.nextLink'] !== undefined);

	return returnData;
}

export async function microsoftApiRequestAllItemsSkip(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
	headers: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.$top = 100;
	query.$skip = 0;

	do {
		responseData = await microsoftApiRequest.call(
			this,
			method,
			endpoint,
			body,
			query,
			undefined,
			headers,
		);
		query.$skip += query.$top;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.value.length !== 0);

	return returnData;
}

export function makeRecipient(email: string) {
	return {
		emailAddress: {
			address: email,
		},
	};
}

/**
 * Detects if the provided content contains HTML markup
 * 
 * This function performs a comprehensive check for HTML content by looking for:
 * - Standard HTML tags with opening and closing pairs (e.g., <p></p>, <div></div>)
 * - Self-closing tags (e.g., <img />, <br />)
 * - Void/empty HTML elements (e.g., <br>, <hr>, <img>)
 * 
 * @param content - The string content to analyze for HTML markup
 * @returns True if HTML content is detected, false otherwise
 * 
 * @example
 * ```typescript
 * detectHtmlContent('<p>Hello World</p>'); // returns true
 * detectHtmlContent('Hello World'); // returns false
 * detectHtmlContent('Line 1<br>Line 2'); // returns true
 * ```
 */
function detectHtmlContent(content: string | undefined | null): boolean {
	// Early return for invalid input
	if (!content || typeof content !== 'string' || content.trim().length === 0) {
		return false;
	}

	// Regex patterns for different types of HTML content
	const HTML_PATTERNS = {
		// Standard HTML tags with opening and closing pairs
		// Matches: <tag>content</tag>, <tag attr="value">content</tag>
		pairedTags: /<\s*([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>[\s\S]*?<\/\s*\1\s*>/gi,
		
		// Self-closing tags with explicit closing slash
		// Matches: <tag />, <tag attr="value" />
		selfClosing: /<\s*[a-zA-Z][a-zA-Z0-9]*\b[^>]*\/\s*>/gi,
		
		// Void elements (HTML5 elements that don't require closing tags)
		// Reference: https://developer.mozilla.org/en-US/docs/Glossary/Void_element
		voidElements: /<\s*(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b[^>]*\/?>/gi,
	};

	// Test content against all HTML patterns
	const hasHtml = Object.values(HTML_PATTERNS).some(pattern => {
		// Reset regex lastIndex to ensure consistent results across multiple tests
		pattern.lastIndex = 0;
		return pattern.test(content);
	});

	return hasHtml;
}

export function createMessage(fields: IDataObject) {
	const message: IDataObject = {};

	// Create message body with intelligent content type detection
	if (fields.bodyContent || fields.bodyContentType) {
		const bodyContent = (fields.bodyContent as string) ?? '';
		const explicitContentType = fields.bodyContentType as string | undefined;
		
		// Determine content type with the following priority:
		// 1. Explicit user-provided contentType (highest priority)
		// 2. Auto-detected based on content analysis
		// 3. Default to 'Text' as fallback
		const contentType = explicitContentType ?? 
			(detectHtmlContent(bodyContent) ? 'html' : 'Text');
		
		message.body = {
			content: bodyContent,
			contentType,
		};

		// Clean up processed fields from the input object
		delete fields.bodyContent;
		delete fields.bodyContentType;
	}

	// Handle custom headers
	if (
		'internetMessageHeaders' in fields &&
		'headers' in (fields.internetMessageHeaders as IDataObject)
	) {
		fields.internetMessageHeaders = (fields.internetMessageHeaders as IDataObject).headers;
	}

	// Handle recipient fields
	['bccRecipients', 'ccRecipients', 'replyTo', 'sender', 'toRecipients'].forEach((key) => {
		if (Array.isArray(fields[key])) {
			fields[key] = (fields[key] as string[]).map((email) => makeRecipient(email));
		} else if (fields[key] !== undefined) {
			fields[key] = (fields[key] as string)
				.split(',')
				.map((recipient: string) => makeRecipient(recipient));
		}
	});

	['from', 'sender'].forEach((key) => {
		if (fields[key] !== undefined) {
			fields[key] = makeRecipient(fields[key] as string);
		}
	});

	Object.assign(message, fields);

	return message;
}

export async function downloadAttachments(
	this: IExecuteFunctions,
	messages: IDataObject[] | IDataObject,
	prefix: string,
) {
	const elements: INodeExecutionData[] = [];
	if (!Array.isArray(messages)) {
		messages = [messages];
	}
	for (const message of messages) {
		const element: INodeExecutionData = {
			json: message,
			binary: {},
		};
		if (message.hasAttachments === true) {
			const attachments = await microsoftApiRequestAllItems.call(
				this,
				'value',
				'GET',
				`/messages/${message.id}/attachments`,
				{},
			);
			for (const [index, attachment] of attachments.entries()) {
				const response = await microsoftApiRequest.call(
					this,
					'GET',
					`/messages/${message.id}/attachments/${attachment.id}/$value`,
					undefined,
					{},
					undefined,
					{},
					{ encoding: null, resolveWithFullResponse: true },
				);

				const data = Buffer.from(response.body as string, 'utf8');
				element.binary![`${prefix}${index}`] = await this.helpers.prepareBinaryData(
					data as unknown as Buffer,
					attachment.name as string,
					attachment.contentType as string,
				);
			}
		}
		if (Object.keys(element.binary!).length === 0) {
			delete element.binary;
		}
		elements.push(element);
	}
	return elements;
}

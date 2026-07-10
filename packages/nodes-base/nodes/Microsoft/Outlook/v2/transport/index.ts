import type {
	IHttpRequestMethods,
	IRequestOptions,
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	IPollFunctions,
} from 'n8n-workflow';
import { isResourceLocatorValue } from 'n8n-workflow';

import { prepareApiError, validateMailbox } from '../helpers/utils';

export type OutlookCredentialType =
	| 'microsoftOutlookOAuth2Api'
	| 'microsoftOAuth2Api'
	| 'microsoftEntraServicePrincipalApi';

/**
 * Resolves which credential type the node is configured to use. Defaults to the
 * node-specific `microsoftOutlookOAuth2Api` so existing workflows (and nodes
 * without the `authentication` selector) keep working unchanged, while allowing
 * the generic `microsoftOAuth2Api` (Graph) credential or the app-only
 * `microsoftEntraServicePrincipalApi` credential to be selected.
 */
export function getOutlookCredentialType(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IPollFunctions,
): OutlookCredentialType {
	const authentication = this.getNodeParameter('authentication', 0);
	if (authentication === 'microsoftOAuth2Api') return 'microsoftOAuth2Api';
	if (authentication === 'microsoftEntraServicePrincipalApi')
		return 'microsoftEntraServicePrincipalApi';
	return 'microsoftOutlookOAuth2Api';
}

/**
 * Resolves the mailbox the request should target. Returns `undefined` for OAuth2
 * (which uses `/me` or the credential's shared mailbox). For the Service Principal
 * credential, app-only Graph has no `/me`, so the node's `mailbox` parameter is
 * read, validated, and returned as the bare (un-encoded) UPN/ID.
 *
 * The mailbox is read at the fixed item index 0 and treated as a per-node constant
 * for the whole run — the same contract as the `authentication` selector. Encoding
 * happens once at the URL-build site in `microsoftApiRequest`.
 */
export function resolveMailbox(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IPollFunctions,
	credentialType: OutlookCredentialType,
): string | undefined {
	if (credentialType !== 'microsoftEntraServicePrincipalApi') return undefined;
	// Read at item index 0 (per-node constant, same as the `authentication` selector).
	// loadOptions' getNodeParameter has no itemIndex arg (execute/poll do), so the
	// { extractValue: true } overload can't be shared across all three contexts.
	// Read the raw param and take the id-mode RLC value directly (this RLC has no
	// extractValue regex, so .value is already the bare mailbox id).
	const raw = this.getNodeParameter('mailbox', 0);
	const value = isResourceLocatorValue(raw) ? raw.value : raw;
	// A non-string or whitespace-only value collapses to '', which validateMailbox
	// reports as the "mailbox required" error (not "not valid").
	const mailbox = (typeof value === 'string' ? value : '').trim();
	validateMailbox(mailbox, this.getNode());
	return mailbox;
}

export async function microsoftApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
	option: IDataObject = { json: true },
) {
	const credentialType = getOutlookCredentialType.call(this);
	const credentials = await this.getCredentials(credentialType);

	const baseUrl = (
		typeof credentials.graphApiBaseUrl === 'string' && credentials.graphApiBaseUrl !== ''
			? credentials.graphApiBaseUrl
			: 'https://graph.microsoft.com'
	).replace(/\/+$/, '');

	const mailbox = resolveMailbox.call(this, credentialType);

	let apiUrl: string;
	if (mailbox !== undefined) {
		// Service Principal (app-only): target the chosen mailbox. The single
		// encodeURIComponent call lives here; the value was already validated.
		apiUrl = `${baseUrl}/v1.0/users/${encodeURIComponent(mailbox)}${resource}`;
	} else if (credentials.useShared && credentials.userPrincipalName) {
		// OAuth2 accessing a shared mailbox (existing behavior).
		apiUrl = `${baseUrl}/v1.0/users/${credentials.userPrincipalName}${resource}`;
	} else {
		// OAuth2 default (existing behavior).
		apiUrl = `${baseUrl}/v1.0/me${resource}`;
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

		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
	} catch (error) {
		if (
			((error.message || '').toLowerCase().includes('bad request') ||
				(error.message || '').toLowerCase().includes('unknown error')) &&
			error.description
		) {
			let updatedError;
			// Try to return the error prettier, otherwise return the original one replacing the message with the description
			try {
				updatedError = prepareApiError.call(this, error);
			} catch (e) {}

			if (updatedError) throw updatedError;

			error.message = error.description;
			error.description = '';
		}

		throw error;
	}
}

export async function microsoftApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
	headers: IDataObject = {},
) {
	const returnData: IDataObject[] = [];

	let responseData;
	let nextLink: string | undefined;
	query.$top = 100;

	do {
		responseData = await microsoftApiRequest.call(
			this,
			method,
			endpoint,
			body,
			nextLink ? undefined : query, // Do not add query parameters as nextLink already contains them
			nextLink,
			headers,
		);
		nextLink = responseData['@odata.nextLink'];
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData['@odata.nextLink'] !== undefined);

	return returnData;
}

export async function downloadAttachments(
	this: IExecuteFunctions | IPollFunctions,
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

export async function getMimeContent(
	this: IExecuteFunctions,
	messageId: string,
	binaryPropertyName: string,
	outputFileName?: string,
) {
	const response = await microsoftApiRequest.call(
		this,
		'GET',
		`/messages/${messageId}/$value`,
		undefined,
		{},
		undefined,
		{},
		{ encoding: null, resolveWithFullResponse: true },
	);

	let mimeType: string | undefined;
	if (response.headers['content-type']) {
		mimeType = response.headers['content-type'];
	}

	const fileName = `${outputFileName || messageId}.eml`;
	const data = Buffer.from(response.body as string, 'utf8');
	const binary: IDataObject = {};
	binary[binaryPropertyName] = await this.helpers.prepareBinaryData(
		data as unknown as Buffer,
		fileName,
		mimeType,
	);

	return binary;
}

export async function getSubfolders(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	folders: IDataObject[],
	addPathToDisplayName = false,
) {
	const returnData: IDataObject[] = [...folders];
	for (const folder of folders) {
		if ((folder.childFolderCount as number) > 0) {
			let subfolders = await microsoftApiRequestAllItems.call(
				this,
				'value',
				'GET',
				`/mailFolders/${folder.id}/childFolders`,
			);

			if (addPathToDisplayName) {
				subfolders = subfolders.map((subfolder: IDataObject) => {
					return {
						...subfolder,
						displayName: `${folder.displayName}/${subfolder.displayName}`,
					};
				});
			}

			returnData.push(
				...(await getSubfolders.call(this, subfolders as IDataObject[], addPathToDisplayName)),
			);
		}
	}
	return returnData;
}

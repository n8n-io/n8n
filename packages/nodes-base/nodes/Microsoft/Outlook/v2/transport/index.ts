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

import { prepareApiError } from '../helpers/utils';

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

		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		return await this.helpers.requestWithAuthentication.call(
			this,
			'microsoftOutlookOAuth2Api',
			options,
		);
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
			let subfolders = await microsoftApiRequest.call(
				this,
				'GET',
				`/mailFolders/${folder.id}/childFolders`,
			);

			if (addPathToDisplayName) {
				subfolders = subfolders.value.map((subfolder: IDataObject) => {
					return {
						...subfolder,
						displayName: `${folder.displayName}/${subfolder.displayName}`,
					};
				});
			} else {
				subfolders = subfolders.value;
			}

			returnData.push(
				...(await getSubfolders.call(this, subfolders as IDataObject[], addPathToDisplayName)),
			);
		}
	}
	return returnData;
}

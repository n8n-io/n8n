import type {
	IBinaryKeyData,
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	INodeExecutionData,
	IPairedItemData,
	IPollFunctions,
	IRequestOptions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { jsonParse, NodeOperationError, requestUrl } from 'n8n-workflow';

import { isSameOrigin } from './isSameOrigin';

interface IAttachment {
	url: string;
	title: string;
	mimetype: string;
	size: number;
	signedUrl?: string;
}

/**
 * Make an API request to NocoDB
 *
 */
export async function apiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	body: object,
	query?: IDataObject,
	option: Pick<IRequestOptions, 'formData'> = {},
): Promise<any> {
	const authenticationMethod = this.getNodeParameter('authentication', 0) as string;
	const credentials = await this.getCredentials(authenticationMethod);

	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}

	const baseUrl = credentials.host as string;

	query = query || {};

	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		method,
		body,
		qs: query,
		uri: requestUrl`${baseUrl}${endpoint}`,
		json: true,
	};

	if (option.formData) {
		options.formData = option.formData;
	}

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	return await this.helpers.requestWithAuthentication.call(this, authenticationMethod, options);
}

/**
 * Make an API request to paginated NocoDB endpoint
 * and return all results
 *
 * @param {(IHookFunctions | IExecuteFunctions)} this
 */
export async function apiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | IPollFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	body: IDataObject,
	query?: IDataObject,
): Promise<any> {
	const version = this.getNode().typeVersion;

	if (query === undefined) {
		query = {};
	}
	query.limit = 100;
	query.offset = query?.offset ? (query.offset as number) : 0;
	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await apiRequest.call(this, method, endpoint, body, query);
		version === 1
			? returnData.push(...(responseData as IDataObject[]))
			: returnData.push(...(responseData.list as IDataObject[]));

		query.offset += query.limit;
	} while (version === 1 ? responseData.length !== 0 : responseData.pageInfo.isLastPage !== true);

	return returnData;
}

export async function downloadRecordAttachments(
	this: IExecuteFunctions | IPollFunctions,
	records: IDataObject[],
	fieldNames: string[],
	pairedItem?: IPairedItemData[],
): Promise<INodeExecutionData[]> {
	const elements: INodeExecutionData[] = [];
	const authenticationMethod = this.getNodeParameter('authentication', 0) as string;
	const { host: baseUrl } = await this.getCredentials<{ host: string }>(authenticationMethod);

	for (const record of records) {
		const element: INodeExecutionData = { json: {}, binary: {} };
		if (pairedItem) {
			element.pairedItem = pairedItem;
		}
		element.json = record as unknown as IDataObject;
		for (const fieldName of fieldNames) {
			let attachments = record[fieldName] as IAttachment[];
			if (typeof attachments === 'string') {
				attachments = jsonParse<IAttachment[]>(record[fieldName] as string);
			}
			if (record[fieldName]) {
				for (const [index, attachment] of attachments.entries()) {
					const attachmentUrl = attachment.signedUrl || attachment.url;
					const request: IRequestOptions = {
						method: 'GET',
						qs: {},
						uri: attachmentUrl,
						json: false,
						encoding: null,
					};
					// The attachment URL comes from record content, so send the credential only to the NocoDB host.
					// The credential headers are custom (`xc-token`, `xc-auth`), so a redirect would not strip them.
					const file: Buffer = isSameOrigin(attachmentUrl, baseUrl)
						? await this.helpers.requestWithAuthentication.call(this, authenticationMethod, {
								...request,
								followRedirect: false,
							})
						: await this.helpers.request(request);
					element.binary![`${fieldName}_${index}`] = await this.helpers.prepareBinaryData(
						Buffer.from(file),
						attachment.title,
						attachment.mimetype,
					);
				}
			}
		}
		if (Object.keys(element.binary as IBinaryKeyData).length === 0) {
			delete element.binary;
		}
		elements.push(element);
	}
	return elements;
}

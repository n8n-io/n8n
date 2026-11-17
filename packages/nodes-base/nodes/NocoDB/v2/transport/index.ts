import type {
	IBinaryKeyData,
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	IPairedItemData,
	IPollFunctions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { jsonParse, NodeOperationError, requestUrl } from 'n8n-workflow';

import { isSameOrigin } from '../../isSameOrigin';

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
): Promise<any> {
	const authenticationMethod = this.getNodeParameter('authentication', 0) as string;
	const credentials = await this.getCredentials(authenticationMethod);

	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}

	const baseUrl = credentials.host as string;

	query = query ?? {};

	const options: WithRequestTarget<IHttpRequestOptions> = {
		method,
		body,
		qs: query,
		url: requestUrl`${baseUrl}${endpoint}`,
		json: true,
	};

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	return await this.helpers.httpRequestWithAuthentication.call(this, authenticationMethod, options);
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
	query = query ?? {};
	const QUERY_LIMIT = 100;
	query.limit = QUERY_LIMIT;
	query.offset = query?.offset ? Number(query.offset) : 0;
	const returnData: IDataObject[] = [];

	let responseData: {
		records: IDataObject[];
		next?: string;
	};

	do {
		responseData = await apiRequest.call(this, method, endpoint, body, query);
		query.offset += QUERY_LIMIT;
		returnData.push.apply(returnData, responseData.records);
	} while (responseData.next);

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
	const getAttachmentField = (record: any, fieldName: string) => {
		return record.fields[fieldName];
	};

	for (const record of records) {
		const element: INodeExecutionData = { json: {}, binary: {} };
		if (pairedItem) {
			element.pairedItem = pairedItem;
		}
		element.json = record as unknown as IDataObject;
		for (const fieldName of fieldNames) {
			let attachments = getAttachmentField(record, fieldName) as IAttachment[];
			if (typeof attachments === 'string') {
				attachments = jsonParse<IAttachment[]>(attachments as string);
			}
			if (attachments) {
				for (const [index, attachment] of attachments.entries()) {
					const attachmentUrl = attachment.signedUrl || attachment.url;
					const request: IHttpRequestOptions = {
						method: 'GET',
						qs: {},
						url: attachmentUrl,
						json: false,
						encoding: 'arraybuffer',
					};
					// The attachment URL comes from record content, so send the credential only to the NocoDB host.
					// The credential headers are custom (`xc-token`, `xc-auth`), so a redirect would not strip them.
					const file: Buffer = isSameOrigin(attachmentUrl, baseUrl)
						? await this.helpers.httpRequestWithAuthentication.call(this, authenticationMethod, {
								...request,
								disableFollowRedirect: true,
							})
						: await this.helpers.httpRequest(request);
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

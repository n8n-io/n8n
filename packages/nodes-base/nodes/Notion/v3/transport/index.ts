import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IPollFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

type NotionFunctions = IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions;

const NOTION_VERSION_HEADER = 'Notion-Version';
const NOTION_API_VERSION = '2026-03-11';

export function isDataObject(value: unknown): value is IDataObject {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export async function notionApiRequestV3(
	this: NotionFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<IDataObject> {
	try {
		const options: IHttpRequestOptions = {
			method,
			qs,
			body,
			url: `https://api.notion.com/v1${resource}`,
			json: true,
			headers: {
				[NOTION_VERSION_HEADER]: NOTION_API_VERSION,
			},
		};
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		const authentication = this.getNodeParameter('authentication', 0, 'apiKey') as string;
		const credentialType = authentication === 'oAuth2' ? 'notionOAuth2Api' : 'notionApi';
		return (await this.helpers.httpRequestWithAuthentication.call(
			this,
			credentialType,
			options,
		)) as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function notionApiRequestAllItemsV3(
	this: NotionFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
): Promise<IDataObject[]> {
	const limit = query.limit as number | undefined;
	delete query.limit;

	const returnData: IDataObject[] = [];
	let responseData: IDataObject;

	do {
		responseData = await notionApiRequestV3.call(this, method, endpoint, body, query);
		const nextCursor = responseData.next_cursor;
		if (method === 'GET') {
			query.start_cursor = nextCursor;
		} else {
			body.start_cursor = nextCursor;
		}
		const page = responseData[propertyName];
		if (Array.isArray(page)) {
			returnData.push.apply(returnData, page.filter(isDataObject));
		}
		if (limit && limit <= returnData.length) {
			return returnData.slice(0, limit);
		}
	} while (responseData.has_more !== false);

	return limit ? returnData.slice(0, limit) : returnData;
}

export async function getDataSourceProperties(this: NotionFunctions, dataSourceId: string) {
	const dataSource = await notionApiRequestV3.call(this, 'GET', `/data_sources/${dataSourceId}`);
	if (!isDataObject(dataSource.properties)) {
		throw new NodeOperationError(this.getNode(), 'Notion did not return data source properties');
	}
	return dataSource.properties;
}

import { IDataObject, IExecuteFunctions, JsonObject, NodeApiError } from 'n8n-workflow';

export const LINE_API = 'https://api.line.me';

export async function lineApiRequest(
	this: IExecuteFunctions,
	method: 'GET' | 'POST' | 'DELETE',
	endpoint: string,
	body?: IDataObject,
): Promise<IDataObject> {
	try {
		return await this.helpers.httpRequestWithAuthentication.call(this, 'lineApi', {
			method,
			url: `${LINE_API}${endpoint}`,
			headers: method !== 'GET' ? { 'Content-Type': 'application/json' } : undefined,
			body: body !== undefined ? JSON.stringify(body) : undefined,
		});
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

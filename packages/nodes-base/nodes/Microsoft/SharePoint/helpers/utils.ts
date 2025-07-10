import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	JsonObject,
	ResourceMapperValue,
} from 'n8n-workflow';
import { jsonParse, NodeApiError, NodeOperationError } from 'n8n-workflow';

import type { IErrorResponse } from './interfaces';
import { microsoftSharePointApiRequest } from '../transport';

export async function simplifyItemPostReceive(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	_response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (items.length === 0) {
		return items;
	}

	const simplify = this.getNodeParameter('simplify') as boolean;
	if (simplify) {
		for (const item of items) {
			delete item.json['@odata.context'];
			delete item.json['@odata.etag'];
			delete item.json['fields@odata.navigationLink'];
			delete (item.json.fields as IDataObject)?.['@odata.etag'];
		}
	}

	return items;
}

export async function simplifyListPostReceive(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	_response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (items.length === 0) {
		return items;
	}

	const simplify = this.getNodeParameter('simplify') as boolean;
	if (simplify) {
		for (const item of items) {
			delete item.json['@odata.context'];
			delete item.json['@odata.etag'];
		}
	}

	return items;
}

export async function downloadFilePostReceive(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	let fileName: string | undefined;
	if (response.headers['content-disposition']) {
		let fileNameMatch = /filename\*=(?:(\\?['"])(.*?)\1|(?:[^\s]+'.*?')?([^;\n]*))/g.exec(
			response.headers['content-disposition'] as string,
		);
		fileName =
			fileNameMatch && fileNameMatch.length > 1 ? fileNameMatch[3] || fileNameMatch[2] : undefined;
		if (fileName) {
			fileName = decodeURIComponent(fileName);
		} else {
			fileNameMatch = /filename="?([^"]*?)"?(;|$)/g.exec(
				response.headers['content-disposition'] as string,
			);
			fileName = fileNameMatch && fileNameMatch.length > 1 ? fileNameMatch[1] : undefined;
		}
	}

	const newItem: INodeExecutionData = {
		json: {},
		binary: {
			data: await this.helpers.prepareBinaryData(
				response.body as Buffer,
				fileName,
				response.headers['content-type'] as string,
			),
		},
	};

	return [newItem];
}

export async function uploadFilePreSend(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const binaryProperty = this.getNodeParameter('fileContents') as string;
	this.helpers.assertBinaryData(binaryProperty);
	const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(binaryProperty);
	requestOptions.body = binaryDataBuffer;
	return requestOptions;
}

export async function itemGetAllFieldsPreSend(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const fields = this.getNodeParameter('options.fields') as string[];
	requestOptions.qs ??= {};
	if (fields.some((x) => x === 'fields')) {
		requestOptions.qs.$expand = 'fields';
	}
	requestOptions.qs.$select = fields.map((x) => x);
	return requestOptions;
}

export async function itemColumnsPreSend(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const mapperValue = this.getNodeParameter('columns') as ResourceMapperValue;
	const operation = this.getNodeParameter('operation') as string;

	if (['upsert', 'update'].includes(operation) && mapperValue.matchingColumns?.length > 0) {
		if (!mapperValue.matchingColumns.includes('id')) {
			const site = this.getNodeParameter('site', undefined, { extractValue: true }) as string;
			const list = this.getNodeParameter('list', undefined, { extractValue: true }) as string;

			const response = await microsoftSharePointApiRequest.call(
				this,
				'GET',
				`/sites/${site}/lists/${list}/items`,
				{},
				{
					$filter: mapperValue.matchingColumns
						.map((x) => `fields/${x} eq '${mapperValue.value![x]}'`)
						.join(' and'),
				},
				{
					Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly',
				},
			);
			if (response.value?.length === 1) {
				mapperValue.matchingColumns.push('id');
				mapperValue.value ??= {};
				mapperValue.value.id = response.value[0].id;
			}
		}

		if (operation === 'upsert') {
			if (mapperValue.matchingColumns.includes('id')) {
				if (!mapperValue.value?.id) {
					throw new NodeOperationError(
						this.getNode(),
						"The column(s) don't match any existing item",
						{
							description: 'Double-check the value(s) for the columns to match and try again',
						},
					);
				}
				requestOptions.url += '/' + mapperValue.value.id;
				delete mapperValue.value.id;
				requestOptions.method = 'PATCH';
			}
		} else if (operation === 'update') {
			if (mapperValue.matchingColumns.includes('id') && mapperValue.value?.id) {
				requestOptions.url += '/' + mapperValue.value.id;
				delete mapperValue.value.id;
			} else {
				throw new NodeOperationError(
					this.getNode(),
					"The column(s) don't match any existing item",
					{
						description: 'Double-check the value(s) for the columns to match and try again',
					},
				);
			}
		}
	}

	const fields = {} as IDataObject;
	for (const [key, value] of Object.entries(mapperValue.value ?? {})) {
		if (mapperValue.schema.find((x) => x.id === key)?.type === 'url') {
			fields[key] = {
				Description: value,
				Url: value,
			};
		} else {
			fields[key] = value;
		}
	}
	requestOptions.body ??= {};
	(requestOptions.body as IDataObject).fields = fields;

	return requestOptions;
}

export async function handleErrorPostReceive(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (String(response.statusCode).startsWith('4') || String(response.statusCode).startsWith('5')) {
		const resource = this.getNodeParameter('resource') as string;
		const operation = this.getNodeParameter('operation') as string;

		if (resource === 'file' && operation === 'download' && Buffer.isBuffer(response.body)) {
			response.body = jsonParse((response.body as Buffer).toString());
		}
		const error = (response.body as IErrorResponse)?.error ?? ({} as IErrorResponse['error']);

		if (resource === 'file') {
			if (operation === 'download') {
			} else if (operation === 'update') {
			} else if (operation === 'upload') {
			}
		} else if (resource === 'item') {
			if (operation === 'create') {
				if (error.code === 'invalidRequest') {
					if (
						error.message ===
						'One or more fields with unique constraints already has the provided value.'
					) {
						throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
							message: 'One or more fields with unique constraints already has the provided value',
							description: "Double-check the value(s) in 'Values to Send' and try again",
						});
					} else {
						throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
							message: error.message,
							description: "Double-check the value(s) in 'Values to Send' and try again",
						});
					}
				}
			} else if (operation === 'delete') {
			} else if (operation === 'get') {
			} else if (operation === 'getAll') {
			} else if (operation === 'update') {
				if (error.code === 'invalidRequest') {
					throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
						message: error.message,
						description: "Double-check the value(s) in 'Values to Update' and try again",
					});
				}
			} else if (operation === 'upsert') {
				if (error.code === 'invalidRequest') {
					throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
						message: error.message,
						description: "Double-check the value(s) in 'Values to Send' and try again",
					});
				}
			}
		} else if (resource === 'list') {
			if (operation === 'get') {
			} else if (operation === 'getAll') {
			}
		}

		if (error.code === 'itemNotFound') {
			if (error.message.includes('list item')) {
				throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
					message: "The required item doesn't match any existing one",
					description: "Double-check the value in the parameter 'Item' and try again",
				});
			} else if (error.message.includes('list')) {
				throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
					message: "The required list doesn't match any existing one",
					description: "Double-check the value in the parameter 'List' and try again",
				});
			}
		}

		throw new NodeApiError(this.getNode(), response as unknown as JsonObject);
	}

	return data;
}

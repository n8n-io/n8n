/* eslint-disable n8n-nodes-base/node-param-description-missing-from-dynamic-options */
/* eslint-disable n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options */
import { MergeClient } from '@mergeapi/merge-node-client';

import {
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { computeMethod, loadOptions, resourceMapping } from './methods';
import { findResourceKey, getCategoryClient, omitEmpty, type ModelOperation } from './utils';

export class MergeDev implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Merge.dev',
		name: 'mergeDev',
		icon: 'file:merge-dev.svg',
		group: ['output'],
		version: 1,
		description:
			'Interact with any Merge.dev Unified API (ATS, HRIS, CRM, Accounting, Ticketing, File Storage). The category is determined automatically from the linked account.',
		defaults: { name: 'Merge.dev' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'mergeDevApi', required: true }],
		properties: [
			{
				displayName: 'Category',
				name: 'category',
				type: 'string',
				typeOptions: {
					computeMethod: 'getMergeDevCategory',
				},
				default: '',
			},
			{
				displayName: 'Model',
				name: 'commonModels',
				type: 'options',
				noDataExpression: true,
				typeOptions: {
					loadOptionsMethod: 'getCommonModels',
				},
				default: '',
			},
			{
				displayName: 'Operation',
				name: 'modelOperation',
				type: 'options',
				noDataExpression: true,
				typeOptions: {
					loadOptionsDependsOn: ['commonModels'],
					loadOptionsMethod: 'getModelOperations',
				},
				default: '',
			},
			{
				displayName: 'Debug Mode',
				name: 'isDebugMode',
				type: 'boolean',
				default: false,
				description: 'Whether to include debug log links in the response',
				displayOptions: { show: { modelOperation: ['create', 'update'] } },
			},
			{
				displayName: 'Run Async',
				name: 'runAsync',
				type: 'boolean',
				default: false,
				description: 'Whether to run the third-party write asynchronously (fire-and-forget)',
				displayOptions: { show: { modelOperation: ['create', 'update'] } },
			},
			{
				displayName: 'Query Parameters',
				name: 'queryParams',
				type: 'resourceMapper',
				noDataExpression: true,
				default: { mappingMode: 'defineBelow', value: null },
				typeOptions: {
					loadOptionsDependsOn: ['commonModels', 'modelOperation'],
					resourceMapper: {
						resourceMapperMethod: 'getQueryParamFields',
						mode: 'map',
						addAllFields: true,
						valuesLabel: 'Query Parameters',
						fieldWords: { singular: 'parameter', plural: 'parameters' },
					},
				},
				displayOptions: {
					show: {
						modelOperation: [
							'list',
							'get',
							'getDownloadUrl',
							'download',
							'remoteFieldClassesList',
							'linesRemoteFieldClassesList',
						],
					},
				},
			},
			{
				displayName: 'Fields',
				name: 'createFields',
				type: 'resourceMapper',
				noDataExpression: true,
				default: { mappingMode: 'defineBelow', value: null },
				required: true,
				typeOptions: {
					loadOptionsDependsOn: ['commonModels', 'modelOperation'],
					resourceMapper: {
						resourceMapperMethod: 'getBodyFields',
						mode: 'add',
						addAllFields: true,
						fieldWords: { singular: 'field', plural: 'fields' },
					},
				},
				displayOptions: { show: { modelOperation: ['create'] } },
			},
			{
				displayName: 'Fields',
				name: 'updateFields',
				type: 'resourceMapper',
				noDataExpression: true,
				default: { mappingMode: 'defineBelow', value: null },
				required: true,
				typeOptions: {
					loadOptionsDependsOn: ['commonModels', 'modelOperation'],
					resourceMapper: {
						resourceMapperMethod: 'getBodyFields',
						mode: 'update',
						addAllFields: true,
						fieldWords: { singular: 'field', plural: 'fields' },
					},
				},
				displayOptions: { show: { modelOperation: ['update'] } },
			},
		],
	};

	methods = { computeMethod, loadOptions, resourceMapping };

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const { apiKey, accountToken } = await this.getCredentials<{
			apiKey: string;
			accountToken: string;
		}>('mergeDevApi');
		const merge = new MergeClient({ apiKey, accountToken });

		const category = this.getNodeParameter('category', 0) as string;
		const categoryClient = getCategoryClient(merge, category);

		const actionsResult = await categoryClient.availableActions.retrieve();
		const availableModelOperations = actionsResult.availableModelOperations as
			| ModelOperation[]
			| undefined;

		const modelName = this.getNodeParameter('commonModels', 0) as string;
		const operation = this.getNodeParameter('modelOperation', 0) as string;

		const fieldParamName =
			operation === 'create'
				? 'createFields.value'
				: operation === 'update'
					? 'updateFields.value'
					: 'queryParams.value';

		for (let i = 0; i < items.length; i++) {
			const fieldValues = omitEmpty(
				(this.getNodeParameter(fieldParamName, i, {}) as IDataObject) ?? {},
			);

			const modelOp = availableModelOperations?.find((op) => op.modelName === modelName);

			const resourceKey = findResourceKey(categoryClient, modelName);
			const resource = (categoryClient as unknown as Record<string, unknown>)[
				resourceKey
			] as Record<string, ((...args: unknown[]) => Promise<unknown>) | undefined>;

			if (operation === 'download') {
				const { id, mimeType } = fieldValues;
				if (!id) throw new NodeOperationError(this.getNode(), 'ID is required for Download File');

				const retrieveFn = resource.retrieve;
				const fileMeta = retrieveFn
					? ((await retrieveFn.call(resource, id)) as { name?: string; mimeType?: string })
					: {};
				const resolvedMimeType =
					(mimeType as string) ?? fileMeta.mimeType ?? 'application/octet-stream';
				const fileName = fileMeta.name ?? (id as string);

				const downloadMetaFn = resource.downloadRequestMetaRetrieve;
				if (!downloadMetaFn)
					throw new NodeOperationError(
						this.getNode(),
						`${modelName} does not support file download`,
					);
				const downloadMeta = (await downloadMetaFn.call(
					resource,
					id,
					mimeType ? { mimeType } : {},
				)) as { url: string; method: string; headers: Record<string, string> };

				const fileContent = await this.helpers.httpRequest({
					url: downloadMeta.url,
					method: 'GET',
					headers: downloadMeta.headers,
					encoding: 'arraybuffer',
				});

				const binaryData = await this.helpers.prepareBinaryData(
					Buffer.from(fileContent as ArrayBuffer),
					fileName,
					resolvedMimeType,
				);
				returnData.push({
					json: { id, name: fileName, mimeType: resolvedMimeType },
					binary: { data: binaryData },
					pairedItem: { item: i },
				});
				continue;
			}

			let responseData: IDataObject | IDataObject[];

			if (operation === 'list') {
				const listFn = resource.list;
				if (!listFn)
					throw new NodeOperationError(this.getNode(), `${modelName} does not support list`);

				const result = (await listFn.call(resource, fieldValues)) as {
					results?: IDataObject[];
				};
				responseData = result.results ?? [];
			} else if (operation === 'get') {
				const { id, ...queryParams } = fieldValues;
				if (!id)
					throw new NodeOperationError(this.getNode(), 'ID is required for the Get operation');
				const retrieveFn = resource.retrieve;
				if (!retrieveFn)
					throw new NodeOperationError(this.getNode(), `${modelName} does not support retrieve`);
				responseData = (await retrieveFn.call(resource, id, queryParams)) as IDataObject;
			} else if (operation === 'create') {
				const supportedSet = new Set(
					modelOp?.supportedFields.map((f) =>
						f.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase()),
					) ?? [],
				);
				const bodyFields: IDataObject = {};
				const extraQueryParams: IDataObject = {};
				for (const [key, value] of Object.entries(fieldValues)) {
					if (supportedSet.has(key)) {
						bodyFields[key] = value;
					} else {
						extraQueryParams[key] = value;
					}
				}
				const isDebugMode = this.getNodeParameter('isDebugMode', i, false) as boolean;
				const runAsync = this.getNodeParameter('runAsync', i, false) as boolean;
				const createFn = resource.create;
				if (!createFn)
					throw new NodeOperationError(this.getNode(), `${modelName} does not support create`);
				const result = (await createFn.call(resource, {
					model: bodyFields,
					isDebugMode,
					runAsync,
					...extraQueryParams,
				})) as { model?: IDataObject };
				responseData = result.model ?? (result as IDataObject);
			} else if (operation === 'update') {
				const { id, ...updateFields } = fieldValues;
				if (!id)
					throw new NodeOperationError(this.getNode(), 'ID is required for the Update operation');
				const partialUpdateFn = resource.partialUpdate;
				if (!partialUpdateFn)
					throw new NodeOperationError(this.getNode(), `${modelName} does not support update`);
				const isDebugMode = this.getNodeParameter('isDebugMode', i, false) as boolean;
				const runAsync = this.getNodeParameter('runAsync', i, false) as boolean;
				const result = (await partialUpdateFn.call(resource, id, {
					model: updateFields,
					isDebugMode,
					runAsync,
				})) as { model?: IDataObject };
				responseData = result.model ?? (result as IDataObject);
			} else if (operation === 'getDownloadUrl') {
				const { id } = fieldValues;
				if (!id)
					throw new NodeOperationError(this.getNode(), 'ID is required for Get Download URL');
				const downloadMetaFn = resource.downloadRequestMetaRetrieve;
				if (!downloadMetaFn)
					throw new NodeOperationError(
						this.getNode(),
						`${modelName} does not support get download URL`,
					);
				responseData = (await downloadMetaFn.call(resource, id)) as IDataObject;
			} else if (operation === 'remoteFieldClassesList') {
				const listFn = resource.remoteFieldClassesList;
				if (!listFn)
					throw new NodeOperationError(
						this.getNode(),
						`${modelName} does not support remote field classes`,
					);
				const result = (await listFn.call(resource, fieldValues)) as {
					results?: IDataObject[];
				};
				responseData = result.results ?? [];
			} else if (operation === 'linesRemoteFieldClassesList') {
				const listFn = resource.linesRemoteFieldClassesList;
				if (!listFn)
					throw new NodeOperationError(
						this.getNode(),
						`${modelName} does not support line remote field classes`,
					);
				const result = (await listFn.call(resource, fieldValues)) as {
					results?: IDataObject[];
				};
				responseData = result.results ?? [];
			} else if (operation === 'metaPostRetrieve') {
				const metaFn = resource.metaPostRetrieve;
				if (!metaFn)
					throw new NodeOperationError(
						this.getNode(),
						`${modelName} does not support get create metadata`,
					);
				responseData = (await metaFn.call(resource)) as IDataObject;
			} else {
				throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
			}

			const results = Array.isArray(responseData) ? responseData : [responseData];
			returnData.push.apply(returnData, this.helpers.returnJsonArray(results));
		}

		return [returnData];
	}
}

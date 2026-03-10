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

import { loadOptions, resourceMapping } from './methods';
import {
	findResourceKey,
	getCategoryClient,
	getLinkedAccountCategory,
	type ModelOperation,
} from './utils';

/** Remove null/undefined/empty-string values so they don't override SDK defaults. */
function omitEmpty(obj: IDataObject): IDataObject {
	return Object.fromEntries(
		Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== ''),
	);
}

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
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Model',
				name: 'commonModels',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getCommonModels',
				},
				default: '',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Operation',
				name: 'modelOperation',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
				displayOptions: { show: { modelOperation: ['list', 'get', 'getDownloadUrl', 'download'] } },
			},
			{
				displayName: 'Body Fields',
				name: 'bodyFields',
				type: 'resourceMapper',
				noDataExpression: true,
				default: { mappingMode: 'defineBelow', value: null },
				required: true,
				typeOptions: {
					loadOptionsDependsOn: ['commonModels', 'modelOperation'],
					resourceMapper: {
						resourceMapperMethod: 'getBodyFields',
						mode: 'map',
						addAllFields: true,
						valuesLabel: 'Body Fields',
						fieldWords: { singular: 'field', plural: 'fields' },
					},
				},
				displayOptions: { show: { modelOperation: ['create', 'update'] } },
			},
		],
	};

	methods = { loadOptions, resourceMapping };

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const { apiKey, accountToken } = await this.getCredentials<{
			apiKey: string;
			accountToken: string;
		}>('mergeDevApi');
		const merge = new MergeClient({ apiKey, accountToken });

		// Resolve category once per execution from the linked account
		const category = await getLinkedAccountCategory(merge);
		const categoryClient = getCategoryClient(merge, category);

		// Fetch available actions once (same for all items)
		const actionsResult = await categoryClient.availableActions.retrieve();
		const availableModelOperations = actionsResult.availableModelOperations as
			| ModelOperation[]
			| undefined;

		for (let i = 0; i < items.length; i++) {
			const modelName = this.getNodeParameter('commonModels', i) as string;
			const operation = this.getNodeParameter('modelOperation', i) as string;

			// Read field values from the appropriate section based on operation
			const isWriteOp = operation === 'create' || operation === 'update';
			const fieldValues = omitEmpty(
				(this.getNodeParameter(
					isWriteOp ? 'bodyFields.value' : 'queryParams.value',
					i,
					{},
				) as IDataObject) ?? {},
			);

			const modelOp = availableModelOperations?.find((op) => op.modelName === modelName);

			const resourceKey = findResourceKey(categoryClient, modelName);
			const resource = (categoryClient as unknown as Record<string, unknown>)[
				resourceKey
			] as Record<string, ((...args: unknown[]) => Promise<unknown>) | undefined>;

			// Download File is handled separately since it produces binary output
			if (operation === 'download') {
				const { id, mimeType } = fieldValues;
				if (!id) throw new NodeOperationError(this.getNode(), 'ID is required for Download File');

				// Fetch metadata for filename and MIME type
				const retrieveFn = resource.retrieve;
				const fileMeta = retrieveFn
					? ((await retrieveFn.call(resource, id)) as { name?: string; mimeType?: string })
					: {};
				const resolvedMimeType =
					(mimeType as string) ?? fileMeta.mimeType ?? 'application/octet-stream';
				const fileName = fileMeta.name ?? (id as string);

				// Get authenticated download URL via Merge's download-request-meta endpoint
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

				// Download binary content using n8n's http helper (handles arraybuffer properly)
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
				// All fields are query parameters
				const result = (await listFn.call(resource, fieldValues)) as {
					results?: IDataObject[];
				};
				responseData = result.results ?? [];
			} else if (operation === 'get') {
				// id is the path parameter; rest are query parameters
				const { id, ...queryParams } = fieldValues;
				if (!id)
					throw new NodeOperationError(this.getNode(), 'ID is required for the Get operation');
				const retrieveFn = resource.retrieve;
				if (!retrieveFn)
					throw new NodeOperationError(this.getNode(), `${modelName} does not support retrieve`);
				responseData = (await retrieveFn.call(resource, id, queryParams)) as IDataObject;
			} else if (operation === 'create') {
				// Split: supported model fields → request body (`model`), others → query params
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
			} else {
				throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
			}

			const results = Array.isArray(responseData) ? responseData : [responseData];
			returnData.push.apply(returnData, this.helpers.returnJsonArray(results));
		}

		return [returnData];
	}
}

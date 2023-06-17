import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';

import {
	fullDocumentToJson,
	googleApiRequest,
	googleApiRequestAllItems,
	jsonToDocument,
} from './GenericFunctions';

import { collectionFields, collectionOperations } from './CollectionDescription';

import { documentFields, documentOperations } from './DocumentDescription';

export class GoogleFirebaseCloudFirestore implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Cloud Firestore',
		name: 'googleFirebaseCloudFirestore',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:googleFirebaseCloudFirestore.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Interact with Google Firebase - Cloud Firestore API',
		defaults: {
			name: 'Google Cloud Firestore',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'googleFirebaseCloudFirestoreOAuth2Api',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Document',
						value: 'document',
					},
					{
						name: 'Collection',
						value: 'collection',
					},
				],
				default: 'document',
			},
			...documentOperations,
			...documentFields,
			...collectionOperations,
			...collectionFields,
		],
	};

	methods = {
		loadOptions: {
			async getProjects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const collections = await googleApiRequestAllItems.call(
					this,
					'results',
					'GET',
					'',
					{},
					{},
					'https://firebase.googleapis.com/v1beta1/projects',
				);
				// @ts-ignore
				const returnData = collections.map((o) => ({
					name: o.projectId,
					value: o.projectId,
				})) as INodePropertyOptions[];
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		if (resource === 'document') {
			if (operation === 'get') {
				const projectId = this.getNodeParameter('projectId', 0) as string;
				const database = this.getNodeParameter('database', 0) as string;
				const simple = this.getNodeParameter('simple', 0) as boolean;
				const documentList = items.map((item: IDataObject, i: number) => {
					const collection = this.getNodeParameter('collection', i) as string;
					const documentId = this.getNodeParameter('documentId', i) as string;
					return `projects/${projectId}/databases/${database}/documents/${collection}/${documentId}`;
				});

				responseData = await googleApiRequest.call(
					this,
					'POST',
					`/${projectId}/databases/${database}/documents:batchGet`,
					{ documents: documentList },
				);

				responseData = responseData.map((element: { found: { id: string; name: string } }) => {
					if (element.found) {
						element.found.id = element.found.name.split('/').pop() as string;
					}
					return element;
				});

				if (simple) {
					responseData = responseData
						.map((element: IDataObject) => {
							return fullDocumentToJson(element.found as IDataObject);
						})
						.filter((el: IDataObject) => !!el);
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject[]),
					{ itemData: { item: 0 } },
				);

				returnData.push(...executionData);
			} else if (operation === 'create') {
				const projectId = this.getNodeParameter('projectId', 0) as string;
				const database = this.getNodeParameter('database', 0) as string;
				const simple = this.getNodeParameter('simple', 0) as boolean;

				await Promise.all(
					items.map(async (item: IDataObject, i: number) => {
						const collection = this.getNodeParameter('collection', i) as string;
						const columns = this.getNodeParameter('columns', i) as string;
						const columnList = columns.split(',').map((column) => column.trim());
						const document = { fields: {} };
						columnList.map((column) => {
							// @ts-ignore
							if (item.json[column]) {
								// @ts-ignore
								document.fields[column] = jsonToDocument(item.json[column] as IDataObject);
							} else {
								// @ts-ignore
								document.fields[column] = jsonToDocument(null);
							}
						});
						responseData = await googleApiRequest.call(
							this,
							'POST',
							`/${projectId}/databases/${database}/documents/${collection}`,
							document,
						);

						responseData.id = (responseData.name as string).split('/').pop();

						if (simple) {
							responseData = fullDocumentToJson(responseData as IDataObject);
						}

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData as IDataObject[]),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);
					}),
				);
			} else if (operation === 'getAll') {
				const projectId = this.getNodeParameter('projectId', 0) as string;
				const database = this.getNodeParameter('database', 0) as string;
				const collection = this.getNodeParameter('collection', 0) as string;
				const returnAll = this.getNodeParameter('returnAll', 0);
				const simple = this.getNodeParameter('simple', 0) as boolean;

				if (returnAll) {
					responseData = await googleApiRequestAllItems.call(
						this,
						'documents',
						'GET',
						`/${projectId}/databases/${database}/documents/${collection}`,
					);
				} else {
					const limit = this.getNodeParameter('limit', 0);
					const getAllResponse = (await googleApiRequest.call(
						this,
						'GET',
						`/${projectId}/databases/${database}/documents/${collection}`,
						{},
						{ pageSize: limit },
					)) as IDataObject;
					responseData = getAllResponse.documents;
				}

				responseData = responseData.map((element: IDataObject) => {
					element.id = (element.name as string).split('/').pop();
					return element;
				});

				if (simple) {
					responseData = responseData.map((element: IDataObject) => fullDocumentToJson(element));
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject[]),
					{ itemData: { item: 0 } },
				);

				returnData.push(...executionData);
			} else if (operation === 'delete') {
				await Promise.all(
					items.map(async (item: IDataObject, i: number) => {
						const projectId = this.getNodeParameter('projectId', i) as string;
						const database = this.getNodeParameter('database', i) as string;
						const collection = this.getNodeParameter('collection', i) as string;
						const documentId = this.getNodeParameter('documentId', i) as string;

						await googleApiRequest.call(
							this,
							'DELETE',
							`/${projectId}/databases/${database}/documents/${collection}/${documentId}`,
						);

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray({ success: true }),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);
					}),
				);
			} else if (operation === 'upsert') {
				const projectId = this.getNodeParameter('projectId', 0) as string;
				const database = this.getNodeParameter('database', 0) as string;

				const updates = items.map((item: IDataObject, i: number) => {
					const collection = this.getNodeParameter('collection', i) as string;
					const updateKey = this.getNodeParameter('updateKey', i) as string;
					// @ts-ignore
					const documentId = item.json[updateKey] as string;
					const columns = this.getNodeParameter('columns', i) as string;
					const columnList = columns.split(',').map((column) => column.trim());
					const document = {};
					columnList.map((column) => {
						// @ts-ignore
						if (item.json.hasOwnProperty(column)) {
							// @ts-ignore
							document[column] = jsonToDocument(item.json[column] as IDataObject);
						} else {
							// @ts-ignore
							document[column] = jsonToDocument(null);
						}
					});

					return {
						update: {
							name: `projects/${projectId}/databases/${database}/documents/${collection}/${documentId}`,
							fields: document,
						},
						updateMask: {
							fieldPaths: columnList,
						},
					};
				});

				responseData = [];

				const { writeResults, status } = await googleApiRequest.call(
					this,
					'POST',
					`/${projectId}/databases/${database}/documents:batchWrite`,
					{ writes: updates },
				);

				for (let i = 0; i < writeResults.length; i++) {
					writeResults[i].status = status[i];
					Object.assign(writeResults[i], items[i].json);

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(writeResults[i] as IDataObject[]),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				}

				// } else if (operation === 'update') {
				// 	const projectId = this.getNodeParameter('projectId', 0) as string;
				// 	const database = this.getNodeParameter('database', 0) as string;
				// 	const simple = this.getNodeParameter('simple', 0) as boolean;

				// 	await Promise.all(items.map(async (item: IDataObject, i: number) => {
				// 		const collection = this.getNodeParameter('collection', i) as string;
				// 		const updateKey = this.getNodeParameter('updateKey', i) as string;
				// 		// @ts-ignore
				// 		const documentId = item['json'][updateKey] as string;
				// 		const columns = this.getNodeParameter('columns', i) as string;
				// 		const columnList = columns.split(',').map(column => column.trim()) as string[];
				// 		const document = {};
				// 		columnList.map(column => {
				// 			// @ts-ignore
				// 			document[column] = item['json'].hasOwnProperty(column) ? jsonToDocument(item['json'][column]) : jsonToDocument(null);
				// 		});
				// 		responseData = await googleApiRequest.call(
				// 			this,
				// 			'PATCH',
				// 			`/${projectId}/databases/${database}/documents/${collection}/${documentId}`,
				// 			{ fields: document },
				// 			{ [`updateMask.fieldPaths`]: columnList },
				// 		);
				// 		if (simple === false) {
				// 			returnData.push(responseData);
				// 		} else {
				// 			returnData.push(fullDocumentToJson(responseData as IDataObject));
				// 		}
				// 	}));
			} else if (operation === 'query') {
				const projectId = this.getNodeParameter('projectId', 0) as string;
				const database = this.getNodeParameter('database', 0) as string;
				const simple = this.getNodeParameter('simple', 0) as boolean;

				await Promise.all(
					items.map(async (item: IDataObject, i: number) => {
						const query = this.getNodeParameter('query', i) as string;
						responseData = await googleApiRequest.call(
							this,
							'POST',
							`/${projectId}/databases/${database}/documents:runQuery`,
							jsonParse(query),
						);

						responseData = responseData.map(
							(element: { document: { id: string; name: string } }) => {
								if (element.document) {
									element.document.id = element.document.name.split('/').pop() as string;
								}
								return element;
							},
						);

						if (simple) {
							responseData = responseData
								.map((element: IDataObject) => {
									return fullDocumentToJson(element.document as IDataObject);
								})
								.filter((element: IDataObject) => !!element);
						}

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData as IDataObject[]),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);
					}),
				);
			}
		} else if (resource === 'collection') {
			if (operation === 'getAll') {
				const projectId = this.getNodeParameter('projectId', 0) as string;
				const database = this.getNodeParameter('database', 0) as string;
				const returnAll = this.getNodeParameter('returnAll', 0);

				if (returnAll) {
					const getAllResponse = await googleApiRequestAllItems.call(
						this,
						'collectionIds',
						'POST',
						`/${projectId}/databases/${database}/documents:listCollectionIds`,
					);
					// @ts-ignore
					responseData = getAllResponse.map((o) => ({ name: o }));
				} else {
					const limit = this.getNodeParameter('limit', 0);
					const getAllResponse = (await googleApiRequest.call(
						this,
						'POST',
						`/${projectId}/databases/${database}/documents:listCollectionIds`,
						{},
						{ pageSize: limit },
					)) as IDataObject;
					// @ts-ignore
					responseData = getAllResponse.collectionIds.map((o) => ({ name: o }));
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject[]),
					{ itemData: { item: 0 } },
				);

				returnData.push(...executionData);
			}
		}

		return this.prepareOutputData(returnData);
	}
}

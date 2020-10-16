import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	googleApiRequest,
	googleApiRequestAllItems,
} from './GenericFunctions';

import {
	collectionFields,
	collectionOperations,
} from './CollectionDescription'

import {
    documentFields,
    documentOperations,
} from './DocumentDescription'

export class CloudFirestore implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Firebase Cloud Firestore',
		name: 'googleFirebaseCloudFirestore',
		icon: 'file:googleFirebaseCloudFirestore.png',
		group: ['input'],
		version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Google Firebase - Cloud Firestore API',
		defaults: {
			name: 'Google Cloud Firestore',
			color: '#ffcb2d',
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
				description: 'The resource to operate on.'
            },
            ...documentOperations,
			...documentFields,
			...collectionOperations,
			...collectionFields,
		],
	};

	methods = {
		loadOptions: {
			async getCollections(
				this: ILoadOptionsFunctions
			): Promise<INodePropertyOptions[]> {
				const projectId = this.getNodeParameter('projectId', 0) as string;
				const database = this.getNodeParameter('database', 0) as string;
				const collections = await googleApiRequestAllItems.call(
					this,
					'collectionIds',
					'POST',
					`/${projectId}/databases/${database}/documents:listCollectionIds`,
				);
				// @ts-ignore
				const returnData = collections.map(o => ({name: o, value: o})) as INodePropertyOptions[];
				return returnData;
			},
			async getProjects(
				this: ILoadOptionsFunctions
			): Promise<INodePropertyOptions[]> {
				const collections = await googleApiRequestAllItems.call(
					this,
					'results',
					'GET',
					'https://firebase.googleapis.com/v1beta1/projects',
					{},
					{},
					'https://firebase.googleapis.com/v1beta1/projects',
				);
				// @ts-ignore
				const returnData = collections.map(o => ({name: o.projectId, value: o.projectId})) as INodePropertyOptions[];
				return returnData;
			},
		}
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		let responseData;
        
		for (let i = 0; i < items.length; i++) {
			const resource = this.getNodeParameter('resource', i) as string;
			const operation = this.getNodeParameter('operation', i) as string;
			if (resource === 'document') {
				if (operation === 'get') {
					const projectId = this.getNodeParameter('projectId', i) as string;
					const database = this.getNodeParameter('database', i) as string;
					const collection = this.getNodeParameter('collection', i) as string;
					const documentId = this.getNodeParameter('documentId', i) as string;
					responseData = await googleApiRequest.call(
						this,
						'GET',
						`/${projectId}/databases/${database}/documents/${collection}/${documentId}`,
					);
				} else if (operation === 'create') {
					const projectId = this.getNodeParameter('projectId', i) as string;
					const database = this.getNodeParameter('database', i) as string;
					const collection = this.getNodeParameter('collection', i) as string;
					const documentData = this.getNodeParameter('documentData', i) as string;
					responseData = await googleApiRequest.call(
						this,
						'POST',
						`/${projectId}/databases/${database}/documents/${collection}`,
						JSON.parse(documentData),
					);
				} else if (operation === 'getAll') {
					const projectId = this.getNodeParameter('projectId', i) as string;
					const database = this.getNodeParameter('database', i) as string;
					const collection = this.getNodeParameter('collection', i) as string;
					const returnAll = this.getNodeParameter('returnAll', i) as string;
	
					if (returnAll) {
						responseData = await googleApiRequestAllItems.call(
							this,
							'documents',
							'GET',
							`/${projectId}/databases/${database}/documents/${collection}`,
						);
					} else {
						const limit = this.getNodeParameter('limit', i) as string;
						const getAllResponse = await googleApiRequest.call(
							this,
							'GET',
							`/${projectId}/databases/${database}/documents/${collection}`,
							{},
							{pageSize: limit}
						) as IDataObject;
						responseData = getAllResponse.documents;
					}
				} else if (operation === 'delete') {
					const projectId = this.getNodeParameter('projectId', i) as string;
					const database = this.getNodeParameter('database', i) as string;
					const collection = this.getNodeParameter('collection', i) as string;
					const documentId = this.getNodeParameter('documentId', i) as string;

					if (!responseData) {
						responseData = [];
					}

					responseData.push(await googleApiRequest.call(
						this,
						'DELETE',
						`/${projectId}/databases/${database}/documents/${collection}/${documentId}`,
					));
				} else if (operation === 'update') {
					
					const projectId = this.getNodeParameter('projectId', i) as string;
					const database = this.getNodeParameter('database', i) as string;
					const collection = this.getNodeParameter('collection', i) as string;
					const documentData = this.getNodeParameter('documentData', i) as string;
					const documentId = this.getNodeParameter('documentId', i) as string;
					responseData = await googleApiRequest.call(
						this,
						'PATCH',
						`/${projectId}/databases/${database}/documents/${collection}/${documentId}`,
						JSON.parse(documentData),
					);
				}
			} else if (resource === 'collection') {
				if (operation === 'getAll') {
					const projectId = this.getNodeParameter('projectId', i) as string;
					const database = this.getNodeParameter('database', i) as string;
					const returnAll = this.getNodeParameter('returnAll', i) as string;
	
					if (returnAll) {
						const getAllResponse = await googleApiRequestAllItems.call(
							this,
							'collectionIds',
							'POST',
							`/${projectId}/databases/${database}/documents:listCollectionIds`,
						);
						// @ts-ignore
						responseData = getAllResponse.map(o => ({name: o}));
					} else {
						const limit = this.getNodeParameter('limit', i) as string;
						const getAllResponse = await googleApiRequest.call(
							this,
							'POST',
							`/${projectId}/databases/${database}/documents:listCollectionIds`,
							{},
							{pageSize: limit}
						) as IDataObject;
						// @ts-ignore
						responseData = getAllResponse.collectionIds.map(o => ({name: o}));
					}
				}
			}
		}

		return [this.helpers.returnJsonArray(responseData)];
	}
}

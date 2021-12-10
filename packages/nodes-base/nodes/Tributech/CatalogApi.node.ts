import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription, NodeOperationError,
} from 'n8n-workflow';

import {
	catalogApiRequest,
} from './GenericFunctions';

import {
	dtdlModelsFields,
	dtdlModelsOperations,
	manageModelsFields,
	manageModelsOperations,
	validationFields,
	validationOperations,
} from './descriptions';

export class CatalogApi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Tributech Catalog-Api',
		name: 'catalogApi',
		icon: 'file:tributech.svg',
		group: ['transform'],
		version: 1,
		description: 'Consume the Tributech Catalog-API',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: {
			name: 'Catalog-Api',
			description: 'Consume the Tributech Catalog-API',
			color: '#ff6600',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'tributechOAuth2Api',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				description: 'The resource type',
				options: [
					{
						name: 'Manage-Models',
						value: 'manageModels',
					},
					{
						name: 'DTDL-Models',
						value: 'dtdlModels',
					},
					{
						name: 'Validation',
						value: 'validation',
					},
				],
				default: 'manageModels',
			},
			...manageModelsOperations,
			...manageModelsFields,
			...dtdlModelsOperations,
			...dtdlModelsFields,
			...validationOperations,
			...validationFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		async function handleModelEntities(this: IExecuteFunctions, operation: string, i: number) {
			if (operation === 'getEntity') {
				const dtmi = this.getNodeParameter('dtmi', i);
				const endpoint = `/manage/entity/${dtmi}`;
				return catalogApiRequest.call(this, 'GET', endpoint);
			} else if (operation === 'getAllEntities') {

				const qs: IDataObject = {
					size: this.getNodeParameter('size', i),
					page: this.getNodeParameter('page', i),
				};

				return catalogApiRequest.call(this, 'GET', '/manage/entities', {}, qs).then(result => result?.data);
			} else if (operation === 'addNewModels') {
				const modelArray = (this.getNodeParameter('models', i) as IDataObject)?.model as IDataObject[];
				const body: IDataObject[] = modelArray.map(model => model.models) as IDataObject[];
				return catalogApiRequest.call(this, 'POST', '/manage/models', body);
			} else if (operation === 'revokeModel') {
				const dtmi = this.getNodeParameter('dtmi', i);

				const endpoint = `/manage/model/${dtmi}/revoke`;
				return catalogApiRequest.call(this, 'PUT', endpoint);
			}
		}

		async function handleDTDLModels(this: IExecuteFunctions, operation: string, i: number) {
			if (operation === 'getExpandedModels') {
				const qs: IDataObject = {
					size: this.getNodeParameter('size', i),
					page: this.getNodeParameter('page', i),
				};
				return catalogApiRequest.call(this, 'GET', '/graph/expanded', {}, qs);
			} else if (operation === 'getRoots') {
				return catalogApiRequest.call(this, 'GET', '/graph/roots');
			} else if (operation === 'getBases') {
				const dtmi = this.getNodeParameter('dtmi', i);
				return catalogApiRequest.call(this, 'GET', `/graph/${dtmi}/bases`)
					.then((res: string[]) => res?.map(model => ({baseDTMI: model})));
			} else if (operation === 'getExpanded') {
				const dtmi = this.getNodeParameter('dtmi', i);
				return catalogApiRequest.call(this, 'GET', `/graph/${dtmi}/expand`);
			} else if (operation === 'getRelationships') {
				const sourceDtmi = this.getNodeParameter('sourceDtmi', i);
				const targetDtmi = this.getNodeParameter('targetDtmi', i);
				const endpoint = `/graph/relationships/${sourceDtmi}/${targetDtmi}`;
				return catalogApiRequest.call(this, 'GET', endpoint);
			} else if (operation === 'getOutgoingRelationships') {
				const sourceDtmi = this.getNodeParameter('sourceDtmi', i);
				const endpoint = `/graph/relationships/${sourceDtmi}`;
				return catalogApiRequest.call(this, 'GET', endpoint);
			} else if (operation === 'getDtdlModel') {
				const dtmi = this.getNodeParameter('dtmi', i);
				return catalogApiRequest.call(this, 'GET', `/graph/${dtmi}`);
			}
		}

		async function handleValidation(this: IExecuteFunctions, operation: string, i: number) {
			if (operation === 'getSchema') {
				const dtmi = this.getNodeParameter('dtmi', i);
				const endpoint = `/validate/schema/${dtmi}`;
				return catalogApiRequest.call(this, 'GET', endpoint);
			} else if (operation === 'validateGraph') {
				const body = this.getNodeParameter('body', i) as IDataObject;
				return catalogApiRequest.call(this, 'POST', '/validate', body);
			} else if (operation === 'validateInstance') {
				const body = this.getNodeParameter('body', i) as IDataObject;
				return catalogApiRequest.call(this, 'POST', '/validate/graph', body);
			}
		}

		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;

		for (let i = 0; i < items.length; i++) {
			try {


				switch (resource) {
					case 'manageModels':
						responseData = await handleModelEntities.call(this, operation, i);
						break;
					case 'dtdlModels':
						responseData = await handleDTDLModels.call(this, operation, i);
						break;
					case 'validation':
						responseData = await handleValidation.call(this, operation, i);
						break;
					default:
						throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`);
				}

				Array.isArray(responseData)
					? returnData.push(...responseData)
					: returnData.push(responseData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({error: error.message});
					continue;
				}

				throw error;
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}

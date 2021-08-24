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
	twinApiRequest,
} from './GenericFunctions';

import {
	graphFields,
	graphOperations,
	queryFields,
	queryOperations,
	relationshipsFields,
	relationshipsOperations,
	twinsFields,
	twinsOperations,
} from './descriptions';

export class TwinApi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Tributech Twin-Api',
		name: 'twinApi',
		icon: 'file:tributech.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Tributech Twin-API',
		defaults: {
			name: 'Twin-Api',
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
				description: 'The resource type',
				type: 'options',
				options: [
					{
						name: 'Graph',
						value: 'graph',
					},
					{
						name: 'Query',
						value: 'query',
					},
					{
						name: 'Relationships',
						value: 'relationships',
					},
					{
						name: 'Twins',
						value: 'twins',
					},
				],
				default: 'twins',
			},
			...graphOperations,
			...graphFields,
			...queryOperations,
			...queryFields,
			...relationshipsOperations,
			...relationshipsFields,
			...twinsOperations,
			...twinsFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		function handleTwins(this: IExecuteFunctions, operation: string, i: number) {
			if (operation === 'getAllTwins') {
				const qs = {} as IDataObject;
				const filters = this.getNodeParameter('additionalFields', i) as IDataObject;

				if (Object.keys(filters).length) {
					Object.assign(qs, filters);
				}
				return twinApiRequest.call(this, 'GET', '/twins', {}, qs);
			} else if (operation === 'getTwinsByModelId') {
				const dtmi = this.getNodeParameter('dtmi', i);

				const qs = {} as IDataObject;
				const filters = this.getNodeParameter('additionalFields', i) as IDataObject;

				if (Object.keys(filters).length) {
					Object.assign(qs, filters);
				}

				return twinApiRequest.call(this, 'GET', `/model/${dtmi}`, {}, qs);
			} else if (operation === 'getTwinById') {
				const dtid = this.getNodeParameter('dtid', i);
				return twinApiRequest.call(this, 'GET', `/twins/${dtid}`, {});
			} else if (operation === 'updateTwinById') {
				const dtid = this.getNodeParameter('dtid', i);
				const body = this.getNodeParameter('twin', i) as IDataObject;
				return twinApiRequest.call(this, 'PUT', `/twins/${dtid}`, body);
			} else if (operation === 'deleteTwinById') {
				const dtid = this.getNodeParameter('dtid', i);
				return twinApiRequest.call(this, 'DELETE', `/twins/${dtid}`, {});
			} else if (operation === 'postTwin') {
				const body = this.getNodeParameter('twin', i) as IDataObject;
				return twinApiRequest.call(this, 'POST', `/twins`, body);
			}
		}

		function handleRelationships(this: IExecuteFunctions, operation: string, i: number) {
			if (operation === 'getOutgoingRelationships') {
				const dtId = this.getNodeParameter('dtId', i);
				return twinApiRequest.call(this, 'GET', `/outgoing/${dtId}`);
			} else if (operation === 'getIncomingRelationships') {
				const dtId = this.getNodeParameter('dtId', i);
				return twinApiRequest.call(this, 'GET', `/incoming/${dtId}`);

			} else if (operation === 'getAllRelationships') {
				const qs = {} as IDataObject;
				const filters = this.getNodeParameter('additionalFields', i) as IDataObject;

				if (Object.keys(filters).length) {
					Object.assign(qs, filters);
				}

				return twinApiRequest.call(this, 'GET', '/relationships', {}, qs);
			} else if (operation === 'postRelationship') {
				const body = this.getNodeParameter('relationship', i) as IDataObject;
				return twinApiRequest.call(this, 'POST', '/relationships', body);
			} else if (operation === 'getRelationshipById') {
				const relationshipId = this.getNodeParameter('relationshipId', i);

				const endpoint = `/relationships/${relationshipId}`;
				return twinApiRequest.call(this, 'GET', endpoint);

			} else if (operation === 'updateRelationship') {
				const relationshipId = this.getNodeParameter('relationshipId', i);
				const body = this.getNodeParameter('relationship', i) as IDataObject;

				const endpoint = `/relationships/${relationshipId}`;
				return twinApiRequest.call(this, 'PUT', endpoint, body);

			} else if (operation === 'deleteRelationshipById') {
				const relationshipId = this.getNodeParameter('relationshipId', i);

				const endpoint = `/relationships/${relationshipId}`;
				return twinApiRequest.call(this, 'DELETE', endpoint);

			}
		}

		function handleQuery(this: IExecuteFunctions, operation: string, i: number) {
			if (operation === 'getTwinGraphByCypherQuery') {
				const qs: IDataObject = {
					Match: this.getNodeParameter('match', i),
					With: this.getNodeParameter('with', i),
					Where: this.getNodeParameter('where', i, ''),
				};

				if (!qs.Where) {
					delete qs.Where;
				}

				return twinApiRequest.call(this, 'POST', '/query/cypher', {}, qs);

			} else if (operation === 'getTwinGraphByQuery') {
				const body: IDataObject = {
					startNodeDtId: this.getNodeParameter('startNodeDtId', i),
					relationshipFilter: this.getNodeParameter('relationshipFilter', i),
					labelFilter: this.getNodeParameter('labelFilter', i),
					maxDepth: this.getNodeParameter('maxDepth', i),
				};
				return twinApiRequest.call(this, 'POST', '/query/subgraph', body);
			}
		}

		function handleGraph(this: IExecuteFunctions, operation: string, i: number) {
			if (operation === 'upsertTwinGraph') {
				const body = this.getNodeParameter('twinGraph', i) as IDataObject;
				return twinApiRequest.call(this, 'PUT', '/graph', body);
			}
		}

		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;

		for (let i = 0; i < items.length; i++) {

			switch (resource) {
				case 'graph':
					responseData = await handleGraph.call(this, operation, i);
					break;
				case 'query':
					responseData = await handleQuery.call(this, operation, i);
					break;
				case 'relationships':
					responseData = await handleRelationships.call(this, operation, i);
					break;
				case 'twins':
					responseData = await handleTwins.call(this, operation, i);
					break;
				default:
					throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`);
			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}

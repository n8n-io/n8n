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
	dataApiRequest,
} from './GenericFunctions';

import {
	proofLocationFields,
	proofLocationOperations,
	statusFields,
	statusOperations,
	valuesFields,
	valuesOperations,
} from './descriptions';

export class DataApi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Tributech Data-Api',
		name: 'dataApi',
		icon: 'file:tributech.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Tributech Data-API',
		defaults: {
			name: 'Data-Api',
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
				options: [
					{
						name: 'ProofLocation',
						value: 'proofLocation',
					},
					{
						name: 'Status',
						value: 'status',
					},
					{
						name: 'Value',
						value: 'value',
					},
				],
				default: 'value',
			},
			...proofLocationOperations,
			...proofLocationFields,
			...statusOperations,
			...statusFields,
			...valuesOperations,
			...valuesFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		function handleValueGet(this: IExecuteFunctions, operation: string, i: number) {
			const valueMetadataId = this.getNodeParameter('valueMetadataId', i);
			const qs: IDataObject = {
				from: this.getNodeParameter('from', i, undefined) as IDataObject,
				to: this.getNodeParameter('to', i, undefined) as IDataObject,
				orderBy: this.getNodeParameter('orderBy', i, undefined) as IDataObject,
				pageNumber: this.getNodeParameter('pageNumber', i, undefined) as IDataObject,
				pageSize: this.getNodeParameter('pageSize', i, undefined) as IDataObject,
			};

			if (operation === 'getRawValues') {
				const endpoint = `/values/${valueMetadataId}`;
				return dataApiRequest.call(this, 'GET', endpoint, {}, qs);

			} else if (operation === 'getValuesAsByte') {
				const endpoint = `/values/byte/${valueMetadataId}`;
				return dataApiRequest.call(this, 'GET', endpoint, {}, qs);

			} else if (operation === 'getValuesAsString') {
				const endpoint = `/values/string/${valueMetadataId}`;
				return dataApiRequest.call(this, 'GET', endpoint, {}, qs);

			} else if (operation === 'getValuesAsDouble') {
				const endpoint = `/values/double/${valueMetadataId}`;
				return dataApiRequest.call(this, 'GET', endpoint, {}, qs);
			}
		}

		function handleValuePost(this: IExecuteFunctions, operation: string, i: number) {
			const body: IDataObject = {
				valueMetadataId: this.getNodeParameter('valueMetadataId', i) as string || '',
				timestamp: this.getNodeParameter('timestamp', i) as string || '',
				values: JSON.parse(this.getNodeParameter('values', i) as string),
			};

			switch (operation) {
				case 'addValueAsByte':
					return dataApiRequest.call(this, 'POST', '/value/byte', body);
				case 'addValueAsBase64':
					return dataApiRequest.call(this, 'POST', '/value/string', body);
				case 'addValueAsDouble':
					return dataApiRequest.call(this, 'POST', '/value/double', body);
				case 'addValues':
					return dataApiRequest.call(this, 'POST', '/values', body);
				case 'addValuesAsByte':
					return dataApiRequest.call(this, 'POST', '/values/byte', body);
				case 'addValuesAsBase64':
					return dataApiRequest.call(this, 'POST', '/values/string', body);
				case 'addValuesAsDouble':
					return dataApiRequest.call(this, 'POST', '/values/double', body);
				default:
				case 'addValue':
					return dataApiRequest.call(this, 'POST', '/value', body);
			}
		}

		function handleStatus(this: IExecuteFunctions, operation: string, i: number) {
			const requestId = this.getNodeParameter('requestId', i);

			if (operation === 'getStreamStatus') {
				const valueMetadataId = this.getNodeParameter('valueMetadataId', i);
				const endpoint = `/status/request/${requestId}/metadata/${valueMetadataId}`;
				return dataApiRequest.call(this, 'GET', endpoint);
			} else if (operation === 'getSubscriptionStatus') {
				const endpoint = `/status/subscription/${requestId}`;
				return dataApiRequest.call(this, 'GET', endpoint);
			} else if (operation === 'getRequestStatus') {
				const endpoint = `/status/request/${requestId}`;
				return dataApiRequest.call(this, 'GET', endpoint);
			}
		}

		function handleProofLocation(this: IExecuteFunctions, operation: string, i: number) {
			if (operation === 'getProofLocation') {

				const valueMetadataId = this.getNodeParameter('valueMetadataId', i);
				const nextLastTimestamp = this.getNodeParameter('nextLastTimestamp', i);

				return dataApiRequest.call(this, 'GET', `/prooflocation/${valueMetadataId}/${nextLastTimestamp}`);

			} else if (operation === 'getProofLocations') {
				const valueMetadataId = this.getNodeParameter('valueMetadataId', i);
				const qs: IDataObject = {
					from: this.getNodeParameter('from', i) as IDataObject,
					to: this.getNodeParameter('to', i) as IDataObject,
					orderBy: this.getNodeParameter('orderBy', i) as IDataObject,
					pageNumber: this.getNodeParameter('pageNumber', i) as IDataObject,
					pageSize: this.getNodeParameter('pageSize', i) as IDataObject,
				};
				return dataApiRequest.call(this, 'GET', `/prooflocations/${valueMetadataId}`, {}, qs);
			} else if (operation === 'saveProofLocation') {
				const body: IDataObject = {
					valueMetadataId: this.getNodeParameter('valueMetadataId', i) as IDataObject,
					lastTimestamp: this.getNodeParameter('lastTimestamp', i) as IDataObject,
					merkleTreeDepth: this.getNodeParameter('merkleTreeDepth', i) as IDataObject,
					uri: this.getNodeParameter('uri', i) as IDataObject,
				};
				return dataApiRequest.call(this, 'POST', '/prooflocation', body);
			} else if (operation === 'saveProofLocations') {
				const body: IDataObject = {
					valueMetadataId: this.getNodeParameter('valueMetadataId', i) as IDataObject,
					lastTimestamp: this.getNodeParameter('lastTimestamp', i) as IDataObject,
					merkleTreeDepth: this.getNodeParameter('merkleTreeDepth', i) as IDataObject,
					uri: this.getNodeParameter('uri', i) as IDataObject,
				};
				return dataApiRequest.call(this, 'POST', '/prooflocations', [body]);
			}
		}

		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;

		for (let i = 0; i < items.length; i++) {
			switch (resource) {
				case 'proofLocation':
					responseData = await handleProofLocation.call(this, operation, i);
					break;
				case 'status':
					responseData = await handleStatus.call(this, operation, i);
					break;
				case 'value':
					if (operation.includes('get')) {
						responseData = await handleValueGet.call(this, operation, i);
					}

					if (operation.includes('add')) {
						responseData = await handleValuePost.call(this, operation, i);
					}
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

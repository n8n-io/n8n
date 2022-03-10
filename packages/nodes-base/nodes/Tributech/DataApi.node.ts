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
				description: 'The resource type',
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
		async function handleValueGet(this: IExecuteFunctions, operation: string, i: number) {
			const valueMetadataId = this.getNodeParameter('valueMetadataId', i);
			const qs: IDataObject = this.getNodeParameter('additionalFields', i) as IDataObject;
			
			let endpoint = "";

			switch (operation) {
				case 'getValuesAsByte': endpoint = `/values/byte/${valueMetadataId}`; break;
				case 'getValuesAsString': endpoint = `/values/string/${valueMetadataId}`; break;
				case 'getValuesAsDouble': endpoint = `/values/double/${valueMetadataId}`; break;
				case 'getValuesAsInt': endpoint = `/values/int/${valueMetadataId}`; break;
				case 'getValuesAsFloat': endpoint = `/values/float/${valueMetadataId}`; break;
				default: return;
			}

			return dataApiRequest.call(this, 'GET', endpoint, {}, qs);
		}

		async function handleValuePost(this: IExecuteFunctions, operation: string, i: number) {
			const body: IDataObject[] = (this.getNodeParameter('values', i) as IDataObject)?.value as IDataObject[];

			switch (operation) {
				case 'addValuesAsBase64':
					return dataApiRequest.call(this, 'POST', '/values/string', body);
				case 'addValuesAsDouble':
					return dataApiRequest.call(this, 'POST', '/values/double', body);
				default:
				case 'addValuesAsByte':
					return dataApiRequest.call(this, 'POST', '/values/byte', body);
			}
		}

		async function handleStatus(this: IExecuteFunctions, operation: string, i: number) {
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

		async function handleProofLocation(this: IExecuteFunctions, operation: string, i: number) {
			if (operation === 'getProofLocations') {
				const valueMetadataId = this.getNodeParameter('valueMetadataId', i);
				const qs: IDataObject = this.getNodeParameter('additionalFields', i) as IDataObject;
				return dataApiRequest.call(this, 'GET', `/prooflocations/${valueMetadataId}`, {}, qs);
			} else if (operation === 'saveProofLocations') {
				const body: IDataObject[] = (this.getNodeParameter('proofLocations', i) as IDataObject)?.proofLocation as IDataObject[];
				return dataApiRequest.call(this, 'POST', '/prooflocations', body);
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

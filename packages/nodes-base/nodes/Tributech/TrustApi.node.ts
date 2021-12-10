import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	trustApiRequest,
} from './GenericFunctions';

import {
	proofFields,
	proofOperations,
	valueFields,
	valueOperations,
} from './descriptions';

export class TrustApi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Tributech Trust-Api',
		name: 'trustApi',
		icon: 'file:tributech.svg',
		group: ['transform'],
		version: 1,
		description: 'Consume the Tributech Trust-API',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: {
			name: 'Trust-Api',
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
						name: 'Proof',
						value: 'proof',
					},
					{
						name: 'Value',
						value: 'value',
					},
				],
				default: 'proof',
			},
			...proofOperations,
			...proofFields,
			...valueOperations,
			...valueFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		async function handleProofs(this: IExecuteFunctions, operation: string, i: number) {
			if (operation === 'saveProofs') {
				const proofs = (this.getNodeParameter('proofs', i) as IDataObject)?.keys as IDataObject[];
				const body: IDataObject[] = proofs.map(p => ({
					proof: {
						id: p.id,
						rootHash: p.rootHash,
						signature: p.signature,
					},
					proofLocationWithoutKey: {
						valueMetadataId: p.valueMetadataId,
						merkelTreeDepth: p.merkelTreeDepth,
						lastTimestamp: p.lastTimestamp,
					},
				}));

				return trustApiRequest.call(this, 'POST', '/proofs', body);
			} else if (operation === 'getProof') {
				const qs: IDataObject = {
					valueMetadataId: this.getNodeParameter('valueMetadataId', i) as string,
					timestamp: this.getNodeParameter('timestamp', i) as string,
				};
				return trustApiRequest.call(this, 'GET', '/proof', {}, qs);
			} else if (operation === 'validateProofs') {

				const useCustomKey: boolean = this.getNodeParameter('customKey', i) as boolean;
				let body: IDataObject = {};

				if (useCustomKey) {
					body = {
						publicKey: this.getNodeParameter('publicKey', i) as string,
					};
				}

				const query: IDataObject = {
					precision: this.getNodeParameter('precision', i) as string,
					proofKind: this.getNodeParameter('proofKind', i) as string,
					valueMetadataId: this.getNodeParameter('valueMetadataId', i) as string,
					timestamp: this.getNodeParameter('timestamp', i) as string,
				};

				return trustApiRequest.call(this, 'POST', '/validate/proof', body, query);
			} else if (operation === 'validateStream') {

				const useCustomKey: boolean = this.getNodeParameter('customKey', i) as boolean;
				let body: IDataObject = {};

				if (useCustomKey) {
					body = {
						publicKey: this.getNodeParameter('publicKey', i) as string,
					};
				}

				body = {
					...body,
					from: this.getNodeParameter('from', i) as string,
					to: this.getNodeParameter('to', i) as string,
				};

				const query: IDataObject = {
					precision: this.getNodeParameter('precision', i) as string,
					proofKind: this.getNodeParameter('proofKind', i) as string,
				};

				const valueMetadataId = this.getNodeParameter('valueMetadataId', i) as string;
				return trustApiRequest.call(this, 'POST', `/validate/${valueMetadataId}`, body, query);
			} else if (operation === 'getProofWithValues') {
				const query: IDataObject = {
					precision: this.getNodeParameter('precision', i) as string,
					valueMetadataId: this.getNodeParameter('valueMetadataId', i) as string,
					timestamp: this.getNodeParameter('timestamp', i) as string,
				};

				return trustApiRequest.call(this, 'GET', '/proofvalues', {}, query);
			}
		}

		async function handleValues(this: IExecuteFunctions, operation: string, i: number) {
			const qs = {} as IDataObject;
			const query: IDataObject = {
				precision: this.getNodeParameter('precision', i) as string,
				proofKind: this.getNodeParameter('proofKind', i) as string,
			};

			if (Object.keys(query).length) {
				Object.assign(qs, query);
			}

			const values = (this.getNodeParameter('values', i) as IDataObject);
			const body = values?.value as IDataObject[];

			if (operation === 'saveValuesAsByte') {
				return trustApiRequest.call(this, 'POST', '/values/byte', body, qs);
			} else if (operation === 'saveValuesAsString') {
				return trustApiRequest.call(this, 'POST', '/values/string', body, qs);
			} else if (operation === 'saveValuesAsDouble') {
				return trustApiRequest.call(this, 'POST', '/values/double', body, qs);
			}
		}

		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;

		for (let i = 0; i < items.length; i++) {

			if (resource === 'proof') {
				responseData = await handleProofs.call(this, operation, i);
			} else if (resource === 'value') {
				responseData = await handleValues.call(this, operation, i);
			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);

		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}

import type { IExecuteFunctions } from 'n8n-core';

import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { venafiApiRequest, venafiApiRequestAllItems } from './GenericFunctions';

import { certificateFields, certificateOperations } from './CertificateDescription';

import { policyFields, policyOperations } from './PolicyDescription';

export class VenafiTlsProtectDatacenter implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Venafi TLS Protect Datacenter',
		name: 'venafiTlsProtectDatacenter',
		icon: 'file:../venafi.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Venafi TLS Protect Datacenter',
		defaults: {
			name: 'Venafi TLS Protect Datacenter',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'venafiTlsProtectDatacenterApi',
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
						name: 'Certificate',
						value: 'certificate',
					},
					{
						name: 'Policy',
						value: 'policy',
					},
				],
				default: 'certificate',
			},
			...certificateOperations,
			...certificateFields,
			...policyOperations,
			...policyFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'certificate') {
					if (operation === 'create') {
						const policyDN = this.getNodeParameter('PolicyDN', i) as string;

						const subject = this.getNodeParameter('Subject', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						const body: IDataObject = {
							PolicyDN: policyDN,
							Subject: subject,
						};

						Object.assign(body, additionalFields);

						if (body.SubjectAltNamesUi) {
							body.SubjectAltNames = (body.SubjectAltNamesUi as IDataObject).SubjectAltNamesValues;

							delete body.SubjectAltNamesUi;
						}

						responseData = await venafiApiRequest.call(
							this,
							'POST',
							'/vedsdk/Certificates/Request',
							body,
							qs,
						);
					}

					if (operation === 'delete') {
						const certificateId = this.getNodeParameter('certificateId', i) as string;

						responseData = await venafiApiRequest.call(
							this,
							'DELETE',
							`/vedsdk/Certificates/${certificateId}`,
							{},
							qs,
						);
					}

					if (operation === 'download') {
						const certificateDn = this.getNodeParameter('certificateDn', i) as string;
						const includePrivateKey = this.getNodeParameter('includePrivateKey', i) as boolean;
						const binaryProperty = this.getNodeParameter('binaryProperty', i);
						const additionalFields = this.getNodeParameter('additionalFields', i);

						const body: IDataObject = {
							CertificateDN: certificateDn,
							Format: 'Base64',
							IncludeChain: true,
						};

						if (includePrivateKey) {
							const password = this.getNodeParameter('password', i) as string;
							body.IncludePrivateKey = true;
							body.Password = password;
						}

						Object.assign(body, additionalFields);

						responseData = await venafiApiRequest.call(
							this,
							'POST',
							'/vedsdk/Certificates/Retrieve',
							body,
						);

						const binaryData = await this.helpers.prepareBinaryData(
							Buffer.from(responseData.CertificateData, 'base64'),
							responseData.Filename,
						);

						responseData = {
							json: {},
							binary: {
								[binaryProperty]: binaryData,
							},
						};
					}

					if (operation === 'get') {
						const certificateId = this.getNodeParameter('certificateId', i) as string;

						responseData = await venafiApiRequest.call(
							this,
							'GET',
							`/vedsdk/Certificates/${certificateId}`,
							{},
							qs,
						);
					}

					if (operation === 'getMany') {
						const returnAll = this.getNodeParameter('returnAll', i);

						const options = this.getNodeParameter('options', i);

						if (options.fields) {
							qs.OptionalFields = (options.fields as string[]).join(',');
						}

						if (returnAll) {
							responseData = await venafiApiRequestAllItems.call(
								this,
								'Certificates',
								'GET',
								'/vedsdk/Certificates',
								{},
								qs,
							);
						} else {
							qs.Limit = this.getNodeParameter('limit', i);
							responseData = await venafiApiRequest.call(
								this,
								'GET',
								'/vedsdk/Certificates',
								{},
								qs,
							);

							responseData = responseData.Certificates;
						}
					}

					if (operation === 'renew') {
						const certificateDN = this.getNodeParameter('certificateDN', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						const body: IDataObject = {
							CertificateDN: certificateDN,
						};

						Object.assign(body, additionalFields);

						responseData = await venafiApiRequest.call(
							this,
							'POST',
							'/vedsdk/Certificates/Renew',
							{},
							qs,
						);
					}
				}

				if (resource === 'policy') {
					if (operation === 'get') {
						const policy = this.getNodeParameter('policyDn', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						const body: IDataObject = {
							PolicyDN: policy,
						};

						Object.assign(body, additionalFields);

						responseData = await venafiApiRequest.call(
							this,
							'POST',
							'/vedsdk/Certificates/CheckPolicy',
							body,
							qs,
						);
					}
				}

				returnData.push(
					...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), {
						itemData: { item: i },
					}),
				);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message } });
					continue;
				}
				throw error;
			}
		}

		return [returnData as INodeExecutionData[]];
	}
}

import {
	type IExecuteFunctions,
	type IDataObject,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { certificateFields, certificateOperations } from './CertificateDescription';
import type {
	ICertficateKeystoreRequest,
	ICertficateRequest,
	ICsrAttributes,
	IKeyTypeParameters,
	ISubjectAltNamesByType,
} from './CertificateInterface';
import {
	certificateRequestFields,
	certificateRequestOperations,
} from './CertificateRequestDescription';
import { encryptPassphrase, venafiApiRequest, venafiApiRequestAllItems } from './GenericFunctions';

export class VenafiTlsProtectCloud implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Venafi TLS Protect Cloud',
		name: 'venafiTlsProtectCloud',
		icon: 'file:../venafi.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Venafi TLS Protect Cloud API',
		defaults: {
			name: 'Venafi TLS Protect Cloud',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'venafiTlsProtectCloudApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				noDataExpression: true,
				type: 'options',
				options: [
					{
						name: 'Certificate',
						value: 'certificate',
					},
					{
						name: 'Certificate Request',
						value: 'certificateRequest',
					},
				],
				default: 'certificateRequest',
			},
			...certificateOperations,
			...certificateFields,
			...certificateRequestOperations,
			...certificateRequestFields,
		],
	};

	methods = {
		loadOptions: {
			async getApplications(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { applications } = await venafiApiRequest.call(
					this,
					'GET',
					'/outagedetection/v1/applications',
				);

				for (const application of applications) {
					returnData.push({
						name: application.name,
						value: application.id,
					});
				}
				return returnData;
			},
			async getCertificateIssuingTemplates(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const currentApplication: string = this.getCurrentNodeParameter('applicationId') as string;

				const { certificateIssuingTemplateAliasIdMap } = (await venafiApiRequest.call(
					this,
					'GET',
					`/outagedetection/v1/applications/${currentApplication}`,
				)) as { certificateIssuingTemplateAliasIdMap: { [key: string]: string } };

				for (const [templateName, templateId] of Object.entries(
					certificateIssuingTemplateAliasIdMap,
				)) {
					returnData.push({
						name: templateName,
						value: templateId,
					});
				}
				return returnData;
			},
		},
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
				if (resource === 'certificateRequest') {
					//https://developer.venafi.com/tlsprotectcloud/reference/certificaterequests_create
					if (operation === 'create') {
						const applicationId = this.getNodeParameter('applicationId', i) as string;
						const certificateIssuingTemplateId = this.getNodeParameter(
							'certificateIssuingTemplateId',
							i,
						) as string;
						const options = this.getNodeParameter('options', i);
						const generateCsr = this.getNodeParameter('generateCsr', i) as boolean;

						const body: ICertficateRequest = {
							applicationId,
							certificateIssuingTemplateId,
						};

						if (generateCsr) {
							const commonName = this.getNodeParameter('commonName', i) as string;
							const additionalFields = this.getNodeParameter('additionalFields', i);

							const keyTypeDetails: IKeyTypeParameters = {};
							const csrAttributes: ICsrAttributes = {};
							const subjectAltNamesByType: ISubjectAltNamesByType = {};

							body.isVaaSGenerated = true;

							csrAttributes.commonName = commonName;

							// Csr Generation
							if (additionalFields.organization) {
								csrAttributes.organization = additionalFields.organization as string;
							}
							if (additionalFields.organizationalUnits) {
								csrAttributes.organizationalUnits =
									additionalFields.organizationalUnits as string[];
							}
							if (additionalFields.locality) {
								csrAttributes.locality = additionalFields.locality as string;
							}
							if (additionalFields.state) {
								csrAttributes.state = additionalFields.state as string;
							}
							if (additionalFields.country) {
								csrAttributes.country = additionalFields.country as string;
							}
							body.csrAttributes = csrAttributes;

							// Key type
							if (additionalFields.keyType) {
								keyTypeDetails.keyType = additionalFields.keyType as string;
							}
							if (additionalFields.keyCurve) {
								keyTypeDetails.keyCurve = additionalFields.keyCurve as string;
							}
							if (additionalFields.keyLength) {
								keyTypeDetails.keyLength = additionalFields.keyLength as number;
							}
							if (Object.keys(keyTypeDetails).length !== 0) {
								body.csrAttributes.keyTypeParameters = keyTypeDetails;
							}

							// SAN
							if (additionalFields.SubjectAltNamesUi) {
								for (const key of (additionalFields.SubjectAltNamesUi as IDataObject)
									.SubjectAltNamesValues as IDataObject[]) {
									if (key.Typename === 'dnsNames') {
										subjectAltNamesByType.dnsNames
											? subjectAltNamesByType.dnsNames.push(key.name as string)
											: (subjectAltNamesByType.dnsNames = [key.name as string]);
									}
									/*if (key.Typename === 'ipAddresses') {
										subjectAltNamesByType.ipAddresses ? subjectAltNamesByType.ipAddresses.push(key.name as string) : subjectAltNamesByType.ipAddresses = [key.name as string];
									}
									if (key.Typename === 'rfc822Names') {
										subjectAltNamesByType.rfc822Names ? subjectAltNamesByType.rfc822Names.push(key.name as string) : subjectAltNamesByType.rfc822Names = [key.name as string];
									}
									if (key.Typename === 'uniformResourceIdentifiers') {
										subjectAltNamesByType.uniformResourceIdentifiers ? subjectAltNamesByType.uniformResourceIdentifiers.push(key.name as string) : subjectAltNamesByType.uniformResourceIdentifiers = [key.name as string];
									}*/
								}
							}
							if (Object.keys(subjectAltNamesByType).length !== 0) {
								body.csrAttributes.subjectAlternativeNamesByType = subjectAltNamesByType;
							}
						} else {
							const certificateSigningRequest = this.getNodeParameter(
								'certificateSigningRequest',
								i,
							) as string;
							body.isVaaSGenerated = false;
							body.certificateSigningRequest = certificateSigningRequest;
						}

						Object.assign(body, options);

						responseData = await venafiApiRequest.call(
							this,
							'POST',
							'/outagedetection/v1/certificaterequests',
							body,
							qs,
						);

						responseData = responseData.certificateRequests;
					}

					//https://developer.venafi.com/tlsprotectcloud/reference/certificaterequests_getbyid
					if (operation === 'get') {
						const certificateId = this.getNodeParameter('certificateRequestId', i) as string;

						responseData = await venafiApiRequest.call(
							this,
							'GET',
							`/outagedetection/v1/certificaterequests/${certificateId}`,
							{},
							qs,
						);
					}

					//https://developer.venafi.com/tlsprotectcloud/reference/certificaterequests_getall
					if (operation === 'getMany') {
						const returnAll = this.getNodeParameter('returnAll', i);

						if (returnAll) {
							responseData = await venafiApiRequestAllItems.call(
								this,
								'certificateRequests',
								'GET',
								'/outagedetection/v1/certificaterequests',
								{},
								qs,
							);
						} else {
							const limit = this.getNodeParameter('limit', i);
							responseData = await venafiApiRequest.call(
								this,
								'GET',
								'/outagedetection/v1/certificaterequests',
								{},
								qs,
							);

							responseData = responseData.certificateRequests.splice(0, limit);
						}
					}
				}

				if (resource === 'certificate') {
					//https://developer.venafi.com/tlsprotectcloud/reference/certificateretirement_deletecertificates
					if (operation === 'delete') {
						const certificateId = this.getNodeParameter('certificateId', i) as string;

						responseData = await venafiApiRequest.call(
							this,
							'POST',
							'/outagedetection/v1/certificates/deletion',
							{ certificateIds: [certificateId] },
						);

						responseData = responseData.certificates;
					}

					//https://developer.venafi.com/tlsprotectcloud/reference/certificates_getcontentsbyid
					if (operation === 'download') {
						const certificateId = this.getNodeParameter('certificateId', i) as string;
						const binaryProperty = this.getNodeParameter('binaryProperty', i);
						const downloadItem = this.getNodeParameter('downloadItem', i) as string;
						const options = this.getNodeParameter('options', i);

						// Cert Download
						if (downloadItem === 'certificate') {
							Object.assign(qs, options);
							responseData = await venafiApiRequest.call(
								this,
								'GET',
								`/outagedetection/v1/certificates/${certificateId}/contents`,
								{},
								qs,
								{ encoding: null, json: false, resolveWithFullResponse: true, cert: true },
							);
						} else {
							const exportFormat = this.getNodeParameter('keystoreType', i) as string;

							const body: ICertficateKeystoreRequest = {
								exportFormat,
							};

							const privateKeyPassphrase = this.getNodeParameter(
								'privateKeyPassphrase',
								i,
							) as string;
							const certificateLabel = this.getNodeParameter('certificateLabel', i) as string;

							body.certificateLabel = certificateLabel;

							let keystorePassphrase = '';

							if (exportFormat === 'JKS') {
								keystorePassphrase = this.getNodeParameter('keystorePassphrase', i) as string;
							}

							const encryptedValues = (await encryptPassphrase.call(
								this,
								certificateId,
								privateKeyPassphrase,
								keystorePassphrase,
							)) as string;
							body.encryptedPrivateKeyPassphrase = encryptedValues[0];
							if (exportFormat === 'JKS') {
								body.encryptedKeystorePassphrase = encryptedValues[1];
							}

							responseData = await venafiApiRequest.call(
								this,
								'POST',
								`/outagedetection/v1/certificates/${certificateId}/keystore`,
								body,
								{},
								{ encoding: null, json: false, resolveWithFullResponse: true },
							);
						}

						const contentDisposition: string = responseData.headers['content-disposition'];
						const fileNameRegex = /(?<=filename=").*\b/;
						const match = fileNameRegex.exec(contentDisposition);
						let fileName = '';

						if (match !== null) {
							fileName = match[0];
						}

						const binaryData = await this.helpers.prepareBinaryData(
							Buffer.from(responseData.body as Buffer),
							fileName,
						);

						responseData = {
							json: {},
							binary: {
								[binaryProperty]: binaryData,
							},
						};
					}

					//https://developer.venafi.com/tlsprotectcloud/reference/certificates_getbyid
					if (operation === 'get') {
						const certificateId = this.getNodeParameter('certificateId', i) as string;

						responseData = await venafiApiRequest.call(
							this,
							'GET',
							`/outagedetection/v1/certificates/${certificateId}`,
							{},
							qs,
						);
					}

					//https://developer.venafi.com/tlsprotectcloud/reference/certificates_getall
					if (operation === 'getMany') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const filters = this.getNodeParameter('filters', i);

						Object.assign(qs, filters);

						if (returnAll) {
							responseData = await venafiApiRequestAllItems.call(
								this,
								'certificates',
								'GET',
								'/outagedetection/v1/certificates',
								{},
								qs,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', i);
							responseData = await venafiApiRequest.call(
								this,
								'GET',
								'/outagedetection/v1/certificates',
								{},
								qs,
							);

							responseData = responseData.certificates;
						}
					}

					//https://docs.venafi.cloud/api/renewing-a-certificate-api/
					if (operation === 'renew') {
						const applicationId = this.getNodeParameter('applicationId', i) as string;
						const certificateIssuingTemplateId = this.getNodeParameter(
							'certificateIssuingTemplateId',
							i,
						) as string;
						const certificateSigningRequest = this.getNodeParameter(
							'certificateSigningRequest',
							i,
						) as string;
						const existingCertificateId = this.getNodeParameter(
							'existingCertificateId',
							i,
						) as string;
						const options = this.getNodeParameter('options', i);

						const body: IDataObject = {
							certificateSigningRequest,
							certificateIssuingTemplateId,
							applicationId,
							existingCertificateId,
						};

						Object.assign(body, options);

						responseData = await venafiApiRequest.call(
							this,
							'POST',
							'/outagedetection/v1/certificaterequests',
							body,
							qs,
						);

						responseData = responseData.certificateRequests;
					}
				}

				returnData.push(
					...this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject[]),
						{
							itemData: { item: i },
						},
					),
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

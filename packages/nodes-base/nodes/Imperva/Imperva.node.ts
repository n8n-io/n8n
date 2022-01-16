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
	impervaApiRequest,
} from './GenericFunctions';

import {
	certificateFields,
	certificateOperations,
} from './CertificateDescription';

export class Imperva implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Imperva',
		name: 'imperva',
		icon: 'file:imperva.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Imperva API',
		defaults: {
			name: 'Imperva',
			color: '#000000',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'impervaApi',
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
						name: 'Certificate',
						value: 'certificate',
					},
				],
				default: 'certificate',
				description: 'The resource to operate on.',
			},
			...certificateOperations,
			...certificateFields,
		],
	};

	methods = {
		loadOptions: {
			async getSites(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { sites } = await impervaApiRequest.call(this, 'POST', '/sites/list');
				for (const site of sites) {
					returnData.push({
						name: site.domain,
						value: site.site_id,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {

			try {

				if (resource === 'certificate') {

					//https://docs.imperva.com/bundle/cloud-application-security/page/api/sites-api.htm#Upload
					if (operation === 'upload') {

						const siteId = this.getNodeParameter('siteId', i) as string;
						const certificate = this.getNodeParameter('certificate', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body: IDataObject = {
							site_id: siteId,
							certificate,
						};

						Object.assign(body, additionalFields);

						responseData = await impervaApiRequest.call(
							this,
							'POST',
							`/sites/customCertificate/upload`,
							body,
							qs,
						);
					}
				}

				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else if (responseData !== undefined) {
					returnData.push(responseData as IDataObject);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message } });
					continue;
				}
				throw error;
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}

import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	adjustAddresses,
	getEntityFields,
	getPicklistOptions,
	IField,
	microsoftApiRequest,
	microsoftApiRequestAllItems,
	sort,
} from './GenericFunctions';

import { accountFields, accountOperations } from './descriptions';

export class MicrosoftDynamicsCrm implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft Dynamics CRM',
		name: 'microsoftDynamicsCrm',
		icon: 'file:dynamicsCrm.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Microsoft Dynamics CRM API',
		defaults: {
			name: 'Microsoft Dynamics CRM',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'microsoftDynamicsOAuth2Api',
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
						name: 'Account',
						value: 'account',
					},
				],
				default: 'account',
			},
			...accountOperations,
			...accountFields,
		],
	};

	methods = {
		loadOptions: {
			async getAccountCategories(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return await getPicklistOptions.call(this, 'account', 'accountcategorycode');
			},
			async getAccountRatingCodes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return await getPicklistOptions.call(this, 'account', 'accountratingcode');
			},
			async getAddressTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return await getPicklistOptions.call(this, 'account', 'address1_addresstypecode');
			},
			async getBusinessTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return await getPicklistOptions.call(this, 'account', 'businesstypecode');
			},
			async getCustomerSizeCodes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return await getPicklistOptions.call(this, 'account', 'customersizecode');
			},
			async getCustomerTypeCodes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return await getPicklistOptions.call(this, 'account', 'customertypecode');
			},
			async getIndustryCodes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return await getPicklistOptions.call(this, 'account', 'industrycode');
			},
			async getPaymentTermsCodes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return await getPicklistOptions.call(this, 'account', 'paymenttermscode');
			},
			async getPreferredAppointmentDayCodes(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				return await getPicklistOptions.call(this, 'account', 'preferredappointmentdaycode');
			},
			async getPreferredAppointmentTimeCodes(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				return await getPicklistOptions.call(this, 'account', 'preferredappointmenttimecode');
			},
			async getPreferredContactMethodCodes(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				return await getPicklistOptions.call(this, 'account', 'preferredcontactmethodcode');
			},
			async getShippingMethodCodes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return await getPicklistOptions.call(this, 'account', 'shippingmethodcode');
			},
			async getTerritoryCodes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return await getPicklistOptions.call(this, 'account', 'territorycode');
			},
			async getAccountFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const fields = await getEntityFields.call(this, 'account');
				const isSelectable = (field: IField) =>
					field.IsValidForRead &&
					field.CanBeSecuredForRead &&
					field.IsValidODataAttribute &&
					field.LogicalName !== 'slaid';
				return fields
					.filter(isSelectable)
					.filter((field) => field.DisplayName.UserLocalizedLabel?.Label)
					.map((field) => ({
						name: field.DisplayName.UserLocalizedLabel.Label,
						value: field.LogicalName,
					}))
					.sort(sort);
			},
			async getExpandableAccountFields(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const fields = await getEntityFields.call(this, 'account');
				const isSelectable = (field: IField) =>
					field.IsValidForRead &&
					field.CanBeSecuredForRead &&
					field.IsValidODataAttribute &&
					field.AttributeType === 'Lookup' &&
					field.LogicalName !== 'slaid';
				return fields
					.filter(isSelectable)
					.map((field) => ({
						name: field.DisplayName.UserLocalizedLabel.Label,
						value: field.LogicalName,
					}))
					.sort(sort);
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'account') {
					//https://docs.microsoft.com/en-us/powerapps/developer/data-platform/webapi/create-entity-web-api
					if (operation === 'create') {
						const name = this.getNodeParameter('name', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as {
							// tslint:disable-next-line: no-any
							addresses: { address: [{ [key: string]: any }] };
						};
						const options = this.getNodeParameter('options', i) as { returnFields: string[] };

						const body = {
							name,
							...additionalFields,
						};

						if (body?.addresses?.address) {
							Object.assign(body, adjustAddresses(body.addresses.address));
							//@ts-ignore
							delete body?.addresses;
						}

						if (options.returnFields) {
							options.returnFields.push('accountid');
							qs['$select'] = options.returnFields.join(',');
						} else {
							qs['$select'] = 'accountid';
						}

						responseData = await microsoftApiRequest.call(this, 'POST', `/accounts`, body, qs);
					}

					if (operation === 'delete') {
						//https://docs.microsoft.com/en-us/powerapps/developer/data-platform/webapi/update-delete-entities-using-web-api#basic-delete
						const accountId = this.getNodeParameter('accountId', i) as string;
						await microsoftApiRequest.call(this, 'DELETE', `/accounts(${accountId})`, {}, qs);
						responseData = { success: true };
					}

					if (operation === 'get') {
						//https://docs.microsoft.com/en-us/powerapps/developer/data-platform/webapi/retrieve-entity-using-web-api
						const accountId = this.getNodeParameter('accountId', i) as string;
						const options = this.getNodeParameter('options', i);
						if (options.returnFields) {
							qs['$select'] = (options.returnFields as string[]).join(',');
						}
						if (options.expandFields) {
							qs['$expand'] = (options.expandFields as string[]).join(',');
						}
						responseData = await microsoftApiRequest.call(
							this,
							'GET',
							`/accounts(${accountId})`,
							{},
							qs,
						);
					}

					if (operation === 'getAll') {
						//https://docs.microsoft.com/en-us/powerapps/developer/data-platform/webapi/query-data-web-api
						const returnAll = this.getNodeParameter('returnAll', i);
						const options = this.getNodeParameter('options', i);
						const filters = this.getNodeParameter('filters', i);
						if (options.returnFields) {
							qs['$select'] = (options.returnFields as string[]).join(',');
						}
						if (options.expandFields) {
							qs['$expand'] = (options.expandFields as string[]).join(',');
						}
						if (filters.query) {
							qs['$filter'] = filters.query as string;
						}
						if (returnAll) {
							responseData = await microsoftApiRequestAllItems.call(
								this,
								'value',
								'GET',
								`/accounts`,
								{},
								qs,
							);
						} else {
							qs['$top'] = this.getNodeParameter('limit', 0);
							responseData = await microsoftApiRequest.call(this, 'GET', `/accounts`, {}, qs);
							responseData = responseData.value;
						}
					}

					if (operation === 'update') {
						const accountId = this.getNodeParameter('accountId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as {
							// tslint:disable-next-line: no-any
							addresses: { address: [{ [key: string]: any }] };
						};
						const options = this.getNodeParameter('options', i) as { returnFields: string[] };

						const body = {
							...updateFields,
						};

						if (body?.addresses?.address) {
							Object.assign(body, adjustAddresses(body.addresses.address));
							//@ts-ignore
							delete body?.addresses;
						}

						if (options.returnFields) {
							options.returnFields.push('accountid');
							qs['$select'] = options.returnFields.join(',');
						} else {
							qs['$select'] = 'accountid';
						}

						responseData = await microsoftApiRequest.call(
							this,
							'PATCH',
							`/accounts(${accountId})`,
							body,
							qs,
						);
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}
		}

		return this.prepareOutputData(returnData);
	}
}

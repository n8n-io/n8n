import type { IExecuteFunctions } from 'n8n-core';

import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import type { IField, ICustomFields, IOperationFunction } from './GenericFunctions';
import {
	adjustBody,
	buildQs,
	getEntityFields,
	getPicklistOptions,
	microsoftApiRequest,
	microsoftApiRequestAllItems,
	sort,
} from './GenericFunctions';

import { accountFields, accountOperations, leadFields, leadOperations } from './descriptions';
import { IExecuteSingleFunctions } from 'n8n-core';

const operations: { [key: string]: IOperationFunction } = {
	'account:create': async function (
		this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
		index: number,
	) {
		// https://docs.microsoft.com/en-us/powerapps/developer/data-platform/webapi/create-entity-web-api
		const name = this.getNodeParameter('name', index) as string;
		const additionalFields = this.getNodeParameter('additionalFields', index) as IDataObject;
		const options = this.getNodeParameter('options', index) as IDataObject;

		return microsoftApiRequest.call(
			this,
			'POST',
			'/accounts',
			adjustBody({
				name,
				...additionalFields,
			}),
			buildQs({
				options,
				requiredReturnFields: ['accountid'],
			}),
		);
	},

	'account:delete': async function (
		this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
		index: number,
	) {
		// https://docs.microsoft.com/en-us/powerapps/developer/data-platform/webapi/update-delete-entities-using-web-api#basic-delete
		const accountId = this.getNodeParameter('accountId', index) as string;

		await microsoftApiRequest.call(this, 'DELETE', `/accounts(${accountId})`);

		return { success: true };
	},

	'account:get': async function (
		this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
		index: number,
	) {
		// https://docs.microsoft.com/en-us/powerapps/developer/data-platform/webapi/retrieve-entity-using-web-api
		const accountId = this.getNodeParameter('accountId', index) as string;
		const options = this.getNodeParameter('options', index) as IDataObject;

		return microsoftApiRequest.call(
			this,
			'GET',
			`/accounts(${accountId})`,
			{},
			buildQs({
				options,
			}),
		);
	},

	'account:getAll': async function (
		this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
		index: number,
	) {
		// https://docs.microsoft.com/en-us/powerapps/developer/data-platform/webapi/query-data-web-api
		const returnAll = this.getNodeParameter('returnAll', index);
		const options = this.getNodeParameter('options', index) as IDataObject;
		const filters = this.getNodeParameter('filters', index) as IDataObject;
		const qs = buildQs({
			options,
			filters,
		});

		if (returnAll) {
			return microsoftApiRequestAllItems.call(this, 'value', 'GET', '/accounts', {}, qs);
		}

		const { value } = await microsoftApiRequest.call(
			this,
			'GET',
			'/accounts',
			{},
			{
				...qs,
				$top: this.getNodeParameter('limit', 0),
			},
		);

		return value;
	},

	'account:update': async function (
		this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
		index: number,
	) {
		const accountId = this.getNodeParameter('accountId', index) as string;
		const updateFields = this.getNodeParameter('updateFields', index) as IDataObject;
		const options = this.getNodeParameter('options', index) as IDataObject;

		return microsoftApiRequest.call(
			this,
			'PATCH',
			`/accounts(${accountId})`,
			adjustBody({
				...updateFields,
			}),
			buildQs({
				options,
				requiredReturnFields: ['accountid'],
			}),
		);
	},

	'lead:create': async function (
		this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
		index: number,
	) {
		const additionalFields = this.getNodeParameter('additionalFields', index) as {
			addresses: { address: [{ [key: string]: any }] };
		};
		const customFields = this.getNodeParameter('customFields', index) as ICustomFields;
		const options = this.getNodeParameter('options', index) as IDataObject;

		return microsoftApiRequest.call(
			this,
			'POST',
			'/leads',
			adjustBody({
				...additionalFields,
				...customFields,
			}),
			buildQs({
				options,
				requiredReturnFields: ['leadid'],
			}),
		);
	},
};

export class MicrosoftDynamicsCrm implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft Dynamics CRM v2',
		name: 'microsoftDynamicsCrmV2',
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
					{
						name: 'Lead',
						value: 'lead',
					},
				],
				default: 'account',
			},
			...accountOperations,
			...accountFields,
			...leadOperations,
			...leadFields,
		],
	};

	methods = {
		loadOptions: {
			async getAccountCategories(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getPicklistOptions.call(this, 'account', 'accountcategorycode');
			},
			async getAccountRatingCodes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getPicklistOptions.call(this, 'account', 'accountratingcode');
			},
			async getAccountAddressTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getPicklistOptions.call(this, 'account', 'address1_addresstypecode');
			},
			async getBusinessTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getPicklistOptions.call(this, 'account', 'businesstypecode');
			},
			async getCustomerSizeCodes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getPicklistOptions.call(this, 'account', 'customersizecode');
			},
			async getCustomerTypeCodes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getPicklistOptions.call(this, 'account', 'customertypecode');
			},
			async getAccountIndustryCodes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getPicklistOptions.call(this, 'account', 'industrycode');
			},
			async getPaymentTermsCodes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getPicklistOptions.call(this, 'account', 'paymenttermscode');
			},
			async getPreferredAppointmentDayCodes(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				return getPicklistOptions.call(this, 'account', 'preferredappointmentdaycode');
			},
			async getPreferredAppointmentTimeCodes(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				return getPicklistOptions.call(this, 'account', 'preferredappointmenttimecode');
			},
			async getAccountPreferredContactMethodCodes(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				return getPicklistOptions.call(this, 'account', 'preferredcontactmethodcode');
			},
			async getShippingMethodCodes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getPicklistOptions.call(this, 'account', 'shippingmethodcode');
			},
			async getTerritoryCodes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getPicklistOptions.call(this, 'account', 'territorycode');
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
			async getLeadAddressTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getPicklistOptions.call(this, 'lead', 'address1_addresstypecode');
			},
			async getLeadBudgetStatuses(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getPicklistOptions.call(this, 'lead', 'budgetstatus');
			},
			async getLeadIndustryCodes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getPicklistOptions.call(this, 'lead', 'industrycode');
			},
			async getLeadPreferredContactMethodCodes(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				return getPicklistOptions.call(this, 'lead', 'preferredcontactmethodcode');
			},
			async getLeadFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const fields = await getEntityFields.call(this, 'lead');
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
			async getBooleanOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return [
					{
						name: 'No',
						value: 1,
					},
					{
						name: 'Yes',
						value: 0,
					},
				];
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		let responseData;

		for (let i = 0; i < length; i++) {
			try {
				const operationHandler = operations[`${resource}:${operation}`];

				if (operationHandler) {
					responseData = await operationHandler.call(this, i);
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

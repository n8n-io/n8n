import type { OptionsWithUri } from 'request';

import type {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	INodeProperties,
	INodePropertyOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function microsoftApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	const credentials = (await this.getCredentials('microsoftDynamicsOAuth2Api')) as {
		subdomain: string;
		region: string;
	};

	let options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
			accept: 'application/json',
			Prefer: 'return=representation',
		},
		method,
		body,
		qs,
		uri: uri || `https://${credentials.subdomain}.${credentials.region}/api/data/v9.2${resource}`,
		json: true,
	};

	try {
		if (Object.keys(option).length !== 0) {
			options = Object.assign({}, options, option);
		}
		//@ts-ignore
		return await this.helpers.requestOAuth2.call(this, 'microsoftDynamicsOAuth2Api', options, {
			property: 'id_token',
		});
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function microsoftApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: string,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	let uri: string | undefined;
	query.$top = 100;

	do {
		responseData = await microsoftApiRequest.call(this, method, endpoint, body, query, uri);
		uri = responseData['@odata.nextLink'];
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData['@odata.nextLink'] !== undefined);

	return returnData;
}

export async function getPicklistOptions(
	this: ILoadOptionsFunctions,
	entityName: string,
	attributeName: string,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const endpoint = `/EntityDefinitions(LogicalName='${entityName}')/Attributes(LogicalName='${attributeName}')/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=LogicalName&$expand=OptionSet($select=Options),GlobalOptionSet($select=Options)`;
	const {
		OptionSet: { Options: options },
	} = await microsoftApiRequest.call(this, 'GET', endpoint);
	for (const option of options) {
		returnData.push({
			name: option.Label.UserLocalizedLabel.Label,
			value: option.Value,
		});
	}
	return returnData;
}

export async function getEntityFields(
	this: ILoadOptionsFunctions,
	entityName: string,
): Promise<IField[]> {
	const endpoint = `/EntityDefinitions(LogicalName='${entityName}')/Attributes`;
	const { value } = await microsoftApiRequest.call(this, 'GET', endpoint);
	return value;
}

export function adjustAddresses(addresses: [{ [key: string]: string }]) {
	const results: { [key: string]: any } = {};
	for (const [index, address] of addresses.entries()) {
		for (const key of Object.keys(address)) {
			if (address[key] !== '') {
				results[`address${index + 1}_${key}`] = address[key];
			}
		}
	}
	return results;
}

export function getAccountFields(): INodeProperties[] {
	return [
		{
			displayName: 'Account Category Name or ID',
			name: 'accountcategorycode',
			type: 'options',
			typeOptions: {
				loadOptionsMethod: 'getAccountCategories',
			},
			default: '',
			description:
				'Category to indicate whether the customer account is standard or preferred. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		},
		{
			displayName: 'Account Rating Name or ID',
			name: 'accountratingcode',
			type: 'options',
			description:
				'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
			typeOptions: {
				loadOptionsMethod: 'getAccountRatingCodes',
			},
			default: '',
		},
		{
			displayName: 'Address',
			name: 'addresses',
			type: 'fixedCollection',
			default: {},
			typeOptions: {
				multipleValues: true,
			},
			placeholder: 'Add Address Field',
			options: [
				{
					displayName: 'Address Fields',
					name: 'address',
					values: [
						{
							displayName: 'Address Type Name or ID',
							name: 'addresstypecode',
							type: 'options',
							description:
								'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
							typeOptions: {
								loadOptionsMethod: 'getAddressTypes',
							},
							default: '',
						},
						{
							displayName: 'Line1',
							name: 'line1',
							type: 'string',
							default: '',
						},
						{
							displayName: 'Line2',
							name: 'line2',
							type: 'string',
							default: '',
						},
						{
							displayName: 'Line3',
							name: 'line3',
							type: 'string',
							default: '',
						},
						{
							displayName: 'City',
							name: 'city',
							type: 'string',
							default: '',
						},
						{
							displayName: 'State or Province',
							name: 'stateorprovince',
							type: 'string',
							default: '',
						},
						{
							displayName: 'Country',
							name: 'country',
							type: 'string',
							default: '',
						},
						{
							displayName: 'Name',
							name: 'name',
							type: 'string',
							default: '',
						},
						{
							displayName: 'Postalcode',
							name: 'postalcode',
							type: 'string',
							default: '',
						},
						{
							displayName: 'Primary Contact Name',
							name: 'primarycontactname',
							type: 'string',
							default: '',
						},
						{
							displayName: 'Telephone1',
							name: 'telephone1',
							type: 'string',
							default: '',
						},
						{
							displayName: 'Telephone2',
							name: 'telephone2',
							type: 'string',
							default: '',
						},
						{
							displayName: 'Fax',
							name: 'fax',
							type: 'string',
							default: '',
						},
					],
				},
			],
		},
		{
			displayName: 'Business Type Name or ID',
			name: 'businesstypecode',
			type: 'options',
			typeOptions: {
				loadOptionsMethod: 'getBusinessTypes',
			},
			default: '',
			description:
				'The legal designation or other business type of the account for contracts or reporting purposes. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		},
		{
			displayName: 'Customer Size Name or ID',
			name: 'customersizecode',
			type: 'options',
			description:
				'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
			typeOptions: {
				loadOptionsMethod: 'getCustomerSizeCodes',
			},
			default: '',
		},
		{
			displayName: 'Customer Type Name or ID',
			name: 'customertypecode',
			type: 'options',
			description:
				'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
			typeOptions: {
				loadOptionsMethod: 'getCustomerTypeCodes',
			},
			default: '',
		},
		{
			displayName: 'Description',
			name: 'description',
			type: 'string',
			default: '',
			description:
				'Additional information to describe the account, such as an excerpt from the company’s website',
		},
		{
			displayName: 'Email Address 1',
			name: 'emailaddress1',
			type: 'string',
			default: '',
			description: 'The primary email address for the account',
		},
		{
			displayName: 'Email Address 2',
			name: 'emailaddress2',
			type: 'string',
			default: '',
			description: 'The secondary email address for the account',
		},
		{
			displayName: 'Email Address 3',
			name: 'emailaddress3',
			type: 'string',
			default: '',
			description: 'Alternate email address for the account',
		},
		{
			displayName: 'Fax',
			name: 'fax',
			type: 'string',
			default: '',
		},
		{
			displayName: 'FTP site URL',
			name: 'ftpsiteurl',
			type: 'string',
			default: '',
			description:
				'URL for the account’s FTP site to enable users to access data and share documents',
		},
		{
			displayName: 'Industry Name or ID',
			name: 'industrycode',
			type: 'options',
			typeOptions: {
				loadOptionsMethod: 'getIndustryCodes',
			},
			default: '',
			description:
				'The account’s primary industry for use in marketing segmentation and demographic analysis. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		},
		{
			displayName: 'Name',
			name: 'name',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					'/resource': ['account'],
					'/operation': ['update'],
				},
			},
			description: 'Company o business name',
		},
		{
			displayName: 'Credit Limit',
			name: 'creditlimit',
			type: 'number',
			default: '',
			description:
				'Credit limit of the account. This is a useful reference when you address invoice and accounting issues with the customer.',
		},
		{
			displayName: 'Number Of Employees',
			name: 'numberofemployees',
			type: 'number',
			default: 0,
			description:
				'Number of employees that work at the account for use in marketing segmentation and demographic analysis',
		},
		{
			displayName: 'Payment Terms Name or ID',
			name: 'paymenttermscode',
			type: 'options',
			typeOptions: {
				loadOptionsMethod: 'getPaymentTermsCodes',
			},
			default: '',
			description:
				'The payment terms to indicate when the customer needs to pay the total amount. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		},
		{
			displayName: 'Preferred Appointment Day Name or ID',
			name: 'preferredappointmentdaycode',
			type: 'options',
			typeOptions: {
				loadOptionsMethod: 'getPreferredAppointmentDayCodes',
			},
			default: '',
			description:
				'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		},
		{
			displayName: 'Preferred Appointment Time Name or ID',
			name: 'preferredappointmenttimecode',
			type: 'options',
			typeOptions: {
				loadOptionsMethod: 'getPreferredAppointmentTimeCodes',
			},
			default: '',
			description:
				'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		},
		{
			displayName: 'Preferred Contact Method Name or ID',
			name: 'preferredcontactmethodcode',
			type: 'options',
			typeOptions: {
				loadOptionsMethod: 'getPreferredContactMethodCodes',
			},
			default: '',
			description:
				'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		},
		{
			displayName: 'Primary Satori ID',
			name: 'primarysatoriid',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Primary Twitter ID',
			name: 'primarytwitterid',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Revenue',
			name: 'revenue',
			type: 'number',
			default: '',
			description:
				'The annual revenue for the account, used as an indicator in financial performance analysis',
		},
		{
			displayName: 'Shares Outstanding',
			name: 'sharesoutstanding',
			type: 'number',
			default: '',
			description:
				'The number of shares available to the public for the account. This number is used as an indicator in financial performance analysis.',
		},
		{
			displayName: 'Shipping Method Name or ID',
			name: 'shippingmethodcode',
			type: 'options',
			typeOptions: {
				loadOptionsMethod: 'getShippingMethodCodes',
			},
			default: '',
			description:
				'Shipping method for deliveries sent to the account’s address to designate the preferred carrier or other delivery option. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		},
		{
			displayName: 'SIC',
			name: 'sic',
			type: 'string',
			default: '',
			description:
				'The Standard Industrial Classification (SIC) code that indicates the account’s primary industry of business, for use in marketing segmentation and demographic analysis',
		},
		{
			displayName: 'Stage ID',
			name: 'stageid',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Stock Exchange',
			name: 'stockexchange',
			type: 'string',
			default: '',
			description:
				'The stock exchange at which the account is listed to track their stock and financial performance of the company',
		},
		{
			displayName: 'Telephone 1',
			name: 'telephone1',
			type: 'string',
			default: '',
			description: 'The main phone number for this account',
		},
		{
			displayName: 'Telephone 2',
			name: 'telephone2',
			type: 'string',
			default: '',
			description: 'The second phone number for this account',
		},
		{
			displayName: 'Telephone 3',
			name: 'telephone3',
			type: 'string',
			default: '',
			description: 'The third phone number for this account',
		},
		{
			displayName: 'Territory Name or ID',
			name: 'territorycode',
			type: 'options',
			typeOptions: {
				loadOptionsMethod: 'getTerritoryCodes',
			},
			default: '',
			description:
				'Region or territory for the account for use in segmentation and analysis. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		},
		{
			displayName: 'Ticker Symbol',
			name: 'tickersymbol',
			type: 'string',
			default: '',
			description:
				'Type the stock exchange symbol for the account to track financial performance of the company. You can click the code entered in this field to access the latest trading information from MSN Money.',
		},
		{
			displayName: 'Website URL',
			name: 'websiteurl',
			type: 'string',
			default: '',
			description: 'The account’s website URL to get quick details about the company profile',
		},
		{
			displayName: 'Yomi Name',
			name: 'yominame',
			type: 'string',
			default: '',
			description:
				'The phonetic spelling of the company name, if specified in Japanese, to make sure the name is pronounced correctly in phone calls and other communications',
		},
	];
}

export const sort = (a: { name: string }, b: { name: string }) => {
	if (a.name < b.name) {
		return -1;
	}
	if (a.name > b.name) {
		return 1;
	}
	return 0;
};

export interface IField {
	IsRetrievable: boolean;
	LogicalName: string;
	IsSearchable: string;
	IsValidODataAttribute: string;
	IsValidForRead: string;
	CanBeSecuredForRead: string;
	AttributeType: string;
	IsSortableEnabled: {
		Value: boolean;
	};
	DisplayName: {
		UserLocalizedLabel: {
			Label: string;
		};
	};
}

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
	allFields,
	cleanData,
	googleApiRequest,
	googleApiRequestAllItems,
} from './GenericFunctions';

import {
	contactFields,
	contactOperations,
} from './ContactDescription';

import * as moment from 'moment';
import { IData } from '../Analytics/Interfaces';

export class GoogleContacts implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Contacts',
		name: 'googleContacts',
		icon: 'file:googleContacts.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Google Contacts API',
		defaults: {
			name: 'Google Contacts',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'googleContactsOAuth2Api',
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
						name: 'Contact',
						value: 'contact',
					},
				],
				default: 'contact',
				description: 'The resource to operate on.',
			},
			...contactOperations,
			...contactFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the calendars to display them to user so that he can
			// select them easily
			async getGroups(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const groups = await googleApiRequestAllItems.call(
					this,
					'contactGroups',
					'GET',
					`/contactGroups`,
				);
				for (const group of groups) {
					const groupName = group.name;
					const groupId = group.resourceName;
					returnData.push({
						name: groupName,
						value: groupId,
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
				if (resource === 'contact') {
					//https://developers.google.com/calendar/v3/reference/events/insert
					if (operation === 'create') {
						const familyName = this.getNodeParameter('familyName', i) as string;
						const givenName = this.getNodeParameter('givenName', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body: IDataObject = {
							names: [
								{
									familyName,
									givenName,
									middleName: '',
								},
							],
						};

						if (additionalFields.middleName) {
							//@ts-ignore
							body.names[0].middleName = additionalFields.middleName as string;
						}

						if (additionalFields.honorificPrefix) {
							//@ts-ignore
							body.names[0].honorificPrefix = additionalFields.honorificPrefix as string;
						}

						if (additionalFields.honorificSuffix) {
							//@ts-ignore
							body.names[0].honorificSuffix = additionalFields.honorificSuffix as string;
						}

						if (additionalFields.companyUi) {
							const companyValues = (additionalFields.companyUi as IDataObject).companyValues as IDataObject[];
							body.organizations = companyValues;
						}

						if (additionalFields.phoneUi) {
							const phoneValues = (additionalFields.phoneUi as IDataObject).phoneValues as IDataObject[];
							body.phoneNumbers = phoneValues;
						}

						if (additionalFields.addressesUi) {
							const addressesValues = (additionalFields.addressesUi as IDataObject).addressesValues as IDataObject[];
							body.addresses = addressesValues;
						}

						if (additionalFields.relationsUi) {
							const relationsValues = (additionalFields.relationsUi as IDataObject).relationsValues as IDataObject[];
							body.relations = relationsValues;
						}

						if (additionalFields.eventsUi) {
							const eventsValues = (additionalFields.eventsUi as IDataObject).eventsValues as IDataObject[];
							for (let i = 0; i < eventsValues.length; i++) {
								const [month, day, year] = moment(eventsValues[i].date as string).format('MM/DD/YYYY').split('/');
								eventsValues[i] = {
									date: {
										day,
										month,
										year,
									},
									type: eventsValues[i].type,
								};
							}
							body.events = eventsValues;
						}

						if (additionalFields.birthday) {
							const [month, day, year] = moment(additionalFields.birthday as string).format('MM/DD/YYYY').split('/');

							body.birthdays = [
								{
									date: {
										day,
										month,
										year,
									},
								},
							];
						}

						if (additionalFields.emailsUi) {
							const emailsValues = (additionalFields.emailsUi as IDataObject).emailsValues as IDataObject[];
							body.emailAddresses = emailsValues;
						}

						if (additionalFields.biographies) {
							body.biographies = [
								{
									value: additionalFields.biographies,
									contentType: 'TEXT_PLAIN',
								},
							];
						}

						if (additionalFields.customFieldsUi) {
							const customFieldsValues = (additionalFields.customFieldsUi as IDataObject).customFieldsValues as IDataObject[];
							body.userDefined = customFieldsValues;
						}

						if (additionalFields.group) {
							const memberships = (additionalFields.group as string[]).map((groupId: string) => {
								return {
									contactGroupMembership: {
										contactGroupResourceName: groupId,
									},
								};
							});

							body.memberships = memberships;
						}

						responseData = await googleApiRequest.call(
							this,
							'POST',
							`/people:createContact`,
							body,
							qs,
						);

						responseData.contactId = responseData.resourceName.split('/')[1];

					}
					//https://developers.google.com/people/api/rest/v1/people/deleteContact
					if (operation === 'delete') {
						const contactId = this.getNodeParameter('contactId', i) as string;
						responseData = await googleApiRequest.call(
							this,
							'DELETE',
							`/people/${contactId}:deleteContact`,
							{},
						);
						responseData = { success: true };
					}
					//https://developers.google.com/people/api/rest/v1/people/get
					if (operation === 'get') {
						const contactId = this.getNodeParameter('contactId', i) as string;
						const fields = this.getNodeParameter('fields', i) as string[];
						const rawData = this.getNodeParameter('rawData', i) as boolean;

						if (fields.includes('*')) {
							qs.personFields = allFields.join(',');
						} else {
							qs.personFields = (fields as string[]).join(',');
						}

						responseData = await googleApiRequest.call(
							this,
							'GET',
							`/people/${contactId}`,
							{},
							qs,
						);

						if (!rawData) {
							responseData = cleanData(responseData)[0];
						}

						responseData.contactId = responseData.resourceName.split('/')[1];
					}
					//https://developers.google.com/people/api/rest/v1/people.connections/list
					//https://developers.google.com/people/api/rest/v1/people/searchContacts
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const fields = this.getNodeParameter('fields', i) as string[];
						const options = this.getNodeParameter('options', i, {}) as IDataObject;
						const rawData = this.getNodeParameter('rawData', i) as boolean;
						const useQuery = this.getNodeParameter('useQuery', i) as boolean;

						const endpoint = (useQuery) ? ':searchContacts' : '/me/connections';

						if (useQuery) {
							qs.query = this.getNodeParameter('query', i) as string;
						}

						if (options.sortOrder) {
							qs.sortOrder = options.sortOrder as number;
						}

						if (fields.includes('*')) {
							qs.personFields = allFields.join(',');
						} else {
							qs.personFields = (fields as string[]).join(',');
						}

						if (useQuery) {
							qs.readMask = qs.personFields;
							delete qs.personFields;
						}

						if (returnAll) {
							responseData = await googleApiRequestAllItems.call(
								this,
								(useQuery) ? 'results' : 'connections',
								'GET',
								`/people${endpoint}`,
								{},
								qs,
							);

							if (useQuery) {
								responseData = responseData.map((result: IDataObject) => result.person);
							}

						} else {
							qs.pageSize = this.getNodeParameter('limit', i) as number;
							responseData = await googleApiRequest.call(
								this,
								'GET',
								`/people${endpoint}`,
								{},
								qs,
							);

							responseData = responseData.connections || responseData.results?.map((result: IDataObject) => result.person) || [];
						}

						if (!rawData) {
							responseData = cleanData(responseData);
						}

						for (let i = 0; i < responseData.length; i++) {
							responseData[i].contactId = responseData[i].resourceName.split('/')[1];
						}
					}
					//https://developers.google.com/people/api/rest/v1/people/updateContact
					if (operation === 'update') {
						const updatePersonFields = [];

						const contactId = this.getNodeParameter('contactId', i) as string;

						const fields = this.getNodeParameter('fields', i) as string[];

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						let etag;

						if (updateFields.etag) {

							etag = updateFields.etag as string;

						} else {

							const data = await googleApiRequest.call(
								this,
								'GET',
								`/people/${contactId}`,
								{},
								{ personFields: 'Names' },
							);

							etag = data.etag;

						}

						if (fields.includes('*')) {
							qs.personFields = allFields.join(',');
						} else {
							qs.personFields = (fields as string[]).join(',');
						}

						const body: IDataObject = {
							etag,
							names: [
								{},
							],
						};

						if (updateFields.givenName) {
							//@ts-ignore
							body.names[0].givenName = updateFields.givenName as string;
						}

						if (updateFields.familyName) {
							//@ts-ignore
							body.names[0].familyName = updateFields.familyName as string;
						}

						if (updateFields.middleName) {
							//@ts-ignore
							body.names[0].middleName = updateFields.middleName as string;
						}

						if (updateFields.honorificPrefix) {
							//@ts-ignore
							body.names[0].honorificPrefix = updateFields.honorificPrefix as string;
						}

						if (updateFields.honorificSuffix) {
							//@ts-ignore
							body.names[0].honorificSuffix = updateFields.honorificSuffix as string;
						}

						if (updateFields.companyUi) {
							const companyValues = (updateFields.companyUi as IDataObject).companyValues as IDataObject[];
							body.organizations = companyValues;
							updatePersonFields.push('organizations');
						}

						if (updateFields.phoneUi) {
							const phoneValues = (updateFields.phoneUi as IDataObject).phoneValues as IDataObject[];
							body.phoneNumbers = phoneValues;
							updatePersonFields.push('phoneNumbers');
						}

						if (updateFields.addressesUi) {
							const addressesValues = (updateFields.addressesUi as IDataObject).addressesValues as IDataObject[];
							body.addresses = addressesValues;
							updatePersonFields.push('addresses');
						}

						if (updateFields.relationsUi) {
							const relationsValues = (updateFields.relationsUi as IDataObject).relationsValues as IDataObject[];
							body.relations = relationsValues;
							updatePersonFields.push('relations');
						}

						if (updateFields.eventsUi) {
							const eventsValues = (updateFields.eventsUi as IDataObject).eventsValues as IDataObject[];
							for (let i = 0; i < eventsValues.length; i++) {
								const [month, day, year] = moment(eventsValues[i].date as string).format('MM/DD/YYYY').split('/');
								eventsValues[i] = {
									date: {
										day,
										month,
										year,
									},
									type: eventsValues[i].type,
								};
							}
							body.events = eventsValues;
							updatePersonFields.push('events');
						}

						if (updateFields.birthday) {
							const [month, day, year] = moment(updateFields.birthday as string).format('MM/DD/YYYY').split('/');

							body.birthdays = [
								{
									date: {
										day,
										month,
										year,
									},
								},
							];

							updatePersonFields.push('birthdays');
						}

						if (updateFields.emailsUi) {
							const emailsValues = (updateFields.emailsUi as IDataObject).emailsValues as IDataObject[];
							body.emailAddresses = emailsValues;
							updatePersonFields.push('emailAddresses');
						}

						if (updateFields.biographies) {
							body.biographies = [
								{
									value: updateFields.biographies,
									contentType: 'TEXT_PLAIN',
								},
							];
							updatePersonFields.push('biographies');
						}

						if (updateFields.customFieldsUi) {
							const customFieldsValues = (updateFields.customFieldsUi as IDataObject).customFieldsValues as IDataObject[];
							body.userDefined = customFieldsValues;
							updatePersonFields.push('userDefined');
						}

						if (updateFields.group) {
							const memberships = (updateFields.group as string[]).map((groupId: string) => {
								return {
									contactGroupMembership: {
										contactGroupResourceName: groupId,
									},
								};
							});

							body.memberships = memberships;
							updatePersonFields.push('memberships');
						}

						if ((body.names as IDataObject[]).length > 0) {
							updatePersonFields.push('names');
						}

						qs.updatePersonFields = updatePersonFields.join(',');

						responseData = await googleApiRequest.call(
							this,
							'PATCH',
							`/people/${contactId}:updateContact`,
							body,
							qs,
						);

						responseData.contactId = responseData.resourceName.split('/')[1];
					}
				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else if (responseData !== undefined) {
					returnData.push(responseData as IDataObject);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}

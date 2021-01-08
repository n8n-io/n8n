import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription
} from 'n8n-workflow';

import {
	listFields,
	listOperations,
} from './ListDescription';

import {
	contactFields,
	contactOperations
} from './ContactDescription';

import { sendgridApiRequest, sendgridApiRequestAllItems } from './GenericFunctions';

export class Sendgrid implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SendGrid',
		name: 'sendgrid',
		icon: 'file:sendgrid.png',
		group: ['transform'],
		version: 1,
		description: 'Consume Sendgrid API',
		defaults: {
			name: 'SendGrid',
			color: '#772244',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'sendgridApi',
				required: true,
			},
		],
		properties: [
			// Node properties which the user gets displayed and
			// can change on the node.
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: "Contact",
						value: "contact",
					},
					{
						name: "List",
						value: "list",
					},
				],
				default: 'list',
				required: true,
				description: 'Resource to consume',
			},
			...listOperations,
			...listFields,
			...contactOperations,
			...contactFields,
		],
	};

	methods ={
		loadOptions: {
			// Get custom fields to display to user so that they can select them easily
			async getCustomFields(this: ILoadOptionsFunctions,):Promise<INodePropertyOptions[]>{
				const returnData: INodePropertyOptions[] = [];
				const {custom_fields} = await sendgridApiRequest.call(this, '/marketing/field_definitions', 'GET', {}, {});
				for (const customField of custom_fields){
					returnData.push({
						name: customField.name,
						value: customField.id,
					});
				}
				return returnData;
			},
		// Get lists to display to user so that they can select them easily
		async getListIds(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
			const returnData: INodePropertyOptions[] = [];
			const lists = await sendgridApiRequestAllItems.call(this, `/marketing/lists`, 'GET', 'result', {}, {});
			for (const list of lists) {
				returnData.push({
					name: list.name,
					value: list.id,
				});
			}
			return returnData;

		},
		},
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const length = (items.length as unknown) as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			// https://sendgrid.com/docs/api-reference/
			if (resource === 'list') {
				if(operation === 'getAll'){
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					if (returnAll === true) {
						responseData = await sendgridApiRequestAllItems.call(this, `/marketing/lists`, 'GET', 'result', {}, qs);
					} else {
						qs.page_size = this.getNodeParameter('limit', i) as number;
						responseData = await sendgridApiRequest.call(this, `/marketing/lists`, 'GET', {}, qs);
						responseData = responseData.result;
					}
				}
				if(operation === 'get') {
					const listId = this.getNodeParameter('listId',i) as string;
					qs.contact_sample = this.getNodeParameter('contactSample', i) as boolean;
					responseData = await sendgridApiRequest.call(this, `/marketing/lists/${listId}`, 'GET', {}, qs);
				}
				if (operation === 'create') {
					const name = this.getNodeParameter('name',i) as string;
					responseData = await sendgridApiRequest.call(this, '/marketing/lists', 'POST', {name}, qs);
				}
				if(operation === 'delete') {
					const listId = this.getNodeParameter('listId',i) as string;
					qs.delete_contacts = this.getNodeParameter('deleteContacts', i) as boolean;
					const response = await sendgridApiRequest.call(this, `/marketing/lists/${listId}`, 'DELETE', {}, qs);
					responseData={success: true};
				}
				if(operation=== 'update'){
					const name = this.getNodeParameter('name',i) as string;
					const listId = this.getNodeParameter('listId',i) as string;
					responseData = await sendgridApiRequest.call(this, `/marketing/lists/${listId}`, 'PATCH', {name}, qs);
				}
			}
			if (resource === 'contact') {
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					if (returnAll === true) {
						responseData = await sendgridApiRequestAllItems.call(this, `/marketing/contacts`, 'GET', 'result', {}, qs);
					} else {
						qs.page_size = this.getNodeParameter('limit', i) as number;
						responseData = await sendgridApiRequest.call(this, `/marketing/contacts`, 'GET', {}, qs);
						responseData = responseData.result;
					}
				}
				if(operation === 'get') {
					const contactId = this.getNodeParameter('contactId',i) as string;
					responseData = await sendgridApiRequest.call(this, `/marketing/contacts/${contactId}`, 'GET', {}, qs);
				}
				if (operation === 'upsert') {
					const email = this.getNodeParameter('email',i) as string;
					const additionalFields = this.getNodeParameter(
						'additionalFields',
						i,
					) as IDataObject;
					const contacts: IDataObject = {
							email,
						};
					const body: IDataObject = {contacts:[contacts]};
					if(additionalFields.addressUi) {
						const addressValues = (additionalFields.addressUi as IDataObject).addressValues as IDataObject;
						const addressLine1 = addressValues.address1 as string;
						const addressLine2 = addressValues.address2 as string;
						if(addressLine2){
							Object.assign(contacts, {address_line_2:addressLine2});
						}
						Object.assign(contacts, {address_line_1:addressLine1});
					}
					if(additionalFields.city){
						const city = additionalFields.city as string;
						Object.assign(contacts,{city});
					}
					if(additionalFields.country){
						const country = additionalFields.country as string;
						Object.assign(contacts,{country});
					}
					if(additionalFields.firstName){
						const firstName = additionalFields.firstName as string;
						Object.assign(contacts,{first_name:firstName});
					}
					if(additionalFields.lastName){
						const lastName = additionalFields.lastName as string;
						Object.assign(contacts,{last_name:lastName});
					}
					if(additionalFields.postalCode){
						const postalCode = additionalFields.postalCode as string;
						Object.assign(contacts,{postal_code:postalCode});
					}
					if(additionalFields.stateProvinceRegion){
						const stateProvinceRegion = additionalFields.stateProvinceRegion as string;
						Object.assign(contacts,{state_province_region:stateProvinceRegion});
					}
					if(additionalFields.alternateEmails){
						const alternateEmails = ((additionalFields.alternateEmails as string).split(',') as string[]).filter(email => !!email);
						if(alternateEmails.length !== 0) {
							Object.assign(contacts, {alternate_emails:alternateEmails});
						}
					}
					if(additionalFields.listIdsUi){
						const listIdValues = (additionalFields.listIdsUi as IDataObject).listIdValues as IDataObject;
						const listIds = listIdValues.listIds as IDataObject[];
						Object.assign(body, {list_ids:listIds});
					}
					if(additionalFields.customFieldsUi) {
						const customFields = (additionalFields.customFieldsUi as IDataObject).customFieldValues as IDataObject[];
						if (customFields) {
							const data = customFields.reduce((obj, value) => Object.assign(obj, { [`${value.fieldId}`]: value.fieldValue }), {});
							Object.assign(contacts, {custom_fields:data});
						}
					}
					responseData = await sendgridApiRequest.call(this, '/marketing/contacts', 'PUT', body, qs);
				}
				if(operation === 'delete') {
					const deleteAll = this.getNodeParameter('deleteAll', i) as boolean;
					if(deleteAll === true) {
						qs.delete_all_contacts = 'true';
						responseData = await sendgridApiRequest.call(this, `/marketing/contacts`, 'DELETE', {}, qs);
					} else {
						 qs.ids = (this.getNodeParameter('ids',i) as string).replace(/\s/g, '');
						 responseData = await sendgridApiRequest.call(this, `/marketing/contacts`, 'DELETE', {}, qs);
					}
				}
			}
		}

		return [this.helpers.returnJsonArray(responseData)];

	}
}

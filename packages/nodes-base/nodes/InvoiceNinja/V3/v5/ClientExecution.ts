import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { invoiceNinjaApiRequest, invoiceNinjaApiRequestAllItems } from '../GenericFunctions';
import type { IClient, IClientContact } from './ClientInterface';

export const execute = async function (that: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = that.getInputData();
	const returnData: INodeExecutionData[] = [];
	const length = items.length;
	const qs: IDataObject = {};

	let responseData;

	const resource = that.getNodeParameter('resource', 0);
	const operation = that.getNodeParameter('operation', 0);
	if (resource !== 'client') throw new Error('Invalid Resource Execution Handler');

	for (let i = 0; i < length; i++) {
		//Routes: https://github.com/invoiceninja/invoiceninja/blob/v5-stable/routes/api.php or swagger documentation
		try {
			if (operation === 'create') {
				const additionalFields = that.getNodeParameter('additionalFields', i);
				const body: IClient = {};
				if (additionalFields.number) {
					body.number = additionalFields.number as string;
				}
				if (additionalFields.name) {
					body.name = additionalFields.name as string;
				}
				if (additionalFields.assignedUserId) {
					body.assigned_user_id = additionalFields.assignedUserId as string;
				}
				if (additionalFields.vatNumber) {
					body.vat_number = additionalFields.vatNumber as string;
				}
				if (additionalFields.phone) {
					body.phone = additionalFields.phone as string;
				}
				if (additionalFields.website) {
					body.website = additionalFields.website as string;
				}
				if (additionalFields.privateNotes) {
					body.private_notes = additionalFields.privateNotes as string;
				}
				if (additionalFields.publicNotes) {
					body.public_notes = additionalFields.publicNotes as string;
				}
				if (additionalFields.customValue1) {
					body.custom_value1 = additionalFields.customValue1 as string;
				}
				if (additionalFields.customValue2) {
					body.custom_value2 = additionalFields.customValue2 as string;
				}
				if (additionalFields.customValue3) {
					body.custom_value3 = additionalFields.customValue3 as string;
				}
				if (additionalFields.customValue4) {
					body.custom_value4 = additionalFields.customValue4 as string;
				}
				const AddressValue = (that.getNodeParameter('addressUi', i) as IDataObject)
					.AddressValue as IDataObject;
				if (AddressValue) {
					body.address1 = AddressValue.address1 as string;
					body.address2 = AddressValue.address2 as string;
					body.city = AddressValue.city as string;
					body.state = AddressValue.state as string;
					body.postal_code = AddressValue.postalCode as string;
					body.country_id = AddressValue.countryCode as string;
				}
				const shippingAddressValue = (that.getNodeParameter('shippingAddressUi', i) as IDataObject)
					.shippingAddressValue as IDataObject;
				if (shippingAddressValue) {
					body.shipping_address1 = shippingAddressValue.address1 as string;
					body.shipping_address2 = shippingAddressValue.address2 as string;
					body.shipping_city = shippingAddressValue.city as string;
					body.shipping_state = shippingAddressValue.state as string;
					body.shipping_postal_code = shippingAddressValue.postalCode as string;
					body.shipping_country_id = shippingAddressValue.countryCode as string;
				}
				const contactsValues = (that.getNodeParameter('contactsUi', i) as IDataObject)
					.contacstValues as IDataObject[];
				if (contactsValues) {
					const contacts: IClientContact[] = [];
					for (const contactValue of contactsValues) {
						const contact: IClientContact = {
							first_name: contactValue.firstName as string,
							last_name: contactValue.lastName as string,
							email: contactValue.email as string,
							phone: contactValue.phone as string,
							custom_value1: contactValue.customValue1 as string,
							custom_value2: contactValue.customValue2 as string,
							custom_value3: contactValue.customValue3 as string,
							custom_value4: contactValue.customValue4 as string,
							send_email: contactValue.sendEmail as boolean,
						};
						contacts.push(contact);
					}
					body.contacts = contacts;
				}
				responseData = await invoiceNinjaApiRequest.call(
					that,
					'POST',
					'/clients',
					body as IDataObject,
				);
				responseData = responseData.data;
			}
			if (operation === 'update') {
				const clientId = that.getNodeParameter('clientId', i) as string;
				const additionalFields = that.getNodeParameter('additionalFields', i);
				const body: IClient = {};
				if (additionalFields.number) {
					body.number = additionalFields.number as string;
				}
				if (additionalFields.name) {
					body.name = additionalFields.name as string;
				}
				if (additionalFields.assignedUserId) {
					body.assigned_user_id = additionalFields.assignedUserId as string;
				}
				if (additionalFields.vatNumber) {
					body.vat_number = additionalFields.vatNumber as string;
				}
				if (additionalFields.phone) {
					body.phone = additionalFields.phone as string;
				}
				if (additionalFields.website) {
					body.website = additionalFields.website as string;
				}
				if (additionalFields.privateNotes) {
					body.private_notes = additionalFields.privateNotes as string;
				}
				if (additionalFields.publicNotes) {
					body.public_notes = additionalFields.publicNotes as string;
				}
				if (additionalFields.customValue1) {
					body.custom_value1 = additionalFields.customValue1 as string;
				}
				if (additionalFields.customValue2) {
					body.custom_value2 = additionalFields.customValue2 as string;
				}
				if (additionalFields.customValue3) {
					body.custom_value3 = additionalFields.customValue3 as string;
				}
				if (additionalFields.customValue4) {
					body.custom_value4 = additionalFields.customValue4 as string;
				}
				const AddressValue = (that.getNodeParameter('addressUi', i) as IDataObject)
					.AddressValue as IDataObject;
				if (AddressValue) {
					body.address1 = AddressValue.address1 as string;
					body.address2 = AddressValue.address2 as string;
					body.city = AddressValue.city as string;
					body.state = AddressValue.state as string;
					body.postal_code = AddressValue.postalCode as string;
					body.country_id = AddressValue.countryCode as string;
				}
				const shippingAddressValue = (that.getNodeParameter('shippingAddressUi', i) as IDataObject)
					.shippingAddressValue as IDataObject;
				if (shippingAddressValue) {
					body.shipping_address1 = shippingAddressValue.address1 as string;
					body.shipping_address2 = shippingAddressValue.address2 as string;
					body.shipping_city = shippingAddressValue.city as string;
					body.shipping_state = shippingAddressValue.state as string;
					body.shipping_postal_code = shippingAddressValue.postalCode as string;
					body.shipping_country_id = shippingAddressValue.countryCode as string;
				}
				const contactsValues = (that.getNodeParameter('contactsUi', i) as IDataObject)
					.contacstValues as IDataObject[];
				if (contactsValues) {
					const contacts: IClientContact[] = [];
					for (const contactValue of contactsValues) {
						const contact: IClientContact = {
							first_name: contactValue.firstName as string,
							last_name: contactValue.lastName as string,
							email: contactValue.email as string,
							phone: contactValue.phone as string,
							custom_value1: contactValue.customValue1 as string,
							custom_value2: contactValue.customValue2 as string,
							custom_value3: contactValue.customValue3 as string,
							custom_value4: contactValue.customValue4 as string,
							send_email: contactValue.sendEmail as boolean,
						};
						contacts.push(contact);
					}
					body.contacts = contacts;
				}
				console.log(body)
				responseData = await invoiceNinjaApiRequest.call(
					that,
					'PUT',
					`/clients/${clientId}`,
					body as IDataObject,
				);
				responseData = responseData.data;
			}
			if (operation === 'get') {
				const clientId = that.getNodeParameter('clientId', i) as string;
				const include = that.getNodeParameter('include', i) as string[];
				if (include.length) {
					qs.include = include.toString();
				}
				responseData = await invoiceNinjaApiRequest.call(
					that,
					'GET',
					`/clients/${clientId}`,
					{},
					qs,
				);
				responseData = responseData.data;
			}
			if (operation === 'getAll') {
				const filters = that.getNodeParameter('filters', i);
				if (filters.filter) {
					qs.filter = filters.filter as string;
				}
				if (filters.clientId) {
					qs.client_id = filters.clientId as string;
				}
				if (filters.number) {
					qs.number = filters.number as string;
				}
				if (filters.name) {
					qs.name = filters.name as string;
				}
				if (filters.email) {
					qs.email = filters.email as string;
				}
				// no includes available
				// const include = that.getNodeParameter('include', i) as Array<string>;
				// if (include.length) {
				//     qs.include = include.toString() as string;
				// }
				const returnAll = that.getNodeParameter('returnAll', i);
				if (returnAll) {
					responseData = await invoiceNinjaApiRequestAllItems.call(
						that,
						'data',
						'GET',
						'/clients',
						{},
						qs,
					);
				} else {
					const perPage = that.getNodeParameter('perPage', i) as boolean;
					if (perPage) qs.per_page = perPage;
					responseData = await invoiceNinjaApiRequest.call(that, 'GET', '/clients', {}, qs);
					responseData = responseData.data;
				}
			}
			if (operation === 'delete') {
				const clientId = that.getNodeParameter('clientId', i) as string;
				responseData = await invoiceNinjaApiRequest.call(that, 'DELETE', `/clients/${clientId}`);
				responseData = responseData.data;
			}

			const executionData = that.helpers.constructExecutionMetaData(
				that.helpers.returnJsonArray(responseData),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		} catch (error) {
			if (that.continueOnFail()) {
				const executionErrorData = that.helpers.constructExecutionMetaData(
					that.helpers.returnJsonArray({ error: error.message }),
					{ itemData: { item: i } },
				);
				returnData.push(...executionErrorData);
				continue;
			}
			throw error;
		}
	}

	return that.prepareOutputData(returnData);
};

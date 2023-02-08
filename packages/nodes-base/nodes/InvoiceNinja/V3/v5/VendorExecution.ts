import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { invoiceNinjaApiRequest, invoiceNinjaApiRequestAllItems } from '../GenericFunctions';
import type { IVendor, IVendorContact } from './VendorInterface';

export const execute = async function (this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	const length = items.length;
	const qs: IDataObject = {};

	let responseData;

	const resource = this.getNodeParameter('resource', 0);
	const operation = this.getNodeParameter('operation', 0);
	if (resource !== 'vendor') throw new Error('Invalid Resource Execution Handler');

	for (let i = 0; i < length; i++) {
		//Routes: https://github.com/invoiceninja/invoiceninja/blob/v5-stable/routes/api.php or swagger documentation
		try {
			if (operation === 'create') {
				const additionalFields = this.getNodeParameter('additionalFields', i);
				const body: IVendor = {};
				if (additionalFields.assignedUserId) {
					body.assigned_user_id = additionalFields.assignedUserId as string;
				}
				if (additionalFields.name) {
					body.name = additionalFields.name as string;
				}
				if (additionalFields.website) {
					body.website = additionalFields.website as string;
				}
				if (additionalFields.phone) {
					body.phone = additionalFields.phone as string;
				}
				if (additionalFields.currencyId) {
					body.currency_id = additionalFields.currencyId as string;
				}
				if (additionalFields.vatNumber) {
					body.vat_number = additionalFields.vatNumber as string;
				}
				if (additionalFields.idNumber) {
					body.id_number = additionalFields.idNumber as string;
				}
				if (additionalFields.number) {
					body.number = additionalFields.number as string;
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
				const AddressValue = (this.getNodeParameter('addressUi', i) as IDataObject)
					.AddressValue as IDataObject;
				if (AddressValue) {
					body.address1 = AddressValue.address1 as string;
					body.address2 = AddressValue.address2 as string;
					body.city = AddressValue.city as string;
					body.state = AddressValue.state as string;
					body.postal_code = AddressValue.postalCode as string;
					body.country_id = AddressValue.countryId as string;
				}
				const contactsValues = (this.getNodeParameter('contactsUi', i) as IDataObject)
					.contactValues as IDataObject[];
				if (contactsValues) {
					const contacts: IVendorContact[] = [];
					for (const contactValue of contactsValues) {
						const contact: IVendorContact = {
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
					this,
					'POST',
					'/vendors',
					body as IDataObject,
				);
				responseData = responseData.data;
			}
			if (operation === 'update') {
				const vendorId = this.getNodeParameter('vendorId', i) as string;
				const additionalFields = this.getNodeParameter('additionalFields', i);
				const body: IVendor = {};
				if (additionalFields.assignedUserId) {
					body.assigned_user_id = additionalFields.assignedUserId as string;
				}
				if (additionalFields.name) {
					body.name = additionalFields.name as string;
				}
				if (additionalFields.website) {
					body.website = additionalFields.website as string;
				}
				if (additionalFields.phone) {
					body.phone = additionalFields.phone as string;
				}
				if (additionalFields.currencyId) {
					body.currency_id = additionalFields.currencyId as string;
				}
				if (additionalFields.vatNumber) {
					body.vat_number = additionalFields.vatNumber as string;
				}
				if (additionalFields.idNumber) {
					body.id_number = additionalFields.idNumber as string;
				}
				if (additionalFields.number) {
					body.number = additionalFields.number as string;
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
				const AddressValue = (this.getNodeParameter('addressUi', i) as IDataObject)
					.AddressValue as IDataObject;
				if (AddressValue) {
					body.address1 = AddressValue.address1 as string;
					body.address2 = AddressValue.address2 as string;
					body.city = AddressValue.city as string;
					body.state = AddressValue.state as string;
					body.postal_code = AddressValue.postalCode as string;
					body.country_id = AddressValue.countryId as string;
				}
				const contactsValues = (this.getNodeParameter('contactsUi', i) as IDataObject)
					.contactValues as IDataObject[];
				if (contactsValues) {
					const contacts: IVendorContact[] = [];
					for (const contactValue of contactsValues) {
						const contact: IVendorContact = {
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
					this,
					'PUT',
					`/vendors/${vendorId}`,
					body as IDataObject,
				);
				responseData = responseData.data;
			}
			if (operation === 'get') {
				const vendorId = this.getNodeParameter('vendorId', i) as string;
				// no include available
				// const include = this.getNodeParameter('include', i) as string[];
				// if (include.length) {
				// 	qs.include = include.toString();
				// }
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'GET',
					`/vendors/${vendorId}`,
					{},
					qs,
				);
				responseData = responseData.data;
			}
			if (operation === 'getAll') {
				const filters = this.getNodeParameter('filters', i);
				if (filters.filter) {
					qs.filter = filters.filter as string;
				}
				if (filters.number) {
					qs.number = filters.number as string;
				}
				// no include available
				// const include = this.getNodeParameter('include', i) as Array<string>;
				// if (include.length) {
				//     qs.include = include.toString() as string;
				// }
				const returnAll = this.getNodeParameter('returnAll', i);
				if (returnAll) {
					responseData = await invoiceNinjaApiRequestAllItems.call(
						this,
						'data',
						'GET',
						'/vendors',
						{},
						qs,
					);
				} else {
					const perPage = this.getNodeParameter('perPage', i) as boolean;
					if (perPage) qs.per_page = perPage;
					responseData = await invoiceNinjaApiRequest.call(this, 'GET', '/vendors', {}, qs);
					responseData = responseData.data;
				}
			}
			if (operation === 'delete') {
				const vendorId = this.getNodeParameter('vendorId', i) as string;
				responseData = await invoiceNinjaApiRequest.call(this, 'DELETE', `/vendors/${vendorId}`);
				responseData = responseData.data;
			}
			if (operation === 'action') {
				const vendorId = this.getNodeParameter('vendorId', i) as string;
				const action = this.getNodeParameter('action', i) as string;
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'POST',
					`/vendors/bulk`,
					{
						action,
						ids: [vendorId]
					}
				);
				responseData = responseData.data[0];
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
};

import moment from 'moment';
import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import {
	invoiceNinjaApiDownloadFile,
	invoiceNinjaApiRequest,
	invoiceNinjaApiRequestAllItems,
} from '../GenericFunctions';
import type { IClient, IClientContact } from './ClientInterface';

export const execute = async function (this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	const length = items.length;
	const qs: IDataObject = {};

	let responseData;

	const resource = this.getNodeParameter('resource', 0);
	const operation = this.getNodeParameter('operation', 0);
	if (resource !== 'client') throw new Error('Invalid Resource Execution Handler');

	for (let i = 0; i < length; i++) {
		//Routes: https://github.com/invoiceninja/invoiceninja/blob/v5-stable/routes/api.php or swagger documentation
		try {
			if (operation === 'create') {
				const additionalFields = this.getNodeParameter('additionalFields', i);
				const body: IClient = {};
				if (additionalFields.number !== undefined) {
					body.number = additionalFields.number as string;
				}
				if (additionalFields.idNumber !== undefined) {
					body.id_number = additionalFields.idNumber as string;
				}
				if (additionalFields.name !== undefined) {
					body.name = additionalFields.name as string;
				}
				if (additionalFields.sizeId !== undefined) {
					body.size_id = additionalFields.sizeId as string;
				}
				if (additionalFields.assignedUserId !== undefined) {
					body.assigned_user_id = additionalFields.assignedUserId as string;
				}
				if (additionalFields.vatNumber !== undefined) {
					body.vat_number = additionalFields.vatNumber as string;
				}
				if (additionalFields.phone !== undefined) {
					body.phone = additionalFields.phone as string;
				}
				if (additionalFields.website !== undefined) {
					body.website = additionalFields.website as string;
				}
				if (additionalFields.privateNotes !== undefined) {
					body.private_notes = additionalFields.privateNotes as string;
				}
				if (additionalFields.publicNotes !== undefined) {
					body.public_notes = additionalFields.publicNotes as string;
				}
				if (additionalFields.customValue1 !== undefined) {
					body.custom_value1 = additionalFields.customValue1 as string;
				}
				if (additionalFields.customValue2 !== undefined) {
					body.custom_value2 = additionalFields.customValue2 as string;
				}
				if (additionalFields.customValue3 !== undefined) {
					body.custom_value3 = additionalFields.customValue3 as string;
				}
				if (additionalFields.customValue4 !== undefined) {
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
				const shippingAddressValue = (this.getNodeParameter('shippingAddressUi', i) as IDataObject)
					.shippingAddressValue as IDataObject;
				if (shippingAddressValue) {
					body.shipping_address1 = shippingAddressValue.address1 as string;
					body.shipping_address2 = shippingAddressValue.address2 as string;
					body.shipping_city = shippingAddressValue.city as string;
					body.shipping_state = shippingAddressValue.state as string;
					body.shipping_postal_code = shippingAddressValue.postalCode as string;
					body.shipping_country_id = shippingAddressValue.countryId as string;
				}
				const contactsValues = (this.getNodeParameter('contactsUi', i) as IDataObject)
					.contactValues as IDataObject[];
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
					this,
					'POST',
					'/clients',
					body as IDataObject,
				);
				responseData = responseData.data;
			}
			if (operation === 'update') {
				const clientId = this.getNodeParameter('clientId', i) as string;
				const additionalFields = this.getNodeParameter('additionalFields', i);
				const body: IClient = {};
				if (additionalFields.number !== undefined) {
					body.number = additionalFields.number as string;
				}
				if (additionalFields.idNumber !== undefined) {
					body.id_number = additionalFields.idNumber as string;
				}
				if (additionalFields.name !== undefined) {
					body.name = additionalFields.name as string;
				}
				if (additionalFields.sizeId !== undefined) {
					body.size_id = additionalFields.sizeId as string;
				}
				if (additionalFields.assignedUserId !== undefined) {
					body.assigned_user_id = additionalFields.assignedUserId as string;
				}
				if (additionalFields.vatNumber !== undefined) {
					body.vat_number = additionalFields.vatNumber as string;
				}
				if (additionalFields.phone !== undefined) {
					body.phone = additionalFields.phone as string;
				}
				if (additionalFields.website !== undefined) {
					body.website = additionalFields.website as string;
				}
				if (additionalFields.privateNotes !== undefined) {
					body.private_notes = additionalFields.privateNotes as string;
				}
				if (additionalFields.publicNotes !== undefined) {
					body.public_notes = additionalFields.publicNotes as string;
				}
				if (additionalFields.customValue1 !== undefined) {
					body.custom_value1 = additionalFields.customValue1 as string;
				}
				if (additionalFields.customValue2 !== undefined) {
					body.custom_value2 = additionalFields.customValue2 as string;
				}
				if (additionalFields.customValue3 !== undefined) {
					body.custom_value3 = additionalFields.customValue3 as string;
				}
				if (additionalFields.customValue4 !== undefined) {
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
				const shippingAddressValue = (this.getNodeParameter('shippingAddressUi', i) as IDataObject)
					.shippingAddressValue as IDataObject;
				if (shippingAddressValue) {
					body.shipping_address1 = shippingAddressValue.address1 as string;
					body.shipping_address2 = shippingAddressValue.address2 as string;
					body.shipping_city = shippingAddressValue.city as string;
					body.shipping_state = shippingAddressValue.state as string;
					body.shipping_postal_code = shippingAddressValue.postalCode as string;
					body.shipping_country_id = shippingAddressValue.countryId as string;
				}
				const contactsValues = (this.getNodeParameter('contactsUi', i) as IDataObject)
					.contactValues as IDataObject[];
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
				console.log(body);
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'PUT',
					`/clients/${clientId}`,
					body as IDataObject,
				);
				responseData = responseData.data;
			}
			if (operation === 'get') {
				const clientId = this.getNodeParameter('clientId', i) as string;
				// no includes available
				// const include = this.getNodeParameter('include', i) as string[];
				// if (include.length) {
				// 	qs.include = include.toString();
				// }
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'GET',
					`/clients/${clientId}`,
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
						'/clients',
						{},
						qs,
					);
				} else {
					const perPage = this.getNodeParameter('perPage', i) as number;
					if (perPage) qs.per_page = perPage;
					responseData = await invoiceNinjaApiRequest.call(this, 'GET', '/clients', {}, qs);
					responseData = responseData.data;
				}
			}
			if (operation === 'delete') {
				const clientId = this.getNodeParameter('clientId', i) as string;
				responseData = await invoiceNinjaApiRequest.call(this, 'DELETE', `/clients/${clientId}`);
				responseData = responseData.data;
			}
			if (operation === 'action') {
				const clientId = this.getNodeParameter('clientId', i) as string;
				const action = this.getNodeParameter('action', i) as string;
				if (action === 'merge') {
					const mergeClientId = this.getNodeParameter('mergeClientId', i) as string;
					responseData = await invoiceNinjaApiRequest.call(
						this,
						'POST',
						`/clients/${clientId}/${mergeClientId}/merge`,
					);
					responseData = responseData.data;
				} else if (action === 'purge') {
					responseData = await invoiceNinjaApiRequest.call(
						this,
						'POST',
						`/clients/${clientId}/purge`,
						{},
						{},
						{
							usePassword: true,
						},
					);
					responseData = responseData.data;
				} else if (action === 'client_statement') {
					const startDate = this.getNodeParameter('startDate', i) as string;
					const endDate = this.getNodeParameter('endDate', i) as string;
					const showPaymentsTable = this.getNodeParameter('showPaymentsTable', i) as string;
					const showAgingTable = this.getNodeParameter('showAgingTable', i) as string;
					const sendEmail = this.getNodeParameter('sendEmail', i) as string;
					const body: IDataObject = {
						start_date: moment(startDate).format('YYYY-MM-DD'),
						end_date: moment(endDate).format('YYYY-MM-DD'),
						client_id: clientId,
						show_payments_table: showPaymentsTable,
						show_aging_table: showAgingTable,
					};
					if (sendEmail) {
						returnData.push({
							json: body,
							binary: {
								data: await this.helpers.prepareBinaryData(
									await invoiceNinjaApiDownloadFile.call(this, 'POST', '/client_statement', body, {
										send_email: sendEmail,
									}),
									'client_statement.pdf',
									'application/pdf',
								),
							},
						});
						continue;
					} else {
						responseData = await invoiceNinjaApiDownloadFile.call(
							this,
							'POST',
							'/client_statement',
							body,
							{
								send_email: sendEmail,
							},
						);
						responseData = responseData.data;
					}
				} else {
					responseData = await invoiceNinjaApiRequest.call(this, 'POST', '/clients/bulk', {
						action,
						ids: [clientId],
					});
					responseData = responseData.data[0];
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
};

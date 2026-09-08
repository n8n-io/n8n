import { capitalCase, pascalCase } from 'change-case';
import moment from 'moment-timezone';
import { NodeConnectionTypes } from 'n8n-workflow';
import { companyFields, companyOperations } from './CompanyDescription';
import { contactFields, contactOperations } from './ContactDescription';
import { contactNoteFields, contactNoteOperations } from './ContactNoteDescription';
import { contactTagFields, contactTagOperations } from './ContactTagDescription';
import { ecommerceOrderFields, ecommerceOrderOperations } from './EcommerceOrderDescripion';
import { ecommerceProductFields, ecommerceProductOperations } from './EcommerceProductDescription';
import { emailFields, emailOperations } from './EmailDescription';
import { fileFields, fileOperations } from './FileDescription';
import { keapApiRequest, keapApiRequestAllItems, keysToSnakeCase } from './GenericFunctions';
export class Keap {
    description = {
        displayName: 'Keap',
        name: 'keap',
        // eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
        icon: 'file:keap.png',
        group: ['input'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume Keap API',
        defaults: {
            name: 'Keap',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'keapOAuth2Api',
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
                        name: 'Company',
                        value: 'company',
                    },
                    {
                        name: 'Contact',
                        value: 'contact',
                    },
                    {
                        name: 'Contact Note',
                        value: 'contactNote',
                    },
                    {
                        name: 'Contact Tag',
                        value: 'contactTag',
                    },
                    {
                        name: 'Ecommerce Order',
                        value: 'ecommerceOrder',
                    },
                    {
                        name: 'Ecommerce Product',
                        value: 'ecommerceProduct',
                    },
                    {
                        name: 'Email',
                        value: 'email',
                    },
                    {
                        name: 'File',
                        value: 'file',
                    },
                ],
                default: 'company',
            },
            // COMPANY
            ...companyOperations,
            ...companyFields,
            // CONTACT
            ...contactOperations,
            ...contactFields,
            // CONTACT NOTE
            ...contactNoteOperations,
            ...contactNoteFields,
            // CONTACT TAG
            ...contactTagOperations,
            ...contactTagFields,
            // ECOMMERCE ORDER
            ...ecommerceOrderOperations,
            ...ecommerceOrderFields,
            // ECOMMERCE PRODUCT
            ...ecommerceProductOperations,
            ...ecommerceProductFields,
            // EMAIL
            ...emailOperations,
            ...emailFields,
            // FILE
            ...fileOperations,
            ...fileFields,
        ],
    };
    methods = {
        loadOptions: {
            // Get all the tags to display them to user so that they can
            // select them easily
            async getTags() {
                const returnData = [];
                const tags = await keapApiRequestAllItems.call(this, 'tags', 'GET', '/tags');
                for (const tag of tags) {
                    const tagName = tag.name;
                    const tagId = tag.id;
                    returnData.push({
                        name: tagName,
                        value: tagId,
                    });
                }
                return returnData;
            },
            // Get all the users to display them to user so that they can
            // select them easily
            async getUsers() {
                const returnData = [];
                const users = await keapApiRequestAllItems.call(this, 'users', 'GET', '/users');
                for (const user of users) {
                    const userName = user.given_name;
                    const userId = user.id;
                    returnData.push({
                        name: userName,
                        value: userId,
                    });
                }
                return returnData;
            },
            // Get all the countries to display them to user so that they can
            // select them easily
            async getCountries() {
                const returnData = [];
                const { countries } = await keapApiRequest.call(this, 'GET', '/locales/countries');
                for (const key of Object.keys(countries)) {
                    const countryName = countries[key];
                    const countryId = key;
                    returnData.push({
                        name: countryName,
                        value: countryId,
                    });
                }
                return returnData;
            },
            // Get all the provinces to display them to user so that they can
            // select them easily
            async getProvinces() {
                const countryCode = this.getCurrentNodeParameter('countryCode');
                const returnData = [];
                const { provinces } = await keapApiRequest.call(this, 'GET', `/locales/countries/${countryCode}/provinces`);
                for (const key of Object.keys(provinces)) {
                    const provinceName = provinces[key];
                    const provinceId = key;
                    returnData.push({
                        name: provinceName,
                        value: provinceId,
                    });
                }
                return returnData;
            },
            // Get all the contact types to display them to user so that they can
            // select them easily
            async getContactTypes() {
                const returnData = [];
                const types = await keapApiRequest.call(this, 'GET', '/setting/contact/optionTypes');
                for (const type of types.value.split(',')) {
                    const typeName = type;
                    const typeId = type;
                    returnData.push({
                        name: typeName,
                        value: typeId,
                    });
                }
                return returnData;
            },
            // Get all the timezones to display them to user so that they can
            // select them easily
            async getTimezones() {
                const returnData = [];
                for (const timezone of moment.tz.names()) {
                    const timezoneName = timezone;
                    const timezoneId = timezone;
                    returnData.push({
                        name: timezoneName,
                        value: timezoneId,
                    });
                }
                return returnData;
            },
        },
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const length = items.length;
        const qs = {};
        let responseData;
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < length; i++) {
            if (resource === 'company') {
                //https://developer.keap.com/docs/rest/#!/Company/createCompanyUsingPOST
                if (operation === 'create') {
                    const addresses = this.getNodeParameter('addressesUi', i)
                        .addressesValues;
                    const faxes = this.getNodeParameter('faxesUi', i)
                        .faxesValues;
                    const phones = this.getNodeParameter('phonesUi', i)
                        .phonesValues;
                    const companyName = this.getNodeParameter('companyName', i);
                    const additionalFields = this.getNodeParameter('additionalFields', i);
                    const body = {
                        company_name: companyName,
                    };
                    keysToSnakeCase(additionalFields);
                    Object.assign(body, additionalFields);
                    if (addresses) {
                        body.address = keysToSnakeCase(addresses)[0];
                    }
                    if (faxes) {
                        body.fax_number = faxes[0];
                    }
                    if (phones) {
                        body.phone_number = phones[0];
                    }
                    responseData = await keapApiRequest.call(this, 'POST', '/companies', body);
                }
                //https://developer.infusionsoft.com/docs/rest/#!/Company/listCompaniesUsingGET
                if (operation === 'getAll') {
                    const returnAll = this.getNodeParameter('returnAll', i);
                    const options = this.getNodeParameter('options', i);
                    keysToSnakeCase(options);
                    Object.assign(qs, options);
                    if (qs.fields) {
                        qs.optional_properties = qs.fields;
                        delete qs.fields;
                    }
                    if (returnAll) {
                        responseData = await keapApiRequestAllItems.call(this, 'companies', 'GET', '/companies', {}, qs);
                    }
                    else {
                        qs.limit = this.getNodeParameter('limit', i);
                        responseData = await keapApiRequest.call(this, 'GET', '/companies', {}, qs);
                        responseData = responseData.companies;
                    }
                }
            }
            if (resource === 'contact') {
                //https://developer.infusionsoft.com/docs/rest/#!/Contact/createOrUpdateContactUsingPUT
                if (operation === 'upsert') {
                    const duplicateOption = this.getNodeParameter('duplicateOption', i);
                    const addresses = this.getNodeParameter('addressesUi', i)
                        .addressesValues;
                    const emails = this.getNodeParameter('emailsUi', i)
                        .emailsValues;
                    const faxes = this.getNodeParameter('faxesUi', i)
                        .faxesValues;
                    const socialAccounts = this.getNodeParameter('socialAccountsUi', i)
                        .socialAccountsValues;
                    const phones = this.getNodeParameter('phonesUi', i)
                        .phonesValues;
                    const additionalFields = this.getNodeParameter('additionalFields', i);
                    const body = {
                        duplicate_option: pascalCase(duplicateOption),
                    };
                    if (additionalFields.anniversary) {
                        body.anniversary = additionalFields.anniversary;
                    }
                    if (additionalFields.contactType) {
                        body.contact_type = additionalFields.contactType;
                    }
                    if (additionalFields.familyName) {
                        body.family_name = additionalFields.familyName;
                    }
                    if (additionalFields.givenName) {
                        body.given_name = additionalFields.givenName;
                    }
                    if (additionalFields.jobTitle) {
                        body.job_title = additionalFields.jobTitle;
                    }
                    if (additionalFields.leadSourceId) {
                        body.lead_source_id = additionalFields.leadSourceId;
                    }
                    if (additionalFields.middleName) {
                        body.middle_name = additionalFields.middleName;
                    }
                    if (additionalFields.middleName) {
                        body.middle_name = additionalFields.middleName;
                    }
                    if (additionalFields.OptInReason) {
                        body.opt_in_reason = additionalFields.OptInReason;
                    }
                    if (additionalFields.ownerId) {
                        body.owner_id = additionalFields.ownerId;
                    }
                    if (additionalFields.preferredLocale) {
                        body.preferred_locale = additionalFields.preferredLocale;
                    }
                    if (additionalFields.preferredName) {
                        body.preferred_name = additionalFields.preferredName;
                    }
                    if (additionalFields.sourceType) {
                        body.source_type = additionalFields.sourceType;
                    }
                    if (additionalFields.spouseName) {
                        body.spouse_name = additionalFields.spouseName;
                    }
                    if (additionalFields.timezone) {
                        body.time_zone = additionalFields.timezone;
                    }
                    if (additionalFields.website) {
                        body.website = additionalFields.website;
                    }
                    if (additionalFields.ipAddress) {
                        body.origin = { ip_address: additionalFields.ipAddress };
                    }
                    if (additionalFields.companyId) {
                        body.company = { id: additionalFields.companyId };
                    }
                    if (additionalFields.optInReason) {
                        body.opt_in_reason = additionalFields.optInReason;
                    }
                    if (addresses) {
                        body.addresses = keysToSnakeCase(addresses);
                    }
                    if (emails) {
                        body.email_addresses = emails;
                    }
                    if (faxes) {
                        body.fax_numbers = faxes;
                    }
                    if (socialAccounts) {
                        body.social_accounts = socialAccounts;
                    }
                    if (phones) {
                        body.phone_numbers = phones;
                    }
                    responseData = await keapApiRequest.call(this, 'PUT', '/contacts', body);
                }
                //https://developer.infusionsoft.com/docs/rest/#!/Contact/deleteContactUsingDELETE
                if (operation === 'delete') {
                    const contactId = parseInt(this.getNodeParameter('contactId', i), 10);
                    responseData = await keapApiRequest.call(this, 'DELETE', `/contacts/${contactId}`);
                    responseData = { success: true };
                }
                //https://developer.infusionsoft.com/docs/rest/#!/Contact/getContactUsingGET
                if (operation === 'get') {
                    const contactId = parseInt(this.getNodeParameter('contactId', i), 10);
                    const options = this.getNodeParameter('options', i);
                    if (options.fields) {
                        qs.optional_properties = options.fields;
                    }
                    responseData = await keapApiRequest.call(this, 'GET', `/contacts/${contactId}`, {}, qs);
                }
                //https://developer.infusionsoft.com/docs/rest/#!/Contact/listContactsUsingGET
                if (operation === 'getAll') {
                    const returnAll = this.getNodeParameter('returnAll', i);
                    const options = this.getNodeParameter('options', i);
                    if (options.email) {
                        qs.email = options.email;
                    }
                    if (options.givenName) {
                        qs.given_name = options.givenName;
                    }
                    if (options.familyName) {
                        qs.family_name = options.familyName;
                    }
                    if (options.order) {
                        qs.order = options.order;
                    }
                    if (options.orderDirection) {
                        qs.order_direction = options.orderDirection;
                    }
                    if (options.since) {
                        qs.since = options.since;
                    }
                    if (options.until) {
                        qs.until = options.until;
                    }
                    if (returnAll) {
                        responseData = await keapApiRequestAllItems.call(this, 'contacts', 'GET', '/contacts', {}, qs);
                    }
                    else {
                        qs.limit = this.getNodeParameter('limit', i);
                        responseData = await keapApiRequest.call(this, 'GET', '/contacts', {}, qs);
                        responseData = responseData.contacts;
                    }
                }
            }
            if (resource === 'contactNote') {
                //https://developer.infusionsoft.com/docs/rest/#!/Note/createNoteUsingPOST
                if (operation === 'create') {
                    const userId = this.getNodeParameter('userId', i);
                    const contactId = parseInt(this.getNodeParameter('contactId', i), 10);
                    const additionalFields = this.getNodeParameter('additionalFields', i);
                    const body = {
                        user_id: userId,
                        contact_id: contactId,
                    };
                    keysToSnakeCase(additionalFields);
                    if (additionalFields.type) {
                        additionalFields.type = pascalCase(additionalFields.type);
                    }
                    Object.assign(body, additionalFields);
                    responseData = await keapApiRequest.call(this, 'POST', '/notes', body);
                }
                //https://developer.infusionsoft.com/docs/rest/#!/Note/deleteNoteUsingDELETE
                if (operation === 'delete') {
                    const noteId = this.getNodeParameter('noteId', i);
                    responseData = await keapApiRequest.call(this, 'DELETE', `/notes/${noteId}`);
                    responseData = { success: true };
                }
                //https://developer.infusionsoft.com/docs/rest/#!/Note/getNoteUsingGET
                if (operation === 'get') {
                    const noteId = this.getNodeParameter('noteId', i);
                    responseData = await keapApiRequest.call(this, 'GET', `/notes/${noteId}`);
                }
                //https://developer.infusionsoft.com/docs/rest/#!/Note/listNotesUsingGET
                if (operation === 'getAll') {
                    const returnAll = this.getNodeParameter('returnAll', i);
                    const filters = this.getNodeParameter('filters', i);
                    keysToSnakeCase(filters);
                    Object.assign(qs, filters);
                    if (returnAll) {
                        responseData = await keapApiRequestAllItems.call(this, 'notes', 'GET', '/notes', {}, qs);
                    }
                    else {
                        qs.limit = this.getNodeParameter('limit', i);
                        responseData = await keapApiRequest.call(this, 'GET', '/notes', {}, qs);
                        responseData = responseData.notes;
                    }
                }
                //https://developer.infusionsoft.com/docs/rest/#!/Note/updatePropertiesOnNoteUsingPATCH
                if (operation === 'update') {
                    const noteId = this.getNodeParameter('noteId', i);
                    const additionalFields = this.getNodeParameter('additionalFields', i);
                    const body = {};
                    keysToSnakeCase(additionalFields);
                    if (additionalFields.type) {
                        additionalFields.type = pascalCase(additionalFields.type);
                    }
                    Object.assign(body, additionalFields);
                    responseData = await keapApiRequest.call(this, 'PATCH', `/notes/${noteId}`, body);
                }
            }
            if (resource === 'contactTag') {
                //https://developer.infusionsoft.com/docs/rest/#!/Contact/applyTagsToContactIdUsingPOST
                if (operation === 'create') {
                    const contactId = parseInt(this.getNodeParameter('contactId', i), 10);
                    const tagIds = this.getNodeParameter('tagIds', i);
                    const body = {
                        tagIds,
                    };
                    responseData = await keapApiRequest.call(this, 'POST', `/contacts/${contactId}/tags`, body);
                }
                //https://developer.infusionsoft.com/docs/rest/#!/Contact/removeTagsFromContactUsingDELETE_1
                if (operation === 'delete') {
                    const contactId = parseInt(this.getNodeParameter('contactId', i), 10);
                    const tagIds = this.getNodeParameter('tagIds', i);
                    qs.ids = tagIds;
                    responseData = await keapApiRequest.call(this, 'DELETE', `/contacts/${contactId}/tags`, {}, qs);
                    responseData = { success: true };
                }
                //https://developer.infusionsoft.com/docs/rest/#!/Contact/listAppliedTagsUsingGET
                if (operation === 'getAll') {
                    const returnAll = this.getNodeParameter('returnAll', i);
                    const contactId = parseInt(this.getNodeParameter('contactId', i), 10);
                    if (returnAll) {
                        responseData = await keapApiRequestAllItems.call(this, 'tags', 'GET', `/contacts/${contactId}/tags`, {}, qs);
                    }
                    else {
                        qs.limit = this.getNodeParameter('limit', i);
                        responseData = await keapApiRequest.call(this, 'GET', `/contacts/${contactId}/tags`, {}, qs);
                        responseData = responseData.tags;
                    }
                }
            }
            if (resource === 'ecommerceOrder') {
                //https://developer.infusionsoft.com/docs/rest/#!/E-Commerce/createOrderUsingPOST
                if (operation === 'create') {
                    const contactId = parseInt(this.getNodeParameter('contactId', i), 10);
                    const orderDate = this.getNodeParameter('orderDate', i);
                    const orderTitle = this.getNodeParameter('orderTitle', i);
                    const orderType = this.getNodeParameter('orderType', i);
                    const orderItems = this.getNodeParameter('orderItemsUi', i)
                        .orderItemsValues;
                    const shippingAddress = this.getNodeParameter('addressUi', i)
                        .addressValues;
                    const additionalFields = this.getNodeParameter('additionalFields', i);
                    const body = {
                        contact_id: contactId,
                        order_date: orderDate,
                        order_title: orderTitle,
                        order_type: pascalCase(orderType),
                    };
                    if (additionalFields.promoCodes) {
                        additionalFields.promoCodes = additionalFields.promoCodes.split(',');
                    }
                    keysToSnakeCase(additionalFields);
                    Object.assign(body, additionalFields);
                    body.order_items = keysToSnakeCase(orderItems);
                    if (shippingAddress) {
                        body.shipping_address = keysToSnakeCase(shippingAddress)[0];
                    }
                    responseData = await keapApiRequest.call(this, 'POST', '/orders', body);
                }
                //https://developer.infusionsoft.com/docs/rest/#!/E-Commerce/deleteOrderUsingDELETE
                if (operation === 'delete') {
                    const orderId = parseInt(this.getNodeParameter('orderId', i), 10);
                    responseData = await keapApiRequest.call(this, 'DELETE', `/orders/${orderId}`);
                    responseData = { success: true };
                }
                //https://developer.infusionsoft.com/docs/rest/#!/E-Commerce/getOrderUsingGET
                if (operation === 'get') {
                    const orderId = parseInt(this.getNodeParameter('orderId', i), 10);
                    responseData = await keapApiRequest.call(this, 'GET', `/orders/${orderId}`);
                }
                //https://developer.infusionsoft.com/docs/rest/#!/E-Commerce/listOrdersUsingGET
                if (operation === 'getAll') {
                    const returnAll = this.getNodeParameter('returnAll', i);
                    const options = this.getNodeParameter('options', i);
                    keysToSnakeCase(options);
                    Object.assign(qs, options);
                    if (returnAll) {
                        responseData = await keapApiRequestAllItems.call(this, 'orders', 'GET', '/orders', {}, qs);
                    }
                    else {
                        qs.limit = this.getNodeParameter('limit', i);
                        responseData = await keapApiRequest.call(this, 'GET', '/orders', {}, qs);
                        responseData = responseData.orders;
                    }
                }
            }
            if (resource === 'ecommerceProduct') {
                //https://developer.infusionsoft.com/docs/rest/#!/Product/createProductUsingPOST
                if (operation === 'create') {
                    const productName = this.getNodeParameter('productName', i);
                    const additionalFields = this.getNodeParameter('additionalFields', i);
                    const body = {
                        product_name: productName,
                    };
                    keysToSnakeCase(additionalFields);
                    Object.assign(body, additionalFields);
                    responseData = await keapApiRequest.call(this, 'POST', '/products', body);
                }
                //https://developer.infusionsoft.com/docs/rest/#!/Product/deleteProductUsingDELETE
                if (operation === 'delete') {
                    const productId = this.getNodeParameter('productId', i);
                    responseData = await keapApiRequest.call(this, 'DELETE', `/products/${productId}`);
                    responseData = { success: true };
                }
                //https://developer.infusionsoft.com/docs/rest/#!/Product/retrieveProductUsingGET
                if (operation === 'get') {
                    const productId = this.getNodeParameter('productId', i);
                    responseData = await keapApiRequest.call(this, 'GET', `/products/${productId}`);
                }
                //https://developer.infusionsoft.com/docs/rest/#!/Product/listProductsUsingGET
                if (operation === 'getAll') {
                    const returnAll = this.getNodeParameter('returnAll', i);
                    const filters = this.getNodeParameter('filters', i);
                    keysToSnakeCase(filters);
                    Object.assign(qs, filters);
                    if (returnAll) {
                        responseData = await keapApiRequestAllItems.call(this, 'products', 'GET', '/products', {}, qs);
                    }
                    else {
                        qs.limit = this.getNodeParameter('limit', i);
                        responseData = await keapApiRequest.call(this, 'GET', '/products', {}, qs);
                        responseData = responseData.products;
                    }
                }
            }
            if (resource === 'email') {
                //https://developer.infusionsoft.com/docs/rest/#!/Email/createEmailUsingPOST
                if (operation === 'createRecord') {
                    const sentFromAddress = this.getNodeParameter('sentFromAddress', i);
                    const sendToAddress = this.getNodeParameter('sentToAddress', i);
                    const additionalFields = this.getNodeParameter('additionalFields', i);
                    const body = {
                        sent_to_address: sendToAddress,
                        sent_from_address: sentFromAddress,
                    };
                    Object.assign(body, additionalFields);
                    keysToSnakeCase(body);
                    responseData = await keapApiRequest.call(this, 'POST', '/emails', body);
                }
                //https://developer.infusionsoft.com/docs/rest/#!/Email/deleteEmailUsingDELETE
                if (operation === 'deleteRecord') {
                    const emailRecordId = parseInt(this.getNodeParameter('emailRecordId', i), 10);
                    responseData = await keapApiRequest.call(this, 'DELETE', `/emails/${emailRecordId}`);
                    responseData = { success: true };
                }
                //https://developer.infusionsoft.com/docs/rest/#!/Email/listEmailsUsingGET
                if (operation === 'getAll') {
                    const returnAll = this.getNodeParameter('returnAll', i);
                    const filters = this.getNodeParameter('filters', i);
                    keysToSnakeCase(filters);
                    Object.assign(qs, filters);
                    if (returnAll) {
                        responseData = await keapApiRequestAllItems.call(this, 'emails', 'GET', '/emails', {}, qs);
                    }
                    else {
                        qs.limit = this.getNodeParameter('limit', i);
                        responseData = await keapApiRequest.call(this, 'GET', '/emails', {}, qs);
                        responseData = responseData.emails;
                    }
                }
                //https://developer.infusionsoft.com/docs/rest/#!/Email/deleteEmailUsingDELETE
                if (operation === 'send') {
                    const userId = this.getNodeParameter('userId', i);
                    const contactIds = this.getNodeParameter('contactIds', i)
                        .split(',')
                        .map((e) => parseInt(e, 10));
                    const subject = this.getNodeParameter('subject', i);
                    const additionalFields = this.getNodeParameter('additionalFields', i);
                    const body = {
                        user_id: userId,
                        contacts: contactIds,
                        subject,
                    };
                    keysToSnakeCase(additionalFields);
                    Object.assign(body, additionalFields);
                    const attachmentsUi = this.getNodeParameter('attachmentsUi', i);
                    let attachments = [];
                    if (attachmentsUi) {
                        if (attachmentsUi.attachmentsValues) {
                            keysToSnakeCase(attachmentsUi.attachmentsValues);
                            attachments = attachmentsUi.attachmentsValues;
                        }
                        const attachmentsBinary = attachmentsUi.attachmentsBinary;
                        if (attachmentsBinary?.length) {
                            for (const { property } of attachmentsBinary) {
                                const binaryData = this.helpers.assertBinaryData(i, property);
                                attachments.push({
                                    file_data: binaryData.data,
                                    file_name: binaryData.fileName,
                                });
                            }
                        }
                        body.attachments = attachments;
                    }
                    responseData = await keapApiRequest.call(this, 'POST', '/emails/queue', body);
                    responseData = { success: true };
                }
            }
            if (resource === 'file') {
                //https://developer.infusionsoft.com/docs/rest/#!/File/deleteFileUsingDELETE
                if (operation === 'delete') {
                    const fileId = parseInt(this.getNodeParameter('fileId', i), 10);
                    responseData = await keapApiRequest.call(this, 'DELETE', `/files/${fileId}`);
                    responseData = { success: true };
                }
                //https://developer.infusionsoft.com/docs/rest/#!/File/listFilesUsingGET
                if (operation === 'getAll') {
                    const returnAll = this.getNodeParameter('returnAll', i);
                    const filters = this.getNodeParameter('filters', i);
                    keysToSnakeCase(filters);
                    Object.assign(qs, filters);
                    if (qs.permission) {
                        qs.permission = qs.permission.toUpperCase();
                    }
                    if (qs.type) {
                        qs.type = capitalCase(qs.type);
                    }
                    if (qs.viewable) {
                        qs.viewable = qs.viewable.toUpperCase();
                    }
                    if (returnAll) {
                        responseData = await keapApiRequestAllItems.call(this, 'files', 'GET', '/files', {}, qs);
                    }
                    else {
                        qs.limit = this.getNodeParameter('limit', i);
                        responseData = await keapApiRequest.call(this, 'GET', '/files', {}, qs);
                        responseData = responseData.files;
                    }
                }
                //https://developer.infusionsoft.com/docs/rest/#!/File/createFileUsingPOST
                if (operation === 'upload') {
                    const fileAssociation = this.getNodeParameter('fileAssociation', i);
                    const isPublic = this.getNodeParameter('isPublic', i);
                    const body = {
                        is_public: isPublic,
                        file_association: fileAssociation.toUpperCase(),
                    };
                    if (fileAssociation === 'contact') {
                        const contactId = parseInt(this.getNodeParameter('contactId', i), 10);
                        body.contact_id = contactId;
                    }
                    if (this.getNodeParameter('binaryData', i)) {
                        const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
                        const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
                        body.file_data = binaryData.data;
                        body.file_name = binaryData.fileName;
                    }
                    else {
                        const fileName = this.getNodeParameter('fileName', i);
                        const fileData = this.getNodeParameter('fileData', i);
                        body.file_name = fileName;
                        body.file_data = fileData;
                    }
                    responseData = await keapApiRequest.call(this, 'POST', '/files', body);
                }
            }
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
            returnData.push(...executionData);
        }
        return [returnData];
    }
}
//# sourceMappingURL=Keap.node.js.map
import { snakeCase } from 'change-case';
import { NodeConnectionTypes, NodeApiError, NodeOperationError } from 'n8n-workflow';
import { campaignContactFields, campaignContactOperations } from './CampaignContactDescription';
import { companyContactFields, companyContactOperations } from './CompanyContactDescription';
import { companyFields, companyOperations } from './CompanyDescription';
import { contactFields, contactOperations } from './ContactDescription';
import { contactSegmentFields, contactSegmentOperations } from './ContactSegmentDescription';
import { mauticApiRequest, mauticApiRequestAllItems, validateJSON } from './GenericFunctions';
import { segmentEmailFields, segmentEmailOperations } from './SegmentEmailDescription';
export class Mautic {
    description = {
        displayName: 'Mautic',
        name: 'mautic',
        icon: 'file:mautic.svg',
        group: ['output'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume Mautic API',
        defaults: {
            name: 'Mautic',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'mauticApi',
                required: true,
                displayOptions: {
                    show: {
                        authentication: ['credentials'],
                    },
                },
            },
            {
                name: 'mauticOAuth2Api',
                required: true,
                displayOptions: {
                    show: {
                        authentication: ['oAuth2'],
                    },
                },
            },
        ],
        properties: [
            {
                displayName: 'Authentication',
                name: 'authentication',
                type: 'options',
                options: [
                    {
                        name: 'Credentials',
                        value: 'credentials',
                    },
                    {
                        name: 'OAuth2',
                        value: 'oAuth2',
                    },
                ],
                default: 'credentials',
            },
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Campaign Contact',
                        value: 'campaignContact',
                        description: 'Add/remove contacts to/from a campaign',
                    },
                    {
                        name: 'Company',
                        value: 'company',
                        description: 'Create or modify a company',
                    },
                    {
                        name: 'Company Contact',
                        value: 'companyContact',
                        description: 'Add/remove contacts to/from a company',
                    },
                    {
                        name: 'Contact',
                        value: 'contact',
                        description: 'Create & modify contacts',
                    },
                    {
                        name: 'Contact Segment',
                        value: 'contactSegment',
                        description: 'Add/remove contacts to/from a segment',
                    },
                    {
                        name: 'Segment Email',
                        value: 'segmentEmail',
                        description: 'Send an email',
                    },
                ],
                default: 'contact',
            },
            ...companyOperations,
            ...companyFields,
            ...contactOperations,
            ...contactFields,
            ...contactSegmentOperations,
            ...contactSegmentFields,
            ...campaignContactOperations,
            ...campaignContactFields,
            ...companyContactOperations,
            ...companyContactFields,
            ...segmentEmailOperations,
            ...segmentEmailFields,
        ],
    };
    methods = {
        loadOptions: {
            // Get all the available companies to display them to user so that they can
            // select them easily
            async getCompanies() {
                const returnData = [];
                const companies = await mauticApiRequestAllItems.call(this, 'companies', 'GET', '/companies');
                for (const company of companies) {
                    returnData.push({
                        name: company.fields.all.companyname,
                        value: company.fields.all.companyname,
                    });
                }
                return returnData;
            },
            // Get all the available tags to display them to user so that they can
            // select them easily
            async getTags() {
                const returnData = [];
                const tags = await mauticApiRequestAllItems.call(this, 'tags', 'GET', '/tags');
                for (const tag of tags) {
                    returnData.push({
                        name: tag.tag,
                        value: tag.tag,
                    });
                }
                return returnData;
            },
            // Get all the available stages to display them to user so that they can
            // select them easily
            async getStages() {
                const returnData = [];
                const stages = await mauticApiRequestAllItems.call(this, 'stages', 'GET', '/stages');
                for (const stage of stages) {
                    returnData.push({
                        name: stage.name,
                        value: stage.id,
                    });
                }
                return returnData;
            },
            // Get all the available company fields to display them to user so that they can
            // select them easily
            async getCompanyFields() {
                const returnData = [];
                const fields = await mauticApiRequestAllItems.call(this, 'fields', 'GET', '/fields/company');
                for (const field of fields) {
                    returnData.push({
                        name: field.label,
                        value: field.alias,
                    });
                }
                return returnData;
            },
            async getIndustries() {
                const returnData = [];
                const fields = await mauticApiRequestAllItems.call(this, 'fields', 'GET', '/fields/company');
                for (const field of fields) {
                    if (field.alias === 'companyindustry') {
                        for (const { label, value } of field.properties.list) {
                            returnData.push({
                                name: label,
                                value,
                            });
                        }
                    }
                }
                return returnData;
            },
            // Get all the available contact fields to display them to user so that they can
            // select them easily
            async getContactFields() {
                const returnData = [];
                const fields = await mauticApiRequestAllItems.call(this, 'fields', 'GET', '/fields/contact');
                for (const field of fields) {
                    returnData.push({
                        name: field.label,
                        value: field.alias,
                    });
                }
                return returnData;
            },
            // Get all the available segments to display them to user so that they can
            // select them easily
            async getSegments() {
                const returnData = [];
                const segments = await mauticApiRequestAllItems.call(this, 'lists', 'GET', '/segments');
                for (const segment of segments) {
                    returnData.push({
                        name: segment.name,
                        value: segment.id,
                    });
                }
                return returnData;
            },
            // Get all the available campaings to display them to user so that they can
            // select them easily
            async getCampaigns() {
                const returnData = [];
                const campaings = await mauticApiRequestAllItems.call(this, 'campaigns', 'GET', '/campaigns');
                for (const campaign of campaings) {
                    returnData.push({
                        name: campaign.name,
                        value: campaign.id,
                    });
                }
                return returnData;
            },
            // Get all the available emails to display them to user so that they can
            // select them easily
            async getEmails() {
                const returnData = [];
                const emails = await mauticApiRequestAllItems.call(this, 'emails', 'GET', '/emails');
                for (const email of emails) {
                    returnData.push({
                        name: email.name,
                        value: email.id,
                    });
                }
                return returnData;
            },
            // Get all the available list / segment emails to display them to user so that they can
            // select them easily
            async getSegmentEmails() {
                const returnData = [];
                const emails = await mauticApiRequestAllItems.call(this, 'emails', 'GET', '/emails');
                for (const email of emails) {
                    if (email.emailType === 'list') {
                        returnData.push({
                            name: email.name,
                            value: email.id,
                        });
                    }
                }
                return returnData;
            },
            // Get all the available campaign / template emails to display them to user so that they can
            // select them easily
            async getCampaignEmails() {
                const returnData = [];
                const emails = await mauticApiRequestAllItems.call(this, 'emails', 'GET', '/emails');
                for (const email of emails) {
                    if (email.emailType === 'template') {
                        returnData.push({
                            name: email.name,
                            value: email.id,
                        });
                    }
                }
                return returnData;
            },
        },
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const length = items.length;
        let qs;
        let responseData;
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < length; i++) {
            qs = {};
            try {
                if (resource === 'company') {
                    //https://developer.mautic.org/#create-company
                    if (operation === 'create') {
                        const simple = this.getNodeParameter('simple', i);
                        const name = this.getNodeParameter('name', i);
                        const body = {
                            companyname: name,
                        };
                        const { addressUi, customFieldsUi, companyEmail, fax, industry, numberOfEmpoyees, phone, website, annualRevenue, description, ...rest } = this.getNodeParameter('additionalFields', i);
                        if (addressUi?.addressValues) {
                            const { addressValues } = addressUi;
                            body.companyaddress1 = addressValues.address1;
                            body.companyaddress2 = addressValues.address2;
                            body.companycity = addressValues.city;
                            body.companystate = addressValues.state;
                            body.companycountry = addressValues.country;
                            body.companyzipcode = addressValues.zipCode;
                        }
                        if (companyEmail) {
                            body.companyemail = companyEmail;
                        }
                        if (fax) {
                            body.companyfax = fax;
                        }
                        if (industry) {
                            body.companyindustry = industry;
                        }
                        if (industry) {
                            body.companyindustry = industry;
                        }
                        if (numberOfEmpoyees) {
                            body.companynumber_of_employees = numberOfEmpoyees;
                        }
                        if (phone) {
                            body.companyphone = phone;
                        }
                        if (website) {
                            body.companywebsite = website;
                        }
                        if (annualRevenue) {
                            body.companyannual_revenue = annualRevenue;
                        }
                        if (description) {
                            body.companydescription = description;
                        }
                        if (customFieldsUi?.customFieldValues) {
                            const { customFieldValues } = customFieldsUi;
                            const data = customFieldValues.reduce((obj, value) => Object.assign(obj, { [`${value.fieldId}`]: value.fieldValue }), {});
                            Object.assign(body, data);
                        }
                        Object.assign(body, rest);
                        responseData = await mauticApiRequest.call(this, 'POST', '/companies/new', body);
                        responseData = responseData.company;
                        if (simple) {
                            responseData = responseData.fields.all;
                        }
                    }
                    //https://developer.mautic.org/#edit-company
                    if (operation === 'update') {
                        const companyId = this.getNodeParameter('companyId', i);
                        const simple = this.getNodeParameter('simple', i);
                        const body = {};
                        const { addressUi, customFieldsUi, companyEmail, name, fax, industry, numberOfEmpoyees, phone, website, annualRevenue, description, ...rest } = this.getNodeParameter('updateFields', i);
                        if (addressUi?.addressValues) {
                            const { addressValues } = addressUi;
                            body.companyaddress1 = addressValues.address1;
                            body.companyaddress2 = addressValues.address2;
                            body.companycity = addressValues.city;
                            body.companystate = addressValues.state;
                            body.companycountry = addressValues.country;
                            body.companyzipcode = addressValues.zipCode;
                        }
                        if (companyEmail) {
                            body.companyemail = companyEmail;
                        }
                        if (name) {
                            body.companyname = name;
                        }
                        if (fax) {
                            body.companyfax = fax;
                        }
                        if (industry) {
                            body.companyindustry = industry;
                        }
                        if (industry) {
                            body.companyindustry = industry;
                        }
                        if (numberOfEmpoyees) {
                            body.companynumber_of_employees = numberOfEmpoyees;
                        }
                        if (phone) {
                            body.companyphone = phone;
                        }
                        if (website) {
                            body.companywebsite = website;
                        }
                        if (annualRevenue) {
                            body.companyannual_revenue = annualRevenue;
                        }
                        if (description) {
                            body.companydescription = description;
                        }
                        if (customFieldsUi?.customFieldValues) {
                            const { customFieldValues } = customFieldsUi;
                            const data = customFieldValues.reduce((obj, value) => Object.assign(obj, { [`${value.fieldId}`]: value.fieldValue }), {});
                            Object.assign(body, data);
                        }
                        Object.assign(body, rest);
                        responseData = await mauticApiRequest.call(this, 'PATCH', `/companies/${companyId}/edit`, body);
                        responseData = responseData.company;
                        if (simple) {
                            responseData = responseData.fields.all;
                        }
                    }
                    //https://developer.mautic.org/#get-company
                    if (operation === 'get') {
                        const companyId = this.getNodeParameter('companyId', i);
                        const simple = this.getNodeParameter('simple', i);
                        responseData = await mauticApiRequest.call(this, 'GET', `/companies/${companyId}`);
                        responseData = responseData.company;
                        if (simple) {
                            responseData = responseData.fields.all;
                        }
                    }
                    //https://developer.mautic.org/#list-contact-companies
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const simple = this.getNodeParameter('simple', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        qs = Object.assign(qs, additionalFields);
                        if (returnAll) {
                            responseData = await mauticApiRequestAllItems.call(this, 'companies', 'GET', '/companies', {}, qs);
                        }
                        else {
                            qs.limit = this.getNodeParameter('limit', i);
                            qs.start = 0;
                            responseData = await mauticApiRequest.call(this, 'GET', '/companies', {}, qs);
                            if (responseData.errors) {
                                throw new NodeApiError(this.getNode(), responseData);
                            }
                            responseData = responseData.companies;
                            responseData = Object.values(responseData);
                        }
                        if (simple) {
                            //@ts-ignore
                            responseData = responseData.map((item) => item.fields.all);
                        }
                    }
                    //https://developer.mautic.org/#delete-company
                    if (operation === 'delete') {
                        const simple = this.getNodeParameter('simple', i);
                        const companyId = this.getNodeParameter('companyId', i);
                        responseData = await mauticApiRequest.call(this, 'DELETE', `/companies/${companyId}/delete`);
                        responseData = responseData.company;
                        if (simple) {
                            responseData = responseData.fields.all;
                        }
                    }
                }
                if (resource === 'contact') {
                    //https://developer.mautic.org/?php#create-contact
                    if (operation === 'create') {
                        const options = this.getNodeParameter('options', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const jsonActive = this.getNodeParameter('jsonParameters', i);
                        let body = {};
                        if (!jsonActive) {
                            body.email = this.getNodeParameter('email', i);
                            body.firstname = this.getNodeParameter('firstName', i);
                            body.lastname = this.getNodeParameter('lastName', i);
                            body.company = this.getNodeParameter('company', i);
                            body.position = this.getNodeParameter('position', i);
                            body.title = this.getNodeParameter('title', i);
                        }
                        else {
                            const json = validateJSON(this.getNodeParameter('bodyJson', i));
                            if (json !== undefined) {
                                body = { ...json };
                            }
                            else {
                                throw new NodeOperationError(this.getNode(), 'Invalid JSON', { itemIndex: i });
                            }
                        }
                        if (additionalFields.ipAddress) {
                            body.ipAddress = additionalFields.ipAddress;
                        }
                        if (additionalFields.lastActive) {
                            body.lastActive = additionalFields.lastActive;
                        }
                        if (additionalFields.ownerId) {
                            body.owner = additionalFields.ownerId;
                        }
                        if (additionalFields.addressUi) {
                            const addressValues = additionalFields.addressUi
                                .addressValues;
                            if (addressValues) {
                                body.address1 = addressValues.address1;
                                body.address2 = addressValues.address2;
                                body.city = addressValues.city;
                                body.state = addressValues.state;
                                body.country = addressValues.country;
                                body.zipcode = addressValues.zipCode;
                            }
                        }
                        if (additionalFields.socialMediaUi) {
                            const socialMediaValues = additionalFields.socialMediaUi
                                .socialMediaValues;
                            if (socialMediaValues) {
                                body.facebook = socialMediaValues.facebook;
                                body.foursquare = socialMediaValues.foursquare;
                                body.instagram = socialMediaValues.instagram;
                                body.linkedin = socialMediaValues.linkedIn;
                                body.skype = socialMediaValues.skype;
                                body.twitter = socialMediaValues.twitter;
                            }
                        }
                        if (additionalFields.customFieldsUi) {
                            const customFields = additionalFields.customFieldsUi
                                .customFieldValues;
                            if (customFields) {
                                const data = customFields.reduce((obj, value) => Object.assign(obj, { [`${value.fieldId}`]: value.fieldValue }), {});
                                Object.assign(body, data);
                            }
                        }
                        if (additionalFields.b2bOrb2c) {
                            body.b2b_or_b2c = additionalFields.b2bOrb2c;
                        }
                        if (additionalFields.crmId) {
                            body.crm_id = additionalFields.crmId;
                        }
                        if (additionalFields.fax) {
                            body.fax = additionalFields.fax;
                        }
                        if (additionalFields.hasPurchased) {
                            body.haspurchased = additionalFields.hasPurchased;
                        }
                        if (additionalFields.mobile) {
                            body.mobile = additionalFields.mobile;
                        }
                        if (additionalFields.phone) {
                            body.phone = additionalFields.phone;
                        }
                        if (additionalFields.prospectOrCustomer) {
                            body.prospect_or_customer = additionalFields.prospectOrCustomer;
                        }
                        if (additionalFields.sandbox) {
                            body.sandbox = additionalFields.sandbox;
                        }
                        if (additionalFields.stage) {
                            body.stage = additionalFields.stage;
                        }
                        if (additionalFields.tags) {
                            body.tags = additionalFields.tags;
                        }
                        if (additionalFields.website) {
                            body.website = additionalFields.website;
                        }
                        responseData = await mauticApiRequest.call(this, 'POST', '/contacts/new', body);
                        responseData = [responseData.contact];
                        if (options.rawData === false) {
                            responseData = responseData.map((item) => item.fields.all);
                        }
                    }
                    //https://developer.mautic.org/?php#edit-contact
                    if (operation === 'update') {
                        const options = this.getNodeParameter('options', i);
                        const updateFields = this.getNodeParameter('updateFields', i);
                        const contactId = this.getNodeParameter('contactId', i);
                        let body = {};
                        if (updateFields.email) {
                            body.email = updateFields.email;
                        }
                        if (updateFields.firstName) {
                            body.firstname = updateFields.firstName;
                        }
                        if (updateFields.lastName) {
                            body.lastname = updateFields.lastName;
                        }
                        if (updateFields.company) {
                            body.company = updateFields.company;
                        }
                        if (updateFields.position) {
                            body.position = updateFields.position;
                        }
                        if (updateFields.title) {
                            body.title = updateFields.title;
                        }
                        if (updateFields.bodyJson) {
                            const json = validateJSON(updateFields.bodyJson);
                            if (json !== undefined) {
                                body = { ...json };
                            }
                            else {
                                throw new NodeOperationError(this.getNode(), 'Invalid JSON', { itemIndex: i });
                            }
                        }
                        if (updateFields.ipAddress) {
                            body.ipAddress = updateFields.ipAddress;
                        }
                        if (updateFields.lastActive) {
                            body.lastActive = updateFields.lastActive;
                        }
                        if (updateFields.ownerId) {
                            body.owner = updateFields.ownerId;
                        }
                        if (updateFields.addressUi) {
                            const addressValues = updateFields.addressUi
                                .addressValues;
                            if (addressValues) {
                                body.address1 = addressValues.address1;
                                body.address2 = addressValues.address2;
                                body.city = addressValues.city;
                                body.state = addressValues.state;
                                body.country = addressValues.country;
                                body.zipcode = addressValues.zipCode;
                            }
                        }
                        if (updateFields.socialMediaUi) {
                            const socialMediaValues = updateFields.socialMediaUi
                                .socialMediaValues;
                            if (socialMediaValues) {
                                body.facebook = socialMediaValues.facebook;
                                body.foursquare = socialMediaValues.foursquare;
                                body.instagram = socialMediaValues.instagram;
                                body.linkedin = socialMediaValues.linkedIn;
                                body.skype = socialMediaValues.skype;
                                body.twitter = socialMediaValues.twitter;
                            }
                        }
                        if (updateFields.customFieldsUi) {
                            const customFields = updateFields.customFieldsUi
                                .customFieldValues;
                            if (customFields) {
                                const data = customFields.reduce((obj, value) => Object.assign(obj, { [`${value.fieldId}`]: value.fieldValue }), {});
                                Object.assign(body, data);
                            }
                        }
                        if (updateFields.b2bOrb2c) {
                            body.b2b_or_b2c = updateFields.b2bOrb2c;
                        }
                        if (updateFields.crmId) {
                            body.crm_id = updateFields.crmId;
                        }
                        if (updateFields.fax) {
                            body.fax = updateFields.fax;
                        }
                        if (updateFields.hasPurchased) {
                            body.haspurchased = updateFields.hasPurchased;
                        }
                        if (updateFields.mobile) {
                            body.mobile = updateFields.mobile;
                        }
                        if (updateFields.phone) {
                            body.phone = updateFields.phone;
                        }
                        if (updateFields.prospectOrCustomer) {
                            body.prospect_or_customer = updateFields.prospectOrCustomer;
                        }
                        if (updateFields.sandbox) {
                            body.sandbox = updateFields.sandbox;
                        }
                        if (updateFields.stage) {
                            body.stage = updateFields.stage;
                        }
                        if (updateFields.tags) {
                            body.tags = updateFields.tags;
                        }
                        if (updateFields.website) {
                            body.website = updateFields.website;
                        }
                        responseData = await mauticApiRequest.call(this, 'PATCH', `/contacts/${contactId}/edit`, body);
                        responseData = [responseData.contact];
                        if (options.rawData === false) {
                            responseData = responseData.map((item) => item.fields.all);
                        }
                    }
                    //https://developer.mautic.org/?php#get-contact
                    if (operation === 'get') {
                        const options = this.getNodeParameter('options', i);
                        const contactId = this.getNodeParameter('contactId', i);
                        responseData = await mauticApiRequest.call(this, 'GET', `/contacts/${contactId}`);
                        responseData = [responseData.contact];
                        if (options.rawData === false) {
                            responseData = responseData.map((item) => item.fields.all);
                        }
                    }
                    //https://developer.mautic.org/?php#list-contacts
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const options = this.getNodeParameter('options', i);
                        qs = Object.assign(qs, options);
                        if (qs.orderBy) {
                            // For some reason does camelCase get used in the returned data
                            // but snake_case here. So convert it automatically to not confuse
                            // the users.
                            qs.orderBy = snakeCase(qs.orderBy);
                        }
                        if (returnAll) {
                            responseData = await mauticApiRequestAllItems.call(this, 'contacts', 'GET', '/contacts', {}, qs);
                        }
                        else {
                            qs.limit = this.getNodeParameter('limit', i);
                            qs.start = 0;
                            responseData = await mauticApiRequest.call(this, 'GET', '/contacts', {}, qs);
                            if (responseData.errors) {
                                throw new NodeApiError(this.getNode(), responseData);
                            }
                            responseData = responseData.contacts;
                            responseData = Object.values(responseData);
                        }
                        if (options.rawData === false) {
                            //@ts-ignore
                            responseData = responseData.map((item) => item.fields.all);
                        }
                    }
                    //https://developer.mautic.org/?php#delete-contact
                    if (operation === 'delete') {
                        const options = this.getNodeParameter('options', i);
                        const contactId = this.getNodeParameter('contactId', i);
                        responseData = await mauticApiRequest.call(this, 'DELETE', `/contacts/${contactId}/delete`);
                        responseData = [responseData.contact];
                        if (options.rawData === false) {
                            responseData = responseData.map((item) => item.fields.all);
                        }
                    }
                    //https://developer.mautic.org/#send-email-to-contact
                    if (operation === 'sendEmail') {
                        const contactId = this.getNodeParameter('contactId', i);
                        const campaignEmailId = this.getNodeParameter('campaignEmailId', i);
                        responseData = await mauticApiRequest.call(this, 'POST', `/emails/${campaignEmailId}/contact/${contactId}/send`);
                    }
                    //https://developer.mautic.org/#add-do-not-contact
                    //https://developer.mautic.org/#remove-from-do-not-contact
                    if (operation === 'editDoNotContactList') {
                        const contactId = this.getNodeParameter('contactId', i);
                        const action = this.getNodeParameter('action', i);
                        const channel = this.getNodeParameter('channel', i);
                        const body = {};
                        if (action === 'add') {
                            const additionalFields = this.getNodeParameter('additionalFields', i);
                            Object.assign(body, additionalFields);
                        }
                        responseData = await mauticApiRequest.call(this, 'POST', `/contacts/${contactId}/dnc/${channel}/${action}`, body);
                        responseData = responseData.contact;
                    }
                    //https://developer.mautic.org/#add-points
                    //https://developer.mautic.org/#subtract-points
                    if (operation === 'editContactPoint') {
                        const contactId = this.getNodeParameter('contactId', i);
                        const action = this.getNodeParameter('action', i);
                        const points = this.getNodeParameter('points', i);
                        const path = action === 'add' ? 'plus' : 'minus';
                        responseData = await mauticApiRequest.call(this, 'POST', `/contacts/${contactId}/points/${path}/${points}`);
                    }
                }
                if (resource === 'contactSegment') {
                    //https://developer.mautic.org/?php#add-contact-to-a-segment
                    if (operation === 'add') {
                        const contactId = this.getNodeParameter('contactId', i);
                        const segmentId = this.getNodeParameter('segmentId', i);
                        responseData = await mauticApiRequest.call(this, 'POST', `/segments/${segmentId}/contact/${contactId}/add`);
                    }
                    //https://developer.mautic.org/#remove-contact-from-a-segment
                    if (operation === 'remove') {
                        const contactId = this.getNodeParameter('contactId', i);
                        const segmentId = this.getNodeParameter('segmentId', i);
                        responseData = await mauticApiRequest.call(this, 'POST', `/segments/${segmentId}/contact/${contactId}/remove`);
                    }
                }
                if (resource === 'campaignContact') {
                    //https://developer.mautic.org/#add-contact-to-a-campaign
                    if (operation === 'add') {
                        const contactId = this.getNodeParameter('contactId', i);
                        const campaignId = this.getNodeParameter('campaignId', i);
                        responseData = await mauticApiRequest.call(this, 'POST', `/campaigns/${campaignId}/contact/${contactId}/add`);
                    }
                    //https://developer.mautic.org/#remove-contact-from-a-campaign
                    if (operation === 'remove') {
                        const contactId = this.getNodeParameter('contactId', i);
                        const campaignId = this.getNodeParameter('campaignId', i);
                        responseData = await mauticApiRequest.call(this, 'POST', `/campaigns/${campaignId}/contact/${contactId}/remove`);
                    }
                }
                if (resource === 'segmentEmail') {
                    //https://developer.mautic.org/#send-email-to-segment
                    if (operation === 'send') {
                        const segmentEmailId = this.getNodeParameter('segmentEmailId', i);
                        responseData = await mauticApiRequest.call(this, 'POST', `/emails/${segmentEmailId}/send`);
                    }
                }
                if (resource === 'companyContact') {
                    //https://developer.mautic.org/#add-contact-to-a-company
                    if (operation === 'add') {
                        const contactId = this.getNodeParameter('contactId', i);
                        const companyId = this.getNodeParameter('companyId', i);
                        responseData = await mauticApiRequest.call(this, 'POST', `/companies/${companyId}/contact/${contactId}/add`, {});
                        // responseData = responseData.company;
                        // if (simple === true) {
                        // 	responseData = responseData.fields.all;
                        // }
                    }
                    //https://developer.mautic.org/#remove-contact-from-a-company
                    if (operation === 'remove') {
                        const contactId = this.getNodeParameter('contactId', i);
                        const companyId = this.getNodeParameter('companyId', i);
                        responseData = await mauticApiRequest.call(this, 'POST', `/companies/${companyId}/contact/${contactId}/remove`, {});
                        // responseData = responseData.company;
                        // if (simple === true) {
                        // 	responseData = responseData.fields.all;
                        // }
                    }
                }
                const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                returnData.push(...executionData);
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ json: { error: error.message } });
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
//# sourceMappingURL=Mautic.node.js.map
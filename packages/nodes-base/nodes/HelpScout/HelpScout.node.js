import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { isoCountryCodes } from '@utils/ISOCountryCodes';
import { conversationFields, conversationOperations } from './ConversationDescription';
import { customerFields, customerOperations } from './CustomerDescription';
import { helpscoutApiRequest, helpscoutApiRequestAllItems } from './GenericFunctions';
import { mailboxFields, mailboxOperations } from './MailboxDescription';
import { threadFields, threadOperations } from './ThreadDescription';
export class HelpScout {
    description = {
        displayName: 'Help Scout',
        name: 'helpScout',
        icon: 'file:helpScout.svg',
        group: ['input'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume Help Scout API',
        defaults: {
            name: 'Help Scout',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'helpScoutOAuth2Api',
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
                        name: 'Conversation',
                        value: 'conversation',
                    },
                    {
                        name: 'Customer',
                        value: 'customer',
                    },
                    {
                        name: 'Mailbox',
                        value: 'mailbox',
                    },
                    {
                        name: 'Thread',
                        value: 'thread',
                    },
                ],
                default: 'conversation',
            },
            ...conversationOperations,
            ...conversationFields,
            ...customerOperations,
            ...customerFields,
            ...mailboxOperations,
            ...mailboxFields,
            ...threadOperations,
            ...threadFields,
        ],
    };
    methods = {
        loadOptions: {
            // Get all the countries codes to display them to user so that they can
            // select them easily
            async getCountriesCodes() {
                const returnData = [];
                for (const countryCode of isoCountryCodes) {
                    const countryCodeName = `${countryCode.name} - ${countryCode.alpha2}`;
                    const countryCodeId = countryCode.alpha2;
                    returnData.push({
                        name: countryCodeName,
                        value: countryCodeId,
                    });
                }
                return returnData;
            },
            // Get all the tags to display them to user so that they can
            // select them easily
            async getTags() {
                const returnData = [];
                const tags = await helpscoutApiRequestAllItems.call(this, '_embedded.tags', 'GET', '/v2/tags');
                for (const tag of tags) {
                    const tagName = tag.name;
                    returnData.push({
                        name: tagName,
                        value: tagName,
                    });
                }
                return returnData;
            },
            // Get all the mailboxes to display them to user so that they can
            // select them easily
            async getMailboxes() {
                const returnData = [];
                const mailboxes = await helpscoutApiRequestAllItems.call(this, '_embedded.mailboxes', 'GET', '/v2/mailboxes');
                for (const mailbox of mailboxes) {
                    const mailboxName = mailbox.name;
                    const mailboxId = mailbox.id;
                    returnData.push({
                        name: mailboxName,
                        value: mailboxId,
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
            try {
                if (resource === 'conversation') {
                    //https://developer.helpscout.com/mailbox-api/endpoints/conversations/create
                    if (operation === 'create') {
                        const mailboxId = this.getNodeParameter('mailboxId', i);
                        const status = this.getNodeParameter('status', i);
                        const subject = this.getNodeParameter('subject', i);
                        const type = this.getNodeParameter('type', i);
                        const resolveData = this.getNodeParameter('resolveData', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const threads = this.getNodeParameter('threadsUi', i)
                            .threadsValues;
                        const body = {
                            mailboxId,
                            status,
                            subject,
                            type,
                        };
                        Object.assign(body, additionalFields);
                        if (additionalFields.customerId) {
                            body.customer = {
                                id: additionalFields.customerId,
                            };
                            //@ts-ignore
                            delete body.customerId;
                        }
                        if (additionalFields.customerEmail) {
                            body.customer = {
                                email: additionalFields.customerEmail,
                            };
                            //@ts-ignore
                            delete body.customerEmail;
                        }
                        if (body.customer === undefined) {
                            throw new NodeOperationError(this.getNode(), 'Either customer email or customer ID must be set', { itemIndex: i });
                        }
                        if (threads) {
                            for (let index = 0; index < threads.length; index++) {
                                if (threads[index].type === '' || threads[index].text === '') {
                                    throw new NodeOperationError(this.getNode(), 'Chat Threads cannot be empty');
                                }
                                if (threads[index].type !== 'note') {
                                    threads[index].customer = body.customer;
                                }
                            }
                            body.threads = threads;
                        }
                        responseData = await helpscoutApiRequest.call(this, 'POST', '/v2/conversations', body, qs, undefined, { resolveWithFullResponse: true });
                        const id = responseData.headers['resource-id'];
                        const uri = responseData.headers.location;
                        if (resolveData) {
                            responseData = await helpscoutApiRequest.call(this, 'GET', '', {}, {}, uri);
                        }
                        else {
                            responseData = {
                                id,
                                uri,
                            };
                        }
                    }
                    //https://developer.helpscout.com/mailbox-api/endpoints/conversations/delete
                    if (operation === 'delete') {
                        const conversationId = this.getNodeParameter('conversationId', i);
                        responseData = await helpscoutApiRequest.call(this, 'DELETE', `/v2/conversations/${conversationId}`);
                        responseData = { success: true };
                    }
                    //https://developer.helpscout.com/mailbox-api/endpoints/conversations/get
                    if (operation === 'get') {
                        const conversationId = this.getNodeParameter('conversationId', i);
                        responseData = await helpscoutApiRequest.call(this, 'GET', `/v2/conversations/${conversationId}`);
                    }
                    //https://developer.helpscout.com/mailbox-api/endpoints/conversations/list
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const options = this.getNodeParameter('options', i);
                        if (options.tags) {
                            qs.tag = options.tags.toString();
                        }
                        Object.assign(qs, options);
                        delete qs.tags;
                        if (returnAll) {
                            responseData = await helpscoutApiRequestAllItems.call(this, '_embedded.conversations', 'GET', '/v2/conversations', {}, qs);
                        }
                        else {
                            qs.limit = this.getNodeParameter('limit', i);
                            responseData = await helpscoutApiRequestAllItems.call(this, '_embedded.conversations', 'GET', '/v2/conversations', {}, qs);
                            responseData = responseData.splice(0, qs.limit);
                        }
                    }
                }
                if (resource === 'customer') {
                    //https://developer.helpscout.com/mailbox-api/endpoints/customers/create
                    if (operation === 'create') {
                        const resolveData = this.getNodeParameter('resolveData', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const chats = this.getNodeParameter('chatsUi', i)
                            .chatsValues;
                        const address = this.getNodeParameter('addressUi', i)
                            .addressValue;
                        const emails = this.getNodeParameter('emailsUi', i)
                            .emailsValues;
                        const phones = this.getNodeParameter('phonesUi', i)
                            .phonesValues;
                        const socialProfiles = this.getNodeParameter('socialProfilesUi', i)
                            .socialProfilesValues;
                        const websites = this.getNodeParameter('websitesUi', i)
                            .websitesValues;
                        let body = {};
                        body = Object.assign({}, additionalFields);
                        if (body.age) {
                            body.age = body.age.toString();
                        }
                        if (chats) {
                            body.chats = chats;
                        }
                        if (address) {
                            body.address = address;
                            body.address.lines = [address.line1, address.line2];
                        }
                        if (emails) {
                            body.emails = emails;
                        }
                        if (phones) {
                            body.phones = phones;
                        }
                        if (socialProfiles) {
                            body.socialProfiles = socialProfiles;
                        }
                        if (websites) {
                            body.websites = websites;
                        }
                        if (Object.keys(body).length === 0) {
                            throw new NodeOperationError(this.getNode(), 'You have to set at least one field', {
                                itemIndex: i,
                            });
                        }
                        responseData = await helpscoutApiRequest.call(this, 'POST', '/v2/customers', body, qs, undefined, { resolveWithFullResponse: true });
                        const id = responseData.headers['resource-id'];
                        const uri = responseData.headers.location;
                        if (resolveData) {
                            responseData = await helpscoutApiRequest.call(this, 'GET', '', {}, {}, uri);
                        }
                        else {
                            responseData = {
                                id,
                                uri,
                            };
                        }
                    }
                    //https://developer.helpscout.com/mailbox-api/endpoints/customer_properties/list
                    if (operation === 'properties') {
                        responseData = await helpscoutApiRequestAllItems.call(this, '_embedded.customer-properties', 'GET', '/v2/customer-properties', {}, qs);
                    }
                    //https://developer.helpscout.com/mailbox-api/endpoints/customers/get
                    if (operation === 'get') {
                        const customerId = this.getNodeParameter('customerId', i);
                        responseData = await helpscoutApiRequest.call(this, 'GET', `/v2/customers/${customerId}`);
                    }
                    //https://developer.helpscout.com/mailbox-api/endpoints/customers/list
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const options = this.getNodeParameter('options', i);
                        Object.assign(qs, options);
                        if (returnAll) {
                            responseData = await helpscoutApiRequestAllItems.call(this, '_embedded.customers', 'GET', '/v2/customers', {}, qs);
                        }
                        else {
                            qs.limit = this.getNodeParameter('limit', i);
                            responseData = await helpscoutApiRequestAllItems.call(this, '_embedded.customers', 'GET', '/v2/customers', {}, qs);
                            responseData = responseData.splice(0, qs.limit);
                        }
                    }
                    //https://developer.helpscout.com/mailbox-api/endpoints/customers/overwrite/
                    if (operation === 'update') {
                        const customerId = this.getNodeParameter('customerId', i);
                        const updateFields = this.getNodeParameter('updateFields', i);
                        let body = {};
                        body = Object.assign({}, updateFields);
                        if (body.age) {
                            body.age = body.age.toString();
                        }
                        if (Object.keys(body).length === 0) {
                            throw new NodeOperationError(this.getNode(), 'You have to set at least one field', {
                                itemIndex: i,
                            });
                        }
                        responseData = await helpscoutApiRequest.call(this, 'PUT', `/v2/customers/${customerId}`, body, qs, undefined, { resolveWithFullResponse: true });
                        responseData = { success: true };
                    }
                }
                if (resource === 'mailbox') {
                    //https://developer.helpscout.com/mailbox-api/endpoints/mailboxes/get
                    if (operation === 'get') {
                        const mailboxId = this.getNodeParameter('mailboxId', i);
                        responseData = await helpscoutApiRequest.call(this, 'GET', `/v2/mailboxes/${mailboxId}`, {}, qs);
                    }
                    //https://developer.helpscout.com/mailbox-api/endpoints/mailboxes/list
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        if (returnAll) {
                            responseData = await helpscoutApiRequestAllItems.call(this, '_embedded.mailboxes', 'GET', '/v2/mailboxes', {}, qs);
                        }
                        else {
                            qs.limit = this.getNodeParameter('limit', i);
                            responseData = await helpscoutApiRequestAllItems.call(this, '_embedded.mailboxes', 'GET', '/v2/mailboxes', {}, qs);
                            responseData = responseData.splice(0, qs.limit);
                        }
                    }
                }
                if (resource === 'thread') {
                    //https://developer.helpscout.com/mailbox-api/endpoints/conversations/threads/chat
                    if (operation === 'create') {
                        const conversationId = this.getNodeParameter('conversationId', i);
                        const text = this.getNodeParameter('text', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const attachments = this.getNodeParameter('attachmentsUi', i);
                        let threadType = this.getNodeParameter('type', i);
                        // We need to update the types to match the API - Avoids a breaking change
                        const singular = ['reply', 'customer'];
                        if (!singular.includes(threadType)) {
                            threadType = `${threadType}s`;
                        }
                        const body = {
                            text,
                            attachments: [],
                        };
                        Object.assign(body, additionalFields);
                        if (additionalFields.customerId) {
                            body.customer = {
                                id: additionalFields.customerId,
                            };
                            //@ts-ignore
                            delete body.customerId;
                        }
                        if (additionalFields.customerEmail) {
                            body.customer = {
                                email: additionalFields.customerEmail,
                            };
                            //@ts-ignore
                            delete body.customerEmail;
                        }
                        if (body.customer === undefined) {
                            throw new NodeOperationError(this.getNode(), 'Either customer email or customer ID must be set', { itemIndex: i });
                        }
                        if (attachments) {
                            if (attachments.attachmentsValues &&
                                attachments.attachmentsValues.length !== 0) {
                                body.attachments?.push.apply(body.attachments, attachments.attachmentsValues);
                            }
                            if (attachments.attachmentsBinary &&
                                attachments.attachmentsBinary.length !== 0) {
                                const binaryAttachments = [];
                                for (const value of attachments.attachmentsBinary) {
                                    const binaryData = this.helpers.assertBinaryData(i, value.property);
                                    let fileBase64;
                                    if (binaryData.id) {
                                        const chunkSize = 256 * 1024;
                                        const stream = await this.helpers.getBinaryStream(binaryData.id, chunkSize);
                                        const buffer = await this.helpers.binaryToBuffer(stream);
                                        fileBase64 = buffer.toString('base64');
                                    }
                                    else {
                                        fileBase64 = binaryData.data;
                                    }
                                    binaryAttachments.push({
                                        fileName: binaryData.fileName || 'unknown',
                                        data: fileBase64,
                                        mimeType: binaryData.mimeType,
                                    });
                                }
                                body.attachments?.push.apply(body.attachments, binaryAttachments);
                            }
                        }
                        responseData = await helpscoutApiRequest.call(this, 'POST', `/v2/conversations/${conversationId}/${threadType}`, body);
                        responseData = { success: true };
                    }
                    //https://developer.helpscout.com/mailbox-api/endpoints/conversations/threads/list
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const conversationId = this.getNodeParameter('conversationId', i);
                        if (returnAll) {
                            responseData = await helpscoutApiRequestAllItems.call(this, '_embedded.threads', 'GET', `/v2/conversations/${conversationId}/threads`);
                        }
                        else {
                            qs.limit = this.getNodeParameter('limit', i);
                            responseData = await helpscoutApiRequestAllItems.call(this, '_embedded.threads', 'GET', `/v2/conversations/${conversationId}/threads`, {}, qs);
                            responseData = responseData.splice(0, qs.limit);
                        }
                    }
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    const executionErrorData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData: { item: i } });
                    returnData.push(...executionErrorData);
                    continue;
                }
                throw error;
            }
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
            returnData.push(...executionData);
        }
        return [returnData];
    }
}
//# sourceMappingURL=HelpScout.node.js.map
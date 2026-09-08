import isEmpty from 'lodash/isEmpty';
import { NodeConnectionTypes, } from 'n8n-workflow';
import { oldVersionNotice } from '@utils/descriptions';
import { draftFields, draftOperations } from './DraftDescription';
import { labelFields, labelOperations } from './LabelDescription';
import { getLabels } from './loadOptions';
import { messageFields, messageOperations } from './MessageDescription';
import { messageLabelFields, messageLabelOperations } from './MessageLabelDescription';
import { encodeEmail, extractEmail, googleApiRequest, googleApiRequestAllItems, parseRawEmail, } from '../GenericFunctions';
const versionDescription = {
    displayName: 'Gmail',
    name: 'gmail',
    icon: 'file:gmail.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Consume the Gmail API',
    defaults: {
        name: 'Gmail',
    },
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    credentials: [
        {
            name: 'googleApi',
            required: true,
            displayOptions: {
                show: {
                    authentication: ['serviceAccount'],
                },
            },
        },
        {
            name: 'gmailOAuth2',
            required: true,
            displayOptions: {
                show: {
                    authentication: ['oAuth2'],
                },
            },
        },
    ],
    properties: [
        oldVersionNotice,
        {
            displayName: 'Authentication',
            name: 'authentication',
            type: 'options',
            options: [
                {
                    // eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
                    name: 'OAuth2 (recommended)',
                    value: 'oAuth2',
                },
                {
                    name: 'Service Account',
                    value: 'serviceAccount',
                },
            ],
            default: 'oAuth2',
        },
        {
            displayName: 'Resource',
            name: 'resource',
            type: 'options',
            noDataExpression: true,
            options: [
                {
                    name: 'Draft',
                    value: 'draft',
                },
                {
                    name: 'Label',
                    value: 'label',
                },
                {
                    name: 'Message',
                    value: 'message',
                },
                {
                    name: 'Message Label',
                    value: 'messageLabel',
                },
            ],
            default: 'draft',
        },
        //-------------------------------
        // Draft Operations
        //-------------------------------
        ...draftOperations,
        ...draftFields,
        //-------------------------------
        // Label Operations
        //-------------------------------
        ...labelOperations,
        ...labelFields,
        //-------------------------------
        // Message Operations
        //-------------------------------
        ...messageOperations,
        ...messageFields,
        //-------------------------------
        // MessageLabel Operations
        //-------------------------------
        ...messageLabelOperations,
        ...messageLabelFields,
        //-------------------------------
    ],
};
export class GmailV1 {
    description;
    constructor(baseDescription) {
        this.description = {
            ...baseDescription,
            ...versionDescription,
        };
    }
    methods = {
        loadOptions: {
            getLabels,
        },
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        let method = 'GET';
        let body = {};
        let qs = {};
        let endpoint = '';
        let responseData;
        for (let i = 0; i < items.length; i++) {
            try {
                if (resource === 'label') {
                    if (operation === 'create') {
                        //https://developers.google.com/gmail/api/v1/reference/users/labels/create
                        const labelName = this.getNodeParameter('name', i);
                        const labelListVisibility = this.getNodeParameter('labelListVisibility', i);
                        const messageListVisibility = this.getNodeParameter('messageListVisibility', i);
                        method = 'POST';
                        endpoint = '/gmail/v1/users/me/labels';
                        body = {
                            labelListVisibility,
                            messageListVisibility,
                            name: labelName,
                        };
                        responseData = await googleApiRequest.call(this, method, endpoint, body, qs);
                    }
                    if (operation === 'delete') {
                        //https://developers.google.com/gmail/api/v1/reference/users/labels/delete
                        const labelId = this.getNodeParameter('labelId', i);
                        method = 'DELETE';
                        endpoint = `/gmail/v1/users/me/labels/${labelId}`;
                        responseData = await googleApiRequest.call(this, method, endpoint, body, qs);
                        responseData = { success: true };
                    }
                    if (operation === 'get') {
                        // https://developers.google.com/gmail/api/v1/reference/users/labels/get
                        const labelId = this.getNodeParameter('labelId', i);
                        method = 'GET';
                        endpoint = `/gmail/v1/users/me/labels/${labelId}`;
                        responseData = await googleApiRequest.call(this, method, endpoint, body, qs);
                    }
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        responseData = await googleApiRequest.call(this, 'GET', '/gmail/v1/users/me/labels', {}, qs);
                        responseData = responseData.labels;
                        if (!returnAll) {
                            const limit = this.getNodeParameter('limit', i);
                            responseData = responseData.splice(0, limit);
                        }
                    }
                }
                if (resource === 'messageLabel') {
                    if (operation === 'remove') {
                        //https://developers.google.com/gmail/api/v1/reference/users/messages/modify
                        const messageID = this.getNodeParameter('messageId', i);
                        const labelIds = this.getNodeParameter('labelIds', i);
                        method = 'POST';
                        endpoint = `/gmail/v1/users/me/messages/${messageID}/modify`;
                        body = {
                            removeLabelIds: labelIds,
                        };
                        responseData = await googleApiRequest.call(this, method, endpoint, body, qs);
                    }
                    if (operation === 'add') {
                        // https://developers.google.com/gmail/api/v1/reference/users/messages/modify
                        const messageID = this.getNodeParameter('messageId', i);
                        const labelIds = this.getNodeParameter('labelIds', i);
                        method = 'POST';
                        endpoint = `/gmail/v1/users/me/messages/${messageID}/modify`;
                        body = {
                            addLabelIds: labelIds,
                        };
                        responseData = await googleApiRequest.call(this, method, endpoint, body, qs);
                    }
                }
                if (resource === 'message') {
                    if (operation === 'send') {
                        // https://developers.google.com/gmail/api/v1/reference/users/messages/send
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        let toStr = '';
                        let ccStr = '';
                        let bccStr = '';
                        let attachmentsList = [];
                        const toList = this.getNodeParameter('toList', i);
                        toList.forEach((email) => {
                            toStr += `<${email}>, `;
                        });
                        if (additionalFields.ccList) {
                            const ccList = additionalFields.ccList;
                            ccList.forEach((email) => {
                                ccStr += `<${email}>, `;
                            });
                        }
                        if (additionalFields.bccList) {
                            const bccList = additionalFields.bccList;
                            bccList.forEach((email) => {
                                bccStr += `<${email}>, `;
                            });
                        }
                        if (additionalFields.attachmentsUi) {
                            const attachmentsUi = additionalFields.attachmentsUi;
                            const attachmentsBinary = [];
                            if (!isEmpty(attachmentsUi)) {
                                if (attachmentsUi.hasOwnProperty('attachmentsBinary') &&
                                    !isEmpty(attachmentsUi.attachmentsBinary) &&
                                    items[i].binary) {
                                    for (const { property } of attachmentsUi.attachmentsBinary) {
                                        for (const binaryProperty of property.split(',')) {
                                            const binaryData = this.helpers.assertBinaryData(i, binaryProperty);
                                            const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryProperty);
                                            attachmentsBinary.push({
                                                name: binaryData.fileName || 'unknown',
                                                content: binaryDataBuffer,
                                                type: binaryData.mimeType,
                                            });
                                        }
                                    }
                                }
                                qs = {
                                    userId: 'me',
                                    uploadType: 'media',
                                };
                                attachmentsList = attachmentsBinary;
                            }
                        }
                        const email = {
                            from: additionalFields.senderName || '',
                            to: toStr,
                            cc: ccStr,
                            bcc: bccStr,
                            subject: this.getNodeParameter('subject', i),
                            body: this.getNodeParameter('message', i),
                            attachments: attachmentsList,
                        };
                        if (this.getNodeParameter('includeHtml', i, false)) {
                            email.htmlBody = this.getNodeParameter('htmlMessage', i);
                        }
                        endpoint = '/gmail/v1/users/me/messages/send';
                        method = 'POST';
                        body = {
                            raw: await encodeEmail(email),
                        };
                        responseData = await googleApiRequest.call(this, method, endpoint, body, qs);
                    }
                    if (operation === 'reply') {
                        const id = this.getNodeParameter('messageId', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        let toStr = '';
                        let ccStr = '';
                        let bccStr = '';
                        let attachmentsList = [];
                        const toList = this.getNodeParameter('toList', i);
                        toList.forEach((email) => {
                            toStr += `<${email}>, `;
                        });
                        if (additionalFields.ccList) {
                            const ccList = additionalFields.ccList;
                            ccList.forEach((email) => {
                                ccStr += `<${email}>, `;
                            });
                        }
                        if (additionalFields.bccList) {
                            const bccList = additionalFields.bccList;
                            bccList.forEach((email) => {
                                bccStr += `<${email}>, `;
                            });
                        }
                        if (additionalFields.attachmentsUi) {
                            const attachmentsUi = additionalFields.attachmentsUi;
                            const attachmentsBinary = [];
                            if (!isEmpty(attachmentsUi)) {
                                if (attachmentsUi.hasOwnProperty('attachmentsBinary') &&
                                    !isEmpty(attachmentsUi.attachmentsBinary) &&
                                    items[i].binary) {
                                    for (const { property } of attachmentsUi.attachmentsBinary) {
                                        for (const binaryProperty of property.split(',')) {
                                            const binaryData = this.helpers.assertBinaryData(i, binaryProperty);
                                            const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryProperty);
                                            attachmentsBinary.push({
                                                name: binaryData.fileName || 'unknown',
                                                content: binaryDataBuffer,
                                                type: binaryData.mimeType,
                                            });
                                        }
                                    }
                                }
                                qs = {
                                    userId: 'me',
                                    uploadType: 'media',
                                };
                                attachmentsList = attachmentsBinary;
                            }
                        }
                        endpoint = `/gmail/v1/users/me/messages/${id}`;
                        qs.format = 'metadata';
                        const { payload } = await googleApiRequest.call(this, method, endpoint, body, qs);
                        if (toStr === '') {
                            for (const header of payload.headers) {
                                if (header.name === 'From') {
                                    toStr = `<${extractEmail(header.value)}>,`;
                                    break;
                                }
                            }
                        }
                        const subject = payload.headers.filter((data) => data.name === 'Subject')[0]?.value || '';
                        const references = payload.headers.filter((data) => data.name === 'References')[0]?.value || '';
                        const email = {
                            from: additionalFields.senderName || '',
                            to: toStr,
                            cc: ccStr,
                            bcc: bccStr,
                            subject,
                            body: this.getNodeParameter('message', i),
                            attachments: attachmentsList,
                        };
                        if (this.getNodeParameter('includeHtml', i, false)) {
                            email.htmlBody = this.getNodeParameter('htmlMessage', i);
                        }
                        endpoint = '/gmail/v1/users/me/messages/send';
                        method = 'POST';
                        email.inReplyTo = id;
                        email.reference = references;
                        body = {
                            raw: await encodeEmail(email),
                            threadId: this.getNodeParameter('threadId', i),
                        };
                        responseData = await googleApiRequest.call(this, method, endpoint, body, qs);
                    }
                    if (operation === 'get') {
                        //https://developers.google.com/gmail/api/v1/reference/users/messages/get
                        method = 'GET';
                        const id = this.getNodeParameter('messageId', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const format = additionalFields.format || 'resolved';
                        if (format === 'resolved') {
                            qs.format = 'raw';
                        }
                        else {
                            qs.format = format;
                        }
                        endpoint = `/gmail/v1/users/me/messages/${id}`;
                        responseData = await googleApiRequest.call(this, method, endpoint, body, qs);
                        let nodeExecutionData;
                        if (format === 'resolved') {
                            const dataPropertyNameDownload = additionalFields.dataPropertyAttachmentsPrefixName || 'attachment_';
                            nodeExecutionData = await parseRawEmail.call(this, responseData, dataPropertyNameDownload);
                        }
                        else {
                            nodeExecutionData = {
                                json: responseData,
                            };
                        }
                        responseData = nodeExecutionData;
                    }
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        Object.assign(qs, additionalFields);
                        if (qs.labelIds) {
                            if (qs.labelIds == '') {
                                delete qs.labelIds;
                            }
                            else {
                                qs.labelIds = qs.labelIds;
                            }
                        }
                        if (returnAll) {
                            responseData = await googleApiRequestAllItems.call(this, 'messages', 'GET', '/gmail/v1/users/me/messages', {}, qs);
                        }
                        else {
                            qs.maxResults = this.getNodeParameter('limit', i);
                            responseData = await googleApiRequest.call(this, 'GET', '/gmail/v1/users/me/messages', {}, qs);
                            responseData = responseData.messages;
                        }
                        if (responseData === undefined) {
                            responseData = [];
                        }
                        const format = additionalFields.format || 'resolved';
                        if (format !== 'ids') {
                            if (format === 'resolved') {
                                qs.format = 'raw';
                            }
                            else {
                                qs.format = format;
                            }
                            for (let index = 0; index < responseData.length; index++) {
                                responseData[index] = await googleApiRequest.call(this, 'GET', `/gmail/v1/users/me/messages/${responseData[index].id}`, body, qs);
                                if (format === 'resolved') {
                                    const dataPropertyNameDownload = additionalFields.dataPropertyAttachmentsPrefixName || 'attachment_';
                                    responseData[index] = await parseRawEmail.call(this, responseData[index], dataPropertyNameDownload);
                                }
                            }
                        }
                        if (format !== 'resolved') {
                            responseData = this.helpers.returnJsonArray(responseData);
                        }
                    }
                    if (operation === 'delete') {
                        // https://developers.google.com/gmail/api/v1/reference/users/messages/delete
                        method = 'DELETE';
                        const id = this.getNodeParameter('messageId', i);
                        endpoint = `/gmail/v1/users/me/messages/${id}`;
                        responseData = await googleApiRequest.call(this, method, endpoint, body, qs);
                        responseData = { success: true };
                    }
                }
                if (resource === 'draft') {
                    if (operation === 'create') {
                        // https://developers.google.com/gmail/api/v1/reference/users/drafts/create
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        let toStr = '';
                        let ccStr = '';
                        let bccStr = '';
                        let attachmentsList = [];
                        if (additionalFields.toList) {
                            const toList = additionalFields.toList;
                            toList.forEach((email) => {
                                toStr += `<${email}>, `;
                            });
                        }
                        if (additionalFields.ccList) {
                            const ccList = additionalFields.ccList;
                            ccList.forEach((email) => {
                                ccStr += `<${email}>, `;
                            });
                        }
                        if (additionalFields.bccList) {
                            const bccList = additionalFields.bccList;
                            bccList.forEach((email) => {
                                bccStr += `<${email}>, `;
                            });
                        }
                        if (additionalFields.attachmentsUi) {
                            const attachmentsUi = additionalFields.attachmentsUi;
                            const attachmentsBinary = [];
                            if (!isEmpty(attachmentsUi)) {
                                if (!isEmpty(attachmentsUi)) {
                                    if (attachmentsUi.hasOwnProperty('attachmentsBinary') &&
                                        !isEmpty(attachmentsUi.attachmentsBinary) &&
                                        items[i].binary) {
                                        for (const { property } of attachmentsUi.attachmentsBinary) {
                                            for (const binaryProperty of property.split(',')) {
                                                const binaryData = this.helpers.assertBinaryData(i, binaryProperty);
                                                const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryProperty);
                                                attachmentsBinary.push({
                                                    name: binaryData.fileName || 'unknown',
                                                    content: binaryDataBuffer,
                                                    type: binaryData.mimeType,
                                                });
                                            }
                                        }
                                    }
                                }
                                qs = {
                                    userId: 'me',
                                    uploadType: 'media',
                                };
                                attachmentsList = attachmentsBinary;
                            }
                        }
                        const email = {
                            from: additionalFields.senderName || '',
                            to: toStr,
                            cc: ccStr,
                            bcc: bccStr,
                            subject: this.getNodeParameter('subject', i),
                            body: this.getNodeParameter('message', i),
                            attachments: attachmentsList,
                        };
                        if (this.getNodeParameter('includeHtml', i, false)) {
                            email.htmlBody = this.getNodeParameter('htmlMessage', i);
                        }
                        endpoint = '/gmail/v1/users/me/drafts';
                        method = 'POST';
                        body = {
                            message: {
                                raw: await encodeEmail(email),
                            },
                        };
                        responseData = await googleApiRequest.call(this, method, endpoint, body, qs);
                    }
                    if (operation === 'get') {
                        // https://developers.google.com/gmail/api/v1/reference/users/drafts/get
                        method = 'GET';
                        const id = this.getNodeParameter('messageId', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const format = additionalFields.format || 'resolved';
                        if (format === 'resolved') {
                            qs.format = 'raw';
                        }
                        else {
                            qs.format = format;
                        }
                        endpoint = `/gmail/v1/users/me/drafts/${id}`;
                        responseData = await googleApiRequest.call(this, method, endpoint, body, qs);
                        const binaryData = {};
                        let nodeExecutionData;
                        if (format === 'resolved') {
                            const dataPropertyNameDownload = additionalFields.dataPropertyAttachmentsPrefixName || 'attachment_';
                            nodeExecutionData = await parseRawEmail.call(this, responseData.message, dataPropertyNameDownload);
                            // Add the draft-id
                            nodeExecutionData.json.messageId = nodeExecutionData.json.id;
                            nodeExecutionData.json.id = responseData.id;
                        }
                        else {
                            nodeExecutionData = {
                                json: responseData,
                                binary: Object.keys(binaryData).length ? binaryData : undefined,
                            };
                        }
                        responseData = nodeExecutionData;
                    }
                    if (operation === 'delete') {
                        // https://developers.google.com/gmail/api/v1/reference/users/drafts/delete
                        method = 'DELETE';
                        const id = this.getNodeParameter('messageId', i);
                        endpoint = `/gmail/v1/users/me/drafts/${id}`;
                        responseData = await googleApiRequest.call(this, method, endpoint, body, qs);
                        responseData = { success: true };
                    }
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        Object.assign(qs, additionalFields);
                        if (returnAll) {
                            responseData = await googleApiRequestAllItems.call(this, 'drafts', 'GET', '/gmail/v1/users/me/drafts', {}, qs);
                        }
                        else {
                            qs.maxResults = this.getNodeParameter('limit', i);
                            responseData = await googleApiRequest.call(this, 'GET', '/gmail/v1/users/me/drafts', {}, qs);
                            responseData = responseData.drafts;
                        }
                        if (responseData === undefined) {
                            responseData = [];
                        }
                        const format = additionalFields.format || 'resolved';
                        if (format !== 'ids') {
                            if (format === 'resolved') {
                                qs.format = 'raw';
                            }
                            else {
                                qs.format = format;
                            }
                            for (let index = 0; index < responseData.length; index++) {
                                responseData[index] = await googleApiRequest.call(this, 'GET', `/gmail/v1/users/me/drafts/${responseData[index].id}`, body, qs);
                                if (format === 'resolved') {
                                    const dataPropertyNameDownload = additionalFields.dataPropertyAttachmentsPrefixName || 'attachment_';
                                    const id = responseData[index].id;
                                    responseData[index] = await parseRawEmail.call(this, responseData[index].message, dataPropertyNameDownload);
                                    // Add the draft-id
                                    responseData[index].json.messageId = responseData[index].json.id;
                                    responseData[index].json.id = id;
                                }
                            }
                        }
                        if (format !== 'resolved') {
                            responseData = this.helpers.returnJsonArray(responseData);
                        }
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
//# sourceMappingURL=GmailV1.node.js.map
import { NodeApiError } from 'n8n-workflow';
export async function microsoftApiRequest(method, resource, body = {}, qs = {}, uri, headers = {}, option = { json: true }) {
    const credentials = await this.getCredentials('microsoftOutlookOAuth2Api');
    let apiUrl = `https://graph.microsoft.com/v1.0/me${resource}`;
    // If accessing shared mailbox
    if (credentials.useShared && credentials.userPrincipalName) {
        apiUrl = `https://graph.microsoft.com/v1.0/users/${credentials.userPrincipalName}${resource}`;
    }
    const options = {
        headers: {
            'Content-Type': 'application/json',
        },
        method,
        body,
        qs,
        uri: uri || apiUrl,
    };
    try {
        Object.assign(options, option);
        if (Object.keys(headers).length !== 0) {
            options.headers = Object.assign({}, options.headers, headers);
        }
        if (Object.keys(body).length === 0) {
            delete options.body;
        }
        return await this.helpers.requestOAuth2.call(this, 'microsoftOutlookOAuth2Api', options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function microsoftApiRequestAllItems(propertyName, method, endpoint, body = {}, query = {}, headers = {}) {
    const returnData = [];
    let responseData;
    let uri;
    query.$top = 100;
    do {
        responseData = await microsoftApiRequest.call(this, method, endpoint, body, query, uri, headers);
        uri = responseData['@odata.nextLink'];
        returnData.push.apply(returnData, responseData[propertyName]);
    } while (responseData['@odata.nextLink'] !== undefined);
    return returnData;
}
export async function microsoftApiRequestAllItemsSkip(propertyName, method, endpoint, body = {}, query = {}, headers = {}) {
    const returnData = [];
    let responseData;
    query.$top = 100;
    query.$skip = 0;
    do {
        responseData = await microsoftApiRequest.call(this, method, endpoint, body, query, undefined, headers);
        query.$skip += query.$top;
        returnData.push.apply(returnData, responseData[propertyName]);
    } while (responseData.value.length !== 0);
    return returnData;
}
export function makeRecipient(email) {
    return {
        emailAddress: {
            address: email,
        },
    };
}
export function createMessage(fields) {
    const message = {};
    // Create body object
    if (fields.bodyContent || fields.bodyContentType) {
        const bodyObject = {
            content: fields.bodyContent,
            contentType: fields.bodyContentType,
        };
        message.body = bodyObject;
        delete fields.bodyContent;
        delete fields.bodyContentType;
    }
    // Handle custom headers
    if ('internetMessageHeaders' in fields &&
        'headers' in fields.internetMessageHeaders) {
        fields.internetMessageHeaders = fields.internetMessageHeaders.headers;
    }
    // Handle recipient fields
    ['bccRecipients', 'ccRecipients', 'replyTo', 'sender', 'toRecipients'].forEach((key) => {
        if (Array.isArray(fields[key])) {
            fields[key] = fields[key].map((email) => makeRecipient(email));
        }
        else if (fields[key] !== undefined) {
            fields[key] = fields[key]
                .split(',')
                .map((recipient) => makeRecipient(recipient));
        }
    });
    ['from', 'sender'].forEach((key) => {
        if (fields[key] !== undefined) {
            fields[key] = makeRecipient(fields[key]);
        }
    });
    Object.assign(message, fields);
    return message;
}
export async function downloadAttachments(messages, prefix) {
    const elements = [];
    if (!Array.isArray(messages)) {
        messages = [messages];
    }
    for (const message of messages) {
        const element = {
            json: message,
            binary: {},
        };
        if (message.hasAttachments === true) {
            const attachments = await microsoftApiRequestAllItems.call(this, 'value', 'GET', `/messages/${message.id}/attachments`, {});
            for (const [index, attachment] of attachments.entries()) {
                const response = await microsoftApiRequest.call(this, 'GET', `/messages/${message.id}/attachments/${attachment.id}/$value`, undefined, {}, undefined, {}, { encoding: null, resolveWithFullResponse: true });
                const data = Buffer.from(response.body, 'utf8');
                element.binary[`${prefix}${index}`] = await this.helpers.prepareBinaryData(data, attachment.name, attachment.contentType);
            }
        }
        if (Object.keys(element.binary).length === 0) {
            delete element.binary;
        }
        elements.push(element);
    }
    return elements;
}
//# sourceMappingURL=GenericFunctions.js.map
import isEmpty from 'lodash/isEmpty';
import { DateTime } from 'luxon';
import { simpleParser } from 'mailparser';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import MailComposer from 'nodemailer/lib/mail-composer';
import { createUtmCampaignLink, escapeHtml } from '../../../utils/utilities';
import { getGoogleAccessToken } from '../GenericFunctions';
export async function googleApiRequest(method, endpoint, body = {}, qs = {}, uri, option = {}) {
    let options = {
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        method,
        body,
        qs,
        uri: uri || `https://www.googleapis.com${endpoint}`,
        qsStringifyOptions: {
            arrayFormat: 'repeat',
        },
        json: true,
    };
    options = Object.assign({}, options, option);
    try {
        if (Object.keys(body).length === 0) {
            delete options.body;
        }
        let credentialType = 'gmailOAuth2';
        const authentication = this.getNodeParameter('authentication', 0);
        if (authentication === 'serviceAccount') {
            const credentials = await this.getCredentials('googleApi');
            credentialType = 'googleApi';
            const { access_token } = await getGoogleAccessToken.call(this, credentials, 'gmail');
            options.headers.Authorization = `Bearer ${access_token}`;
        }
        const response = await this.helpers.requestWithAuthentication.call(this, credentialType, options);
        return response;
    }
    catch (error) {
        if (error.code === 'ERR_OSSL_PEM_NO_START_LINE') {
            error.statusCode = '401';
        }
        if (error.httpCode === '400') {
            if (error.cause && (error.cause.message || '').includes('Invalid id value')) {
                const resource = this.getNodeParameter('resource', 0);
                const errorOptions = {
                    message: `Invalid ${resource} ID`,
                    description: `${resource.charAt(0).toUpperCase() + resource.slice(1)} IDs should look something like this: 182b676d244938bd`,
                };
                throw new NodeApiError(this.getNode(), error, errorOptions);
            }
        }
        if (error.httpCode === '404') {
            let resource = this.getNodeParameter('resource', 0);
            if (resource === 'label') {
                resource = 'label ID';
            }
            const errorOptions = {
                message: `${resource.charAt(0).toUpperCase() + resource.slice(1)} not found`,
                description: '',
            };
            throw new NodeApiError(this.getNode(), error, errorOptions);
        }
        if (error.httpCode === '409') {
            const resource = this.getNodeParameter('resource', 0);
            if (resource === 'label') {
                const errorOptions = {
                    message: 'Label name exists already',
                    description: '',
                };
                throw new NodeApiError(this.getNode(), error, errorOptions);
            }
        }
        if (error.code === 'EAUTH') {
            const errorOptions = {
                message: error?.body?.error_description || 'Authorization error',
                description: error.message,
            };
            throw new NodeApiError(this.getNode(), error, errorOptions);
        }
        if ((error.message || '').includes('Bad request - please check your parameters') &&
            error.description) {
            const errorOptions = {
                message: error.description,
                description: '',
            };
            throw new NodeApiError(this.getNode(), error, errorOptions);
        }
        throw new NodeApiError(this.getNode(), error, {
            message: error.message,
            description: error.description,
        });
    }
}
export async function parseRawEmail(messageData, dataPropertyNameDownload) {
    const messageEncoded = Buffer.from(messageData.raw, 'base64').toString('utf8');
    const responseData = await simpleParser(messageEncoded);
    const headers = {};
    for (const header of responseData.headerLines) {
        headers[header.key] = header.line;
    }
    const binaryData = {};
    if (responseData.attachments) {
        const downloadAttachments = this.getNodeParameter('options.downloadAttachments', 0, false);
        if (downloadAttachments) {
            for (let i = 0; i < responseData.attachments.length; i++) {
                const attachment = responseData.attachments[i];
                binaryData[`${dataPropertyNameDownload}${i}`] = await this.helpers.prepareBinaryData(attachment.content, attachment.filename, attachment.contentType);
            }
        }
    }
    const mailBaseData = {};
    const resolvedModeAddProperties = ['id', 'threadId', 'labelIds', 'sizeEstimate'];
    for (const key of resolvedModeAddProperties) {
        mailBaseData[key] = messageData[key];
    }
    const json = Object.assign({}, mailBaseData, responseData, {
        headers,
        headerLines: undefined,
        attachments: undefined,
        // Having data in IDataObjects that is not representable in JSON leads to
        // inconsistencies between test executions and production executions.
        // During a manual execution this would be stringified and during a
        // production execution the next node would receive a date instance.
        date: responseData.date ? responseData.date.toISOString() : responseData.date,
    });
    return {
        json,
        binary: Object.keys(binaryData).length ? binaryData : undefined,
    };
}
//------------------------------------------------------------------------------------------------------------------------------------------
// This function converts an email object into a MIME encoded email and then converts that string into base64 encoding
// for more info on MIME, https://docs.microsoft.com/en-us/previous-versions/office/developer/exchange-server-2010/aa494197(v%3Dexchg.140)
//------------------------------------------------------------------------------------------------------------------------------------------
export async function encodeEmail(email) {
    // https://nodemailer.com/extras/mailcomposer/#e-mail-message-fields
    const mailOptions = {
        from: email.from,
        to: email.to,
        cc: email.cc,
        bcc: email.bcc,
        replyTo: email.replyTo,
        inReplyTo: email.inReplyTo,
        references: email.reference,
        subject: email.subject,
        text: email.body,
        keepBcc: true,
    };
    if (email.htmlBody) {
        mailOptions.html = email.htmlBody;
    }
    if (email.attachments !== undefined &&
        Array.isArray(email.attachments) &&
        email.attachments.length > 0) {
        const attachments = email.attachments.map((attachment) => ({
            filename: attachment.name,
            content: attachment.content,
            contentType: attachment.type,
            encoding: 'base64',
        }));
        mailOptions.attachments = attachments;
    }
    mailOptions.disableFileAccess = true;
    mailOptions.disableUrlAccess = true;
    const mail = new MailComposer(mailOptions).compile();
    // by default the bcc headers are deleted when the mail is built.
    // So add keepBcc flag to override such behaviour. Only works when
    // the flag is set after the compilation.
    mail.keepBcc = true;
    const mailBody = await mail.build();
    return mailBody.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export async function googleApiRequestAllItems(propertyName, method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.maxResults = 100;
    do {
        responseData = await googleApiRequest.call(this, method, endpoint, body, query);
        query.pageToken = responseData.nextPageToken;
        returnData.push.apply(returnData, responseData[propertyName]);
    } while (responseData.nextPageToken !== undefined && responseData.nextPageToken !== '');
    return returnData;
}
export function extractEmail(s) {
    if (s.includes('<')) {
        const data = s.split('<')[1];
        return data.substring(0, data.length - 1);
    }
    return s;
}
export const prepareTimestamp = (node, itemIndex, query, dateValue, label) => {
    if (dateValue instanceof DateTime) {
        dateValue = dateValue.toISO();
    }
    let timestamp = DateTime.fromISO(dateValue).toSeconds();
    const timestampLengthInMilliseconds1990 = 12;
    if (typeof timestamp === 'number') {
        timestamp = Math.round(timestamp);
    }
    if (!timestamp &&
        typeof dateValue === 'number' &&
        dateValue.toString().length < timestampLengthInMilliseconds1990) {
        timestamp = dateValue;
    }
    if (!timestamp && dateValue.length < timestampLengthInMilliseconds1990) {
        timestamp = parseInt(dateValue, 10);
    }
    if (!timestamp) {
        timestamp = Math.floor(DateTime.fromMillis(parseInt(dateValue, 10)).toSeconds());
    }
    if (!timestamp) {
        const description = `'${dateValue}' isn't a valid date and time. If you're using an expression, be sure to set an ISO date string or a timestamp.`;
        throw new NodeOperationError(node, `Invalid date/time in 'Received ${label[0].toUpperCase() + label.slice(1)}' field`, {
            description,
            itemIndex,
        });
    }
    if (query) {
        query += ` ${label}:${timestamp}`;
    }
    else {
        query = `${label}:${timestamp}`;
    }
    return query;
};
export function prepareQuery(fields, itemIndex) {
    const qs = { ...fields };
    if (qs.labelIds) {
        if (qs.labelIds === '') {
            delete qs.labelIds;
        }
        else {
            qs.labelIds = qs.labelIds;
        }
    }
    if (qs.sender) {
        if (qs.q) {
            qs.q += ` from:${qs.sender}`;
        }
        else {
            qs.q = `from:${qs.sender}`;
        }
        delete qs.sender;
    }
    if (qs.readStatus && qs.readStatus !== 'both') {
        if (qs.q) {
            qs.q += ` is:${qs.readStatus}`;
        }
        else {
            qs.q = `is:${qs.readStatus}`;
        }
    }
    delete qs.readStatus;
    if (qs.receivedAfter) {
        qs.q = prepareTimestamp(this.getNode(), itemIndex, qs.q, qs.receivedAfter, 'after');
        delete qs.receivedAfter;
    }
    if (qs.receivedBefore) {
        qs.q = prepareTimestamp(this.getNode(), itemIndex, qs.q, qs.receivedBefore, 'before');
        delete qs.receivedBefore;
    }
    return qs;
}
export function prepareEmailsInput(input, fieldName, itemIndex) {
    let emails = '';
    input = String(input ?? '');
    input.split(',').forEach((entry) => {
        const email = entry.trim();
        if (email.indexOf('@') === -1) {
            const description = `The email address '${email}' in the '${fieldName}' field isn't valid`;
            throw new NodeOperationError(this.getNode(), 'Invalid email address', {
                description,
                itemIndex,
            });
        }
        if (email.includes('<') && email.includes('>')) {
            emails += `${email},`;
        }
        else {
            emails += `<${email}>, `;
        }
    });
    return emails;
}
export function prepareEmailBody(itemIndex, appendAttribution = false, instanceId) {
    const emailType = this.getNodeParameter('emailType', itemIndex);
    let message = String(this.getNodeParameter('message', itemIndex, '') ?? '').trim();
    if (appendAttribution) {
        const attributionText = 'This email was sent automatically with ';
        const link = createUtmCampaignLink('n8n-nodes-base.gmail', instanceId);
        if (emailType === 'html') {
            message = `
			${message}
			<br>
			<br>
			---
			<br>
			<em>${attributionText}<a href="${link}" target="_blank">n8n</a></em>
			`;
        }
        else {
            message = `${message}\n\n---\n${attributionText}n8n\n${'https://n8n.io'}`;
        }
    }
    const body = {
        body: '',
        htmlBody: '',
    };
    if (emailType === 'html') {
        body.htmlBody = message;
    }
    else {
        body.body = message;
    }
    return body;
}
export async function prepareEmailAttachments(options, itemIndex) {
    const attachmentsList = [];
    const attachments = options.attachmentsBinary;
    if (attachments && !isEmpty(attachments)) {
        for (const { property } of attachments) {
            for (const name of String(property ?? '').split(',')) {
                const binaryData = this.helpers.assertBinaryData(itemIndex, name);
                const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(itemIndex, name);
                if (!Buffer.isBuffer(binaryDataBuffer)) {
                    const description = `The input field '${name}' doesn't contain an attachment. Please make sure you specify a field containing binary data`;
                    throw new NodeOperationError(this.getNode(), 'Attachment not found', {
                        description,
                        itemIndex,
                    });
                }
                attachmentsList.push({
                    name: binaryData.fileName || 'unknown',
                    content: binaryDataBuffer,
                    type: binaryData.mimeType,
                });
            }
        }
    }
    return attachmentsList;
}
export function unescapeSnippets(items) {
    const result = items.map((item) => {
        const snippet = item.json.snippet;
        if (snippet) {
            item.json.snippet = escapeHtml(snippet);
        }
        return item;
    });
    return result;
}
export async function simplifyOutput(data) {
    const labelsData = await googleApiRequest.call(this, 'GET', '/gmail/v1/users/me/labels');
    const labels = (labelsData.labels || []).map(({ id, name }) => ({
        id,
        name,
    }));
    return (data || []).map((item) => {
        if (item.labelIds) {
            item.labels = labels.filter((label) => item.labelIds.includes(label.id));
            delete item.labelIds;
        }
        if (item.payload && item.payload.headers) {
            const { headers } = item.payload;
            (headers || []).forEach((header) => {
                item[header.name] = header.value;
            });
            delete item.payload.headers;
        }
        return item;
    });
}
/**
 * Get all the labels to display them to user so that they can select them easily
 */
export async function getLabels() {
    const returnData = [];
    const labels = await googleApiRequestAllItems.call(this, 'labels', 'GET', '/gmail/v1/users/me/labels');
    for (const label of labels) {
        returnData.push({
            name: label.name,
            value: label.id,
        });
    }
    return returnData.sort((a, b) => {
        if (a.name < b.name) {
            return -1;
        }
        if (a.name > b.name) {
            return 1;
        }
        return 0;
    });
}
//# sourceMappingURL=GenericFunctions.js.map
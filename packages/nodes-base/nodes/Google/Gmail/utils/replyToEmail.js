import uniq from 'lodash/uniq';
import { NodeOperationError } from 'n8n-workflow';
import addressparser from 'nodemailer/lib/addressparser';
import { encodeEmail, googleApiRequest, prepareEmailAttachments, prepareEmailBody, prepareEmailsInput, } from '../GenericFunctions';
export async function replyToEmail(gmailId, options, itemIndex, nodeVersion) {
    if (options.replyToSenderOnly && options.replyToRecipientsOnly) {
        throw new NodeOperationError(this.getNode(), 'Both "Reply to Sender Only" and "Reply to Recipient Only" cannot be enabled at the same time. Please select only one option.', { itemIndex });
    }
    let qs = {};
    let cc = '';
    let bcc = '';
    if (options.ccList) {
        cc = prepareEmailsInput.call(this, options.ccList, 'CC', itemIndex);
    }
    if (options.bccList) {
        bcc = prepareEmailsInput.call(this, options.bccList, 'BCC', itemIndex);
    }
    let attachments = [];
    if (options.attachmentsUi) {
        attachments = await prepareEmailAttachments.call(this, options.attachmentsUi, itemIndex);
        if (attachments.length) {
            qs = {
                userId: 'me',
                uploadType: 'media',
            };
        }
    }
    const endpoint = `/gmail/v1/users/me/messages/${gmailId}`;
    qs.format = 'metadata';
    const { payload, threadId } = (await googleApiRequest.call(this, 'GET', endpoint, {}, qs));
    const subject = payload.headers.filter((data) => data.name.toLowerCase() === 'subject')[0]?.value || '';
    const messageIdGlobal = payload.headers.filter((data) => data.name.toLowerCase() === 'message-id')[0]?.value || '';
    const { emailAddress } = (await googleApiRequest.call(this, 'GET', '/gmail/v1/users/me/profile'));
    const to = [];
    const replyToSenderOnly = options.replyToSenderOnly === undefined ? false : options.replyToSenderOnly;
    const replyToRecipientsOnly = options.replyToRecipientsOnly === undefined
        ? false
        : options.replyToRecipientsOnly;
    // If the name contains an RFC 5322 special, wrap it in quotes and escape any
    // embedded `"` or `\`; otherwise it can be used as-is.
    const formatDisplayName = (name) => /["(),:;<>@[\]\\]/.test(name) ? `"${name.replace(/["\\]/g, '\\$&')}"` : name;
    const addRecipients = (headerValue, excludeSelf) => {
        for (const { address, name } of addressparser(headerValue, { flatten: true })) {
            if (!address)
                continue;
            if (excludeSelf && address.toLowerCase() === emailAddress.toLowerCase())
                continue;
            to.push(name ? `${formatDisplayName(name)} <${address}>` : `<${address}>`);
        }
    };
    let replyToHeaderName = 'from';
    if (nodeVersion >= 2.2 && payload.headers.some((h) => h.name.toLowerCase() === 'reply-to')) {
        replyToHeaderName = 'reply-to';
    }
    for (const header of payload.headers) {
        const headerName = (header.name || '').toLowerCase();
        if (headerName === replyToHeaderName && !replyToRecipientsOnly) {
            addRecipients(header.value, false);
        }
        if (headerName === 'to' && !replyToSenderOnly) {
            addRecipients(header.value, true);
        }
    }
    let from = '';
    if (options.senderName) {
        from = `${options.senderName} <${emailAddress}>`;
    }
    const toString = uniq(to).join(', ');
    const email = {
        from,
        to: toString,
        cc,
        bcc,
        subject,
        attachments,
        inReplyTo: messageIdGlobal,
        reference: messageIdGlobal,
        ...prepareEmailBody.call(this, itemIndex),
    };
    const body = {
        raw: await encodeEmail(email),
        threadId,
    };
    return (await googleApiRequest.call(this, 'POST', '/gmail/v1/users/me/messages/send', body, qs));
}
//# sourceMappingURL=replyToEmail.js.map
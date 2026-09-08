import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';
import { prepareBinariesDataList } from '../../utils/binary';
export class Mailgun {
    description = {
        displayName: 'Mailgun',
        name: 'mailgun',
        icon: 'file:mailgun.svg',
        group: ['output'],
        version: 1,
        description: 'Sends an email via Mailgun',
        defaults: {
            name: 'Mailgun',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'mailgunApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'From Email',
                name: 'fromEmail',
                type: 'string',
                default: '',
                required: true,
                placeholder: 'Admin <admin@example.com>',
                description: 'Email address of the sender optional with name',
            },
            {
                displayName: 'To Email',
                name: 'toEmail',
                type: 'string',
                default: '',
                required: true,
                placeholder: 'info@example.com',
                description: 'Email address of the recipient. Multiple ones can be separated by comma.',
            },
            {
                displayName: 'Cc Email',
                name: 'ccEmail',
                type: 'string',
                default: '',
                placeholder: '',
                description: 'Cc Email address of the recipient. Multiple ones can be separated by comma.',
            },
            {
                displayName: 'Bcc Email',
                name: 'bccEmail',
                type: 'string',
                default: '',
                placeholder: '',
                description: 'Bcc Email address of the recipient. Multiple ones can be separated by comma.',
            },
            {
                displayName: 'Reply-To',
                name: 'replyTo',
                type: 'string',
                default: '',
                placeholder: 'reply@example.com',
                description: 'Reply-To header. Recipients will use this address when replying.',
            },
            {
                displayName: 'Custom Headers',
                name: 'customHeaders',
                type: 'fixedCollection',
                typeOptions: {
                    multipleValues: true,
                },
                default: {},
                placeholder: 'Add Header',
                description: 'Arbitrary email headers. Enter only the header name (e.g. X-Custom-Header); the h: prefix is added automatically.',
                options: [
                    {
                        name: 'headers',
                        displayName: 'Header',
                        values: [
                            {
                                displayName: 'Name',
                                name: 'name',
                                type: 'string',
                                default: '',
                                placeholder: 'X-Custom-Header',
                                description: 'Header name (without h: prefix; it is added automatically)',
                            },
                            {
                                displayName: 'Value',
                                name: 'value',
                                type: 'string',
                                default: '',
                                description: 'Header value',
                            },
                        ],
                    },
                ],
            },
            {
                displayName: 'Tags',
                name: 'tags',
                type: 'string',
                default: '',
                placeholder: 'tag1, tag2',
                description: 'Tags for segmentation and analytics (comma-separated). Sent as o:tag.',
            },
            {
                displayName: 'Subject',
                name: 'subject',
                type: 'string',
                default: '',
                placeholder: 'My subject line',
                description: 'Subject line of the email',
            },
            {
                displayName: 'Text',
                name: 'text',
                type: 'string',
                typeOptions: {
                    rows: 5,
                },
                default: '',
                description: 'Plain text message of email',
            },
            {
                displayName: 'HTML',
                name: 'html',
                type: 'string',
                typeOptions: {
                    rows: 5,
                    editor: 'htmlEditor',
                },
                default: '',
                description: 'HTML text message of email',
            },
            {
                displayName: 'Attachments',
                name: 'attachments',
                type: 'string',
                default: '',
                description: 'Name of the binary properties which contain data which should be added to email as attachment. Multiple ones can be comma-separated.',
            },
        ],
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const length = items.length;
        let item;
        for (let itemIndex = 0; itemIndex < length; itemIndex++) {
            try {
                item = items[itemIndex];
                const fromEmail = this.getNodeParameter('fromEmail', itemIndex);
                const toEmail = this.getNodeParameter('toEmail', itemIndex);
                const ccEmail = this.getNodeParameter('ccEmail', itemIndex);
                const bccEmail = this.getNodeParameter('bccEmail', itemIndex);
                const replyTo = this.getNodeParameter('replyTo', itemIndex);
                const customHeaders = this.getNodeParameter('customHeaders', itemIndex);
                const tagsParam = this.getNodeParameter('tags', itemIndex);
                const subject = this.getNodeParameter('subject', itemIndex);
                const text = this.getNodeParameter('text', itemIndex);
                const html = this.getNodeParameter('html', itemIndex);
                const attachmentPropertyString = this.getNodeParameter('attachments', itemIndex);
                const credentials = await this.getCredentials('mailgunApi');
                const formData = {
                    from: fromEmail,
                    to: toEmail,
                    subject,
                    text,
                    html,
                };
                if (ccEmail.length !== 0) {
                    formData.cc = ccEmail;
                }
                if (bccEmail.length !== 0) {
                    formData.bcc = bccEmail;
                }
                if (replyTo.trim().length !== 0) {
                    formData['h:Reply-To'] = replyTo.trim();
                }
                const headerEntries = customHeaders?.headers ?? [];
                for (const { name: headerName, value: headerValue } of headerEntries) {
                    if (headerName?.trim() && headerValue !== undefined) {
                        formData[`h:${headerName.trim()}`] = headerValue;
                    }
                }
                if (tagsParam.trim().length !== 0) {
                    const tagList = tagsParam
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean);
                    if (tagList.length) {
                        formData['o:tag'] = tagList;
                    }
                }
                if (attachmentPropertyString && item.binary) {
                    const attachments = [];
                    const attachmentProperties = prepareBinariesDataList(attachmentPropertyString);
                    for (const propertyName of attachmentProperties) {
                        const binaryData = this.helpers.assertBinaryData(itemIndex, propertyName);
                        const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(itemIndex, propertyName);
                        attachments.push({
                            value: binaryDataBuffer,
                            options: {
                                filename: binaryData.fileName || 'unknown',
                            },
                        });
                    }
                    if (attachments.length) {
                        formData.attachment = attachments;
                    }
                }
                const options = {
                    method: 'POST',
                    formData,
                    uri: `https://${credentials.apiDomain}/v3/${credentials.emailDomain}/messages`,
                    json: true,
                };
                let responseData;
                try {
                    responseData = await this.helpers.requestWithAuthentication.call(this, 'mailgunApi', options);
                }
                catch (error) {
                    throw new NodeApiError(this.getNode(), error);
                }
                const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: itemIndex } });
                returnData.push(...executionData);
            }
            catch (error) {
                if (this.continueOnFail()) {
                    const executionErrorData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData: { item: itemIndex } });
                    returnData.push(...executionErrorData);
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
//# sourceMappingURL=Mailgun.node.js.map
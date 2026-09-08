import isbot from 'isbot';
import { getHtmlSandboxCSP, isFormHtmlSandboxingDisabled } from 'n8n-core';
import { NodeOperationError, SEND_AND_WAIT_OPERATION, updateDisplayOptions } from 'n8n-workflow';
import { cssVariables } from '../../nodes/Form/cssVariables';
import { formFieldsProperties } from '../../nodes/Form/Form.node';
import { parseFormFields, parseJsonFormFields, prepareFormData, prepareFormFields, prepareFormReturnItem, } from '../../nodes/Form/utils/utils';
import { escapeHtml } from '../utilities';
import { limitWaitTimeOption } from './descriptions';
import { ACTION_RECORDED_PAGE, BUTTON_STYLE_PRIMARY, BUTTON_STYLE_SECONDARY, createEmailBodyWithN8nAttribution, createEmailBodyWithoutN8nAttribution, } from './email-templates';
const INPUT_FIELD_IDENTIFIER = 'field-0';
const appendAttributionOption = {
    displayName: 'Append n8n Attribution',
    name: 'appendAttribution',
    type: 'boolean',
    default: true,
    description: 'Whether to include the phrase "This message was sent automatically with n8n" to the end of the message',
};
// Operation Properties ----------------------------------------------------------
export function getSendAndWaitProperties(targetProperties, resource = 'message', additionalProperties = [], options) {
    const buttonStyle = {
        displayName: 'Button Style',
        name: 'buttonStyle',
        type: 'options',
        default: 'primary',
        options: [
            {
                name: 'Primary',
                value: 'primary',
            },
            {
                name: 'Secondary',
                value: 'secondary',
            },
        ],
    };
    const approvalOptionsValues = [
        {
            displayName: 'Type of Approval',
            name: 'approvalType',
            type: 'options',
            placeholder: 'Add option',
            default: 'single',
            options: [
                {
                    name: 'Approve Only',
                    value: 'single',
                },
                {
                    name: 'Approve and Disapprove',
                    value: 'double',
                },
            ],
        },
        {
            displayName: 'Approve Button Label',
            name: 'approveLabel',
            type: 'string',
            default: options?.defaultApproveLabel || 'Approve',
            displayOptions: {
                show: {
                    approvalType: ['single', 'double'],
                },
            },
        },
        ...[
            options?.noButtonStyle
                ? {}
                : {
                    ...buttonStyle,
                    displayName: 'Approve Button Style',
                    name: 'buttonApprovalStyle',
                    displayOptions: {
                        show: {
                            approvalType: ['single', 'double'],
                        },
                    },
                },
        ],
        {
            displayName: 'Disapprove Button Label',
            name: 'disapproveLabel',
            type: 'string',
            default: options?.defaultDisapproveLabel || 'Decline',
            displayOptions: {
                show: {
                    approvalType: ['double'],
                },
            },
        },
        ...[
            options?.noButtonStyle
                ? {}
                : {
                    ...buttonStyle,
                    displayName: 'Disapprove Button Style',
                    name: 'buttonDisapprovalStyle',
                    default: 'secondary',
                    displayOptions: {
                        show: {
                            approvalType: ['double'],
                        },
                    },
                },
        ],
    ].filter((p) => Object.keys(p).length);
    const sendAndWait = [
        ...targetProperties,
        {
            displayName: 'Subject',
            name: 'subject',
            type: 'string',
            default: '',
            required: true,
            placeholder: 'e.g. Approval required',
        },
        {
            displayName: 'Message',
            name: 'message',
            type: 'string',
            default: '',
            required: true,
            typeOptions: {
                rows: 4,
            },
        },
        {
            displayName: 'Response Type',
            name: 'responseType',
            type: 'options',
            default: 'approval',
            options: [
                {
                    name: 'Approval',
                    value: 'approval',
                    description: 'User can approve/disapprove from within the message',
                },
                {
                    name: 'Free Text',
                    value: 'freeText',
                    description: 'User can submit a response via a form',
                },
                {
                    name: 'Custom Form',
                    value: 'customForm',
                    description: 'User can submit a response via a custom form',
                },
            ],
        },
        ...updateDisplayOptions({
            show: {
                responseType: ['customForm'],
            },
        }, formFieldsProperties),
        {
            displayName: 'Approval Options',
            name: 'approvalOptions',
            type: 'fixedCollection',
            placeholder: 'Add option',
            default: {},
            options: [
                {
                    displayName: 'Values',
                    name: 'values',
                    values: approvalOptionsValues,
                },
            ],
            displayOptions: {
                show: {
                    responseType: ['approval'],
                },
            },
        },
        // Advanced-HITL nodes (Slack, Telegram) render these as a section right before "Options".
        ...additionalProperties,
        {
            displayName: 'Options',
            name: 'options',
            type: 'collection',
            placeholder: 'Add option',
            default: {},
            options: [limitWaitTimeOption, appendAttributionOption, ...(options?.extraOptions ?? [])],
            displayOptions: {
                show: {
                    responseType: ['approval'],
                },
            },
        },
        {
            displayName: 'Options',
            name: 'options',
            type: 'collection',
            placeholder: 'Add option',
            default: {},
            options: [
                {
                    displayName: 'Message Button Label',
                    name: 'messageButtonLabel',
                    type: 'string',
                    default: 'Respond',
                },
                {
                    displayName: 'Response Form Title',
                    name: 'responseFormTitle',
                    description: 'Title of the form that the user can access to provide their response',
                    type: 'string',
                    default: '',
                },
                {
                    displayName: 'Response Form Description',
                    name: 'responseFormDescription',
                    description: 'Description of the form that the user can access to provide their response',
                    type: 'string',
                    default: '',
                },
                {
                    displayName: 'Response Form Button Label',
                    name: 'responseFormButtonLabel',
                    type: 'string',
                    default: 'Submit',
                },
                {
                    displayName: 'Response Form Custom Styling',
                    name: 'responseFormCustomCss',
                    type: 'string',
                    typeOptions: {
                        rows: 10,
                        editor: 'cssEditor',
                    },
                    default: cssVariables.trim(),
                    description: 'Override default styling of the response form with CSS',
                },
                limitWaitTimeOption,
                appendAttributionOption,
                ...(options?.extraOptions ?? []),
            ],
            displayOptions: {
                show: {
                    responseType: ['freeText', 'customForm'],
                },
            },
        },
    ];
    return updateDisplayOptions({
        show: {
            ...(resource ? { resource: [resource] } : {}),
            operation: [SEND_AND_WAIT_OPERATION],
        },
    }, sendAndWait);
}
// Webhook Function --------------------------------------------------------------
const getFormResponseCustomizations = (context) => {
    const message = context.getNodeParameter('message', '');
    const options = context.getNodeParameter('options', {});
    let formTitle = '';
    if (options.responseFormTitle) {
        formTitle = options.responseFormTitle;
    }
    let formDescription = message;
    if (options.responseFormDescription) {
        formDescription = options.responseFormDescription;
    }
    formDescription = formDescription.replace(/\\n/g, '\n').replace(/<br>/g, '\n');
    let buttonLabel = 'Submit';
    if (options.responseFormButtonLabel) {
        buttonLabel = options.responseFormButtonLabel;
    }
    return {
        formTitle,
        formDescription,
        buttonLabel,
        customCss: options.responseFormCustomCss,
    };
};
// Block requests from Microsoft Preview Service to prevent accidental
// approval/disapproval when sending links in Teams
const isMicrosoftPreviewService = (userAgent) => {
    // The request that the Preview Service makes when the message is sent in
    // Teams does not have a user-agent header
    if (!userAgent) {
        return true;
    }
    userAgent = userAgent.toLowerCase();
    // The request that the Preview Service makes when the link is pasted in
    // Teams does have a user-agent header that can be used to identify it
    return ['teams', 'skype', 'preview'].some((str) => userAgent.includes(str));
};
export async function sendAndWaitWebhook() {
    const method = this.getRequestObject().method;
    const res = this.getResponseObject();
    const req = this.getRequestObject();
    const responseType = this.getNodeParameter('responseType', 'approval');
    if (responseType === 'approval' &&
        (isbot(req.headers['user-agent']) || isMicrosoftPreviewService(req.headers['user-agent']))) {
        res.send('');
        return { noWebhookResponse: true };
    }
    if (responseType === 'freeText') {
        if (method === 'GET') {
            const { formTitle, formDescription, buttonLabel, customCss } = getFormResponseCustomizations(this);
            const data = prepareFormData({
                formTitle,
                formDescription,
                formSubmittedHeader: 'Got it, thanks',
                formSubmittedText: 'This page can be closed now',
                buttonLabel,
                redirectUrl: undefined,
                formFields: [
                    {
                        fieldLabel: 'Response',
                        fieldType: 'textarea',
                        requiredField: true,
                    },
                ],
                testRun: false,
                query: {},
                customCss,
            });
            if (!isFormHtmlSandboxingDisabled()) {
                res.setHeader('Content-Security-Policy', getHtmlSandboxCSP());
            }
            res.render('form-trigger', data);
            return {
                noWebhookResponse: true,
            };
        }
        if (method === 'POST') {
            const data = this.getBodyData().data;
            return {
                webhookResponse: ACTION_RECORDED_PAGE,
                workflowData: [
                    [
                        {
                            json: {
                                data: {
                                    text: data[INPUT_FIELD_IDENTIFIER],
                                    respondedAt: new Date().toISOString(),
                                },
                            },
                        },
                    ],
                ],
            };
        }
    }
    if (responseType === 'customForm') {
        const defineForm = this.getNodeParameter('defineForm', 'fields');
        let fields = [];
        if (defineForm === 'json') {
            fields = parseFormFields(this, {
                defineForm: 'json',
                fieldsParameterName: 'jsonOutput',
            });
        }
        else {
            fields = parseFormFields(this, {
                defineForm: 'fields',
                fieldsParameterName: 'formFields.values',
            });
        }
        if (method === 'GET') {
            const { formTitle, formDescription, buttonLabel, customCss } = getFormResponseCustomizations(this);
            fields = prepareFormFields(fields);
            const data = prepareFormData({
                formTitle,
                formDescription,
                formSubmittedHeader: 'Got it, thanks',
                formSubmittedText: 'This page can be closed now',
                buttonLabel,
                redirectUrl: undefined,
                formFields: fields,
                testRun: false,
                query: {},
                customCss,
            });
            if (!isFormHtmlSandboxingDisabled()) {
                res.setHeader('Content-Security-Policy', getHtmlSandboxCSP());
            }
            res.render('form-trigger', data);
            return {
                noWebhookResponse: true,
            };
        }
        if (method === 'POST') {
            const returnItem = await prepareFormReturnItem(this, fields, 'production', true);
            const json = returnItem.json;
            delete json.submittedAt;
            delete json.formMode;
            // respondedAt is applied last so a form field of the same name can't override
            // the server-set response timestamp.
            returnItem.json = { data: { ...json, respondedAt: new Date().toISOString() } };
            return {
                webhookResponse: ACTION_RECORDED_PAGE,
                workflowData: [[returnItem]],
            };
        }
    }
    const query = req.query;
    const approved = query.approved === 'true';
    return {
        webhookResponse: ACTION_RECORDED_PAGE,
        workflowData: [[{ json: { data: { approved, respondedAt: new Date().toISOString() } } }]],
    };
}
// Send and Wait Config -----------------------------------------------------------
// The response form is only built when it is requested, from data that may no longer resolve
// by then. Parse it here, exactly as the webhook will, so a form that cannot be built fails
// the node instead of sending a message with a link that can never render.
function validateCustomFormFields(context) {
    const defineForm = context.getNodeParameter('defineForm', 0, 'fields');
    // The 'fields' branch has nothing that needs to be validated
    if (defineForm !== 'json')
        return;
    const getJsonOutput = () => context.getNodeParameter('jsonOutput', 0, '', {
        rawExpressions: true,
    });
    parseJsonFormFields(context, getJsonOutput);
}
export function getSendAndWaitConfig(context) {
    const message = escapeHtml(context.getNodeParameter('message', 0, '').trim())
        .replace(/\\n/g, '\n')
        .replace(/<br>/g, '\n');
    const subject = escapeHtml(context.getNodeParameter('subject', 0, ''));
    const approvalOptions = context.getNodeParameter('approvalOptions.values', 0, {});
    const options = context.getNodeParameter('options', 0, {});
    const config = {
        title: subject,
        message,
        options: [],
        appendAttribution: options?.appendAttribution,
    };
    const responseType = context.getNodeParameter('responseType', 0, 'approval');
    if (responseType === 'customForm') {
        validateCustomFormFields(context);
    }
    const approvedSignedResumeUrl = context.getSignedResumeUrl({ approved: 'true' });
    if (responseType === 'freeText' || responseType === 'customForm') {
        const label = context.getNodeParameter('options.messageButtonLabel', 0, 'Respond');
        config.options.push({
            label,
            url: approvedSignedResumeUrl,
            style: 'primary',
            approved: true,
        });
    }
    else if (approvalOptions.approvalType === 'double') {
        const approveLabel = escapeHtml(approvalOptions.approveLabel || 'Approve');
        const buttonApprovalStyle = approvalOptions.buttonApprovalStyle || 'primary';
        const disapproveLabel = escapeHtml(approvalOptions.disapproveLabel || 'Disapprove');
        const buttonDisapprovalStyle = approvalOptions.buttonDisapprovalStyle || 'secondary';
        const disapprovedSignedResumeUrl = context.getSignedResumeUrl({ approved: 'false' });
        config.options.push({
            label: disapproveLabel,
            url: disapprovedSignedResumeUrl,
            style: buttonDisapprovalStyle,
            approved: false,
        });
        config.options.push({
            label: approveLabel,
            url: approvedSignedResumeUrl,
            style: buttonApprovalStyle,
            approved: true,
        });
    }
    else {
        const label = escapeHtml(approvalOptions.approveLabel || 'Approve');
        const style = approvalOptions.buttonApprovalStyle || 'primary';
        config.options.push({
            label,
            url: approvedSignedResumeUrl,
            style,
            approved: true,
        });
    }
    return config;
}
export function createButton(url, label, style) {
    let buttonStyle = BUTTON_STYLE_PRIMARY;
    if (style === 'secondary') {
        buttonStyle = BUTTON_STYLE_SECONDARY;
    }
    return `<a href="${url}" target="_blank" style="${buttonStyle}">${label}</a>`;
}
export function createEmail(context) {
    const to = context.getNodeParameter('sendTo', 0, '').trim();
    const config = getSendAndWaitConfig(context);
    if (to.indexOf('@') === -1 || (to.match(/@/g) || []).length > 1) {
        const description = `The email address '${to}' in the 'To' field isn't valid or contains multiple addresses. Please provide only a single email address.`;
        throw new NodeOperationError(context.getNode(), 'Invalid email address', {
            description,
            itemIndex: 0,
        });
    }
    const buttons = [];
    for (const option of config.options) {
        buttons.push(createButton(option.url, option.label, option.style));
    }
    let emailBody;
    if (config.appendAttribution !== false) {
        const instanceId = context.getInstanceId();
        emailBody = createEmailBodyWithN8nAttribution(config.message, buttons.join('\n'), instanceId);
    }
    else {
        emailBody = createEmailBodyWithoutN8nAttribution(config.message, buttons.join('\n'));
    }
    const email = {
        to,
        subject: config.title,
        body: '',
        htmlBody: emailBody,
    };
    return email;
}
const sendAndWaitWaitingTooltip = (parameters) => {
    if (parameters?.operation === 'sendAndWait') {
        return "Execution will continue after the user's response";
    }
    return '';
};
export const SEND_AND_WAIT_WAITING_TOOLTIP = `={{ (${sendAndWaitWaitingTooltip})($parameter) }}`;
//# sourceMappingURL=utils.js.map
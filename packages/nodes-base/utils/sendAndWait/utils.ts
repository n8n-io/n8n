import {
	NodeOperationError,
	SEND_AND_WAIT_OPERATION,
	tryToParseJsonToFormFields,
	updateDisplayOptions,
} from 'n8n-workflow';
import type {
	INodeProperties,
	IExecuteFunctions,
	IWebhookFunctions,
	IDataObject,
	FormFieldsParameter,
} from 'n8n-workflow';
import type { IEmail } from './interfaces';
import { escapeHtml } from '../utilities';
import {
	ACTION_RECORDED_PAGE,
	BUTTON_STYLE_PRIMARY,
	BUTTON_STYLE_SECONDARY,
	createEmailBody,
} from './email-templates';
import { prepareFormData, prepareFormReturnItem, resolveRawData } from '../../nodes/Form/utils';
import { formFieldsProperties } from '../../nodes/Form/Form.node';

type SendAndWaitConfig = {
	title: string;
	message: string;
	url: string;
	options: Array<{ label: string; value: string; style: string }>;
};

type FormResponseTypeOptions = {
	messageButtonLabel?: string;
	responseFormDescription?: string;
	responseFormButtonLabel?: string;
};

const INPUT_FIELD_IDENTIFIER = 'field-0';

// Operation Properties ----------------------------------------------------------
export function getSendAndWaitProperties(
	targetProperties: INodeProperties[],
	resource: string = 'message',
	additionalProperties: INodeProperties[] = [],
) {
	const buttonStyle: INodeProperties = {
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
	const sendAndWait: INodeProperties[] = [
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
					values: [
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
							default: 'Approve',
							displayOptions: {
								show: {
									approvalType: ['single', 'double'],
								},
							},
						},
						{
							...buttonStyle,
							displayName: 'Approve Button Style',
							name: 'buttonApprovalStyle',
							displayOptions: {
								show: {
									approvalType: ['single', 'double'],
								},
							},
						},
						{
							displayName: 'Disapprove Button Label',
							name: 'disapproveLabel',
							type: 'string',
							default: 'Decline',
							displayOptions: {
								show: {
									approvalType: ['double'],
								},
							},
						},
						{
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
				},
			],
			displayOptions: {
				show: {
					responseType: ['approval'],
				},
			},
		},
		{
			displayName: 'Response Form Title',
			name: 'responseFormTitle',
			description: 'Title of the form that the user can access to provide their response',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					responseType: ['freeText', 'customForm'],
				},
			},
		},
		...updateDisplayOptions(
			{
				show: {
					responseType: ['customForm'],
				},
			},
			formFieldsProperties,
		),
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
			],
			displayOptions: {
				show: {
					responseType: ['freeText', 'customForm'],
				},
			},
		},
		...additionalProperties,
	];

	return updateDisplayOptions(
		{
			show: {
				resource: [resource],
				operation: [SEND_AND_WAIT_OPERATION],
			},
		},
		sendAndWait,
	);
}

// Webhook Function --------------------------------------------------------------
const getFormResponseCustomizations = (context: IWebhookFunctions) => {
	const message = context.getNodeParameter('message', '') as string;
	const options = context.getNodeParameter('options', {}) as FormResponseTypeOptions;

	const formTitle = context.getNodeParameter('responseFormTitle', '') as string;

	let formDescription = message;
	if (options.responseFormDescription) {
		formDescription = options.responseFormDescription;
	}

	let buttonLabel = 'Submit';
	if (options.responseFormButtonLabel) {
		buttonLabel = options.responseFormButtonLabel;
	}

	return {
		formTitle,
		formDescription: formDescription.replace(/\\n/g, '\n').replace(/<br>/g, '\n'),
		buttonLabel,
	};
};

export async function sendAndWaitWebhook(this: IWebhookFunctions) {
	const method = this.getRequestObject().method;
	const res = this.getResponseObject();
	const responseType = this.getNodeParameter('responseType', 'approval') as
		| 'approval'
		| 'freeText'
		| 'customForm';

	if (responseType === 'freeText') {
		if (method === 'GET') {
			const { formTitle, formDescription, buttonLabel } = getFormResponseCustomizations(this);

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
			});

			res.render('form-trigger', data);

			return {
				noWebhookResponse: true,
			};
		}
		if (method === 'POST') {
			const data = this.getBodyData().data as IDataObject;

			return {
				webhookResponse: ACTION_RECORDED_PAGE,
				workflowData: [[{ json: { data: { text: data[INPUT_FIELD_IDENTIFIER] } } }]],
			};
		}
	}

	if (responseType === 'customForm') {
		const defineForm = this.getNodeParameter('defineForm', 'fields') as 'fields' | 'json';
		let fields: FormFieldsParameter = [];

		if (defineForm === 'json') {
			try {
				const jsonOutput = this.getNodeParameter('jsonOutput', '', {
					rawExpressions: true,
				}) as string;

				fields = tryToParseJsonToFormFields(resolveRawData(this, jsonOutput));
			} catch (error) {
				throw new NodeOperationError(this.getNode(), error.message, {
					description: error.message,
				});
			}
		} else {
			fields = this.getNodeParameter('formFields.values', []) as FormFieldsParameter;
		}

		if (method === 'GET') {
			const { formTitle, formDescription, buttonLabel } = getFormResponseCustomizations(this);

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
			});

			res.render('form-trigger', data);

			return {
				noWebhookResponse: true,
			};
		}
		if (method === 'POST') {
			const returnItem = await prepareFormReturnItem(this, fields, 'production', true);
			const json = returnItem.json as IDataObject;

			delete json.submittedAt;
			delete json.formMode;

			returnItem.json = { data: json };

			return {
				webhookResponse: ACTION_RECORDED_PAGE,
				workflowData: [[returnItem]],
			};
		}
	}

	const query = this.getRequestObject().query as { approved: 'false' | 'true' };
	const approved = query.approved === 'true';
	return {
		webhookResponse: ACTION_RECORDED_PAGE,
		workflowData: [[{ json: { data: { approved } } }]],
	};
}

// Send and Wait Config -----------------------------------------------------------
export function getSendAndWaitConfig(context: IExecuteFunctions): SendAndWaitConfig {
	const message = escapeHtml((context.getNodeParameter('message', 0, '') as string).trim())
		.replace(/\\n/g, '\n')
		.replace(/<br>/g, '\n');
	const subject = escapeHtml(context.getNodeParameter('subject', 0, '') as string);
	const resumeUrl = context.evaluateExpression('{{ $execution?.resumeUrl }}', 0) as string;
	const nodeId = context.evaluateExpression('{{ $nodeId }}', 0) as string;
	const approvalOptions = context.getNodeParameter('approvalOptions.values', 0, {}) as {
		approvalType?: 'single' | 'double';
		approveLabel?: string;
		buttonApprovalStyle?: string;
		disapproveLabel?: string;
		buttonDisapprovalStyle?: string;
	};

	const config: SendAndWaitConfig = {
		title: subject,
		message,
		url: `${resumeUrl}/${nodeId}`,
		options: [],
	};

	const responseType = context.getNodeParameter('responseType', 0, 'approval') as string;

	if (responseType === 'freeText' || responseType === 'customForm') {
		const label = context.getNodeParameter('options.messageButtonLabel', 0, 'Respond') as string;
		config.options.push({
			label,
			value: 'true',
			style: 'primary',
		});
	} else if (approvalOptions.approvalType === 'double') {
		const approveLabel = escapeHtml(approvalOptions.approveLabel || 'Approve');
		const buttonApprovalStyle = approvalOptions.buttonApprovalStyle || 'primary';
		const disapproveLabel = escapeHtml(approvalOptions.disapproveLabel || 'Disapprove');
		const buttonDisapprovalStyle = approvalOptions.buttonDisapprovalStyle || 'secondary';

		config.options.push({
			label: disapproveLabel,
			value: 'false',
			style: buttonDisapprovalStyle,
		});
		config.options.push({
			label: approveLabel,
			value: 'true',
			style: buttonApprovalStyle,
		});
	} else {
		const label = escapeHtml(approvalOptions.approveLabel || 'Approve');
		const style = approvalOptions.buttonApprovalStyle || 'primary';
		config.options.push({
			label,
			value: 'true',
			style,
		});
	}

	return config;
}

function createButton(url: string, label: string, approved: string, style: string) {
	let buttonStyle = BUTTON_STYLE_PRIMARY;
	if (style === 'secondary') {
		buttonStyle = BUTTON_STYLE_SECONDARY;
	}
	return `<a href="${url}?approved=${approved}" target="_blank" style="${buttonStyle}">${label}</a>`;
}

export function createEmail(context: IExecuteFunctions) {
	const to = (context.getNodeParameter('sendTo', 0, '') as string).trim();
	const config = getSendAndWaitConfig(context);

	if (to.indexOf('@') === -1 || (to.match(/@/g) || []).length > 1) {
		const description = `The email address '${to}' in the 'To' field isn't valid or contains multiple addresses. Please provide only a single email address.`;
		throw new NodeOperationError(context.getNode(), 'Invalid email address', {
			description,
			itemIndex: 0,
		});
	}

	const buttons: string[] = [];
	for (const option of config.options) {
		buttons.push(createButton(config.url, option.label, option.value, option.style));
	}

	const instanceId = context.getInstanceId();

	const email: IEmail = {
		to,
		subject: config.title,
		body: '',
		htmlBody: createEmailBody(config.message, buttons.join('\n'), instanceId),
	};

	return email;
}

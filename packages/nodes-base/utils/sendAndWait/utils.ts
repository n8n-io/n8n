import { NodeOperationError, SEND_AND_WAIT_OPERATION, updateDisplayOptions } from 'n8n-workflow';
import type {
	INodeProperties,
	IExecuteFunctions,
	IWebhookFunctions,
	IDataObject,
} from 'n8n-workflow';
import type { IEmail } from './interfaces';
import { escapeHtml } from '../utilities';
import {
	ACTION_RECORDED_PAGE,
	BUTTON_STYLE_INFO,
	BUTTON_STYLE_PRIMARY,
	BUTTON_STYLE_SECONDARY,
	createEmailBody,
} from './email-templates';
import { prepareFormData } from '../../nodes/Form/utils';

type SendAndWaitConfig = {
	title: string;
	message: string;
	url: string;
	options: Array<{ label: string; value: string; style: string }>;
};

export const MESSAGE_PREFIX = 'ACTION REQUIRED: ';

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
				rows: 5,
			},
			displayOptions: {
				show: {
					responseType: ['approval'],
				},
			},
		},
		{
			displayName: 'Expected Input Description',
			name: 'message',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'e.g. your full name',
			typeOptions: {
				rows: 5,
			},
			displayOptions: {
				show: {
					responseType: ['freeText'],
				},
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
					description: 'User will be able to approve or disapprove',
				},
				{
					name: 'Free Text',
					value: 'freeText',
					description: 'Input would be shown to the user to provide text response',
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
		...additionalProperties,
		{
			displayName:
				'Use the wait node for more complex approval flows. <a href="https://docs.n8n.io/nodes/n8n-nodes-base.wait" target="_blank">More info</a>',
			name: 'useWaitNotice',
			type: 'notice',
			default: '',
		},
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
export async function sendAndWaitWebhook(this: IWebhookFunctions) {
	const responseType = this.getNodeParameter('responseType', 'approval') as string;

	if (responseType === 'freeText') {
		if (this.getRequestObject().method === 'GET') {
			const res = this.getResponseObject();
			const message = this.getNodeParameter('message', '') as string;

			const data = prepareFormData({
				formTitle: 'You need to input ' + message,
				formDescription: '',
				formSubmittedHeader: 'Got it, thanks',
				formSubmittedText: 'This page can be closed now',
				buttonLabel: 'Submit',
				redirectUrl: undefined,
				formFields: [
					{
						fieldLabel: 'Input',
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
		if (this.getRequestObject().method === 'POST') {
			const data = this.getBodyData().data as IDataObject;

			return {
				webhookResponse: ACTION_RECORDED_PAGE,
				workflowData: [[{ json: { data: { text: data['field-0'] } } }]],
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
	const message = escapeHtml((context.getNodeParameter('message', 0, '') as string).trim());
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

	if (responseType === 'freeText') {
		config.message = 'You need to input ' + message;
		config.options.push({
			label: 'Click here',
			value: 'true',
			style: 'info',
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
	if (style === 'info') {
		buttonStyle = BUTTON_STYLE_INFO;
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
		subject: `${MESSAGE_PREFIX}${config.title}`,
		body: '',
		htmlBody: createEmailBody(config.message, buttons.join('\n'), instanceId),
	};

	return email;
}

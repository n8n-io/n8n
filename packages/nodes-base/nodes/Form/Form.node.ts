import type {
	FormFieldsParameter,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	INodeTypeDescription,
	IWebhookFunctions,
	NodeTypeAndVersion,
} from 'n8n-workflow';
import {
	Node,
	updateDisplayOptions,
	NodeOperationError,
	FORM_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	tryToParseJsonToFormFields,
	NodeConnectionType,
	WAIT_NODE_TYPE,
	WAIT_INDEFINITELY,
} from 'n8n-workflow';

import { formDescription, formFields, formTitle } from '../Form/common.descriptions';
import { prepareFormReturnItem, renderForm, resolveRawData } from '../Form/utils';

export const formFieldsProperties: INodeProperties[] = [
	{
		displayName: 'Define Form',
		name: 'defineForm',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Using Fields Below',
				value: 'fields',
			},
			{
				name: 'Using JSON',
				value: 'json',
			},
		],
		default: 'fields',
	},
	{
		displayName: 'Form Fields',
		name: 'jsonOutput',
		type: 'json',
		typeOptions: {
			rows: 5,
		},
		default:
			'[\n   {\n      "fieldLabel":"Name",\n      "placeholder":"enter you name",\n      "requiredField":true\n   },\n   {\n      "fieldLabel":"Age",\n      "fieldType":"number",\n      "placeholder":"enter your age"\n   },\n   {\n      "fieldLabel":"Email",\n      "fieldType":"email",\n      "requiredField":true\n   }\n]',
		validateType: 'form-fields',
		ignoreValidationDuringExecution: true,
		hint: '<a href="hhttps://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.form/" target="_blank">See docs</a> for field syntax',
		displayOptions: {
			show: {
				defineForm: ['json'],
			},
		},
	},
	{ ...formFields, displayOptions: { show: { defineForm: ['fields'] } } },
];

const pageProperties = updateDisplayOptions(
	{
		show: {
			operation: ['page'],
		},
	},
	[
		...formFieldsProperties,
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options: [
				{ ...formTitle, required: false },
				formDescription,
				{
					displayName: 'Button Label',
					name: 'buttonLabel',
					type: 'string',
					default: 'Submit',
				},
			],
		},
	],
);

const completionProperties = updateDisplayOptions(
	{
		show: {
			operation: ['completion'],
		},
	},
	[
		{
			// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
			displayName: 'On n8n Form Submission',
			name: 'respondWith',
			type: 'options',
			default: 'text',
			options: [
				{
					name: 'Show Completion Screen',
					value: 'text',
					description: 'Show a response text to the user',
				},
				{
					name: 'Redirect to URL',
					value: 'redirect',
					description: 'Redirect the user to a URL',
				},
			],
		},
		{
			displayName: 'URL',
			name: 'redirectUrl',
			validateType: 'url',
			type: 'string',
			default: '',
			required: true,
			displayOptions: {
				show: {
					respondWith: ['redirect'],
				},
			},
		},
		{
			displayName: 'Completion Title',
			name: 'completionTitle',
			type: 'string',
			default: '',
			required: true,
			displayOptions: {
				show: {
					respondWith: ['text'],
				},
			},
		},
		{
			displayName: 'Completion Message',
			name: 'completionMessage',
			type: 'string',
			default: '',
			typeOptions: {
				rows: 2,
			},
			displayOptions: {
				show: {
					respondWith: ['text'],
				},
			},
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options: [{ ...formTitle, required: false, displayName: 'Completion Page Title' }],
			displayOptions: {
				show: {
					respondWith: ['text'],
				},
			},
		},
	],
);

export class Form extends Node {
	nodeInputData: INodeExecutionData[] = [];

	description: INodeTypeDescription = {
		displayName: 'n8n Form',
		name: 'form',
		icon: 'file:form.svg',
		group: ['input'],
		version: 1,
		description: 'Generate webforms in n8n and pass their responses to the workflow',
		defaults: {
			name: 'Form',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				path: '',
				restartWebhook: true,
				isFullPath: true,
				isForm: true,
			},
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: '',
				restartWebhook: true,
				isFullPath: true,
				isForm: true,
			},
		],
		properties: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				displayName: 'An n8n Form Trigger node must be set up before this node',
				name: 'triggerNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Page Type',
				name: 'operation',
				type: 'options',
				default: 'page',
				noDataExpression: true,
				options: [
					{
						name: 'Next Form Page',
						value: 'page',
					},
					{
						name: 'Form Ending',
						value: 'completion',
					},
				],
			},
			...pageProperties,
			...completionProperties,
		],
	};

	async webhook(context: IWebhookFunctions) {
		const res = context.getResponseObject();

		const operation = context.getNodeParameter('operation', '') as string;

		const parentNodes = context.getParentNodes(context.getNode().name);
		const trigger = parentNodes.find(
			(node) => node.type === 'n8n-nodes-base.formTrigger',
		) as NodeTypeAndVersion;

		const mode = context.evaluateExpression(`{{ $('${trigger?.name}').first().json.formMode }}`) as
			| 'test'
			| 'production';

		const defineForm = context.getNodeParameter('defineForm', false) as string;

		let fields: FormFieldsParameter = [];
		if (defineForm === 'json') {
			try {
				const jsonOutput = context.getNodeParameter('jsonOutput', '', {
					rawExpressions: true,
				}) as string;

				fields = tryToParseJsonToFormFields(resolveRawData(context, jsonOutput));
			} catch (error) {
				throw new NodeOperationError(context.getNode(), error.message, {
					description: error.message,
					type: mode === 'test' ? 'manual-form-test' : undefined,
				});
			}
		} else {
			fields = context.getNodeParameter('formFields.values', []) as FormFieldsParameter;
		}

		const method = context.getRequestObject().method;

		if (operation === 'completion' && method === 'GET') {
			const completionTitle = context.getNodeParameter('completionTitle', '') as string;
			const completionMessage = context.getNodeParameter('completionMessage', '') as string;
			const redirectUrl = context.getNodeParameter('redirectUrl', '') as string;
			const options = context.getNodeParameter('options', {}) as { formTitle: string };

			if (redirectUrl) {
				res.send(
					`<html><head><meta http-equiv="refresh" content="0; url=${redirectUrl}"></head></html>`,
				);
				return { noWebhookResponse: true };
			}

			let title = options.formTitle;
			if (!title) {
				title = context.evaluateExpression(
					`{{ $('${trigger?.name}').params.formTitle }}`,
				) as string;
			}
			const appendAttribution = context.evaluateExpression(
				`{{ $('${trigger?.name}').params.options?.appendAttribution === false ? false : true }}`,
			) as boolean;

			res.render('form-trigger-completion', {
				title: completionTitle,
				message: completionMessage,
				formTitle: title,
				appendAttribution,
			});

			return { noWebhookResponse: true };
		}

		if (operation === 'completion' && method === 'POST') {
			return {
				workflowData: [context.evaluateExpression('{{ $input.all() }}') as INodeExecutionData[]],
			};
		}

		if (method === 'GET') {
			const options = context.getNodeParameter('options', {}) as {
				formTitle: string;
				formDescription: string;
				buttonLabel: string;
			};

			let title = options.formTitle;
			if (!title) {
				title = context.evaluateExpression(
					`{{ $('${trigger?.name}').params.formTitle }}`,
				) as string;
			}

			let description = options.formDescription;
			if (!description) {
				description = context.evaluateExpression(
					`{{ $('${trigger?.name}').params.formDescription }}`,
				) as string;
			}

			let buttonLabel = options.buttonLabel;
			if (!buttonLabel) {
				buttonLabel =
					(context.evaluateExpression(
						`{{ $('${trigger?.name}').params.options?.buttonLabel }}`,
					) as string) || 'Submit';
			}

			const responseMode = 'onReceived';

			let redirectUrl;

			const connectedNodes = context.getChildNodes(context.getNode().name);

			const hasNextPage = connectedNodes.some(
				(node) => !node.disabled && (node.type === FORM_NODE_TYPE || node.type === WAIT_NODE_TYPE),
			);

			if (hasNextPage) {
				redirectUrl = context.evaluateExpression('{{ $execution.resumeFormUrl }}') as string;
			}

			const appendAttribution = context.evaluateExpression(
				`{{ $('${trigger?.name}').params.options?.appendAttribution === false ? false : true }}`,
			) as boolean;

			renderForm({
				context,
				res,
				formTitle: title,
				formDescription: description,
				formFields: fields,
				responseMode,
				mode,
				redirectUrl,
				appendAttribution,
				buttonLabel,
			});

			return {
				noWebhookResponse: true,
			};
		}

		let useWorkflowTimezone = context.evaluateExpression(
			`{{ $('${trigger?.name}').params.options?.useWorkflowTimezone }}`,
		) as boolean;

		if (useWorkflowTimezone === undefined && trigger?.typeVersion > 2) {
			useWorkflowTimezone = true;
		}

		const returnItem = await prepareFormReturnItem(context, fields, mode, useWorkflowTimezone);

		return {
			webhookResponse: { status: 200 },
			workflowData: [[returnItem]],
		};
	}

	async execute(context: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const operation = context.getNodeParameter('operation', 0);

		if (operation === 'completion') {
			this.nodeInputData = context.getInputData();
		}

		const parentNodes = context.getParentNodes(context.getNode().name);
		const hasFormTrigger = parentNodes.some((node) => node.type === FORM_TRIGGER_NODE_TYPE);

		if (!hasFormTrigger) {
			throw new NodeOperationError(
				context.getNode(),
				'Form Trigger node must be set before this node',
			);
		}

		const childNodes = context.getChildNodes(context.getNode().name);
		const hasNextPage = childNodes.some((node) => node.type === FORM_NODE_TYPE);

		if (operation === 'completion' && hasNextPage) {
			throw new NodeOperationError(
				context.getNode(),
				'Completion has to be the last Form node in the workflow',
			);
		}

		await context.putExecutionToWait(WAIT_INDEFINITELY);

		return [context.getInputData()];
	}
}

import type {
	FormFieldsParameter,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
	NodeTypeAndVersion,
} from 'n8n-workflow';
import {
	Node,
	updateDisplayOptions,
	NodeOperationError,
	FORM_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	tryToParseJsonToFormFields,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { cssVariables } from './cssVariables';
import { renderFormCompletion } from './utils/formCompletionUtils';
import { renderFormNode } from './utils/formNodeUtils';
import { prepareFormReturnItem, resolveRawData } from './utils/utils';
import { configureWaitTillDate } from '../../utils/sendAndWait/configureWaitTillDate.util';
import { limitWaitTimeProperties } from '../../utils/sendAndWait/descriptions';
import { formDescription, formFields, formTitle } from '../Form/common.descriptions';

const waitTimeProperties: INodeProperties[] = [
	{
		displayName: 'Limit Wait Time',
		name: 'limitWaitTime',
		type: 'boolean',
		default: false,
		description:
			'Whether to limit the time this node should wait for a user response before execution resumes',
	},
	...updateDisplayOptions(
		{
			show: {
				limitWaitTime: [true],
			},
		},
		limitWaitTimeProperties,
	),
];

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
			'[\n  {\n    "fieldLabel": "Name",\n    "placeholder": "enter your name",\n    "requiredField": true\n  },\n  {\n    "fieldLabel": "Age",\n    "fieldType": "number",\n    "placeholder": "enter your age"\n  },\n  {\n    "fieldLabel": "Email",\n    "fieldType": "email",\n    "requiredField": true\n  },\n  {\n    "fieldLabel": "Textarea",\n    "fieldType": "textarea"\n  },\n  {\n    "fieldLabel": "Dropdown Options",\n    "fieldType": "dropdown",\n    "fieldOptions": {\n      "values": [\n        {\n          "option": "option 1"\n        },\n        {\n          "option": "option 2"\n        }\n      ]\n    },\n    "requiredField": true\n  },\n  {\n    "fieldLabel": "Checkboxes",\n    "fieldType": "checkbox",\n    "fieldOptions": {\n      "values": [\n        {\n          "option": "option 1"\n        },\n        {\n          "option": "option 2"\n        }\n      ]\n    }\n  },\n  {\n    "fieldLabel": "Radio",\n    "fieldType": "radio",\n    "fieldOptions": {\n      "values": [\n        {\n          "option": "option 1"\n        },\n        {\n          "option": "option 2"\n        }\n      ]\n    }\n  },\n  {\n    "fieldLabel": "Email",\n    "fieldType": "email",\n    "placeholder": "me@mail.con"\n  },\n  {\n    "fieldLabel": "File",\n    "fieldType": "file",\n    "multipleFiles": true,\n    "acceptFileTypes": ".jpg, .png"\n  },\n  {\n    "fieldLabel": "Number",\n    "fieldType": "number"\n  },\n  {\n    "fieldLabel": "Password",\n    "fieldType": "password"\n  }\n]\n',
		validateType: 'form-fields',
		ignoreValidationDuringExecution: true,
		hint: '<a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.form/" target="_blank">See docs</a> for field syntax',
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
		...waitTimeProperties,
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
				{
					displayName: 'Custom Form Styling',
					name: 'customCss',
					type: 'string',
					typeOptions: {
						rows: 10,
						editor: 'cssEditor',
					},
					default: cssVariables.trim(),
					description: 'Override default styling of the public form interface with CSS',
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
				{
					name: 'Show Text',
					value: 'showText',
					description: 'Display simple text or HTML',
				},
				{
					name: 'Return Binary File',
					value: 'returnBinary',
					description: 'Return incoming binary file',
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
					respondWith: ['text', 'returnBinary'],
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
					respondWith: ['text', 'returnBinary'],
				},
			},
		},
		{
			displayName: 'Text',
			name: 'responseText',
			type: 'string',
			displayOptions: {
				show: {
					respondWith: ['showText'],
				},
			},
			typeOptions: {
				rows: 2,
			},
			default: '',
			placeholder: 'e.g. Thanks for filling the form',
			description: 'The text to display on the page. Use HTML to show a customized web page.',
		},
		{
			displayName: 'Input Data Field Name',
			name: 'inputDataFieldName',
			type: 'string',
			displayOptions: {
				show: {
					respondWith: ['returnBinary'],
				},
			},
			default: 'data',
			placeholder: 'e.g. data',
			description:
				'Find the name of input field containing the binary data to return in the Input panel on the left, in the Binary tab',
			hint: 'The name of the input field containing the binary file data to be returned',
		},
		...waitTimeProperties,
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options: [
				{ ...formTitle, required: false, displayName: 'Completion Page Title' },
				{
					displayName: 'Custom Form Styling',
					name: 'customCss',
					type: 'string',
					typeOptions: {
						rows: 10,
						editor: 'cssEditor',
					},
					default: cssVariables.trim(),
					description: 'Override default styling of the public form interface with CSS',
				},
			],
			displayOptions: {
				show: {
					respondWith: ['text', 'returnBinary', 'redirect'],
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
		// since trigger and node are sharing descriptions and logic we need to sync the versions
		// and keep them aligned in both nodes
		version: [1, 2.3],
		description: 'Generate webforms in n8n and pass their responses to the workflow',
		defaults: {
			name: 'Form',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		waitingNodeTooltip:
			'=Execution will continue when form is submitted on <a href="{{ $execution.resumeFormUrl }}" target="_blank">{{ $execution.resumeFormUrl }}</a>',
		webhooks: [
			{
				name: 'default',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				path: '',
				restartWebhook: true,
				isFullPath: true,
				nodeType: 'form',
			},
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'responseNode',
				path: '',
				restartWebhook: true,
				isFullPath: true,
				nodeType: 'form',
			},
		],
		properties: [
			{
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

	async webhook(context: IWebhookFunctions): Promise<IWebhookResponseData> {
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
			return await renderFormCompletion(context, res, trigger);
		}

		if (operation === 'completion' && method === 'POST') {
			return {
				workflowData: [context.evaluateExpression('{{ $input.all() }}') as INodeExecutionData[]],
			};
		}

		if (method === 'GET') {
			return await renderFormNode(context, res, trigger, fields, mode);
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

		const waitTill = configureWaitTillDate(context, 'root');
		await context.putExecutionToWait(waitTill);

		context.sendResponse({
			headers: {
				location: context.evaluateExpression('{{ $execution.resumeFormUrl }}', 0),
			},
			statusCode: 307,
		});

		return [context.getInputData()];
	}
}

import {
	FORM_TRIGGER_PATH_IDENTIFIER,
	jsonParse,
	type IDataObject,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';

import { createPage } from './templates';
import type { FormField } from './interfaces';

export class FormTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'n8n Form Trigger',
		name: 'formTrigger',
		icon: 'file:form.svg',
		group: ['trigger'],
		version: 1,
		description: 'Runs the flow when an n8n generated webform is submitted',
		defaults: {
			name: 'n8n Form Trigger',
		},
		inputs: [],
		outputs: ['main'],
		webhooks: [
			{
				name: 'setup',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				path: FORM_TRIGGER_PATH_IDENTIFIER,
				hidden: true,
			},
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: '={{$parameter["responseMode"]}}',
				path: FORM_TRIGGER_PATH_IDENTIFIER,
			},
		],
		eventTriggerDescription: 'Waiting for you to submit the form',
		activationMessage: 'You can now make calls to your production Form URL.',
		triggerPanel: {
			header: 'Pull in a test form submission',
			executionsHelp: {
				inactive:
					"Form Trigger have two modes: test and production. <br /> <br /> <b>Use test mode while you build your workflow</b>. Click the 'Test Step' button, then fill out the test form that opens in a popup tab. The executions will show up in the editor.<br /> <br /> <b>Use production mode to run your workflow automatically</b>. <a data-key=\"activate\">Activate</a> the workflow, then make requests to the production URL. Then every time there's a form submission via the Production Form URL, the workflow will execute. These executions will show up in the executions list, but not in the editor.",
				active:
					"Form Trigger have two modes: test and production. <br /> <br /> <b>Use test mode while you build your workflow</b>. Click the 'Test Step' button, then fill out the test form that opens in a popup tab. The executions will show up in the editor.<br /> <br /> <b>Use production mode to run your workflow automatically</b>. <a data-key=\"activate\">Activate</a> the workflow, then make requests to the production URL. Then every time there's a form submission via the Production Form URL, the workflow will execute. These executions will show up in the executions list, but not in the editor.",
			},
			activationHint:
				'<a data-key="activate">Activate</a> this workflow to have it also run automatically for new form submissions created via the Production URL.',
		},
		properties: [
			{
				displayName: 'Form Title',
				name: 'formTitle',
				type: 'string',
				default: '',
				placeholder: 'e.g. Contact us',
				required: true,
				description: 'Shown at the top of the form',
			},
			{
				displayName: 'Form Description',
				name: 'formDescription',
				type: 'string',
				default: '',
				placeholder: "e.g. We'll get back to you soon",
				description:
					'Shown underneath the Form Title. Can be used to prompt the user on how to complete the form.',
			},
			{
				displayName: 'Form Fields',
				name: 'formFields',
				placeholder: 'Add Form Field',
				type: 'fixedCollection',
				default: { values: [{ label: '', fieldType: 'text' }] },
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				options: [
					{
						displayName: 'Values',
						name: 'values',
						values: [
							{
								displayName: 'Field Label',
								name: 'fieldLabel',
								type: 'string',
								default: '',
								description: 'Label appears above the input field',
								required: true,
							},
							{
								displayName: 'Field Type',
								name: 'fieldType',
								type: 'options',
								default: 'text',
								description: 'Field name appears for users, guiding their input',
								options: [
									{
										name: 'Text',
										value: 'text',
									},
									{
										name: 'Number',
										value: 'number',
									},
									{
										name: 'Date',
										value: 'date',
									},
									{
										name: 'Dropdown List',
										value: 'dropdown',
									},
								],
								required: true,
							},
							{
								displayName: 'Date Format',
								name: 'dateFormat',
								type: 'options',
								default: 'en-GB',
								description: 'You can use expression to specify required locale, e.g. de-DE',
								options: [
									{
										// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
										name: 'dd/mm/yyyy',
										value: 'en-GB',
									},
									{
										// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
										name: 'mm/dd/yyyy',
										value: 'en-US',
									},
								],
								displayOptions: {
									show: {
										fieldType: ['date'],
									},
								},
							},
							{
								displayName: 'Field Options',
								name: 'fieldOptions',
								placeholder: 'Add Field Option',
								description: 'List of options that can be selected from the dropdown',
								type: 'fixedCollection',
								default: { values: [{ option: '' }] },
								required: true,
								displayOptions: {
									show: {
										fieldType: ['dropdown'],
									},
								},
								typeOptions: {
									multipleValues: true,
									sortable: true,
								},
								options: [
									{
										displayName: 'Values',
										name: 'values',
										values: [
											{
												displayName: 'Option',
												name: 'option',
												type: 'string',
												default: '',
											},
										],
									},
								],
							},
							{
								displayName: 'Multiple Choice',
								name: 'multiselect',
								type: 'boolean',
								default: false,
								description:
									'Whether to allow the user to select multiple options from the dropdown list',
								displayOptions: {
									show: {
										fieldType: ['dropdown'],
									},
								},
							},
							{
								displayName: 'Required Field',
								name: 'requiredField',
								type: 'boolean',
								default: false,
								description:
									'Whether to require the user to enter a value for this field before submitting the form',
							},
						],
					},
				],
			},
			{
				displayName: 'Respond',
				name: 'responseMode',
				type: 'options',
				options: [
					{
						name: 'Form Is Submitted',
						value: 'onReceived',
						description: 'As soon as this node receives the form',
					},
					{
						name: 'Workflow Finishes',
						value: 'lastNode',
						description: 'Returns data of the last-executed node',
					},
				],
				default: 'onReceived',
				description: 'When and how to respond to the form submission',
			},
			{
				displayName: 'Respond With',
				name: 'respondWith',
				type: 'options',
				options: [
					{
						name: 'Default Confirmation',
						value: 'default',
					},
					{
						name: 'Custom Text',
						value: 'text',
					},
					{
						name: 'Redirection to URL',
						value: 'redirect',
					},
				],
				default: 'default',
			},
			{
				displayName: 'Custom Text',
				name: 'customText',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						respondWith: ['text'],
					},
				},
			},
			{
				displayName: 'Redirect URL',
				name: 'redirectUrl',
				type: 'string',
				default: '',
				placeholder: 'https://example.com',
				displayOptions: {
					show: {
						respondWith: ['redirect'],
					},
				},
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const webhookName = this.getWebhookName();
		const mode = this.getMode() === 'manual' ? 'test' : 'production';
		const formFields = this.getNodeParameter('formFields.values', []) as FormField[];

		//Show the form on GET request
		if (webhookName === 'setup') {
			const formTitle = this.getNodeParameter('formTitle', '') as string;
			const formDescription = this.getNodeParameter('formDescription', '') as string;
			const instanceId = await this.getInstanceId();

			const page = createPage(formTitle, formDescription, formFields, mode === 'test', instanceId);

			const res = this.getResponseObject();
			res.status(200).send(page).end();
			return {
				noWebhookResponse: true,
			};
		}

		const bodyData = (this.getBodyData().data as IDataObject) ?? {};

		const returnData: IDataObject = {};
		for (const [index, field] of formFields.entries()) {
			const key = `field-${index}`;
			let value = bodyData[key] ?? null;

			if (value === null) returnData[field.fieldLabel] = null;

			if (field.fieldType === 'number') {
				value = Number(value);
			}
			if (field.fieldType === 'text') {
				value = String(value).trim();
			}
			if (field.fieldType === 'date') {
				value = new Intl.DateTimeFormat(field.dateFormat ?? 'en-GB').format(
					new Date(value as string),
				);
			}
			if (field.multiselect && typeof value === 'string') {
				value = jsonParse(value);
			}

			returnData[field.fieldLabel] = value;
		}
		returnData.submittedAt = bodyData.submittedAt;
		returnData.formMode = mode;

		const respondWith = this.getNodeParameter('respondWith', '') as string;

		const webhookResponse: IDataObject = { status: 200 };
		const triggerSettings: IDataObject = {};

		if (respondWith === 'redirect') {
			triggerSettings.redirectUrl = this.getNodeParameter('redirectUrl', '') as string;
		}

		if (respondWith === 'text') {
			triggerSettings.customText = this.getNodeParameter('customText', '') as string;
		}

		if (Object.keys(triggerSettings).length) {
			const responseMode = this.getNodeParameter('responseMode', '') as string;

			if (responseMode === 'onReceived') {
				webhookResponse.triggerSettings = triggerSettings;
			}

			if (responseMode === 'lastNode') {
				returnData.triggerSettings = triggerSettings;
			}
		}

		return {
			webhookResponse,
			workflowData: [this.helpers.returnJsonArray(returnData)],
		};
	}
}

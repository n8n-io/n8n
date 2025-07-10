import { mock } from 'jest-mock-extended';
import { NodeOperationError, type INode } from 'n8n-workflow';

import { testVersionedWebhookTriggerNode } from '@test/nodes/TriggerHelpers';

import { FormTrigger } from '../FormTrigger.node';

describe('FormTrigger', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should render a form template with correct fields', async () => {
		const formFields = [
			{ fieldLabel: 'Name', fieldType: 'text', requiredField: true },
			{ fieldLabel: 'Age', fieldType: 'number', requiredField: false },
			{ fieldLabel: 'Notes', fieldType: 'textarea', requiredField: false },
			{
				fieldLabel: 'Gender',
				fieldType: 'select',
				requiredField: true,
				fieldOptions: { values: [{ option: 'Male' }, { option: 'Female' }] },
			},
			{
				fieldLabel: 'Resume',
				fieldType: 'file',
				requiredField: true,
				acceptFileTypes: '.pdf,.doc',
				multipleFiles: false,
			},
		];

		const { response, responseData } = await testVersionedWebhookTriggerNode(FormTrigger, 2, {
			mode: 'manual',
			node: {
				parameters: {
					formTitle: 'Test Form',
					formDescription: 'Test Description',
					responseMode: 'onReceived',
					formFields: { values: formFields },
					options: {
						appendAttribution: false,
						respondWithOptions: { values: { respondWith: 'text' } },
					},
				},
			},
		});

		expect(response.render).toHaveBeenCalledWith('form-trigger', {
			appendAttribution: false,
			buttonLabel: 'Submit',
			formDescription: 'Test Description',
			formDescriptionMetadata: 'Test Description',
			formFields: [
				{
					defaultValue: '',
					errorId: 'error-field-0',
					id: 'field-0',
					inputRequired: 'form-required',
					isInput: true,
					label: 'Name',
					placeholder: undefined,
					type: 'text',
				},
				{
					defaultValue: '',
					errorId: 'error-field-1',
					id: 'field-1',
					inputRequired: '',
					isInput: true,
					label: 'Age',
					placeholder: undefined,
					type: 'number',
				},
				{
					defaultValue: '',
					errorId: 'error-field-2',
					id: 'field-2',
					inputRequired: '',
					label: 'Notes',
					placeholder: undefined,
					isTextarea: true,
				},
				{
					defaultValue: '',
					errorId: 'error-field-3',
					id: 'field-3',
					inputRequired: 'form-required',
					isInput: true,
					label: 'Gender',
					placeholder: undefined,
					type: 'select',
				},
				{
					acceptFileTypes: '.pdf,.doc',
					defaultValue: '',
					errorId: 'error-field-4',
					id: 'field-4',
					inputRequired: 'form-required',
					isFileInput: true,
					label: 'Resume',
					multipleFiles: '',
					placeholder: undefined,
				},
			],
			formSubmittedText: 'Your response has been recorded',
			formTitle: 'Test Form',
			n8nWebsiteLink:
				'https://n8n.io/?utm_source=n8n-internal&utm_medium=form-trigger&utm_campaign=instanceId',
			testRun: true,
			useResponseData: false,
		});

		expect(responseData).toEqual({ noWebhookResponse: true });
	});

	it('should return workflowData on POST request', async () => {
		const formFields = [
			{ fieldLabel: 'Name', fieldType: 'text', requiredField: true },
			{ fieldLabel: 'Age', fieldType: 'number', requiredField: false },
			{ fieldLabel: 'Date', fieldType: 'date', formatDate: 'dd MMM', requiredField: false },
			{ fieldLabel: 'Empty', fieldType: 'number', requiredField: false },
			{
				fieldLabel: 'Tags',
				fieldType: 'select',
				multiselect: true,
				requiredField: false,
				fieldOptions: { values: [{ option: 'Popular' }, { option: 'Recent' }] },
			},
		];

		const bodyData = {
			data: {
				'field-0': 'John Doe',
				'field-1': '30',
				'field-2': '2024-08-31',
				'field-4': '{}',
			},
		};

		const { responseData } = await testVersionedWebhookTriggerNode(FormTrigger, 2, {
			mode: 'manual',
			node: {
				parameters: {
					formTitle: 'Test Form',
					formDescription: 'Test Description',
					responseMode: 'onReceived',
					formFields: { values: formFields },
				},
			},
			request: { method: 'POST' },
			bodyData,
		});

		expect(responseData).toEqual({
			webhookResponse: { status: 200 },
			workflowData: [
				[
					{
						json: {
							Name: 'John Doe',
							Age: 30,
							Date: '31 Jan',
							Empty: null,
							Tags: {},
							submittedAt: expect.any(String),
							formMode: 'test',
						},
					},
				],
			],
		});
	});

	describe('Respond to Webhook', () => {
		it('should throw when misconfigured', async () => {
			await expect(
				testVersionedWebhookTriggerNode(FormTrigger, 2, {
					node: {
						parameters: {
							responseMode: 'responseNode',
						},
					},
					request: { method: 'POST' },
					childNodes: [],
				}),
			).rejects.toEqual(
				new NodeOperationError(mock<INode>(), 'No Respond to Webhook node found in the workflow'),
			);

			await expect(
				testVersionedWebhookTriggerNode(FormTrigger, 2.1, {
					node: {
						typeVersion: 2.1,
						parameters: {
							responseMode: 'onReceived',
						},
					},
					request: { method: 'POST' },
					childNodes: [
						{
							name: 'Test Respond To Webhook',
							type: 'n8n-nodes-base.respondToWebhook',
							typeVersion: 1,
							disabled: false,
						},
					],
				}),
			).rejects.toEqual(
				new NodeOperationError(mock<INode>(), 'On form submission node not correctly configured'),
			);
		});
	});

	it('should throw on invalid webhook authentication', async () => {
		const formFields = [
			{ fieldLabel: 'Name', fieldType: 'text', requiredField: true },
			{ fieldLabel: 'Age', fieldType: 'number', requiredField: false },
		];

		const { responseData, response } = await testVersionedWebhookTriggerNode(FormTrigger, 2, {
			mode: 'manual',
			node: {
				parameters: {
					formTitle: 'Test Form',
					formDescription: 'Test Description',
					responseMode: 'onReceived',
					formFields: { values: formFields },
					authentication: 'basicAuth',
				},
			},
			request: { method: 'POST' },
		});

		expect(responseData).toEqual({ noWebhookResponse: true });
		expect(response.status).toHaveBeenCalledWith(401);
		expect(response.setHeader).toHaveBeenCalledWith(
			'WWW-Authenticate',
			'Basic realm="Enter credentials"',
		);
	});

	it('should apply customCss property to form render', async () => {
		const formFields = [{ fieldLabel: 'Name', fieldType: 'text', requiredField: true }];

		const { response } = await testVersionedWebhookTriggerNode(FormTrigger, 2.2, {
			mode: 'manual',
			node: {
				typeVersion: 2.2,
				parameters: {
					formTitle: 'Custom CSS Test',
					formDescription: 'Testing custom CSS',
					responseMode: 'onReceived',
					formFields: { values: formFields },
					options: {
						customCss: '.form-input { border-color: red; }',
					},
				},
			},
		});

		expect(response.render).toHaveBeenCalledWith(
			'form-trigger',
			expect.objectContaining({
				dangerousCustomCss: '.form-input { border-color: red; }',
			}),
		);
	});

	it('should handle files', async () => {
		const formFields = [
			{
				fieldLabel: 'Resume',
				fieldType: 'file',
				requiredField: true,
				acceptFileTypes: '.pdf,.doc',
				multipleFiles: false,
			},
			{
				fieldLabel: 'Attachments',
				fieldType: 'file',
				requiredField: true,
				acceptFileTypes: '.pdf,.doc',
				multipleFiles: true,
			},
		];

		const bodyData = {
			files: {
				'field-0': {
					originalFilename: 'resume.pdf',
					mimetype: 'application/json',
					filepath: '/resume.pdf',
					size: 200,
				},
				'field-1': [
					{
						originalFilename: 'attachment1.pdf',
						mimetype: 'application/json',
						filepath: '/attachment1.pdf',
						size: 201,
					},
				],
			},
		};

		const { responseData } = await testVersionedWebhookTriggerNode(FormTrigger, 2, {
			mode: 'trigger',
			node: {
				parameters: {
					formTitle: 'Test Form',
					formDescription: 'Test Description',
					responseMode: 'onReceived',
					formFields: { values: formFields },
				},
			},
			request: { method: 'POST' },
			bodyData,
		});

		expect(responseData?.webhookResponse).toEqual({ status: 200 });
		expect(responseData?.workflowData).toEqual([
			[
				expect.objectContaining({
					json: {
						Resume: {
							filename: 'resume.pdf',
							mimetype: 'application/json',
							size: 200,
						},
						Attachments: [
							{
								filename: 'attachment1.pdf',
								mimetype: 'application/json',
								size: 201,
							},
						],
						formMode: 'production',
						submittedAt: expect.any(String),
					},
				}),
			],
		]);
	});
});

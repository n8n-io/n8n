import { mock } from 'jest-mock-extended';
import type { IWebhookFunctions } from 'n8n-workflow';
import type { FormField } from '../interfaces';
import { formWebhook, prepareFormData } from '../utils';

describe('FormTrigger, formWebhook', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should call response render', async () => {
		const executeFunctions = mock<IWebhookFunctions>();
		const mockRender = jest.fn();

		const formFields: FormField[] = [
			{ fieldLabel: 'Name', fieldType: 'text', requiredField: true },
			{ fieldLabel: 'Age', fieldType: 'number', requiredField: false },
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

		executeFunctions.getNode.mockReturnValue({ typeVersion: 2.1 } as any);
		executeFunctions.getNodeParameter.calledWith('options').mockReturnValue({});
		executeFunctions.getNodeParameter.calledWith('formTitle').mockReturnValue('Test Form');
		executeFunctions.getNodeParameter
			.calledWith('formDescription')
			.mockReturnValue('Test Description');
		executeFunctions.getNodeParameter.calledWith('responseMode').mockReturnValue('onReceived');
		executeFunctions.getNodeParameter.calledWith('formFields.values').mockReturnValue(formFields);
		executeFunctions.getResponseObject.mockReturnValue({ render: mockRender } as any);
		executeFunctions.getRequestObject.mockReturnValue({ method: 'GET', query: {} } as any);
		executeFunctions.getMode.mockReturnValue('manual');
		executeFunctions.getInstanceId.mockReturnValue('instanceId');
		executeFunctions.getBodyData.mockReturnValue({ data: {}, files: {} });
		executeFunctions.getChildNodes.mockReturnValue([]);

		await formWebhook(executeFunctions);

		expect(mockRender).toHaveBeenCalledWith('form-trigger', {
			appendAttribution: true,
			formDescription: 'Test Description',
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
					inputRequired: 'form-required',
					isInput: true,
					label: 'Gender',
					placeholder: undefined,
					type: 'select',
				},
				{
					acceptFileTypes: '.pdf,.doc',
					defaultValue: '',
					errorId: 'error-field-3',
					id: 'field-3',
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
			validForm: true,
		});
	});

	it('should return workflowData on POST request', async () => {
		const executeFunctions = mock<IWebhookFunctions>();
		const mockStatus = jest.fn();
		const mockEnd = jest.fn();

		const formFields: FormField[] = [
			{ fieldLabel: 'Name', fieldType: 'text', requiredField: true },
			{ fieldLabel: 'Age', fieldType: 'number', requiredField: false },
		];

		const bodyData = {
			'field-0': 'John Doe',
			'field-1': '30',
		};

		executeFunctions.getNode.mockReturnValue({ typeVersion: 2.1 } as any);
		executeFunctions.getNodeParameter.calledWith('options').mockReturnValue({});
		executeFunctions.getNodeParameter.calledWith('responseMode').mockReturnValue('onReceived');
		executeFunctions.getChildNodes.mockReturnValue([]);
		executeFunctions.getNodeParameter.calledWith('formFields.values').mockReturnValue(formFields);
		executeFunctions.getResponseObject.mockReturnValue({ status: mockStatus, end: mockEnd } as any);
		executeFunctions.getRequestObject.mockReturnValue({ method: 'POST' } as any);
		executeFunctions.getMode.mockReturnValue('manual');
		executeFunctions.getInstanceId.mockReturnValue('instanceId');
		executeFunctions.getBodyData.mockReturnValue({ data: bodyData, files: {} });

		const result = await formWebhook(executeFunctions);

		expect(result).toEqual({
			webhookResponse: { status: 200 },
			workflowData: [
				[
					{
						json: {
							Name: 'John Doe',
							Age: 30,
							submittedAt: expect.any(String),
							formMode: 'test',
						},
					},
				],
			],
		});
	});
});

describe('FormTrigger, prepareFormData', () => {
	it('should return valid form data with given parameters', () => {
		const formFields: FormField[] = [
			{
				fieldLabel: 'Name',
				fieldType: 'text',
				requiredField: true,
				placeholder: 'Enter your name',
			},
			{
				fieldLabel: 'Email',
				fieldType: 'email',
				requiredField: true,
				placeholder: 'Enter your email',
			},
			{
				fieldLabel: 'Gender',
				fieldType: 'dropdown',
				requiredField: false,
				fieldOptions: { values: [{ option: 'Male' }, { option: 'Female' }] },
			},
			{
				fieldLabel: 'Files',
				fieldType: 'file',
				requiredField: false,
				acceptFileTypes: '.jpg,.png',
				multipleFiles: true,
			},
		];

		const query = { Name: 'John Doe', Email: 'john@example.com' };

		const result = prepareFormData({
			formTitle: 'Test Form',
			formDescription: 'This is a test form',
			formSubmittedText: 'Thank you for your submission',
			redirectUrl: 'https://example.com/thank-you',
			formFields,
			testRun: false,
			query,
			instanceId: 'test-instance',
			useResponseData: true,
		});

		expect(result).toEqual({
			testRun: false,
			validForm: true,
			formTitle: 'Test Form',
			formDescription: 'This is a test form',
			formSubmittedText: 'Thank you for your submission',
			n8nWebsiteLink:
				'https://n8n.io/?utm_source=n8n-internal&utm_medium=form-trigger&utm_campaign=test-instance',
			formFields: [
				{
					id: 'field-0',
					errorId: 'error-field-0',
					label: 'Name',
					inputRequired: 'form-required',
					defaultValue: 'John Doe',
					placeholder: 'Enter your name',
					isInput: true,
					type: 'text',
				},
				{
					id: 'field-1',
					errorId: 'error-field-1',
					label: 'Email',
					inputRequired: 'form-required',
					defaultValue: 'john@example.com',
					placeholder: 'Enter your email',
					isInput: true,
					type: 'email',
				},
				{
					id: 'field-2',
					errorId: 'error-field-2',
					label: 'Gender',
					inputRequired: '',
					defaultValue: '',
					placeholder: undefined,
					isSelect: true,
					selectOptions: ['Male', 'Female'],
				},
				{
					id: 'field-3',
					errorId: 'error-field-3',
					label: 'Files',
					inputRequired: '',
					defaultValue: '',
					placeholder: undefined,
					isFileInput: true,
					acceptFileTypes: '.jpg,.png',
					multipleFiles: 'multiple',
				},
			],
			useResponseData: true,
			appendAttribution: true,
			redirectUrl: 'https://example.com/thank-you',
		});
	});

	it('should handle missing optional fields gracefully', () => {
		const formFields: FormField[] = [
			{
				fieldLabel: 'Name',
				fieldType: 'text',
				requiredField: true,
				placeholder: 'Enter your name',
			},
		];

		const result = prepareFormData({
			formTitle: 'Test Form',
			formDescription: 'This is a test form',
			formSubmittedText: undefined,
			redirectUrl: undefined,
			formFields,
			testRun: true,
			query: {},
		});

		expect(result).toEqual({
			testRun: true,
			validForm: true,
			formTitle: 'Test Form',
			formDescription: 'This is a test form',
			formSubmittedText: 'Your response has been recorded',
			n8nWebsiteLink: 'https://n8n.io/?utm_source=n8n-internal&utm_medium=form-trigger',
			formFields: [
				{
					id: 'field-0',
					errorId: 'error-field-0',
					label: 'Name',
					inputRequired: 'form-required',
					defaultValue: '',
					placeholder: 'Enter your name',
					isInput: true,
					type: 'text',
				},
			],
			useResponseData: undefined,
			appendAttribution: true,
		});
	});

	it('should set redirectUrl with http if protocol is missing', () => {
		const formFields: FormField[] = [
			{
				fieldLabel: 'Name',
				fieldType: 'text',
				requiredField: true,
				placeholder: 'Enter your name',
			},
		];

		const query = { Name: 'John Doe' };

		const result = prepareFormData({
			formTitle: 'Test Form',
			formDescription: 'This is a test form',
			formSubmittedText: undefined,
			redirectUrl: 'example.com/thank-you',
			formFields,
			testRun: true,
			query,
		});

		expect(result.redirectUrl).toBe('http://example.com/thank-you');
	});

	it('should return invalid form data when formFields are empty', () => {
		const result = prepareFormData({
			formTitle: 'Test Form',
			formDescription: 'This is a test form',
			formSubmittedText: undefined,
			redirectUrl: undefined,
			formFields: [],
			testRun: true,
			query: {},
		});

		expect(result.validForm).toBe(false);
		expect(result.formFields).toEqual([]);
	});

	it('should correctly handle multiselect fields', () => {
		const formFields: FormField[] = [
			{
				fieldLabel: 'Favorite Colors',
				fieldType: 'text',
				requiredField: true,
				multiselect: true,
				fieldOptions: { values: [{ option: 'Red' }, { option: 'Blue' }, { option: 'Green' }] },
			},
		];

		const query = { 'Favorite Colors': 'Red,Blue' };

		const result = prepareFormData({
			formTitle: 'Test Form',
			formDescription: 'This is a test form',
			formSubmittedText: 'Thank you',
			redirectUrl: 'example.com',
			formFields,
			testRun: false,
			query,
		});

		expect(result.formFields[0].isMultiSelect).toBe(true);
		expect(result.formFields[0].multiSelectOptions).toEqual([
			{ id: 'option0', label: 'Red' },
			{ id: 'option1', label: 'Blue' },
			{ id: 'option2', label: 'Green' },
		]);
	});
});

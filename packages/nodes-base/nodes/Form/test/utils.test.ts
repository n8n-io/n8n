import type { Request } from 'express';
import { mock } from 'jest-mock-extended';
import { DateTime } from 'luxon';
import type {
	FormFieldsParameter,
	IDataObject,
	INode,
	INodeExecutionData,
	IWebhookFunctions,
	MultiPartFormData,
	NodeTypeAndVersion,
} from 'n8n-workflow';

import {
	formWebhook,
	createDescriptionMetadata,
	prepareFormData,
	prepareFormReturnItem,
	resolveRawData,
	isFormConnected,
	sanitizeHtml,
	validateResponseModeConfiguration,
	prepareFormFields,
	addFormResponseDataToReturnItem,
} from '../utils';

describe('FormTrigger, parseFormDescription', () => {
	it('should remove HTML tags and truncate to 150 characters', () => {
		const descriptions = [
			{ description: '<p>This is a test description</p>', expected: 'This is a test description' },
			{ description: 'Test description', expected: 'Test description' },
			{
				description:
					'Beneath the golden hues of a setting sun, waves crashed against the rugged shore, carrying whispers of ancient tales etched in natures timeless and soothing song.',
				expected:
					'Beneath the golden hues of a setting sun, waves crashed against the rugged shore, carrying whispers of ancient tales etched in natures timeless and so',
			},
			{
				description:
					'<p>Beneath the golden hues of a setting sun, waves crashed against the rugged shore, carrying whispers of ancient tales etched in natures timeless and soothing song.</p>',
				expected:
					'Beneath the golden hues of a setting sun, waves crashed against the rugged shore, carrying whispers of ancient tales etched in natures timeless and so',
			},
		];

		descriptions.forEach(({ description, expected }) => {
			expect(createDescriptionMetadata(description)).toBe(expected);
		});
	});
});

describe('FormTrigger, sanitizeHtml', () => {
	it('should remove forbidden HTML tags', () => {
		const givenHtml = [
			{
				html: '<script>alert("hello world")</script>',
				expected: '',
			},
			{
				html: '<style>body { color: red; }</style>',
				expected: '',
			},
			{
				html: '<input type="text" value="test">',
				expected: '',
			},
		];

		givenHtml.forEach(({ html, expected }) => {
			expect(sanitizeHtml(html)).toBe(expected);
		});
	});
});

describe('FormTrigger, formWebhook', () => {
	const executeFunctions = mock<IWebhookFunctions>();
	executeFunctions.getNode.mockReturnValue({ typeVersion: 2.1 } as any);
	executeFunctions.getNodeParameter.calledWith('options').mockReturnValue({});
	executeFunctions.getNodeParameter.calledWith('formTitle').mockReturnValue('Test Form');
	executeFunctions.getNodeParameter
		.calledWith('formDescription')
		.mockReturnValue('Test Description');
	executeFunctions.getNodeParameter.calledWith('responseMode').mockReturnValue('onReceived');
	executeFunctions.getRequestObject.mockReturnValue({ method: 'GET', query: {} } as any);
	executeFunctions.getMode.mockReturnValue('manual');
	executeFunctions.getInstanceId.mockReturnValue('instanceId');
	executeFunctions.getBodyData.mockReturnValue({ data: {}, files: {} });
	executeFunctions.getChildNodes.mockReturnValue([]);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should call response render', async () => {
		const mockRender = jest.fn();

		const formFields: FormFieldsParameter = [
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
			{
				fieldLabel: 'Custom HTML',
				fieldType: 'html',
				html: '<div>Test HTML</div>',
				requiredField: false,
			},
			{
				fieldName: 'Powerpuff Girl',
				fieldValue: 'Blossom',
				fieldType: 'hiddenField',
				fieldLabel: '',
			},
		];

		executeFunctions.getNodeParameter.calledWith('formFields.values').mockReturnValue(formFields);
		executeFunctions.getResponseObject.mockReturnValue({ render: mockRender } as any);

		await formWebhook(executeFunctions);

		expect(mockRender).toHaveBeenCalledWith('form-trigger', {
			appendAttribution: true,
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
				{
					id: 'field-4',
					errorId: 'error-field-4',
					label: 'Custom HTML',
					inputRequired: '',
					defaultValue: '',
					placeholder: undefined,
					html: '<div>Test HTML</div>',
					isHtml: true,
				},
				{
					id: 'field-5',
					errorId: 'error-field-5',
					hiddenName: 'Powerpuff Girl',
					hiddenValue: 'Blossom',
					label: 'Powerpuff Girl',
					isHidden: true,
					inputRequired: '',
					defaultValue: '',
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
	});

	it('should sanitize form descriptions', async () => {
		const mockRender = jest.fn();

		const formDescription = [
			{ description: 'Test Description', expected: 'Test Description' },
			{ description: '<i>hello</i>', expected: '<i>hello</i>' },
			{ description: '<script>alert("hello world")</script>', expected: '' },
		];
		const formFields: FormFieldsParameter = [
			{ fieldLabel: 'Name', fieldType: 'text', requiredField: true },
		];

		executeFunctions.getNodeParameter.calledWith('formFields.values').mockReturnValue(formFields);
		executeFunctions.getResponseObject.mockReturnValue({ render: mockRender } as any);

		for (const { description, expected } of formDescription) {
			executeFunctions.getNodeParameter.calledWith('formDescription').mockReturnValue(description);

			await formWebhook(executeFunctions);

			expect(mockRender).toHaveBeenCalledWith('form-trigger', {
				appendAttribution: true,
				buttonLabel: 'Submit',
				formDescription: expected,
				formDescriptionMetadata: createDescriptionMetadata(expected),
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
				],
				formSubmittedText: 'Your response has been recorded',
				formTitle: 'Test Form',
				n8nWebsiteLink:
					'https://n8n.io/?utm_source=n8n-internal&utm_medium=form-trigger&utm_campaign=instanceId',
				testRun: true,
				useResponseData: false,
			});
		}
	});

	it('should return workflowData on POST request', async () => {
		const mockStatus = jest.fn();
		const mockEnd = jest.fn();

		const formFields: FormFieldsParameter = [
			{ fieldLabel: 'Name', fieldType: 'text', requiredField: true },
			{ fieldLabel: 'Age', fieldType: 'number', requiredField: false },
		];

		const bodyData = {
			'field-0': 'John Doe',
			'field-1': '30',
		};

		executeFunctions.getNodeParameter.calledWith('formFields.values').mockReturnValue(formFields);
		executeFunctions.getResponseObject.mockReturnValue({ status: mockStatus, end: mockEnd } as any);
		executeFunctions.getRequestObject.mockReturnValue({ method: 'POST' } as any);
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
		const formFields: FormFieldsParameter = [
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
			{
				fieldLabel: 'username',
				fieldName: 'username',
				fieldValue: 'powerpuffgirl125',
				fieldType: 'hiddenField',
			},
			{
				fieldLabel: 'villain',
				fieldName: 'villain',
				fieldValue: 'Mojo Dojo',
				fieldType: 'hiddenField',
			},
		];

		const query = { Name: 'John Doe', Email: 'john@example.com', villain: 'princess morbucks' };

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
			buttonLabel: 'Submit',
		});

		expect(result).toEqual({
			testRun: false,
			formTitle: 'Test Form',
			formDescription: 'This is a test form',
			formDescriptionMetadata: 'This is a test form',
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
				{
					id: 'field-4',
					errorId: 'error-field-4',
					label: 'username',
					inputRequired: '',
					defaultValue: '',
					placeholder: undefined,
					hiddenName: 'username',
					hiddenValue: 'powerpuffgirl125',
					isHidden: true,
				},
				{
					id: 'field-5',
					errorId: 'error-field-5',
					label: 'villain',
					inputRequired: '',
					defaultValue: 'princess morbucks',
					placeholder: undefined,
					hiddenName: 'villain',
					isHidden: true,
					hiddenValue: 'princess morbucks',
				},
			],
			useResponseData: true,
			appendAttribution: true,
			buttonLabel: 'Submit',
			redirectUrl: 'https://example.com/thank-you',
		});
	});

	it('should handle missing optional fields gracefully', () => {
		const formFields: FormFieldsParameter = [
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
			buttonLabel: 'Submit',
		});

		expect(result).toEqual({
			testRun: true,
			formTitle: 'Test Form',
			formDescription: 'This is a test form',
			formDescriptionMetadata: 'This is a test form',
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
			buttonLabel: 'Submit',
		});
	});

	it('should set redirectUrl with http if protocol is missing', () => {
		const formFields: FormFieldsParameter = [
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

		expect(result.formFields).toEqual([]);
	});

	it('should correctly handle multiselect fields', () => {
		const formFields: FormFieldsParameter = [
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
			{ id: 'option0_field-0', label: 'Red' },
			{ id: 'option1_field-0', label: 'Blue' },
			{ id: 'option2_field-0', label: 'Green' },
		]);
	});
	it('should correctly handle multiselect fields with unique ids', () => {
		const formFields = [
			{
				fieldLabel: 'Favorite Colors',
				fieldType: 'text',
				requiredField: true,
				multiselect: true,
				fieldOptions: { values: [{ option: 'Red' }, { option: 'Blue' }, { option: 'Green' }] },
			},
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
			{ id: 'option0_field-0', label: 'Red' },
			{ id: 'option1_field-0', label: 'Blue' },
			{ id: 'option2_field-0', label: 'Green' },
		]);
		expect(result.formFields[1].multiSelectOptions).toEqual([
			{ id: 'option0_field-1', label: 'Red' },
			{ id: 'option1_field-1', label: 'Blue' },
			{ id: 'option2_field-1', label: 'Green' },
		]);
	});
});

jest.mock('luxon', () => ({
	DateTime: {
		fromFormat: jest.fn().mockReturnValue({
			toFormat: jest.fn().mockReturnValue('formatted-date'),
		}),
		now: jest.fn().mockReturnValue({
			setZone: jest.fn().mockReturnValue({
				toISO: jest.fn().mockReturnValue('2023-04-01T12:00:00.000Z'),
			}),
		}),
	},
}));

describe('prepareFormReturnItem', () => {
	const mockContext = mock<IWebhookFunctions>({
		getRequestObject: jest.fn().mockReturnValue({ method: 'GET', query: {} }),
		nodeHelpers: mock({
			copyBinaryFile: jest.fn().mockResolvedValue({}),
		}),
	});
	const formNode = mock<INode>({ type: 'n8n-nodes-base.formTrigger' });

	beforeEach(() => {
		jest.clearAllMocks();
		mockContext.getBodyData.mockReturnValue({ data: {}, files: {} });
		mockContext.getTimezone.mockReturnValue('UTC');
		mockContext.getNode.mockReturnValue(formNode);
		mockContext.getWorkflowStaticData.mockReturnValue({});
	});

	it('should handle empty form submission', async () => {
		const result = await prepareFormReturnItem(mockContext, [], 'test');

		expect(result).toEqual({
			json: {
				submittedAt: '2023-04-01T12:00:00.000Z',
				formMode: 'test',
			},
		});
	});

	it('should process text fields correctly', async () => {
		mockContext.getBodyData.mockReturnValue({
			data: { 'field-0': ' test value ' },
			files: {},
		});

		const formFields = [{ fieldLabel: 'Text Field', fieldType: 'text' }];
		const result = await prepareFormReturnItem(mockContext, formFields, 'production');

		expect(result.json['Text Field']).toBe('test value');
		expect(result.json.formMode).toBe('production');
	});

	it('should process number fields correctly', async () => {
		mockContext.getBodyData.mockReturnValue({
			data: { 'field-0': '42' },
			files: {},
		});

		const formFields = [{ fieldLabel: 'Number Field', fieldType: 'number' }];
		const result = await prepareFormReturnItem(mockContext, formFields, 'test');

		expect(result.json['Number Field']).toBe(42);
	});

	it('should handle file uploads', async () => {
		const mockFile: Partial<MultiPartFormData.File> = {
			filepath: '/tmp/uploaded-file',
			originalFilename: 'test.txt',
			mimetype: 'text/plain',
			size: 1024,
		};

		mockContext.getBodyData.mockReturnValue({
			data: {},
			files: { 'field-0': mockFile },
		});

		const formFields = [{ fieldLabel: 'File Upload', fieldType: 'file' }];
		const result = await prepareFormReturnItem(mockContext, formFields, 'test');

		expect(result.json['File Upload']).toEqual({
			filename: 'test.txt',
			mimetype: 'text/plain',
			size: 1024,
		});
		expect(result.binary).toBeDefined();
		expect(result.binary!.File_Upload).toEqual({});
	});

	it('should handle multiple file uploads', async () => {
		const mockFiles: Array<Partial<MultiPartFormData.File>> = [
			{ filepath: '/tmp/file1', originalFilename: 'file1.txt', mimetype: 'text/plain', size: 1024 },
			{ filepath: '/tmp/file2', originalFilename: 'file2.txt', mimetype: 'text/plain', size: 2048 },
		];

		mockContext.getBodyData.mockReturnValue({
			data: {},
			files: { 'field-0': mockFiles },
		});

		const formFields = [{ fieldLabel: 'Multiple Files', fieldType: 'file', multipleFiles: true }];
		const result = await prepareFormReturnItem(mockContext, formFields, 'test');

		expect(result.json['Multiple Files']).toEqual([
			{ filename: 'file1.txt', mimetype: 'text/plain', size: 1024 },
			{ filename: 'file2.txt', mimetype: 'text/plain', size: 2048 },
		]);
		expect(result.binary).toBeDefined();
		expect(result.binary!.Multiple_Files_0).toEqual({});
		expect(result.binary!.Multiple_Files_1).toEqual({});
	});

	it('should format date fields', async () => {
		mockContext.getBodyData.mockReturnValue({
			data: { 'field-0': '2023-04-01' },
			files: {},
		});

		const formFields = [{ fieldLabel: 'Date Field', fieldType: 'date', formatDate: 'dd/MM/yyyy' }];
		const result = await prepareFormReturnItem(mockContext, formFields, 'test');

		expect(result.json['Date Field']).toBe('formatted-date');
		expect(DateTime.fromFormat).toHaveBeenCalledWith('2023-04-01', 'yyyy-mm-dd');
	});

	it('should handle multiselect fields', async () => {
		mockContext.getBodyData.mockReturnValue({
			data: { 'field-0': '["option1", "option2"]' },
			files: {},
		});

		const formFields = [{ fieldLabel: 'Multiselect', fieldType: 'multiSelect', multiselect: true }];
		const result = await prepareFormReturnItem(mockContext, formFields, 'test');

		expect(result.json.Multiselect).toEqual(['option1', 'option2']);
	});

	it('should use workflow timezone when specified', async () => {
		mockContext.getTimezone.mockReturnValue('America/New_York');

		await prepareFormReturnItem(mockContext, [], 'test', true);

		expect(mockContext.getTimezone).toHaveBeenCalled();
		expect(DateTime.now().setZone).toHaveBeenCalledWith('America/New_York');
	});

	it('should not include workflow static data for form trigger node', async () => {
		const staticData = { queryParam: 'value' };
		mockContext.getWorkflowStaticData.mockReturnValue(staticData);

		const result = await prepareFormReturnItem(mockContext, [], 'test');

		expect(result.json.formQueryParameters).toBeUndefined();
	});

	it('should include query parameters if present and is trigger node', async () => {
		mockContext.getRequestObject.mockReturnValue({
			method: 'POST',
			query: { param: 'value' },
		} as unknown as Request);

		const result = await prepareFormReturnItem(mockContext, [], 'test');

		expect(result.json.formQueryParameters).toEqual({ param: 'value' });
	});

	it('should not include query parameters if empty', async () => {
		mockContext.getRequestObject.mockReturnValue({
			method: 'POST',
			query: {},
		} as unknown as Request);

		const result = await prepareFormReturnItem(mockContext, [], 'test');

		expect(result.json.formQueryParameters).toBeUndefined();
	});

	it('should return html if field name is set', async () => {
		mockContext.getBodyData.mockReturnValue({
			data: { 'field-0': '<div>hi</div>', 'field-1': '<h1><haha/hi>' },
			files: {},
		});

		const formFields = [
			{ fieldLabel: '', elementName: 'greeting', fieldType: 'html' },
			{ fieldLabel: '', elementName: '', fieldType: 'html' },
		];
		const result = await prepareFormReturnItem(mockContext, formFields, 'production');

		expect(result.json.greeting).toBe('<div>hi</div>');
		expect(result.json.formMode).toBe('production');
	});
});

describe('resolveRawData', () => {
	const mockContext = mock<IWebhookFunctions>();

	const dummyData = {
		name: 'Hanna',
		age: 30,
		city: 'New York',
		isStudent: false,
		hasJob: true,
		grades: {
			math: 95,
			science: 88,
			history: 92,
		},
		hobbies: ['reading', 'painting', 'coding'],
		address: {
			street: '123 Main St',
			zipCode: '10001',
			country: 'USA',
		},
		languages: ['English', 'Spanish'],
		projects: [
			{ name: 'Project A', status: 'completed' },
			{ name: 'Project B', status: 'in-progress' },
		],
		emptyArray: [],
	};

	beforeEach(() => {
		jest.clearAllMocks();

		mockContext.evaluateExpression.mockImplementation((expression: string) => {
			const key = expression.replace(/[{}]/g, '').trim();
			return key.split('.').reduce((obj, prop) => obj?.[prop], dummyData as any);
		});
	});

	it('should return the input string if it does not start with "="', () => {
		const input = 'Hello, world!';
		expect(resolveRawData(mockContext, input)).toBe(input);
	});

	it('should remove leading "=" characters', () => {
		const input = '=Hello, world!';
		expect(resolveRawData(mockContext, input)).toBe('Hello, world!');
	});

	it('should resolve a single expression', () => {
		const input = '=Hello, {{name}}!';
		expect(resolveRawData(mockContext, input)).toBe('Hello, Hanna!');
	});

	it('should resolve multiple expressions', () => {
		const input = '={{name}} is {{age}} years old and lives in {{city}}.';
		expect(resolveRawData(mockContext, input)).toBe('Hanna is 30 years old and lives in New York.');
	});

	it('should handle object resolutions', () => {
		const input = '=Grades: {{grades}}';
		expect(resolveRawData(mockContext, input)).toBe(
			'Grades: {"math":95,"science":88,"history":92}',
		);
	});

	it('should handle nested object properties', () => {
		const input = "={{name}}'s math grade is {{grades.math}}.";
		expect(resolveRawData(mockContext, input)).toBe("Hanna's math grade is 95.");
	});

	it('should handle boolean values', () => {
		const input = '=Is {{name}} a student? {{isStudent}}';
		expect(resolveRawData(mockContext, input)).toBe('Is Hanna a student? false');
	});

	it('should handle expressions with whitespace', () => {
		const input = '={{ name }} is {{ age }} years old.';
		expect(resolveRawData(mockContext, input)).toBe('Hanna is 30 years old.');
	});

	it('should return the original string if no resolvables are found', () => {
		const input = '=Hello, world!';
		expect(resolveRawData(mockContext, input)).toBe('Hello, world!');
	});

	it('should handle non-existent properties gracefully', () => {
		const input = "={{name}}'s favorite color is {{favoriteColor}}.";
		expect(resolveRawData(mockContext, input)).toBe("Hanna's favorite color is undefined.");
	});

	it('should handle mixed resolvable and non-resolvable content', () => {
		const input = '={{name}} lives in {{city}} and enjoys programming.';
		expect(resolveRawData(mockContext, input)).toBe(
			'Hanna lives in New York and enjoys programming.',
		);
	});

	it('should handle boolean values correctly', () => {
		const input = '={{name}} is a student: {{isStudent}}. {{name}} has a job: {{hasJob}}.';
		expect(resolveRawData(mockContext, input)).toBe(
			'Hanna is a student: false. Hanna has a job: true.',
		);
	});

	it('should handle arrays correctly', () => {
		const input = "={{name}}'s hobbies are {{hobbies}}.";
		expect(resolveRawData(mockContext, input)).toBe(
			'Hanna\'s hobbies are ["reading","painting","coding"].',
		);
	});

	it('should handle nested objects correctly', () => {
		const input = '={{name}} lives at {{address.street}}, {{address.zipCode}}.';
		expect(resolveRawData(mockContext, input)).toBe('Hanna lives at 123 Main St, 10001.');
	});

	it('should handle arrays of objects correctly', () => {
		const input = '=Project statuses: {{projects.0.status}}, {{projects.1.status}}.';
		expect(resolveRawData(mockContext, input)).toBe('Project statuses: completed, in-progress.');
	});

	it('should handle empty arrays correctly', () => {
		const input = '=Empty array: {{emptyArray}}.';
		expect(resolveRawData(mockContext, input)).toBe('Empty array: [].');
	});

	it('should handle a mix of different data types', () => {
		const input =
			'={{name}} ({{age}}) knows {{languages.length}} languages. First project: {{projects.0.name}}.';
		expect(resolveRawData(mockContext, input)).toBe(
			'Hanna (30) knows 2 languages. First project: Project A.',
		);
	});

	it('should handle nested array access', () => {
		const input = '=First hobby: {{hobbies.0}}, Last hobby: {{hobbies.2}}.';
		expect(resolveRawData(mockContext, input)).toBe('First hobby: reading, Last hobby: coding.');
	});

	it('should handle object-to-string conversion', () => {
		const input = '=Address object: {{address}}.';
		expect(resolveRawData(mockContext, input)).toBe(
			'Address object: {"street":"123 Main St","zipCode":"10001","country":"USA"}.',
		);
	});
});

describe('FormTrigger, isFormConnected', () => {
	it('should return false if Wait node is connected but resume parameter is not form', async () => {
		const result = isFormConnected([
			mock<NodeTypeAndVersion>({
				type: 'n8n-nodes-base.wait',
				parameters: {
					resume: 'timeInterval',
				},
			}),
		]);
		expect(result).toBe(false);
	});
	it('should return true if Wait node is connected and resume parameter is form', async () => {
		const result = isFormConnected([
			mock<NodeTypeAndVersion>({
				type: 'n8n-nodes-base.wait',
				parameters: {
					resume: 'form',
				},
			}),
		]);
		expect(result).toBe(true);
	});
	it('should return true if Form node is connected', async () => {
		const result = isFormConnected([
			mock<NodeTypeAndVersion>({
				type: 'n8n-nodes-base.form',
			}),
		]);
		expect(result).toBe(true);
	});
});

describe('validateResponseModeConfiguration', () => {
	let webhookFunctions: ReturnType<typeof mock<IWebhookFunctions>>;

	beforeEach(() => {
		webhookFunctions = mock<IWebhookFunctions>();

		webhookFunctions.getNode.mockReturnValue({
			name: 'TestNode',
			typeVersion: 2.2,
		} as INode);

		webhookFunctions.getChildNodes.mockReturnValue([]);
	});

	test('throws error if responseMode is "responseNode" but no Respond to Webhook node is connected', () => {
		webhookFunctions.getNodeParameter.mockReturnValue('responseNode');

		expect(() => validateResponseModeConfiguration(webhookFunctions)).toThrow(
			'No Respond to Webhook node found in the workflow',
		);
	});

	test('throws error if "Respond to Webhook" node is connected but "responseMode" is not "responseNode" in typeVersion <= 2.1', () => {
		webhookFunctions.getNodeParameter.mockReturnValue('onReceived');
		webhookFunctions.getNode.mockReturnValue({
			name: 'TestNode',
			typeVersion: 2.1,
		} as INode);
		webhookFunctions.getChildNodes.mockReturnValue([
			{ type: 'n8n-nodes-base.respondToWebhook' } as NodeTypeAndVersion,
		]);

		expect(() => validateResponseModeConfiguration(webhookFunctions)).toThrow(
			'TestNode node not correctly configured',
		);
	});

	test('throws error if "Respond to Webhook" node is connected, version >= 2.2', () => {
		webhookFunctions.getNodeParameter.mockReturnValue('responseNode');
		webhookFunctions.getChildNodes.mockReturnValue([
			{ type: 'n8n-nodes-base.respondToWebhook' } as NodeTypeAndVersion,
		]);

		expect(() => validateResponseModeConfiguration(webhookFunctions)).toThrow(
			'The "Respond to Webhook" node is not supported in workflows initiated by the "n8n Form Trigger"',
		);
	});

	test('does not throw an error mode in not "responseNode" and no "Respond to Webhook" node is connected', () => {
		webhookFunctions.getNodeParameter.mockReturnValue('onReceived');

		expect(() => validateResponseModeConfiguration(webhookFunctions)).not.toThrow();
	});

	describe('prepareFormFields', () => {
		it('should resolve expressions in html fields', async () => {
			webhookFunctions.evaluateExpression.mockImplementation((expression) => {
				if (expression === '{{ $json.formMode }}') {
					return 'Title';
				}
			});

			const result = prepareFormFields(webhookFunctions, [
				{
					fieldLabel: 'Custom HTML',
					fieldType: 'html',
					elementName: 'test',
					html: '<h1>{{ $json.formMode }}</h1>',
				},
			]);

			expect(result[0].html).toBe('<h1>Title</h1>');
		});
		it('should prepare hiddenField', async () => {
			const result = prepareFormFields(webhookFunctions, [
				{
					fieldLabel: '',
					fieldName: 'test',
					fieldType: 'hiddenField',
				},
			]);

			expect(result[0]).toEqual({
				fieldLabel: 'test',
				fieldName: 'test',
				fieldType: 'hiddenField',
			});
		});
	});
});

describe('addFormResponseDataToReturnItem', () => {
	let returnItem: INodeExecutionData;

	beforeEach(() => {
		returnItem = { json: {} };
	});

	test('should use fieldName if fieldLabel is missing', () => {
		const formFields: FormFieldsParameter = [
			{ fieldName: 'Alternative Field', fieldType: 'hiddenField' },
		] as FormFieldsParameter;
		const bodyData: IDataObject = { 'field-0': 'Test Value' };

		addFormResponseDataToReturnItem(returnItem, formFields, bodyData);
		expect(returnItem.json['Alternative Field']).toBe('Test Value');
	});

	it('should handle null values', () => {
		const formFields: FormFieldsParameter = [{ fieldLabel: 'Test Field', fieldType: 'text' }];
		const bodyData: IDataObject = {};

		addFormResponseDataToReturnItem(returnItem, formFields, bodyData);
		expect(returnItem.json['Test Field']).toBeNull();
	});

	it('should process html fields and set elementName', () => {
		const formFields: FormFieldsParameter = [
			{ fieldLabel: 'HTML Field', elementName: 'htmlElement', fieldType: 'html' },
		];
		const bodyData: IDataObject = { 'field-0': '<p>HTML Content</p>' };

		addFormResponseDataToReturnItem(returnItem, formFields, bodyData);
		expect(returnItem.json.htmlElement).toBe('<p>HTML Content</p>');
	});

	it('should parse number fields correctly', () => {
		const formFields: FormFieldsParameter = [{ fieldLabel: 'Number Field', fieldType: 'number' }];
		const bodyData: IDataObject = { 'field-0': '42' };

		addFormResponseDataToReturnItem(returnItem, formFields, bodyData);
		expect(returnItem.json['Number Field']).toBe(42);
	});

	it('should trim text fields', () => {
		const formFields: FormFieldsParameter = [{ fieldLabel: 'Text Field', fieldType: 'text' }];
		const bodyData: IDataObject = { 'field-0': '   hello world   ' };

		addFormResponseDataToReturnItem(returnItem, formFields, bodyData);
		expect(returnItem.json['Text Field']).toBe('hello world');
	});

	it('should parse multiselect fields from JSON', () => {
		const formFields: FormFieldsParameter = [
			{ fieldLabel: 'Multi Field', fieldType: 'text', multiselect: true },
		];
		const bodyData: IDataObject = { 'field-0': '["option1", "option2"]' };

		addFormResponseDataToReturnItem(returnItem, formFields, bodyData);
		expect(returnItem.json['Multi Field']).toEqual(['option1', 'option2']);
	});

	it('should convert single file values to an array if multipleFiles is true', () => {
		const formFields: FormFieldsParameter = [
			{ fieldLabel: 'File Field', fieldType: 'file', multipleFiles: true },
		];
		const bodyData: IDataObject = { 'field-0': 'file1.pdf' };

		addFormResponseDataToReturnItem(returnItem, formFields, bodyData);
		expect(returnItem.json['File Field']).toEqual(['file1.pdf']);
	});
});

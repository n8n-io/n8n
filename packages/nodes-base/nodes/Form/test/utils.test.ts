import { mock } from 'jest-mock-extended';
import type {
	FormFieldsParameter,
	INode,
	IWebhookFunctions,
	MultiPartFormData,
} from 'n8n-workflow';
import { DateTime } from 'luxon';
import { formWebhook, prepareFormData, prepareFormReturnItem, resolveRawData } from '../utils';

describe('FormTrigger, formWebhook', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should call response render', async () => {
		const executeFunctions = mock<IWebhookFunctions>();
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
			buttonLabel: 'Submit',
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

		const formFields: FormFieldsParameter = [
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
			buttonLabel: 'Submit',
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

		expect(result.validForm).toBe(false);
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

	it('should include workflow static data for form trigger node', async () => {
		const staticData = { queryParam: 'value' };
		mockContext.getWorkflowStaticData.mockReturnValue(staticData);

		const result = await prepareFormReturnItem(mockContext, [], 'test');

		expect(result.json.formQueryParameters).toEqual(staticData);
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

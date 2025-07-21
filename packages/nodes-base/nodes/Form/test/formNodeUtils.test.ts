import { type Response } from 'express';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import {
	type FormFieldsParameter,
	type IWebhookFunctions,
	type NodeTypeAndVersion,
} from 'n8n-workflow';

import { renderFormNode } from '../utils/formNodeUtils';

describe('formNodeUtils', () => {
	let webhookFunctions: MockProxy<IWebhookFunctions>;

	beforeEach(() => {
		webhookFunctions = mock<IWebhookFunctions>();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should sanitize custom html', async () => {
		webhookFunctions.getNode.mockReturnValue({ typeVersion: 2.1 } as any);
		webhookFunctions.getNodeParameter.calledWith('options').mockReturnValue({
			formTitle: 'Test Title',
			formDescription: 'Test Description',
			buttonLabel: 'Test Button Label',
		});

		const mockRender = jest.fn();

		const formFields: FormFieldsParameter = [
			{
				fieldLabel: 'Custom HTML',
				fieldType: 'html',
				html: '<div>Test HTML</div>',
				requiredField: false,
			},
			{
				fieldLabel: 'Custom HTML',
				fieldType: 'html',
				html: '<script>Test HTML</script>',
				requiredField: false,
			},
			{
				fieldLabel: 'Custom HTML',
				fieldType: 'html',
				html: '<style>Test HTML</style>',
				requiredField: false,
			},
			{
				fieldLabel: 'Custom HTML',
				fieldType: 'html',
				html: '<style>Test HTML</style><div>hihihi</div><script>Malicious script here</script>',
				requiredField: false,
			},
		];

		webhookFunctions.getNodeParameter.calledWith('formFields.values').mockReturnValue(formFields);

		const responseMock = mock<Response>({ render: mockRender } as any);
		const triggerMock = mock<NodeTypeAndVersion>({ name: 'triggerName' } as any);

		await renderFormNode(webhookFunctions, responseMock, triggerMock, formFields, 'test');

		expect(mockRender).toHaveBeenCalledWith('form-trigger', {
			appendAttribution: true,
			buttonLabel: 'Test Button Label',
			formDescription: 'Test Description',
			formDescriptionMetadata: 'Test Description',
			formFields: [
				{
					defaultValue: '',
					errorId: 'error-field-0',
					html: '<div>Test HTML</div>',
					id: 'field-0',
					inputRequired: '',
					isHtml: true,
					label: 'Custom HTML',
					placeholder: undefined,
				},
				{
					defaultValue: '',
					errorId: 'error-field-1',
					html: '',
					id: 'field-1',
					inputRequired: '',
					isHtml: true,
					label: 'Custom HTML',
					placeholder: undefined,
				},
				{
					defaultValue: '',
					errorId: 'error-field-2',
					html: '',
					id: 'field-2',
					inputRequired: '',
					isHtml: true,
					label: 'Custom HTML',
					placeholder: undefined,
				},
				{
					defaultValue: '',
					errorId: 'error-field-3',
					html: '<div>hihihi</div>',
					id: 'field-3',
					inputRequired: '',
					isHtml: true,
					label: 'Custom HTML',
					placeholder: undefined,
				},
			],
			formSubmittedHeader: undefined,
			formSubmittedText: 'Your response has been recorded',
			formTitle: 'Test Title',
			n8nWebsiteLink: 'https://n8n.io/?utm_source=n8n-internal&utm_medium=form-trigger',
			testRun: true,
			useResponseData: true,
		});
	});
});

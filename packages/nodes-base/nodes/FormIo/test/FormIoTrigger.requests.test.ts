import type { IHookFunctions, IHttpRequestOptions, ILoadOptionsFunctions } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { FormIoTrigger } from '../FormIoTrigger.node';

describe('FormIoTrigger > request URLs', () => {
	const trigger = new FormIoTrigger();
	const hookContext = mockDeep<IHookFunctions>();
	const loadOptionsContext = mockDeep<ILoadOptionsFunctions>();
	const projectId = '5e5f8c1d2b3a4c0012345678';
	const formId = '5e5f8c1d2b3a4c0087654321';
	const parameters: Record<string, string | string[]> = {
		projectId,
		formId,
		events: ['create'],
	};

	beforeEach(() => {
		jest.clearAllMocks();
		const credentials = {
			environment: 'selfHosted',
			domain: 'https://forms.example.com',
			email: 'nathan@example.com',
			password: 'fake-password',
		};
		for (const context of [hookContext, loadOptionsContext]) {
			context.getCredentials.mockResolvedValue(credentials);
			context.helpers.httpRequestWithAuthentication.mockResolvedValue([]);
		}
		loadOptionsContext.getCurrentNodeParameter.mockReturnValue(projectId);
		hookContext.getNodeParameter.mockImplementation((name: string) => parameters[name]);
		hookContext.getNodeWebhookUrl.mockReturnValue('https://n8n.example.com/webhook/formio');
		hookContext.getWorkflowStaticData.mockImplementation(() => ({
			webhookId: '5e5f8c1d2b3a4c00aaaabbbb',
		}));
	});

	const requestedUrls = (context: IHookFunctions | ILoadOptionsFunctions) =>
		jest
			.mocked(context.helpers.httpRequestWithAuthentication)
			.mock.calls.map(([, options]) => String((options as IHttpRequestOptions).url));

	it('should send the load options requests to the Form.io URLs', async () => {
		await trigger.methods.loadOptions.getProjects.call(loadOptionsContext);
		await trigger.methods.loadOptions.getForms.call(loadOptionsContext);

		expect(requestedUrls(loadOptionsContext)).toEqual([
			'https://forms.example.com/project',
			`https://forms.example.com/project/${projectId}/form`,
		]);
	});

	it('should send the webhook requests to the Form.io URLs', async () => {
		await trigger.webhookMethods.default.checkExists.call(hookContext);
		await trigger.webhookMethods.default.create.call(hookContext);
		await trigger.webhookMethods.default.delete.call(hookContext);

		const actions = `https://forms.example.com/project/${projectId}/form/${formId}/action`;
		expect(requestedUrls(hookContext)).toEqual([
			actions,
			actions,
			`${actions}/5e5f8c1d2b3a4c00aaaabbbb`,
		]);
	});
});

import type { IHookFunctions, INode, NodeParameterValueType } from 'n8n-workflow';
import { mock, mockDeep } from 'jest-mock-extended';

import { GitlabTrigger } from '../GitlabTrigger.node';

// No module mocks here: these tests check the URLs that the real request helpers build
describe('GitlabTrigger', () => {
	let trigger: GitlabTrigger;

	beforeEach(() => {
		trigger = new GitlabTrigger();
	});

	describe('webhookMethods', () => {
		const projectUrl =
			'https://gitlab.example.com/api/v4/projects/acme%2Fplatform%2Fbilling-service';
		let hookFunctions: ReturnType<typeof mockDeep<IHookFunctions>>;

		let params: Record<string, unknown>;

		beforeEach(() => {
			hookFunctions = mockDeep<IHookFunctions>();
			hookFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.1 }));
			params = {
				authentication: 'accessToken',
				owner: 'acme/platform',
				repository: 'billing-service',
				events: ['push'],
			};
			hookFunctions.getNodeParameter.mockImplementation(
				(name: string) => params[name] as NodeParameterValueType,
			);
			hookFunctions.getWorkflowStaticData.mockReturnValue({ webhookId: 77 });
			hookFunctions.getNodeWebhookUrl.mockReturnValue('https://n8n.example.com/webhook/abc');
			hookFunctions.getCredentials.mockResolvedValue({ server: 'https://gitlab.example.com/' });
			hookFunctions.helpers.requestWithAuthentication.mockResolvedValue({ id: 77 });
		});

		const requestUri = () =>
			String(hookFunctions.helpers.requestWithAuthentication.mock.calls[0][1].uri);

		it('should check the stored project hook', async () => {
			await trigger.webhookMethods.default.checkExists.call(hookFunctions);

			expect(requestUri()).toBe(`${projectUrl}/hooks/77`);
		});

		it('should create the project hook', async () => {
			await trigger.webhookMethods.default.create.call(hookFunctions);

			expect(requestUri()).toBe(`${projectUrl}/hooks`);
		});

		it('should delete the stored project hook', async () => {
			await trigger.webhookMethods.default.delete.call(hookFunctions);

			expect(requestUri()).toBe(`${projectUrl}/hooks/77`);
		});

		it.each([
			[1, 'acme%2Fplatform%2Fbilling-service'],
			[1.1, 'acme%252Fplatform%2Fbilling-service'],
		])(
			'should build the project path in version %s from an encoded owner',
			async (typeVersion, path) => {
				hookFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion }));
				params.owner = 'acme%2Fplatform';

				await trigger.webhookMethods.default.create.call(hookFunctions);

				expect(requestUri()).toBe(`https://gitlab.example.com/api/v4/projects/${path}/hooks`);
			},
		);
	});
});

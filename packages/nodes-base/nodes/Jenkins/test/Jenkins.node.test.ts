import { mockDeep } from 'vitest-mock-extended';
import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INode,
	INodePropertyOptions,
} from 'n8n-workflow';

import * as GenericFunctions from '../GenericFunctions';
import { Jenkins } from '../Jenkins.node';
import type { Mocked, MockInstance } from 'vitest';

describe('Jenkins node', () => {
	let node: Jenkins;
	let loadOptionsFunctions: Mocked<ILoadOptionsFunctions>;
	let jenkinsApiRequestSpy: MockInstance;

	beforeEach(() => {
		node = new Jenkins();
		loadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
		loadOptionsFunctions.getCurrentNodeParameter.mockReturnValue('demo-job');
		vi.clearAllMocks();
		jenkinsApiRequestSpy = vi.spyOn(GenericFunctions, 'jenkinsApiRequest');
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('loadOptions.getJobParameters', () => {
		it('loads parameters from actions', async () => {
			jenkinsApiRequestSpy.mockResolvedValue({
				actions: [
					{
						_class: 'hudson.model.ParametersDefinitionProperty',
						parameterDefinitions: [
							{ name: 'BRANCH', type: 'StringParameterDefinition' },
							{ name: 'DRY_RUN', type: 'BooleanParameterDefinition' },
						],
					},
				],
			});

			const result = await node.methods.loadOptions.getJobParameters.call(loadOptionsFunctions);

			expect(result).toEqual<INodePropertyOptions[]>([
				{ name: 'BRANCH - (StringParameterDefinition)', value: 'BRANCH' },
				{ name: 'DRY_RUN - (BooleanParameterDefinition)', value: 'DRY_RUN' },
			]);
			expect(jenkinsApiRequestSpy).toHaveBeenCalledWith(
				'GET',
				'/job/demo-job/api/json?tree=actions[parameterDefinitions[*]],property[parameterDefinitions[*]]',
			);
		});

		it('loads parameters from property', async () => {
			jenkinsApiRequestSpy.mockResolvedValue({
				property: [
					{
						_class:
							'org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty ParametersDefinitionProperty',
						parameterDefinitions: [{ name: 'VERSION', type: 'StringParameterDefinition' }],
					},
				],
			});

			const result = await node.methods.loadOptions.getJobParameters.call(loadOptionsFunctions);

			expect(result).toEqual<INodePropertyOptions[]>([
				{ name: 'VERSION - (StringParameterDefinition)', value: 'VERSION' },
			]);
		});

		it('merges actions and property results and deduplicates parameter names', async () => {
			jenkinsApiRequestSpy.mockResolvedValue({
				actions: [
					{
						_class: 'hudson.model.ParametersDefinitionProperty',
						parameterDefinitions: [{ name: 'ENV', type: 'StringParameterDefinition' }],
					},
				],
				property: [
					{
						_class: 'hudson.model.ParametersDefinitionProperty',
						parameterDefinitions: [
							{ name: 'ENV', type: 'StringParameterDefinition' },
							{ name: 'REGION', type: 'ChoiceParameterDefinition' },
						],
					},
				],
			});

			const result = await node.methods.loadOptions.getJobParameters.call(loadOptionsFunctions);

			expect(result).toEqual<INodePropertyOptions[]>([
				{ name: 'ENV - (StringParameterDefinition)', value: 'ENV' },
				{ name: 'REGION - (ChoiceParameterDefinition)', value: 'REGION' },
			]);
		});

		it('filters non parameter classes and sorts by display name', async () => {
			jenkinsApiRequestSpy.mockResolvedValue({
				actions: [
					{
						_class: 'hudson.model.ScmProperty',
						parameterDefinitions: [
							{ name: 'SHOULD_NOT_APPEAR', type: 'StringParameterDefinition' },
						],
					},
					{
						_class: 'hudson.model.ParametersDefinitionProperty',
						parameterDefinitions: [
							{ name: 'ZZZ', type: 'StringParameterDefinition' },
							{ name: 'AAA', type: 'StringParameterDefinition' },
						],
					},
				],
			});

			const result = await node.methods.loadOptions.getJobParameters.call(loadOptionsFunctions);

			expect(result).toEqual<INodePropertyOptions[]>([
				{ name: 'AAA - (StringParameterDefinition)', value: 'AAA' },
				{ name: 'ZZZ - (StringParameterDefinition)', value: 'ZZZ' },
			]);
		});
	});

	describe('execute', () => {
		it('triggers a job with parameters successfully when jenkinsApiRequest returns queue redirect', async () => {
			const executeFunctions = mockDeep<IExecuteFunctions>();
			executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
			executeFunctions.helpers.returnJsonArray.mockImplementation((data: any) =>
				data.map((item: any) => ({ json: item })),
			);
			executeFunctions.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'resource') return 'job';
				if (name === 'operation') return 'triggerParams';
				if (name === 'job') return 'demo-job';
				if (name === 'param.params') return [{ name: 'BRANCH', value: 'main' }];
				return undefined;
			});
			jenkinsApiRequestSpy.mockResolvedValue({
				success: true,
				queueUrl: 'https://jenkins.example.com/queue/item/42/',
			});

			const result = await node.execute.call(executeFunctions);

			expect(jenkinsApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/job/demo-job/buildWithParameters',
				{},
				{},
				{
					form: { BRANCH: 'main' },
					headers: {
						'content-type': 'application/x-www-form-urlencoded',
					},
				},
			);
			expect(result).toEqual([[{ json: { success: true } }]]);
		});

		it('triggers a parameterless job successfully', async () => {
			const executeFunctions = mockDeep<IExecuteFunctions>();
			executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
			executeFunctions.helpers.returnJsonArray.mockImplementation((data: any) =>
				data.map((item: any) => ({ json: item })),
			);
			executeFunctions.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'resource') return 'job';
				if (name === 'operation') return 'trigger';
				if (name === 'job') return 'demo-job';
				return undefined;
			});
			jenkinsApiRequestSpy.mockResolvedValue({ success: true });

			const result = await node.execute.call(executeFunctions);

			expect(jenkinsApiRequestSpy).toHaveBeenCalledWith('POST', '/job/demo-job/build');
			expect(result).toEqual([[{ json: { success: true } }]]);
		});

		it('triggers a job through the real request helper when Jenkins requires a crumb and redirects to the queue', async () => {
			// The beforeEach spy calls through to the real jenkinsApiRequest, so only the HTTP layer is stubbed
			const executeFunctions = mockDeep<IExecuteFunctions>();
			executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
			executeFunctions.getNode.mockReturnValue({
				name: 'Jenkins',
				type: 'n8n-nodes-base.jenkins',
				typeVersion: 1,
			} as INode);
			executeFunctions.getCredentials.mockResolvedValue({
				username: 'user',
				apiKey: 'password',
				baseUrl: 'http://jenkins:8080',
			});
			executeFunctions.helpers.returnJsonArray.mockImplementation((data: any) =>
				data.map((item: any) => ({ json: item })),
			);
			executeFunctions.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'resource') return 'job';
				if (name === 'operation') return 'triggerParams';
				if (name === 'job') return 'demo-job';
				if (name === 'param.params') return [{ name: 'BRANCH', value: 'main' }];
				return undefined;
			});
			const httpError = (statusCode: number, data: string, headers = {}) =>
				Object.assign(new Error(`${statusCode} - ${JSON.stringify(data)}`), {
					statusCode,
					response: { status: statusCode, headers },
				});
			executeFunctions.helpers.request
				.mockRejectedValueOnce(httpError(403, 'No valid crumb was included in the request'))
				.mockResolvedValueOnce({
					body: { crumbRequestField: 'Jenkins-Crumb', crumb: 'test-crumb' },
					headers: { 'set-cookie': ['JSESSIONID=test-session; Path=/; HttpOnly'] },
				})
				.mockRejectedValueOnce(
					httpError(303, '', { location: 'https://jenkins.acme.com/queue/item/42/' }),
				);

			const result = await node.execute.call(executeFunctions);

			expect(result).toEqual([[{ json: { success: true } }]]);
			expect(executeFunctions.helpers.request).toHaveBeenCalledTimes(3);
			expect(executeFunctions.helpers.request).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({ uri: 'http://jenkins:8080/crumbIssuer/api/json' }),
			);
			expect(executeFunctions.helpers.request).toHaveBeenLastCalledWith(
				expect.objectContaining({
					method: 'POST',
					uri: 'http://jenkins:8080/job/demo-job/buildWithParameters',
					form: { BRANCH: 'main' },
					headers: {
						Accept: 'application/json',
						'Jenkins-Crumb': 'test-crumb',
						Cookie: 'JSESSIONID=test-session',
						'content-type': 'application/x-www-form-urlencoded',
					},
				}),
			);
		});
	});
});

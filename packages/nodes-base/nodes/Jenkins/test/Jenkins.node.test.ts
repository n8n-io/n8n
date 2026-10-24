import { mockDeep } from 'vitest-mock-extended';
import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
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
	});
});

import { mockDeep } from 'jest-mock-extended';
import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import * as GenericFunctions from '../GenericFunctions';
import { Jenkins } from '../Jenkins.node';

describe('Jenkins node', () => {
	let node: Jenkins;
	let loadOptionsFunctions: jest.Mocked<ILoadOptionsFunctions>;
	const jenkinsApiRequestSpy = jest.spyOn(GenericFunctions, 'jenkinsApiRequest');

	beforeEach(() => {
		node = new Jenkins();
		loadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
		loadOptionsFunctions.getCurrentNodeParameter.mockReturnValue('demo-job');
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.resetAllMocks();
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
});

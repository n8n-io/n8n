import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { Jenkins } from '../Jenkins.node';
import * as GenericFunctions from '../GenericFunctions';

jest.mock('../GenericFunctions');

describe('Jenkins Node', () => {
	let jenkins: Jenkins;
	let loadOptionsFunctions: ILoadOptionsFunctions;

	beforeEach(() => {
		jenkins = new Jenkins();
		loadOptionsFunctions = {
			getCurrentNodeParameter: jest.fn(),
			getNodeParameter: jest.fn(),
			helpers: {} as any,
			getNode: jest.fn().mockReturnValue({}),
		} as unknown as ILoadOptionsFunctions;
		jest.clearAllMocks();
	});

	describe('loadOptions.getJobParameters', () => {
		const jobName = 'drupal-10-dockerhub-harbor';

		beforeEach(() => {
			(loadOptionsFunctions.getCurrentNodeParameter as jest.Mock).mockReturnValue(jobName);
		});

		it('should return empty array when actions array is empty', async () => {
			// This is a common scenario that causes "No data" in the dropdown
			jest.spyOn(GenericFunctions, 'jenkinsApiRequest').mockResolvedValue({
				actions: [],
			});

			const result = await jenkins.methods.loadOptions.getJobParameters.call(
				loadOptionsFunctions as ILoadOptionsFunctions,
			);

			expect(GenericFunctions.jenkinsApiRequest).toHaveBeenCalledWith(
				'GET',
				`/job/${jobName}/api/json?tree=actions[parameterDefinitions[*]]`,
			);
			expect(result).toEqual([]);
		});

		it('should return empty array when no ParametersDefinitionProperty in actions', async () => {
			// This reproduces the bug where Jenkins returns actions but without parameter definitions
			jest.spyOn(GenericFunctions, 'jenkinsApiRequest').mockResolvedValue({
				actions: [
					{
						_class: 'hudson.model.CauseAction',
					},
					{
						_class: 'hudson.model.ParametersAction',
					},
				],
			});

			const result = await jenkins.methods.loadOptions.getJobParameters.call(
				loadOptionsFunctions as ILoadOptionsFunctions,
			);

			expect(result).toEqual([]);
		});

		it('should return empty array when parameterDefinitions is undefined', async () => {
			// This reproduces the bug where _class matches but parameterDefinitions is missing
			jest.spyOn(GenericFunctions, 'jenkinsApiRequest').mockResolvedValue({
				actions: [
					{
						_class: 'hudson.model.ParametersDefinitionProperty',
						// parameterDefinitions is missing
					},
				],
			});

			const result = await jenkins.methods.loadOptions.getJobParameters.call(
				loadOptionsFunctions as ILoadOptionsFunctions,
			);

			// This should handle gracefully and return empty array
			// Currently this might throw an error when trying to iterate
			expect(result).toEqual([]);
		});

		it('should return parameters when valid parameterDefinitions exist', async () => {
			// This is the expected working scenario
			jest.spyOn(GenericFunctions, 'jenkinsApiRequest').mockResolvedValue({
				actions: [
					{
						_class: 'hudson.model.CauseAction',
					},
					{
						_class: 'hudson.model.ParametersDefinitionProperty',
						parameterDefinitions: [
							{
								name: 'DRUPAL_VERSION',
								type: 'StringParameterDefinition',
							},
							{
								name: 'ENVIRONMENT',
								type: 'ChoiceParameterDefinition',
							},
						],
					},
				],
			});

			const result = await jenkins.methods.loadOptions.getJobParameters.call(
				loadOptionsFunctions as ILoadOptionsFunctions,
			);

			expect(result).toEqual([
				{
					name: 'DRUPAL_VERSION - (StringParameterDefinition)',
					value: 'DRUPAL_VERSION',
				},
				{
					name: 'ENVIRONMENT - (ChoiceParameterDefinition)',
					value: 'ENVIRONMENT',
				},
			]);
		});

		it('should handle Jenkins API error gracefully', async () => {
			// This reproduces authentication or permission errors
			jest
				.spyOn(GenericFunctions, 'jenkinsApiRequest')
				.mockRejectedValue(new Error('Unauthorized'));

			await expect(
				jenkins.methods.loadOptions.getJobParameters.call(
					loadOptionsFunctions as ILoadOptionsFunctions,
				),
			).rejects.toThrow('Unauthorized');
		});

		it('should handle actions with nested ParametersDefinitionProperty class name', async () => {
			// Some Jenkins versions use fully qualified class names
			jest.spyOn(GenericFunctions, 'jenkinsApiRequest').mockResolvedValue({
				actions: [
					{
						_class: 'com.cloudbees.plugins.credentials.ParametersDefinitionProperty',
						parameterDefinitions: [
							{
								name: 'API_KEY',
								type: 'PasswordParameterDefinition',
							},
						],
					},
				],
			});

			const result = await jenkins.methods.loadOptions.getJobParameters.call(
				loadOptionsFunctions as ILoadOptionsFunctions,
			);

			// The current implementation uses .includes('ParametersDefinitionProperty')
			// which should match this case
			expect(result).toEqual([
				{
					name: 'API_KEY - (PasswordParameterDefinition)',
					value: 'API_KEY',
				},
			]);
		});

		it('should return empty array when actions is null or undefined', async () => {
			// This reproduces malformed API responses
			jest.spyOn(GenericFunctions, 'jenkinsApiRequest').mockResolvedValue({
				// actions is missing entirely
			});

			const result = await jenkins.methods.loadOptions.getJobParameters.call(
				loadOptionsFunctions as ILoadOptionsFunctions,
			);

			// This should handle gracefully
			// Currently this might throw "Cannot iterate over undefined"
			expect(result).toEqual([]);
		});
	});
});

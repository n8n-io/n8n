import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { Github } from '../Github.node';

describe('GitHub workflow dispatch', () => {
	const details = {
		workflow_run_id: 123,
		run_url: 'https://api.github.com/repos/example/project/actions/runs/123',
		html_url: 'https://github.com/example/project/actions/runs/123',
	};

	it.each([
		{
			name: 'return run details when requested',
			server: 'https://api.github.com',
			option: { 'options.returnRunDetails': true },
			requestFields: { return_run_details: true },
			response: details,
		},
		{
			name: 'handle an empty Enterprise Server response without requesting run details',
			server: 'https://github.example.com/api/v3',
			option: {},
			requestFields: {},
			response: undefined,
		},
		{
			name: 'keep run details returned by Enterprise Server without requesting them',
			server: 'https://github.example.com/api/v3',
			option: {},
			requestFields: {},
			response: {
				workflow_run_id: 123,
				run_url: 'https://github.example.com/api/v3/repos/example/project/actions/runs/123',
				html_url: 'https://github.example.com/example/project/actions/runs/123',
			},
		},
	])('should $name', async ({ server, option, requestFields, response }) => {
		const context = mockDeep<IExecuteFunctions>();
		const parameters: IDataObject = {
			resource: 'workflow',
			operation: 'dispatch',
			owner: 'example',
			repository: 'project',
			workflowId: 'ci.yml',
			ref: 'main',
			inputs: '{}',
			...option,
		};
		context.getNodeParameter.mockImplementation((name, _index, fallback) => {
			return parameters[name] ?? fallback;
		});
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getCredentials.mockResolvedValue({ server });
		context.helpers.requestWithAuthentication.mockResolvedValue(response);
		context.helpers.returnJsonArray.mockReturnValue([{ json: response ?? {} }]);
		context.helpers.constructExecutionMetaData.mockImplementation((items, { itemData }) =>
			items.map((item) => ({ ...item, pairedItem: itemData })),
		);

		await expect(new Github().execute.call(context)).resolves.toEqual([
			[{ json: response ?? {}, pairedItem: { item: 0 } }],
		]);

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledExactlyOnceWith(
			'githubApi',
			expect.objectContaining({
				method: 'POST',
				body: { ref: 'main', inputs: {}, ...requestFields },
			}),
		);
		expect(context.helpers.returnJsonArray).toHaveBeenCalledExactlyOnceWith(response ?? {});
	});
});

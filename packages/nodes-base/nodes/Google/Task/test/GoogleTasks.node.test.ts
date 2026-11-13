import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';

import { GoogleTasks } from '../GoogleTasks.node';

describe('Google Tasks Node', () => {
	it('should encode the task ID as one path segment', async () => {
		const executeFunctions = mockDeep<IExecuteFunctions>();
		const params: Record<string, string> = {
			resource: 'task',
			operation: 'get',
			task: 'MTY1NjQ1NTg4NjY5NTE5ODU3NjI6MDow',
			taskId: 'abc/def?x=1',
		};
		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctions.getNodeParameter.mockImplementation((name: string) => params[name]);
		executeFunctions.helpers.returnJsonArray.mockReturnValue([]);
		executeFunctions.helpers.constructExecutionMetaData.mockReturnValue([]);
		executeFunctions.helpers.requestOAuth2.mockResolvedValue({});

		await new GoogleTasks().execute.call(executeFunctions);

		expect(executeFunctions.helpers.requestOAuth2).toHaveBeenCalledWith(
			'googleTasksOAuth2Api',
			expect.objectContaining({
				uri: requestUrl`https://www.googleapis.com/tasks/v1/lists/MTY1NjQ1NTg4NjY5NTE5ODU3NjI6MDow/tasks/abc%2Fdef%3Fx=1`,
			}),
		);
	});

	it('should reject a task ID with a dot segment', async () => {
		const executeFunctions = mockDeep<IExecuteFunctions>();
		const params: Record<string, string> = {
			resource: 'task',
			operation: 'get',
			task: 'MTY1NjQ1NTg4NjY5NTE5ODU3NjI6MDow',
			taskId: 'abc/../def?x=1',
		};
		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctions.getNodeParameter.mockImplementation((name: string) => params[name]);
		executeFunctions.helpers.returnJsonArray.mockReturnValue([]);
		executeFunctions.helpers.constructExecutionMetaData.mockReturnValue([]);
		executeFunctions.helpers.requestOAuth2.mockResolvedValue({});

		await expect(new GoogleTasks().execute.call(executeFunctions)).rejects.toThrow(
			'Invalid identifier',
		);
		expect(executeFunctions.helpers.requestOAuth2).not.toHaveBeenCalled();
	});
});

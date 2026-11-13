import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { GSuiteAdmin } from '../GSuiteAdmin.node';

describe('Google Workspace Admin - request URL encoding', () => {
	it('should encode a user ID with a slash as one path segment', async () => {
		const params: IDataObject = {
			resource: 'user',
			operation: 'get',
			userId: '114393134535981252528/admin',
			output: 'simple',
			projection: 'basic',
		};
		const context = mockDeep<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNodeParameter.mockImplementation((name: string) => params[name]);
		context.helpers.constructExecutionMetaData.mockReturnValue([]);
		context.helpers.httpRequestWithAuthentication.mockResolvedValue({});

		await new GSuiteAdmin().execute.call(context);

		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'gSuiteAdminOAuth2Api',
			expect.objectContaining({
				url: requestUrl`https://www.googleapis.com/admin/directory/v1/users/114393134535981252528%2Fadmin`,
			}),
		);
	});

	it('should reject a user ID with a dot segment', async () => {
		const params: IDataObject = {
			resource: 'user',
			operation: 'get',
			userId: '114393134535981252528/../admin',
			output: 'simple',
			projection: 'basic',
		};
		const context = mockDeep<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNodeParameter.mockImplementation((name: string) => params[name]);
		context.helpers.constructExecutionMetaData.mockReturnValue([]);
		context.helpers.httpRequestWithAuthentication.mockResolvedValue({});

		await expect(new GSuiteAdmin().execute.call(context)).rejects.toThrow();
		expect(context.helpers.httpRequestWithAuthentication).not.toHaveBeenCalled();
	});
});

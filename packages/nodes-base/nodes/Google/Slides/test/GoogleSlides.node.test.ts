import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';

import { GoogleSlides } from '../GoogleSlides.node';

describe('Google Slides Node', () => {
	it('should encode the page object ID as one path segment', async () => {
		const executeFunctions = mockDeep<IExecuteFunctions>();
		const params: Record<string, string> = {
			authentication: 'oAuth2',
			resource: 'page',
			operation: 'get',
			presentationId: '1EAYk18WDjIG-zp_0vLm3CsfQh_i8eXc67Jo2O9C6Vuc',
			pageObjectId: 'p1/p2?x=1',
		};
		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctions.getNodeParameter.mockImplementation((name: string) => params[name]);
		executeFunctions.helpers.returnJsonArray.mockReturnValue([]);
		executeFunctions.helpers.constructExecutionMetaData.mockReturnValue([]);
		executeFunctions.helpers.requestOAuth2.mockResolvedValue({});

		await new GoogleSlides().execute.call(executeFunctions);

		expect(executeFunctions.helpers.requestOAuth2).toHaveBeenCalledWith(
			'googleSlidesOAuth2Api',
			expect.objectContaining({
				uri: requestUrl`https://slides.googleapis.com/v1/presentations/1EAYk18WDjIG-zp_0vLm3CsfQh_i8eXc67Jo2O9C6Vuc/pages/p1%2Fp2%3Fx=1`,
			}),
		);
	});

	it('should reject a page object ID with a dot segment', async () => {
		const executeFunctions = mockDeep<IExecuteFunctions>();
		const params: Record<string, string> = {
			authentication: 'oAuth2',
			resource: 'page',
			operation: 'get',
			presentationId: '1EAYk18WDjIG-zp_0vLm3CsfQh_i8eXc67Jo2O9C6Vuc',
			pageObjectId: 'p1/../p2?x=1',
		};
		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctions.getNodeParameter.mockImplementation((name: string) => params[name]);
		executeFunctions.helpers.returnJsonArray.mockReturnValue([]);
		executeFunctions.helpers.constructExecutionMetaData.mockReturnValue([]);
		executeFunctions.helpers.requestOAuth2.mockResolvedValue({});

		await expect(new GoogleSlides().execute.call(executeFunctions)).rejects.toThrow(
			'Invalid identifier',
		);
		expect(executeFunctions.helpers.requestOAuth2).not.toHaveBeenCalled();
	});
});

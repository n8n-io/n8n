import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { MicrosoftExcelV1 } from '../../v1/MicrosoftExcelV1.node';

describe('Microsoft Excel v1 - request URL encoding', () => {
	it('should encode a workbook ID with a slash as one path segment', async () => {
		const node = new MicrosoftExcelV1({
			displayName: 'Microsoft Excel',
			name: 'microsoftExcel',
			group: ['input'],
			description: 'Consume the Microsoft Excel API',
		});
		const context = mockDeep<ILoadOptionsFunctions>();
		context.getCurrentNodeParameter.mockReturnValue('01ABC/children');
		context.helpers.requestOAuth2.mockResolvedValue({ value: [] });

		await node.methods.loadOptions.getworksheets.call(context);

		expect(context.helpers.requestOAuth2).toHaveBeenCalledWith(
			'microsoftExcelOAuth2Api',
			expect.objectContaining({
				uri: requestUrl`https://graph.microsoft.com/v1.0/me/drive/items/01ABC%2Fchildren/workbook/worksheets`,
			}),
		);
	});
});

import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { IBinaryData, IExecuteSingleFunctions } from 'n8n-workflow';

import { downloadFilePostReceive } from '../../helpers/utils';

describe('Microsoft SharePoint Node', () => {
	let executeSingleFunctions: MockProxy<IExecuteSingleFunctions>;

	beforeEach(() => {
		executeSingleFunctions = mock<IExecuteSingleFunctions>();
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	it('should download file post receive', async () => {
		const mockResponse = {
			body: '',
			statusCode: 200,
			headers: {
				'content-disposition': "attachment; filename*=UTF-8''encoded%20name.pdf",
				'content-type': 'application/pdf',
			},
		};
		const mockPrepareBinaryData = jest.fn().mockReturnValueOnce({
			data: '',
			mimeType: 'application/pdf',
			fileName: 'encoded name.pdf',
		} as IBinaryData);
		executeSingleFunctions.helpers.prepareBinaryData = mockPrepareBinaryData;

		const result = await downloadFilePostReceive.call(executeSingleFunctions, [], mockResponse);

		expect(mockPrepareBinaryData).toHaveBeenCalledWith(
			mockResponse.body,
			'encoded name.pdf',
			'application/pdf',
		);
		expect(result).toEqual([
			{
				json: {},
				binary: {
					data: {
						data: '',
						mimeType: 'application/pdf',
						fileName: 'encoded name.pdf',
					},
				},
			},
		]);
	});
});

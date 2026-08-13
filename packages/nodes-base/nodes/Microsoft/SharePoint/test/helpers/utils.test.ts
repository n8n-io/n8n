import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';
import type { IBinaryData, IExecuteSingleFunctions } from 'n8n-workflow';

import { downloadFilePostReceive, escapeFilterValue } from '../../v1/helpers/utils';

describe('Microsoft SharePoint Node', () => {
	let executeSingleFunctions: MockProxy<IExecuteSingleFunctions>;

	beforeEach(() => {
		executeSingleFunctions = mock<IExecuteSingleFunctions>();
	});

	afterEach(() => {
		vi.resetAllMocks();
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
		const mockPrepareBinaryData = vi.fn().mockReturnValueOnce({
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

	describe('escapeFilterValue', () => {
		it('should escape single quotes', () => {
			expect(escapeFilterValue("hello' there ''")).toEqual("hello'' there ''''");
		});
		it('should not escape double quotes', () => {
			expect(escapeFilterValue('hello " there ""')).toEqual('hello " there ""');
		});
	});
});

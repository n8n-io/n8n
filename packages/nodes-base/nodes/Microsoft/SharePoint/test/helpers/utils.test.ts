import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { IBinaryData, IExecuteSingleFunctions, IHttpRequestOptions } from 'n8n-workflow';

import {
	downloadFilePostReceive,
	escapeFilterValue,
	itemColumnsPreSend,
} from '../../helpers/utils';
import { microsoftSharePointApiRequest } from '../../transport';

jest.mock('../../transport', () => ({
	microsoftSharePointApiRequest: jest.fn(),
}));

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

	describe('escapeFilterValue', () => {
		it('should escape single quotes', () => {
			expect(escapeFilterValue("hello' there ''")).toEqual("hello'' there ''''");
		});
		it('should not escape double quotes', () => {
			expect(escapeFilterValue('hello " there ""')).toEqual('hello " there ""');
		});
	});

	describe('itemColumnsPreSend', () => {
		const apiRequest = microsoftSharePointApiRequest as jest.Mock;

		it('should keep a quote in a matching value inside the OData literal', async () => {
			const params: Record<string, unknown> = {
				columns: {
					mappingMode: 'defineBelow',
					matchingColumns: ['Title'],
					value: { Title: "O'Brien" },
					schema: [],
				},
				operation: 'update',
				site: 'site1',
				list: 'list1',
			};
			executeSingleFunctions.getNodeParameter.mockImplementation(
				(name: string) => params[name] as never,
			);
			apiRequest.mockResolvedValueOnce({ value: [{ id: 'item1' }] });
			const requestOptions: IHttpRequestOptions = {
				method: 'PATCH',
				url: '/sites/site1/lists/list1/items',
			};

			await itemColumnsPreSend.call(executeSingleFunctions, requestOptions);

			expect(apiRequest).toHaveBeenCalledWith(
				'GET',
				'/sites/site1/lists/list1/items',
				{},
				{ $filter: "fields/Title eq 'O''Brien'" },
				{ Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly' },
			);
		});

		// The operations set `multiKeyMatch: false`, so the UI never sends a second
		// matching column. Call the hook directly to cover the join.
		it('should join two matching column clauses with a space', async () => {
			const params: Record<string, unknown> = {
				columns: {
					mappingMode: 'defineBelow',
					matchingColumns: ['Title', 'Status'],
					value: { Title: 'A', Status: 'B' },
					schema: [],
				},
				operation: 'update',
				site: 'site1',
				list: 'list1',
			};
			executeSingleFunctions.getNodeParameter.mockImplementation(
				(name: string) => params[name] as never,
			);
			apiRequest.mockResolvedValueOnce({ value: [{ id: 'item1' }] });
			const requestOptions: IHttpRequestOptions = {
				method: 'PATCH',
				url: '/sites/site1/lists/list1/items',
			};

			await itemColumnsPreSend.call(executeSingleFunctions, requestOptions);

			expect(apiRequest).toHaveBeenCalledWith(
				'GET',
				'/sites/site1/lists/list1/items',
				{},
				{ $filter: "fields/Title eq 'A' and fields/Status eq 'B'" },
				{ Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly' },
			);
		});
	});
});

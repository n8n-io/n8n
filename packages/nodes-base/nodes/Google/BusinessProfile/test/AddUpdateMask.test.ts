import type { IExecuteSingleFunctions, IHttpRequestOptions } from 'n8n-workflow';

import { addUpdateMaskPresend } from '../GenericFunctions';

describe('GenericFunctions - addUpdateMask', () => {
	const mockGetNodeParameter = jest.fn();

	const mockContext = {
		getNodeParameter: mockGetNodeParameter,
	} as unknown as IExecuteSingleFunctions;

	beforeEach(() => {
		mockGetNodeParameter.mockClear();
	});

	it('should add updateMask with mapped properties to the query string', async () => {
		mockGetNodeParameter.mockReturnValue({
			postType: 'postTypeValue',
			url: 'https://example.com',
			startDateTime: '2023-09-15T10:00:00.000Z',
			couponCode: 'DISCOUNT123',
		});

		const opts: Partial<IHttpRequestOptions> = {
			qs: {},
		};

		const result = await addUpdateMaskPresend.call(mockContext, opts as IHttpRequestOptions);

		expect(result.qs).toEqual({
			updateMask:
				'topicType,callToAction.url,event.schedule.startDate,event.schedule.startTime,offer.couponCode',
		});
	});

	it('should handle empty additionalOptions and not add updateMask', async () => {
		mockGetNodeParameter.mockReturnValue({});

		const opts: Partial<IHttpRequestOptions> = {
			qs: {},
		};

		const result = await addUpdateMaskPresend.call(mockContext, opts as IHttpRequestOptions);

		expect(result.qs).toEqual({});
	});

	it('should include unmapped properties in the updateMask', async () => {
		mockGetNodeParameter.mockReturnValue({
			postType: 'postTypeValue',
			unmappedProperty: 'someValue',
		});

		const opts: Partial<IHttpRequestOptions> = {
			qs: {},
		};

		const result = await addUpdateMaskPresend.call(mockContext, opts as IHttpRequestOptions);

		expect(result.qs).toEqual({
			updateMask: 'topicType,unmappedProperty',
		});
	});

	it('should merge updateMask with existing query string', async () => {
		mockGetNodeParameter.mockReturnValue({
			postType: 'postTypeValue',
			redeemOnlineUrl: 'https://google.example.com',
		});

		const opts: Partial<IHttpRequestOptions> = {
			qs: {
				existingQuery: 'existingValue',
			},
		};

		const result = await addUpdateMaskPresend.call(mockContext, opts as IHttpRequestOptions);

		expect(result.qs).toEqual({
			existingQuery: 'existingValue',
			updateMask: 'topicType,offer.redeemOnlineUrl',
		});
	});
});

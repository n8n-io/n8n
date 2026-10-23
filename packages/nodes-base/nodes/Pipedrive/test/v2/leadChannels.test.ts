import type { ILoadOptionsFunctions } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { getLeadChannels } from '../../v2/methods/loadOptions';
import { pipedriveApiRequestAllItemsOffset } from '../../v2/transport';

vi.mock('../../v2/transport', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../v2/transport')>()),
	pipedriveApiRequestAllItemsOffset: vi.fn(),
}));

const channelField = {
	key: 'channel',
	options: [
		{ id: 5, label: 'Webinar' },
		{ id: 2, label: 'Email Marketing' },
	],
};
const sortedOptions = [
	{ name: 'Email Marketing', value: 2 },
	{ name: 'Webinar', value: 5 },
];

describe('PipedriveV2 loadOptions => getLeadChannels', () => {
	const mockThis = {} as ILoadOptionsFunctions;
	const request = pipedriveApiRequestAllItemsOffset as Mock;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return the channel options of the lead fields, sorted by name', async () => {
		request.mockResolvedValueOnce({ data: [{ key: 'title' }, channelField] });

		const result = await getLeadChannels.call(mockThis);

		expect(request).toHaveBeenCalledTimes(1);
		expect(request).toHaveBeenCalledWith('GET', '/leadFields', {});
		expect(result).toEqual(sortedOptions);
	});

	it('should read the deal fields when the lead fields have no channel field', async () => {
		request
			.mockResolvedValueOnce({ data: [{ key: 'title' }] })
			.mockResolvedValueOnce({ data: [{ key: 'title' }, channelField] });

		const result = await getLeadChannels.call(mockThis);

		expect(request).toHaveBeenCalledTimes(2);
		expect(request).toHaveBeenNthCalledWith(1, 'GET', '/leadFields', {});
		expect(request).toHaveBeenNthCalledWith(2, 'GET', '/dealFields', {});
		expect(result).toEqual(sortedOptions);
	});

	it('should read the deal fields when the lead channel field has no options', async () => {
		request
			.mockResolvedValueOnce({ data: [{ key: 'channel', options: [] }] })
			.mockResolvedValueOnce({ data: [channelField] });

		const result = await getLeadChannels.call(mockThis);

		expect(request).toHaveBeenNthCalledWith(2, 'GET', '/dealFields', {});
		expect(result).toEqual(sortedOptions);
	});

	it('should return an empty list when no channel field has options', async () => {
		request
			.mockResolvedValueOnce({ data: [{ key: 'title' }] })
			.mockResolvedValueOnce({ data: [{ key: 'channel' }] });

		const result = await getLeadChannels.call(mockThis);

		expect(result).toEqual([]);
	});
});

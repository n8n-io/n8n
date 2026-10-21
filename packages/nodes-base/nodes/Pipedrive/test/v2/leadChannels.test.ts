import type { ILoadOptionsFunctions } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { getLeadChannels } from '../../v2/methods/loadOptions';
import { pipedriveApiRequest } from '../../v2/transport';

vi.mock('../../v2/transport', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../v2/transport')>()),
	pipedriveApiRequest: vi.fn(),
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

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return the channel options of the lead fields, sorted by name', async () => {
		(pipedriveApiRequest as Mock).mockResolvedValueOnce({
			data: [{ key: 'title' }, channelField],
		});

		const result = await getLeadChannels.call(mockThis);

		expect(pipedriveApiRequest).toHaveBeenCalledTimes(1);
		expect(pipedriveApiRequest).toHaveBeenCalledWith(
			'GET',
			'/leadFields',
			{},
			{},
			{ apiVersion: 'v1' },
		);
		expect(result).toEqual(sortedOptions);
	});

	it('should read the deal fields when the lead fields have no channel field', async () => {
		(pipedriveApiRequest as Mock)
			.mockResolvedValueOnce({ data: [{ key: 'title' }] })
			.mockResolvedValueOnce({ data: [{ key: 'title' }, channelField] });

		const result = await getLeadChannels.call(mockThis);

		expect(pipedriveApiRequest).toHaveBeenNthCalledWith(
			2,
			'GET',
			'/dealFields',
			{},
			{},
			{ apiVersion: 'v1' },
		);
		expect(result).toEqual(sortedOptions);
	});

	it('should return an empty list when no channel field has options', async () => {
		(pipedriveApiRequest as Mock)
			.mockResolvedValueOnce({ data: [{ key: 'title' }] })
			.mockResolvedValueOnce({ data: [{ key: 'channel' }] });

		const result = await getLeadChannels.call(mockThis);

		expect(result).toEqual([]);
	});
});

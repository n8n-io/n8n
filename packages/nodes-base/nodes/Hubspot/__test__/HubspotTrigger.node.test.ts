import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { getEntityProperties } from '../HubspotTrigger.node';
import { getAllProperties } from '../V1/GenericFunctions';

vi.mock('../V1/GenericFunctions', () => ({
	getAllProperties: vi.fn(),
	hubspotApiRequest: vi.fn(),
	propertyEvents: [],
}));

const mockedGetAllProperties = vi.mocked(getAllProperties);

describe('HubspotTrigger getEntityProperties', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('maps HubSpot properties into options', async () => {
		mockedGetAllProperties.mockResolvedValueOnce([
			{ label: 'Email', name: 'email' },
			{ label: 'First Name', name: 'firstname' },
		]);

		const context = {} as ILoadOptionsFunctions;
		const result = await getEntityProperties.call(context, 'contacts');

		expect(result).toEqual([
			{ name: 'Email', value: 'email' },
			{ name: 'First Name', value: 'firstname' },
		]);
		expect(mockedGetAllProperties).toHaveBeenCalledWith('contacts');
		expect(mockedGetAllProperties.mock.contexts[0]).toBe(context);
	});

	it('filters invalid property entries', async () => {
		mockedGetAllProperties.mockResolvedValueOnce([
			{ label: 'Valid', name: 'valid_name' },
			{ label: 'Missing Name' },
			{ name: 'missing_label' },
			{ label: 123, name: 'bad_label_type' },
		] as never);

		const result = await getEntityProperties.call({} as ILoadOptionsFunctions, 'contacts');

		expect(result).toEqual([{ name: 'Valid', value: 'valid_name' }]);
	});
});

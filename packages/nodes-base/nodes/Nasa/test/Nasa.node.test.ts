import { constructExecutionMetaData, returnJsonArray } from 'n8n-core';
import type {
	IBinaryData,
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	NodeParameterValueType,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { nasaApiRequest, nasaApiRequestAllItems } from '../GenericFunctions';
import { Nasa } from '../Nasa.node';

vi.mock('../GenericFunctions', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../GenericFunctions')>();
	return { ...actual, nasaApiRequest: vi.fn(), nasaApiRequestAllItems: vi.fn() };
});

const NOW = new Date('2024-05-20T12:00:00.000Z');
const TODAY = '2024-05-20';
const THIRTY_DAYS_AGO = '2024-04-20';
const ASTEROID_ID = '3542519';
const DONKI_BASE_URL = 'https://ccmc.gsfc.nasa.gov';
const RANGE_START_ISO = '2024-05-01T00:00:00.000Z';
const RANGE_END_ISO = '2024-05-10T00:00:00.000Z';
const RANGE_START = '2024-05-01';
const RANGE_END = '2024-05-10';

const node: INode = {
	id: '1',
	name: 'NASA',
	type: 'n8n-nodes-base.nasa',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const preparedBinary: IBinaryData = {
	data: 'aW1hZ2U=',
	mimeType: 'image/jpeg',
	fileName: 'apod.jpg',
};

type ParameterValue = NodeParameterValueType | ((itemIndex: number) => NodeParameterValueType);

function createContext({
	items = [{ json: {} }],
	parameters,
	continueOnFail = false,
}: {
	items?: INodeExecutionData[];
	parameters: Record<string, ParameterValue>;
	continueOnFail?: boolean;
}) {
	const context = mockDeep<IExecuteFunctions>();

	context.getInputData.mockReturnValue(items);
	context.getNode.mockReturnValue(node);
	context.continueOnFail.mockReturnValue(continueOnFail);
	context.helpers.returnJsonArray.mockImplementation(returnJsonArray);
	context.helpers.constructExecutionMetaData.mockImplementation(constructExecutionMetaData);
	context.helpers.prepareBinaryData.mockResolvedValue(preparedBinary);

	// Mirrors core: a parameter that is not set throws unless a fallback is given.
	context.getNodeParameter.mockImplementation(((
		name: string,
		itemIndex = 0,
		fallbackValue?: unknown,
	) => {
		const value = parameters[name];
		if (value !== undefined) {
			return typeof value === 'function' ? value(itemIndex) : value;
		}
		if (fallbackValue !== undefined) return fallbackValue;
		throw new Error(`Could not get parameter: ${name}`);
	}) as IExecuteFunctions['getNodeParameter']);

	return context;
}

describe('NASA', () => {
	beforeEach(() => {
		vi.useFakeTimers({ now: NOW });
		vi.mocked(nasaApiRequest).mockReset();
		vi.mocked(nasaApiRequestAllItems).mockReset();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	describe('description', () => {
		it('declares the NASA node metadata and credentials', () => {
			const { description } = new Nasa();

			expect(description.displayName).toBe('NASA');
			expect(description.name).toBe('nasa');
			expect(description.version).toBe(1);
			expect(description.credentials).toEqual([{ name: 'nasaApi', required: true }]);
		});
	});

	describe('astronomy picture of the day', () => {
		const apodResponse = {
			date: '2024-01-15',
			title: 'A picture',
			media_type: 'image',
			url: 'https://example.com/apod.jpg',
			hdurl: 'https://example.com/hd/apod.jpg',
		};

		it('sends the date from the additional fields', async () => {
			vi.mocked(nasaApiRequest).mockResolvedValue(apodResponse);
			const context = createContext({
				parameters: {
					resource: 'astronomyPictureOfTheDay',
					operation: 'get',
					additionalFields: { date: '2024-01-15T10:30:00.000Z' },
					download: false,
				},
			});

			const [result] = await new Nasa().execute.call(context);

			expect(nasaApiRequest).toHaveBeenCalledWith(
				'GET',
				'/planetary/apod',
				{ date: '2024-01-15' },
				undefined,
				undefined,
			);
			expect(result).toEqual([{ json: apodResponse, pairedItem: { item: 0 } }]);
		});

		it('defaults the date to today when no date is set', async () => {
			vi.mocked(nasaApiRequest).mockResolvedValue(apodResponse);
			const context = createContext({
				parameters: {
					resource: 'astronomyPictureOfTheDay',
					operation: 'get',
					additionalFields: {},
					download: false,
				},
			});

			await new Nasa().execute.call(context);

			expect(nasaApiRequest).toHaveBeenCalledWith(
				'GET',
				'/planetary/apod',
				{ date: TODAY },
				undefined,
				undefined,
			);
		});

		it('downloads the HD image into the binary property', async () => {
			const imageBuffer = Buffer.from('image-bytes');
			vi.mocked(nasaApiRequest)
				.mockResolvedValueOnce(apodResponse)
				.mockResolvedValueOnce(imageBuffer);
			const context = createContext({
				items: [{ json: { input: 'value' } }],
				parameters: {
					resource: 'astronomyPictureOfTheDay',
					operation: 'get',
					additionalFields: { date: '2024-01-15T10:30:00.000Z' },
					download: true,
					binaryPropertyName: 'data',
				},
			});

			const [result] = await new Nasa().execute.call(context);

			expect(nasaApiRequest).toHaveBeenNthCalledWith(
				2,
				'GET',
				'/planetary/apod',
				{ date: '2024-01-15' },
				{ encoding: null },
				'https://example.com/hd/apod.jpg',
			);
			expect(context.helpers.prepareBinaryData).toHaveBeenCalledWith(imageBuffer, 'apod.jpg');
			expect(result).toEqual([
				{
					json: { input: 'value', ...apodResponse },
					binary: { data: preparedBinary },
				},
			]);
		});

		it('keeps existing binary data when downloading the HD image', async () => {
			const imageBuffer = Buffer.from('image-bytes');
			const existingBinary: IBinaryData = { data: 'eA==', mimeType: 'text/plain' };
			vi.mocked(nasaApiRequest)
				.mockResolvedValueOnce(apodResponse)
				.mockResolvedValueOnce(imageBuffer);
			const context = createContext({
				items: [{ json: { input: 'value' }, binary: { existing: existingBinary } }],
				parameters: {
					resource: 'astronomyPictureOfTheDay',
					operation: 'get',
					additionalFields: {},
					download: true,
					binaryPropertyName: 'data',
				},
			});

			const [result] = await new Nasa().execute.call(context);

			expect(result).toEqual([
				{
					json: { input: 'value', ...apodResponse },
					binary: { existing: existingBinary, data: preparedBinary },
				},
			]);
		});

		it('does not download non-image media', async () => {
			const videoResponse = { ...apodResponse, media_type: 'video', hdurl: undefined };
			vi.mocked(nasaApiRequest).mockResolvedValue(videoResponse);
			const context = createContext({
				parameters: {
					resource: 'astronomyPictureOfTheDay',
					operation: 'get',
					additionalFields: {},
					download: true,
					binaryPropertyName: 'data',
				},
			});

			const [result] = await new Nasa().execute.call(context);

			expect(nasaApiRequest).toHaveBeenCalledTimes(1);
			expect(context.helpers.prepareBinaryData).not.toHaveBeenCalled();
			expect(result).toEqual([{ json: videoResponse, pairedItem: { item: 0 } }]);
		});

		it('emits an error item when an image has no HD URL and continueOnFail is set', async () => {
			vi.mocked(nasaApiRequest)
				.mockResolvedValueOnce({ ...apodResponse, hdurl: undefined })
				.mockResolvedValueOnce(Buffer.from('image-bytes'));
			const context = createContext({
				parameters: {
					resource: 'astronomyPictureOfTheDay',
					operation: 'get',
					additionalFields: {},
					download: true,
					binaryPropertyName: 'data',
				},
				continueOnFail: true,
			});

			const [result] = await new Nasa().execute.call(context);

			expect(result).toEqual([{ json: { error: expect.any(String) } }]);
		});

		it('returns the input item with an error when the download fails and continueOnFail is set', async () => {
			vi.mocked(nasaApiRequest)
				.mockResolvedValueOnce(apodResponse)
				.mockResolvedValueOnce(Buffer.from('image-bytes'));
			const context = createContext({
				parameters: {
					resource: 'astronomyPictureOfTheDay',
					operation: 'get',
					additionalFields: {},
					download: true,
					binaryPropertyName: 'data',
				},
				continueOnFail: true,
			});
			context.helpers.prepareBinaryData.mockRejectedValue(new Error('binary failed'));

			const [result] = await new Nasa().execute.call(context);

			expect(result).toEqual([{ json: { error: 'binary failed' }, binary: {} }]);
		});

		it('emits an error item when the metadata request fails and continueOnFail is set', async () => {
			vi.mocked(nasaApiRequest).mockRejectedValue(new Error('API down'));
			const context = createContext({
				parameters: {
					resource: 'astronomyPictureOfTheDay',
					operation: 'get',
					additionalFields: {},
					download: true,
					binaryPropertyName: 'data',
				},
				continueOnFail: true,
			});

			const [result] = await new Nasa().execute.call(context);

			expect(result).toEqual([{ json: { error: 'API down' }, pairedItem: { item: 0 } }]);
		});
	});

	describe('asteroid neo feed', () => {
		it('returns the asteroids of the first date in the feed', async () => {
			vi.mocked(nasaApiRequest).mockResolvedValue({
				near_earth_objects: {
					'2024-05-01': [
						{ id: '1', name: 'A' },
						{ id: '2', name: 'B' },
					],
					'2024-05-02': [{ id: '3', name: 'C' }],
				},
			});
			const context = createContext({
				parameters: {
					resource: 'asteroidNeoFeed',
					operation: 'get',
					additionalFields: {
						startDate: '2024-05-01T00:00:00.000Z',
						endDate: '2024-05-03T00:00:00.000Z',
					},
				},
			});

			const [result] = await new Nasa().execute.call(context);

			expect(nasaApiRequest).toHaveBeenCalledWith(
				'GET',
				'/neo/rest/v1/feed',
				{ start_date: '2024-05-01', end_date: '2024-05-03' },
				undefined,
				undefined,
			);
			expect(result).toEqual([
				{ json: { id: '1', name: 'A' }, pairedItem: { item: 0 } },
				{ json: { id: '2', name: 'B' }, pairedItem: { item: 0 } },
			]);
		});

		it('defaults the range to the current date', async () => {
			vi.mocked(nasaApiRequest).mockResolvedValue({ near_earth_objects: { [TODAY]: [] } });
			const context = createContext({
				parameters: {
					resource: 'asteroidNeoFeed',
					operation: 'get',
					additionalFields: {},
				},
			});

			await new Nasa().execute.call(context);

			expect(nasaApiRequest).toHaveBeenCalledWith(
				'GET',
				'/neo/rest/v1/feed',
				{ start_date: TODAY, end_date: TODAY },
				undefined,
				undefined,
			);
		});

		it('returns a single empty entry when the feed has no dates', async () => {
			vi.mocked(nasaApiRequest).mockResolvedValue({ near_earth_objects: {} });
			const context = createContext({
				parameters: {
					resource: 'asteroidNeoFeed',
					operation: 'get',
					additionalFields: { startDate: RANGE_START_ISO, endDate: RANGE_END_ISO },
				},
			});

			const [result] = await new Nasa().execute.call(context);

			expect(result).toStrictEqual([{ json: undefined, pairedItem: { item: 0 } }]);
		});
	});

	describe('asteroid neo lookup', () => {
		const createLookupResponse = () => ({
			id: ASTEROID_ID,
			name: 'Asteroid',
			close_approach_data: [{ close_approach_date: '2024-05-01' }],
		});

		it('keeps close approach data when requested', async () => {
			const response = createLookupResponse();
			vi.mocked(nasaApiRequest).mockResolvedValue(response);
			const context = createContext({
				parameters: {
					resource: 'asteroidNeoLookup',
					operation: 'get',
					asteroidId: ASTEROID_ID,
					additionalFields: { includeCloseApproachData: true },
				},
			});

			const [result] = await new Nasa().execute.call(context);

			expect(nasaApiRequest).toHaveBeenCalledWith(
				'GET',
				`/neo/rest/v1/neo/${ASTEROID_ID}`,
				{},
				undefined,
				undefined,
			);
			expect(result[0].json).toEqual(response);
		});

		it('removes close approach data by default', async () => {
			vi.mocked(nasaApiRequest).mockResolvedValue(createLookupResponse());
			const context = createContext({
				parameters: {
					resource: 'asteroidNeoLookup',
					operation: 'get',
					asteroidId: ASTEROID_ID,
					additionalFields: {},
				},
			});

			const [result] = await new Nasa().execute.call(context);

			expect(result[0].json).toEqual({ id: ASTEROID_ID, name: 'Asteroid' });
			expect(result[0].json).not.toHaveProperty('close_approach_data');
		});

		it('rejects an unknown operation', async () => {
			const context = createContext({
				parameters: {
					resource: 'asteroidNeoLookup',
					operation: 'getAll',
					asteroidId: ASTEROID_ID,
					additionalFields: {},
				},
			});

			const execution = new Nasa().execute.call(context);

			await expect(execution).rejects.toBeInstanceOf(NodeOperationError);
			await expect(execution).rejects.toThrow("The operation 'getAll' is unknown!");
			expect(nasaApiRequest).not.toHaveBeenCalled();
		});
	});

	describe('asteroid neo browse', () => {
		it('limits the number of results when returnAll is disabled', async () => {
			vi.mocked(nasaApiRequest).mockResolvedValue({
				near_earth_objects: [{ id: '1' }, { id: '2' }],
			});
			const context = createContext({
				parameters: {
					resource: 'asteroidNeoBrowse',
					operation: 'getAll',
					returnAll: false,
					limit: 5,
				},
			});

			const [result] = await new Nasa().execute.call(context);

			expect(nasaApiRequest).toHaveBeenCalledWith(
				'GET',
				'/neo/rest/v1/neo/browse',
				{ size: 5 },
				undefined,
				undefined,
			);
			expect(result).toEqual([
				{ json: { id: '1' }, pairedItem: { item: 0 } },
				{ json: { id: '2' }, pairedItem: { item: 0 } },
			]);
		});

		it('fetches every page when returnAll is enabled', async () => {
			vi.mocked(nasaApiRequestAllItems).mockResolvedValue([{ id: '1' }]);
			const context = createContext({
				parameters: {
					resource: 'asteroidNeoBrowse',
					operation: 'getAll',
					returnAll: true,
				},
			});

			const [result] = await new Nasa().execute.call(context);

			expect(nasaApiRequestAllItems).toHaveBeenCalledWith(
				'near_earth_objects',
				'GET',
				'/neo/rest/v1/neo/browse',
				{},
			);
			expect(nasaApiRequest).not.toHaveBeenCalled();
			expect(result).toEqual([{ json: { id: '1' }, pairedItem: { item: 0 } }]);
		});

		it('rejects an unknown operation', async () => {
			const context = createContext({
				parameters: {
					resource: 'asteroidNeoBrowse',
					operation: 'get',
				},
			});

			await expect(new Nasa().execute.call(context)).rejects.toThrow(
				"The operation 'get' is unknown!",
			);
		});
	});

	describe('DONKI resources', () => {
		const donkiResources: Array<[string, string, IDataObject]> = [
			['donkiCoronalMassEjection', '/DONKI-API/get/CME', {}],
			['donkiInterplanetaryShock', '/DONKI-API/get/IPS', { location: 'ALL', catalog: 'ALL' }],
			['donkiSolarFlare', '/DONKI-API/get/FLR', {}],
			['donkiSolarEnergeticParticle', '/DONKI-API/get/SEP', {}],
			['donkiMagnetopauseCrossing', '/DONKI-API/get/MPC', {}],
			['donkiRadiationBeltEnhancement', '/DONKI-API/get/RBE', {}],
			['donkiHighSpeedStream', '/DONKI-API/get/HSS', {}],
			['donkiWsaEnlilSimulation', '/DONKI-API/get/WSAEnlilSimulations', {}],
			['donkiNotifications', '/DONKI-API/get/notifications', { type: 'all' }],
		];

		it.each(donkiResources)('requests %s from the DONKI API', async (resource, path, extraQs) => {
			vi.mocked(nasaApiRequest).mockResolvedValue([{ id: 'event-1' }]);
			const context = createContext({
				parameters: {
					resource,
					operation: 'get',
					additionalFields: {
						startDate: RANGE_START_ISO,
						endDate: RANGE_END_ISO,
					},
				},
			});

			const [result] = await new Nasa().execute.call(context);

			expect(nasaApiRequest).toHaveBeenCalledWith(
				'GET',
				'',
				{ startDate: RANGE_START, endDate: RANGE_END, ...extraQs },
				undefined,
				`${DONKI_BASE_URL}${path}`,
			);
			expect(result).toEqual([{ json: { id: 'event-1' }, pairedItem: { item: 0 } }]);
		});

		it('defaults the date range to the last 30 days', async () => {
			vi.mocked(nasaApiRequest).mockResolvedValue([]);
			const context = createContext({
				parameters: {
					resource: 'donkiSolarFlare',
					operation: 'get',
					additionalFields: {},
				},
			});

			await new Nasa().execute.call(context);

			expect(nasaApiRequest).toHaveBeenCalledWith(
				'GET',
				'',
				{ startDate: THIRTY_DAYS_AGO, endDate: TODAY },
				undefined,
				`${DONKI_BASE_URL}/DONKI-API/get/FLR`,
			);
		});

		it('passes the location and catalog for interplanetary shocks', async () => {
			vi.mocked(nasaApiRequest).mockResolvedValue([]);
			const context = createContext({
				parameters: {
					resource: 'donkiInterplanetaryShock',
					operation: 'get',
					additionalFields: { location: 'earth', catalog: 'SWRC_CATALOG' },
				},
			});

			await new Nasa().execute.call(context);

			expect(nasaApiRequest).toHaveBeenCalledWith(
				'GET',
				'',
				{
					startDate: THIRTY_DAYS_AGO,
					endDate: TODAY,
					location: 'earth',
					catalog: 'SWRC_CATALOG',
				},
				undefined,
				`${DONKI_BASE_URL}/DONKI-API/get/IPS`,
			);
		});

		it('passes the notification type', async () => {
			vi.mocked(nasaApiRequest).mockResolvedValue([]);
			const context = createContext({
				parameters: {
					resource: 'donkiNotifications',
					operation: 'get',
					additionalFields: { type: 'FLR' },
				},
			});

			await new Nasa().execute.call(context);

			expect(nasaApiRequest).toHaveBeenCalledWith(
				'GET',
				'',
				{ startDate: THIRTY_DAYS_AGO, endDate: TODAY, type: 'FLR' },
				undefined,
				`${DONKI_BASE_URL}/DONKI-API/get/notifications`,
			);
		});
	});

	describe('earth imagery', () => {
		const existingBinary: IBinaryData = { data: 'eA==', mimeType: 'text/plain' };

		it('downloads the image and keeps existing binary data', async () => {
			const imageBuffer = Buffer.from('earth-bytes');
			vi.mocked(nasaApiRequest)
				.mockResolvedValueOnce({ id: 'image-1' })
				.mockResolvedValueOnce(imageBuffer);
			const context = createContext({
				items: [{ json: { input: 'value' }, binary: { existing: existingBinary } }],
				parameters: {
					resource: 'earthImagery',
					operation: 'get',
					lat: 47.751076,
					lon: -120.740135,
					additionalFields: {},
					binaryPropertyName: 'data',
				},
			});

			const [result] = await new Nasa().execute.call(context);

			const expectedQs = {
				lat: 47.751076,
				lon: -120.740135,
				dim: 0.025,
				date: TODAY,
			};
			expect(nasaApiRequest).toHaveBeenNthCalledWith(
				1,
				'GET',
				'/planetary/earth/imagery',
				expectedQs,
				undefined,
				undefined,
			);
			expect(nasaApiRequest).toHaveBeenNthCalledWith(
				2,
				'GET',
				'/planetary/earth/imagery',
				expectedQs,
				{ encoding: null },
			);
			expect(context.helpers.prepareBinaryData).toHaveBeenCalledWith(imageBuffer);
			expect(result).toEqual([
				{
					json: { input: 'value' },
					binary: { existing: existingBinary, data: preparedBinary },
				},
			]);
		});

		it('uses the date and dimensions from the additional fields', async () => {
			vi.mocked(nasaApiRequest)
				.mockResolvedValueOnce({ id: 'image-1' })
				.mockResolvedValueOnce(Buffer.from('earth-bytes'));
			const context = createContext({
				parameters: {
					resource: 'earthImagery',
					operation: 'get',
					lat: 1,
					lon: 2,
					additionalFields: { dim: 0.1, date: '2024-03-01T00:00:00.000Z' },
					binaryPropertyName: 'data',
				},
			});

			await new Nasa().execute.call(context);

			expect(nasaApiRequest).toHaveBeenNthCalledWith(
				1,
				'GET',
				'/planetary/earth/imagery',
				{ lat: 1, lon: 2, dim: 0.1, date: '2024-03-01' },
				undefined,
				undefined,
			);
		});

		it('returns the input item with an error when the request fails and continueOnFail is set', async () => {
			vi.mocked(nasaApiRequest).mockRejectedValue(new Error('API down'));
			const context = createContext({
				items: [{ json: { input: 'value' } }],
				parameters: {
					resource: 'earthImagery',
					operation: 'get',
					lat: 1,
					lon: 2,
					additionalFields: {},
					binaryPropertyName: 'data',
				},
				continueOnFail: true,
			});

			const [result] = await new Nasa().execute.call(context);

			expect(result).toEqual([{ json: { error: 'API down' } }]);
		});
	});

	describe('earth assets', () => {
		it('returns the assets for the coordinates', async () => {
			vi.mocked(nasaApiRequest).mockResolvedValue({ id: 'asset-1', date: '2024-05-01' });
			const context = createContext({
				parameters: {
					resource: 'earthAssets',
					operation: 'get',
					lat: 47.751076,
					lon: -120.740135,
					additionalFields: {},
				},
			});

			const [result] = await new Nasa().execute.call(context);

			expect(nasaApiRequest).toHaveBeenCalledWith(
				'GET',
				'/planetary/earth/assets',
				{ lat: 47.751076, lon: -120.740135, dim: 0.025 },
				undefined,
				undefined,
			);
			expect(result).toEqual([
				{ json: { id: 'asset-1', date: '2024-05-01' }, pairedItem: { item: 0 } },
			]);
		});

		it('adds the date when one is set', async () => {
			vi.mocked(nasaApiRequest).mockResolvedValue({ id: 'asset-1' });
			const context = createContext({
				parameters: {
					resource: 'earthAssets',
					operation: 'get',
					lat: 1,
					lon: 2,
					additionalFields: { date: '2024-03-01T00:00:00.000Z' },
				},
			});

			await new Nasa().execute.call(context);

			expect(nasaApiRequest).toHaveBeenCalledWith(
				'GET',
				'/planetary/earth/assets',
				{ lat: 1, lon: 2, dim: 0.025, date: '2024-03-01' },
				undefined,
				undefined,
			);
		});

		it('emits an error item when the request fails and continueOnFail is set', async () => {
			vi.mocked(nasaApiRequest).mockRejectedValue(new Error('API down'));
			const context = createContext({
				parameters: {
					resource: 'earthAssets',
					operation: 'get',
					lat: 1,
					lon: 2,
					additionalFields: {},
				},
				continueOnFail: true,
			});

			const [result] = await new Nasa().execute.call(context);

			expect(result).toEqual([{ json: { error: 'API down' }, pairedItem: { item: 0 } }]);
		});
	});

	describe('error handling', () => {
		it('rethrows API errors when continueOnFail is disabled', async () => {
			vi.mocked(nasaApiRequest).mockRejectedValue(new Error('API down'));
			const context = createContext({
				parameters: {
					resource: 'asteroidNeoLookup',
					operation: 'get',
					asteroidId: ASTEROID_ID,
					additionalFields: {},
				},
			});

			await expect(new Nasa().execute.call(context)).rejects.toThrow('API down');
		});

		it('emits one error item per input item when continueOnFail is enabled', async () => {
			vi.mocked(nasaApiRequest).mockRejectedValue(new Error('API down'));
			const context = createContext({
				items: [{ json: {} }, { json: {} }],
				parameters: {
					resource: 'asteroidNeoLookup',
					operation: 'get',
					asteroidId: ASTEROID_ID,
					additionalFields: {},
				},
				continueOnFail: true,
			});

			const [result] = await new Nasa().execute.call(context);

			expect(result).toEqual([
				{ json: { error: 'API down' }, pairedItem: { item: 0 } },
				{ json: { error: 'API down' }, pairedItem: { item: 1 } },
			]);
		});
	});

	describe('multiple items', () => {
		it('pairs every result with its input item', async () => {
			vi.mocked(nasaApiRequest)
				.mockResolvedValueOnce({ id: 'first', close_approach_data: [] })
				.mockResolvedValueOnce({ id: 'second', close_approach_data: [] });
			const context = createContext({
				items: [{ json: {} }, { json: {} }],
				parameters: {
					resource: 'asteroidNeoLookup',
					operation: 'get',
					asteroidId: (itemIndex) => (itemIndex === 0 ? 'first' : 'second'),
					additionalFields: {},
				},
			});

			const [result] = await new Nasa().execute.call(context);

			expect(result).toEqual([
				{ json: { id: 'first' }, pairedItem: { item: 0 } },
				{ json: { id: 'second' }, pairedItem: { item: 1 } },
			]);
		});
	});

	describe('edge cases', () => {
		it('returns an empty result when there are no input items', async () => {
			const context = createContext({
				items: [],
				parameters: {
					resource: 'astronomyPictureOfTheDay',
					operation: 'get',
					additionalFields: {},
				},
			});

			await expect(new Nasa().execute.call(context)).resolves.toEqual([[]]);
			expect(nasaApiRequest).not.toHaveBeenCalled();
		});

		it('requests the default base URL for an unsupported resource', async () => {
			vi.mocked(nasaApiRequest).mockResolvedValue({ id: 'response-1' });
			const context = createContext({
				parameters: {
					resource: 'unsupportedResource',
					operation: 'get',
				},
			});

			const [result] = await new Nasa().execute.call(context);

			expect(nasaApiRequest).toHaveBeenCalledWith('GET', '', {}, undefined, undefined);
			expect(result).toEqual([{ json: { id: 'response-1' }, pairedItem: { item: 0 } }]);
		});
	});
});

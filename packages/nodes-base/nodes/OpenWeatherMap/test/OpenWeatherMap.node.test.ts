import { mockDeep } from 'vitest-mock-extended';
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import { OpenWeatherMap } from '../OpenWeatherMap.node';
import { currentWeatherResponse } from './apiResponses';

describe('OpenWeatherMap Node - request building', () => {
	const setup = (
		typeVersion: number,
		credentials: IDataObject,
		params: IDataObject = { operation: 'currentWeather' },
	) => {
		const ctx = mockDeep<IExecuteFunctions>();
		const allParams: IDataObject = {
			format: 'metric',
			locationSelection: 'cityName',
			cityName: 'berlin,de',
			language: 'en',
			...params,
		};

		ctx.getInputData.mockReturnValue([{ json: {} }]);
		ctx.continueOnFail.mockReturnValue(false);
		ctx.getNode.mockReturnValue({
			id: 'owm-node',
			name: 'OpenWeatherMap',
			type: 'n8n-nodes-base.openWeatherMap',
			typeVersion,
			position: [0, 0],
			parameters: {},
		});
		ctx.getCredentials.mockResolvedValue(credentials);
		ctx.getNodeParameter.mockImplementation((name: string) => allParams[name] as never);
		ctx.helpers.returnJsonArray.mockImplementation((data) =>
			(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
		);
		ctx.helpers.constructExecutionMetaData.mockImplementation((data, { itemData }) =>
			data.map((item) => ({ ...item, pairedItem: itemData })),
		);
		ctx.helpers.request.mockResolvedValue(currentWeatherResponse);
		ctx.helpers.httpRequestWithAuthentication.mockResolvedValue(currentWeatherResponse);

		return ctx;
	};

	it.each([1, 1.1])(
		'should use the credential base URL and authentication in v%s',
		async (typeVersion) => {
			const ctx = setup(typeVersion, {
				accessToken: 'test-key',
				url: 'https://gateway.example.com/v1/gateway/openweathermap/',
			});

			const result = await new OpenWeatherMap().execute.call(ctx);

			expect(ctx.helpers.request).not.toHaveBeenCalled();
			expect(ctx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith('openWeatherMapApi', {
				method: 'GET',
				qs: { units: 'metric', q: 'berlin,de', lang: 'en' },
				url: 'https://gateway.example.com/v1/gateway/openweathermap/data/2.5/weather',
				json: true,
			});
			expect(result).toEqual([[{ json: currentWeatherResponse, pairedItem: { item: 0 } }]]);
		},
	);

	it.each([undefined, '', '  '])(
		'should fall back to the public API host when the base URL is %j',
		async (url) => {
			const ctx = setup(1.1, { accessToken: 'test-key', url }, { operation: '5DayForecast' });

			await new OpenWeatherMap().execute.call(ctx);

			expect(ctx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'openWeatherMapApi',
				expect.objectContaining({
					url: 'https://api.openweathermap.org/data/2.5/forecast',
				}),
			);
		},
	);
});

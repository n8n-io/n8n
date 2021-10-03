import {
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import { OptionsWithUri } from 'request';

export class OpenWeatherMap implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'OpenWeatherMap',
		name: 'openWeatherMap',
		icon: 'fa:sun',
		group: ['input'],
		version: 1,
		description: 'Gets current and future weather information',
		defaults: {
			name: 'OpenWeatherMap',
			color: '#554455',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'openWeatherMapApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Current Weather',
						value: 'currentWeather',
						description: 'Returns the current weather data',
					},
					{
						name: '5 day Forecast',
						value: '5DayForecast',
						description: 'Returns the weather data for the next 5 days',
					},
				],
				default: 'currentWeather',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Format',
				name: 'format',
				type: 'options',
				options: [
					{
						name: 'Imperial',
						value: 'imperial',
						description: 'Fahrenheit | miles/hour',
					},
					{
						name: 'Metric',
						value: 'metric',
						description: 'Celsius | meter/sec',
					},
					{
						name: 'Scientific',
						value: 'standard',
						description: 'Kelvin | meter/sec',
					},
				],
				default: 'metric',
				description: 'The format in which format the data should be returned.',
			},

			// ----------------------------------
			//         Location Information
			// ----------------------------------
			{
				displayName: 'Location Selection',
				name: 'locationSelection',
				type: 'options',
				options: [
					{
						name: 'City Name',
						value: 'cityName',
					},
					{
						name: 'City ID',
						value: 'cityId',
					},
					{
						name: 'Coordinates',
						value: 'coordinates',
					},
					{
						name: 'Zip Code',
						value: 'zipCode',
					},
				],
				default: 'cityName',
				description: 'How to define the location for which to return the weather.',
			},

			{
				displayName: 'City',
				name: 'cityName',
				type: 'string',
				default: '',
				placeholder: 'berlin,de',
				required: true,
				displayOptions: {
					show: {
						locationSelection: [
							'cityName',
						],
					},
				},
				description: 'The name of the city to return the weather of.',
			},

			{
				displayName: 'City ID',
				name: 'cityId',
				type: 'number',
				default: 160001123,
				required: true,
				displayOptions: {
					show: {
						locationSelection: [
							'cityId',
						],
					},
				},
				description: 'The id of city to return the weather of. List can be downloaded here: http://bulk.openweathermap.org/sample/',
			},

			{
				displayName: 'Latitude',
				name: 'latitude',
				type: 'string',
				default: '',
				placeholder: '13.39',
				required: true,
				displayOptions: {
					show: {
						locationSelection: [
							'coordinates',
						],
					},
				},
				description: 'The latitude of the location to return the weather of.',
			},

			{
				displayName: 'Longitude',
				name: 'longitude',
				type: 'string',
				default: '',
				placeholder: '52.52',
				required: true,
				displayOptions: {
					show: {
						locationSelection: [
							'coordinates',
						],
					},
				},
				description: 'The longitude of the location to return the weather of.',
			},

			{
				displayName: 'Zip Code',
				name: 'zipCode',
				type: 'string',
				default: '',
				placeholder: '10115,de',
				required: true,
				displayOptions: {
					show: {
						locationSelection: [
							'zipCode',
						],
					},
				},
				description: 'The id of city to return the weather of. List can be downloaded here: http://bulk.openweathermap.org/sample/',
			},

			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				placeholder: 'en',
				required: false,
				description: 'The two letter language code to get your output in (eg. en, de, ...).',
			},

		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const credentials = await this.getCredentials('openWeatherMapApi');

		if (credentials === undefined) {
			throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
		}

		const operation = this.getNodeParameter('operation', 0) as string;

		let endpoint = '';
		let locationSelection;
		let language;

		let qs: IDataObject;

		for (let i = 0; i < items.length; i++) {

			try {

				// Set base data
				qs = {
					APPID: credentials.accessToken,
					units: this.getNodeParameter('format', i) as string,
				};

				// Get the location
				locationSelection = this.getNodeParameter('locationSelection', i) as string;
				if (locationSelection === 'cityName') {
					qs.q = this.getNodeParameter('cityName', i) as string;
				} else if (locationSelection === 'cityId') {
					qs.id = this.getNodeParameter('cityId', i) as number;
				} else if (locationSelection === 'coordinates') {
					qs.lat = this.getNodeParameter('latitude', i) as string;
					qs.lon = this.getNodeParameter('longitude', i) as string;
				} else if (locationSelection === 'zipCode') {
					qs.zip = this.getNodeParameter('zipCode', i) as string;
				} else {
					throw new NodeOperationError(this.getNode(), `The locationSelection "${locationSelection}" is not known!`);
				}

				// Get the language
				language = this.getNodeParameter('language', i) as string;
				if (language) {
					qs.lang = language;
				}

				if (operation === 'currentWeather') {
					// ----------------------------------
					//         currentWeather
					// ----------------------------------

					endpoint = 'weather';
				} else if (operation === '5DayForecast') {
					// ----------------------------------
					//         5DayForecast
					// ----------------------------------

					endpoint = 'forecast';
				} else {
					throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`);
				}

				const options: OptionsWithUri = {
					method: 'GET',
					qs,
					uri: `https://api.openweathermap.org/data/2.5/${endpoint}`,
					json: true,
				};

				let responseData;
				try {
					responseData = await this.helpers.request(options);
				} catch (error) {
					throw new NodeApiError(this.getNode(), error);
				}


				returnData.push(responseData as IDataObject);

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({json:{ error: error.message }});
					continue;
				}
				throw error;
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}

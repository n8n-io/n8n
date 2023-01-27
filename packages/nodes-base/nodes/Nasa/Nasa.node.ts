import type { IExecuteFunctions } from 'n8n-core';

import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { nasaApiRequest, nasaApiRequestAllItems } from './GenericFunctions';

import moment from 'moment';

export class Nasa implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'NASA',
		name: 'nasa',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:nasa.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ":" + $parameter["resource"]}}',
		description: 'Retrieve data from the NASA API',
		defaults: {
			name: 'NASA',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'nasaApi',
				required: true,
			},
		],
		properties: [
			// ----------------------------------
			//            resources
			// ----------------------------------
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Asteroid Neo-Browse',
						value: 'asteroidNeoBrowse',
					},
					{
						name: 'Asteroid Neo-Feed',
						value: 'asteroidNeoFeed',
					},
					{
						name: 'Asteroid Neo-Lookup',
						value: 'asteroidNeoLookup',
					},
					{
						name: 'Astronomy Picture of the Day',
						value: 'astronomyPictureOfTheDay',
					},
					{
						name: 'DONKI Coronal Mass Ejection',
						value: 'donkiCoronalMassEjection',
					},
					{
						name: 'DONKI High Speed Stream',
						value: 'donkiHighSpeedStream',
					},
					// {
					// 	name: 'DONKI Geomagnetic Storm',
					// 	value: 'donkiGeomagneticStorm',
					// },
					{
						name: 'DONKI Interplanetary Shock',
						value: 'donkiInterplanetaryShock',
					},
					{
						name: 'DONKI Magnetopause Crossing',
						value: 'donkiMagnetopauseCrossing',
					},
					{
						name: 'DONKI Notification',
						value: 'donkiNotifications',
					},
					{
						name: 'DONKI Radiation Belt Enhancement',
						value: 'donkiRadiationBeltEnhancement',
					},
					{
						name: 'DONKI Solar Energetic Particle',
						value: 'donkiSolarEnergeticParticle',
					},
					{
						name: 'DONKI Solar Flare',
						value: 'donkiSolarFlare',
					},
					{
						name: 'DONKI WSA+EnlilSimulation',
						value: 'donkiWsaEnlilSimulation',
					},
					{
						name: 'Earth Asset',
						value: 'earthAssets',
					},
					{
						name: 'Earth Imagery',
						value: 'earthImagery',
					},
				],
				default: 'astronomyPictureOfTheDay',
			},
			// ----------------------------------
			//            operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['astronomyPictureOfTheDay'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get the Astronomy Picture of the Day',
						action: 'Get the astronomy picture of the day',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['asteroidNeoFeed'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description:
							'Retrieve a list of asteroids based on their closest approach date to Earth',
						action: 'Get an asteroid neo feed',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['asteroidNeoLookup'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Look up an asteroid based on its NASA SPK-ID',
						action: 'Get an asteroid neo lookup',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['asteroidNeoBrowse'],
					},
				},
				options: [
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Browse the overall asteroid dataset',
						action: 'Get many asteroid neos',
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['donkiCoronalMassEjection'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve DONKI coronal mass ejection data',
						action: 'Get a DONKI coronal mass ejection',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['donkiGeomagneticStorm'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve DONKI geomagnetic storm data',
						action: 'Get a DONKI geomagnetic storm',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['donkiInterplanetaryShock'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve DONKI interplanetary shock data',
						action: 'Get a DONKI interplanetary shock',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['donkiSolarFlare'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve DONKI solar flare data',
						action: 'Get a DONKI solar flare',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['donkiSolarEnergeticParticle'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve DONKI solar energetic particle data',
						action: 'Get a DONKI solar energetic particle',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['donkiMagnetopauseCrossing'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve data on DONKI magnetopause crossings',
						action: 'Get a DONKI magnetopause crossing',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['donkiRadiationBeltEnhancement'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve DONKI radiation belt enhancement data',
						action: 'Get a DONKI radiation belt enhancement',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['donkiHighSpeedStream'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve DONKI high speed stream data',
						action: 'Get a DONKI high speed stream',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['donkiWsaEnlilSimulation'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve DONKI WSA+EnlilSimulation data',
						action: 'Get a DONKI wsa enlil simulation',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['donkiNotifications'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve DONKI notifications data',
						action: 'Get a DONKI notifications',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['earthImagery'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve Earth imagery',
						action: 'Get Earth imagery',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['earthAssets'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve Earth assets',
						action: 'Get Earth assets',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['inSightMarsWeatherService'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve Insight Mars Weather Service data',
						action: 'Get Insight Mars Weather Service',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['imageAndVideoLibrary'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve Image and Video Library data',
						action: 'Get image and video library data',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['techTransfer'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve TechTransfer data',
						action: 'Get a TechTransfer data',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['twoLineElementSet'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve Two-Line Element Set data',
						action: 'Get a Two-Line Element Set',
					},
				],
				default: 'get',
			},

			// ----------------------------------
			//            fields
			// ----------------------------------

			/* asteroidId and additionalFields (includeCloseApproachData) for asteroidNeoLookup */
			{
				displayName: 'Asteroid ID',
				name: 'asteroidId',
				type: 'string',
				required: true,
				default: '',
				placeholder: '3542519',
				description: 'The ID of the asteroid to be returned',
				displayOptions: {
					show: {
						resource: ['asteroidNeoLookup'],
						operation: ['get'],
					},
				},
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['asteroidNeoLookup'],
						operation: ['get'],
					},
				},
				options: [
					{
						displayName: 'Include Close Approach Data',
						name: 'includeCloseApproachData',
						type: 'boolean',
						default: false,
						description: 'Whether to include all the close approach data in the asteroid lookup',
					},
				],
			},
			{
				displayName: 'Download Image',
				name: 'download',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['astronomyPictureOfTheDay'],
					},
				},
				default: true,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					'By default just the URL of the image is returned. When set to true the image will be downloaded.',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				required: true,
				default: 'data',
				displayOptions: {
					show: {
						operation: ['get'],
						resource: ['astronomyPictureOfTheDay'],
						download: [true],
					},
				},
				description: 'Name of the binary property to which to write to',
			},

			/* date for astronomyPictureOfTheDay */
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				default: {},
				placeholder: 'Add field',
				displayOptions: {
					show: {
						resource: ['astronomyPictureOfTheDay'],
						operation: ['get'],
					},
				},
				options: [
					{
						displayName: 'Date',
						name: 'date',
						type: 'dateTime',
						default: '',
						placeholder: 'YYYY-MM-DD',
					},
				],
			},

			/* startDate and endDate for various resources */
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				default: {},
				placeholder: 'Add field',
				displayOptions: {
					show: {
						resource: [
							'asteroidNeoFeed',
							'donkiCoronalMassEjection',
							'donkiGeomagneticStorm',
							'donkiSolarFlare',
							'donkiSolarEnergeticParticle',
							'donkiMagnetopauseCrossing',
							'donkiRadiationBeltEnhancement',
							'donkiHighSpeedStream',
							'donkiWsaEnlilSimulation',
							'donkiNotifications',
						],
						operation: ['get'],
					},
				},
				options: [
					{
						displayName: 'Start Date',
						name: 'startDate',
						type: 'dateTime',
						default: '',
						placeholder: 'YYYY-MM-DD',
					},
					{
						displayName: 'End Date',
						name: 'endDate',
						type: 'dateTime',
						default: '',
						placeholder: 'YYYY-MM-DD',
					},
				],
			},

			/* startDate, endDate, location and catalog for donkiInterplanetaryShock */
			// Note: If I move startDate and endDate to the Additional Fields above,
			// then this resource gets _two_ Additional Fields with two fields each,
			// instead of _one_ Additional Fields with four fields. So I cannot avoid
			// duplication without cluttering up the UI. Ideas?
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				default: {},
				placeholder: 'Add field',
				displayOptions: {
					show: {
						resource: ['donkiInterplanetaryShock'],
						operation: ['get'],
					},
				},
				options: [
					{
						displayName: 'Start Date',
						name: 'startDate',
						type: 'dateTime',
						default: '',
						placeholder: 'YYYY-MM-DD',
					},
					{
						displayName: 'End Date',
						name: 'endDate',
						type: 'dateTime',
						default: '',
						placeholder: 'YYYY-MM-DD',
					},
					{
						displayName: 'Location',
						name: 'location',
						type: 'options',
						default: 'ALL',
						description: 'The location of the geomagnetic storm',
						options: [
							{
								name: 'All',
								value: 'ALL',
							},
							{
								name: 'Earth',
								value: 'earth',
							},
							{
								name: 'Messenger',
								value: 'MESSENGER',
							},
							{
								name: 'Stereo A',
								value: 'STEREO A',
							},
							{
								name: 'Stereo B',
								value: 'STEREO B',
							},
						],
					},
					{
						displayName: 'Catalog',
						name: 'catalog',
						type: 'options',
						default: 'ALL',
						description: 'The catalog of the geomagnetic storm',
						options: [
							{
								name: 'All',
								value: 'ALL',
							},
							{
								name: 'SWRC Catalog',
								value: 'SWRC_CATALOG',
							},
							{
								name: 'Winslow Messenger ICME Catalog',
								value: 'WINSLOW_MESSENGER_ICME_CATALOG',
							},
						],
					},
				],
			},

			/* latitude, longitude and additionaFields (date, degrees) for earthImagery and earthAssets*/
			{
				displayName: 'Latitude',
				name: 'lat',
				type: 'number',
				default: '',
				placeholder: '47.751076',
				description: 'Latitude for the location of the image',
				displayOptions: {
					show: {
						resource: ['earthImagery', 'earthAssets'],
						operation: ['get'],
					},
				},
			},
			{
				displayName: 'Longitude',
				name: 'lon',
				type: 'number',
				default: '',
				placeholder: '-120.740135',
				description: 'Longitude for the location of the image',
				displayOptions: {
					show: {
						resource: ['earthImagery', 'earthAssets'],
						operation: ['get'],
					},
				},
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				required: true,
				default: 'data',
				displayOptions: {
					show: {
						operation: ['get'],
						resource: ['earthImagery'],
					},
				},
				description: 'Name of the binary property to which to write to',
			},

			//aqui
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				default: {},
				placeholder: 'Add field',
				displayOptions: {
					show: {
						resource: ['earthImagery', 'earthAssets'],
						operation: ['get'],
					},
				},
				options: [
					{
						displayName: 'Date',
						name: 'date',
						type: 'dateTime',
						default: '',
						placeholder: 'YYYY-MM-DD',
						description: 'Date of the image',
					},
					{
						displayName: 'Degrees',
						name: 'dim',
						type: 'number',
						default: '',
						placeholder: '0.025',
						description: 'Width and height of the image in degrees',
					},
				],
			},

			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['getAll'],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				description: 'Max number of results to return',
				default: 20,
				displayOptions: {
					show: {
						operation: ['getAll'],
						returnAll: [false],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		let responseData;
		const qs: IDataObject = {};
		let returnAll = false;
		let propertyName = '';
		let download = false;

		for (let i = 0; i < items.length; i++) {
			try {
				let endpoint = '';
				let includeCloseApproachData = false;

				// additionalFields are brought up here to prevent repetition on most endpoints.
				// The few endpoints like asteroidNeoBrowse that do not have additionalFields
				// trigger an error in getNodeParameter dealt with in the catch block.
				let additionalFields;
				try {
					additionalFields = this.getNodeParameter('additionalFields', i);
				} catch (error) {
					additionalFields = {} as IDataObject;
				}

				if (resource === 'astronomyPictureOfTheDay') {
					if (operation === 'get') {
						endpoint = '/planetary/apod';

						qs.date =
							moment(additionalFields.date as string).format('YYYY-MM-DD') ||
							moment().format('YYYY-MM-DD');
					}
				}
				if (resource === 'asteroidNeoFeed') {
					if (operation === 'get') {
						endpoint = '/neo/rest/v1/feed';

						propertyName = 'near_earth_objects';

						// The range defaults to the current date to reduce the number of results.
						const currentDate = moment().format('YYYY-MM-DD');
						qs.start_date =
							moment(additionalFields.startDate as string).format('YYYY-MM-DD') || currentDate;
						qs.end_date =
							moment(additionalFields.endDate as string).format('YYYY-MM-DD') || currentDate;
					}
				}
				if (resource === 'asteroidNeoLookup') {
					if (operation === 'get') {
						const asteroidId = this.getNodeParameter('asteroidId', i) as IDataObject;

						includeCloseApproachData = additionalFields.includeCloseApproachData as boolean;

						endpoint = `/neo/rest/v1/neo/${asteroidId}`;
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation '${operation}' is unknown!`,
							{ itemIndex: i },
						);
					}
				}
				if (resource === 'asteroidNeoBrowse') {
					if (operation === 'getAll') {
						returnAll = this.getNodeParameter('returnAll', 0);

						if (!returnAll) {
							qs.size = this.getNodeParameter('limit', 0);
						}

						propertyName = 'near_earth_objects';

						endpoint = '/neo/rest/v1/neo/browse';
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation '${operation}' is unknown!`,
							{ itemIndex: i },
						);
					}
				}
				if (resource.startsWith('donki')) {
					if (additionalFields.startDate) {
						qs.startDate = moment(additionalFields.startDate as string).format('YYYY-MM-DD');
					} else {
						qs.startDate = moment().subtract(30, 'days').format('YYYY-MM-DD');
					}

					if (additionalFields.endDate) {
						qs.endDate = moment(additionalFields.endDate as string).format('YYYY-MM-DD');
					} else {
						qs.endDate = moment().format('YYYY-MM-DD');
					}

					if (resource === 'donkiCoronalMassEjection') {
						if (operation === 'get') {
							endpoint = '/DONKI/CME';
						}
					} else if (resource === 'donkiGeomagneticStorm') {
						if (operation === 'get') {
							endpoint = '/DONKI/GST';
						}
					} else if (resource === 'donkiInterplanetaryShock') {
						if (operation === 'get') {
							endpoint = '/DONKI/IPS';

							qs.location = (additionalFields.location as string) || 'ALL'; // default per API
							qs.catalog = (additionalFields.catalog as string) || 'ALL'; // default per API
						}
					} else if (resource === 'donkiSolarFlare') {
						if (operation === 'get') {
							endpoint = '/DONKI/FLR';
						}
					} else if (resource === 'donkiSolarEnergeticParticle') {
						if (operation === 'get') {
							endpoint = '/DONKI/SEP';
						}
					} else if (resource === 'donkiMagnetopauseCrossing') {
						if (operation === 'get') {
							endpoint = '/DONKI/MPC';
						}
					} else if (resource === 'donkiRadiationBeltEnhancement') {
						if (operation === 'get') {
							endpoint = '/DONKI/RBE';
						}
					} else if (resource === 'donkiHighSpeedStream') {
						if (operation === 'get') {
							endpoint = '/DONKI/HSS';
						}
					} else if (resource === 'donkiWsaEnlilSimulation') {
						if (operation === 'get') {
							endpoint = '/DONKI/WSAEnlilSimulations';
						}
					} else if (resource === 'donkiNotifications') {
						if (operation === 'get') {
							endpoint = '/DONKI/notifications';

							qs.type = (additionalFields.type as string) || 'all'; // default per API
						}
					}
				}
				if (resource === 'earthImagery') {
					if (operation === 'get') {
						endpoint = '/planetary/earth/imagery';

						qs.lat = this.getNodeParameter('lat', i) as IDataObject;
						qs.lon = this.getNodeParameter('lon', i) as IDataObject;

						qs.dim = (additionalFields.dim as string) || 0.025; // default per API

						if (additionalFields.date) {
							qs.date = moment(additionalFields.date as string).format('YYYY-MM-DD');
						} else {
							qs.date = moment().format('YYYY-MM-DD');
						}
					}
				}
				if (resource === 'earthAssets') {
					if (operation === 'get') {
						endpoint = '/planetary/earth/assets';

						qs.lat = this.getNodeParameter('lat', i) as IDataObject;
						qs.lon = this.getNodeParameter('lon', i) as IDataObject;

						qs.dim = (additionalFields.dim as string) || 0.025; // default per API

						if (additionalFields.date) {
							qs.date = moment(additionalFields.date as string).format('YYYY-MM-DD');
						}
					}

					if (operation === 'get') {
						endpoint = '/insight_weather/earth/imagery';

						// Hardcoded because these are the only options available right now.
						qs.feedtype = 'json';
						qs.ver = '1.0';
					}
				}

				if (returnAll) {
					responseData = nasaApiRequestAllItems.call(this, propertyName, 'GET', endpoint, qs);
				} else {
					responseData = await nasaApiRequest.call(this, 'GET', endpoint, qs);

					if (propertyName !== '') {
						responseData = responseData[propertyName];
					}
				}

				if (resource === 'asteroidNeoLookup' && operation === 'get' && !includeCloseApproachData) {
					delete responseData.close_approach_data;
				}

				if (resource === 'asteroidNeoFeed') {
					const date = Object.keys(responseData as IDataObject)[0];
					responseData = responseData[date];
				}

				if (resource === 'earthImagery') {
					const binaryProperty = this.getNodeParameter('binaryPropertyName', i);

					const data = await nasaApiRequest.call(this, 'GET', endpoint, qs, { encoding: null });

					const newItem: INodeExecutionData = {
						json: items[i].json,
						binary: {},
					};

					if (items[i].binary !== undefined) {
						Object.assign(newItem.binary!, items[i].binary);
					}

					items[i] = newItem;

					items[i].binary![binaryProperty] = await this.helpers.prepareBinaryData(data as Buffer);
				}

				if (resource === 'astronomyPictureOfTheDay') {
					download = this.getNodeParameter('download', 0);

					if (download) {
						const binaryProperty = this.getNodeParameter('binaryPropertyName', i);

						const data = await nasaApiRequest.call(
							this,
							'GET',
							endpoint,
							qs,
							{ encoding: null },
							responseData.hdurl as string,
						);

						const filename = (responseData.hdurl as string).split('/');

						const newItem: INodeExecutionData = {
							json: items[i].json,
							binary: {},
						};

						Object.assign(newItem.json, responseData);

						if (items[i].binary !== undefined) {
							Object.assign(newItem.binary!, items[i].binary);
						}

						items[i] = newItem;

						items[i].binary![binaryProperty] = await this.helpers.prepareBinaryData(
							data as Buffer,
							filename[filename.length - 1],
						);
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					if (resource === 'earthImagery' && operation === 'get') {
						items[i].json = { error: error.message };
					} else if (resource === 'astronomyPictureOfTheDay' && operation === 'get' && download) {
						items[i].json = { error: error.message };
					} else {
						const executionErrorData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray({ error: error.message }),
							{ itemData: { item: i } },
						);
						returnData.push(...executionErrorData);
					}
					continue;
				}
				throw error;
			}
		}

		if (resource === 'earthImagery' && operation === 'get') {
			return this.prepareOutputData(items);
		} else if (resource === 'astronomyPictureOfTheDay' && operation === 'get' && download) {
			return this.prepareOutputData(items);
		} else {
			return this.prepareOutputData(returnData);
		}
	}
}

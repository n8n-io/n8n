import {
	BINARY_ENCODING,
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeTypeDescription,
	INodeType,
} from 'n8n-workflow';

import {
	nasaApiRequest,
	formatDate,
} from './GenericFunctions';


export class Nasa implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'NASA',
		name: 'nasa',
		icon: 'file:NASA.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Retrieve data the from NASA API',
		defaults: {
			name: 'NASA',
			color: '#0B3D91',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'nasaApi',
				required: true,
			}
		],
		properties: [
			// ----------------------------------
			//            resources
			// ----------------------------------
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Astronomy Picture of the Day',
						value: 'astronomyPictureOfTheDay',
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
						name: 'Asteroid Neo-Browse',
						value: 'asteroidNeoBrowse',
					},
					{
						name: 'DONKI Coronal Mass Ejection',
						value: 'donkiCoronalMassEjection',
					},
					{
						name: 'DONKI Geomagnetic Storm',
						value: 'donkiGeomagneticStorm',
					},
					{
						name: 'DONKI Interplanetary Shock',
						value: 'donkiInterplanetaryShock',
					},
					{
						name: 'DONKI Solar Flare',
						value: 'donkiSolarFlare',
					},
					{
						name: 'DONKI Solar Energetic Particle',
						value: 'donkiSolarEnergeticParticle',
					},
					{
						name: 'DONKI Magnetopause Crossing',
						value: 'donkiMagnetopauseCrossing',
					},
					{
						name: 'DONKI Radiation Belt Enhancement',
						value: 'donkiRadiationBeltEnhancement',
					},
					{
						name: 'DONKI High Speed Stream',
						value: 'donkiHighSpeedStream',
					},
					{
						name: 'DONKI WSA+EnlilSimulation',
						value: 'donkiWsaEnlilSimulation',
					},
					{
						name: 'DONKI Notifications',
						value: 'donkiNotifications',
					},
					{
						name: 'Earth Imagery',
						value: 'earthImagery',
					},
					{
						name: 'Earth Assets',
						value: 'earthAssets',
					},
					{
						name: 'Insight Mars Weather Service',
						value: 'inSightMarsWeatherService',
					},
					{
						name: 'Mars Rover Photos',
						value: 'marsRoverPhotos',
					},
					{
						name: 'TechPort',
						value: 'techPort',
					},
				],
				default: 'astronomyPictureOfTheDay',
				description: 'The resource to operate on',
			},
			// ----------------------------------
			//            operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'astronomyPictureOfTheDay',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get the Astronomy Picture of the Day',
					},
				],
				default: 'get',
				description: 'The operation to perform',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'asteroidNeoFeed',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve a list of asteroids based on their closest approach date to Earth',
					},
				],
				default: 'get',
				description: 'The operation to perform',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'asteroidNeoLookup',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Look up an asteroid based on its NASA SPK-ID',
					},
				],
				default: 'get',
				description: 'The operation to perform',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'asteroidNeoBrowse',
						],
					},
				},
				options: [
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Browse the overall asteroid dataset',
					},
				],
				default: 'getAll',
				description: 'The operation to perform',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'donkiCoronalMassEjection',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve DONKI coronal mass ejection data',
					},
				],
				default: 'get',
				description: 'The operation to perform',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'donkiGeomagneticStorm',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve DONKI geomagnetic storm data',
					},
				],
				default: 'get',
				description: 'The operation to perform',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'donkiInterplanetaryShock',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve DONKI interplanetary shock data',
					},
				],
				default: 'get',
				description: 'The operation to perform',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'donkiSolarFlare',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve DONKI solar flare data',
					},
				],
				default: 'get',
				description: 'The operation to perform',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'donkiSolarEnergeticParticle',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve DONKI solar energetic particle data',
					},
				],
				default: 'get',
				description: 'The operation to perform',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'donkiMagnetopauseCrossing',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve data on DONKI magnetopause crossings',
					},
				],
				default: 'get',
				description: 'The operation to perform',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'donkiRadiationBeltEnhancement',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve DONKI radiation belt enhancement data',
					},
				],
				default: 'get',
				description: 'The operation to perform',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'donkiHighSpeedStream',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve DONKI high speed stream data',
					},
				],
				default: 'get',
				description: 'The operation to perform',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'donkiWsaEnlilSimulation',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve DONKI WSA+EnlilSimulation data',
					},
				],
				default: 'get',
				description: 'The operation to perform',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'donkiNotifications',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve DONKI notifications data',
					},
				],
				default: 'get',
				description: 'The operation to perform',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'earthImagery',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve Earth imagery',
					},
				],
				default: 'get',
				description: 'The operation to perform',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'earthAssets',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve Earth assets',
					},
				],
				default: 'get',
				description: 'The operation to perform',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'inSightMarsWeatherService',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve Insight Mars Weather Service data',
					},
				],
				default: 'get',
				description: 'The operation to perform',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'marsRoverPhotos',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve Mars Rover Photos',
					},
				],
				default: 'get',
				description: 'The operation to perform',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'imageAndVideoLibrary',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve Image and Video Library data',
					},
				],
				default: 'get',
				description: 'The operation to perform',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'techTransfer',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve TechTransfer data',
					},
				],
				default: 'get',
				description: 'The operation to perform',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'techPort',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve TechPort data',
					},
				],
				default: 'get',
				description: 'The operation to perform',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'twoLineElementSet',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve Two-Line Element Set data',
					},
				],
				default: 'get',
				description: 'The operation to perform',
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
						resource: [
							'asteroidNeoLookup',
						],
						operation: [
							'get',
						],
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
						resource: [
							'asteroidNeoLookup',
						],
						operation: [
							'get',
						],
					},
				},
				options: [
					{
						displayName: 'Include close approach data',
						name: 'includeCloseApproachData',
						type: 'boolean',
						default: false,
						description: 'Whether to include all the close approach data in the asteroid lookup',
					},
				],
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
						resource: [
							'astronomyPictureOfTheDay',
						],
						operation: [
							'get',
						]
					},
				},
				options: [
					{
						displayName: 'Date',
						name: 'date',
						type: 'string',
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
							'donkiNotifications'
						],
						operation: [
							'get',
						]
					},
				},
				options: [
					{
						displayName: 'Start date',
						name: 'startDate',
						type: 'string',
						default: '',
						placeholder: 'YYYY-MM-DD',
					},
					{
						displayName: 'End date',
						name: 'endDate',
						type: 'string',
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
						resource: [
							'donkiInterplanetaryShock',
						],
						operation: [
							'get',
						],
					},
				},
				options: [
					{
						displayName: 'Start date',
						name: 'startDate',
						type: 'string',
						default: '',
						placeholder: 'YYYY-MM-DD',
					},
					{
						displayName: 'End date',
						name: 'endDate',
						type: 'string',
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
								value: 'ALL'
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
						resource: [
							'earthImagery',
							'earthAssets',
						],
						operation: [
							'get',
						],
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
						resource: [
							'earthImagery',
							'earthAssets',
						],
						operation: [
							'get',
						],
					},
				},
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				default: {},
				placeholder: 'Add field',
				displayOptions: {
					show: {
						resource: [
							'earthImagery',
							'earthAssets',
						],
						operation: [
							'get',
						],
					},
				},
				options: [
					{
						displayName: 'Date',
						name: 'date',
						type: 'string',
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

			/* sol and additional fields (camera and page) for marsRoverPhotos */
			{
				displayName: 'Sol',
				name: 'sol',
				type: 'number',
				default: '',
				placeholder: '1000',
				description: 'Date of the image',
				displayOptions: {
					show: {
						resource: [
							'marsRoverPhotos',
						],
						operation: [
							'get',
						],
					},
				},
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				default: {},
				placeholder: 'Add field',
				displayOptions: {
					show: {
						resource: [
							'marsRoverPhotos',
						],
						operation: [
							'get',
						],
					},
				},
				options: [
					{
						displayName: 'Page',
						name: 'endDate',
						type: 'number',
						default: '',
					},
					{
						displayName: 'Location',
						name: 'location',
						type: 'options',
						default: 'all',
						description: 'The location of the geomagnetic storm',
						options: [
							{
								name: 'Front Hazard Avoidance Camera',
								value: 'FHAZ',
							},
							{
								name: 'Rear Hazard Avoidance Camera',
								value: 'RHAZ',
							},
							{
								name: 'Mast Camera',
								value: 'MAST',
							},
							{
								name: 'Chemistry and Camera Complex',
								value: 'CHEMCAM',
							},
							{
								name: 'Mars Hand Lens Imager',
								value: 'MAHLI',
							},
							{
								name: 'Mars Descent Imager',
								value: 'MARDI',
							},
							{
								name: 'Navigation Camera',
								value: 'NAVCAM',
							},
							{
								name: 'Panoramic Camera',
								value: 'PANCAM',
							},
							{
								name: 'Miniature Thermal Emission Spectrometer',
								value: 'MINITES',
							}
						]
					},
				]
			},

			/* parameterId for techPort */
			{
				displayName: 'Parameter ID',
				name: 'parameterId',
				type: 'string',
				required: true,
				default: '',
				description: 'The ID of the TechPort record to be returned',
				displayOptions: {
					show: {
						resource: [
							'techPort',
						],
						operation: [
							'get',
						],
					},
				},
			},
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;

		for (let i = 0; i < items.length; i++) {

			let endpoint = '';
			let qs: IDataObject = {};
			let includeCloseApproachData = false;

			// additionalFields are brought up here to prevent repetition on most endpoints.
			// The few endpoints like asteroidNeoBrowse that do not have additionalFields
			// trigger an error in getNodeParameter dealt with in the catch block.
			let additionalFields;
			try {
				additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
			} catch (error) {
				additionalFields = {} as IDataObject;
			}

			if (resource === 'astronomyPictureOfTheDay') {

				if (operation === 'get') {

					endpoint = '/planetary/apod';

					qs.date = additionalFields.date as string || formatDate(new Date());

				} else {
					throw new Error(`The operation '${operation}' is unknown!`);
				}

			} else if (resource === 'asteroidNeoFeed') {

				if (operation === 'get') {

					endpoint = '/neo/rest/v1/feed';

					// The range defaults to the current date to reduce the number of results.
					const currentDate = formatDate(new Date());
					qs.start_date = additionalFields.startDate as string || currentDate;
					qs.end_date = additionalFields.endDate as string || currentDate;

				} else {
					throw new Error(`The operation '${operation}' is unknown!`);
				}

			} else if (resource === 'asteroidNeoLookup') {

				if (operation === 'get') {

					const asteroidId = this.getNodeParameter('asteroidId', i) as IDataObject;

					includeCloseApproachData = additionalFields.includeCloseApproachData as boolean;

					endpoint = `/neo/rest/v1/neo/${asteroidId}`;

				} else {
					throw new Error(`The operation '${operation}' is unknown!`);
				}

			} else if (resource === 'asteroidNeoBrowse') {

				if (operation === 'getAll') {

					// TODO: Pagination of results for asteroidNeoBrowse
					endpoint = `/neo/rest/v1/neo/browse`;

				} else {
					throw new Error(`The operation '${operation}' is unknown!`);
				}

			} else if (resource.startsWith("donki")) {

				if (additionalFields.startDate) {
					qs.startDate = additionalFields.startDate as string;
				} else {
					const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate()-30));
					qs.startDate = formatDate(thirtyDaysAgo); // default per API
				}

				if (additionalFields.endDate) {
					qs.endDate = additionalFields.endDate as string;
				} else {
					qs.endDate = formatDate(new Date()); // default per API
				}

				if (resource === 'donkiCoronalMassEjection') {

					if (operation === 'get') {

						endpoint = '/DONKI/CME';

					} else {
						throw new Error(`The operation '${operation}' is unknown!`);
					}

				} else if (resource === 'donkiGeomagneticStorm') {

					if (operation === 'get') {

						endpoint = '/DONKI/GST';

					} else {
						throw new Error(`The operation '${operation}' is unknown!`);
					}

				} else if (resource === 'donkiInterplanetaryShock') {

					if (operation === 'get') {

						endpoint = '/DONKI/IPS';

						qs.location = additionalFields.location as string || "ALL"; // default per API
						qs.catalog = additionalFields.catalog as string || "ALL"; // default per API

					} else {
						throw new Error(`The operation '${operation}' is unknown!`);
					}

				} else if (resource === 'donkiSolarFlare') {

					if (operation === 'get') {

						endpoint = '/DONKI/FLR';

					} else {
						throw new Error(`The operation '${operation}' is unknown!`);
					}

				} else if (resource === 'donkiSolarEnergeticParticle') {

					if (operation === 'get') {

						endpoint = '/DONKI/SEP';

					} else {
						throw new Error(`The operation '${operation}' is unknown!`);
					}

				} else if (resource === 'donkiMagnetopauseCrossing') {

					if (operation === 'get') {

						endpoint = '/DONKI/MPC';

					} else {
						throw new Error(`The operation '${operation}' is unknown!`);
					}

				} else if (resource === 'donkiRadiationBeltEnhancement') {

					if (operation === 'get') {

						endpoint = '/DONKI/RBE';

					} else {
						throw new Error(`The operation '${operation}' is unknown!`);
					}

				} else if (resource === 'donkiHighSpeedStream') {

					if (operation === 'get') {

						endpoint = '/DONKI/HSS';

					} else {
						throw new Error(`The operation '${operation}' is unknown!`);
					}

				} else if (resource === 'donkiWsaEnlilSimulation') {

					if (operation === 'get') {

						endpoint = '/DONKI/WSAEnlilSimulations';

					} else {
						throw new Error(`The operation '${operation}' is unknown!`);
					}

				} else if (resource === 'donkiNotifications') {

					if (operation === 'get') {

						endpoint = '/DONKI/notifications';

						qs.type = additionalFields.type as string || "all"; // default per API

					} else {
						throw new Error(`The operation '${operation}' is unknown!`);
					}

				}

			} else if (resource === 'earthImagery') {

				if (operation === 'get') {

					endpoint = '/planetary/earth/imagery';

					qs.lat = this.getNodeParameter('lat', i) as IDataObject;
					qs.lon = this.getNodeParameter('lon', i) as IDataObject;

					qs.dim = additionalFields.dim as string || 0.025; // default per API

					if (additionalFields.date) {
						qs.date = additionalFields.date as string;
					}

				} else {
					throw new Error(`The operation '${operation}' is unknown!`);
				}

			} else if (resource === 'earthAssets') {

				if (operation === 'get') {

					endpoint = '/planetary/earth/assets';

					qs.lat = this.getNodeParameter('lat', i) as IDataObject;
					qs.lon = this.getNodeParameter('lon', i) as IDataObject;

					qs.dim = additionalFields.dim as string || 0.025; // default per API

					if (additionalFields.date) {
						qs.date = additionalFields.date as string;
					}

				} else {
					throw new Error(`The operation '${operation}' is unknown!`);
				}

			} else if (resource === 'inSightMarsWeatherService') {

				if (operation === 'get') {

					endpoint = '/insight_weather/earth/imagery';

					// Hardcoded because these are the only options available right now.
					qs.feedtype = "json";
					qs.ver = "1.0"

				} else {
					throw new Error(`The operation '${operation}' is unknown!`);
				}

			} else if (resource === 'marsRoverPhotos') {

				if (operation === 'get') {

					qs.sol = this.getNodeParameter('sol', i) as IDataObject;

					endpoint = '/mars-photos/api/v1/rovers/curiosity/photos';

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (additionalFields.camera) {
						qs.camera = additionalFields.camera as string;
					}

					if (additionalFields.page) {
						qs.page = additionalFields.page as string;
					}

				} else {
					throw new Error(`The operation '${operation}' is unknown!`);
				}

			} else if (resource === 'techPort') {

				if (operation === 'get') {

					const idParameter = this.getNodeParameter('idParameter', i) as IDataObject;

					endpoint = `/techport/api/projects/${idParameter}`;

				} else if (operation === 'getAll') {

					endpoint = '/techport/api/projects/'; // TODO: Pagination

				} else {
					throw new Error(`The operation '${operation}' is unknown!`);
				}

			} else {
				throw new Error(`The resource '${resource}' is unknown!`);
			}
				responseData = await nasaApiRequest.call(this, 'GET', endpoint, qs);
				// console.log("RESPONSE DATA");
				// console.log(responseData);

				if (resource === 'asteroidNeoLookup' && operation === 'get' && !includeCloseApproachData) {
					delete responseData.close_approach_data;
				}

				if (resource === 'earthImagery') {
					const newItem: INodeExecutionData = {
						json: items[i].json,
						binary: {},
					};

					if (items[i].binary !== undefined) {
						Object.assign(newItem.binary, items[i].binary);
					}

					items[i] = newItem;

					const binaryDataBuffer = Buffer.from(responseData, BINARY_ENCODING);
					items[i].binary!["Earth Satellite Imagery"] = await this.helpers.prepareBinaryData(binaryDataBuffer);
				}

				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData as IDataObject);
				}

			}

			if (resource === 'earthImagery' && operation === 'get') {
				return this.prepareOutputData(items);
			} else {
				return [this.helpers.returnJsonArray(returnData)];
			}

		}
	}

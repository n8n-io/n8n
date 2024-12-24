import {
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';
import axios from 'axios';

export class RouteManager implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Route Manager',
		name: 'routeManager',
		icon: 'file:routemanager.svg',
		group: ['transform'],
		version: 1,
		description: 'Generates truck routes and collects data',
		defaults: {
			name: 'Route Manager',
			color: '#00BFFF',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'Pickup Location',
				name: 'pickupLocation',
				type: 'string',
				default: '',
				placeholder: 'Enter pickup location',
				required: true,
			},
			{
				displayName: 'Destination Location',
				name: 'destinationLocation',
				type: 'string',
				default: '',
				placeholder: 'Enter destination location',
				required: true,
			},
		],
	};

	async execute(this: IExecuteFunctions) {
		const pickupLocation = this.getNodeParameter('pickupLocation', 0) as string;
		const destinationLocation = this.getNodeParameter('destinationLocation', 0) as string;
		const routeManager = this as unknown as RouteManager;

		// Generate routes
		const routes = await routeManager.generateRoutes(pickupLocation, destinationLocation);

		// Collect weather data
		const weatherData = await routeManager.collectWeatherData(routes);

		// Collect elevation data
		const elevationData = await routeManager.collectElevationData(routes);

		// Calculate tolls
		const tollData = await routeManager.calculateTolls(routes);

		// Process and return the final output
		return routeManager.prepareOutput(routes, weatherData, elevationData, tollData);
	}

	async generateRoutes(pickup: string, destination: string) {
		// Call Here.com Routes API to generate routes
		const response = await axios.get(
			`https://api.here.com/v8/routes?pickup=${pickup}&destination=${destination}`,
		);
		return response.data.routes;
	}

	async collectWeatherData(routes: any[]) {
		// Fetch weather data using OpenAI
		const weatherData = await Promise.all(
			routes.map(async (route) => {
				const response = await axios.get(
					`https://api.openai.com/v1/weather?location=${route.location}`,
				);
				return response.data;
			}),
		);
		return weatherData;
	}

	async collectElevationData(routes: any[]) {
		// Get elevation data from Here.com Elevation API
		const elevationData = await Promise.all(
			routes.map(async (route) => {
				const response = await axios.get(
					`https://api.here.com/v8/elevation?location=${route.location}`,
				);
				return response.data;
			}),
		);
		return elevationData;
	}

	async calculateTolls(routes: any[]) {
		// Calculate tolls using Here.com Toll API
		const tollData = await Promise.all(
			routes.map(async (route) => {
				const response = await axios.get(`https://api.here.com/v8/tolls?routeId=${route.id}`);
				return response.data;
			}),
		);
		return tollData;
	}

	prepareOutput(routes: any[], weatherData: any[], elevationData: any[], tollData: any[]) {
		// Process the data and return stack-ranked routes
		const rankedRoutes = routes
			.map((route, index) => ({
				...route,
				weather: weatherData[index],
				elevation: elevationData[index],
				toll: tollData[index],
			}))
			.sort((a, b) => a.toll - b.toll); // Example ranking by toll

		return [rankedRoutes];
	}
}

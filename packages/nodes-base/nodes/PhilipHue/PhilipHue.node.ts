import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeTypeDescription,
	INodeType,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';

import {
	philiphueApiRequest,
	getUser,
} from './GenericFunctions';

import {
	lightOperations,
	lightFields,
} from './LightDescription';

export class PhilipHue implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Philip Hue',
		name: 'philipHue',
		icon: 'file:philiphue.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Philip Hue API.',
		defaults: {
			name: 'Philip Hue',
			color: '#063c9a',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'philipHueOAuth2Api',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Light',
						value: 'light',
					},
				],
				default: 'light',
				description: 'The resource to operate on.',
			},
			...lightOperations,
			...lightFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the lights to display them to user so that he can
			// select them easily
			async getLights(
				this: ILoadOptionsFunctions
			): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const user = await getUser.call(this);

				const lights = await philiphueApiRequest.call(
					this,
					'GET',
					`/bridge/${user}/lights`,
				);
				for (const light of Object.keys(lights)) {
					const lightName = lights[light].name;
					const lightId = light;
					returnData.push({
						name: lightName,
						value: lightId
					});
				}
				return returnData;
			},
		}
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			if (resource === 'light') {
				if (operation === 'update') {

					const lightId = this.getNodeParameter('lightId', i) as string;

					const on = this.getNodeParameter('on', i) as boolean;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					const body = {
						on,
					};

					if (additionalFields.transitiontime) {
						additionalFields.transitiontime = (additionalFields.transitiontime as number * 100);
					}

					if (additionalFields.xy) {
						additionalFields.xy = (additionalFields.xy as string).split(',').map((e: string) => parseFloat(e));
					}

					if (additionalFields.xy_inc) {
						additionalFields.xy_inc = (additionalFields.xy_inc as string).split(',').map((e: string) => parseFloat(e));
					}

					Object.assign(body, additionalFields);

					const user = await getUser.call(this);

					const data = await philiphueApiRequest.call(
						this,
						'PUT',
						`/bridge/${user}/lights/${lightId}/state`,
						body,
					);

					responseData = {};

					for (const response of data) {
						Object.assign(responseData, response.success);
					}

				}
				if (operation === 'delete') {

					const lightId = this.getNodeParameter('lightId', i) as string;

					const user = await getUser.call(this);

					responseData = await philiphueApiRequest.call(this, 'DELETE', `/bridge/${user}/lights/${lightId}`);

				}
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					const user = await getUser.call(this);

					const lights = await philiphueApiRequest.call(this, 'GET', `/bridge/${user}/lights`);

					responseData = Object.values(lights);

					if (!returnAll) {
						const limit = this.getNodeParameter('limit', i) as number;
						responseData = responseData.splice(0, limit);
					}
				}
				if (operation === 'get') {
					const lightId = this.getNodeParameter('lightId', i) as string;

					const user = await getUser.call(this);

					responseData = await philiphueApiRequest.call(this, 'GET', `/bridge/${user}/lights/${lightId}`);
				}
			}
		}
		if (Array.isArray(responseData)) {
			returnData.push.apply(returnData, responseData as IDataObject[]);
		} else if (responseData !== undefined) {
			returnData.push(responseData as IDataObject);
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}

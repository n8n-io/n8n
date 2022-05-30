import {
	INodeProperties
} from 'n8n-workflow';

export const cameraProxyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'cameraProxy',
				],
			},
		},
		options: [
			{
				name: 'Get Screenshot',
				value: 'getScreenshot',
				description: 'Get the camera screenshot',
			},
		],
		default: 'getScreenshot',
	},
];

export const cameraProxyFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                       cameraProxy:getScreenshot                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Camera Entity ID',
		name: 'cameraEntityId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCameraEntities',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'getScreenshot',
				],
				resource: [
					'cameraProxy',
				],
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
				operation: [
					'getScreenshot',
				],
				resource: [
					'cameraProxy',
				],
			},
		},
		description: 'Name of the binary property to which to write the data of the read file',
	},
];

import {
	INodeProperties
} from 'n8n-workflow';

export const cameraProxyOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
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
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const cameraProxyFields = [
	/* -------------------------------------------------------------------------- */
	/*                       cameraProxy:getScreenshot                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Camera Entity ID',
		name: 'cameraEntityId',
		type: 'string',
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
		description: 'The camera entity ID.',
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
		description: 'Name of the binary property to which to<br />write the data of the read file.',
	},
] as INodeProperties[];

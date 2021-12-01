import {
	INodeProperties,
} from 'n8n-workflow';

export const screenshotAdditionalFields: INodeProperties = {
	displayName: 'Additional Fields',
	name: 'additionalFields',
	type: 'collection',
	placeholder: 'Add Field',
	default: {},
	displayOptions: {
		show: {
			operation: [
				'screenshot',
			],
		},
	},
	options: [
		{
			displayName: 'Screenshot Size',
			name: 'screenshot_size',
			type: 'options',
			default: 'screenshot',
			options: [
				{
					name: 'Full Page',
					value: 'screenshot_full_page',
				},
				{
					name: 'Viewport Only',
					value: 'screenshot',
				},
			],
		},
	],
};

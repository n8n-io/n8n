import {
	INodeType,
	INodeTypeDescription,

} from 'n8n-workflow';

export class Metabase implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Metabase',
		name: 'metabase',
		icon: 'file:metabase.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Use the Metabase API',
		defaults: {
			name: 'Metabse',
			color: '#ff0000',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'MetabseApi',
				required: true,
				testedBy: {
					request: {
						method: 'GET',
						url: '/api/user/current',
					},
				},
			},
		],
		requestDefaults: {
			returnFullResponse: true,
			baseURL: '=${{credentials.url}}',

			headers: {
				'developer-token': '={{$credentials.developerToken}}',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Questions',
						value: 'questions',
					},
					{
						name: 'Metrics',
						value: 'metrics',
					},
					{
						name: 'Databases',
						value: 'databases',
					},
					{
						name: 'Alerts',
						value: 'alerts',
					},
				],
				default: 'questions',
				description: 'The resource to operate on.',
			},
		],
	};
}

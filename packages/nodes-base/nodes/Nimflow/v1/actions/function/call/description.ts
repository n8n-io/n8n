import {
	FunctionProperties
} from '../../Interfaces';

export const callDescription: FunctionProperties = [
	{
		displayName: 'ModuleName',
		name: 'moduleName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'function'
				],
				operation: [
					'call'
				]
			}
		},
		default: 'UserDefined',
		description: 'The Module Name'
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
				show: {
					resource: [
						'function'
					],
					operation: [
						'call'
					]
				},
		},
		default:'',
		description:'The Function Name',
	},
	{
		displayName: 'Parameters',
		name: 'parameters',
		type: 'json',
		displayOptions: {
			show: {
				resource: [
					'function'
				],
				operation: [
					'call'
				]
			}
		},
		default: '',
		description: 'The Parameters as JSON',
	}
]

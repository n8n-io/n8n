import {IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription} from "n8n-workflow";

export class HoneyBook implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HoneyBook',
		name: 'honeyBook',
		icon: 'file:honeyBook.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume HB API',
		defaults: {
			name: 'HoneyBook',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'honeyBookApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Action',
				name: 'action',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Create a task',
						value: 'createTask',
						description: 'Create a task',
						action: 'Create a task',
					},
				],
				default: 'createTask',
			},
			{
				displayName: 'Description',
				name: 'taskDescription',
				type: 'string',
				displayOptions: {
					show: {
						action: ['createTask'],
					},
				},
				default: '',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return [];
	}
}

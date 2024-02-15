import {IExecuteFunctions, ILoadOptionsFunctions, INodeExecutionData, INodePropertyOptions, INodeType, INodeTypeDescription} from "n8n-workflow";
import { honeyBookApiRequest } from "./GenericFunctions";

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
					{
						name: 'Move to pipeline stage',
						value: 'movePipelineStage',
						description: 'Move workspace to pipeline stage',
						action: 'Move to pipeline stage',
					},
					{
						name: 'Send email',
						value: 'sendEmail',
						description: 'Send email to client',
						action: 'Send email to client',
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
			{
				displayName: 'Stage',
				name: 'stage_id',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getPipelineStages',
				},
				displayOptions: {
					show: {
						action: ['movePipelineStage'],
					},
				},
				default: '',
			},
			{
				displayName: 'Send Email',
				name: 'email_template_id',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getEmailTemplates',
				},
				displayOptions: {
					show: {
						action: ['sendEmail'],
					},
				},
				default: '',
			},
		],
	};

	methods = {
		loadOptions: {
			async getPipelineStages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const userPipelineStages = await honeyBookApiRequest.call(this, 'GET', '/n8n/pipeline_stages');
				return userPipelineStages.map((stage: { _id: string, name: string }) => ({
					name: stage.name,
					value: stage._id,
				}));
			},
			async getEmailTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const userPipelineStages = await honeyBookApiRequest.call(this, 'GET', '/n8n/email_templates');
				return userPipelineStages.map((stage: { _id: string, title: string }) => ({
					name: stage.title,
					value: stage._id,
				}));
			},
		},
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const resource = this.getNodeParameter('action', 0);
		const params = this.getNode().parameters;

		const nodeStaticData = this.getWorkflowStaticData('global');
		const body: any = {
			resource,
			params,
			staticData: nodeStaticData,
		};

		const response = await honeyBookApiRequest.call(this,
			'POST',
			`/n8n/trigger_action`,
			body);

		console.log('response',response);

		const myReturnData = this.helpers.constructExecutionMetaData(
			this.helpers.returnJsonArray({random_value: 12312312}),
			{ itemData: { item: 0 } },
		);

		return [myReturnData];
	}
}

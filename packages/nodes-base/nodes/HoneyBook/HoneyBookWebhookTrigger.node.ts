import {
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
	NodeOperationError,
} from 'n8n-workflow';
import { honeyBookApiRequest } from './GenericFunctions';

export class HoneyBookWebhookTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HoneyBook Webhook Trigger',
		name: 'honeyBookWebhookTrigger',
		icon: 'file:honeyBook.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when HoneyBook events occur',
		defaults: {
			name: 'HoneyBook Webhook',
		},
		// credentials: [
		// 	{
		// 		name: 'honeyBookApi',
		// 		required: true,
		// 	},
		// ],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: [
					{
						name: 'Contract signed',
						value: 'after_contract_signed',
						description: 'Triggered when a contract is signed',
					},
					{
						name: 'Session scheduled',
						value: 'session_scheduled',
						description: 'Triggered when a session is scheduled',
					},
					{
						name: 'After invoice paid in full',
						value: 'after_invoice_paid_in_full',
						description: 'Triggered after invoice is paid fully',
					},
					{
						name: 'Project Created',
						value: 'project_created',
						description: 'Triggered when a project is created',
					},
					{
						name: 'Before Project End Date',
						value: 'before_project_end_date',
						description: 'Triggered before a project is ended',
					},
					{
						name: 'After Project End Date',
						value: 'after_project_end_date',
						description: 'Triggered after a project is ended',
					},
					{
						name: 'Before Project Date',
						value: 'before_project_date',
						description: 'Triggered before project date',
					},
					{
						name: 'After Project Date',
						value: 'after_project_date',
						description: 'Triggered after project date',
					},
					{
						name: 'Questionnaire submitted',
						value: 'after_questionnaire_submitted',
						description: 'Triggered when a questionnaire is submitted',
					},
					{
						name: 'After first payment',
						value: 'after_first_payment_made',
						description: 'Triggered after a first payment is made',
					},
					{
						name: 'After project move to completed',
						value: 'after_project_move_to_completed',
						description: 'Triggered when a project is moved to completed stage',
					},
					{
						name: 'After scheduled session ended',
						value: 'after_scheduled_session_ended',
						description: 'Triggered when a scheduled session is ended',
					},
					{
						name: 'Brochure submitted',
						value: 'after_brochure_submitted',
						description: 'Triggered when a scheduled session is ended',
					},
					{
						name: 'All required signatures signed',
						value: 'after_all_required_signatures_signed',
						description: 'Triggered after all required signatures are signed',
					},
					{
						name: 'After session scheduled',
						value: 'after_session_scheduled',
						description: 'Triggered when a session is scheduled',
					},
					{
						name: 'Before session start',
						value: 'before_session_start',
						description: 'Triggered before a session starts',
					},
					{
						name: 'After session start',
						value: 'after_session_start',
						description: 'Triggered after a session starts',
					},
					{
						name: 'Before session end',
						value: 'before_session_end',
						description: 'Triggered before a session ends',
					},
					{
						name: 'After session end',
						value: 'after_session_end',
						description: 'Triggered after a session ends',
					},
					{
						name: 'Relative to date',
						value: 'date_relative',
						description: 'Triggered at a relative date',
					},
				],
				default: [],
				required: true,
			},
			{
				displayName: 'Delay Amount',
				name: 'amount',
				type: 'number',
				default: 0,
				displayOptions: {
					show: {
						events: ['date_relative'],
					},
				},
			},
			{
				displayName: 'Delay Unit',
				name: 'unit',
				type: 'options',
				typeOptions: {
					multipleValues: false,
				},
				options: [
					{
						name: 'Seconds',
						value: 'seconds',
					},
					{
						name: 'Minutes',
						value: 'minutes',
					},
					{
						name: 'Hours',
						value: 'hours',
					},
					{
						name: 'Days',
						value: 'days',
					},
					{
						name: 'Weeks',
						value: 'weeks',
					},
				],
				default: 'minutes',
				displayOptions: {
					show: {
						events: ['date_relative'],
					},
				},
			},
			{
				displayName: 'Delay Preposition',
				name: 'preposition',
				type: 'options',
				typeOptions: {
					multipleValues: false,
				},
				options: [
					{
						name: 'Before',
						value: 'before',
					},
					{
						name: 'After',
						value: 'after',
					},
				],
				default: 'before',
				displayOptions: {
					show: {
						events: ['date_relative'],
					},
				},
			},
			{
				displayName: 'Date field',
				name: 'field',
				type: 'options',
				typeOptions: {
					multipleValues: false,
				},
				options: [
					{
						name: 'Project start',
						value: 'project_date',
					},
					{
						name: 'Project end',
						value: 'project_end_date',
					},
				],
				default: 'project_date',
				displayOptions: {
					show: {
						events: ['date_relative'],
					},
				},
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const events = this.getNodeParameter('events') as string;

				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('global');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events') as string;
				const executionMode = this.getActivationMode();
				console.log('------------------staticData', staticData);

				const payload = {
					events,
					webhookUrl,
					executionMode,
					staticData,
					options: {},
				};

				if (events.includes('date_relative')) {
					payload.options = {
						amount: this.getNodeParameter('amount'),
						unit: this.getNodeParameter('unit'),
						preposition: this.getNodeParameter('preposition'),
						field: this.getNodeParameter('field'),
					};
				}

				// if (!webhookData.projectId) {
				// 	throw new NodeOperationError(
				// 		this.getNode(),
				// 		'No project ID found on honeybook webhook node',
				// 	);
				// }

				const response = await honeyBookApiRequest.call(this, 'POST', '/n8n/webhook', payload);

				// workflowStaticData.webhookId = response.webhookId;

				if (response._id) {
					staticData.webhookId = response._id;
				}

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				console.log('=== DELETE WEBHOOK ===');
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();
		return {
			workflowData: [this.helpers.returnJsonArray(bodyData)],
		};
	}
}

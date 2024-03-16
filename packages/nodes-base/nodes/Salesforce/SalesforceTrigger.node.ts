import type {
	IPollFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';

import { DateTime } from 'luxon';
import { salesforceApiRequest, sortOptions } from './GenericFunctions';

export class SalesforceTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Salesforce Trigger',
		name: 'salesforceTrigger',
		icon: 'file:salesforce.svg',
		group: ['trigger'],
		version: 1,
		description:
			'Fetches data from Salesforce and starts the workflow on specified polling intervals.',
		subtitle: '={{($parameter["event"])}}',
		defaults: {
			name: 'Salesforce Trigger',
		},
		credentials: [
			{
				name: 'salesforceOAuth2Api',
				required: true,
			},
		],
		polling: true,
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Trigger On',
				name: 'triggerOn',
				description: 'Which Salesforce event should trigger the node',
				type: 'options',
				default: '',
				options: [
					{
						name: 'Account Created',
						value: 'accountCreated',
						description: 'When a new account is created',
					},
					{
						name: 'Account Updated',
						value: 'accountUpdated',
						description: 'When an existing account is modified',
					},
					{
						name: 'Attachment Created',
						value: 'attachmentCreated',
						description: 'When a file is uploaded and attached to an object',
					},
					{
						name: 'Attachment Updated',
						value: 'attachmentUpdated',
						description: 'When an existing file is modified',
					},
					{
						name: 'Case Created',
						value: 'caseCreated',
						description: 'When a new case is created',
					},
					{
						name: 'Case Updated',
						value: 'caseUpdated',
						description: 'When an existing case is modified',
					},
					{
						name: 'Contact Created',
						value: 'contactCreated',
						description: 'When a new contact is created',
					},
					{
						name: 'Contact Updated',
						value: 'contactUpdated',
						description: 'When an existing contact is modified',
					},
					{
						name: 'Custom Object Created',
						value: 'customObjectCreated',
						description: 'When a new object of a given type is created',
					},
					{
						name: 'Custom Object Updated',
						value: 'customObjectUpdated',
						description: 'When an object of a given type is modified',
					},
					{
						name: 'Lead Created',
						value: 'leadCreated',
						description: 'When a new lead is created',
					},
					{
						name: 'Lead Updated',
						value: 'leadUpdated',
						description: 'When an existing lead is modified',
					},
					{
						name: 'Opportunity Created',
						value: 'opportunityCreated',
						description: 'When a new opportunity is created',
					},
					{
						name: 'Opportunity Updated',
						value: 'opportunityUpdated',
						description: 'When an existing opportunity is created',
					},
					{
						name: 'Task Created',
						value: 'taskCreated',
						description: 'When a new task is created',
					},
					{
						name: 'Task Updated',
						value: 'taskUpdated',
						description: 'When an existing task is modified',
					},
					{
						name: 'User Created',
						value: 'userCreated',
						description: 'When a new user is created',
					},
					{
						name: 'User Updated',
						value: 'userUpdated',
						description: 'When an existing user is modified',
					},
				],
			},
			{
				displayName: 'Custom Object Name or ID',
				name: 'customObject',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCustomObjects',
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						triggerOn: ['customObjectUpdated', 'customObjectCreated'],
					},
				},
				description:
					'Name of the custom object. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Simplify',
				name: 'simplify',
				type: 'boolean',
				default: true,
				description: 'Limit the fields returned',
			},
		],
	};
	methods = {
		loadOptions: {
			// Get all the lead custom fields to display them to user so that they can
			// select them easily
			async getCustomFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const resource = this.getNodeParameter('resource', 0);
				// TODO: find a way to filter this object to get just the lead sources instead of the whole object
				const { fields } = await salesforceApiRequest.call(
					this,
					'GET',
					`/sobjects/${resource}/describe`,
				);
				for (const field of fields) {
					if (field.custom === true) {
						const fieldName = field.label;
						const fieldId = field.name;
						returnData.push({
							name: fieldName,
							value: fieldId,
						});
					}
				}
				sortOptions(returnData);
				return returnData;
			},
		},
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const webhookData = this.getWorkflowStaticData('node');
		let responseData;

		const now = DateTime.now().toISO();
		const startDate = (webhookData.lastTimeChecked as string) || now;
		const endDate = now;
		try {
			const pollStartDate = startDate;
			const pollEndDate = endDate;

			responseData = [{ json: {} }]; //await getPollResponse.call(this, pollStartDate, pollEndDate);

			if (!responseData?.length) {
				webhookData.lastTimeChecked = endDate;
				return null;
			}
		} catch (error) {
			if (this.getMode() === 'manual' || !webhookData.lastTimeChecked) {
				throw error;
			}
			const workflow = this.getWorkflow();
			const node = this.getNode();
			this.logger.error(
				`There was a problem in '${node.name}' node in workflow '${workflow.id}': '${error.description}'`,
				{
					node: node.name,
					workflowId: workflow.id,
					error,
				},
			);
		}

		webhookData.lastTimeChecked = endDate;

		if (Array.isArray(responseData) && responseData.length) {
			return [responseData];
		}

		return null;
	}
}

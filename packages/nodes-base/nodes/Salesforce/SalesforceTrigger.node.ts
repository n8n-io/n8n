import { DateTime } from 'luxon';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';
import type {
	IDataObject,
	IPollFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	JsonObject,
} from 'n8n-workflow';

import {
	getQuery,
	salesforceApiRequest,
	salesforceApiRequestAllItems,
	sortOptions,
	getPollStartDate,
	filterAndManageProcessedItems,
} from './GenericFunctions';

export class SalesforceTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Salesforce Trigger',
		name: 'salesforceTrigger',
		icon: 'file:salesforce.svg',
		group: ['trigger'],
		version: 1,
		description:
			'Fetches data from Salesforce and starts the workflow on specified polling intervals.',
		subtitle: '={{($parameter["triggerOn"])}}',
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
		outputs: [NodeConnectionTypes.Main],
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
					'Name of the custom object. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the custom objects recurrence instances to display them to user so that they can
			// select them easily
			async getCustomObjects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				// TODO: find a way to filter this object to get just the lead sources instead of the whole object
				const { sobjects: objects } = await salesforceApiRequest.call(this, 'GET', '/sobjects');
				for (const object of objects) {
					if (object.custom === true) {
						const objectName = object.label;
						const objectId = object.name;
						returnData.push({
							name: objectName,
							value: objectId,
						});
					}
				}
				sortOptions(returnData);
				return returnData;
			},
		},
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const workflowData: { processedIds?: string[]; lastTimeChecked?: string } =
			this.getWorkflowStaticData('node');
		let responseData;
		const qs: IDataObject = {};
		const triggerOn = this.getNodeParameter('triggerOn') as string;
		let triggerResource = triggerOn.slice(0, 1).toUpperCase() + triggerOn.slice(1, -7);
		const changeType = triggerOn.slice(-7);

		if (triggerResource === 'CustomObject') {
			triggerResource = this.getNodeParameter('customObject') as string;
		}

		const endDate = DateTime.now().toISO();

		if (!workflowData.processedIds) {
			workflowData.processedIds = [];
		}
		const processedIds = workflowData.processedIds;

		try {
			const pollStartDate = getPollStartDate(workflowData.lastTimeChecked);
			const pollEndDate = endDate;

			const options = {
				conditionsUi: {
					conditionValues: [] as IDataObject[],
				},
			};
			if (this.getMode() !== 'manual') {
				if (changeType === 'Created') {
					options.conditionsUi.conditionValues.push({
						field: 'CreatedDate',
						operation: '>=',
						value: pollStartDate,
					});
					options.conditionsUi.conditionValues.push({
						field: 'CreatedDate',
						operation: '<',
						value: pollEndDate,
					});
				} else {
					options.conditionsUi.conditionValues.push({
						field: 'LastModifiedDate',
						operation: '>=',
						value: pollStartDate,
					});
					options.conditionsUi.conditionValues.push({
						field: 'LastModifiedDate',
						operation: '<',
						value: pollEndDate,
					});
					// make sure the resource wasn't just created.
					options.conditionsUi.conditionValues.push({
						field: 'CreatedDate',
						operation: '<',
						value: pollStartDate,
					});
				}
			}

			try {
				if (this.getMode() === 'manual') {
					qs.q = getQuery(options, triggerResource, false, 1);
				} else {
					qs.q = getQuery(options, triggerResource, true);
				}
				responseData = await salesforceApiRequestAllItems.call(
					this,
					'records',
					'GET',
					'/query',
					{},
					qs,
				);
			} catch (error) {
				throw new NodeApiError(this.getNode(), error as JsonObject);
			}

			if (!responseData?.length) {
				workflowData.lastTimeChecked = endDate;
				return null;
			}

			const { newItems, updatedProcessedIds } = filterAndManageProcessedItems(
				responseData,
				processedIds,
			);

			workflowData.processedIds = updatedProcessedIds;
			workflowData.lastTimeChecked = endDate;

			if (newItems.length > 0) {
				return [this.helpers.returnJsonArray(newItems as IDataObject[])];
			}

			return null;
		} catch (error) {
			if (this.getMode() === 'manual' || !workflowData.lastTimeChecked) {
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
			throw error;
		}
	}
}

import {
	ICredentialDataDecryptedObject,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import {
	OnfleetAdmins,
	OnfleetCloneTask,
	OnfleetCloneTaskOptions,
	OnfleetDestination,
	OnfleetHubs,
	OnfleetListTaskFilters,
	OnfleetRecipient,
	OnfleetTask,
	OnfleetTaskComplete,
	OnfleetTaskUpdate,
	OnfleetTeamAutoDispatch,
	OnfleetTeams,
	OnfleetWebhook,
	OnfleetWorker,
	OnfleetWorkerEstimates,
	OnfleetWorkerFilter,
	OnfleetWorkerSchedule
} from './interfaces';
import { taskFields, taskOperations } from './descriptions/TaskDescription';

import { IExecuteFunctions } from 'n8n-core';
import { destinationFields, destinationOperations } from './descriptions/DestinationDescription';
import { onfleetApiRequest } from './GenericFunctions';
import { recipientFields, recipientOperations } from './descriptions/RecipientDescription';
import { organizationFields, organizationOperations } from './descriptions/OrganizationDescription';
import { adminFields, adminOperations } from './descriptions/AdministratorDescription';
import { hubFields, hubOperations } from './descriptions/HubDescription';
import { workerFields, workerOperations } from './descriptions/WorkerDescription';
import { webhookFields, webhookOperations } from './descriptions/WebhookDescription';
import { containerFields, containerOperations } from './descriptions/ContainerDescription';
import { teamFields, teamOperations } from './descriptions/TeamDescription';

export class Onfleet implements INodeType {
	description: INodeTypeDescription = {
			displayName: 'Onfleet',
			name: 'onfleet',
			icon: 'file:Onfleet.png',
			group: [ 'input' ],
			version: 1,
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Onfleet API',
			defaults: {
					name: 'Onfleet',
					color: '#AA81F3',
			},
			inputs: [ 'main' ],
			outputs: [ 'main' ],
			credentials: [
				{
					name: 'onfleetApi',
					required: true,
				},
			],
			properties: [
				// List of option resources
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					options: [
						{
							name: 'Admins',
							value: 'admins',
						},
						{
							name: 'Containers',
							value: 'containers',
						},
						{
							name: 'Destinations',
							value: 'destinations',
						},
						{
							name: 'Organization',
							value: 'organizations',
						},
						{
							name: 'Recipients',
							value: 'recipients',
						},
						{
							name: 'Tasks',
							value: 'tasks',
						},
						{
							name: 'Teams',
							value: 'teams',
						},
						{
							name: 'Workers',
							value: 'workers',
						},
						{
							name: 'Webhooks',
							value: 'webhooks',
						},
						{
							name: 'Hubs',
							value: 'hubs',
						},
					],
					default: 'tasks',
					description: 'The resource to perform operations on.',
				},
				// Operations
				...adminOperations,
				...recipientOperations,
				...taskOperations,
				...destinationOperations,
				...organizationOperations,
				...hubOperations,
				...workerOperations,
				...webhookOperations,
				...containerOperations,
				...teamOperations,
				// Display Fields
				...adminFields,
				...destinationFields,
				...recipientFields,
				...taskFields,
				...organizationFields,
				...hubFields,
				...workerFields,
				...webhookFields,
				...containerFields,
				...teamFields,
			],
	};

	/**
	 * Gets the properties of a destination according to the operation chose
	 * @param this Current node execution function
	 * @param item Current execution data
	 * @param operation Current destination opration
	 * @returns {OnfleetDestination} Destination information
	 */
	static getDestinationFields(this: IExecuteFunctions, item: number, operation: string) {
		if (['create', 'createBatch', 'update'].includes(operation)) {
			/* -------------------------------------------------------------------------- */
			/*             Get fields for create, createBatch and update task             */
			/* -------------------------------------------------------------------------- */
			const unparsed = this.getNodeParameter('unparsed', item) as boolean;
			const addDestinationFields = this.getNodeParameter('additionalDestinationFields', item) as IDataObject;
			let destination: OnfleetDestination;
			if (unparsed) {
				destination = {
					address: {
						unparsed: this.getNodeParameter('address', item) as string,
					},
				};
			} else {
				destination = {
					address: {
						number: this.getNodeParameter('addressNumber', item) as string,
						street: this.getNodeParameter('addressStreet', item) as string,
						city: this.getNodeParameter('addressCity', item) as string,
						country: this.getNodeParameter('addressCountry', item) as string,
					},
				};
			}

			// Adding destination extra fields
			if (addDestinationFields.addressName) {
				destination.address.name = addDestinationFields.addressName as string;
			}
			if (addDestinationFields.addressApartment) {
				destination.address.apartment = addDestinationFields.addressApartment as string;
			}
			if (addDestinationFields.addressState) {
				destination.address.state = addDestinationFields.addressState as string;
			}
			if (addDestinationFields.addressPostalCode) {
				destination.address.postalCode = addDestinationFields.addressPostalCode as string;
			}
			if (addDestinationFields.addressNotes) {
				destination.notes = addDestinationFields.addressNotes as string;
			}

			return destination;
		}
		return null;
	}

	/**
	 * Gets the properties of a administrator according to the operation chose
	 * @param this Current node execution function
	 * @param item Current execution data
	 * @param operation Current administrator opration
	 * @returns {OnfleetAdmins} Administrator information
	 */
	static getAdminFields(this: IExecuteFunctions, item: number, operation: string): OnfleetAdmins | null {
		if (operation === 'create') {
			/* -------------------------------------------------------------------------- */
			/*                         Get fields for create admin                        */
			/* -------------------------------------------------------------------------- */
			const name = this.getNodeParameter('name', item) as string;
			const email = this.getNodeParameter('email', item) as string;
			const additionalFields = this.getNodeParameter('additionalFields', item) as IDataObject;

			const adminData: OnfleetAdmins = { name, email };
			// Adding additional fields
			Object.assign(adminData, additionalFields);

			return adminData;
		} else if (operation === 'update') {
			/* -------------------------------------------------------------------------- */
			/*                         Get fields for update admin                        */
			/* -------------------------------------------------------------------------- */
			const additionalFields = this.getNodeParameter('additionalFields', item) as IDataObject;
			const adminData: OnfleetAdmins = {};
			// Adding additional fields
			Object.assign(adminData, additionalFields);
			return adminData;
		}
		return null;
	}

	/**
	 * Gets the properties of a hub according to the operation chose
	 * @param this Current node execution function
	 * @param item Current execution data
	 * @param operation Current hub opration
	 * @returns {OnfleetHub} Hub information
	 */
	 static getHubFields(this: IExecuteFunctions, item: number, operation: string): OnfleetHubs | null {
		if (operation === 'create') {
			/* -------------------------------------------------------------------------- */
			/*                          Get fields for create hub                         */
			/* -------------------------------------------------------------------------- */
			const destination = Onfleet.getDestinationFields.call(this, item, operation) as OnfleetDestination;
			const name = this.getNodeParameter('name', item) as string;
			const { teams } = this.getNodeParameter('additionalFields', item) as IDataObject;

			const hubData: OnfleetHubs = { name, ...destination };
			// Adding additional fields
			if (teams) {
				Object.assign(hubData, { teams: JSON.parse(teams as string) });
			}

			return hubData;
		} else if (operation === 'update') {
			/* -------------------------------------------------------------------------- */
			/*                          Get fields for update hub                         */
			/* -------------------------------------------------------------------------- */
			const destination = Onfleet.getDestinationFields.call(this, item, operation) as OnfleetDestination;
			const hubData: OnfleetHubs = { ...destination };

			// Adding additional fields
			const {teams, ...additionalFields} = this.getNodeParameter('additionalFields', item) as IDataObject;
			if (teams) {
				Object.assign(hubData, { teams: JSON.parse(teams as string) });
			}
			Object.assign(hubData, additionalFields);
			return hubData;
		}
		return null;
	}

	/**
	 * Gets the properties of a worker according to the operation chose
	 * @param this Current node execution function
	 * @param item Current execution data
	 * @param operation Current worker opration
	 * @returns {OnfleetWorker|OnfleetWorkerFilter|OnfleetWorkerSchedule} Worker information
	 */
	 static getWorkerFields(this: IExecuteFunctions, item: number, operation: string): OnfleetWorker | OnfleetWorkerFilter | OnfleetWorkerSchedule | null {
		if (operation === 'create') {
			/* -------------------------------------------------------------------------- */
			/*                        Get fields for create worker                        */
			/* -------------------------------------------------------------------------- */
			const name = this.getNodeParameter('name', item) as string;
			const phone = this.getNodeParameter('phone', item) as string;
			const teams = JSON.parse(this.getNodeParameter('teams', item) as string) as string[];
			const vehicle = this.getNodeParameter('vehicle', item) as boolean;
			const workerData: OnfleetWorker = { name, phone, teams };

			// Addding vehicule fields
			if (vehicle) {
				const type = this.getNodeParameter('type', item) as string;
				const additionalVehicleFields = this.getNodeParameter('additionalVehicleFields', item) as IDataObject;
				Object.assign(workerData, { vehicle: { type, ...additionalVehicleFields} });
			}

			// Adding additional fields
			const additionalFields = this.getNodeParameter('additionalFields', item) as IDataObject;
			Object.assign(workerData, additionalFields);

			return workerData;
		} else if (operation === 'update') {
			/* -------------------------------------------------------------------------- */
			/*                        Get fields for update worker                        */
			/* -------------------------------------------------------------------------- */
			const vehicle = this.getNodeParameter('vehicle', item) as boolean;
			const workerData: OnfleetWorker = {};

			// Addding vehicule fields
			if (vehicle) {
				const type = this.getNodeParameter('type', item) as string;
				const additionalVehicleFields = this.getNodeParameter('additionalVehicleFields', item) as IDataObject;
				Object.assign(workerData, { vehicle: { type, ...additionalVehicleFields} });
			}

			// Adding additional fields
			const {teams, ...additionalFields} = this.getNodeParameter('additionalFields', item) as IDataObject;
			Object.assign(workerData, additionalFields);
			if (teams) {
				workerData.teams = JSON.parse(teams as string);
			}

			return workerData;
		} else if (['getAll', 'get'].includes(operation)) {
			/* -------------------------------------------------------------------------- */
			/*                    Get fields for get and getAll workers                   */
			/* -------------------------------------------------------------------------- */
				const additionalFields = this.getNodeParameter('additionalFields', item) as IDataObject;
				const workerFilter: OnfleetWorkerFilter = {};
				if (additionalFields.states) {
					additionalFields.states = (additionalFields.states as number[]).join(',');
				}
				Object.assign(workerFilter, additionalFields);
				return workerFilter;
		} else if (operation === 'setSchedule') {
			/* -------------------------------------------------------------------------- */
			/*                    Get fields for setSchedule to worker                    */
			/* -------------------------------------------------------------------------- */
			const scheduleDate = new Date(this.getNodeParameter('date', item) as Date);
			const timezone = this.getNodeParameter('timezone', item) as string;
			const start = new Date(this.getNodeParameter('start', item) as Date);
			const end = new Date(this.getNodeParameter('end', item) as Date);
			const datestring = scheduleDate.getFullYear()
				+ '-' + (scheduleDate.getMonth() + 1).toString().padStart(2, '0')
				+ '-' + scheduleDate.getDate().toString().padStart(2, '0');
			const workerSchedule: OnfleetWorkerSchedule = {
				entries: [
					{
						date: datestring,
						timezone,
						shifts: [[
							start.getTime(), end.getTime(),
						]],
					},
				],
			};
			return workerSchedule;
		}
		return null;
	}

	/**
	 * Gets the properties of a webhooks according to the operation chose
	 * @param this Current node execution function
	 * @param item Current execution data
	 * @param operation Current webhooks opration
	 * @returns {OnfleetWebhook} Webhooks information
	 */
	 static getWebhookFields(this: IExecuteFunctions, item: number, operation: string): OnfleetWebhook | null {
		if (operation === 'create') {
			/* -------------------------------------------------------------------------- */
			/*                        Get fields for create webhook                       */
			/* -------------------------------------------------------------------------- */
			const url = this.getNodeParameter('url', item) as string;
			const name = this.getNodeParameter('name', item) as string;
			const trigger = this.getNodeParameter('trigger', item) as number;
			const additionalFields = this.getNodeParameter('additionalFields', item) as IDataObject;

			const webhookData: OnfleetWebhook = { url, name, trigger };
			// Adding additional fields
			Object.assign(webhookData, additionalFields);

			return webhookData;
		}
		return null;
	}

	/**
	 * Gets the properties of a recipient according to the operation chose
	 * @param this Current node execution function
	 * @param item Current execution data
	 * @param operation Current recipient opration
	 * @returns {OnfleetRecipient} Recipient information
	 */
	static getRecipientFields(this: IExecuteFunctions, item: number, operation: string) {
		if (['create', 'createBatch'].includes(operation)) {
			/* -------------------------------------------------------------------------- */
			/*                       Get fields to create recipient                       */
			/* -------------------------------------------------------------------------- */
			const addRecipientFields = this.getNodeParameter('additionalRecipientFields', item) as IDataObject;
			const recipient: OnfleetRecipient = {
				name: this.getNodeParameter('recipientName', item) as string,
				phone: this.getNodeParameter('recipientPhone', item) as string,
			};

			// Adding recipient extra fields
			if (addRecipientFields.recipientNotes) {
				recipient.notes = addRecipientFields.recipientNotes as string;
			}
			if (addRecipientFields.skipSMSNotifications) {
				recipient.skipSMSNotifications = addRecipientFields.skipSMSNotifications as boolean;
			}
			if (addRecipientFields.skipPhoneNumberValidation) {
				recipient.skipPhoneNumberValidation = addRecipientFields.skipPhoneNumberValidation as boolean;
			}

			return recipient;
		} else if (operation === 'update') {
			/* -------------------------------------------------------------------------- */
			/*                       Get fields to update recipient                       */
			/* -------------------------------------------------------------------------- */
			const {
				recipientName: name = '', recipientPhone: phone = '', ...additionalFields
			} = this.getNodeParameter('additionalFields', item) as IDataObject;

			const recipientData: OnfleetRecipient = {};

			// Adding additional fields
			if (name) {
				recipientData.name = name as string;
			}
			if (phone) {
				recipientData.phone = phone as string;
			}
			Object.assign(recipientData, additionalFields);
			return recipientData;
		}
	}

	/**
	 * Gets the properties of a task according to the operation chose
	 * @param this Current node execution function
	 * @param items Current execution data
	 * @param operation Current task operation
	 * @returns {OnfleetListTaskFilters | OnfleetTask } Task information
	 */
	static getTaskFields(this: IExecuteFunctions, item: number, operation: string):
		OnfleetListTaskFilters | OnfleetTask | OnfleetCloneTask | OnfleetTaskComplete | OnfleetTaskUpdate | null  {
		if (['create', 'createBatch'].includes(operation)) {
			/* -------------------------------------------------------------------------- */
			/*                 Get fields to create and createBatch tasks                 */
			/* -------------------------------------------------------------------------- */
			const additionalFields = this.getNodeParameter('additionalFields', item) as IDataObject;
			const destination = Onfleet.getDestinationFields.call(this, item, operation) as OnfleetDestination;

			// Adding recipients information
			const hasRecipient = this.getNodeParameter('recipient', item) as boolean;
			const recipients: OnfleetRecipient[] = [];
			if (hasRecipient) {
				const recipient = Onfleet.getRecipientFields.call(this, item, operation) as OnfleetRecipient;
				recipients.push(recipient);
			}

			const taskData: OnfleetTask = { destination, recipients };
			const { completeAfter = null, completeBefore = null, ...extraFields } = additionalFields;
			if (completeAfter) taskData.completeAfter = new Date(completeAfter as Date).getTime();
			if (completeBefore) taskData.completeBefore = new Date(completeBefore as Date).getTime();

			Object.assign(taskData, extraFields);
			return taskData;
		} else if (operation === 'update') {
			/* -------------------------------------------------------------------------- */
			/*                          Get fields to update task                         */
			/* -------------------------------------------------------------------------- */
			const additionalFields = this.getNodeParameter('additionalFields', item) as IDataObject;
			const taskData: OnfleetTaskUpdate = {};
			const { completeAfter = null, completeBefore = null, ...extraFields } = additionalFields;
			if (completeAfter) taskData.completeAfter = new Date(completeAfter as Date).getTime();
			if (completeBefore) taskData.completeBefore = new Date(completeBefore as Date).getTime();
			Object.assign(taskData, extraFields);
			return taskData;
		} else if (operation === 'clone') {
			/* -------------------------------------------------------------------------- */
			/*                          Get fields to clone task                          */
			/* -------------------------------------------------------------------------- */
			const optionFields = this.getNodeParameter('options', item) as IDataObject;

			const options: OnfleetCloneTaskOptions = {};
			if (optionFields.includeMetadata)  options.includeMetadata = optionFields.includeMetadata as boolean;
			if (optionFields.includeBarcodes)  options.includeBarcodes = optionFields.includeBarcodes as boolean;
			if (optionFields.includeDependencies)  options.includeDependencies = optionFields.includeDependencies as boolean;
			if (optionFields.overrides)  options.overrides = optionFields.overrides as object;
			return { options } as OnfleetCloneTask;
		} else if (operation === 'getAll') {
			/* -------------------------------------------------------------------------- */
			/*                          Get fields to list tasks                          */
			/* -------------------------------------------------------------------------- */
			const additionalFields = this.getNodeParameter('additionalFields', item) as IDataObject;
			const listTaskData: OnfleetListTaskFilters = {
				from: new Date(this.getNodeParameter('from', 0) as Date).getTime(),
			};

			// Adding extra fields to search tasks
			if (additionalFields.to) {
				listTaskData.to = new Date(additionalFields.to as Date).getTime();
			}
			if (additionalFields.state) {
				listTaskData.state = (additionalFields.state as number[]).join(',');
			}
			if (additionalFields.lastId) {
				listTaskData.lastId = additionalFields.lastId as string;
			}

			return listTaskData;
		} else if (operation === 'complete')  {
			/* -------------------------------------------------------------------------- */
			/*                        Get fields to complete a task                       */
			/* -------------------------------------------------------------------------- */
			const additionalFields = this.getNodeParameter('additionalFields', item) as IDataObject;
			const success = this.getNodeParameter('success', item) as boolean;
			const taskData: OnfleetTaskComplete = { completionDetails: { success } };
			if (additionalFields.notes) taskData.completionDetails.notes = additionalFields.notes as string;
			return taskData;
		}
		return null;
	}

	/**
	 * Gets the properties of a team according to the operation chose
	 * @param this Current node execution function
	 * @param item Current execution data
	 * @param operation Current team opration
	 * @returns {OnfleetTeams} Team information
	 */
	 static getTeamFields(this: IExecuteFunctions, item: number, operation: string): OnfleetTeams | OnfleetWorkerEstimates | OnfleetTeamAutoDispatch | null {
		if (operation === 'create') {
			/* -------------------------------------------------------------------------- */
			/*                         Get fields to create a team                        */
			/* -------------------------------------------------------------------------- */
			const name = this.getNodeParameter('name', item) as string;
			const workers = this.getNodeParameter('workers', item) as string;
			const managers = this.getNodeParameter('managers', item) as string;
			const additionalFields = this.getNodeParameter('additionalFields', item) as IDataObject;

			const teamData: OnfleetTeams = { name, workers: JSON.parse(workers), managers: JSON.parse(managers) };
			// Adding additional fields
			Object.assign(teamData, additionalFields);

			return teamData;
		} else if (operation === 'update') {
			/* -------------------------------------------------------------------------- */
			/*                         Get fields to update a team                        */
			/* -------------------------------------------------------------------------- */
			const teamData: OnfleetTeams = {};
			// Adding additional fields
			const {workers, managers, ...additionalFields} = this.getNodeParameter('additionalFields', item) as IDataObject;
			if (workers) {
				Object.assign(teamData, { workers: JSON.parse(workers as string) });
			}
			if (managers) {
				Object.assign(teamData, { managers: JSON.parse(managers as string) });
			}
			Object.assign(teamData, additionalFields);
			return teamData;
		} else if (operation === 'getTimeEstimates') {
			/* -------------------------------------------------------------------------- */
			/*      Get driver time estimates for tasks that haven't been created yet     */
			/* -------------------------------------------------------------------------- */
			const dropoff = this.getNodeParameter('dropoff', item) as boolean;
			const pickup = this.getNodeParameter('pickup', item) as boolean;
			if (!dropoff && !pickup) throw new Error('At least 1 of dropoffLocation or pickupLocation must be selected');
			const longitudeField = `${dropoff ? 'dropoff' : 'pickup'}Longitude`;
			const latitudeField = `${dropoff ? 'dropoff' : 'pickup'}Latitude`;
			const longitude = this.getNodeParameter(longitudeField, item) as string;
			const latitude = this.getNodeParameter(latitudeField, item) as string;

			const wokrerTimeEstimates = {} as OnfleetWorkerEstimates;
			if (pickup) {
				wokrerTimeEstimates.pickupLocation = `${longitude},${latitude}`;
				wokrerTimeEstimates.pickupTime = (new Date(this.getNodeParameter('pickupTime', item) as Date)).getTime() / 1000;
			}
			if(dropoff) {
				wokrerTimeEstimates.dropoffLocation = `${longitude},${latitude}`;
			}

			const additionalFields = this.getNodeParameter('additionalFields', item) as IDataObject;
			Object.assign(wokrerTimeEstimates, additionalFields);
			return wokrerTimeEstimates;
		} else if (operation === 'autoDispatch') {
			/* -------------------------------------------------------------------------- */
			/*                  Dynamically dispatching tasks on the fly                  */
			/* -------------------------------------------------------------------------- */
			const teamAutoDispatch = {} as OnfleetTeamAutoDispatch;
			const {
				taskTimeWindow, scheduleTimeWindow, ...additionalFields
			} = this.getNodeParameter('additionalFields', item) as IDataObject;
			if (taskTimeWindow) {
				teamAutoDispatch.taskTimeWindow= JSON.parse((taskTimeWindow as string));
			}
			if (scheduleTimeWindow) {
				teamAutoDispatch.scheduleTimeWindow= JSON.parse((scheduleTimeWindow as string));
			}

			Object.assign(teamAutoDispatch, additionalFields);
			return teamAutoDispatch;
		}
		return null;
	}

	/**
	 * Execute the task operations
	 * @param this Execute function
	 * @param resource Resource to be executed (Task)
	 * @param operation Operation to be executed
	 * @param items Number of items to process by the node
	 * @param encodedApiKey API KEY for the current organization
	 * @returns Task information
	 */
	static async executeTaskOperations(
		this: IExecuteFunctions,
		resource: string,
		operation: string,
		items: INodeExecutionData[],
		encodedApiKey: string,
		): Promise<IDataObject | IDataObject[]> {
		if (operation === 'createBatch') {
			/* -------------------------------------------------------------------------- */
			/*                       Create multiple tasks by batch                       */
			/* -------------------------------------------------------------------------- */
			const path = `${resource}/batch`;
			const tasksData = { tasks: items.map((_item, index) => Onfleet.getTaskFields.call(this, index, operation)) };
			const { tasks: tasksCreated } = await onfleetApiRequest.call(this, 'POST', encodedApiKey, path, tasksData);
			return tasksCreated;
		}

		const responseData = [];
		for (const key of Object.keys(items)) {
			const index = Number(key);
			try {
				if (operation === 'create') {
					/* -------------------------------------------------------------------------- */
					/*                              Create a new task                             */
					/* -------------------------------------------------------------------------- */
					const taskData = Onfleet.getTaskFields.call(this, index, operation);
					if (!taskData) { continue ;}
					responseData.push(await onfleetApiRequest.call(this, 'POST', encodedApiKey, resource, taskData));
				} else if (operation === 'get') {
					/* -------------------------------------------------------------------------- */
					/*                              Get a single task                             */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const shortId = this.getNodeParameter('shortId', index) as boolean;
					const path = `${resource}${(shortId ? '/shortId' : '')}/${id}`;
					responseData.push(await onfleetApiRequest.call(this, 'GET', encodedApiKey, path));
				} else if (operation === 'clone') {
					/* -------------------------------------------------------------------------- */
					/*                                Clone a task                                */
					/* -------------------------------------------------------------------------- */
						const id = this.getNodeParameter('id', index) as string;
						const taskData = Onfleet.getTaskFields.call(this, index, operation);
						if (!taskData)  { continue; }
						const path = `${resource}/${id}/clone`;
						responseData.push(await onfleetApiRequest.call(this, 'POST', encodedApiKey, path, taskData));
				} else if (operation === 'delete') {
					/* -------------------------------------------------------------------------- */
					/*                            Delete a single task                            */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const path = `${resource}/${id}`;
					responseData.push(await onfleetApiRequest.call(this, 'DELETE', encodedApiKey, path));
				} else if (operation === 'getAll') {
					/* -------------------------------------------------------------------------- */
					/*                                Get all tasks                               */
					/* -------------------------------------------------------------------------- */
					const taskData = Onfleet.getTaskFields.call(this, 0, operation) as IDataObject;
					if (!taskData) return [];

					const path = `${resource}/all`;
					const { tasks = [] } = await onfleetApiRequest.call(this, 'GET', encodedApiKey, path, {}, taskData);
					responseData.push(...tasks);
				} else if (operation === 'complete') {
					/* -------------------------------------------------------------------------- */
					/*                            Force complete a task                           */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const taskData = Onfleet.getTaskFields.call(this, index, operation);
					if (!taskData) { continue; }
					const path = `${resource}/${id}/complete`;
					responseData.push(await onfleetApiRequest.call(this, 'POST', encodedApiKey, path, taskData));
				} else if (operation === 'update') {
					/* -------------------------------------------------------------------------- */
					/*                                Update a task                               */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', 0) as string;
					const path = `${resource}/${id}`;
					const taskData = Onfleet.getTaskFields.call(this, index, operation);
					if (!taskData) { continue; }
					responseData.push(await onfleetApiRequest.call(this, 'PUT', encodedApiKey, path, taskData));
				}
			} catch (error) {
				if (this.continueOnFail()) {
					responseData.push({ error: (error as IDataObject).toString() });
				}
				continue;
			}
		}
		return responseData;
	}

	/**
	 * Execute the destination operations
	 * @param this Execute function
	 * @param resource Resource to be executed (Destination)
	 * @param operation Operation to be executed
	 * @param items Number of items to process by the node
	 * @param encodedApiKey API KEY for the current organization
	 * @returns Destination information
	 */
	static async executeDestinationOperations(
		this: IExecuteFunctions,
		resource: string,
		operation: string,
		items: INodeExecutionData[],
		encodedApiKey: string,
		): Promise<IDataObject | IDataObject[]> {
		const responseData = [];
		for (const key of Object.keys(items)) {
			const index = Number(key);
			try {
				if (operation === 'create') {
					/* -------------------------------------------------------------------------- */
					/*                             Create destiantion                             */
					/* -------------------------------------------------------------------------- */
					const destinationData = Onfleet.getDestinationFields.call(this, index, operation);
					if (!destinationData) { continue; }
					responseData.push(await onfleetApiRequest.call(this, 'POST', encodedApiKey, resource, destinationData));
				} else if (operation === 'get') {
					/* -------------------------------------------------------------------------- */
					/*                           Get single destination                           */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const path = `${resource}/${id}`;
					responseData.push(await onfleetApiRequest.call(this, 'GET', encodedApiKey, path));
				}
			} catch (error) {
				if (this.continueOnFail()) {
					responseData.push({ error: (error as IDataObject).toString() });
				}
				continue;
			}
		}

		return responseData;
	}

	/**
	 * Execute the organization operations
	 * @param this Execute function
	 * @param resource Resource to be executed (Organization)
	 * @param operation Operation to be executed
	 * @param items Number of items to process by the node
	 * @param encodedApiKey API KEY for the current organization
	 * @returns Organization information
	 */
	 static async executeOrganizationOperations(
		this: IExecuteFunctions,
		resource: string,
		operation: string,
		items: INodeExecutionData[],
		encodedApiKey: string,
		): Promise<IDataObject | IDataObject[]> {
		const responseData = [];
		for (const key of Object.keys(items)) {
			const index = Number(key);
			try {
				if (operation === 'get') {
					/* -------------------------------------------------------------------------- */
					/*                          Get organization details                          */
					/* -------------------------------------------------------------------------- */
					const path = 'organization';
					responseData.push(await onfleetApiRequest.call(this, 'GET', encodedApiKey, path));
				} else if (operation === 'getDelegatee') {
					/* -------------------------------------------------------------------------- */
					/*                         Get organization delegatee                         */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const path = `${resource}/${id}`;
					responseData.push(await  onfleetApiRequest.call(this, 'GET', encodedApiKey, path));
				}
			} catch (error) {
				if (this.continueOnFail()) {
					responseData.push({ error: (error as IDataObject).toString() });
				}
				continue;
			}
		}

		return responseData;
	}

	/**
	 * Execute the recipient operations
	 * @param this Execute function
	 * @param resource Resource to be executed (Recipient)
	 * @param operation Operation to be executed
	 * @param items Number of items to process by the node
	 * @param encodedApiKey API KEY for the current organization
	 * @returns Recipient information
	 */
	static async executeRecipientOperations(this: IExecuteFunctions,
		resource: string,
		operation: string,
		items: INodeExecutionData[],
		encodedApiKey: string,
		): Promise<IDataObject | IDataObject[]> {
		const responseData = [];
		for (const key of Object.keys(items)) {
			const index = Number(key);
			try {
				if (operation === 'create') {
					/* -------------------------------------------------------------------------- */
					/*                           Create a new recipient                           */
					/* -------------------------------------------------------------------------- */
					const recipientData = Onfleet.getRecipientFields.call(this, index, operation);
					if (!recipientData) { continue; }
					responseData.push(await onfleetApiRequest.call(this, 'POST', encodedApiKey, resource, recipientData));
				} else if (operation === 'update') {
					/* -------------------------------------------------------------------------- */
					/*                             Update a recipient                             */
					/* -------------------------------------------------------------------------- */
					const recipientData = Onfleet.getRecipientFields.call(this, index, operation);
					if (!recipientData) { continue; }
					const id = this.getNodeParameter('id', index) as string;
					const path = `${resource}/${id}`;
					responseData.push(await onfleetApiRequest.call(this, 'PUT', encodedApiKey, path, recipientData));
				} else if (operation === 'get') {
					/* -------------------------------------------------------------------------- */
					/*                          Get recipient information                         */
					/* -------------------------------------------------------------------------- */
					const lookupBy = this.getNodeParameter('getBy', index) as string;
					const lookupByValue = this.getNodeParameter(lookupBy, index) as string;
					const path = `${resource}${lookupBy === 'id' ? '' : ('/' + lookupBy)}/${lookupByValue}`;
					responseData.push(await onfleetApiRequest.call(this, 'GET', encodedApiKey, path));
				}
			} catch (error) {
				if (this.continueOnFail()) {
					responseData.push({ error: (error as IDataObject).toString() });
				}
				continue;
			}
		}

		return responseData;
	}

	/**
	 * Execute the administrator operations
	 * @param this Execute function
	 * @param resource Resource to be executed (Administrator)
	 * @param operation Operation to be executed
	 * @param items Number of items to process by the node
	 * @param encodedApiKey API KEY for the current organization
	 * @returns Administrator information
	 */
	 static async executeAdministratorOperations(
		this: IExecuteFunctions,
		resource: string,
		operation: string,
		items: INodeExecutionData[],
		encodedApiKey: string,
		): Promise<IDataObject | IDataObject[]> {
		const responseData = [];
		for (const key of Object.keys(items)) {
			const index = Number(key);
			try {
				if (operation === 'getAll') {
					/* -------------------------------------------------------------------------- */
					/*                             Get administrators                             */
					/* -------------------------------------------------------------------------- */
					responseData.push(...await onfleetApiRequest.call(this, 'GET', encodedApiKey, resource));
				} else if (operation === 'create') {
					/* -------------------------------------------------------------------------- */
					/*                             Create a new admin                             */
					/* -------------------------------------------------------------------------- */
					const adminData = Onfleet.getAdminFields.call(this, index, operation);
					responseData.push(await onfleetApiRequest.call(this, 'POST', encodedApiKey, resource, adminData));
				} else if (operation === 'update') {
					/* -------------------------------------------------------------------------- */
					/*                                Update admin                                */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const adminData = Onfleet.getAdminFields.call(this, index, operation);
					const path = `${resource}/${id}`;
					responseData.push(await onfleetApiRequest.call(this, 'PUT', encodedApiKey, path, adminData));
				} else if (operation === 'delete') {
					/* -------------------------------------------------------------------------- */
					/*                                Delete admin                                */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const path = `${resource}/${id}`;
					responseData.push(await onfleetApiRequest.call(this, 'DELETE', encodedApiKey, path));
				}
			} catch (error) {
				if (this.continueOnFail()) {
					responseData.push({ error: (error as IDataObject).toString() });
				}
				continue;
			}
		}

		return responseData;
	}

	/**
	 * Execute the hub operations
	 * @param this Execute function
	 * @param resource Resource to be executed (Hub)
	 * @param operation Operation to be executed
	 * @param items Number of items to process by the node
	 * @param encodedApiKey API KEY for the current organization
	 * @returns Hub information
	 */
	 static async executeHubOperations(
		this: IExecuteFunctions,
		resource: string,
		operation: string,
		items: INodeExecutionData[],
		encodedApiKey: string,
		): Promise<IDataObject | IDataObject[]> {
		const responseData = [];
		for (const key of Object.keys(items)) {
			const index = Number(key);
			try {
				if (operation === 'getAll') {
					/* -------------------------------------------------------------------------- */
					/*                                Get all hubs                                */
					/* -------------------------------------------------------------------------- */
					responseData.push(...await onfleetApiRequest.call(this, 'GET', encodedApiKey, resource));
				} else if (operation === 'create') {
					/* -------------------------------------------------------------------------- */
					/*                              Create a new hub                              */
					/* -------------------------------------------------------------------------- */
					const hubData = Onfleet.getHubFields.call(this, index, operation);
					responseData.push(await onfleetApiRequest.call(this, 'POST', encodedApiKey, resource, hubData));
				}
				if (operation === 'update') {
					/* -------------------------------------------------------------------------- */
					/*                                Update a hub                                */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const hubData = Onfleet.getHubFields.call(this, index, operation);
					const path = `${resource}/${id}`;
					responseData.push(await onfleetApiRequest.call(this, 'PUT', encodedApiKey, path, hubData));
				}
			} catch (error) {
				if (this.continueOnFail()) {
					responseData.push({ error: (error as IDataObject).toString() });
				}
				continue;
			}
		}

		return responseData;
	}

	/**
	 * Execute the worker operations
	 * @param this Execute function
	 * @param resource Resource to be executed (Worker)
	 * @param operation Operation to be executed
	 * @param items Number of items to process by the node
	 * @param encodedApiKey API KEY for the current organization
	 * @returns Workers information
	 */
	 static async executeWorkerOperations(
		this: IExecuteFunctions,
		resource: string,
		operation: string,
		items: INodeExecutionData[],
		encodedApiKey: string,
		): Promise<IDataObject | IDataObject[]> {
		const responseData = [];
		for (const key of Object.keys(items)) {
			const index = Number(key);
			try {
				if (operation === 'getAll') {
					/* -------------------------------------------------------------------------- */
					/*                               Get all workers                              */
					/* -------------------------------------------------------------------------- */
					const workerFilters = Onfleet.getWorkerFields.call(this, 0, operation) as OnfleetWorkerFilter;

					responseData.push(... await onfleetApiRequest.call(this, 'GET', encodedApiKey, resource, {}, workerFilters));
				} else if (operation === 'get') {
					/* -------------------------------------------------------------------------- */
					/*                                Get a worker                                */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const workerFilters = Onfleet.getWorkerFields.call(this, index, operation) as OnfleetWorkerFilter;
					const analytics = this.getNodeParameter('analytics', index) as boolean;

					const path = `${resource}/${id}`;
					workerFilters.analytics = analytics ? 'true' : 'false';
					responseData.push(await onfleetApiRequest.call(this, 'GET', encodedApiKey, path, {}, workerFilters));
				} else if (operation === 'create') {
					/* -------------------------------------------------------------------------- */
					/*                             Create a new worker                            */
					/* -------------------------------------------------------------------------- */
					const workerData = Onfleet.getWorkerFields.call(this, index, operation);
					responseData.push(await onfleetApiRequest.call(this, 'POST', encodedApiKey, resource, workerData));
				} else if (operation === 'update') {
					/* -------------------------------------------------------------------------- */
					/*                                Update worker                               */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const workerData = Onfleet.getWorkerFields.call(this, index, operation);
					const path = `${resource}/${id}`;
					responseData.push(await onfleetApiRequest.call(this, 'PUT', encodedApiKey, path, workerData));
				} else if (operation === 'delete') {
					/* -------------------------------------------------------------------------- */
					/*                                Delete worker                               */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const path = `${resource}/${id}`;
					responseData.push(await onfleetApiRequest.call(this, 'DELETE', encodedApiKey, path));
				} else if (operation === 'getSchedule') {
					/* -------------------------------------------------------------------------- */
					/*                             Get worker schedule                            */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const path = `${resource}/${id}/schedule`;
					responseData.push(await onfleetApiRequest.call(this, 'GET', encodedApiKey, path));
				} else if (operation === 'getAllByLocation') {
					/* -------------------------------------------------------------------------- */
					/*                             Get worker location                            */
					/* -------------------------------------------------------------------------- */
					const longitude = this.getNodeParameter('longitude', index) as string;
					const latitude = this.getNodeParameter('latitude', index) as number;
					const additionalFields = this.getNodeParameter('additionalFields', index) as IDataObject;
					const path = `${resource}/location`;
					const { workers } = await onfleetApiRequest.call(this, 'GET', encodedApiKey, path, {}, { longitude, latitude });
					responseData.push(...workers);
				} else if (operation === 'setSchedule') {
					/* -------------------------------------------------------------------------- */
					/*                            Set a worker schedule                           */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const workerSchedule = Onfleet.getWorkerFields.call(this, index, operation) as OnfleetWorkerSchedule;
					const path = `${resource}/${id}/schedule`;
					responseData.push(await onfleetApiRequest.call(this, 'POST', encodedApiKey, path, workerSchedule));
				}
			} catch (error) {
				if (this.continueOnFail()) {
					responseData.push({ error: (error as IDataObject).toString() });
				}
				continue;
			}
		}

		return responseData;
	}

	/**
	 * Execute the webhook operations
	 * @param this Execute function
	 * @param resource Resource to be executed (Webhook)
	 * @param operation Operation to be executed
	 * @param items Number of items to process by the node
	 * @param encodedApiKey API KEY for the current organization
	 * @returns Webhook information
	 */
	 static async executeWebhookOperations(
		this: IExecuteFunctions,
		resource: string,
		operation: string,
		items: INodeExecutionData[],
		encodedApiKey: string,
		): Promise<IDataObject | IDataObject[]> {
		const responseData = [];
		for (const key of Object.keys(items)) {
			const index = Number(key);
			try {
				if (operation === 'getAll') {
					/* -------------------------------------------------------------------------- */
					/*                              Get all webhooks                              */
					/* -------------------------------------------------------------------------- */
					responseData.push(...await onfleetApiRequest.call(this, 'GET', encodedApiKey, resource));
				} else if (operation === 'create') {
					/* -------------------------------------------------------------------------- */
					/*                            Create a new webhook                            */
					/* -------------------------------------------------------------------------- */
					const webhookData = Onfleet.getWebhookFields.call(this, index, operation);
					responseData.push(await onfleetApiRequest.call(this, 'POST', encodedApiKey, resource, webhookData));
				} else if (operation === 'delete') {
					/* -------------------------------------------------------------------------- */
					/*                              Delete a webhook                              */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const path = `${resource}/${id}`;
					responseData.push(await onfleetApiRequest.call(this, 'DELETE', encodedApiKey, path));
				}
			} catch (error) {
				if (this.continueOnFail()) {
					responseData.push({ error: (error as IDataObject).toString() });
				}
				continue;
			}
		}

		return responseData;
	}

	/**
	 * Execute the containers operations
	 * @param this Execute function
	 * @param resource Resource to be executed (Container)
	 * @param operation Operation to be executed
	 * @param items Number of items to process by the node
	 * @param encodedApiKey API KEY for the current organization
	 * @returns Contianer information
	 */
	 static async executeContainerOperations(
		this: IExecuteFunctions,
		resource: string,
		operation: string,
		items: INodeExecutionData[],
		encodedApiKey: string,
		): Promise<IDataObject | IDataObject[]> {
		const responseData = [];
		for (const key of Object.keys(items)) {
			const index = Number(key);
			try {
				if (operation === 'get') {
					/* -------------------------------------------------------------------------- */
					/*                        Get container by id and type                        */
					/* -------------------------------------------------------------------------- */
					const containerId = this.getNodeParameter('containerId', index) as string;
					const containerType = this.getNodeParameter('containerType', index) as string;
					const path = `${resource}/${containerType}/${containerId}`;
					responseData.push(await onfleetApiRequest.call(this, 'GET', encodedApiKey, path));
				} else if (['add', 'update'].includes(operation)) {
					/* -------------------------------------------------------------------------- */
					/*                      Add or update tasks to container                      */
					/* -------------------------------------------------------------------------- */
					const containerId = this.getNodeParameter('containerId', index) as string;
					const containerType = this.getNodeParameter('containerType', index) as string;
					const considerDependencies = this.getNodeParameter('considerDependencies', index) as boolean;

					const tasks = JSON.parse(this.getNodeParameter('tasks', index) as string) as Array<string|number>;
					if (operation === 'add') {
						const type = this.getNodeParameter('type', index) as number;
						if (type === 1) {
							const tasksIndex = this.getNodeParameter('index', index) as number;
							tasks.unshift(tasksIndex);
						} else {
							tasks.unshift(type);
						}
					}
					const path = `${resource}/${containerType}/${containerId}`;
					responseData.push(
						await onfleetApiRequest.call(this, 'PUT', encodedApiKey, path, { tasks, considerDependencies }),
					);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					responseData.push({ error: (error as IDataObject).toString() });
				}
				continue;
			}
		}

		return responseData;
	}

	/**
	 * Execute the team operations
	 * @param this Execute function
	 * @param resource Resource to be executed (Team)
	 * @param operation Operation to be executed
	 * @param items Number of items to process by the node
	 * @param encodedApiKey API KEY for the current organization
	 * @returns Team information
	 */
	 static async executeTeamOperations(
		this: IExecuteFunctions,
		resource: string,
		operation: string,
		items: INodeExecutionData[],
		encodedApiKey: string,
		): Promise<IDataObject | IDataObject[]> {
		const responseData = [];
		for (const key of Object.keys(items)) {
			const index = Number(key);
			try {
				if (operation === 'getAll') {
					/* -------------------------------------------------------------------------- */
					/*                                Get all teams                               */
					/* -------------------------------------------------------------------------- */
					responseData.push(...await onfleetApiRequest.call(this, 'GET', encodedApiKey, resource));
				} else if (operation === 'get') {
					/* -------------------------------------------------------------------------- */
					/*                              Get a single team                             */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const path = `${resource}/${id}`;
					responseData.push(await onfleetApiRequest.call(this, 'GET', encodedApiKey, path));
				} else if (operation === 'create') {
					/* -------------------------------------------------------------------------- */
					/*                              Create a new team                             */
					/* -------------------------------------------------------------------------- */
					const teamData = Onfleet.getTeamFields.call(this, index, operation);
					responseData.push(await onfleetApiRequest.call(this, 'POST', encodedApiKey, resource, teamData));
				} else if (operation === 'update') {
					/* -------------------------------------------------------------------------- */
					/*                                Update a team                               */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const teamData = Onfleet.getTeamFields.call(this, index, operation);
					const path = `${resource}/${id}`;
					responseData.push(await onfleetApiRequest.call(this, 'PUT', encodedApiKey, path, teamData));
				} else if (operation === 'delete') {
					/* -------------------------------------------------------------------------- */
					/*                                Delete a team                               */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const path = `${resource}/${id}`;
					responseData.push(await onfleetApiRequest.call(this, 'DELETE', encodedApiKey, path));
				} else if (operation === 'getTimeEstimates') {
					/* -------------------------------------------------------------------------- */
					/*      Get driver time estimates for tasks that haven't been created yet     */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const workerTimeEstimates = Onfleet.getTeamFields.call(this, index, operation) as OnfleetWorkerSchedule;
					const path = `${resource}/${id}/estimate`;
					responseData.push(await onfleetApiRequest.call(this, 'GET', encodedApiKey, path, {}, workerTimeEstimates));
				} else if (operation === 'autoDispatch') {
					/* -------------------------------------------------------------------------- */
					/*                  Dynamically dispatching tasks on the fly                  */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const teamAutoDispatch = Onfleet.getTeamFields.call(this, index, operation) as OnfleetWorkerSchedule;
					const path = `${resource}/${id}/dispatch`;
					responseData.push(await onfleetApiRequest.call(this, 'POST', encodedApiKey, path, teamAutoDispatch));
				}
			} catch (error) {
				if (this.continueOnFail()) {
					responseData.push({ error: (error as IDataObject).toString() });
				}
				continue;
			}
		}

		return responseData;
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const items = this.getInputData();
		//Get credentials the user provided for this node
		const credentials = await this.getCredentials('onfleetApi') as ICredentialDataDecryptedObject;
		const encodedApiKey = Buffer.from(`${credentials.apiKey}:`).toString('base64');

		const operations: { [ key:string ]: Function} = {
			tasks: Onfleet.executeTaskOperations,
			destinations: Onfleet.executeDestinationOperations,
			organizations: Onfleet.executeOrganizationOperations,
			admins: Onfleet.executeAdministratorOperations,
			recipients: Onfleet.executeRecipientOperations,
			hubs: Onfleet.executeHubOperations,
			workers: Onfleet.executeWorkerOperations,
			webhooks: Onfleet.executeWebhookOperations,
			containers: Onfleet.executeContainerOperations,
			teams: Onfleet.executeTeamOperations,
		};

		const responseData = await operations[resource].call(this, resource, operation, items, encodedApiKey);
		// Map data to n8n data
		return [this.helpers.returnJsonArray(responseData)];
	}

}

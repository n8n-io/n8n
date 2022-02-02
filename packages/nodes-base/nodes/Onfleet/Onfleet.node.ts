import {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeCredentialTestResult,
	NodeOperationError,
} from 'n8n-workflow';
import * as moment from 'moment-timezone';

import {
	OnfleetAdmins,
	OnfleetCloneOverrideTaskOptions,
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
	OnfleetWorkerSchedule,
	OnfleetWorkerScheduleEntry
} from './interfaces';
import { taskFields, taskOperations } from './descriptions/TaskDescription';

import { IExecuteFunctions } from 'n8n-core';
import { destinationFields, destinationOperations } from './descriptions/DestinationDescription';
import { onfleetApiRequest, resourceLoaders } from './GenericFunctions';
import { recipientFields, recipientOperations } from './descriptions/RecipientDescription';
import { organizationFields, organizationOperations } from './descriptions/OrganizationDescription';
import { adminFields, adminOperations } from './descriptions/AdministratorDescription';
import { hubFields, hubOperations } from './descriptions/HubDescription';
import { workerFields, workerOperations } from './descriptions/WorkerDescription';
import { webhookFields, webhookOperations } from './descriptions/WebhookDescription';
import { containerFields, containerOperations } from './descriptions/ContainerDescription';
import { teamFields, teamOperations } from './descriptions/TeamDescription';
import { OptionsWithUri } from 'request';

export class Onfleet implements INodeType {
	description: INodeTypeDescription = {
			displayName: 'Onfleet',
			name: 'onfleet',
			icon: 'file:Onfleet.svg',
			group: [ 'input' ],
			version: 1,
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Onfleet API',
			defaults: {
					color: '#AA81F3',
					description: 'Use the Onfleet API',
					name: 'Onfleet',
					testedBy: 'onfeletApiTest',
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
							name: 'Admin',
							value: 'admin',
						},
						{
							name: 'Container',
							value: 'container',
						},
						{
							name: 'Destination',
							value: 'destination',
						},
						{
							name: 'Hub',
							value: 'hub',
						},
						{
							name: 'Organization',
							value: 'organization',
						},
						{
							name: 'Recipient',
							value: 'recipient',
						},
						{
							name: 'Task',
							value: 'task',
						},
						{
							name: 'Team',
							value: 'team',
						},
						{
							name: 'Webhook',
							value: 'webhook',
						},
						{
							name: 'Worker',
							value: 'worker',
						},
					],
					default: 'task',
					description: 'The resource to perform operations on',
				},
				// Operations & fields
				...adminOperations,
				...adminFields,
				...containerOperations,
				...containerFields,
				...destinationOperations,
				...destinationFields,
				...hubOperations,
				...hubFields,
				...organizationOperations,
				...organizationFields,
				...recipientOperations,
				...recipientFields,
				...taskOperations,
				...taskFields,
				...teamOperations,
				...teamFields,
				...webhookOperations,
				...webhookFields,
				...workerOperations,
				...workerFields,
			],
	};

	methods = {
		credentialTest: {
			async onfeletApiTest(this: ICredentialTestFunctions, credential: ICredentialsDecrypted): Promise<NodeCredentialTestResult> {
				const credentials = credential.data as IDataObject;
				const encodedApiKey = Buffer.from(`${credentials.apiKey}:`).toString('base64');

				const options: OptionsWithUri = {
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Basic ${encodedApiKey}`,
						'User-Agent': 'n8n-onfleet',
					},
					method: 'GET',
					uri: 'https://onfleet.com/api/v2/auth/test',
					json: true,
				};

				try {
					await this.helpers.request(options);
					return {
						status: 'OK',
						message: 'Authentication successful',
					};
				} catch (error) {
					return {
						status: 'Error',
						message: `Auth settings are not valid: ${error}`,
					};
				}
			},
		},
		loadOptions: resourceLoaders,
	};

	/**
	 * Returns a valid formated destination object
	 * @param unparsed Whether the address is parsed or not
	 * @param address Destination address
	 * @param addressNumber Destination number
	 * @param addressStreet Destination street
	 * @param addressCity Destination city
	 * @param addressCountry Destination country
	 * @param additionalFields Destination additional fields
	 * @returns
	 */
	static formatAddress (
		unparsed: boolean,
		address: string | undefined,
		addressNumber: string | undefined,
		addressStreet: string | undefined,
		addressCity: string | undefined,
		addressCountry: string | undefined,
		additionalFields: IDataObject,
	): OnfleetDestination {
		let destination: OnfleetDestination;
		if (unparsed) {
			destination = { address: { unparsed: address } };
		} else {
			destination = {
				address: {
					number: addressNumber,
					street: addressStreet,
					city: addressCity,
					country: addressCountry,
				},
			};
		}

		// Adding destination extra fields
		if (additionalFields.addressName) {
			destination.address.name = additionalFields.addressName as string;
		}
		if (additionalFields.addressApartment) {
			destination.address.apartment = additionalFields.addressApartment as string;
		}
		if (additionalFields.addressState) {
			destination.address.state = additionalFields.addressState as string;
		}
		if (additionalFields.addressPostalCode) {
			destination.address.postalCode = additionalFields.addressPostalCode as string;
		}
		if (additionalFields.addressNotes) {
			destination.notes = additionalFields.addressNotes as string;
		}
		return destination;
	}

	/**
	 * Gets the properties of a destination according to the operation chose
	 * @param this Current node execution function
	 * @param item Current execution data
	 * @param operation Current destination opration
	 * @returns {OnfleetDestination} Destination information
	 */
	static getDestinationFields(
		this: IExecuteFunctions, item: number, operation: string, shared = false,
	): OnfleetDestination | OnfleetDestination[] | null {
		if (['create', 'createBatch', 'update'].includes(operation)) {
			/* -------------------------------------------------------------------------- */
			/*             Get fields for create, createBatch and update task             */
			/* -------------------------------------------------------------------------- */
			if (shared) {
				const { destinationProperties: destination } = this.getNodeParameter('destination', item) as IDataObject;

				if (!destination || Object.keys((destination) as IDataObject).length === 0) {
					return [];
				}

				const {
					unparsed, address, addressNumber, addressStreet, addressCity, addressCountry, additionalFields,
				} = destination as IDataObject;
				return Onfleet.formatAddress(
					unparsed as boolean,
					address as string,
					addressNumber as string,
					addressStreet as string,
					addressCity as string,
					addressCountry as string,
					additionalFields as IDataObject,
				) as OnfleetDestination;
			} else {
				let unparsed, address, addressNumber, addressStreet, addressCity, addressCountry, additionalFields;
				unparsed = this.getNodeParameter('unparsed', item) as boolean;
				if (unparsed) {
					address = this.getNodeParameter('address', item) as string;
				} else {
					addressNumber = this.getNodeParameter('addressNumber', item) as string;
					addressStreet = this.getNodeParameter('addressStreet', item) as string;
					addressCity = this.getNodeParameter('addressCity', item) as string;
					addressCountry = this.getNodeParameter('addressCountry', item) as string;
				}
				additionalFields = this.getNodeParameter('additionalFields', item) as IDataObject;

				return Onfleet.formatAddress(
					unparsed, address, addressNumber, addressStreet, addressCity, addressCountry, additionalFields,
				) as OnfleetDestination;
			}

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
			const updateFields = this.getNodeParameter('updateFields', item) as IDataObject;
			const adminData: OnfleetAdmins = {};
			// Adding additional fields
			Object.assign(adminData, updateFields);
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
			const destination = Onfleet.getDestinationFields.call(this, item, operation, true) as OnfleetDestination;
			const name = this.getNodeParameter('name', item) as string;
			const additionalFields = this.getNodeParameter('additionalFields', item) as IDataObject;

			const hubData: OnfleetHubs = { name, ...destination };

			// Adding additional fields
			Object.assign(hubData, additionalFields);


			return hubData;
		} else if (operation === 'update') {
			/* -------------------------------------------------------------------------- */
			/*                          Get fields for update hub                         */
			/* -------------------------------------------------------------------------- */
			const destination = Onfleet.getDestinationFields.call(this, item, operation, true) as OnfleetDestination;
			const hubData: OnfleetHubs = { ...destination };

			// Adding additional fields
			const updateFields = this.getNodeParameter('updateFields', item) as IDataObject;
			Object.assign(hubData, updateFields);
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
	 static getWorkerFields(this: IExecuteFunctions, item: number, operation: string): OnfleetWorker | OnfleetWorkerFilter | OnfleetWorkerSchedule | OnfleetWorkerSchedule | null {
		if (operation === 'create') {
			/* -------------------------------------------------------------------------- */
			/*                        Get fields for create worker                        */
			/* -------------------------------------------------------------------------- */
			const name = this.getNodeParameter('name', item) as string;
			const phone = this.getNodeParameter('phone', item) as string;
			const teams = this.getNodeParameter('teams', item) as string[];
			const { vehicleProperties: vehicle } = this.getNodeParameter('vehicle', item) as IDataObject;
			const workerData: OnfleetWorker = { name, phone, teams };

			// Adding vehicle fields
			if (Object.keys((vehicle as IDataObject)).length > 0) {
				const { type, additionalFields: additionalVehicleFields } = vehicle as IDataObject;
				Object.assign(workerData, { vehicle: { type, ...(additionalVehicleFields as IDataObject) } });
			}

			// Adding additional fields
			const additionalFields = this.getNodeParameter('additionalFields', item) as IDataObject;
			Object.assign(workerData, additionalFields);

			return workerData;
		} else if (operation === 'update') {
			/* -------------------------------------------------------------------------- */
			/*                        Get fields for update worker                        */
			/* -------------------------------------------------------------------------- */
			const {vehicleProperties} = this.getNodeParameter('vehicle', item) as IDataObject;
			const { additionalFields: vehicle } = vehicleProperties as IDataObject;
			const workerData: OnfleetWorker = { vehicle: (vehicle as IDataObject) };

			// Adding additional fields
			const updateFields = this.getNodeParameter('updateFields', item) as IDataObject;
			Object.assign(workerData, updateFields);

			return workerData;
		} else if (['getAll', 'get'].includes(operation)) {
			/* -------------------------------------------------------------------------- */
			/*                    Get fields for get and getAll workers                   */
			/* -------------------------------------------------------------------------- */
			const {
				filter, states, teams, phones, analytics, ...filterFields
			} = this.getNodeParameter('filterFields', item) as IDataObject;
			const workerFilter: OnfleetWorkerFilter = {};

			if (states) {
				filterFields.states = (states as number[]).join(',');
			}
			if (filter) {
				filterFields.filter = (filter as string[]).join(',');
			}
			if (teams) {
				filterFields.teams = (teams as string[]).join(',');
			}
			if (phones) {
				filterFields.phones = (phones as string[]).join(',');
			}
			if (typeof analytics === 'boolean') {
				filterFields.analytics = analytics ? 'true' : 'false';
			}

			Object.assign(workerFilter, filterFields);
			return workerFilter;
		} else if (operation === 'setSchedule') {
			/* -------------------------------------------------------------------------- */
			/*                            Set a worker schedule                           */
			/* -------------------------------------------------------------------------- */
			const { scheduleProperties } = this.getNodeParameter('schedule', item) as IDataObject;
			const entries = (scheduleProperties as IDataObject[]).map(entry => {
				const { timezone, date, shifts } = entry as IDataObject;
				const { shiftsProperties } = shifts as IDataObject;
				return {
					timezone: timezone as string,
					date: moment(new Date(date as Date)).format('YYYY-MM-DD'),
					shifts: (shiftsProperties as IDataObject[]).map(({ start, end}) => [
						new Date(start as Date).getTime(),
						new Date(end as Date).getTime(),
					]),
				} as OnfleetWorkerScheduleEntry;
			}) as OnfleetWorkerScheduleEntry[];
			return { entries } as OnfleetWorkerSchedule;
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
	 * Returns a valid formated recipient object
	 * @param name Recipient name
	 * @param phone Recipient phone
	 * @param additionalFields Recipient additional fields
	 * @returns
	 */
	static formatRecipient(
		name: string, phone: string, additionalFields: IDataObject,
	): OnfleetRecipient {
		const recipient: OnfleetRecipient = { name, phone };

		// Adding recipient extra fields
		if (additionalFields.recipientNotes) {
			recipient.notes = additionalFields.recipientNotes as string;
		}
		if (additionalFields.recipientSkipSMSNotifications) {
			recipient.skipSMSNotifications = additionalFields.recipientSkipSMSNotifications as boolean;
		}
		if (additionalFields.recipientSkipPhoneNumberValidation) {
			recipient.skipPhoneNumberValidation = additionalFields.recipientSkipPhoneNumberValidation as boolean;
		}

		return recipient;
	}

	/**
	 * Gets the properties of a recipient according to the operation chose
	 * @param this Current node execution function
	 * @param item Current execution data
	 * @param operation Current recipient opration
	 * @returns {OnfleetRecipient} Recipient information
	 */
	static getRecipientFields(
		this: IExecuteFunctions, item: number, operation: string, shared = false, multiple = false,
	): OnfleetRecipient | OnfleetRecipient[] | null {
		if (['create', 'createBatch'].includes(operation)) {
			/* -------------------------------------------------------------------------- */
			/*                       Get fields to create recipient                       */
			/* -------------------------------------------------------------------------- */
			if (shared) {
				if (multiple) {
					const { recipientProperties: recipients } = this.getNodeParameter('recipient', item) as IDataObject;
					if (!recipients || Object.keys(recipients).length === 0) {
						return [];
					}
					return (recipients as IDataObject[]).map(recipient => {
						const { recipientName: name, recipientPhone: phone, additionalFields } = recipient as IDataObject;
						return Onfleet.formatRecipient(
							name as string,
							phone as string,
							additionalFields as IDataObject,
						);
					});
				} else {
					const { recipientProperties: recipient } = this.getNodeParameter('recipient', item) as IDataObject;
					if (!recipient || Object.keys(recipient).length === 0) {
						return null;
					}
					const { recipientName: name, recipientPhone: phone, additionalFields } = recipient as IDataObject;
					return Onfleet.formatRecipient(
						name as string,
						phone as string,
						additionalFields as IDataObject,
					);
				}
			} else {
				const name = this.getNodeParameter('recipientName', item) as string;
				const phone = this.getNodeParameter('recipientPhone', item) as string;
				const additionalFields = this.getNodeParameter('additionalFields', item) as IDataObject;
				return Onfleet.formatRecipient(name, phone, additionalFields) as OnfleetRecipient;
			}
		} else if (operation === 'update') {
			/* -------------------------------------------------------------------------- */
			/*                       Get fields to update recipient                       */
			/* -------------------------------------------------------------------------- */
			const {
				recipientName: name = '', recipientPhone: phone = '', ...additionalFields
			} = this.getNodeParameter('updateFields', item) as IDataObject;

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
		return null;
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
			const destination = Onfleet.getDestinationFields.call(this, item, operation, true) as OnfleetDestination;

			// Adding recipients information
			const recipient = Onfleet.getRecipientFields.call(this, item, operation, true, false) as OnfleetRecipient;

			const taskData: OnfleetTask = { destination, recipients: [ recipient ] };
			const { completeAfter = null, completeBefore = null, ...extraFields } = additionalFields;
			if (completeAfter) taskData.completeAfter = new Date(completeAfter as Date).getTime();
			if (completeBefore) taskData.completeBefore = new Date(completeBefore as Date).getTime();

			Object.assign(taskData, extraFields);
			return taskData;
		} else if (operation === 'update') {
			/* -------------------------------------------------------------------------- */
			/*                          Get fields to update task                         */
			/* -------------------------------------------------------------------------- */
			const updateFields = this.getNodeParameter('updateFields', item) as IDataObject;
			const taskData: OnfleetTaskUpdate = {};
			const { completeAfter = null, completeBefore = null, ...extraFields } = updateFields;
			if (completeAfter) taskData.completeAfter = new Date(completeAfter as Date).getTime();
			if (completeBefore) taskData.completeBefore = new Date(completeBefore as Date).getTime();
			Object.assign(taskData, extraFields);
			return taskData;
		} else if (operation === 'clone') {
			/* -------------------------------------------------------------------------- */
			/*                          Get fields to clone task                          */
			/* -------------------------------------------------------------------------- */
			const { overrides, ...optionFields } = this.getNodeParameter('options', item) as IDataObject;
			const { overrideProperties } = overrides as IDataObject;

			const options: OnfleetCloneTaskOptions = {};
			if (optionFields.includeMetadata)  options.includeMetadata = optionFields.includeMetadata as boolean;
			if (optionFields.includeBarcodes)  options.includeBarcodes = optionFields.includeBarcodes as boolean;
			if (optionFields.includeDependencies)  options.includeDependencies = optionFields.includeDependencies as boolean;

			// Adding overrides data
			if (overrideProperties && Object.keys(overrideProperties).length > 0) {
				const {
					notes, pickupTask, serviceTime, completeAfter, completeBefore,
				} = overrideProperties as IDataObject;
				const overridesData = {} as OnfleetCloneOverrideTaskOptions;

				if (notes)  overridesData.notes = notes as string;
				if (typeof pickupTask !== 'undefined')  overridesData.pickupTask = pickupTask as boolean;
				if (serviceTime)  overridesData.serviceTime = serviceTime as number;
				if (completeAfter)  overridesData.completeAfter = new Date(completeAfter as Date).getTime();
				if (completeBefore)  overridesData.completeBefore = new Date(completeBefore as Date).getTime();

				options.overrides = overridesData;
			}

			return { options } as OnfleetCloneTask;
		} else if (operation === 'getAll') {
			/* -------------------------------------------------------------------------- */
			/*                          Get fields to list tasks                          */
			/* -------------------------------------------------------------------------- */
			const filterFields = this.getNodeParameter('filterFields', item) as IDataObject;
			const listTaskData: OnfleetListTaskFilters = {
				from: new Date(this.getNodeParameter('from', 0) as Date).getTime(),
			};

			// Adding extra fields to search tasks
			if (filterFields.to) {
				listTaskData.to = new Date(filterFields.to as Date).getTime();
			}
			if (filterFields.state) {
				listTaskData.state = (filterFields.state as number[]).join(',');
			}
			if (filterFields.lastId) {
				listTaskData.lastId = filterFields.lastId as string;
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
			const workers = this.getNodeParameter('workers', item) as string[];
			const managers = this.getNodeParameter('managers', item) as string[];
			const additionalFields = this.getNodeParameter('additionalFields', item) as IDataObject;

			const teamData: OnfleetTeams = { name, workers, managers };
			// Adding additional fields
			Object.assign(teamData, additionalFields);

			return teamData;
		} else if (operation === 'update') {
			/* -------------------------------------------------------------------------- */
			/*                         Get fields to update a team                        */
			/* -------------------------------------------------------------------------- */
			const teamData: OnfleetTeams = {};
			// Adding additional fields
			const updateFields = this.getNodeParameter('updateFields', item) as IDataObject;
			Object.assign(teamData, updateFields);
			return teamData;
		} else if (operation === 'getTimeEstimates') {
			/* -------------------------------------------------------------------------- */
			/*      Get driver time estimates for tasks that haven't been created yet     */
			/* -------------------------------------------------------------------------- */
			const { dropoffProperties } = this.getNodeParameter('dropoff', item) as IDataObject;
			const { pickUpProperties } = this.getNodeParameter('pickUp', item) as IDataObject;
			const dropoff = dropoffProperties as IDataObject;
			const pickup = pickUpProperties as IDataObject;
			const hasPickUp = pickup && Object.keys(pickup).length > 0;
			const hasDropoff = dropoff && Object.keys(dropoff).length > 0;

			if (!hasPickUp && !hasDropoff) {
				throw new NodeOperationError(
					this.getNode(), 'At least 1 of dropoffLocation or pickupLocation must be selected',
				);
			}

			const workerTimeEstimates = {} as OnfleetWorkerEstimates;
			if (hasPickUp) {
				const {
					pickupLongitude: longitude, pickupLatitude: latitude, additionalFields,
				} = pickup;
				const { pickupTime } = additionalFields as IDataObject;
				workerTimeEstimates.pickupLocation = `${longitude},${latitude}`;
				if (pickupTime) {
					workerTimeEstimates.pickupTime = moment(new Date(pickupTime as Date)).local().unix();
				}
			}
			if(hasDropoff) {
				const {dropoffLongitude: longitude, dropoffLatitude: latitude} = dropoff;
				workerTimeEstimates.dropoffLocation = `${longitude},${latitude}`;
			}

			const additionalFields = this.getNodeParameter('additionalFields', item) as IDataObject;
			Object.assign(workerTimeEstimates, additionalFields);
			return workerTimeEstimates;
		} else if (operation === 'autoDispatch') {
			/* -------------------------------------------------------------------------- */
			/*                  Dynamically dispatching tasks on the fly                  */
			/* -------------------------------------------------------------------------- */
			const teamAutoDispatch = {} as OnfleetTeamAutoDispatch;
			const {
				scheduleTimeWindow, taskTimeWindow, ...additionalFields
			} = this.getNodeParameter('additionalFields', item) as IDataObject;
			const { scheduleTimeWindowProperties } = scheduleTimeWindow as IDataObject;
			const { taskTimeWindowProperties } = taskTimeWindow as IDataObject;

			if (scheduleTimeWindowProperties && Object.keys((scheduleTimeWindowProperties as IDataObject)).length > 0) {
				const { startTime, endTime } = scheduleTimeWindowProperties as IDataObject;
				teamAutoDispatch.scheduleTimeWindow = [
					moment(new Date(startTime as Date)).local().unix(), moment(new Date(endTime as Date)).local().unix(),
				];
			}

			if (taskTimeWindowProperties && Object.keys((taskTimeWindowProperties as IDataObject)).length > 0) {
				const { startTime, endTime } = taskTimeWindowProperties as IDataObject;
				teamAutoDispatch.taskTimeWindow = [
					moment(new Date(startTime as Date)).local().unix(), moment(new Date(endTime as Date)).local().unix(),
				];
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
						const taskData = Onfleet.getTaskFields.call(this, index, operation) as any;
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
					const byLocation = this.getNodeParameter('byLocation', index) as boolean;

					if (byLocation) {
						const longitude = this.getNodeParameter('longitude', index) as string;
						const latitude = this.getNodeParameter('latitude', index) as number;
						const filterFields = this.getNodeParameter('filterFields', index) as IDataObject;
						const path = `${resource}/location`;
						const { workers } = await onfleetApiRequest.call(
							this, 'GET', encodedApiKey, path, {}, { longitude, latitude, ...filterFields},
						);
						responseData.push(...workers);
					} else {
						const workerFilters = Onfleet.getWorkerFields.call(this, 0, operation) as OnfleetWorkerFilter;

						responseData.push(... await onfleetApiRequest.call(this, 'GET', encodedApiKey, resource, {}, workerFilters));
					}
				} else if (operation === 'get') {
					/* -------------------------------------------------------------------------- */
					/*                                Get a worker                                */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const workerFilters = Onfleet.getWorkerFields.call(this, index, operation) as OnfleetWorkerFilter;

					const path = `${resource}/${id}`;
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
					const options = this.getNodeParameter('options', index) as IDataObject;

					const tasks = this.getNodeParameter('tasks', index) as Array<string|number>;
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
						await onfleetApiRequest.call(this, 'PUT', encodedApiKey, path, { tasks, ...options }),
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
			task: Onfleet.executeTaskOperations,
			destination: Onfleet.executeDestinationOperations,
			organization: Onfleet.executeOrganizationOperations,
			admin: Onfleet.executeAdministratorOperations,
			recipient: Onfleet.executeRecipientOperations,
			hub: Onfleet.executeHubOperations,
			worker: Onfleet.executeWorkerOperations,
			webhook: Onfleet.executeWebhookOperations,
			container: Onfleet.executeContainerOperations,
			team: Onfleet.executeTeamOperations,
		};

		const responseData = await operations[resource].call(this, `${resource}s`, operation, items, encodedApiKey);
		// Map data to n8n data
		return [this.helpers.returnJsonArray(responseData)];
	}

}

import moment from 'moment-timezone';
import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	IWebhookFunctions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { onfleetApiRequest, onfleetApiRequestAllItems } from './GenericFunctions';
import type {
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
	OnfleetWorkerScheduleEntry,
} from './interfaces';

const formatAddress = (
	unparsed: boolean,
	address: string | undefined,
	addressNumber: string | undefined,
	addressStreet: string | undefined,
	addressCity: string | undefined,
	addressCountry: string | undefined,
	additionalFields: IDataObject,
): OnfleetDestination => {
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
};

export class Onfleet {
	/**
	 * Returns a valid formatted destination object
	 * @param unparsed Whether the address is parsed or not
	 * @param address Destination address
	 * @param addressNumber Destination number
	 * @param addressStreet Destination street
	 * @param addressCity Destination city
	 * @param addressCountry Destination country
	 * @param additionalFields Destination additional fields
	 */

	/**
	 * Gets the properties of a destination according to the operation chose
	 * @param item Current execution data
	 * @param operation Current destination operation
	 * @param shared Whether the collection is in other resource or not
	 */
	static getDestinationFields(
		this: IWebhookFunctions | IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
		item: number,
		operation: string,
		shared: { parent: string } | boolean = false,
	): OnfleetDestination | OnfleetDestination[] | null {
		if (['create', 'update'].includes(operation)) {
			/* -------------------------------------------------------------------------- */
			/*               Get fields for create and update a destination               */
			/* -------------------------------------------------------------------------- */
			if (shared !== false) {
				let destination;
				if (typeof shared === 'boolean' && shared) {
					const { destinationProperties = {} } = this.getNodeParameter(
						'destination',
						item,
					) as IDataObject;
					destination = destinationProperties;
				} else if (typeof shared !== 'boolean') {
					const { destination: destinationCollection = {} } = this.getNodeParameter(
						shared.parent,
						item,
					) as IDataObject;
					destination = (destinationCollection as IDataObject).destinationProperties;
				}

				if (!destination || Object.keys(destination as IDataObject).length === 0) {
					return [];
				}

				const {
					unparsed,
					address,
					addressNumber,
					addressStreet,
					addressCity,
					addressCountry,
					...additionalFields
				} = destination as IDataObject;
				return formatAddress(
					unparsed as boolean,
					address as string,
					addressNumber as string,
					addressStreet as string,
					addressCity as string,
					addressCountry as string,
					additionalFields as IDataObject,
				);
			} else {
				let address, addressNumber, addressStreet, addressCity, addressCountry;
				const unparsed = this.getNodeParameter('unparsed', item) as boolean;
				if (unparsed) {
					address = this.getNodeParameter('address', item) as string;
				} else {
					addressNumber = this.getNodeParameter('addressNumber', item) as string;
					addressStreet = this.getNodeParameter('addressStreet', item) as string;
					addressCity = this.getNodeParameter('addressCity', item) as string;
					addressCountry = this.getNodeParameter('addressCountry', item) as string;
				}
				const additionalFields = this.getNodeParameter('additionalFields', item) as IDataObject;

				return formatAddress(
					unparsed,
					address,
					addressNumber,
					addressStreet,
					addressCity,
					addressCountry,
					additionalFields,
				);
			}
		}
		return null;
	}

	/**
	 * Gets the properties of an administrator according to the operation chose
	 * @param item Current execution data
	 * @param operation Current administrator operation
	 */
	static getAdminFields(
		this: IExecuteFunctions,
		item: number,
		operation: string,
	): OnfleetAdmins | null {
		if (operation === 'create') {
			/* -------------------------------------------------------------------------- */
			/*                         Get fields for create admin                        */
			/* -------------------------------------------------------------------------- */
			const name = this.getNodeParameter('name', item) as string;
			const email = this.getNodeParameter('email', item) as string;
			const additionalFields = this.getNodeParameter('additionalFields', item);

			const adminData: OnfleetAdmins = { name, email };
			// Adding additional fields
			Object.assign(adminData, additionalFields);

			return adminData;
		} else if (operation === 'update') {
			/* -------------------------------------------------------------------------- */
			/*                         Get fields for update admin                        */
			/* -------------------------------------------------------------------------- */
			const updateFields = this.getNodeParameter('updateFields', item);
			const adminData: OnfleetAdmins = {};
			if (!Object.keys(updateFields).length) {
				throw new NodeOperationError(this.getNode(), 'Select at least one field to be updated');
			}
			// Adding additional fields
			Object.assign(adminData, updateFields);
			return adminData;
		}
		return null;
	}

	/**
	 * Gets the properties of a hub according to the operation chose
	 * @param item Current execution data
	 * @param operation Current hub operation
	 */
	static getHubFields(
		this: IExecuteFunctions,
		item: number,
		operation: string,
	): OnfleetHubs | null {
		if (operation === 'create') {
			/* -------------------------------------------------------------------------- */
			/*                          Get fields for create hub                         */
			/* -------------------------------------------------------------------------- */
			const destination = Onfleet.getDestinationFields.call(
				this,
				item,
				operation,
				true,
			) as OnfleetDestination;
			const name = this.getNodeParameter('name', item) as string;
			const additionalFields = this.getNodeParameter('additionalFields', item);

			const hubData: OnfleetHubs = { name, ...destination };

			// Adding additional fields
			Object.assign(hubData, additionalFields);

			return hubData;
		} else if (operation === 'update') {
			/* -------------------------------------------------------------------------- */
			/*                          Get fields for update hub                         */
			/* -------------------------------------------------------------------------- */
			const destination = Onfleet.getDestinationFields.call(this, item, operation, {
				parent: 'updateFields',
			}) as OnfleetDestination;
			const hubData: OnfleetHubs = { ...destination };

			// Adding additional fields
			const updateFields = this.getNodeParameter('updateFields', item);

			if (!Object.keys(updateFields).length) {
				throw new NodeOperationError(this.getNode(), 'Select at least one field to be updated');
			}

			Object.assign(hubData, updateFields);
			return hubData;
		}
		return null;
	}

	/**
	 * Gets the properties of a worker according to the operation chose
	 * @param item Current execution data
	 * @param operation Current worker operation
	 */
	static getWorkerFields(
		this: IExecuteFunctions,
		item: number,
		operation: string,
	): OnfleetWorker | OnfleetWorkerFilter | OnfleetWorkerSchedule | null {
		if (operation === 'create') {
			/* -------------------------------------------------------------------------- */
			/*                        Get fields for create worker                        */
			/* -------------------------------------------------------------------------- */
			const name = this.getNodeParameter('name', item) as string;
			const phone = this.getNodeParameter('phone', item) as string;
			const teams = this.getNodeParameter('teams', item) as string[];
			const workerData: OnfleetWorker = { name, phone, teams };

			// Adding additional fields
			const additionalFields = this.getNodeParameter('additionalFields', item);

			if (additionalFields.vehicle) {
				const { vehicleProperties } = additionalFields.vehicle as IDataObject;
				Object.assign(workerData, { vehicle: vehicleProperties });
				delete additionalFields.vehicle;
			}

			Object.assign(workerData, additionalFields);

			return workerData;
		} else if (operation === 'update') {
			/* -------------------------------------------------------------------------- */
			/*                        Get fields for update worker                        */
			/* -------------------------------------------------------------------------- */

			const workerData: OnfleetWorker = {};

			// Adding additional fields
			const updateFields = this.getNodeParameter('updateFields', item);

			if (!Object.keys(updateFields).length) {
				throw new NodeOperationError(this.getNode(), 'Select at least one field to be updated');
			}

			Object.assign(workerData, updateFields);
			return workerData;
		} else if (operation === 'get') {
			const options = this.getNodeParameter('options', item, {});
			const workerFilter: OnfleetWorkerFilter = {};
			if (options.filter) {
				options.filter = (options.filter as string[]).join(',');
			}
			if (typeof options.analytics === 'boolean') {
				options.analytics = options.analytics ? 'true' : 'false';
			}
			Object.assign(workerFilter, options);
			return workerFilter;
		} else if (operation === 'getAll') {
			/* -------------------------------------------------------------------------- */
			/*                    Get fields for get and getAll workers                   */
			/* -------------------------------------------------------------------------- */

			const options = this.getNodeParameter('options', item, {});
			const filters = this.getNodeParameter('filters', item, {});
			const workerFilter: OnfleetWorkerFilter = {};

			if (filters.states) {
				filters.states = (filters.states as number[]).join(',');
			}
			if (filters.teams) {
				filters.teams = (filters.teams as string[]).join(',');
			}
			if (filters.phones) {
				filters.phones = (filters.phones as string[]).join(',');
			}
			if (options.filter) {
				options.filter = (options.filter as string[]).join(',');
			}

			Object.assign(workerFilter, options);
			Object.assign(workerFilter, filters);
			return workerFilter;
		} else if (operation === 'setSchedule') {
			/* -------------------------------------------------------------------------- */
			/*                            Set a worker schedule                           */
			/* -------------------------------------------------------------------------- */
			const { scheduleProperties } = this.getNodeParameter('schedule', item) as IDataObject;
			const entries = ((scheduleProperties as IDataObject[]) || []).map((entry) => {
				const { timezone, date, shifts } = entry;
				const { shiftsProperties } = shifts as IDataObject;
				return {
					timezone: timezone as string,
					date: moment(date as Date).format('YYYY-MM-DD'),
					shifts: (shiftsProperties as IDataObject[]).map(({ start, end }) => [
						new Date(start as Date).getTime(),
						new Date(end as Date).getTime(),
					]),
				} as OnfleetWorkerScheduleEntry;
			});
			return { entries } as OnfleetWorkerSchedule;
		}
		return null;
	}

	/**
	 * Gets the properties of a webhooks according to the operation chose
	 * @param item Current execution data
	 * @param operation Current webhooks operation
	 */
	static getWebhookFields(
		this: IExecuteFunctions,
		item: number,
		operation: string,
	): OnfleetWebhook | null {
		if (operation === 'create') {
			/* -------------------------------------------------------------------------- */
			/*                        Get fields for create webhook                       */
			/* -------------------------------------------------------------------------- */
			const url = this.getNodeParameter('url', item) as string;
			const name = this.getNodeParameter('name', item) as string;
			const trigger = this.getNodeParameter('trigger', item) as number;
			const additionalFields = this.getNodeParameter('additionalFields', item);

			const webhookData: OnfleetWebhook = { url, name, trigger };
			// Adding additional fields
			Object.assign(webhookData, additionalFields);

			return webhookData;
		}
		return null;
	}

	/**
	 * Returns a valid formatted recipient object
	 * @param name Recipient name
	 * @param phone Recipient phone
	 * @param additionalFields Recipient additional fields
	 */
	static formatRecipient(
		name: string,
		phone: string,
		additionalFields: IDataObject,
		options: IDataObject = {},
	): OnfleetRecipient {
		const recipient: OnfleetRecipient = { name, phone };

		// Adding recipient extra fields
		if (additionalFields.recipientNotes) {
			recipient.notes = additionalFields.recipientNotes as string;
		}
		if (additionalFields.recipientSkipSMSNotifications) {
			recipient.skipSMSNotifications = additionalFields.recipientSkipSMSNotifications as boolean;
		}
		if ('recipientSkipPhoneNumberValidation' in options) {
			recipient.skipPhoneNumberValidation =
				(options.recipientSkipPhoneNumberValidation as boolean) || false;
		}

		return recipient;
	}

	/**
	 * Gets the properties of a recipient according to the operation chose
	 * @param item Current execution data
	 * @param operation Current recipient operation
	 * @param shared Whether the collection is in other resource or not
	 */
	static getRecipientFields(
		this: IWebhookFunctions | IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
		item: number,
		operation: string,
		shared = false,
	): OnfleetRecipient | OnfleetRecipient[] | null {
		if (operation === 'create') {
			/* -------------------------------------------------------------------------- */
			/*                       Get fields to create recipient                       */
			/* -------------------------------------------------------------------------- */
			if (shared) {
				const { recipient: recipientData = {} } = this.getNodeParameter(
					'additionalFields',
					item,
					{},
				) as IDataObject;
				const options = this.getNodeParameter('options', item, {}) as IDataObject;
				const { recipientProperties: recipient = {} } = recipientData as IDataObject;
				if (!recipient || Object.keys(recipient).length === 0) {
					return null;
				}
				const {
					recipientName: name,
					recipientPhone: phone,
					...additionalFields
				} = recipient as IDataObject;
				return Onfleet.formatRecipient(
					name as string,
					phone as string,
					additionalFields as IDataObject,
					options,
				);
			} else {
				const name = this.getNodeParameter('recipientName', item) as string;
				const phone = this.getNodeParameter('recipientPhone', item) as string;
				const additionalFields = this.getNodeParameter('additionalFields', item) as IDataObject;
				const options = this.getNodeParameter('options', item) as IDataObject;
				return Onfleet.formatRecipient(name, phone, additionalFields, options);
			}
		} else if (operation === 'update') {
			/* -------------------------------------------------------------------------- */
			/*                       Get fields to update recipient                       */
			/* -------------------------------------------------------------------------- */
			const {
				recipientName: name = '',
				recipientPhone: phone = '',
				...additionalFields
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
	 * @param item Current execution data
	 * @param operation Current task operation
	 */
	static getTaskFields(
		this: IWebhookFunctions | IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
		item: number,
		operation: string,
	):
		| OnfleetListTaskFilters
		| OnfleetTask
		| OnfleetCloneTask
		| OnfleetTaskComplete
		| OnfleetTaskUpdate
		| null {
		if (operation === 'create') {
			/* -------------------------------------------------------------------------- */
			/*                         Get fields to create a task                        */
			/* -------------------------------------------------------------------------- */
			const additionalFields = this.getNodeParameter('additionalFields', item) as IDataObject;
			const destination = Onfleet.getDestinationFields.call(
				this,
				item,
				operation,
				true,
			) as OnfleetDestination;

			// Adding recipients information
			const recipient = Onfleet.getRecipientFields.call(
				this,
				item,
				operation,
				true,
			) as OnfleetRecipient;

			const taskData: OnfleetTask = { destination, recipients: [recipient] };
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

			if (!Object.keys(updateFields).length) {
				throw new NodeOperationError(this.getNode(), 'Select at least one field to be updated');
			}

			const { completeAfter = null, completeBefore = null, ...extraFields } = updateFields;
			if (completeAfter) taskData.completeAfter = new Date(completeAfter as Date).getTime();
			if (completeBefore) taskData.completeBefore = new Date(completeBefore as Date).getTime();
			Object.assign(taskData, extraFields);
			return taskData;
		} else if (operation === 'clone') {
			/* -------------------------------------------------------------------------- */
			/*                          Get fields to clone task                          */
			/* -------------------------------------------------------------------------- */
			const overrideFields = this.getNodeParameter('overrideFields', item) as IDataObject;

			const options: OnfleetCloneTaskOptions = {};
			if (overrideFields.includeMetadata) {
				options.includeMetadata = overrideFields.includeMetadata as boolean;
			}

			if (overrideFields.includeBarcodes) {
				options.includeBarcodes = overrideFields.includeBarcodes as boolean;
			}

			if (overrideFields.includeDependencies) {
				options.includeDependencies = overrideFields.includeDependencies as boolean;
			}

			// Adding overrides data
			const { notes, pickupTask, serviceTime, completeAfter, completeBefore } = overrideFields;
			const overridesData = {} as OnfleetCloneOverrideTaskOptions;

			if (notes) overridesData.notes = notes as string;
			if (typeof pickupTask !== 'undefined') overridesData.pickupTask = pickupTask as boolean;
			if (serviceTime) overridesData.serviceTime = serviceTime as number;
			if (completeAfter) overridesData.completeAfter = new Date(completeAfter as Date).getTime();
			if (completeBefore) overridesData.completeBefore = new Date(completeBefore as Date).getTime();

			if (overridesData && Object.keys(overridesData).length > 0) {
				options.overrides = overridesData;
			}

			return { options } as OnfleetCloneTask;
		} else if (operation === 'getAll') {
			/* -------------------------------------------------------------------------- */
			/*                          Get fields to list tasks                          */
			/* -------------------------------------------------------------------------- */
			const filters = this.getNodeParameter('filters', item) as IDataObject;
			const listTaskData: OnfleetListTaskFilters = {};

			const allStates = '0,1,2,3';

			const twoWeeksInMilisecods = () => 604800 * 1000;

			// Adding extra fields to search tasks
			if (filters.from) {
				listTaskData.from = new Date(filters.from as Date).getTime();
			} else {
				listTaskData.from = new Date().getTime() - twoWeeksInMilisecods();
			}
			if (filters.to) {
				listTaskData.to = new Date(filters.to as Date).getTime();
			}
			if (filters.state) {
				listTaskData.state = (filters.state as number[]).join(',');
				if (listTaskData.state.includes('all')) {
					listTaskData.state = allStates;
				}
			}

			return listTaskData;
		} else if (operation === 'complete') {
			/* -------------------------------------------------------------------------- */
			/*                        Get fields to complete a task                       */
			/* -------------------------------------------------------------------------- */
			const additionalFields = this.getNodeParameter('additionalFields', item) as IDataObject;
			const success = this.getNodeParameter('success', item) as boolean;
			const taskData: OnfleetTaskComplete = { completionDetails: { success } };
			if (additionalFields.notes) {
				taskData.completionDetails.notes = additionalFields.notes as string;
			}
			return taskData;
		}
		return null;
	}

	/**
	 * Gets the properties of a team according to the operation chose
	 * @param item Current execution data
	 * @param operation Current team operation
	 */
	static getTeamFields(
		this: IExecuteFunctions,
		item: number,
		operation: string,
	): OnfleetTeams | OnfleetWorkerEstimates | OnfleetTeamAutoDispatch | null {
		if (operation === 'create') {
			/* -------------------------------------------------------------------------- */
			/*                         Get fields to create a team                        */
			/* -------------------------------------------------------------------------- */
			const name = this.getNodeParameter('name', item) as string;
			const workers = this.getNodeParameter('workers', item) as string[];
			const managers = this.getNodeParameter('managers', item) as string[];
			const additionalFields = this.getNodeParameter('additionalFields', item);

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
			const updateFields = this.getNodeParameter('updateFields', item);

			if (!Object.keys(updateFields).length) {
				throw new NodeOperationError(this.getNode(), 'Select at least one field to be updated');
			}

			Object.assign(teamData, updateFields);
			return teamData;
		} else if (operation === 'getTimeEstimates') {
			/* -------------------------------------------------------------------------- */
			/*      Get driver time estimates for tasks that haven't been created yet     */
			/* -------------------------------------------------------------------------- */
			const {
				dropOff = {},
				pickUp = {},
				...additionalFields
			} = this.getNodeParameter('filters', item);
			const { dropOffProperties = {} } = dropOff as IDataObject;
			const { pickUpProperties = {} } = pickUp as IDataObject;
			const hasPickUp = pickUp && Object.keys(pickUpProperties as IDataObject).length > 0;
			const hasDropOff =
				dropOffProperties && Object.keys(dropOffProperties as IDataObject).length > 0;

			if (!hasPickUp && !hasDropOff) {
				throw new NodeOperationError(
					this.getNode(),
					'At least 1 of Drop-Off location or Pick-Up location must be selected',
				);
			}

			const workerTimeEstimates = {} as OnfleetWorkerEstimates;
			if (hasPickUp) {
				const {
					pickupLongitude: longitude,
					pickupLatitude: latitude,
					pickupTime,
				} = pickUpProperties as IDataObject;
				workerTimeEstimates.pickupLocation = `${longitude},${latitude}`;
				if (pickupTime) {
					workerTimeEstimates.pickupTime = moment(new Date(pickupTime as Date))
						.local()
						.unix();
				}
			}
			if (hasDropOff) {
				const { dropOffLongitude: longitude, dropOffLatitude: latitude } =
					dropOffProperties as IDataObject;
				workerTimeEstimates.dropoffLocation = `${longitude},${latitude}`;
			}

			Object.assign(workerTimeEstimates, additionalFields);
			return workerTimeEstimates;
		} else if (operation === 'autoDispatch') {
			/* -------------------------------------------------------------------------- */
			/*                  Dynamically dispatching tasks on the fly                  */
			/* -------------------------------------------------------------------------- */
			const teamAutoDispatch = {} as OnfleetTeamAutoDispatch;
			const {
				scheduleTimeWindow = {},
				taskTimeWindow = {},
				endingRoute = {},
				...additionalFields
			} = this.getNodeParameter('additionalFields', item);
			const { endingRouteProperties = {} } = endingRoute as IDataObject;
			const { scheduleTimeWindowProperties = {} } = scheduleTimeWindow as IDataObject;
			const { taskTimeWindowProperties = {} } = taskTimeWindow as IDataObject;

			if (
				scheduleTimeWindowProperties &&
				Object.keys(scheduleTimeWindowProperties as IDataObject).length > 0
			) {
				const { startTime, endTime } = scheduleTimeWindowProperties as IDataObject;
				teamAutoDispatch.scheduleTimeWindow = [
					moment(new Date(startTime as Date))
						.local()
						.unix(),
					moment(new Date(endTime as Date))
						.local()
						.unix(),
				];
			}

			if (endingRouteProperties && Object.keys(endingRouteProperties as IDataObject).length > 0) {
				const { routeEnd, hub } = endingRouteProperties as IDataObject;
				teamAutoDispatch.routeEnd = {
					anywhere: null,
					hub: `hub://${hub}`,
					team_hub: 'teams://DEFAULT',
					worker_routing_address: 'workers://ROUTING_ADDRESS',
				}[routeEnd as string] as string;
			}

			if (
				taskTimeWindowProperties &&
				Object.keys(taskTimeWindowProperties as IDataObject).length > 0
			) {
				const { startTime, endTime } = taskTimeWindowProperties as IDataObject;
				teamAutoDispatch.taskTimeWindow = [
					moment(new Date(startTime as Date))
						.local()
						.unix(),
					moment(new Date(endTime as Date))
						.local()
						.unix(),
				];
			}

			Object.assign(teamAutoDispatch, additionalFields);
			return teamAutoDispatch;
		}
		return null;
	}

	/**
	 * Execute the task operations
	 * @param resource Resource to be executed (Task)
	 * @param operation Operation to be executed
	 * @param items Number of items to process by the node
	 */
	static async executeTaskOperations(
		this: IWebhookFunctions | IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
		resource: string,
		operation: string,
		items: INodeExecutionData[],
	): Promise<IDataObject | IDataObject[]> {
		if (operation === 'create' && Object.keys(items).length > 1) {
			/* -------------------------------------------------------------------------- */
			/*                       Create multiple tasks by batch                       */
			/* -------------------------------------------------------------------------- */
			const path = `${resource}/batch`;
			const tasksData = {
				tasks: items.map((_item, index) => Onfleet.getTaskFields.call(this, index, operation)),
			};
			const { tasks: tasksCreated } = await onfleetApiRequest.call(this, 'POST', path, tasksData);
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
					if (!taskData) {
						continue;
					}
					responseData.push(await onfleetApiRequest.call(this, 'POST', resource, taskData));
				} else if (operation === 'get') {
					/* -------------------------------------------------------------------------- */
					/*                              Get a single task                             */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const shortId = String(id).length <= 8;
					const path = `${resource}${shortId ? '/shortId' : ''}/${id}`;
					responseData.push(await onfleetApiRequest.call(this, 'GET', path));
				} else if (operation === 'clone') {
					/* -------------------------------------------------------------------------- */
					/*                                Clone a task                                */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;

					const taskData = Onfleet.getTaskFields.call(this, index, operation) as any;
					if (!taskData) {
						continue;
					}
					const path = `${resource}/${id}/clone`;
					responseData.push(await onfleetApiRequest.call(this, 'POST', path, taskData));
				} else if (operation === 'delete') {
					/* -------------------------------------------------------------------------- */
					/*                            Delete a single task                            */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const path = `${resource}/${id}`;
					await onfleetApiRequest.call(this, 'DELETE', path);
					responseData.push({ success: true });
				} else if (operation === 'getAll') {
					/* -------------------------------------------------------------------------- */
					/*                                Get all tasks                               */
					/* -------------------------------------------------------------------------- */
					const taskData = Onfleet.getTaskFields.call(this, 0, operation) as IDataObject;
					if (!taskData) return [];
					const returnAll = this.getNodeParameter('returnAll', 0, false);
					const path = `${resource}/all`;
					let tasks;
					if (returnAll === true) {
						tasks = await onfleetApiRequestAllItems.call(this, 'tasks', 'GET', path, {}, taskData);
					} else {
						const limit = this.getNodeParameter('limit', 0);
						tasks = await onfleetApiRequest.call(this, 'GET', path, {}, taskData);
						tasks = tasks.tasks;
						tasks = tasks.splice(0, limit);
					}
					responseData.push(...(tasks as IDataObject[]));
				} else if (operation === 'complete') {
					/* -------------------------------------------------------------------------- */
					/*                            Force complete a task                           */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const taskData = Onfleet.getTaskFields.call(this, index, operation);
					if (!taskData) {
						continue;
					}
					const path = `${resource}/${id}/complete`;
					await onfleetApiRequest.call(this, 'POST', path, taskData);
					responseData.push({ success: true });
				} else if (operation === 'update') {
					/* -------------------------------------------------------------------------- */
					/*                                Update a task                               */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', 0) as string;
					const path = `${resource}/${id}`;
					const taskData = Onfleet.getTaskFields.call(this, index, operation);
					if (!taskData) {
						continue;
					}
					responseData.push(await onfleetApiRequest.call(this, 'PUT', path, taskData));
				}
			} catch (error) {
				//@ts-ignore
				if (this.continueOnFail()) {
					responseData.push({ error: (error as IDataObject).toString() });
					continue;
				}
				throw error;
			}
		}
		return responseData;
	}

	/**
	 * Execute the destination operations
	 * @param resource Resource to be executed (Destination)
	 * @param operation Operation to be executed
	 * @param items Number of items to process by the node
	 */
	static async executeDestinationOperations(
		this: IExecuteFunctions,
		resource: string,
		operation: string,
		items: INodeExecutionData[],
	): Promise<IDataObject | IDataObject[]> {
		const responseData = [];
		for (const key of Object.keys(items)) {
			const index = Number(key);
			try {
				if (operation === 'create') {
					/* -------------------------------------------------------------------------- */
					/*                             Create destination                             */
					/* -------------------------------------------------------------------------- */
					const destinationData = Onfleet.getDestinationFields.call(this, index, operation);
					if (!destinationData) {
						continue;
					}
					responseData.push(await onfleetApiRequest.call(this, 'POST', resource, destinationData));
				} else if (operation === 'get') {
					/* -------------------------------------------------------------------------- */
					/*                           Get single destination                           */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const path = `${resource}/${id}`;
					responseData.push(await onfleetApiRequest.call(this, 'GET', path));
				}
			} catch (error) {
				if (this.continueOnFail()) {
					responseData.push({ error: (error as IDataObject).toString() });
					continue;
				}
				throw error;
			}
		}

		return responseData;
	}

	/**
	 * Execute the organization operations
	 * @param resource Resource to be executed (Organization)
	 * @param operation Operation to be executed
	 * @param items Number of items to process by the node
	 */
	static async executeOrganizationOperations(
		this: IExecuteFunctions,
		resource: string,
		operation: string,
		items: INodeExecutionData[],
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
					responseData.push(await onfleetApiRequest.call(this, 'GET', path));
				} else if (operation === 'getDelegatee') {
					/* -------------------------------------------------------------------------- */
					/*                         Get organization delegatee                         */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const path = `${resource}/${id}`;
					responseData.push(await onfleetApiRequest.call(this, 'GET', path));
				}
			} catch (error) {
				if (this.continueOnFail()) {
					responseData.push({ error: (error as IDataObject).toString() });
					continue;
				}
				throw error;
			}
		}

		return responseData;
	}

	/**
	 * Execute the recipient operations
	 * @param resource Resource to be executed (Recipient)
	 * @param operation Operation to be executed
	 * @param items Number of items to process by the node
	 */
	static async executeRecipientOperations(
		this: IExecuteFunctions,
		resource: string,
		operation: string,
		items: INodeExecutionData[],
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
					if (!recipientData) {
						continue;
					}
					responseData.push(await onfleetApiRequest.call(this, 'POST', resource, recipientData));
				} else if (operation === 'update') {
					/* -------------------------------------------------------------------------- */
					/*                             Update a recipient                             */
					/* -------------------------------------------------------------------------- */
					const recipientData = Onfleet.getRecipientFields.call(this, index, operation);
					if (!recipientData) {
						continue;
					}
					const id = this.getNodeParameter('id', index) as string;
					const path = `${resource}/${id}`;
					responseData.push(await onfleetApiRequest.call(this, 'PUT', path, recipientData));
				} else if (operation === 'get') {
					/* -------------------------------------------------------------------------- */
					/*                          Get recipient information                         */
					/* -------------------------------------------------------------------------- */
					const lookupBy = this.getNodeParameter('getBy', index) as string;
					const lookupByValue = this.getNodeParameter(lookupBy, index) as string;
					const path = `${resource}${lookupBy === 'id' ? '' : '/' + lookupBy}/${lookupByValue}`;
					responseData.push(await onfleetApiRequest.call(this, 'GET', path));
				}
			} catch (error) {
				if (this.continueOnFail()) {
					responseData.push({ error: (error as IDataObject).toString() });
					continue;
				}
				throw error;
			}
		}

		return responseData;
	}

	/**
	 * Execute the administrator operations
	 * @param resource Resource to be executed (Administrator)
	 * @param operation Operation to be executed
	 * @param items Number of items to process by the node
	 */
	static async executeAdministratorOperations(
		this: IExecuteFunctions,
		resource: string,
		operation: string,
		items: INodeExecutionData[],
	): Promise<IDataObject | IDataObject[]> {
		const responseData = [];
		for (const key of Object.keys(items)) {
			const index = Number(key);
			try {
				if (operation === 'getAll') {
					/* -------------------------------------------------------------------------- */
					/*                             Get administrators                             */
					/* -------------------------------------------------------------------------- */

					const returnAll = this.getNodeParameter('returnAll', 0, false);
					let adminUsers = await onfleetApiRequest.call(this, 'GET', resource);
					if (!returnAll) {
						const limit = this.getNodeParameter('limit', 0);
						adminUsers = adminUsers.slice(0, limit);
					}
					responseData.push(...(adminUsers as IDataObject[]));
				} else if (operation === 'create') {
					/* -------------------------------------------------------------------------- */
					/*                             Create a new admin                             */
					/* -------------------------------------------------------------------------- */
					const adminData = Onfleet.getAdminFields.call(this, index, operation);
					responseData.push(await onfleetApiRequest.call(this, 'POST', resource, adminData));
				} else if (operation === 'update') {
					/* -------------------------------------------------------------------------- */
					/*                                Update admin                                */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const adminData = Onfleet.getAdminFields.call(this, index, operation);
					const path = `${resource}/${id}`;
					responseData.push(await onfleetApiRequest.call(this, 'PUT', path, adminData));
				} else if (operation === 'delete') {
					/* -------------------------------------------------------------------------- */
					/*                                Delete admin                                */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const path = `${resource}/${id}`;
					await onfleetApiRequest.call(this, 'DELETE', path);
					responseData.push({ success: true });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					responseData.push({ error: (error as IDataObject).toString() });
					continue;
				}
				throw error;
			}
		}
		return responseData;
	}

	/**
	 * Execute the hub operations
	 * @param resource Resource to be executed (Hub)
	 * @param operation Operation to be executed
	 * @param items Number of items to process by the node
	 */
	static async executeHubOperations(
		this: IExecuteFunctions,
		resource: string,
		operation: string,
		items: INodeExecutionData[],
	): Promise<IDataObject | IDataObject[]> {
		const responseData = [];
		for (const key of Object.keys(items)) {
			const index = Number(key);
			try {
				if (operation === 'getAll') {
					/* -------------------------------------------------------------------------- */
					/*                                Get all hubs                                */
					/* -------------------------------------------------------------------------- */

					const returnAll = this.getNodeParameter('returnAll', 0, false);
					let hubs = await onfleetApiRequest.call(this, 'GET', resource);
					if (!returnAll) {
						const limit = this.getNodeParameter('limit', 0);
						hubs = hubs.slice(0, limit);
					}
					responseData.push(...(hubs as IDataObject[]));
				} else if (operation === 'create') {
					/* -------------------------------------------------------------------------- */
					/*                              Create a new hub                              */
					/* -------------------------------------------------------------------------- */
					const hubData = Onfleet.getHubFields.call(this, index, operation);
					responseData.push(await onfleetApiRequest.call(this, 'POST', resource, hubData));
				}
				if (operation === 'update') {
					/* -------------------------------------------------------------------------- */
					/*                                Update a hub                                */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const hubData = Onfleet.getHubFields.call(this, index, operation);
					const path = `${resource}/${id}`;
					responseData.push(await onfleetApiRequest.call(this, 'PUT', path, hubData));
				}
			} catch (error) {
				if (this.continueOnFail()) {
					responseData.push({ error: (error as IDataObject).toString() });
					continue;
				}
				throw error;
			}
		}

		return responseData;
	}

	/**
	 * Execute the worker operations
	 * @param resource Resource to be executed (Worker)
	 * @param operation Operation to be executed
	 * @param items Number of items to process by the node
	 */
	static async executeWorkerOperations(
		this: IExecuteFunctions,
		resource: string,
		operation: string,
		items: INodeExecutionData[],
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
					const returnAll = this.getNodeParameter('returnAll', index, false);
					let workers;

					if (byLocation) {
						const longitude = this.getNodeParameter('longitude', index) as string;
						const latitude = this.getNodeParameter('latitude', index) as number;
						const filters = this.getNodeParameter('filters', index);
						const path = `${resource}/location`;
						workers = await onfleetApiRequest.call(
							this,
							'GET',
							path,
							{},
							{ longitude, latitude, ...filters },
						);
						workers = workers.workers;
					} else {
						const workerFilters = Onfleet.getWorkerFields.call(
							this,
							0,
							operation,
						) as OnfleetWorkerFilter;
						workers = await onfleetApiRequest.call(this, 'GET', resource, {}, workerFilters);
					}

					if (!returnAll) {
						const limit = this.getNodeParameter('limit', index);
						workers = workers.slice(0, limit);
					}

					responseData.push(...(workers as IDataObject[]));
				} else if (operation === 'get') {
					/* -------------------------------------------------------------------------- */
					/*                                Get a worker                                */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const workerFilters = Onfleet.getWorkerFields.call(
						this,
						index,
						operation,
					) as OnfleetWorkerFilter;

					const path = `${resource}/${id}`;
					responseData.push(await onfleetApiRequest.call(this, 'GET', path, {}, workerFilters));
				} else if (operation === 'create') {
					/* -------------------------------------------------------------------------- */
					/*                             Create a new worker                            */
					/* -------------------------------------------------------------------------- */
					const workerData = Onfleet.getWorkerFields.call(this, index, operation);
					responseData.push(await onfleetApiRequest.call(this, 'POST', resource, workerData));
				} else if (operation === 'update') {
					/* -------------------------------------------------------------------------- */
					/*                                Update worker                               */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const workerData = Onfleet.getWorkerFields.call(this, index, operation);
					const path = `${resource}/${id}`;
					responseData.push(await onfleetApiRequest.call(this, 'PUT', path, workerData));
				} else if (operation === 'delete') {
					/* -------------------------------------------------------------------------- */
					/*                                Delete worker                               */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const path = `${resource}/${id}`;
					await onfleetApiRequest.call(this, 'DELETE', path);
					responseData.push({ success: true });
				} else if (operation === 'getSchedule') {
					/* -------------------------------------------------------------------------- */
					/*                             Get worker schedule                            */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const path = `${resource}/${id}/schedule`;
					responseData.push(await onfleetApiRequest.call(this, 'GET', path));
				} else if (operation === 'setSchedule') {
					/* -------------------------------------------------------------------------- */
					/*                            Set a worker schedule                           */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const workerSchedule = Onfleet.getWorkerFields.call(
						this,
						index,
						operation,
					) as OnfleetWorkerSchedule;
					const path = `${resource}/${id}/schedule`;
					responseData.push(await onfleetApiRequest.call(this, 'POST', path, workerSchedule));
				}
			} catch (error) {
				if (this.continueOnFail()) {
					responseData.push({ error: (error as IDataObject).toString() });
					continue;
				}
				throw error;
			}
		}
		return responseData;
	}

	/**
	 * Execute the webhook operations
	 * @param resource Resource to be executed (Webhook)
	 * @param operation Operation to be executed
	 * @param items Number of items to process by the node
	 */
	static async executeWebhookOperations(
		this: IExecuteFunctions,
		resource: string,
		operation: string,
		items: INodeExecutionData[],
	): Promise<IDataObject | IDataObject[]> {
		const responseData = [];
		for (const key of Object.keys(items)) {
			const index = Number(key);
			try {
				if (operation === 'getAll') {
					/* -------------------------------------------------------------------------- */
					/*                              Get all webhooks                              */
					/* -------------------------------------------------------------------------- */
					responseData.push(
						...((await onfleetApiRequest.call(this, 'GET', resource)) as IDataObject[]),
					);
				} else if (operation === 'create') {
					/* -------------------------------------------------------------------------- */
					/*                            Create a new webhook                            */
					/* -------------------------------------------------------------------------- */
					const webhookData = Onfleet.getWebhookFields.call(this, index, operation);
					responseData.push(await onfleetApiRequest.call(this, 'POST', resource, webhookData));
				} else if (operation === 'delete') {
					/* -------------------------------------------------------------------------- */
					/*                              Delete a webhook                              */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const path = `${resource}/${id}`;
					await onfleetApiRequest.call(this, 'DELETE', path);
					responseData.push({ success: true });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					responseData.push({ error: (error as IDataObject).toString() });
					continue;
				}
				throw error;
			}
		}

		return responseData;
	}

	/**
	 * Execute the containers operations
	 * @param resource Resource to be executed (Container)
	 * @param operation Operation to be executed
	 * @param items Number of items to process by the node
	 */
	static async executeContainerOperations(
		this: IExecuteFunctions,
		resource: string,
		operation: string,
		items: INodeExecutionData[],
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
					responseData.push(await onfleetApiRequest.call(this, 'GET', path));
				} else if (['addTask', 'updateTask'].includes(operation)) {
					/* -------------------------------------------------------------------------- */
					/*                      Add or update tasks to container                      */
					/* -------------------------------------------------------------------------- */
					const containerId = this.getNodeParameter('containerId', index) as string;
					const containerType = this.getNodeParameter('containerType', index, 'workers') as string;
					const options = this.getNodeParameter('options', index);

					const tasks = this.getNodeParameter('tasks', index) as Array<string | number>;
					if (operation === 'addTask') {
						const type = this.getNodeParameter('type', index) as number;
						if (type === 1) {
							const tasksIndex = this.getNodeParameter('index', index) as number;
							tasks.unshift(tasksIndex);
						} else {
							tasks.unshift(type);
						}
					}

					const path = `${resource}/${containerType}/${containerId}`;
					responseData.push(await onfleetApiRequest.call(this, 'PUT', path, { tasks, ...options }));
				}
			} catch (error) {
				if (this.continueOnFail()) {
					responseData.push({ error: (error as IDataObject).toString() });
					continue;
				}
				throw error;
			}
		}

		return responseData;
	}

	/**
	 * Execute the team operations
	 * @param resource Resource to be executed (Team)
	 * @param operation Operation to be executed
	 * @param items Number of items to process by the node
	 */
	static async executeTeamOperations(
		this: IExecuteFunctions,
		resource: string,
		operation: string,
		items: INodeExecutionData[],
	): Promise<IDataObject | IDataObject[]> {
		const responseData = [];
		for (const key of Object.keys(items)) {
			const index = Number(key);
			try {
				if (operation === 'getAll') {
					/* -------------------------------------------------------------------------- */
					/*                                Get all teams                               */
					/* -------------------------------------------------------------------------- */
					const returnAll = this.getNodeParameter('returnAll', 0, false);
					let teams = await onfleetApiRequest.call(this, 'GET', resource);
					if (!returnAll) {
						const limit = this.getNodeParameter('limit', 0);
						teams = teams.slice(0, limit);
					}

					responseData.push(...(teams as IDataObject[]));
				} else if (operation === 'get') {
					/* -------------------------------------------------------------------------- */
					/*                              Get a single team                             */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const path = `${resource}/${id}`;
					responseData.push(await onfleetApiRequest.call(this, 'GET', path));
				} else if (operation === 'create') {
					/* -------------------------------------------------------------------------- */
					/*                              Create a new team                             */
					/* -------------------------------------------------------------------------- */
					const teamData = Onfleet.getTeamFields.call(this, index, operation);
					responseData.push(await onfleetApiRequest.call(this, 'POST', resource, teamData));
				} else if (operation === 'update') {
					/* -------------------------------------------------------------------------- */
					/*                                Update a team                               */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const teamData = Onfleet.getTeamFields.call(this, index, operation);
					const path = `${resource}/${id}`;
					responseData.push(await onfleetApiRequest.call(this, 'PUT', path, teamData));
				} else if (operation === 'delete') {
					/* -------------------------------------------------------------------------- */
					/*                                Delete a team                               */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const path = `${resource}/${id}`;
					await onfleetApiRequest.call(this, 'DELETE', path);
					responseData.push({ success: true });
				} else if (operation === 'getTimeEstimates') {
					/* -------------------------------------------------------------------------- */
					/*      Get driver time estimates for tasks that haven't been created yet     */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const workerTimeEstimates = Onfleet.getTeamFields.call(
						this,
						index,
						operation,
					) as OnfleetWorkerSchedule;
					const path = `${resource}/${id}/estimate`;
					responseData.push(
						await onfleetApiRequest.call(this, 'GET', path, {}, workerTimeEstimates),
					);
				} else if (operation === 'autoDispatch') {
					/* -------------------------------------------------------------------------- */
					/*                  Dynamically dispatching tasks on the fly                  */
					/* -------------------------------------------------------------------------- */
					const id = this.getNodeParameter('id', index) as string;
					const teamAutoDispatch = Onfleet.getTeamFields.call(
						this,
						index,
						operation,
					) as OnfleetWorkerSchedule;
					const path = `${resource}/${id}/dispatch`;
					responseData.push(await onfleetApiRequest.call(this, 'POST', path, teamAutoDispatch));
				}
			} catch (error) {
				if (this.continueOnFail()) {
					responseData.push({ error: (error as IDataObject).toString() });
					continue;
				}
				throw error;
			}
		}

		return responseData;
	}
}

import moment from 'moment-timezone';
import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { aliasFields, aliasOperations } from './AliasDescription';
import { eventFields, eventOperations } from './EventDescription';
import type { IAlias, IEvent, IIdentity, ITrack } from './GenericFunctions';
import { posthogApiRequest } from './GenericFunctions';
import { identityFields, identityOperations } from './IdentityDescription';
import { trackFields, trackOperations } from './TrackDescription';

export class PostHog implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PostHog',
		name: 'postHog',
		icon: 'file:postHog.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume PostHog API',
		defaults: {
			name: 'PostHog',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'postHogApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Alias',
						value: 'alias',
					},
					{
						name: 'Event',
						value: 'event',
					},
					{
						name: 'Identity',
						value: 'identity',
					},
					{
						name: 'Track',
						value: 'track',
					},
				],
				default: 'event',
			},
			...aliasOperations,
			...aliasFields,
			...eventOperations,
			...eventFields,
			...identityOperations,
			...identityFields,
			...trackOperations,
			...trackFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		if (resource === 'alias') {
			if (operation === 'create') {
				for (let i = 0; i < length; i++) {
					try {
						const distinctId = this.getNodeParameter('distinctId', i) as string;

						const alias = this.getNodeParameter('alias', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						const context =
							((additionalFields.contextUi as IDataObject)?.contextValues as IDataObject[]) || [];

						const event: IAlias = {
							type: 'alias',
							event: '$create_alias',
							context: context.reduce(
								(obj, value) => Object.assign(obj, { [`${value.key}`]: value.value }),
								{},
							),
							properties: {
								distinct_id: distinctId,
								alias,
							},
						};

						Object.assign(event, additionalFields);

						if (additionalFields.timestamp) {
							additionalFields.timestamp = moment(
								additionalFields.timestamp as string,
							).toISOString();
						}

						responseData = await posthogApiRequest.call(this, 'POST', '/batch', event);

						returnData.push(responseData as IDataObject);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({ error: error.message });
							continue;
						}
						throw error;
					}
				}
			}
		}

		if (resource === 'event') {
			if (operation === 'create') {
				try {
					const events: IEvent[] = [];
					for (let i = 0; i < length; i++) {
						const eventName = this.getNodeParameter('eventName', i) as string;

						const distinctId = this.getNodeParameter('distinctId', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						const properties =
							((additionalFields.propertiesUi as IDataObject)?.propertyValues as IDataObject[]) ||
							[];

						const event: IEvent = {
							event: eventName,
							properties: properties.reduce(
								(obj, value) => Object.assign(obj, { [`${value.key}`]: value.value }),
								{},
							),
						};

						event.properties.distinct_id = distinctId;

						Object.assign(event, additionalFields);

						if (additionalFields.timestamp) {
							additionalFields.timestamp = moment(
								additionalFields.timestamp as string,
							).toISOString();
						}
						//@ts-ignore
						delete event.propertiesUi;

						events.push(event);
					}

					responseData = await posthogApiRequest.call(this, 'POST', '/capture', { batch: events });

					returnData.push(responseData as IDataObject);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({ error: error.message });
					} else {
						throw error;
					}
				}
			}
		}

		if (resource === 'identity') {
			if (operation === 'create') {
				for (let i = 0; i < length; i++) {
					try {
						const distinctId = this.getNodeParameter('distinctId', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						const properties =
							((additionalFields.propertiesUi as IDataObject)?.propertyValues as IDataObject[]) ||
							[];

						const event: IIdentity = {
							event: '$identify',
							properties: properties.reduce(
								(obj, value) => Object.assign(obj, { [`${value.key}`]: value.value }),
								{},
							),
							distinct_id: distinctId,
						};

						Object.assign(event, additionalFields);

						if (additionalFields.timestamp) {
							additionalFields.timestamp = moment(
								additionalFields.timestamp as string,
							).toISOString();
						}
						//@ts-ignore
						delete event.propertiesUi;

						responseData = await posthogApiRequest.call(this, 'POST', '/batch', event);

						returnData.push(responseData as IDataObject);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({ error: error.message });
							continue;
						}
						throw error;
					}
				}
			}
		}

		if (resource === 'track') {
			if (operation === 'page' || operation === 'screen') {
				for (let i = 0; i < length; i++) {
					try {
						const distinctId = this.getNodeParameter('distinctId', i) as string;

						const name = this.getNodeParameter('name', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						const context =
							((additionalFields.contextUi as IDataObject)?.contextValues as IDataObject[]) || [];

						const properties =
							((additionalFields.propertiesUi as IDataObject)?.propertyValues as IDataObject[]) ||
							[];

						const event: ITrack = {
							name,
							type: operation,
							event: `$${operation}`,
							context: context.reduce(
								(obj, value) => Object.assign(obj, { [`${value.key}`]: value.value }),
								{},
							),
							distinct_id: distinctId,
							properties: properties.reduce(
								(obj, value) => Object.assign(obj, { [`${value.key}`]: value.value }),
								{},
							),
						};

						Object.assign(event, additionalFields);

						if (additionalFields.timestamp) {
							additionalFields.timestamp = moment(
								additionalFields.timestamp as string,
							).toISOString();
						}
						//@ts-ignore
						delete event.propertiesUi;

						responseData = await posthogApiRequest.call(this, 'POST', '/batch', event);

						returnData.push(responseData as IDataObject);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({ error: error.message });
							continue;
						}
						throw error;
					}
				}
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}

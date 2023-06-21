import type {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	ITriggerFunctions,
	ITriggerResponse,
} from 'n8n-workflow';
import {
	dropTriggerFunction,
	pgTriggerFunction,
	initDB,
	searchSchema,
	searchTables,
} from './PostgresTrigger.functions';

export class PostgresTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Postgres Trigger',
		name: 'postgresTrigger',
		icon: 'file:postgres.svg',
		group: ['trigger'],
		version: 1,
		description: 'Listens to Postgres messages',
		defaults: {
			name: 'Postgres Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'postgres',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Trigger Mode',
				name: 'triggerMode',
				type: 'options',
				options: [
					{
						name: 'Listen and Create Trigger Rule',
						value: 'createTrigger',
						description: 'Create a trigger rule and listen to it',
					},
					{
						name: 'Listen to Channel',
						value: 'listenTrigger',
						description: 'Receive real-time notifications from a channel',
					},
				],
				default: 'createTrigger',
			},
			{
				displayName: 'Schema Name',
				name: 'schema',
				type: 'resourceLocator',
				default: { mode: 'list', value: 'public' },
				required: true,
				displayOptions: {
					show: {
						triggerMode: ['createTrigger'],
					},
				},
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a schema',
						typeOptions: {
							searchListMethod: 'searchSchema',
							searchFilterRequired: false,
						},
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						placeholder: 'e.g. public',
					},
				],
			},
			{
				displayName: 'Table Name',
				name: 'tableName',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				displayOptions: {
					show: {
						triggerMode: ['createTrigger'],
					},
				},
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a table',
						typeOptions: {
							searchListMethod: 'searchTables',
							searchFilterRequired: false,
						},
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						placeholder: 'e.g. table_name',
					},
				],
			},
			{
				displayName: 'Channel Name',
				name: 'channelName',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. n8n_channel',
				description: 'Name of the channel to listen to',
				displayOptions: {
					show: {
						triggerMode: ['listenTrigger'],
					},
				},
			},
			{
				displayName: 'Events to Listen To',
				name: 'firesOn',
				type: 'options',
				displayOptions: {
					show: {
						triggerMode: ['createTrigger'],
					},
				},
				options: [
					{
						name: 'Insert',
						value: 'INSERT',
					},
					{
						name: 'Update',
						value: 'UPDATE',
					},
					{
						name: 'Delete',
						value: 'DELETE',
					},
				],
				default: 'INSERT',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						triggerMode: ['createTrigger'],
					},
				},
				options: [
					{
						displayName: 'Channel Name',
						name: 'channelName',
						type: 'string',
						placeholder: 'e.g. n8n_channel',
						description: 'Name of the channel to listen to',
						default: '',
					},

					{
						displayName: 'Function Name',
						name: 'functionName',
						type: 'string',
						description: 'Name of the function to create',
						placeholder: 'e.g. n8n_trigger_function()',
						default: '',
					},
					{
						displayName: 'Replace if Exists',
						name: 'replaceIfExists',
						type: 'boolean',
						description: 'Whether to replace an existing function and trigger with the same name',
						default: false,
					},
					{
						displayName: 'Trigger Name',
						name: 'triggerName',
						type: 'string',
						description: 'Name of the trigger to create',
						placeholder: 'e.g. n8n_trigger',
						default: '',
					},
				],
			},
		],
	};

	methods = {
		listSearch: {
			searchSchema,
			searchTables,
		},
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const triggerMode = this.getNodeParameter('triggerMode', 0) as string;
		const additionalFields = this.getNodeParameter('additionalFields', 0) as IDataObject;

		const db = await initDB.call(this);
		if (triggerMode === 'createTrigger') {
			await pgTriggerFunction.call(this, db);
		}
		const channelName =
			triggerMode === 'createTrigger'
				? additionalFields.channelName || `n8n_channel_${this.getNode().id.replace(/-/g, '_')}`
				: (this.getNodeParameter('channelName', 0) as string);

		const onNotification = async (data: any) => {
			if (data.payload) {
				try {
					data.payload = JSON.parse(data.payload as string);
				} catch (error) {}
			}
			this.emit([this.helpers.returnJsonArray([data])]);
		};

		const connection = await db.connect({ direct: true });
		connection.client.on('notification', onNotification);
		await connection.none(`LISTEN ${channelName}`);

		// The "closeFunction" function gets called by n8n whenever
		// the workflow gets deactivated and can so clean up.
		const closeFunction = async () => {
			connection.client.removeListener('notification', onNotification);
			await connection.none(`UNLISTEN ${channelName}`);
			if (triggerMode === 'createTrigger') {
				await dropTriggerFunction.call(this, db);
			}
			await db.$pool.end();
		};

		return {
			closeFunction,
		};
	}
}

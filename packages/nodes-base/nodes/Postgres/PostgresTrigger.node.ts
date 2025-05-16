import {
	TriggerCloseError,
	type IDataObject,
	type INodeType,
	type INodeTypeDescription,
	type ITriggerFunctions,
	type ITriggerResponse,
	NodeConnectionTypes,
} from 'n8n-workflow';

import {
	pgTriggerFunction,
	initDB,
	searchSchema,
	searchTables,
	prepareNames,
} from './PostgresTrigger.functions';

export class PostgresTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Postgres Trigger',
		name: 'postgresTrigger',
		icon: 'file:postgres.svg',
		group: ['trigger'],
		version: 1,
		description: 'Listens to Postgres messages',
		eventTriggerDescription: '',
		defaults: {
			name: 'Postgres Trigger',
		},
		triggerPanel: {
			header: '',
			executionsHelp: {
				inactive:
					"<b>While building your workflow</b>, click the 'execute step' button, then trigger a Postgres event. This will trigger an execution, which will show up in this editor.<br /> <br /><b>Once you're happy with your workflow</b>, <a data-key='activate'>activate</a> it. Then every time a change is detected, the workflow will execute. These executions will show up in the <a data-key='executions'>executions list</a>, but not in the editor.",
				active:
					"<b>While building your workflow</b>, click the 'execute step' button, then trigger a Postgres event. This will trigger an execution, which will show up in this editor.<br /> <br /><b>Your workflow will also execute automatically</b>, since it's activated. Every time a change is detected, this node will trigger an execution. These executions will show up in the <a data-key='executions'>executions list</a>, but not in the editor.",
			},
			activationHint:
				"Once you've finished building your workflow, <a data-key='activate'>activate</a> it to have it also listen continuously (you just won't see those executions here).",
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'postgres',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Listen For',
				name: 'triggerMode',
				type: 'options',
				options: [
					{
						name: 'Table Row Change Events',
						value: 'createTrigger',
						description: 'Insert, update or delete',
					},
					{
						name: 'Advanced',
						value: 'listenTrigger',
						description: 'Listen to existing Postgres channel',
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
				displayName: 'Event to listen for',
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
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Connection Timeout',
						name: 'connectionTimeout',
						type: 'number',
						default: 30,
						description: 'Number of seconds reserved for connecting to the database',
					},
					{
						displayName: 'Delay Closing Idle Connection',
						name: 'delayClosingIdleConnection',
						type: 'number',
						default: 0,
						description:
							'Number of seconds to wait before idle connection would be eligible for closing',
						typeOptions: {
							minValue: 0,
						},
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

		// initialize and connect to database
		const { db } = await initDB.call(this);
		const connection = await db.connect({ direct: true });

		// prepare and set up listener
		const onNotification = async (data: IDataObject) => {
			if (data.payload) {
				try {
					data.payload = JSON.parse(data.payload as string) as IDataObject;
				} catch (error) {}
			}
			this.emit([this.helpers.returnJsonArray([data])]);
		};

		// create trigger, function and channel or use existing channel
		const pgNames = prepareNames(this.getNode().id, this.getMode(), additionalFields);
		if (triggerMode === 'createTrigger') {
			await pgTriggerFunction.call(
				this,
				db,
				additionalFields,
				pgNames.functionName,
				pgNames.triggerName,
				pgNames.channelName,
			);
		} else {
			pgNames.channelName = this.getNodeParameter('channelName', '') as string;
		}

		// listen to channel
		await connection.none(`LISTEN ${pgNames.channelName}`);

		const cleanUpDb = async () => {
			try {
				try {
					// check if the connection is healthy
					await connection.query('SELECT 1');
				} catch {
					// connection already closed. Can't perform cleanup

					throw new TriggerCloseError(this.getNode(), { level: 'warning' });
				}

				try {
					await connection.none('UNLISTEN $1:name', [pgNames.channelName]);
					if (triggerMode === 'createTrigger') {
						const functionName = pgNames.functionName.includes('(')
							? pgNames.functionName.split('(')[0]
							: pgNames.functionName;
						await connection.any('DROP FUNCTION IF EXISTS $1:name CASCADE', [functionName]);

						const schema = this.getNodeParameter('schema', undefined, {
							extractValue: true,
						}) as string;
						const table = this.getNodeParameter('tableName', undefined, {
							extractValue: true,
						}) as string;

						await connection.any('DROP TRIGGER IF EXISTS $1:name ON $2:name.$3:name CASCADE', [
							pgNames.triggerName,
							schema,
							table,
						]);
					}
				} catch (error) {
					throw new TriggerCloseError(this.getNode(), { cause: error as Error, level: 'error' });
				}
			} finally {
				connection.client.removeListener('notification', onNotification);
			}
		};

		connection.client.on('notification', onNotification);

		// The "closeFunction" function gets called by n8n whenever
		// the workflow gets deactivated and can so clean up.
		const closeFunction = async () => {
			await cleanUpDb();
		};

		const manualTriggerFunction = async () => {
			await new Promise(async (resolve, reject) => {
				const timeoutHandler = setTimeout(async () => {
					reject(
						new Error(
							await (async () => {
								await cleanUpDb();
								return 'Aborted, no data received within 30secs. This 30sec timeout is only set for "manually triggered execution". Active Workflows will listen indefinitely.';
							})(),
						),
					);
				}, 60000);
				connection.client.on('notification', async (data: IDataObject) => {
					if (data.payload) {
						try {
							data.payload = JSON.parse(data.payload as string) as IDataObject;
						} catch (error) {}
					}

					this.emit([this.helpers.returnJsonArray([data])]);
					clearTimeout(timeoutHandler);
					resolve(true);
				});
			});
		};

		return {
			closeFunction,
			manualTriggerFunction: this.getMode() === 'manual' ? manualTriggerFunction : undefined,
		};
	}
}

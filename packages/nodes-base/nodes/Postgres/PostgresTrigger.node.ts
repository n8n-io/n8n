import type {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	ITriggerFunctions,
	ITriggerResponse,
} from 'n8n-workflow';
import pgPromise from 'pg-promise';

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
					},
					{
						name: 'Listen to Existing Trigger Rule',
						value: 'listenTrigger',
					},
				],
				default: 'createTrigger',
				description:
					'Listen and Create Trigger Rule: Creates a trigger rule and listens to it. Listen to Existing Trigger Rule: Listens to an channel.',
			},
			{
				displayName: 'Channel Name',
				name: 'channelName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						triggerMode: ['listenTrigger'],
					},
				},
			},
			{
				displayName: 'Table Name',
				name: 'tableName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						triggerMode: ['createTrigger'],
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
				options: [],
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const credentials = await this.getCredentials('postgres');
		const triggerMode = this.getNodeParameter('triggerMode', 0) as string;
		const tableName = this.getNodeParameter('tableName', 0) as string;
		const firesOn = this.getNodeParameter('firesOn', 0) as string;
		const pgp = pgPromise();

		const config: IDataObject = {
			host: credentials.host as string,
			port: credentials.port as number,
			database: credentials.database as string,
			user: credentials.user as string,
			password: credentials.password as string,
		};

		if (credentials.allowUnauthorizedCerts === true) {
			config.ssl = {
				rejectUnauthorized: false,
			};
		} else {
			config.ssl = !['disable', undefined].includes(credentials.ssl as string | undefined);
			config.sslmode = (credentials.ssl as string) || 'disable';
		}

		const db = pgp(config);
		let channelName;
		if (triggerMode === 'createTrigger') {
			db.
		}
		channelName = triggerMode === 'createTrigger' ? channelName : this.getNodeParameter('channelName', 0) as string;
		db.connect({ direct: true })
			.then(async (connection) => {
				connection.client.on('notification', async (data) => {
					console.log('Received: ', data);
					this.emit([this.helpers.returnJsonArray([data])]);
				});
				return connection.none('LISTEN new_testevent');
			})
			.catch(function (error) {
				console.error('Error:', error);
			});

		const startConsumer = async () => {};

		await startConsumer();

		// The "closeFunction" function gets called by n8n whenever
		// the workflow gets deactivated and can so clean up.
		const closeFunction = async () => {};

		return {
			closeFunction,
		};
	}
}

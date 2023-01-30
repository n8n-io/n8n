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
		description: 'Listens to RabbitMQ messages',
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
				displayName: 'Queue / Topic',
				name: 'queue',
				type: 'string',
				default: '',
				placeholder: 'queue-name',
				description: 'The name of the queue to read from',
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const credentials = await this.getCredentials('postgres');
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
		db.connect({ direct: true })
			.then(async (connection) => {
				console.log('Connected to database');
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

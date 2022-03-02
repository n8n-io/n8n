import {
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecuteFunctions,
	INodeParameters,
	ITriggerFunctions,
	NodeParameterValue,
} from 'n8n-workflow';
import * as amqplib from 'amqplib';
import amqp, { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';

// maintain and auto-reconnect one connection per set of credentials
const connections = new Map<string, AmqpConnectionManager>();

export function isDataObject(value: IDataObject[string]): value is IDataObject {
	return !!value && typeof value === 'object';
}

export async function rabbitmqConnect(
	functions: IExecuteFunctions | ITriggerFunctions,
	setup: (this: ChannelWrapper, channel: amqplib.Channel) => Promise<void>,
): Promise<ChannelWrapper> {
	const credentials = await functions.getCredentials('rabbitmq');
	const connection = getConnection(credentials);
	const channel = connection.createChannel({ setup });

	const mode = 'getActivationMode' in functions && functions.getActivationMode();
	if (mode && ['manual', 'activate'].includes(mode)) {
		// this is started from the ux, so don't just silently retry
		await waitForConnectOrFail(channel);
	}
	return channel;
}

/** If the channel doesn't connect successfully, close the channel and error out. */
async function waitForConnectOrFail(
	channel: ChannelWrapper,
	timeout = 20000,
): Promise<void> {
	const failPromise = new Promise((resolve, reject) => {
		setTimeout(reject, 20000, new Error('Timeout while waiting for RabbitMQ channel'));
		channel.once('error', reject);
	});
	try {
		await Promise.race([channel.waitForConnect(), failPromise]);
	} catch (error) {
		channel.close();
		throw error;
	}
}

/** Get or create a new managed connection that automatically reconnects */
function getConnection(
	credentials: ICredentialDataDecryptedObject | undefined,
): AmqpConnectionManager {
	if (!credentials) {
		throw new Error('RabbitMQ credentials required to connect');
	}

	const connectionKey = JSON.stringify(credentials);
	let connection = connections.get(connectionKey);
	if (!connection) {
		connection = createConnection(credentials);
		connections.set(connectionKey, connection);
	}
	return connection;
}

/** Create connection manager with the default options (5-second heartbeat and retry) */
function createConnection(
	credentials: ICredentialDataDecryptedObject,
): AmqpConnectionManager {
	const [creds, connectionOptions] = getConnectArgs(credentials);
	const name = `${creds.hostname}:${creds.port}`;

	const connection = amqp.connect(creds, { connectionOptions })
		.on('error', (err) => {
			console.warn(`RabbitMQ: Connection error for ${name}: ${err.message}`);
		})
		.on('blocked', ({ reason }) => {
			console.warn(`RabbitMQ: Connection blocked for ${name}: ${reason}`);
		})
		.on('disconnect', ({ err }) => {
			console.log(`RabbitMQ: Connection closed for ${name}: ${err.message}`);
		});

	console.log(`RabbitMQ: Created managed connection for ${name}`);
	return connection;
}

function getConnectArgs(credentials: IDataObject) {
	const credentialKeys = [
		'hostname',
		'port',
		'username',
		'password',
		'vhost',
	];

	const credentialData: IDataObject = {};
	credentialKeys.forEach(key => {
		credentialData[key] = credentials[key] === '' ? undefined : credentials[key];
	});

	const optsData: IDataObject = {};
	if (credentials.ssl === true) {
		credentialData.protocol = 'amqps';

		optsData.ca = credentials.ca === '' ? undefined : [Buffer.from(credentials.ca as string)];
		if (credentials.passwordless === true) {
			optsData.cert = credentials.cert === '' ? undefined : Buffer.from(credentials.cert as string);
			optsData.key = credentials.key === '' ? undefined : Buffer.from(credentials.key as string);
			optsData.passphrase = credentials.passphrase === '' ? undefined : credentials.passphrase;
			optsData.credentials = amqplib.credentials.external();
		}
	}
	return [credentialData, optsData];
}

/** Form assertQueue/assertExchange options from n8n parameter values. */
export function fixAssertOptions(
	options: object | INodeParameters | NodeParameterValue | NodeParameterValue[] | INodeParameters[],
): amqplib.Options.AssertQueue | amqplib.Options.AssertExchange {
	if (!isDataObject(options)) {
		throw Error('Unexpected type for RabbitMQ options');
	}
	const { arguments: args, ...otherOptions } = options;
	return {
		...otherOptions,
		arguments: parameterValueToObj(args, 'argument'),
	};
}

/** Form publish/sendToQueue options from n8n parameter values. */
export function fixMessageOptions(
	options: object | INodeParameters | NodeParameterValue | NodeParameterValue[] | INodeParameters[],
): amqplib.Options.Publish {
	if (!isDataObject(options)) {
		throw new Error('Unexpected type for options');
	}
	const { headers, ...otherOptions } = options;
	return {
		...otherOptions,
		headers: parameterValueToObj(headers, 'header'),
	};
}

/** Maps the values of a fixed collection of key-value pairs to { key: value }. */
function parameterValueToObj(
	value: object | INodeParameters | NodeParameterValue | NodeParameterValue[] | INodeParameters[],
	optionName: string,
): IDataObject {
	const obj: IDataObject = {};
	if (isDataObject(value)) {
		const keyValPairs = value[optionName];
		if (Array.isArray(keyValPairs)) {
			keyValPairs.forEach((keyValPair) => {
				if (isDataObject(keyValPair)) {
					obj[String(keyValPair.key)] = keyValPair.value;
				}
			});
		}
	}
	return obj;
}

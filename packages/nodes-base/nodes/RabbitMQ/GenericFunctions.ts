import {
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecuteFunctions,
	ITriggerFunctions,
} from 'n8n-workflow';

import * as amqplib from 'amqplib';
import amqp, { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';

// maintain and auto-reconnect one connection per set of credentials
const allConnections = new Map<string, AmqpConnectionManager>();

export async function rabbitmqConnect(
	self: IExecuteFunctions | ITriggerFunctions,
	setup: (this: ChannelWrapper, channel: amqplib.Channel) => Promise<void>,
): Promise<[ChannelWrapper, AmqpConnectionManager]> {
	const credentials = await self.getCredentials('rabbitmq');

	return new Promise(async (resolve, reject) => {
		try {
			const connection = getConnection(credentials);
			const channel = connection.createChannel({ setup });

			const mode = 'getActivationMode' in self && self.getActivationMode();

			// this is manual execution, so don't just silently retry
			if (mode && ['manual', 'activate'].includes(mode)) {
				await manualExecutionWaitOrFail(channel);
			}

			resolve([channel, connection]);
		} catch (error) {
			reject(error);
		}
	});
}

/** If the channel doesn't connect successfully, close the channel and error out. */
async function manualExecutionWaitOrFail(channel: ChannelWrapper, timeout = 20000): Promise<void> {
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

// Get or create a new managed connection that automatically reconnects
function getConnection(credentials: ICredentialDataDecryptedObject | undefined): AmqpConnectionManager {
	if (!credentials) {
		throw new Error('RabbitMQ credentials required to connect');
	}

	const connectionKey = JSON.stringify(credentials);

	let connection = allConnections.get(connectionKey);

	if (!connection) {
		connection = createConnection(credentials);
		allConnections.set(connectionKey, connection);
	}

	return connection;
}

// Create connection manager with the default options (5-second heartbeat and retry)
function createConnection(credentials: ICredentialDataDecryptedObject): AmqpConnectionManager {
	const [credentialData, connectionOptions] = getConnectionArguments(credentials);
	const name = `${credentialData.hostname}:${credentialData.port}`;

	const connection = amqp
		.connect(credentialData, { connectionOptions })
		.on('error', (err) => {
			console.warn(`RabbitMQ: Connection error for ${name}: ${err.message}`);
		})
		.on('blocked', ({ reason }) => {
			console.warn(`RabbitMQ: Connection blocked for ${name}: ${reason}`);
		})
		.on('connectFailed', ({err, url}) => {
			console.warn(`RabbitMQ: Connection failed for ${name}: ${err.message}`);
		})
		.on('disconnect', ({ err }) => {
			console.warn(`RabbitMQ: Connection closed for ${name}: ${err.message}`);
		});

	console.log(`RabbitMQ: Created managed connection for ${name}`);

	return connection;
}

function getConnectionArguments(credentials: IDataObject) {
	const credentialKeys = ['hostname', 'port', 'username', 'password', 'vhost'];

	const credentialData: IDataObject = {};

	credentialKeys.forEach((key) => {
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

export class MessageTracker {
	messages: number[] = [];
	isClosing = false;

	received(message: amqplib.ConsumeMessage) {
		this.messages.push(message.fields.deliveryTag);
	}

	answered(message: amqplib.ConsumeMessage) {
		if (this.messages.length === 0) {
			return;
		}

		const index = this.messages.findIndex(value => value !== message.fields.deliveryTag);
		this.messages.splice(index);
	}

	unansweredMessages() {
		return this.messages.length;
	}

	async closeChannel(channel: ChannelWrapper) {
		if (this.isClosing) {
			return;
		}
		this.isClosing = true;

		// Do not accept any new messages
		await channel.cancelAll();

		let count = 0;
		let unansweredMessages = this.unansweredMessages();

		// Give currently executing messages max. 5 minutes to finish before
		// the channel gets closed. If we would not do that, it would not be possible
		// to acknowledge messages anymore for which the executions were already running
		// when for example a new version of the workflow got saved. That would lead to
		// them getting delivered and processed again.
		while (unansweredMessages !== 0 && count++ <= 300) {
			await new Promise((resolve) => {
				setTimeout(resolve, 1000);
			});
			unansweredMessages = this.unansweredMessages();
		}

		await channel.close();
	}
}

export function fixOptions(data: IDataObject) {
	const options = data;

	if (options.arguments) {
		const args = (options?.arguments as IDataObject)?.argumet as IDataObject[] || [];
		options.arguments = args.reduce((acc, argument) => {
			acc[argument.key as string] = argument.value;
			return acc;
		}, {});
	}

	if (options.headers) {
		const headers = (options?.headers as IDataObject)?.header as IDataObject[] || [];
		options.headers = headers.reduce((acc, header) => {
			acc[header.key as string] = header.value;
			return acc;
		}, {});
	}

	if (options.closeConnection) {
		delete options.closeConnection;
	}

	return options;
}

import type { IDataObject, IExecuteFunctions, ITriggerFunctions } from 'n8n-workflow';
import { sleep } from 'n8n-workflow';

import * as amqplib from 'amqplib';

export async function rabbitmqConnect(
	this: IExecuteFunctions | ITriggerFunctions,
	options: IDataObject,
): Promise<amqplib.Channel> {
	const credentials = await this.getCredentials('rabbitmq');

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

	return new Promise(async (resolve, reject) => {
		try {
			const connection = await amqplib.connect(credentialData, optsData);

			connection.on('error', (error: Error) => {
				reject(error);
			});

			const channel = (await connection.createChannel().catch(console.warn)) as amqplib.Channel;

			if (
				options.arguments &&
				((options.arguments as IDataObject).argument! as IDataObject[]).length
			) {
				const additionalArguments: IDataObject = {};
				((options.arguments as IDataObject).argument as IDataObject[]).forEach(
					(argument: IDataObject) => {
						additionalArguments[argument.key as string] = argument.value;
					},
				);
				options.arguments = additionalArguments;
			}

			resolve(channel);
		} catch (error) {
			reject(error);
		}
	});
}

export async function rabbitmqConnectQueue(
	this: IExecuteFunctions | ITriggerFunctions,
	queue: string,
	options: IDataObject,
): Promise<amqplib.Channel> {
	const channel = await rabbitmqConnect.call(this, options);

	return new Promise(async (resolve, reject) => {
		try {
			await channel.assertQueue(queue, options);
			resolve(channel);
		} catch (error) {
			reject(error);
		}
	});
}

export async function rabbitmqConnectExchange(
	this: IExecuteFunctions | ITriggerFunctions,
	exchange: string,
	type: string,
	options: IDataObject,
): Promise<amqplib.Channel> {
	const channel = await rabbitmqConnect.call(this, options);

	return new Promise(async (resolve, reject) => {
		try {
			await channel.assertExchange(exchange, type, options);
			resolve(channel);
		} catch (error) {
			reject(error);
		}
	});
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

		const index = this.messages.findIndex((value) => value !== message.fields.deliveryTag);
		this.messages.splice(index);
	}

	unansweredMessages() {
		return this.messages.length;
	}

	async closeChannel(channel: amqplib.Channel, consumerTag: string) {
		if (this.isClosing) {
			return;
		}
		this.isClosing = true;

		// Do not accept any new messages
		await channel.cancel(consumerTag);

		let count = 0;
		let unansweredMessages = this.unansweredMessages();

		// Give currently executing messages max. 5 minutes to finish before
		// the channel gets closed. If we would not do that, it would not be possible
		// to acknowledge messages anymore for which the executions were already running
		// when for example a new version of the workflow got saved. That would lead to
		// them getting delivered and processed again.
		while (unansweredMessages !== 0 && count++ <= 300) {
			await sleep(1000);
			unansweredMessages = this.unansweredMessages();
		}

		await channel.close();
		await channel.connection.close();
	}
}

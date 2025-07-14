import * as amqplib from 'amqplib';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	ITriggerFunctions,
} from 'n8n-workflow';
import { jsonParse, sleep } from 'n8n-workflow';

import { formatPrivateKey } from '@utils/utilities';

import type { ExchangeType, Options, RabbitMQCredentials, TriggerOptions } from './types';

const credentialKeys = ['hostname', 'port', 'username', 'password', 'vhost'] as const;

export async function rabbitmqConnect(
	credentials: RabbitMQCredentials,
): Promise<amqplib.Connection> {
	const credentialData = credentialKeys.reduce((acc, key) => {
		acc[key] = credentials[key] === '' ? undefined : credentials[key];
		return acc;
	}, {} as IDataObject) as amqplib.Options.Connect;

	const optsData: IDataObject = {};
	if (credentials.ssl) {
		credentialData.protocol = 'amqps';

		optsData.ca =
			credentials.ca === '' ? undefined : [Buffer.from(formatPrivateKey(credentials.ca))];
		if (credentials.passwordless) {
			optsData.cert =
				credentials.cert === '' ? undefined : Buffer.from(formatPrivateKey(credentials.cert));
			optsData.key =
				credentials.key === '' ? undefined : Buffer.from(formatPrivateKey(credentials.key));
			optsData.passphrase = credentials.passphrase === '' ? undefined : credentials.passphrase;
			optsData.credentials = amqplib.credentials.external();
		}
	}

	return await amqplib.connect(credentialData, optsData);
}

export async function rabbitmqCreateChannel(
	this: IExecuteFunctions | ITriggerFunctions,
): Promise<amqplib.Channel> {
	const credentials = await this.getCredentials<RabbitMQCredentials>('rabbitmq');

	return await new Promise(async (resolve, reject) => {
		try {
			const connection = await rabbitmqConnect(credentials);
			// TODO: why is this error handler being added here?
			connection.on('error', reject);

			const channel = await connection.createChannel();
			resolve(channel);
		} catch (error) {
			reject(error);
		}
	});
}

export async function rabbitmqConnectQueue(
	this: IExecuteFunctions | ITriggerFunctions,
	queue: string,
	options: Options | TriggerOptions,
): Promise<amqplib.Channel> {
	const channel = await rabbitmqCreateChannel.call(this);

	return await new Promise(async (resolve, reject) => {
		try {
			if (options.assertQueue) {
				await channel.assertQueue(queue, options);
			} else {
				await channel.checkQueue(queue);
			}

			if ('binding' in options && options.binding?.bindings.length) {
				options.binding.bindings.forEach(async (binding) => {
					await channel.bindQueue(queue, binding.exchange, binding.routingKey);
				});
			}

			resolve(channel);
		} catch (error) {
			reject(error);
		}
	});
}

export async function rabbitmqConnectExchange(
	this: IExecuteFunctions | ITriggerFunctions,
	exchange: string,
	options: Options | TriggerOptions,
): Promise<amqplib.Channel> {
	const exchangeType = this.getNodeParameter('exchangeType', 0) as ExchangeType;
	const channel = await rabbitmqCreateChannel.call(this);

	return await new Promise(async (resolve, reject) => {
		try {
			if (options.assertExchange) {
				await channel.assertExchange(exchange, exchangeType, options);
			} else {
				await channel.checkExchange(exchange);
			}
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

export const parsePublishArguments = (options: Options) => {
	const additionalArguments: IDataObject = {};
	if (options.arguments?.argument.length) {
		options.arguments.argument.forEach((argument) => {
			additionalArguments[argument.key] = argument.value;
		});
	}
	return additionalArguments as amqplib.Options.Publish;
};

export const parseMessage = async (
	message: amqplib.Message,
	options: TriggerOptions,
	helpers: ITriggerFunctions['helpers'],
): Promise<INodeExecutionData> => {
	if (options.contentIsBinary) {
		const { content } = message;
		message.content = undefined as unknown as Buffer;
		return {
			binary: {
				data: await helpers.prepareBinaryData(content),
			},
			json: message as unknown as IDataObject,
		};
	} else {
		let content: IDataObject | string = message.content.toString();
		if ('jsonParseBody' in options && options.jsonParseBody) {
			content = jsonParse(content);
		}
		if ('onlyContent' in options && options.onlyContent) {
			return { json: content as IDataObject };
		} else {
			message.content = content as unknown as Buffer;
			return { json: message as unknown as IDataObject };
		}
	}
};

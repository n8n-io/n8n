import {
	IDataObject,
	IExecuteFunctions,
	ITriggerFunctions,
} from 'n8n-workflow';

const amqplib = require('amqplib');

export async function rabbitmqConnect(this: IExecuteFunctions | ITriggerFunctions, options: IDataObject): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('rabbitmq') as IDataObject;

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


	return new Promise(async (resolve, reject) => {
		try {
			const connection = await amqplib.connect(credentialData, optsData);

			connection.on('error', (error: Error) => {
				reject(error);
			});

			const channel = await connection.createChannel().catch(console.warn);

			if (options.arguments && ((options.arguments as IDataObject).argument! as IDataObject[]).length) {
				const additionalArguments: IDataObject = {};
				((options.arguments as IDataObject).argument as IDataObject[]).forEach((argument: IDataObject) => {
					additionalArguments[argument.key as string] = argument.value;
				});
				options.arguments = additionalArguments;
			}


			resolve(channel);
		} catch (error) {
			reject(error);
		}
	});
}

export async function rabbitmqConnectQueue(this: IExecuteFunctions | ITriggerFunctions, queue: string, options: IDataObject): Promise<any> { // tslint:disable-line:no-any
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

export async function rabbitmqConnectExchange(this: IExecuteFunctions | ITriggerFunctions, exchange: string, type: string, options: IDataObject): Promise<any> { // tslint:disable-line:no-any
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

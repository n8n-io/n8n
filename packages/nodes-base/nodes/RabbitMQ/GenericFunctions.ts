import {
	IDataObject,
	IExecuteFunctions,
	ITriggerFunctions,
} from 'n8n-workflow';

export async function rabbitmqConnect(this: IExecuteFunctions | ITriggerFunctions, queue: string, options: IDataObject): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('rabbitmq') as IDataObject;

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

		optsData.cert = credentials.cert === '' ? undefined : Buffer.from(credentials.cert as string);
		optsData.key = credentials.key === '' ? undefined : Buffer.from(credentials.key as string);
		optsData.passphrase = credentials.passphrase === '' ? undefined : credentials.passphrase;
		optsData.ca = credentials.ca === '' ? undefined : [Buffer.from(credentials.ca as string)];
		optsData.credentials = require('amqplib').credentials.external();
	}

	const connection = await require('amqplib').connect(credentialData, optsData);

	const channel = await connection.createChannel();

	if (options.arguments && ((options.arguments as IDataObject).argument! as IDataObject[]).length) {
		const additionalArguments: IDataObject = {};
		((options.arguments as IDataObject).argument as IDataObject[]).forEach((argument: IDataObject) => {
			additionalArguments[argument.key as string] = argument.value;
		});
		options.arguments = additionalArguments;
	}

	// TODO: Throws error here I can not catch if for example arguments are missing
	await channel.assertQueue(queue, options);

	return channel;
}

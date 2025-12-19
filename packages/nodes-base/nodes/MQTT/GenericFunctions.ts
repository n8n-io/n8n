import { connect, type IClientOptions, type MqttClient } from 'mqtt';
import { ApplicationError, randomString } from 'n8n-workflow';

import { formatPrivateKey } from '@utils/utilities';

interface BaseMqttCredential {
	protocol: 'mqtt' | 'mqtts' | 'ws';
	host: string;
	port: number;
	username: string;
	password: string;
	clean: boolean;
	clientId: string;
	passwordless?: boolean;
}

type NonSslMqttCredential = BaseMqttCredential & {
	ssl: false;
};

type SslMqttCredential = BaseMqttCredential & {
	ssl: true;
	ca: string;
	cert: string;
	key: string;
	rejectUnauthorized?: boolean;
};
export type MqttCredential = NonSslMqttCredential | SslMqttCredential;

export const createClient = async (credentials: MqttCredential): Promise<MqttClient> => {
	const { protocol, host, port, clean, clientId, username, password } = credentials;

	const clientOptions: IClientOptions = {
		protocol,
		host,
		port,
		clean,
		clientId: clientId || `mqttjs_${randomString(8).toLowerCase()}`,
	};

	if (username && password) {
		clientOptions.username = username;
		clientOptions.password = password;
	}

	if (credentials.ssl) {
		clientOptions.ca = formatPrivateKey(credentials.ca);
		clientOptions.cert = formatPrivateKey(credentials.cert);
		clientOptions.key = formatPrivateKey(credentials.key);
		clientOptions.rejectUnauthorized = credentials.rejectUnauthorized;
	}

	return await new Promise((resolve, reject) => {
		const client = connect(clientOptions);

		const onConnect = () => {
			client.removeListener('connect', onConnect);

			client.removeListener('error', onError);
			resolve(client);
		};

		const onError = (error: Error) => {
			client.removeListener('connect', onConnect);
			client.removeListener('error', onError);
			// mqtt client has an automatic reconnect mechanism that will
			// keep trying to reconnect until it succeeds unless we
			// explicitly close the client
			client.end();
			reject(new ApplicationError(error.message));
		};

		client.once('connect', onConnect);
		client.once('error', onError);
	});
};

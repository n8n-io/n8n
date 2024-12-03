import { logLevel, SASLOptions, type KafkaConfig } from 'kafkajs';
import type { KafkaCredential } from './types';
import {
	type ICredentialTestFunctions,
	NodeOperationError,
	type ITriggerFunctions,
} from 'n8n-workflow';

export const getConnectionConfig = (
	context: ITriggerFunctions | ICredentialTestFunctions,
	credentials: KafkaCredential,
): KafkaConfig => {
	const brokers = ((credentials.brokers as string) || '').split(',').map((item) => item.trim());

	const config: KafkaConfig = {
		brokers,
		clientId: credentials.clientId,
		ssl: credentials.ssl,
		logLevel: logLevel.ERROR,
	};

	if (credentials.authentication) {
		if (!(credentials.username && credentials.password)) {
			throw new NodeOperationError(
				context.getNode(),
				'Username and password are required for authentication',
			);
		}
		config.sasl = {
			username: credentials.username,
			password: credentials.password,
			mechanism: credentials.saslMechanism,
		} as SASLOptions;
	}

	return config;
};

import type { KafkaJS } from '@confluentinc/kafka-javascript';
import { UserError } from '@n8n/errors';

import { formatAndValidatePem, readTlsMaterial, type KafkaCredentials } from '../../utils';

/**
 * Builds the flat, dotted-key TLS/mTLS properties the library expects at the
 * top level of `CommonConstructorConfig` (native librdkafka config) — separate
 * from the `kafkaJS` block, which only carries a plain `ssl: boolean`.
 */
function toTlsProperties(credentials: KafkaCredentials): Partial<KafkaJS.CommonConstructorConfig> {
	if (!credentials.ssl) return {};

	const { ca, cert, key } = readTlsMaterial(credentials, 'Kafka');

	return {
		...(ca ? { 'ssl.ca.pem': formatAndValidatePem(ca, 'CA certificate') } : {}),
		...(cert ? { 'ssl.certificate.pem': formatAndValidatePem(cert, 'client certificate') } : {}),
		...(key ? { 'ssl.key.pem': formatAndValidatePem(key, 'client private key') } : {}),
		...(credentials.allowUnauthorizedCerts ? { 'enable.ssl.certificate.verification': false } : {}),
	};
}

/**
 * Converts a decrypted Kafka credential into the library's
 * `CommonConstructorConfig` — a `kafkaJS` block (app-level: brokers, clientId,
 * ssl boolean, sasl) sitting alongside flat, dotted-key TLS/mTLS properties
 * (native-librdkafka-level). No `security.protocol` is emitted: the library
 * derives it from `kafkaJS.ssl` + presence of `kafkaJS.sasl` on its own.
 */
export function toKafkaJSConfig(
	credentials: KafkaCredentials,
	// `kafkaJS` is optional on `CommonConstructorConfig` but always set here, so
	// callers can extend the block without re-widening it.
): KafkaJS.CommonConstructorConfig & { kafkaJS: KafkaJS.KafkaConfig } {
	const brokers = (credentials.brokers ?? '').split(',').map((broker) => broker.trim());

	const kafkaJS: KafkaJS.KafkaConfig = {
		brokers,
		clientId: credentials.clientId,
		ssl: credentials.ssl,
	};

	if (credentials.authentication) {
		if (!(credentials.username && credentials.password)) {
			throw new UserError('Username and password are required for authentication');
		}
		kafkaJS.sasl = {
			mechanism: credentials.saslMechanism ?? 'plain',
			username: credentials.username,
			password: credentials.password,
		};
	}

	return { kafkaJS, ...toTlsProperties(credentials) };
}

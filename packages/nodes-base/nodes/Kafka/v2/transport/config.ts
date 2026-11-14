import type { KafkaJS } from '@confluentinc/kafka-javascript';
import { UserError } from '@n8n/errors';

import { generateMskIamToken } from './msk-iam';
import { formatAndValidatePem, MSK_IAM_SASL_MECHANISM, type KafkaCredentials } from '../../utils';

/**
 * Validates the MSK IAM fields when the config is built, so that a mistake
 * fails the execution instead of surfacing later as a broker connection error.
 */
function toMskIamSasl(credentials: KafkaCredentials): KafkaJS.SASLOptions {
	if (!credentials.ssl) {
		throw new UserError('AWS MSK IAM authentication needs SSL', {
			level: 'warning',
			description:
				'Turn on SSL in the Kafka credential. Amazon MSK accepts IAM clients only over TLS.',
		});
	}
	if (!credentials.awsRegion) {
		throw new UserError('AWS MSK IAM authentication needs an AWS Region', { level: 'warning' });
	}
	if (
		!credentials.awsUseSystemCredentials &&
		!(credentials.awsAccessKeyId?.trim() && credentials.awsSecretAccessKey?.trim())
	) {
		throw new UserError(
			'AWS MSK IAM authentication needs an access key ID and a secret access key',
			{
				level: 'warning',
			},
		);
	}

	return {
		mechanism: 'oauthbearer',
		// Called on connect and again before each token expires.
		oauthBearerProvider: async () => await generateMskIamToken(credentials),
	};
}

/**
 * Builds the flat, dotted-key TLS/mTLS properties the library expects at the
 * top level of `CommonConstructorConfig` (native librdkafka config) — separate
 * from the `kafkaJS` block, which only carries a plain `ssl: boolean`.
 */
function toTlsProperties(credentials: KafkaCredentials): Partial<KafkaJS.CommonConstructorConfig> {
	if (!credentials.ssl) return {};

	const cert = credentials.cert?.trim() ? credentials.cert : undefined;
	const key = credentials.key?.trim() ? credentials.key : undefined;
	const ca = credentials.ca?.trim() ? credentials.ca : undefined;

	// A client certificate and its private key are only meaningful together.
	if (Boolean(cert) !== Boolean(key)) {
		throw new UserError('Kafka mTLS needs both a client certificate and a client private key', {
			level: 'warning',
			description:
				'Set both the "Client Certificate" and "Client Private Key" credential fields, or clear both.',
		});
	}

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
		const mechanism = credentials.saslMechanism ?? 'plain';
		if (mechanism === MSK_IAM_SASL_MECHANISM) {
			kafkaJS.sasl = toMskIamSasl(credentials);
		} else {
			if (!(credentials.username && credentials.password)) {
				throw new UserError('Username and password are required for authentication');
			}
			kafkaJS.sasl = {
				mechanism,
				username: credentials.username,
				password: credentials.password,
			};
		}
	}

	return { kafkaJS, ...toTlsProperties(credentials) };
}

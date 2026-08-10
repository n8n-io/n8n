import type { KafkaJS } from '@confluentinc/kafka-javascript';
import type { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import type {
	GenericValue,
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	ITriggerFunctions,
	Logger,
} from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';

import { sanitizeRegistryError } from '../../utils';

/** Every shape a parsed Kafka value can take once it reaches `json.message`. */
type ParsedValue = GenericValue | IDataObject | GenericValue[] | IDataObject[];

/** The subset of trigger options that changes the parsed item shape. */
export interface KafkaMessageParserOptions {
	jsonParseMessage?: boolean;
	keepBinaryData?: boolean;
	onlyMessage?: boolean;
	returnHeaders?: boolean;
}

export type KafkaMessageParser = (
	message: KafkaJS.KafkaMessage,
	topic: string,
) => Promise<INodeExecutionData>;

/**
 * Renders one Kafka header value the way v1 did: a Buffer decoded as UTF-8, an
 * array joined with commas, a missing value as an empty string. v1 called
 * `.toString('utf8')` on whatever kafkajs handed it; the new library also allows
 * plain strings there, so the cases are spelled out instead.
 */
function headerToString(value: KafkaJS.IHeaders[string]): string {
	if (value === undefined) return '';
	if (Buffer.isBuffer(value)) return value.toString('utf8');
	if (Array.isArray(value)) {
		return value
			.map((entry) => (Buffer.isBuffer(entry) ? entry.toString('utf8') : entry))
			.join(',');
	}
	return value;
}

/**
 * Builds the parser that turns a library message into the item a workflow
 * receives. The output shape is v1's, deliberately: `{ json: { message, topic,
 * headers? }, binary? }`. The message key and timestamp stay absent — exposing
 * them would be a behaviour change, not a migration.
 * @param options - The trigger options that affect the item shape
 * @param logger - Logger used for the warn-and-continue paths
 * @param registry - Schema Registry client, when the user enabled decoding
 * @param prepareBinaryData - Helper used to attach the raw value as binary data
 */
export function createMessageParser(
	options: KafkaMessageParserOptions,
	logger: Logger,
	registry: SchemaRegistry | undefined,
	prepareBinaryData: ITriggerFunctions['helpers']['prepareBinaryData'],
): KafkaMessageParser {
	return async (message, topic) => {
		let data: IDataObject = {};
		let value: ParsedValue = message.value?.toString();
		const binary: IBinaryKeyData = {};

		if (options.jsonParseMessage) {
			try {
				value = jsonParse<ParsedValue>(value as string);
			} catch (error) {
				logger.warn('Could not parse message to JSON, returning as string', { error });
			}
		}

		if (registry && message.value) {
			try {
				value = await registry.decode(message.value);
			} catch (error) {
				logger.warn(
					'Could not decode message with Schema Registry, returning original message',
					sanitizeRegistryError(error),
				);
			}
		}

		if (options.keepBinaryData && message.value) {
			binary.data = await prepareBinaryData(message.value, 'message', 'application/octet-stream');
		}

		if (options.returnHeaders) {
			// Unconditional, and empty when the message carries none: kafkajs always
			// handed v1 a headers object, the new library leaves it undefined, and the
			// item must not gain or lose the key depending on the library.
			data.headers = Object.fromEntries(
				Object.entries(message.headers ?? {}).map(([headerKey, headerValue]) => [
					headerKey,
					headerToString(headerValue),
				]),
			);
		}

		data.message = value;
		data.topic = topic;

		if (options.onlyMessage) {
			// Matches v1: the parsed value replaces the whole item body, even when it
			// is not an object.
			data = value as IDataObject;
		}

		if (options.keepBinaryData && Object.keys(binary).length) {
			return { json: data, binary };
		}

		return { json: data };
	};
}

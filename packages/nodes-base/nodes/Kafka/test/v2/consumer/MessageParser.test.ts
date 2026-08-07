import type { KafkaJS } from '@confluentinc/kafka-javascript';
import type { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import type { IBinaryData, INodeExecutionData, ITriggerFunctions, Logger } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import {
	createMessageParser,
	type KafkaMessageParserOptions,
} from '../../../v2/consumer/MessageParser';

const TOPIC = 'test-topic';

const BINARY: IBinaryData = { data: 'ZGF0YQ==', mimeType: 'application/octet-stream' };

const message = (overrides: Partial<KafkaJS.KafkaMessage> = {}): KafkaJS.KafkaMessage =>
	({
		key: Buffer.from('message-key'),
		value: Buffer.from('{"a":1}'),
		timestamp: '1700000000000',
		attributes: 0,
		offset: '5',
		...overrides,
	}) as KafkaJS.KafkaMessage;

let logger: Logger;
let prepareBinaryData: ITriggerFunctions['helpers']['prepareBinaryData'];

beforeEach(() => {
	logger = mock<Logger>();
	prepareBinaryData = vi.fn(async () => BINARY);
});

const parse = async (
	options: KafkaMessageParserOptions,
	kafkaMessage = message(),
	registry?: SchemaRegistry,
): Promise<INodeExecutionData> =>
	await createMessageParser(options, logger, registry, prepareBinaryData)(kafkaMessage, TOPIC);

describe('createMessageParser', () => {
	describe('item shape, per option combination', () => {
		it('returns the raw string value and the topic by default', async () => {
			expect(await parse({})).toStrictEqual({ json: { message: '{"a":1}', topic: TOPIC } });
		});

		it('parses the value into an object when JSON parsing is on', async () => {
			expect(await parse({ jsonParseMessage: true })).toStrictEqual({
				json: { message: { a: 1 }, topic: TOPIC },
			});
		});

		it('returns the parsed value alone when only-message is on', async () => {
			expect(await parse({ jsonParseMessage: true, onlyMessage: true })).toStrictEqual({
				json: { a: 1 },
			});
		});

		it('adds the headers when return-headers is on', async () => {
			const parsed = await parse(
				{ returnHeaders: true },
				message({ headers: { 'x-trace': Buffer.from('abc') } }),
			);

			expect(parsed).toStrictEqual({
				json: { headers: { 'x-trace': 'abc' }, message: '{"a":1}', topic: TOPIC },
			});
		});

		it('attaches the raw value as binary data when keep-binary-data is on', async () => {
			expect(await parse({ keepBinaryData: true })).toStrictEqual({
				json: { message: '{"a":1}', topic: TOPIC },
				binary: { data: BINARY },
			});
			expect(prepareBinaryData).toHaveBeenCalledWith(
				Buffer.from('{"a":1}'),
				'message',
				'application/octet-stream',
			);
		});

		it('adds an empty headers object when the message carries no headers', async () => {
			// v1 always got a headers object from kafkajs, so the key is present either
			// way; the new library leaves `headers` undefined for such a message.
			expect(await parse({ returnHeaders: true }, message({ headers: undefined }))).toStrictEqual({
				json: { headers: {}, message: '{"a":1}', topic: TOPIC },
			});
		});

		it('produces the same item for a message with no key', async () => {
			expect(await parse({}, message({ key: null }))).toStrictEqual({
				json: { message: '{"a":1}', topic: TOPIC },
			});
		});
	});

	describe('version 1 parity', () => {
		it.each([
			['defaults', {}],
			['JSON parsing on', { jsonParseMessage: true }],
			['return headers', { returnHeaders: true }],
			['keep binary data', { keepBinaryData: true }],
		])('never exposes the message key or timestamp: %s', async (_, options) => {
			const parsed = await parse(options, message({ headers: { h: Buffer.from('v') } }));

			expect(Object.keys(parsed.json)).not.toContain('key');
			expect(Object.keys(parsed.json)).not.toContain('timestamp');
		});

		it('omits the binary key when keep-binary-data is on but the value is empty', async () => {
			const parsed = await parse({ keepBinaryData: true }, message({ value: null }));

			expect(parsed).toStrictEqual({ json: { message: undefined, topic: TOPIC } });
			expect(prepareBinaryData).not.toHaveBeenCalled();
		});

		it('renders array and string header values the way v1 did', async () => {
			const parsed = await parse(
				{ returnHeaders: true },
				message({
					headers: {
						buffer: Buffer.from('one'),
						string: 'two',
						list: [Buffer.from('three'), 'four'],
						missing: undefined,
					},
				}),
			);

			expect(parsed.json.headers).toStrictEqual({
				buffer: 'one',
				string: 'two',
				list: 'three,four',
				missing: '',
			});
		});
	});

	describe('JSON parsing failures', () => {
		it('keeps the string value and warns when the value is not JSON', async () => {
			const parsed = await parse({ jsonParseMessage: true }, message({ value: Buffer.from('hi') }));

			expect(parsed).toStrictEqual({ json: { message: 'hi', topic: TOPIC } });
			expect(logger.warn).toHaveBeenCalledWith(
				'Could not parse message to JSON, returning as string',
				expect.objectContaining({ error: expect.any(Error) }),
			);
		});
	});

	describe('Schema Registry decoding', () => {
		it('replaces the value with the decoded payload', async () => {
			const registry = mock<SchemaRegistry>({
				decode: vi.fn(async () => ({ decoded: true })),
			});

			expect(await parse({}, message(), registry)).toStrictEqual({
				json: { message: { decoded: true }, topic: TOPIC },
			});
			expect(registry.decode).toHaveBeenCalledWith(Buffer.from('{"a":1}'));
		});

		it('falls back to the original value and warns when decoding fails', async () => {
			const registry = mock<SchemaRegistry>({
				decode: vi.fn(async () => {
					throw new Error('Request failed with status code 404 for https://user:pw@registry');
				}),
			});

			expect(await parse({}, message(), registry)).toStrictEqual({
				json: { message: '{"a":1}', topic: TOPIC },
			});
			expect(logger.warn).toHaveBeenCalledWith(
				'Could not decode message with Schema Registry, returning original message',
				// The sanitizer redacts the URL userinfo the registry client embeds.
				{ message: 'Request failed with status code 404 for https://***@registry' },
			);
		});

		it('does not call the registry for an empty value', async () => {
			const registry = mock<SchemaRegistry>({ decode: vi.fn() });

			await parse({}, message({ value: null }), registry);

			expect(registry.decode).not.toHaveBeenCalled();
		});
	});
});

import { readFileSync } from 'node:fs';
import path from 'node:path';

const schemaDir = path.join(__dirname, '..', '__schema__');

const readSchema = (version: string, file: string) => {
	const content = readFileSync(path.join(schemaDir, version, 'message', file), 'utf-8');
	return JSON.parse(content) as { properties: Record<string, unknown> };
};

describe.each(['v2.1.0', 'v2.2.0'])('Gmail message output schemas %s', (version) => {
	describe.each(['get', 'getAll'])('%s', (operation) => {
		it('describes the simplified output by default', () => {
			const { properties } = readSchema(version, `${operation}.json`);

			expect(properties).toHaveProperty('From');
			expect(properties).toHaveProperty('Subject');
			expect(properties).not.toHaveProperty('from');
		});

		it('describes the parsed email when Simplify is off', () => {
			const { properties } = readSchema(version, `${operation}.simple-false.json`);

			expect(properties).toHaveProperty('from');
			expect(properties).toHaveProperty('headers');
			expect(properties).toHaveProperty('text');
			expect(properties).toHaveProperty('html');
			expect(properties).toHaveProperty('textAsHtml');
			expect(properties).not.toHaveProperty('From');
		});

		it('describes the address fields and thread headers of the parsed email', () => {
			const { properties } = readSchema(version, `${operation}.simple-false.json`);

			for (const key of ['cc', 'bcc', 'replyTo', 'references', 'inReplyTo']) {
				expect(properties).toHaveProperty(key);
			}
		});

		it('allows any header name in the parsed email headers', () => {
			const { properties } = readSchema(version, `${operation}.simple-false.json`);
			const headers = properties.headers as { additionalProperties?: { type?: string } };

			expect(headers.additionalProperties?.type).toBe('string');
		});
	});
});

interface ThreadSchema {
	properties: {
		messages: {
			items: {
				properties: Record<string, SchemaNode>;
				additionalProperties?: { type?: string };
			};
		};
	};
}

interface SchemaNode {
	type?: string | string[];
	properties?: Record<string, SchemaNode>;
	items?: SchemaNode;
}

const readThreadSchema = (version: string, file: string) =>
	JSON.parse(readFileSync(path.join(schemaDir, version, 'thread', file), 'utf-8')) as ThreadSchema;

describe.each(['v2.1.0', 'v2.2.0'])('Gmail thread get output schemas %s', (version) => {
	it('describes the simplified messages by default', () => {
		const { properties } = readThreadSchema(version, 'get.json').properties.messages.items;

		expect(Object.keys(properties).sort()).toEqual(
			[
				'Bcc',
				'Cc',
				'From',
				'Subject',
				'To',
				'historyId',
				'id',
				'internalDate',
				'labels',
				'payload',
				'sizeEstimate',
				'snippet',
				'threadId',
			].sort(),
		);
		expect(Object.keys(properties.payload.properties ?? {})).toEqual(['mimeType']);
	});

	it('describes the full messages when Simplify is off', () => {
		const { properties, additionalProperties } = readThreadSchema(version, 'get.simple-false.json')
			.properties.messages.items;
		const part = properties.payload.properties?.parts?.items;

		expect(additionalProperties?.type).toBe('string');
		expect(Object.keys(part?.properties ?? {})).toEqual(
			expect.arrayContaining(['body', 'filename', 'headers', 'mimeType', 'partId', 'parts']),
		);
		expect(Object.keys(part?.properties?.body?.properties ?? {})).toEqual(
			expect.arrayContaining(['data', 'size', 'attachmentId']),
		);
	});

	it('does not describe parsed text fields, because the body stays encoded', () => {
		const { properties } = readThreadSchema(version, 'get.simple-false.json').properties.messages
			.items;

		for (const key of ['text', 'html', 'textAsHtml']) {
			expect(properties).not.toHaveProperty(key);
		}
	});

	describe.each(['get.json', 'get.simple-false.json'])('%s', (file) => {
		it('describes a message at the root, because the default returns one message for each item', () => {
			const { properties } = readThreadSchema(version, file) as unknown as {
				properties: Record<string, SchemaNode>;
			};

			expect(Object.keys(properties)).toEqual(
				expect.arrayContaining(['From', 'Subject', 'snippet', 'payload', 'threadId']),
			);
		});

		it('describes the thread envelope for Return Only Messages off', () => {
			const { properties } = readThreadSchema(version, file) as unknown as {
				properties: Record<string, SchemaNode>;
			};

			expect(properties.messages?.type).toBe('array');
			expect(Object.keys(properties.messages?.items?.properties ?? {})).toEqual(
				expect.arrayContaining(['From', 'snippet', 'payload']),
			);
		});
	});

	it('describes the attachment ID of the message body, at the root and in the envelope', () => {
		const schema = readThreadSchema(version, 'get.simple-false.json') as unknown as {
			properties: Record<string, SchemaNode> & { messages: { items: SchemaNode } };
		};
		const rootBody = schema.properties.payload?.properties?.body;
		const envelopeBody = schema.properties.messages.items.properties?.payload?.properties?.body;

		expect(Object.keys(rootBody?.properties ?? {})).toEqual(
			expect.arrayContaining(['size', 'data', 'attachmentId']),
		);
		expect(Object.keys(envelopeBody?.properties ?? {})).toEqual(
			expect.arrayContaining(['size', 'data', 'attachmentId']),
		);
	});

	it('describes the nested parts of a full message down to three levels', () => {
		const { properties } = readThreadSchema(version, 'get.simple-false.json').properties.messages
			.items;
		const level1 = properties.payload.properties?.parts?.items;
		const level2 = level1?.properties?.parts?.items;
		const level3 = level2?.properties?.parts?.items;

		expect(Object.keys(level3?.properties ?? {})).toEqual(
			expect.arrayContaining(['body', 'mimeType', 'partId']),
		);
		expect(Object.keys(level3?.properties?.body?.properties ?? {})).toEqual(
			expect.arrayContaining(['data', 'attachmentId']),
		);
	});
});

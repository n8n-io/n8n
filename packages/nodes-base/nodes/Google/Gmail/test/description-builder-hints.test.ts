import type { INodeProperties } from 'n8n-workflow';

import { GmailTrigger } from '../GmailTrigger.node';
import { messageFields as v1MessageFields } from '../v1/MessageDescription';
import { messageFields as v2MessageFields } from '../v2/MessageDescription';
import { threadFields as v2ThreadFields } from '../v2/ThreadDescription';

type DisplayOptions = INodeProperties['displayOptions'];

function shows(displayOptions: DisplayOptions, key: string, value: string): boolean {
	const list = displayOptions?.show?.[key];
	if (!Array.isArray(list)) return false;
	return list.some((entry) => entry === value);
}

function findTopLevelProperty(
	properties: INodeProperties[],
	name: string,
	resource: string,
	operation: string,
): INodeProperties | undefined {
	return properties.find(
		(p) =>
			p.name === name &&
			shows(p.displayOptions, 'resource', resource) &&
			shows(p.displayOptions, 'operation', operation),
	);
}

function findCollectionChild(collection: INodeProperties, childName: string): unknown {
	const options = collection.options as Array<INodeProperties | { name: string }> | undefined;
	if (!Array.isArray(options)) return undefined;
	return options.find((option) => 'name' in option && option.name === childName);
}

function expectBuilderHintMessage(property: unknown, anyOfSubstrings: string[]): void {
	expect(property).toBeDefined();
	const hint = (property as { builderHint?: { message?: unknown } }).builderHint;
	expect(hint).toBeDefined();
	expect(typeof hint?.message).toBe('string');
	const message = String(hint?.message);
	expect(message.length).toBeGreaterThan(20);
	const lower = message.toLowerCase();
	const hasAny = anyOfSubstrings.some((needle) => lower.includes(needle.toLowerCase()));
	expect(hasAny).toBe(true);
}

describe('Gmail description builder hints', () => {
	describe('Gmail Trigger', () => {
		const triggerProperties = new GmailTrigger().description.properties;

		it('exposes builderHint.message on the simple parameter', () => {
			const simple = triggerProperties.find((p) => p.name === 'simple');
			expectBuilderHintMessage(simple, ['body', 'content', 'simplif']);
		});

		it('exposes builderHint.message on filters.q', () => {
			const filters = triggerProperties.find((p) => p.name === 'filters');
			expect(filters).toBeDefined();
			const q = findCollectionChild(filters as INodeProperties, 'q');
			expectBuilderHintMessage(q, ['query', 'filter']);
		});
	});

	describe('Gmail v2 — message resource', () => {
		it('exposes builderHint.message on message:get simple', () => {
			const simple = findTopLevelProperty(v2MessageFields, 'simple', 'message', 'get');
			expectBuilderHintMessage(simple, ['body', 'content', 'simplif']);
		});

		it('exposes builderHint.message on message:getAll simple', () => {
			const simple = findTopLevelProperty(v2MessageFields, 'simple', 'message', 'getAll');
			expectBuilderHintMessage(simple, ['body', 'content', 'simplif']);
		});

		it('exposes builderHint.message on message:getAll filters.q', () => {
			const filters = findTopLevelProperty(v2MessageFields, 'filters', 'message', 'getAll');
			expect(filters).toBeDefined();
			const q = findCollectionChild(filters as INodeProperties, 'q');
			expectBuilderHintMessage(q, ['query', 'filter']);
		});
	});

	describe('Gmail v2 — thread resource', () => {
		it('exposes builderHint.message on thread:get simple', () => {
			const simple = findTopLevelProperty(v2ThreadFields, 'simple', 'thread', 'get');
			expectBuilderHintMessage(simple, ['body', 'content', 'simplif']);
		});

		it('exposes builderHint.message on thread:getAll filters.q', () => {
			const filters = findTopLevelProperty(v2ThreadFields, 'filters', 'thread', 'getAll');
			expect(filters).toBeDefined();
			const q = findCollectionChild(filters as INodeProperties, 'q');
			expectBuilderHintMessage(q, ['query', 'filter']);
		});
	});

	describe('Gmail v1 — message resource', () => {
		it('exposes builderHint.message on message:get additionalFields.format', () => {
			const additionalFields = findTopLevelProperty(
				v1MessageFields,
				'additionalFields',
				'message',
				'get',
			);
			expect(additionalFields).toBeDefined();
			const format = findCollectionChild(additionalFields as INodeProperties, 'format');
			expectBuilderHintMessage(format, ['format', 'body', 'content']);
		});

		it('exposes builderHint.message on message:getAll additionalFields.format', () => {
			const additionalFields = findTopLevelProperty(
				v1MessageFields,
				'additionalFields',
				'message',
				'getAll',
			);
			expect(additionalFields).toBeDefined();
			const format = findCollectionChild(additionalFields as INodeProperties, 'format');
			expectBuilderHintMessage(format, ['format', 'body', 'content']);
		});

		it('exposes builderHint.message on message:getAll additionalFields.q', () => {
			const additionalFields = findTopLevelProperty(
				v1MessageFields,
				'additionalFields',
				'message',
				'getAll',
			);
			expect(additionalFields).toBeDefined();
			const q = findCollectionChild(additionalFields as INodeProperties, 'q');
			expectBuilderHintMessage(q, ['query', 'filter']);
		});
	});
});

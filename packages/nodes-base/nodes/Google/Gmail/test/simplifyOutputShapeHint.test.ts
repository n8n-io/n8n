import type { INodeProperties } from 'n8n-workflow';

import { GmailTrigger } from '../GmailTrigger.node';
import { messageFields } from '../v2/MessageDescription';
import { simplifyOutputShapeHint } from '../utils/descriptions';

const getSimpleHint = (properties: INodeProperties[], operation?: string) =>
	properties.find(
		(property) =>
			property.name === 'simple' &&
			(operation === undefined || property.displayOptions?.show?.operation?.includes(operation)),
	)?.builderHint?.propertyHint;

describe('Gmail simplify output hint', () => {
	it('names the sender field of both output shapes', () => {
		expect(simplifyOutputShapeHint).toContain('$json.From');
		expect(simplifyOutputShapeHint).toContain('$json.from.value[0].address');
	});

	it.each(['get', 'getAll'])('is the Simplify hint of the message %s operation', (operation) => {
		expect(getSimpleHint(messageFields, operation)).toBe(simplifyOutputShapeHint);
	});

	it('is the Simplify hint of the trigger', () => {
		const { properties } = new GmailTrigger().description;

		expect(getSimpleHint(properties)).toBe(simplifyOutputShapeHint);
	});
});

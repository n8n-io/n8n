import { generateSchemaFromExample } from '../src/generate-schema-from-example';

const inheritedPropertyCases: Array<[property: string, valueType: string, value: unknown]> =
	Object.getOwnPropertyNames(Object.prototype).flatMap((property) => [
		[property, 'primitive', 'value'],
		[property, 'object', { name: 'value' }],
		[property, 'array', [1, 'value']],
	]);

describe('generateSchemaFromExample', () => {
	it('generates a schema from an example', () => {
		expect(generateSchemaFromExample('{"name":"Jane","active":true}')).toMatchObject({
			type: 'object',
			properties: {
				name: { type: 'string' },
				active: { type: 'boolean' },
			},
		});
	});

	it('recursively omits reserved object properties', () => {
		try {
			const schema = generateSchemaFromExample(
				'{"__proto__":[1,2],"constructor":"ignored","nested":{"prototype":"ignored","name":"Jane"}}',
			);

			expect(Object.prototype).not.toHaveProperty('type');
			expect(Object.prototype).not.toHaveProperty('items');
			expect(Object.hasOwn(schema.properties ?? {}, '__proto__')).toBe(false);
			expect(Object.hasOwn(schema.properties ?? {}, 'constructor')).toBe(false);

			const nestedSchema = schema.properties?.nested;
			if (typeof nestedSchema !== 'object') {
				throw new Error('Expected nested to have an object schema');
			}
			expect(Object.hasOwn(nestedSchema.properties ?? {}, 'prototype')).toBe(false);

			expect(schema).toMatchObject({
				type: 'object',
				properties: {
					nested: {
						type: 'object',
						properties: {
							name: { type: 'string' },
						},
					},
				},
			});
		} finally {
			Reflect.deleteProperty(Object.prototype, 'type');
			Reflect.deleteProperty(Object.prototype, 'items');
		}
	});

	it.each(inheritedPropertyCases)(
		'omits the inherited property %s with a %s value',
		(property, _valueType, value) => {
			const sharedValue = Object.getOwnPropertyDescriptor(Object.prototype, property)?.value;

			try {
				const example = JSON.stringify(Object.fromEntries([[property, value]]));
				const schema = generateSchemaFromExample(example);

				expect(Object.hasOwn(schema.properties ?? {}, property)).toBe(false);
				if (
					(typeof sharedValue === 'object' && sharedValue !== null) ||
					typeof sharedValue === 'function'
				) {
					expect(Object.hasOwn(sharedValue, 'type')).toBe(false);
					expect(Object.hasOwn(sharedValue, 'properties')).toBe(false);
					expect(Object.hasOwn(sharedValue, 'items')).toBe(false);
				}
			} finally {
				if (
					(typeof sharedValue === 'object' && sharedValue !== null) ||
					typeof sharedValue === 'function'
				) {
					Reflect.deleteProperty(sharedValue, 'type');
					Reflect.deleteProperty(sharedValue, 'properties');
					Reflect.deleteProperty(sharedValue, 'items');
				}
			}
		},
	);

	it('throws for invalid JSON', () => {
		expect(() => generateSchemaFromExample('{ invalid')).toThrow();
	});
});

import { deserialize, serialize } from '../serde';

describe('SerDe', () => {
	describe('serialize', () => {
		it('should serialize primitive values', () => {
			[
				// Numbers
				[42, '[42]'],
				[0, '[0]'],
				[-0, '[0]'],
				[123n, '["123"]'], // BigInt
				[1.23456789, '[1.23456789]'],
				[Number.MAX_SAFE_INTEGER, '[9007199254740991]'],
				[Number.MIN_SAFE_INTEGER, '[-9007199254740991]'],
				[Number.MAX_VALUE, '[1.7976931348623157e+308]'],
				[Number.MIN_VALUE, '[5e-324]'],
				[new Number(42), '[42]'],
				// Strings
				['hello world', '["hello world"]'],
				['', '[""]'],
				[new String('text'), '["text"]'],
				// Boolean
				[true, '[true]'],
				[false, '[false]'],
				[new Boolean(true), '[true]'],
				// Other primitives
				[null, '[null]'],
				[undefined, '[]'],
				[NaN, '[null]'],
				[Infinity, '[null]'],
				[-Infinity, '[null]'],
				[Symbol('test'), '[]'], // Symbols should get serialized the same as `undefined`
			].forEach(([obj, expected]) => {
				expect(serialize(obj)).toBe(expected);
			});
		});

		it('should serialize simple objects', () => {
			const obj = { name: 'Cornelius' };
			const serialized = serialize(obj);
			expect(serialized).toBe('[{"name":"1"},"Cornelius"]');

			const deserialized = deserialize(serialized);
			expect(deserialized).toEqual(obj);
		});

		it('should serialize nested objects', () => {
			const obj = {
				person: {
					name: 'Cornelius',
					address: {
						city: 'Berlin',
						country: 'Deutschland',
					},
				},
			};
			const serialized = serialize(obj);
			expect(serialized).toBe(
				'[{"person":"1"},{"name":"2","address":"3"},"Cornelius",{"city":"4","country":"5"},"Berlin","Deutschland"]',
			);

			const deserialized = deserialize(serialized);
			expect(deserialized).toEqual(obj);
		});

		it('should serialize arrays', () => {
			const arr = [1, 2, [3, 4], { x: 5 }];
			const serialized = serialize(arr);
			expect(serialized).toBe('[[1,2,"1","2"],[3,4],{"x":5}]');

			const deserialized = deserialize(serialized);
			expect(deserialized).toEqual(arr);
		});

		it('should serialize objects with circular references', () => {
			const obj = { name: 'Cornelius' } as any;
			obj.self = obj;

			const serialized = serialize(obj);
			expect(serialized).toBe('[{"name":"1","self":"0"},"Cornelius"]');
			expect(() => JSON.stringify(obj)).toThrow();
			expect(() => deserialize(serialized)).not.toThrow();

			const deserialized = deserialize<any>(serialized);
			expect(deserialized.name).toBe('Cornelius');
			expect(deserialized.self).toBe(deserialized);
		});
	});

	describe('deserialize', () => {
		it('should deserialize primitive values', () => {
			expect(deserialize('[42]')).toBe(42);
			expect(deserialize('["hello"]')).toBe('hello');
			expect(deserialize('[true]')).toBe(true);
			expect(deserialize('[null]')).toBe(null);
		});

		it('should deserialize objects', () => {
			const input = '[{"name":"1"},"Cornelius"]';
			expect(deserialize(input)).toEqual({ name: 'Cornelius' });
		});

		it('should throw on invalid input', () => {
			expect(() => deserialize('invalid')).toThrow();
			expect(() => deserialize('[1,2')).toThrow();
			expect(() => deserialize('{}')).toThrow();
		});

		it('should handle complex nested structures', () => {
			const original = {
				array: [1, { x: 2 }, [3]],
				nested: {
					a: { b: { c: 'deep' } },
				},
			};

			const serialized = serialize(original);
			const deserialized = deserialize(serialized);

			expect(deserialized).toEqual(original);
		});

		it('should handle nested circular references', () => {
			const obj1 = { name: 'Object 1' } as any;
			const obj2 = { name: 'Object 2' } as any;
			obj1.ref = obj2;
			obj2.ref = obj1;

			const serialized = serialize(obj1);
			const deserialized = deserialize<any>(serialized);

			expect(deserialized.name).toBe('Object 1');
			expect(deserialized.ref.name).toBe('Object 2');
			expect(deserialized.ref.ref).toBe(deserialized);
		});

		it('should handle arrays with circular references', () => {
			const arr = [] as any[];
			arr.push(1, arr, 3);

			const serialized = serialize(arr);
			const deserialized = deserialize<any[]>(serialized);

			expect(deserialized[0]).toBe(1);
			expect(deserialized[1]).toBe(deserialized);
			expect(deserialized[2]).toBe(3);
		});

		it('should handle undefined values', () => {
			const obj = { a: undefined, b: 'defined' };
			const serialized = serialize(obj);
			const deserialized = deserialize(serialized);

			expect(deserialized.a).toBeUndefined();
			expect(deserialized.b).toBe('defined');
		});
	});
});

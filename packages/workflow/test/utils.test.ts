import { ALPHABET } from '../src/constants';
import { ApplicationError } from '@n8n/errors';
import { ManualExecutionCancelledError } from '../src/errors/execution-cancelled.error';
import {
	jsonParse,
	jsonStringify,
	deepCopy,
	isDomainAllowed,
	isObjectEmpty,
	fileTypeFromMimeType,
	randomInt,
	randomString,
	hasKey,
	isSafeObjectProperty,
	setSafeObjectProperty,
	sleepWithAbort,
	isCommunityPackageName,
} from '../src/utils';

describe('isObjectEmpty', () => {
	it('should handle null and undefined', () => {
		expect(isObjectEmpty(null)).toEqual(true);
		expect(isObjectEmpty(undefined)).toEqual(true);
	});

	it('should handle arrays', () => {
		expect(isObjectEmpty([])).toEqual(true);
		expect(isObjectEmpty([1, 2, 3])).toEqual(false);
	});

	it('should handle Set and Map', () => {
		expect(isObjectEmpty(new Set())).toEqual(true);
		expect(isObjectEmpty(new Set([1, 2, 3]))).toEqual(false);

		expect(isObjectEmpty(new Map())).toEqual(true);
		expect(
			isObjectEmpty(
				new Map([
					['a', 1],
					['b', 2],
				]),
			),
		).toEqual(false);
	});

	it('should handle Buffer, ArrayBuffer, and Uint8Array', () => {
		expect(isObjectEmpty(Buffer.from(''))).toEqual(true);
		expect(isObjectEmpty(Buffer.from('abcd'))).toEqual(false);

		expect(isObjectEmpty(Uint8Array.from([]))).toEqual(true);
		expect(isObjectEmpty(Uint8Array.from([1, 2, 3]))).toEqual(false);

		expect(isObjectEmpty(new ArrayBuffer(0))).toEqual(true);
		expect(isObjectEmpty(new ArrayBuffer(1))).toEqual(false);
	});

	it('should handle plain objects', () => {
		expect(isObjectEmpty({})).toEqual(true);
		expect(isObjectEmpty({ a: 1, b: 2 })).toEqual(false);
	});

	it('should handle instantiated classes', () => {
		expect(isObjectEmpty(new (class Test {})())).toEqual(true);
		expect(
			isObjectEmpty(
				new (class Test {
					prop = 123;
				})(),
			),
		).toEqual(false);
	});

	it('should not call Object.keys unless a plain object', () => {
		const keySpy = vi.spyOn(Object, 'keys');
		const { calls } = keySpy.mock;

		const assertCalls = (count: number) => {
			if (calls.length !== count) {
				throw new ApplicationError('`Object.keys()` was called an unexpected number of times', {
					extra: { times: calls.length },
				});
			}
		};

		assertCalls(0);
		isObjectEmpty(null);
		assertCalls(0);
		isObjectEmpty([1, 2, 3]);
		assertCalls(0);
		isObjectEmpty(Buffer.from('123'));
		assertCalls(0);
		isObjectEmpty({});
		assertCalls(1);
	});
});

describe('jsonParse', () => {
	it('parses JSON', () => {
		expect(jsonParse('[1, 2, 3]')).toEqual([1, 2, 3]);
		expect(jsonParse('{ "a": 1 }')).toEqual({ a: 1 });
	});

	it('optionally throws `errorMessage', () => {
		expect(() => {
			jsonParse('', { errorMessage: 'Invalid JSON' });
		}).toThrow('Invalid JSON');
	});

	it('optionally returns a `fallbackValue`', () => {
		expect(jsonParse('', { fallbackValue: { foo: 'bar' } })).toEqual({ foo: 'bar' });
	});
});

describe('jsonStringify', () => {
	const source: any = { a: 1, b: 2, d: new Date(1680089084200), r: new RegExp('^test$', 'ig') };
	source.c = source;

	it('should throw errors on circular references by default', () => {
		expect(() => jsonStringify(source)).toThrow('Converting circular structure to JSON');
	});

	it('should break circular references when requested', () => {
		expect(jsonStringify(source, { replaceCircularRefs: true })).toEqual(
			'{"a":1,"b":2,"d":"2023-03-29T11:24:44.200Z","r":{},"c":"[Circular Reference]"}',
		);
	});

	it('should not detect duplicates as circular references', () => {
		const y = { z: 5 };
		const x = [y, y, { y }];
		expect(jsonStringify(x, { replaceCircularRefs: true })).toEqual(
			'[{"z":5},{"z":5},{"y":{"z":5}}]',
		);
	});
});

describe('deepCopy', () => {
	it('should deep copy an object', () => {
		const serializable = {
			x: 1,
			y: 2,
			toJSON: () => 'x:1,y:2',
		};
		const object = {
			deep: {
				props: {
					list: [{ a: 1 }, { b: 2 }, { c: 3 }],
				},
				arr: [1, 2, 3],
			},
			serializable,
			arr: [
				{
					prop: {
						list: ['a', 'b', 'c'],
					},
				},
			],
			func: () => {},
			date: new Date(1667389172201),
			undef: undefined,
			nil: null,
			bool: true,
			num: 1,
		};
		const copy = deepCopy(object);
		expect(copy).not.toBe(object);
		expect(copy.arr).toEqual(object.arr);
		expect(copy.arr).not.toBe(object.arr);
		expect(copy.date).toBe('2022-11-02T11:39:32.201Z');
		expect(copy.serializable).toBe(serializable.toJSON());
		expect(copy.deep.props).toEqual(object.deep.props);
		expect(copy.deep.props).not.toBe(object.deep.props);
	});

	it('should avoid max call stack in case of circular deps', () => {
		const object: Record<string, any> = {
			deep: {
				props: {
					list: [{ a: 1 }, { b: 2 }, { c: 3 }],
				},
				arr: [1, 2, 3],
			},
			arr: [
				{
					prop: {
						list: ['a', 'b', 'c'],
					},
				},
			],
			func: () => {},
			date: new Date(1667389172201),
			undef: undefined,
			nil: null,
			bool: true,
			num: 1,
		};

		object.circular = object;
		object.deep.props.circular = object;
		object.deep.arr.push(object);

		const copy = deepCopy(object);
		expect(copy).not.toBe(object);
		expect(copy.arr).toEqual(object.arr);
		expect(copy.arr).not.toBe(object.arr);
		expect(copy.date).toBe('2022-11-02T11:39:32.201Z');
		expect(copy.deep.props.circular).toBe(copy);
		expect(copy.deep.props.circular).not.toBe(object);
		expect(copy.deep.arr.slice(-1)[0]).toBe(copy);
		expect(copy.deep.arr.slice(-1)[0]).not.toBe(object);
	});
});

describe('fileTypeFromMimeType', () => {
	it('should recognize json', () => {
		expect(fileTypeFromMimeType('application/json')).toEqual('json');
	});

	it('should recognize html', () => {
		expect(fileTypeFromMimeType('text/html')).toEqual('html');
	});

	it('should recognize image', () => {
		expect(fileTypeFromMimeType('image/jpeg')).toEqual('image');
		expect(fileTypeFromMimeType('image/png')).toEqual('image');
		expect(fileTypeFromMimeType('image/avif')).toEqual('image');
		expect(fileTypeFromMimeType('image/webp')).toEqual('image');
	});

	it('should recognize audio', () => {
		expect(fileTypeFromMimeType('audio/wav')).toEqual('audio');
		expect(fileTypeFromMimeType('audio/webm')).toEqual('audio');
		expect(fileTypeFromMimeType('audio/ogg')).toEqual('audio');
		expect(fileTypeFromMimeType('audio/mp3')).toEqual('audio');
	});

	it('should recognize video', () => {
		expect(fileTypeFromMimeType('video/mp4')).toEqual('video');
		expect(fileTypeFromMimeType('video/webm')).toEqual('video');
		expect(fileTypeFromMimeType('video/ogg')).toEqual('video');
	});

	it('should recognize text', () => {
		expect(fileTypeFromMimeType('text/plain')).toEqual('text');
		expect(fileTypeFromMimeType('text/css')).toEqual('text');
		expect(fileTypeFromMimeType('text/html')).not.toEqual('text');
		expect(fileTypeFromMimeType('text/javascript')).toEqual('text');
		expect(fileTypeFromMimeType('application/javascript')).toEqual('text');
	});

	it('should recognize pdf', () => {
		expect(fileTypeFromMimeType('application/pdf')).toEqual('pdf');
	});
});

const repeat = (fn: () => void, times = 10) => Array(times).fill(0).forEach(fn);

describe('randomInt', () => {
	it('should generate random integers', () => {
		repeat(() => {
			const result = randomInt(10);
			expect(result).toBeLessThanOrEqual(10);
			expect(result).toBeGreaterThanOrEqual(0);
		});
	});

	it('should generate random in range', () => {
		repeat(() => {
			const result = randomInt(10, 100);
			expect(result).toBeLessThanOrEqual(100);
			expect(result).toBeGreaterThanOrEqual(10);
		});
	});
});

describe('randomString', () => {
	it('should return a random string of the specified length', () => {
		repeat(() => {
			const result = randomString(42);
			expect(result).toHaveLength(42);
		});
	});

	it('should return a random string of the in the length range', () => {
		repeat(() => {
			const result = randomString(10, 100);
			expect(result.length).toBeGreaterThanOrEqual(10);
			expect(result.length).toBeLessThanOrEqual(100);
		});
	});

	it('should only contain characters from the specified character set', () => {
		repeat(() => {
			const result = randomString(1000);
			result.split('').every((char) => ALPHABET.includes(char));
		});
	});
});

type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
	? true
	: false;

describe('hasKey', () => {
	it('should return false if the input is null', () => {
		const x = null;
		const result = hasKey(x, 'key');

		expect(result).toEqual(false);
	});
	it('should return false if the input is undefined', () => {
		const x = undefined;
		const result = hasKey(x, 'key');

		expect(result).toEqual(false);
	});
	it('should return false if the input is a number', () => {
		const x = 1;
		const result = hasKey(x, 'key');

		expect(result).toEqual(false);
	});
	it('should return false if the input is an array out of bounds', () => {
		const x = [1, 2];
		const result = hasKey(x, 5);

		expect(result).toEqual(false);
	});

	it('should return true if the input is an array within bounds', () => {
		const x = [1, 2];
		const result = hasKey(x, 1);

		expect(result).toEqual(true);
	});
	it('should return true if the input is an array with the key `length`', () => {
		const x = [1, 2];
		const result = hasKey(x, 'length');

		expect(result).toEqual(true);
	});
	it('should return false if the input is an array with the key `toString`', () => {
		const x = [1, 2];
		const result = hasKey(x, 'toString');

		expect(result).toEqual(false);
	});
	it('should return false if the input is an object without the key', () => {
		const x = { a: 3 };
		const result = hasKey(x, 'a');

		expect(result).toEqual(true);
	});

	it('should return true if the input is an object with the key', () => {
		const x = { a: 3 };
		const result = hasKey(x, 'b');

		expect(result).toEqual(false);
	});

	it('should provide a type guard', () => {
		const x: unknown = { a: 3 };
		if (hasKey(x, '0')) {
			const y: Expect<Equal<typeof x, Record<'0', unknown>>> = true;
			y;
		} else {
			const z: Expect<Equal<typeof x, unknown>> = true;
			z;
		}
	});
});

describe('isSafeObjectProperty', () => {
	it.each([
		['__proto__', false],
		['prototype', false],
		['constructor', false],
		['getPrototypeOf', false],
		['safeKey', true],
		['anotherKey', true],
		['toString', true],
	])('should return %s for key "%s"', (key, expected) => {
		expect(isSafeObjectProperty(key)).toBe(expected);
	});
});

describe('setSafeObjectProperty', () => {
	it.each([
		['safeKey', 123, { safeKey: 123 }],
		['__proto__', 456, {}],
		['constructor', 'test', {}],
	])('should set property "%s" safely', (key, value, expected) => {
		const obj: Record<string, unknown> = {};
		setSafeObjectProperty(obj, key, value);
		expect(obj).toEqual(expected);
	});
});

describe('sleepWithAbort', () => {
	it('should resolve after the specified time when not aborted', async () => {
		const start = Date.now();
		await sleepWithAbort(100);
		const end = Date.now();
		const elapsed = end - start;

		// Allow some tolerance for timing
		expect(elapsed).toBeGreaterThanOrEqual(90);
		expect(elapsed).toBeLessThan(200);
	});

	it('should reject immediately if abort signal is already aborted', async () => {
		const abortController = new AbortController();
		abortController.abort();

		await expect(sleepWithAbort(1000, abortController.signal)).rejects.toThrow(
			ManualExecutionCancelledError,
		);
	});

	it('should reject when abort signal is triggered during sleep', async () => {
		const abortController = new AbortController();

		// Start the sleep and abort after 50ms
		setTimeout(() => abortController.abort(), 50);

		const start = Date.now();
		await expect(sleepWithAbort(1000, abortController.signal)).rejects.toThrow(
			ManualExecutionCancelledError,
		);
		const end = Date.now();
		const elapsed = end - start;

		// Should have been aborted after ~50ms, not the full 1000ms
		expect(elapsed).toBeLessThan(200);
	});

	it('should work without abort signal', async () => {
		const start = Date.now();
		await sleepWithAbort(100, undefined);
		const end = Date.now();
		const elapsed = end - start;

		expect(elapsed).toBeGreaterThanOrEqual(90);
		expect(elapsed).toBeLessThan(200);
	});

	it('should clean up timeout when aborted during sleep', async () => {
		const abortController = new AbortController();
		const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

		// Start the sleep and abort after 50ms
		const sleepPromise = sleepWithAbort(1000, abortController.signal);
		setTimeout(() => abortController.abort(), 50);

		await expect(sleepPromise).rejects.toThrow(ManualExecutionCancelledError);

		// clearTimeout should have been called to clean up
		expect(clearTimeoutSpy).toHaveBeenCalled();

		clearTimeoutSpy.mockRestore();
	});
});

describe('isDomainAllowed', () => {
	describe('when no allowed domains are specified', () => {
		it('should allow all domains when allowedDomains is empty', () => {
			expect(isDomainAllowed('https://example.com', { allowedDomains: '' })).toBe(true);
		});

		it('should allow all domains when allowedDomains contains only whitespace', () => {
			expect(isDomainAllowed('https://example.com', { allowedDomains: '   ' })).toBe(true);
		});
	});

	describe('in strict validation mode', () => {
		it('should allow exact domain matches', () => {
			expect(
				isDomainAllowed('https://example.com', {
					allowedDomains: 'example.com',
				}),
			).toBe(true);
		});

		it('should allow domains from a comma-separated list', () => {
			expect(
				isDomainAllowed('https://example.com', {
					allowedDomains: 'test.com,example.com,other.org',
				}),
			).toBe(true);
		});

		it('should handle whitespace in allowed domains list', () => {
			expect(
				isDomainAllowed('https://example.com', {
					allowedDomains: ' test.com , example.com , other.org ',
				}),
			).toBe(true);
		});

		it('should block non-matching domains', () => {
			expect(
				isDomainAllowed('https://malicious.com', {
					allowedDomains: 'example.com',
				}),
			).toBe(false);
		});

		it('should block subdomains not set', () => {
			expect(
				isDomainAllowed('https://sub.example.com', {
					allowedDomains: 'example.com',
				}),
			).toBe(false);
		});
	});

	describe('with wildcard domains', () => {
		it('should allow matching wildcard domains', () => {
			expect(
				isDomainAllowed('https://test.example.com', {
					allowedDomains: '*.example.com',
				}),
			).toBe(true);
		});

		it('should allow nested subdomains with wildcards', () => {
			expect(
				isDomainAllowed('https://deep.nested.example.com', {
					allowedDomains: '*.example.com',
				}),
			).toBe(true);
		});

		it('should block non-matching domains with wildcards', () => {
			expect(
				isDomainAllowed('https://example.org', {
					allowedDomains: '*.example.com',
				}),
			).toBe(false);
		});
	});

	describe('edge cases', () => {
		it('should handle invalid URLs safely', () => {
			expect(
				isDomainAllowed('not-a-valid-url', {
					allowedDomains: 'example.com',
				}),
			).toBe(false);
		});

		it('should handle URLs with ports', () => {
			expect(
				isDomainAllowed('https://example.com:8080/path', {
					allowedDomains: 'example.com',
				}),
			).toBe(true);
		});

		it('should handle URLs with authentication', () => {
			expect(
				isDomainAllowed('https://user:pass@example.com', {
					allowedDomains: 'example.com',
				}),
			).toBe(true);
		});

		it('should handle URLs with query parameters and fragments', () => {
			expect(
				isDomainAllowed('https://example.com/path?query=test#fragment', {
					allowedDomains: 'example.com',
				}),
			).toBe(true);
		});

		it('should handle IP addresses', () => {
			expect(
				isDomainAllowed('https://192.168.1.1', {
					allowedDomains: '192.168.1.1',
				}),
			).toBe(true);
		});

		it('should handle empty URLs', () => {
			expect(
				isDomainAllowed('', {
					allowedDomains: 'example.com',
				}),
			).toBe(false);
		});
	});
});

describe('isCommunityPackageName', () => {
	// Standard community package names
	it('should identify standard community node package names', () => {
		expect(isCommunityPackageName('n8n-nodes-example')).toBe(true);
		expect(isCommunityPackageName('n8n-nodes-custom')).toBe(true);
		expect(isCommunityPackageName('n8n-nodes-test')).toBe(true);
	});

	// Scoped package names
	it('should identify scoped community node package names', () => {
		expect(isCommunityPackageName('@username/n8n-nodes-example')).toBe(true);
		expect(isCommunityPackageName('@org/n8n-nodes-custom')).toBe(true);
		expect(isCommunityPackageName('@test-scope/n8n-nodes-test-name')).toBe(true);
	});

	it('should identify scoped packages with other characters', () => {
		expect(isCommunityPackageName('n8n-nodes-my_package')).toBe(true);
		expect(isCommunityPackageName('@user/n8n-nodes-with_underscore')).toBe(true);
		expect(isCommunityPackageName('@user_name/n8n-nodes-example')).toBe(true);
		expect(isCommunityPackageName('@n8n-io/n8n-nodes-test')).toBe(true);
		expect(isCommunityPackageName('@n8n.io/n8n-nodes-test')).toBe(true);
	});

	it('should handle mixed cases', () => {
		expect(isCommunityPackageName('@user-name_org/n8n-nodes-mixed-case_example')).toBe(true);
		expect(isCommunityPackageName('@mixed_style-org/n8n-nodes-complex_name-format')).toBe(true);
		expect(isCommunityPackageName('@my.mixed_style-org/n8n-nodes-complex_name-format')).toBe(true);
	});

	// Official n8n packages that should not be identified as community packages
	it('should not identify official n8n packages as community nodes', () => {
		expect(isCommunityPackageName('@n8n/n8n-nodes-example')).toBe(false);
		expect(isCommunityPackageName('n8n-nodes-base')).toBe(false);
	});

	// Additional edge cases
	it('should handle edge cases correctly', () => {
		// Non-matching patterns
		expect(isCommunityPackageName('not-n8n-nodes')).toBe(false);
		expect(isCommunityPackageName('n8n-core')).toBe(false);

		// With node name after package
		expect(isCommunityPackageName('n8n-nodes-example.NodeName')).toBe(true);
		expect(isCommunityPackageName('@user/n8n-nodes-example.NodeName')).toBe(true);
	});

	// Multiple executions to test regex state
	it('should work correctly with multiple consecutive calls', () => {
		expect(isCommunityPackageName('@user/n8n-nodes-example')).toBe(true);
		expect(isCommunityPackageName('n8n-nodes-base')).toBe(false);
		expect(isCommunityPackageName('@test-scope/n8n-nodes-test')).toBe(true);
	});
});

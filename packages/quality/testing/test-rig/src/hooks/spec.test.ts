import { FILES, hookSpecSchema, parseHookSpecs, setHookSpecSchema } from './spec';

const base = { file: FILES.jobProcessor, target: 'JobProcessor.prototype', method: 'processJob' };

describe('hookSpecSchema', () => {
	it('accepts a full spec', () => {
		const spec = {
			...base,
			point: 'job-start_1',
			kind: 'observe',
			arm: 'always',
			once: false,
			scope: base,
			where: [
				{ path: 'args.0.id', equals: 1 },
				{ path: 'result', truthy: true },
			],
			detail: { id: 'args.0.id' },
			phase: 'after',
			roles: ['main', 'worker'],
			lazy: true,
		};
		expect(hookSpecSchema.parse(spec)).toEqual(spec);
	});

	it.each(['has space', 'dot.point', 'slash/point', ''])('rejects the point %j', (point) => {
		expect(hookSpecSchema.safeParse({ ...base, point }).success).toBe(false);
	});
});

describe('parseHookSpecs', () => {
	it('returns valid specs in order', () => {
		const specs = [
			{ ...base, point: 'a' },
			{ ...base, point: 'b' },
		];
		expect(parseHookSpecs(specs)).toEqual(specs);
	});

	it('names the point and field of the first invalid spec', () => {
		expect(() =>
			parseHookSpecs([
				{ ...base, point: 'a' },
				{ ...base, point: 'b', kind: 'x' },
			]),
		).toThrow(/^hook b: kind: /);
	});

	it('names the point regex rule', () => {
		expect(() => parseHookSpecs([{ ...base, point: 'a b' }])).toThrow(
			'hook a b: point: letters, digits, _ and - only',
		);
	});

	it('names a spec without a point by its index', () => {
		expect(() => parseHookSpecs([{ ...base, point: 'a' }, { ...base }])).toThrow(
			/^hook #1: point: /,
		);
	});

	it('names an unknown field', () => {
		expect(() => parseHookSpecs([{ ...base, point: 'a', extra: 1 }])).toThrow(
			/^hook a: spec: .*extra/,
		);
	});

	it('rejects a duplicate point', () => {
		expect(() =>
			parseHookSpecs([
				{ ...base, point: 'a' },
				{ ...base, point: 'a' },
			]),
		).toThrow('hook a: duplicate point');
	});
});

describe('setHookSpecSchema', () => {
	const set = { point: 'timers', kind: 'set', file: FILES.engineStaleness, target: '' };

	it('accepts a full spec', () => {
		const spec = {
			...set,
			values: { a: 1, b: { c: true } },
			roles: ['engine'],
			lazy: false,
			optional: true,
		};
		expect(setHookSpecSchema.parse(spec)).toEqual(spec);
	});

	it('rejects a spec with no values', () => {
		expect(setHookSpecSchema.safeParse({ ...set, values: {} }).success).toBe(false);
		expect(setHookSpecSchema.safeParse(set).success).toBe(false);
	});
});

describe('parseHookSpecs with set hooks', () => {
	const set = {
		point: 'timers',
		kind: 'set',
		file: FILES.engineStaleness,
		target: '',
		values: { a: 1 },
	};

	it('returns set hooks next to method hooks', () => {
		const specs = [set, { ...base, point: 'b' }];
		expect(parseHookSpecs(specs)).toEqual(specs);
	});

	it.each([
		['method', 'run', /^hook timers: spec: .*method/],
		['phase', 'after', /^hook timers: spec: .*phase/],
		['where', [], /^hook timers: spec: .*where/],
	])('rejects the method hook field %s on a set hook', (field, value, error) => {
		expect(() => parseHookSpecs([{ ...set, [field]: value }])).toThrow(error);
	});

	it('names the values field', () => {
		expect(() => parseHookSpecs([{ ...set, values: {} }])).toThrow(
			'hook timers: values: set at least one value',
		);
	});
});

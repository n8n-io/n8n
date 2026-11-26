import type { INodeProperties, INodeTypeDescription } from '../src/interfaces';
import { getNodeVersionAdditions } from '../src/node-helpers';

/** The additions as short keys: `path` for a parameter, `path=value` for a dropdown choice. */
const getNewParameterPaths = (...args: Parameters<typeof getNodeVersionAdditions>) =>
	getNodeVersionAdditions(...args).map((addition) =>
		addition.kind === 'parameter' ? addition.path : `${addition.path}=${addition.value}`,
	);

describe('getNodeVersionAdditions', () => {
	const type = (properties: INodeProperties[]) =>
		({ name: 'test', properties }) as INodeTypeDescription;
	const text = (name: string, extra: Partial<INodeProperties> = {}): INodeProperties => ({
		displayName: name,
		name,
		type: 'string',
		default: '',
		...extra,
	});
	const collection = (name: string, options: INodeProperties[]): INodeProperties => ({
		displayName: name,
		name,
		type: 'collection',
		default: {},
		options,
	});
	const fromVersion2 = { '@version': [{ _cnd: { gte: 2 } }] };

	it('returns a top-level parameter that only the new description has', () => {
		const oldType = type([text('url')]);
		const newType = type([
			text('url'),
			text('added', { displayOptions: { show: { resource: ['x'] } } }),
		]);

		expect(getNewParameterPaths(oldType, 1, newType, 2)).toEqual(['added']);
	});

	it('returns a parameter that a shared description shows from the new version', () => {
		const shared = type([
			text('url'),
			text('added', { displayOptions: { show: { ...fromVersion2, '/other': [true] } } }),
		]);

		expect(getNewParameterPaths(shared, 1, shared, 2)).toEqual(['added']);
	});

	it('does not return a same-named replacement of a parameter that the new version hides', () => {
		const shared = type([
			text('mode', { displayOptions: { hide: fromVersion2 } }),
			text('mode', { displayOptions: { show: fromVersion2 } }),
		]);

		expect(getNewParameterPaths(shared, 1, shared, 2)).toEqual([]);
	});

	it('returns a parameter that is hidden in the old version', () => {
		const oldType = type([text('added', { type: 'hidden' })]);
		const newType = type([text('added')]);

		expect(getNewParameterPaths(oldType, 1, newType, 2)).toEqual(['added']);
	});

	it('returns a new option of a collection that both versions have', () => {
		const shared = type([
			collection('options', [
				text('removed', { displayOptions: { hide: fromVersion2 } }),
				text('added', { displayOptions: { show: { ...fromVersion2, '/other': [true] } } }),
				text('kept'),
			]),
		]);

		expect(getNewParameterPaths(shared, 1, shared, 2)).toEqual(['options.added']);
	});

	it('returns a new collection and all its options', () => {
		const oldType = type([text('url')]);
		const newType = type([text('url'), collection('options', [text('a'), text('b')])]);

		expect(getNewParameterPaths(oldType, 1, newType, 2)).toEqual([
			'options',
			'options.a',
			'options.b',
		]);
	});

	it('returns only the top-level name of a new fixed collection', () => {
		const oldType = type([text('url')]);
		const newType = type([
			text('url'),
			{
				displayName: 'Rules',
				name: 'rules',
				type: 'fixedCollection',
				default: {},
				options: [{ displayName: 'Values', name: 'values', values: [text('inner')] }],
			},
		]);

		expect(getNewParameterPaths(oldType, 1, newType, 2)).toEqual(['rules']);
	});

	it('takes the union of same-named collections', () => {
		const oldType = type([collection('options', [text('a')]), collection('options', [text('b')])]);
		const newType = type([
			collection('options', [text('a'), text('b')]),
			collection('options', [text('b'), text('c')]),
		]);

		expect(getNewParameterPaths(oldType, 1, newType, 2)).toEqual(['options.c']);
	});

	it('returns nothing for the same version', () => {
		const shared = type([
			text('added', { displayOptions: { show: fromVersion2 } }),
			collection('options', [text('a')]),
		]);

		expect(getNewParameterPaths(shared, 2, shared, 2)).toEqual([]);
	});

	describe('dropdown values', () => {
		const dropdown = (
			name: string,
			values: string[],
			extra: Partial<INodeProperties> = {},
		): INodeProperties => ({
			displayName: name,
			name,
			type: 'options',
			default: values[0],
			options: values.map((value) => ({ name: value, value })),
			...extra,
		});

		it('returns a value that only the new description has', () => {
			const oldType = type([dropdown('resource', ['a', 'b'])]);
			const newType = type([dropdown('resource', ['a', 'b', 'c'])]);

			expect(getNewParameterPaths(oldType, 1, newType, 2)).toEqual(['resource=c']);
		});

		it('returns a value that a shared description shows from the new version', () => {
			const shared = type([
				{
					...dropdown('resource', ['a']),
					options: [
						{ name: 'a', value: 'a' },
						{ name: 'b', value: 'b', displayOptions: { show: fromVersion2 } },
					],
				},
			]);

			expect(getNewParameterPaths(shared, 1, shared, 2)).toEqual(['resource=b']);
		});

		it('does not return the values of a parameter that is new as a whole', () => {
			const newType = type([dropdown('resource', ['a', 'b'])]);

			expect(getNewParameterPaths(type([]), 1, newType, 2)).toEqual(['resource']);
		});

		it('returns no values when the old parameter had no static choices', () => {
			const newType = type([dropdown('toDelete', ['rows', 'columns'])]);

			expect(getNewParameterPaths(type([text('toDelete')]), 1, newType, 2)).toEqual([]);
		});

		it('does not return a value that another same-named parameter had', () => {
			const forResource = (resource: string) => ({
				displayOptions: { show: { resource: [resource] } },
			});
			const oldType = type([
				dropdown('operation', ['get'], forResource('a')),
				dropdown('operation', ['get', 'delete'], forResource('b')),
			]);
			const newType = type([
				dropdown('operation', ['get', 'delete'], forResource('a')),
				dropdown('operation', ['get', 'delete', 'search'], forResource('b')),
			]);

			expect(getNewParameterPaths(oldType, 1, newType, 2)).toEqual(['operation=search']);
		});

		it('returns a new value of a dropdown inside a collection', () => {
			const oldType = type([collection('options', [dropdown('format', ['json'])])]);
			const newType = type([collection('options', [dropdown('format', ['json', 'csv'])])]);

			expect(getNewParameterPaths(oldType, 1, newType, 2)).toEqual(['options.format=csv']);
		});
	});

	it('returns the display names with each addition', () => {
		const oldType = type([
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				default: 'message',
				options: [{ name: 'Message', value: 'message' }],
			},
		]);
		const newType = type([
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				default: 'message',
				options: [
					{ name: 'Message', value: 'message' },
					{ name: 'Thread', value: 'thread' },
				],
			},
			collection('options', [text('timeout', { displayName: 'Timeout' })]),
		]);

		expect(getNodeVersionAdditions(oldType, 1, newType, 2)).toEqual([
			{
				kind: 'value',
				path: 'resource',
				displayName: 'Resource',
				value: 'thread',
				valueDisplayName: 'Thread',
			},
			{ kind: 'parameter', path: 'options', displayName: 'options' },
			{ kind: 'parameter', path: 'options.timeout', displayName: 'Timeout' },
		]);
	});
});

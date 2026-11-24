import {
	splitAndTrim,
	parseAnalyzers,
	fixFieldType,
	prepareInputItem,
	constructFilter,
} from '../helpers/utils';

describe('Test TheHiveProject, splitAndTrim', () => {
	it('should split and trim string, removing empty entries', () => {
		const data = 'a, b,, c, d, e, f,,';

		const result = splitAndTrim(data);

		expect(result).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
	});

	it('should return unchanged array', () => {
		const data = ['a', 'b', 'c', 'd', 'e', 'f'];

		const result = splitAndTrim(data);

		expect(result).toEqual(data);
	});
});

describe('Test TheHiveProject, parseAnalyzers', () => {
	it('should map an array of "analyzerId::cortexId" entries', () => {
		const data = ['analyzer-1::cortex-1', 'analyzer-2::cortex-2'];

		const result = parseAnalyzers(data);

		expect(result).toEqual([
			{ analyzerId: 'analyzer-1', cortexId: 'cortex-1' },
			{ analyzerId: 'analyzer-2', cortexId: 'cortex-2' },
		]);
	});

	it('should map a comma-joined string (expression coercion case)', () => {
		const data = 'analyzer-1::cortex-1, analyzer-2::cortex-2';

		const result = parseAnalyzers(data);

		expect(result).toEqual([
			{ analyzerId: 'analyzer-1', cortexId: 'cortex-1' },
			{ analyzerId: 'analyzer-2', cortexId: 'cortex-2' },
		]);
	});

	it('should handle a single analyzer provided as a string', () => {
		const result = parseAnalyzers('analyzer-1::cortex-1');

		expect(result).toEqual([{ analyzerId: 'analyzer-1', cortexId: 'cortex-1' }]);
	});

	it('should drop empty entries from a comma-joined string', () => {
		const result = parseAnalyzers('analyzer-1::cortex-1,, analyzer-2::cortex-2,');

		expect(result).toEqual([
			{ analyzerId: 'analyzer-1', cortexId: 'cortex-1' },
			{ analyzerId: 'analyzer-2', cortexId: 'cortex-2' },
		]);
	});

	it('should return an empty array for an empty string', () => {
		expect(parseAnalyzers('')).toEqual([]);
	});
});

describe('Test TheHiveProject, fixFieldType', () => {
	it('should split and trim tags', () => {
		const data = {
			tags: 'a, b,, c, d, e, f,,',
			addTags: 'a, b,, c, d, e, f,,',
			removeTags: 'a, b,, c, d, e, f,,',
			notChanged: 'a, b,, c, d, e, f,,',
		};

		const result = fixFieldType(data);

		expect(result).toEqual({
			tags: ['a', 'b', 'c', 'd', 'e', 'f'],
			addTags: ['a', 'b', 'c', 'd', 'e', 'f'],
			removeTags: ['a', 'b', 'c', 'd', 'e', 'f'],
			notChanged: 'a, b,, c, d, e, f,,',
		});
	});

	it('should convert date strings to milis', () => {
		const data = {
			date: '2020-01-01T00:00:00.000Z',
			lastSyncDate: '2020-01-01T00:00:00.000Z',
			startDate: '2020-01-01T00:00:00.000Z',
			endDate: '2020-01-01T00:00:00.000Z',
			dueDate: '2020-01-01T00:00:00.000Z',
			includeInTimeline: '2020-01-01T00:00:00.000Z',
			sightedAt: '2020-01-01T00:00:00.000Z',
			notChanged: '2020-01-01T00:00:00.000Z',
		};

		const result = fixFieldType(data);

		expect(result).toEqual({
			date: 1577836800000,
			lastSyncDate: 1577836800000,
			startDate: 1577836800000,
			endDate: 1577836800000,
			dueDate: 1577836800000,
			includeInTimeline: 1577836800000,
			sightedAt: 1577836800000,
			notChanged: '2020-01-01T00:00:00.000Z',
		});
	});
});

describe('Test TheHiveProject, prepareInputItem', () => {
	it('should return object with fields present in schema', () => {
		const data = {
			a: 1,
			b: 2,
			c: 3,
			d: 4,
			f: 5,
			g: 6,
		};

		const schema = [
			{
				id: 'a',
				required: true,
			},
			{
				id: 'b',
				required: true,
			},
			{
				id: 'c',
			},
			{
				id: 'd',
				required: true,
			},
			{
				id: 'e',
			},
		];

		const result = prepareInputItem(data, schema, 0);

		expect(result).toEqual({
			a: 1,
			b: 2,
			c: 3,
			d: 4,
		});
	});
});

describe('Test TheHiveProject, constructFilter', () => {
	it('should add default operator _eq', () => {
		const data = {
			field: 'myField',
			value: 'myValue',
		};

		const result = constructFilter(data);

		expect(result).toEqual({
			_eq: {
				_field: 'myField',
				_value: 'myValue',
			},
		});
	});

	it('should return filter _gte', () => {
		const data = {
			field: 'myField',
			value: 'myValue',
			operator: '_gte',
		};

		const result = constructFilter(data);

		expect(result).toEqual({
			_gte: {
				_field: 'myField',
				_value: 'myValue',
			},
		});
	});

	it('should return filter _in', () => {
		const data = {
			field: 'myField',
			values: 'a, b,, c, d',
			operator: '_in',
		};

		const result = constructFilter(data);

		expect(result).toEqual({
			_in: {
				_field: 'myField',
				_values: ['a', 'b', 'c', 'd'],
			},
		});
	});

	it('should return filter _between', () => {
		const data = {
			field: 'myField',
			from: 'a',
			to: 'b',
			operator: '_between',
		};

		const result = constructFilter(data);

		expect(result).toEqual({
			_between: {
				_field: 'myField',
				_from: 'a',
				_to: 'b',
			},
		});
	});
});

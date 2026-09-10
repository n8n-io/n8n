import {
	collectStrings,
	describeDataTablePath,
	extractDataTableRefs,
} from '../src/data-table-expression-refs';

describe('extractDataTableRefs', () => {
	it('returns nothing when the text has no reference', () => {
		expect(extractDataTableRefs('{{ $json.name }}')).toEqual([]);
	});

	it('reads the edge accessors', () => {
		expect(extractDataTableRefs('{{ $datatable.users.first.email }}')).toEqual([
			{ table: 'users', accessor: 'first' },
		]);
		expect(extractDataTableRefs('{{ $datatable.users.last.email }}')).toEqual([
			{ table: 'users', accessor: 'last' },
		]);
	});

	it('reads a row lookup with an expression key', () => {
		expect(extractDataTableRefs('{{ $datatable.users.row[$json.userId].plan }}')).toEqual([
			{ table: 'users', accessor: 'row', keyExpression: '$json.userId' },
		]);
	});

	it('reads a find lookup', () => {
		expect(
			extractDataTableRefs('{{ $datatable.users.find({ email: $json.email }).plan }}'),
		).toEqual([
			{ table: 'users', accessor: 'find', column: 'email', keyExpression: '$json.email' },
		]);
	});

	it('reads a find column that needs quoting, and a nested value', () => {
		expect(
			extractDataTableRefs("{{ $datatable.users.find({ 'Email Address': $json.a[0] }) }}"),
		).toEqual([
			{ table: 'users', accessor: 'find', column: 'Email Address', keyExpression: '$json.a[0]' },
		]);
	});

	it('reads a table name that needs bracket access', () => {
		expect(extractDataTableRefs("{{ $datatable['My Users'].row[7].plan }}")).toEqual([
			{ table: 'My Users', accessor: 'row', keyExpression: '7' },
		]);
	});

	it('keeps nested brackets and quoted brackets inside the key', () => {
		expect(extractDataTableRefs('{{ $datatable.users.row[$json.ids[0]].plan }}')).toEqual([
			{ table: 'users', accessor: 'row', keyExpression: '$json.ids[0]' },
		]);

		expect(extractDataTableRefs("{{ $datatable.users.row[$json['a]b']] }}")).toEqual([
			{ table: 'users', accessor: 'row', keyExpression: "$json['a]b']" },
		]);
	});

	it('reads every reference in one string', () => {
		expect(extractDataTableRefs('{{ $datatable.a.first.x + $datatable.b.row[1].y }}')).toEqual([
			{ table: 'a', accessor: 'first' },
			{ table: 'b', accessor: 'row', keyExpression: '1' },
		]);
	});

	it('skips references it cannot resolve without running the expression', () => {
		expect(extractDataTableRefs('{{ $datatable[$json.table].first }}')).toEqual([]);
		expect(extractDataTableRefs('{{ $datatable.users.rows }}')).toEqual([]);
		expect(extractDataTableRefs('{{ $datatable.users.row[] }}')).toEqual([]);
		expect(extractDataTableRefs('{{ $datatable.users.row[$json.id }}')).toEqual([]);
		expect(extractDataTableRefs('{{ $datatable.users.where.email[1] }}')).toEqual([]);
		expect(extractDataTableRefs('{{ $datatable.users.find($json.criteria) }}')).toEqual([]);
		expect(extractDataTableRefs('{{ $datatable.users.find({}) }}')).toEqual([]);
		expect(extractDataTableRefs('{{ $datatable.users.find({ email: }) }}')).toEqual([]);
	});
});

describe('collectStrings', () => {
	it('yields strings from a nested parameter tree', () => {
		const parameters = {
			url: '={{ $datatable.users.first.host }}',
			options: { headers: [{ value: '={{ $datatable.keys.last.token }}' }] },
			timeout: 30,
			enabled: true,
			missing: null,
		};

		expect([...collectStrings(parameters)]).toEqual([
			'={{ $datatable.users.first.host }}',
			'={{ $datatable.keys.last.token }}',
		]);
	});
});

describe('describeDataTablePath', () => {
	it.each([
		['$datatable', { at: 'table' }],
		['$datatable.users', { at: 'accessor', table: 'users' }],
		["$datatable['My Users']", { at: 'accessor', table: 'My Users' }],
		['$datatable.users.first', { at: 'rowField', table: 'users' }],
		['$datatable.users.last', { at: 'rowField', table: 'users' }],
		['$datatable.users.row[$json.id]', { at: 'rowField', table: 'users' }],
		['$datatable.users.find({ email: $json.email })', { at: 'rowField', table: 'users' }],
	])('describes %s', (base, expected) => {
		expect(describeDataTablePath(base)).toEqual(expected);
	});

	it.each([
		'$json',
		'$datatable.users.rows',
		'$datatable.users.first.email',
		'$datatable.users.row',
		'$datatable.users.where',
	])('has nothing to offer for %s', (base) => {
		expect(describeDataTablePath(base)).toBeUndefined();
	});
});

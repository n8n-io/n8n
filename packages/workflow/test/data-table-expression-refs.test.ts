import { describeDataTablePath, extractDataTableRefs } from '../src/data-table-expression-refs';

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
			{ table: 'users', accessor: 'row', column: 'id', keyExpression: '$json.userId' },
		]);
	});

	it('reads a column lookup', () => {
		expect(extractDataTableRefs('{{ $datatable.users.by.email[$json.email].plan }}')).toEqual([
			{ table: 'users', accessor: 'by', column: 'email', keyExpression: '$json.email' },
		]);
		expect(extractDataTableRefs("{{ $datatable.users.by['Email Address'][$json.a[0]] }}")).toEqual([
			{ table: 'users', accessor: 'by', column: 'Email Address', keyExpression: '$json.a[0]' },
		]);
	});

	it('reads a table name that needs bracket access', () => {
		expect(extractDataTableRefs("{{ $datatable['My Users'].row[7].plan }}")).toEqual([
			{ table: 'My Users', accessor: 'row', column: 'id', keyExpression: '7' },
		]);
	});

	it('keeps nested brackets and quoted brackets inside the key', () => {
		expect(extractDataTableRefs('{{ $datatable.users.row[$json.ids[0]].plan }}')).toEqual([
			{ table: 'users', accessor: 'row', column: 'id', keyExpression: '$json.ids[0]' },
		]);

		expect(extractDataTableRefs("{{ $datatable.users.row[$json['a]b']] }}")).toEqual([
			{ table: 'users', accessor: 'row', column: 'id', keyExpression: "$json['a]b']" },
		]);
	});

	it('reads every distinct reference in a parameter tree', () => {
		const parameters = {
			url: '={{ $datatable.a.first.x + $datatable.b.row[1].y }}',
			options: { headers: [{ value: '={{ $datatable.a.first.z }}' }] },
			timeout: 30,
			missing: null,
		};

		expect(extractDataTableRefs(parameters)).toEqual([
			{ table: 'a', accessor: 'first' },
			{ table: 'b', accessor: 'row', column: 'id', keyExpression: '1' },
		]);
	});

	it('skips references it cannot resolve without running the expression', () => {
		expect(extractDataTableRefs('{{ $datatable[$json.table].first }}')).toEqual([]);
		expect(extractDataTableRefs('{{ $datatable.users.rows }}')).toEqual([]);
		expect(extractDataTableRefs('{{ $datatable.users.row[] }}')).toEqual([]);
		expect(extractDataTableRefs('{{ $datatable.users.row[$json.id }}')).toEqual([]);
		expect(extractDataTableRefs('{{ $datatable.users.by[$json.column][1] }}')).toEqual([]);
		expect(extractDataTableRefs('{{ $datatable.users.by.email }}')).toEqual([]);
	});
});

describe('describeDataTablePath', () => {
	it.each([
		['$datatable', { at: 'table' }],
		['$datatable.users', { at: 'accessor', table: 'users' }],
		["$datatable['My Users']", { at: 'accessor', table: 'My Users' }],
		['$datatable.users.by', { at: 'column', table: 'users' }],
		['$datatable.users.first', { at: 'rowField', table: 'users' }],
		['$datatable.users.last', { at: 'rowField', table: 'users' }],
		['$datatable.users.row[$json.id]', { at: 'rowField', table: 'users' }],
		['$datatable.users.by.email[$json.email]', { at: 'rowField', table: 'users' }],
	])('describes %s', (base, expected) => {
		expect(describeDataTablePath(base)).toEqual(expected);
	});

	it.each([
		'$json',
		'$datatablefoo',
		'$datatable.users.rows',
		'$datatable.users.first.email',
		'$datatable.users.row',
		'$datatable.users.by.email',
	])('has nothing to offer for %s', (base) => {
		expect(describeDataTablePath(base)).toBeUndefined();
	});
});

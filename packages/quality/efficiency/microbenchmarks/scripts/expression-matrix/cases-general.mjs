/** General cases: every data shape with every expression. */
const rowsItem = (rows, cols) => ({
	id: 1,
	name: 'x',
	rows: Array.from({ length: rows }, (_, i) =>
		Object.fromEntries(
			Array.from({ length: cols }, (_, c) => [
				'field_' + c,
				c % 3 === 0 ? i * (c + 1) : c % 3 === 1 ? 'value ' + i + ' ' + c : { a: i, b: 'nested' },
			]),
		),
	),
});
const flat = (n) => ({
	id: 1,
	...Object.fromEntries(Array.from({ length: n }, (_, i) => ['f' + i, i % 2 ? i : 'value ' + i])),
});
const tree = (d) =>
	d === 0 ? { v: 'leaf value', n: 1 } : { a: tree(d - 1), b: tree(d - 1), label: 'level ' + d };
const chain = (d) => (d === 0 ? { v: 1 } : { next: chain(d - 1), label: 'level ' + d });
const apiRecord = (i) => ({
	id: i,
	field_0: i,
	field_1: 'value ' + i,
	email: 'user' + i + '@example.com',
	name: { first: 'First' + i, last: 'Last' + i },
	tags: ['a', 'b', 'c'],
	address: { street: i + ' Main St', city: 'Berlin', geo: { lat: 52.5, lng: 13.4 } },
	active: i % 2 === 0,
	score: i * 1.5,
	notes: null,
});
export const shapes = {
	// Flat objects.
	'flat-10': () => flat(10),
	'flat-50': () => flat(50),
	'flat-100': () => flat(100),
	'flat-200': () => flat(200),
	'flat-500': () => flat(500),
	'flat-3000': () => flat(3000),
	// One API record, and lists of them.
	'record-1': () => apiRecord(1),
	'records-100': () => ({ id: 1, rows: Array.from({ length: 100 }, (_, i) => apiRecord(i)) }),
	'records-5000': () => ({ id: 1, rows: Array.from({ length: 5000 }, (_, i) => apiRecord(i)) }),
	// Rows of columns.
	'rows-2KB': () => rowsItem(10, 10),
	'rows-21KB': () => rowsItem(100, 10),
	'rows-234KB': () => rowsItem(500, 20),
	'rows-961KB': () => rowsItem(2000, 20),
	'rows-4.8MB': () => rowsItem(10000, 20),
	'wide-rows-200x60': () => rowsItem(200, 60),
	'giant-rows-50x400': () => ({
		id: 1,
		rows: Array.from({ length: 50 }, (_, i) => ({
			field_0: i,
			field_1: 'value ' + i,
			cells: Array.from({ length: 400 }, (_, c) => ({ c, text: 'cell ' + i + ' ' + c })),
		})),
	}),
	// Arrays of primitives.
	'numbers-20000': () => ({ id: 1, rows: Array.from({ length: 20000 }, (_, i) => i) }),
	'strings-2000': () => ({
		id: 1,
		rows: Array.from({ length: 2000 }, (_, i) => 'string value ' + i),
	}),
	'big-strings-20x40KB': () => ({
		id: 7,
		rows: Array.from({ length: 20 }, (_, i) => String(i % 10).repeat(40000)),
	}),
	// Nesting.
	'tree-27KB': () => ({ id: 1, tree: tree(9), rows: [tree(2)] }),
	'chain-30': () => ({ id: 1, chain: chain(30), rows: [1] }),
	// Data that JSON cannot carry stays lazy.
	'rows-with-dates-200': () => ({
		id: 1,
		rows: Array.from({ length: 200 }, (_, i) => ({
			field_0: i,
			field_1: 'value ' + i,
			when: new Date(1700000000000 + i * 1000),
			gone: undefined,
		})),
	}),
	// Rows that do not all have the same fields.
	'mixed-rows-500': () => ({
		id: 1,
		rows: Array.from({ length: 500 }, (_, i) =>
			i % 3 === 0
				? { field_0: i, field_1: 'value ' + i, extra: { a: i } }
				: i % 3 === 1
					? { field_0: i, other: 'x' + i }
					: { field_1: 'only ' + i, list: [i, i + 1] },
		),
	}),
};
export const exprs = {
	// Single reads.
	'one-field': 'return this.$json.id;',
	'three-fields':
		'return [this.$json.id, this.$json.f1 || this.$json.name, this.$json.f2 || this.$json.rows && this.$json.rows.length];',
	'missing-field': 'return this.$json.nope === undefined;',
	'has-field': 'return "id" in this.$json;',
	'deep-field':
		'var j = this.$json; return j.rows ? j.rows[j.rows.length >> 1] && (j.rows[j.rows.length >> 1].field_1 || typeof j.rows[j.rows.length >> 1]) : j.f3;',
	'keys-count': 'return Object.keys(this.$json).length;',
	'rows-length': 'return this.$json.rows ? this.$json.rows.length : -1;',
	// Whole item.
	stringify: 'return JSON.stringify(this.$json, null, 2);',
	'return-item': 'return this.$json;',
	spread: 'var c = Object.assign({}, this.$json, { extra: 1 }); return Object.keys(c).length;',
	// Lists.
	'first-row': 'var r = this.$json.rows; return r ? r[0] : null;',
	'map-one-field':
		'var r = this.$json.rows || []; return r.map(function (x) { return x && x.field_1 !== undefined ? x.field_1 : typeof x; }).length;',
	'map-stringify-row':
		'var r = this.$json.rows || []; return r.map(function (x) { return JSON.stringify(x).length; }).length;',
	'filter-count':
		'var r = this.$json.rows || []; return r.filter(function (x) { return x && x.field_0 > 10; }).length;',
	'filter-return':
		'var r = this.$json.rows || []; return r.filter(function (x) { return x && x.field_0 % 10 === 0; });',
	'map-two-fields':
		'var r = this.$json.rows || []; return r.map(function (x) { return x && (x.field_0 + ":" + x.field_1); }).length;',
	'map-missing-field':
		'var r = this.$json.rows || []; return r.map(function (x) { return x && x.nope; }).length;',
	'map-pick':
		'var r = this.$json.rows || []; return r.map(function (x) { return x && { a: x.field_0, b: x.field_1 }; });',
	'for-loop-sum':
		'var r = this.$json.rows || []; var s = 0; for (var i = 0; i < r.length; i++) { s += (r[i] && r[i].field_0) || 0; } return s;',
	'reverse-read':
		'var r = this.$json.rows || []; var s = 0; for (var i = r.length - 1; i >= 0; i--) { s += (r[i] && r[i].field_0) || 0; } return s;',
	'mutate-push': 'var r = this.$json.rows || []; r.push(1); return r.length;',
	'set-field': 'this.$json.added = 1; return Object.keys(this.$json).length;',
	'entries-count': 'return Object.entries(this.$json).length;',
	'find-early':
		'var r = this.$json.rows || []; var f = r.find(function (x) { return x && (x.field_0 === 2 || x === 2 || typeof x === "string"); }); return typeof f;',
	'slice-5': 'var r = this.$json.rows || []; return r.slice(0, 5);',
	'last-row': 'var r = this.$json.rows || []; return r[r.length - 1];',
	join: 'var r = this.$json.rows || []; return r.join(",").length;',
	'sort-by-field':
		'var r = this.$json.rows || []; var s = r.slice().sort(function (a, b) { return (a && a.field_0) < (b && b.field_0) ? 1 : -1; }); return s.length && typeof s[0];',
	'spread-map':
		'var r = this.$json.rows || []; return [].concat(r).map(function (x) { return x && x.field_0; }).length;',
	'copy-stringify': 'var r = this.$json.rows || []; return JSON.stringify(r.slice()).length;',
};

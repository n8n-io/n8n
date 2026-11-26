/** Value transfer cases: results the guest builds, and host data the guest reads. */
const rows = (n, make) => ({ id: 1, rows: Array.from({ length: n }, (_, i) => make(i)) });
const shared = { d: 1, label: 'shared', list: [1, 2, 3] };
const sharedRow = { a: 1, b: 'value', c: { d: 1 } };
const selfMap = () => {
	const m = new Map();
	m.set('self', m);
	m.set('a', 1);
	return m;
};
const selfSet = () => {
	const s = new Set();
	s.add(s);
	s.add(1);
	return s;
};
const items = (n, make) => ({
	__data: {
		$json: { id: 1 },
		$items: () => Array.from({ length: n }, (_, i) => ({ json: make(i) })),
	},
});
export const shapes = {
	none: () => ({ id: 1 }),
	// Host data read by the guest.
	'plain-rows-2000': () => rows(2000, (i) => ({ a: i, b: 'value ' + i, c: { d: i } })),
	'shared-child-rows-2000': () => rows(2000, (i) => ({ a: i, b: 'value ' + i, c: shared })),
	'same-row-2000': () => rows(2000, () => sharedRow),
	'date-rows-2000': () => rows(2000, (i) => ({ a: i, when: new Date(1700000000000 + i * 1000) })),
	'map-rows-500': () =>
		rows(500, (i) => ({
			a: i,
			m: new Map([
				['k', { v: i }],
				['n', i],
			]),
		})),
	'set-rows-500': () => rows(500, (i) => ({ a: i, s: new Set([i, 'x' + i, { v: i }]) })),
	'big-map-5000': () => ({
		id: 1,
		rows: [new Map(Array.from({ length: 5000 }, (_, i) => ['k' + i, { v: i, t: 'x' + i }]))],
	}),
	'shared-map-5000': () => ({
		id: 1,
		rows: [new Map(Array.from({ length: 5000 }, (_, i) => ['k' + i, shared]))],
	}),
	'cyclic-map': () => ({ id: 1, rows: [selfMap()] }),
	'cyclic-set': () => ({ id: 1, rows: [selfSet()] }),
	// Host function results.
	'host-items-2000': () => items(2000, (i) => ({ a: i, b: 'value ' + i, c: { d: i } })),
	'host-items-shared-2000': () => items(2000, (i) => ({ a: i, b: 'value ' + i, c: shared })),
	'host-items-dates-2000': () =>
		items(2000, (i) => ({ a: i, when: new Date(1700000000000 + i * 1000) })),
	'host-items-maps-500': () =>
		items(500, (i) => ({
			a: i,
			m: new Map([
				['k', { v: i }],
				['n', i],
			]),
		})),
	'host-items-shared-map-500': () =>
		items(500, (i) => ({
			a: i,
			m: new Map([
				['k', shared],
				['n', shared],
			]),
		})),
	'host-items-cyclic-map': () => items(1, () => ({ a: 1, m: selfMap() })),
};
const dataExprs = {
	'read-each-row':
		'var r = this.$json.rows; var s = 0; for (var i = 0; i < r.length; i++) { var x = r[i]; s += (x && (x.a || x.size)) ? 1 : 0; } return s;',
	'read-each-field':
		'var r = this.$json.rows; var s = 0; for (var i = 0; i < r.length; i++) { var x = r[i]; for (var k in x) { s += typeof x[k] === "object" ? 2 : 1; } } return s;',
	'return-rows': 'return this.$json.rows;',
	'map-copy-return':
		'return this.$json.rows.map(function (x) { return x instanceof Map || x instanceof Set ? x : Object.assign({}, x); });',
	'first-row': 'return this.$json.rows[0];',
};
const guestExprs = {
	'guest-scalar': 'return 1 + 1;',
	'guest-string': 'return "a" + this.$json.id;',
	'guest-small-object': 'return { a: 1, b: [1, 2, 3], c: { d: "x" } };',
	'guest-plain-5000':
		'return Array.from({ length: 5000 }, function (_, i) { return { a: i, b: "x" + i, c: { d: i } }; });',
	'guest-arrays-5000':
		'return Array.from({ length: 5000 }, function (_, i) { return [i, "x" + i, [i]]; });',
	'guest-numbers-50000': 'return Array.from({ length: 50000 }, function (_, i) { return i; });',
	'guest-sparse-5000':
		'var a = new Array(5000); a[0] = 1; a[2500] = { x: 1 }; a[4999] = 2; return a;',
	'guest-end-holes-5000': 'var a = new Array(5000); a[0] = 1; a[2500] = { x: 1 }; return a;',
	'guest-deep-200':
		'var o = { v: 1 }; for (var i = 0; i < 200; i++) { o = { next: o, i: i }; } return o;',
	'guest-wide-object-5000':
		'var o = {}; for (var i = 0; i < 5000; i++) { o["k" + i] = { v: i }; } return o;',
	'guest-shared-plain-5000':
		'var s = { a: 1, b: "x", c: { d: 1 } }; return Array.from({ length: 5000 }, function () { return s; });',
	'guest-dates-5000':
		'return Array.from({ length: 5000 }, function (_, i) { return { a: i, d: new Date(i * 1000) }; });',
	'guest-shared-date-5000':
		'var d = new Date(0); return Array.from({ length: 5000 }, function () { return d; });',
	'guest-instances-5000':
		'function C(i) { this.a = i; this.b = "x" + i; } return Array.from({ length: 5000 }, function (_, i) { return new C(i); });',
	'guest-boxed-5000':
		'return Array.from({ length: 5000 }, function (_, i) { return { s: new String("x" + i), n: new Number(i) }; });',
	'guest-maps-1000':
		'return Array.from({ length: 1000 }, function (_, i) { return new Map([["a", i], ["b", { v: i }]]); });',
	'guest-sets-1000':
		'return Array.from({ length: 1000 }, function (_, i) { return new Set([i, "x" + i, { v: i }]); });',
	'guest-big-map-5000':
		'var m = new Map(); for (var i = 0; i < 5000; i++) { m.set("k" + i, { v: i, t: "x" + i, l: [i] }); } return m;',
	'guest-big-set-5000':
		'var s = new Set(); for (var i = 0; i < 5000; i++) { s.add({ v: i, t: "x" + i }); } return s;',
	'guest-map-shared-5000':
		'var o = { a: 1, b: "x", c: { d: 1 } }; var m = new Map(); for (var i = 0; i < 5000; i++) { m.set("k" + i, o); } return m;',
	'guest-map-in-map-50x50':
		'var m = new Map(); for (var i = 0; i < 50; i++) { var n = new Map(); for (var j = 0; j < 50; j++) { n.set(j, { v: j }); } m.set(i, n); } return m;',
	'guest-error-one': 'return new Error("boom");',
	'guest-errors-500':
		'return Array.from({ length: 500 }, function (_, i) { var e = new Error("boom " + i); e.code = i; e.info = { a: i, list: [1, 2] }; return e; });',
	'guest-error-big-props':
		'var e = new Error("boom"); e.rows = Array.from({ length: 2000 }, function (_, i) { return { a: i, b: "x" + i }; }); return e;',
	'guest-map-of-errors-500':
		'var m = new Map(); for (var i = 0; i < 500; i++) { var e = new Error("boom " + i); e.code = i; m.set(i, e); } return m;',
	// Depth cases for the guarded traversal that starts after 32 nested containers.
	'guest-deep-31':
		'var o = { v: 1 }; for (var i = 0; i < 30; i++) { o = { next: o, i: i }; } return o;',
	'guest-deep-33':
		'var o = { v: 1 }; for (var i = 0; i < 33; i++) { o = { next: o, i: i }; } return o;',
	'guest-deep-40-x2000':
		'return Array.from({ length: 2000 }, function (_, k) { var o = { v: k }; for (var i = 0; i < 40; i++) { o = { next: o }; } return o; });',
	'guest-deep-28-x2000':
		'return Array.from({ length: 2000 }, function (_, k) { var o = { v: k }; for (var i = 0; i < 28; i++) { o = { next: o }; } return o; });',
	'guest-deep-40-then-numbers-50000':
		'var o = Array.from({ length: 50000 }, function (_, i) { return i; }); for (var i = 0; i < 40; i++) { o = { next: o }; } return o;',
	'guest-deep-40-then-plain-5000':
		'var o = Array.from({ length: 5000 }, function (_, i) { return { a: i, b: "x" + i, c: { d: i } }; }); for (var i = 0; i < 40; i++) { o = { next: o }; } return o;',
	'guest-deep-40-then-error':
		'var e = new Error("boom"); e.info = { a: 1, self: e }; var o = { e: e, again: e }; for (var i = 0; i < 40; i++) { o = { next: o }; } return o;',
	'guest-cyclic-array': 'var a = [1]; a.push(a); return a;',
	'guest-cyclic-deep-plain':
		'var o = { a: 1 }; var top = o; for (var i = 0; i < 40; i++) { top = { next: top }; } o.back = top; return top;',
	// Values that refer to themselves.
	'guest-cyclic-map': 'var m = new Map(); m.set("self", m); m.set("a", 1); return m;',
	'guest-cyclic-set': 'var s = new Set(); s.add(s); s.add(1); return s;',
	'guest-cyclic-error': 'var e = new Error("boom"); e.self = e; return e;',
	'guest-cyclic-map-error':
		'var e = new Error("boom"); var m = new Map(); m.set("e", e); e.m = m; return m;',
	'guest-cyclic-plain': 'var o = { a: 1 }; o.self = o; return o;',
};
const hostExprs = {
	'items-length': 'return this.$items().length;',
	'items-read-all':
		'var r = this.$items(); var s = 0; for (var i = 0; i < r.length; i++) { s += r[i].json.a; } return s;',
	'items-return': 'return this.$items();',
};
export const exprs = { ...dataExprs, ...guestExprs, ...hostExprs };
export const valid = (shape, expr) =>
	shape === 'none'
		? expr in guestExprs
		: shape.startsWith('host-items')
			? expr in hostExprs
			: expr in dataExprs;

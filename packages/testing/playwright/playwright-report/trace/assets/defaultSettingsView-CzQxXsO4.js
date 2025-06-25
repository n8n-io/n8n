const __vite__mapDeps = (
	i,
	m = __vite__mapDeps,
	d = m.f || (m.f = ['./codeMirrorModule-BKr-mZ2D.js', '../codeMirrorModule.C3UTv-Ge.css']),
) => i.map((i) => d[i]);
var p0 = Object.defineProperty;
var m0 = (t, e, n) =>
	e in t ? p0(t, e, { enumerable: !0, configurable: !0, writable: !0, value: n }) : (t[e] = n);
var Ee = (t, e, n) => m0(t, typeof e != 'symbol' ? e + '' : e, n);
(function () {
	const e = document.createElement('link').relList;
	if (e && e.supports && e.supports('modulepreload')) return;
	for (const o of document.querySelectorAll('link[rel="modulepreload"]')) s(o);
	new MutationObserver((o) => {
		for (const l of o)
			if (l.type === 'childList')
				for (const c of l.addedNodes) c.tagName === 'LINK' && c.rel === 'modulepreload' && s(c);
	}).observe(document, { childList: !0, subtree: !0 });
	function n(o) {
		const l = {};
		return (
			o.integrity && (l.integrity = o.integrity),
			o.referrerPolicy && (l.referrerPolicy = o.referrerPolicy),
			o.crossOrigin === 'use-credentials'
				? (l.credentials = 'include')
				: o.crossOrigin === 'anonymous'
					? (l.credentials = 'omit')
					: (l.credentials = 'same-origin'),
			l
		);
	}
	function s(o) {
		if (o.ep) return;
		o.ep = !0;
		const l = n(o);
		fetch(o.href, l);
	}
})();
function g0(t) {
	return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, 'default') ? t.default : t;
}
var tu = { exports: {} },
	_i = {},
	nu = { exports: {} },
	me = {}; /**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var kp;
function y0() {
	if (kp) return me;
	kp = 1;
	var t = Symbol.for('react.element'),
		e = Symbol.for('react.portal'),
		n = Symbol.for('react.fragment'),
		s = Symbol.for('react.strict_mode'),
		o = Symbol.for('react.profiler'),
		l = Symbol.for('react.provider'),
		c = Symbol.for('react.context'),
		u = Symbol.for('react.forward_ref'),
		d = Symbol.for('react.suspense'),
		p = Symbol.for('react.memo'),
		g = Symbol.for('react.lazy'),
		y = Symbol.iterator;
	function v(I) {
		return I === null || typeof I != 'object'
			? null
			: ((I = (y && I[y]) || I['@@iterator']), typeof I == 'function' ? I : null);
	}
	var S = {
			isMounted: function () {
				return !1;
			},
			enqueueForceUpdate: function () {},
			enqueueReplaceState: function () {},
			enqueueSetState: function () {},
		},
		k = Object.assign,
		_ = {};
	function E(I, H, de) {
		(this.props = I), (this.context = H), (this.refs = _), (this.updater = de || S);
	}
	(E.prototype.isReactComponent = {}),
		(E.prototype.setState = function (I, H) {
			if (typeof I != 'object' && typeof I != 'function' && I != null)
				throw Error(
					'setState(...): takes an object of state variables to update or a function which returns an object of state variables.',
				);
			this.updater.enqueueSetState(this, I, H, 'setState');
		}),
		(E.prototype.forceUpdate = function (I) {
			this.updater.enqueueForceUpdate(this, I, 'forceUpdate');
		});
	function C() {}
	C.prototype = E.prototype;
	function A(I, H, de) {
		(this.props = I), (this.context = H), (this.refs = _), (this.updater = de || S);
	}
	var O = (A.prototype = new C());
	(O.constructor = A), k(O, E.prototype), (O.isPureReactComponent = !0);
	var D = Array.isArray,
		F = Object.prototype.hasOwnProperty,
		z = { current: null },
		q = { key: !0, ref: !0, __self: !0, __source: !0 };
	function B(I, H, de) {
		var fe,
			pe = {},
			ye = null,
			Se = null;
		if (H != null)
			for (fe in (H.ref !== void 0 && (Se = H.ref), H.key !== void 0 && (ye = '' + H.key), H))
				F.call(H, fe) && !q.hasOwnProperty(fe) && (pe[fe] = H[fe]);
		var he = arguments.length - 2;
		if (he === 1) pe.children = de;
		else if (1 < he) {
			for (var _e = Array(he), ct = 0; ct < he; ct++) _e[ct] = arguments[ct + 2];
			pe.children = _e;
		}
		if (I && I.defaultProps)
			for (fe in ((he = I.defaultProps), he)) pe[fe] === void 0 && (pe[fe] = he[fe]);
		return { $$typeof: t, type: I, key: ye, ref: Se, props: pe, _owner: z.current };
	}
	function M(I, H) {
		return { $$typeof: t, type: I.type, key: H, ref: I.ref, props: I.props, _owner: I._owner };
	}
	function G(I) {
		return typeof I == 'object' && I !== null && I.$$typeof === t;
	}
	function K(I) {
		var H = { '=': '=0', ':': '=2' };
		return (
			'$' +
			I.replace(/[=:]/g, function (de) {
				return H[de];
			})
		);
	}
	var $ = /\/+/g;
	function X(I, H) {
		return typeof I == 'object' && I !== null && I.key != null ? K('' + I.key) : H.toString(36);
	}
	function ce(I, H, de, fe, pe) {
		var ye = typeof I;
		(ye === 'undefined' || ye === 'boolean') && (I = null);
		var Se = !1;
		if (I === null) Se = !0;
		else
			switch (ye) {
				case 'string':
				case 'number':
					Se = !0;
					break;
				case 'object':
					switch (I.$$typeof) {
						case t:
						case e:
							Se = !0;
					}
			}
		if (Se)
			return (
				(Se = I),
				(pe = pe(Se)),
				(I = fe === '' ? '.' + X(Se, 0) : fe),
				D(pe)
					? ((de = ''),
						I != null && (de = I.replace($, '$&/') + '/'),
						ce(pe, H, de, '', function (ct) {
							return ct;
						}))
					: pe != null &&
						(G(pe) &&
							(pe = M(
								pe,
								de +
									(!pe.key || (Se && Se.key === pe.key)
										? ''
										: ('' + pe.key).replace($, '$&/') + '/') +
									I,
							)),
						H.push(pe)),
				1
			);
		if (((Se = 0), (fe = fe === '' ? '.' : fe + ':'), D(I)))
			for (var he = 0; he < I.length; he++) {
				ye = I[he];
				var _e = fe + X(ye, he);
				Se += ce(ye, H, de, _e, pe);
			}
		else if (((_e = v(I)), typeof _e == 'function'))
			for (I = _e.call(I), he = 0; !(ye = I.next()).done; )
				(ye = ye.value), (_e = fe + X(ye, he++)), (Se += ce(ye, H, de, _e, pe));
		else if (ye === 'object')
			throw (
				((H = String(I)),
				Error(
					'Objects are not valid as a React child (found: ' +
						(H === '[object Object]' ? 'object with keys {' + Object.keys(I).join(', ') + '}' : H) +
						'). If you meant to render a collection of children, use an array instead.',
				))
			);
		return Se;
	}
	function Ae(I, H, de) {
		if (I == null) return I;
		var fe = [],
			pe = 0;
		return (
			ce(I, fe, '', '', function (ye) {
				return H.call(de, ye, pe++);
			}),
			fe
		);
	}
	function be(I) {
		if (I._status === -1) {
			var H = I._result;
			(H = H()),
				H.then(
					function (de) {
						(I._status === 0 || I._status === -1) && ((I._status = 1), (I._result = de));
					},
					function (de) {
						(I._status === 0 || I._status === -1) && ((I._status = 2), (I._result = de));
					},
				),
				I._status === -1 && ((I._status = 0), (I._result = H));
		}
		if (I._status === 1) return I._result.default;
		throw I._result;
	}
	var ge = { current: null },
		J = { transition: null },
		se = { ReactCurrentDispatcher: ge, ReactCurrentBatchConfig: J, ReactCurrentOwner: z };
	function Z() {
		throw Error('act(...) is not supported in production builds of React.');
	}
	return (
		(me.Children = {
			map: Ae,
			forEach: function (I, H, de) {
				Ae(
					I,
					function () {
						H.apply(this, arguments);
					},
					de,
				);
			},
			count: function (I) {
				var H = 0;
				return (
					Ae(I, function () {
						H++;
					}),
					H
				);
			},
			toArray: function (I) {
				return (
					Ae(I, function (H) {
						return H;
					}) || []
				);
			},
			only: function (I) {
				if (!G(I))
					throw Error('React.Children.only expected to receive a single React element child.');
				return I;
			},
		}),
		(me.Component = E),
		(me.Fragment = n),
		(me.Profiler = o),
		(me.PureComponent = A),
		(me.StrictMode = s),
		(me.Suspense = d),
		(me.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = se),
		(me.act = Z),
		(me.cloneElement = function (I, H, de) {
			if (I == null)
				throw Error(
					'React.cloneElement(...): The argument must be a React element, but you passed ' +
						I +
						'.',
				);
			var fe = k({}, I.props),
				pe = I.key,
				ye = I.ref,
				Se = I._owner;
			if (H != null) {
				if (
					(H.ref !== void 0 && ((ye = H.ref), (Se = z.current)),
					H.key !== void 0 && (pe = '' + H.key),
					I.type && I.type.defaultProps)
				)
					var he = I.type.defaultProps;
				for (_e in H)
					F.call(H, _e) &&
						!q.hasOwnProperty(_e) &&
						(fe[_e] = H[_e] === void 0 && he !== void 0 ? he[_e] : H[_e]);
			}
			var _e = arguments.length - 2;
			if (_e === 1) fe.children = de;
			else if (1 < _e) {
				he = Array(_e);
				for (var ct = 0; ct < _e; ct++) he[ct] = arguments[ct + 2];
				fe.children = he;
			}
			return { $$typeof: t, type: I.type, key: pe, ref: ye, props: fe, _owner: Se };
		}),
		(me.createContext = function (I) {
			return (
				(I = {
					$$typeof: c,
					_currentValue: I,
					_currentValue2: I,
					_threadCount: 0,
					Provider: null,
					Consumer: null,
					_defaultValue: null,
					_globalName: null,
				}),
				(I.Provider = { $$typeof: l, _context: I }),
				(I.Consumer = I)
			);
		}),
		(me.createElement = B),
		(me.createFactory = function (I) {
			var H = B.bind(null, I);
			return (H.type = I), H;
		}),
		(me.createRef = function () {
			return { current: null };
		}),
		(me.forwardRef = function (I) {
			return { $$typeof: u, render: I };
		}),
		(me.isValidElement = G),
		(me.lazy = function (I) {
			return { $$typeof: g, _payload: { _status: -1, _result: I }, _init: be };
		}),
		(me.memo = function (I, H) {
			return { $$typeof: p, type: I, compare: H === void 0 ? null : H };
		}),
		(me.startTransition = function (I) {
			var H = J.transition;
			J.transition = {};
			try {
				I();
			} finally {
				J.transition = H;
			}
		}),
		(me.unstable_act = Z),
		(me.useCallback = function (I, H) {
			return ge.current.useCallback(I, H);
		}),
		(me.useContext = function (I) {
			return ge.current.useContext(I);
		}),
		(me.useDebugValue = function () {}),
		(me.useDeferredValue = function (I) {
			return ge.current.useDeferredValue(I);
		}),
		(me.useEffect = function (I, H) {
			return ge.current.useEffect(I, H);
		}),
		(me.useId = function () {
			return ge.current.useId();
		}),
		(me.useImperativeHandle = function (I, H, de) {
			return ge.current.useImperativeHandle(I, H, de);
		}),
		(me.useInsertionEffect = function (I, H) {
			return ge.current.useInsertionEffect(I, H);
		}),
		(me.useLayoutEffect = function (I, H) {
			return ge.current.useLayoutEffect(I, H);
		}),
		(me.useMemo = function (I, H) {
			return ge.current.useMemo(I, H);
		}),
		(me.useReducer = function (I, H, de) {
			return ge.current.useReducer(I, H, de);
		}),
		(me.useRef = function (I) {
			return ge.current.useRef(I);
		}),
		(me.useState = function (I) {
			return ge.current.useState(I);
		}),
		(me.useSyncExternalStore = function (I, H, de) {
			return ge.current.useSyncExternalStore(I, H, de);
		}),
		(me.useTransition = function () {
			return ge.current.useTransition();
		}),
		(me.version = '18.3.1'),
		me
	);
}
var bp;
function Vu() {
	return bp || ((bp = 1), (nu.exports = y0())), nu.exports;
} /**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Tp;
function v0() {
	if (Tp) return _i;
	Tp = 1;
	var t = Vu(),
		e = Symbol.for('react.element'),
		n = Symbol.for('react.fragment'),
		s = Object.prototype.hasOwnProperty,
		o = t.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,
		l = { key: !0, ref: !0, __self: !0, __source: !0 };
	function c(u, d, p) {
		var g,
			y = {},
			v = null,
			S = null;
		p !== void 0 && (v = '' + p),
			d.key !== void 0 && (v = '' + d.key),
			d.ref !== void 0 && (S = d.ref);
		for (g in d) s.call(d, g) && !l.hasOwnProperty(g) && (y[g] = d[g]);
		if (u && u.defaultProps) for (g in ((d = u.defaultProps), d)) y[g] === void 0 && (y[g] = d[g]);
		return { $$typeof: e, type: u, key: v, ref: S, props: y, _owner: o.current };
	}
	return (_i.Fragment = n), (_i.jsx = c), (_i.jsxs = c), _i;
}
var Cp;
function w0() {
	return Cp || ((Cp = 1), (tu.exports = v0())), tu.exports;
}
var w = w0(),
	R = Vu();
const Mt = g0(R);
function Ml(t, e, n, s) {
	const [o, l] = Mt.useState(n);
	return (
		Mt.useEffect(() => {
			let c = !1;
			return (
				t().then((u) => {
					c || l(u);
				}),
				() => {
					c = !0;
				}
			);
		}, e),
		o
	);
}
function Nr() {
	const t = Mt.useRef(null),
		[e, n] = Mt.useState(new DOMRect(0, 0, 10, 10));
	return (
		Mt.useLayoutEffect(() => {
			const s = t.current;
			if (!s) return;
			const o = s.getBoundingClientRect();
			n(new DOMRect(0, 0, o.width, o.height));
			const l = new ResizeObserver((c) => {
				const u = c[c.length - 1];
				u && u.contentRect && n(u.contentRect);
			});
			return l.observe(s), () => l.disconnect();
		}, [t]),
		[e, t]
	);
}
function pt(t) {
	if (t < 0 || !isFinite(t)) return '-';
	if (t === 0) return '0';
	if (t < 1e3) return t.toFixed(0) + 'ms';
	const e = t / 1e3;
	if (e < 60) return e.toFixed(1) + 's';
	const n = e / 60;
	if (n < 60) return n.toFixed(1) + 'm';
	const s = n / 60;
	return s < 24 ? s.toFixed(1) + 'h' : (s / 24).toFixed(1) + 'd';
}
function S0(t) {
	if (t < 0 || !isFinite(t)) return '-';
	if (t === 0) return '0';
	if (t < 1e3) return t.toFixed(0);
	const e = t / 1024;
	if (e < 1e3) return e.toFixed(1) + 'K';
	const n = e / 1024;
	return n < 1e3 ? n.toFixed(1) + 'M' : (n / 1024).toFixed(1) + 'G';
}
function Om(t, e, n, s, o) {
	let l = 0,
		c = t.length;
	for (; l < c; ) {
		const u = (l + c) >> 1;
		n(e, t[u]) >= 0 ? (l = u + 1) : (c = u);
	}
	return c;
}
function Np(t) {
	const e = document.createElement('textarea');
	(e.style.position = 'absolute'),
		(e.style.zIndex = '-1000'),
		(e.value = t),
		document.body.appendChild(e),
		e.select(),
		document.execCommand('copy'),
		e.remove();
}
function Es(t, e) {
	t && (e = Sr.getObject(t, e));
	const [n, s] = Mt.useState(e),
		o = Mt.useCallback(
			(l) => {
				t ? Sr.setObject(t, l) : s(l);
			},
			[t, s],
		);
	return (
		Mt.useEffect(() => {
			if (t) {
				const l = () => s(Sr.getObject(t, e));
				return (
					Sr.onChangeEmitter.addEventListener(t, l),
					() => Sr.onChangeEmitter.removeEventListener(t, l)
				);
			}
		}, [e, t]),
		[n, o]
	);
}
class x0 {
	constructor() {
		this.onChangeEmitter = new EventTarget();
	}
	getString(e, n) {
		return localStorage[e] || n;
	}
	setString(e, n) {
		var s;
		(localStorage[e] = n),
			this.onChangeEmitter.dispatchEvent(new Event(e)),
			(s = window.saveSettings) == null || s.call(window);
	}
	getObject(e, n) {
		if (!localStorage[e]) return n;
		try {
			return JSON.parse(localStorage[e]);
		} catch {
			return n;
		}
	}
	setObject(e, n) {
		var s;
		(localStorage[e] = JSON.stringify(n)),
			this.onChangeEmitter.dispatchEvent(new Event(e)),
			(s = window.saveSettings) == null || s.call(window);
	}
}
const Sr = new x0();
function ze(...t) {
	return t.filter(Boolean).join(' ');
}
function $m(t) {
	t &&
		(t != null && t.scrollIntoViewIfNeeded
			? t.scrollIntoViewIfNeeded(!1)
			: t == null || t.scrollIntoView());
}
const Ap = '\\u0000-\\u0020\\u007f-\\u009f',
	Rm = new RegExp(
		'(?:[a-zA-Z][a-zA-Z0-9+.-]{2,}:\\/\\/|www\\.)[^\\s' +
			Ap +
			'"]{2,}[^\\s' +
			Ap +
			`"')}\\],:;.!?]`,
		'ug',
	);
function _0() {
	const [t, e] = Mt.useState(!1),
		n = Mt.useCallback(() => {
			const s = [];
			return (
				e(
					(o) => (
						s.push(setTimeout(() => e(!1), 1e3)), o ? (s.push(setTimeout(() => e(!0), 50)), !1) : !0
					),
				),
				() => s.forEach(clearTimeout)
			);
		}, [e]);
	return [t, n];
}
function Tk() {
	if (document.playwrightThemeInitialized) return;
	(document.playwrightThemeInitialized = !0),
		document.defaultView.addEventListener(
			'focus',
			(s) => {
				s.target.document.nodeType === Node.DOCUMENT_NODE &&
					document.body.classList.remove('inactive');
			},
			!1,
		),
		document.defaultView.addEventListener(
			'blur',
			(s) => {
				document.body.classList.add('inactive');
			},
			!1,
		);
	const e = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark-mode' : 'light-mode';
	Sr.getString('theme', e) === 'dark-mode' && document.body.classList.add('dark-mode');
}
const Wu = new Set();
function E0() {
	const t = Nu(),
		e = t === 'dark-mode' ? 'light-mode' : 'dark-mode';
	t && document.body.classList.remove(t), document.body.classList.add(e), Sr.setString('theme', e);
	for (const n of Wu) n(e);
}
function Ck(t) {
	Wu.add(t);
}
function Nk(t) {
	Wu.delete(t);
}
function Nu() {
	return document.body.classList.contains('dark-mode') ? 'dark-mode' : 'light-mode';
}
function k0() {
	const [t, e] = Mt.useState(Nu() === 'dark-mode');
	return [
		t,
		(n) => {
			(Nu() === 'dark-mode') !== n && E0(), e(n);
		},
	];
}
var al = {},
	ru = { exports: {} },
	xt = {},
	su = { exports: {} },
	iu = {}; /**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Ip;
function b0() {
	return (
		Ip ||
			((Ip = 1),
			(function (t) {
				function e(J, se) {
					var Z = J.length;
					J.push(se);
					e: for (; 0 < Z; ) {
						var I = (Z - 1) >>> 1,
							H = J[I];
						if (0 < o(H, se)) (J[I] = se), (J[Z] = H), (Z = I);
						else break e;
					}
				}
				function n(J) {
					return J.length === 0 ? null : J[0];
				}
				function s(J) {
					if (J.length === 0) return null;
					var se = J[0],
						Z = J.pop();
					if (Z !== se) {
						J[0] = Z;
						e: for (var I = 0, H = J.length, de = H >>> 1; I < de; ) {
							var fe = 2 * (I + 1) - 1,
								pe = J[fe],
								ye = fe + 1,
								Se = J[ye];
							if (0 > o(pe, Z))
								ye < H && 0 > o(Se, pe)
									? ((J[I] = Se), (J[ye] = Z), (I = ye))
									: ((J[I] = pe), (J[fe] = Z), (I = fe));
							else if (ye < H && 0 > o(Se, Z)) (J[I] = Se), (J[ye] = Z), (I = ye);
							else break e;
						}
					}
					return se;
				}
				function o(J, se) {
					var Z = J.sortIndex - se.sortIndex;
					return Z !== 0 ? Z : J.id - se.id;
				}
				if (typeof performance == 'object' && typeof performance.now == 'function') {
					var l = performance;
					t.unstable_now = function () {
						return l.now();
					};
				} else {
					var c = Date,
						u = c.now();
					t.unstable_now = function () {
						return c.now() - u;
					};
				}
				var d = [],
					p = [],
					g = 1,
					y = null,
					v = 3,
					S = !1,
					k = !1,
					_ = !1,
					E = typeof setTimeout == 'function' ? setTimeout : null,
					C = typeof clearTimeout == 'function' ? clearTimeout : null,
					A = typeof setImmediate < 'u' ? setImmediate : null;
				typeof navigator < 'u' &&
					navigator.scheduling !== void 0 &&
					navigator.scheduling.isInputPending !== void 0 &&
					navigator.scheduling.isInputPending.bind(navigator.scheduling);
				function O(J) {
					for (var se = n(p); se !== null; ) {
						if (se.callback === null) s(p);
						else if (se.startTime <= J) s(p), (se.sortIndex = se.expirationTime), e(d, se);
						else break;
						se = n(p);
					}
				}
				function D(J) {
					if (((_ = !1), O(J), !k))
						if (n(d) !== null) (k = !0), be(F);
						else {
							var se = n(p);
							se !== null && ge(D, se.startTime - J);
						}
				}
				function F(J, se) {
					(k = !1), _ && ((_ = !1), C(B), (B = -1)), (S = !0);
					var Z = v;
					try {
						for (O(se), y = n(d); y !== null && (!(y.expirationTime > se) || (J && !K())); ) {
							var I = y.callback;
							if (typeof I == 'function') {
								(y.callback = null), (v = y.priorityLevel);
								var H = I(y.expirationTime <= se);
								(se = t.unstable_now()),
									typeof H == 'function' ? (y.callback = H) : y === n(d) && s(d),
									O(se);
							} else s(d);
							y = n(d);
						}
						if (y !== null) var de = !0;
						else {
							var fe = n(p);
							fe !== null && ge(D, fe.startTime - se), (de = !1);
						}
						return de;
					} finally {
						(y = null), (v = Z), (S = !1);
					}
				}
				var z = !1,
					q = null,
					B = -1,
					M = 5,
					G = -1;
				function K() {
					return !(t.unstable_now() - G < M);
				}
				function $() {
					if (q !== null) {
						var J = t.unstable_now();
						G = J;
						var se = !0;
						try {
							se = q(!0, J);
						} finally {
							se ? X() : ((z = !1), (q = null));
						}
					} else z = !1;
				}
				var X;
				if (typeof A == 'function')
					X = function () {
						A($);
					};
				else if (typeof MessageChannel < 'u') {
					var ce = new MessageChannel(),
						Ae = ce.port2;
					(ce.port1.onmessage = $),
						(X = function () {
							Ae.postMessage(null);
						});
				} else
					X = function () {
						E($, 0);
					};
				function be(J) {
					(q = J), z || ((z = !0), X());
				}
				function ge(J, se) {
					B = E(function () {
						J(t.unstable_now());
					}, se);
				}
				(t.unstable_IdlePriority = 5),
					(t.unstable_ImmediatePriority = 1),
					(t.unstable_LowPriority = 4),
					(t.unstable_NormalPriority = 3),
					(t.unstable_Profiling = null),
					(t.unstable_UserBlockingPriority = 2),
					(t.unstable_cancelCallback = function (J) {
						J.callback = null;
					}),
					(t.unstable_continueExecution = function () {
						k || S || ((k = !0), be(F));
					}),
					(t.unstable_forceFrameRate = function (J) {
						0 > J || 125 < J
							? console.error(
									'forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported',
								)
							: (M = 0 < J ? Math.floor(1e3 / J) : 5);
					}),
					(t.unstable_getCurrentPriorityLevel = function () {
						return v;
					}),
					(t.unstable_getFirstCallbackNode = function () {
						return n(d);
					}),
					(t.unstable_next = function (J) {
						switch (v) {
							case 1:
							case 2:
							case 3:
								var se = 3;
								break;
							default:
								se = v;
						}
						var Z = v;
						v = se;
						try {
							return J();
						} finally {
							v = Z;
						}
					}),
					(t.unstable_pauseExecution = function () {}),
					(t.unstable_requestPaint = function () {}),
					(t.unstable_runWithPriority = function (J, se) {
						switch (J) {
							case 1:
							case 2:
							case 3:
							case 4:
							case 5:
								break;
							default:
								J = 3;
						}
						var Z = v;
						v = J;
						try {
							return se();
						} finally {
							v = Z;
						}
					}),
					(t.unstable_scheduleCallback = function (J, se, Z) {
						var I = t.unstable_now();
						switch (
							(typeof Z == 'object' && Z !== null
								? ((Z = Z.delay), (Z = typeof Z == 'number' && 0 < Z ? I + Z : I))
								: (Z = I),
							J)
						) {
							case 1:
								var H = -1;
								break;
							case 2:
								H = 250;
								break;
							case 5:
								H = 1073741823;
								break;
							case 4:
								H = 1e4;
								break;
							default:
								H = 5e3;
						}
						return (
							(H = Z + H),
							(J = {
								id: g++,
								callback: se,
								priorityLevel: J,
								startTime: Z,
								expirationTime: H,
								sortIndex: -1,
							}),
							Z > I
								? ((J.sortIndex = Z),
									e(p, J),
									n(d) === null && J === n(p) && (_ ? (C(B), (B = -1)) : (_ = !0), ge(D, Z - I)))
								: ((J.sortIndex = H), e(d, J), k || S || ((k = !0), be(F))),
							J
						);
					}),
					(t.unstable_shouldYield = K),
					(t.unstable_wrapCallback = function (J) {
						var se = v;
						return function () {
							var Z = v;
							v = se;
							try {
								return J.apply(this, arguments);
							} finally {
								v = Z;
							}
						};
					});
			})(iu)),
		iu
	);
}
var Lp;
function T0() {
	return Lp || ((Lp = 1), (su.exports = b0())), su.exports;
} /**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Mp;
function C0() {
	if (Mp) return xt;
	Mp = 1;
	var t = Vu(),
		e = T0();
	function n(r) {
		for (
			var i = 'https://reactjs.org/docs/error-decoder.html?invariant=' + r, a = 1;
			a < arguments.length;
			a++
		)
			i += '&args[]=' + encodeURIComponent(arguments[a]);
		return (
			'Minified React error #' +
			r +
			'; visit ' +
			i +
			' for the full message or use the non-minified dev environment for full errors and additional helpful warnings.'
		);
	}
	var s = new Set(),
		o = {};
	function l(r, i) {
		c(r, i), c(r + 'Capture', i);
	}
	function c(r, i) {
		for (o[r] = i, r = 0; r < i.length; r++) s.add(i[r]);
	}
	var u = !(
			typeof window > 'u' ||
			typeof window.document > 'u' ||
			typeof window.document.createElement > 'u'
		),
		d = Object.prototype.hasOwnProperty,
		p =
			/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,
		g = {},
		y = {};
	function v(r) {
		return d.call(y, r) ? !0 : d.call(g, r) ? !1 : p.test(r) ? (y[r] = !0) : ((g[r] = !0), !1);
	}
	function S(r, i, a, f) {
		if (a !== null && a.type === 0) return !1;
		switch (typeof i) {
			case 'function':
			case 'symbol':
				return !0;
			case 'boolean':
				return f
					? !1
					: a !== null
						? !a.acceptsBooleans
						: ((r = r.toLowerCase().slice(0, 5)), r !== 'data-' && r !== 'aria-');
			default:
				return !1;
		}
	}
	function k(r, i, a, f) {
		if (i === null || typeof i > 'u' || S(r, i, a, f)) return !0;
		if (f) return !1;
		if (a !== null)
			switch (a.type) {
				case 3:
					return !i;
				case 4:
					return i === !1;
				case 5:
					return isNaN(i);
				case 6:
					return isNaN(i) || 1 > i;
			}
		return !1;
	}
	function _(r, i, a, f, h, m, x) {
		(this.acceptsBooleans = i === 2 || i === 3 || i === 4),
			(this.attributeName = f),
			(this.attributeNamespace = h),
			(this.mustUseProperty = a),
			(this.propertyName = r),
			(this.type = i),
			(this.sanitizeURL = m),
			(this.removeEmptyString = x);
	}
	var E = {};
	'children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style'
		.split(' ')
		.forEach(function (r) {
			E[r] = new _(r, 0, !1, r, null, !1, !1);
		}),
		[
			['acceptCharset', 'accept-charset'],
			['className', 'class'],
			['htmlFor', 'for'],
			['httpEquiv', 'http-equiv'],
		].forEach(function (r) {
			var i = r[0];
			E[i] = new _(i, 1, !1, r[1], null, !1, !1);
		}),
		['contentEditable', 'draggable', 'spellCheck', 'value'].forEach(function (r) {
			E[r] = new _(r, 2, !1, r.toLowerCase(), null, !1, !1);
		}),
		['autoReverse', 'externalResourcesRequired', 'focusable', 'preserveAlpha'].forEach(
			function (r) {
				E[r] = new _(r, 2, !1, r, null, !1, !1);
			},
		),
		'allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope'
			.split(' ')
			.forEach(function (r) {
				E[r] = new _(r, 3, !1, r.toLowerCase(), null, !1, !1);
			}),
		['checked', 'multiple', 'muted', 'selected'].forEach(function (r) {
			E[r] = new _(r, 3, !0, r, null, !1, !1);
		}),
		['capture', 'download'].forEach(function (r) {
			E[r] = new _(r, 4, !1, r, null, !1, !1);
		}),
		['cols', 'rows', 'size', 'span'].forEach(function (r) {
			E[r] = new _(r, 6, !1, r, null, !1, !1);
		}),
		['rowSpan', 'start'].forEach(function (r) {
			E[r] = new _(r, 5, !1, r.toLowerCase(), null, !1, !1);
		});
	var C = /[\-:]([a-z])/g;
	function A(r) {
		return r[1].toUpperCase();
	}
	'accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height'
		.split(' ')
		.forEach(function (r) {
			var i = r.replace(C, A);
			E[i] = new _(i, 1, !1, r, null, !1, !1);
		}),
		'xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type'
			.split(' ')
			.forEach(function (r) {
				var i = r.replace(C, A);
				E[i] = new _(i, 1, !1, r, 'http://www.w3.org/1999/xlink', !1, !1);
			}),
		['xml:base', 'xml:lang', 'xml:space'].forEach(function (r) {
			var i = r.replace(C, A);
			E[i] = new _(i, 1, !1, r, 'http://www.w3.org/XML/1998/namespace', !1, !1);
		}),
		['tabIndex', 'crossOrigin'].forEach(function (r) {
			E[r] = new _(r, 1, !1, r.toLowerCase(), null, !1, !1);
		}),
		(E.xlinkHref = new _('xlinkHref', 1, !1, 'xlink:href', 'http://www.w3.org/1999/xlink', !0, !1)),
		['src', 'href', 'action', 'formAction'].forEach(function (r) {
			E[r] = new _(r, 1, !1, r.toLowerCase(), null, !0, !0);
		});
	function O(r, i, a, f) {
		var h = E.hasOwnProperty(i) ? E[i] : null;
		(h !== null
			? h.type !== 0
			: f || !(2 < i.length) || (i[0] !== 'o' && i[0] !== 'O') || (i[1] !== 'n' && i[1] !== 'N')) &&
			(k(i, a, h, f) && (a = null),
			f || h === null
				? v(i) && (a === null ? r.removeAttribute(i) : r.setAttribute(i, '' + a))
				: h.mustUseProperty
					? (r[h.propertyName] = a === null ? (h.type === 3 ? !1 : '') : a)
					: ((i = h.attributeName),
						(f = h.attributeNamespace),
						a === null
							? r.removeAttribute(i)
							: ((h = h.type),
								(a = h === 3 || (h === 4 && a === !0) ? '' : '' + a),
								f ? r.setAttributeNS(f, i, a) : r.setAttribute(i, a))));
	}
	var D = t.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,
		F = Symbol.for('react.element'),
		z = Symbol.for('react.portal'),
		q = Symbol.for('react.fragment'),
		B = Symbol.for('react.strict_mode'),
		M = Symbol.for('react.profiler'),
		G = Symbol.for('react.provider'),
		K = Symbol.for('react.context'),
		$ = Symbol.for('react.forward_ref'),
		X = Symbol.for('react.suspense'),
		ce = Symbol.for('react.suspense_list'),
		Ae = Symbol.for('react.memo'),
		be = Symbol.for('react.lazy'),
		ge = Symbol.for('react.offscreen'),
		J = Symbol.iterator;
	function se(r) {
		return r === null || typeof r != 'object'
			? null
			: ((r = (J && r[J]) || r['@@iterator']), typeof r == 'function' ? r : null);
	}
	var Z = Object.assign,
		I;
	function H(r) {
		if (I === void 0)
			try {
				throw Error();
			} catch (a) {
				var i = a.stack.trim().match(/\n( *(at )?)/);
				I = (i && i[1]) || '';
			}
		return (
			`
` +
			I +
			r
		);
	}
	var de = !1;
	function fe(r, i) {
		if (!r || de) return '';
		de = !0;
		var a = Error.prepareStackTrace;
		Error.prepareStackTrace = void 0;
		try {
			if (i)
				if (
					((i = function () {
						throw Error();
					}),
					Object.defineProperty(i.prototype, 'props', {
						set: function () {
							throw Error();
						},
					}),
					typeof Reflect == 'object' && Reflect.construct)
				) {
					try {
						Reflect.construct(i, []);
					} catch (P) {
						var f = P;
					}
					Reflect.construct(r, [], i);
				} else {
					try {
						i.call();
					} catch (P) {
						f = P;
					}
					r.call(i.prototype);
				}
			else {
				try {
					throw Error();
				} catch (P) {
					f = P;
				}
				r();
			}
		} catch (P) {
			if (P && f && typeof P.stack == 'string') {
				for (
					var h = P.stack.split(`
`),
						m = f.stack.split(`
`),
						x = h.length - 1,
						b = m.length - 1;
					1 <= x && 0 <= b && h[x] !== m[b];
				)
					b--;
				for (; 1 <= x && 0 <= b; x--, b--)
					if (h[x] !== m[b]) {
						if (x !== 1 || b !== 1)
							do
								if ((x--, b--, 0 > b || h[x] !== m[b])) {
									var T =
										`
` + h[x].replace(' at new ', ' at ');
									return (
										r.displayName &&
											T.includes('<anonymous>') &&
											(T = T.replace('<anonymous>', r.displayName)),
										T
									);
								}
							while (1 <= x && 0 <= b);
						break;
					}
			}
		} finally {
			(de = !1), (Error.prepareStackTrace = a);
		}
		return (r = r ? r.displayName || r.name : '') ? H(r) : '';
	}
	function pe(r) {
		switch (r.tag) {
			case 5:
				return H(r.type);
			case 16:
				return H('Lazy');
			case 13:
				return H('Suspense');
			case 19:
				return H('SuspenseList');
			case 0:
			case 2:
			case 15:
				return (r = fe(r.type, !1)), r;
			case 11:
				return (r = fe(r.type.render, !1)), r;
			case 1:
				return (r = fe(r.type, !0)), r;
			default:
				return '';
		}
	}
	function ye(r) {
		if (r == null) return null;
		if (typeof r == 'function') return r.displayName || r.name || null;
		if (typeof r == 'string') return r;
		switch (r) {
			case q:
				return 'Fragment';
			case z:
				return 'Portal';
			case M:
				return 'Profiler';
			case B:
				return 'StrictMode';
			case X:
				return 'Suspense';
			case ce:
				return 'SuspenseList';
		}
		if (typeof r == 'object')
			switch (r.$$typeof) {
				case K:
					return (r.displayName || 'Context') + '.Consumer';
				case G:
					return (r._context.displayName || 'Context') + '.Provider';
				case $:
					var i = r.render;
					return (
						(r = r.displayName),
						r ||
							((r = i.displayName || i.name || ''),
							(r = r !== '' ? 'ForwardRef(' + r + ')' : 'ForwardRef')),
						r
					);
				case Ae:
					return (i = r.displayName || null), i !== null ? i : ye(r.type) || 'Memo';
				case be:
					(i = r._payload), (r = r._init);
					try {
						return ye(r(i));
					} catch {}
			}
		return null;
	}
	function Se(r) {
		var i = r.type;
		switch (r.tag) {
			case 24:
				return 'Cache';
			case 9:
				return (i.displayName || 'Context') + '.Consumer';
			case 10:
				return (i._context.displayName || 'Context') + '.Provider';
			case 18:
				return 'DehydratedFragment';
			case 11:
				return (
					(r = i.render),
					(r = r.displayName || r.name || ''),
					i.displayName || (r !== '' ? 'ForwardRef(' + r + ')' : 'ForwardRef')
				);
			case 7:
				return 'Fragment';
			case 5:
				return i;
			case 4:
				return 'Portal';
			case 3:
				return 'Root';
			case 6:
				return 'Text';
			case 16:
				return ye(i);
			case 8:
				return i === B ? 'StrictMode' : 'Mode';
			case 22:
				return 'Offscreen';
			case 12:
				return 'Profiler';
			case 21:
				return 'Scope';
			case 13:
				return 'Suspense';
			case 19:
				return 'SuspenseList';
			case 25:
				return 'TracingMarker';
			case 1:
			case 0:
			case 17:
			case 2:
			case 14:
			case 15:
				if (typeof i == 'function') return i.displayName || i.name || null;
				if (typeof i == 'string') return i;
		}
		return null;
	}
	function he(r) {
		switch (typeof r) {
			case 'boolean':
			case 'number':
			case 'string':
			case 'undefined':
				return r;
			case 'object':
				return r;
			default:
				return '';
		}
	}
	function _e(r) {
		var i = r.type;
		return (r = r.nodeName) && r.toLowerCase() === 'input' && (i === 'checkbox' || i === 'radio');
	}
	function ct(r) {
		var i = _e(r) ? 'checked' : 'value',
			a = Object.getOwnPropertyDescriptor(r.constructor.prototype, i),
			f = '' + r[i];
		if (
			!r.hasOwnProperty(i) &&
			typeof a < 'u' &&
			typeof a.get == 'function' &&
			typeof a.set == 'function'
		) {
			var h = a.get,
				m = a.set;
			return (
				Object.defineProperty(r, i, {
					configurable: !0,
					get: function () {
						return h.call(this);
					},
					set: function (x) {
						(f = '' + x), m.call(this, x);
					},
				}),
				Object.defineProperty(r, i, { enumerable: a.enumerable }),
				{
					getValue: function () {
						return f;
					},
					setValue: function (x) {
						f = '' + x;
					},
					stopTracking: function () {
						(r._valueTracker = null), delete r[i];
					},
				}
			);
		}
	}
	function Mr(r) {
		r._valueTracker || (r._valueTracker = ct(r));
	}
	function jr(r) {
		if (!r) return !1;
		var i = r._valueTracker;
		if (!i) return !0;
		var a = i.getValue(),
			f = '';
		return (
			r && (f = _e(r) ? (r.checked ? 'true' : 'false') : r.value),
			(r = f),
			r !== a ? (i.setValue(r), !0) : !1
		);
	}
	function ir(r) {
		if (((r = r || (typeof document < 'u' ? document : void 0)), typeof r > 'u')) return null;
		try {
			return r.activeElement || r.body;
		} catch {
			return r.body;
		}
	}
	function Pr(r, i) {
		var a = i.checked;
		return Z({}, i, {
			defaultChecked: void 0,
			defaultValue: void 0,
			value: void 0,
			checked: a ?? r._wrapperState.initialChecked,
		});
	}
	function hn(r, i) {
		var a = i.defaultValue == null ? '' : i.defaultValue,
			f = i.checked != null ? i.checked : i.defaultChecked;
		(a = he(i.value != null ? i.value : a)),
			(r._wrapperState = {
				initialChecked: f,
				initialValue: a,
				controlled:
					i.type === 'checkbox' || i.type === 'radio' ? i.checked != null : i.value != null,
			});
	}
	function Qi(r, i) {
		(i = i.checked), i != null && O(r, 'checked', i, !1);
	}
	function Rs(r, i) {
		Qi(r, i);
		var a = he(i.value),
			f = i.type;
		if (a != null)
			f === 'number'
				? ((a === 0 && r.value === '') || r.value != a) && (r.value = '' + a)
				: r.value !== '' + a && (r.value = '' + a);
		else if (f === 'submit' || f === 'reset') {
			r.removeAttribute('value');
			return;
		}
		i.hasOwnProperty('value')
			? Ds(r, i.type, a)
			: i.hasOwnProperty('defaultValue') && Ds(r, i.type, he(i.defaultValue)),
			i.checked == null && i.defaultChecked != null && (r.defaultChecked = !!i.defaultChecked);
	}
	function Ji(r, i, a) {
		if (i.hasOwnProperty('value') || i.hasOwnProperty('defaultValue')) {
			var f = i.type;
			if (!((f !== 'submit' && f !== 'reset') || (i.value !== void 0 && i.value !== null))) return;
			(i = '' + r._wrapperState.initialValue),
				a || i === r.value || (r.value = i),
				(r.defaultValue = i);
		}
		(a = r.name),
			a !== '' && (r.name = ''),
			(r.defaultChecked = !!r._wrapperState.initialChecked),
			a !== '' && (r.name = a);
	}
	function Ds(r, i, a) {
		(i !== 'number' || ir(r.ownerDocument) !== r) &&
			(a == null
				? (r.defaultValue = '' + r._wrapperState.initialValue)
				: r.defaultValue !== '' + a && (r.defaultValue = '' + a));
	}
	var An = Array.isArray;
	function nn(r, i, a, f) {
		if (((r = r.options), i)) {
			i = {};
			for (var h = 0; h < a.length; h++) i['$' + a[h]] = !0;
			for (a = 0; a < r.length; a++)
				(h = i.hasOwnProperty('$' + r[a].value)),
					r[a].selected !== h && (r[a].selected = h),
					h && f && (r[a].defaultSelected = !0);
		} else {
			for (a = '' + he(a), i = null, h = 0; h < r.length; h++) {
				if (r[h].value === a) {
					(r[h].selected = !0), f && (r[h].defaultSelected = !0);
					return;
				}
				i !== null || r[h].disabled || (i = r[h]);
			}
			i !== null && (i.selected = !0);
		}
	}
	function Fs(r, i) {
		if (i.dangerouslySetInnerHTML != null) throw Error(n(91));
		return Z({}, i, {
			value: void 0,
			defaultValue: void 0,
			children: '' + r._wrapperState.initialValue,
		});
	}
	function Xi(r, i) {
		var a = i.value;
		if (a == null) {
			if (((a = i.children), (i = i.defaultValue), a != null)) {
				if (i != null) throw Error(n(92));
				if (An(a)) {
					if (1 < a.length) throw Error(n(93));
					a = a[0];
				}
				i = a;
			}
			i == null && (i = ''), (a = i);
		}
		r._wrapperState = { initialValue: he(a) };
	}
	function Yi(r, i) {
		var a = he(i.value),
			f = he(i.defaultValue);
		a != null &&
			((a = '' + a),
			a !== r.value && (r.value = a),
			i.defaultValue == null && r.defaultValue !== a && (r.defaultValue = a)),
			f != null && (r.defaultValue = '' + f);
	}
	function In(r) {
		var i = r.textContent;
		i === r._wrapperState.initialValue && i !== '' && i !== null && (r.value = i);
	}
	function Or(r) {
		switch (r) {
			case 'svg':
				return 'http://www.w3.org/2000/svg';
			case 'math':
				return 'http://www.w3.org/1998/Math/MathML';
			default:
				return 'http://www.w3.org/1999/xhtml';
		}
	}
	function Ln(r, i) {
		return r == null || r === 'http://www.w3.org/1999/xhtml'
			? Or(i)
			: r === 'http://www.w3.org/2000/svg' && i === 'foreignObject'
				? 'http://www.w3.org/1999/xhtml'
				: r;
	}
	var $r,
		Zi = (function (r) {
			return typeof MSApp < 'u' && MSApp.execUnsafeLocalFunction
				? function (i, a, f, h) {
						MSApp.execUnsafeLocalFunction(function () {
							return r(i, a, f, h);
						});
					}
				: r;
		})(function (r, i) {
			if (r.namespaceURI !== 'http://www.w3.org/2000/svg' || 'innerHTML' in r) r.innerHTML = i;
			else {
				for (
					$r = $r || document.createElement('div'),
						$r.innerHTML = '<svg>' + i.valueOf().toString() + '</svg>',
						i = $r.firstChild;
					r.firstChild;
				)
					r.removeChild(r.firstChild);
				for (; i.firstChild; ) r.appendChild(i.firstChild);
			}
		});
	function Mn(r, i) {
		if (i) {
			var a = r.firstChild;
			if (a && a === r.lastChild && a.nodeType === 3) {
				a.nodeValue = i;
				return;
			}
		}
		r.textContent = i;
	}
	var le = {
			animationIterationCount: !0,
			aspectRatio: !0,
			borderImageOutset: !0,
			borderImageSlice: !0,
			borderImageWidth: !0,
			boxFlex: !0,
			boxFlexGroup: !0,
			boxOrdinalGroup: !0,
			columnCount: !0,
			columns: !0,
			flex: !0,
			flexGrow: !0,
			flexPositive: !0,
			flexShrink: !0,
			flexNegative: !0,
			flexOrder: !0,
			gridArea: !0,
			gridRow: !0,
			gridRowEnd: !0,
			gridRowSpan: !0,
			gridRowStart: !0,
			gridColumn: !0,
			gridColumnEnd: !0,
			gridColumnSpan: !0,
			gridColumnStart: !0,
			fontWeight: !0,
			lineClamp: !0,
			lineHeight: !0,
			opacity: !0,
			order: !0,
			orphans: !0,
			tabSize: !0,
			widows: !0,
			zIndex: !0,
			zoom: !0,
			fillOpacity: !0,
			floodOpacity: !0,
			stopOpacity: !0,
			strokeDasharray: !0,
			strokeDashoffset: !0,
			strokeMiterlimit: !0,
			strokeOpacity: !0,
			strokeWidth: !0,
		},
		rn = ['Webkit', 'ms', 'Moz', 'O'];
	Object.keys(le).forEach(function (r) {
		rn.forEach(function (i) {
			(i = i + r.charAt(0).toUpperCase() + r.substring(1)), (le[i] = le[r]);
		});
	});
	function jt(r, i, a) {
		return i == null || typeof i == 'boolean' || i === ''
			? ''
			: a || typeof i != 'number' || i === 0 || (le.hasOwnProperty(r) && le[r])
				? ('' + i).trim()
				: i + 'px';
	}
	function Bf(r, i) {
		r = r.style;
		for (var a in i)
			if (i.hasOwnProperty(a)) {
				var f = a.indexOf('--') === 0,
					h = jt(a, i[a], f);
				a === 'float' && (a = 'cssFloat'), f ? r.setProperty(a, h) : (r[a] = h);
			}
	}
	var wv = Z(
		{ menuitem: !0 },
		{
			area: !0,
			base: !0,
			br: !0,
			col: !0,
			embed: !0,
			hr: !0,
			img: !0,
			input: !0,
			keygen: !0,
			link: !0,
			meta: !0,
			param: !0,
			source: !0,
			track: !0,
			wbr: !0,
		},
	);
	function ha(r, i) {
		if (i) {
			if (wv[r] && (i.children != null || i.dangerouslySetInnerHTML != null))
				throw Error(n(137, r));
			if (i.dangerouslySetInnerHTML != null) {
				if (i.children != null) throw Error(n(60));
				if (
					typeof i.dangerouslySetInnerHTML != 'object' ||
					!('__html' in i.dangerouslySetInnerHTML)
				)
					throw Error(n(61));
			}
			if (i.style != null && typeof i.style != 'object') throw Error(n(62));
		}
	}
	function pa(r, i) {
		if (r.indexOf('-') === -1) return typeof i.is == 'string';
		switch (r) {
			case 'annotation-xml':
			case 'color-profile':
			case 'font-face':
			case 'font-face-src':
			case 'font-face-uri':
			case 'font-face-format':
			case 'font-face-name':
			case 'missing-glyph':
				return !1;
			default:
				return !0;
		}
	}
	var ma = null;
	function ga(r) {
		return (
			(r = r.target || r.srcElement || window),
			r.correspondingUseElement && (r = r.correspondingUseElement),
			r.nodeType === 3 ? r.parentNode : r
		);
	}
	var ya = null,
		Rr = null,
		Dr = null;
	function zf(r) {
		if ((r = li(r))) {
			if (typeof ya != 'function') throw Error(n(280));
			var i = r.stateNode;
			i && ((i = Eo(i)), ya(r.stateNode, r.type, i));
		}
	}
	function Hf(r) {
		Rr ? (Dr ? Dr.push(r) : (Dr = [r])) : (Rr = r);
	}
	function Uf() {
		if (Rr) {
			var r = Rr,
				i = Dr;
			if (((Dr = Rr = null), zf(r), i)) for (r = 0; r < i.length; r++) zf(i[r]);
		}
	}
	function qf(r, i) {
		return r(i);
	}
	function Vf() {}
	var va = !1;
	function Wf(r, i, a) {
		if (va) return r(i, a);
		va = !0;
		try {
			return qf(r, i, a);
		} finally {
			(va = !1), (Rr !== null || Dr !== null) && (Vf(), Uf());
		}
	}
	function Bs(r, i) {
		var a = r.stateNode;
		if (a === null) return null;
		var f = Eo(a);
		if (f === null) return null;
		a = f[i];
		e: switch (i) {
			case 'onClick':
			case 'onClickCapture':
			case 'onDoubleClick':
			case 'onDoubleClickCapture':
			case 'onMouseDown':
			case 'onMouseDownCapture':
			case 'onMouseMove':
			case 'onMouseMoveCapture':
			case 'onMouseUp':
			case 'onMouseUpCapture':
			case 'onMouseEnter':
				(f = !f.disabled) ||
					((r = r.type),
					(f = !(r === 'button' || r === 'input' || r === 'select' || r === 'textarea'))),
					(r = !f);
				break e;
			default:
				r = !1;
		}
		if (r) return null;
		if (a && typeof a != 'function') throw Error(n(231, i, typeof a));
		return a;
	}
	var wa = !1;
	if (u)
		try {
			var zs = {};
			Object.defineProperty(zs, 'passive', {
				get: function () {
					wa = !0;
				},
			}),
				window.addEventListener('test', zs, zs),
				window.removeEventListener('test', zs, zs);
		} catch {
			wa = !1;
		}
	function Sv(r, i, a, f, h, m, x, b, T) {
		var P = Array.prototype.slice.call(arguments, 3);
		try {
			i.apply(a, P);
		} catch (V) {
			this.onError(V);
		}
	}
	var Hs = !1,
		eo = null,
		to = !1,
		Sa = null,
		xv = {
			onError: function (r) {
				(Hs = !0), (eo = r);
			},
		};
	function _v(r, i, a, f, h, m, x, b, T) {
		(Hs = !1), (eo = null), Sv.apply(xv, arguments);
	}
	function Ev(r, i, a, f, h, m, x, b, T) {
		if ((_v.apply(this, arguments), Hs)) {
			if (Hs) {
				var P = eo;
				(Hs = !1), (eo = null);
			} else throw Error(n(198));
			to || ((to = !0), (Sa = P));
		}
	}
	function or(r) {
		var i = r,
			a = r;
		if (r.alternate) for (; i.return; ) i = i.return;
		else {
			r = i;
			do (i = r), (i.flags & 4098) !== 0 && (a = i.return), (r = i.return);
			while (r);
		}
		return i.tag === 3 ? a : null;
	}
	function Kf(r) {
		if (r.tag === 13) {
			var i = r.memoizedState;
			if ((i === null && ((r = r.alternate), r !== null && (i = r.memoizedState)), i !== null))
				return i.dehydrated;
		}
		return null;
	}
	function Gf(r) {
		if (or(r) !== r) throw Error(n(188));
	}
	function kv(r) {
		var i = r.alternate;
		if (!i) {
			if (((i = or(r)), i === null)) throw Error(n(188));
			return i !== r ? null : r;
		}
		for (var a = r, f = i; ; ) {
			var h = a.return;
			if (h === null) break;
			var m = h.alternate;
			if (m === null) {
				if (((f = h.return), f !== null)) {
					a = f;
					continue;
				}
				break;
			}
			if (h.child === m.child) {
				for (m = h.child; m; ) {
					if (m === a) return Gf(h), r;
					if (m === f) return Gf(h), i;
					m = m.sibling;
				}
				throw Error(n(188));
			}
			if (a.return !== f.return) (a = h), (f = m);
			else {
				for (var x = !1, b = h.child; b; ) {
					if (b === a) {
						(x = !0), (a = h), (f = m);
						break;
					}
					if (b === f) {
						(x = !0), (f = h), (a = m);
						break;
					}
					b = b.sibling;
				}
				if (!x) {
					for (b = m.child; b; ) {
						if (b === a) {
							(x = !0), (a = m), (f = h);
							break;
						}
						if (b === f) {
							(x = !0), (f = m), (a = h);
							break;
						}
						b = b.sibling;
					}
					if (!x) throw Error(n(189));
				}
			}
			if (a.alternate !== f) throw Error(n(190));
		}
		if (a.tag !== 3) throw Error(n(188));
		return a.stateNode.current === a ? r : i;
	}
	function Qf(r) {
		return (r = kv(r)), r !== null ? Jf(r) : null;
	}
	function Jf(r) {
		if (r.tag === 5 || r.tag === 6) return r;
		for (r = r.child; r !== null; ) {
			var i = Jf(r);
			if (i !== null) return i;
			r = r.sibling;
		}
		return null;
	}
	var Xf = e.unstable_scheduleCallback,
		Yf = e.unstable_cancelCallback,
		bv = e.unstable_shouldYield,
		Tv = e.unstable_requestPaint,
		Fe = e.unstable_now,
		Cv = e.unstable_getCurrentPriorityLevel,
		xa = e.unstable_ImmediatePriority,
		Zf = e.unstable_UserBlockingPriority,
		no = e.unstable_NormalPriority,
		Nv = e.unstable_LowPriority,
		ed = e.unstable_IdlePriority,
		ro = null,
		sn = null;
	function Av(r) {
		if (sn && typeof sn.onCommitFiberRoot == 'function')
			try {
				sn.onCommitFiberRoot(ro, r, void 0, (r.current.flags & 128) === 128);
			} catch {}
	}
	var Wt = Math.clz32 ? Math.clz32 : Mv,
		Iv = Math.log,
		Lv = Math.LN2;
	function Mv(r) {
		return (r >>>= 0), r === 0 ? 32 : (31 - ((Iv(r) / Lv) | 0)) | 0;
	}
	var so = 64,
		io = 4194304;
	function Us(r) {
		switch (r & -r) {
			case 1:
				return 1;
			case 2:
				return 2;
			case 4:
				return 4;
			case 8:
				return 8;
			case 16:
				return 16;
			case 32:
				return 32;
			case 64:
			case 128:
			case 256:
			case 512:
			case 1024:
			case 2048:
			case 4096:
			case 8192:
			case 16384:
			case 32768:
			case 65536:
			case 131072:
			case 262144:
			case 524288:
			case 1048576:
			case 2097152:
				return r & 4194240;
			case 4194304:
			case 8388608:
			case 16777216:
			case 33554432:
			case 67108864:
				return r & 130023424;
			case 134217728:
				return 134217728;
			case 268435456:
				return 268435456;
			case 536870912:
				return 536870912;
			case 1073741824:
				return 1073741824;
			default:
				return r;
		}
	}
	function oo(r, i) {
		var a = r.pendingLanes;
		if (a === 0) return 0;
		var f = 0,
			h = r.suspendedLanes,
			m = r.pingedLanes,
			x = a & 268435455;
		if (x !== 0) {
			var b = x & ~h;
			b !== 0 ? (f = Us(b)) : ((m &= x), m !== 0 && (f = Us(m)));
		} else (x = a & ~h), x !== 0 ? (f = Us(x)) : m !== 0 && (f = Us(m));
		if (f === 0) return 0;
		if (
			i !== 0 &&
			i !== f &&
			(i & h) === 0 &&
			((h = f & -f), (m = i & -i), h >= m || (h === 16 && (m & 4194240) !== 0))
		)
			return i;
		if (((f & 4) !== 0 && (f |= a & 16), (i = r.entangledLanes), i !== 0))
			for (r = r.entanglements, i &= f; 0 < i; )
				(a = 31 - Wt(i)), (h = 1 << a), (f |= r[a]), (i &= ~h);
		return f;
	}
	function jv(r, i) {
		switch (r) {
			case 1:
			case 2:
			case 4:
				return i + 250;
			case 8:
			case 16:
			case 32:
			case 64:
			case 128:
			case 256:
			case 512:
			case 1024:
			case 2048:
			case 4096:
			case 8192:
			case 16384:
			case 32768:
			case 65536:
			case 131072:
			case 262144:
			case 524288:
			case 1048576:
			case 2097152:
				return i + 5e3;
			case 4194304:
			case 8388608:
			case 16777216:
			case 33554432:
			case 67108864:
				return -1;
			case 134217728:
			case 268435456:
			case 536870912:
			case 1073741824:
				return -1;
			default:
				return -1;
		}
	}
	function Pv(r, i) {
		for (
			var a = r.suspendedLanes, f = r.pingedLanes, h = r.expirationTimes, m = r.pendingLanes;
			0 < m;
		) {
			var x = 31 - Wt(m),
				b = 1 << x,
				T = h[x];
			T === -1
				? ((b & a) === 0 || (b & f) !== 0) && (h[x] = jv(b, i))
				: T <= i && (r.expiredLanes |= b),
				(m &= ~b);
		}
	}
	function _a(r) {
		return (r = r.pendingLanes & -1073741825), r !== 0 ? r : r & 1073741824 ? 1073741824 : 0;
	}
	function td() {
		var r = so;
		return (so <<= 1), (so & 4194240) === 0 && (so = 64), r;
	}
	function Ea(r) {
		for (var i = [], a = 0; 31 > a; a++) i.push(r);
		return i;
	}
	function qs(r, i, a) {
		(r.pendingLanes |= i),
			i !== 536870912 && ((r.suspendedLanes = 0), (r.pingedLanes = 0)),
			(r = r.eventTimes),
			(i = 31 - Wt(i)),
			(r[i] = a);
	}
	function Ov(r, i) {
		var a = r.pendingLanes & ~i;
		(r.pendingLanes = i),
			(r.suspendedLanes = 0),
			(r.pingedLanes = 0),
			(r.expiredLanes &= i),
			(r.mutableReadLanes &= i),
			(r.entangledLanes &= i),
			(i = r.entanglements);
		var f = r.eventTimes;
		for (r = r.expirationTimes; 0 < a; ) {
			var h = 31 - Wt(a),
				m = 1 << h;
			(i[h] = 0), (f[h] = -1), (r[h] = -1), (a &= ~m);
		}
	}
	function ka(r, i) {
		var a = (r.entangledLanes |= i);
		for (r = r.entanglements; a; ) {
			var f = 31 - Wt(a),
				h = 1 << f;
			(h & i) | (r[f] & i) && (r[f] |= i), (a &= ~h);
		}
	}
	var xe = 0;
	function nd(r) {
		return (r &= -r), 1 < r ? (4 < r ? ((r & 268435455) !== 0 ? 16 : 536870912) : 4) : 1;
	}
	var rd,
		ba,
		sd,
		id,
		od,
		Ta = !1,
		lo = [],
		jn = null,
		Pn = null,
		On = null,
		Vs = new Map(),
		Ws = new Map(),
		$n = [],
		$v =
			'mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit'.split(
				' ',
			);
	function ld(r, i) {
		switch (r) {
			case 'focusin':
			case 'focusout':
				jn = null;
				break;
			case 'dragenter':
			case 'dragleave':
				Pn = null;
				break;
			case 'mouseover':
			case 'mouseout':
				On = null;
				break;
			case 'pointerover':
			case 'pointerout':
				Vs.delete(i.pointerId);
				break;
			case 'gotpointercapture':
			case 'lostpointercapture':
				Ws.delete(i.pointerId);
		}
	}
	function Ks(r, i, a, f, h, m) {
		return r === null || r.nativeEvent !== m
			? ((r = {
					blockedOn: i,
					domEventName: a,
					eventSystemFlags: f,
					nativeEvent: m,
					targetContainers: [h],
				}),
				i !== null && ((i = li(i)), i !== null && ba(i)),
				r)
			: ((r.eventSystemFlags |= f),
				(i = r.targetContainers),
				h !== null && i.indexOf(h) === -1 && i.push(h),
				r);
	}
	function Rv(r, i, a, f, h) {
		switch (i) {
			case 'focusin':
				return (jn = Ks(jn, r, i, a, f, h)), !0;
			case 'dragenter':
				return (Pn = Ks(Pn, r, i, a, f, h)), !0;
			case 'mouseover':
				return (On = Ks(On, r, i, a, f, h)), !0;
			case 'pointerover':
				var m = h.pointerId;
				return Vs.set(m, Ks(Vs.get(m) || null, r, i, a, f, h)), !0;
			case 'gotpointercapture':
				return (m = h.pointerId), Ws.set(m, Ks(Ws.get(m) || null, r, i, a, f, h)), !0;
		}
		return !1;
	}
	function ad(r) {
		var i = lr(r.target);
		if (i !== null) {
			var a = or(i);
			if (a !== null) {
				if (((i = a.tag), i === 13)) {
					if (((i = Kf(a)), i !== null)) {
						(r.blockedOn = i),
							od(r.priority, function () {
								sd(a);
							});
						return;
					}
				} else if (i === 3 && a.stateNode.current.memoizedState.isDehydrated) {
					r.blockedOn = a.tag === 3 ? a.stateNode.containerInfo : null;
					return;
				}
			}
		}
		r.blockedOn = null;
	}
	function ao(r) {
		if (r.blockedOn !== null) return !1;
		for (var i = r.targetContainers; 0 < i.length; ) {
			var a = Na(r.domEventName, r.eventSystemFlags, i[0], r.nativeEvent);
			if (a === null) {
				a = r.nativeEvent;
				var f = new a.constructor(a.type, a);
				(ma = f), a.target.dispatchEvent(f), (ma = null);
			} else return (i = li(a)), i !== null && ba(i), (r.blockedOn = a), !1;
			i.shift();
		}
		return !0;
	}
	function cd(r, i, a) {
		ao(r) && a.delete(i);
	}
	function Dv() {
		(Ta = !1),
			jn !== null && ao(jn) && (jn = null),
			Pn !== null && ao(Pn) && (Pn = null),
			On !== null && ao(On) && (On = null),
			Vs.forEach(cd),
			Ws.forEach(cd);
	}
	function Gs(r, i) {
		r.blockedOn === i &&
			((r.blockedOn = null),
			Ta || ((Ta = !0), e.unstable_scheduleCallback(e.unstable_NormalPriority, Dv)));
	}
	function Qs(r) {
		function i(h) {
			return Gs(h, r);
		}
		if (0 < lo.length) {
			Gs(lo[0], r);
			for (var a = 1; a < lo.length; a++) {
				var f = lo[a];
				f.blockedOn === r && (f.blockedOn = null);
			}
		}
		for (
			jn !== null && Gs(jn, r),
				Pn !== null && Gs(Pn, r),
				On !== null && Gs(On, r),
				Vs.forEach(i),
				Ws.forEach(i),
				a = 0;
			a < $n.length;
			a++
		)
			(f = $n[a]), f.blockedOn === r && (f.blockedOn = null);
		for (; 0 < $n.length && ((a = $n[0]), a.blockedOn === null); )
			ad(a), a.blockedOn === null && $n.shift();
	}
	var Fr = D.ReactCurrentBatchConfig,
		co = !0;
	function Fv(r, i, a, f) {
		var h = xe,
			m = Fr.transition;
		Fr.transition = null;
		try {
			(xe = 1), Ca(r, i, a, f);
		} finally {
			(xe = h), (Fr.transition = m);
		}
	}
	function Bv(r, i, a, f) {
		var h = xe,
			m = Fr.transition;
		Fr.transition = null;
		try {
			(xe = 4), Ca(r, i, a, f);
		} finally {
			(xe = h), (Fr.transition = m);
		}
	}
	function Ca(r, i, a, f) {
		if (co) {
			var h = Na(r, i, a, f);
			if (h === null) Va(r, i, f, uo, a), ld(r, f);
			else if (Rv(h, r, i, a, f)) f.stopPropagation();
			else if ((ld(r, f), i & 4 && -1 < $v.indexOf(r))) {
				for (; h !== null; ) {
					var m = li(h);
					if (
						(m !== null && rd(m), (m = Na(r, i, a, f)), m === null && Va(r, i, f, uo, a), m === h)
					)
						break;
					h = m;
				}
				h !== null && f.stopPropagation();
			} else Va(r, i, f, null, a);
		}
	}
	var uo = null;
	function Na(r, i, a, f) {
		if (((uo = null), (r = ga(f)), (r = lr(r)), r !== null))
			if (((i = or(r)), i === null)) r = null;
			else if (((a = i.tag), a === 13)) {
				if (((r = Kf(i)), r !== null)) return r;
				r = null;
			} else if (a === 3) {
				if (i.stateNode.current.memoizedState.isDehydrated)
					return i.tag === 3 ? i.stateNode.containerInfo : null;
				r = null;
			} else i !== r && (r = null);
		return (uo = r), null;
	}
	function ud(r) {
		switch (r) {
			case 'cancel':
			case 'click':
			case 'close':
			case 'contextmenu':
			case 'copy':
			case 'cut':
			case 'auxclick':
			case 'dblclick':
			case 'dragend':
			case 'dragstart':
			case 'drop':
			case 'focusin':
			case 'focusout':
			case 'input':
			case 'invalid':
			case 'keydown':
			case 'keypress':
			case 'keyup':
			case 'mousedown':
			case 'mouseup':
			case 'paste':
			case 'pause':
			case 'play':
			case 'pointercancel':
			case 'pointerdown':
			case 'pointerup':
			case 'ratechange':
			case 'reset':
			case 'resize':
			case 'seeked':
			case 'submit':
			case 'touchcancel':
			case 'touchend':
			case 'touchstart':
			case 'volumechange':
			case 'change':
			case 'selectionchange':
			case 'textInput':
			case 'compositionstart':
			case 'compositionend':
			case 'compositionupdate':
			case 'beforeblur':
			case 'afterblur':
			case 'beforeinput':
			case 'blur':
			case 'fullscreenchange':
			case 'focus':
			case 'hashchange':
			case 'popstate':
			case 'select':
			case 'selectstart':
				return 1;
			case 'drag':
			case 'dragenter':
			case 'dragexit':
			case 'dragleave':
			case 'dragover':
			case 'mousemove':
			case 'mouseout':
			case 'mouseover':
			case 'pointermove':
			case 'pointerout':
			case 'pointerover':
			case 'scroll':
			case 'toggle':
			case 'touchmove':
			case 'wheel':
			case 'mouseenter':
			case 'mouseleave':
			case 'pointerenter':
			case 'pointerleave':
				return 4;
			case 'message':
				switch (Cv()) {
					case xa:
						return 1;
					case Zf:
						return 4;
					case no:
					case Nv:
						return 16;
					case ed:
						return 536870912;
					default:
						return 16;
				}
			default:
				return 16;
		}
	}
	var Rn = null,
		Aa = null,
		fo = null;
	function fd() {
		if (fo) return fo;
		var r,
			i = Aa,
			a = i.length,
			f,
			h = 'value' in Rn ? Rn.value : Rn.textContent,
			m = h.length;
		for (r = 0; r < a && i[r] === h[r]; r++);
		var x = a - r;
		for (f = 1; f <= x && i[a - f] === h[m - f]; f++);
		return (fo = h.slice(r, 1 < f ? 1 - f : void 0));
	}
	function ho(r) {
		var i = r.keyCode;
		return (
			'charCode' in r ? ((r = r.charCode), r === 0 && i === 13 && (r = 13)) : (r = i),
			r === 10 && (r = 13),
			32 <= r || r === 13 ? r : 0
		);
	}
	function po() {
		return !0;
	}
	function dd() {
		return !1;
	}
	function Ct(r) {
		function i(a, f, h, m, x) {
			(this._reactName = a),
				(this._targetInst = h),
				(this.type = f),
				(this.nativeEvent = m),
				(this.target = x),
				(this.currentTarget = null);
			for (var b in r) r.hasOwnProperty(b) && ((a = r[b]), (this[b] = a ? a(m) : m[b]));
			return (
				(this.isDefaultPrevented = (
					m.defaultPrevented != null
						? m.defaultPrevented
						: m.returnValue === !1
				)
					? po
					: dd),
				(this.isPropagationStopped = dd),
				this
			);
		}
		return (
			Z(i.prototype, {
				preventDefault: function () {
					this.defaultPrevented = !0;
					var a = this.nativeEvent;
					a &&
						(a.preventDefault
							? a.preventDefault()
							: typeof a.returnValue != 'unknown' && (a.returnValue = !1),
						(this.isDefaultPrevented = po));
				},
				stopPropagation: function () {
					var a = this.nativeEvent;
					a &&
						(a.stopPropagation
							? a.stopPropagation()
							: typeof a.cancelBubble != 'unknown' && (a.cancelBubble = !0),
						(this.isPropagationStopped = po));
				},
				persist: function () {},
				isPersistent: po,
			}),
			i
		);
	}
	var Br = {
			eventPhase: 0,
			bubbles: 0,
			cancelable: 0,
			timeStamp: function (r) {
				return r.timeStamp || Date.now();
			},
			defaultPrevented: 0,
			isTrusted: 0,
		},
		Ia = Ct(Br),
		Js = Z({}, Br, { view: 0, detail: 0 }),
		zv = Ct(Js),
		La,
		Ma,
		Xs,
		mo = Z({}, Js, {
			screenX: 0,
			screenY: 0,
			clientX: 0,
			clientY: 0,
			pageX: 0,
			pageY: 0,
			ctrlKey: 0,
			shiftKey: 0,
			altKey: 0,
			metaKey: 0,
			getModifierState: Pa,
			button: 0,
			buttons: 0,
			relatedTarget: function (r) {
				return r.relatedTarget === void 0
					? r.fromElement === r.srcElement
						? r.toElement
						: r.fromElement
					: r.relatedTarget;
			},
			movementX: function (r) {
				return 'movementX' in r
					? r.movementX
					: (r !== Xs &&
							(Xs && r.type === 'mousemove'
								? ((La = r.screenX - Xs.screenX), (Ma = r.screenY - Xs.screenY))
								: (Ma = La = 0),
							(Xs = r)),
						La);
			},
			movementY: function (r) {
				return 'movementY' in r ? r.movementY : Ma;
			},
		}),
		hd = Ct(mo),
		Hv = Z({}, mo, { dataTransfer: 0 }),
		Uv = Ct(Hv),
		qv = Z({}, Js, { relatedTarget: 0 }),
		ja = Ct(qv),
		Vv = Z({}, Br, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }),
		Wv = Ct(Vv),
		Kv = Z({}, Br, {
			clipboardData: function (r) {
				return 'clipboardData' in r ? r.clipboardData : window.clipboardData;
			},
		}),
		Gv = Ct(Kv),
		Qv = Z({}, Br, { data: 0 }),
		pd = Ct(Qv),
		Jv = {
			Esc: 'Escape',
			Spacebar: ' ',
			Left: 'ArrowLeft',
			Up: 'ArrowUp',
			Right: 'ArrowRight',
			Down: 'ArrowDown',
			Del: 'Delete',
			Win: 'OS',
			Menu: 'ContextMenu',
			Apps: 'ContextMenu',
			Scroll: 'ScrollLock',
			MozPrintableKey: 'Unidentified',
		},
		Xv = {
			8: 'Backspace',
			9: 'Tab',
			12: 'Clear',
			13: 'Enter',
			16: 'Shift',
			17: 'Control',
			18: 'Alt',
			19: 'Pause',
			20: 'CapsLock',
			27: 'Escape',
			32: ' ',
			33: 'PageUp',
			34: 'PageDown',
			35: 'End',
			36: 'Home',
			37: 'ArrowLeft',
			38: 'ArrowUp',
			39: 'ArrowRight',
			40: 'ArrowDown',
			45: 'Insert',
			46: 'Delete',
			112: 'F1',
			113: 'F2',
			114: 'F3',
			115: 'F4',
			116: 'F5',
			117: 'F6',
			118: 'F7',
			119: 'F8',
			120: 'F9',
			121: 'F10',
			122: 'F11',
			123: 'F12',
			144: 'NumLock',
			145: 'ScrollLock',
			224: 'Meta',
		},
		Yv = { Alt: 'altKey', Control: 'ctrlKey', Meta: 'metaKey', Shift: 'shiftKey' };
	function Zv(r) {
		var i = this.nativeEvent;
		return i.getModifierState ? i.getModifierState(r) : (r = Yv[r]) ? !!i[r] : !1;
	}
	function Pa() {
		return Zv;
	}
	var ew = Z({}, Js, {
			key: function (r) {
				if (r.key) {
					var i = Jv[r.key] || r.key;
					if (i !== 'Unidentified') return i;
				}
				return r.type === 'keypress'
					? ((r = ho(r)), r === 13 ? 'Enter' : String.fromCharCode(r))
					: r.type === 'keydown' || r.type === 'keyup'
						? Xv[r.keyCode] || 'Unidentified'
						: '';
			},
			code: 0,
			location: 0,
			ctrlKey: 0,
			shiftKey: 0,
			altKey: 0,
			metaKey: 0,
			repeat: 0,
			locale: 0,
			getModifierState: Pa,
			charCode: function (r) {
				return r.type === 'keypress' ? ho(r) : 0;
			},
			keyCode: function (r) {
				return r.type === 'keydown' || r.type === 'keyup' ? r.keyCode : 0;
			},
			which: function (r) {
				return r.type === 'keypress'
					? ho(r)
					: r.type === 'keydown' || r.type === 'keyup'
						? r.keyCode
						: 0;
			},
		}),
		tw = Ct(ew),
		nw = Z({}, mo, {
			pointerId: 0,
			width: 0,
			height: 0,
			pressure: 0,
			tangentialPressure: 0,
			tiltX: 0,
			tiltY: 0,
			twist: 0,
			pointerType: 0,
			isPrimary: 0,
		}),
		md = Ct(nw),
		rw = Z({}, Js, {
			touches: 0,
			targetTouches: 0,
			changedTouches: 0,
			altKey: 0,
			metaKey: 0,
			ctrlKey: 0,
			shiftKey: 0,
			getModifierState: Pa,
		}),
		sw = Ct(rw),
		iw = Z({}, Br, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }),
		ow = Ct(iw),
		lw = Z({}, mo, {
			deltaX: function (r) {
				return 'deltaX' in r ? r.deltaX : 'wheelDeltaX' in r ? -r.wheelDeltaX : 0;
			},
			deltaY: function (r) {
				return 'deltaY' in r
					? r.deltaY
					: 'wheelDeltaY' in r
						? -r.wheelDeltaY
						: 'wheelDelta' in r
							? -r.wheelDelta
							: 0;
			},
			deltaZ: 0,
			deltaMode: 0,
		}),
		aw = Ct(lw),
		cw = [9, 13, 27, 32],
		Oa = u && 'CompositionEvent' in window,
		Ys = null;
	u && 'documentMode' in document && (Ys = document.documentMode);
	var uw = u && 'TextEvent' in window && !Ys,
		gd = u && (!Oa || (Ys && 8 < Ys && 11 >= Ys)),
		yd = ' ',
		vd = !1;
	function wd(r, i) {
		switch (r) {
			case 'keyup':
				return cw.indexOf(i.keyCode) !== -1;
			case 'keydown':
				return i.keyCode !== 229;
			case 'keypress':
			case 'mousedown':
			case 'focusout':
				return !0;
			default:
				return !1;
		}
	}
	function Sd(r) {
		return (r = r.detail), typeof r == 'object' && 'data' in r ? r.data : null;
	}
	var zr = !1;
	function fw(r, i) {
		switch (r) {
			case 'compositionend':
				return Sd(i);
			case 'keypress':
				return i.which !== 32 ? null : ((vd = !0), yd);
			case 'textInput':
				return (r = i.data), r === yd && vd ? null : r;
			default:
				return null;
		}
	}
	function dw(r, i) {
		if (zr)
			return r === 'compositionend' || (!Oa && wd(r, i))
				? ((r = fd()), (fo = Aa = Rn = null), (zr = !1), r)
				: null;
		switch (r) {
			case 'paste':
				return null;
			case 'keypress':
				if (!(i.ctrlKey || i.altKey || i.metaKey) || (i.ctrlKey && i.altKey)) {
					if (i.char && 1 < i.char.length) return i.char;
					if (i.which) return String.fromCharCode(i.which);
				}
				return null;
			case 'compositionend':
				return gd && i.locale !== 'ko' ? null : i.data;
			default:
				return null;
		}
	}
	var hw = {
		color: !0,
		date: !0,
		datetime: !0,
		'datetime-local': !0,
		email: !0,
		month: !0,
		number: !0,
		password: !0,
		range: !0,
		search: !0,
		tel: !0,
		text: !0,
		time: !0,
		url: !0,
		week: !0,
	};
	function xd(r) {
		var i = r && r.nodeName && r.nodeName.toLowerCase();
		return i === 'input' ? !!hw[r.type] : i === 'textarea';
	}
	function _d(r, i, a, f) {
		Hf(f),
			(i = So(i, 'onChange')),
			0 < i.length &&
				((a = new Ia('onChange', 'change', null, a, f)), r.push({ event: a, listeners: i }));
	}
	var Zs = null,
		ei = null;
	function pw(r) {
		Bd(r, 0);
	}
	function go(r) {
		var i = Wr(r);
		if (jr(i)) return r;
	}
	function mw(r, i) {
		if (r === 'change') return i;
	}
	var Ed = !1;
	if (u) {
		var $a;
		if (u) {
			var Ra = 'oninput' in document;
			if (!Ra) {
				var kd = document.createElement('div');
				kd.setAttribute('oninput', 'return;'), (Ra = typeof kd.oninput == 'function');
			}
			$a = Ra;
		} else $a = !1;
		Ed = $a && (!document.documentMode || 9 < document.documentMode);
	}
	function bd() {
		Zs && (Zs.detachEvent('onpropertychange', Td), (ei = Zs = null));
	}
	function Td(r) {
		if (r.propertyName === 'value' && go(ei)) {
			var i = [];
			_d(i, ei, r, ga(r)), Wf(pw, i);
		}
	}
	function gw(r, i, a) {
		r === 'focusin'
			? (bd(), (Zs = i), (ei = a), Zs.attachEvent('onpropertychange', Td))
			: r === 'focusout' && bd();
	}
	function yw(r) {
		if (r === 'selectionchange' || r === 'keyup' || r === 'keydown') return go(ei);
	}
	function vw(r, i) {
		if (r === 'click') return go(i);
	}
	function ww(r, i) {
		if (r === 'input' || r === 'change') return go(i);
	}
	function Sw(r, i) {
		return (r === i && (r !== 0 || 1 / r === 1 / i)) || (r !== r && i !== i);
	}
	var Kt = typeof Object.is == 'function' ? Object.is : Sw;
	function ti(r, i) {
		if (Kt(r, i)) return !0;
		if (typeof r != 'object' || r === null || typeof i != 'object' || i === null) return !1;
		var a = Object.keys(r),
			f = Object.keys(i);
		if (a.length !== f.length) return !1;
		for (f = 0; f < a.length; f++) {
			var h = a[f];
			if (!d.call(i, h) || !Kt(r[h], i[h])) return !1;
		}
		return !0;
	}
	function Cd(r) {
		for (; r && r.firstChild; ) r = r.firstChild;
		return r;
	}
	function Nd(r, i) {
		var a = Cd(r);
		r = 0;
		for (var f; a; ) {
			if (a.nodeType === 3) {
				if (((f = r + a.textContent.length), r <= i && f >= i)) return { node: a, offset: i - r };
				r = f;
			}
			e: {
				for (; a; ) {
					if (a.nextSibling) {
						a = a.nextSibling;
						break e;
					}
					a = a.parentNode;
				}
				a = void 0;
			}
			a = Cd(a);
		}
	}
	function Ad(r, i) {
		return r && i
			? r === i
				? !0
				: r && r.nodeType === 3
					? !1
					: i && i.nodeType === 3
						? Ad(r, i.parentNode)
						: 'contains' in r
							? r.contains(i)
							: r.compareDocumentPosition
								? !!(r.compareDocumentPosition(i) & 16)
								: !1
			: !1;
	}
	function Id() {
		for (var r = window, i = ir(); i instanceof r.HTMLIFrameElement; ) {
			try {
				var a = typeof i.contentWindow.location.href == 'string';
			} catch {
				a = !1;
			}
			if (a) r = i.contentWindow;
			else break;
			i = ir(r.document);
		}
		return i;
	}
	function Da(r) {
		var i = r && r.nodeName && r.nodeName.toLowerCase();
		return (
			i &&
			((i === 'input' &&
				(r.type === 'text' ||
					r.type === 'search' ||
					r.type === 'tel' ||
					r.type === 'url' ||
					r.type === 'password')) ||
				i === 'textarea' ||
				r.contentEditable === 'true')
		);
	}
	function xw(r) {
		var i = Id(),
			a = r.focusedElem,
			f = r.selectionRange;
		if (i !== a && a && a.ownerDocument && Ad(a.ownerDocument.documentElement, a)) {
			if (f !== null && Da(a)) {
				if (((i = f.start), (r = f.end), r === void 0 && (r = i), 'selectionStart' in a))
					(a.selectionStart = i), (a.selectionEnd = Math.min(r, a.value.length));
				else if (
					((r = ((i = a.ownerDocument || document) && i.defaultView) || window), r.getSelection)
				) {
					r = r.getSelection();
					var h = a.textContent.length,
						m = Math.min(f.start, h);
					(f = f.end === void 0 ? m : Math.min(f.end, h)),
						!r.extend && m > f && ((h = f), (f = m), (m = h)),
						(h = Nd(a, m));
					var x = Nd(a, f);
					h &&
						x &&
						(r.rangeCount !== 1 ||
							r.anchorNode !== h.node ||
							r.anchorOffset !== h.offset ||
							r.focusNode !== x.node ||
							r.focusOffset !== x.offset) &&
						((i = i.createRange()),
						i.setStart(h.node, h.offset),
						r.removeAllRanges(),
						m > f
							? (r.addRange(i), r.extend(x.node, x.offset))
							: (i.setEnd(x.node, x.offset), r.addRange(i)));
				}
			}
			for (i = [], r = a; (r = r.parentNode); )
				r.nodeType === 1 && i.push({ element: r, left: r.scrollLeft, top: r.scrollTop });
			for (typeof a.focus == 'function' && a.focus(), a = 0; a < i.length; a++)
				(r = i[a]), (r.element.scrollLeft = r.left), (r.element.scrollTop = r.top);
		}
	}
	var _w = u && 'documentMode' in document && 11 >= document.documentMode,
		Hr = null,
		Fa = null,
		ni = null,
		Ba = !1;
	function Ld(r, i, a) {
		var f = a.window === a ? a.document : a.nodeType === 9 ? a : a.ownerDocument;
		Ba ||
			Hr == null ||
			Hr !== ir(f) ||
			((f = Hr),
			'selectionStart' in f && Da(f)
				? (f = { start: f.selectionStart, end: f.selectionEnd })
				: ((f = ((f.ownerDocument && f.ownerDocument.defaultView) || window).getSelection()),
					(f = {
						anchorNode: f.anchorNode,
						anchorOffset: f.anchorOffset,
						focusNode: f.focusNode,
						focusOffset: f.focusOffset,
					})),
			(ni && ti(ni, f)) ||
				((ni = f),
				(f = So(Fa, 'onSelect')),
				0 < f.length &&
					((i = new Ia('onSelect', 'select', null, i, a)),
					r.push({ event: i, listeners: f }),
					(i.target = Hr))));
	}
	function yo(r, i) {
		var a = {};
		return (
			(a[r.toLowerCase()] = i.toLowerCase()),
			(a['Webkit' + r] = 'webkit' + i),
			(a['Moz' + r] = 'moz' + i),
			a
		);
	}
	var Ur = {
			animationend: yo('Animation', 'AnimationEnd'),
			animationiteration: yo('Animation', 'AnimationIteration'),
			animationstart: yo('Animation', 'AnimationStart'),
			transitionend: yo('Transition', 'TransitionEnd'),
		},
		za = {},
		Md = {};
	u &&
		((Md = document.createElement('div').style),
		'AnimationEvent' in window ||
			(delete Ur.animationend.animation,
			delete Ur.animationiteration.animation,
			delete Ur.animationstart.animation),
		'TransitionEvent' in window || delete Ur.transitionend.transition);
	function vo(r) {
		if (za[r]) return za[r];
		if (!Ur[r]) return r;
		var i = Ur[r],
			a;
		for (a in i) if (i.hasOwnProperty(a) && a in Md) return (za[r] = i[a]);
		return r;
	}
	var jd = vo('animationend'),
		Pd = vo('animationiteration'),
		Od = vo('animationstart'),
		$d = vo('transitionend'),
		Rd = new Map(),
		Dd =
			'abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel'.split(
				' ',
			);
	function Dn(r, i) {
		Rd.set(r, i), l(i, [r]);
	}
	for (var Ha = 0; Ha < Dd.length; Ha++) {
		var Ua = Dd[Ha],
			Ew = Ua.toLowerCase(),
			kw = Ua[0].toUpperCase() + Ua.slice(1);
		Dn(Ew, 'on' + kw);
	}
	Dn(jd, 'onAnimationEnd'),
		Dn(Pd, 'onAnimationIteration'),
		Dn(Od, 'onAnimationStart'),
		Dn('dblclick', 'onDoubleClick'),
		Dn('focusin', 'onFocus'),
		Dn('focusout', 'onBlur'),
		Dn($d, 'onTransitionEnd'),
		c('onMouseEnter', ['mouseout', 'mouseover']),
		c('onMouseLeave', ['mouseout', 'mouseover']),
		c('onPointerEnter', ['pointerout', 'pointerover']),
		c('onPointerLeave', ['pointerout', 'pointerover']),
		l('onChange', 'change click focusin focusout input keydown keyup selectionchange'.split(' ')),
		l(
			'onSelect',
			'focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange'.split(
				' ',
			),
		),
		l('onBeforeInput', ['compositionend', 'keypress', 'textInput', 'paste']),
		l('onCompositionEnd', 'compositionend focusout keydown keypress keyup mousedown'.split(' ')),
		l(
			'onCompositionStart',
			'compositionstart focusout keydown keypress keyup mousedown'.split(' '),
		),
		l(
			'onCompositionUpdate',
			'compositionupdate focusout keydown keypress keyup mousedown'.split(' '),
		);
	var ri =
			'abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting'.split(
				' ',
			),
		bw = new Set('cancel close invalid load scroll toggle'.split(' ').concat(ri));
	function Fd(r, i, a) {
		var f = r.type || 'unknown-event';
		(r.currentTarget = a), Ev(f, i, void 0, r), (r.currentTarget = null);
	}
	function Bd(r, i) {
		i = (i & 4) !== 0;
		for (var a = 0; a < r.length; a++) {
			var f = r[a],
				h = f.event;
			f = f.listeners;
			e: {
				var m = void 0;
				if (i)
					for (var x = f.length - 1; 0 <= x; x--) {
						var b = f[x],
							T = b.instance,
							P = b.currentTarget;
						if (((b = b.listener), T !== m && h.isPropagationStopped())) break e;
						Fd(h, b, P), (m = T);
					}
				else
					for (x = 0; x < f.length; x++) {
						if (
							((b = f[x]),
							(T = b.instance),
							(P = b.currentTarget),
							(b = b.listener),
							T !== m && h.isPropagationStopped())
						)
							break e;
						Fd(h, b, P), (m = T);
					}
			}
		}
		if (to) throw ((r = Sa), (to = !1), (Sa = null), r);
	}
	function Ce(r, i) {
		var a = i[Xa];
		a === void 0 && (a = i[Xa] = new Set());
		var f = r + '__bubble';
		a.has(f) || (zd(i, r, 2, !1), a.add(f));
	}
	function qa(r, i, a) {
		var f = 0;
		i && (f |= 4), zd(a, r, f, i);
	}
	var wo = '_reactListening' + Math.random().toString(36).slice(2);
	function si(r) {
		if (!r[wo]) {
			(r[wo] = !0),
				s.forEach(function (a) {
					a !== 'selectionchange' && (bw.has(a) || qa(a, !1, r), qa(a, !0, r));
				});
			var i = r.nodeType === 9 ? r : r.ownerDocument;
			i === null || i[wo] || ((i[wo] = !0), qa('selectionchange', !1, i));
		}
	}
	function zd(r, i, a, f) {
		switch (ud(i)) {
			case 1:
				var h = Fv;
				break;
			case 4:
				h = Bv;
				break;
			default:
				h = Ca;
		}
		(a = h.bind(null, i, a, r)),
			(h = void 0),
			!wa || (i !== 'touchstart' && i !== 'touchmove' && i !== 'wheel') || (h = !0),
			f
				? h !== void 0
					? r.addEventListener(i, a, { capture: !0, passive: h })
					: r.addEventListener(i, a, !0)
				: h !== void 0
					? r.addEventListener(i, a, { passive: h })
					: r.addEventListener(i, a, !1);
	}
	function Va(r, i, a, f, h) {
		var m = f;
		if ((i & 1) === 0 && (i & 2) === 0 && f !== null)
			e: for (;;) {
				if (f === null) return;
				var x = f.tag;
				if (x === 3 || x === 4) {
					var b = f.stateNode.containerInfo;
					if (b === h || (b.nodeType === 8 && b.parentNode === h)) break;
					if (x === 4)
						for (x = f.return; x !== null; ) {
							var T = x.tag;
							if (
								(T === 3 || T === 4) &&
								((T = x.stateNode.containerInfo),
								T === h || (T.nodeType === 8 && T.parentNode === h))
							)
								return;
							x = x.return;
						}
					for (; b !== null; ) {
						if (((x = lr(b)), x === null)) return;
						if (((T = x.tag), T === 5 || T === 6)) {
							f = m = x;
							continue e;
						}
						b = b.parentNode;
					}
				}
				f = f.return;
			}
		Wf(function () {
			var P = m,
				V = ga(a),
				W = [];
			e: {
				var U = Rd.get(r);
				if (U !== void 0) {
					var Y = Ia,
						te = r;
					switch (r) {
						case 'keypress':
							if (ho(a) === 0) break e;
						case 'keydown':
						case 'keyup':
							Y = tw;
							break;
						case 'focusin':
							(te = 'focus'), (Y = ja);
							break;
						case 'focusout':
							(te = 'blur'), (Y = ja);
							break;
						case 'beforeblur':
						case 'afterblur':
							Y = ja;
							break;
						case 'click':
							if (a.button === 2) break e;
						case 'auxclick':
						case 'dblclick':
						case 'mousedown':
						case 'mousemove':
						case 'mouseup':
						case 'mouseout':
						case 'mouseover':
						case 'contextmenu':
							Y = hd;
							break;
						case 'drag':
						case 'dragend':
						case 'dragenter':
						case 'dragexit':
						case 'dragleave':
						case 'dragover':
						case 'dragstart':
						case 'drop':
							Y = Uv;
							break;
						case 'touchcancel':
						case 'touchend':
						case 'touchmove':
						case 'touchstart':
							Y = sw;
							break;
						case jd:
						case Pd:
						case Od:
							Y = Wv;
							break;
						case $d:
							Y = ow;
							break;
						case 'scroll':
							Y = zv;
							break;
						case 'wheel':
							Y = aw;
							break;
						case 'copy':
						case 'cut':
						case 'paste':
							Y = Gv;
							break;
						case 'gotpointercapture':
						case 'lostpointercapture':
						case 'pointercancel':
						case 'pointerdown':
						case 'pointermove':
						case 'pointerout':
						case 'pointerover':
						case 'pointerup':
							Y = md;
					}
					var ne = (i & 4) !== 0,
						Be = !ne && r === 'scroll',
						L = ne ? (U !== null ? U + 'Capture' : null) : U;
					ne = [];
					for (var N = P, j; N !== null; ) {
						j = N;
						var Q = j.stateNode;
						if (
							(j.tag === 5 &&
								Q !== null &&
								((j = Q), L !== null && ((Q = Bs(N, L)), Q != null && ne.push(ii(N, Q, j)))),
							Be)
						)
							break;
						N = N.return;
					}
					0 < ne.length && ((U = new Y(U, te, null, a, V)), W.push({ event: U, listeners: ne }));
				}
			}
			if ((i & 7) === 0) {
				e: {
					if (
						((U = r === 'mouseover' || r === 'pointerover'),
						(Y = r === 'mouseout' || r === 'pointerout'),
						U && a !== ma && (te = a.relatedTarget || a.fromElement) && (lr(te) || te[pn]))
					)
						break e;
					if (
						(Y || U) &&
						((U =
							V.window === V
								? V
								: (U = V.ownerDocument)
									? U.defaultView || U.parentWindow
									: window),
						Y
							? ((te = a.relatedTarget || a.toElement),
								(Y = P),
								(te = te ? lr(te) : null),
								te !== null &&
									((Be = or(te)), te !== Be || (te.tag !== 5 && te.tag !== 6)) &&
									(te = null))
							: ((Y = null), (te = P)),
						Y !== te)
					) {
						if (
							((ne = hd),
							(Q = 'onMouseLeave'),
							(L = 'onMouseEnter'),
							(N = 'mouse'),
							(r === 'pointerout' || r === 'pointerover') &&
								((ne = md), (Q = 'onPointerLeave'), (L = 'onPointerEnter'), (N = 'pointer')),
							(Be = Y == null ? U : Wr(Y)),
							(j = te == null ? U : Wr(te)),
							(U = new ne(Q, N + 'leave', Y, a, V)),
							(U.target = Be),
							(U.relatedTarget = j),
							(Q = null),
							lr(V) === P &&
								((ne = new ne(L, N + 'enter', te, a, V)),
								(ne.target = j),
								(ne.relatedTarget = Be),
								(Q = ne)),
							(Be = Q),
							Y && te)
						)
							t: {
								for (ne = Y, L = te, N = 0, j = ne; j; j = qr(j)) N++;
								for (j = 0, Q = L; Q; Q = qr(Q)) j++;
								for (; 0 < N - j; ) (ne = qr(ne)), N--;
								for (; 0 < j - N; ) (L = qr(L)), j--;
								for (; N--; ) {
									if (ne === L || (L !== null && ne === L.alternate)) break t;
									(ne = qr(ne)), (L = qr(L));
								}
								ne = null;
							}
						else ne = null;
						Y !== null && Hd(W, U, Y, ne, !1), te !== null && Be !== null && Hd(W, Be, te, ne, !0);
					}
				}
				e: {
					if (
						((U = P ? Wr(P) : window),
						(Y = U.nodeName && U.nodeName.toLowerCase()),
						Y === 'select' || (Y === 'input' && U.type === 'file'))
					)
						var re = mw;
					else if (xd(U))
						if (Ed) re = ww;
						else {
							re = yw;
							var ie = gw;
						}
					else
						(Y = U.nodeName) &&
							Y.toLowerCase() === 'input' &&
							(U.type === 'checkbox' || U.type === 'radio') &&
							(re = vw);
					if (re && (re = re(r, P))) {
						_d(W, re, a, V);
						break e;
					}
					ie && ie(r, U, P),
						r === 'focusout' &&
							(ie = U._wrapperState) &&
							ie.controlled &&
							U.type === 'number' &&
							Ds(U, 'number', U.value);
				}
				switch (((ie = P ? Wr(P) : window), r)) {
					case 'focusin':
						(xd(ie) || ie.contentEditable === 'true') && ((Hr = ie), (Fa = P), (ni = null));
						break;
					case 'focusout':
						ni = Fa = Hr = null;
						break;
					case 'mousedown':
						Ba = !0;
						break;
					case 'contextmenu':
					case 'mouseup':
					case 'dragend':
						(Ba = !1), Ld(W, a, V);
						break;
					case 'selectionchange':
						if (_w) break;
					case 'keydown':
					case 'keyup':
						Ld(W, a, V);
				}
				var oe;
				if (Oa)
					e: {
						switch (r) {
							case 'compositionstart':
								var ae = 'onCompositionStart';
								break e;
							case 'compositionend':
								ae = 'onCompositionEnd';
								break e;
							case 'compositionupdate':
								ae = 'onCompositionUpdate';
								break e;
						}
						ae = void 0;
					}
				else
					zr
						? wd(r, a) && (ae = 'onCompositionEnd')
						: r === 'keydown' && a.keyCode === 229 && (ae = 'onCompositionStart');
				ae &&
					(gd &&
						a.locale !== 'ko' &&
						(zr || ae !== 'onCompositionStart'
							? ae === 'onCompositionEnd' && zr && (oe = fd())
							: ((Rn = V), (Aa = 'value' in Rn ? Rn.value : Rn.textContent), (zr = !0))),
					(ie = So(P, ae)),
					0 < ie.length &&
						((ae = new pd(ae, r, null, a, V)),
						W.push({ event: ae, listeners: ie }),
						oe ? (ae.data = oe) : ((oe = Sd(a)), oe !== null && (ae.data = oe)))),
					(oe = uw ? fw(r, a) : dw(r, a)) &&
						((P = So(P, 'onBeforeInput')),
						0 < P.length &&
							((V = new pd('onBeforeInput', 'beforeinput', null, a, V)),
							W.push({ event: V, listeners: P }),
							(V.data = oe)));
			}
			Bd(W, i);
		});
	}
	function ii(r, i, a) {
		return { instance: r, listener: i, currentTarget: a };
	}
	function So(r, i) {
		for (var a = i + 'Capture', f = []; r !== null; ) {
			var h = r,
				m = h.stateNode;
			h.tag === 5 &&
				m !== null &&
				((h = m),
				(m = Bs(r, a)),
				m != null && f.unshift(ii(r, m, h)),
				(m = Bs(r, i)),
				m != null && f.push(ii(r, m, h))),
				(r = r.return);
		}
		return f;
	}
	function qr(r) {
		if (r === null) return null;
		do r = r.return;
		while (r && r.tag !== 5);
		return r || null;
	}
	function Hd(r, i, a, f, h) {
		for (var m = i._reactName, x = []; a !== null && a !== f; ) {
			var b = a,
				T = b.alternate,
				P = b.stateNode;
			if (T !== null && T === f) break;
			b.tag === 5 &&
				P !== null &&
				((b = P),
				h
					? ((T = Bs(a, m)), T != null && x.unshift(ii(a, T, b)))
					: h || ((T = Bs(a, m)), T != null && x.push(ii(a, T, b)))),
				(a = a.return);
		}
		x.length !== 0 && r.push({ event: i, listeners: x });
	}
	var Tw = /\r\n?/g,
		Cw = /\u0000|\uFFFD/g;
	function Ud(r) {
		return (typeof r == 'string' ? r : '' + r)
			.replace(
				Tw,
				`
`,
			)
			.replace(Cw, '');
	}
	function xo(r, i, a) {
		if (((i = Ud(i)), Ud(r) !== i && a)) throw Error(n(425));
	}
	function _o() {}
	var Wa = null,
		Ka = null;
	function Ga(r, i) {
		return (
			r === 'textarea' ||
			r === 'noscript' ||
			typeof i.children == 'string' ||
			typeof i.children == 'number' ||
			(typeof i.dangerouslySetInnerHTML == 'object' &&
				i.dangerouslySetInnerHTML !== null &&
				i.dangerouslySetInnerHTML.__html != null)
		);
	}
	var Qa = typeof setTimeout == 'function' ? setTimeout : void 0,
		Nw = typeof clearTimeout == 'function' ? clearTimeout : void 0,
		qd = typeof Promise == 'function' ? Promise : void 0,
		Aw =
			typeof queueMicrotask == 'function'
				? queueMicrotask
				: typeof qd < 'u'
					? function (r) {
							return qd.resolve(null).then(r).catch(Iw);
						}
					: Qa;
	function Iw(r) {
		setTimeout(function () {
			throw r;
		});
	}
	function Ja(r, i) {
		var a = i,
			f = 0;
		do {
			var h = a.nextSibling;
			if ((r.removeChild(a), h && h.nodeType === 8))
				if (((a = h.data), a === '/$')) {
					if (f === 0) {
						r.removeChild(h), Qs(i);
						return;
					}
					f--;
				} else (a !== '$' && a !== '$?' && a !== '$!') || f++;
			a = h;
		} while (a);
		Qs(i);
	}
	function Fn(r) {
		for (; r != null; r = r.nextSibling) {
			var i = r.nodeType;
			if (i === 1 || i === 3) break;
			if (i === 8) {
				if (((i = r.data), i === '$' || i === '$!' || i === '$?')) break;
				if (i === '/$') return null;
			}
		}
		return r;
	}
	function Vd(r) {
		r = r.previousSibling;
		for (var i = 0; r; ) {
			if (r.nodeType === 8) {
				var a = r.data;
				if (a === '$' || a === '$!' || a === '$?') {
					if (i === 0) return r;
					i--;
				} else a === '/$' && i++;
			}
			r = r.previousSibling;
		}
		return null;
	}
	var Vr = Math.random().toString(36).slice(2),
		on = '__reactFiber$' + Vr,
		oi = '__reactProps$' + Vr,
		pn = '__reactContainer$' + Vr,
		Xa = '__reactEvents$' + Vr,
		Lw = '__reactListeners$' + Vr,
		Mw = '__reactHandles$' + Vr;
	function lr(r) {
		var i = r[on];
		if (i) return i;
		for (var a = r.parentNode; a; ) {
			if ((i = a[pn] || a[on])) {
				if (((a = i.alternate), i.child !== null || (a !== null && a.child !== null)))
					for (r = Vd(r); r !== null; ) {
						if ((a = r[on])) return a;
						r = Vd(r);
					}
				return i;
			}
			(r = a), (a = r.parentNode);
		}
		return null;
	}
	function li(r) {
		return (
			(r = r[on] || r[pn]),
			!r || (r.tag !== 5 && r.tag !== 6 && r.tag !== 13 && r.tag !== 3) ? null : r
		);
	}
	function Wr(r) {
		if (r.tag === 5 || r.tag === 6) return r.stateNode;
		throw Error(n(33));
	}
	function Eo(r) {
		return r[oi] || null;
	}
	var Ya = [],
		Kr = -1;
	function Bn(r) {
		return { current: r };
	}
	function Ne(r) {
		0 > Kr || ((r.current = Ya[Kr]), (Ya[Kr] = null), Kr--);
	}
	function Te(r, i) {
		Kr++, (Ya[Kr] = r.current), (r.current = i);
	}
	var zn = {},
		nt = Bn(zn),
		gt = Bn(!1),
		ar = zn;
	function Gr(r, i) {
		var a = r.type.contextTypes;
		if (!a) return zn;
		var f = r.stateNode;
		if (f && f.__reactInternalMemoizedUnmaskedChildContext === i)
			return f.__reactInternalMemoizedMaskedChildContext;
		var h = {},
			m;
		for (m in a) h[m] = i[m];
		return (
			f &&
				((r = r.stateNode),
				(r.__reactInternalMemoizedUnmaskedChildContext = i),
				(r.__reactInternalMemoizedMaskedChildContext = h)),
			h
		);
	}
	function yt(r) {
		return (r = r.childContextTypes), r != null;
	}
	function ko() {
		Ne(gt), Ne(nt);
	}
	function Wd(r, i, a) {
		if (nt.current !== zn) throw Error(n(168));
		Te(nt, i), Te(gt, a);
	}
	function Kd(r, i, a) {
		var f = r.stateNode;
		if (((i = i.childContextTypes), typeof f.getChildContext != 'function')) return a;
		f = f.getChildContext();
		for (var h in f) if (!(h in i)) throw Error(n(108, Se(r) || 'Unknown', h));
		return Z({}, a, f);
	}
	function bo(r) {
		return (
			(r = ((r = r.stateNode) && r.__reactInternalMemoizedMergedChildContext) || zn),
			(ar = nt.current),
			Te(nt, r),
			Te(gt, gt.current),
			!0
		);
	}
	function Gd(r, i, a) {
		var f = r.stateNode;
		if (!f) throw Error(n(169));
		a
			? ((r = Kd(r, i, ar)),
				(f.__reactInternalMemoizedMergedChildContext = r),
				Ne(gt),
				Ne(nt),
				Te(nt, r))
			: Ne(gt),
			Te(gt, a);
	}
	var mn = null,
		To = !1,
		Za = !1;
	function Qd(r) {
		mn === null ? (mn = [r]) : mn.push(r);
	}
	function jw(r) {
		(To = !0), Qd(r);
	}
	function Hn() {
		if (!Za && mn !== null) {
			Za = !0;
			var r = 0,
				i = xe;
			try {
				var a = mn;
				for (xe = 1; r < a.length; r++) {
					var f = a[r];
					do f = f(!0);
					while (f !== null);
				}
				(mn = null), (To = !1);
			} catch (h) {
				throw (mn !== null && (mn = mn.slice(r + 1)), Xf(xa, Hn), h);
			} finally {
				(xe = i), (Za = !1);
			}
		}
		return null;
	}
	var Qr = [],
		Jr = 0,
		Co = null,
		No = 0,
		Pt = [],
		Ot = 0,
		cr = null,
		gn = 1,
		yn = '';
	function ur(r, i) {
		(Qr[Jr++] = No), (Qr[Jr++] = Co), (Co = r), (No = i);
	}
	function Jd(r, i, a) {
		(Pt[Ot++] = gn), (Pt[Ot++] = yn), (Pt[Ot++] = cr), (cr = r);
		var f = gn;
		r = yn;
		var h = 32 - Wt(f) - 1;
		(f &= ~(1 << h)), (a += 1);
		var m = 32 - Wt(i) + h;
		if (30 < m) {
			var x = h - (h % 5);
			(m = (f & ((1 << x) - 1)).toString(32)),
				(f >>= x),
				(h -= x),
				(gn = (1 << (32 - Wt(i) + h)) | (a << h) | f),
				(yn = m + r);
		} else (gn = (1 << m) | (a << h) | f), (yn = r);
	}
	function ec(r) {
		r.return !== null && (ur(r, 1), Jd(r, 1, 0));
	}
	function tc(r) {
		for (; r === Co; ) (Co = Qr[--Jr]), (Qr[Jr] = null), (No = Qr[--Jr]), (Qr[Jr] = null);
		for (; r === cr; )
			(cr = Pt[--Ot]),
				(Pt[Ot] = null),
				(yn = Pt[--Ot]),
				(Pt[Ot] = null),
				(gn = Pt[--Ot]),
				(Pt[Ot] = null);
	}
	var Nt = null,
		At = null,
		Ie = !1,
		Gt = null;
	function Xd(r, i) {
		var a = Ft(5, null, null, 0);
		(a.elementType = 'DELETED'),
			(a.stateNode = i),
			(a.return = r),
			(i = r.deletions),
			i === null ? ((r.deletions = [a]), (r.flags |= 16)) : i.push(a);
	}
	function Yd(r, i) {
		switch (r.tag) {
			case 5:
				var a = r.type;
				return (
					(i = i.nodeType !== 1 || a.toLowerCase() !== i.nodeName.toLowerCase() ? null : i),
					i !== null ? ((r.stateNode = i), (Nt = r), (At = Fn(i.firstChild)), !0) : !1
				);
			case 6:
				return (
					(i = r.pendingProps === '' || i.nodeType !== 3 ? null : i),
					i !== null ? ((r.stateNode = i), (Nt = r), (At = null), !0) : !1
				);
			case 13:
				return (
					(i = i.nodeType !== 8 ? null : i),
					i !== null
						? ((a = cr !== null ? { id: gn, overflow: yn } : null),
							(r.memoizedState = { dehydrated: i, treeContext: a, retryLane: 1073741824 }),
							(a = Ft(18, null, null, 0)),
							(a.stateNode = i),
							(a.return = r),
							(r.child = a),
							(Nt = r),
							(At = null),
							!0)
						: !1
				);
			default:
				return !1;
		}
	}
	function nc(r) {
		return (r.mode & 1) !== 0 && (r.flags & 128) === 0;
	}
	function rc(r) {
		if (Ie) {
			var i = At;
			if (i) {
				var a = i;
				if (!Yd(r, i)) {
					if (nc(r)) throw Error(n(418));
					i = Fn(a.nextSibling);
					var f = Nt;
					i && Yd(r, i) ? Xd(f, a) : ((r.flags = (r.flags & -4097) | 2), (Ie = !1), (Nt = r));
				}
			} else {
				if (nc(r)) throw Error(n(418));
				(r.flags = (r.flags & -4097) | 2), (Ie = !1), (Nt = r);
			}
		}
	}
	function Zd(r) {
		for (r = r.return; r !== null && r.tag !== 5 && r.tag !== 3 && r.tag !== 13; ) r = r.return;
		Nt = r;
	}
	function Ao(r) {
		if (r !== Nt) return !1;
		if (!Ie) return Zd(r), (Ie = !0), !1;
		var i;
		if (
			((i = r.tag !== 3) &&
				!(i = r.tag !== 5) &&
				((i = r.type), (i = i !== 'head' && i !== 'body' && !Ga(r.type, r.memoizedProps))),
			i && (i = At))
		) {
			if (nc(r)) throw (eh(), Error(n(418)));
			for (; i; ) Xd(r, i), (i = Fn(i.nextSibling));
		}
		if ((Zd(r), r.tag === 13)) {
			if (((r = r.memoizedState), (r = r !== null ? r.dehydrated : null), !r)) throw Error(n(317));
			e: {
				for (r = r.nextSibling, i = 0; r; ) {
					if (r.nodeType === 8) {
						var a = r.data;
						if (a === '/$') {
							if (i === 0) {
								At = Fn(r.nextSibling);
								break e;
							}
							i--;
						} else (a !== '$' && a !== '$!' && a !== '$?') || i++;
					}
					r = r.nextSibling;
				}
				At = null;
			}
		} else At = Nt ? Fn(r.stateNode.nextSibling) : null;
		return !0;
	}
	function eh() {
		for (var r = At; r; ) r = Fn(r.nextSibling);
	}
	function Xr() {
		(At = Nt = null), (Ie = !1);
	}
	function sc(r) {
		Gt === null ? (Gt = [r]) : Gt.push(r);
	}
	var Pw = D.ReactCurrentBatchConfig;
	function ai(r, i, a) {
		if (((r = a.ref), r !== null && typeof r != 'function' && typeof r != 'object')) {
			if (a._owner) {
				if (((a = a._owner), a)) {
					if (a.tag !== 1) throw Error(n(309));
					var f = a.stateNode;
				}
				if (!f) throw Error(n(147, r));
				var h = f,
					m = '' + r;
				return i !== null && i.ref !== null && typeof i.ref == 'function' && i.ref._stringRef === m
					? i.ref
					: ((i = function (x) {
							var b = h.refs;
							x === null ? delete b[m] : (b[m] = x);
						}),
						(i._stringRef = m),
						i);
			}
			if (typeof r != 'string') throw Error(n(284));
			if (!a._owner) throw Error(n(290, r));
		}
		return r;
	}
	function Io(r, i) {
		throw (
			((r = Object.prototype.toString.call(i)),
			Error(
				n(31, r === '[object Object]' ? 'object with keys {' + Object.keys(i).join(', ') + '}' : r),
			))
		);
	}
	function th(r) {
		var i = r._init;
		return i(r._payload);
	}
	function nh(r) {
		function i(L, N) {
			if (r) {
				var j = L.deletions;
				j === null ? ((L.deletions = [N]), (L.flags |= 16)) : j.push(N);
			}
		}
		function a(L, N) {
			if (!r) return null;
			for (; N !== null; ) i(L, N), (N = N.sibling);
			return null;
		}
		function f(L, N) {
			for (L = new Map(); N !== null; )
				N.key !== null ? L.set(N.key, N) : L.set(N.index, N), (N = N.sibling);
			return L;
		}
		function h(L, N) {
			return (L = Jn(L, N)), (L.index = 0), (L.sibling = null), L;
		}
		function m(L, N, j) {
			return (
				(L.index = j),
				r
					? ((j = L.alternate),
						j !== null ? ((j = j.index), j < N ? ((L.flags |= 2), N) : j) : ((L.flags |= 2), N))
					: ((L.flags |= 1048576), N)
			);
		}
		function x(L) {
			return r && L.alternate === null && (L.flags |= 2), L;
		}
		function b(L, N, j, Q) {
			return N === null || N.tag !== 6
				? ((N = Qc(j, L.mode, Q)), (N.return = L), N)
				: ((N = h(N, j)), (N.return = L), N);
		}
		function T(L, N, j, Q) {
			var re = j.type;
			return re === q
				? V(L, N, j.props.children, Q, j.key)
				: N !== null &&
						(N.elementType === re ||
							(typeof re == 'object' && re !== null && re.$$typeof === be && th(re) === N.type))
					? ((Q = h(N, j.props)), (Q.ref = ai(L, N, j)), (Q.return = L), Q)
					: ((Q = el(j.type, j.key, j.props, null, L.mode, Q)),
						(Q.ref = ai(L, N, j)),
						(Q.return = L),
						Q);
		}
		function P(L, N, j, Q) {
			return N === null ||
				N.tag !== 4 ||
				N.stateNode.containerInfo !== j.containerInfo ||
				N.stateNode.implementation !== j.implementation
				? ((N = Jc(j, L.mode, Q)), (N.return = L), N)
				: ((N = h(N, j.children || [])), (N.return = L), N);
		}
		function V(L, N, j, Q, re) {
			return N === null || N.tag !== 7
				? ((N = vr(j, L.mode, Q, re)), (N.return = L), N)
				: ((N = h(N, j)), (N.return = L), N);
		}
		function W(L, N, j) {
			if ((typeof N == 'string' && N !== '') || typeof N == 'number')
				return (N = Qc('' + N, L.mode, j)), (N.return = L), N;
			if (typeof N == 'object' && N !== null) {
				switch (N.$$typeof) {
					case F:
						return (
							(j = el(N.type, N.key, N.props, null, L.mode, j)),
							(j.ref = ai(L, null, N)),
							(j.return = L),
							j
						);
					case z:
						return (N = Jc(N, L.mode, j)), (N.return = L), N;
					case be:
						var Q = N._init;
						return W(L, Q(N._payload), j);
				}
				if (An(N) || se(N)) return (N = vr(N, L.mode, j, null)), (N.return = L), N;
				Io(L, N);
			}
			return null;
		}
		function U(L, N, j, Q) {
			var re = N !== null ? N.key : null;
			if ((typeof j == 'string' && j !== '') || typeof j == 'number')
				return re !== null ? null : b(L, N, '' + j, Q);
			if (typeof j == 'object' && j !== null) {
				switch (j.$$typeof) {
					case F:
						return j.key === re ? T(L, N, j, Q) : null;
					case z:
						return j.key === re ? P(L, N, j, Q) : null;
					case be:
						return (re = j._init), U(L, N, re(j._payload), Q);
				}
				if (An(j) || se(j)) return re !== null ? null : V(L, N, j, Q, null);
				Io(L, j);
			}
			return null;
		}
		function Y(L, N, j, Q, re) {
			if ((typeof Q == 'string' && Q !== '') || typeof Q == 'number')
				return (L = L.get(j) || null), b(N, L, '' + Q, re);
			if (typeof Q == 'object' && Q !== null) {
				switch (Q.$$typeof) {
					case F:
						return (L = L.get(Q.key === null ? j : Q.key) || null), T(N, L, Q, re);
					case z:
						return (L = L.get(Q.key === null ? j : Q.key) || null), P(N, L, Q, re);
					case be:
						var ie = Q._init;
						return Y(L, N, j, ie(Q._payload), re);
				}
				if (An(Q) || se(Q)) return (L = L.get(j) || null), V(N, L, Q, re, null);
				Io(N, Q);
			}
			return null;
		}
		function te(L, N, j, Q) {
			for (
				var re = null, ie = null, oe = N, ae = (N = 0), Je = null;
				oe !== null && ae < j.length;
				ae++
			) {
				oe.index > ae ? ((Je = oe), (oe = null)) : (Je = oe.sibling);
				var we = U(L, oe, j[ae], Q);
				if (we === null) {
					oe === null && (oe = Je);
					break;
				}
				r && oe && we.alternate === null && i(L, oe),
					(N = m(we, N, ae)),
					ie === null ? (re = we) : (ie.sibling = we),
					(ie = we),
					(oe = Je);
			}
			if (ae === j.length) return a(L, oe), Ie && ur(L, ae), re;
			if (oe === null) {
				for (; ae < j.length; ae++)
					(oe = W(L, j[ae], Q)),
						oe !== null &&
							((N = m(oe, N, ae)), ie === null ? (re = oe) : (ie.sibling = oe), (ie = oe));
				return Ie && ur(L, ae), re;
			}
			for (oe = f(L, oe); ae < j.length; ae++)
				(Je = Y(oe, L, ae, j[ae], Q)),
					Je !== null &&
						(r && Je.alternate !== null && oe.delete(Je.key === null ? ae : Je.key),
						(N = m(Je, N, ae)),
						ie === null ? (re = Je) : (ie.sibling = Je),
						(ie = Je));
			return (
				r &&
					oe.forEach(function (Xn) {
						return i(L, Xn);
					}),
				Ie && ur(L, ae),
				re
			);
		}
		function ne(L, N, j, Q) {
			var re = se(j);
			if (typeof re != 'function') throw Error(n(150));
			if (((j = re.call(j)), j == null)) throw Error(n(151));
			for (
				var ie = (re = null), oe = N, ae = (N = 0), Je = null, we = j.next();
				oe !== null && !we.done;
				ae++, we = j.next()
			) {
				oe.index > ae ? ((Je = oe), (oe = null)) : (Je = oe.sibling);
				var Xn = U(L, oe, we.value, Q);
				if (Xn === null) {
					oe === null && (oe = Je);
					break;
				}
				r && oe && Xn.alternate === null && i(L, oe),
					(N = m(Xn, N, ae)),
					ie === null ? (re = Xn) : (ie.sibling = Xn),
					(ie = Xn),
					(oe = Je);
			}
			if (we.done) return a(L, oe), Ie && ur(L, ae), re;
			if (oe === null) {
				for (; !we.done; ae++, we = j.next())
					(we = W(L, we.value, Q)),
						we !== null &&
							((N = m(we, N, ae)), ie === null ? (re = we) : (ie.sibling = we), (ie = we));
				return Ie && ur(L, ae), re;
			}
			for (oe = f(L, oe); !we.done; ae++, we = j.next())
				(we = Y(oe, L, ae, we.value, Q)),
					we !== null &&
						(r && we.alternate !== null && oe.delete(we.key === null ? ae : we.key),
						(N = m(we, N, ae)),
						ie === null ? (re = we) : (ie.sibling = we),
						(ie = we));
			return (
				r &&
					oe.forEach(function (h0) {
						return i(L, h0);
					}),
				Ie && ur(L, ae),
				re
			);
		}
		function Be(L, N, j, Q) {
			if (
				(typeof j == 'object' &&
					j !== null &&
					j.type === q &&
					j.key === null &&
					(j = j.props.children),
				typeof j == 'object' && j !== null)
			) {
				switch (j.$$typeof) {
					case F:
						e: {
							for (var re = j.key, ie = N; ie !== null; ) {
								if (ie.key === re) {
									if (((re = j.type), re === q)) {
										if (ie.tag === 7) {
											a(L, ie.sibling), (N = h(ie, j.props.children)), (N.return = L), (L = N);
											break e;
										}
									} else if (
										ie.elementType === re ||
										(typeof re == 'object' &&
											re !== null &&
											re.$$typeof === be &&
											th(re) === ie.type)
									) {
										a(L, ie.sibling),
											(N = h(ie, j.props)),
											(N.ref = ai(L, ie, j)),
											(N.return = L),
											(L = N);
										break e;
									}
									a(L, ie);
									break;
								} else i(L, ie);
								ie = ie.sibling;
							}
							j.type === q
								? ((N = vr(j.props.children, L.mode, Q, j.key)), (N.return = L), (L = N))
								: ((Q = el(j.type, j.key, j.props, null, L.mode, Q)),
									(Q.ref = ai(L, N, j)),
									(Q.return = L),
									(L = Q));
						}
						return x(L);
					case z:
						e: {
							for (ie = j.key; N !== null; ) {
								if (N.key === ie)
									if (
										N.tag === 4 &&
										N.stateNode.containerInfo === j.containerInfo &&
										N.stateNode.implementation === j.implementation
									) {
										a(L, N.sibling), (N = h(N, j.children || [])), (N.return = L), (L = N);
										break e;
									} else {
										a(L, N);
										break;
									}
								else i(L, N);
								N = N.sibling;
							}
							(N = Jc(j, L.mode, Q)), (N.return = L), (L = N);
						}
						return x(L);
					case be:
						return (ie = j._init), Be(L, N, ie(j._payload), Q);
				}
				if (An(j)) return te(L, N, j, Q);
				if (se(j)) return ne(L, N, j, Q);
				Io(L, j);
			}
			return (typeof j == 'string' && j !== '') || typeof j == 'number'
				? ((j = '' + j),
					N !== null && N.tag === 6
						? (a(L, N.sibling), (N = h(N, j)), (N.return = L), (L = N))
						: (a(L, N), (N = Qc(j, L.mode, Q)), (N.return = L), (L = N)),
					x(L))
				: a(L, N);
		}
		return Be;
	}
	var Yr = nh(!0),
		rh = nh(!1),
		Lo = Bn(null),
		Mo = null,
		Zr = null,
		ic = null;
	function oc() {
		ic = Zr = Mo = null;
	}
	function lc(r) {
		var i = Lo.current;
		Ne(Lo), (r._currentValue = i);
	}
	function ac(r, i, a) {
		for (; r !== null; ) {
			var f = r.alternate;
			if (
				((r.childLanes & i) !== i
					? ((r.childLanes |= i), f !== null && (f.childLanes |= i))
					: f !== null && (f.childLanes & i) !== i && (f.childLanes |= i),
				r === a)
			)
				break;
			r = r.return;
		}
	}
	function es(r, i) {
		(Mo = r),
			(ic = Zr = null),
			(r = r.dependencies),
			r !== null &&
				r.firstContext !== null &&
				((r.lanes & i) !== 0 && (vt = !0), (r.firstContext = null));
	}
	function $t(r) {
		var i = r._currentValue;
		if (ic !== r)
			if (((r = { context: r, memoizedValue: i, next: null }), Zr === null)) {
				if (Mo === null) throw Error(n(308));
				(Zr = r), (Mo.dependencies = { lanes: 0, firstContext: r });
			} else Zr = Zr.next = r;
		return i;
	}
	var fr = null;
	function cc(r) {
		fr === null ? (fr = [r]) : fr.push(r);
	}
	function sh(r, i, a, f) {
		var h = i.interleaved;
		return (
			h === null ? ((a.next = a), cc(i)) : ((a.next = h.next), (h.next = a)),
			(i.interleaved = a),
			vn(r, f)
		);
	}
	function vn(r, i) {
		r.lanes |= i;
		var a = r.alternate;
		for (a !== null && (a.lanes |= i), a = r, r = r.return; r !== null; )
			(r.childLanes |= i),
				(a = r.alternate),
				a !== null && (a.childLanes |= i),
				(a = r),
				(r = r.return);
		return a.tag === 3 ? a.stateNode : null;
	}
	var Un = !1;
	function uc(r) {
		r.updateQueue = {
			baseState: r.memoizedState,
			firstBaseUpdate: null,
			lastBaseUpdate: null,
			shared: { pending: null, interleaved: null, lanes: 0 },
			effects: null,
		};
	}
	function ih(r, i) {
		(r = r.updateQueue),
			i.updateQueue === r &&
				(i.updateQueue = {
					baseState: r.baseState,
					firstBaseUpdate: r.firstBaseUpdate,
					lastBaseUpdate: r.lastBaseUpdate,
					shared: r.shared,
					effects: r.effects,
				});
	}
	function wn(r, i) {
		return { eventTime: r, lane: i, tag: 0, payload: null, callback: null, next: null };
	}
	function qn(r, i, a) {
		var f = r.updateQueue;
		if (f === null) return null;
		if (((f = f.shared), (ve & 2) !== 0)) {
			var h = f.pending;
			return (
				h === null ? (i.next = i) : ((i.next = h.next), (h.next = i)), (f.pending = i), vn(r, a)
			);
		}
		return (
			(h = f.interleaved),
			h === null ? ((i.next = i), cc(f)) : ((i.next = h.next), (h.next = i)),
			(f.interleaved = i),
			vn(r, a)
		);
	}
	function jo(r, i, a) {
		if (((i = i.updateQueue), i !== null && ((i = i.shared), (a & 4194240) !== 0))) {
			var f = i.lanes;
			(f &= r.pendingLanes), (a |= f), (i.lanes = a), ka(r, a);
		}
	}
	function oh(r, i) {
		var a = r.updateQueue,
			f = r.alternate;
		if (f !== null && ((f = f.updateQueue), a === f)) {
			var h = null,
				m = null;
			if (((a = a.firstBaseUpdate), a !== null)) {
				do {
					var x = {
						eventTime: a.eventTime,
						lane: a.lane,
						tag: a.tag,
						payload: a.payload,
						callback: a.callback,
						next: null,
					};
					m === null ? (h = m = x) : (m = m.next = x), (a = a.next);
				} while (a !== null);
				m === null ? (h = m = i) : (m = m.next = i);
			} else h = m = i;
			(a = {
				baseState: f.baseState,
				firstBaseUpdate: h,
				lastBaseUpdate: m,
				shared: f.shared,
				effects: f.effects,
			}),
				(r.updateQueue = a);
			return;
		}
		(r = a.lastBaseUpdate),
			r === null ? (a.firstBaseUpdate = i) : (r.next = i),
			(a.lastBaseUpdate = i);
	}
	function Po(r, i, a, f) {
		var h = r.updateQueue;
		Un = !1;
		var m = h.firstBaseUpdate,
			x = h.lastBaseUpdate,
			b = h.shared.pending;
		if (b !== null) {
			h.shared.pending = null;
			var T = b,
				P = T.next;
			(T.next = null), x === null ? (m = P) : (x.next = P), (x = T);
			var V = r.alternate;
			V !== null &&
				((V = V.updateQueue),
				(b = V.lastBaseUpdate),
				b !== x && (b === null ? (V.firstBaseUpdate = P) : (b.next = P), (V.lastBaseUpdate = T)));
		}
		if (m !== null) {
			var W = h.baseState;
			(x = 0), (V = P = T = null), (b = m);
			do {
				var U = b.lane,
					Y = b.eventTime;
				if ((f & U) === U) {
					V !== null &&
						(V = V.next =
							{
								eventTime: Y,
								lane: 0,
								tag: b.tag,
								payload: b.payload,
								callback: b.callback,
								next: null,
							});
					e: {
						var te = r,
							ne = b;
						switch (((U = i), (Y = a), ne.tag)) {
							case 1:
								if (((te = ne.payload), typeof te == 'function')) {
									W = te.call(Y, W, U);
									break e;
								}
								W = te;
								break e;
							case 3:
								te.flags = (te.flags & -65537) | 128;
							case 0:
								if (
									((te = ne.payload),
									(U = typeof te == 'function' ? te.call(Y, W, U) : te),
									U == null)
								)
									break e;
								W = Z({}, W, U);
								break e;
							case 2:
								Un = !0;
						}
					}
					b.callback !== null &&
						b.lane !== 0 &&
						((r.flags |= 64), (U = h.effects), U === null ? (h.effects = [b]) : U.push(b));
				} else
					(Y = {
						eventTime: Y,
						lane: U,
						tag: b.tag,
						payload: b.payload,
						callback: b.callback,
						next: null,
					}),
						V === null ? ((P = V = Y), (T = W)) : (V = V.next = Y),
						(x |= U);
				if (((b = b.next), b === null)) {
					if (((b = h.shared.pending), b === null)) break;
					(U = b), (b = U.next), (U.next = null), (h.lastBaseUpdate = U), (h.shared.pending = null);
				}
			} while (!0);
			if (
				(V === null && (T = W),
				(h.baseState = T),
				(h.firstBaseUpdate = P),
				(h.lastBaseUpdate = V),
				(i = h.shared.interleaved),
				i !== null)
			) {
				h = i;
				do (x |= h.lane), (h = h.next);
				while (h !== i);
			} else m === null && (h.shared.lanes = 0);
			(pr |= x), (r.lanes = x), (r.memoizedState = W);
		}
	}
	function lh(r, i, a) {
		if (((r = i.effects), (i.effects = null), r !== null))
			for (i = 0; i < r.length; i++) {
				var f = r[i],
					h = f.callback;
				if (h !== null) {
					if (((f.callback = null), (f = a), typeof h != 'function')) throw Error(n(191, h));
					h.call(f);
				}
			}
	}
	var ci = {},
		ln = Bn(ci),
		ui = Bn(ci),
		fi = Bn(ci);
	function dr(r) {
		if (r === ci) throw Error(n(174));
		return r;
	}
	function fc(r, i) {
		switch ((Te(fi, i), Te(ui, r), Te(ln, ci), (r = i.nodeType), r)) {
			case 9:
			case 11:
				i = (i = i.documentElement) ? i.namespaceURI : Ln(null, '');
				break;
			default:
				(r = r === 8 ? i.parentNode : i),
					(i = r.namespaceURI || null),
					(r = r.tagName),
					(i = Ln(i, r));
		}
		Ne(ln), Te(ln, i);
	}
	function ts() {
		Ne(ln), Ne(ui), Ne(fi);
	}
	function ah(r) {
		dr(fi.current);
		var i = dr(ln.current),
			a = Ln(i, r.type);
		i !== a && (Te(ui, r), Te(ln, a));
	}
	function dc(r) {
		ui.current === r && (Ne(ln), Ne(ui));
	}
	var je = Bn(0);
	function Oo(r) {
		for (var i = r; i !== null; ) {
			if (i.tag === 13) {
				var a = i.memoizedState;
				if (a !== null && ((a = a.dehydrated), a === null || a.data === '$?' || a.data === '$!'))
					return i;
			} else if (i.tag === 19 && i.memoizedProps.revealOrder !== void 0) {
				if ((i.flags & 128) !== 0) return i;
			} else if (i.child !== null) {
				(i.child.return = i), (i = i.child);
				continue;
			}
			if (i === r) break;
			for (; i.sibling === null; ) {
				if (i.return === null || i.return === r) return null;
				i = i.return;
			}
			(i.sibling.return = i.return), (i = i.sibling);
		}
		return null;
	}
	var hc = [];
	function pc() {
		for (var r = 0; r < hc.length; r++) hc[r]._workInProgressVersionPrimary = null;
		hc.length = 0;
	}
	var $o = D.ReactCurrentDispatcher,
		mc = D.ReactCurrentBatchConfig,
		hr = 0,
		Pe = null,
		Ve = null,
		Ge = null,
		Ro = !1,
		di = !1,
		hi = 0,
		Ow = 0;
	function rt() {
		throw Error(n(321));
	}
	function gc(r, i) {
		if (i === null) return !1;
		for (var a = 0; a < i.length && a < r.length; a++) if (!Kt(r[a], i[a])) return !1;
		return !0;
	}
	function yc(r, i, a, f, h, m) {
		if (
			((hr = m),
			(Pe = i),
			(i.memoizedState = null),
			(i.updateQueue = null),
			(i.lanes = 0),
			($o.current = r === null || r.memoizedState === null ? Fw : Bw),
			(r = a(f, h)),
			di)
		) {
			m = 0;
			do {
				if (((di = !1), (hi = 0), 25 <= m)) throw Error(n(301));
				(m += 1), (Ge = Ve = null), (i.updateQueue = null), ($o.current = zw), (r = a(f, h));
			} while (di);
		}
		if (
			(($o.current = Bo),
			(i = Ve !== null && Ve.next !== null),
			(hr = 0),
			(Ge = Ve = Pe = null),
			(Ro = !1),
			i)
		)
			throw Error(n(300));
		return r;
	}
	function vc() {
		var r = hi !== 0;
		return (hi = 0), r;
	}
	function an() {
		var r = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
		return Ge === null ? (Pe.memoizedState = Ge = r) : (Ge = Ge.next = r), Ge;
	}
	function Rt() {
		if (Ve === null) {
			var r = Pe.alternate;
			r = r !== null ? r.memoizedState : null;
		} else r = Ve.next;
		var i = Ge === null ? Pe.memoizedState : Ge.next;
		if (i !== null) (Ge = i), (Ve = r);
		else {
			if (r === null) throw Error(n(310));
			(Ve = r),
				(r = {
					memoizedState: Ve.memoizedState,
					baseState: Ve.baseState,
					baseQueue: Ve.baseQueue,
					queue: Ve.queue,
					next: null,
				}),
				Ge === null ? (Pe.memoizedState = Ge = r) : (Ge = Ge.next = r);
		}
		return Ge;
	}
	function pi(r, i) {
		return typeof i == 'function' ? i(r) : i;
	}
	function wc(r) {
		var i = Rt(),
			a = i.queue;
		if (a === null) throw Error(n(311));
		a.lastRenderedReducer = r;
		var f = Ve,
			h = f.baseQueue,
			m = a.pending;
		if (m !== null) {
			if (h !== null) {
				var x = h.next;
				(h.next = m.next), (m.next = x);
			}
			(f.baseQueue = h = m), (a.pending = null);
		}
		if (h !== null) {
			(m = h.next), (f = f.baseState);
			var b = (x = null),
				T = null,
				P = m;
			do {
				var V = P.lane;
				if ((hr & V) === V)
					T !== null &&
						(T = T.next =
							{
								lane: 0,
								action: P.action,
								hasEagerState: P.hasEagerState,
								eagerState: P.eagerState,
								next: null,
							}),
						(f = P.hasEagerState ? P.eagerState : r(f, P.action));
				else {
					var W = {
						lane: V,
						action: P.action,
						hasEagerState: P.hasEagerState,
						eagerState: P.eagerState,
						next: null,
					};
					T === null ? ((b = T = W), (x = f)) : (T = T.next = W), (Pe.lanes |= V), (pr |= V);
				}
				P = P.next;
			} while (P !== null && P !== m);
			T === null ? (x = f) : (T.next = b),
				Kt(f, i.memoizedState) || (vt = !0),
				(i.memoizedState = f),
				(i.baseState = x),
				(i.baseQueue = T),
				(a.lastRenderedState = f);
		}
		if (((r = a.interleaved), r !== null)) {
			h = r;
			do (m = h.lane), (Pe.lanes |= m), (pr |= m), (h = h.next);
			while (h !== r);
		} else h === null && (a.lanes = 0);
		return [i.memoizedState, a.dispatch];
	}
	function Sc(r) {
		var i = Rt(),
			a = i.queue;
		if (a === null) throw Error(n(311));
		a.lastRenderedReducer = r;
		var f = a.dispatch,
			h = a.pending,
			m = i.memoizedState;
		if (h !== null) {
			a.pending = null;
			var x = (h = h.next);
			do (m = r(m, x.action)), (x = x.next);
			while (x !== h);
			Kt(m, i.memoizedState) || (vt = !0),
				(i.memoizedState = m),
				i.baseQueue === null && (i.baseState = m),
				(a.lastRenderedState = m);
		}
		return [m, f];
	}
	function ch() {}
	function uh(r, i) {
		var a = Pe,
			f = Rt(),
			h = i(),
			m = !Kt(f.memoizedState, h);
		if (
			(m && ((f.memoizedState = h), (vt = !0)),
			(f = f.queue),
			xc(hh.bind(null, a, f, r), [r]),
			f.getSnapshot !== i || m || (Ge !== null && Ge.memoizedState.tag & 1))
		) {
			if (((a.flags |= 2048), mi(9, dh.bind(null, a, f, h, i), void 0, null), Qe === null))
				throw Error(n(349));
			(hr & 30) !== 0 || fh(a, i, h);
		}
		return h;
	}
	function fh(r, i, a) {
		(r.flags |= 16384),
			(r = { getSnapshot: i, value: a }),
			(i = Pe.updateQueue),
			i === null
				? ((i = { lastEffect: null, stores: null }), (Pe.updateQueue = i), (i.stores = [r]))
				: ((a = i.stores), a === null ? (i.stores = [r]) : a.push(r));
	}
	function dh(r, i, a, f) {
		(i.value = a), (i.getSnapshot = f), ph(i) && mh(r);
	}
	function hh(r, i, a) {
		return a(function () {
			ph(i) && mh(r);
		});
	}
	function ph(r) {
		var i = r.getSnapshot;
		r = r.value;
		try {
			var a = i();
			return !Kt(r, a);
		} catch {
			return !0;
		}
	}
	function mh(r) {
		var i = vn(r, 1);
		i !== null && Yt(i, r, 1, -1);
	}
	function gh(r) {
		var i = an();
		return (
			typeof r == 'function' && (r = r()),
			(i.memoizedState = i.baseState = r),
			(r = {
				pending: null,
				interleaved: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: pi,
				lastRenderedState: r,
			}),
			(i.queue = r),
			(r = r.dispatch = Dw.bind(null, Pe, r)),
			[i.memoizedState, r]
		);
	}
	function mi(r, i, a, f) {
		return (
			(r = { tag: r, create: i, destroy: a, deps: f, next: null }),
			(i = Pe.updateQueue),
			i === null
				? ((i = { lastEffect: null, stores: null }),
					(Pe.updateQueue = i),
					(i.lastEffect = r.next = r))
				: ((a = i.lastEffect),
					a === null
						? (i.lastEffect = r.next = r)
						: ((f = a.next), (a.next = r), (r.next = f), (i.lastEffect = r))),
			r
		);
	}
	function yh() {
		return Rt().memoizedState;
	}
	function Do(r, i, a, f) {
		var h = an();
		(Pe.flags |= r), (h.memoizedState = mi(1 | i, a, void 0, f === void 0 ? null : f));
	}
	function Fo(r, i, a, f) {
		var h = Rt();
		f = f === void 0 ? null : f;
		var m = void 0;
		if (Ve !== null) {
			var x = Ve.memoizedState;
			if (((m = x.destroy), f !== null && gc(f, x.deps))) {
				h.memoizedState = mi(i, a, m, f);
				return;
			}
		}
		(Pe.flags |= r), (h.memoizedState = mi(1 | i, a, m, f));
	}
	function vh(r, i) {
		return Do(8390656, 8, r, i);
	}
	function xc(r, i) {
		return Fo(2048, 8, r, i);
	}
	function wh(r, i) {
		return Fo(4, 2, r, i);
	}
	function Sh(r, i) {
		return Fo(4, 4, r, i);
	}
	function xh(r, i) {
		if (typeof i == 'function')
			return (
				(r = r()),
				i(r),
				function () {
					i(null);
				}
			);
		if (i != null)
			return (
				(r = r()),
				(i.current = r),
				function () {
					i.current = null;
				}
			);
	}
	function _h(r, i, a) {
		return (a = a != null ? a.concat([r]) : null), Fo(4, 4, xh.bind(null, i, r), a);
	}
	function _c() {}
	function Eh(r, i) {
		var a = Rt();
		i = i === void 0 ? null : i;
		var f = a.memoizedState;
		return f !== null && i !== null && gc(i, f[1]) ? f[0] : ((a.memoizedState = [r, i]), r);
	}
	function kh(r, i) {
		var a = Rt();
		i = i === void 0 ? null : i;
		var f = a.memoizedState;
		return f !== null && i !== null && gc(i, f[1])
			? f[0]
			: ((r = r()), (a.memoizedState = [r, i]), r);
	}
	function bh(r, i, a) {
		return (hr & 21) === 0
			? (r.baseState && ((r.baseState = !1), (vt = !0)), (r.memoizedState = a))
			: (Kt(a, i) || ((a = td()), (Pe.lanes |= a), (pr |= a), (r.baseState = !0)), i);
	}
	function $w(r, i) {
		var a = xe;
		(xe = a !== 0 && 4 > a ? a : 4), r(!0);
		var f = mc.transition;
		mc.transition = {};
		try {
			r(!1), i();
		} finally {
			(xe = a), (mc.transition = f);
		}
	}
	function Th() {
		return Rt().memoizedState;
	}
	function Rw(r, i, a) {
		var f = Gn(r);
		if (((a = { lane: f, action: a, hasEagerState: !1, eagerState: null, next: null }), Ch(r)))
			Nh(i, a);
		else if (((a = sh(r, i, a, f)), a !== null)) {
			var h = ft();
			Yt(a, r, f, h), Ah(a, i, f);
		}
	}
	function Dw(r, i, a) {
		var f = Gn(r),
			h = { lane: f, action: a, hasEagerState: !1, eagerState: null, next: null };
		if (Ch(r)) Nh(i, h);
		else {
			var m = r.alternate;
			if (
				r.lanes === 0 &&
				(m === null || m.lanes === 0) &&
				((m = i.lastRenderedReducer), m !== null)
			)
				try {
					var x = i.lastRenderedState,
						b = m(x, a);
					if (((h.hasEagerState = !0), (h.eagerState = b), Kt(b, x))) {
						var T = i.interleaved;
						T === null ? ((h.next = h), cc(i)) : ((h.next = T.next), (T.next = h)),
							(i.interleaved = h);
						return;
					}
				} catch {
				} finally {
				}
			(a = sh(r, i, h, f)), a !== null && ((h = ft()), Yt(a, r, f, h), Ah(a, i, f));
		}
	}
	function Ch(r) {
		var i = r.alternate;
		return r === Pe || (i !== null && i === Pe);
	}
	function Nh(r, i) {
		di = Ro = !0;
		var a = r.pending;
		a === null ? (i.next = i) : ((i.next = a.next), (a.next = i)), (r.pending = i);
	}
	function Ah(r, i, a) {
		if ((a & 4194240) !== 0) {
			var f = i.lanes;
			(f &= r.pendingLanes), (a |= f), (i.lanes = a), ka(r, a);
		}
	}
	var Bo = {
			readContext: $t,
			useCallback: rt,
			useContext: rt,
			useEffect: rt,
			useImperativeHandle: rt,
			useInsertionEffect: rt,
			useLayoutEffect: rt,
			useMemo: rt,
			useReducer: rt,
			useRef: rt,
			useState: rt,
			useDebugValue: rt,
			useDeferredValue: rt,
			useTransition: rt,
			useMutableSource: rt,
			useSyncExternalStore: rt,
			useId: rt,
			unstable_isNewReconciler: !1,
		},
		Fw = {
			readContext: $t,
			useCallback: function (r, i) {
				return (an().memoizedState = [r, i === void 0 ? null : i]), r;
			},
			useContext: $t,
			useEffect: vh,
			useImperativeHandle: function (r, i, a) {
				return (a = a != null ? a.concat([r]) : null), Do(4194308, 4, xh.bind(null, i, r), a);
			},
			useLayoutEffect: function (r, i) {
				return Do(4194308, 4, r, i);
			},
			useInsertionEffect: function (r, i) {
				return Do(4, 2, r, i);
			},
			useMemo: function (r, i) {
				var a = an();
				return (i = i === void 0 ? null : i), (r = r()), (a.memoizedState = [r, i]), r;
			},
			useReducer: function (r, i, a) {
				var f = an();
				return (
					(i = a !== void 0 ? a(i) : i),
					(f.memoizedState = f.baseState = i),
					(r = {
						pending: null,
						interleaved: null,
						lanes: 0,
						dispatch: null,
						lastRenderedReducer: r,
						lastRenderedState: i,
					}),
					(f.queue = r),
					(r = r.dispatch = Rw.bind(null, Pe, r)),
					[f.memoizedState, r]
				);
			},
			useRef: function (r) {
				var i = an();
				return (r = { current: r }), (i.memoizedState = r);
			},
			useState: gh,
			useDebugValue: _c,
			useDeferredValue: function (r) {
				return (an().memoizedState = r);
			},
			useTransition: function () {
				var r = gh(!1),
					i = r[0];
				return (r = $w.bind(null, r[1])), (an().memoizedState = r), [i, r];
			},
			useMutableSource: function () {},
			useSyncExternalStore: function (r, i, a) {
				var f = Pe,
					h = an();
				if (Ie) {
					if (a === void 0) throw Error(n(407));
					a = a();
				} else {
					if (((a = i()), Qe === null)) throw Error(n(349));
					(hr & 30) !== 0 || fh(f, i, a);
				}
				h.memoizedState = a;
				var m = { value: a, getSnapshot: i };
				return (
					(h.queue = m),
					vh(hh.bind(null, f, m, r), [r]),
					(f.flags |= 2048),
					mi(9, dh.bind(null, f, m, a, i), void 0, null),
					a
				);
			},
			useId: function () {
				var r = an(),
					i = Qe.identifierPrefix;
				if (Ie) {
					var a = yn,
						f = gn;
					(a = (f & ~(1 << (32 - Wt(f) - 1))).toString(32) + a),
						(i = ':' + i + 'R' + a),
						(a = hi++),
						0 < a && (i += 'H' + a.toString(32)),
						(i += ':');
				} else (a = Ow++), (i = ':' + i + 'r' + a.toString(32) + ':');
				return (r.memoizedState = i);
			},
			unstable_isNewReconciler: !1,
		},
		Bw = {
			readContext: $t,
			useCallback: Eh,
			useContext: $t,
			useEffect: xc,
			useImperativeHandle: _h,
			useInsertionEffect: wh,
			useLayoutEffect: Sh,
			useMemo: kh,
			useReducer: wc,
			useRef: yh,
			useState: function () {
				return wc(pi);
			},
			useDebugValue: _c,
			useDeferredValue: function (r) {
				var i = Rt();
				return bh(i, Ve.memoizedState, r);
			},
			useTransition: function () {
				var r = wc(pi)[0],
					i = Rt().memoizedState;
				return [r, i];
			},
			useMutableSource: ch,
			useSyncExternalStore: uh,
			useId: Th,
			unstable_isNewReconciler: !1,
		},
		zw = {
			readContext: $t,
			useCallback: Eh,
			useContext: $t,
			useEffect: xc,
			useImperativeHandle: _h,
			useInsertionEffect: wh,
			useLayoutEffect: Sh,
			useMemo: kh,
			useReducer: Sc,
			useRef: yh,
			useState: function () {
				return Sc(pi);
			},
			useDebugValue: _c,
			useDeferredValue: function (r) {
				var i = Rt();
				return Ve === null ? (i.memoizedState = r) : bh(i, Ve.memoizedState, r);
			},
			useTransition: function () {
				var r = Sc(pi)[0],
					i = Rt().memoizedState;
				return [r, i];
			},
			useMutableSource: ch,
			useSyncExternalStore: uh,
			useId: Th,
			unstable_isNewReconciler: !1,
		};
	function Qt(r, i) {
		if (r && r.defaultProps) {
			(i = Z({}, i)), (r = r.defaultProps);
			for (var a in r) i[a] === void 0 && (i[a] = r[a]);
			return i;
		}
		return i;
	}
	function Ec(r, i, a, f) {
		(i = r.memoizedState),
			(a = a(f, i)),
			(a = a == null ? i : Z({}, i, a)),
			(r.memoizedState = a),
			r.lanes === 0 && (r.updateQueue.baseState = a);
	}
	var zo = {
		isMounted: function (r) {
			return (r = r._reactInternals) ? or(r) === r : !1;
		},
		enqueueSetState: function (r, i, a) {
			r = r._reactInternals;
			var f = ft(),
				h = Gn(r),
				m = wn(f, h);
			(m.payload = i),
				a != null && (m.callback = a),
				(i = qn(r, m, h)),
				i !== null && (Yt(i, r, h, f), jo(i, r, h));
		},
		enqueueReplaceState: function (r, i, a) {
			r = r._reactInternals;
			var f = ft(),
				h = Gn(r),
				m = wn(f, h);
			(m.tag = 1),
				(m.payload = i),
				a != null && (m.callback = a),
				(i = qn(r, m, h)),
				i !== null && (Yt(i, r, h, f), jo(i, r, h));
		},
		enqueueForceUpdate: function (r, i) {
			r = r._reactInternals;
			var a = ft(),
				f = Gn(r),
				h = wn(a, f);
			(h.tag = 2),
				i != null && (h.callback = i),
				(i = qn(r, h, f)),
				i !== null && (Yt(i, r, f, a), jo(i, r, f));
		},
	};
	function Ih(r, i, a, f, h, m, x) {
		return (
			(r = r.stateNode),
			typeof r.shouldComponentUpdate == 'function'
				? r.shouldComponentUpdate(f, m, x)
				: i.prototype && i.prototype.isPureReactComponent
					? !ti(a, f) || !ti(h, m)
					: !0
		);
	}
	function Lh(r, i, a) {
		var f = !1,
			h = zn,
			m = i.contextType;
		return (
			typeof m == 'object' && m !== null
				? (m = $t(m))
				: ((h = yt(i) ? ar : nt.current),
					(f = i.contextTypes),
					(m = (f = f != null) ? Gr(r, h) : zn)),
			(i = new i(a, m)),
			(r.memoizedState = i.state !== null && i.state !== void 0 ? i.state : null),
			(i.updater = zo),
			(r.stateNode = i),
			(i._reactInternals = r),
			f &&
				((r = r.stateNode),
				(r.__reactInternalMemoizedUnmaskedChildContext = h),
				(r.__reactInternalMemoizedMaskedChildContext = m)),
			i
		);
	}
	function Mh(r, i, a, f) {
		(r = i.state),
			typeof i.componentWillReceiveProps == 'function' && i.componentWillReceiveProps(a, f),
			typeof i.UNSAFE_componentWillReceiveProps == 'function' &&
				i.UNSAFE_componentWillReceiveProps(a, f),
			i.state !== r && zo.enqueueReplaceState(i, i.state, null);
	}
	function kc(r, i, a, f) {
		var h = r.stateNode;
		(h.props = a), (h.state = r.memoizedState), (h.refs = {}), uc(r);
		var m = i.contextType;
		typeof m == 'object' && m !== null
			? (h.context = $t(m))
			: ((m = yt(i) ? ar : nt.current), (h.context = Gr(r, m))),
			(h.state = r.memoizedState),
			(m = i.getDerivedStateFromProps),
			typeof m == 'function' && (Ec(r, i, m, a), (h.state = r.memoizedState)),
			typeof i.getDerivedStateFromProps == 'function' ||
				typeof h.getSnapshotBeforeUpdate == 'function' ||
				(typeof h.UNSAFE_componentWillMount != 'function' &&
					typeof h.componentWillMount != 'function') ||
				((i = h.state),
				typeof h.componentWillMount == 'function' && h.componentWillMount(),
				typeof h.UNSAFE_componentWillMount == 'function' && h.UNSAFE_componentWillMount(),
				i !== h.state && zo.enqueueReplaceState(h, h.state, null),
				Po(r, a, h, f),
				(h.state = r.memoizedState)),
			typeof h.componentDidMount == 'function' && (r.flags |= 4194308);
	}
	function ns(r, i) {
		try {
			var a = '',
				f = i;
			do (a += pe(f)), (f = f.return);
			while (f);
			var h = a;
		} catch (m) {
			h =
				`
Error generating stack: ` +
				m.message +
				`
` +
				m.stack;
		}
		return { value: r, source: i, stack: h, digest: null };
	}
	function bc(r, i, a) {
		return { value: r, source: null, stack: a ?? null, digest: i ?? null };
	}
	function Tc(r, i) {
		try {
			console.error(i.value);
		} catch (a) {
			setTimeout(function () {
				throw a;
			});
		}
	}
	var Hw = typeof WeakMap == 'function' ? WeakMap : Map;
	function jh(r, i, a) {
		(a = wn(-1, a)), (a.tag = 3), (a.payload = { element: null });
		var f = i.value;
		return (
			(a.callback = function () {
				Go || ((Go = !0), (zc = f)), Tc(r, i);
			}),
			a
		);
	}
	function Ph(r, i, a) {
		(a = wn(-1, a)), (a.tag = 3);
		var f = r.type.getDerivedStateFromError;
		if (typeof f == 'function') {
			var h = i.value;
			(a.payload = function () {
				return f(h);
			}),
				(a.callback = function () {
					Tc(r, i);
				});
		}
		var m = r.stateNode;
		return (
			m !== null &&
				typeof m.componentDidCatch == 'function' &&
				(a.callback = function () {
					Tc(r, i), typeof f != 'function' && (Wn === null ? (Wn = new Set([this])) : Wn.add(this));
					var x = i.stack;
					this.componentDidCatch(i.value, { componentStack: x !== null ? x : '' });
				}),
			a
		);
	}
	function Oh(r, i, a) {
		var f = r.pingCache;
		if (f === null) {
			f = r.pingCache = new Hw();
			var h = new Set();
			f.set(i, h);
		} else (h = f.get(i)), h === void 0 && ((h = new Set()), f.set(i, h));
		h.has(a) || (h.add(a), (r = n0.bind(null, r, i, a)), i.then(r, r));
	}
	function $h(r) {
		do {
			var i;
			if (
				((i = r.tag === 13) &&
					((i = r.memoizedState), (i = i !== null ? i.dehydrated !== null : !0)),
				i)
			)
				return r;
			r = r.return;
		} while (r !== null);
		return null;
	}
	function Rh(r, i, a, f, h) {
		return (r.mode & 1) === 0
			? (r === i
					? (r.flags |= 65536)
					: ((r.flags |= 128),
						(a.flags |= 131072),
						(a.flags &= -52805),
						a.tag === 1 &&
							(a.alternate === null ? (a.tag = 17) : ((i = wn(-1, 1)), (i.tag = 2), qn(a, i, 1))),
						(a.lanes |= 1)),
				r)
			: ((r.flags |= 65536), (r.lanes = h), r);
	}
	var Uw = D.ReactCurrentOwner,
		vt = !1;
	function ut(r, i, a, f) {
		i.child = r === null ? rh(i, null, a, f) : Yr(i, r.child, a, f);
	}
	function Dh(r, i, a, f, h) {
		a = a.render;
		var m = i.ref;
		return (
			es(i, h),
			(f = yc(r, i, a, f, m, h)),
			(a = vc()),
			r !== null && !vt
				? ((i.updateQueue = r.updateQueue), (i.flags &= -2053), (r.lanes &= ~h), Sn(r, i, h))
				: (Ie && a && ec(i), (i.flags |= 1), ut(r, i, f, h), i.child)
		);
	}
	function Fh(r, i, a, f, h) {
		if (r === null) {
			var m = a.type;
			return typeof m == 'function' &&
				!Gc(m) &&
				m.defaultProps === void 0 &&
				a.compare === null &&
				a.defaultProps === void 0
				? ((i.tag = 15), (i.type = m), Bh(r, i, m, f, h))
				: ((r = el(a.type, null, f, i, i.mode, h)), (r.ref = i.ref), (r.return = i), (i.child = r));
		}
		if (((m = r.child), (r.lanes & h) === 0)) {
			var x = m.memoizedProps;
			if (((a = a.compare), (a = a !== null ? a : ti), a(x, f) && r.ref === i.ref))
				return Sn(r, i, h);
		}
		return (i.flags |= 1), (r = Jn(m, f)), (r.ref = i.ref), (r.return = i), (i.child = r);
	}
	function Bh(r, i, a, f, h) {
		if (r !== null) {
			var m = r.memoizedProps;
			if (ti(m, f) && r.ref === i.ref)
				if (((vt = !1), (i.pendingProps = f = m), (r.lanes & h) !== 0))
					(r.flags & 131072) !== 0 && (vt = !0);
				else return (i.lanes = r.lanes), Sn(r, i, h);
		}
		return Cc(r, i, a, f, h);
	}
	function zh(r, i, a) {
		var f = i.pendingProps,
			h = f.children,
			m = r !== null ? r.memoizedState : null;
		if (f.mode === 'hidden')
			if ((i.mode & 1) === 0)
				(i.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }),
					Te(ss, It),
					(It |= a);
			else {
				if ((a & 1073741824) === 0)
					return (
						(r = m !== null ? m.baseLanes | a : a),
						(i.lanes = i.childLanes = 1073741824),
						(i.memoizedState = { baseLanes: r, cachePool: null, transitions: null }),
						(i.updateQueue = null),
						Te(ss, It),
						(It |= r),
						null
					);
				(i.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }),
					(f = m !== null ? m.baseLanes : a),
					Te(ss, It),
					(It |= f);
			}
		else
			m !== null ? ((f = m.baseLanes | a), (i.memoizedState = null)) : (f = a),
				Te(ss, It),
				(It |= f);
		return ut(r, i, h, a), i.child;
	}
	function Hh(r, i) {
		var a = i.ref;
		((r === null && a !== null) || (r !== null && r.ref !== a)) &&
			((i.flags |= 512), (i.flags |= 2097152));
	}
	function Cc(r, i, a, f, h) {
		var m = yt(a) ? ar : nt.current;
		return (
			(m = Gr(i, m)),
			es(i, h),
			(a = yc(r, i, a, f, m, h)),
			(f = vc()),
			r !== null && !vt
				? ((i.updateQueue = r.updateQueue), (i.flags &= -2053), (r.lanes &= ~h), Sn(r, i, h))
				: (Ie && f && ec(i), (i.flags |= 1), ut(r, i, a, h), i.child)
		);
	}
	function Uh(r, i, a, f, h) {
		if (yt(a)) {
			var m = !0;
			bo(i);
		} else m = !1;
		if ((es(i, h), i.stateNode === null)) Uo(r, i), Lh(i, a, f), kc(i, a, f, h), (f = !0);
		else if (r === null) {
			var x = i.stateNode,
				b = i.memoizedProps;
			x.props = b;
			var T = x.context,
				P = a.contextType;
			typeof P == 'object' && P !== null
				? (P = $t(P))
				: ((P = yt(a) ? ar : nt.current), (P = Gr(i, P)));
			var V = a.getDerivedStateFromProps,
				W = typeof V == 'function' || typeof x.getSnapshotBeforeUpdate == 'function';
			W ||
				(typeof x.UNSAFE_componentWillReceiveProps != 'function' &&
					typeof x.componentWillReceiveProps != 'function') ||
				((b !== f || T !== P) && Mh(i, x, f, P)),
				(Un = !1);
			var U = i.memoizedState;
			(x.state = U),
				Po(i, f, x, h),
				(T = i.memoizedState),
				b !== f || U !== T || gt.current || Un
					? (typeof V == 'function' && (Ec(i, a, V, f), (T = i.memoizedState)),
						(b = Un || Ih(i, a, b, f, U, T, P))
							? (W ||
									(typeof x.UNSAFE_componentWillMount != 'function' &&
										typeof x.componentWillMount != 'function') ||
									(typeof x.componentWillMount == 'function' && x.componentWillMount(),
									typeof x.UNSAFE_componentWillMount == 'function' &&
										x.UNSAFE_componentWillMount()),
								typeof x.componentDidMount == 'function' && (i.flags |= 4194308))
							: (typeof x.componentDidMount == 'function' && (i.flags |= 4194308),
								(i.memoizedProps = f),
								(i.memoizedState = T)),
						(x.props = f),
						(x.state = T),
						(x.context = P),
						(f = b))
					: (typeof x.componentDidMount == 'function' && (i.flags |= 4194308), (f = !1));
		} else {
			(x = i.stateNode),
				ih(r, i),
				(b = i.memoizedProps),
				(P = i.type === i.elementType ? b : Qt(i.type, b)),
				(x.props = P),
				(W = i.pendingProps),
				(U = x.context),
				(T = a.contextType),
				typeof T == 'object' && T !== null
					? (T = $t(T))
					: ((T = yt(a) ? ar : nt.current), (T = Gr(i, T)));
			var Y = a.getDerivedStateFromProps;
			(V = typeof Y == 'function' || typeof x.getSnapshotBeforeUpdate == 'function') ||
				(typeof x.UNSAFE_componentWillReceiveProps != 'function' &&
					typeof x.componentWillReceiveProps != 'function') ||
				((b !== W || U !== T) && Mh(i, x, f, T)),
				(Un = !1),
				(U = i.memoizedState),
				(x.state = U),
				Po(i, f, x, h);
			var te = i.memoizedState;
			b !== W || U !== te || gt.current || Un
				? (typeof Y == 'function' && (Ec(i, a, Y, f), (te = i.memoizedState)),
					(P = Un || Ih(i, a, P, f, U, te, T) || !1)
						? (V ||
								(typeof x.UNSAFE_componentWillUpdate != 'function' &&
									typeof x.componentWillUpdate != 'function') ||
								(typeof x.componentWillUpdate == 'function' && x.componentWillUpdate(f, te, T),
								typeof x.UNSAFE_componentWillUpdate == 'function' &&
									x.UNSAFE_componentWillUpdate(f, te, T)),
							typeof x.componentDidUpdate == 'function' && (i.flags |= 4),
							typeof x.getSnapshotBeforeUpdate == 'function' && (i.flags |= 1024))
						: (typeof x.componentDidUpdate != 'function' ||
								(b === r.memoizedProps && U === r.memoizedState) ||
								(i.flags |= 4),
							typeof x.getSnapshotBeforeUpdate != 'function' ||
								(b === r.memoizedProps && U === r.memoizedState) ||
								(i.flags |= 1024),
							(i.memoizedProps = f),
							(i.memoizedState = te)),
					(x.props = f),
					(x.state = te),
					(x.context = T),
					(f = P))
				: (typeof x.componentDidUpdate != 'function' ||
						(b === r.memoizedProps && U === r.memoizedState) ||
						(i.flags |= 4),
					typeof x.getSnapshotBeforeUpdate != 'function' ||
						(b === r.memoizedProps && U === r.memoizedState) ||
						(i.flags |= 1024),
					(f = !1));
		}
		return Nc(r, i, a, f, m, h);
	}
	function Nc(r, i, a, f, h, m) {
		Hh(r, i);
		var x = (i.flags & 128) !== 0;
		if (!f && !x) return h && Gd(i, a, !1), Sn(r, i, m);
		(f = i.stateNode), (Uw.current = i);
		var b = x && typeof a.getDerivedStateFromError != 'function' ? null : f.render();
		return (
			(i.flags |= 1),
			r !== null && x
				? ((i.child = Yr(i, r.child, null, m)), (i.child = Yr(i, null, b, m)))
				: ut(r, i, b, m),
			(i.memoizedState = f.state),
			h && Gd(i, a, !0),
			i.child
		);
	}
	function qh(r) {
		var i = r.stateNode;
		i.pendingContext
			? Wd(r, i.pendingContext, i.pendingContext !== i.context)
			: i.context && Wd(r, i.context, !1),
			fc(r, i.containerInfo);
	}
	function Vh(r, i, a, f, h) {
		return Xr(), sc(h), (i.flags |= 256), ut(r, i, a, f), i.child;
	}
	var Ac = { dehydrated: null, treeContext: null, retryLane: 0 };
	function Ic(r) {
		return { baseLanes: r, cachePool: null, transitions: null };
	}
	function Wh(r, i, a) {
		var f = i.pendingProps,
			h = je.current,
			m = !1,
			x = (i.flags & 128) !== 0,
			b;
		if (
			((b = x) || (b = r !== null && r.memoizedState === null ? !1 : (h & 2) !== 0),
			b ? ((m = !0), (i.flags &= -129)) : (r === null || r.memoizedState !== null) && (h |= 1),
			Te(je, h & 1),
			r === null)
		)
			return (
				rc(i),
				(r = i.memoizedState),
				r !== null && ((r = r.dehydrated), r !== null)
					? ((i.mode & 1) === 0
							? (i.lanes = 1)
							: r.data === '$!'
								? (i.lanes = 8)
								: (i.lanes = 1073741824),
						null)
					: ((x = f.children),
						(r = f.fallback),
						m
							? ((f = i.mode),
								(m = i.child),
								(x = { mode: 'hidden', children: x }),
								(f & 1) === 0 && m !== null
									? ((m.childLanes = 0), (m.pendingProps = x))
									: (m = tl(x, f, 0, null)),
								(r = vr(r, f, a, null)),
								(m.return = i),
								(r.return = i),
								(m.sibling = r),
								(i.child = m),
								(i.child.memoizedState = Ic(a)),
								(i.memoizedState = Ac),
								r)
							: Lc(i, x))
			);
		if (((h = r.memoizedState), h !== null && ((b = h.dehydrated), b !== null)))
			return qw(r, i, x, f, b, h, a);
		if (m) {
			(m = f.fallback), (x = i.mode), (h = r.child), (b = h.sibling);
			var T = { mode: 'hidden', children: f.children };
			return (
				(x & 1) === 0 && i.child !== h
					? ((f = i.child), (f.childLanes = 0), (f.pendingProps = T), (i.deletions = null))
					: ((f = Jn(h, T)), (f.subtreeFlags = h.subtreeFlags & 14680064)),
				b !== null ? (m = Jn(b, m)) : ((m = vr(m, x, a, null)), (m.flags |= 2)),
				(m.return = i),
				(f.return = i),
				(f.sibling = m),
				(i.child = f),
				(f = m),
				(m = i.child),
				(x = r.child.memoizedState),
				(x =
					x === null
						? Ic(a)
						: { baseLanes: x.baseLanes | a, cachePool: null, transitions: x.transitions }),
				(m.memoizedState = x),
				(m.childLanes = r.childLanes & ~a),
				(i.memoizedState = Ac),
				f
			);
		}
		return (
			(m = r.child),
			(r = m.sibling),
			(f = Jn(m, { mode: 'visible', children: f.children })),
			(i.mode & 1) === 0 && (f.lanes = a),
			(f.return = i),
			(f.sibling = null),
			r !== null &&
				((a = i.deletions), a === null ? ((i.deletions = [r]), (i.flags |= 16)) : a.push(r)),
			(i.child = f),
			(i.memoizedState = null),
			f
		);
	}
	function Lc(r, i) {
		return (
			(i = tl({ mode: 'visible', children: i }, r.mode, 0, null)), (i.return = r), (r.child = i)
		);
	}
	function Ho(r, i, a, f) {
		return (
			f !== null && sc(f),
			Yr(i, r.child, null, a),
			(r = Lc(i, i.pendingProps.children)),
			(r.flags |= 2),
			(i.memoizedState = null),
			r
		);
	}
	function qw(r, i, a, f, h, m, x) {
		if (a)
			return i.flags & 256
				? ((i.flags &= -257), (f = bc(Error(n(422)))), Ho(r, i, x, f))
				: i.memoizedState !== null
					? ((i.child = r.child), (i.flags |= 128), null)
					: ((m = f.fallback),
						(h = i.mode),
						(f = tl({ mode: 'visible', children: f.children }, h, 0, null)),
						(m = vr(m, h, x, null)),
						(m.flags |= 2),
						(f.return = i),
						(m.return = i),
						(f.sibling = m),
						(i.child = f),
						(i.mode & 1) !== 0 && Yr(i, r.child, null, x),
						(i.child.memoizedState = Ic(x)),
						(i.memoizedState = Ac),
						m);
		if ((i.mode & 1) === 0) return Ho(r, i, x, null);
		if (h.data === '$!') {
			if (((f = h.nextSibling && h.nextSibling.dataset), f)) var b = f.dgst;
			return (f = b), (m = Error(n(419))), (f = bc(m, f, void 0)), Ho(r, i, x, f);
		}
		if (((b = (x & r.childLanes) !== 0), vt || b)) {
			if (((f = Qe), f !== null)) {
				switch (x & -x) {
					case 4:
						h = 2;
						break;
					case 16:
						h = 8;
						break;
					case 64:
					case 128:
					case 256:
					case 512:
					case 1024:
					case 2048:
					case 4096:
					case 8192:
					case 16384:
					case 32768:
					case 65536:
					case 131072:
					case 262144:
					case 524288:
					case 1048576:
					case 2097152:
					case 4194304:
					case 8388608:
					case 16777216:
					case 33554432:
					case 67108864:
						h = 32;
						break;
					case 536870912:
						h = 268435456;
						break;
					default:
						h = 0;
				}
				(h = (h & (f.suspendedLanes | x)) !== 0 ? 0 : h),
					h !== 0 && h !== m.retryLane && ((m.retryLane = h), vn(r, h), Yt(f, r, h, -1));
			}
			return Kc(), (f = bc(Error(n(421)))), Ho(r, i, x, f);
		}
		return h.data === '$?'
			? ((i.flags |= 128), (i.child = r.child), (i = r0.bind(null, r)), (h._reactRetry = i), null)
			: ((r = m.treeContext),
				(At = Fn(h.nextSibling)),
				(Nt = i),
				(Ie = !0),
				(Gt = null),
				r !== null &&
					((Pt[Ot++] = gn),
					(Pt[Ot++] = yn),
					(Pt[Ot++] = cr),
					(gn = r.id),
					(yn = r.overflow),
					(cr = i)),
				(i = Lc(i, f.children)),
				(i.flags |= 4096),
				i);
	}
	function Kh(r, i, a) {
		r.lanes |= i;
		var f = r.alternate;
		f !== null && (f.lanes |= i), ac(r.return, i, a);
	}
	function Mc(r, i, a, f, h) {
		var m = r.memoizedState;
		m === null
			? (r.memoizedState = {
					isBackwards: i,
					rendering: null,
					renderingStartTime: 0,
					last: f,
					tail: a,
					tailMode: h,
				})
			: ((m.isBackwards = i),
				(m.rendering = null),
				(m.renderingStartTime = 0),
				(m.last = f),
				(m.tail = a),
				(m.tailMode = h));
	}
	function Gh(r, i, a) {
		var f = i.pendingProps,
			h = f.revealOrder,
			m = f.tail;
		if ((ut(r, i, f.children, a), (f = je.current), (f & 2) !== 0))
			(f = (f & 1) | 2), (i.flags |= 128);
		else {
			if (r !== null && (r.flags & 128) !== 0)
				e: for (r = i.child; r !== null; ) {
					if (r.tag === 13) r.memoizedState !== null && Kh(r, a, i);
					else if (r.tag === 19) Kh(r, a, i);
					else if (r.child !== null) {
						(r.child.return = r), (r = r.child);
						continue;
					}
					if (r === i) break e;
					for (; r.sibling === null; ) {
						if (r.return === null || r.return === i) break e;
						r = r.return;
					}
					(r.sibling.return = r.return), (r = r.sibling);
				}
			f &= 1;
		}
		if ((Te(je, f), (i.mode & 1) === 0)) i.memoizedState = null;
		else
			switch (h) {
				case 'forwards':
					for (a = i.child, h = null; a !== null; )
						(r = a.alternate), r !== null && Oo(r) === null && (h = a), (a = a.sibling);
					(a = h),
						a === null ? ((h = i.child), (i.child = null)) : ((h = a.sibling), (a.sibling = null)),
						Mc(i, !1, h, a, m);
					break;
				case 'backwards':
					for (a = null, h = i.child, i.child = null; h !== null; ) {
						if (((r = h.alternate), r !== null && Oo(r) === null)) {
							i.child = h;
							break;
						}
						(r = h.sibling), (h.sibling = a), (a = h), (h = r);
					}
					Mc(i, !0, a, null, m);
					break;
				case 'together':
					Mc(i, !1, null, null, void 0);
					break;
				default:
					i.memoizedState = null;
			}
		return i.child;
	}
	function Uo(r, i) {
		(i.mode & 1) === 0 &&
			r !== null &&
			((r.alternate = null), (i.alternate = null), (i.flags |= 2));
	}
	function Sn(r, i, a) {
		if (
			(r !== null && (i.dependencies = r.dependencies), (pr |= i.lanes), (a & i.childLanes) === 0)
		)
			return null;
		if (r !== null && i.child !== r.child) throw Error(n(153));
		if (i.child !== null) {
			for (r = i.child, a = Jn(r, r.pendingProps), i.child = a, a.return = i; r.sibling !== null; )
				(r = r.sibling), (a = a.sibling = Jn(r, r.pendingProps)), (a.return = i);
			a.sibling = null;
		}
		return i.child;
	}
	function Vw(r, i, a) {
		switch (i.tag) {
			case 3:
				qh(i), Xr();
				break;
			case 5:
				ah(i);
				break;
			case 1:
				yt(i.type) && bo(i);
				break;
			case 4:
				fc(i, i.stateNode.containerInfo);
				break;
			case 10:
				var f = i.type._context,
					h = i.memoizedProps.value;
				Te(Lo, f._currentValue), (f._currentValue = h);
				break;
			case 13:
				if (((f = i.memoizedState), f !== null))
					return f.dehydrated !== null
						? (Te(je, je.current & 1), (i.flags |= 128), null)
						: (a & i.child.childLanes) !== 0
							? Wh(r, i, a)
							: (Te(je, je.current & 1), (r = Sn(r, i, a)), r !== null ? r.sibling : null);
				Te(je, je.current & 1);
				break;
			case 19:
				if (((f = (a & i.childLanes) !== 0), (r.flags & 128) !== 0)) {
					if (f) return Gh(r, i, a);
					i.flags |= 128;
				}
				if (
					((h = i.memoizedState),
					h !== null && ((h.rendering = null), (h.tail = null), (h.lastEffect = null)),
					Te(je, je.current),
					f)
				)
					break;
				return null;
			case 22:
			case 23:
				return (i.lanes = 0), zh(r, i, a);
		}
		return Sn(r, i, a);
	}
	var Qh, jc, Jh, Xh;
	(Qh = function (r, i) {
		for (var a = i.child; a !== null; ) {
			if (a.tag === 5 || a.tag === 6) r.appendChild(a.stateNode);
			else if (a.tag !== 4 && a.child !== null) {
				(a.child.return = a), (a = a.child);
				continue;
			}
			if (a === i) break;
			for (; a.sibling === null; ) {
				if (a.return === null || a.return === i) return;
				a = a.return;
			}
			(a.sibling.return = a.return), (a = a.sibling);
		}
	}),
		(jc = function () {}),
		(Jh = function (r, i, a, f) {
			var h = r.memoizedProps;
			if (h !== f) {
				(r = i.stateNode), dr(ln.current);
				var m = null;
				switch (a) {
					case 'input':
						(h = Pr(r, h)), (f = Pr(r, f)), (m = []);
						break;
					case 'select':
						(h = Z({}, h, { value: void 0 })), (f = Z({}, f, { value: void 0 })), (m = []);
						break;
					case 'textarea':
						(h = Fs(r, h)), (f = Fs(r, f)), (m = []);
						break;
					default:
						typeof h.onClick != 'function' && typeof f.onClick == 'function' && (r.onclick = _o);
				}
				ha(a, f);
				var x;
				a = null;
				for (P in h)
					if (!f.hasOwnProperty(P) && h.hasOwnProperty(P) && h[P] != null)
						if (P === 'style') {
							var b = h[P];
							for (x in b) b.hasOwnProperty(x) && (a || (a = {}), (a[x] = ''));
						} else
							P !== 'dangerouslySetInnerHTML' &&
								P !== 'children' &&
								P !== 'suppressContentEditableWarning' &&
								P !== 'suppressHydrationWarning' &&
								P !== 'autoFocus' &&
								(o.hasOwnProperty(P) ? m || (m = []) : (m = m || []).push(P, null));
				for (P in f) {
					var T = f[P];
					if (
						((b = h != null ? h[P] : void 0),
						f.hasOwnProperty(P) && T !== b && (T != null || b != null))
					)
						if (P === 'style')
							if (b) {
								for (x in b)
									!b.hasOwnProperty(x) ||
										(T && T.hasOwnProperty(x)) ||
										(a || (a = {}), (a[x] = ''));
								for (x in T) T.hasOwnProperty(x) && b[x] !== T[x] && (a || (a = {}), (a[x] = T[x]));
							} else a || (m || (m = []), m.push(P, a)), (a = T);
						else
							P === 'dangerouslySetInnerHTML'
								? ((T = T ? T.__html : void 0),
									(b = b ? b.__html : void 0),
									T != null && b !== T && (m = m || []).push(P, T))
								: P === 'children'
									? (typeof T != 'string' && typeof T != 'number') || (m = m || []).push(P, '' + T)
									: P !== 'suppressContentEditableWarning' &&
										P !== 'suppressHydrationWarning' &&
										(o.hasOwnProperty(P)
											? (T != null && P === 'onScroll' && Ce('scroll', r), m || b === T || (m = []))
											: (m = m || []).push(P, T));
				}
				a && (m = m || []).push('style', a);
				var P = m;
				(i.updateQueue = P) && (i.flags |= 4);
			}
		}),
		(Xh = function (r, i, a, f) {
			a !== f && (i.flags |= 4);
		});
	function gi(r, i) {
		if (!Ie)
			switch (r.tailMode) {
				case 'hidden':
					i = r.tail;
					for (var a = null; i !== null; ) i.alternate !== null && (a = i), (i = i.sibling);
					a === null ? (r.tail = null) : (a.sibling = null);
					break;
				case 'collapsed':
					a = r.tail;
					for (var f = null; a !== null; ) a.alternate !== null && (f = a), (a = a.sibling);
					f === null
						? i || r.tail === null
							? (r.tail = null)
							: (r.tail.sibling = null)
						: (f.sibling = null);
			}
	}
	function st(r) {
		var i = r.alternate !== null && r.alternate.child === r.child,
			a = 0,
			f = 0;
		if (i)
			for (var h = r.child; h !== null; )
				(a |= h.lanes | h.childLanes),
					(f |= h.subtreeFlags & 14680064),
					(f |= h.flags & 14680064),
					(h.return = r),
					(h = h.sibling);
		else
			for (h = r.child; h !== null; )
				(a |= h.lanes | h.childLanes),
					(f |= h.subtreeFlags),
					(f |= h.flags),
					(h.return = r),
					(h = h.sibling);
		return (r.subtreeFlags |= f), (r.childLanes = a), i;
	}
	function Ww(r, i, a) {
		var f = i.pendingProps;
		switch ((tc(i), i.tag)) {
			case 2:
			case 16:
			case 15:
			case 0:
			case 11:
			case 7:
			case 8:
			case 12:
			case 9:
			case 14:
				return st(i), null;
			case 1:
				return yt(i.type) && ko(), st(i), null;
			case 3:
				return (
					(f = i.stateNode),
					ts(),
					Ne(gt),
					Ne(nt),
					pc(),
					f.pendingContext && ((f.context = f.pendingContext), (f.pendingContext = null)),
					(r === null || r.child === null) &&
						(Ao(i)
							? (i.flags |= 4)
							: r === null ||
								(r.memoizedState.isDehydrated && (i.flags & 256) === 0) ||
								((i.flags |= 1024), Gt !== null && (qc(Gt), (Gt = null)))),
					jc(r, i),
					st(i),
					null
				);
			case 5:
				dc(i);
				var h = dr(fi.current);
				if (((a = i.type), r !== null && i.stateNode != null))
					Jh(r, i, a, f, h), r.ref !== i.ref && ((i.flags |= 512), (i.flags |= 2097152));
				else {
					if (!f) {
						if (i.stateNode === null) throw Error(n(166));
						return st(i), null;
					}
					if (((r = dr(ln.current)), Ao(i))) {
						(f = i.stateNode), (a = i.type);
						var m = i.memoizedProps;
						switch (((f[on] = i), (f[oi] = m), (r = (i.mode & 1) !== 0), a)) {
							case 'dialog':
								Ce('cancel', f), Ce('close', f);
								break;
							case 'iframe':
							case 'object':
							case 'embed':
								Ce('load', f);
								break;
							case 'video':
							case 'audio':
								for (h = 0; h < ri.length; h++) Ce(ri[h], f);
								break;
							case 'source':
								Ce('error', f);
								break;
							case 'img':
							case 'image':
							case 'link':
								Ce('error', f), Ce('load', f);
								break;
							case 'details':
								Ce('toggle', f);
								break;
							case 'input':
								hn(f, m), Ce('invalid', f);
								break;
							case 'select':
								(f._wrapperState = { wasMultiple: !!m.multiple }), Ce('invalid', f);
								break;
							case 'textarea':
								Xi(f, m), Ce('invalid', f);
						}
						ha(a, m), (h = null);
						for (var x in m)
							if (m.hasOwnProperty(x)) {
								var b = m[x];
								x === 'children'
									? typeof b == 'string'
										? f.textContent !== b &&
											(m.suppressHydrationWarning !== !0 && xo(f.textContent, b, r),
											(h = ['children', b]))
										: typeof b == 'number' &&
											f.textContent !== '' + b &&
											(m.suppressHydrationWarning !== !0 && xo(f.textContent, b, r),
											(h = ['children', '' + b]))
									: o.hasOwnProperty(x) && b != null && x === 'onScroll' && Ce('scroll', f);
							}
						switch (a) {
							case 'input':
								Mr(f), Ji(f, m, !0);
								break;
							case 'textarea':
								Mr(f), In(f);
								break;
							case 'select':
							case 'option':
								break;
							default:
								typeof m.onClick == 'function' && (f.onclick = _o);
						}
						(f = h), (i.updateQueue = f), f !== null && (i.flags |= 4);
					} else {
						(x = h.nodeType === 9 ? h : h.ownerDocument),
							r === 'http://www.w3.org/1999/xhtml' && (r = Or(a)),
							r === 'http://www.w3.org/1999/xhtml'
								? a === 'script'
									? ((r = x.createElement('div')),
										(r.innerHTML = '<script></script>'),
										(r = r.removeChild(r.firstChild)))
									: typeof f.is == 'string'
										? (r = x.createElement(a, { is: f.is }))
										: ((r = x.createElement(a)),
											a === 'select' &&
												((x = r), f.multiple ? (x.multiple = !0) : f.size && (x.size = f.size)))
								: (r = x.createElementNS(r, a)),
							(r[on] = i),
							(r[oi] = f),
							Qh(r, i, !1, !1),
							(i.stateNode = r);
						e: {
							switch (((x = pa(a, f)), a)) {
								case 'dialog':
									Ce('cancel', r), Ce('close', r), (h = f);
									break;
								case 'iframe':
								case 'object':
								case 'embed':
									Ce('load', r), (h = f);
									break;
								case 'video':
								case 'audio':
									for (h = 0; h < ri.length; h++) Ce(ri[h], r);
									h = f;
									break;
								case 'source':
									Ce('error', r), (h = f);
									break;
								case 'img':
								case 'image':
								case 'link':
									Ce('error', r), Ce('load', r), (h = f);
									break;
								case 'details':
									Ce('toggle', r), (h = f);
									break;
								case 'input':
									hn(r, f), (h = Pr(r, f)), Ce('invalid', r);
									break;
								case 'option':
									h = f;
									break;
								case 'select':
									(r._wrapperState = { wasMultiple: !!f.multiple }),
										(h = Z({}, f, { value: void 0 })),
										Ce('invalid', r);
									break;
								case 'textarea':
									Xi(r, f), (h = Fs(r, f)), Ce('invalid', r);
									break;
								default:
									h = f;
							}
							ha(a, h), (b = h);
							for (m in b)
								if (b.hasOwnProperty(m)) {
									var T = b[m];
									m === 'style'
										? Bf(r, T)
										: m === 'dangerouslySetInnerHTML'
											? ((T = T ? T.__html : void 0), T != null && Zi(r, T))
											: m === 'children'
												? typeof T == 'string'
													? (a !== 'textarea' || T !== '') && Mn(r, T)
													: typeof T == 'number' && Mn(r, '' + T)
												: m !== 'suppressContentEditableWarning' &&
													m !== 'suppressHydrationWarning' &&
													m !== 'autoFocus' &&
													(o.hasOwnProperty(m)
														? T != null && m === 'onScroll' && Ce('scroll', r)
														: T != null && O(r, m, T, x));
								}
							switch (a) {
								case 'input':
									Mr(r), Ji(r, f, !1);
									break;
								case 'textarea':
									Mr(r), In(r);
									break;
								case 'option':
									f.value != null && r.setAttribute('value', '' + he(f.value));
									break;
								case 'select':
									(r.multiple = !!f.multiple),
										(m = f.value),
										m != null
											? nn(r, !!f.multiple, m, !1)
											: f.defaultValue != null && nn(r, !!f.multiple, f.defaultValue, !0);
									break;
								default:
									typeof h.onClick == 'function' && (r.onclick = _o);
							}
							switch (a) {
								case 'button':
								case 'input':
								case 'select':
								case 'textarea':
									f = !!f.autoFocus;
									break e;
								case 'img':
									f = !0;
									break e;
								default:
									f = !1;
							}
						}
						f && (i.flags |= 4);
					}
					i.ref !== null && ((i.flags |= 512), (i.flags |= 2097152));
				}
				return st(i), null;
			case 6:
				if (r && i.stateNode != null) Xh(r, i, r.memoizedProps, f);
				else {
					if (typeof f != 'string' && i.stateNode === null) throw Error(n(166));
					if (((a = dr(fi.current)), dr(ln.current), Ao(i))) {
						if (
							((f = i.stateNode),
							(a = i.memoizedProps),
							(f[on] = i),
							(m = f.nodeValue !== a) && ((r = Nt), r !== null))
						)
							switch (r.tag) {
								case 3:
									xo(f.nodeValue, a, (r.mode & 1) !== 0);
									break;
								case 5:
									r.memoizedProps.suppressHydrationWarning !== !0 &&
										xo(f.nodeValue, a, (r.mode & 1) !== 0);
							}
						m && (i.flags |= 4);
					} else
						(f = (a.nodeType === 9 ? a : a.ownerDocument).createTextNode(f)),
							(f[on] = i),
							(i.stateNode = f);
				}
				return st(i), null;
			case 13:
				if (
					(Ne(je),
					(f = i.memoizedState),
					r === null || (r.memoizedState !== null && r.memoizedState.dehydrated !== null))
				) {
					if (Ie && At !== null && (i.mode & 1) !== 0 && (i.flags & 128) === 0)
						eh(), Xr(), (i.flags |= 98560), (m = !1);
					else if (((m = Ao(i)), f !== null && f.dehydrated !== null)) {
						if (r === null) {
							if (!m) throw Error(n(318));
							if (((m = i.memoizedState), (m = m !== null ? m.dehydrated : null), !m))
								throw Error(n(317));
							m[on] = i;
						} else Xr(), (i.flags & 128) === 0 && (i.memoizedState = null), (i.flags |= 4);
						st(i), (m = !1);
					} else Gt !== null && (qc(Gt), (Gt = null)), (m = !0);
					if (!m) return i.flags & 65536 ? i : null;
				}
				return (i.flags & 128) !== 0
					? ((i.lanes = a), i)
					: ((f = f !== null),
						f !== (r !== null && r.memoizedState !== null) &&
							f &&
							((i.child.flags |= 8192),
							(i.mode & 1) !== 0 &&
								(r === null || (je.current & 1) !== 0 ? We === 0 && (We = 3) : Kc())),
						i.updateQueue !== null && (i.flags |= 4),
						st(i),
						null);
			case 4:
				return ts(), jc(r, i), r === null && si(i.stateNode.containerInfo), st(i), null;
			case 10:
				return lc(i.type._context), st(i), null;
			case 17:
				return yt(i.type) && ko(), st(i), null;
			case 19:
				if ((Ne(je), (m = i.memoizedState), m === null)) return st(i), null;
				if (((f = (i.flags & 128) !== 0), (x = m.rendering), x === null))
					if (f) gi(m, !1);
					else {
						if (We !== 0 || (r !== null && (r.flags & 128) !== 0))
							for (r = i.child; r !== null; ) {
								if (((x = Oo(r)), x !== null)) {
									for (
										i.flags |= 128,
											gi(m, !1),
											f = x.updateQueue,
											f !== null && ((i.updateQueue = f), (i.flags |= 4)),
											i.subtreeFlags = 0,
											f = a,
											a = i.child;
										a !== null;
									)
										(m = a),
											(r = f),
											(m.flags &= 14680066),
											(x = m.alternate),
											x === null
												? ((m.childLanes = 0),
													(m.lanes = r),
													(m.child = null),
													(m.subtreeFlags = 0),
													(m.memoizedProps = null),
													(m.memoizedState = null),
													(m.updateQueue = null),
													(m.dependencies = null),
													(m.stateNode = null))
												: ((m.childLanes = x.childLanes),
													(m.lanes = x.lanes),
													(m.child = x.child),
													(m.subtreeFlags = 0),
													(m.deletions = null),
													(m.memoizedProps = x.memoizedProps),
													(m.memoizedState = x.memoizedState),
													(m.updateQueue = x.updateQueue),
													(m.type = x.type),
													(r = x.dependencies),
													(m.dependencies =
														r === null ? null : { lanes: r.lanes, firstContext: r.firstContext })),
											(a = a.sibling);
									return Te(je, (je.current & 1) | 2), i.child;
								}
								r = r.sibling;
							}
						m.tail !== null &&
							Fe() > is &&
							((i.flags |= 128), (f = !0), gi(m, !1), (i.lanes = 4194304));
					}
				else {
					if (!f)
						if (((r = Oo(x)), r !== null)) {
							if (
								((i.flags |= 128),
								(f = !0),
								(a = r.updateQueue),
								a !== null && ((i.updateQueue = a), (i.flags |= 4)),
								gi(m, !0),
								m.tail === null && m.tailMode === 'hidden' && !x.alternate && !Ie)
							)
								return st(i), null;
						} else
							2 * Fe() - m.renderingStartTime > is &&
								a !== 1073741824 &&
								((i.flags |= 128), (f = !0), gi(m, !1), (i.lanes = 4194304));
					m.isBackwards
						? ((x.sibling = i.child), (i.child = x))
						: ((a = m.last), a !== null ? (a.sibling = x) : (i.child = x), (m.last = x));
				}
				return m.tail !== null
					? ((i = m.tail),
						(m.rendering = i),
						(m.tail = i.sibling),
						(m.renderingStartTime = Fe()),
						(i.sibling = null),
						(a = je.current),
						Te(je, f ? (a & 1) | 2 : a & 1),
						i)
					: (st(i), null);
			case 22:
			case 23:
				return (
					Wc(),
					(f = i.memoizedState !== null),
					r !== null && (r.memoizedState !== null) !== f && (i.flags |= 8192),
					f && (i.mode & 1) !== 0
						? (It & 1073741824) !== 0 && (st(i), i.subtreeFlags & 6 && (i.flags |= 8192))
						: st(i),
					null
				);
			case 24:
				return null;
			case 25:
				return null;
		}
		throw Error(n(156, i.tag));
	}
	function Kw(r, i) {
		switch ((tc(i), i.tag)) {
			case 1:
				return (
					yt(i.type) && ko(), (r = i.flags), r & 65536 ? ((i.flags = (r & -65537) | 128), i) : null
				);
			case 3:
				return (
					ts(),
					Ne(gt),
					Ne(nt),
					pc(),
					(r = i.flags),
					(r & 65536) !== 0 && (r & 128) === 0 ? ((i.flags = (r & -65537) | 128), i) : null
				);
			case 5:
				return dc(i), null;
			case 13:
				if ((Ne(je), (r = i.memoizedState), r !== null && r.dehydrated !== null)) {
					if (i.alternate === null) throw Error(n(340));
					Xr();
				}
				return (r = i.flags), r & 65536 ? ((i.flags = (r & -65537) | 128), i) : null;
			case 19:
				return Ne(je), null;
			case 4:
				return ts(), null;
			case 10:
				return lc(i.type._context), null;
			case 22:
			case 23:
				return Wc(), null;
			case 24:
				return null;
			default:
				return null;
		}
	}
	var qo = !1,
		it = !1,
		Gw = typeof WeakSet == 'function' ? WeakSet : Set,
		ee = null;
	function rs(r, i) {
		var a = r.ref;
		if (a !== null)
			if (typeof a == 'function')
				try {
					a(null);
				} catch (f) {
					De(r, i, f);
				}
			else a.current = null;
	}
	function Pc(r, i, a) {
		try {
			a();
		} catch (f) {
			De(r, i, f);
		}
	}
	var Yh = !1;
	function Qw(r, i) {
		if (((Wa = co), (r = Id()), Da(r))) {
			if ('selectionStart' in r) var a = { start: r.selectionStart, end: r.selectionEnd };
			else
				e: {
					a = ((a = r.ownerDocument) && a.defaultView) || window;
					var f = a.getSelection && a.getSelection();
					if (f && f.rangeCount !== 0) {
						a = f.anchorNode;
						var h = f.anchorOffset,
							m = f.focusNode;
						f = f.focusOffset;
						try {
							a.nodeType, m.nodeType;
						} catch {
							a = null;
							break e;
						}
						var x = 0,
							b = -1,
							T = -1,
							P = 0,
							V = 0,
							W = r,
							U = null;
						t: for (;;) {
							for (
								var Y;
								W !== a || (h !== 0 && W.nodeType !== 3) || (b = x + h),
									W !== m || (f !== 0 && W.nodeType !== 3) || (T = x + f),
									W.nodeType === 3 && (x += W.nodeValue.length),
									(Y = W.firstChild) !== null;
							)
								(U = W), (W = Y);
							for (;;) {
								if (W === r) break t;
								if (
									(U === a && ++P === h && (b = x),
									U === m && ++V === f && (T = x),
									(Y = W.nextSibling) !== null)
								)
									break;
								(W = U), (U = W.parentNode);
							}
							W = Y;
						}
						a = b === -1 || T === -1 ? null : { start: b, end: T };
					} else a = null;
				}
			a = a || { start: 0, end: 0 };
		} else a = null;
		for (Ka = { focusedElem: r, selectionRange: a }, co = !1, ee = i; ee !== null; )
			if (((i = ee), (r = i.child), (i.subtreeFlags & 1028) !== 0 && r !== null))
				(r.return = i), (ee = r);
			else
				for (; ee !== null; ) {
					i = ee;
					try {
						var te = i.alternate;
						if ((i.flags & 1024) !== 0)
							switch (i.tag) {
								case 0:
								case 11:
								case 15:
									break;
								case 1:
									if (te !== null) {
										var ne = te.memoizedProps,
											Be = te.memoizedState,
											L = i.stateNode,
											N = L.getSnapshotBeforeUpdate(
												i.elementType === i.type ? ne : Qt(i.type, ne),
												Be,
											);
										L.__reactInternalSnapshotBeforeUpdate = N;
									}
									break;
								case 3:
									var j = i.stateNode.containerInfo;
									j.nodeType === 1
										? (j.textContent = '')
										: j.nodeType === 9 && j.documentElement && j.removeChild(j.documentElement);
									break;
								case 5:
								case 6:
								case 4:
								case 17:
									break;
								default:
									throw Error(n(163));
							}
					} catch (Q) {
						De(i, i.return, Q);
					}
					if (((r = i.sibling), r !== null)) {
						(r.return = i.return), (ee = r);
						break;
					}
					ee = i.return;
				}
		return (te = Yh), (Yh = !1), te;
	}
	function yi(r, i, a) {
		var f = i.updateQueue;
		if (((f = f !== null ? f.lastEffect : null), f !== null)) {
			var h = (f = f.next);
			do {
				if ((h.tag & r) === r) {
					var m = h.destroy;
					(h.destroy = void 0), m !== void 0 && Pc(i, a, m);
				}
				h = h.next;
			} while (h !== f);
		}
	}
	function Vo(r, i) {
		if (((i = i.updateQueue), (i = i !== null ? i.lastEffect : null), i !== null)) {
			var a = (i = i.next);
			do {
				if ((a.tag & r) === r) {
					var f = a.create;
					a.destroy = f();
				}
				a = a.next;
			} while (a !== i);
		}
	}
	function Oc(r) {
		var i = r.ref;
		if (i !== null) {
			var a = r.stateNode;
			switch (r.tag) {
				case 5:
					r = a;
					break;
				default:
					r = a;
			}
			typeof i == 'function' ? i(r) : (i.current = r);
		}
	}
	function Zh(r) {
		var i = r.alternate;
		i !== null && ((r.alternate = null), Zh(i)),
			(r.child = null),
			(r.deletions = null),
			(r.sibling = null),
			r.tag === 5 &&
				((i = r.stateNode),
				i !== null && (delete i[on], delete i[oi], delete i[Xa], delete i[Lw], delete i[Mw])),
			(r.stateNode = null),
			(r.return = null),
			(r.dependencies = null),
			(r.memoizedProps = null),
			(r.memoizedState = null),
			(r.pendingProps = null),
			(r.stateNode = null),
			(r.updateQueue = null);
	}
	function ep(r) {
		return r.tag === 5 || r.tag === 3 || r.tag === 4;
	}
	function tp(r) {
		e: for (;;) {
			for (; r.sibling === null; ) {
				if (r.return === null || ep(r.return)) return null;
				r = r.return;
			}
			for (
				r.sibling.return = r.return, r = r.sibling;
				r.tag !== 5 && r.tag !== 6 && r.tag !== 18;
			) {
				if (r.flags & 2 || r.child === null || r.tag === 4) continue e;
				(r.child.return = r), (r = r.child);
			}
			if (!(r.flags & 2)) return r.stateNode;
		}
	}
	function $c(r, i, a) {
		var f = r.tag;
		if (f === 5 || f === 6)
			(r = r.stateNode),
				i
					? a.nodeType === 8
						? a.parentNode.insertBefore(r, i)
						: a.insertBefore(r, i)
					: (a.nodeType === 8
							? ((i = a.parentNode), i.insertBefore(r, a))
							: ((i = a), i.appendChild(r)),
						(a = a._reactRootContainer),
						a != null || i.onclick !== null || (i.onclick = _o));
		else if (f !== 4 && ((r = r.child), r !== null))
			for ($c(r, i, a), r = r.sibling; r !== null; ) $c(r, i, a), (r = r.sibling);
	}
	function Rc(r, i, a) {
		var f = r.tag;
		if (f === 5 || f === 6) (r = r.stateNode), i ? a.insertBefore(r, i) : a.appendChild(r);
		else if (f !== 4 && ((r = r.child), r !== null))
			for (Rc(r, i, a), r = r.sibling; r !== null; ) Rc(r, i, a), (r = r.sibling);
	}
	var Xe = null,
		Jt = !1;
	function Vn(r, i, a) {
		for (a = a.child; a !== null; ) np(r, i, a), (a = a.sibling);
	}
	function np(r, i, a) {
		if (sn && typeof sn.onCommitFiberUnmount == 'function')
			try {
				sn.onCommitFiberUnmount(ro, a);
			} catch {}
		switch (a.tag) {
			case 5:
				it || rs(a, i);
			case 6:
				var f = Xe,
					h = Jt;
				(Xe = null),
					Vn(r, i, a),
					(Xe = f),
					(Jt = h),
					Xe !== null &&
						(Jt
							? ((r = Xe),
								(a = a.stateNode),
								r.nodeType === 8 ? r.parentNode.removeChild(a) : r.removeChild(a))
							: Xe.removeChild(a.stateNode));
				break;
			case 18:
				Xe !== null &&
					(Jt
						? ((r = Xe),
							(a = a.stateNode),
							r.nodeType === 8 ? Ja(r.parentNode, a) : r.nodeType === 1 && Ja(r, a),
							Qs(r))
						: Ja(Xe, a.stateNode));
				break;
			case 4:
				(f = Xe),
					(h = Jt),
					(Xe = a.stateNode.containerInfo),
					(Jt = !0),
					Vn(r, i, a),
					(Xe = f),
					(Jt = h);
				break;
			case 0:
			case 11:
			case 14:
			case 15:
				if (!it && ((f = a.updateQueue), f !== null && ((f = f.lastEffect), f !== null))) {
					h = f = f.next;
					do {
						var m = h,
							x = m.destroy;
						(m = m.tag),
							x !== void 0 && ((m & 2) !== 0 || (m & 4) !== 0) && Pc(a, i, x),
							(h = h.next);
					} while (h !== f);
				}
				Vn(r, i, a);
				break;
			case 1:
				if (!it && (rs(a, i), (f = a.stateNode), typeof f.componentWillUnmount == 'function'))
					try {
						(f.props = a.memoizedProps), (f.state = a.memoizedState), f.componentWillUnmount();
					} catch (b) {
						De(a, i, b);
					}
				Vn(r, i, a);
				break;
			case 21:
				Vn(r, i, a);
				break;
			case 22:
				a.mode & 1
					? ((it = (f = it) || a.memoizedState !== null), Vn(r, i, a), (it = f))
					: Vn(r, i, a);
				break;
			default:
				Vn(r, i, a);
		}
	}
	function rp(r) {
		var i = r.updateQueue;
		if (i !== null) {
			r.updateQueue = null;
			var a = r.stateNode;
			a === null && (a = r.stateNode = new Gw()),
				i.forEach(function (f) {
					var h = s0.bind(null, r, f);
					a.has(f) || (a.add(f), f.then(h, h));
				});
		}
	}
	function Xt(r, i) {
		var a = i.deletions;
		if (a !== null)
			for (var f = 0; f < a.length; f++) {
				var h = a[f];
				try {
					var m = r,
						x = i,
						b = x;
					e: for (; b !== null; ) {
						switch (b.tag) {
							case 5:
								(Xe = b.stateNode), (Jt = !1);
								break e;
							case 3:
								(Xe = b.stateNode.containerInfo), (Jt = !0);
								break e;
							case 4:
								(Xe = b.stateNode.containerInfo), (Jt = !0);
								break e;
						}
						b = b.return;
					}
					if (Xe === null) throw Error(n(160));
					np(m, x, h), (Xe = null), (Jt = !1);
					var T = h.alternate;
					T !== null && (T.return = null), (h.return = null);
				} catch (P) {
					De(h, i, P);
				}
			}
		if (i.subtreeFlags & 12854) for (i = i.child; i !== null; ) sp(i, r), (i = i.sibling);
	}
	function sp(r, i) {
		var a = r.alternate,
			f = r.flags;
		switch (r.tag) {
			case 0:
			case 11:
			case 14:
			case 15:
				if ((Xt(i, r), cn(r), f & 4)) {
					try {
						yi(3, r, r.return), Vo(3, r);
					} catch (ne) {
						De(r, r.return, ne);
					}
					try {
						yi(5, r, r.return);
					} catch (ne) {
						De(r, r.return, ne);
					}
				}
				break;
			case 1:
				Xt(i, r), cn(r), f & 512 && a !== null && rs(a, a.return);
				break;
			case 5:
				if ((Xt(i, r), cn(r), f & 512 && a !== null && rs(a, a.return), r.flags & 32)) {
					var h = r.stateNode;
					try {
						Mn(h, '');
					} catch (ne) {
						De(r, r.return, ne);
					}
				}
				if (f & 4 && ((h = r.stateNode), h != null)) {
					var m = r.memoizedProps,
						x = a !== null ? a.memoizedProps : m,
						b = r.type,
						T = r.updateQueue;
					if (((r.updateQueue = null), T !== null))
						try {
							b === 'input' && m.type === 'radio' && m.name != null && Qi(h, m), pa(b, x);
							var P = pa(b, m);
							for (x = 0; x < T.length; x += 2) {
								var V = T[x],
									W = T[x + 1];
								V === 'style'
									? Bf(h, W)
									: V === 'dangerouslySetInnerHTML'
										? Zi(h, W)
										: V === 'children'
											? Mn(h, W)
											: O(h, V, W, P);
							}
							switch (b) {
								case 'input':
									Rs(h, m);
									break;
								case 'textarea':
									Yi(h, m);
									break;
								case 'select':
									var U = h._wrapperState.wasMultiple;
									h._wrapperState.wasMultiple = !!m.multiple;
									var Y = m.value;
									Y != null
										? nn(h, !!m.multiple, Y, !1)
										: U !== !!m.multiple &&
											(m.defaultValue != null
												? nn(h, !!m.multiple, m.defaultValue, !0)
												: nn(h, !!m.multiple, m.multiple ? [] : '', !1));
							}
							h[oi] = m;
						} catch (ne) {
							De(r, r.return, ne);
						}
				}
				break;
			case 6:
				if ((Xt(i, r), cn(r), f & 4)) {
					if (r.stateNode === null) throw Error(n(162));
					(h = r.stateNode), (m = r.memoizedProps);
					try {
						h.nodeValue = m;
					} catch (ne) {
						De(r, r.return, ne);
					}
				}
				break;
			case 3:
				if ((Xt(i, r), cn(r), f & 4 && a !== null && a.memoizedState.isDehydrated))
					try {
						Qs(i.containerInfo);
					} catch (ne) {
						De(r, r.return, ne);
					}
				break;
			case 4:
				Xt(i, r), cn(r);
				break;
			case 13:
				Xt(i, r),
					cn(r),
					(h = r.child),
					h.flags & 8192 &&
						((m = h.memoizedState !== null),
						(h.stateNode.isHidden = m),
						!m || (h.alternate !== null && h.alternate.memoizedState !== null) || (Bc = Fe())),
					f & 4 && rp(r);
				break;
			case 22:
				if (
					((V = a !== null && a.memoizedState !== null),
					r.mode & 1 ? ((it = (P = it) || V), Xt(i, r), (it = P)) : Xt(i, r),
					cn(r),
					f & 8192)
				) {
					if (
						((P = r.memoizedState !== null), (r.stateNode.isHidden = P) && !V && (r.mode & 1) !== 0)
					)
						for (ee = r, V = r.child; V !== null; ) {
							for (W = ee = V; ee !== null; ) {
								switch (((U = ee), (Y = U.child), U.tag)) {
									case 0:
									case 11:
									case 14:
									case 15:
										yi(4, U, U.return);
										break;
									case 1:
										rs(U, U.return);
										var te = U.stateNode;
										if (typeof te.componentWillUnmount == 'function') {
											(f = U), (a = U.return);
											try {
												(i = f),
													(te.props = i.memoizedProps),
													(te.state = i.memoizedState),
													te.componentWillUnmount();
											} catch (ne) {
												De(f, a, ne);
											}
										}
										break;
									case 5:
										rs(U, U.return);
										break;
									case 22:
										if (U.memoizedState !== null) {
											lp(W);
											continue;
										}
								}
								Y !== null ? ((Y.return = U), (ee = Y)) : lp(W);
							}
							V = V.sibling;
						}
					e: for (V = null, W = r; ; ) {
						if (W.tag === 5) {
							if (V === null) {
								V = W;
								try {
									(h = W.stateNode),
										P
											? ((m = h.style),
												typeof m.setProperty == 'function'
													? m.setProperty('display', 'none', 'important')
													: (m.display = 'none'))
											: ((b = W.stateNode),
												(T = W.memoizedProps.style),
												(x = T != null && T.hasOwnProperty('display') ? T.display : null),
												(b.style.display = jt('display', x)));
								} catch (ne) {
									De(r, r.return, ne);
								}
							}
						} else if (W.tag === 6) {
							if (V === null)
								try {
									W.stateNode.nodeValue = P ? '' : W.memoizedProps;
								} catch (ne) {
									De(r, r.return, ne);
								}
						} else if (
							((W.tag !== 22 && W.tag !== 23) || W.memoizedState === null || W === r) &&
							W.child !== null
						) {
							(W.child.return = W), (W = W.child);
							continue;
						}
						if (W === r) break e;
						for (; W.sibling === null; ) {
							if (W.return === null || W.return === r) break e;
							V === W && (V = null), (W = W.return);
						}
						V === W && (V = null), (W.sibling.return = W.return), (W = W.sibling);
					}
				}
				break;
			case 19:
				Xt(i, r), cn(r), f & 4 && rp(r);
				break;
			case 21:
				break;
			default:
				Xt(i, r), cn(r);
		}
	}
	function cn(r) {
		var i = r.flags;
		if (i & 2) {
			try {
				e: {
					for (var a = r.return; a !== null; ) {
						if (ep(a)) {
							var f = a;
							break e;
						}
						a = a.return;
					}
					throw Error(n(160));
				}
				switch (f.tag) {
					case 5:
						var h = f.stateNode;
						f.flags & 32 && (Mn(h, ''), (f.flags &= -33));
						var m = tp(r);
						Rc(r, m, h);
						break;
					case 3:
					case 4:
						var x = f.stateNode.containerInfo,
							b = tp(r);
						$c(r, b, x);
						break;
					default:
						throw Error(n(161));
				}
			} catch (T) {
				De(r, r.return, T);
			}
			r.flags &= -3;
		}
		i & 4096 && (r.flags &= -4097);
	}
	function Jw(r, i, a) {
		(ee = r), ip(r);
	}
	function ip(r, i, a) {
		for (var f = (r.mode & 1) !== 0; ee !== null; ) {
			var h = ee,
				m = h.child;
			if (h.tag === 22 && f) {
				var x = h.memoizedState !== null || qo;
				if (!x) {
					var b = h.alternate,
						T = (b !== null && b.memoizedState !== null) || it;
					b = qo;
					var P = it;
					if (((qo = x), (it = T) && !P))
						for (ee = h; ee !== null; )
							(x = ee),
								(T = x.child),
								x.tag === 22 && x.memoizedState !== null
									? ap(h)
									: T !== null
										? ((T.return = x), (ee = T))
										: ap(h);
					for (; m !== null; ) (ee = m), ip(m), (m = m.sibling);
					(ee = h), (qo = b), (it = P);
				}
				op(r);
			} else (h.subtreeFlags & 8772) !== 0 && m !== null ? ((m.return = h), (ee = m)) : op(r);
		}
	}
	function op(r) {
		for (; ee !== null; ) {
			var i = ee;
			if ((i.flags & 8772) !== 0) {
				var a = i.alternate;
				try {
					if ((i.flags & 8772) !== 0)
						switch (i.tag) {
							case 0:
							case 11:
							case 15:
								it || Vo(5, i);
								break;
							case 1:
								var f = i.stateNode;
								if (i.flags & 4 && !it)
									if (a === null) f.componentDidMount();
									else {
										var h =
											i.elementType === i.type ? a.memoizedProps : Qt(i.type, a.memoizedProps);
										f.componentDidUpdate(h, a.memoizedState, f.__reactInternalSnapshotBeforeUpdate);
									}
								var m = i.updateQueue;
								m !== null && lh(i, m, f);
								break;
							case 3:
								var x = i.updateQueue;
								if (x !== null) {
									if (((a = null), i.child !== null))
										switch (i.child.tag) {
											case 5:
												a = i.child.stateNode;
												break;
											case 1:
												a = i.child.stateNode;
										}
									lh(i, x, a);
								}
								break;
							case 5:
								var b = i.stateNode;
								if (a === null && i.flags & 4) {
									a = b;
									var T = i.memoizedProps;
									switch (i.type) {
										case 'button':
										case 'input':
										case 'select':
										case 'textarea':
											T.autoFocus && a.focus();
											break;
										case 'img':
											T.src && (a.src = T.src);
									}
								}
								break;
							case 6:
								break;
							case 4:
								break;
							case 12:
								break;
							case 13:
								if (i.memoizedState === null) {
									var P = i.alternate;
									if (P !== null) {
										var V = P.memoizedState;
										if (V !== null) {
											var W = V.dehydrated;
											W !== null && Qs(W);
										}
									}
								}
								break;
							case 19:
							case 17:
							case 21:
							case 22:
							case 23:
							case 25:
								break;
							default:
								throw Error(n(163));
						}
					it || (i.flags & 512 && Oc(i));
				} catch (U) {
					De(i, i.return, U);
				}
			}
			if (i === r) {
				ee = null;
				break;
			}
			if (((a = i.sibling), a !== null)) {
				(a.return = i.return), (ee = a);
				break;
			}
			ee = i.return;
		}
	}
	function lp(r) {
		for (; ee !== null; ) {
			var i = ee;
			if (i === r) {
				ee = null;
				break;
			}
			var a = i.sibling;
			if (a !== null) {
				(a.return = i.return), (ee = a);
				break;
			}
			ee = i.return;
		}
	}
	function ap(r) {
		for (; ee !== null; ) {
			var i = ee;
			try {
				switch (i.tag) {
					case 0:
					case 11:
					case 15:
						var a = i.return;
						try {
							Vo(4, i);
						} catch (T) {
							De(i, a, T);
						}
						break;
					case 1:
						var f = i.stateNode;
						if (typeof f.componentDidMount == 'function') {
							var h = i.return;
							try {
								f.componentDidMount();
							} catch (T) {
								De(i, h, T);
							}
						}
						var m = i.return;
						try {
							Oc(i);
						} catch (T) {
							De(i, m, T);
						}
						break;
					case 5:
						var x = i.return;
						try {
							Oc(i);
						} catch (T) {
							De(i, x, T);
						}
				}
			} catch (T) {
				De(i, i.return, T);
			}
			if (i === r) {
				ee = null;
				break;
			}
			var b = i.sibling;
			if (b !== null) {
				(b.return = i.return), (ee = b);
				break;
			}
			ee = i.return;
		}
	}
	var Xw = Math.ceil,
		Wo = D.ReactCurrentDispatcher,
		Dc = D.ReactCurrentOwner,
		Dt = D.ReactCurrentBatchConfig,
		ve = 0,
		Qe = null,
		Ue = null,
		Ye = 0,
		It = 0,
		ss = Bn(0),
		We = 0,
		vi = null,
		pr = 0,
		Ko = 0,
		Fc = 0,
		wi = null,
		wt = null,
		Bc = 0,
		is = 1 / 0,
		xn = null,
		Go = !1,
		zc = null,
		Wn = null,
		Qo = !1,
		Kn = null,
		Jo = 0,
		Si = 0,
		Hc = null,
		Xo = -1,
		Yo = 0;
	function ft() {
		return (ve & 6) !== 0 ? Fe() : Xo !== -1 ? Xo : (Xo = Fe());
	}
	function Gn(r) {
		return (r.mode & 1) === 0
			? 1
			: (ve & 2) !== 0 && Ye !== 0
				? Ye & -Ye
				: Pw.transition !== null
					? (Yo === 0 && (Yo = td()), Yo)
					: ((r = xe), r !== 0 || ((r = window.event), (r = r === void 0 ? 16 : ud(r.type))), r);
	}
	function Yt(r, i, a, f) {
		if (50 < Si) throw ((Si = 0), (Hc = null), Error(n(185)));
		qs(r, a, f),
			((ve & 2) === 0 || r !== Qe) &&
				(r === Qe && ((ve & 2) === 0 && (Ko |= a), We === 4 && Qn(r, Ye)),
				St(r, f),
				a === 1 && ve === 0 && (i.mode & 1) === 0 && ((is = Fe() + 500), To && Hn()));
	}
	function St(r, i) {
		var a = r.callbackNode;
		Pv(r, i);
		var f = oo(r, r === Qe ? Ye : 0);
		if (f === 0) a !== null && Yf(a), (r.callbackNode = null), (r.callbackPriority = 0);
		else if (((i = f & -f), r.callbackPriority !== i)) {
			if ((a != null && Yf(a), i === 1))
				r.tag === 0 ? jw(up.bind(null, r)) : Qd(up.bind(null, r)),
					Aw(function () {
						(ve & 6) === 0 && Hn();
					}),
					(a = null);
			else {
				switch (nd(f)) {
					case 1:
						a = xa;
						break;
					case 4:
						a = Zf;
						break;
					case 16:
						a = no;
						break;
					case 536870912:
						a = ed;
						break;
					default:
						a = no;
				}
				a = vp(a, cp.bind(null, r));
			}
			(r.callbackPriority = i), (r.callbackNode = a);
		}
	}
	function cp(r, i) {
		if (((Xo = -1), (Yo = 0), (ve & 6) !== 0)) throw Error(n(327));
		var a = r.callbackNode;
		if (os() && r.callbackNode !== a) return null;
		var f = oo(r, r === Qe ? Ye : 0);
		if (f === 0) return null;
		if ((f & 30) !== 0 || (f & r.expiredLanes) !== 0 || i) i = Zo(r, f);
		else {
			i = f;
			var h = ve;
			ve |= 2;
			var m = dp();
			(Qe !== r || Ye !== i) && ((xn = null), (is = Fe() + 500), gr(r, i));
			do
				try {
					e0();
					break;
				} catch (b) {
					fp(r, b);
				}
			while (!0);
			oc(), (Wo.current = m), (ve = h), Ue !== null ? (i = 0) : ((Qe = null), (Ye = 0), (i = We));
		}
		if (i !== 0) {
			if ((i === 2 && ((h = _a(r)), h !== 0 && ((f = h), (i = Uc(r, h)))), i === 1))
				throw ((a = vi), gr(r, 0), Qn(r, f), St(r, Fe()), a);
			if (i === 6) Qn(r, f);
			else {
				if (
					((h = r.current.alternate),
					(f & 30) === 0 &&
						!Yw(h) &&
						((i = Zo(r, f)),
						i === 2 && ((m = _a(r)), m !== 0 && ((f = m), (i = Uc(r, m)))),
						i === 1))
				)
					throw ((a = vi), gr(r, 0), Qn(r, f), St(r, Fe()), a);
				switch (((r.finishedWork = h), (r.finishedLanes = f), i)) {
					case 0:
					case 1:
						throw Error(n(345));
					case 2:
						yr(r, wt, xn);
						break;
					case 3:
						if ((Qn(r, f), (f & 130023424) === f && ((i = Bc + 500 - Fe()), 10 < i))) {
							if (oo(r, 0) !== 0) break;
							if (((h = r.suspendedLanes), (h & f) !== f)) {
								ft(), (r.pingedLanes |= r.suspendedLanes & h);
								break;
							}
							r.timeoutHandle = Qa(yr.bind(null, r, wt, xn), i);
							break;
						}
						yr(r, wt, xn);
						break;
					case 4:
						if ((Qn(r, f), (f & 4194240) === f)) break;
						for (i = r.eventTimes, h = -1; 0 < f; ) {
							var x = 31 - Wt(f);
							(m = 1 << x), (x = i[x]), x > h && (h = x), (f &= ~m);
						}
						if (
							((f = h),
							(f = Fe() - f),
							(f =
								(120 > f
									? 120
									: 480 > f
										? 480
										: 1080 > f
											? 1080
											: 1920 > f
												? 1920
												: 3e3 > f
													? 3e3
													: 4320 > f
														? 4320
														: 1960 * Xw(f / 1960)) - f),
							10 < f)
						) {
							r.timeoutHandle = Qa(yr.bind(null, r, wt, xn), f);
							break;
						}
						yr(r, wt, xn);
						break;
					case 5:
						yr(r, wt, xn);
						break;
					default:
						throw Error(n(329));
				}
			}
		}
		return St(r, Fe()), r.callbackNode === a ? cp.bind(null, r) : null;
	}
	function Uc(r, i) {
		var a = wi;
		return (
			r.current.memoizedState.isDehydrated && (gr(r, i).flags |= 256),
			(r = Zo(r, i)),
			r !== 2 && ((i = wt), (wt = a), i !== null && qc(i)),
			r
		);
	}
	function qc(r) {
		wt === null ? (wt = r) : wt.push.apply(wt, r);
	}
	function Yw(r) {
		for (var i = r; ; ) {
			if (i.flags & 16384) {
				var a = i.updateQueue;
				if (a !== null && ((a = a.stores), a !== null))
					for (var f = 0; f < a.length; f++) {
						var h = a[f],
							m = h.getSnapshot;
						h = h.value;
						try {
							if (!Kt(m(), h)) return !1;
						} catch {
							return !1;
						}
					}
			}
			if (((a = i.child), i.subtreeFlags & 16384 && a !== null)) (a.return = i), (i = a);
			else {
				if (i === r) break;
				for (; i.sibling === null; ) {
					if (i.return === null || i.return === r) return !0;
					i = i.return;
				}
				(i.sibling.return = i.return), (i = i.sibling);
			}
		}
		return !0;
	}
	function Qn(r, i) {
		for (
			i &= ~Fc, i &= ~Ko, r.suspendedLanes |= i, r.pingedLanes &= ~i, r = r.expirationTimes;
			0 < i;
		) {
			var a = 31 - Wt(i),
				f = 1 << a;
			(r[a] = -1), (i &= ~f);
		}
	}
	function up(r) {
		if ((ve & 6) !== 0) throw Error(n(327));
		os();
		var i = oo(r, 0);
		if ((i & 1) === 0) return St(r, Fe()), null;
		var a = Zo(r, i);
		if (r.tag !== 0 && a === 2) {
			var f = _a(r);
			f !== 0 && ((i = f), (a = Uc(r, f)));
		}
		if (a === 1) throw ((a = vi), gr(r, 0), Qn(r, i), St(r, Fe()), a);
		if (a === 6) throw Error(n(345));
		return (
			(r.finishedWork = r.current.alternate),
			(r.finishedLanes = i),
			yr(r, wt, xn),
			St(r, Fe()),
			null
		);
	}
	function Vc(r, i) {
		var a = ve;
		ve |= 1;
		try {
			return r(i);
		} finally {
			(ve = a), ve === 0 && ((is = Fe() + 500), To && Hn());
		}
	}
	function mr(r) {
		Kn !== null && Kn.tag === 0 && (ve & 6) === 0 && os();
		var i = ve;
		ve |= 1;
		var a = Dt.transition,
			f = xe;
		try {
			if (((Dt.transition = null), (xe = 1), r)) return r();
		} finally {
			(xe = f), (Dt.transition = a), (ve = i), (ve & 6) === 0 && Hn();
		}
	}
	function Wc() {
		(It = ss.current), Ne(ss);
	}
	function gr(r, i) {
		(r.finishedWork = null), (r.finishedLanes = 0);
		var a = r.timeoutHandle;
		if ((a !== -1 && ((r.timeoutHandle = -1), Nw(a)), Ue !== null))
			for (a = Ue.return; a !== null; ) {
				var f = a;
				switch ((tc(f), f.tag)) {
					case 1:
						(f = f.type.childContextTypes), f != null && ko();
						break;
					case 3:
						ts(), Ne(gt), Ne(nt), pc();
						break;
					case 5:
						dc(f);
						break;
					case 4:
						ts();
						break;
					case 13:
						Ne(je);
						break;
					case 19:
						Ne(je);
						break;
					case 10:
						lc(f.type._context);
						break;
					case 22:
					case 23:
						Wc();
				}
				a = a.return;
			}
		if (
			((Qe = r),
			(Ue = r = Jn(r.current, null)),
			(Ye = It = i),
			(We = 0),
			(vi = null),
			(Fc = Ko = pr = 0),
			(wt = wi = null),
			fr !== null)
		) {
			for (i = 0; i < fr.length; i++)
				if (((a = fr[i]), (f = a.interleaved), f !== null)) {
					a.interleaved = null;
					var h = f.next,
						m = a.pending;
					if (m !== null) {
						var x = m.next;
						(m.next = h), (f.next = x);
					}
					a.pending = f;
				}
			fr = null;
		}
		return r;
	}
	function fp(r, i) {
		do {
			var a = Ue;
			try {
				if ((oc(), ($o.current = Bo), Ro)) {
					for (var f = Pe.memoizedState; f !== null; ) {
						var h = f.queue;
						h !== null && (h.pending = null), (f = f.next);
					}
					Ro = !1;
				}
				if (
					((hr = 0),
					(Ge = Ve = Pe = null),
					(di = !1),
					(hi = 0),
					(Dc.current = null),
					a === null || a.return === null)
				) {
					(We = 1), (vi = i), (Ue = null);
					break;
				}
				e: {
					var m = r,
						x = a.return,
						b = a,
						T = i;
					if (
						((i = Ye),
						(b.flags |= 32768),
						T !== null && typeof T == 'object' && typeof T.then == 'function')
					) {
						var P = T,
							V = b,
							W = V.tag;
						if ((V.mode & 1) === 0 && (W === 0 || W === 11 || W === 15)) {
							var U = V.alternate;
							U
								? ((V.updateQueue = U.updateQueue),
									(V.memoizedState = U.memoizedState),
									(V.lanes = U.lanes))
								: ((V.updateQueue = null), (V.memoizedState = null));
						}
						var Y = $h(x);
						if (Y !== null) {
							(Y.flags &= -257), Rh(Y, x, b, m, i), Y.mode & 1 && Oh(m, P, i), (i = Y), (T = P);
							var te = i.updateQueue;
							if (te === null) {
								var ne = new Set();
								ne.add(T), (i.updateQueue = ne);
							} else te.add(T);
							break e;
						} else {
							if ((i & 1) === 0) {
								Oh(m, P, i), Kc();
								break e;
							}
							T = Error(n(426));
						}
					} else if (Ie && b.mode & 1) {
						var Be = $h(x);
						if (Be !== null) {
							(Be.flags & 65536) === 0 && (Be.flags |= 256), Rh(Be, x, b, m, i), sc(ns(T, b));
							break e;
						}
					}
					(m = T = ns(T, b)), We !== 4 && (We = 2), wi === null ? (wi = [m]) : wi.push(m), (m = x);
					do {
						switch (m.tag) {
							case 3:
								(m.flags |= 65536), (i &= -i), (m.lanes |= i);
								var L = jh(m, T, i);
								oh(m, L);
								break e;
							case 1:
								b = T;
								var N = m.type,
									j = m.stateNode;
								if (
									(m.flags & 128) === 0 &&
									(typeof N.getDerivedStateFromError == 'function' ||
										(j !== null &&
											typeof j.componentDidCatch == 'function' &&
											(Wn === null || !Wn.has(j))))
								) {
									(m.flags |= 65536), (i &= -i), (m.lanes |= i);
									var Q = Ph(m, b, i);
									oh(m, Q);
									break e;
								}
						}
						m = m.return;
					} while (m !== null);
				}
				pp(a);
			} catch (re) {
				(i = re), Ue === a && a !== null && (Ue = a = a.return);
				continue;
			}
			break;
		} while (!0);
	}
	function dp() {
		var r = Wo.current;
		return (Wo.current = Bo), r === null ? Bo : r;
	}
	function Kc() {
		(We === 0 || We === 3 || We === 2) && (We = 4),
			Qe === null || ((pr & 268435455) === 0 && (Ko & 268435455) === 0) || Qn(Qe, Ye);
	}
	function Zo(r, i) {
		var a = ve;
		ve |= 2;
		var f = dp();
		(Qe !== r || Ye !== i) && ((xn = null), gr(r, i));
		do
			try {
				Zw();
				break;
			} catch (h) {
				fp(r, h);
			}
		while (!0);
		if ((oc(), (ve = a), (Wo.current = f), Ue !== null)) throw Error(n(261));
		return (Qe = null), (Ye = 0), We;
	}
	function Zw() {
		for (; Ue !== null; ) hp(Ue);
	}
	function e0() {
		for (; Ue !== null && !bv(); ) hp(Ue);
	}
	function hp(r) {
		var i = yp(r.alternate, r, It);
		(r.memoizedProps = r.pendingProps), i === null ? pp(r) : (Ue = i), (Dc.current = null);
	}
	function pp(r) {
		var i = r;
		do {
			var a = i.alternate;
			if (((r = i.return), (i.flags & 32768) === 0)) {
				if (((a = Ww(a, i, It)), a !== null)) {
					Ue = a;
					return;
				}
			} else {
				if (((a = Kw(a, i)), a !== null)) {
					(a.flags &= 32767), (Ue = a);
					return;
				}
				if (r !== null) (r.flags |= 32768), (r.subtreeFlags = 0), (r.deletions = null);
				else {
					(We = 6), (Ue = null);
					return;
				}
			}
			if (((i = i.sibling), i !== null)) {
				Ue = i;
				return;
			}
			Ue = i = r;
		} while (i !== null);
		We === 0 && (We = 5);
	}
	function yr(r, i, a) {
		var f = xe,
			h = Dt.transition;
		try {
			(Dt.transition = null), (xe = 1), t0(r, i, a, f);
		} finally {
			(Dt.transition = h), (xe = f);
		}
		return null;
	}
	function t0(r, i, a, f) {
		do os();
		while (Kn !== null);
		if ((ve & 6) !== 0) throw Error(n(327));
		a = r.finishedWork;
		var h = r.finishedLanes;
		if (a === null) return null;
		if (((r.finishedWork = null), (r.finishedLanes = 0), a === r.current)) throw Error(n(177));
		(r.callbackNode = null), (r.callbackPriority = 0);
		var m = a.lanes | a.childLanes;
		if (
			(Ov(r, m),
			r === Qe && ((Ue = Qe = null), (Ye = 0)),
			((a.subtreeFlags & 2064) === 0 && (a.flags & 2064) === 0) ||
				Qo ||
				((Qo = !0),
				vp(no, function () {
					return os(), null;
				})),
			(m = (a.flags & 15990) !== 0),
			(a.subtreeFlags & 15990) !== 0 || m)
		) {
			(m = Dt.transition), (Dt.transition = null);
			var x = xe;
			xe = 1;
			var b = ve;
			(ve |= 4),
				(Dc.current = null),
				Qw(r, a),
				sp(a, r),
				xw(Ka),
				(co = !!Wa),
				(Ka = Wa = null),
				(r.current = a),
				Jw(a),
				Tv(),
				(ve = b),
				(xe = x),
				(Dt.transition = m);
		} else r.current = a;
		if (
			(Qo && ((Qo = !1), (Kn = r), (Jo = h)),
			(m = r.pendingLanes),
			m === 0 && (Wn = null),
			Av(a.stateNode),
			St(r, Fe()),
			i !== null)
		)
			for (f = r.onRecoverableError, a = 0; a < i.length; a++)
				(h = i[a]), f(h.value, { componentStack: h.stack, digest: h.digest });
		if (Go) throw ((Go = !1), (r = zc), (zc = null), r);
		return (
			(Jo & 1) !== 0 && r.tag !== 0 && os(),
			(m = r.pendingLanes),
			(m & 1) !== 0 ? (r === Hc ? Si++ : ((Si = 0), (Hc = r))) : (Si = 0),
			Hn(),
			null
		);
	}
	function os() {
		if (Kn !== null) {
			var r = nd(Jo),
				i = Dt.transition,
				a = xe;
			try {
				if (((Dt.transition = null), (xe = 16 > r ? 16 : r), Kn === null)) var f = !1;
				else {
					if (((r = Kn), (Kn = null), (Jo = 0), (ve & 6) !== 0)) throw Error(n(331));
					var h = ve;
					for (ve |= 4, ee = r.current; ee !== null; ) {
						var m = ee,
							x = m.child;
						if ((ee.flags & 16) !== 0) {
							var b = m.deletions;
							if (b !== null) {
								for (var T = 0; T < b.length; T++) {
									var P = b[T];
									for (ee = P; ee !== null; ) {
										var V = ee;
										switch (V.tag) {
											case 0:
											case 11:
											case 15:
												yi(8, V, m);
										}
										var W = V.child;
										if (W !== null) (W.return = V), (ee = W);
										else
											for (; ee !== null; ) {
												V = ee;
												var U = V.sibling,
													Y = V.return;
												if ((Zh(V), V === P)) {
													ee = null;
													break;
												}
												if (U !== null) {
													(U.return = Y), (ee = U);
													break;
												}
												ee = Y;
											}
									}
								}
								var te = m.alternate;
								if (te !== null) {
									var ne = te.child;
									if (ne !== null) {
										te.child = null;
										do {
											var Be = ne.sibling;
											(ne.sibling = null), (ne = Be);
										} while (ne !== null);
									}
								}
								ee = m;
							}
						}
						if ((m.subtreeFlags & 2064) !== 0 && x !== null) (x.return = m), (ee = x);
						else
							e: for (; ee !== null; ) {
								if (((m = ee), (m.flags & 2048) !== 0))
									switch (m.tag) {
										case 0:
										case 11:
										case 15:
											yi(9, m, m.return);
									}
								var L = m.sibling;
								if (L !== null) {
									(L.return = m.return), (ee = L);
									break e;
								}
								ee = m.return;
							}
					}
					var N = r.current;
					for (ee = N; ee !== null; ) {
						x = ee;
						var j = x.child;
						if ((x.subtreeFlags & 2064) !== 0 && j !== null) (j.return = x), (ee = j);
						else
							e: for (x = N; ee !== null; ) {
								if (((b = ee), (b.flags & 2048) !== 0))
									try {
										switch (b.tag) {
											case 0:
											case 11:
											case 15:
												Vo(9, b);
										}
									} catch (re) {
										De(b, b.return, re);
									}
								if (b === x) {
									ee = null;
									break e;
								}
								var Q = b.sibling;
								if (Q !== null) {
									(Q.return = b.return), (ee = Q);
									break e;
								}
								ee = b.return;
							}
					}
					if (((ve = h), Hn(), sn && typeof sn.onPostCommitFiberRoot == 'function'))
						try {
							sn.onPostCommitFiberRoot(ro, r);
						} catch {}
					f = !0;
				}
				return f;
			} finally {
				(xe = a), (Dt.transition = i);
			}
		}
		return !1;
	}
	function mp(r, i, a) {
		(i = ns(a, i)),
			(i = jh(r, i, 1)),
			(r = qn(r, i, 1)),
			(i = ft()),
			r !== null && (qs(r, 1, i), St(r, i));
	}
	function De(r, i, a) {
		if (r.tag === 3) mp(r, r, a);
		else
			for (; i !== null; ) {
				if (i.tag === 3) {
					mp(i, r, a);
					break;
				} else if (i.tag === 1) {
					var f = i.stateNode;
					if (
						typeof i.type.getDerivedStateFromError == 'function' ||
						(typeof f.componentDidCatch == 'function' && (Wn === null || !Wn.has(f)))
					) {
						(r = ns(a, r)),
							(r = Ph(i, r, 1)),
							(i = qn(i, r, 1)),
							(r = ft()),
							i !== null && (qs(i, 1, r), St(i, r));
						break;
					}
				}
				i = i.return;
			}
	}
	function n0(r, i, a) {
		var f = r.pingCache;
		f !== null && f.delete(i),
			(i = ft()),
			(r.pingedLanes |= r.suspendedLanes & a),
			Qe === r &&
				(Ye & a) === a &&
				(We === 4 || (We === 3 && (Ye & 130023424) === Ye && 500 > Fe() - Bc)
					? gr(r, 0)
					: (Fc |= a)),
			St(r, i);
	}
	function gp(r, i) {
		i === 0 &&
			((r.mode & 1) === 0
				? (i = 1)
				: ((i = io), (io <<= 1), (io & 130023424) === 0 && (io = 4194304)));
		var a = ft();
		(r = vn(r, i)), r !== null && (qs(r, i, a), St(r, a));
	}
	function r0(r) {
		var i = r.memoizedState,
			a = 0;
		i !== null && (a = i.retryLane), gp(r, a);
	}
	function s0(r, i) {
		var a = 0;
		switch (r.tag) {
			case 13:
				var f = r.stateNode,
					h = r.memoizedState;
				h !== null && (a = h.retryLane);
				break;
			case 19:
				f = r.stateNode;
				break;
			default:
				throw Error(n(314));
		}
		f !== null && f.delete(i), gp(r, a);
	}
	var yp;
	yp = function (r, i, a) {
		if (r !== null)
			if (r.memoizedProps !== i.pendingProps || gt.current) vt = !0;
			else {
				if ((r.lanes & a) === 0 && (i.flags & 128) === 0) return (vt = !1), Vw(r, i, a);
				vt = (r.flags & 131072) !== 0;
			}
		else (vt = !1), Ie && (i.flags & 1048576) !== 0 && Jd(i, No, i.index);
		switch (((i.lanes = 0), i.tag)) {
			case 2:
				var f = i.type;
				Uo(r, i), (r = i.pendingProps);
				var h = Gr(i, nt.current);
				es(i, a), (h = yc(null, i, f, r, h, a));
				var m = vc();
				return (
					(i.flags |= 1),
					typeof h == 'object' &&
					h !== null &&
					typeof h.render == 'function' &&
					h.$$typeof === void 0
						? ((i.tag = 1),
							(i.memoizedState = null),
							(i.updateQueue = null),
							yt(f) ? ((m = !0), bo(i)) : (m = !1),
							(i.memoizedState = h.state !== null && h.state !== void 0 ? h.state : null),
							uc(i),
							(h.updater = zo),
							(i.stateNode = h),
							(h._reactInternals = i),
							kc(i, f, r, a),
							(i = Nc(null, i, f, !0, m, a)))
						: ((i.tag = 0), Ie && m && ec(i), ut(null, i, h, a), (i = i.child)),
					i
				);
			case 16:
				f = i.elementType;
				e: {
					switch (
						(Uo(r, i),
						(r = i.pendingProps),
						(h = f._init),
						(f = h(f._payload)),
						(i.type = f),
						(h = i.tag = o0(f)),
						(r = Qt(f, r)),
						h)
					) {
						case 0:
							i = Cc(null, i, f, r, a);
							break e;
						case 1:
							i = Uh(null, i, f, r, a);
							break e;
						case 11:
							i = Dh(null, i, f, r, a);
							break e;
						case 14:
							i = Fh(null, i, f, Qt(f.type, r), a);
							break e;
					}
					throw Error(n(306, f, ''));
				}
				return i;
			case 0:
				return (
					(f = i.type),
					(h = i.pendingProps),
					(h = i.elementType === f ? h : Qt(f, h)),
					Cc(r, i, f, h, a)
				);
			case 1:
				return (
					(f = i.type),
					(h = i.pendingProps),
					(h = i.elementType === f ? h : Qt(f, h)),
					Uh(r, i, f, h, a)
				);
			case 3:
				e: {
					if ((qh(i), r === null)) throw Error(n(387));
					(f = i.pendingProps), (m = i.memoizedState), (h = m.element), ih(r, i), Po(i, f, null, a);
					var x = i.memoizedState;
					if (((f = x.element), m.isDehydrated))
						if (
							((m = {
								element: f,
								isDehydrated: !1,
								cache: x.cache,
								pendingSuspenseBoundaries: x.pendingSuspenseBoundaries,
								transitions: x.transitions,
							}),
							(i.updateQueue.baseState = m),
							(i.memoizedState = m),
							i.flags & 256)
						) {
							(h = ns(Error(n(423)), i)), (i = Vh(r, i, f, a, h));
							break e;
						} else if (f !== h) {
							(h = ns(Error(n(424)), i)), (i = Vh(r, i, f, a, h));
							break e;
						} else
							for (
								At = Fn(i.stateNode.containerInfo.firstChild),
									Nt = i,
									Ie = !0,
									Gt = null,
									a = rh(i, null, f, a),
									i.child = a;
								a;
							)
								(a.flags = (a.flags & -3) | 4096), (a = a.sibling);
					else {
						if ((Xr(), f === h)) {
							i = Sn(r, i, a);
							break e;
						}
						ut(r, i, f, a);
					}
					i = i.child;
				}
				return i;
			case 5:
				return (
					ah(i),
					r === null && rc(i),
					(f = i.type),
					(h = i.pendingProps),
					(m = r !== null ? r.memoizedProps : null),
					(x = h.children),
					Ga(f, h) ? (x = null) : m !== null && Ga(f, m) && (i.flags |= 32),
					Hh(r, i),
					ut(r, i, x, a),
					i.child
				);
			case 6:
				return r === null && rc(i), null;
			case 13:
				return Wh(r, i, a);
			case 4:
				return (
					fc(i, i.stateNode.containerInfo),
					(f = i.pendingProps),
					r === null ? (i.child = Yr(i, null, f, a)) : ut(r, i, f, a),
					i.child
				);
			case 11:
				return (
					(f = i.type),
					(h = i.pendingProps),
					(h = i.elementType === f ? h : Qt(f, h)),
					Dh(r, i, f, h, a)
				);
			case 7:
				return ut(r, i, i.pendingProps, a), i.child;
			case 8:
				return ut(r, i, i.pendingProps.children, a), i.child;
			case 12:
				return ut(r, i, i.pendingProps.children, a), i.child;
			case 10:
				e: {
					if (
						((f = i.type._context),
						(h = i.pendingProps),
						(m = i.memoizedProps),
						(x = h.value),
						Te(Lo, f._currentValue),
						(f._currentValue = x),
						m !== null)
					)
						if (Kt(m.value, x)) {
							if (m.children === h.children && !gt.current) {
								i = Sn(r, i, a);
								break e;
							}
						} else
							for (m = i.child, m !== null && (m.return = i); m !== null; ) {
								var b = m.dependencies;
								if (b !== null) {
									x = m.child;
									for (var T = b.firstContext; T !== null; ) {
										if (T.context === f) {
											if (m.tag === 1) {
												(T = wn(-1, a & -a)), (T.tag = 2);
												var P = m.updateQueue;
												if (P !== null) {
													P = P.shared;
													var V = P.pending;
													V === null ? (T.next = T) : ((T.next = V.next), (V.next = T)),
														(P.pending = T);
												}
											}
											(m.lanes |= a),
												(T = m.alternate),
												T !== null && (T.lanes |= a),
												ac(m.return, a, i),
												(b.lanes |= a);
											break;
										}
										T = T.next;
									}
								} else if (m.tag === 10) x = m.type === i.type ? null : m.child;
								else if (m.tag === 18) {
									if (((x = m.return), x === null)) throw Error(n(341));
									(x.lanes |= a),
										(b = x.alternate),
										b !== null && (b.lanes |= a),
										ac(x, a, i),
										(x = m.sibling);
								} else x = m.child;
								if (x !== null) x.return = m;
								else
									for (x = m; x !== null; ) {
										if (x === i) {
											x = null;
											break;
										}
										if (((m = x.sibling), m !== null)) {
											(m.return = x.return), (x = m);
											break;
										}
										x = x.return;
									}
								m = x;
							}
					ut(r, i, h.children, a), (i = i.child);
				}
				return i;
			case 9:
				return (
					(h = i.type),
					(f = i.pendingProps.children),
					es(i, a),
					(h = $t(h)),
					(f = f(h)),
					(i.flags |= 1),
					ut(r, i, f, a),
					i.child
				);
			case 14:
				return (f = i.type), (h = Qt(f, i.pendingProps)), (h = Qt(f.type, h)), Fh(r, i, f, h, a);
			case 15:
				return Bh(r, i, i.type, i.pendingProps, a);
			case 17:
				return (
					(f = i.type),
					(h = i.pendingProps),
					(h = i.elementType === f ? h : Qt(f, h)),
					Uo(r, i),
					(i.tag = 1),
					yt(f) ? ((r = !0), bo(i)) : (r = !1),
					es(i, a),
					Lh(i, f, h),
					kc(i, f, h, a),
					Nc(null, i, f, !0, r, a)
				);
			case 19:
				return Gh(r, i, a);
			case 22:
				return zh(r, i, a);
		}
		throw Error(n(156, i.tag));
	};
	function vp(r, i) {
		return Xf(r, i);
	}
	function i0(r, i, a, f) {
		(this.tag = r),
			(this.key = a),
			(this.sibling =
				this.child =
				this.return =
				this.stateNode =
				this.type =
				this.elementType =
					null),
			(this.index = 0),
			(this.ref = null),
			(this.pendingProps = i),
			(this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null),
			(this.mode = f),
			(this.subtreeFlags = this.flags = 0),
			(this.deletions = null),
			(this.childLanes = this.lanes = 0),
			(this.alternate = null);
	}
	function Ft(r, i, a, f) {
		return new i0(r, i, a, f);
	}
	function Gc(r) {
		return (r = r.prototype), !(!r || !r.isReactComponent);
	}
	function o0(r) {
		if (typeof r == 'function') return Gc(r) ? 1 : 0;
		if (r != null) {
			if (((r = r.$$typeof), r === $)) return 11;
			if (r === Ae) return 14;
		}
		return 2;
	}
	function Jn(r, i) {
		var a = r.alternate;
		return (
			a === null
				? ((a = Ft(r.tag, i, r.key, r.mode)),
					(a.elementType = r.elementType),
					(a.type = r.type),
					(a.stateNode = r.stateNode),
					(a.alternate = r),
					(r.alternate = a))
				: ((a.pendingProps = i),
					(a.type = r.type),
					(a.flags = 0),
					(a.subtreeFlags = 0),
					(a.deletions = null)),
			(a.flags = r.flags & 14680064),
			(a.childLanes = r.childLanes),
			(a.lanes = r.lanes),
			(a.child = r.child),
			(a.memoizedProps = r.memoizedProps),
			(a.memoizedState = r.memoizedState),
			(a.updateQueue = r.updateQueue),
			(i = r.dependencies),
			(a.dependencies = i === null ? null : { lanes: i.lanes, firstContext: i.firstContext }),
			(a.sibling = r.sibling),
			(a.index = r.index),
			(a.ref = r.ref),
			a
		);
	}
	function el(r, i, a, f, h, m) {
		var x = 2;
		if (((f = r), typeof r == 'function')) Gc(r) && (x = 1);
		else if (typeof r == 'string') x = 5;
		else
			e: switch (r) {
				case q:
					return vr(a.children, h, m, i);
				case B:
					(x = 8), (h |= 8);
					break;
				case M:
					return (r = Ft(12, a, i, h | 2)), (r.elementType = M), (r.lanes = m), r;
				case X:
					return (r = Ft(13, a, i, h)), (r.elementType = X), (r.lanes = m), r;
				case ce:
					return (r = Ft(19, a, i, h)), (r.elementType = ce), (r.lanes = m), r;
				case ge:
					return tl(a, h, m, i);
				default:
					if (typeof r == 'object' && r !== null)
						switch (r.$$typeof) {
							case G:
								x = 10;
								break e;
							case K:
								x = 9;
								break e;
							case $:
								x = 11;
								break e;
							case Ae:
								x = 14;
								break e;
							case be:
								(x = 16), (f = null);
								break e;
						}
					throw Error(n(130, r == null ? r : typeof r, ''));
			}
		return (i = Ft(x, a, i, h)), (i.elementType = r), (i.type = f), (i.lanes = m), i;
	}
	function vr(r, i, a, f) {
		return (r = Ft(7, r, f, i)), (r.lanes = a), r;
	}
	function tl(r, i, a, f) {
		return (
			(r = Ft(22, r, f, i)),
			(r.elementType = ge),
			(r.lanes = a),
			(r.stateNode = { isHidden: !1 }),
			r
		);
	}
	function Qc(r, i, a) {
		return (r = Ft(6, r, null, i)), (r.lanes = a), r;
	}
	function Jc(r, i, a) {
		return (
			(i = Ft(4, r.children !== null ? r.children : [], r.key, i)),
			(i.lanes = a),
			(i.stateNode = {
				containerInfo: r.containerInfo,
				pendingChildren: null,
				implementation: r.implementation,
			}),
			i
		);
	}
	function l0(r, i, a, f, h) {
		(this.tag = i),
			(this.containerInfo = r),
			(this.finishedWork = this.pingCache = this.current = this.pendingChildren = null),
			(this.timeoutHandle = -1),
			(this.callbackNode = this.pendingContext = this.context = null),
			(this.callbackPriority = 0),
			(this.eventTimes = Ea(0)),
			(this.expirationTimes = Ea(-1)),
			(this.entangledLanes =
				this.finishedLanes =
				this.mutableReadLanes =
				this.expiredLanes =
				this.pingedLanes =
				this.suspendedLanes =
				this.pendingLanes =
					0),
			(this.entanglements = Ea(0)),
			(this.identifierPrefix = f),
			(this.onRecoverableError = h),
			(this.mutableSourceEagerHydrationData = null);
	}
	function Xc(r, i, a, f, h, m, x, b, T) {
		return (
			(r = new l0(r, i, a, b, T)),
			i === 1 ? ((i = 1), m === !0 && (i |= 8)) : (i = 0),
			(m = Ft(3, null, null, i)),
			(r.current = m),
			(m.stateNode = r),
			(m.memoizedState = {
				element: f,
				isDehydrated: a,
				cache: null,
				transitions: null,
				pendingSuspenseBoundaries: null,
			}),
			uc(m),
			r
		);
	}
	function a0(r, i, a) {
		var f = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
		return {
			$$typeof: z,
			key: f == null ? null : '' + f,
			children: r,
			containerInfo: i,
			implementation: a,
		};
	}
	function wp(r) {
		if (!r) return zn;
		r = r._reactInternals;
		e: {
			if (or(r) !== r || r.tag !== 1) throw Error(n(170));
			var i = r;
			do {
				switch (i.tag) {
					case 3:
						i = i.stateNode.context;
						break e;
					case 1:
						if (yt(i.type)) {
							i = i.stateNode.__reactInternalMemoizedMergedChildContext;
							break e;
						}
				}
				i = i.return;
			} while (i !== null);
			throw Error(n(171));
		}
		if (r.tag === 1) {
			var a = r.type;
			if (yt(a)) return Kd(r, a, i);
		}
		return i;
	}
	function Sp(r, i, a, f, h, m, x, b, T) {
		return (
			(r = Xc(a, f, !0, r, h, m, x, b, T)),
			(r.context = wp(null)),
			(a = r.current),
			(f = ft()),
			(h = Gn(a)),
			(m = wn(f, h)),
			(m.callback = i ?? null),
			qn(a, m, h),
			(r.current.lanes = h),
			qs(r, h, f),
			St(r, f),
			r
		);
	}
	function nl(r, i, a, f) {
		var h = i.current,
			m = ft(),
			x = Gn(h);
		return (
			(a = wp(a)),
			i.context === null ? (i.context = a) : (i.pendingContext = a),
			(i = wn(m, x)),
			(i.payload = { element: r }),
			(f = f === void 0 ? null : f),
			f !== null && (i.callback = f),
			(r = qn(h, i, x)),
			r !== null && (Yt(r, h, x, m), jo(r, h, x)),
			x
		);
	}
	function rl(r) {
		if (((r = r.current), !r.child)) return null;
		switch (r.child.tag) {
			case 5:
				return r.child.stateNode;
			default:
				return r.child.stateNode;
		}
	}
	function xp(r, i) {
		if (((r = r.memoizedState), r !== null && r.dehydrated !== null)) {
			var a = r.retryLane;
			r.retryLane = a !== 0 && a < i ? a : i;
		}
	}
	function Yc(r, i) {
		xp(r, i), (r = r.alternate) && xp(r, i);
	}
	function c0() {
		return null;
	}
	var _p =
		typeof reportError == 'function'
			? reportError
			: function (r) {
					console.error(r);
				};
	function Zc(r) {
		this._internalRoot = r;
	}
	(sl.prototype.render = Zc.prototype.render =
		function (r) {
			var i = this._internalRoot;
			if (i === null) throw Error(n(409));
			nl(r, i, null, null);
		}),
		(sl.prototype.unmount = Zc.prototype.unmount =
			function () {
				var r = this._internalRoot;
				if (r !== null) {
					this._internalRoot = null;
					var i = r.containerInfo;
					mr(function () {
						nl(null, r, null, null);
					}),
						(i[pn] = null);
				}
			});
	function sl(r) {
		this._internalRoot = r;
	}
	sl.prototype.unstable_scheduleHydration = function (r) {
		if (r) {
			var i = id();
			r = { blockedOn: null, target: r, priority: i };
			for (var a = 0; a < $n.length && i !== 0 && i < $n[a].priority; a++);
			$n.splice(a, 0, r), a === 0 && ad(r);
		}
	};
	function eu(r) {
		return !(!r || (r.nodeType !== 1 && r.nodeType !== 9 && r.nodeType !== 11));
	}
	function il(r) {
		return !(
			!r ||
			(r.nodeType !== 1 &&
				r.nodeType !== 9 &&
				r.nodeType !== 11 &&
				(r.nodeType !== 8 || r.nodeValue !== ' react-mount-point-unstable '))
		);
	}
	function Ep() {}
	function u0(r, i, a, f, h) {
		if (h) {
			if (typeof f == 'function') {
				var m = f;
				f = function () {
					var P = rl(x);
					m.call(P);
				};
			}
			var x = Sp(i, f, r, 0, null, !1, !1, '', Ep);
			return (
				(r._reactRootContainer = x),
				(r[pn] = x.current),
				si(r.nodeType === 8 ? r.parentNode : r),
				mr(),
				x
			);
		}
		for (; (h = r.lastChild); ) r.removeChild(h);
		if (typeof f == 'function') {
			var b = f;
			f = function () {
				var P = rl(T);
				b.call(P);
			};
		}
		var T = Xc(r, 0, !1, null, null, !1, !1, '', Ep);
		return (
			(r._reactRootContainer = T),
			(r[pn] = T.current),
			si(r.nodeType === 8 ? r.parentNode : r),
			mr(function () {
				nl(i, T, a, f);
			}),
			T
		);
	}
	function ol(r, i, a, f, h) {
		var m = a._reactRootContainer;
		if (m) {
			var x = m;
			if (typeof h == 'function') {
				var b = h;
				h = function () {
					var T = rl(x);
					b.call(T);
				};
			}
			nl(i, x, r, h);
		} else x = u0(a, i, r, h, f);
		return rl(x);
	}
	(rd = function (r) {
		switch (r.tag) {
			case 3:
				var i = r.stateNode;
				if (i.current.memoizedState.isDehydrated) {
					var a = Us(i.pendingLanes);
					a !== 0 && (ka(i, a | 1), St(i, Fe()), (ve & 6) === 0 && ((is = Fe() + 500), Hn()));
				}
				break;
			case 13:
				mr(function () {
					var f = vn(r, 1);
					if (f !== null) {
						var h = ft();
						Yt(f, r, 1, h);
					}
				}),
					Yc(r, 1);
		}
	}),
		(ba = function (r) {
			if (r.tag === 13) {
				var i = vn(r, 134217728);
				if (i !== null) {
					var a = ft();
					Yt(i, r, 134217728, a);
				}
				Yc(r, 134217728);
			}
		}),
		(sd = function (r) {
			if (r.tag === 13) {
				var i = Gn(r),
					a = vn(r, i);
				if (a !== null) {
					var f = ft();
					Yt(a, r, i, f);
				}
				Yc(r, i);
			}
		}),
		(id = function () {
			return xe;
		}),
		(od = function (r, i) {
			var a = xe;
			try {
				return (xe = r), i();
			} finally {
				xe = a;
			}
		}),
		(ya = function (r, i, a) {
			switch (i) {
				case 'input':
					if ((Rs(r, a), (i = a.name), a.type === 'radio' && i != null)) {
						for (a = r; a.parentNode; ) a = a.parentNode;
						for (
							a = a.querySelectorAll('input[name=' + JSON.stringify('' + i) + '][type="radio"]'),
								i = 0;
							i < a.length;
							i++
						) {
							var f = a[i];
							if (f !== r && f.form === r.form) {
								var h = Eo(f);
								if (!h) throw Error(n(90));
								jr(f), Rs(f, h);
							}
						}
					}
					break;
				case 'textarea':
					Yi(r, a);
					break;
				case 'select':
					(i = a.value), i != null && nn(r, !!a.multiple, i, !1);
			}
		}),
		(qf = Vc),
		(Vf = mr);
	var f0 = { usingClientEntryPoint: !1, Events: [li, Wr, Eo, Hf, Uf, Vc] },
		xi = {
			findFiberByHostInstance: lr,
			bundleType: 0,
			version: '18.3.1',
			rendererPackageName: 'react-dom',
		},
		d0 = {
			bundleType: xi.bundleType,
			version: xi.version,
			rendererPackageName: xi.rendererPackageName,
			rendererConfig: xi.rendererConfig,
			overrideHookState: null,
			overrideHookStateDeletePath: null,
			overrideHookStateRenamePath: null,
			overrideProps: null,
			overridePropsDeletePath: null,
			overridePropsRenamePath: null,
			setErrorHandler: null,
			setSuspenseHandler: null,
			scheduleUpdate: null,
			currentDispatcherRef: D.ReactCurrentDispatcher,
			findHostInstanceByFiber: function (r) {
				return (r = Qf(r)), r === null ? null : r.stateNode;
			},
			findFiberByHostInstance: xi.findFiberByHostInstance || c0,
			findHostInstancesForRefresh: null,
			scheduleRefresh: null,
			scheduleRoot: null,
			setRefreshHandler: null,
			getCurrentFiber: null,
			reconcilerVersion: '18.3.1-next-f1338f8080-20240426',
		};
	if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < 'u') {
		var ll = __REACT_DEVTOOLS_GLOBAL_HOOK__;
		if (!ll.isDisabled && ll.supportsFiber)
			try {
				(ro = ll.inject(d0)), (sn = ll);
			} catch {}
	}
	return (
		(xt.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = f0),
		(xt.createPortal = function (r, i) {
			var a = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
			if (!eu(i)) throw Error(n(200));
			return a0(r, i, null, a);
		}),
		(xt.createRoot = function (r, i) {
			if (!eu(r)) throw Error(n(299));
			var a = !1,
				f = '',
				h = _p;
			return (
				i != null &&
					(i.unstable_strictMode === !0 && (a = !0),
					i.identifierPrefix !== void 0 && (f = i.identifierPrefix),
					i.onRecoverableError !== void 0 && (h = i.onRecoverableError)),
				(i = Xc(r, 1, !1, null, null, a, !1, f, h)),
				(r[pn] = i.current),
				si(r.nodeType === 8 ? r.parentNode : r),
				new Zc(i)
			);
		}),
		(xt.findDOMNode = function (r) {
			if (r == null) return null;
			if (r.nodeType === 1) return r;
			var i = r._reactInternals;
			if (i === void 0)
				throw typeof r.render == 'function'
					? Error(n(188))
					: ((r = Object.keys(r).join(',')), Error(n(268, r)));
			return (r = Qf(i)), (r = r === null ? null : r.stateNode), r;
		}),
		(xt.flushSync = function (r) {
			return mr(r);
		}),
		(xt.hydrate = function (r, i, a) {
			if (!il(i)) throw Error(n(200));
			return ol(null, r, i, !0, a);
		}),
		(xt.hydrateRoot = function (r, i, a) {
			if (!eu(r)) throw Error(n(405));
			var f = (a != null && a.hydratedSources) || null,
				h = !1,
				m = '',
				x = _p;
			if (
				(a != null &&
					(a.unstable_strictMode === !0 && (h = !0),
					a.identifierPrefix !== void 0 && (m = a.identifierPrefix),
					a.onRecoverableError !== void 0 && (x = a.onRecoverableError)),
				(i = Sp(i, null, r, 1, a ?? null, h, !1, m, x)),
				(r[pn] = i.current),
				si(r),
				f)
			)
				for (r = 0; r < f.length; r++)
					(a = f[r]),
						(h = a._getVersion),
						(h = h(a._source)),
						i.mutableSourceEagerHydrationData == null
							? (i.mutableSourceEagerHydrationData = [a, h])
							: i.mutableSourceEagerHydrationData.push(a, h);
			return new sl(i);
		}),
		(xt.render = function (r, i, a) {
			if (!il(i)) throw Error(n(200));
			return ol(null, r, i, !1, a);
		}),
		(xt.unmountComponentAtNode = function (r) {
			if (!il(r)) throw Error(n(40));
			return r._reactRootContainer
				? (mr(function () {
						ol(null, null, r, !1, function () {
							(r._reactRootContainer = null), (r[pn] = null);
						});
					}),
					!0)
				: !1;
		}),
		(xt.unstable_batchedUpdates = Vc),
		(xt.unstable_renderSubtreeIntoContainer = function (r, i, a, f) {
			if (!il(a)) throw Error(n(200));
			if (r == null || r._reactInternals === void 0) throw Error(n(38));
			return ol(r, i, a, !1, f);
		}),
		(xt.version = '18.3.1-next-f1338f8080-20240426'),
		xt
	);
}
var jp;
function N0() {
	if (jp) return ru.exports;
	jp = 1;
	function t() {
		if (
			!(
				typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > 'u' ||
				typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != 'function'
			)
		)
			try {
				__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(t);
			} catch (e) {
				console.error(e);
			}
	}
	return t(), (ru.exports = C0()), ru.exports;
}
var Pp;
function A0() {
	if (Pp) return al;
	Pp = 1;
	var t = N0();
	return (al.createRoot = t.createRoot), (al.hydrateRoot = t.hydrateRoot), al;
}
var Ak = A0();
const Ii = Symbol('context'),
	Dm = Symbol('nextInContext'),
	Fm = Symbol('prevByEndTime'),
	Bm = Symbol('nextByStartTime'),
	Op = Symbol('events');
class Ik {
	constructor(e) {
		Ee(this, 'startTime');
		Ee(this, 'endTime');
		Ee(this, 'browserName');
		Ee(this, 'channel');
		Ee(this, 'platform');
		Ee(this, 'wallTime');
		Ee(this, 'title');
		Ee(this, 'options');
		Ee(this, 'pages');
		Ee(this, 'actions');
		Ee(this, 'attachments');
		Ee(this, 'visibleAttachments');
		Ee(this, 'events');
		Ee(this, 'stdio');
		Ee(this, 'errors');
		Ee(this, 'errorDescriptors');
		Ee(this, 'hasSource');
		Ee(this, 'hasStepData');
		Ee(this, 'sdkLanguage');
		Ee(this, 'testIdAttributeName');
		Ee(this, 'sources');
		Ee(this, 'resources');
		e.forEach((s) => I0(s));
		const n = e.find((s) => s.origin === 'library');
		(this.browserName = (n == null ? void 0 : n.browserName) || ''),
			(this.sdkLanguage = n == null ? void 0 : n.sdkLanguage),
			(this.channel = n == null ? void 0 : n.channel),
			(this.testIdAttributeName = n == null ? void 0 : n.testIdAttributeName),
			(this.platform = (n == null ? void 0 : n.platform) || ''),
			(this.title = (n == null ? void 0 : n.title) || ''),
			(this.options = (n == null ? void 0 : n.options) || {}),
			(this.actions = L0(e)),
			(this.pages = [].concat(...e.map((s) => s.pages))),
			(this.wallTime = e
				.map((s) => s.wallTime)
				.reduce((s, o) => Math.min(s || Number.MAX_VALUE, o), Number.MAX_VALUE)),
			(this.startTime = e
				.map((s) => s.startTime)
				.reduce((s, o) => Math.min(s, o), Number.MAX_VALUE)),
			(this.endTime = e.map((s) => s.endTime).reduce((s, o) => Math.max(s, o), Number.MIN_VALUE)),
			(this.events = [].concat(...e.map((s) => s.events))),
			(this.stdio = [].concat(...e.map((s) => s.stdio))),
			(this.errors = [].concat(...e.map((s) => s.errors))),
			(this.hasSource = e.some((s) => s.hasSource)),
			(this.hasStepData = e.some((s) => s.origin === 'testRunner')),
			(this.resources = [...e.map((s) => s.resources)].flat()),
			(this.attachments = this.actions.flatMap((s) => {
				var o;
				return (
					((o = s.attachments) == null
						? void 0
						: o.map((l) => ({ ...l, traceUrl: s.context.traceUrl }))) ?? []
				);
			})),
			(this.visibleAttachments = this.attachments.filter((s) => !s.name.startsWith('_'))),
			this.events.sort((s, o) => s.time - o.time),
			this.resources.sort((s, o) => s._monotonicTime - o._monotonicTime),
			(this.errorDescriptors = this.hasStepData
				? this._errorDescriptorsFromTestRunner()
				: this._errorDescriptorsFromActions()),
			(this.sources = B0(this.actions, this.errorDescriptors));
	}
	failedAction() {
		return this.actions.findLast((e) => e.error);
	}
	_errorDescriptorsFromActions() {
		var n;
		const e = [];
		for (const s of this.actions || [])
			(n = s.error) != null &&
				n.message &&
				e.push({ action: s, stack: s.stack, message: s.error.message });
		return e;
	}
	_errorDescriptorsFromTestRunner() {
		return this.errors
			.filter((e) => !!e.message)
			.map((e, n) => ({ stack: e.stack, message: e.message }));
	}
}
function I0(t) {
	for (const n of t.pages) n[Ii] = t;
	for (let n = 0; n < t.actions.length; ++n) {
		const s = t.actions[n];
		s[Ii] = t;
	}
	let e;
	for (let n = t.actions.length - 1; n >= 0; n--) {
		const s = t.actions[n];
		(s[Dm] = e), s.class !== 'Route' && (e = s);
	}
	for (const n of t.events) n[Ii] = t;
	for (const n of t.resources) n[Ii] = t;
}
function L0(t) {
	const e = new Map();
	for (const o of t) {
		const l = o.traceUrl;
		let c = e.get(l);
		c || ((c = []), e.set(l, c)), c.push(o);
	}
	const n = [];
	let s = 0;
	for (const [, o] of e) {
		e.size > 1 && M0(o, ++s);
		const l = j0(o);
		n.push(...l);
	}
	n.sort((o, l) =>
		l.parentId === o.callId ? 1 : o.parentId === l.callId ? -1 : o.endTime - l.endTime,
	);
	for (let o = 1; o < n.length; ++o) n[o][Fm] = n[o - 1];
	n.sort((o, l) =>
		l.parentId === o.callId ? -1 : o.parentId === l.callId ? 1 : o.startTime - l.startTime,
	);
	for (let o = 0; o + 1 < n.length; ++o) n[o][Bm] = n[o + 1];
	return n;
}
function M0(t, e) {
	for (const n of t)
		for (const s of n.actions)
			s.callId && (s.callId = `${e}:${s.callId}`),
				s.parentId && (s.parentId = `${e}:${s.parentId}`);
}
let $p = 0;
function j0(t) {
	const e = new Map(),
		n = t.filter((c) => c.origin === 'library'),
		s = t.filter((c) => c.origin === 'testRunner');
	if (!s.length || !n.length)
		return t.map((c) => c.actions.map((u) => ({ ...u, context: c }))).flat();
	for (const c of n)
		for (const u of c.actions) e.set(u.stepId || `tmp-step@${++$p}`, { ...u, context: c });
	const o = O0(s, e);
	o && P0(n, o);
	const l = new Map();
	for (const c of s)
		for (const u of c.actions) {
			const d = u.stepId && e.get(u.stepId);
			if (d) {
				l.set(u.callId, d.callId),
					u.error && (d.error = u.error),
					u.attachments && (d.attachments = u.attachments),
					u.annotations && (d.annotations = u.annotations),
					u.parentId && (d.parentId = l.get(u.parentId) ?? u.parentId),
					(d.startTime = u.startTime),
					(d.endTime = u.endTime);
				continue;
			}
			u.parentId && (u.parentId = l.get(u.parentId) ?? u.parentId),
				e.set(u.stepId || `tmp-step@${++$p}`, { ...u, context: c });
		}
	return [...e.values()];
}
function P0(t, e) {
	for (const n of t) {
		(n.startTime += e), (n.endTime += e);
		for (const s of n.actions) s.startTime && (s.startTime += e), s.endTime && (s.endTime += e);
		for (const s of n.events) s.time += e;
		for (const s of n.stdio) s.timestamp += e;
		for (const s of n.pages) for (const o of s.screencastFrames) o.timestamp += e;
		for (const s of n.resources) s._monotonicTime && (s._monotonicTime += e);
	}
}
function O0(t, e) {
	for (const n of t)
		for (const s of n.actions) {
			if (!s.startTime) continue;
			const o = s.stepId ? e.get(s.stepId) : void 0;
			if (o) return s.startTime - o.startTime;
		}
	return 0;
}
function $0(t) {
	const e = new Map();
	for (const s of t) e.set(s.callId, { id: s.callId, parent: void 0, children: [], action: s });
	const n = { id: '', parent: void 0, children: [] };
	for (const s of e.values()) {
		const o = (s.action.parentId && e.get(s.action.parentId)) || n;
		o.children.push(s), (s.parent = o);
	}
	return { rootItem: n, itemMap: e };
}
function jl(t) {
	return t[Ii];
}
function R0(t) {
	return t[Dm];
}
function Rp(t) {
	return t[Fm];
}
function Dp(t) {
	return t[Bm];
}
function D0(t) {
	let e = 0,
		n = 0;
	for (const s of F0(t)) {
		if (s.type === 'console') {
			const o = s.messageType;
			o === 'warning' ? ++n : o === 'error' && ++e;
		}
		s.type === 'event' && s.method === 'pageError' && ++e;
	}
	return { errors: e, warnings: n };
}
function F0(t) {
	let e = t[Op];
	if (e) return e;
	const n = R0(t);
	return (
		(e = jl(t).events.filter((s) => s.time >= t.startTime && (!n || s.time < n.startTime))),
		(t[Op] = e),
		e
	);
}
function B0(t, e) {
	var s;
	const n = new Map();
	for (const o of t)
		for (const l of o.stack || []) {
			let c = n.get(l.file);
			c || ((c = { errors: [], content: void 0 }), n.set(l.file, c));
		}
	for (const o of e) {
		const { action: l, stack: c, message: u } = o;
		!l ||
			!c ||
			(s = n.get(c[0].file)) == null ||
			s.errors.push({ line: c[0].line || 0, message: u });
	}
	return n;
}
const ou = new Set([
	'page.route',
	'page.routefromhar',
	'page.unroute',
	'page.unrouteall',
	'browsercontext.route',
	'browsercontext.routefromhar',
	'browsercontext.unroute',
	'browsercontext.unrouteall',
]);
{
	for (const t of [...ou]) ou.add(t + 'async');
	for (const t of [
		'page.route_from_har',
		'page.unroute_all',
		'context.route_from_har',
		'context.unroute_all',
	])
		ou.add(t);
}
const z0 = 50,
	Pl = ({
		sidebarSize: t,
		sidebarHidden: e = !1,
		sidebarIsFirst: n = !1,
		orientation: s = 'vertical',
		minSidebarSize: o = z0,
		settingName: l,
		sidebar: c,
		main: u,
	}) => {
		const d = Math.max(o, t) * window.devicePixelRatio,
			[p, g] = Es(l ? l + '.' + s + ':size' : void 0, d),
			[y, v] = Es(l ? l + '.' + s + ':size' : void 0, d),
			[S, k] = R.useState(null),
			[_, E] = Nr();
		let C;
		s === 'vertical'
			? ((C = y / window.devicePixelRatio), _ && _.height < C && (C = _.height - 10))
			: ((C = p / window.devicePixelRatio), _ && _.width < C && (C = _.width - 10)),
			(document.body.style.userSelect = S ? 'none' : 'inherit');
		let A = {};
		return (
			s === 'vertical'
				? n
					? (A = { top: S ? 0 : C - 4, bottom: S ? 0 : void 0, height: S ? 'initial' : 8 })
					: (A = { bottom: S ? 0 : C - 4, top: S ? 0 : void 0, height: S ? 'initial' : 8 })
				: n
					? (A = { left: S ? 0 : C - 4, right: S ? 0 : void 0, width: S ? 'initial' : 8 })
					: (A = { right: S ? 0 : C - 4, left: S ? 0 : void 0, width: S ? 'initial' : 8 }),
			w.jsxs('div', {
				className: ze('split-view', s, n && 'sidebar-first'),
				ref: E,
				children: [
					w.jsx('div', { className: 'split-view-main', children: u }),
					!e &&
						w.jsx('div', { style: { flexBasis: C }, className: 'split-view-sidebar', children: c }),
					!e &&
						w.jsx('div', {
							style: A,
							className: 'split-view-resizer',
							onMouseDown: (O) => k({ offset: s === 'vertical' ? O.clientY : O.clientX, size: C }),
							onMouseUp: () => k(null),
							onMouseMove: (O) => {
								if (!O.buttons) k(null);
								else if (S) {
									const F = (s === 'vertical' ? O.clientY : O.clientX) - S.offset,
										z = n ? S.size + F : S.size - F,
										B = O.target.parentElement.getBoundingClientRect(),
										M = Math.min(Math.max(o, z), (s === 'vertical' ? B.height : B.width) - o);
									s === 'vertical'
										? v(M * window.devicePixelRatio)
										: g(M * window.devicePixelRatio);
								}
							},
						}),
				],
			})
		);
	},
	qe = function (t, e, n) {
		return t >= e && t <= n;
	};
function _t(t) {
	return qe(t, 48, 57);
}
function Fp(t) {
	return _t(t) || qe(t, 65, 70) || qe(t, 97, 102);
}
function H0(t) {
	return qe(t, 65, 90);
}
function U0(t) {
	return qe(t, 97, 122);
}
function q0(t) {
	return H0(t) || U0(t);
}
function V0(t) {
	return t >= 128;
}
function Sl(t) {
	return q0(t) || V0(t) || t === 95;
}
function Bp(t) {
	return Sl(t) || _t(t) || t === 45;
}
function W0(t) {
	return qe(t, 0, 8) || t === 11 || qe(t, 14, 31) || t === 127;
}
function xl(t) {
	return t === 10;
}
function _n(t) {
	return xl(t) || t === 9 || t === 32;
}
const K0 = 1114111;
class Ku extends Error {
	constructor(e) {
		super(e), (this.name = 'InvalidCharacterError');
	}
}
function G0(t) {
	const e = [];
	for (let n = 0; n < t.length; n++) {
		let s = t.charCodeAt(n);
		if (
			(s === 13 && t.charCodeAt(n + 1) === 10 && ((s = 10), n++),
			(s === 13 || s === 12) && (s = 10),
			s === 0 && (s = 65533),
			qe(s, 55296, 56319) && qe(t.charCodeAt(n + 1), 56320, 57343))
		) {
			const o = s - 55296,
				l = t.charCodeAt(n + 1) - 56320;
			(s = Math.pow(2, 16) + o * Math.pow(2, 10) + l), n++;
		}
		e.push(s);
	}
	return e;
}
function Ke(t) {
	if (t <= 65535) return String.fromCharCode(t);
	t -= Math.pow(2, 16);
	const e = Math.floor(t / Math.pow(2, 10)) + 55296,
		n = (t % Math.pow(2, 10)) + 56320;
	return String.fromCharCode(e) + String.fromCharCode(n);
}
function zm(t) {
	const e = G0(t);
	let n = -1;
	const s = [];
	let o;
	const l = function ($) {
			return $ >= e.length ? -1 : e[$];
		},
		c = function ($) {
			if (($ === void 0 && ($ = 1), $ > 3))
				throw 'Spec Error: no more than three codepoints of lookahead.';
			return l(n + $);
		},
		u = function ($) {
			return $ === void 0 && ($ = 1), (n += $), (o = l(n)), !0;
		},
		d = function () {
			return (n -= 1), !0;
		},
		p = function ($) {
			return $ === void 0 && ($ = o), $ === -1;
		},
		g = function () {
			if ((y(), u(), _n(o))) {
				for (; _n(c()); ) u();
				return new Ol();
			} else {
				if (o === 34) return k();
				if (o === 35)
					if (Bp(c()) || C(c(1), c(2))) {
						const $ = new eg('');
						return O(c(1), c(2), c(3)) && ($.type = 'id'), ($.value = q()), $;
					} else return new Ze(o);
				else
					return o === 36
						? c() === 61
							? (u(), new Y0())
							: new Ze(o)
						: o === 39
							? k()
							: o === 40
								? new Xm()
								: o === 41
									? new Gu()
									: o === 42
										? c() === 61
											? (u(), new Z0())
											: new Ze(o)
										: o === 43
											? z()
												? (d(), v())
												: new Ze(o)
											: o === 44
												? new Km()
												: o === 45
													? z()
														? (d(), v())
														: c(1) === 45 && c(2) === 62
															? (u(2), new qm())
															: D()
																? (d(), S())
																: new Ze(o)
													: o === 46
														? z()
															? (d(), v())
															: new Ze(o)
														: o === 58
															? new Vm()
															: o === 59
																? new Wm()
																: o === 60
																	? c(1) === 33 && c(2) === 45 && c(3) === 45
																		? (u(3), new Um())
																		: new Ze(o)
																	: o === 64
																		? O(c(1), c(2), c(3))
																			? new Zm(q())
																			: new Ze(o)
																		: o === 91
																			? new Jm()
																			: o === 92
																				? A()
																					? (d(), S())
																					: new Ze(o)
																				: o === 93
																					? new Au()
																					: o === 94
																						? c() === 61
																							? (u(), new X0())
																							: new Ze(o)
																						: o === 123
																							? new Gm()
																							: o === 124
																								? c() === 61
																									? (u(), new J0())
																									: c() === 124
																										? (u(), new Ym())
																										: new Ze(o)
																								: o === 125
																									? new Qm()
																									: o === 126
																										? c() === 61
																											? (u(), new Q0())
																											: new Ze(o)
																										: _t(o)
																											? (d(), v())
																											: Sl(o)
																												? (d(), S())
																												: p()
																													? new El()
																													: new Ze(o);
			}
		},
		y = function () {
			for (; c(1) === 47 && c(2) === 42; )
				for (u(2); ; )
					if ((u(), o === 42 && c() === 47)) {
						u();
						break;
					} else if (p()) return;
		},
		v = function () {
			const $ = B();
			if (O(c(1), c(2), c(3))) {
				const X = new e1();
				return (X.value = $.value), (X.repr = $.repr), (X.type = $.type), (X.unit = q()), X;
			} else if (c() === 37) {
				u();
				const X = new rg();
				return (X.value = $.value), (X.repr = $.repr), X;
			} else {
				const X = new ng();
				return (X.value = $.value), (X.repr = $.repr), (X.type = $.type), X;
			}
		},
		S = function () {
			const $ = q();
			if ($.toLowerCase() === 'url' && c() === 40) {
				for (u(); _n(c(1)) && _n(c(2)); ) u();
				return c() === 34 || c() === 39
					? new Oi($)
					: _n(c()) && (c(2) === 34 || c(2) === 39)
						? new Oi($)
						: _();
			} else return c() === 40 ? (u(), new Oi($)) : new Qu($);
		},
		k = function ($) {
			$ === void 0 && ($ = o);
			let X = '';
			for (; u(); ) {
				if (o === $ || p()) return new Ju(X);
				if (xl(o)) return d(), new Hm();
				o === 92 ? p(c()) || (xl(c()) ? u() : (X += Ke(E()))) : (X += Ke(o));
			}
			throw new Error('Internal error');
		},
		_ = function () {
			const $ = new tg('');
			for (; _n(c()); ) u();
			if (p(c())) return $;
			for (; u(); ) {
				if (o === 41 || p()) return $;
				if (_n(o)) {
					for (; _n(c()); ) u();
					return c() === 41 || p(c()) ? (u(), $) : (G(), new _l());
				} else {
					if (o === 34 || o === 39 || o === 40 || W0(o)) return G(), new _l();
					if (o === 92)
						if (A()) $.value += Ke(E());
						else return G(), new _l();
					else $.value += Ke(o);
				}
			}
			throw new Error('Internal error');
		},
		E = function () {
			if ((u(), Fp(o))) {
				const $ = [o];
				for (let ce = 0; ce < 5 && Fp(c()); ce++) u(), $.push(o);
				_n(c()) && u();
				let X = parseInt(
					$.map(function (ce) {
						return String.fromCharCode(ce);
					}).join(''),
					16,
				);
				return X > K0 && (X = 65533), X;
			} else return p() ? 65533 : o;
		},
		C = function ($, X) {
			return !($ !== 92 || xl(X));
		},
		A = function () {
			return C(o, c());
		},
		O = function ($, X, ce) {
			return $ === 45 ? Sl(X) || X === 45 || C(X, ce) : Sl($) ? !0 : $ === 92 ? C($, X) : !1;
		},
		D = function () {
			return O(o, c(1), c(2));
		},
		F = function ($, X, ce) {
			return $ === 43 || $ === 45
				? !!(_t(X) || (X === 46 && _t(ce)))
				: $ === 46
					? !!_t(X)
					: !!_t($);
		},
		z = function () {
			return F(o, c(1), c(2));
		},
		q = function () {
			let $ = '';
			for (; u(); )
				if (Bp(o)) $ += Ke(o);
				else if (A()) $ += Ke(E());
				else return d(), $;
			throw new Error('Internal parse error');
		},
		B = function () {
			let $ = '',
				X = 'integer';
			for ((c() === 43 || c() === 45) && (u(), ($ += Ke(o))); _t(c()); ) u(), ($ += Ke(o));
			if (c(1) === 46 && _t(c(2)))
				for (u(), $ += Ke(o), u(), $ += Ke(o), X = 'number'; _t(c()); ) u(), ($ += Ke(o));
			const ce = c(1),
				Ae = c(2),
				be = c(3);
			if ((ce === 69 || ce === 101) && _t(Ae))
				for (u(), $ += Ke(o), u(), $ += Ke(o), X = 'number'; _t(c()); ) u(), ($ += Ke(o));
			else if ((ce === 69 || ce === 101) && (Ae === 43 || Ae === 45) && _t(be))
				for (u(), $ += Ke(o), u(), $ += Ke(o), u(), $ += Ke(o), X = 'number'; _t(c()); )
					u(), ($ += Ke(o));
			const ge = M($);
			return { type: X, value: ge, repr: $ };
		},
		M = function ($) {
			return +$;
		},
		G = function () {
			for (; u(); ) {
				if (o === 41 || p()) return;
				A() && E();
			}
		};
	let K = 0;
	for (; !p(c()); )
		if ((s.push(g()), K++, K > e.length * 2)) throw new Error("I'm infinite-looping!");
	return s;
}
class He {
	constructor() {
		this.tokenType = '';
	}
	toJSON() {
		return { token: this.tokenType };
	}
	toString() {
		return this.tokenType;
	}
	toSource() {
		return '' + this;
	}
}
class Hm extends He {
	constructor() {
		super(...arguments), (this.tokenType = 'BADSTRING');
	}
}
class _l extends He {
	constructor() {
		super(...arguments), (this.tokenType = 'BADURL');
	}
}
class Ol extends He {
	constructor() {
		super(...arguments), (this.tokenType = 'WHITESPACE');
	}
	toString() {
		return 'WS';
	}
	toSource() {
		return ' ';
	}
}
class Um extends He {
	constructor() {
		super(...arguments), (this.tokenType = 'CDO');
	}
	toSource() {
		return '<!--';
	}
}
class qm extends He {
	constructor() {
		super(...arguments), (this.tokenType = 'CDC');
	}
	toSource() {
		return '-->';
	}
}
class Vm extends He {
	constructor() {
		super(...arguments), (this.tokenType = ':');
	}
}
class Wm extends He {
	constructor() {
		super(...arguments), (this.tokenType = ';');
	}
}
class Km extends He {
	constructor() {
		super(...arguments), (this.tokenType = ',');
	}
}
class Cs extends He {
	constructor() {
		super(...arguments), (this.value = ''), (this.mirror = '');
	}
}
class Gm extends Cs {
	constructor() {
		super(), (this.tokenType = '{'), (this.value = '{'), (this.mirror = '}');
	}
}
class Qm extends Cs {
	constructor() {
		super(), (this.tokenType = '}'), (this.value = '}'), (this.mirror = '{');
	}
}
class Jm extends Cs {
	constructor() {
		super(), (this.tokenType = '['), (this.value = '['), (this.mirror = ']');
	}
}
class Au extends Cs {
	constructor() {
		super(), (this.tokenType = ']'), (this.value = ']'), (this.mirror = '[');
	}
}
class Xm extends Cs {
	constructor() {
		super(), (this.tokenType = '('), (this.value = '('), (this.mirror = ')');
	}
}
class Gu extends Cs {
	constructor() {
		super(), (this.tokenType = ')'), (this.value = ')'), (this.mirror = '(');
	}
}
class Q0 extends He {
	constructor() {
		super(...arguments), (this.tokenType = '~=');
	}
}
class J0 extends He {
	constructor() {
		super(...arguments), (this.tokenType = '|=');
	}
}
class X0 extends He {
	constructor() {
		super(...arguments), (this.tokenType = '^=');
	}
}
class Y0 extends He {
	constructor() {
		super(...arguments), (this.tokenType = '$=');
	}
}
class Z0 extends He {
	constructor() {
		super(...arguments), (this.tokenType = '*=');
	}
}
class Ym extends He {
	constructor() {
		super(...arguments), (this.tokenType = '||');
	}
}
class El extends He {
	constructor() {
		super(...arguments), (this.tokenType = 'EOF');
	}
	toSource() {
		return '';
	}
}
class Ze extends He {
	constructor(e) {
		super(), (this.tokenType = 'DELIM'), (this.value = ''), (this.value = Ke(e));
	}
	toString() {
		return 'DELIM(' + this.value + ')';
	}
	toJSON() {
		const e = this.constructor.prototype.constructor.prototype.toJSON.call(this);
		return (e.value = this.value), e;
	}
	toSource() {
		return this.value === '\\'
			? `\\
`
			: this.value;
	}
}
class Ns extends He {
	constructor() {
		super(...arguments), (this.value = '');
	}
	ASCIIMatch(e) {
		return this.value.toLowerCase() === e.toLowerCase();
	}
	toJSON() {
		const e = this.constructor.prototype.constructor.prototype.toJSON.call(this);
		return (e.value = this.value), e;
	}
}
class Qu extends Ns {
	constructor(e) {
		super(), (this.tokenType = 'IDENT'), (this.value = e);
	}
	toString() {
		return 'IDENT(' + this.value + ')';
	}
	toSource() {
		return qi(this.value);
	}
}
class Oi extends Ns {
	constructor(e) {
		super(), (this.tokenType = 'FUNCTION'), (this.value = e), (this.mirror = ')');
	}
	toString() {
		return 'FUNCTION(' + this.value + ')';
	}
	toSource() {
		return qi(this.value) + '(';
	}
}
class Zm extends Ns {
	constructor(e) {
		super(), (this.tokenType = 'AT-KEYWORD'), (this.value = e);
	}
	toString() {
		return 'AT(' + this.value + ')';
	}
	toSource() {
		return '@' + qi(this.value);
	}
}
class eg extends Ns {
	constructor(e) {
		super(), (this.tokenType = 'HASH'), (this.value = e), (this.type = 'unrestricted');
	}
	toString() {
		return 'HASH(' + this.value + ')';
	}
	toJSON() {
		const e = this.constructor.prototype.constructor.prototype.toJSON.call(this);
		return (e.value = this.value), (e.type = this.type), e;
	}
	toSource() {
		return this.type === 'id' ? '#' + qi(this.value) : '#' + t1(this.value);
	}
}
class Ju extends Ns {
	constructor(e) {
		super(), (this.tokenType = 'STRING'), (this.value = e);
	}
	toString() {
		return '"' + sg(this.value) + '"';
	}
}
class tg extends Ns {
	constructor(e) {
		super(), (this.tokenType = 'URL'), (this.value = e);
	}
	toString() {
		return 'URL(' + this.value + ')';
	}
	toSource() {
		return 'url("' + sg(this.value) + '")';
	}
}
class ng extends He {
	constructor() {
		super(), (this.tokenType = 'NUMBER'), (this.type = 'integer'), (this.repr = '');
	}
	toString() {
		return this.type === 'integer' ? 'INT(' + this.value + ')' : 'NUMBER(' + this.value + ')';
	}
	toJSON() {
		const e = super.toJSON();
		return (e.value = this.value), (e.type = this.type), (e.repr = this.repr), e;
	}
	toSource() {
		return this.repr;
	}
}
class rg extends He {
	constructor() {
		super(), (this.tokenType = 'PERCENTAGE'), (this.repr = '');
	}
	toString() {
		return 'PERCENTAGE(' + this.value + ')';
	}
	toJSON() {
		const e = this.constructor.prototype.constructor.prototype.toJSON.call(this);
		return (e.value = this.value), (e.repr = this.repr), e;
	}
	toSource() {
		return this.repr + '%';
	}
}
class e1 extends He {
	constructor() {
		super(),
			(this.tokenType = 'DIMENSION'),
			(this.type = 'integer'),
			(this.repr = ''),
			(this.unit = '');
	}
	toString() {
		return 'DIM(' + this.value + ',' + this.unit + ')';
	}
	toJSON() {
		const e = this.constructor.prototype.constructor.prototype.toJSON.call(this);
		return (
			(e.value = this.value), (e.type = this.type), (e.repr = this.repr), (e.unit = this.unit), e
		);
	}
	toSource() {
		const e = this.repr;
		let n = qi(this.unit);
		return (
			n[0].toLowerCase() === 'e' &&
				(n[1] === '-' || qe(n.charCodeAt(1), 48, 57)) &&
				(n = '\\65 ' + n.slice(1, n.length)),
			e + n
		);
	}
}
function qi(t) {
	t = '' + t;
	let e = '';
	const n = t.charCodeAt(0);
	for (let s = 0; s < t.length; s++) {
		const o = t.charCodeAt(s);
		if (o === 0) throw new Ku('Invalid character: the input contains U+0000.');
		qe(o, 1, 31) ||
		o === 127 ||
		(s === 0 && qe(o, 48, 57)) ||
		(s === 1 && qe(o, 48, 57) && n === 45)
			? (e += '\\' + o.toString(16) + ' ')
			: o >= 128 || o === 45 || o === 95 || qe(o, 48, 57) || qe(o, 65, 90) || qe(o, 97, 122)
				? (e += t[s])
				: (e += '\\' + t[s]);
	}
	return e;
}
function t1(t) {
	t = '' + t;
	let e = '';
	for (let n = 0; n < t.length; n++) {
		const s = t.charCodeAt(n);
		if (s === 0) throw new Ku('Invalid character: the input contains U+0000.');
		s >= 128 || s === 45 || s === 95 || qe(s, 48, 57) || qe(s, 65, 90) || qe(s, 97, 122)
			? (e += t[n])
			: (e += '\\' + s.toString(16) + ' ');
	}
	return e;
}
function sg(t) {
	t = '' + t;
	let e = '';
	for (let n = 0; n < t.length; n++) {
		const s = t.charCodeAt(n);
		if (s === 0) throw new Ku('Invalid character: the input contains U+0000.');
		qe(s, 1, 31) || s === 127
			? (e += '\\' + s.toString(16) + ' ')
			: s === 34 || s === 92
				? (e += '\\' + t[n])
				: (e += t[n]);
	}
	return e;
}
class Et extends Error {}
function n1(t, e) {
	let n;
	try {
		(n = zm(t)), n[n.length - 1] instanceof El || n.push(new El());
	} catch (M) {
		const G = M.message + ` while parsing css selector "${t}". Did you mean to CSS.escape it?`,
			K = (M.stack || '').indexOf(M.message);
		throw (
			(K !== -1 &&
				(M.stack = M.stack.substring(0, K) + G + M.stack.substring(K + M.message.length)),
			(M.message = G),
			M)
		);
	}
	const s = n.find(
		(M) =>
			M instanceof Zm ||
			M instanceof Hm ||
			M instanceof _l ||
			M instanceof Ym ||
			M instanceof Um ||
			M instanceof qm ||
			M instanceof Wm ||
			M instanceof Gm ||
			M instanceof Qm ||
			M instanceof tg ||
			M instanceof rg,
	);
	if (s)
		throw new Et(
			`Unsupported token "${s.toSource()}" while parsing css selector "${t}". Did you mean to CSS.escape it?`,
		);
	let o = 0;
	const l = new Set();
	function c() {
		return new Et(
			`Unexpected token "${n[o].toSource()}" while parsing css selector "${t}". Did you mean to CSS.escape it?`,
		);
	}
	function u() {
		for (; n[o] instanceof Ol; ) o++;
	}
	function d(M = o) {
		return n[M] instanceof Qu;
	}
	function p(M = o) {
		return n[M] instanceof Ju;
	}
	function g(M = o) {
		return n[M] instanceof ng;
	}
	function y(M = o) {
		return n[M] instanceof Km;
	}
	function v(M = o) {
		return n[M] instanceof Xm;
	}
	function S(M = o) {
		return n[M] instanceof Gu;
	}
	function k(M = o) {
		return n[M] instanceof Oi;
	}
	function _(M = o) {
		return n[M] instanceof Ze && n[M].value === '*';
	}
	function E(M = o) {
		return n[M] instanceof El;
	}
	function C(M = o) {
		return n[M] instanceof Ze && ['>', '+', '~'].includes(n[M].value);
	}
	function A(M = o) {
		return y(M) || S(M) || E(M) || C(M) || n[M] instanceof Ol;
	}
	function O() {
		const M = [D()];
		for (; u(), !!y(); ) o++, M.push(D());
		return M;
	}
	function D() {
		return u(), g() || p() ? n[o++].value : F();
	}
	function F() {
		const M = { simples: [] };
		for (
			u(),
				C()
					? M.simples.push({
							selector: { functions: [{ name: 'scope', args: [] }] },
							combinator: '',
						})
					: M.simples.push({ selector: z(), combinator: '' });
			;
		) {
			if ((u(), C())) (M.simples[M.simples.length - 1].combinator = n[o++].value), u();
			else if (A()) break;
			M.simples.push({ combinator: '', selector: z() });
		}
		return M;
	}
	function z() {
		let M = '';
		const G = [];
		for (; !A(); )
			if (d() || _()) M += n[o++].toSource();
			else if (n[o] instanceof eg) M += n[o++].toSource();
			else if (n[o] instanceof Ze && n[o].value === '.')
				if ((o++, d())) M += '.' + n[o++].toSource();
				else throw c();
			else if (n[o] instanceof Vm)
				if ((o++, d()))
					if (!e.has(n[o].value.toLowerCase())) M += ':' + n[o++].toSource();
					else {
						const K = n[o++].value.toLowerCase();
						G.push({ name: K, args: [] }), l.add(K);
					}
				else if (k()) {
					const K = n[o++].value.toLowerCase();
					if (
						(e.has(K) ? (G.push({ name: K, args: O() }), l.add(K)) : (M += `:${K}(${q()})`),
						u(),
						!S())
					)
						throw c();
					o++;
				} else throw c();
			else if (n[o] instanceof Jm) {
				for (M += '[', o++; !(n[o] instanceof Au) && !E(); ) M += n[o++].toSource();
				if (!(n[o] instanceof Au)) throw c();
				(M += ']'), o++;
			} else throw c();
		if (!M && !G.length) throw c();
		return { css: M || void 0, functions: G };
	}
	function q() {
		let M = '',
			G = 1;
		for (; !E() && ((v() || k()) && G++, S() && G--, !!G); ) M += n[o++].toSource();
		return M;
	}
	const B = O();
	if (!E()) throw c();
	if (B.some((M) => typeof M != 'object' || !('simples' in M)))
		throw new Et(`Error while parsing css selector "${t}". Did you mean to CSS.escape it?`);
	return { selector: B, names: Array.from(l) };
}
const Iu = new Set([
		'internal:has',
		'internal:has-not',
		'internal:and',
		'internal:or',
		'internal:chain',
		'left-of',
		'right-of',
		'above',
		'below',
		'near',
	]),
	r1 = new Set(['left-of', 'right-of', 'above', 'below', 'near']),
	ig = new Set([
		'not',
		'is',
		'where',
		'has',
		'scope',
		'light',
		'visible',
		'text',
		'text-matches',
		'text-is',
		'has-text',
		'above',
		'below',
		'right-of',
		'left-of',
		'near',
		'nth-match',
	]);
function Vi(t) {
	const e = o1(t),
		n = [];
	for (const s of e.parts) {
		if (s.name === 'css' || s.name === 'css:light') {
			s.name === 'css:light' && (s.body = ':light(' + s.body + ')');
			const o = n1(s.body, ig);
			n.push({ name: 'css', body: o.selector, source: s.body });
			continue;
		}
		if (Iu.has(s.name)) {
			let o, l;
			try {
				const p = JSON.parse('[' + s.body + ']');
				if (!Array.isArray(p) || p.length < 1 || p.length > 2 || typeof p[0] != 'string')
					throw new Et(`Malformed selector: ${s.name}=` + s.body);
				if (((o = p[0]), p.length === 2)) {
					if (typeof p[1] != 'number' || !r1.has(s.name))
						throw new Et(`Malformed selector: ${s.name}=` + s.body);
					l = p[1];
				}
			} catch {
				throw new Et(`Malformed selector: ${s.name}=` + s.body);
			}
			const c = { name: s.name, source: s.body, body: { parsed: Vi(o), distance: l } },
				u = [...c.body.parsed.parts]
					.reverse()
					.find((p) => p.name === 'internal:control' && p.body === 'enter-frame'),
				d = u ? c.body.parsed.parts.indexOf(u) : -1;
			d !== -1 &&
				s1(c.body.parsed.parts.slice(0, d + 1), n.slice(0, d + 1)) &&
				c.body.parsed.parts.splice(0, d + 1),
				n.push(c);
			continue;
		}
		n.push({ ...s, source: s.body });
	}
	if (Iu.has(n[0].name)) throw new Et(`"${n[0].name}" selector cannot be first`);
	return { capture: e.capture, parts: n };
}
function s1(t, e) {
	return Tn({ parts: t }) === Tn({ parts: e });
}
function Tn(t, e) {
	return typeof t == 'string'
		? t
		: t.parts
				.map((n, s) => {
					let o = !0;
					!e &&
						s !== t.capture &&
						(n.name === 'css' ||
							(n.name === 'xpath' && n.source.startsWith('//')) ||
							n.source.startsWith('..')) &&
						(o = !1);
					const l = o ? n.name + '=' : '';
					return `${s === t.capture ? '*' : ''}${l}${n.source}`;
				})
				.join(' >> ');
}
function i1(t, e) {
	const n = (s, o) => {
		for (const l of s.parts) e(l, o), Iu.has(l.name) && n(l.body.parsed, !0);
	};
	n(t, !1);
}
function o1(t) {
	let e = 0,
		n,
		s = 0;
	const o = { parts: [] },
		l = () => {
			const u = t.substring(s, e).trim(),
				d = u.indexOf('=');
			let p, g;
			d !== -1 &&
			u
				.substring(0, d)
				.trim()
				.match(/^[a-zA-Z_0-9-+:*]+$/)
				? ((p = u.substring(0, d).trim()), (g = u.substring(d + 1)))
				: (u.length > 1 && u[0] === '"' && u[u.length - 1] === '"') ||
						(u.length > 1 && u[0] === "'" && u[u.length - 1] === "'")
					? ((p = 'text'), (g = u))
					: /^\(*\/\//.test(u) || u.startsWith('..')
						? ((p = 'xpath'), (g = u))
						: ((p = 'css'), (g = u));
			let y = !1;
			if (
				(p[0] === '*' && ((y = !0), (p = p.substring(1))), o.parts.push({ name: p, body: g }), y)
			) {
				if (o.capture !== void 0)
					throw new Et('Only one of the selectors can capture using * modifier');
				o.capture = o.parts.length - 1;
			}
		};
	if (!t.includes('>>')) return (e = t.length), l(), o;
	const c = () => {
		const d = t.substring(s, e).match(/^\s*text\s*=(.*)$/);
		return !!d && !!d[1];
	};
	for (; e < t.length; ) {
		const u = t[e];
		u === '\\' && e + 1 < t.length
			? (e += 2)
			: u === n
				? ((n = void 0), e++)
				: !n && (u === '"' || u === "'" || u === '`') && !c()
					? ((n = u), e++)
					: !n && u === '>' && t[e + 1] === '>'
						? (l(), (e += 2), (s = e))
						: e++;
	}
	return l(), o;
}
function br(t, e) {
	let n = 0,
		s = t.length === 0;
	const o = () => t[n] || '',
		l = () => {
			const E = o();
			return ++n, (s = n >= t.length), E;
		},
		c = (E) => {
			throw s
				? new Et(`Unexpected end of selector while parsing selector \`${t}\``)
				: new Et(
						`Error while parsing selector \`${t}\` - unexpected symbol "${o()}" at position ${n}` +
							(E ? ' during ' + E : ''),
					);
		};
	function u() {
		for (; !s && /\s/.test(o()); ) l();
	}
	function d(E) {
		return (
			E >= '' ||
			(E >= '0' && E <= '9') ||
			(E >= 'A' && E <= 'Z') ||
			(E >= 'a' && E <= 'z') ||
			(E >= '0' && E <= '9') ||
			E === '_' ||
			E === '-'
		);
	}
	function p() {
		let E = '';
		for (u(); !s && d(o()); ) E += l();
		return E;
	}
	function g(E) {
		let C = l();
		for (C !== E && c('parsing quoted string'); !s && o() !== E; ) o() === '\\' && l(), (C += l());
		return o() !== E && c('parsing quoted string'), (C += l()), C;
	}
	function y() {
		l() !== '/' && c('parsing regular expression');
		let E = '',
			C = !1;
		for (; !s; ) {
			if (o() === '\\') (E += l()), s && c('parsing regular expression');
			else if (C && o() === ']') C = !1;
			else if (!C && o() === '[') C = !0;
			else if (!C && o() === '/') break;
			E += l();
		}
		l() !== '/' && c('parsing regular expression');
		let A = '';
		for (; !s && o().match(/[dgimsuy]/); ) A += l();
		try {
			return new RegExp(E, A);
		} catch (O) {
			throw new Et(`Error while parsing selector \`${t}\`: ${O.message}`);
		}
	}
	function v() {
		let E = '';
		return (
			u(),
			o() === "'" || o() === '"' ? (E = g(o()).slice(1, -1)) : (E = p()),
			E || c('parsing property path'),
			E
		);
	}
	function S() {
		u();
		let E = '';
		return (
			s || (E += l()),
			!s && E !== '=' && (E += l()),
			['=', '*=', '^=', '$=', '|=', '~='].includes(E) || c('parsing operator'),
			E
		);
	}
	function k() {
		l();
		const E = [];
		for (E.push(v()), u(); o() === '.'; ) l(), E.push(v()), u();
		if (o() === ']')
			return (
				l(), { name: E.join('.'), jsonPath: E, op: '<truthy>', value: null, caseSensitive: !1 }
			);
		const C = S();
		let A,
			O = !0;
		if ((u(), o() === '/')) {
			if (C !== '=')
				throw new Et(
					`Error while parsing selector \`${t}\` - cannot use ${C} in attribute with regular expression`,
				);
			A = y();
		} else if (o() === "'" || o() === '"')
			(A = g(o()).slice(1, -1)),
				u(),
				o() === 'i' || o() === 'I'
					? ((O = !1), l())
					: (o() === 's' || o() === 'S') && ((O = !0), l());
		else {
			for (A = ''; !s && (d(o()) || o() === '+' || o() === '.'); ) A += l();
			A === 'true'
				? (A = !0)
				: A === 'false'
					? (A = !1)
					: e || ((A = +A), Number.isNaN(A) && c('parsing attribute value'));
		}
		if ((u(), o() !== ']' && c('parsing attribute value'), l(), C !== '=' && typeof A != 'string'))
			throw new Et(
				`Error while parsing selector \`${t}\` - cannot use ${C} in attribute with non-string matching value - ${A}`,
			);
		return { name: E.join('.'), jsonPath: E, op: C, value: A, caseSensitive: O };
	}
	const _ = { name: '', attributes: [] };
	for (_.name = p(), u(); o() === '['; ) _.attributes.push(k()), u();
	if ((s || c(void 0), !_.name && !_.attributes.length))
		throw new Et(`Error while parsing selector \`${t}\` - selector cannot be empty`);
	return _;
}
function Kl(t, e = "'") {
	const n = JSON.stringify(t),
		s = n.substring(1, n.length - 1).replace(/\\"/g, '"');
	if (e === "'") return e + s.replace(/[']/g, "\\'") + e;
	if (e === '"') return e + s.replace(/["]/g, '\\"') + e;
	if (e === '`') return e + s.replace(/[`]/g, '`') + e;
	throw new Error('Invalid escape char');
}
function $l(t) {
	return t.charAt(0).toUpperCase() + t.substring(1);
}
function og(t) {
	return t
		.replace(/([a-z0-9])([A-Z])/g, '$1_$2')
		.replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
		.toLowerCase();
}
function ds(t) {
	return `"${t.replace(/["\\]/g, (e) => '\\' + e)}"`;
}
let wr;
function l1() {
	wr = new Map();
}
function mt(t) {
	let e = wr == null ? void 0 : wr.get(t);
	return (
		e === void 0 &&
			((e = t
				.replace(/[\u200b\u00ad]/g, '')
				.trim()
				.replace(/\s+/g, ' ')),
			wr == null || wr.set(t, e)),
		e
	);
}
function Gl(t) {
	return t.replace(/(^|[^\\])(\\\\)*\\(['"`])/g, '$1$2$3');
}
function lg(t) {
	return t.unicode || t.unicodeSets
		? String(t)
		: String(t)
				.replace(/(^|[^\\])(\\\\)*(["'`])/g, '$1$2\\$3')
				.replace(/>>/g, '\\>\\>');
}
function kt(t, e) {
	return typeof t != 'string' ? lg(t) : `${JSON.stringify(t)}${e ? 's' : 'i'}`;
}
function ht(t, e) {
	return typeof t != 'string'
		? lg(t)
		: `"${t.replace(/\\/g, '\\\\').replace(/["]/g, '\\"')}"${e ? 's' : 'i'}`;
}
function a1(t, e, n = '') {
	if (t.length <= e) return t;
	const s = [...t];
	return s.length > e ? s.slice(0, e - n.length).join('') + n : s.join('');
}
function zp(t, e) {
	return a1(t, e, '…');
}
function Rl(t) {
	return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function c1(t, e) {
	const n = t.length,
		s = e.length;
	let o = 0,
		l = 0;
	const c = Array(n + 1)
		.fill(null)
		.map(() => Array(s + 1).fill(0));
	for (let u = 1; u <= n; u++)
		for (let d = 1; d <= s; d++)
			t[u - 1] === e[d - 1] &&
				((c[u][d] = c[u - 1][d - 1] + 1), c[u][d] > o && ((o = c[u][d]), (l = u)));
	return t.slice(l - o, l);
}
function u1(t, e) {
	const n = Vi(e),
		s = n.parts[n.parts.length - 1];
	return (s == null ? void 0 : s.name) === 'internal:describe' ? JSON.parse(s.body) : er(t, e);
}
function er(t, e, n = !1) {
	return ag(t, e, n, 1)[0];
}
function ag(t, e, n = !1, s = 20, o) {
	try {
		return hs(new y1[t](o), Vi(e), n, s);
	} catch {
		return [e];
	}
}
function hs(t, e, n = !1, s = 20) {
	const o = [...e.parts],
		l = [];
	let c = n ? 'frame-locator' : 'page';
	for (let u = 0; u < o.length; u++) {
		const d = o[u],
			p = c;
		if (((c = 'locator'), d.name === 'internal:describe')) continue;
		if (d.name === 'nth') {
			d.body === '0'
				? l.push([t.generateLocator(p, 'first', ''), t.generateLocator(p, 'nth', '0')])
				: d.body === '-1'
					? l.push([t.generateLocator(p, 'last', ''), t.generateLocator(p, 'nth', '-1')])
					: l.push([t.generateLocator(p, 'nth', d.body)]);
			continue;
		}
		if (d.name === 'visible') {
			l.push([
				t.generateLocator(p, 'visible', d.body),
				t.generateLocator(p, 'default', `visible=${d.body}`),
			]);
			continue;
		}
		if (d.name === 'internal:text') {
			const { exact: k, text: _ } = Ei(d.body);
			l.push([t.generateLocator(p, 'text', _, { exact: k })]);
			continue;
		}
		if (d.name === 'internal:has-text') {
			const { exact: k, text: _ } = Ei(d.body);
			if (!k) {
				l.push([t.generateLocator(p, 'has-text', _, { exact: k })]);
				continue;
			}
		}
		if (d.name === 'internal:has-not-text') {
			const { exact: k, text: _ } = Ei(d.body);
			if (!k) {
				l.push([t.generateLocator(p, 'has-not-text', _, { exact: k })]);
				continue;
			}
		}
		if (d.name === 'internal:has') {
			const k = hs(t, d.body.parsed, !1, s);
			l.push(k.map((_) => t.generateLocator(p, 'has', _)));
			continue;
		}
		if (d.name === 'internal:has-not') {
			const k = hs(t, d.body.parsed, !1, s);
			l.push(k.map((_) => t.generateLocator(p, 'hasNot', _)));
			continue;
		}
		if (d.name === 'internal:and') {
			const k = hs(t, d.body.parsed, !1, s);
			l.push(k.map((_) => t.generateLocator(p, 'and', _)));
			continue;
		}
		if (d.name === 'internal:or') {
			const k = hs(t, d.body.parsed, !1, s);
			l.push(k.map((_) => t.generateLocator(p, 'or', _)));
			continue;
		}
		if (d.name === 'internal:chain') {
			const k = hs(t, d.body.parsed, !1, s);
			l.push(k.map((_) => t.generateLocator(p, 'chain', _)));
			continue;
		}
		if (d.name === 'internal:label') {
			const { exact: k, text: _ } = Ei(d.body);
			l.push([t.generateLocator(p, 'label', _, { exact: k })]);
			continue;
		}
		if (d.name === 'internal:role') {
			const k = br(d.body, !0),
				_ = { attrs: [] };
			for (const E of k.attributes)
				E.name === 'name'
					? ((_.exact = E.caseSensitive), (_.name = E.value))
					: (E.name === 'level' && typeof E.value == 'string' && (E.value = +E.value),
						_.attrs.push({
							name: E.name === 'include-hidden' ? 'includeHidden' : E.name,
							value: E.value,
						}));
			l.push([t.generateLocator(p, 'role', k.name, _)]);
			continue;
		}
		if (d.name === 'internal:testid') {
			const k = br(d.body, !0),
				{ value: _ } = k.attributes[0];
			l.push([t.generateLocator(p, 'test-id', _)]);
			continue;
		}
		if (d.name === 'internal:attr') {
			const k = br(d.body, !0),
				{ name: _, value: E, caseSensitive: C } = k.attributes[0],
				A = E,
				O = !!C;
			if (_ === 'placeholder') {
				l.push([t.generateLocator(p, 'placeholder', A, { exact: O })]);
				continue;
			}
			if (_ === 'alt') {
				l.push([t.generateLocator(p, 'alt', A, { exact: O })]);
				continue;
			}
			if (_ === 'title') {
				l.push([t.generateLocator(p, 'title', A, { exact: O })]);
				continue;
			}
		}
		if (d.name === 'internal:control' && d.body === 'enter-frame') {
			const k = l[l.length - 1],
				_ = o[u - 1],
				E = k.map((C) => t.chainLocators([C, t.generateLocator(p, 'frame', '')]));
			['xpath', 'css'].includes(_.name) &&
				E.push(
					t.generateLocator(p, 'frame-locator', Tn({ parts: [_] })),
					t.generateLocator(p, 'frame-locator', Tn({ parts: [_] }, !0)),
				),
				k.splice(0, k.length, ...E),
				(c = 'frame-locator');
			continue;
		}
		const g = o[u + 1],
			y = Tn({ parts: [d] }),
			v = t.generateLocator(p, 'default', y);
		if (g && ['internal:has-text', 'internal:has-not-text'].includes(g.name)) {
			const { exact: k, text: _ } = Ei(g.body);
			if (!k) {
				const E = t.generateLocator(
						'locator',
						g.name === 'internal:has-text' ? 'has-text' : 'has-not-text',
						_,
						{ exact: k },
					),
					C = {};
				g.name === 'internal:has-text' ? (C.hasText = _) : (C.hasNotText = _);
				const A = t.generateLocator(p, 'default', y, C);
				l.push([t.chainLocators([v, E]), A]), u++;
				continue;
			}
		}
		let S;
		if (['xpath', 'css'].includes(d.name)) {
			const k = Tn({ parts: [d] }, !0);
			S = t.generateLocator(p, 'default', k);
		}
		l.push([v, S].filter(Boolean));
	}
	return f1(t, l, s);
}
function f1(t, e, n) {
	const s = e.map(() => ''),
		o = [],
		l = (c) => {
			if (c === e.length) return o.push(t.chainLocators(s)), o.length < n;
			for (const u of e[c]) if (((s[c] = u), !l(c + 1))) return !1;
			return !0;
		};
	return l(0), o;
}
function Ei(t) {
	let e = !1;
	const n = t.match(/^\/(.*)\/([igm]*)$/);
	return n
		? { text: new RegExp(n[1], n[2]) }
		: (t.endsWith('"')
				? ((t = JSON.parse(t)), (e = !0))
				: t.endsWith('"s')
					? ((t = JSON.parse(t.substring(0, t.length - 1))), (e = !0))
					: t.endsWith('"i') && ((t = JSON.parse(t.substring(0, t.length - 1))), (e = !1)),
			{ exact: e, text: t });
}
class d1 {
	constructor(e) {
		this.preferredQuote = e;
	}
	generateLocator(e, n, s, o = {}) {
		switch (n) {
			case 'default':
				return o.hasText !== void 0
					? `locator(${this.quote(s)}, { hasText: ${this.toHasText(o.hasText)} })`
					: o.hasNotText !== void 0
						? `locator(${this.quote(s)}, { hasNotText: ${this.toHasText(o.hasNotText)} })`
						: `locator(${this.quote(s)})`;
			case 'frame-locator':
				return `frameLocator(${this.quote(s)})`;
			case 'frame':
				return 'contentFrame()';
			case 'nth':
				return `nth(${s})`;
			case 'first':
				return 'first()';
			case 'last':
				return 'last()';
			case 'visible':
				return `filter({ visible: ${s === 'true' ? 'true' : 'false'} })`;
			case 'role':
				const l = [];
				et(o.name)
					? l.push(`name: ${this.regexToSourceString(o.name)}`)
					: typeof o.name == 'string' &&
						(l.push(`name: ${this.quote(o.name)}`), o.exact && l.push('exact: true'));
				for (const { name: u, value: d } of o.attrs)
					l.push(`${u}: ${typeof d == 'string' ? this.quote(d) : d}`);
				const c = l.length ? `, { ${l.join(', ')} }` : '';
				return `getByRole(${this.quote(s)}${c})`;
			case 'has-text':
				return `filter({ hasText: ${this.toHasText(s)} })`;
			case 'has-not-text':
				return `filter({ hasNotText: ${this.toHasText(s)} })`;
			case 'has':
				return `filter({ has: ${s} })`;
			case 'hasNot':
				return `filter({ hasNot: ${s} })`;
			case 'and':
				return `and(${s})`;
			case 'or':
				return `or(${s})`;
			case 'chain':
				return `locator(${s})`;
			case 'test-id':
				return `getByTestId(${this.toTestIdValue(s)})`;
			case 'text':
				return this.toCallWithExact('getByText', s, !!o.exact);
			case 'alt':
				return this.toCallWithExact('getByAltText', s, !!o.exact);
			case 'placeholder':
				return this.toCallWithExact('getByPlaceholder', s, !!o.exact);
			case 'label':
				return this.toCallWithExact('getByLabel', s, !!o.exact);
			case 'title':
				return this.toCallWithExact('getByTitle', s, !!o.exact);
			default:
				throw new Error('Unknown selector kind ' + n);
		}
	}
	chainLocators(e) {
		return e.join('.');
	}
	regexToSourceString(e) {
		return Gl(String(e));
	}
	toCallWithExact(e, n, s) {
		return et(n)
			? `${e}(${this.regexToSourceString(n)})`
			: s
				? `${e}(${this.quote(n)}, { exact: true })`
				: `${e}(${this.quote(n)})`;
	}
	toHasText(e) {
		return et(e) ? this.regexToSourceString(e) : this.quote(e);
	}
	toTestIdValue(e) {
		return et(e) ? this.regexToSourceString(e) : this.quote(e);
	}
	quote(e) {
		return Kl(e, this.preferredQuote ?? "'");
	}
}
class h1 {
	generateLocator(e, n, s, o = {}) {
		switch (n) {
			case 'default':
				return o.hasText !== void 0
					? `locator(${this.quote(s)}, has_text=${this.toHasText(o.hasText)})`
					: o.hasNotText !== void 0
						? `locator(${this.quote(s)}, has_not_text=${this.toHasText(o.hasNotText)})`
						: `locator(${this.quote(s)})`;
			case 'frame-locator':
				return `frame_locator(${this.quote(s)})`;
			case 'frame':
				return 'content_frame';
			case 'nth':
				return `nth(${s})`;
			case 'first':
				return 'first';
			case 'last':
				return 'last';
			case 'visible':
				return `filter(visible=${s === 'true' ? 'True' : 'False'})`;
			case 'role':
				const l = [];
				et(o.name)
					? l.push(`name=${this.regexToString(o.name)}`)
					: typeof o.name == 'string' &&
						(l.push(`name=${this.quote(o.name)}`), o.exact && l.push('exact=True'));
				for (const { name: u, value: d } of o.attrs) {
					let p = typeof d == 'string' ? this.quote(d) : d;
					typeof d == 'boolean' && (p = d ? 'True' : 'False'), l.push(`${og(u)}=${p}`);
				}
				const c = l.length ? `, ${l.join(', ')}` : '';
				return `get_by_role(${this.quote(s)}${c})`;
			case 'has-text':
				return `filter(has_text=${this.toHasText(s)})`;
			case 'has-not-text':
				return `filter(has_not_text=${this.toHasText(s)})`;
			case 'has':
				return `filter(has=${s})`;
			case 'hasNot':
				return `filter(has_not=${s})`;
			case 'and':
				return `and_(${s})`;
			case 'or':
				return `or_(${s})`;
			case 'chain':
				return `locator(${s})`;
			case 'test-id':
				return `get_by_test_id(${this.toTestIdValue(s)})`;
			case 'text':
				return this.toCallWithExact('get_by_text', s, !!o.exact);
			case 'alt':
				return this.toCallWithExact('get_by_alt_text', s, !!o.exact);
			case 'placeholder':
				return this.toCallWithExact('get_by_placeholder', s, !!o.exact);
			case 'label':
				return this.toCallWithExact('get_by_label', s, !!o.exact);
			case 'title':
				return this.toCallWithExact('get_by_title', s, !!o.exact);
			default:
				throw new Error('Unknown selector kind ' + n);
		}
	}
	chainLocators(e) {
		return e.join('.');
	}
	regexToString(e) {
		const n = e.flags.includes('i') ? ', re.IGNORECASE' : '';
		return `re.compile(r"${Gl(e.source).replace(/\\\//, '/').replace(/"/g, '\\"')}"${n})`;
	}
	toCallWithExact(e, n, s) {
		return et(n)
			? `${e}(${this.regexToString(n)})`
			: s
				? `${e}(${this.quote(n)}, exact=True)`
				: `${e}(${this.quote(n)})`;
	}
	toHasText(e) {
		return et(e) ? this.regexToString(e) : `${this.quote(e)}`;
	}
	toTestIdValue(e) {
		return et(e) ? this.regexToString(e) : this.quote(e);
	}
	quote(e) {
		return Kl(e, '"');
	}
}
class p1 {
	generateLocator(e, n, s, o = {}) {
		let l;
		switch (e) {
			case 'page':
				l = 'Page';
				break;
			case 'frame-locator':
				l = 'FrameLocator';
				break;
			case 'locator':
				l = 'Locator';
				break;
		}
		switch (n) {
			case 'default':
				return o.hasText !== void 0
					? `locator(${this.quote(s)}, new ${l}.LocatorOptions().setHasText(${this.toHasText(o.hasText)}))`
					: o.hasNotText !== void 0
						? `locator(${this.quote(s)}, new ${l}.LocatorOptions().setHasNotText(${this.toHasText(o.hasNotText)}))`
						: `locator(${this.quote(s)})`;
			case 'frame-locator':
				return `frameLocator(${this.quote(s)})`;
			case 'frame':
				return 'contentFrame()';
			case 'nth':
				return `nth(${s})`;
			case 'first':
				return 'first()';
			case 'last':
				return 'last()';
			case 'visible':
				return `filter(new ${l}.FilterOptions().setVisible(${s === 'true' ? 'true' : 'false'}))`;
			case 'role':
				const c = [];
				et(o.name)
					? c.push(`.setName(${this.regexToString(o.name)})`)
					: typeof o.name == 'string' &&
						(c.push(`.setName(${this.quote(o.name)})`), o.exact && c.push('.setExact(true)'));
				for (const { name: d, value: p } of o.attrs)
					c.push(`.set${$l(d)}(${typeof p == 'string' ? this.quote(p) : p})`);
				const u = c.length ? `, new ${l}.GetByRoleOptions()${c.join('')}` : '';
				return `getByRole(AriaRole.${og(s).toUpperCase()}${u})`;
			case 'has-text':
				return `filter(new ${l}.FilterOptions().setHasText(${this.toHasText(s)}))`;
			case 'has-not-text':
				return `filter(new ${l}.FilterOptions().setHasNotText(${this.toHasText(s)}))`;
			case 'has':
				return `filter(new ${l}.FilterOptions().setHas(${s}))`;
			case 'hasNot':
				return `filter(new ${l}.FilterOptions().setHasNot(${s}))`;
			case 'and':
				return `and(${s})`;
			case 'or':
				return `or(${s})`;
			case 'chain':
				return `locator(${s})`;
			case 'test-id':
				return `getByTestId(${this.toTestIdValue(s)})`;
			case 'text':
				return this.toCallWithExact(l, 'getByText', s, !!o.exact);
			case 'alt':
				return this.toCallWithExact(l, 'getByAltText', s, !!o.exact);
			case 'placeholder':
				return this.toCallWithExact(l, 'getByPlaceholder', s, !!o.exact);
			case 'label':
				return this.toCallWithExact(l, 'getByLabel', s, !!o.exact);
			case 'title':
				return this.toCallWithExact(l, 'getByTitle', s, !!o.exact);
			default:
				throw new Error('Unknown selector kind ' + n);
		}
	}
	chainLocators(e) {
		return e.join('.');
	}
	regexToString(e) {
		const n = e.flags.includes('i') ? ', Pattern.CASE_INSENSITIVE' : '';
		return `Pattern.compile(${this.quote(Gl(e.source))}${n})`;
	}
	toCallWithExact(e, n, s, o) {
		return et(s)
			? `${n}(${this.regexToString(s)})`
			: o
				? `${n}(${this.quote(s)}, new ${e}.${$l(n)}Options().setExact(true))`
				: `${n}(${this.quote(s)})`;
	}
	toHasText(e) {
		return et(e) ? this.regexToString(e) : this.quote(e);
	}
	toTestIdValue(e) {
		return et(e) ? this.regexToString(e) : this.quote(e);
	}
	quote(e) {
		return Kl(e, '"');
	}
}
class m1 {
	generateLocator(e, n, s, o = {}) {
		switch (n) {
			case 'default':
				return o.hasText !== void 0
					? `Locator(${this.quote(s)}, new() { ${this.toHasText(o.hasText)} })`
					: o.hasNotText !== void 0
						? `Locator(${this.quote(s)}, new() { ${this.toHasNotText(o.hasNotText)} })`
						: `Locator(${this.quote(s)})`;
			case 'frame-locator':
				return `FrameLocator(${this.quote(s)})`;
			case 'frame':
				return 'ContentFrame';
			case 'nth':
				return `Nth(${s})`;
			case 'first':
				return 'First';
			case 'last':
				return 'Last';
			case 'visible':
				return `Filter(new() { Visible = ${s === 'true' ? 'true' : 'false'} })`;
			case 'role':
				const l = [];
				et(o.name)
					? l.push(`NameRegex = ${this.regexToString(o.name)}`)
					: typeof o.name == 'string' &&
						(l.push(`Name = ${this.quote(o.name)}`), o.exact && l.push('Exact = true'));
				for (const { name: u, value: d } of o.attrs)
					l.push(`${$l(u)} = ${typeof d == 'string' ? this.quote(d) : d}`);
				const c = l.length ? `, new() { ${l.join(', ')} }` : '';
				return `GetByRole(AriaRole.${$l(s)}${c})`;
			case 'has-text':
				return `Filter(new() { ${this.toHasText(s)} })`;
			case 'has-not-text':
				return `Filter(new() { ${this.toHasNotText(s)} })`;
			case 'has':
				return `Filter(new() { Has = ${s} })`;
			case 'hasNot':
				return `Filter(new() { HasNot = ${s} })`;
			case 'and':
				return `And(${s})`;
			case 'or':
				return `Or(${s})`;
			case 'chain':
				return `Locator(${s})`;
			case 'test-id':
				return `GetByTestId(${this.toTestIdValue(s)})`;
			case 'text':
				return this.toCallWithExact('GetByText', s, !!o.exact);
			case 'alt':
				return this.toCallWithExact('GetByAltText', s, !!o.exact);
			case 'placeholder':
				return this.toCallWithExact('GetByPlaceholder', s, !!o.exact);
			case 'label':
				return this.toCallWithExact('GetByLabel', s, !!o.exact);
			case 'title':
				return this.toCallWithExact('GetByTitle', s, !!o.exact);
			default:
				throw new Error('Unknown selector kind ' + n);
		}
	}
	chainLocators(e) {
		return e.join('.');
	}
	regexToString(e) {
		const n = e.flags.includes('i') ? ', RegexOptions.IgnoreCase' : '';
		return `new Regex(${this.quote(Gl(e.source))}${n})`;
	}
	toCallWithExact(e, n, s) {
		return et(n)
			? `${e}(${this.regexToString(n)})`
			: s
				? `${e}(${this.quote(n)}, new() { Exact = true })`
				: `${e}(${this.quote(n)})`;
	}
	toHasText(e) {
		return et(e) ? `HasTextRegex = ${this.regexToString(e)}` : `HasText = ${this.quote(e)}`;
	}
	toTestIdValue(e) {
		return et(e) ? this.regexToString(e) : this.quote(e);
	}
	toHasNotText(e) {
		return et(e) ? `HasNotTextRegex = ${this.regexToString(e)}` : `HasNotText = ${this.quote(e)}`;
	}
	quote(e) {
		return Kl(e, '"');
	}
}
class g1 {
	generateLocator(e, n, s, o = {}) {
		return JSON.stringify({ kind: n, body: s, options: o });
	}
	chainLocators(e) {
		const n = e.map((s) => JSON.parse(s));
		for (let s = 0; s < n.length - 1; ++s) n[s].next = n[s + 1];
		return JSON.stringify(n[0]);
	}
}
const y1 = { javascript: d1, python: h1, java: p1, csharp: m1, jsonl: g1 };
function et(t) {
	return t instanceof RegExp;
}
const Hp = new Map();
function v1({
	name: t,
	rootItem: e,
	render: n,
	title: s,
	icon: o,
	isError: l,
	isVisible: c,
	selectedItem: u,
	onAccepted: d,
	onSelected: p,
	onHighlighted: g,
	treeState: y,
	setTreeState: v,
	noItemsMessage: S,
	dataTestId: k,
	autoExpandDepth: _,
}) {
	const E = R.useMemo(() => w1(e, u, y.expandedItems, _ || 0, c), [e, u, y, _, c]),
		C = R.useRef(null),
		[A, O] = R.useState(),
		[D, F] = R.useState(!1);
	R.useEffect(() => {
		g == null || g(A);
	}, [g, A]),
		R.useEffect(() => {
			const q = C.current;
			if (!q) return;
			const B = () => {
				Hp.set(t, q.scrollTop);
			};
			return (
				q.addEventListener('scroll', B, { passive: !0 }), () => q.removeEventListener('scroll', B)
			);
		}, [t]),
		R.useEffect(() => {
			C.current && (C.current.scrollTop = Hp.get(t) || 0);
		}, [t]);
	const z = R.useCallback(
		(q) => {
			const { expanded: B } = E.get(q);
			if (B) {
				for (let M = u; M; M = M.parent)
					if (M === q) {
						p == null || p(q);
						break;
					}
				y.expandedItems.set(q.id, !1);
			} else y.expandedItems.set(q.id, !0);
			v({ ...y });
		},
		[E, u, p, y, v],
	);
	return w.jsx('div', {
		className: ze('tree-view vbox', t + '-tree-view'),
		role: 'tree',
		'data-testid': k || t + '-tree',
		children: w.jsxs('div', {
			className: ze('tree-view-content'),
			tabIndex: 0,
			onKeyDown: (q) => {
				if (u && q.key === 'Enter') {
					d == null || d(u);
					return;
				}
				if (
					q.key !== 'ArrowDown' &&
					q.key !== 'ArrowUp' &&
					q.key !== 'ArrowLeft' &&
					q.key !== 'ArrowRight'
				)
					return;
				if ((q.stopPropagation(), q.preventDefault(), u && q.key === 'ArrowLeft')) {
					const { expanded: M, parent: G } = E.get(u);
					M ? (y.expandedItems.set(u.id, !1), v({ ...y })) : G && (p == null || p(G));
					return;
				}
				if (u && q.key === 'ArrowRight') {
					u.children.length && (y.expandedItems.set(u.id, !0), v({ ...y }));
					return;
				}
				let B = u;
				if (
					(q.key === 'ArrowDown' && (u ? (B = E.get(u).next) : E.size && (B = [...E.keys()][0])),
					q.key === 'ArrowUp')
				) {
					if (u) B = E.get(u).prev;
					else if (E.size) {
						const M = [...E.keys()];
						B = M[M.length - 1];
					}
				}
				g == null || g(void 0), B && (F(!0), p == null || p(B)), O(void 0);
			},
			ref: C,
			children: [
				S && E.size === 0 && w.jsx('div', { className: 'tree-view-empty', children: S }),
				e.children.map(
					(q) =>
						E.get(q) &&
						w.jsx(
							cg,
							{
								item: q,
								treeItems: E,
								selectedItem: u,
								onSelected: p,
								onAccepted: d,
								isError: l,
								toggleExpanded: z,
								highlightedItem: A,
								setHighlightedItem: O,
								render: n,
								icon: o,
								title: s,
								isKeyboardNavigation: D,
								setIsKeyboardNavigation: F,
							},
							q.id,
						),
				),
			],
		}),
	});
}
function cg({
	item: t,
	treeItems: e,
	selectedItem: n,
	onSelected: s,
	highlightedItem: o,
	setHighlightedItem: l,
	isError: c,
	onAccepted: u,
	toggleExpanded: d,
	render: p,
	title: g,
	icon: y,
	isKeyboardNavigation: v,
	setIsKeyboardNavigation: S,
}) {
	const k = R.useId(),
		_ = R.useRef(null);
	R.useEffect(() => {
		n === t && v && _.current && ($m(_.current), S(!1));
	}, [t, n, v, S]);
	const E = e.get(t),
		C = E.depth,
		A = E.expanded;
	let O = 'codicon-blank';
	typeof A == 'boolean' && (O = A ? 'codicon-chevron-down' : 'codicon-chevron-right');
	const D = p(t),
		F = A && t.children.length ? t.children : [],
		z = g == null ? void 0 : g(t),
		q = (y == null ? void 0 : y(t)) || 'codicon-blank';
	return w.jsxs('div', {
		ref: _,
		role: 'treeitem',
		'aria-selected': t === n,
		'aria-expanded': A,
		'aria-controls': k,
		title: z,
		className: 'vbox',
		style: { flex: 'none' },
		children: [
			w.jsxs('div', {
				onDoubleClick: () => (u == null ? void 0 : u(t)),
				className: ze(
					'tree-view-entry',
					n === t && 'selected',
					o === t && 'highlighted',
					(c == null ? void 0 : c(t)) && 'error',
				),
				onClick: () => (s == null ? void 0 : s(t)),
				onMouseEnter: () => l(t),
				onMouseLeave: () => l(void 0),
				children: [
					C
						? new Array(C)
								.fill(0)
								.map((B, M) => w.jsx('div', { className: 'tree-view-indent' }, 'indent-' + M))
						: void 0,
					w.jsx('div', {
						'aria-hidden': 'true',
						className: 'codicon ' + O,
						style: { minWidth: 16, marginRight: 4 },
						onDoubleClick: (B) => {
							B.preventDefault(), B.stopPropagation();
						},
						onClick: (B) => {
							B.stopPropagation(), B.preventDefault(), d(t);
						},
					}),
					y &&
						w.jsx('div', {
							className: 'codicon ' + q,
							style: { minWidth: 16, marginRight: 4 },
							'aria-label': '[' + q.replace('codicon', 'icon') + ']',
						}),
					typeof D == 'string'
						? w.jsx('div', { style: { textOverflow: 'ellipsis', overflow: 'hidden' }, children: D })
						: D,
				],
			}),
			!!F.length &&
				w.jsx('div', {
					id: k,
					role: 'group',
					children: F.map(
						(B) =>
							e.get(B) &&
							w.jsx(
								cg,
								{
									item: B,
									treeItems: e,
									selectedItem: n,
									onSelected: s,
									onAccepted: u,
									isError: c,
									toggleExpanded: d,
									highlightedItem: o,
									setHighlightedItem: l,
									render: p,
									title: g,
									icon: y,
									isKeyboardNavigation: v,
									setIsKeyboardNavigation: S,
								},
								B.id,
							),
					),
				}),
		],
	});
}
function w1(t, e, n, s, o = () => !0) {
	if (!o(t)) return new Map();
	const l = new Map(),
		c = new Set();
	for (let p = e == null ? void 0 : e.parent; p; p = p.parent) c.add(p.id);
	let u = null;
	const d = (p, g) => {
		for (const y of p.children) {
			if (!o(y)) continue;
			const v = c.has(y.id) || n.get(y.id),
				S = s > g && l.size < 25 && v !== !1,
				k = y.children.length ? (v ?? S) : void 0,
				_ = { depth: g, expanded: k, parent: t === p ? null : p, next: null, prev: u };
			u && (l.get(u).next = y), (u = y), l.set(y, _), k && d(y, g + 1);
		}
	};
	return d(t, 0), l;
}
const qt = R.forwardRef(function (
		{
			children: e,
			title: n = '',
			icon: s,
			disabled: o = !1,
			toggled: l = !1,
			onClick: c = () => {},
			style: u,
			testId: d,
			className: p,
			ariaLabel: g,
		},
		y,
	) {
		return w.jsxs('button', {
			ref: y,
			className: ze(p, 'toolbar-button', s, l && 'toggled'),
			onMouseDown: Up,
			onClick: c,
			onDoubleClick: Up,
			title: n,
			disabled: !!o,
			style: u,
			'data-testid': d,
			'aria-label': g || n,
			children: [
				s &&
					w.jsx('span', { className: `codicon codicon-${s}`, style: e ? { marginRight: 5 } : {} }),
				e,
			],
		});
	}),
	Up = (t) => {
		t.stopPropagation(), t.preventDefault();
	};
function ug(t) {
	return t === 'scheduled'
		? 'codicon-clock'
		: t === 'running'
			? 'codicon-loading'
			: t === 'failed'
				? 'codicon-error'
				: t === 'passed'
					? 'codicon-check'
					: t === 'skipped'
						? 'codicon-circle-slash'
						: 'codicon-circle-outline';
}
function S1(t) {
	return t === 'scheduled'
		? 'Pending'
		: t === 'running'
			? 'Running'
			: t === 'failed'
				? 'Failed'
				: t === 'passed'
					? 'Passed'
					: t === 'skipped'
						? 'Skipped'
						: 'Did not run';
}
const x1 = new Map([
	['APIRequestContext.fetch', { title: 'Fetch "{url}"' }],
	['APIRequestContext.fetchResponseBody', { internal: !0 }],
	['APIRequestContext.fetchLog', { internal: !0 }],
	['APIRequestContext.storageState', { internal: !0 }],
	['APIRequestContext.disposeAPIResponse', { internal: !0 }],
	['APIRequestContext.dispose', { internal: !0 }],
	['LocalUtils.zip', { internal: !0 }],
	['LocalUtils.harOpen', { internal: !0 }],
	['LocalUtils.harLookup', { internal: !0 }],
	['LocalUtils.harClose', { internal: !0 }],
	['LocalUtils.harUnzip', { internal: !0 }],
	['LocalUtils.connect', { internal: !0 }],
	['LocalUtils.tracingStarted', { internal: !0 }],
	['LocalUtils.addStackToTracingNoReply', { internal: !0 }],
	['LocalUtils.traceDiscarded', { internal: !0 }],
	['LocalUtils.globToRegex', { internal: !0 }],
	['Root.initialize', { internal: !0 }],
	['Playwright.newRequest', { title: 'Create request context' }],
	['DebugController.initialize', { internal: !0 }],
	['DebugController.setReportStateChanged', { internal: !0 }],
	['DebugController.resetForReuse', { internal: !0 }],
	['DebugController.navigate', { internal: !0 }],
	['DebugController.setRecorderMode', { internal: !0 }],
	['DebugController.highlight', { internal: !0 }],
	['DebugController.hideHighlight', { internal: !0 }],
	['DebugController.resume', { internal: !0 }],
	['DebugController.kill', { internal: !0 }],
	['DebugController.closeAllBrowsers', { internal: !0 }],
	['SocksSupport.socksConnected', { internal: !0 }],
	['SocksSupport.socksFailed', { internal: !0 }],
	['SocksSupport.socksData', { internal: !0 }],
	['SocksSupport.socksError', { internal: !0 }],
	['SocksSupport.socksEnd', { internal: !0 }],
	['BrowserType.launch', { title: 'Launch browser' }],
	['BrowserType.launchPersistentContext', { title: 'Launch persistent context' }],
	['BrowserType.connectOverCDP', { title: 'Connect over CDP' }],
	['Browser.close', { title: 'Close browser' }],
	['Browser.killForTests', { internal: !0 }],
	['Browser.defaultUserAgentForTest', { internal: !0 }],
	['Browser.newContext', { title: 'Create context' }],
	['Browser.newContextForReuse', { internal: !0 }],
	['Browser.stopPendingOperations', { internal: !0, title: 'Stop pending operations' }],
	['Browser.newBrowserCDPSession', { internal: !0, title: 'Create CDP session' }],
	['Browser.startTracing', { internal: !0 }],
	['Browser.stopTracing', { internal: !0 }],
	['EventTarget.waitForEventInfo', { title: 'Wait for event "{info.event}"', snapshot: !0 }],
	['BrowserContext.waitForEventInfo', { title: 'Wait for event "{info.event}"', snapshot: !0 }],
	['Page.waitForEventInfo', { title: 'Wait for event "{info.event}"', snapshot: !0 }],
	['WebSocket.waitForEventInfo', { title: 'Wait for event "{info.event}"', snapshot: !0 }],
	[
		'ElectronApplication.waitForEventInfo',
		{ title: 'Wait for event "{info.event}"', snapshot: !0 },
	],
	['AndroidDevice.waitForEventInfo', { title: 'Wait for event "{info.event}"', snapshot: !0 }],
	['BrowserContext.addCookies', { title: 'Add cookies' }],
	['BrowserContext.addInitScript', { title: 'Add init script' }],
	['BrowserContext.clearCookies', { title: 'Clear cookies' }],
	['BrowserContext.clearPermissions', { title: 'Clear permissions' }],
	['BrowserContext.close', { title: 'Close context' }],
	['BrowserContext.cookies', { title: 'Get cookies' }],
	['BrowserContext.exposeBinding', { title: 'Expose binding' }],
	['BrowserContext.grantPermissions', { title: 'Grant permissions' }],
	['BrowserContext.newPage', { title: 'Create page' }],
	['BrowserContext.registerSelectorEngine', { internal: !0 }],
	['BrowserContext.setTestIdAttributeName', { internal: !0 }],
	['BrowserContext.setExtraHTTPHeaders', { title: 'Set extra HTTP headers' }],
	['BrowserContext.setGeolocation', { title: 'Set geolocation' }],
	['BrowserContext.setHTTPCredentials', { title: 'Set HTTP credentials' }],
	['BrowserContext.setNetworkInterceptionPatterns', { internal: !0 }],
	['BrowserContext.setWebSocketInterceptionPatterns', { internal: !0 }],
	['BrowserContext.setOffline', { title: 'Set offline mode' }],
	['BrowserContext.storageState', { title: 'Get storage state' }],
	['BrowserContext.pause', { title: 'Pause' }],
	['BrowserContext.enableRecorder', { internal: !0 }],
	['BrowserContext.newCDPSession', { internal: !0 }],
	['BrowserContext.harStart', { internal: !0 }],
	['BrowserContext.harExport', { internal: !0 }],
	['BrowserContext.createTempFiles', { internal: !0 }],
	['BrowserContext.updateSubscription', { internal: !0 }],
	['BrowserContext.clockFastForward', { title: 'Fast forward clock "{ticksNumber}{ticksString}"' }],
	['BrowserContext.clockInstall', { title: 'Install clock "{timeNumber}{timeString}"' }],
	['BrowserContext.clockPauseAt', { title: 'Pause clock "{timeNumber}{timeString}"' }],
	['BrowserContext.clockResume', { title: 'Resume clock' }],
	['BrowserContext.clockRunFor', { title: 'Run clock "{ticksNumber}{ticksString}"' }],
	['BrowserContext.clockSetFixedTime', { title: 'Set fixed time "{timeNumber}{timeString}"' }],
	['BrowserContext.clockSetSystemTime', { title: 'Set system time "{timeNumber}{timeString}"' }],
	['Page.addInitScript', {}],
	['Page.close', { title: 'Close' }],
	['Page.emulateMedia', { title: 'Emulate media', snapshot: !0 }],
	['Page.exposeBinding', { title: 'Expose binding' }],
	['Page.goBack', { title: 'Go back', slowMo: !0, snapshot: !0 }],
	['Page.goForward', { title: 'Go forward', slowMo: !0, snapshot: !0 }],
	['Page.requestGC', { title: 'Request garbage collection' }],
	['Page.registerLocatorHandler', { title: 'Register locator handler' }],
	['Page.resolveLocatorHandlerNoReply', { internal: !0 }],
	['Page.unregisterLocatorHandler', { title: 'Unregister locator handler' }],
	['Page.reload', { title: 'Reload', slowMo: !0, snapshot: !0 }],
	['Page.expectScreenshot', { title: 'Expect screenshot', snapshot: !0 }],
	['Page.screenshot', { title: 'Screenshot', snapshot: !0 }],
	['Page.setExtraHTTPHeaders', { title: 'Set extra HTTP headers' }],
	['Page.setNetworkInterceptionPatterns', { internal: !0 }],
	['Page.setWebSocketInterceptionPatterns', { internal: !0 }],
	['Page.setViewportSize', { title: 'Set viewport size', snapshot: !0 }],
	['Page.keyboardDown', { title: 'Key down "{key}"', slowMo: !0, snapshot: !0 }],
	['Page.keyboardUp', { title: 'Key up "{key}"', slowMo: !0, snapshot: !0 }],
	['Page.keyboardInsertText', { title: 'Insert "{text}"', slowMo: !0, snapshot: !0 }],
	['Page.keyboardType', { title: 'Type "{text}"', slowMo: !0, snapshot: !0 }],
	['Page.keyboardPress', { title: 'Press "{key}"', slowMo: !0, snapshot: !0 }],
	['Page.mouseMove', { title: 'Mouse move', slowMo: !0, snapshot: !0 }],
	['Page.mouseDown', { title: 'Mouse down', slowMo: !0, snapshot: !0 }],
	['Page.mouseUp', { title: 'Mouse up', slowMo: !0, snapshot: !0 }],
	['Page.mouseClick', { title: 'Click', slowMo: !0, snapshot: !0 }],
	['Page.mouseWheel', { title: 'Mouse wheel', slowMo: !0, snapshot: !0 }],
	['Page.touchscreenTap', { title: 'Tap', slowMo: !0, snapshot: !0 }],
	['Page.accessibilitySnapshot', { internal: !0, snapshot: !0 }],
	['Page.pdf', { title: 'PDF' }],
	['Page.snapshotForAI', { internal: !0, snapshot: !0 }],
	['Page.startJSCoverage', { internal: !0 }],
	['Page.stopJSCoverage', { internal: !0 }],
	['Page.startCSSCoverage', { internal: !0 }],
	['Page.stopCSSCoverage', { internal: !0 }],
	['Page.bringToFront', { title: 'Bring to front' }],
	['Page.updateSubscription', { internal: !0 }],
	['Frame.evalOnSelector', { title: 'Evaluate', snapshot: !0 }],
	['Frame.evalOnSelectorAll', { title: 'Evaluate', snapshot: !0 }],
	['Frame.addScriptTag', { title: 'Add script tag', snapshot: !0 }],
	['Frame.addStyleTag', { title: 'Add style tag', snapshot: !0 }],
	['Frame.ariaSnapshot', { title: 'Aria snapshot', snapshot: !0 }],
	['Frame.blur', { title: 'Blur', slowMo: !0, snapshot: !0 }],
	['Frame.check', { title: 'Check', slowMo: !0, snapshot: !0, pausesBeforeInput: !0 }],
	['Frame.click', { title: 'Click', slowMo: !0, snapshot: !0, pausesBeforeInput: !0 }],
	['Frame.content', { title: 'Get content', snapshot: !0 }],
	[
		'Frame.dragAndDrop',
		{ title: 'Drag and drop', slowMo: !0, snapshot: !0, pausesBeforeInput: !0 },
	],
	['Frame.dblclick', { title: 'Double click', slowMo: !0, snapshot: !0, pausesBeforeInput: !0 }],
	['Frame.dispatchEvent', { title: 'Dispatch "{type}"', slowMo: !0, snapshot: !0 }],
	['Frame.evaluateExpression', { title: 'Evaluate', snapshot: !0 }],
	['Frame.evaluateExpressionHandle', { title: 'Evaluate', snapshot: !0 }],
	['Frame.fill', { title: 'Fill "{value}"', slowMo: !0, snapshot: !0, pausesBeforeInput: !0 }],
	['Frame.focus', { title: 'Focus', slowMo: !0, snapshot: !0 }],
	['Frame.frameElement', { internal: !0 }],
	['Frame.highlight', { internal: !0 }],
	['Frame.getAttribute', { internal: !0, snapshot: !0 }],
	['Frame.goto', { title: 'Navigate to "{url}"', slowMo: !0, snapshot: !0 }],
	['Frame.hover', { title: 'Hover', slowMo: !0, snapshot: !0, pausesBeforeInput: !0 }],
	['Frame.innerHTML', { title: 'Get HTML', snapshot: !0 }],
	['Frame.innerText', { title: 'Get inner text', snapshot: !0 }],
	['Frame.inputValue', { title: 'Get input value', snapshot: !0 }],
	['Frame.isChecked', { title: 'Is checked', snapshot: !0 }],
	['Frame.isDisabled', { title: 'Is disabled', snapshot: !0 }],
	['Frame.isEnabled', { title: 'Is enabled', snapshot: !0 }],
	['Frame.isHidden', { title: 'Is hidden', snapshot: !0 }],
	['Frame.isVisible', { title: 'Is visible', snapshot: !0 }],
	['Frame.isEditable', { title: 'Is editable', snapshot: !0 }],
	['Frame.press', { title: 'Press "{key}"', slowMo: !0, snapshot: !0, pausesBeforeInput: !0 }],
	['Frame.querySelector', { title: 'Query selector', snapshot: !0 }],
	['Frame.querySelectorAll', { title: 'Query selector all', snapshot: !0 }],
	['Frame.queryCount', { title: 'Query count', snapshot: !0 }],
	[
		'Frame.selectOption',
		{ title: 'Select option', slowMo: !0, snapshot: !0, pausesBeforeInput: !0 },
	],
	['Frame.setContent', { title: 'Set content', snapshot: !0 }],
	[
		'Frame.setInputFiles',
		{ title: 'Set input files', slowMo: !0, snapshot: !0, pausesBeforeInput: !0 },
	],
	['Frame.tap', { title: 'Tap', slowMo: !0, snapshot: !0, pausesBeforeInput: !0 }],
	['Frame.textContent', { title: 'Get text content', snapshot: !0 }],
	['Frame.title', { internal: !0 }],
	['Frame.type', { title: 'Type', slowMo: !0, snapshot: !0, pausesBeforeInput: !0 }],
	['Frame.uncheck', { title: 'Uncheck', slowMo: !0, snapshot: !0, pausesBeforeInput: !0 }],
	['Frame.waitForTimeout', { title: 'Wait for timeout', snapshot: !0 }],
	['Frame.waitForFunction', { title: 'Wait for function', snapshot: !0 }],
	['Frame.waitForSelector', { title: 'Wait for selector', snapshot: !0 }],
	['Frame.expect', { title: 'Expect "{expression}"', snapshot: !0 }],
	['Worker.evaluateExpression', { title: 'Evaluate' }],
	['Worker.evaluateExpressionHandle', { title: 'Evaluate' }],
	['JSHandle.dispose', {}],
	['ElementHandle.dispose', {}],
	['JSHandle.evaluateExpression', { title: 'Evaluate', snapshot: !0 }],
	['ElementHandle.evaluateExpression', { title: 'Evaluate', snapshot: !0 }],
	['JSHandle.evaluateExpressionHandle', { title: 'Evaluate', snapshot: !0 }],
	['ElementHandle.evaluateExpressionHandle', { title: 'Evaluate', snapshot: !0 }],
	['JSHandle.getPropertyList', { internal: !0 }],
	['ElementHandle.getPropertyList', { internal: !0 }],
	['JSHandle.getProperty', { internal: !0 }],
	['ElementHandle.getProperty', { internal: !0 }],
	['JSHandle.jsonValue', { internal: !0 }],
	['ElementHandle.jsonValue', { internal: !0 }],
	['ElementHandle.evalOnSelector', { title: 'Evaluate', snapshot: !0 }],
	['ElementHandle.evalOnSelectorAll', { title: 'Evaluate', snapshot: !0 }],
	['ElementHandle.boundingBox', { title: 'Get bounding box', snapshot: !0 }],
	['ElementHandle.check', { title: 'Check', slowMo: !0, snapshot: !0, pausesBeforeInput: !0 }],
	['ElementHandle.click', { title: 'Click', slowMo: !0, snapshot: !0, pausesBeforeInput: !0 }],
	['ElementHandle.contentFrame', { internal: !0, snapshot: !0 }],
	[
		'ElementHandle.dblclick',
		{ title: 'Double click', slowMo: !0, snapshot: !0, pausesBeforeInput: !0 },
	],
	['ElementHandle.dispatchEvent', { title: 'Dispatch event', slowMo: !0, snapshot: !0 }],
	[
		'ElementHandle.fill',
		{ title: 'Fill "{value}"', slowMo: !0, snapshot: !0, pausesBeforeInput: !0 },
	],
	['ElementHandle.focus', { title: 'Focus', slowMo: !0, snapshot: !0 }],
	['ElementHandle.generateLocatorString', { internal: !0 }],
	['ElementHandle.getAttribute', { internal: !0 }],
	['ElementHandle.hover', { title: 'Hover', slowMo: !0, snapshot: !0, pausesBeforeInput: !0 }],
	['ElementHandle.innerHTML', { title: 'Get HTML', snapshot: !0 }],
	['ElementHandle.innerText', { title: 'Get inner text', snapshot: !0 }],
	['ElementHandle.inputValue', { title: 'Get input value', snapshot: !0 }],
	['ElementHandle.isChecked', { title: 'Is checked', snapshot: !0 }],
	['ElementHandle.isDisabled', { title: 'Is disabled', snapshot: !0 }],
	['ElementHandle.isEditable', { title: 'Is editable', snapshot: !0 }],
	['ElementHandle.isEnabled', { title: 'Is enabled', snapshot: !0 }],
	['ElementHandle.isHidden', { title: 'Is hidden', snapshot: !0 }],
	['ElementHandle.isVisible', { title: 'Is visible', snapshot: !0 }],
	['ElementHandle.ownerFrame', { title: 'Get owner frame' }],
	[
		'ElementHandle.press',
		{ title: 'Press "{key}"', slowMo: !0, snapshot: !0, pausesBeforeInput: !0 },
	],
	['ElementHandle.querySelector', { title: 'Query selector', snapshot: !0 }],
	['ElementHandle.querySelectorAll', { title: 'Query selector all', snapshot: !0 }],
	['ElementHandle.screenshot', { title: 'Screenshot', snapshot: !0 }],
	['ElementHandle.scrollIntoViewIfNeeded', { title: 'Scroll into view', slowMo: !0, snapshot: !0 }],
	[
		'ElementHandle.selectOption',
		{ title: 'Select option', slowMo: !0, snapshot: !0, pausesBeforeInput: !0 },
	],
	['ElementHandle.selectText', { title: 'Select text', slowMo: !0, snapshot: !0 }],
	[
		'ElementHandle.setInputFiles',
		{ title: 'Set input files', slowMo: !0, snapshot: !0, pausesBeforeInput: !0 },
	],
	['ElementHandle.tap', { title: 'Tap', slowMo: !0, snapshot: !0, pausesBeforeInput: !0 }],
	['ElementHandle.textContent', { title: 'Get text content', snapshot: !0 }],
	['ElementHandle.type', { title: 'Type', slowMo: !0, snapshot: !0, pausesBeforeInput: !0 }],
	['ElementHandle.uncheck', { title: 'Uncheck', slowMo: !0, snapshot: !0, pausesBeforeInput: !0 }],
	['ElementHandle.waitForElementState', { title: 'Wait for state', snapshot: !0 }],
	['ElementHandle.waitForSelector', { title: 'Wait for selector', snapshot: !0 }],
	['Request.response', { internal: !0 }],
	['Request.rawRequestHeaders', { internal: !0 }],
	['Route.redirectNavigationRequest', { internal: !0 }],
	['Route.abort', {}],
	['Route.continue', { internal: !0 }],
	['Route.fulfill', { internal: !0 }],
	['WebSocketRoute.connect', { internal: !0 }],
	['WebSocketRoute.ensureOpened', { internal: !0 }],
	['WebSocketRoute.sendToPage', { internal: !0 }],
	['WebSocketRoute.sendToServer', { internal: !0 }],
	['WebSocketRoute.closePage', { internal: !0 }],
	['WebSocketRoute.closeServer', { internal: !0 }],
	['Response.body', { internal: !0 }],
	['Response.securityDetails', { internal: !0 }],
	['Response.serverAddr', { internal: !0 }],
	['Response.rawResponseHeaders', { internal: !0 }],
	['Response.sizes', { internal: !0 }],
	['BindingCall.reject', { internal: !0 }],
	['BindingCall.resolve', { internal: !0 }],
	['Dialog.accept', { title: 'Accept dialog' }],
	['Dialog.dismiss', { title: 'Dismiss dialog' }],
	['Tracing.tracingStart', { internal: !0 }],
	['Tracing.tracingStartChunk', { internal: !0 }],
	['Tracing.tracingGroup', { title: 'Trace "{name}"' }],
	['Tracing.tracingGroupEnd', { title: 'Group end' }],
	['Tracing.tracingStopChunk', { internal: !0 }],
	['Tracing.tracingStop', { internal: !0 }],
	['Artifact.pathAfterFinished', { internal: !0 }],
	['Artifact.saveAs', { internal: !0 }],
	['Artifact.saveAsStream', { internal: !0 }],
	['Artifact.failure', { internal: !0 }],
	['Artifact.stream', { internal: !0 }],
	['Artifact.cancel', { internal: !0 }],
	['Artifact.delete', { internal: !0 }],
	['Stream.read', { internal: !0 }],
	['Stream.close', { internal: !0 }],
	['WritableStream.write', { internal: !0 }],
	['WritableStream.close', { internal: !0 }],
	['CDPSession.send', { internal: !0 }],
	['CDPSession.detach', { internal: !0 }],
	['Electron.launch', { title: 'Launch electron' }],
	['ElectronApplication.browserWindow', { internal: !0 }],
	['ElectronApplication.evaluateExpression', { title: 'Evaluate' }],
	['ElectronApplication.evaluateExpressionHandle', { title: 'Evaluate' }],
	['ElectronApplication.updateSubscription', { internal: !0 }],
	['Android.devices', { internal: !0 }],
	['AndroidSocket.write', { internal: !0 }],
	['AndroidSocket.close', { internal: !0 }],
	['AndroidDevice.wait', {}],
	['AndroidDevice.fill', { title: 'Fill "{text}"' }],
	['AndroidDevice.tap', { title: 'Tap' }],
	['AndroidDevice.drag', { title: 'Drag' }],
	['AndroidDevice.fling', { title: 'Fling' }],
	['AndroidDevice.longTap', { title: 'Long tap' }],
	['AndroidDevice.pinchClose', { title: 'Pinch close' }],
	['AndroidDevice.pinchOpen', { title: 'Pinch open' }],
	['AndroidDevice.scroll', { title: 'Scroll' }],
	['AndroidDevice.swipe', { title: 'Swipe' }],
	['AndroidDevice.info', { internal: !0 }],
	['AndroidDevice.screenshot', { title: 'Screenshot' }],
	['AndroidDevice.inputType', { title: 'Type' }],
	['AndroidDevice.inputPress', { title: 'Press' }],
	['AndroidDevice.inputTap', { title: 'Tap' }],
	['AndroidDevice.inputSwipe', { title: 'Swipe' }],
	['AndroidDevice.inputDrag', { title: 'Drag' }],
	['AndroidDevice.launchBrowser', { title: 'Launch browser' }],
	['AndroidDevice.open', { title: 'Open app' }],
	['AndroidDevice.shell', { internal: !0 }],
	['AndroidDevice.installApk', { title: 'Install apk' }],
	['AndroidDevice.push', { title: 'Push' }],
	['AndroidDevice.connectToWebView', { internal: !0 }],
	['AndroidDevice.close', { internal: !0 }],
	['JsonPipe.send', { internal: !0 }],
	['JsonPipe.close', { internal: !0 }],
]);
function _1(t, e) {
	if (!t) return '';
	if (e === 'url')
		try {
			const n = new URL(t[e]);
			return n.protocol === 'data:'
				? n.protocol
				: n.protocol === 'about:'
					? t[e]
					: n.pathname + n.search;
		} catch {
			return t[e];
		}
	return e === 'timeNumber' ? new Date(t[e]).toString() : E1(t, e);
}
function E1(t, e) {
	const n = e.split('.');
	let s = t;
	for (const o of n) {
		if (typeof s != 'object' || s === null) return '';
		s = s[o];
	}
	return s === void 0 ? '' : String(s);
}
const k1 = v1,
	b1 = ({
		actions: t,
		selectedAction: e,
		selectedTime: n,
		setSelectedTime: s,
		sdkLanguage: o,
		onSelected: l,
		onHighlighted: c,
		revealConsole: u,
		revealAttachment: d,
		isLive: p,
	}) => {
		const [g, y] = R.useState({ expandedItems: new Map() }),
			{ rootItem: v, itemMap: S } = R.useMemo(() => $0(t), [t]),
			{ selectedItem: k } = R.useMemo(
				() => ({ selectedItem: e ? S.get(e.callId) : void 0 }),
				[S, e],
			),
			_ = R.useCallback((F) => {
				var z, q;
				return !!((q = (z = F.action) == null ? void 0 : z.error) != null && q.message);
			}, []),
			E = R.useCallback((F) => s({ minimum: F.action.startTime, maximum: F.action.endTime }), [s]),
			C = R.useCallback(
				(F) =>
					Xu(F.action, {
						sdkLanguage: o,
						revealConsole: u,
						revealAttachment: d,
						isLive: p,
						showDuration: !0,
						showBadges: !0,
					}),
				[p, u, d, o],
			),
			A = R.useCallback(
				(F) =>
					!n || !F.action || (F.action.startTime <= n.maximum && F.action.endTime >= n.minimum),
				[n],
			),
			O = R.useCallback(
				(F) => {
					l == null || l(F.action);
				},
				[l],
			),
			D = R.useCallback(
				(F) => {
					c == null || c(F == null ? void 0 : F.action);
				},
				[c],
			);
		return w.jsxs('div', {
			className: 'vbox',
			children: [
				n &&
					w.jsxs('div', {
						className: 'action-list-show-all',
						onClick: () => s(void 0),
						children: [w.jsx('span', { className: 'codicon codicon-triangle-left' }), 'Show all'],
					}),
				w.jsx(k1, {
					name: 'actions',
					rootItem: v,
					treeState: g,
					setTreeState: y,
					selectedItem: k,
					onSelected: O,
					onHighlighted: D,
					onAccepted: E,
					isError: _,
					isVisible: A,
					render: C,
				}),
			],
		});
	},
	Xu = (t, e) => {
		var E, C;
		const {
				sdkLanguage: n,
				revealConsole: s,
				revealAttachment: o,
				isLive: l,
				showDuration: c,
				showBadges: u,
			} = e,
			{ errors: d, warnings: p } = D0(t),
			g = !!((E = t.attachments) != null && E.length) && !!o,
			y = t.params.selector ? u1(n || 'javascript', t.params.selector) : void 0,
			v =
				t.class === 'Test' &&
				t.method === 'step' &&
				((C = t.annotations) == null ? void 0 : C.some((A) => A.type === 'skip'));
		let S = '';
		t.endTime ? (S = pt(t.endTime - t.startTime)) : t.error ? (S = 'Timed out') : l || (S = '-');
		const { elements: k, title: _ } = T1(t);
		return w.jsxs('div', {
			className: 'action-title vbox',
			children: [
				w.jsxs('div', {
					className: 'hbox',
					children: [
						w.jsx('span', { className: 'action-title-method', title: _, children: k }),
						(c || u || g || v) && w.jsx('div', { className: 'spacer' }),
						g &&
							w.jsx(qt, {
								icon: 'attach',
								title: 'Open Attachment',
								onClick: () => o(t.attachments[0]),
							}),
						c &&
							!v &&
							w.jsx('div', {
								className: 'action-duration',
								children: S || w.jsx('span', { className: 'codicon codicon-loading' }),
							}),
						v &&
							w.jsx('span', {
								className: ze('action-skipped', 'codicon', ug('skipped')),
								title: 'skipped',
							}),
						u &&
							w.jsxs('div', {
								className: 'action-icons',
								onClick: () => (s == null ? void 0 : s()),
								children: [
									!!d &&
										w.jsxs('div', {
											className: 'action-icon',
											children: [
												w.jsx('span', { className: 'codicon codicon-error' }),
												w.jsx('span', { className: 'action-icon-value', children: d }),
											],
										}),
									!!p &&
										w.jsxs('div', {
											className: 'action-icon',
											children: [
												w.jsx('span', { className: 'codicon codicon-warning' }),
												w.jsx('span', { className: 'action-icon-value', children: p }),
											],
										}),
								],
							}),
					],
				}),
				y && w.jsx('div', { className: 'action-title-selector', title: y, children: y }),
			],
		});
	};
function T1(t) {
	var u;
	const e =
			t.title ?? ((u = x1.get(t.class + '.' + t.method)) == null ? void 0 : u.title) ?? t.method,
		n = [],
		s = [];
	let o = 0;
	const l = /\{([^}]+)\}/g;
	let c;
	for (; (c = l.exec(e)) !== null; ) {
		const [d, p] = c,
			g = e.slice(o, c.index);
		n.push(g), s.push(g);
		const y = _1(t.params, p);
		n.push(w.jsx('span', { className: 'action-title-param', children: y })),
			s.push(y),
			(o = c.index + d.length);
	}
	if (o < e.length) {
		const d = e.slice(o);
		n.push(d), s.push(d);
	}
	return { elements: n, title: s.join('') };
}
const Yu = ({ value: t, description: e }) => {
		const [n, s] = R.useState('copy'),
			o = R.useCallback(() => {
				(typeof t == 'function' ? t() : Promise.resolve(t)).then(
					(c) => {
						navigator.clipboard.writeText(c).then(
							() => {
								s('check'),
									setTimeout(() => {
										s('copy');
									}, 3e3);
							},
							() => {
								s('close');
							},
						);
					},
					() => {
						s('close');
					},
				);
			}, [t]);
		return w.jsx(qt, { title: e || 'Copy', icon: n, onClick: o });
	},
	kl = ({ value: t, description: e, copiedDescription: n = e, style: s }) => {
		const [o, l] = R.useState(!1),
			c = R.useCallback(async () => {
				const u = typeof t == 'function' ? await t() : t;
				await navigator.clipboard.writeText(u), l(!0), setTimeout(() => l(!1), 3e3);
			}, [t]);
		return w.jsx(qt, {
			style: s,
			title: e,
			onClick: c,
			className: 'copy-to-clipboard-text-button',
			children: o ? n : e,
		});
	},
	Ar = ({ text: t }) =>
		w.jsx('div', {
			className: 'fill',
			style: {
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				fontSize: 24,
				fontWeight: 'bold',
				opacity: 0.5,
			},
			children: t,
		}),
	C1 = ({ action: t, startTimeOffset: e, sdkLanguage: n }) => {
		const s = R.useMemo(
			() => Object.keys((t == null ? void 0 : t.params) ?? {}).filter((c) => c !== 'info'),
			[t],
		);
		if (!t) return w.jsx(Ar, { text: 'No action selected' });
		const o = t.startTime - e,
			l = pt(o);
		return w.jsxs('div', {
			className: 'call-tab',
			children: [
				w.jsx('div', { className: 'call-line', children: t.title }),
				w.jsx('div', { className: 'call-section', children: 'Time' }),
				w.jsx(qp, { name: 'start:', value: l }),
				w.jsx(qp, { name: 'duration:', value: N1(t) }),
				!!s.length &&
					w.jsxs(w.Fragment, {
						children: [
							w.jsx('div', { className: 'call-section', children: 'Parameters' }),
							s.map((c) => Vp(Wp(t, c, t.params[c], n))),
						],
					}),
				!!t.result &&
					w.jsxs(w.Fragment, {
						children: [
							w.jsx('div', { className: 'call-section', children: 'Return value' }),
							Object.keys(t.result).map((c) => Vp(Wp(t, c, t.result[c], n))),
						],
					}),
			],
		});
	},
	qp = ({ name: t, value: e }) =>
		w.jsxs('div', {
			className: 'call-line',
			children: [t, w.jsx('span', { className: 'call-value datetime', title: e, children: e })],
		});
function N1(t) {
	return t.endTime ? pt(t.endTime - t.startTime) : t.error ? 'Timed Out' : 'Running';
}
function Vp(t) {
	let e = t.text.replace(/\n/g, '↵');
	return (
		t.type === 'string' && (e = `"${e}"`),
		w.jsxs(
			'div',
			{
				className: 'call-line',
				children: [
					t.name,
					':',
					w.jsx('span', { className: ze('call-value', t.type), title: t.text, children: e }),
					['string', 'number', 'object', 'locator'].includes(t.type) &&
						w.jsx(Yu, { value: t.text }),
				],
			},
			t.name,
		)
	);
}
function Wp(t, e, n, s) {
	const o = t.method.includes('eval') || t.method === 'waitForFunction';
	if (e === 'files') return { text: '<files>', type: 'string', name: e };
	if (
		((e === 'eventInit' || e === 'expectedValue' || (e === 'arg' && o)) &&
			(n = Dl(n.value, new Array(10).fill({ handle: '<handle>' }))),
		((e === 'value' && o) || (e === 'received' && t.method === 'expect')) &&
			(n = Dl(n, new Array(10).fill({ handle: '<handle>' }))),
		e === 'selector')
	)
		return { text: er(s || 'javascript', t.params.selector), type: 'locator', name: 'locator' };
	const l = typeof n;
	return l !== 'object' || n === null
		? { text: String(n), type: l, name: e }
		: n.guid
			? { text: '<handle>', type: 'handle', name: e }
			: { text: JSON.stringify(n).slice(0, 1e3), type: 'object', name: e };
}
function Dl(t, e) {
	if (t.n !== void 0) return t.n;
	if (t.s !== void 0) return t.s;
	if (t.b !== void 0) return t.b;
	if (t.v !== void 0) {
		if (t.v === 'undefined') return;
		if (t.v === 'null') return null;
		if (t.v === 'NaN') return NaN;
		if (t.v === 'Infinity') return 1 / 0;
		if (t.v === '-Infinity') return -1 / 0;
		if (t.v === '-0') return -0;
	}
	if (t.d !== void 0) return new Date(t.d);
	if (t.r !== void 0) return new RegExp(t.r.p, t.r.f);
	if (t.a !== void 0) return t.a.map((n) => Dl(n, e));
	if (t.o !== void 0) {
		const n = {};
		for (const { k: s, v: o } of t.o) n[s] = Dl(o, e);
		return n;
	}
	return t.h !== void 0 ? (e === void 0 ? '<object>' : e[t.h]) : '<object>';
}
const Kp = new Map();
function Ql({
	name: t,
	items: e = [],
	id: n,
	render: s,
	icon: o,
	isError: l,
	isWarning: c,
	isInfo: u,
	selectedItem: d,
	onAccepted: p,
	onSelected: g,
	onHighlighted: y,
	onIconClicked: v,
	noItemsMessage: S,
	dataTestId: k,
	notSelectable: _,
}) {
	const E = R.useRef(null),
		[C, A] = R.useState();
	return (
		R.useEffect(() => {
			y == null || y(C);
		}, [y, C]),
		R.useEffect(() => {
			const O = E.current;
			if (!O) return;
			const D = () => {
				Kp.set(t, O.scrollTop);
			};
			return (
				O.addEventListener('scroll', D, { passive: !0 }), () => O.removeEventListener('scroll', D)
			);
		}, [t]),
		R.useEffect(() => {
			E.current && (E.current.scrollTop = Kp.get(t) || 0);
		}, [t]),
		w.jsx('div', {
			className: ze('list-view vbox', t + '-list-view'),
			role: e.length > 0 ? 'list' : void 0,
			'data-testid': k || t + '-list',
			children: w.jsxs('div', {
				className: ze('list-view-content', _ && 'not-selectable'),
				tabIndex: 0,
				onKeyDown: (O) => {
					var q;
					if (d && O.key === 'Enter') {
						p == null || p(d, e.indexOf(d));
						return;
					}
					if (O.key !== 'ArrowDown' && O.key !== 'ArrowUp') return;
					O.stopPropagation(), O.preventDefault();
					const D = d ? e.indexOf(d) : -1;
					let F = D;
					O.key === 'ArrowDown' && (D === -1 ? (F = 0) : (F = Math.min(D + 1, e.length - 1))),
						O.key === 'ArrowUp' && (D === -1 ? (F = e.length - 1) : (F = Math.max(D - 1, 0)));
					const z = (q = E.current) == null ? void 0 : q.children.item(F);
					$m(z || void 0), y == null || y(void 0), g == null || g(e[F], F), A(void 0);
				},
				ref: E,
				children: [
					S && e.length === 0 && w.jsx('div', { className: 'list-view-empty', children: S }),
					e.map((O, D) => {
						const F = s(O, D);
						return w.jsxs(
							'div',
							{
								onDoubleClick: () => (p == null ? void 0 : p(O, D)),
								role: 'listitem',
								className: ze(
									'list-view-entry',
									d === O && 'selected',
									!_ && C === O && 'highlighted',
									(l == null ? void 0 : l(O, D)) && 'error',
									(c == null ? void 0 : c(O, D)) && 'warning',
									(u == null ? void 0 : u(O, D)) && 'info',
								),
								onClick: () => (g == null ? void 0 : g(O, D)),
								onMouseEnter: () => A(O),
								onMouseLeave: () => A(void 0),
								children: [
									o &&
										w.jsx('div', {
											className: 'codicon ' + (o(O, D) || 'codicon-blank'),
											style: { minWidth: 16, marginRight: 4 },
											onDoubleClick: (z) => {
												z.preventDefault(), z.stopPropagation();
											},
											onClick: (z) => {
												z.stopPropagation(), z.preventDefault(), v == null || v(O, D);
											},
										}),
									typeof F == 'string'
										? w.jsx('div', {
												style: { textOverflow: 'ellipsis', overflow: 'hidden' },
												children: F,
											})
										: F,
								],
							},
							(n == null ? void 0 : n(O, D)) || D,
						);
					}),
				],
			}),
		})
	);
}
const A1 = Ql,
	I1 = ({ action: t, isLive: e }) => {
		const n = R.useMemo(() => {
			var c;
			if (!t || !t.log.length) return [];
			const s = t.log,
				o = t.context.wallTime - t.context.startTime,
				l = [];
			for (let u = 0; u < s.length; ++u) {
				let d = '';
				if (s[u].time !== -1) {
					const p = (c = s[u]) == null ? void 0 : c.time;
					u + 1 < s.length
						? (d = pt(s[u + 1].time - p))
						: t.endTime > 0
							? (d = pt(t.endTime - p))
							: e
								? (d = pt(Date.now() - o - p))
								: (d = '-');
				}
				l.push({ message: s[u].message, time: d });
			}
			return l;
		}, [t, e]);
		return n.length
			? w.jsx(A1, {
					name: 'log',
					items: n,
					render: (s) =>
						w.jsxs('div', {
							className: 'log-list-item',
							children: [
								w.jsx('span', { className: 'log-list-duration', children: s.time }),
								s.message,
							],
						}),
					notSelectable: !0,
				})
			: w.jsx(Ar, { text: 'No log entries' });
	};
function Fi(t, e) {
	const n = /(\x1b\[(\d+(;\d+)*)m)|([^\x1b]+)/g,
		s = [];
	let o,
		l = {},
		c = !1,
		u = e == null ? void 0 : e.fg,
		d = e == null ? void 0 : e.bg;
	for (; (o = n.exec(t)) !== null; ) {
		const [, , p, , g] = o;
		if (p) {
			const y = +p;
			switch (y) {
				case 0:
					l = {};
					break;
				case 1:
					l['font-weight'] = 'bold';
					break;
				case 2:
					l.opacity = '0.8';
					break;
				case 3:
					l['font-style'] = 'italic';
					break;
				case 4:
					l['text-decoration'] = 'underline';
					break;
				case 7:
					c = !0;
					break;
				case 8:
					l.display = 'none';
					break;
				case 9:
					l['text-decoration'] = 'line-through';
					break;
				case 22:
					delete l['font-weight'],
						delete l['font-style'],
						delete l.opacity,
						delete l['text-decoration'];
					break;
				case 23:
					delete l['font-weight'], delete l['font-style'], delete l.opacity;
					break;
				case 24:
					delete l['text-decoration'];
					break;
				case 27:
					c = !1;
					break;
				case 30:
				case 31:
				case 32:
				case 33:
				case 34:
				case 35:
				case 36:
				case 37:
					u = Gp[y - 30];
					break;
				case 39:
					u = e == null ? void 0 : e.fg;
					break;
				case 40:
				case 41:
				case 42:
				case 43:
				case 44:
				case 45:
				case 46:
				case 47:
					d = Gp[y - 40];
					break;
				case 49:
					d = e == null ? void 0 : e.bg;
					break;
				case 53:
					l['text-decoration'] = 'overline';
					break;
				case 90:
				case 91:
				case 92:
				case 93:
				case 94:
				case 95:
				case 96:
				case 97:
					u = Qp[y - 90];
					break;
				case 100:
				case 101:
				case 102:
				case 103:
				case 104:
				case 105:
				case 106:
				case 107:
					d = Qp[y - 100];
					break;
			}
		} else if (g) {
			const y = { ...l },
				v = c ? d : u;
			v !== void 0 && (y.color = v);
			const S = c ? u : d;
			S !== void 0 && (y['background-color'] = S), s.push(`<span style="${M1(y)}">${L1(g)}</span>`);
		}
	}
	return s.join('');
}
const Gp = {
		0: 'var(--vscode-terminal-ansiBlack)',
		1: 'var(--vscode-terminal-ansiRed)',
		2: 'var(--vscode-terminal-ansiGreen)',
		3: 'var(--vscode-terminal-ansiYellow)',
		4: 'var(--vscode-terminal-ansiBlue)',
		5: 'var(--vscode-terminal-ansiMagenta)',
		6: 'var(--vscode-terminal-ansiCyan)',
		7: 'var(--vscode-terminal-ansiWhite)',
	},
	Qp = {
		0: 'var(--vscode-terminal-ansiBrightBlack)',
		1: 'var(--vscode-terminal-ansiBrightRed)',
		2: 'var(--vscode-terminal-ansiBrightGreen)',
		3: 'var(--vscode-terminal-ansiBrightYellow)',
		4: 'var(--vscode-terminal-ansiBrightBlue)',
		5: 'var(--vscode-terminal-ansiBrightMagenta)',
		6: 'var(--vscode-terminal-ansiBrightCyan)',
		7: 'var(--vscode-terminal-ansiBrightWhite)',
	};
function L1(t) {
	return t.replace(
		/[&"<>]/g,
		(e) => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[e],
	);
}
function M1(t) {
	return Object.entries(t)
		.map(([e, n]) => `${e}: ${n}`)
		.join('; ');
}
const j1 = ({ error: t }) => {
		const e = R.useMemo(() => Fi(t), [t]);
		return w.jsx('div', {
			className: 'error-message',
			dangerouslySetInnerHTML: { __html: e || '' },
		});
	},
	fg = ({ cursor: t, onPaneMouseMove: e, onPaneMouseUp: n, onPaneDoubleClick: s }) => (
		Mt.useEffect(() => {
			const o = document.createElement('div');
			return (
				(o.style.position = 'fixed'),
				(o.style.top = '0'),
				(o.style.right = '0'),
				(o.style.bottom = '0'),
				(o.style.left = '0'),
				(o.style.zIndex = '9999'),
				(o.style.cursor = t),
				document.body.appendChild(o),
				e && o.addEventListener('mousemove', e),
				n && o.addEventListener('mouseup', n),
				s && document.body.addEventListener('dblclick', s),
				() => {
					e && o.removeEventListener('mousemove', e),
						n && o.removeEventListener('mouseup', n),
						s && document.body.removeEventListener('dblclick', s),
						document.body.removeChild(o);
				}
			);
		}, [t, e, n, s]),
		w.jsx(w.Fragment, {})
	),
	P1 = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
	dg = ({
		orientation: t,
		offsets: e,
		setOffsets: n,
		resizerColor: s,
		resizerWidth: o,
		minColumnWidth: l,
	}) => {
		const c = l || 0,
			[u, d] = Mt.useState(null),
			[p, g] = Nr(),
			y = {
				position: 'absolute',
				right: t === 'horizontal' ? void 0 : 0,
				bottom: t === 'horizontal' ? 0 : void 0,
				width: t === 'horizontal' ? 7 : void 0,
				height: t === 'horizontal' ? void 0 : 7,
				borderTopWidth: t === 'horizontal' ? void 0 : (7 - o) / 2,
				borderRightWidth: t === 'horizontal' ? (7 - o) / 2 : void 0,
				borderBottomWidth: t === 'horizontal' ? void 0 : (7 - o) / 2,
				borderLeftWidth: t === 'horizontal' ? (7 - o) / 2 : void 0,
				borderColor: 'transparent',
				borderStyle: 'solid',
				cursor: t === 'horizontal' ? 'ew-resize' : 'ns-resize',
			};
		return w.jsxs('div', {
			style: {
				position: 'absolute',
				top: 0,
				right: 0,
				bottom: 0,
				left: -(7 - o) / 2,
				zIndex: 100,
				pointerEvents: 'none',
			},
			ref: g,
			children: [
				!!u &&
					w.jsx(fg, {
						cursor: t === 'horizontal' ? 'ew-resize' : 'ns-resize',
						onPaneMouseUp: () => d(null),
						onPaneMouseMove: (v) => {
							if (!v.buttons) d(null);
							else if (u) {
								const S = t === 'horizontal' ? v.clientX - u.clientX : v.clientY - u.clientY,
									k = u.offset + S,
									_ = u.index > 0 ? e[u.index - 1] : 0,
									E = t === 'horizontal' ? p.width : p.height,
									C = Math.min(Math.max(_ + c, k), E - c) - e[u.index];
								for (let A = u.index; A < e.length; ++A) e[A] = e[A] + C;
								n([...e]);
							}
						},
					}),
				e.map((v, S) =>
					w.jsx(
						'div',
						{
							style: {
								...y,
								top: t === 'horizontal' ? 0 : v,
								left: t === 'horizontal' ? v : 0,
								pointerEvents: 'initial',
							},
							onMouseDown: (k) =>
								d({ clientX: k.clientX, clientY: k.clientY, offset: v, index: S }),
							children: w.jsx('div', { style: { ...P1, background: s } }),
						},
						S,
					),
				),
			],
		});
	};
async function lu(t) {
	const e = new Image();
	return (
		t &&
			((e.src = t),
			await new Promise((n, s) => {
				(e.onload = n), (e.onerror = n);
			})),
		e
	);
}
const Lu = {
		backgroundImage: `linear-gradient(45deg, #80808020 25%, transparent 25%),
                    linear-gradient(-45deg, #80808020 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #80808020 75%),
                    linear-gradient(-45deg, transparent 75%, #80808020 75%)`,
		backgroundSize: '20px 20px',
		backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
		boxShadow: `rgb(0 0 0 / 10%) 0px 1.8px 1.9px,
              rgb(0 0 0 / 15%) 0px 6.1px 6.3px,
              rgb(0 0 0 / 10%) 0px -2px 4px,
              rgb(0 0 0 / 15%) 0px -6.1px 12px,
              rgb(0 0 0 / 25%) 0px 6px 12px`,
	},
	O1 = ({ diff: t, noTargetBlank: e, hideDetails: n }) => {
		const [s, o] = R.useState(t.diff ? 'diff' : 'actual'),
			[l, c] = R.useState(!1),
			[u, d] = R.useState(null),
			[p, g] = R.useState('Expected'),
			[y, v] = R.useState(null),
			[S, k] = R.useState(null),
			[_, E] = Nr();
		R.useEffect(() => {
			(async () => {
				var M, G, K, $;
				d(await lu((M = t.expected) == null ? void 0 : M.attachment.path)),
					g(((G = t.expected) == null ? void 0 : G.title) || 'Expected'),
					v(await lu((K = t.actual) == null ? void 0 : K.attachment.path)),
					k(await lu(($ = t.diff) == null ? void 0 : $.attachment.path));
			})();
		}, [t]);
		const C = u && y && S,
			A = C ? Math.max(u.naturalWidth, y.naturalWidth, 200) : 500,
			O = C ? Math.max(u.naturalHeight, y.naturalHeight, 200) : 500,
			D = Math.min(1, (_.width - 30) / A),
			F = Math.min(1, (_.width - 50) / A / 2),
			z = A * D,
			q = O * D,
			B = { flex: 'none', margin: '0 10px', cursor: 'pointer', userSelect: 'none' };
		return w.jsx('div', {
			'data-testid': 'test-result-image-mismatch',
			style: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'auto' },
			ref: E,
			children:
				C &&
				w.jsxs(w.Fragment, {
					children: [
						w.jsxs('div', {
							'data-testid': 'test-result-image-mismatch-tabs',
							style: { display: 'flex', margin: '10px 0 20px' },
							children: [
								t.diff &&
									w.jsx('div', {
										style: { ...B, fontWeight: s === 'diff' ? 600 : 'initial' },
										onClick: () => o('diff'),
										children: 'Diff',
									}),
								w.jsx('div', {
									style: { ...B, fontWeight: s === 'actual' ? 600 : 'initial' },
									onClick: () => o('actual'),
									children: 'Actual',
								}),
								w.jsx('div', {
									style: { ...B, fontWeight: s === 'expected' ? 600 : 'initial' },
									onClick: () => o('expected'),
									children: p,
								}),
								w.jsx('div', {
									style: { ...B, fontWeight: s === 'sxs' ? 600 : 'initial' },
									onClick: () => o('sxs'),
									children: 'Side by side',
								}),
								w.jsx('div', {
									style: { ...B, fontWeight: s === 'slider' ? 600 : 'initial' },
									onClick: () => o('slider'),
									children: 'Slider',
								}),
							],
						}),
						w.jsxs('div', {
							style: { display: 'flex', justifyContent: 'center', flex: 'auto', minHeight: q + 60 },
							children: [
								t.diff &&
									s === 'diff' &&
									w.jsx(En, {
										image: S,
										alt: 'Diff',
										hideSize: n,
										canvasWidth: z,
										canvasHeight: q,
										scale: D,
									}),
								t.diff &&
									s === 'actual' &&
									w.jsx(En, {
										image: y,
										alt: 'Actual',
										hideSize: n,
										canvasWidth: z,
										canvasHeight: q,
										scale: D,
									}),
								t.diff &&
									s === 'expected' &&
									w.jsx(En, {
										image: u,
										alt: p,
										hideSize: n,
										canvasWidth: z,
										canvasHeight: q,
										scale: D,
									}),
								t.diff &&
									s === 'slider' &&
									w.jsx($1, {
										expectedImage: u,
										actualImage: y,
										hideSize: n,
										canvasWidth: z,
										canvasHeight: q,
										scale: D,
										expectedTitle: p,
									}),
								t.diff &&
									s === 'sxs' &&
									w.jsxs('div', {
										style: { display: 'flex' },
										children: [
											w.jsx(En, {
												image: u,
												title: p,
												hideSize: n,
												canvasWidth: F * A,
												canvasHeight: F * O,
												scale: F,
											}),
											w.jsx(En, {
												image: l ? S : y,
												title: l ? 'Diff' : 'Actual',
												onClick: () => c(!l),
												hideSize: n,
												canvasWidth: F * A,
												canvasHeight: F * O,
												scale: F,
											}),
										],
									}),
								!t.diff &&
									s === 'actual' &&
									w.jsx(En, {
										image: y,
										title: 'Actual',
										hideSize: n,
										canvasWidth: z,
										canvasHeight: q,
										scale: D,
									}),
								!t.diff &&
									s === 'expected' &&
									w.jsx(En, {
										image: u,
										title: p,
										hideSize: n,
										canvasWidth: z,
										canvasHeight: q,
										scale: D,
									}),
								!t.diff &&
									s === 'sxs' &&
									w.jsxs('div', {
										style: { display: 'flex' },
										children: [
											w.jsx(En, {
												image: u,
												title: p,
												canvasWidth: F * A,
												canvasHeight: F * O,
												scale: F,
											}),
											w.jsx(En, {
												image: y,
												title: 'Actual',
												canvasWidth: F * A,
												canvasHeight: F * O,
												scale: F,
											}),
										],
									}),
							],
						}),
						!n &&
							w.jsxs('div', {
								style: { alignSelf: 'start', lineHeight: '18px', marginLeft: '15px' },
								children: [
									w.jsx('div', {
										children:
											t.diff &&
											w.jsx('a', {
												target: '_blank',
												href: t.diff.attachment.path,
												rel: 'noreferrer',
												children: t.diff.attachment.name,
											}),
									}),
									w.jsx('div', {
										children: w.jsx('a', {
											target: e ? '' : '_blank',
											href: t.actual.attachment.path,
											rel: 'noreferrer',
											children: t.actual.attachment.name,
										}),
									}),
									w.jsx('div', {
										children: w.jsx('a', {
											target: e ? '' : '_blank',
											href: t.expected.attachment.path,
											rel: 'noreferrer',
											children: t.expected.attachment.name,
										}),
									}),
								],
							}),
					],
				}),
		});
	},
	$1 = ({
		expectedImage: t,
		actualImage: e,
		canvasWidth: n,
		canvasHeight: s,
		scale: o,
		expectedTitle: l,
		hideSize: c,
	}) => {
		const u = { position: 'absolute', top: 0, left: 0 },
			[d, p] = R.useState(n / 2),
			g = t.naturalWidth === e.naturalWidth && t.naturalHeight === e.naturalHeight;
		return w.jsxs('div', {
			style: {
				flex: 'none',
				display: 'flex',
				alignItems: 'center',
				flexDirection: 'column',
				userSelect: 'none',
			},
			children: [
				!c &&
					w.jsxs('div', {
						style: { margin: 5 },
						children: [
							!g &&
								w.jsx('span', { style: { flex: 'none', margin: '0 5px' }, children: 'Expected ' }),
							w.jsx('span', { children: t.naturalWidth }),
							w.jsx('span', { style: { flex: 'none', margin: '0 5px' }, children: 'x' }),
							w.jsx('span', { children: t.naturalHeight }),
							!g &&
								w.jsx('span', {
									style: { flex: 'none', margin: '0 5px 0 15px' },
									children: 'Actual ',
								}),
							!g && w.jsx('span', { children: e.naturalWidth }),
							!g && w.jsx('span', { style: { flex: 'none', margin: '0 5px' }, children: 'x' }),
							!g && w.jsx('span', { children: e.naturalHeight }),
						],
					}),
				w.jsxs('div', {
					style: { position: 'relative', width: n, height: s, margin: 15, ...Lu },
					children: [
						w.jsx(dg, {
							orientation: 'horizontal',
							offsets: [d],
							setOffsets: (y) => p(y[0]),
							resizerColor: '#57606a80',
							resizerWidth: 6,
						}),
						w.jsx('img', {
							alt: l,
							style: { width: t.naturalWidth * o, height: t.naturalHeight * o },
							draggable: 'false',
							src: t.src,
						}),
						w.jsx('div', {
							style: { ...u, bottom: 0, overflow: 'hidden', width: d, ...Lu },
							children: w.jsx('img', {
								alt: 'Actual',
								style: { width: e.naturalWidth * o, height: e.naturalHeight * o },
								draggable: 'false',
								src: e.src,
							}),
						}),
					],
				}),
			],
		});
	},
	En = ({
		image: t,
		title: e,
		alt: n,
		hideSize: s,
		canvasWidth: o,
		canvasHeight: l,
		scale: c,
		onClick: u,
	}) =>
		w.jsxs('div', {
			style: { flex: 'none', display: 'flex', alignItems: 'center', flexDirection: 'column' },
			children: [
				!s &&
					w.jsxs('div', {
						style: { margin: 5 },
						children: [
							e && w.jsx('span', { style: { flex: 'none', margin: '0 5px' }, children: e }),
							w.jsx('span', { children: t.naturalWidth }),
							w.jsx('span', { style: { flex: 'none', margin: '0 5px' }, children: 'x' }),
							w.jsx('span', { children: t.naturalHeight }),
						],
					}),
				w.jsx('div', {
					style: { display: 'flex', flex: 'none', width: o, height: l, margin: 15, ...Lu },
					children: w.jsx('img', {
						width: t.naturalWidth * c,
						height: t.naturalHeight * c,
						alt: e || n,
						style: { cursor: u ? 'pointer' : 'initial' },
						draggable: 'false',
						src: t.src,
						onClick: u,
					}),
				}),
			],
		}),
	R1 = 'modulepreload',
	D1 = function (t, e) {
		return new URL(t, e).href;
	},
	Jp = {},
	F1 = function (e, n, s) {
		let o = Promise.resolve();
		if (n && n.length > 0) {
			let c = function (g) {
				return Promise.all(
					g.map((y) =>
						Promise.resolve(y).then(
							(v) => ({ status: 'fulfilled', value: v }),
							(v) => ({ status: 'rejected', reason: v }),
						),
					),
				);
			};
			const u = document.getElementsByTagName('link'),
				d = document.querySelector('meta[property=csp-nonce]'),
				p = (d == null ? void 0 : d.nonce) || (d == null ? void 0 : d.getAttribute('nonce'));
			o = c(
				n.map((g) => {
					if (((g = D1(g, s)), g in Jp)) return;
					Jp[g] = !0;
					const y = g.endsWith('.css'),
						v = y ? '[rel="stylesheet"]' : '';
					if (!!s)
						for (let _ = u.length - 1; _ >= 0; _--) {
							const E = u[_];
							if (E.href === g && (!y || E.rel === 'stylesheet')) return;
						}
					else if (document.querySelector(`link[href="${g}"]${v}`)) return;
					const k = document.createElement('link');
					if (
						((k.rel = y ? 'stylesheet' : R1),
						y || (k.as = 'script'),
						(k.crossOrigin = ''),
						(k.href = g),
						p && k.setAttribute('nonce', p),
						document.head.appendChild(k),
						y)
					)
						return new Promise((_, E) => {
							k.addEventListener('load', _),
								k.addEventListener('error', () => E(new Error(`Unable to preload CSS for ${g}`)));
						});
				}),
			);
		}
		function l(c) {
			const u = new Event('vite:preloadError', { cancelable: !0 });
			if (((u.payload = c), window.dispatchEvent(u), !u.defaultPrevented)) throw c;
		}
		return o.then((c) => {
			for (const u of c || []) u.status === 'rejected' && l(u.reason);
			return e().catch(l);
		});
	},
	B1 = 20,
	ks = ({
		text: t,
		language: e,
		mimeType: n,
		linkify: s,
		readOnly: o,
		highlight: l,
		revealLine: c,
		lineNumbers: u,
		isFocused: d,
		focusOnChange: p,
		wrapLines: g,
		onChange: y,
		dataTestId: v,
		placeholder: S,
	}) => {
		const [k, _] = Nr(),
			[E] = R.useState(
				F1(
					() => import('./codeMirrorModule-BKr-mZ2D.js'),
					__vite__mapDeps([0, 1]),
					import.meta.url,
				).then((D) => D.default),
			),
			C = R.useRef(null),
			[A, O] = R.useState();
		return (
			R.useEffect(() => {
				(async () => {
					var B, M;
					const D = await E;
					H1(D);
					const F = _.current;
					if (!F) return;
					const z = q1(e) || U1(n) || (s ? 'text/linkified' : '');
					if (
						C.current &&
						z === C.current.cm.getOption('mode') &&
						!!o === C.current.cm.getOption('readOnly') &&
						u === C.current.cm.getOption('lineNumbers') &&
						g === C.current.cm.getOption('lineWrapping') &&
						S === C.current.cm.getOption('placeholder')
					)
						return;
					(M = (B = C.current) == null ? void 0 : B.cm) == null || M.getWrapperElement().remove();
					const q = D(F, {
						value: '',
						mode: z,
						readOnly: !!o,
						lineNumbers: u,
						lineWrapping: g,
						placeholder: S,
					});
					return (C.current = { cm: q }), d && q.focus(), O(q), q;
				})();
			}, [E, A, _, e, n, s, u, g, o, d, S]),
			R.useEffect(() => {
				C.current && C.current.cm.setSize(k.width, k.height);
			}, [k]),
			R.useLayoutEffect(() => {
				var z;
				if (!A) return;
				let D = !1;
				if (
					(A.getValue() !== t &&
						(A.setValue(t), (D = !0), p && (A.execCommand('selectAll'), A.focus())),
					D || JSON.stringify(l) !== JSON.stringify(C.current.highlight))
				) {
					for (const M of C.current.highlight || []) A.removeLineClass(M.line - 1, 'wrap');
					for (const M of l || []) A.addLineClass(M.line - 1, 'wrap', `source-line-${M.type}`);
					for (const M of C.current.widgets || []) A.removeLineWidget(M);
					for (const M of C.current.markers || []) M.clear();
					const q = [],
						B = [];
					for (const M of l || []) {
						if (M.type !== 'subtle-error' && M.type !== 'error') continue;
						const G = (z = C.current) == null ? void 0 : z.cm.getLine(M.line - 1);
						if (G) {
							const K = {};
							(K.title = M.message || ''),
								B.push(
									A.markText(
										{ line: M.line - 1, ch: 0 },
										{ line: M.line - 1, ch: M.column || G.length },
										{ className: 'source-line-error-underline', attributes: K },
									),
								);
						}
						if (M.type === 'error') {
							const K = document.createElement('div');
							(K.innerHTML = Fi(M.message || '')),
								(K.className = 'source-line-error-widget'),
								q.push(A.addLineWidget(M.line, K, { above: !0, coverGutter: !1 }));
						}
					}
					(C.current.highlight = l), (C.current.widgets = q), (C.current.markers = B);
				}
				typeof c == 'number' &&
					C.current.cm.lineCount() >= c &&
					A.scrollIntoView({ line: Math.max(0, c - 1), ch: 0 }, 50);
				let F;
				return (
					y && ((F = () => y(A.getValue())), A.on('change', F)),
					() => {
						F && A.off('change', F);
					}
				);
			}, [A, t, l, c, p, y]),
			w.jsx('div', { 'data-testid': v, className: 'cm-wrapper', ref: _, onClick: z1 })
		);
	};
function z1(t) {
	var n;
	if (!(t.target instanceof HTMLElement)) return;
	let e;
	t.target.classList.contains('cm-linkified')
		? (e = t.target.textContent)
		: t.target.classList.contains('cm-link') &&
			(n = t.target.nextElementSibling) != null &&
			n.classList.contains('cm-url') &&
			(e = t.target.nextElementSibling.textContent.slice(1, -1)),
		e && (t.preventDefault(), t.stopPropagation(), window.open(e, '_blank'));
}
let Xp = !1;
function H1(t) {
	Xp ||
		((Xp = !0),
		t.defineSimpleMode('text/linkified', { start: [{ regex: Rm, token: 'linkified' }] }));
}
function U1(t) {
	if (t) {
		if (t.includes('javascript') || t.includes('json')) return 'javascript';
		if (t.includes('python')) return 'python';
		if (t.includes('csharp')) return 'text/x-csharp';
		if (t.includes('java')) return 'text/x-java';
		if (t.includes('markdown')) return 'markdown';
		if (t.includes('html') || t.includes('svg')) return 'htmlmixed';
		if (t.includes('css')) return 'css';
	}
}
function q1(t) {
	if (t)
		return {
			javascript: 'javascript',
			jsonl: 'javascript',
			python: 'python',
			csharp: 'text/x-csharp',
			java: 'text/x-java',
			markdown: 'markdown',
			html: 'htmlmixed',
			css: 'css',
			yaml: 'yaml',
		}[t];
}
function V1(t) {
	return !!t.match(
		/^(text\/.*?|application\/(json|(x-)?javascript|xml.*?|ecmascript|graphql|x-www-form-urlencoded)|image\/svg(\+xml)?|application\/.*?(\+json|\+xml))(;\s*charset=.*)?$/,
	);
}
const W1 = ({ title: t, children: e, setExpanded: n, expanded: s, expandOnTitleClick: o }) => {
	const l = R.useId();
	return w.jsxs('div', {
		className: ze('expandable', s && 'expanded'),
		children: [
			w.jsxs('div', {
				role: 'button',
				'aria-expanded': s,
				'aria-controls': l,
				className: 'expandable-title',
				onClick: () => o && n(!s),
				children: [
					w.jsx('div', {
						className: ze('codicon', s ? 'codicon-chevron-down' : 'codicon-chevron-right'),
						style: { cursor: 'pointer', color: 'var(--vscode-foreground)', marginLeft: '5px' },
						onClick: () => !o && n(!s),
					}),
					t,
				],
			}),
			s && w.jsx('div', { id: l, role: 'region', style: { marginLeft: 25 }, children: e }),
		],
	});
};
function hg(t) {
	const e = [];
	let n = 0,
		s;
	for (; (s = Rm.exec(t)) !== null; ) {
		const l = t.substring(n, s.index);
		l && e.push(l);
		const c = s[0];
		e.push(K1(c)), (n = s.index + c.length);
	}
	const o = t.substring(n);
	return o && e.push(o), e;
}
function K1(t) {
	let e = t;
	return (
		e.startsWith('www.') && (e = 'https://' + e),
		w.jsx('a', { href: e, target: '_blank', rel: 'noopener noreferrer', children: t })
	);
}
const G1 = ({ attachment: t, reveal: e }) => {
		const [n, s] = R.useState(!1),
			[o, l] = R.useState(null),
			[c, u] = R.useState(null),
			[d, p] = _0(),
			g = R.useRef(null),
			y = V1(t.contentType),
			v = !!t.sha1 || !!t.path;
		R.useEffect(() => {
			var _;
			if (e) return (_ = g.current) == null || _.scrollIntoView({ behavior: 'smooth' }), p();
		}, [e, p]),
			R.useEffect(() => {
				n &&
					o === null &&
					c === null &&
					(u('Loading ...'),
					fetch(Jl(t))
						.then((_) => _.text())
						.then((_) => {
							l(_), u(null);
						})
						.catch((_) => {
							u('Failed to load: ' + _.message);
						}));
			}, [n, o, c, t]);
		const S = R.useMemo(() => {
				const _ = o
					? o.split(`
`).length
					: 0;
				return Math.min(Math.max(5, _), 20) * B1;
			}, [o]),
			k = w.jsxs('span', {
				style: { marginLeft: 5 },
				ref: g,
				'aria-label': t.name,
				children: [
					w.jsx('span', { children: hg(t.name) }),
					v && w.jsx('a', { style: { marginLeft: 5 }, href: bl(t), children: 'download' }),
				],
			});
		return !y || !v
			? w.jsx('div', { style: { marginLeft: 20 }, children: k })
			: w.jsxs('div', {
					className: ze(d && 'yellow-flash'),
					children: [
						w.jsx(W1, {
							title: k,
							expanded: n,
							setExpanded: s,
							expandOnTitleClick: !0,
							children: c && w.jsx('i', { children: c }),
						}),
						n &&
							o !== null &&
							w.jsx('div', {
								className: 'vbox',
								style: { height: S },
								children: w.jsx(ks, {
									text: o,
									readOnly: !0,
									mimeType: t.contentType,
									linkify: !0,
									lineNumbers: !0,
									wrapLines: !1,
								}),
							}),
					],
				});
	},
	Q1 = ({ model: t, revealedAttachment: e }) => {
		const {
			diffMap: n,
			screenshots: s,
			attachments: o,
		} = R.useMemo(() => {
			const l = new Set((t == null ? void 0 : t.visibleAttachments) ?? []),
				c = new Set(),
				u = new Map();
			for (const d of l) {
				if (!d.path && !d.sha1) continue;
				const p = d.name.match(/^(.*)-(expected|actual|diff)\.png$/);
				if (p) {
					const g = p[1],
						y = p[2],
						v = u.get(g) || { expected: void 0, actual: void 0, diff: void 0 };
					(v[y] = d), u.set(g, v), l.delete(d);
				} else d.contentType.startsWith('image/') && (c.add(d), l.delete(d));
			}
			return { diffMap: u, attachments: l, screenshots: c };
		}, [t]);
		return !n.size && !s.size && !o.size
			? w.jsx(Ar, { text: 'No attachments' })
			: w.jsxs('div', {
					className: 'attachments-tab',
					children: [
						[...n.values()].map(({ expected: l, actual: c, diff: u }) =>
							w.jsxs(w.Fragment, {
								children: [
									l &&
										c &&
										w.jsx('div', { className: 'attachments-section', children: 'Image diff' }),
									l &&
										c &&
										w.jsx(O1, {
											noTargetBlank: !0,
											diff: {
												name: 'Image diff',
												expected: { attachment: { ...l, path: bl(l) }, title: 'Expected' },
												actual: { attachment: { ...c, path: bl(c) } },
												diff: u ? { attachment: { ...u, path: bl(u) } } : void 0,
											},
										}),
								],
							}),
						),
						s.size
							? w.jsx('div', { className: 'attachments-section', children: 'Screenshots' })
							: void 0,
						[...s.values()].map((l, c) => {
							const u = Jl(l);
							return w.jsxs(
								'div',
								{
									className: 'attachment-item',
									children: [
										w.jsx('div', { children: w.jsx('img', { draggable: 'false', src: u }) }),
										w.jsx('div', {
											children: w.jsx('a', {
												target: '_blank',
												href: u,
												rel: 'noreferrer',
												children: l.name,
											}),
										}),
									],
								},
								`screenshot-${c}`,
							);
						}),
						o.size
							? w.jsx('div', { className: 'attachments-section', children: 'Attachments' })
							: void 0,
						[...o.values()].map((l, c) =>
							w.jsx(
								'div',
								{
									className: 'attachment-item',
									children: w.jsx(G1, { attachment: l, reveal: e && J1(l, e[0]) ? e : void 0 }),
								},
								X1(l, c),
							),
						),
					],
				});
	};
function J1(t, e) {
	return t.name === e.name && t.path === e.path && t.sha1 === e.sha1;
}
function Jl(t, e = {}) {
	const n = new URLSearchParams(e);
	return t.sha1
		? (n.set('trace', t.traceUrl), 'sha1/' + t.sha1 + '?' + n.toString())
		: (n.set('path', t.path), 'file?' + n.toString());
}
function bl(t) {
	const e = { dn: t.name };
	return t.contentType && (e.dct = t.contentType), Jl(t, e);
}
function X1(t, e) {
	return e + '-' + (t.sha1 ? 'sha1-' + t.sha1 : 'path-' + t.path);
}
const Y1 = `
# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.
`.trimStart();
async function Z1({ testInfo: t, metadata: e, errorContext: n, errors: s, buildCodeFrame: o }) {
	var p;
	const l = new Set(
		s
			.filter(
				(g) =>
					g.message &&
					!g.message.includes(`
`),
			)
			.map((g) => g.message),
	);
	for (const g of s)
		for (const y of l.keys()) (p = g.message) != null && p.includes(y) && l.delete(y);
	const c = s.filter(
		(g) =>
			!(
				!g.message ||
				(!g.message.includes(`
`) &&
					!l.has(g.message))
			),
	);
	if (!c.length) return;
	const u = [Y1, '# Test info', '', t, '', '# Error details'];
	for (const g of c) u.push('', '```', pg(g.message || ''), '```');
	n && u.push(n);
	const d = await o(c[c.length - 1]);
	return (
		d && u.push('', '# Test source', '', '```ts', d, '```'),
		e != null && e.gitDiff && u.push('', '# Local changes', '', '```diff', e.gitDiff, '```'),
		u.join(`
`)
	);
}
const eS = new RegExp(
	'([\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~])))',
	'g',
);
function pg(t) {
	return t.replace(eS, '');
}
const tS = Ql,
	nS = ({ stack: t, setSelectedFrame: e, selectedFrame: n }) => {
		const s = t || [];
		return w.jsx(tS, {
			name: 'stack-trace',
			items: s,
			selectedItem: s[n],
			render: (o) => {
				const l = o.file[1] === ':' ? '\\' : '/';
				return w.jsxs(w.Fragment, {
					children: [
						w.jsx('span', {
							className: 'stack-trace-frame-function',
							children: o.function || '(anonymous)',
						}),
						w.jsx('span', {
							className: 'stack-trace-frame-location',
							children: o.file.split(l).pop(),
						}),
						w.jsx('span', { className: 'stack-trace-frame-line', children: ':' + o.line }),
					],
				});
			},
			onSelected: (o) => e(s.indexOf(o)),
		});
	},
	Zu = ({
		noShadow: t,
		children: e,
		noMinHeight: n,
		className: s,
		sidebarBackground: o,
		onClick: l,
	}) =>
		w.jsx('div', {
			className: ze(
				'toolbar',
				t && 'no-shadow',
				n && 'no-min-height',
				s,
				o && 'toolbar-sidebar-background',
			),
			onClick: l,
			children: e,
		});
function rS(t, e, n, s, o) {
	return Ml(
		async () => {
			var v, S, k, _;
			const l = t == null ? void 0 : t[e],
				c = l != null && l.file ? l : o;
			if (!c)
				return { source: { file: '', errors: [], content: void 0 }, targetLine: 0, highlight: [] };
			const u = c.file;
			let d = n.get(u);
			d ||
				((d = {
					errors: ((v = o == null ? void 0 : o.source) == null ? void 0 : v.errors) || [],
					content: (S = o == null ? void 0 : o.source) == null ? void 0 : S.content,
				}),
				n.set(u, d));
			const p = (c == null ? void 0 : c.line) || ((k = d.errors[0]) == null ? void 0 : k.line) || 0,
				g = s && u.startsWith(s) ? u.substring(s.length + 1) : u,
				y = d.errors.map((E) => ({ type: 'error', line: E.line, message: E.message }));
			if (
				(y.push({ line: p, type: 'running' }),
				((_ = o == null ? void 0 : o.source) == null ? void 0 : _.content) !== void 0)
			)
				d.content = o.source.content;
			else if (d.content === void 0 || c === o) {
				const E = await mg(u);
				try {
					let C = await fetch(`sha1/src@${E}.txt`);
					C.status === 404 && (C = await fetch(`file?path=${encodeURIComponent(u)}`)),
						C.status >= 400
							? (d.content = `<Unable to read "${u}">`)
							: (d.content = await C.text());
				} catch {
					d.content = `<Unable to read "${u}">`;
				}
			}
			return { source: d, highlight: y, targetLine: p, fileName: g, location: c };
		},
		[t, e, s, o],
		{ source: { errors: [], content: 'Loading…' }, highlight: [] },
	);
}
const sS = ({
	stack: t,
	sources: e,
	rootDir: n,
	fallbackLocation: s,
	stackFrameLocation: o,
	onOpenExternally: l,
}) => {
	const [c, u] = R.useState(),
		[d, p] = R.useState(0);
	R.useEffect(() => {
		c !== t && (u(t), p(0));
	}, [t, c, u, p]);
	const { source: g, highlight: y, targetLine: v, fileName: S, location: k } = rS(t, d, e, n, s),
		_ = R.useCallback(() => {
			k && (l ? l(k) : (window.location.href = `vscode://file//${k.file}:${k.line}`));
		}, [l, k]),
		E = ((t == null ? void 0 : t.length) ?? 0) > 1,
		C = iS(S);
	return w.jsx(Pl, {
		sidebarSize: 200,
		orientation: o === 'bottom' ? 'vertical' : 'horizontal',
		sidebarHidden: !E,
		main: w.jsxs('div', {
			className: 'vbox',
			'data-testid': 'source-code',
			children: [
				S &&
					w.jsxs(Zu, {
						children: [
							w.jsx('div', {
								className: 'source-tab-file-name',
								title: S,
								children: w.jsx('div', { children: C }),
							}),
							w.jsx(Yu, { description: 'Copy filename', value: C }),
							k && w.jsx(qt, { icon: 'link-external', title: 'Open in VS Code', onClick: _ }),
						],
					}),
				w.jsx(ks, {
					text: g.content || '',
					language: 'javascript',
					highlight: y,
					revealLine: v,
					readOnly: !0,
					lineNumbers: !0,
					dataTestId: 'source-code-mirror',
				}),
			],
		}),
		sidebar: w.jsx(nS, { stack: t, selectedFrame: d, setSelectedFrame: p }),
	});
};
async function mg(t) {
	const e = new TextEncoder().encode(t),
		n = await crypto.subtle.digest('SHA-1', e),
		s = [],
		o = new DataView(n);
	for (let l = 0; l < o.byteLength; l += 1) {
		const c = o.getUint8(l).toString(16).padStart(2, '0');
		s.push(c);
	}
	return s.join('');
}
function iS(t) {
	if (!t) return '';
	const e = t != null && t.includes('/') ? '/' : '\\';
	return (t == null ? void 0 : t.split(e).pop()) ?? '';
}
const oS = ({ prompt: t }) =>
	w.jsx(kl, {
		value: t,
		description: 'Copy prompt',
		copiedDescription: w.jsxs(w.Fragment, {
			children: [
				'Copied ',
				w.jsx('span', { className: 'codicon codicon-copy', style: { marginLeft: '5px' } }),
			],
		}),
		style: { width: '120px', justifyContent: 'center' },
	});
function lS(t) {
	return R.useMemo(() => {
		if (!t) return { errors: new Map() };
		const e = new Map();
		for (const n of t.errorDescriptors) e.set(n.message, n);
		return { errors: e };
	}, [t]);
}
function aS({ message: t, error: e, sdkLanguage: n, revealInSource: s }) {
	var u;
	let o, l;
	const c = (u = e.stack) == null ? void 0 : u[0];
	return (
		c && ((o = c.file.replace(/.*[/\\](.*)/, '$1') + ':' + c.line), (l = c.file + ':' + c.line)),
		w.jsxs('div', {
			style: { display: 'flex', flexDirection: 'column', overflowX: 'clip' },
			children: [
				w.jsxs('div', {
					className: 'hbox',
					style: {
						alignItems: 'center',
						padding: '5px 10px',
						minHeight: 36,
						fontWeight: 'bold',
						color: 'var(--vscode-errorForeground)',
						flex: 0,
					},
					children: [
						e.action && Xu(e.action, { sdkLanguage: n }),
						o &&
							w.jsxs('div', {
								className: 'action-location',
								children: ['@ ', w.jsx('span', { title: l, onClick: () => s(e), children: o })],
							}),
					],
				}),
				w.jsx(j1, { error: t }),
			],
		})
	);
}
const cS = ({
	errorsModel: t,
	model: e,
	sdkLanguage: n,
	revealInSource: s,
	wallTime: o,
	testRunMetadata: l,
}) => {
	const c = Ml(
			async () => {
				const p = e == null ? void 0 : e.attachments.find((g) => g.name === 'error-context');
				if (p) return await fetch(Jl(p)).then((g) => g.text());
			},
			[e],
			void 0,
		),
		u = R.useCallback(async (p) => {
			var S;
			const g = (S = p.stack) == null ? void 0 : S[0];
			if (!g) return;
			let y = await fetch(`sha1/src@${await mg(g.file)}.txt`);
			if (
				(y.status === 404 && (y = await fetch(`file?path=${encodeURIComponent(g.file)}`)),
				y.status >= 400)
			)
				return;
			const v = await y.text();
			return uS({
				source: v,
				message:
					pg(p.message).split(`
`)[0] || void 0,
				location: g,
				linesAbove: 100,
				linesBelow: 100,
			});
		}, []),
		d = Ml(
			() =>
				Z1({
					testInfo: (e == null ? void 0 : e.title) ?? '',
					metadata: l,
					errorContext: c,
					errors: (e == null ? void 0 : e.errorDescriptors) ?? [],
					buildCodeFrame: u,
				}),
			[c, l, e, u],
			void 0,
		);
	return t.errors.size
		? w.jsxs('div', {
				className: 'fill',
				style: { overflow: 'auto' },
				children: [
					w.jsx('span', {
						style: { position: 'absolute', right: '5px', top: '5px', zIndex: 1 },
						children: d && w.jsx(oS, { prompt: d }),
					}),
					[...t.errors.entries()].map(([p, g]) => {
						const y = `error-${o}-${p}`;
						return w.jsx(aS, { message: p, error: g, revealInSource: s, sdkLanguage: n }, y);
					}),
				],
			})
		: w.jsx(Ar, { text: 'No errors' });
};
function uS({ source: t, message: e, location: n, linesAbove: s, linesBelow: o }) {
	const l = t
			.split(`
`)
			.slice(),
		c = Math.max(0, n.line - s - 1),
		u = Math.min(l.length, n.line + o),
		d = l.slice(c, u),
		p = String(u).length,
		g = d.map(
			(y, v) =>
				`${c + v + 1 === n.line ? '> ' : '  '}${(c + v + 1).toString().padEnd(p, ' ')} | ${y}`,
		);
	return (
		e && g.splice(n.line - c, 0, `${' '.repeat(p + 2)} | ${' '.repeat(n.column - 2)} ^ ${e}`),
		g.join(`
`)
	);
}
const fS = Ql;
function dS(t, e) {
	const { entries: n } = R.useMemo(() => {
		if (!t) return { entries: [] };
		const o = [];
		function l(u) {
			var g, y, v, S, k, _;
			const d = o[o.length - 1];
			d &&
			((g = u.browserMessage) == null ? void 0 : g.bodyString) ===
				((y = d.browserMessage) == null ? void 0 : y.bodyString) &&
			((v = u.browserMessage) == null ? void 0 : v.location) ===
				((S = d.browserMessage) == null ? void 0 : S.location) &&
			u.browserError === d.browserError &&
			((k = u.nodeMessage) == null ? void 0 : k.html) ===
				((_ = d.nodeMessage) == null ? void 0 : _.html) &&
			u.isError === d.isError &&
			u.isWarning === d.isWarning &&
			u.timestamp - d.timestamp < 1e3
				? d.repeat++
				: o.push({ ...u, repeat: 1 });
		}
		const c = [...t.events, ...t.stdio].sort((u, d) => {
			const p = 'time' in u ? u.time : u.timestamp,
				g = 'time' in d ? d.time : d.timestamp;
			return p - g;
		});
		for (const u of c) {
			if (u.type === 'console') {
				const d = u.args && u.args.length ? pS(u.args) : gg(u.text),
					p = u.location.url,
					y = `${p ? p.substring(p.lastIndexOf('/') + 1) : '<anonymous>'}:${u.location.lineNumber}`;
				l({
					browserMessage: { body: d, bodyString: u.text, location: y },
					isError: u.messageType === 'error',
					isWarning: u.messageType === 'warning',
					timestamp: u.time,
				});
			}
			if (
				(u.type === 'event' &&
					u.method === 'pageError' &&
					l({ browserError: u.params.error, isError: !0, isWarning: !1, timestamp: u.time }),
				u.type === 'stderr' || u.type === 'stdout')
			) {
				let d = '';
				u.text && (d = Fi(u.text.trim()) || ''),
					u.base64 && (d = Fi(atob(u.base64).trim()) || ''),
					l({
						nodeMessage: { html: d },
						isError: u.type === 'stderr',
						isWarning: !1,
						timestamp: u.timestamp,
					});
			}
		}
		return { entries: o };
	}, [t]);
	return {
		entries: R.useMemo(
			() => (e ? n.filter((o) => o.timestamp >= e.minimum && o.timestamp <= e.maximum) : n),
			[n, e],
		),
	};
}
const hS = ({ consoleModel: t, boundaries: e, onEntryHovered: n, onAccepted: s }) =>
	t.entries.length
		? w.jsx('div', {
				className: 'console-tab',
				children: w.jsx(fS, {
					name: 'console',
					onAccepted: s,
					onHighlighted: n,
					items: t.entries,
					isError: (o) => o.isError,
					isWarning: (o) => o.isWarning,
					render: (o) => {
						const l = pt(o.timestamp - e.minimum),
							c = w.jsx('span', { className: 'console-time', children: l }),
							u = o.isError ? 'status-error' : o.isWarning ? 'status-warning' : 'status-none',
							d =
								o.browserMessage || o.browserError
									? w.jsx('span', {
											className: ze('codicon', 'codicon-browser', u),
											title: 'Browser message',
										})
									: w.jsx('span', {
											className: ze('codicon', 'codicon-file', u),
											title: 'Runner message',
										});
						let p, g, y, v;
						const { browserMessage: S, browserError: k, nodeMessage: _ } = o;
						if ((S && ((p = S.location), (g = S.body)), k)) {
							const { error: E, value: C } = k;
							E ? ((g = E.message), (v = E.stack)) : (g = String(C));
						}
						return (
							_ && (y = _.html),
							w.jsxs('div', {
								className: 'console-line',
								children: [
									c,
									d,
									p && w.jsx('span', { className: 'console-location', children: p }),
									o.repeat > 1 &&
										w.jsx('span', { className: 'console-repeat', children: o.repeat }),
									g && w.jsx('span', { className: 'console-line-message', children: g }),
									y &&
										w.jsx('span', {
											className: 'console-line-message',
											dangerouslySetInnerHTML: { __html: y },
										}),
									v && w.jsx('div', { className: 'console-stack', children: v }),
								],
							})
						);
					},
				}),
			})
		: w.jsx(Ar, { text: 'No console entries' });
function pS(t) {
	if (t.length === 1) return gg(t[0].preview);
	const e = typeof t[0].value == 'string' && t[0].value.includes('%'),
		n = e ? t[0].value : '',
		s = e ? t.slice(1) : t;
	let o = 0;
	const l = /%([%sdifoOc])/g;
	let c;
	const u = [];
	let d = [];
	u.push(w.jsx('span', { children: d }, u.length + 1));
	let p = 0;
	for (; (c = l.exec(n)) !== null; ) {
		const g = n.substring(p, c.index);
		d.push(w.jsx('span', { children: g }, d.length + 1)), (p = c.index + 2);
		const y = c[0][1];
		if (y === '%') d.push(w.jsx('span', { children: '%' }, d.length + 1));
		else if (y === 's' || y === 'o' || y === 'O' || y === 'd' || y === 'i' || y === 'f') {
			const v = s[o++],
				S = {};
			typeof (v == null ? void 0 : v.value) != 'string' &&
				(S.color = 'var(--vscode-debugTokenExpression-number)'),
				d.push(
					w.jsx(
						'span',
						{ style: S, children: (v == null ? void 0 : v.preview) || '' },
						d.length + 1,
					),
				);
		} else if (y === 'c') {
			d = [];
			const v = s[o++],
				S = v ? mS(v.preview) : {};
			u.push(w.jsx('span', { style: S, children: d }, u.length + 1));
		}
	}
	for (
		p < n.length && d.push(w.jsx('span', { children: n.substring(p) }, d.length + 1));
		o < s.length;
		o++
	) {
		const g = s[o],
			y = {};
		d.length && d.push(w.jsx('span', { children: ' ' }, d.length + 1)),
			typeof (g == null ? void 0 : g.value) != 'string' &&
				(y.color = 'var(--vscode-debugTokenExpression-number)'),
			d.push(
				w.jsx('span', { style: y, children: (g == null ? void 0 : g.preview) || '' }, d.length + 1),
			);
	}
	return u;
}
function gg(t) {
	return [w.jsx('span', { dangerouslySetInnerHTML: { __html: Fi(t.trim()) } })];
}
function mS(t) {
	try {
		const e = {},
			n = t.split(';');
		for (const s of n) {
			const o = s.trim();
			if (!o) continue;
			let [l, c] = o.split(':');
			if (((l = l.trim()), (c = c.trim()), !gS(l))) continue;
			const u = l.replace(/-([a-z])/g, (d) => d[1].toUpperCase());
			e[u] = c;
		}
		return e;
	} catch {
		return {};
	}
}
function gS(t) {
	return ['background', 'border', 'color', 'font', 'line', 'margin', 'padding', 'text'].some((n) =>
		t.startsWith(n),
	);
}
const Mu = ({
		tabs: t,
		selectedTab: e,
		setSelectedTab: n,
		leftToolbar: s,
		rightToolbar: o,
		dataTestId: l,
		mode: c,
	}) => {
		const u = R.useId();
		return (
			e || (e = t[0].id),
			c || (c = 'default'),
			w.jsx('div', {
				className: 'tabbed-pane',
				'data-testid': l,
				children: w.jsxs('div', {
					className: 'vbox',
					children: [
						w.jsxs(Zu, {
							children: [
								s &&
									w.jsxs('div', {
										style: { flex: 'none', display: 'flex', margin: '0 4px', alignItems: 'center' },
										children: [...s],
									}),
								c === 'default' &&
									w.jsx('div', {
										style: { flex: 'auto', display: 'flex', height: '100%', overflow: 'hidden' },
										role: 'tablist',
										children: [
											...t.map((d) =>
												w.jsx(
													yg,
													{
														id: d.id,
														ariaControls: `${u}-${d.id}`,
														title: d.title,
														count: d.count,
														errorCount: d.errorCount,
														selected: e === d.id,
														onSelect: n,
													},
													d.id,
												),
											),
										],
									}),
								c === 'select' &&
									w.jsx('div', {
										style: { flex: 'auto', display: 'flex', height: '100%', overflow: 'hidden' },
										role: 'tablist',
										children: w.jsx('select', {
											style: { width: '100%', background: 'none', cursor: 'pointer' },
											value: e,
											onChange: (d) => {
												n == null || n(t[d.currentTarget.selectedIndex].id);
											},
											children: t.map((d) => {
												let p = '';
												return (
													d.count && (p = ` (${d.count})`),
													d.errorCount && (p = ` (${d.errorCount})`),
													w.jsxs(
														'option',
														{
															value: d.id,
															role: 'tab',
															'aria-controls': `${u}-${d.id}`,
															children: [d.title, p],
														},
														d.id,
													)
												);
											}),
										}),
									}),
								o &&
									w.jsxs('div', {
										style: { flex: 'none', display: 'flex', alignItems: 'center' },
										children: [...o],
									}),
							],
						}),
						t.map((d) => {
							const p = 'tab-content tab-' + d.id;
							if (d.component)
								return w.jsx(
									'div',
									{
										id: `${u}-${d.id}`,
										role: 'tabpanel',
										'aria-label': d.title,
										className: p,
										style: { display: e === d.id ? 'inherit' : 'none' },
										children: d.component,
									},
									d.id,
								);
							if (e === d.id)
								return w.jsx(
									'div',
									{
										id: `${u}-${d.id}`,
										role: 'tabpanel',
										'aria-label': d.title,
										className: p,
										children: d.render(),
									},
									d.id,
								);
						}),
					],
				}),
			})
		);
	},
	yg = ({ id: t, title: e, count: n, errorCount: s, selected: o, onSelect: l, ariaControls: c }) =>
		w.jsxs('div', {
			className: ze('tabbed-pane-tab', o && 'selected'),
			onClick: () => (l == null ? void 0 : l(t)),
			role: 'tab',
			title: e,
			'aria-controls': c,
			children: [
				w.jsx('div', { className: 'tabbed-pane-tab-label', children: e }),
				!!n && w.jsx('div', { className: 'tabbed-pane-tab-counter', children: n }),
				!!s && w.jsx('div', { className: 'tabbed-pane-tab-counter error', children: s }),
			],
		});
async function yS(t) {
	const e = navigator.platform.includes('Win') ? 'win' : 'unix';
	let n = [];
	const s = new Set([
		'accept-encoding',
		'host',
		'method',
		'path',
		'scheme',
		'version',
		'authority',
		'protocol',
	]);
	function o(y) {
		const v = '^"';
		return (
			v +
			y
				.replace(/\\/g, '\\\\')
				.replace(/"/g, '\\"')
				.replace(/[^a-zA-Z0-9\s_\-:=+~'\/.',?;()*`]/g, '^$&')
				.replace(/%(?=[a-zA-Z0-9_])/g, '%^')
				.replace(
					/\r?\n/g,
					`^

`,
				) +
			v
		);
	}
	function l(y) {
		function v(S) {
			let _ = S.charCodeAt(0).toString(16);
			for (; _.length < 4; ) _ = '0' + _;
			return '\\u' + _;
		}
		return /[\0-\x1F\x7F-\x9F!]|\'/.test(y)
			? "$'" +
					y
						.replace(/\\/g, '\\\\')
						.replace(/\'/g, "\\'")
						.replace(/\n/g, '\\n')
						.replace(/\r/g, '\\r')
						.replace(/[\0-\x1F\x7F-\x9F!]/g, v) +
					"'"
			: "'" + y + "'";
	}
	const c = e === 'win' ? o : l;
	n.push(c(t.request.url).replace(/[[{}\]]/g, '\\$&'));
	let u = 'GET';
	const d = [],
		p = await vg(t);
	p && (d.push('--data-raw ' + c(p)), s.add('content-length'), (u = 'POST')),
		t.request.method !== u && n.push('-X ' + c(t.request.method));
	const g = t.request.headers;
	for (let y = 0; y < g.length; y++) {
		const v = g[y],
			S = v.name.replace(/^:/, '');
		s.has(S.toLowerCase()) ||
			(v.value.trim() ? n.push('-H ' + c(S + ': ' + v.value)) : n.push('-H ' + c(S + ';')));
	}
	return (
		(n = n.concat(d)),
		'curl ' +
			n.join(
				n.length >= 3
					? e === 'win'
						? ` ^
  `
						: ` \\
  `
					: ' ',
			)
	);
}
async function vS(t, e = 0) {
	const n = new Set([
			'method',
			'path',
			'scheme',
			'version',
			'accept-charset',
			'accept-encoding',
			'access-control-request-headers',
			'access-control-request-method',
			'connection',
			'content-length',
			'cookie',
			'cookie2',
			'date',
			'dnt',
			'expect',
			'host',
			'keep-alive',
			'origin',
			'referer',
			'te',
			'trailer',
			'transfer-encoding',
			'upgrade',
			'via',
			'user-agent',
		]),
		s = new Set(['cookie', 'authorization']),
		o = JSON.stringify(t.request.url),
		l = t.request.headers,
		c = l.reduce((k, _) => {
			const E = _.name;
			return !n.has(E.toLowerCase()) && !E.includes(':') && k.append(E, _.value), k;
		}, new Headers()),
		u = {};
	for (const k of c) u[k[0]] = k[1];
	const d =
			t.request.cookies.length || l.some(({ name: k }) => s.has(k.toLowerCase()))
				? 'include'
				: 'omit',
		p = l.find(({ name: k }) => k.toLowerCase() === 'referer'),
		g = p ? p.value : void 0,
		y = await vg(t),
		v = {
			headers: Object.keys(u).length ? u : void 0,
			referrer: g,
			body: y,
			method: t.request.method,
			mode: 'cors',
		};
	if (e === 1) {
		const k = l.find((E) => E.name.toLowerCase() === 'cookie'),
			_ = {};
		delete v.mode,
			k && (_.cookie = k.value),
			g && (delete v.referrer, (_.Referer = g)),
			Object.keys(_).length && (v.headers = { ...u, ..._ });
	} else v.credentials = d;
	const S = JSON.stringify(v, null, 2);
	return `fetch(${o}, ${S});`;
}
async function vg(t) {
	var e, n;
	return (e = t.request.postData) != null && e._sha1
		? await fetch(`sha1/${t.request.postData._sha1}`).then((s) => s.text())
		: (n = t.request.postData) == null
			? void 0
			: n.text;
}
class wS {
	generatePlaywrightRequestCall(e, n) {
		let s = e.method.toLowerCase();
		const o = new URL(e.url),
			l = `${o.origin}${o.pathname}`,
			c = {};
		['delete', 'get', 'head', 'post', 'put', 'patch'].includes(s) ||
			((c.method = s), (s = 'fetch')),
			o.searchParams.size && (c.params = Object.fromEntries(o.searchParams.entries())),
			n && (c.data = n),
			e.headers.length && (c.headers = Object.fromEntries(e.headers.map((p) => [p.name, p.value])));
		const u = [`'${l}'`];
		return (
			Object.keys(c).length > 0 && u.push(this.prettyPrintObject(c)),
			`await page.request.${s}(${u.join(', ')});`
		);
	}
	prettyPrintObject(e, n = 2, s = 0) {
		if (e === null) return 'null';
		if (e === void 0) return 'undefined';
		if (typeof e != 'object') return typeof e == 'string' ? this.stringLiteral(e) : String(e);
		if (Array.isArray(e)) {
			if (e.length === 0) return '[]';
			const u = ' '.repeat(s * n),
				d = ' '.repeat((s + 1) * n);
			return `[
${e
	.map((g) => `${d}${this.prettyPrintObject(g, n, s + 1)}`)
	.join(`,
`)}
${u}]`;
		}
		if (Object.keys(e).length === 0) return '{}';
		const o = ' '.repeat(s * n),
			l = ' '.repeat((s + 1) * n);
		return `{
${Object.entries(e)
	.map(([u, d]) => {
		const p = this.prettyPrintObject(d, n, s + 1),
			g = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(u) ? u : this.stringLiteral(u);
		return `${l}${g}: ${p}`;
	})
	.join(`,
`)}
${o}}`;
	}
	stringLiteral(e) {
		return (
			(e = e.replace(/\\/g, '\\\\').replace(/'/g, "\\'")),
			e.includes(`
`) ||
			e.includes('\r') ||
			e.includes('	')
				? '`' + e + '`'
				: `'${e}'`
		);
	}
}
class SS {
	generatePlaywrightRequestCall(e, n) {
		const s = new URL(e.url),
			l = [`"${`${s.origin}${s.pathname}`}"`];
		let c = e.method.toLowerCase();
		['delete', 'get', 'head', 'post', 'put', 'patch'].includes(c) ||
			(l.push(`method="${c}"`), (c = 'fetch')),
			s.searchParams.size &&
				l.push(`params=${this.prettyPrintObject(Object.fromEntries(s.searchParams.entries()))}`),
			n && l.push(`data=${this.prettyPrintObject(n)}`),
			e.headers.length &&
				l.push(
					`headers=${this.prettyPrintObject(Object.fromEntries(e.headers.map((d) => [d.name, d.value])))}`,
				);
		const u =
			l.length === 1
				? l[0]
				: `
${l
	.map((d) => this.indent(d, 2))
	.join(`,
`)}
`;
		return `await page.request.${c}(${u})`;
	}
	indent(e, n) {
		return e
			.split(`
`)
			.map((s) => ' '.repeat(n) + s)
			.join(`
`);
	}
	prettyPrintObject(e, n = 2, s = 0) {
		if (e === null || e === void 0) return 'None';
		if (typeof e != 'object')
			return typeof e == 'string'
				? this.stringLiteral(e)
				: typeof e == 'boolean'
					? e
						? 'True'
						: 'False'
					: String(e);
		if (Array.isArray(e)) {
			if (e.length === 0) return '[]';
			const u = ' '.repeat(s * n),
				d = ' '.repeat((s + 1) * n);
			return `[
${e
	.map((g) => `${d}${this.prettyPrintObject(g, n, s + 1)}`)
	.join(`,
`)}
${u}]`;
		}
		if (Object.keys(e).length === 0) return '{}';
		const o = ' '.repeat(s * n),
			l = ' '.repeat((s + 1) * n);
		return `{
${Object.entries(e)
	.map(([u, d]) => {
		const p = this.prettyPrintObject(d, n, s + 1);
		return `${l}${this.stringLiteral(u)}: ${p}`;
	})
	.join(`,
`)}
${o}}`;
	}
	stringLiteral(e) {
		return JSON.stringify(e);
	}
}
class xS {
	generatePlaywrightRequestCall(e, n) {
		const s = new URL(e.url),
			o = `${s.origin}${s.pathname}`,
			l = {},
			c = [];
		let u = e.method.toLowerCase();
		['delete', 'get', 'head', 'post', 'put', 'patch'].includes(u) ||
			((l.Method = u), (u = 'fetch')),
			s.searchParams.size && (l.Params = Object.fromEntries(s.searchParams.entries())),
			n && (l.Data = n),
			e.headers.length && (l.Headers = Object.fromEntries(e.headers.map((g) => [g.name, g.value])));
		const d = [`"${o}"`];
		return (
			Object.keys(l).length > 0 && d.push(this.prettyPrintObject(l)),
			`${c.join(`
`)}${
				c.length
					? `
`
					: ''
			}await request.${this.toFunctionName(u)}(${d.join(', ')});`
		);
	}
	toFunctionName(e) {
		return e[0].toUpperCase() + e.slice(1) + 'Async';
	}
	prettyPrintObject(e, n = 2, s = 0) {
		if (e === null || e === void 0) return 'null';
		if (typeof e != 'object')
			return typeof e == 'string'
				? this.stringLiteral(e)
				: typeof e == 'boolean'
					? e
						? 'true'
						: 'false'
					: String(e);
		if (Array.isArray(e)) {
			if (e.length === 0) return 'new object[] {}';
			const u = ' '.repeat(s * n),
				d = ' '.repeat((s + 1) * n);
			return `new object[] {
${e
	.map((g) => `${d}${this.prettyPrintObject(g, n, s + 1)}`)
	.join(`,
`)}
${u}}`;
		}
		if (Object.keys(e).length === 0) return 'new {}';
		const o = ' '.repeat(s * n),
			l = ' '.repeat((s + 1) * n);
		return `new() {
${Object.entries(e)
	.map(([u, d]) => {
		const p = this.prettyPrintObject(d, n, s + 1),
			g = s === 0 ? u : `[${this.stringLiteral(u)}]`;
		return `${l}${g} = ${p}`;
	})
	.join(`,
`)}
${o}}`;
	}
	stringLiteral(e) {
		return JSON.stringify(e);
	}
}
class _S {
	generatePlaywrightRequestCall(e, n) {
		const s = new URL(e.url),
			o = [`"${s.origin}${s.pathname}"`],
			l = [];
		let c = e.method.toLowerCase();
		['delete', 'get', 'head', 'post', 'put', 'patch'].includes(c) ||
			(l.push(`setMethod("${c}")`), (c = 'fetch'));
		for (const [u, d] of s.searchParams)
			l.push(`setQueryParam(${this.stringLiteral(u)}, ${this.stringLiteral(d)})`);
		n && l.push(`setData(${this.stringLiteral(n)})`);
		for (const u of e.headers)
			l.push(`setHeader(${this.stringLiteral(u.name)}, ${this.stringLiteral(u.value)})`);
		return (
			l.length > 0 &&
				o.push(`RequestOptions.create()
  .${l.join(`
  .`)}
`),
			`request.${c}(${o.join(', ')});`
		);
	}
	stringLiteral(e) {
		return JSON.stringify(e);
	}
}
function ES(t) {
	if (t === 'javascript') return new wS();
	if (t === 'python') return new SS();
	if (t === 'csharp') return new xS();
	if (t === 'java') return new _S();
	throw new Error('Unsupported language: ' + t);
}
const kS = ({ resource: t, sdkLanguage: e, startTimeOffset: n, onClose: s }) => {
		const [o, l] = R.useState('request'),
			c = Ml(
				async () => {
					if (t.request.postData) {
						const u = t.request.headers.find((p) => p.name.toLowerCase() === 'content-type'),
							d = u ? u.value : '';
						if (t.request.postData._sha1) {
							const p = await fetch(`sha1/${t.request.postData._sha1}`);
							return { text: ju(await p.text(), d), mimeType: d };
						} else return { text: ju(t.request.postData.text, d), mimeType: d };
					} else return null;
				},
				[t],
				null,
			);
		return w.jsx(Mu, {
			dataTestId: 'network-request-details',
			leftToolbar: [w.jsx(qt, { icon: 'close', title: 'Close', onClick: s }, 'close')],
			rightToolbar: [w.jsx(bS, { requestBody: c, resource: t, sdkLanguage: e }, 'dropdown')],
			tabs: [
				{
					id: 'request',
					title: 'Request',
					render: () => w.jsx(TS, { resource: t, startTimeOffset: n, requestBody: c }),
				},
				{ id: 'response', title: 'Response', render: () => w.jsx(CS, { resource: t }) },
				{ id: 'body', title: 'Body', render: () => w.jsx(NS, { resource: t }) },
			],
			selectedTab: o,
			setSelectedTab: l,
		});
	},
	bS = ({ resource: t, sdkLanguage: e, requestBody: n }) => {
		const s = w.jsxs(w.Fragment, {
				children: [
					w.jsx('span', { className: 'codicon codicon-check', style: { marginRight: '5px' } }),
					' Copied ',
				],
			}),
			o = async () => ES(e).generatePlaywrightRequestCall(t.request, n == null ? void 0 : n.text);
		return w.jsxs('div', {
			className: 'copy-request-dropdown',
			children: [
				w.jsxs(qt, {
					className: 'copy-request-dropdown-toggle',
					children: [
						w.jsx('span', { className: 'codicon codicon-copy', style: { marginRight: '5px' } }),
						'Copy request',
						w.jsx('span', {
							className: 'codicon codicon-chevron-down',
							style: { marginLeft: '5px' },
						}),
					],
				}),
				w.jsxs('div', {
					className: 'copy-request-dropdown-menu',
					children: [
						w.jsx(kl, { description: 'Copy as cURL', copiedDescription: s, value: () => yS(t) }),
						w.jsx(kl, { description: 'Copy as Fetch', copiedDescription: s, value: () => vS(t) }),
						w.jsx(kl, { description: 'Copy as Playwright', copiedDescription: s, value: o }),
					],
				}),
			],
		});
	},
	TS = ({ resource: t, startTimeOffset: e, requestBody: n }) =>
		w.jsxs('div', {
			className: 'network-request-details-tab',
			children: [
				w.jsx('div', { className: 'network-request-details-header', children: 'General' }),
				w.jsx('div', {
					className: 'network-request-details-url',
					children: `URL: ${t.request.url}`,
				}),
				w.jsx('div', {
					className: 'network-request-details-general',
					children: `Method: ${t.request.method}`,
				}),
				t.response.status !== -1 &&
					w.jsxs('div', {
						className: 'network-request-details-general',
						style: { display: 'flex' },
						children: [
							'Status Code: ',
							w.jsx('span', {
								className: IS(t.response.status),
								style: { display: 'inline-flex' },
								children: `${t.response.status} ${t.response.statusText}`,
							}),
						],
					}),
				t.request.queryString.length
					? w.jsxs(w.Fragment, {
							children: [
								w.jsx('div', {
									className: 'network-request-details-header',
									children: 'Query String Parameters',
								}),
								w.jsx('div', {
									className: 'network-request-details-headers',
									children: t.request.queryString
										.map((s) => `${s.name}: ${s.value}`)
										.join(`
`),
								}),
							],
						})
					: null,
				w.jsx('div', { className: 'network-request-details-header', children: 'Request Headers' }),
				w.jsx('div', {
					className: 'network-request-details-headers',
					children: t.request.headers
						.map((s) => `${s.name}: ${s.value}`)
						.join(`
`),
				}),
				w.jsx('div', { className: 'network-request-details-header', children: 'Time' }),
				w.jsx('div', { className: 'network-request-details-general', children: `Start: ${pt(e)}` }),
				w.jsx('div', {
					className: 'network-request-details-general',
					children: `Duration: ${pt(t.time)}`,
				}),
				n &&
					w.jsx('div', { className: 'network-request-details-header', children: 'Request Body' }),
				n && w.jsx(ks, { text: n.text, mimeType: n.mimeType, readOnly: !0, lineNumbers: !0 }),
			],
		}),
	CS = ({ resource: t }) =>
		w.jsxs('div', {
			className: 'network-request-details-tab',
			children: [
				w.jsx('div', { className: 'network-request-details-header', children: 'Response Headers' }),
				w.jsx('div', {
					className: 'network-request-details-headers',
					children: t.response.headers
						.map((e) => `${e.name}: ${e.value}`)
						.join(`
`),
				}),
			],
		}),
	NS = ({ resource: t }) => {
		const [e, n] = R.useState(null);
		return (
			R.useEffect(() => {
				(async () => {
					if (t.response.content._sha1) {
						const o = t.response.content.mimeType.includes('image'),
							l = t.response.content.mimeType.includes('font'),
							c = await fetch(`sha1/${t.response.content._sha1}`);
						if (o) {
							const u = await c.blob(),
								d = new FileReader(),
								p = new Promise((g) => (d.onload = g));
							d.readAsDataURL(u), n({ dataUrl: (await p).target.result });
						} else if (l) {
							const u = await c.arrayBuffer();
							n({ font: u });
						} else {
							const u = ju(await c.text(), t.response.content.mimeType);
							n({ text: u, mimeType: t.response.content.mimeType });
						}
					} else n(null);
				})();
			}, [t]),
			w.jsxs('div', {
				className: 'network-request-details-tab',
				children: [
					!t.response.content._sha1 &&
						w.jsx('div', { children: 'Response body is not available for this request.' }),
					e && e.font && w.jsx(AS, { font: e.font }),
					e && e.dataUrl && w.jsx('img', { draggable: 'false', src: e.dataUrl }),
					e &&
						e.text &&
						w.jsx(ks, { text: e.text, mimeType: e.mimeType, readOnly: !0, lineNumbers: !0 }),
				],
			})
		);
	},
	AS = ({ font: t }) => {
		const [e, n] = R.useState(!1);
		return (
			R.useEffect(() => {
				let s;
				try {
					(s = new FontFace('font-preview', t)),
						s.status === 'loaded' && document.fonts.add(s),
						s.status === 'error' && n(!0);
				} catch {
					n(!0);
				}
				return () => {
					document.fonts.delete(s);
				};
			}, [t]),
			e
				? w.jsx('div', {
						className: 'network-font-preview-error',
						children: 'Could not load font preview',
					})
				: w.jsxs('div', {
						className: 'network-font-preview',
						children: [
							'ABCDEFGHIJKLM',
							w.jsx('br', {}),
							'NOPQRSTUVWXYZ',
							w.jsx('br', {}),
							'abcdefghijklm',
							w.jsx('br', {}),
							'nopqrstuvwxyz',
							w.jsx('br', {}),
							'1234567890',
						],
					})
		);
	};
function IS(t) {
	return t < 300 || t === 304 ? 'green-circle' : t < 400 ? 'yellow-circle' : 'red-circle';
}
function ju(t, e) {
	if (t === null) return 'Loading...';
	const n = t;
	if (n === '') return '<Empty>';
	if (e.includes('application/json'))
		try {
			return JSON.stringify(JSON.parse(n), null, 2);
		} catch {
			return n;
		}
	return e.includes('application/x-www-form-urlencoded') ? decodeURIComponent(n) : n;
}
function LS(t) {
	const [e, n] = R.useState([]);
	R.useEffect(() => {
		const l = [];
		for (let c = 0; c < t.columns.length - 1; ++c) {
			const u = t.columns[c];
			l[c] = (l[c - 1] || 0) + t.columnWidths.get(u);
		}
		n(l);
	}, [t.columns, t.columnWidths]);
	function s(l) {
		const c = new Map(t.columnWidths.entries());
		for (let u = 0; u < l.length; ++u) {
			const d = l[u] - (l[u - 1] || 0),
				p = t.columns[u];
			c.set(p, d);
		}
		t.setColumnWidths(c);
	}
	const o = R.useCallback(
		(l) => {
			var c, u;
			(u = t.setSorting) == null ||
				u.call(t, {
					by: l,
					negate: ((c = t.sorting) == null ? void 0 : c.by) === l ? !t.sorting.negate : !1,
				});
		},
		[t],
	);
	return w.jsxs('div', {
		className: `grid-view ${t.name}-grid-view`,
		children: [
			w.jsx(dg, {
				orientation: 'horizontal',
				offsets: e,
				setOffsets: s,
				resizerColor: 'var(--vscode-panel-border)',
				resizerWidth: 1,
				minColumnWidth: 25,
			}),
			w.jsxs('div', {
				className: 'vbox',
				children: [
					w.jsx('div', {
						className: 'grid-view-header',
						children: t.columns.map((l, c) =>
							w.jsxs(
								'div',
								{
									className: 'grid-view-header-cell ' + MS(l, t.sorting),
									style: { width: c < t.columns.length - 1 ? t.columnWidths.get(l) : void 0 },
									onClick: () => t.setSorting && o(l),
									children: [
										w.jsx('span', {
											className: 'grid-view-header-cell-title',
											children: t.columnTitle(l),
										}),
										w.jsx('span', { className: 'codicon codicon-triangle-up' }),
										w.jsx('span', { className: 'codicon codicon-triangle-down' }),
									],
								},
								t.columnTitle(l),
							),
						),
					}),
					w.jsx(Ql, {
						name: t.name,
						items: t.items,
						id: t.id,
						render: (l, c) =>
							w.jsx(w.Fragment, {
								children: t.columns.map((u, d) => {
									const { body: p, title: g } = t.render(l, u, c);
									return w.jsx(
										'div',
										{
											className: `grid-view-cell grid-view-column-${String(u)}`,
											title: g,
											style: { width: d < t.columns.length - 1 ? t.columnWidths.get(u) : void 0 },
											children: p,
										},
										t.columnTitle(u),
									);
								}),
							}),
						icon: t.icon,
						isError: t.isError,
						isWarning: t.isWarning,
						isInfo: t.isInfo,
						selectedItem: t.selectedItem,
						onAccepted: t.onAccepted,
						onSelected: t.onSelected,
						onHighlighted: t.onHighlighted,
						onIconClicked: t.onIconClicked,
						noItemsMessage: t.noItemsMessage,
						dataTestId: t.dataTestId,
						notSelectable: t.notSelectable,
					}),
				],
			}),
		],
	});
}
function MS(t, e) {
	return t === (e == null ? void 0 : e.by) ? ' filter-' + (e.negate ? 'negative' : 'positive') : '';
}
const jS = ['All', 'Fetch', 'HTML', 'JS', 'CSS', 'Font', 'Image'],
	PS = { searchValue: '', resourceType: 'All' },
	OS = ({ filterState: t, onFilterStateChange: e }) =>
		w.jsxs('div', {
			className: 'network-filters',
			children: [
				w.jsx('input', {
					type: 'search',
					placeholder: 'Filter network',
					spellCheck: !1,
					value: t.searchValue,
					onChange: (n) => e({ ...t, searchValue: n.target.value }),
				}),
				w.jsx('div', {
					className: 'network-filters-resource-types',
					children: jS.map((n) =>
						w.jsx(
							'div',
							{
								title: n,
								onClick: () => e({ ...t, resourceType: n }),
								className: `network-filters-resource-type ${t.resourceType === n ? 'selected' : ''}`,
								children: n,
							},
							n,
						),
					),
				}),
			],
		}),
	$S = LS;
function RS(t, e) {
	const n = R.useMemo(
			() =>
				((t == null ? void 0 : t.resources) || []).filter((c) =>
					e
						? !!c._monotonicTime && c._monotonicTime >= e.minimum && c._monotonicTime <= e.maximum
						: !0,
				),
			[t, e],
		),
		s = R.useMemo(() => new US(t), [t]);
	return { resources: n, contextIdMap: s };
}
const DS = ({ boundaries: t, networkModel: e, onEntryHovered: n, sdkLanguage: s }) => {
		const [o, l] = R.useState(void 0),
			[c, u] = R.useState(void 0),
			[d, p] = R.useState(PS),
			{ renderedEntries: g } = R.useMemo(() => {
				const _ = e.resources.map((E) => qS(E, t, e.contextIdMap)).filter(QS(d));
				return o && WS(_, o), { renderedEntries: _ };
			}, [e.resources, e.contextIdMap, d, o, t]),
			[y, v] = R.useState(() => new Map(wg().map((_) => [_, BS(_)]))),
			S = R.useCallback((_) => {
				p(_), u(void 0);
			}, []);
		if (!e.resources.length) return w.jsx(Ar, { text: 'No network calls' });
		const k = w.jsx($S, {
			name: 'network',
			items: g,
			selectedItem: c,
			onSelected: (_) => u(_),
			onHighlighted: (_) => (n == null ? void 0 : n(_ == null ? void 0 : _.resource)),
			columns: zS(!!c, g),
			columnTitle: FS,
			columnWidths: y,
			setColumnWidths: v,
			isError: (_) => _.status.code >= 400 || _.status.code === -1,
			isInfo: (_) => !!_.route,
			render: (_, E) => HS(_, E),
			sorting: o,
			setSorting: l,
		});
		return w.jsxs(w.Fragment, {
			children: [
				w.jsx(OS, { filterState: d, onFilterStateChange: S }),
				!c && k,
				c &&
					w.jsx(Pl, {
						sidebarSize: y.get('name'),
						sidebarIsFirst: !0,
						orientation: 'horizontal',
						settingName: 'networkResourceDetails',
						main: w.jsx(kS, {
							resource: c.resource,
							sdkLanguage: s,
							startTimeOffset: c.start,
							onClose: () => u(void 0),
						}),
						sidebar: k,
					}),
			],
		});
	},
	FS = (t) =>
		t === 'contextId'
			? 'Source'
			: t === 'name'
				? 'Name'
				: t === 'method'
					? 'Method'
					: t === 'status'
						? 'Status'
						: t === 'contentType'
							? 'Content Type'
							: t === 'duration'
								? 'Duration'
								: t === 'size'
									? 'Size'
									: t === 'start'
										? 'Start'
										: t === 'route'
											? 'Route'
											: '',
	BS = (t) =>
		t === 'name'
			? 200
			: t === 'method' || t === 'status'
				? 60
				: t === 'contentType'
					? 200
					: t === 'contextId'
						? 60
						: 100;
function zS(t, e) {
	if (t) {
		const s = ['name'];
		return Yp(e) && s.unshift('contextId'), s;
	}
	let n = wg();
	return Yp(e) || (n = n.filter((s) => s !== 'contextId')), n;
}
function wg() {
	return [
		'contextId',
		'name',
		'method',
		'status',
		'contentType',
		'duration',
		'size',
		'start',
		'route',
	];
}
const HS = (t, e) =>
	e === 'contextId'
		? { body: t.contextId, title: t.name.url }
		: e === 'name'
			? { body: t.name.name, title: t.name.url }
			: e === 'method'
				? { body: t.method }
				: e === 'status'
					? { body: t.status.code > 0 ? t.status.code : '', title: t.status.text }
					: e === 'contentType'
						? { body: t.contentType }
						: e === 'duration'
							? { body: pt(t.duration) }
							: e === 'size'
								? { body: S0(t.size) }
								: e === 'start'
									? { body: pt(t.start) }
									: e === 'route'
										? { body: t.route }
										: { body: '' };
class US {
	constructor(e) {
		Ee(this, '_pagerefToShortId', new Map());
		Ee(this, '_contextToId', new Map());
		Ee(this, '_lastPageId', 0);
		Ee(this, '_lastApiRequestContextId', 0);
	}
	contextId(e) {
		return e.pageref ? this._pageId(e.pageref) : e._apiRequest ? this._apiRequestContextId(e) : '';
	}
	_pageId(e) {
		let n = this._pagerefToShortId.get(e);
		return (
			n || (++this._lastPageId, (n = 'page#' + this._lastPageId), this._pagerefToShortId.set(e, n)),
			n
		);
	}
	_apiRequestContextId(e) {
		const n = jl(e);
		if (!n) return '';
		let s = this._contextToId.get(n);
		return (
			s ||
				(++this._lastApiRequestContextId,
				(s = 'api#' + this._lastApiRequestContextId),
				this._contextToId.set(n, s)),
			s
		);
	}
}
function Yp(t) {
	const e = new Set();
	for (const n of t) if ((e.add(n.contextId), e.size > 1)) return !0;
	return !1;
}
const qS = (t, e, n) => {
	const s = VS(t);
	let o;
	try {
		const u = new URL(t.request.url);
		(o = u.pathname.substring(u.pathname.lastIndexOf('/') + 1)),
			o || (o = u.host),
			u.search && (o += u.search);
	} catch {
		o = t.request.url;
	}
	let l = t.response.content.mimeType;
	const c = l.match(/^(.*);\s*charset=.*$/);
	return (
		c && (l = c[1]),
		{
			name: { name: o, url: t.request.url },
			method: t.request.method,
			status: { code: t.response.status, text: t.response.statusText },
			contentType: l,
			duration: t.time,
			size: t.response._transferSize > 0 ? t.response._transferSize : t.response.bodySize,
			start: t._monotonicTime - e.minimum,
			route: s,
			resource: t,
			contextId: n.contextId(t),
		}
	);
};
function VS(t) {
	return t._wasAborted
		? 'aborted'
		: t._wasContinued
			? 'continued'
			: t._wasFulfilled
				? 'fulfilled'
				: t._apiRequest
					? 'api'
					: '';
}
function WS(t, e) {
	const n = KS(e == null ? void 0 : e.by);
	n && t.sort(n), e.negate && t.reverse();
}
function KS(t) {
	if (t === 'start') return (e, n) => e.start - n.start;
	if (t === 'duration') return (e, n) => e.duration - n.duration;
	if (t === 'status') return (e, n) => e.status.code - n.status.code;
	if (t === 'method')
		return (e, n) => {
			const s = e.method,
				o = n.method;
			return s.localeCompare(o);
		};
	if (t === 'size') return (e, n) => e.size - n.size;
	if (t === 'contentType') return (e, n) => e.contentType.localeCompare(n.contentType);
	if (t === 'name') return (e, n) => e.name.name.localeCompare(n.name.name);
	if (t === 'route') return (e, n) => e.route.localeCompare(n.route);
	if (t === 'contextId') return (e, n) => e.contextId.localeCompare(n.contextId);
}
const GS = {
	All: () => !0,
	Fetch: (t) => t === 'application/json',
	HTML: (t) => t === 'text/html',
	CSS: (t) => t === 'text/css',
	JS: (t) => t.includes('javascript'),
	Font: (t) => t.includes('font'),
	Image: (t) => t.includes('image'),
};
function QS({ searchValue: t, resourceType: e }) {
	return (n) => {
		const s = GS[e];
		return s(n.contentType) && n.name.url.toLowerCase().includes(t.toLowerCase());
	};
}
function ef(t, e, n = {}) {
	var v;
	const s = new t.LineCounter(),
		o = { keepSourceTokens: !0, lineCounter: s, ...n },
		l = t.parseDocument(e, o),
		c = [],
		u = (S) => [s.linePos(S[0]), s.linePos(S[1])],
		d = (S) => {
			c.push({ message: S.message, range: [s.linePos(S.pos[0]), s.linePos(S.pos[1])] });
		},
		p = (S, k) => {
			for (const _ of k.items) {
				if (_ instanceof t.Scalar && typeof _.value == 'string') {
					const A = Fl.parse(_, o, c);
					A && ((S.children = S.children || []), S.children.push(A));
					continue;
				}
				if (_ instanceof t.YAMLMap) {
					g(S, _);
					continue;
				}
				c.push({
					message: 'Sequence items should be strings or maps',
					range: u(_.range || k.range),
				});
			}
		},
		g = (S, k) => {
			for (const _ of k.items) {
				if (
					((S.children = S.children || []),
					!(_.key instanceof t.Scalar && typeof _.key.value == 'string'))
				) {
					c.push({ message: 'Only string keys are supported', range: u(_.key.range || k.range) });
					continue;
				}
				const C = _.key,
					A = _.value;
				if (C.value === 'text') {
					if (!(A instanceof t.Scalar && typeof A.value == 'string')) {
						c.push({
							message: 'Text value should be a string',
							range: u(_.value.range || k.range),
						});
						continue;
					}
					S.children.push({ kind: 'text', text: au(A.value) });
					continue;
				}
				if (C.value === '/children') {
					if (
						!(A instanceof t.Scalar && typeof A.value == 'string') ||
						(A.value !== 'contain' && A.value !== 'equal' && A.value !== 'deep-equal')
					) {
						c.push({
							message: 'Strict value should be "contain", "equal" or "deep-equal"',
							range: u(_.value.range || k.range),
						});
						continue;
					}
					S.containerMode = A.value;
					continue;
				}
				if (C.value.startsWith('/')) {
					if (!(A instanceof t.Scalar && typeof A.value == 'string')) {
						c.push({
							message: 'Property value should be a string',
							range: u(_.value.range || k.range),
						});
						continue;
					}
					(S.props = S.props ?? {}), (S.props[C.value.slice(1)] = au(A.value));
					continue;
				}
				const O = Fl.parse(C, o, c);
				if (!O) continue;
				if (A instanceof t.Scalar) {
					const z = typeof A.value;
					if (z !== 'string' && z !== 'number' && z !== 'boolean') {
						c.push({
							message: 'Node value should be a string or a sequence',
							range: u(_.value.range || k.range),
						});
						continue;
					}
					S.children.push({ ...O, children: [{ kind: 'text', text: au(String(A.value)) }] });
					continue;
				}
				if (A instanceof t.YAMLSeq) {
					S.children.push(O), p(O, A);
					continue;
				}
				c.push({
					message: 'Map values should be strings or sequences',
					range: u(_.value.range || k.range),
				});
			}
		},
		y = { kind: 'role', role: 'fragment' };
	return (
		l.errors.forEach(d),
		c.length
			? { errors: c, fragment: y }
			: (l.contents instanceof t.YAMLSeq ||
					c.push({
						message: 'Aria snapshot must be a YAML sequence, elements starting with " -"',
						range: l.contents
							? u(l.contents.range)
							: [
									{ line: 0, col: 0 },
									{ line: 0, col: 0 },
								],
					}),
				c.length
					? { errors: c, fragment: y }
					: (p(y, l.contents),
						c.length
							? { errors: c, fragment: JS }
							: ((v = y.children) == null ? void 0 : v.length) === 1
								? { fragment: y.children[0], errors: c }
								: { fragment: y, errors: c }))
	);
}
const JS = { kind: 'role', role: 'fragment' };
function Sg(t) {
	return t
		.replace(/[\u200b\u00ad]/g, '')
		.replace(/[\r\n\s\t]+/g, ' ')
		.trim();
}
function au(t) {
	return t.startsWith('/') && t.endsWith('/') && t.length > 1 ? { pattern: t.slice(1, -1) } : Sg(t);
}
class Fl {
	static parse(e, n, s) {
		try {
			return new Fl(e.value)._parse();
		} catch (o) {
			if (o instanceof Zp) {
				const l =
					n.prettyErrors === !1
						? o.message
						: o.message +
							`:

` +
							e.value +
							`
` +
							' '.repeat(o.pos) +
							`^
`;
				return (
					s.push({
						message: l,
						range: [n.lineCounter.linePos(e.range[0]), n.lineCounter.linePos(e.range[0] + o.pos)],
					}),
					null
				);
			}
			throw o;
		}
	}
	constructor(e) {
		(this._input = e), (this._pos = 0), (this._length = e.length);
	}
	_peek() {
		return this._input[this._pos] || '';
	}
	_next() {
		return this._pos < this._length ? this._input[this._pos++] : null;
	}
	_eof() {
		return this._pos >= this._length;
	}
	_isWhitespace() {
		return !this._eof() && /\s/.test(this._peek());
	}
	_skipWhitespace() {
		for (; this._isWhitespace(); ) this._pos++;
	}
	_readIdentifier(e) {
		this._eof() && this._throwError(`Unexpected end of input when expecting ${e}`);
		const n = this._pos;
		for (; !this._eof() && /[a-zA-Z]/.test(this._peek()); ) this._pos++;
		return this._input.slice(n, this._pos);
	}
	_readString() {
		let e = '',
			n = !1;
		for (; !this._eof(); ) {
			const s = this._next();
			if (n) (e += s), (n = !1);
			else if (s === '\\') n = !0;
			else {
				if (s === '"') return e;
				e += s;
			}
		}
		this._throwError('Unterminated string');
	}
	_throwError(e, n = 0) {
		throw new Zp(e, n || this._pos);
	}
	_readRegex() {
		let e = '',
			n = !1,
			s = !1;
		for (; !this._eof(); ) {
			const o = this._next();
			if (n) (e += o), (n = !1);
			else if (o === '\\') (n = !0), (e += o);
			else {
				if (o === '/' && !s) return { pattern: e };
				o === '[' ? ((s = !0), (e += o)) : o === ']' && s ? ((e += o), (s = !1)) : (e += o);
			}
		}
		this._throwError('Unterminated regex');
	}
	_readStringOrRegex() {
		const e = this._peek();
		return e === '"'
			? (this._next(), Sg(this._readString()))
			: e === '/'
				? (this._next(), this._readRegex())
				: null;
	}
	_readAttributes(e) {
		let n = this._pos;
		for (; this._skipWhitespace(), this._peek() === '['; ) {
			this._next(), this._skipWhitespace(), (n = this._pos);
			const s = this._readIdentifier('attribute');
			this._skipWhitespace();
			let o = '';
			if (this._peek() === '=')
				for (
					this._next(), this._skipWhitespace(), n = this._pos;
					this._peek() !== ']' && !this._isWhitespace() && !this._eof();
				)
					o += this._next();
			this._skipWhitespace(),
				this._peek() !== ']' && this._throwError('Expected ]'),
				this._next(),
				this._applyAttribute(e, s, o || 'true', n);
		}
	}
	_parse() {
		this._skipWhitespace();
		const e = this._readIdentifier('role');
		this._skipWhitespace();
		const n = this._readStringOrRegex() || '',
			s = { kind: 'role', role: e, name: n };
		return (
			this._readAttributes(s),
			this._skipWhitespace(),
			this._eof() || this._throwError('Unexpected input'),
			s
		);
	}
	_applyAttribute(e, n, s, o) {
		if (n === 'checked') {
			this._assert(
				s === 'true' || s === 'false' || s === 'mixed',
				'Value of "checked" attribute must be a boolean or "mixed"',
				o,
			),
				(e.checked = s === 'true' ? !0 : s === 'false' ? !1 : 'mixed');
			return;
		}
		if (n === 'disabled') {
			this._assert(
				s === 'true' || s === 'false',
				'Value of "disabled" attribute must be a boolean',
				o,
			),
				(e.disabled = s === 'true');
			return;
		}
		if (n === 'expanded') {
			this._assert(
				s === 'true' || s === 'false',
				'Value of "expanded" attribute must be a boolean',
				o,
			),
				(e.expanded = s === 'true');
			return;
		}
		if (n === 'level') {
			this._assert(!isNaN(Number(s)), 'Value of "level" attribute must be a number', o),
				(e.level = Number(s));
			return;
		}
		if (n === 'pressed') {
			this._assert(
				s === 'true' || s === 'false' || s === 'mixed',
				'Value of "pressed" attribute must be a boolean or "mixed"',
				o,
			),
				(e.pressed = s === 'true' ? !0 : s === 'false' ? !1 : 'mixed');
			return;
		}
		if (n === 'selected') {
			this._assert(
				s === 'true' || s === 'false',
				'Value of "selected" attribute must be a boolean',
				o,
			),
				(e.selected = s === 'true');
			return;
		}
		this._assert(!1, `Unsupported attribute [${n}]`, o);
	}
	_assert(e, n, s) {
		e || this._throwError(n || 'Assertion error', s);
	}
}
class Zp extends Error {
	constructor(e, n) {
		super(e), (this.pos = n);
	}
}
let tf = {};
function XS(t) {
	tf = t;
}
function nf() {
	return tf;
}
function Xl(t, e) {
	for (; e; ) {
		if (t.contains(e)) return !0;
		e = _g(e);
	}
	return !1;
}
function lt(t) {
	if (t.parentElement) return t.parentElement;
	if (t.parentNode && t.parentNode.nodeType === 11 && t.parentNode.host) return t.parentNode.host;
}
function xg(t) {
	let e = t;
	for (; e.parentNode; ) e = e.parentNode;
	if (e.nodeType === 11 || e.nodeType === 9) return e;
}
function _g(t) {
	for (; t.parentElement; ) t = t.parentElement;
	return lt(t);
}
function Li(t, e, n) {
	for (; t; ) {
		const s = t.closest(e);
		if (n && s !== n && s != null && s.contains(n)) return;
		if (s) return s;
		t = _g(t);
	}
}
function sr(t, e) {
	return t.ownerDocument && t.ownerDocument.defaultView
		? t.ownerDocument.defaultView.getComputedStyle(t, e)
		: void 0;
}
function Eg(t, e) {
	if (((e = e ?? sr(t)), !e)) return !0;
	if (Element.prototype.checkVisibility && tf.browserNameForWorkarounds !== 'webkit') {
		if (!t.checkVisibility()) return !1;
	} else {
		const n = t.closest('details,summary');
		if (n !== t && (n == null ? void 0 : n.nodeName) === 'DETAILS' && !n.open) return !1;
	}
	return e.visibility === 'visible';
}
function Bl(t) {
	const e = sr(t);
	if (!e) return { visible: !0 };
	if (e.display === 'contents') {
		for (let s = t.firstChild; s; s = s.nextSibling) {
			if (s.nodeType === 1 && Tr(s)) return { visible: !0, style: e };
			if (s.nodeType === 3 && kg(s)) return { visible: !0, style: e };
		}
		return { visible: !1, style: e };
	}
	if (!Eg(t, e)) return { style: e, visible: !1 };
	const n = t.getBoundingClientRect();
	return { rect: n, style: e, visible: n.width > 0 && n.height > 0 };
}
function Tr(t) {
	return Bl(t).visible;
}
function kg(t) {
	const e = t.ownerDocument.createRange();
	e.selectNode(t);
	const n = e.getBoundingClientRect();
	return n.width > 0 && n.height > 0;
}
function ot(t) {
	return t instanceof HTMLFormElement ? 'FORM' : t.tagName.toUpperCase();
}
function em(t) {
	return t.hasAttribute('aria-label') || t.hasAttribute('aria-labelledby');
}
const tm =
		'article:not([role]), aside:not([role]), main:not([role]), nav:not([role]), section:not([role]), [role=article], [role=complementary], [role=main], [role=navigation], [role=region]',
	YS = [
		['aria-atomic', void 0],
		['aria-busy', void 0],
		['aria-controls', void 0],
		['aria-current', void 0],
		['aria-describedby', void 0],
		['aria-details', void 0],
		['aria-dropeffect', void 0],
		['aria-flowto', void 0],
		['aria-grabbed', void 0],
		['aria-hidden', void 0],
		['aria-keyshortcuts', void 0],
		[
			'aria-label',
			[
				'caption',
				'code',
				'deletion',
				'emphasis',
				'generic',
				'insertion',
				'paragraph',
				'presentation',
				'strong',
				'subscript',
				'superscript',
			],
		],
		[
			'aria-labelledby',
			[
				'caption',
				'code',
				'deletion',
				'emphasis',
				'generic',
				'insertion',
				'paragraph',
				'presentation',
				'strong',
				'subscript',
				'superscript',
			],
		],
		['aria-live', void 0],
		['aria-owns', void 0],
		['aria-relevant', void 0],
		['aria-roledescription', ['generic']],
	];
function bg(t, e) {
	return YS.some(([n, s]) => !(s != null && s.includes(e || '')) && t.hasAttribute(n));
}
function Tg(t) {
	return !Number.isNaN(Number(String(t.getAttribute('tabindex'))));
}
function ZS(t) {
	return !Dg(t) && (ex(t) || Tg(t));
}
function ex(t) {
	const e = ot(t);
	return ['BUTTON', 'DETAILS', 'SELECT', 'TEXTAREA'].includes(e)
		? !0
		: e === 'A' || e === 'AREA'
			? t.hasAttribute('href')
			: e === 'INPUT'
				? !t.hidden
				: !1;
}
const cu = {
		A: (t) => (t.hasAttribute('href') ? 'link' : null),
		AREA: (t) => (t.hasAttribute('href') ? 'link' : null),
		ARTICLE: () => 'article',
		ASIDE: () => 'complementary',
		BLOCKQUOTE: () => 'blockquote',
		BUTTON: () => 'button',
		CAPTION: () => 'caption',
		CODE: () => 'code',
		DATALIST: () => 'listbox',
		DD: () => 'definition',
		DEL: () => 'deletion',
		DETAILS: () => 'group',
		DFN: () => 'term',
		DIALOG: () => 'dialog',
		DT: () => 'term',
		EM: () => 'emphasis',
		FIELDSET: () => 'group',
		FIGURE: () => 'figure',
		FOOTER: (t) => (Li(t, tm) ? null : 'contentinfo'),
		FORM: (t) => (em(t) ? 'form' : null),
		H1: () => 'heading',
		H2: () => 'heading',
		H3: () => 'heading',
		H4: () => 'heading',
		H5: () => 'heading',
		H6: () => 'heading',
		HEADER: (t) => (Li(t, tm) ? null : 'banner'),
		HR: () => 'separator',
		HTML: () => 'document',
		IMG: (t) =>
			t.getAttribute('alt') === '' && !t.getAttribute('title') && !bg(t) && !Tg(t)
				? 'presentation'
				: 'img',
		INPUT: (t) => {
			const e = t.type.toLowerCase();
			if (e === 'search') return t.hasAttribute('list') ? 'combobox' : 'searchbox';
			if (['email', 'tel', 'text', 'url', ''].includes(e)) {
				const n = As(t, t.getAttribute('list'))[0];
				return n && ot(n) === 'DATALIST' ? 'combobox' : 'textbox';
			}
			return e === 'hidden'
				? null
				: e === 'file' && !nf().inputFileRoleTextbox
					? 'button'
					: mx[e] || 'textbox';
		},
		INS: () => 'insertion',
		LI: () => 'listitem',
		MAIN: () => 'main',
		MARK: () => 'mark',
		MATH: () => 'math',
		MENU: () => 'list',
		METER: () => 'meter',
		NAV: () => 'navigation',
		OL: () => 'list',
		OPTGROUP: () => 'group',
		OPTION: () => 'option',
		OUTPUT: () => 'status',
		P: () => 'paragraph',
		PROGRESS: () => 'progressbar',
		SECTION: (t) => (em(t) ? 'region' : null),
		SELECT: (t) => (t.hasAttribute('multiple') || t.size > 1 ? 'listbox' : 'combobox'),
		STRONG: () => 'strong',
		SUB: () => 'subscript',
		SUP: () => 'superscript',
		SVG: () => 'img',
		TABLE: () => 'table',
		TBODY: () => 'rowgroup',
		TD: (t) => {
			const e = Li(t, 'table'),
				n = e ? zl(e) : '';
			return n === 'grid' || n === 'treegrid' ? 'gridcell' : 'cell';
		},
		TEXTAREA: () => 'textbox',
		TFOOT: () => 'rowgroup',
		TH: (t) => {
			if (t.getAttribute('scope') === 'col') return 'columnheader';
			if (t.getAttribute('scope') === 'row') return 'rowheader';
			const e = Li(t, 'table'),
				n = e ? zl(e) : '';
			return n === 'grid' || n === 'treegrid' ? 'gridcell' : 'cell';
		},
		THEAD: () => 'rowgroup',
		TIME: () => 'time',
		TR: () => 'row',
		UL: () => 'list',
	},
	tx = {
		DD: ['DL', 'DIV'],
		DIV: ['DL'],
		DT: ['DL', 'DIV'],
		LI: ['OL', 'UL'],
		TBODY: ['TABLE'],
		TD: ['TR'],
		TFOOT: ['TABLE'],
		TH: ['TR'],
		THEAD: ['TABLE'],
		TR: ['THEAD', 'TBODY', 'TFOOT', 'TABLE'],
	};
function nm(t) {
	var s;
	const e = ((s = cu[ot(t)]) == null ? void 0 : s.call(cu, t)) || '';
	if (!e) return null;
	let n = t;
	for (; n; ) {
		const o = lt(n),
			l = tx[ot(n)];
		if (!l || !o || !l.includes(ot(o))) break;
		const c = zl(o);
		if ((c === 'none' || c === 'presentation') && !Cg(o, c)) return c;
		n = o;
	}
	return e;
}
const nx = [
	'alert',
	'alertdialog',
	'application',
	'article',
	'banner',
	'blockquote',
	'button',
	'caption',
	'cell',
	'checkbox',
	'code',
	'columnheader',
	'combobox',
	'complementary',
	'contentinfo',
	'definition',
	'deletion',
	'dialog',
	'directory',
	'document',
	'emphasis',
	'feed',
	'figure',
	'form',
	'generic',
	'grid',
	'gridcell',
	'group',
	'heading',
	'img',
	'insertion',
	'link',
	'list',
	'listbox',
	'listitem',
	'log',
	'main',
	'mark',
	'marquee',
	'math',
	'meter',
	'menu',
	'menubar',
	'menuitem',
	'menuitemcheckbox',
	'menuitemradio',
	'navigation',
	'none',
	'note',
	'option',
	'paragraph',
	'presentation',
	'progressbar',
	'radio',
	'radiogroup',
	'region',
	'row',
	'rowgroup',
	'rowheader',
	'scrollbar',
	'search',
	'searchbox',
	'separator',
	'slider',
	'spinbutton',
	'status',
	'strong',
	'subscript',
	'superscript',
	'switch',
	'tab',
	'table',
	'tablist',
	'tabpanel',
	'term',
	'textbox',
	'time',
	'timer',
	'toolbar',
	'tooltip',
	'tree',
	'treegrid',
	'treeitem',
];
function zl(t) {
	return (
		(t.getAttribute('role') || '')
			.split(' ')
			.map((n) => n.trim())
			.find((n) => nx.includes(n)) || null
	);
}
function Cg(t, e) {
	return bg(t, e) || ZS(t);
}
function tt(t) {
	const e = zl(t);
	if (!e) return nm(t);
	if (e === 'none' || e === 'presentation') {
		const n = nm(t);
		if (Cg(t, n)) return n;
	}
	return e;
}
function Ng(t) {
	return t === null ? void 0 : t.toLowerCase() === 'true';
}
function Ag(t) {
	return ['STYLE', 'SCRIPT', 'NOSCRIPT', 'TEMPLATE'].includes(ot(t));
}
function zt(t) {
	if (Ag(t)) return !0;
	const e = sr(t),
		n = t.nodeName === 'SLOT';
	if ((e == null ? void 0 : e.display) === 'contents' && !n) {
		for (let o = t.firstChild; o; o = o.nextSibling)
			if ((o.nodeType === 1 && !zt(o)) || (o.nodeType === 3 && kg(o))) return !1;
		return !0;
	}
	return !(t.nodeName === 'OPTION' && !!t.closest('select')) && !n && !Eg(t, e) ? !0 : Ig(t);
}
function Ig(t) {
	let e = Yn == null ? void 0 : Yn.get(t);
	if (e === void 0) {
		if (
			((e = !1), t.parentElement && t.parentElement.shadowRoot && !t.assignedSlot && (e = !0), !e)
		) {
			const n = sr(t);
			e = !n || n.display === 'none' || Ng(t.getAttribute('aria-hidden')) === !0;
		}
		if (!e) {
			const n = lt(t);
			n && (e = Ig(n));
		}
		Yn == null || Yn.set(t, e);
	}
	return e;
}
function As(t, e) {
	if (!e) return [];
	const n = xg(t);
	if (!n) return [];
	try {
		const s = e.split(' ').filter((l) => !!l),
			o = [];
		for (const l of s) {
			const c = n.querySelector('#' + CSS.escape(l));
			c && !o.includes(c) && o.push(c);
		}
		return o;
	} catch {
		return [];
	}
}
function kn(t) {
	return t.trim();
}
function $i(t) {
	return t
		.split(' ')
		.map((e) =>
			e
				.replace(
					/\r\n/g,
					`
`,
				)
				.replace(/[\u200b\u00ad]/g, '')
				.replace(/\s\s*/g, ' '),
		)
		.join(' ')
		.trim();
}
function rm(t, e) {
	const n = [...t.querySelectorAll(e)];
	for (const s of As(t, t.getAttribute('aria-owns')))
		s.matches(e) && n.push(s), n.push(...s.querySelectorAll(e));
	return n;
}
function Ri(t, e) {
	const n = e === '::before' ? mf : e === '::after' ? gf : pf;
	if (n != null && n.has(t)) return n == null ? void 0 : n.get(t);
	const s = sr(t, e);
	let o;
	return (
		s && s.display !== 'none' && s.visibility !== 'hidden' && (o = rx(t, s.content, !!e)),
		e &&
			o !== void 0 &&
			((s == null ? void 0 : s.display) || 'inline') !== 'inline' &&
			(o = ' ' + o + ' '),
		n && n.set(t, o),
		o
	);
}
function rx(t, e, n) {
	if (!(!e || e === 'none' || e === 'normal'))
		try {
			let s = zm(e).filter((u) => !(u instanceof Ol));
			const o = s.findIndex((u) => u instanceof Ze && u.value === '/');
			if (o !== -1) s = s.slice(o + 1);
			else if (!n) return;
			const l = [];
			let c = 0;
			for (; c < s.length; )
				if (s[c] instanceof Ju) l.push(s[c].value), c++;
				else if (
					c + 2 < s.length &&
					s[c] instanceof Oi &&
					s[c].value === 'attr' &&
					s[c + 1] instanceof Qu &&
					s[c + 2] instanceof Gu
				) {
					const u = s[c + 1].value;
					l.push(t.getAttribute(u) || ''), (c += 3);
				} else return;
			return l.join('');
		} catch {}
}
function Lg(t) {
	const e = t.getAttribute('aria-labelledby');
	if (e === null) return null;
	const n = As(t, e);
	return n.length ? n : null;
}
function sx(t, e) {
	const n = [
			'button',
			'cell',
			'checkbox',
			'columnheader',
			'gridcell',
			'heading',
			'link',
			'menuitem',
			'menuitemcheckbox',
			'menuitemradio',
			'option',
			'radio',
			'row',
			'rowheader',
			'switch',
			'tab',
			'tooltip',
			'treeitem',
		].includes(t),
		s =
			e &&
			[
				'',
				'caption',
				'code',
				'contentinfo',
				'definition',
				'deletion',
				'emphasis',
				'insertion',
				'list',
				'listitem',
				'mark',
				'none',
				'paragraph',
				'presentation',
				'region',
				'row',
				'rowgroup',
				'section',
				'strong',
				'subscript',
				'superscript',
				'table',
				'term',
				'time',
			].includes(t);
	return n || s;
}
function Bi(t, e) {
	const n = e ? ff : uf;
	let s = n == null ? void 0 : n.get(t);
	return (
		s === void 0 &&
			((s = ''),
			[
				'caption',
				'code',
				'definition',
				'deletion',
				'emphasis',
				'generic',
				'insertion',
				'mark',
				'paragraph',
				'presentation',
				'strong',
				'subscript',
				'suggestion',
				'superscript',
				'term',
				'time',
			].includes(tt(t) || '') ||
				(s = $i(
					en(t, { includeHidden: e, visitedElements: new Set(), embeddedInTargetElement: 'self' }),
				)),
			n == null || n.set(t, s)),
		s
	);
}
function sm(t, e) {
	const n = e ? hf : df;
	let s = n == null ? void 0 : n.get(t);
	if (s === void 0) {
		if (((s = ''), t.hasAttribute('aria-describedby'))) {
			const o = As(t, t.getAttribute('aria-describedby'));
			s = $i(
				o
					.map((l) =>
						en(l, {
							includeHidden: e,
							visitedElements: new Set(),
							embeddedInDescribedBy: { element: l, hidden: zt(l) },
						}),
					)
					.join(' '),
			);
		} else
			t.hasAttribute('aria-description')
				? (s = $i(t.getAttribute('aria-description') || ''))
				: (s = $i(t.getAttribute('title') || ''));
		n == null || n.set(t, s);
	}
	return s;
}
function ix(t) {
	const e = t.getAttribute('aria-invalid');
	return !e || e.trim() === '' || e.toLocaleLowerCase() === 'false'
		? 'false'
		: e === 'true' || e === 'grammar' || e === 'spelling'
			? e
			: 'true';
}
function ox(t) {
	if ('validity' in t) {
		const e = t.validity;
		return (e == null ? void 0 : e.valid) === !1;
	}
	return !1;
}
function lx(t) {
	const e = ms;
	let n = ms == null ? void 0 : ms.get(t);
	if (n === void 0) {
		n = '';
		const s = ix(t) !== 'false',
			o = ox(t);
		if (s || o) {
			const l = t.getAttribute('aria-errormessage');
			n = As(t, l)
				.map((d) =>
					$i(
						en(d, {
							visitedElements: new Set(),
							embeddedInDescribedBy: { element: d, hidden: zt(d) },
						}),
					),
				)
				.join(' ')
				.trim();
		}
		e == null || e.set(t, n);
	}
	return n;
}
function en(t, e) {
	var d, p, g, y;
	if (e.visitedElements.has(t)) return '';
	const n = {
		...e,
		embeddedInTargetElement:
			e.embeddedInTargetElement === 'self' ? 'descendant' : e.embeddedInTargetElement,
	};
	if (!e.includeHidden) {
		const v =
			!!((d = e.embeddedInLabelledBy) != null && d.hidden) ||
			!!((p = e.embeddedInDescribedBy) != null && p.hidden) ||
			!!((g = e.embeddedInNativeTextAlternative) != null && g.hidden) ||
			!!((y = e.embeddedInLabel) != null && y.hidden);
		if (Ag(t) || (!v && zt(t))) return e.visitedElements.add(t), '';
	}
	const s = Lg(t);
	if (!e.embeddedInLabelledBy) {
		const v = (s || [])
			.map((S) =>
				en(S, {
					...e,
					embeddedInLabelledBy: { element: S, hidden: zt(S) },
					embeddedInDescribedBy: void 0,
					embeddedInTargetElement: void 0,
					embeddedInLabel: void 0,
					embeddedInNativeTextAlternative: void 0,
				}),
			)
			.join(' ');
		if (v) return v;
	}
	const o = tt(t) || '',
		l = ot(t);
	if (e.embeddedInLabel || e.embeddedInLabelledBy || e.embeddedInTargetElement === 'descendant') {
		const v = [...(t.labels || [])].includes(t),
			S = (s || []).includes(t);
		if (!v && !S) {
			if (o === 'textbox')
				return (
					e.visitedElements.add(t),
					l === 'INPUT' || l === 'TEXTAREA' ? t.value : t.textContent || ''
				);
			if (['combobox', 'listbox'].includes(o)) {
				e.visitedElements.add(t);
				let k;
				if (l === 'SELECT')
					(k = [...t.selectedOptions]), !k.length && t.options.length && k.push(t.options[0]);
				else {
					const _ = o === 'combobox' ? rm(t, '*').find((E) => tt(E) === 'listbox') : t;
					k = _ ? rm(_, '[aria-selected="true"]').filter((E) => tt(E) === 'option') : [];
				}
				return !k.length && l === 'INPUT' ? t.value : k.map((_) => en(_, n)).join(' ');
			}
			if (['progressbar', 'scrollbar', 'slider', 'spinbutton', 'meter'].includes(o))
				return (
					e.visitedElements.add(t),
					t.hasAttribute('aria-valuetext')
						? t.getAttribute('aria-valuetext') || ''
						: t.hasAttribute('aria-valuenow')
							? t.getAttribute('aria-valuenow') || ''
							: t.getAttribute('value') || ''
				);
			if (['menu'].includes(o)) return e.visitedElements.add(t), '';
		}
	}
	const c = t.getAttribute('aria-label') || '';
	if (kn(c)) return e.visitedElements.add(t), c;
	if (!['presentation', 'none'].includes(o)) {
		if (l === 'INPUT' && ['button', 'submit', 'reset'].includes(t.type)) {
			e.visitedElements.add(t);
			const v = t.value || '';
			return kn(v)
				? v
				: t.type === 'submit'
					? 'Submit'
					: t.type === 'reset'
						? 'Reset'
						: t.getAttribute('title') || '';
		}
		if (!nf().inputFileRoleTextbox && l === 'INPUT' && t.type === 'file') {
			e.visitedElements.add(t);
			const v = t.labels || [];
			return v.length && !e.embeddedInLabelledBy ? ki(v, e) : 'Choose File';
		}
		if (l === 'INPUT' && t.type === 'image') {
			e.visitedElements.add(t);
			const v = t.labels || [];
			if (v.length && !e.embeddedInLabelledBy) return ki(v, e);
			const S = t.getAttribute('alt') || '';
			if (kn(S)) return S;
			const k = t.getAttribute('title') || '';
			return kn(k) ? k : 'Submit';
		}
		if (!s && l === 'BUTTON') {
			e.visitedElements.add(t);
			const v = t.labels || [];
			if (v.length) return ki(v, e);
		}
		if (!s && l === 'OUTPUT') {
			e.visitedElements.add(t);
			const v = t.labels || [];
			return v.length ? ki(v, e) : t.getAttribute('title') || '';
		}
		if (!s && (l === 'TEXTAREA' || l === 'SELECT' || l === 'INPUT')) {
			e.visitedElements.add(t);
			const v = t.labels || [];
			if (v.length) return ki(v, e);
			const S =
					(l === 'INPUT' &&
						['text', 'password', 'search', 'tel', 'email', 'url'].includes(t.type)) ||
					l === 'TEXTAREA',
				k = t.getAttribute('placeholder') || '',
				_ = t.getAttribute('title') || '';
			return !S || _ ? _ : k;
		}
		if (!s && l === 'FIELDSET') {
			e.visitedElements.add(t);
			for (let S = t.firstElementChild; S; S = S.nextElementSibling)
				if (ot(S) === 'LEGEND')
					return en(S, { ...n, embeddedInNativeTextAlternative: { element: S, hidden: zt(S) } });
			return t.getAttribute('title') || '';
		}
		if (!s && l === 'FIGURE') {
			e.visitedElements.add(t);
			for (let S = t.firstElementChild; S; S = S.nextElementSibling)
				if (ot(S) === 'FIGCAPTION')
					return en(S, { ...n, embeddedInNativeTextAlternative: { element: S, hidden: zt(S) } });
			return t.getAttribute('title') || '';
		}
		if (l === 'IMG') {
			e.visitedElements.add(t);
			const v = t.getAttribute('alt') || '';
			return kn(v) ? v : t.getAttribute('title') || '';
		}
		if (l === 'TABLE') {
			e.visitedElements.add(t);
			for (let S = t.firstElementChild; S; S = S.nextElementSibling)
				if (ot(S) === 'CAPTION')
					return en(S, { ...n, embeddedInNativeTextAlternative: { element: S, hidden: zt(S) } });
			const v = t.getAttribute('summary') || '';
			if (v) return v;
		}
		if (l === 'AREA') {
			e.visitedElements.add(t);
			const v = t.getAttribute('alt') || '';
			return kn(v) ? v : t.getAttribute('title') || '';
		}
		if (l === 'SVG' || t.ownerSVGElement) {
			e.visitedElements.add(t);
			for (let v = t.firstElementChild; v; v = v.nextElementSibling)
				if (ot(v) === 'TITLE' && v.ownerSVGElement)
					return en(v, { ...n, embeddedInLabelledBy: { element: v, hidden: zt(v) } });
		}
		if (t.ownerSVGElement && l === 'A') {
			const v = t.getAttribute('xlink:title') || '';
			if (kn(v)) return e.visitedElements.add(t), v;
		}
	}
	const u = l === 'SUMMARY' && !['presentation', 'none'].includes(o);
	if (
		sx(o, e.embeddedInTargetElement === 'descendant') ||
		u ||
		e.embeddedInLabelledBy ||
		e.embeddedInDescribedBy ||
		e.embeddedInLabel ||
		e.embeddedInNativeTextAlternative
	) {
		e.visitedElements.add(t);
		const v = ax(t, n);
		if (e.embeddedInTargetElement === 'self' ? kn(v) : v) return v;
	}
	if (!['presentation', 'none'].includes(o) || l === 'IFRAME') {
		e.visitedElements.add(t);
		const v = t.getAttribute('title') || '';
		if (kn(v)) return v;
	}
	return e.visitedElements.add(t), '';
}
function ax(t, e) {
	const n = [],
		s = (l, c) => {
			var u;
			if (!(c && l.assignedSlot))
				if (l.nodeType === 1) {
					const d = ((u = sr(l)) == null ? void 0 : u.display) || 'inline';
					let p = en(l, e);
					(d !== 'inline' || l.nodeName === 'BR') && (p = ' ' + p + ' '), n.push(p);
				} else l.nodeType === 3 && n.push(l.textContent || '');
		};
	n.push(Ri(t, '::before') || '');
	const o = Ri(t);
	if (o !== void 0) n.push(o);
	else {
		const l = t.nodeName === 'SLOT' ? t.assignedNodes() : [];
		if (l.length) for (const c of l) s(c, !1);
		else {
			for (let c = t.firstChild; c; c = c.nextSibling) s(c, !0);
			if (t.shadowRoot) for (let c = t.shadowRoot.firstChild; c; c = c.nextSibling) s(c, !0);
			for (const c of As(t, t.getAttribute('aria-owns'))) s(c, !0);
		}
	}
	return n.push(Ri(t, '::after') || ''), n.join('');
}
const rf = ['gridcell', 'option', 'row', 'tab', 'rowheader', 'columnheader', 'treeitem'];
function Mg(t) {
	return ot(t) === 'OPTION'
		? t.selected
		: rf.includes(tt(t) || '')
			? Ng(t.getAttribute('aria-selected')) === !0
			: !1;
}
const sf = [
	'checkbox',
	'menuitemcheckbox',
	'option',
	'radio',
	'switch',
	'menuitemradio',
	'treeitem',
];
function jg(t) {
	const e = of(t, !0);
	return e === 'error' ? !1 : e;
}
function cx(t) {
	return of(t, !0);
}
function ux(t) {
	return of(t, !1);
}
function of(t, e) {
	const n = ot(t);
	if (e && n === 'INPUT' && t.indeterminate) return 'mixed';
	if (n === 'INPUT' && ['checkbox', 'radio'].includes(t.type)) return t.checked;
	if (sf.includes(tt(t) || '')) {
		const s = t.getAttribute('aria-checked');
		return s === 'true' ? !0 : e && s === 'mixed' ? 'mixed' : !1;
	}
	return 'error';
}
const fx = [
	'checkbox',
	'combobox',
	'grid',
	'gridcell',
	'listbox',
	'radiogroup',
	'slider',
	'spinbutton',
	'textbox',
	'columnheader',
	'rowheader',
	'searchbox',
	'switch',
	'treegrid',
];
function dx(t) {
	const e = ot(t);
	return ['INPUT', 'TEXTAREA', 'SELECT'].includes(e)
		? t.hasAttribute('readonly')
		: fx.includes(tt(t) || '')
			? t.getAttribute('aria-readonly') === 'true'
			: t.isContentEditable
				? !1
				: 'error';
}
const lf = ['button'];
function Pg(t) {
	if (lf.includes(tt(t) || '')) {
		const e = t.getAttribute('aria-pressed');
		if (e === 'true') return !0;
		if (e === 'mixed') return 'mixed';
	}
	return !1;
}
const af = [
	'application',
	'button',
	'checkbox',
	'combobox',
	'gridcell',
	'link',
	'listbox',
	'menuitem',
	'row',
	'rowheader',
	'tab',
	'treeitem',
	'columnheader',
	'menuitemcheckbox',
	'menuitemradio',
	'rowheader',
	'switch',
];
function Og(t) {
	if (ot(t) === 'DETAILS') return t.open;
	if (af.includes(tt(t) || '')) {
		const e = t.getAttribute('aria-expanded');
		return e === null ? void 0 : e === 'true';
	}
}
const cf = ['heading', 'listitem', 'row', 'treeitem'];
function $g(t) {
	const e = { H1: 1, H2: 2, H3: 3, H4: 4, H5: 5, H6: 6 }[ot(t)];
	if (e) return e;
	if (cf.includes(tt(t) || '')) {
		const n = t.getAttribute('aria-level'),
			s = n === null ? Number.NaN : Number(n);
		if (Number.isInteger(s) && s >= 1) return s;
	}
	return 0;
}
const Rg = [
	'application',
	'button',
	'composite',
	'gridcell',
	'group',
	'input',
	'link',
	'menuitem',
	'scrollbar',
	'separator',
	'tab',
	'checkbox',
	'columnheader',
	'combobox',
	'grid',
	'listbox',
	'menu',
	'menubar',
	'menuitemcheckbox',
	'menuitemradio',
	'option',
	'radio',
	'radiogroup',
	'row',
	'rowheader',
	'searchbox',
	'select',
	'slider',
	'spinbutton',
	'switch',
	'tablist',
	'textbox',
	'toolbar',
	'tree',
	'treegrid',
	'treeitem',
];
function Hl(t) {
	return Dg(t) || Fg(t);
}
function Dg(t) {
	return (
		['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'OPTION', 'OPTGROUP'].includes(t.tagName) &&
		(t.hasAttribute('disabled') || hx(t))
	);
}
function hx(t) {
	const e = t == null ? void 0 : t.closest('FIELDSET[DISABLED]');
	if (!e) return !1;
	const n = e.querySelector(':scope > LEGEND');
	return !n || !n.contains(t);
}
function Fg(t, e = !1) {
	if (!t) return !1;
	if (e || Rg.includes(tt(t) || '')) {
		const n = (t.getAttribute('aria-disabled') || '').toLowerCase();
		return n === 'true' ? !0 : n === 'false' ? !1 : Fg(lt(t), !0);
	}
	return !1;
}
function ki(t, e) {
	return [...t]
		.map((n) =>
			en(n, {
				...e,
				embeddedInLabel: { element: n, hidden: zt(n) },
				embeddedInNativeTextAlternative: void 0,
				embeddedInLabelledBy: void 0,
				embeddedInDescribedBy: void 0,
				embeddedInTargetElement: void 0,
			}),
		)
		.filter((n) => !!n)
		.join(' ');
}
function px(t) {
	const e = yf;
	let n = t,
		s;
	const o = [];
	for (; n; n = lt(n)) {
		const l = e.get(n);
		if (l !== void 0) {
			s = l;
			break;
		}
		o.push(n);
		const c = sr(n);
		if (!c) {
			s = !0;
			break;
		}
		const u = c.pointerEvents;
		if (u) {
			s = u !== 'none';
			break;
		}
	}
	s === void 0 && (s = !0);
	for (const l of o) e.set(l, s);
	return s;
}
let uf,
	ff,
	df,
	hf,
	ms,
	Yn,
	pf,
	mf,
	gf,
	yf,
	Bg = 0;
function vf() {
	++Bg,
		uf ?? (uf = new Map()),
		ff ?? (ff = new Map()),
		df ?? (df = new Map()),
		hf ?? (hf = new Map()),
		ms ?? (ms = new Map()),
		Yn ?? (Yn = new Map()),
		pf ?? (pf = new Map()),
		mf ?? (mf = new Map()),
		gf ?? (gf = new Map()),
		yf ?? (yf = new Map());
}
function wf() {
	--Bg ||
		((uf = void 0),
		(ff = void 0),
		(df = void 0),
		(hf = void 0),
		(ms = void 0),
		(Yn = void 0),
		(pf = void 0),
		(mf = void 0),
		(gf = void 0),
		(yf = void 0));
}
const mx = {
	button: 'button',
	checkbox: 'checkbox',
	image: 'button',
	number: 'spinbutton',
	radio: 'radio',
	range: 'slider',
	reset: 'button',
	submit: 'button',
};
function gx(t) {
	return zg(t) ? "'" + t.replace(/'/g, "''") + "'" : t;
}
function uu(t) {
	return zg(t)
		? '"' +
				t.replace(/[\\"\x00-\x1f\x7f-\x9f]/g, (e) => {
					switch (e) {
						case '\\':
							return '\\\\';
						case '"':
							return '\\"';
						case '\b':
							return '\\b';
						case '\f':
							return '\\f';
						case `
`:
							return '\\n';
						case '\r':
							return '\\r';
						case '	':
							return '\\t';
						default:
							return '\\x' + e.charCodeAt(0).toString(16).padStart(2, '0');
					}
				}) +
				'"'
		: t;
}
function zg(t) {
	return !!(
		t.length === 0 ||
		/^\s|\s$/.test(t) ||
		/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/.test(t) ||
		/^-/.test(t) ||
		/[\n:](\s|$)/.test(t) ||
		/\s#/.test(t) ||
		/[\n\r]/.test(t) ||
		/^[&*\],?!>|@"'#%]/.test(t) ||
		/[{}`]/.test(t) ||
		/^\[/.test(t) ||
		!isNaN(Number(t)) ||
		['y', 'n', 'yes', 'no', 'true', 'false', 'on', 'off', 'null'].includes(t.toLowerCase())
	);
}
let yx = 0;
function Sf(t, e) {
	const n = new Set(),
		s = {
			root: {
				role: 'fragment',
				name: '',
				children: [],
				element: t,
				props: {},
				box: Bl(t),
				receivesPointerEvents: !0,
			},
			elements: new Map(),
		},
		o = (c, u) => {
			if (n.has(u)) return;
			if ((n.add(u), u.nodeType === Node.TEXT_NODE && u.nodeValue)) {
				const v = u.nodeValue;
				c.role !== 'textbox' && v && c.children.push(u.nodeValue || '');
				return;
			}
			if (u.nodeType !== Node.ELEMENT_NODE) return;
			const d = u;
			let p = !zt(d);
			if ((e != null && e.forAI && (p = p || Tr(d)), !p)) return;
			const g = [];
			if (d.hasAttribute('aria-owns')) {
				const v = d.getAttribute('aria-owns').split(/\s+/);
				for (const S of v) {
					const k = t.ownerDocument.getElementById(S);
					k && g.push(k);
				}
			}
			const y = vx(d, e);
			y && (y.ref && s.elements.set(y.ref, d), c.children.push(y)), l(y || c, d, g);
		};
	function l(c, u, d = []) {
		var v;
		const g =
			(((v = sr(u)) == null ? void 0 : v.display) || 'inline') !== 'inline' || u.nodeName === 'BR'
				? ' '
				: '';
		g && c.children.push(g), c.children.push(Ri(u, '::before') || '');
		const y = u.nodeName === 'SLOT' ? u.assignedNodes() : [];
		if (y.length) for (const S of y) o(c, S);
		else {
			for (let S = u.firstChild; S; S = S.nextSibling) S.assignedSlot || o(c, S);
			if (u.shadowRoot) for (let S = u.shadowRoot.firstChild; S; S = S.nextSibling) o(c, S);
		}
		for (const S of d) o(c, S);
		if (
			(c.children.push(Ri(u, '::after') || ''),
			g && c.children.push(g),
			c.children.length === 1 && c.name === c.children[0] && (c.children = []),
			c.role === 'link' && u.hasAttribute('href'))
		) {
			const S = u.getAttribute('href');
			c.props.url = S;
		}
	}
	vf();
	try {
		o(s.root, t);
	} finally {
		wf();
	}
	return Sx(s.root), wx(s.root), s;
}
function im(t, e, n, s) {
	if (!(s != null && s.forAI)) return;
	let o;
	return (
		(o = t._ariaRef),
		(!o || o.role !== e || o.name !== n) &&
			((o = { role: e, name: n, ref: ((s == null ? void 0 : s.refPrefix) ?? '') + 'e' + ++yx }),
			(t._ariaRef = o)),
		o.ref
	);
}
function vx(t, e) {
	if (t.nodeName === 'IFRAME')
		return {
			role: 'iframe',
			name: '',
			ref: im(t, 'iframe', '', e),
			children: [],
			props: {},
			element: t,
			box: Bl(t),
			receivesPointerEvents: !0,
		};
	const n = e != null && e.forAI ? 'generic' : null,
		s = tt(t) ?? n;
	if (!s || s === 'presentation' || s === 'none') return null;
	const o = mt(Bi(t, !1) || ''),
		l = px(t),
		c = {
			role: s,
			name: o,
			ref: im(t, s, o, e),
			children: [],
			props: {},
			element: t,
			box: Bl(t),
			receivesPointerEvents: l,
		};
	return (
		sf.includes(s) && (c.checked = jg(t)),
		Rg.includes(s) && (c.disabled = Hl(t)),
		af.includes(s) && (c.expanded = Og(t)),
		cf.includes(s) && (c.level = $g(t)),
		lf.includes(s) && (c.pressed = Pg(t)),
		rf.includes(s) && (c.selected = Mg(t)),
		(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) &&
			t.type !== 'checkbox' &&
			t.type !== 'radio' &&
			(t.type !== 'file' || nf().inputFileRoleTextbox) &&
			(c.children = [t.value]),
		c
	);
}
function wx(t) {
	const e = (n) => {
		const s = [];
		for (const l of n.children || []) {
			if (typeof l == 'string') {
				s.push(l);
				continue;
			}
			const c = e(l);
			s.push(...c);
		}
		return n.role === 'generic' && s.length <= 1 && s.every((l) => typeof l != 'string' && Ug(l))
			? s
			: ((n.children = s), [n]);
	};
	e(t);
}
function Sx(t) {
	const e = (s, o) => {
			if (!s.length) return;
			const l = mt(s.join(''));
			l && o.push(l), (s.length = 0);
		},
		n = (s) => {
			const o = [],
				l = [];
			for (const c of s.children || [])
				typeof c == 'string' ? l.push(c) : (e(l, o), n(c), o.push(c));
			e(l, o),
				(s.children = o.length ? o : []),
				s.children.length === 1 && s.children[0] === s.name && (s.children = []);
		};
	n(t);
}
function xf(t, e) {
	return e ? (t ? (typeof e == 'string' ? t === e : !!t.match(new RegExp(e.pattern))) : !1) : !0;
}
function xx(t, e) {
	return xf(t, e.text);
}
function _x(t, e) {
	return xf(t, e.name);
}
function Ex(t, e) {
	const n = Sf(t);
	return {
		matches: Hg(n.root, e, !1, !1),
		received: { raw: Pu(n, { mode: 'raw' }), regex: Pu(n, { mode: 'regex' }) },
	};
}
function kx(t, e) {
	const n = Sf(t).root;
	return Hg(n, e, !0, !1).map((o) => o.element);
}
function _f(t, e, n) {
	var s;
	return typeof t == 'string' && e.kind === 'text'
		? xx(t, e)
		: t === null ||
				typeof t != 'object' ||
				e.kind !== 'role' ||
				(e.role !== 'fragment' && e.role !== t.role) ||
				(e.checked !== void 0 && e.checked !== t.checked) ||
				(e.disabled !== void 0 && e.disabled !== t.disabled) ||
				(e.expanded !== void 0 && e.expanded !== t.expanded) ||
				(e.level !== void 0 && e.level !== t.level) ||
				(e.pressed !== void 0 && e.pressed !== t.pressed) ||
				(e.selected !== void 0 && e.selected !== t.selected) ||
				!_x(t.name, e) ||
				!xf(t.props.url, (s = e.props) == null ? void 0 : s.url)
			? !1
			: e.containerMode === 'contain'
				? lm(t.children || [], e.children || [])
				: e.containerMode === 'equal'
					? om(t.children || [], e.children || [], !1)
					: e.containerMode === 'deep-equal' || n
						? om(t.children || [], e.children || [], !0)
						: lm(t.children || [], e.children || []);
}
function om(t, e, n) {
	if (e.length !== t.length) return !1;
	for (let s = 0; s < e.length; ++s) if (!_f(t[s], e[s], n)) return !1;
	return !0;
}
function lm(t, e) {
	if (e.length > t.length) return !1;
	const n = t.slice(),
		s = e.slice();
	for (const o of s) {
		let l = n.shift();
		for (; l && !_f(l, o, !1); ) l = n.shift();
		if (!l) return !1;
	}
	return !0;
}
function Hg(t, e, n, s) {
	const o = [],
		l = (c, u) => {
			if (_f(c, e, s)) {
				const d = typeof c == 'string' ? u : c;
				return d && o.push(d), !n;
			}
			if (typeof c == 'string') return !1;
			for (const d of c.children || []) if (l(d, c)) return !0;
			return !1;
		};
	return l(t, null), o;
}
function Pu(t, e) {
	const n = [],
		s = (e == null ? void 0 : e.mode) === 'regex' ? Tx : () => !0,
		o = (e == null ? void 0 : e.mode) === 'regex' ? bx : (u) => u,
		l = (u, d, p) => {
			if (typeof u == 'string') {
				if (d && !s(d, u)) return;
				const S = uu(o(u));
				S && n.push(p + '- text: ' + S);
				return;
			}
			let g = u.role;
			if (u.name && u.name.length <= 900) {
				const S = o(u.name);
				if (S) {
					const k = S.startsWith('/') && S.endsWith('/') ? S : JSON.stringify(S);
					g += ' ' + k;
				}
			}
			if (
				(u.checked === 'mixed' && (g += ' [checked=mixed]'),
				u.checked === !0 && (g += ' [checked]'),
				u.disabled && (g += ' [disabled]'),
				u.expanded && (g += ' [expanded]'),
				u.level && (g += ` [level=${u.level}]`),
				u.pressed === 'mixed' && (g += ' [pressed=mixed]'),
				u.pressed === !0 && (g += ' [pressed]'),
				u.selected === !0 && (g += ' [selected]'),
				e != null && e.forAI && Ug(u))
			) {
				const S = u.ref,
					k = Cx(u) ? ' [cursor=pointer]' : '';
				S && (g += ` [ref=${S}]${k}`);
			}
			const y = p + '- ' + gx(g),
				v = !!Object.keys(u.props).length;
			if (!u.children.length && !v) n.push(y);
			else if (u.children.length === 1 && typeof u.children[0] == 'string' && !v) {
				const S = s(u, u.children[0]) ? o(u.children[0]) : null;
				S ? n.push(y + ': ' + uu(S)) : n.push(y);
			} else {
				n.push(y + ':');
				for (const [S, k] of Object.entries(u.props)) n.push(p + '  - /' + S + ': ' + uu(k));
				for (const S of u.children || []) l(S, u, p + '  ');
			}
		},
		c = t.root;
	if (c.role === 'fragment') for (const u of c.children || []) l(u, c, '');
	else l(c, null, '');
	return n.join(`
`);
}
function bx(t) {
	const e = [
		{ regex: /\b[\d,.]+[bkmBKM]+\b/, replacement: '[\\d,.]+[bkmBKM]+' },
		{ regex: /\b\d+[hmsp]+\b/, replacement: '\\d+[hmsp]+' },
		{ regex: /\b[\d,.]+[hmsp]+\b/, replacement: '[\\d,.]+[hmsp]+' },
		{ regex: /\b\d+,\d+\b/, replacement: '\\d+,\\d+' },
		{ regex: /\b\d+\.\d{2,}\b/, replacement: '\\d+\\.\\d+' },
		{ regex: /\b\d{2,}\.\d+\b/, replacement: '\\d+\\.\\d+' },
		{ regex: /\b\d{2,}\b/, replacement: '\\d+' },
	];
	let n = '',
		s = 0;
	const o = new RegExp(e.map((l) => '(' + l.regex.source + ')').join('|'), 'g');
	return (
		t.replace(o, (l, ...c) => {
			const u = c[c.length - 2],
				d = c.slice(0, -2);
			n += Rl(t.slice(s, u));
			for (let p = 0; p < d.length; p++)
				if (d[p]) {
					const { replacement: g } = e[p];
					n += g;
					break;
				}
			return (s = u + l.length), l;
		}),
		n ? ((n += Rl(t.slice(s))), String(new RegExp(n))) : t
	);
}
function Tx(t, e) {
	if (!e.length) return !1;
	if (!t.name) return !0;
	if (t.name.length > e.length) return !1;
	const n = e.length <= 200 && t.name.length <= 200 ? c1(e, t.name) : '';
	let s = e;
	for (; n && s.includes(n); ) s = s.replace(n, '');
	return s.trim().length / e.length > 0.1;
}
function Ug(t) {
	return t.box.visible && t.receivesPointerEvents;
}
function Cx(t) {
	var e;
	return ((e = t.box.style) == null ? void 0 : e.cursor) === 'pointer';
}
const am =
	':host{font-size:13px;font-family:system-ui,Ubuntu,Droid Sans,sans-serif;color:#333}svg{position:absolute;height:0}x-pw-tooltip{-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px);background-color:#fff;border-radius:6px;box-shadow:0 .5rem 1.2rem #0000004d;display:none;font-size:12.8px;font-weight:400;left:0;line-height:1.5;max-width:600px;position:absolute;top:0;padding:0;flex-direction:column;overflow:hidden}x-pw-tooltip-line{display:flex;max-width:600px;padding:6px;-webkit-user-select:none;user-select:none;cursor:pointer}x-pw-tooltip-line.selectable:hover{background-color:#f2f2f2;overflow:hidden}x-pw-tooltip-footer{display:flex;max-width:600px;padding:6px;-webkit-user-select:none;user-select:none;color:#777}x-pw-dialog{background-color:#fff;pointer-events:auto;border-radius:6px;box-shadow:0 .5rem 1.2rem #0000004d;display:flex;flex-direction:column;position:absolute;width:400px;height:150px;z-index:10;font-size:13px}x-pw-dialog-body{display:flex;flex-direction:column;flex:auto}x-pw-dialog-body label{margin:5px 8px;display:flex;flex-direction:row;align-items:center}x-pw-highlight{position:absolute;top:0;left:0;width:0;height:0}x-pw-action-point{position:absolute;width:20px;height:20px;background:red;border-radius:10px;margin:-10px 0 0 -10px;z-index:2}x-pw-separator{height:1px;margin:6px 9px;background:#949494e5}x-pw-tool-gripper{height:28px;width:24px;margin:2px 0;cursor:grab}x-pw-tool-gripper:active{cursor:grabbing}x-pw-tool-gripper>x-div{width:16px;height:16px;margin:6px 4px;clip-path:url(#icon-gripper);background-color:#555}x-pw-tools-list>label{display:flex;align-items:center;margin:0 10px;-webkit-user-select:none;user-select:none}x-pw-tools-list{display:flex;width:100%;border-bottom:1px solid #dddddd}x-pw-tool-item{pointer-events:auto;height:28px;width:28px;border-radius:3px}x-pw-tool-item:not(.disabled){cursor:pointer}x-pw-tool-item:not(.disabled):hover{background-color:#dbdbdb}x-pw-tool-item.toggled{background-color:#8acae480}x-pw-tool-item.toggled:not(.disabled):hover{background-color:#8acae4c4}x-pw-tool-item>x-div{width:16px;height:16px;margin:6px;background-color:#3a3a3a}x-pw-tool-item.disabled>x-div{background-color:#61616180;cursor:default}x-pw-tool-item.record.toggled{background-color:transparent}x-pw-tool-item.record.toggled:not(.disabled):hover{background-color:#dbdbdb}x-pw-tool-item.record.toggled>x-div{background-color:#a1260d}x-pw-tool-item.record.disabled.toggled>x-div{opacity:.8}x-pw-tool-item.accept>x-div{background-color:#388a34}x-pw-tool-item.record>x-div{clip-path:url(#icon-circle-large-filled)}x-pw-tool-item.pick-locator>x-div{clip-path:url(#icon-inspect)}x-pw-tool-item.text>x-div{clip-path:url(#icon-whole-word)}x-pw-tool-item.visibility>x-div{clip-path:url(#icon-eye)}x-pw-tool-item.value>x-div{clip-path:url(#icon-symbol-constant)}x-pw-tool-item.snapshot>x-div{clip-path:url(#icon-gist)}x-pw-tool-item.accept>x-div{clip-path:url(#icon-check)}x-pw-tool-item.cancel>x-div{clip-path:url(#icon-close)}x-pw-tool-item.succeeded>x-div{clip-path:url(#icon-pass);background-color:#388a34!important}x-pw-overlay{position:absolute;top:0;max-width:min-content;z-index:2147483647;background:transparent;pointer-events:auto}x-pw-overlay x-pw-tools-list{background-color:#fffd;box-shadow:#0000001a 0 5px 5px;border-radius:3px;border-bottom:none}x-pw-overlay x-pw-tool-item{margin:2px}textarea.text-editor{font-family:system-ui,Ubuntu,Droid Sans,sans-serif;flex:auto;border:none;margin:6px 10px;color:#333;outline:1px solid transparent!important;resize:none;padding:0;font-size:13px}textarea.text-editor.does-not-match{outline:1px solid red!important}x-div{display:block}x-spacer{flex:auto}*{box-sizing:border-box}*[hidden]{display:none!important}x-locator-editor{flex:none;width:100%;height:60px;padding:4px;border-bottom:1px solid #dddddd;outline:1px solid transparent}x-locator-editor.does-not-match{outline:1px solid red}.CodeMirror{width:100%!important;height:100%!important}';
class fu {
	constructor(e) {
		(this._renderedEntries = []), (this._language = 'javascript'), (this._injectedScript = e);
		const n = e.document;
		(this._isUnderTest = e.isUnderTest),
			(this._glassPaneElement = n.createElement('x-pw-glass')),
			(this._glassPaneElement.style.position = 'fixed'),
			(this._glassPaneElement.style.top = '0'),
			(this._glassPaneElement.style.right = '0'),
			(this._glassPaneElement.style.bottom = '0'),
			(this._glassPaneElement.style.left = '0'),
			(this._glassPaneElement.style.zIndex = '2147483646'),
			(this._glassPaneElement.style.pointerEvents = 'none'),
			(this._glassPaneElement.style.display = 'flex'),
			(this._glassPaneElement.style.backgroundColor = 'transparent');
		for (const s of [
			'click',
			'auxclick',
			'dragstart',
			'input',
			'keydown',
			'keyup',
			'pointerdown',
			'pointerup',
			'mousedown',
			'mouseup',
			'mouseleave',
			'focus',
			'scroll',
		])
			this._glassPaneElement.addEventListener(s, (o) => {
				o.stopPropagation(), o.stopImmediatePropagation();
			});
		if (
			((this._actionPointElement = n.createElement('x-pw-action-point')),
			this._actionPointElement.setAttribute('hidden', 'true'),
			(this._glassPaneShadow = this._glassPaneElement.attachShadow({
				mode: this._isUnderTest ? 'open' : 'closed',
			})),
			typeof this._glassPaneShadow.adoptedStyleSheets.push == 'function')
		) {
			const s = new this._injectedScript.window.CSSStyleSheet();
			s.replaceSync(am), this._glassPaneShadow.adoptedStyleSheets.push(s);
		} else {
			const s = this._injectedScript.document.createElement('style');
			(s.textContent = am), this._glassPaneShadow.appendChild(s);
		}
		this._glassPaneShadow.appendChild(this._actionPointElement);
	}
	install() {
		this._injectedScript.document.documentElement &&
			!this._injectedScript.document.documentElement.contains(this._glassPaneElement) &&
			this._injectedScript.document.documentElement.appendChild(this._glassPaneElement);
	}
	setLanguage(e) {
		this._language = e;
	}
	runHighlightOnRaf(e) {
		this._rafRequest && this._injectedScript.utils.builtins.cancelAnimationFrame(this._rafRequest);
		const n = this._injectedScript.querySelectorAll(
				e,
				this._injectedScript.document.documentElement,
			),
			s = er(this._language, Tn(e)),
			o = n.length > 1 ? '#f6b26b7f' : '#6fa8dc7f';
		this.updateHighlight(
			n.map((l, c) => {
				const u = n.length > 1 ? ` [${c + 1} of ${n.length}]` : '';
				return { element: l, color: o, tooltipText: s + u };
			}),
		),
			(this._rafRequest = this._injectedScript.utils.builtins.requestAnimationFrame(() =>
				this.runHighlightOnRaf(e),
			));
	}
	uninstall() {
		this._rafRequest && this._injectedScript.utils.builtins.cancelAnimationFrame(this._rafRequest),
			this._glassPaneElement.remove();
	}
	showActionPoint(e, n) {
		(this._actionPointElement.style.top = n + 'px'),
			(this._actionPointElement.style.left = e + 'px'),
			(this._actionPointElement.hidden = !1);
	}
	hideActionPoint() {
		this._actionPointElement.hidden = !0;
	}
	clearHighlight() {
		var e, n;
		for (const s of this._renderedEntries)
			(e = s.highlightElement) == null || e.remove(), (n = s.tooltipElement) == null || n.remove();
		this._renderedEntries = [];
	}
	maskElements(e, n) {
		this.updateHighlight(e.map((s) => ({ element: s, color: n })));
	}
	updateHighlight(e) {
		if (!this._highlightIsUpToDate(e)) {
			this.clearHighlight();
			for (const n of e) {
				const s = this._createHighlightElement();
				this._glassPaneShadow.appendChild(s);
				let o;
				if (n.tooltipText) {
					(o = this._injectedScript.document.createElement('x-pw-tooltip')),
						this._glassPaneShadow.appendChild(o),
						(o.style.top = '0'),
						(o.style.left = '0'),
						(o.style.display = 'flex');
					const l = this._injectedScript.document.createElement('x-pw-tooltip-line');
					(l.textContent = n.tooltipText), o.appendChild(l);
				}
				this._renderedEntries.push({
					targetElement: n.element,
					color: n.color,
					tooltipElement: o,
					highlightElement: s,
				});
			}
			for (const n of this._renderedEntries) {
				if (((n.box = n.targetElement.getBoundingClientRect()), !n.tooltipElement)) continue;
				const { anchorLeft: s, anchorTop: o } = this.tooltipPosition(n.box, n.tooltipElement);
				(n.tooltipTop = o), (n.tooltipLeft = s);
			}
			for (const n of this._renderedEntries) {
				n.tooltipElement &&
					((n.tooltipElement.style.top = n.tooltipTop + 'px'),
					(n.tooltipElement.style.left = n.tooltipLeft + 'px'));
				const s = n.box;
				(n.highlightElement.style.backgroundColor = n.color),
					(n.highlightElement.style.left = s.x + 'px'),
					(n.highlightElement.style.top = s.y + 'px'),
					(n.highlightElement.style.width = s.width + 'px'),
					(n.highlightElement.style.height = s.height + 'px'),
					(n.highlightElement.style.display = 'block'),
					this._isUnderTest &&
						console.error(
							'Highlight box for test: ' +
								JSON.stringify({ x: s.x, y: s.y, width: s.width, height: s.height }),
						);
			}
		}
	}
	firstBox() {
		var e;
		return (e = this._renderedEntries[0]) == null ? void 0 : e.box;
	}
	tooltipPosition(e, n) {
		const s = n.offsetWidth,
			o = n.offsetHeight,
			l = this._glassPaneElement.offsetWidth,
			c = this._glassPaneElement.offsetHeight;
		let u = e.left;
		u + s > l - 5 && (u = l - s - 5);
		let d = e.bottom + 5;
		return (
			d + o > c - 5 && (e.top > o + 5 ? (d = e.top - o - 5) : (d = c - 5 - o)),
			{ anchorLeft: u, anchorTop: d }
		);
	}
	_highlightIsUpToDate(e) {
		if (e.length !== this._renderedEntries.length) return !1;
		for (let n = 0; n < this._renderedEntries.length; ++n) {
			if (
				e[n].element !== this._renderedEntries[n].targetElement ||
				e[n].color !== this._renderedEntries[n].color
			)
				return !1;
			const s = this._renderedEntries[n].box;
			if (!s) return !1;
			const o = e[n].element.getBoundingClientRect();
			if (o.top !== s.top || o.right !== s.right || o.bottom !== s.bottom || o.left !== s.left)
				return !1;
		}
		return !0;
	}
	_createHighlightElement() {
		return this._injectedScript.document.createElement('x-pw-highlight');
	}
	appendChild(e) {
		this._glassPaneShadow.appendChild(e);
	}
}
function Nx(t, e, n) {
	const s = t.left - e.right;
	if (!(s < 0 || (n !== void 0 && s > n)))
		return s + Math.max(e.bottom - t.bottom, 0) + Math.max(t.top - e.top, 0);
}
function Ax(t, e, n) {
	const s = e.left - t.right;
	if (!(s < 0 || (n !== void 0 && s > n)))
		return s + Math.max(e.bottom - t.bottom, 0) + Math.max(t.top - e.top, 0);
}
function Ix(t, e, n) {
	const s = e.top - t.bottom;
	if (!(s < 0 || (n !== void 0 && s > n)))
		return s + Math.max(t.left - e.left, 0) + Math.max(e.right - t.right, 0);
}
function Lx(t, e, n) {
	const s = t.top - e.bottom;
	if (!(s < 0 || (n !== void 0 && s > n)))
		return s + Math.max(t.left - e.left, 0) + Math.max(e.right - t.right, 0);
}
function Mx(t, e, n) {
	const s = n === void 0 ? 50 : n;
	let o = 0;
	return (
		t.left - e.right >= 0 && (o += t.left - e.right),
		e.left - t.right >= 0 && (o += e.left - t.right),
		e.top - t.bottom >= 0 && (o += e.top - t.bottom),
		t.top - e.bottom >= 0 && (o += t.top - e.bottom),
		o > s ? void 0 : o
	);
}
const jx = ['left-of', 'right-of', 'above', 'below', 'near'];
function qg(t, e, n, s) {
	const o = e.getBoundingClientRect(),
		l = { 'left-of': Ax, 'right-of': Nx, above: Ix, below: Lx, near: Mx }[t];
	let c;
	for (const u of n) {
		if (u === e) continue;
		const d = l(o, u.getBoundingClientRect(), s);
		d !== void 0 && (c === void 0 || d < c) && (c = d);
	}
	return c;
}
function Vg(t, e) {
	for (const n of e.jsonPath) t != null && (t = t[n]);
	return Wg(t, e);
}
function Wg(t, e) {
	const n = typeof t == 'string' && !e.caseSensitive ? t.toUpperCase() : t,
		s = typeof e.value == 'string' && !e.caseSensitive ? e.value.toUpperCase() : e.value;
	return e.op === '<truthy>'
		? !!n
		: e.op === '='
			? s instanceof RegExp
				? typeof n == 'string' && !!n.match(s)
				: n === s
			: typeof n != 'string' || typeof s != 'string'
				? !1
				: e.op === '*='
					? n.includes(s)
					: e.op === '^='
						? n.startsWith(s)
						: e.op === '$='
							? n.endsWith(s)
							: e.op === '|='
								? n === s || n.startsWith(s + '-')
								: e.op === '~='
									? n.split(' ').includes(s)
									: !1;
}
function Ef(t) {
	const e = t.ownerDocument;
	return (
		t.nodeName === 'SCRIPT' ||
		t.nodeName === 'NOSCRIPT' ||
		t.nodeName === 'STYLE' ||
		(e.head && e.head.contains(t))
	);
}
function Tt(t, e) {
	let n = t.get(e);
	if (n === void 0) {
		if (((n = { full: '', normalized: '', immediate: [] }), !Ef(e))) {
			let s = '';
			if (e instanceof HTMLInputElement && (e.type === 'submit' || e.type === 'button'))
				n = { full: e.value, normalized: mt(e.value), immediate: [e.value] };
			else {
				for (let o = e.firstChild; o; o = o.nextSibling)
					if (o.nodeType === Node.TEXT_NODE)
						(n.full += o.nodeValue || ''), (s += o.nodeValue || '');
					else {
						if (o.nodeType === Node.COMMENT_NODE) continue;
						s && n.immediate.push(s),
							(s = ''),
							o.nodeType === Node.ELEMENT_NODE && (n.full += Tt(t, o).full);
					}
				s && n.immediate.push(s),
					e.shadowRoot && (n.full += Tt(t, e.shadowRoot).full),
					n.full && (n.normalized = mt(n.full));
			}
		}
		t.set(e, n);
	}
	return n;
}
function Yl(t, e, n) {
	if (Ef(e) || !n(Tt(t, e))) return 'none';
	for (let s = e.firstChild; s; s = s.nextSibling)
		if (s.nodeType === Node.ELEMENT_NODE && n(Tt(t, s))) return 'selfAndChildren';
	return e.shadowRoot && n(Tt(t, e.shadowRoot)) ? 'selfAndChildren' : 'self';
}
function Kg(t, e) {
	const n = Lg(e);
	if (n) return n.map((l) => Tt(t, l));
	const s = e.getAttribute('aria-label');
	if (s !== null && s.trim()) return [{ full: s, normalized: mt(s), immediate: [s] }];
	const o = e.nodeName === 'INPUT' && e.type !== 'hidden';
	if (['BUTTON', 'METER', 'OUTPUT', 'PROGRESS', 'SELECT', 'TEXTAREA'].includes(e.nodeName) || o) {
		const l = e.labels;
		if (l) return [...l].map((c) => Tt(t, c));
	}
	return [];
}
function cm(t) {
	return t.displayName || t.name || 'Anonymous';
}
function Px(t) {
	if (t.type)
		switch (typeof t.type) {
			case 'function':
				return cm(t.type);
			case 'string':
				return t.type;
			case 'object':
				return t.type.displayName || (t.type.render ? cm(t.type.render) : '');
		}
	if (t._currentElement) {
		const e = t._currentElement.type;
		if (typeof e == 'string') return e;
		if (typeof e == 'function') return e.displayName || e.name || 'Anonymous';
	}
	return '';
}
function Ox(t) {
	var e;
	return t.key ?? ((e = t._currentElement) == null ? void 0 : e.key);
}
function $x(t) {
	if (t.child) {
		const n = [];
		for (let s = t.child; s; s = s.sibling) n.push(s);
		return n;
	}
	if (!t._currentElement) return [];
	const e = (n) => {
		var o;
		const s = (o = n._currentElement) == null ? void 0 : o.type;
		return typeof s == 'function' || typeof s == 'string';
	};
	if (t._renderedComponent) {
		const n = t._renderedComponent;
		return e(n) ? [n] : [];
	}
	return t._renderedChildren ? [...Object.values(t._renderedChildren)].filter(e) : [];
}
function Rx(t) {
	var s;
	const e = t.memoizedProps || ((s = t._currentElement) == null ? void 0 : s.props);
	if (!e || typeof e == 'string') return e;
	const n = { ...e };
	return delete n.children, n;
}
function Gg(t) {
	var s;
	const e = { key: Ox(t), name: Px(t), children: $x(t).map(Gg), rootElements: [], props: Rx(t) },
		n = t.stateNode || t._hostNode || ((s = t._renderedComponent) == null ? void 0 : s._hostNode);
	if (n instanceof Element) e.rootElements.push(n);
	else for (const o of e.children) e.rootElements.push(...o.rootElements);
	return e;
}
function Qg(t, e, n = []) {
	e(t) && n.push(t);
	for (const s of t.children) Qg(s, e, n);
	return n;
}
function Jg(t, e = []) {
	const s = (t.ownerDocument || t).createTreeWalker(t, NodeFilter.SHOW_ELEMENT);
	do {
		const o = s.currentNode,
			l = o,
			c = Object.keys(l).find((d) => d.startsWith('__reactContainer') && l[d] !== null);
		if (c) e.push(l[c].stateNode.current);
		else {
			const d = '_reactRootContainer';
			l.hasOwnProperty(d) && l[d] !== null && e.push(l[d]._internalRoot.current);
		}
		if (o instanceof Element && o.hasAttribute('data-reactroot'))
			for (const d of Object.keys(o))
				(d.startsWith('__reactInternalInstance') || d.startsWith('__reactFiber')) && e.push(o[d]);
		const u = o instanceof Element ? o.shadowRoot : null;
		u && Jg(u, e);
	} while (s.nextNode());
	return e;
}
const Dx = () => ({
		queryAll(t, e) {
			const { name: n, attributes: s } = br(e, !1),
				c = Jg(t.ownerDocument || t)
					.map((d) => Gg(d))
					.map((d) =>
						Qg(d, (p) => {
							const g = p.props ?? {};
							if (
								(p.key !== void 0 && (g.key = p.key),
								(n && p.name !== n) || p.rootElements.some((y) => !Xl(t, y)))
							)
								return !1;
							for (const y of s) if (!Vg(g, y)) return !1;
							return !0;
						}),
					)
					.flat(),
				u = new Set();
			for (const d of c) for (const p of d.rootElements) u.add(p);
			return [...u];
		},
	}),
	Xg = [
		'selected',
		'checked',
		'pressed',
		'expanded',
		'level',
		'disabled',
		'name',
		'include-hidden',
	];
Xg.sort();
function bi(t, e, n) {
	if (!e.includes(n))
		throw new Error(
			`"${t}" attribute is only supported for roles: ${e
				.slice()
				.sort()
				.map((s) => `"${s}"`)
				.join(', ')}`,
		);
}
function ls(t, e) {
	if (t.op !== '<truthy>' && !e.includes(t.value))
		throw new Error(`"${t.name}" must be one of ${e.map((n) => JSON.stringify(n)).join(', ')}`);
}
function as(t, e) {
	if (!e.includes(t.op)) throw new Error(`"${t.name}" does not support "${t.op}" matcher`);
}
function Fx(t, e) {
	const n = { role: e };
	for (const s of t)
		switch (s.name) {
			case 'checked': {
				bi(s.name, sf, e),
					ls(s, [!0, !1, 'mixed']),
					as(s, ['<truthy>', '=']),
					(n.checked = s.op === '<truthy>' ? !0 : s.value);
				break;
			}
			case 'pressed': {
				bi(s.name, lf, e),
					ls(s, [!0, !1, 'mixed']),
					as(s, ['<truthy>', '=']),
					(n.pressed = s.op === '<truthy>' ? !0 : s.value);
				break;
			}
			case 'selected': {
				bi(s.name, rf, e),
					ls(s, [!0, !1]),
					as(s, ['<truthy>', '=']),
					(n.selected = s.op === '<truthy>' ? !0 : s.value);
				break;
			}
			case 'expanded': {
				bi(s.name, af, e),
					ls(s, [!0, !1]),
					as(s, ['<truthy>', '=']),
					(n.expanded = s.op === '<truthy>' ? !0 : s.value);
				break;
			}
			case 'level': {
				if (
					(bi(s.name, cf, e),
					typeof s.value == 'string' && (s.value = +s.value),
					s.op !== '=' || typeof s.value != 'number' || Number.isNaN(s.value))
				)
					throw new Error('"level" attribute must be compared to a number');
				n.level = s.value;
				break;
			}
			case 'disabled': {
				ls(s, [!0, !1]),
					as(s, ['<truthy>', '=']),
					(n.disabled = s.op === '<truthy>' ? !0 : s.value);
				break;
			}
			case 'name': {
				if (s.op === '<truthy>') throw new Error('"name" attribute must have a value');
				if (typeof s.value != 'string' && !(s.value instanceof RegExp))
					throw new Error('"name" attribute must be a string or a regular expression');
				(n.name = s.value), (n.nameOp = s.op), (n.exact = s.caseSensitive);
				break;
			}
			case 'include-hidden': {
				ls(s, [!0, !1]),
					as(s, ['<truthy>', '=']),
					(n.includeHidden = s.op === '<truthy>' ? !0 : s.value);
				break;
			}
			default:
				throw new Error(
					`Unknown attribute "${s.name}", must be one of ${Xg.map((o) => `"${o}"`).join(', ')}.`,
				);
		}
	return n;
}
function Bx(t, e, n) {
	const s = [],
		o = (c) => {
			if (
				tt(c) === e.role &&
				!(e.selected !== void 0 && Mg(c) !== e.selected) &&
				!(e.checked !== void 0 && jg(c) !== e.checked) &&
				!(e.pressed !== void 0 && Pg(c) !== e.pressed) &&
				!(e.expanded !== void 0 && Og(c) !== e.expanded) &&
				!(e.level !== void 0 && $g(c) !== e.level) &&
				!(e.disabled !== void 0 && Hl(c) !== e.disabled) &&
				!(!e.includeHidden && zt(c))
			) {
				if (e.name !== void 0) {
					const u = mt(Bi(c, !!e.includeHidden));
					if (
						(typeof e.name == 'string' && (e.name = mt(e.name)),
						n && !e.exact && e.nameOp === '=' && (e.nameOp = '*='),
						!Wg(u, { op: e.nameOp || '=', value: e.name, caseSensitive: !!e.exact }))
					)
						return;
				}
				s.push(c);
			}
		},
		l = (c) => {
			const u = [];
			c.shadowRoot && u.push(c.shadowRoot);
			for (const d of c.querySelectorAll('*')) o(d), d.shadowRoot && u.push(d.shadowRoot);
			u.forEach(l);
		};
	return l(t), s;
}
function um(t) {
	return {
		queryAll: (e, n) => {
			const s = br(n, !0),
				o = s.name.toLowerCase();
			if (!o) throw new Error('Role must not be empty');
			const l = Fx(s.attributes, o);
			vf();
			try {
				return Bx(e, l, t);
			} finally {
				wf();
			}
		},
	};
}
class zx {
	constructor() {
		(this._retainCacheCounter = 0),
			(this._cacheText = new Map()),
			(this._cacheQueryCSS = new Map()),
			(this._cacheMatches = new Map()),
			(this._cacheQuery = new Map()),
			(this._cacheMatchesSimple = new Map()),
			(this._cacheMatchesParents = new Map()),
			(this._cacheCallMatches = new Map()),
			(this._cacheCallQuery = new Map()),
			(this._cacheQuerySimple = new Map()),
			(this._engines = new Map()),
			this._engines.set('not', qx),
			this._engines.set('is', Mi),
			this._engines.set('where', Mi),
			this._engines.set('has', Hx),
			this._engines.set('scope', Ux),
			this._engines.set('light', Vx),
			this._engines.set('visible', Wx),
			this._engines.set('text', Kx),
			this._engines.set('text-is', Gx),
			this._engines.set('text-matches', Qx),
			this._engines.set('has-text', Jx),
			this._engines.set('right-of', Ti('right-of')),
			this._engines.set('left-of', Ti('left-of')),
			this._engines.set('above', Ti('above')),
			this._engines.set('below', Ti('below')),
			this._engines.set('near', Ti('near')),
			this._engines.set('nth-match', Xx);
		const e = [...this._engines.keys()];
		e.sort();
		const n = [...ig];
		if ((n.sort(), e.join('|') !== n.join('|')))
			throw new Error(
				`Please keep customCSSNames in sync with evaluator engines: ${e.join('|')} vs ${n.join('|')}`,
			);
	}
	begin() {
		++this._retainCacheCounter;
	}
	end() {
		--this._retainCacheCounter,
			this._retainCacheCounter ||
				(this._cacheQueryCSS.clear(),
				this._cacheMatches.clear(),
				this._cacheQuery.clear(),
				this._cacheMatchesSimple.clear(),
				this._cacheMatchesParents.clear(),
				this._cacheCallMatches.clear(),
				this._cacheCallQuery.clear(),
				this._cacheQuerySimple.clear(),
				this._cacheText.clear());
	}
	_cached(e, n, s, o) {
		e.has(n) || e.set(n, []);
		const l = e.get(n),
			c = l.find((d) => s.every((p, g) => d.rest[g] === p));
		if (c) return c.result;
		const u = o();
		return l.push({ rest: s, result: u }), u;
	}
	_checkSelector(e) {
		if (!(typeof e == 'object' && e && (Array.isArray(e) || ('simples' in e && e.simples.length))))
			throw new Error(`Malformed selector "${e}"`);
		return e;
	}
	matches(e, n, s) {
		const o = this._checkSelector(n);
		this.begin();
		try {
			return this._cached(
				this._cacheMatches,
				e,
				[o, s.scope, s.pierceShadow, s.originalScope],
				() =>
					Array.isArray(o)
						? this._matchesEngine(Mi, e, o, s)
						: (this._hasScopeClause(o) && (s = this._expandContextForScopeMatching(s)),
							this._matchesSimple(e, o.simples[o.simples.length - 1].selector, s)
								? this._matchesParents(e, o, o.simples.length - 2, s)
								: !1),
			);
		} finally {
			this.end();
		}
	}
	query(e, n) {
		const s = this._checkSelector(n);
		this.begin();
		try {
			return this._cached(this._cacheQuery, s, [e.scope, e.pierceShadow, e.originalScope], () => {
				if (Array.isArray(s)) return this._queryEngine(Mi, e, s);
				this._hasScopeClause(s) && (e = this._expandContextForScopeMatching(e));
				const o = this._scoreMap;
				this._scoreMap = new Map();
				let l = this._querySimple(e, s.simples[s.simples.length - 1].selector);
				return (
					(l = l.filter((c) => this._matchesParents(c, s, s.simples.length - 2, e))),
					this._scoreMap.size &&
						l.sort((c, u) => {
							const d = this._scoreMap.get(c),
								p = this._scoreMap.get(u);
							return d === p ? 0 : d === void 0 ? 1 : p === void 0 ? -1 : d - p;
						}),
					(this._scoreMap = o),
					l
				);
			});
		} finally {
			this.end();
		}
	}
	_markScore(e, n) {
		this._scoreMap && this._scoreMap.set(e, n);
	}
	_hasScopeClause(e) {
		return e.simples.some((n) => n.selector.functions.some((s) => s.name === 'scope'));
	}
	_expandContextForScopeMatching(e) {
		if (e.scope.nodeType !== 1) return e;
		const n = lt(e.scope);
		return n ? { ...e, scope: n, originalScope: e.originalScope || e.scope } : e;
	}
	_matchesSimple(e, n, s) {
		return this._cached(
			this._cacheMatchesSimple,
			e,
			[n, s.scope, s.pierceShadow, s.originalScope],
			() => {
				if (e === s.scope || (n.css && !this._matchesCSS(e, n.css))) return !1;
				for (const o of n.functions)
					if (!this._matchesEngine(this._getEngine(o.name), e, o.args, s)) return !1;
				return !0;
			},
		);
	}
	_querySimple(e, n) {
		return n.functions.length
			? this._cached(this._cacheQuerySimple, n, [e.scope, e.pierceShadow, e.originalScope], () => {
					let s = n.css;
					const o = n.functions;
					s === '*' && o.length && (s = void 0);
					let l,
						c = -1;
					s !== void 0
						? (l = this._queryCSS(e, s))
						: ((c = o.findIndex((u) => this._getEngine(u.name).query !== void 0)),
							c === -1 && (c = 0),
							(l = this._queryEngine(this._getEngine(o[c].name), e, o[c].args)));
					for (let u = 0; u < o.length; u++) {
						if (u === c) continue;
						const d = this._getEngine(o[u].name);
						d.matches !== void 0 && (l = l.filter((p) => this._matchesEngine(d, p, o[u].args, e)));
					}
					for (let u = 0; u < o.length; u++) {
						if (u === c) continue;
						const d = this._getEngine(o[u].name);
						d.matches === void 0 && (l = l.filter((p) => this._matchesEngine(d, p, o[u].args, e)));
					}
					return l;
				})
			: this._queryCSS(e, n.css || '*');
	}
	_matchesParents(e, n, s, o) {
		return s < 0
			? !0
			: this._cached(
					this._cacheMatchesParents,
					e,
					[n, s, o.scope, o.pierceShadow, o.originalScope],
					() => {
						const { selector: l, combinator: c } = n.simples[s];
						if (c === '>') {
							const u = cl(e, o);
							return !u || !this._matchesSimple(u, l, o)
								? !1
								: this._matchesParents(u, n, s - 1, o);
						}
						if (c === '+') {
							const u = du(e, o);
							return !u || !this._matchesSimple(u, l, o)
								? !1
								: this._matchesParents(u, n, s - 1, o);
						}
						if (c === '') {
							let u = cl(e, o);
							for (; u; ) {
								if (this._matchesSimple(u, l, o)) {
									if (this._matchesParents(u, n, s - 1, o)) return !0;
									if (n.simples[s - 1].combinator === '') break;
								}
								u = cl(u, o);
							}
							return !1;
						}
						if (c === '~') {
							let u = du(e, o);
							for (; u; ) {
								if (this._matchesSimple(u, l, o)) {
									if (this._matchesParents(u, n, s - 1, o)) return !0;
									if (n.simples[s - 1].combinator === '~') break;
								}
								u = du(u, o);
							}
							return !1;
						}
						if (c === '>=') {
							let u = e;
							for (; u; ) {
								if (this._matchesSimple(u, l, o)) {
									if (this._matchesParents(u, n, s - 1, o)) return !0;
									if (n.simples[s - 1].combinator === '') break;
								}
								u = cl(u, o);
							}
							return !1;
						}
						throw new Error(`Unsupported combinator "${c}"`);
					},
				);
	}
	_matchesEngine(e, n, s, o) {
		if (e.matches) return this._callMatches(e, n, s, o);
		if (e.query) return this._callQuery(e, s, o).includes(n);
		throw new Error('Selector engine should implement "matches" or "query"');
	}
	_queryEngine(e, n, s) {
		if (e.query) return this._callQuery(e, s, n);
		if (e.matches) return this._queryCSS(n, '*').filter((o) => this._callMatches(e, o, s, n));
		throw new Error('Selector engine should implement "matches" or "query"');
	}
	_callMatches(e, n, s, o) {
		return this._cached(
			this._cacheCallMatches,
			n,
			[e, o.scope, o.pierceShadow, o.originalScope, ...s],
			() => e.matches(n, s, o, this),
		);
	}
	_callQuery(e, n, s) {
		return this._cached(
			this._cacheCallQuery,
			e,
			[s.scope, s.pierceShadow, s.originalScope, ...n],
			() => e.query(s, n, this),
		);
	}
	_matchesCSS(e, n) {
		return e.matches(n);
	}
	_queryCSS(e, n) {
		return this._cached(this._cacheQueryCSS, n, [e.scope, e.pierceShadow, e.originalScope], () => {
			let s = [];
			function o(l) {
				if (((s = s.concat([...l.querySelectorAll(n)])), !!e.pierceShadow)) {
					l.shadowRoot && o(l.shadowRoot);
					for (const c of l.querySelectorAll('*')) c.shadowRoot && o(c.shadowRoot);
				}
			}
			return o(e.scope), s;
		});
	}
	_getEngine(e) {
		const n = this._engines.get(e);
		if (!n) throw new Error(`Unknown selector engine "${e}"`);
		return n;
	}
}
const Mi = {
		matches(t, e, n, s) {
			if (e.length === 0) throw new Error('"is" engine expects non-empty selector list');
			return e.some((o) => s.matches(t, o, n));
		},
		query(t, e, n) {
			if (e.length === 0) throw new Error('"is" engine expects non-empty selector list');
			let s = [];
			for (const o of e) s = s.concat(n.query(t, o));
			return e.length === 1 ? s : Yg(s);
		},
	},
	Hx = {
		matches(t, e, n, s) {
			if (e.length === 0) throw new Error('"has" engine expects non-empty selector list');
			return s.query({ ...n, scope: t }, e).length > 0;
		},
	},
	Ux = {
		matches(t, e, n, s) {
			if (e.length !== 0) throw new Error('"scope" engine expects no arguments');
			const o = n.originalScope || n.scope;
			return o.nodeType === 9 ? t === o.documentElement : t === o;
		},
		query(t, e, n) {
			if (e.length !== 0) throw new Error('"scope" engine expects no arguments');
			const s = t.originalScope || t.scope;
			if (s.nodeType === 9) {
				const o = s.documentElement;
				return o ? [o] : [];
			}
			return s.nodeType === 1 ? [s] : [];
		},
	},
	qx = {
		matches(t, e, n, s) {
			if (e.length === 0) throw new Error('"not" engine expects non-empty selector list');
			return !s.matches(t, e, n);
		},
	},
	Vx = {
		query(t, e, n) {
			return n.query({ ...t, pierceShadow: !1 }, e);
		},
		matches(t, e, n, s) {
			return s.matches(t, e, { ...n, pierceShadow: !1 });
		},
	},
	Wx = {
		matches(t, e, n, s) {
			if (e.length) throw new Error('"visible" engine expects no arguments');
			return Tr(t);
		},
	},
	Kx = {
		matches(t, e, n, s) {
			if (e.length !== 1 || typeof e[0] != 'string')
				throw new Error('"text" engine expects a single string');
			const o = mt(e[0]).toLowerCase(),
				l = (c) => c.normalized.toLowerCase().includes(o);
			return Yl(s._cacheText, t, l) === 'self';
		},
	},
	Gx = {
		matches(t, e, n, s) {
			if (e.length !== 1 || typeof e[0] != 'string')
				throw new Error('"text-is" engine expects a single string');
			const o = mt(e[0]),
				l = (c) => (!o && !c.immediate.length ? !0 : c.immediate.some((u) => mt(u) === o));
			return Yl(s._cacheText, t, l) !== 'none';
		},
	},
	Qx = {
		matches(t, e, n, s) {
			if (
				e.length === 0 ||
				typeof e[0] != 'string' ||
				e.length > 2 ||
				(e.length === 2 && typeof e[1] != 'string')
			)
				throw new Error('"text-matches" engine expects a regexp body and optional regexp flags');
			const o = new RegExp(e[0], e.length === 2 ? e[1] : void 0),
				l = (c) => o.test(c.full);
			return Yl(s._cacheText, t, l) === 'self';
		},
	},
	Jx = {
		matches(t, e, n, s) {
			if (e.length !== 1 || typeof e[0] != 'string')
				throw new Error('"has-text" engine expects a single string');
			if (Ef(t)) return !1;
			const o = mt(e[0]).toLowerCase();
			return ((c) => c.normalized.toLowerCase().includes(o))(Tt(s._cacheText, t));
		},
	};
function Ti(t) {
	return {
		matches(e, n, s, o) {
			const l = n.length && typeof n[n.length - 1] == 'number' ? n[n.length - 1] : void 0,
				c = l === void 0 ? n : n.slice(0, n.length - 1);
			if (n.length < 1 + (l === void 0 ? 0 : 1))
				throw new Error(
					`"${t}" engine expects a selector list and optional maximum distance in pixels`,
				);
			const u = o.query(s, c),
				d = qg(t, e, u, l);
			return d === void 0 ? !1 : (o._markScore(e, d), !0);
		},
	};
}
const Xx = {
	query(t, e, n) {
		let s = e[e.length - 1];
		if (e.length < 2)
			throw new Error('"nth-match" engine expects non-empty selector list and an index argument');
		if (typeof s != 'number' || s < 1)
			throw new Error('"nth-match" engine expects a one-based index as the last argument');
		const o = Mi.query(t, e.slice(0, e.length - 1), n);
		return s--, s < o.length ? [o[s]] : [];
	},
};
function cl(t, e) {
	if (t !== e.scope) return e.pierceShadow ? lt(t) : t.parentElement || void 0;
}
function du(t, e) {
	if (t !== e.scope) return t.previousElementSibling || void 0;
}
function Yg(t) {
	const e = new Map(),
		n = [],
		s = [];
	function o(c) {
		let u = e.get(c);
		if (u) return u;
		const d = lt(c);
		return d ? o(d).children.push(c) : n.push(c), (u = { children: [], taken: !1 }), e.set(c, u), u;
	}
	for (const c of t) o(c).taken = !0;
	function l(c) {
		const u = e.get(c);
		if ((u.taken && s.push(c), u.children.length > 1)) {
			const d = new Set(u.children);
			u.children = [];
			let p = c.firstElementChild;
			for (; p && u.children.length < d.size; )
				d.has(p) && u.children.push(p), (p = p.nextElementSibling);
			for (
				p = c.shadowRoot ? c.shadowRoot.firstElementChild : null;
				p && u.children.length < d.size;
			)
				d.has(p) && u.children.push(p), (p = p.nextElementSibling);
		}
		u.children.forEach(l);
	}
	return n.forEach(l), s;
}
const Zg = 10,
	Is = Zg / 2,
	fm = 1,
	Yx = 2,
	Zx = 10,
	e_ = 50,
	ey = 100,
	ty = 120,
	ny = 140,
	ry = 160,
	Tl = 180,
	sy = 200,
	dm = 250,
	t_ = ty + Is,
	n_ = ny + Is,
	r_ = ey + Is,
	s_ = ry + Is,
	i_ = Tl + Is,
	o_ = sy + Is,
	l_ = 300,
	a_ = 500,
	iy = 510,
	hu = 520,
	oy = 530,
	ly = 1e4,
	c_ = 1e7,
	u_ = 1e3;
function hm(t, e, n) {
	t._evaluator.begin();
	const s = { allowText: new Map(), disallowText: new Map() };
	vf();
	try {
		let o = [];
		if (n.forTextExpect) {
			let u = ul(t, e.ownerDocument.documentElement, n);
			for (let d = e; d; d = lt(d)) {
				const p = cs(s, t, d, { ...n, noText: !0 });
				if (!p) continue;
				if (Zn(p) <= u_) {
					u = p;
					break;
				}
			}
			o = [Cl(u)];
		} else {
			if (!e.matches('input,textarea,select') && !e.isContentEditable) {
				const u = Li(
					e,
					'button,select,input,[role=button],[role=checkbox],[role=radio],a,[role=link]',
					n.root,
				);
				u && Tr(u) && (e = u);
			}
			if (n.multiple) {
				const u = cs(s, t, e, n),
					d = cs(s, t, e, { ...n, noText: !0 });
				let p = [u, d];
				if (
					(s.allowText.clear(),
					s.disallowText.clear(),
					u && pu(u) && p.push(cs(s, t, e, { ...n, noCSSId: !0 })),
					d && pu(d) && p.push(cs(s, t, e, { ...n, noText: !0, noCSSId: !0 })),
					(p = p.filter(Boolean)),
					!p.length)
				) {
					const g = ul(t, e, n);
					p.push(g), pu(g) && p.push(ul(t, e, { ...n, noCSSId: !0 }));
				}
				o = [...new Set(p.map((g) => Cl(g)))];
			} else {
				const u = cs(s, t, e, n) || ul(t, e, n);
				o = [Cl(u)];
			}
		}
		const l = o[0],
			c = t.parseSelector(l);
		return {
			selector: l,
			selectors: o,
			elements: t.querySelectorAll(c, n.root ?? e.ownerDocument),
		};
	} finally {
		wf(), t._evaluator.end();
	}
}
function pm(t) {
	return t.filter((e) => e[0].selector[0] !== '/');
}
function cs(t, e, n, s) {
	if (s.root && !Xl(s.root, n)) throw new Error("Target element must belong to the root's subtree");
	if (n === s.root) return [{ engine: 'css', selector: ':scope', score: 1 }];
	if (n.ownerDocument.documentElement === n) return [{ engine: 'css', selector: 'html', score: 1 }];
	const o = (c, u) => {
			const d = c === n;
			let p = u ? d_(e, c, c === n) : [];
			c !== n && (p = pm(p));
			const g = f_(e, c, s)
				.filter((S) => !s.omitInternalEngines || !S.engine.startsWith('internal:'))
				.map((S) => [S]);
			let y = mm(e, s.root ?? n.ownerDocument, c, [...p, ...g], d);
			p = pm(p);
			const v = (S) => {
				const k = u && !S.length,
					_ = [...S, ...g].filter((C) => (y ? Zn(C) < Zn(y) : !0));
				let E = _[0];
				if (E)
					for (let C = lt(c); C && C !== s.root; C = lt(C)) {
						const A = l(C, k);
						if (!A || (y && Zn([...A, ...E]) >= Zn(y))) continue;
						if (((E = mm(e, C, c, _, d)), !E)) return;
						const O = [...A, ...E];
						(!y || Zn(O) < Zn(y)) && (y = O);
					}
			};
			return v(p), c === n && p.length && v([]), y;
		},
		l = (c, u) => {
			const d = u ? t.allowText : t.disallowText;
			let p = d.get(c);
			return p === void 0 && ((p = o(c, u)), d.set(c, p)), p;
		};
	return o(n, !s.noText);
}
function f_(t, e, n) {
	const s = [];
	{
		for (const c of ['data-testid', 'data-test-id', 'data-test'])
			c !== n.testIdAttributeName &&
				e.getAttribute(c) &&
				s.push({ engine: 'css', selector: `[${c}=${ds(e.getAttribute(c))}]`, score: Yx });
		if (!n.noCSSId) {
			const c = e.getAttribute('id');
			c && !h_(c) && s.push({ engine: 'css', selector: ay(c), score: a_ });
		}
		s.push({ engine: 'css', selector: bn(e), score: oy });
	}
	if (e.nodeName === 'IFRAME') {
		for (const c of ['name', 'title'])
			e.getAttribute(c) &&
				s.push({ engine: 'css', selector: `${bn(e)}[${c}=${ds(e.getAttribute(c))}]`, score: Zx });
		return (
			e.getAttribute(n.testIdAttributeName) &&
				s.push({
					engine: 'css',
					selector: `[${n.testIdAttributeName}=${ds(e.getAttribute(n.testIdAttributeName))}]`,
					score: fm,
				}),
			Ou([s]),
			s
		);
	}
	if (
		(e.getAttribute(n.testIdAttributeName) &&
			s.push({
				engine: 'internal:testid',
				selector: `[${n.testIdAttributeName}=${ht(e.getAttribute(n.testIdAttributeName), !0)}]`,
				score: fm,
			}),
		e.nodeName === 'INPUT' || e.nodeName === 'TEXTAREA')
	) {
		const c = e;
		if (c.placeholder) {
			s.push({
				engine: 'internal:attr',
				selector: `[placeholder=${ht(c.placeholder, !0)}]`,
				score: t_,
			});
			for (const u of gs(c.placeholder))
				s.push({
					engine: 'internal:attr',
					selector: `[placeholder=${ht(u.text, !1)}]`,
					score: ty - u.scoreBonus,
				});
		}
	}
	const o = Kg(t._evaluator._cacheText, e);
	for (const c of o) {
		const u = c.normalized;
		s.push({ engine: 'internal:label', selector: kt(u, !0), score: n_ });
		for (const d of gs(u))
			s.push({ engine: 'internal:label', selector: kt(d.text, !1), score: ny - d.scoreBonus });
	}
	const l = tt(e);
	return (
		l &&
			!['none', 'presentation'].includes(l) &&
			s.push({ engine: 'internal:role', selector: l, score: iy }),
		e.getAttribute('name') &&
			[
				'BUTTON',
				'FORM',
				'FIELDSET',
				'FRAME',
				'IFRAME',
				'INPUT',
				'KEYGEN',
				'OBJECT',
				'OUTPUT',
				'SELECT',
				'TEXTAREA',
				'MAP',
				'META',
				'PARAM',
			].includes(e.nodeName) &&
			s.push({
				engine: 'css',
				selector: `${bn(e)}[name=${ds(e.getAttribute('name'))}]`,
				score: hu,
			}),
		['INPUT', 'TEXTAREA'].includes(e.nodeName) &&
			e.getAttribute('type') !== 'hidden' &&
			e.getAttribute('type') &&
			s.push({
				engine: 'css',
				selector: `${bn(e)}[type=${ds(e.getAttribute('type'))}]`,
				score: hu,
			}),
		['INPUT', 'TEXTAREA', 'SELECT'].includes(e.nodeName) &&
			e.getAttribute('type') !== 'hidden' &&
			s.push({ engine: 'css', selector: bn(e), score: hu + 1 }),
		Ou([s]),
		s
	);
}
function d_(t, e, n) {
	if (e.nodeName === 'SELECT') return [];
	const s = [],
		o = e.getAttribute('title');
	if (o) {
		s.push([{ engine: 'internal:attr', selector: `[title=${ht(o, !0)}]`, score: o_ }]);
		for (const p of gs(o))
			s.push([
				{
					engine: 'internal:attr',
					selector: `[title=${ht(p.text, !1)}]`,
					score: sy - p.scoreBonus,
				},
			]);
	}
	const l = e.getAttribute('alt');
	if (l && ['APPLET', 'AREA', 'IMG', 'INPUT'].includes(e.nodeName)) {
		s.push([{ engine: 'internal:attr', selector: `[alt=${ht(l, !0)}]`, score: s_ }]);
		for (const p of gs(l))
			s.push([
				{ engine: 'internal:attr', selector: `[alt=${ht(p.text, !1)}]`, score: ry - p.scoreBonus },
			]);
	}
	const c = Tt(t._evaluator._cacheText, e).normalized,
		u = c ? gs(c) : [];
	if (c) {
		if (n) {
			c.length <= 80 && s.push([{ engine: 'internal:text', selector: kt(c, !0), score: i_ }]);
			for (const g of u)
				s.push([{ engine: 'internal:text', selector: kt(g.text, !1), score: Tl - g.scoreBonus }]);
		}
		const p = { engine: 'css', selector: bn(e), score: oy };
		for (const g of u)
			s.push([
				p,
				{ engine: 'internal:has-text', selector: kt(g.text, !1), score: Tl - g.scoreBonus },
			]);
		if (c.length <= 80) {
			const g = new RegExp('^' + Rl(c) + '$');
			s.push([p, { engine: 'internal:has-text', selector: kt(g, !1), score: dm }]);
		}
	}
	const d = tt(e);
	if (d && !['none', 'presentation'].includes(d)) {
		const p = Bi(e, !1);
		if (p) {
			const g = { engine: 'internal:role', selector: `${d}[name=${ht(p, !0)}]`, score: r_ };
			s.push([g]);
			for (const y of gs(p))
				s.push([
					{
						engine: 'internal:role',
						selector: `${d}[name=${ht(y.text, !1)}]`,
						score: ey - y.scoreBonus,
					},
				]);
		} else {
			const g = { engine: 'internal:role', selector: `${d}`, score: iy };
			for (const y of u)
				s.push([
					g,
					{ engine: 'internal:has-text', selector: kt(y.text, !1), score: Tl - y.scoreBonus },
				]);
			if (c.length <= 80) {
				const y = new RegExp('^' + Rl(c) + '$');
				s.push([g, { engine: 'internal:has-text', selector: kt(y, !1), score: dm }]);
			}
		}
	}
	return Ou(s), s;
}
function ay(t) {
	return /^[a-zA-Z][a-zA-Z0-9\-\_]+$/.test(t) ? '#' + t : `[id=${ds(t)}]`;
}
function pu(t) {
	return t.some(
		(e) => e.engine === 'css' && (e.selector.startsWith('#') || e.selector.startsWith('[id="')),
	);
}
function ul(t, e, n) {
	const s = n.root ?? e.ownerDocument,
		o = [];
	function l(u) {
		const d = o.slice();
		u && d.unshift(u);
		const p = d.join(' > '),
			g = t.parseSelector(p);
		return t.querySelector(g, s, !1) === e ? p : void 0;
	}
	function c(u) {
		const d = { engine: 'css', selector: u, score: c_ },
			p = t.parseSelector(u),
			g = t.querySelectorAll(p, s);
		if (g.length === 1) return [d];
		const y = { engine: 'nth', selector: String(g.indexOf(e)), score: ly };
		return [d, y];
	}
	for (let u = e; u && u !== s; u = lt(u)) {
		let d = '';
		if (u.id && !n.noCSSId) {
			const y = ay(u.id),
				v = l(y);
			if (v) return c(v);
			d = y;
		}
		const p = u.parentNode,
			g = [...u.classList].map(p_);
		for (let y = 0; y < g.length; ++y) {
			const v = '.' + g.slice(0, y + 1).join('.'),
				S = l(v);
			if (S) return c(S);
			!d && p && p.querySelectorAll(v).length === 1 && (d = v);
		}
		if (p) {
			const y = [...p.children],
				v = u.nodeName,
				k =
					y.filter((E) => E.nodeName === v).indexOf(u) === 0
						? bn(u)
						: `${bn(u)}:nth-child(${1 + y.indexOf(u)})`,
				_ = l(k);
			if (_) return c(_);
			d || (d = k);
		} else d || (d = bn(u));
		o.unshift(d);
	}
	return c(l());
}
function Ou(t) {
	for (const e of t)
		for (const n of e)
			n.score > e_ && n.score < l_ && (n.score += Math.min(Zg, (n.selector.length / 10) | 0));
}
function Cl(t) {
	const e = [];
	let n = '';
	for (const { engine: s, selector: o } of t)
		e.length && (n !== 'css' || s !== 'css' || o.startsWith(':nth-match(')) && e.push('>>'),
			(n = s),
			s === 'css' ? e.push(o) : e.push(`${s}=${o}`);
	return e.join(' ');
}
function Zn(t) {
	let e = 0;
	for (let n = 0; n < t.length; n++) e += t[n].score * (t.length - n);
	return e;
}
function mm(t, e, n, s, o) {
	const l = s.map((u) => ({ tokens: u, score: Zn(u) }));
	l.sort((u, d) => u.score - d.score);
	let c = null;
	for (const { tokens: u } of l) {
		const d = t.parseSelector(Cl(u)),
			p = t.querySelectorAll(d, e);
		if (p[0] === n && p.length === 1) return u;
		const g = p.indexOf(n);
		if (!o || c || g === -1 || p.length > 5) continue;
		const y = { engine: 'nth', selector: String(g), score: ly };
		c = [...u, y];
	}
	return c;
}
function h_(t) {
	let e,
		n = 0;
	for (let s = 0; s < t.length; ++s) {
		const o = t[s];
		let l;
		if (!(o === '-' || o === '_')) {
			if (
				(o >= 'a' && o <= 'z'
					? (l = 'lower')
					: o >= 'A' && o <= 'Z'
						? (l = 'upper')
						: o >= '0' && o <= '9'
							? (l = 'digit')
							: (l = 'other'),
				l === 'lower' && e === 'upper')
			) {
				e = l;
				continue;
			}
			e && e !== l && ++n, (e = l);
		}
	}
	return n >= t.length / 4;
}
function fl(t, e) {
	if (t.length <= e) return t;
	t = t.substring(0, e);
	const n = t.match(/^(.*)\b(.+?)$/);
	return n ? n[1].trimEnd() : '';
}
function gs(t) {
	let e = [];
	{
		const n = t.match(/^([\d.,]+)[^.,\w]/),
			s = n ? n[1].length : 0;
		if (s) {
			const o = fl(t.substring(s).trimStart(), 80);
			e.push({ text: o, scoreBonus: o.length <= 30 ? 2 : 1 });
		}
	}
	{
		const n = t.match(/[^.,\w]([\d.,]+)$/),
			s = n ? n[1].length : 0;
		if (s) {
			const o = fl(t.substring(0, t.length - s).trimEnd(), 80);
			e.push({ text: o, scoreBonus: o.length <= 30 ? 2 : 1 });
		}
	}
	return (
		t.length <= 30
			? e.push({ text: t, scoreBonus: 0 })
			: (e.push({ text: fl(t, 80), scoreBonus: 0 }), e.push({ text: fl(t, 30), scoreBonus: 1 })),
		(e = e.filter((n) => n.text)),
		e.length || e.push({ text: t.substring(0, 80), scoreBonus: 0 }),
		e
	);
}
function bn(t) {
	return t.nodeName.toLocaleLowerCase().replace(/[:\.]/g, (e) => '\\' + e);
}
function p_(t) {
	let e = '';
	for (let n = 0; n < t.length; n++) e += m_(t, n);
	return e;
}
function m_(t, e) {
	const n = t.charCodeAt(e);
	return n === 0
		? '�'
		: (n >= 1 && n <= 31) ||
				(n >= 48 && n <= 57 && (e === 0 || (e === 1 && t.charCodeAt(0) === 45)))
			? '\\' + n.toString(16) + ' '
			: e === 0 && n === 45 && t.length === 1
				? '\\' + t.charAt(e)
				: n >= 128 ||
						n === 45 ||
						n === 95 ||
						(n >= 48 && n <= 57) ||
						(n >= 65 && n <= 90) ||
						(n >= 97 && n <= 122)
					? t.charAt(e)
					: '\\' + t.charAt(e);
}
function cy(t, e) {
	const n = t.replace(/^[a-zA-Z]:/, '').replace(/\\/g, '/');
	let s = n.substring(n.lastIndexOf('/') + 1);
	return s.endsWith(e) && (s = s.substring(0, s.length - e.length)), s;
}
function g_(t, e) {
	return e ? e.toUpperCase() : '';
}
const y_ = /(?:^|[-_/])(\w)/g,
	uy = (t) => t && t.replace(y_, g_);
function v_(t) {
	function e(g) {
		const y = g.name || g._componentTag || g.__playwright_guessedName;
		if (y) return y;
		const v = g.__file;
		if (v) return uy(cy(v, '.vue'));
	}
	function n(g, y) {
		return (g.type.__playwright_guessedName = y), y;
	}
	function s(g) {
		var v, S, k, _;
		const y = e(g.type || {});
		if (y) return y;
		if (g.root === g) return 'Root';
		for (const E in (S = (v = g.parent) == null ? void 0 : v.type) == null ? void 0 : S.components)
			if (((k = g.parent) == null ? void 0 : k.type.components[E]) === g.type) return n(g, E);
		for (const E in (_ = g.appContext) == null ? void 0 : _.components)
			if (g.appContext.components[E] === g.type) return n(g, E);
		return 'Anonymous Component';
	}
	function o(g) {
		return g._isBeingDestroyed || g.isUnmounted;
	}
	function l(g) {
		return g.subTree.type.toString() === 'Symbol(Fragment)';
	}
	function c(g) {
		const y = [];
		return (
			g.component && y.push(g.component),
			g.suspense && y.push(...c(g.suspense.activeBranch)),
			Array.isArray(g.children) &&
				g.children.forEach((v) => {
					v.component ? y.push(v.component) : y.push(...c(v));
				}),
			y.filter((v) => {
				var S;
				return !o(v) && !((S = v.type.devtools) != null && S.hide);
			})
		);
	}
	function u(g) {
		return l(g) ? d(g.subTree) : [g.subTree.el];
	}
	function d(g) {
		if (!g.children) return [];
		const y = [];
		for (let v = 0, S = g.children.length; v < S; v++) {
			const k = g.children[v];
			k.component ? y.push(...u(k.component)) : k.el && y.push(k.el);
		}
		return y;
	}
	function p(g) {
		return { name: s(g), children: c(g.subTree).map(p), rootElements: u(g), props: g.props };
	}
	return p(t);
}
function w_(t) {
	function e(l) {
		const c = l.displayName || l.name || l._componentTag;
		if (c) return c;
		const u = l.__file;
		if (u) return uy(cy(u, '.vue'));
	}
	function n(l) {
		const c = e(l.$options || l.fnOptions || {});
		return c || (l.$root === l ? 'Root' : 'Anonymous Component');
	}
	function s(l) {
		return l.$children
			? l.$children
			: Array.isArray(l.subTree.children)
				? l.subTree.children.filter((c) => !!c.component).map((c) => c.component)
				: [];
	}
	function o(l) {
		return { name: n(l), children: s(l).map(o), rootElements: [l.$el], props: l._props };
	}
	return o(t);
}
function fy(t, e, n = []) {
	e(t) && n.push(t);
	for (const s of t.children) fy(s, e, n);
	return n;
}
function dy(t, e = []) {
	const s = (t.ownerDocument || t).createTreeWalker(t, NodeFilter.SHOW_ELEMENT),
		o = new Set();
	do {
		const l = s.currentNode;
		l.__vue__ && o.add(l.__vue__.$root),
			l.__vue_app__ &&
				l._vnode &&
				l._vnode.component &&
				e.push({ root: l._vnode.component, version: 3 });
		const c = l instanceof Element ? l.shadowRoot : null;
		c && dy(c, e);
	} while (s.nextNode());
	for (const l of o) e.push({ version: 2, root: l });
	return e;
}
const S_ = () => ({
		queryAll(t, e) {
			const n = t.ownerDocument || t,
				{ name: s, attributes: o } = br(e, !1),
				u = dy(n)
					.map((p) => (p.version === 3 ? v_(p.root) : w_(p.root)))
					.map((p) =>
						fy(p, (g) => {
							if ((s && g.name !== s) || g.rootElements.some((y) => !Xl(t, y))) return !1;
							for (const y of o) if (!Vg(g.props, y)) return !1;
							return !0;
						}),
					)
					.flat(),
				d = new Set();
			for (const p of u) for (const g of p.rootElements) d.add(g);
			return [...d];
		},
	}),
	gm = {
		queryAll(t, e) {
			e.startsWith('/') && t.nodeType !== Node.DOCUMENT_NODE && (e = '.' + e);
			const n = [],
				s = t.ownerDocument || t;
			if (!s) return n;
			const o = s.evaluate(e, t, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE);
			for (let l = o.iterateNext(); l; l = o.iterateNext())
				l.nodeType === Node.ELEMENT_NODE && n.push(l);
			return n;
		},
	};
function kf(t, e, n) {
	return `internal:attr=[${t}=${ht(e, (n == null ? void 0 : n.exact) || !1)}]`;
}
function x_(t, e) {
	return `internal:testid=[${t}=${ht(e, !0)}]`;
}
function __(t, e) {
	return 'internal:label=' + kt(t, !!(e != null && e.exact));
}
function E_(t, e) {
	return kf('alt', t, e);
}
function k_(t, e) {
	return kf('title', t, e);
}
function b_(t, e) {
	return kf('placeholder', t, e);
}
function T_(t, e) {
	return 'internal:text=' + kt(t, !!(e != null && e.exact));
}
function C_(t, e = {}) {
	const n = [];
	return (
		e.checked !== void 0 && n.push(['checked', String(e.checked)]),
		e.disabled !== void 0 && n.push(['disabled', String(e.disabled)]),
		e.selected !== void 0 && n.push(['selected', String(e.selected)]),
		e.expanded !== void 0 && n.push(['expanded', String(e.expanded)]),
		e.includeHidden !== void 0 && n.push(['include-hidden', String(e.includeHidden)]),
		e.level !== void 0 && n.push(['level', String(e.level)]),
		e.name !== void 0 && n.push(['name', ht(e.name, !!e.exact)]),
		e.pressed !== void 0 && n.push(['pressed', String(e.pressed)]),
		`internal:role=${t}${n.map(([s, o]) => `[${s}=${o}]`).join('')}`
	);
}
const Ci = Symbol('selector'),
	N_ = class ji {
		constructor(e, n, s) {
			if (
				(s != null && s.hasText && (n += ` >> internal:has-text=${kt(s.hasText, !1)}`),
				s != null && s.hasNotText && (n += ` >> internal:has-not-text=${kt(s.hasNotText, !1)}`),
				s != null && s.has && (n += ' >> internal:has=' + JSON.stringify(s.has[Ci])),
				s != null && s.hasNot && (n += ' >> internal:has-not=' + JSON.stringify(s.hasNot[Ci])),
				(s == null ? void 0 : s.visible) !== void 0 &&
					(n += ` >> visible=${s.visible ? 'true' : 'false'}`),
				(this[Ci] = n),
				n)
			) {
				const c = e.parseSelector(n);
				(this.element = e.querySelector(c, e.document, !1)),
					(this.elements = e.querySelectorAll(c, e.document));
			}
			const o = n,
				l = this;
			(l.locator = (c, u) => new ji(e, o ? o + ' >> ' + c : c, u)),
				(l.getByTestId = (c) =>
					l.locator(x_(e.testIdAttributeNameForStrictErrorAndConsoleCodegen(), c))),
				(l.getByAltText = (c, u) => l.locator(E_(c, u))),
				(l.getByLabel = (c, u) => l.locator(__(c, u))),
				(l.getByPlaceholder = (c, u) => l.locator(b_(c, u))),
				(l.getByText = (c, u) => l.locator(T_(c, u))),
				(l.getByTitle = (c, u) => l.locator(k_(c, u))),
				(l.getByRole = (c, u = {}) => l.locator(C_(c, u))),
				(l.filter = (c) => new ji(e, n, c)),
				(l.first = () => l.locator('nth=0')),
				(l.last = () => l.locator('nth=-1')),
				(l.nth = (c) => l.locator(`nth=${c}`)),
				(l.and = (c) => new ji(e, o + ' >> internal:and=' + JSON.stringify(c[Ci]))),
				(l.or = (c) => new ji(e, o + ' >> internal:or=' + JSON.stringify(c[Ci])));
		}
	};
let A_ = N_;
class I_ {
	constructor(e) {
		this._injectedScript = e;
	}
	install() {
		this._injectedScript.window.playwright ||
			((this._injectedScript.window.playwright = {
				$: (e, n) => this._querySelector(e, !!n),
				$$: (e) => this._querySelectorAll(e),
				inspect: (e) => this._inspect(e),
				selector: (e) => this._selector(e),
				generateLocator: (e, n) => this._generateLocator(e, n),
				ariaSnapshot: (e, n) =>
					this._injectedScript.ariaSnapshot(e || this._injectedScript.document.body, n),
				resume: () => this._resume(),
				...new A_(this._injectedScript, ''),
			}),
			delete this._injectedScript.window.playwright.filter,
			delete this._injectedScript.window.playwright.first,
			delete this._injectedScript.window.playwright.last,
			delete this._injectedScript.window.playwright.nth,
			delete this._injectedScript.window.playwright.and,
			delete this._injectedScript.window.playwright.or);
	}
	_querySelector(e, n) {
		if (typeof e != 'string') throw new Error("Usage: playwright.query('Playwright >> selector').");
		const s = this._injectedScript.parseSelector(e);
		return this._injectedScript.querySelector(s, this._injectedScript.document, n);
	}
	_querySelectorAll(e) {
		if (typeof e != 'string') throw new Error("Usage: playwright.$$('Playwright >> selector').");
		const n = this._injectedScript.parseSelector(e);
		return this._injectedScript.querySelectorAll(n, this._injectedScript.document);
	}
	_inspect(e) {
		if (typeof e != 'string')
			throw new Error("Usage: playwright.inspect('Playwright >> selector').");
		this._injectedScript.window.inspect(this._querySelector(e, !1));
	}
	_selector(e) {
		if (!(e instanceof Element)) throw new Error('Usage: playwright.selector(element).');
		return this._injectedScript.generateSelectorSimple(e);
	}
	_generateLocator(e, n) {
		if (!(e instanceof Element)) throw new Error('Usage: playwright.locator(element).');
		const s = this._injectedScript.generateSelectorSimple(e);
		return er(n || 'javascript', s);
	}
	_resume() {
		this._injectedScript.window.__pw_resume().catch(() => {});
	}
}
function L_(t) {
	try {
		return t instanceof RegExp || Object.prototype.toString.call(t) === '[object RegExp]';
	} catch {
		return !1;
	}
}
function M_(t) {
	try {
		return t instanceof Date || Object.prototype.toString.call(t) === '[object Date]';
	} catch {
		return !1;
	}
}
function j_(t) {
	try {
		return t instanceof URL || Object.prototype.toString.call(t) === '[object URL]';
	} catch {
		return !1;
	}
}
function P_(t) {
	var e;
	try {
		return (
			t instanceof Error ||
			(t && ((e = Object.getPrototypeOf(t)) == null ? void 0 : e.name) === 'Error')
		);
	} catch {
		return !1;
	}
}
function O_(t, e) {
	try {
		return t instanceof e || Object.prototype.toString.call(t) === `[object ${e.name}]`;
	} catch {
		return !1;
	}
}
const hy = {
	i8: Int8Array,
	ui8: Uint8Array,
	ui8c: Uint8ClampedArray,
	i16: Int16Array,
	ui16: Uint16Array,
	i32: Int32Array,
	ui32: Uint32Array,
	f32: Float32Array,
	f64: Float64Array,
	bi64: BigInt64Array,
	bui64: BigUint64Array,
};
function $_(t) {
	if ('toBase64' in t) return t.toBase64();
	const e = Array.from(new Uint8Array(t.buffer, t.byteOffset, t.byteLength))
		.map((n) => String.fromCharCode(n))
		.join('');
	return btoa(e);
}
function R_(t, e) {
	const n = atob(t),
		s = new Uint8Array(n.length);
	for (let o = 0; o < n.length; o++) s[o] = n.charCodeAt(o);
	return new e(s.buffer);
}
function $u(t, e = [], n = new Map()) {
	if (!Object.is(t, void 0)) {
		if (typeof t == 'object' && t) {
			if ('ref' in t) return n.get(t.ref);
			if ('v' in t)
				return t.v === 'undefined'
					? void 0
					: t.v === 'null'
						? null
						: t.v === 'NaN'
							? NaN
							: t.v === 'Infinity'
								? 1 / 0
								: t.v === '-Infinity'
									? -1 / 0
									: t.v === '-0'
										? -0
										: void 0;
			if ('d' in t) return new Date(t.d);
			if ('u' in t) return new URL(t.u);
			if ('bi' in t) return BigInt(t.bi);
			if ('e' in t) {
				const s = new Error(t.e.m);
				return (s.name = t.e.n), (s.stack = t.e.s), s;
			}
			if ('r' in t) return new RegExp(t.r.p, t.r.f);
			if ('a' in t) {
				const s = [];
				n.set(t.id, s);
				for (const o of t.a) s.push($u(o, e, n));
				return s;
			}
			if ('o' in t) {
				const s = {};
				n.set(t.id, s);
				for (const { k: o, v: l } of t.o) o !== '__proto__' && (s[o] = $u(l, e, n));
				return s;
			}
			if ('h' in t) return e[t.h];
			if ('ta' in t) return R_(t.ta.b, hy[t.ta.k]);
		}
		return t;
	}
}
function D_(t, e) {
	return Ru(t, e, { visited: new Map(), lastId: 0 });
}
function Ru(t, e, n) {
	if (t && typeof t == 'object') {
		if (typeof globalThis.Window == 'function' && t instanceof globalThis.Window)
			return 'ref: <Window>';
		if (typeof globalThis.Document == 'function' && t instanceof globalThis.Document)
			return 'ref: <Document>';
		if (typeof globalThis.Node == 'function' && t instanceof globalThis.Node) return 'ref: <Node>';
	}
	return py(t, e, n);
}
function py(t, e, n) {
	var l;
	const s = e(t);
	if ('fallThrough' in s) t = s.fallThrough;
	else return s;
	if (typeof t == 'symbol') return { v: 'undefined' };
	if (Object.is(t, void 0)) return { v: 'undefined' };
	if (Object.is(t, null)) return { v: 'null' };
	if (Object.is(t, NaN)) return { v: 'NaN' };
	if (Object.is(t, 1 / 0)) return { v: 'Infinity' };
	if (Object.is(t, -1 / 0)) return { v: '-Infinity' };
	if (Object.is(t, -0)) return { v: '-0' };
	if (typeof t == 'boolean' || typeof t == 'number' || typeof t == 'string') return t;
	if (typeof t == 'bigint') return { bi: t.toString() };
	if (P_(t)) {
		let c;
		return (
			(l = t.stack) != null && l.startsWith(t.name + ': ' + t.message)
				? (c = t.stack)
				: (c = `${t.name}: ${t.message}
${t.stack}`),
			{ e: { n: t.name, m: t.message, s: c } }
		);
	}
	if (M_(t)) return { d: t.toJSON() };
	if (j_(t)) return { u: t.toJSON() };
	if (L_(t)) return { r: { p: t.source, f: t.flags } };
	for (const [c, u] of Object.entries(hy)) if (O_(t, u)) return { ta: { b: $_(t), k: c } };
	const o = n.visited.get(t);
	if (o) return { ref: o };
	if (Array.isArray(t)) {
		const c = [],
			u = ++n.lastId;
		n.visited.set(t, u);
		for (let d = 0; d < t.length; ++d) c.push(Ru(t[d], e, n));
		return { a: c, id: u };
	}
	if (typeof t == 'object') {
		const c = [],
			u = ++n.lastId;
		n.visited.set(t, u);
		for (const p of Object.keys(t)) {
			let g;
			try {
				g = t[p];
			} catch {
				continue;
			}
			p === 'toJSON' && typeof g == 'function'
				? c.push({ k: p, v: { o: [], id: 0 } })
				: c.push({ k: p, v: Ru(g, e, n) });
		}
		let d;
		try {
			c.length === 0 && t.toJSON && typeof t.toJSON == 'function' && (d = { value: t.toJSON() });
		} catch {}
		return d ? py(d.value, e, n) : { o: c, id: u };
	}
}
class F_ {
	constructor(e, n) {
		var s, o, l, c, u, d, p, g;
		(this.global = e),
			(this.isUnderTest = n),
			e.__pwClock
				? (this.builtins = e.__pwClock.builtins)
				: (this.builtins = {
						setTimeout: (s = e.setTimeout) == null ? void 0 : s.bind(e),
						clearTimeout: (o = e.clearTimeout) == null ? void 0 : o.bind(e),
						setInterval: (l = e.setInterval) == null ? void 0 : l.bind(e),
						clearInterval: (c = e.clearInterval) == null ? void 0 : c.bind(e),
						requestAnimationFrame: (u = e.requestAnimationFrame) == null ? void 0 : u.bind(e),
						cancelAnimationFrame: (d = e.cancelAnimationFrame) == null ? void 0 : d.bind(e),
						requestIdleCallback: (p = e.requestIdleCallback) == null ? void 0 : p.bind(e),
						cancelIdleCallback: (g = e.cancelIdleCallback) == null ? void 0 : g.bind(e),
						performance: e.performance,
						Intl: e.Intl,
						Date: e.Date,
					}),
			this.isUnderTest && (e.builtins = this.builtins);
	}
	evaluate(e, n, s, o, ...l) {
		const c = l.slice(0, o),
			u = l.slice(o),
			d = [];
		for (let g = 0; g < c.length; g++) d[g] = $u(c[g], u);
		let p = this.global.eval(s);
		return (
			e === !0 ? (p = p(...d)) : e === !1 ? (p = p) : typeof p == 'function' && (p = p(...d)),
			n ? this._promiseAwareJsonValueNoThrow(p) : p
		);
	}
	jsonValue(e, n) {
		if (n !== void 0) return D_(n, (s) => ({ fallThrough: s }));
	}
	_promiseAwareJsonValueNoThrow(e) {
		const n = (s) => {
			try {
				return this.jsonValue(!0, s);
			} catch {
				return;
			}
		};
		return e && typeof e == 'object' && typeof e.then == 'function'
			? (async () => {
					const s = await e;
					return n(s);
				})()
			: n(e);
	}
}
class my {
	constructor(e, n) {
		(this._testIdAttributeNameForStrictErrorAndConsoleCodegen = 'data-testid'),
			(this.utils = {
				asLocator: er,
				cacheNormalizedWhitespaces: l1,
				elementText: Tt,
				getAriaRole: tt,
				getElementAccessibleDescription: sm,
				getElementAccessibleName: Bi,
				isElementVisible: Tr,
				isInsideScope: Xl,
				normalizeWhiteSpace: mt,
				parseAriaSnapshot: ef,
				builtins: null,
			}),
			(this.window = e),
			(this.document = e.document),
			(this.isUnderTest = n.isUnderTest),
			(this.utils.builtins = new F_(e, n.isUnderTest).builtins),
			(this._sdkLanguage = n.sdkLanguage),
			(this._testIdAttributeNameForStrictErrorAndConsoleCodegen = n.testIdAttributeName),
			(this._evaluator = new zx()),
			(this.consoleApi = new I_(this)),
			(this.onGlobalListenersRemoved = new Set()),
			(this._autoClosingTags = new Set([
				'AREA',
				'BASE',
				'BR',
				'COL',
				'COMMAND',
				'EMBED',
				'HR',
				'IMG',
				'INPUT',
				'KEYGEN',
				'LINK',
				'MENUITEM',
				'META',
				'PARAM',
				'SOURCE',
				'TRACK',
				'WBR',
			])),
			(this._booleanAttributes = new Set([
				'checked',
				'selected',
				'disabled',
				'readonly',
				'multiple',
			])),
			(this._eventTypes = new Map([
				['auxclick', 'mouse'],
				['click', 'mouse'],
				['dblclick', 'mouse'],
				['mousedown', 'mouse'],
				['mouseeenter', 'mouse'],
				['mouseleave', 'mouse'],
				['mousemove', 'mouse'],
				['mouseout', 'mouse'],
				['mouseover', 'mouse'],
				['mouseup', 'mouse'],
				['mouseleave', 'mouse'],
				['mousewheel', 'mouse'],
				['keydown', 'keyboard'],
				['keyup', 'keyboard'],
				['keypress', 'keyboard'],
				['textInput', 'keyboard'],
				['touchstart', 'touch'],
				['touchmove', 'touch'],
				['touchend', 'touch'],
				['touchcancel', 'touch'],
				['pointerover', 'pointer'],
				['pointerout', 'pointer'],
				['pointerenter', 'pointer'],
				['pointerleave', 'pointer'],
				['pointerdown', 'pointer'],
				['pointerup', 'pointer'],
				['pointermove', 'pointer'],
				['pointercancel', 'pointer'],
				['gotpointercapture', 'pointer'],
				['lostpointercapture', 'pointer'],
				['focus', 'focus'],
				['blur', 'focus'],
				['drag', 'drag'],
				['dragstart', 'drag'],
				['dragend', 'drag'],
				['dragover', 'drag'],
				['dragenter', 'drag'],
				['dragleave', 'drag'],
				['dragexit', 'drag'],
				['drop', 'drag'],
				['wheel', 'wheel'],
				['deviceorientation', 'deviceorientation'],
				['deviceorientationabsolute', 'deviceorientation'],
				['devicemotion', 'devicemotion'],
			])),
			(this._hoverHitTargetInterceptorEvents = new Set(['mousemove'])),
			(this._tapHitTargetInterceptorEvents = new Set([
				'pointerdown',
				'pointerup',
				'touchstart',
				'touchend',
				'touchcancel',
			])),
			(this._mouseHitTargetInterceptorEvents = new Set([
				'mousedown',
				'mouseup',
				'pointerdown',
				'pointerup',
				'click',
				'auxclick',
				'dblclick',
				'contextmenu',
			])),
			(this._allHitTargetInterceptorEvents = new Set([
				...this._hoverHitTargetInterceptorEvents,
				...this._tapHitTargetInterceptorEvents,
				...this._mouseHitTargetInterceptorEvents,
			])),
			(this._engines = new Map()),
			this._engines.set('xpath', gm),
			this._engines.set('xpath:light', gm),
			this._engines.set('_react', Dx()),
			this._engines.set('_vue', S_()),
			this._engines.set('role', um(!1)),
			this._engines.set('text', this._createTextEngine(!0, !1)),
			this._engines.set('text:light', this._createTextEngine(!1, !1)),
			this._engines.set('id', this._createAttributeEngine('id', !0)),
			this._engines.set('id:light', this._createAttributeEngine('id', !1)),
			this._engines.set('data-testid', this._createAttributeEngine('data-testid', !0)),
			this._engines.set('data-testid:light', this._createAttributeEngine('data-testid', !1)),
			this._engines.set('data-test-id', this._createAttributeEngine('data-test-id', !0)),
			this._engines.set('data-test-id:light', this._createAttributeEngine('data-test-id', !1)),
			this._engines.set('data-test', this._createAttributeEngine('data-test', !0)),
			this._engines.set('data-test:light', this._createAttributeEngine('data-test', !1)),
			this._engines.set('css', this._createCSSEngine()),
			this._engines.set('nth', { queryAll: () => [] }),
			this._engines.set('visible', this._createVisibleEngine()),
			this._engines.set('internal:control', this._createControlEngine()),
			this._engines.set('internal:has', this._createHasEngine()),
			this._engines.set('internal:has-not', this._createHasNotEngine()),
			this._engines.set('internal:and', { queryAll: () => [] }),
			this._engines.set('internal:or', { queryAll: () => [] }),
			this._engines.set('internal:chain', this._createInternalChainEngine()),
			this._engines.set('internal:label', this._createInternalLabelEngine()),
			this._engines.set('internal:text', this._createTextEngine(!0, !0)),
			this._engines.set('internal:has-text', this._createInternalHasTextEngine()),
			this._engines.set('internal:has-not-text', this._createInternalHasNotTextEngine()),
			this._engines.set('internal:attr', this._createNamedAttributeEngine()),
			this._engines.set('internal:testid', this._createNamedAttributeEngine()),
			this._engines.set('internal:role', um(!0)),
			this._engines.set('internal:describe', this._createDescribeEngine()),
			this._engines.set('aria-ref', this._createAriaRefEngine());
		for (const { name: s, source: o } of n.customEngines) this._engines.set(s, this.eval(o));
		(this._stableRafCount = n.stableRafCount),
			(this._browserName = n.browserName),
			XS({
				browserNameForWorkarounds: n.browserName,
				inputFileRoleTextbox: n.inputFileRoleTextbox,
			}),
			this._setupGlobalListenersRemovalDetection(),
			this._setupHitTargetInterceptors(),
			this.isUnderTest && (this.window.__injectedScript = this);
	}
	eval(e) {
		return this.window.eval(e);
	}
	testIdAttributeNameForStrictErrorAndConsoleCodegen() {
		return this._testIdAttributeNameForStrictErrorAndConsoleCodegen;
	}
	parseSelector(e) {
		const n = Vi(e);
		return (
			i1(n, (s) => {
				if (!this._engines.has(s.name))
					throw this.createStacklessError(`Unknown engine "${s.name}" while parsing selector ${e}`);
			}),
			n
		);
	}
	generateSelector(e, n) {
		return hm(this, e, n);
	}
	generateSelectorSimple(e, n) {
		return hm(this, e, {
			...n,
			testIdAttributeName: this._testIdAttributeNameForStrictErrorAndConsoleCodegen,
		}).selector;
	}
	querySelector(e, n, s) {
		const o = this.querySelectorAll(e, n);
		if (s && o.length > 1) throw this.strictModeViolationError(e, o);
		return o[0];
	}
	_queryNth(e, n) {
		const s = [...e];
		let o = +n.body;
		return o === -1 && (o = s.length - 1), new Set(s.slice(o, o + 1));
	}
	_queryLayoutSelector(e, n, s) {
		const o = n.name,
			l = n.body,
			c = [],
			u = this.querySelectorAll(l.parsed, s);
		for (const d of e) {
			const p = qg(o, d, u, l.distance);
			p !== void 0 && c.push({ element: d, score: p });
		}
		return c.sort((d, p) => d.score - p.score), new Set(c.map((d) => d.element));
	}
	ariaSnapshot(e, n) {
		if (e.nodeType !== Node.ELEMENT_NODE)
			throw this.createStacklessError('Can only capture aria snapshot of Element nodes.');
		return (this._lastAriaSnapshot = Sf(e, n)), Pu(this._lastAriaSnapshot, n);
	}
	getAllByAria(e, n) {
		return kx(e.documentElement, n);
	}
	querySelectorAll(e, n) {
		if (e.capture !== void 0) {
			if (e.parts.some((o) => o.name === 'nth'))
				throw this.createStacklessError("Can't query n-th element in a request with the capture.");
			const s = { parts: e.parts.slice(0, e.capture + 1) };
			if (e.capture < e.parts.length - 1) {
				const o = { parts: e.parts.slice(e.capture + 1) },
					l = { name: 'internal:has', body: { parsed: o }, source: Tn(o) };
				s.parts.push(l);
			}
			return this.querySelectorAll(s, n);
		}
		if (!n.querySelectorAll) throw this.createStacklessError('Node is not queryable.');
		if (e.capture !== void 0)
			throw this.createStacklessError(
				'Internal error: there should not be a capture in the selector.',
			);
		if (
			n.nodeType === 11 &&
			e.parts.length === 1 &&
			e.parts[0].name === 'css' &&
			e.parts[0].source === ':scope'
		)
			return [n];
		this._evaluator.begin();
		try {
			let s = new Set([n]);
			for (const o of e.parts)
				if (o.name === 'nth') s = this._queryNth(s, o);
				else if (o.name === 'internal:and') {
					const l = this.querySelectorAll(o.body.parsed, n);
					s = new Set(l.filter((c) => s.has(c)));
				} else if (o.name === 'internal:or') {
					const l = this.querySelectorAll(o.body.parsed, n);
					s = new Set(Yg(new Set([...s, ...l])));
				} else if (jx.includes(o.name)) s = this._queryLayoutSelector(s, o, n);
				else {
					const l = new Set();
					for (const c of s) {
						const u = this._queryEngineAll(o, c);
						for (const d of u) l.add(d);
					}
					s = l;
				}
			return [...s];
		} finally {
			this._evaluator.end();
		}
	}
	_queryEngineAll(e, n) {
		const s = this._engines.get(e.name).queryAll(n, e.body);
		for (const o of s)
			if (!('nodeName' in o))
				throw this.createStacklessError(
					`Expected a Node but got ${Object.prototype.toString.call(o)}`,
				);
		return s;
	}
	_createAttributeEngine(e, n) {
		const s = (o) => [
			{
				simples: [
					{ selector: { css: `[${e}=${JSON.stringify(o)}]`, functions: [] }, combinator: '' },
				],
			},
		];
		return { queryAll: (o, l) => this._evaluator.query({ scope: o, pierceShadow: n }, s(l)) };
	}
	_createCSSEngine() {
		return { queryAll: (e, n) => this._evaluator.query({ scope: e, pierceShadow: !0 }, n) };
	}
	_createTextEngine(e, n) {
		return {
			queryAll: (o, l) => {
				const { matcher: c, kind: u } = hl(l, n),
					d = [];
				let p = null;
				const g = (v) => {
					if (u === 'lax' && p && p.contains(v)) return !1;
					const S = Yl(this._evaluator._cacheText, v, c);
					S === 'none' && (p = v),
						(S === 'self' || (S === 'selfAndChildren' && u === 'strict' && !n)) && d.push(v);
				};
				o.nodeType === Node.ELEMENT_NODE && g(o);
				const y = this._evaluator._queryCSS({ scope: o, pierceShadow: e }, '*');
				for (const v of y) g(v);
				return d;
			},
		};
	}
	_createInternalHasTextEngine() {
		return {
			queryAll: (e, n) => {
				if (e.nodeType !== 1) return [];
				const s = e,
					o = Tt(this._evaluator._cacheText, s),
					{ matcher: l } = hl(n, !0);
				return l(o) ? [s] : [];
			},
		};
	}
	_createInternalHasNotTextEngine() {
		return {
			queryAll: (e, n) => {
				if (e.nodeType !== 1) return [];
				const s = e,
					o = Tt(this._evaluator._cacheText, s),
					{ matcher: l } = hl(n, !0);
				return l(o) ? [] : [s];
			},
		};
	}
	_createInternalLabelEngine() {
		return {
			queryAll: (e, n) => {
				const { matcher: s } = hl(n, !0);
				return this._evaluator
					._queryCSS({ scope: e, pierceShadow: !0 }, '*')
					.filter((l) => Kg(this._evaluator._cacheText, l).some((c) => s(c)));
			},
		};
	}
	_createNamedAttributeEngine() {
		return {
			queryAll: (n, s) => {
				const o = br(s, !0);
				if (o.name || o.attributes.length !== 1)
					throw new Error('Malformed attribute selector: ' + s);
				const { name: l, value: c, caseSensitive: u } = o.attributes[0],
					d = u ? null : c.toLowerCase();
				let p;
				return (
					c instanceof RegExp
						? (p = (y) => !!y.match(c))
						: u
							? (p = (y) => y === c)
							: (p = (y) => y.toLowerCase().includes(d)),
					this._evaluator
						._queryCSS({ scope: n, pierceShadow: !0 }, `[${l}]`)
						.filter((y) => p(y.getAttribute(l)))
				);
			},
		};
	}
	_createDescribeEngine() {
		return { queryAll: (n) => (n.nodeType !== 1 ? [] : [n]) };
	}
	_createControlEngine() {
		return {
			queryAll(e, n) {
				if (n === 'enter-frame') return [];
				if (n === 'return-empty') return [];
				if (n === 'component')
					return e.nodeType !== 1 ? [] : [e.childElementCount === 1 ? e.firstElementChild : e];
				throw new Error(`Internal error, unknown internal:control selector ${n}`);
			},
		};
	}
	_createHasEngine() {
		return {
			queryAll: (n, s) =>
				n.nodeType !== 1 ? [] : !!this.querySelector(s.parsed, n, !1) ? [n] : [],
		};
	}
	_createHasNotEngine() {
		return {
			queryAll: (n, s) =>
				n.nodeType !== 1 ? [] : !!this.querySelector(s.parsed, n, !1) ? [] : [n],
		};
	}
	_createVisibleEngine() {
		return {
			queryAll: (n, s) => {
				if (n.nodeType !== 1) return [];
				const o = s === 'true';
				return Tr(n) === o ? [n] : [];
			},
		};
	}
	_createInternalChainEngine() {
		return { queryAll: (n, s) => this.querySelectorAll(s.parsed, n) };
	}
	extend(e, n) {
		const s = this.window.eval(`
    (() => {
      const module = {};
      ${e}
      return module.exports.default();
    })()`);
		return new s(this, n);
	}
	async viewportRatio(e) {
		return await new Promise((n) => {
			const s = new IntersectionObserver((o) => {
				n(o[0].intersectionRatio), s.disconnect();
			});
			s.observe(e), this.utils.builtins.requestAnimationFrame(() => {});
		});
	}
	getElementBorderWidth(e) {
		if (e.nodeType !== Node.ELEMENT_NODE || !e.ownerDocument || !e.ownerDocument.defaultView)
			return { left: 0, top: 0 };
		const n = e.ownerDocument.defaultView.getComputedStyle(e);
		return {
			left: parseInt(n.borderLeftWidth || '', 10),
			top: parseInt(n.borderTopWidth || '', 10),
		};
	}
	describeIFrameStyle(e) {
		if (!e.ownerDocument || !e.ownerDocument.defaultView) return 'error:notconnected';
		const n = e.ownerDocument.defaultView;
		for (let o = e; o; o = lt(o))
			if (n.getComputedStyle(o).transform !== 'none') return 'transformed';
		const s = n.getComputedStyle(e);
		return {
			left: parseInt(s.borderLeftWidth || '', 10) + parseInt(s.paddingLeft || '', 10),
			top: parseInt(s.borderTopWidth || '', 10) + parseInt(s.paddingTop || '', 10),
		};
	}
	retarget(e, n) {
		let s = e.nodeType === Node.ELEMENT_NODE ? e : e.parentElement;
		if (!s) return null;
		if (n === 'none') return s;
		if (
			(!s.matches('input, textarea, select') &&
				!s.isContentEditable &&
				(n === 'button-link'
					? (s = s.closest('button, [role=button], a, [role=link]') || s)
					: (s = s.closest('button, [role=button], [role=checkbox], [role=radio]') || s)),
			n === 'follow-label' &&
				!s.matches(
					'a, input, textarea, button, select, [role=link], [role=button], [role=checkbox], [role=radio]',
				) &&
				!s.isContentEditable)
		) {
			const o = s.closest('label');
			o && o.control && (s = o.control);
		}
		return s;
	}
	async checkElementStates(e, n) {
		if (n.includes('stable')) {
			const s = await this._checkElementIsStable(e);
			if (s === !1) return { missingState: 'stable' };
			if (s === 'error:notconnected') return 'error:notconnected';
		}
		for (const s of n)
			if (s !== 'stable') {
				const o = this.elementState(e, s);
				if (o.received === 'error:notconnected') return 'error:notconnected';
				if (!o.matches) return { missingState: s };
			}
	}
	async _checkElementIsStable(e) {
		const n = Symbol('continuePolling');
		let s,
			o = 0,
			l = 0;
		const c = () => {
			const y = this.retarget(e, 'no-follow-label');
			if (!y) return 'error:notconnected';
			const v = this.utils.builtins.performance.now();
			if (this._stableRafCount > 1 && v - l < 15) return n;
			l = v;
			const S = y.getBoundingClientRect(),
				k = { x: S.top, y: S.left, width: S.width, height: S.height };
			if (s) {
				if (!(k.x === s.x && k.y === s.y && k.width === s.width && k.height === s.height))
					return !1;
				if (++o >= this._stableRafCount) return !0;
			}
			return (s = k), n;
		};
		let u, d;
		const p = new Promise((y, v) => {
				(u = y), (d = v);
			}),
			g = () => {
				try {
					const y = c();
					y !== n ? u(y) : this.utils.builtins.requestAnimationFrame(g);
				} catch (y) {
					d(y);
				}
			};
		return this.utils.builtins.requestAnimationFrame(g), p;
	}
	_createAriaRefEngine() {
		return {
			queryAll: (n, s) => {
				var l, c;
				const o =
					(c = (l = this._lastAriaSnapshot) == null ? void 0 : l.elements) == null
						? void 0
						: c.get(s);
				return o && o.isConnected ? [o] : [];
			},
		};
	}
	elementState(e, n) {
		const s = this.retarget(e, ['visible', 'hidden'].includes(n) ? 'none' : 'follow-label');
		if (!s || !s.isConnected)
			return n === 'hidden'
				? { matches: !0, received: 'hidden' }
				: { matches: !1, received: 'error:notconnected' };
		if (n === 'visible' || n === 'hidden') {
			const o = Tr(s);
			return { matches: n === 'visible' ? o : !o, received: o ? 'visible' : 'hidden' };
		}
		if (n === 'disabled' || n === 'enabled') {
			const o = Hl(s);
			return { matches: n === 'disabled' ? o : !o, received: o ? 'disabled' : 'enabled' };
		}
		if (n === 'editable') {
			const o = Hl(s),
				l = dx(s);
			if (l === 'error')
				throw this.createStacklessError(
					'Element is not an <input>, <textarea>, <select> or [contenteditable] and does not have a role allowing [aria-readonly]',
				);
			return { matches: !o && !l, received: o ? 'disabled' : l ? 'readOnly' : 'editable' };
		}
		if (n === 'checked' || n === 'unchecked') {
			const o = n === 'checked',
				l = ux(s);
			if (l === 'error') throw this.createStacklessError('Not a checkbox or radio button');
			return { matches: o === l, received: l ? 'checked' : 'unchecked' };
		}
		if (n === 'indeterminate') {
			const o = cx(s);
			if (o === 'error') throw this.createStacklessError('Not a checkbox or radio button');
			return {
				matches: o === 'mixed',
				received: o === !0 ? 'checked' : o === !1 ? 'unchecked' : 'mixed',
			};
		}
		throw this.createStacklessError(`Unexpected element state "${n}"`);
	}
	selectOptions(e, n) {
		const s = this.retarget(e, 'follow-label');
		if (!s) return 'error:notconnected';
		if (s.nodeName.toLowerCase() !== 'select')
			throw this.createStacklessError('Element is not a <select> element');
		const o = s,
			l = [...o.options],
			c = [];
		let u = n.slice();
		for (let d = 0; d < l.length; d++) {
			const p = l[d],
				g = (y) => {
					if (y instanceof Node) return p === y;
					let v = !0;
					return (
						y.valueOrLabel !== void 0 &&
							(v = v && (y.valueOrLabel === p.value || y.valueOrLabel === p.label)),
						y.value !== void 0 && (v = v && y.value === p.value),
						y.label !== void 0 && (v = v && y.label === p.label),
						y.index !== void 0 && (v = v && y.index === d),
						v
					);
				};
			if (u.some(g))
				if ((c.push(p), o.multiple)) u = u.filter((y) => !g(y));
				else {
					u = [];
					break;
				}
		}
		return u.length
			? 'error:optionsnotfound'
			: ((o.value = void 0),
				c.forEach((d) => (d.selected = !0)),
				o.dispatchEvent(new Event('input', { bubbles: !0, composed: !0 })),
				o.dispatchEvent(new Event('change', { bubbles: !0 })),
				c.map((d) => d.value));
	}
	fill(e, n) {
		const s = this.retarget(e, 'follow-label');
		if (!s) return 'error:notconnected';
		if (s.nodeName.toLowerCase() === 'input') {
			const o = s,
				l = o.type.toLowerCase(),
				c = new Set(['color', 'date', 'time', 'datetime-local', 'month', 'range', 'week']);
			if (
				!new Set(['', 'email', 'number', 'password', 'search', 'tel', 'text', 'url']).has(l) &&
				!c.has(l)
			)
				throw this.createStacklessError(`Input of type "${l}" cannot be filled`);
			if (l === 'number' && ((n = n.trim()), isNaN(Number(n))))
				throw this.createStacklessError('Cannot type text into input[type=number]');
			if (c.has(l)) {
				if (((n = n.trim()), o.focus(), (o.value = n), o.value !== n))
					throw this.createStacklessError('Malformed value');
				return (
					s.dispatchEvent(new Event('input', { bubbles: !0, composed: !0 })),
					s.dispatchEvent(new Event('change', { bubbles: !0 })),
					'done'
				);
			}
		} else if (s.nodeName.toLowerCase() !== 'textarea') {
			if (!s.isContentEditable)
				throw this.createStacklessError(
					'Element is not an <input>, <textarea> or [contenteditable] element',
				);
		}
		return this.selectText(s), 'needsinput';
	}
	selectText(e) {
		const n = this.retarget(e, 'follow-label');
		if (!n) return 'error:notconnected';
		if (n.nodeName.toLowerCase() === 'input') {
			const l = n;
			return l.select(), l.focus(), 'done';
		}
		if (n.nodeName.toLowerCase() === 'textarea') {
			const l = n;
			return (l.selectionStart = 0), (l.selectionEnd = l.value.length), l.focus(), 'done';
		}
		const s = n.ownerDocument.createRange();
		s.selectNodeContents(n);
		const o = n.ownerDocument.defaultView.getSelection();
		return o && (o.removeAllRanges(), o.addRange(s)), n.focus(), 'done';
	}
	_activelyFocused(e) {
		const n = e.getRootNode().activeElement,
			s = n === e && !!e.ownerDocument && e.ownerDocument.hasFocus();
		return { activeElement: n, isFocused: s };
	}
	focusNode(e, n) {
		if (!e.isConnected) return 'error:notconnected';
		if (e.nodeType !== Node.ELEMENT_NODE) throw this.createStacklessError('Node is not an element');
		const { activeElement: s, isFocused: o } = this._activelyFocused(e);
		if (
			(e.isContentEditable && !o && s && s.blur && s.blur(),
			e.focus(),
			e.focus(),
			n && !o && e.nodeName.toLowerCase() === 'input')
		)
			try {
				e.setSelectionRange(0, 0);
			} catch {}
		return 'done';
	}
	blurNode(e) {
		if (!e.isConnected) return 'error:notconnected';
		if (e.nodeType !== Node.ELEMENT_NODE) throw this.createStacklessError('Node is not an element');
		return e.blur(), 'done';
	}
	setInputFiles(e, n) {
		if (e.nodeType !== Node.ELEMENT_NODE) return 'Node is not of type HTMLElement';
		const s = e;
		if (s.nodeName !== 'INPUT') return 'Not an <input> element';
		const o = s;
		if ((o.getAttribute('type') || '').toLowerCase() !== 'file')
			return 'Not an input[type=file] element';
		const c = n.map((d) => {
				const p = Uint8Array.from(atob(d.buffer), (g) => g.charCodeAt(0));
				return new File([p], d.name, { type: d.mimeType, lastModified: d.lastModifiedMs });
			}),
			u = new DataTransfer();
		for (const d of c) u.items.add(d);
		(o.files = u.files),
			o.dispatchEvent(new Event('input', { bubbles: !0, composed: !0 })),
			o.dispatchEvent(new Event('change', { bubbles: !0 }));
	}
	expectHitTarget(e, n) {
		const s = [];
		let o = n;
		for (; o; ) {
			const v = xg(o);
			if (!v || (s.push(v), v.nodeType === 9)) break;
			o = v.host;
		}
		let l;
		for (let v = s.length - 1; v >= 0; v--) {
			const S = s[v],
				k = S.elementsFromPoint(e.x, e.y),
				_ = S.elementFromPoint(e.x, e.y);
			if (_ && k[0] && lt(_) === k[0]) {
				const C = this.window.getComputedStyle(_);
				(C == null ? void 0 : C.display) === 'contents' && k.unshift(_);
			}
			k[0] && k[0].shadowRoot === S && k[1] === _ && k.shift();
			const E = k[0];
			if (!E || ((l = E), v && E !== s[v - 1].host)) break;
		}
		const c = [],
			u = [];
		for (; l && l !== n; )
			c.push(l),
				u.push(['sticky', 'fixed'].includes(this.window.getComputedStyle(l).position)),
				(l = lt(l));
		if (l === n) return 'done';
		const d = this.previewNode(c[0] || this.document.documentElement);
		let p = u.some((v) => v),
			g,
			y = n;
		for (; y; ) {
			const v = c.indexOf(y);
			if (v !== -1) {
				v > 1 && (g = this.previewNode(c[v - 1])), (p = u.slice(0, v).some((S) => S));
				break;
			}
			y = lt(y);
		}
		return g
			? { hitTargetDescription: `${d} from ${g} subtree`, hasPositionStickyOrFixed: p }
			: { hitTargetDescription: d, hasPositionStickyOrFixed: p };
	}
	setupHitTargetInterceptor(e, n, s, o) {
		const l = this.retarget(e, 'button-link');
		if (!l || !l.isConnected) return 'error:notconnected';
		if (s) {
			const g = this.expectHitTarget(s, l);
			if (g !== 'done') return JSON.stringify(g);
		}
		if (n === 'drag') return { stop: () => 'done' };
		const c = {
			hover: this._hoverHitTargetInterceptorEvents,
			tap: this._tapHitTargetInterceptorEvents,
			mouse: this._mouseHitTargetInterceptorEvents,
		}[n];
		let u;
		const d = (g) => {
				if (!c.has(g.type) || !g.isTrusted) return;
				const y = this.window.TouchEvent && g instanceof this.window.TouchEvent ? g.touches[0] : g;
				u === void 0 && y && (u = this.expectHitTarget({ x: y.clientX, y: y.clientY }, l)),
					(o || (u !== 'done' && u !== void 0)) &&
						(g.preventDefault(), g.stopPropagation(), g.stopImmediatePropagation());
			},
			p = () => (
				this._hitTargetInterceptor === d && (this._hitTargetInterceptor = void 0), u || 'done'
			);
		return (this._hitTargetInterceptor = d), { stop: p };
	}
	dispatchEvent(e, n, s) {
		var c, u, d;
		let o;
		const l = { bubbles: !0, cancelable: !0, composed: !0, ...s };
		switch (this._eventTypes.get(n)) {
			case 'mouse':
				o = new MouseEvent(n, l);
				break;
			case 'keyboard':
				o = new KeyboardEvent(n, l);
				break;
			case 'touch': {
				if (this._browserName === 'webkit') {
					const p = (y) => {
							var k, _;
							if (y instanceof Touch) return y;
							let v = y.pageX;
							v === void 0 &&
								y.clientX !== void 0 &&
								(v =
									y.clientX +
									(((k = this.document.scrollingElement) == null ? void 0 : k.scrollLeft) || 0));
							let S = y.pageY;
							return (
								S === void 0 &&
									y.clientY !== void 0 &&
									(S =
										y.clientY +
										(((_ = this.document.scrollingElement) == null ? void 0 : _.scrollTop) || 0)),
								this.document.createTouch(
									this.window,
									y.target ?? e,
									y.identifier,
									v,
									S,
									y.screenX,
									y.screenY,
									y.radiusX,
									y.radiusY,
									y.rotationAngle,
									y.force,
								)
							);
						},
						g = (y) =>
							y instanceof TouchList || !y ? y : this.document.createTouchList(...y.map(p));
					l.target ?? (l.target = e),
						(l.touches = g(l.touches)),
						(l.targetTouches = g(l.targetTouches)),
						(l.changedTouches = g(l.changedTouches)),
						(o = new TouchEvent(n, l));
				} else
					l.target ?? (l.target = e),
						(l.touches =
							(c = l.touches) == null
								? void 0
								: c.map((p) =>
										p instanceof Touch ? p : new Touch({ ...p, target: p.target ?? e }),
									)),
						(l.targetTouches =
							(u = l.targetTouches) == null
								? void 0
								: u.map((p) =>
										p instanceof Touch ? p : new Touch({ ...p, target: p.target ?? e }),
									)),
						(l.changedTouches =
							(d = l.changedTouches) == null
								? void 0
								: d.map((p) =>
										p instanceof Touch ? p : new Touch({ ...p, target: p.target ?? e }),
									)),
						(o = new TouchEvent(n, l));
				break;
			}
			case 'pointer':
				o = new PointerEvent(n, l);
				break;
			case 'focus':
				o = new FocusEvent(n, l);
				break;
			case 'drag':
				o = new DragEvent(n, l);
				break;
			case 'wheel':
				o = new WheelEvent(n, l);
				break;
			case 'deviceorientation':
				try {
					o = new DeviceOrientationEvent(n, l);
				} catch {
					const { bubbles: p, cancelable: g, alpha: y, beta: v, gamma: S, absolute: k } = l;
					(o = this.document.createEvent('DeviceOrientationEvent')),
						o.initDeviceOrientationEvent(n, p, g, y, v, S, k);
				}
				break;
			case 'devicemotion':
				try {
					o = new DeviceMotionEvent(n, l);
				} catch {
					const {
						bubbles: p,
						cancelable: g,
						acceleration: y,
						accelerationIncludingGravity: v,
						rotationRate: S,
						interval: k,
					} = l;
					(o = this.document.createEvent('DeviceMotionEvent')),
						o.initDeviceMotionEvent(n, p, g, y, v, S, k);
				}
				break;
			default:
				o = new Event(n, l);
				break;
		}
		e.dispatchEvent(o);
	}
	previewNode(e) {
		if (e.nodeType === Node.TEXT_NODE) return dl(`#text=${e.nodeValue || ''}`);
		if (e.nodeType !== Node.ELEMENT_NODE) return dl(`<${e.nodeName.toLowerCase()} />`);
		const n = e,
			s = [];
		for (let d = 0; d < n.attributes.length; d++) {
			const { name: p, value: g } = n.attributes[d];
			p !== 'style' &&
				(!g && this._booleanAttributes.has(p) ? s.push(` ${p}`) : s.push(` ${p}="${g}"`));
		}
		s.sort((d, p) => d.length - p.length);
		const o = zp(s.join(''), 500);
		if (this._autoClosingTags.has(n.nodeName)) return dl(`<${n.nodeName.toLowerCase()}${o}/>`);
		const l = n.childNodes;
		let c = !1;
		if (l.length <= 5) {
			c = !0;
			for (let d = 0; d < l.length; d++) c = c && l[d].nodeType === Node.TEXT_NODE;
		}
		const u = c ? n.textContent || '' : l.length ? '…' : '';
		return dl(`<${n.nodeName.toLowerCase()}${o}>${zp(u, 50)}</${n.nodeName.toLowerCase()}>`);
	}
	strictModeViolationError(e, n) {
		const s = n
				.slice(0, 10)
				.map((l) => ({ preview: this.previewNode(l), selector: this.generateSelectorSimple(l) })),
			o = s.map(
				(l, c) => `
    ${c + 1}) ${l.preview} aka ${er(this._sdkLanguage, l.selector)}`,
			);
		return (
			s.length < n.length &&
				o.push(`
    ...`),
			this.createStacklessError(`strict mode violation: ${er(this._sdkLanguage, Tn(e))} resolved to ${n.length} elements:${o.join('')}
`)
		);
	}
	createStacklessError(e) {
		if (this._browserName === 'firefox') {
			const s = new Error('Error: ' + e);
			return (s.stack = ''), s;
		}
		const n = new Error(e);
		return delete n.stack, n;
	}
	createHighlight() {
		return new fu(this);
	}
	maskSelectors(e, n) {
		this._highlight && this.hideHighlight(),
			(this._highlight = new fu(this)),
			this._highlight.install();
		const s = [];
		for (const o of e) s.push(this.querySelectorAll(o, this.document.documentElement));
		this._highlight.maskElements(s.flat(), n);
	}
	highlight(e) {
		this._highlight || ((this._highlight = new fu(this)), this._highlight.install()),
			this._highlight.runHighlightOnRaf(e);
	}
	hideHighlight() {
		this._highlight && (this._highlight.uninstall(), delete this._highlight);
	}
	markTargetElements(e, n) {
		var c, u;
		((c = this._markedElements) == null ? void 0 : c.callId) !== n &&
			(this._markedElements = void 0);
		const s = ((u = this._markedElements) == null ? void 0 : u.elements) || new Set(),
			o = new CustomEvent('__playwright_unmark_target__', {
				bubbles: !0,
				cancelable: !0,
				detail: n,
				composed: !0,
			});
		for (const d of s) e.has(d) || d.dispatchEvent(o);
		const l = new CustomEvent('__playwright_mark_target__', {
			bubbles: !0,
			cancelable: !0,
			detail: n,
			composed: !0,
		});
		for (const d of e) s.has(d) || d.dispatchEvent(l);
		this._markedElements = { callId: n, elements: e };
	}
	_setupGlobalListenersRemovalDetection() {
		const e = '__playwright_global_listeners_check__';
		let n = !1;
		const s = () => (n = !0);
		this.window.addEventListener(e, s),
			new MutationObserver((o) => {
				if (
					o.some((c) => Array.from(c.addedNodes).includes(this.document.documentElement)) &&
					((n = !1), this.window.dispatchEvent(new CustomEvent(e)), !n)
				) {
					this.window.addEventListener(e, s);
					for (const c of this.onGlobalListenersRemoved) c();
				}
			}).observe(this.document, { childList: !0 });
	}
	_setupHitTargetInterceptors() {
		const e = (s) => {
				var o;
				return (o = this._hitTargetInterceptor) == null ? void 0 : o.call(this, s);
			},
			n = () => {
				for (const s of this._allHitTargetInterceptorEvents)
					this.window.addEventListener(s, e, { capture: !0, passive: !1 });
			};
		n(), this.onGlobalListenersRemoved.add(n);
	}
	async expect(e, n, s) {
		return n.expression === 'to.have.count' || n.expression.endsWith('.array')
			? this.expectArray(s, n)
			: e
				? await this.expectSingleElement(e, n)
				: !n.isNot && n.expression === 'to.be.hidden'
					? { matches: !0 }
					: n.isNot && n.expression === 'to.be.visible'
						? { matches: !1 }
						: !n.isNot && n.expression === 'to.be.detached'
							? { matches: !0 }
							: n.isNot && n.expression === 'to.be.attached'
								? { matches: !1 }
								: n.isNot && n.expression === 'to.be.in.viewport'
									? { matches: !1 }
									: { matches: n.isNot, missingReceived: !0 };
	}
	async expectSingleElement(e, n) {
		var o;
		const s = n.expression;
		{
			let l;
			if (s === 'to.have.attribute') {
				const c = e.hasAttribute(n.expressionArg);
				l = { matches: c, received: c ? 'attribute present' : 'attribute not present' };
			} else if (s === 'to.be.checked') {
				const { checked: c, indeterminate: u } = n.expectedValue;
				if (u) {
					if (c !== void 0)
						throw this.createStacklessError(
							"Can't assert indeterminate and checked at the same time",
						);
					l = this.elementState(e, 'indeterminate');
				} else l = this.elementState(e, c === !1 ? 'unchecked' : 'checked');
			} else if (s === 'to.be.disabled') l = this.elementState(e, 'disabled');
			else if (s === 'to.be.editable') l = this.elementState(e, 'editable');
			else if (s === 'to.be.readonly')
				(l = this.elementState(e, 'editable')), (l.matches = !l.matches);
			else if (s === 'to.be.empty')
				if (e.nodeName === 'INPUT' || e.nodeName === 'TEXTAREA') {
					const c = e.value;
					l = { matches: !c, received: c ? 'notEmpty' : 'empty' };
				} else {
					const c = (o = e.textContent) == null ? void 0 : o.trim();
					l = { matches: !c, received: c ? 'notEmpty' : 'empty' };
				}
			else if (s === 'to.be.enabled') l = this.elementState(e, 'enabled');
			else if (s === 'to.be.focused') {
				const c = this._activelyFocused(e).isFocused;
				l = { matches: c, received: c ? 'focused' : 'inactive' };
			} else
				s === 'to.be.hidden'
					? (l = this.elementState(e, 'hidden'))
					: s === 'to.be.visible'
						? (l = this.elementState(e, 'visible'))
						: s === 'to.be.attached'
							? (l = { matches: !0, received: 'attached' })
							: s === 'to.be.detached' && (l = { matches: !1, received: 'attached' });
			if (l) {
				if (l.received === 'error:notconnected')
					throw this.createStacklessError('Element is not connected');
				return l;
			}
		}
		if (s === 'to.have.property') {
			let l = e;
			const c = n.expressionArg.split('.');
			for (let p = 0; p < c.length - 1; p++) {
				if (typeof l != 'object' || !(c[p] in l)) return { received: void 0, matches: !1 };
				l = l[c[p]];
			}
			const u = l[c[c.length - 1]],
				d = Du(u, n.expectedValue);
			return { received: u, matches: d };
		}
		if (s === 'to.be.in.viewport') {
			const l = await this.viewportRatio(e);
			return {
				received: `viewport ratio ${l}`,
				matches: l > 0 && l > (n.expectedNumber ?? 0) - 1e-9,
			};
		}
		if (s === 'to.have.values') {
			if (((e = this.retarget(e, 'follow-label')), e.nodeName !== 'SELECT' || !e.multiple))
				throw this.createStacklessError('Not a select element with a multiple attribute');
			const l = [...e.selectedOptions].map((c) => c.value);
			return l.length !== n.expectedText.length
				? { received: l, matches: !1 }
				: {
						received: l,
						matches: l.map((c, u) => new pl(n.expectedText[u]).matches(c)).every(Boolean),
					};
		}
		if (s === 'to.match.aria') {
			const l = Ex(e, n.expectedValue);
			return { received: l.received, matches: !!l.matches.length };
		}
		{
			let l;
			if (s === 'to.have.attribute.value') {
				const c = e.getAttribute(n.expressionArg);
				if (c === null) return { received: null, matches: !1 };
				l = c;
			} else if (['to.have.class', 'to.contain.class'].includes(s)) {
				if (!n.expectedText)
					throw this.createStacklessError('Expected text is not provided for ' + s);
				return {
					received: e.classList.toString(),
					matches: new pl(n.expectedText[0]).matchesClassList(
						this,
						e.classList,
						s === 'to.contain.class',
					),
				};
			} else if (s === 'to.have.css')
				l = this.window.getComputedStyle(e).getPropertyValue(n.expressionArg);
			else if (s === 'to.have.id') l = e.id;
			else if (s === 'to.have.text') l = n.useInnerText ? e.innerText : Tt(new Map(), e).full;
			else if (s === 'to.have.accessible.name') l = Bi(e, !1);
			else if (s === 'to.have.accessible.description') l = sm(e, !1);
			else if (s === 'to.have.accessible.error.message') l = lx(e);
			else if (s === 'to.have.role') l = tt(e) || '';
			else if (s === 'to.have.title') l = this.document.title;
			else if (s === 'to.have.url') l = this.document.location.href;
			else if (s === 'to.have.value') {
				if (
					((e = this.retarget(e, 'follow-label')),
					e.nodeName !== 'INPUT' && e.nodeName !== 'TEXTAREA' && e.nodeName !== 'SELECT')
				)
					throw this.createStacklessError('Not an input element');
				l = e.value;
			}
			if (l !== void 0 && n.expectedText) {
				const c = new pl(n.expectedText[0]);
				return { received: l, matches: c.matches(l) };
			}
		}
		throw this.createStacklessError('Unknown expect matcher: ' + s);
	}
	expectArray(e, n) {
		const s = n.expression;
		if (s === 'to.have.count') {
			const d = e.length,
				p = d === n.expectedNumber;
			return { received: d, matches: p };
		}
		if (!n.expectedText) throw this.createStacklessError('Expected text is not provided for ' + s);
		if (['to.have.class.array', 'to.contain.class.array'].includes(s)) {
			const d = e.map((y) => y.classList),
				p = d.map(String);
			if (d.length !== n.expectedText.length) return { received: p, matches: !1 };
			const g = this._matchSequentially(n.expectedText, d, (y, v) =>
				y.matchesClassList(this, v, s === 'to.contain.class.array'),
			);
			return { received: p, matches: g };
		}
		if (!['to.contain.text.array', 'to.have.text.array'].includes(s))
			throw this.createStacklessError('Unknown expect matcher: ' + s);
		const o = e.map((d) => (n.useInnerText ? d.innerText : Tt(new Map(), d).full)),
			l = s !== 'to.contain.text.array';
		if (!(o.length === n.expectedText.length || !l)) return { received: o, matches: !1 };
		const u = this._matchSequentially(n.expectedText, o, (d, p) => d.matches(p));
		return { received: o, matches: u };
	}
	_matchSequentially(e, n, s) {
		const o = e.map((u) => new pl(u));
		let l = 0,
			c = 0;
		for (; l < o.length && c < n.length; ) s(o[l], n[c]) && ++l, ++c;
		return l === o.length;
	}
}
function dl(t) {
	return t.replace(/\n/g, '↵').replace(/\t/g, '⇆');
}
function B_(t) {
	if (((t = t.substring(1, t.length - 1)), !t.includes('\\'))) return t;
	const e = [];
	let n = 0;
	for (; n < t.length; ) t[n] === '\\' && n + 1 < t.length && n++, e.push(t[n++]);
	return e.join('');
}
function hl(t, e) {
	if (t[0] === '/' && t.lastIndexOf('/') > 0) {
		const o = t.lastIndexOf('/'),
			l = new RegExp(t.substring(1, o), t.substring(o + 1));
		return { matcher: (c) => l.test(c.full), kind: 'regex' };
	}
	const n = e ? JSON.parse.bind(JSON) : B_;
	let s = !1;
	return (
		t.length > 1 && t[0] === '"' && t[t.length - 1] === '"'
			? ((t = n(t)), (s = !0))
			: e && t.length > 1 && t[0] === '"' && t[t.length - 2] === '"' && t[t.length - 1] === 'i'
				? ((t = n(t.substring(0, t.length - 1))), (s = !1))
				: e && t.length > 1 && t[0] === '"' && t[t.length - 2] === '"' && t[t.length - 1] === 's'
					? ((t = n(t.substring(0, t.length - 1))), (s = !0))
					: t.length > 1 && t[0] === "'" && t[t.length - 1] === "'" && ((t = n(t)), (s = !0)),
		(t = mt(t)),
		s
			? e
				? { kind: 'strict', matcher: (l) => l.normalized === t }
				: {
						matcher: (l) => (!t && !l.immediate.length ? !0 : l.immediate.some((c) => mt(c) === t)),
						kind: 'strict',
					}
			: ((t = t.toLowerCase()),
				{ kind: 'lax', matcher: (o) => o.normalized.toLowerCase().includes(t) })
	);
}
class pl {
	constructor(e) {
		if (
			((this._normalizeWhiteSpace = e.normalizeWhiteSpace),
			(this._ignoreCase = e.ignoreCase),
			(this._string = e.matchSubstring ? void 0 : this.normalize(e.string)),
			(this._substring = e.matchSubstring ? this.normalize(e.string) : void 0),
			e.regexSource)
		) {
			const n = new Set((e.regexFlags || '').split(''));
			e.ignoreCase === !1 && n.delete('i'),
				e.ignoreCase === !0 && n.add('i'),
				(this._regex = new RegExp(e.regexSource, [...n].join('')));
		}
	}
	matches(e) {
		return (
			this._regex || (e = this.normalize(e)),
			this._string !== void 0
				? e === this._string
				: this._substring !== void 0
					? e.includes(this._substring)
					: this._regex
						? !!this._regex.test(e)
						: !1
		);
	}
	matchesClassList(e, n, s) {
		if (s) {
			if (this._regex)
				throw e.createStacklessError(
					'Partial matching does not support regular expressions. Please provide a string value.',
				);
			return this._string
				.split(/\s+/g)
				.filter(Boolean)
				.every((o) => n.contains(o));
		}
		return this.matches(n.toString());
	}
	normalize(e) {
		return (
			e &&
			(this._normalizeWhiteSpace && (e = mt(e)), this._ignoreCase && (e = e.toLocaleLowerCase()), e)
		);
	}
}
function Du(t, e) {
	if (t === e) return !0;
	if (t && e && typeof t == 'object' && typeof e == 'object') {
		if (t.constructor !== e.constructor) return !1;
		if (Array.isArray(t)) {
			if (t.length !== e.length) return !1;
			for (let s = 0; s < t.length; ++s) if (!Du(t[s], e[s])) return !1;
			return !0;
		}
		if (t instanceof RegExp) return t.source === e.source && t.flags === e.flags;
		if (t.valueOf !== Object.prototype.valueOf) return t.valueOf() === e.valueOf();
		if (t.toString !== Object.prototype.toString) return t.toString() === e.toString();
		const n = Object.keys(t);
		if (n.length !== Object.keys(e).length) return !1;
		for (let s = 0; s < n.length; ++s) if (!e.hasOwnProperty(n[s])) return !1;
		for (const s of n) if (!Du(t[s], e[s])) return !1;
		return !0;
	}
	return typeof t == 'number' && typeof e == 'number' ? isNaN(t) && isNaN(e) : !1;
}
const z_ = {
		tagName: 'svg',
		children: [
			{
				tagName: 'defs',
				children: [
					{
						tagName: 'clipPath',
						attrs: {
							width: '16',
							height: '16',
							viewBox: '0 0 16 16',
							fill: 'currentColor',
							id: 'icon-gripper',
						},
						children: [
							{
								tagName: 'path',
								attrs: { d: 'M5 3h2v2H5zm0 4h2v2H5zm0 4h2v2H5zm4-8h2v2H9zm0 4h2v2H9zm0 4h2v2H9z' },
							},
						],
					},
					{
						tagName: 'clipPath',
						attrs: {
							width: '16',
							height: '16',
							viewBox: '0 0 16 16',
							fill: 'currentColor',
							id: 'icon-circle-large-filled',
						},
						children: [
							{
								tagName: 'path',
								attrs: {
									d: 'M8 1a6.8 6.8 0 0 1 1.86.253 6.899 6.899 0 0 1 3.083 1.805 6.903 6.903 0 0 1 1.804 3.083C14.916 6.738 15 7.357 15 8s-.084 1.262-.253 1.86a6.9 6.9 0 0 1-.704 1.674 7.157 7.157 0 0 1-2.516 2.509 6.966 6.966 0 0 1-1.668.71A6.984 6.984 0 0 1 8 15a6.984 6.984 0 0 1-1.86-.246 7.098 7.098 0 0 1-1.674-.711 7.3 7.3 0 0 1-1.415-1.094 7.295 7.295 0 0 1-1.094-1.415 7.098 7.098 0 0 1-.71-1.675A6.985 6.985 0 0 1 1 8c0-.643.082-1.262.246-1.86a6.968 6.968 0 0 1 .711-1.667 7.156 7.156 0 0 1 2.509-2.516 6.895 6.895 0 0 1 1.675-.704A6.808 6.808 0 0 1 8 1z',
								},
							},
						],
					},
					{
						tagName: 'clipPath',
						attrs: {
							width: '16',
							height: '16',
							viewBox: '0 0 16 16',
							fill: 'currentColor',
							id: 'icon-inspect',
						},
						children: [
							{
								tagName: 'path',
								attrs: {
									'fill-rule': 'evenodd',
									'clip-rule': 'evenodd',
									d: 'M1 3l1-1h12l1 1v6h-1V3H2v8h5v1H2l-1-1V3zm14.707 9.707L9 6v9.414l2.707-2.707h4zM10 13V8.414l3.293 3.293h-2L10 13z',
								},
							},
						],
					},
					{
						tagName: 'clipPath',
						attrs: {
							width: '16',
							height: '16',
							viewBox: '0 0 16 16',
							fill: 'currentColor',
							id: 'icon-whole-word',
						},
						children: [
							{
								tagName: 'path',
								attrs: {
									'fill-rule': 'evenodd',
									'clip-rule': 'evenodd',
									d: 'M0 11H1V13H15V11H16V14H15H1H0V11Z',
								},
							},
							{
								tagName: 'path',
								attrs: {
									d: 'M6.84048 11H5.95963V10.1406H5.93814C5.555 10.7995 4.99104 11.1289 4.24625 11.1289C3.69839 11.1289 3.26871 10.9839 2.95718 10.6938C2.64924 10.4038 2.49527 10.0189 2.49527 9.53906C2.49527 8.51139 3.10041 7.91341 4.3107 7.74512L5.95963 7.51416C5.95963 6.57959 5.58186 6.1123 4.82632 6.1123C4.16389 6.1123 3.56591 6.33789 3.03238 6.78906V5.88672C3.57307 5.54297 4.19612 5.37109 4.90152 5.37109C6.19416 5.37109 6.84048 6.05501 6.84048 7.42285V11ZM5.95963 8.21777L4.63297 8.40039C4.22476 8.45768 3.91682 8.55973 3.70914 8.70654C3.50145 8.84977 3.39761 9.10579 3.39761 9.47461C3.39761 9.74316 3.4925 9.96338 3.68228 10.1353C3.87564 10.3035 4.13166 10.3877 4.45035 10.3877C4.8872 10.3877 5.24706 10.2355 5.52994 9.93115C5.8164 9.62321 5.95963 9.2347 5.95963 8.76562V8.21777Z',
								},
							},
							{
								tagName: 'path',
								attrs: {
									d: 'M9.3475 10.2051H9.32601V11H8.44515V2.85742H9.32601V6.4668H9.3475C9.78076 5.73633 10.4146 5.37109 11.2489 5.37109C11.9543 5.37109 12.5057 5.61816 12.9032 6.1123C13.3042 6.60286 13.5047 7.26172 13.5047 8.08887C13.5047 9.00911 13.2809 9.74674 12.8333 10.3018C12.3857 10.8532 11.7734 11.1289 10.9964 11.1289C10.2695 11.1289 9.71989 10.821 9.3475 10.2051ZM9.32601 7.98682V8.75488C9.32601 9.20964 9.47282 9.59635 9.76644 9.91504C10.0636 10.2301 10.4396 10.3877 10.8944 10.3877C11.4279 10.3877 11.8451 10.1836 12.1458 9.77539C12.4502 9.36719 12.6024 8.79964 12.6024 8.07275C12.6024 7.46045 12.4609 6.98063 12.1781 6.6333C11.8952 6.28597 11.512 6.1123 11.0286 6.1123C10.5166 6.1123 10.1048 6.29134 9.7933 6.64941C9.48177 7.00391 9.32601 7.44971 9.32601 7.98682Z',
								},
							},
						],
					},
					{
						tagName: 'clipPath',
						attrs: {
							width: '16',
							height: '16',
							viewBox: '0 0 16 16',
							fill: 'currentColor',
							id: 'icon-eye',
						},
						children: [
							{
								tagName: 'path',
								attrs: {
									d: 'M7.99993 6.00316C9.47266 6.00316 10.6666 7.19708 10.6666 8.66981C10.6666 10.1426 9.47266 11.3365 7.99993 11.3365C6.52715 11.3365 5.33324 10.1426 5.33324 8.66981C5.33324 7.19708 6.52715 6.00316 7.99993 6.00316ZM7.99993 7.00315C7.07946 7.00315 6.33324 7.74935 6.33324 8.66981C6.33324 9.59028 7.07946 10.3365 7.99993 10.3365C8.9204 10.3365 9.6666 9.59028 9.6666 8.66981C9.6666 7.74935 8.9204 7.00315 7.99993 7.00315ZM7.99993 3.66675C11.0756 3.66675 13.7307 5.76675 14.4673 8.70968C14.5344 8.97755 14.3716 9.24908 14.1037 9.31615C13.8358 9.38315 13.5643 9.22041 13.4973 8.95248C12.8713 6.45205 10.6141 4.66675 7.99993 4.66675C5.38454 4.66675 3.12664 6.45359 2.50182 8.95555C2.43491 9.22341 2.16348 9.38635 1.89557 9.31948C1.62766 9.25255 1.46471 8.98115 1.53162 8.71321C2.26701 5.76856 4.9229 3.66675 7.99993 3.66675Z',
								},
							},
						],
					},
					{
						tagName: 'clipPath',
						attrs: {
							width: '16',
							height: '16',
							viewBox: '0 0 16 16',
							fill: 'currentColor',
							id: 'icon-symbol-constant',
						},
						children: [
							{
								tagName: 'path',
								attrs: {
									'fill-rule': 'evenodd',
									'clip-rule': 'evenodd',
									d: 'M4 6h8v1H4V6zm8 3H4v1h8V9z',
								},
							},
							{
								tagName: 'path',
								attrs: {
									'fill-rule': 'evenodd',
									'clip-rule': 'evenodd',
									d: 'M1 4l1-1h12l1 1v8l-1 1H2l-1-1V4zm1 0v8h12V4H2z',
								},
							},
						],
					},
					{
						tagName: 'clipPath',
						attrs: {
							width: '16',
							height: '16',
							viewBox: '0 0 16 16',
							fill: 'currentColor',
							id: 'icon-check',
						},
						children: [
							{
								tagName: 'path',
								attrs: {
									'fill-rule': 'evenodd',
									'clip-rule': 'evenodd',
									d: 'M14.431 3.323l-8.47 10-.79-.036-3.35-4.77.818-.574 2.978 4.24 8.051-9.506.764.646z',
								},
							},
						],
					},
					{
						tagName: 'clipPath',
						attrs: {
							width: '16',
							height: '16',
							viewBox: '0 0 16 16',
							fill: 'currentColor',
							id: 'icon-close',
						},
						children: [
							{
								tagName: 'path',
								attrs: {
									'fill-rule': 'evenodd',
									'clip-rule': 'evenodd',
									d: 'M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z',
								},
							},
						],
					},
					{
						tagName: 'clipPath',
						attrs: {
							width: '16',
							height: '16',
							viewBox: '0 0 16 16',
							fill: 'currentColor',
							id: 'icon-pass',
						},
						children: [
							{
								tagName: 'path',
								attrs: {
									d: 'M6.27 10.87h.71l4.56-4.56-.71-.71-4.2 4.21-1.92-1.92L4 8.6l2.27 2.27z',
								},
							},
							{
								tagName: 'path',
								attrs: {
									'fill-rule': 'evenodd',
									'clip-rule': 'evenodd',
									d: 'M8.6 1c1.6.1 3.1.9 4.2 2 1.3 1.4 2 3.1 2 5.1 0 1.6-.6 3.1-1.6 4.4-1 1.2-2.4 2.1-4 2.4-1.6.3-3.2.1-4.6-.7-1.4-.8-2.5-2-3.1-3.5C.9 9.2.8 7.5 1.3 6c.5-1.6 1.4-2.9 2.8-3.8C5.4 1.3 7 .9 8.6 1zm.5 12.9c1.3-.3 2.5-1 3.4-2.1.8-1.1 1.3-2.4 1.2-3.8 0-1.6-.6-3.2-1.7-4.3-1-1-2.2-1.6-3.6-1.7-1.3-.1-2.7.2-3.8 1-1.1.8-1.9 1.9-2.3 3.3-.4 1.3-.4 2.7.2 4 .6 1.3 1.5 2.3 2.7 3 1.2.7 2.6.9 3.9.6z',
								},
							},
						],
					},
					{
						tagName: 'clipPath',
						attrs: {
							width: '16',
							height: '16',
							viewBox: '0 0 16 16',
							fill: 'currentColor',
							id: 'icon-gist',
						},
						children: [
							{
								tagName: 'path',
								attrs: {
									'fill-rule': 'evenodd',
									'clip-rule': 'evenodd',
									d: 'M10.57 1.14l3.28 3.3.15.36v9.7l-.5.5h-11l-.5-.5v-13l.5-.5h7.72l.35.14zM10 5h3l-3-3v3zM3 2v12h10V6H9.5L9 5.5V2H3zm2.062 7.533l1.817-1.828L6.17 7 4 9.179v.707l2.171 2.174.707-.707-1.816-1.82zM8.8 7.714l.7-.709 2.189 2.175v.709L9.5 12.062l-.705-.709 1.831-1.82L8.8 7.714z',
								},
							},
						],
					},
				],
			},
		],
	},
	Ht = { multiple: '#f6b26b7f', single: '#6fa8dc7f', assert: '#8acae480', action: '#dc6f6f7f' };
class ym {
	cursor() {
		return 'default';
	}
}
class mu {
	constructor(e, n) {
		(this._hoveredModel = null),
			(this._hoveredElement = null),
			(this._recorder = e),
			(this._assertVisibility = n);
	}
	cursor() {
		return 'pointer';
	}
	cleanup() {
		(this._hoveredModel = null), (this._hoveredElement = null);
	}
	onClick(e) {
		var n;
		Oe(e),
			e.button === 0 &&
				(n = this._hoveredModel) != null &&
				n.selector &&
				this._commit(this._hoveredModel.selector, this._hoveredModel);
	}
	onPointerDown(e) {
		Oe(e);
	}
	onPointerUp(e) {
		Oe(e);
	}
	onMouseDown(e) {
		Oe(e);
	}
	onMouseUp(e) {
		Oe(e);
	}
	onMouseMove(e) {
		var o;
		Oe(e);
		let n = this._recorder.deepEventTarget(e);
		if ((n.isConnected || (n = null), this._hoveredElement === n)) return;
		this._hoveredElement = n;
		let s = null;
		if (this._hoveredElement) {
			const l = this._recorder.injectedScript.generateSelector(this._hoveredElement, {
				testIdAttributeName: this._recorder.state.testIdAttributeName,
				multiple: !1,
			});
			s = {
				selector: l.selector,
				elements: l.elements,
				tooltipText: this._recorder.injectedScript.utils.asLocator(
					this._recorder.state.language,
					l.selector,
				),
				color: this._assertVisibility ? Ht.assert : Ht.single,
			};
		}
		((o = this._hoveredModel) == null ? void 0 : o.selector) !==
			(s == null ? void 0 : s.selector) &&
			((this._hoveredModel = s), this._recorder.updateHighlight(s, !0));
	}
	onMouseEnter(e) {
		Oe(e);
	}
	onMouseLeave(e) {
		Oe(e);
		const n = this._recorder.injectedScript.window;
		n.top !== n &&
			this._recorder.deepEventTarget(e).nodeType === Node.DOCUMENT_NODE &&
			this._reset(!0);
	}
	onKeyDown(e) {
		Oe(e), e.key === 'Escape' && this._assertVisibility && this._recorder.setMode('recording');
	}
	onKeyUp(e) {
		Oe(e);
	}
	onScroll(e) {
		this._reset(!1);
	}
	_commit(e, n) {
		var s;
		this._assertVisibility
			? (this._recorder.recordAction({ name: 'assertVisible', selector: e, signals: [] }),
				this._recorder.setMode('recording'),
				(s = this._recorder.overlay) == null || s.flashToolSucceeded('assertingVisibility'))
			: this._recorder.elementPicked(e, n);
	}
	_reset(e) {
		(this._hoveredElement = null),
			(this._hoveredModel = null),
			this._recorder.updateHighlight(null, e);
	}
}
class H_ {
	constructor(e) {
		(this._hoveredModel = null),
			(this._hoveredElement = null),
			(this._activeModel = null),
			(this._expectProgrammaticKeyUp = !1),
			(this._recorder = e),
			(this._performingActions = new Set());
	}
	cursor() {
		return 'pointer';
	}
	cleanup() {
		(this._hoveredModel = null),
			(this._hoveredElement = null),
			(this._activeModel = null),
			(this._expectProgrammaticKeyUp = !1);
	}
	onClick(e) {
		if (
			Su(this._hoveredElement) ||
			(e.button === 2 && e.type === 'auxclick') ||
			this._shouldIgnoreMouseEvent(e) ||
			this._actionInProgress(e) ||
			this._consumedDueToNoModel(e, this._hoveredModel)
		)
			return;
		const n = wu(this._recorder.deepEventTarget(e));
		if (n) {
			this._performAction({
				name: n.checked ? 'check' : 'uncheck',
				selector: this._hoveredModel.selector,
				signals: [],
			});
			return;
		}
		this._cancelPendingClickAction(),
			e.detail === 1 &&
				(this._pendingClickAction = {
					action: {
						name: 'click',
						selector: this._hoveredModel.selector,
						position: vu(e),
						signals: [],
						button: vm(e),
						modifiers: yu(e),
						clickCount: e.detail,
					},
					timeout: this._recorder.injectedScript.utils.builtins.setTimeout(
						() => this._commitPendingClickAction(),
						200,
					),
				});
	}
	onDblClick(e) {
		Su(this._hoveredElement) ||
			this._shouldIgnoreMouseEvent(e) ||
			this._actionInProgress(e) ||
			this._consumedDueToNoModel(e, this._hoveredModel) ||
			(this._cancelPendingClickAction(),
			this._performAction({
				name: 'click',
				selector: this._hoveredModel.selector,
				position: vu(e),
				signals: [],
				button: vm(e),
				modifiers: yu(e),
				clickCount: e.detail,
			}));
	}
	_commitPendingClickAction() {
		this._pendingClickAction && this._performAction(this._pendingClickAction.action),
			this._cancelPendingClickAction();
	}
	_cancelPendingClickAction() {
		this._pendingClickAction &&
			this._recorder.injectedScript.utils.builtins.clearTimeout(this._pendingClickAction.timeout),
			(this._pendingClickAction = void 0);
	}
	onContextMenu(e) {
		this._shouldIgnoreMouseEvent(e) ||
			this._actionInProgress(e) ||
			this._consumedDueToNoModel(e, this._hoveredModel) ||
			this._performAction({
				name: 'click',
				selector: this._hoveredModel.selector,
				position: vu(e),
				signals: [],
				button: 'right',
				modifiers: 0,
				clickCount: 0,
			});
	}
	onPointerDown(e) {
		this._shouldIgnoreMouseEvent(e) || this._performingActions.size || Oe(e);
	}
	onPointerUp(e) {
		this._shouldIgnoreMouseEvent(e) || this._performingActions.size || Oe(e);
	}
	onMouseDown(e) {
		this._shouldIgnoreMouseEvent(e) ||
			(this._performingActions.size || Oe(e), (this._activeModel = this._hoveredModel));
	}
	onMouseUp(e) {
		this._shouldIgnoreMouseEvent(e) || this._performingActions.size || Oe(e);
	}
	onMouseMove(e) {
		const n = this._recorder.deepEventTarget(e);
		this._hoveredElement !== n &&
			((this._hoveredElement = n), this._updateModelForHoveredElement());
	}
	onMouseLeave(e) {
		const n = this._recorder.injectedScript.window;
		n.top !== n &&
			this._recorder.deepEventTarget(e).nodeType === Node.DOCUMENT_NODE &&
			((this._hoveredElement = null), this._updateModelForHoveredElement());
	}
	onFocus(e) {
		this._onFocus(!0);
	}
	onInput(e) {
		const n = this._recorder.deepEventTarget(e);
		if (n.nodeName === 'INPUT' && n.type.toLowerCase() === 'file') {
			this._recorder.recordAction({
				name: 'setInputFiles',
				selector: this._activeModel.selector,
				signals: [],
				files: [...(n.files || [])].map((s) => s.name),
			});
			return;
		}
		if (Su(n)) {
			this._recorder.recordAction({
				name: 'fill',
				selector: this._hoveredModel.selector,
				signals: [],
				text: n.value,
			});
			return;
		}
		if (['INPUT', 'TEXTAREA'].includes(n.nodeName) || n.isContentEditable) {
			if (
				(n.nodeName === 'INPUT' && ['checkbox', 'radio'].includes(n.type.toLowerCase())) ||
				this._consumedDueWrongTarget(e)
			)
				return;
			this._recorder.recordAction({
				name: 'fill',
				selector: this._activeModel.selector,
				signals: [],
				text: n.isContentEditable ? n.innerText : n.value,
			});
		}
		if (n.nodeName === 'SELECT') {
			const s = n;
			if (this._actionInProgress(e)) return;
			this._performAction({
				name: 'select',
				selector: this._activeModel.selector,
				options: [...s.selectedOptions].map((o) => o.value),
				signals: [],
			});
		}
	}
	onKeyDown(e) {
		if (this._shouldGenerateKeyPressFor(e)) {
			if (this._actionInProgress(e)) {
				this._expectProgrammaticKeyUp = !0;
				return;
			}
			if (!this._consumedDueWrongTarget(e)) {
				if (e.key === ' ') {
					const n = wu(this._recorder.deepEventTarget(e));
					if (n) {
						this._performAction({
							name: n.checked ? 'uncheck' : 'check',
							selector: this._activeModel.selector,
							signals: [],
						});
						return;
					}
				}
				this._performAction({
					name: 'press',
					selector: this._activeModel.selector,
					signals: [],
					key: e.key,
					modifiers: yu(e),
				});
			}
		}
	}
	onKeyUp(e) {
		if (this._shouldGenerateKeyPressFor(e)) {
			if (!this._expectProgrammaticKeyUp) {
				Oe(e);
				return;
			}
			this._expectProgrammaticKeyUp = !1;
		}
	}
	onScroll(e) {
		(this._hoveredModel = null),
			(this._hoveredElement = null),
			this._recorder.updateHighlight(null, !1);
	}
	_onFocus(e) {
		const n = W_(this._recorder.document);
		if (e && n === this._recorder.document.body) return;
		const s = n
			? this._recorder.injectedScript.generateSelector(n, {
					testIdAttributeName: this._recorder.state.testIdAttributeName,
				})
			: null;
		(this._activeModel = s && s.selector ? { ...s, color: Ht.action } : null),
			e && ((this._hoveredElement = n), this._updateModelForHoveredElement());
	}
	_shouldIgnoreMouseEvent(e) {
		const n = this._recorder.deepEventTarget(e),
			s = n.nodeName;
		return !!(
			s === 'SELECT' ||
			s === 'OPTION' ||
			(s === 'INPUT' && ['date', 'range'].includes(n.type))
		);
	}
	_actionInProgress(e) {
		const n = e instanceof KeyboardEvent,
			s = e instanceof MouseEvent || e instanceof PointerEvent;
		for (const o of this._performingActions)
			if (
				(n && o.name === 'press' && e.key === o.key) ||
				(s && (o.name === 'click' || o.name === 'check' || o.name === 'uncheck'))
			)
				return !0;
		return Oe(e), !1;
	}
	_consumedDueToNoModel(e, n) {
		return n ? !1 : (Oe(e), !0);
	}
	_consumedDueWrongTarget(e) {
		return this._activeModel && this._activeModel.elements[0] === this._recorder.deepEventTarget(e)
			? !1
			: (Oe(e), !0);
	}
	_performAction(e) {
		(this._hoveredElement = null),
			(this._hoveredModel = null),
			(this._activeModel = null),
			this._recorder.updateHighlight(null, !1),
			this._performingActions.add(e),
			this._recorder.performAction(e).then(() => {
				this._performingActions.delete(e),
					this._onFocus(!1),
					this._recorder.injectedScript.isUnderTest &&
						console.error(
							'Action performed for test: ' +
								JSON.stringify({
									hovered: this._hoveredModel ? this._hoveredModel.selector : null,
									active: this._activeModel ? this._activeModel.selector : null,
								}),
						);
			});
	}
	_shouldGenerateKeyPressFor(e) {
		if (
			typeof e.key != 'string' ||
			(e.key === 'Enter' &&
				(this._recorder.deepEventTarget(e).nodeName === 'TEXTAREA' ||
					this._recorder.deepEventTarget(e).isContentEditable)) ||
			['Backspace', 'Delete', 'AltGraph'].includes(e.key) ||
			(e.key === '@' && e.code === 'KeyL')
		)
			return !1;
		if (navigator.platform.includes('Mac')) {
			if (e.key === 'v' && e.metaKey) return !1;
		} else if ((e.key === 'v' && e.ctrlKey) || (e.key === 'Insert' && e.shiftKey)) return !1;
		if (['Shift', 'Control', 'Meta', 'Alt', 'Process'].includes(e.key)) return !1;
		const n = e.ctrlKey || e.altKey || e.metaKey;
		return e.key.length === 1 && !n ? !!wu(this._recorder.deepEventTarget(e)) : !0;
	}
	_updateModelForHoveredElement() {
		if (this._performingActions.size) return;
		if (!this._hoveredElement || !this._hoveredElement.isConnected) {
			(this._hoveredModel = null),
				(this._hoveredElement = null),
				this._recorder.updateHighlight(null, !0);
			return;
		}
		const { selector: e, elements: n } = this._recorder.injectedScript.generateSelector(
			this._hoveredElement,
			{ testIdAttributeName: this._recorder.state.testIdAttributeName },
		);
		(this._hoveredModel && this._hoveredModel.selector === e) ||
			((this._hoveredModel = e ? { selector: e, elements: n, color: Ht.action } : null),
			this._recorder.updateHighlight(this._hoveredModel, !0));
	}
}
class gu {
	constructor(e, n) {
		(this._hoverHighlight = null),
			(this._action = null),
			(this._recorder = e),
			(this._textCache = new Map()),
			(this._kind = n),
			(this._dialog = new V_(e));
	}
	cursor() {
		return 'pointer';
	}
	cleanup() {
		this._dialog.close(), (this._hoverHighlight = null);
	}
	onClick(e) {
		Oe(e),
			this._kind === 'value'
				? this._commitAssertValue()
				: this._dialog.isShowing() || this._showDialog();
	}
	onMouseDown(e) {
		const n = this._recorder.deepEventTarget(e);
		this._elementHasValue(n) && e.preventDefault();
	}
	onPointerUp(e) {
		var s;
		const n = (s = this._hoverHighlight) == null ? void 0 : s.elements[0];
		this._kind === 'value' &&
			n &&
			(n.nodeName === 'INPUT' || n.nodeName === 'SELECT') &&
			n.disabled &&
			this._commitAssertValue();
	}
	onMouseMove(e) {
		var s;
		if (this._dialog.isShowing()) return;
		const n = this._recorder.deepEventTarget(e);
		if (((s = this._hoverHighlight) == null ? void 0 : s.elements[0]) !== n) {
			if (this._kind === 'text' || this._kind === 'snapshot')
				this._hoverHighlight = this._recorder.injectedScript.utils.elementText(this._textCache, n)
					.full
					? { elements: [n], selector: '', color: Ht.assert }
					: null;
			else if (this._elementHasValue(n)) {
				const o = this._recorder.injectedScript.generateSelector(n, {
					testIdAttributeName: this._recorder.state.testIdAttributeName,
				});
				this._hoverHighlight = { selector: o.selector, elements: o.elements, color: Ht.assert };
			} else this._hoverHighlight = null;
			this._recorder.updateHighlight(this._hoverHighlight, !0);
		}
	}
	onKeyDown(e) {
		e.key === 'Escape' && this._recorder.setMode('recording'), Oe(e);
	}
	onScroll(e) {
		this._recorder.updateHighlight(this._hoverHighlight, !1);
	}
	_elementHasValue(e) {
		return (
			e.nodeName === 'TEXTAREA' ||
			e.nodeName === 'SELECT' ||
			(e.nodeName === 'INPUT' && !['button', 'image', 'reset', 'submit'].includes(e.type))
		);
	}
	_generateAction() {
		var n;
		this._textCache.clear();
		const e = (n = this._hoverHighlight) == null ? void 0 : n.elements[0];
		if (!e) return null;
		if (this._kind === 'value') {
			if (!this._elementHasValue(e)) return null;
			const { selector: s } = this._recorder.injectedScript.generateSelector(e, {
				testIdAttributeName: this._recorder.state.testIdAttributeName,
			});
			return e.nodeName === 'INPUT' && ['checkbox', 'radio'].includes(e.type.toLowerCase())
				? { name: 'assertChecked', selector: s, signals: [], checked: !e.checked }
				: { name: 'assertValue', selector: s, signals: [], value: e.value };
		} else if (this._kind === 'snapshot') {
			const s = this._recorder.injectedScript.generateSelector(e, {
				testIdAttributeName: this._recorder.state.testIdAttributeName,
				forTextExpect: !0,
			});
			return (
				(this._hoverHighlight = { selector: s.selector, elements: s.elements, color: Ht.assert }),
				this._recorder.updateHighlight(this._hoverHighlight, !0),
				{
					name: 'assertSnapshot',
					selector: this._hoverHighlight.selector,
					signals: [],
					snapshot: this._recorder.injectedScript.ariaSnapshot(e, { mode: 'regex' }),
				}
			);
		} else {
			const s = this._recorder.injectedScript.generateSelector(e, {
				testIdAttributeName: this._recorder.state.testIdAttributeName,
				forTextExpect: !0,
			});
			return (
				(this._hoverHighlight = { selector: s.selector, elements: s.elements, color: Ht.assert }),
				this._recorder.updateHighlight(this._hoverHighlight, !0),
				{
					name: 'assertText',
					selector: this._hoverHighlight.selector,
					signals: [],
					text: this._recorder.injectedScript.utils.elementText(this._textCache, e).normalized,
					substring: !0,
				}
			);
		}
	}
	_renderValue(e) {
		return (e == null ? void 0 : e.name) === 'assertText'
			? this._recorder.injectedScript.utils.normalizeWhiteSpace(e.text)
			: (e == null ? void 0 : e.name) === 'assertChecked'
				? String(e.checked)
				: (e == null ? void 0 : e.name) === 'assertValue'
					? e.value
					: (e == null ? void 0 : e.name) === 'assertSnapshot'
						? e.snapshot
						: '';
	}
	_commit() {
		!this._action ||
			!this._dialog.isShowing() ||
			(this._dialog.close(),
			this._recorder.recordAction(this._action),
			this._recorder.setMode('recording'));
	}
	_showDialog() {
		var e, n, s, o;
		(e = this._hoverHighlight) != null &&
			e.elements[0] &&
			((this._action = this._generateAction()),
			((n = this._action) == null ? void 0 : n.name) === 'assertText'
				? this._showTextDialog(this._action)
				: ((s = this._action) == null ? void 0 : s.name) === 'assertSnapshot' &&
					(this._recorder.recordAction(this._action),
					this._recorder.setMode('recording'),
					(o = this._recorder.overlay) == null || o.flashToolSucceeded('assertingSnapshot')));
	}
	_showTextDialog(e) {
		const n = this._recorder.document.createElement('textarea');
		n.setAttribute('spellcheck', 'false'),
			(n.value = this._renderValue(e)),
			n.classList.add('text-editor');
		const s = () => {
			var y;
			const u = this._recorder.injectedScript.utils.normalizeWhiteSpace(n.value),
				d = (y = this._hoverHighlight) == null ? void 0 : y.elements[0];
			if (!d) return;
			e.text = u;
			const p = this._recorder.injectedScript.utils.elementText(this._textCache, d).normalized,
				g = u && p.includes(u);
			n.classList.toggle('does-not-match', !g);
		};
		n.addEventListener('input', s);
		const l = this._dialog.show({
				label: 'Assert that element contains text',
				body: n,
				onCommit: () => this._commit(),
			}),
			c = this._recorder.highlight.tooltipPosition(this._recorder.highlight.firstBox(), l);
		this._dialog.moveTo(c.anchorTop, c.anchorLeft), n.focus();
	}
	_commitAssertValue() {
		var n;
		if (this._kind !== 'value') return;
		const e = this._generateAction();
		e &&
			(this._recorder.recordAction(e),
			this._recorder.setMode('recording'),
			(n = this._recorder.overlay) == null || n.flashToolSucceeded('assertingValue'));
	}
}
class U_ {
	constructor(e) {
		(this._listeners = []),
			(this._offsetX = 0),
			(this._measure = { width: 0, height: 0 }),
			(this._recorder = e);
		const n = this._recorder.document;
		this._overlayElement = n.createElement('x-pw-overlay');
		const s = n.createElement('x-pw-tools-list');
		this._overlayElement.appendChild(s),
			(this._dragHandle = n.createElement('x-pw-tool-gripper')),
			this._dragHandle.appendChild(n.createElement('x-div')),
			s.appendChild(this._dragHandle),
			(this._recordToggle = this._recorder.document.createElement('x-pw-tool-item')),
			(this._recordToggle.title = 'Record'),
			this._recordToggle.classList.add('record'),
			this._recordToggle.appendChild(this._recorder.document.createElement('x-div')),
			s.appendChild(this._recordToggle),
			(this._pickLocatorToggle = this._recorder.document.createElement('x-pw-tool-item')),
			(this._pickLocatorToggle.title = 'Pick locator'),
			this._pickLocatorToggle.classList.add('pick-locator'),
			this._pickLocatorToggle.appendChild(this._recorder.document.createElement('x-div')),
			s.appendChild(this._pickLocatorToggle),
			(this._assertVisibilityToggle = this._recorder.document.createElement('x-pw-tool-item')),
			(this._assertVisibilityToggle.title = 'Assert visibility'),
			this._assertVisibilityToggle.classList.add('visibility'),
			this._assertVisibilityToggle.appendChild(this._recorder.document.createElement('x-div')),
			s.appendChild(this._assertVisibilityToggle),
			(this._assertTextToggle = this._recorder.document.createElement('x-pw-tool-item')),
			(this._assertTextToggle.title = 'Assert text'),
			this._assertTextToggle.classList.add('text'),
			this._assertTextToggle.appendChild(this._recorder.document.createElement('x-div')),
			s.appendChild(this._assertTextToggle),
			(this._assertValuesToggle = this._recorder.document.createElement('x-pw-tool-item')),
			(this._assertValuesToggle.title = 'Assert value'),
			this._assertValuesToggle.classList.add('value'),
			this._assertValuesToggle.appendChild(this._recorder.document.createElement('x-div')),
			s.appendChild(this._assertValuesToggle),
			(this._assertSnapshotToggle = this._recorder.document.createElement('x-pw-tool-item')),
			(this._assertSnapshotToggle.title = 'Assert snapshot'),
			this._assertSnapshotToggle.classList.add('snapshot'),
			this._assertSnapshotToggle.appendChild(this._recorder.document.createElement('x-div')),
			s.appendChild(this._assertSnapshotToggle),
			this._updateVisualPosition(),
			this._refreshListeners();
	}
	_refreshListeners() {
		gy(this._listeners),
			(this._listeners = [
				Le(this._dragHandle, 'mousedown', (e) => {
					this._dragState = { offsetX: this._offsetX, dragStart: { x: e.clientX, y: 0 } };
				}),
				Le(this._recordToggle, 'click', () => {
					this._recordToggle.classList.contains('disabled') ||
						this._recorder.setMode(
							this._recorder.state.mode === 'none' ||
								this._recorder.state.mode === 'standby' ||
								this._recorder.state.mode === 'inspecting'
								? 'recording'
								: 'standby',
						);
				}),
				Le(this._pickLocatorToggle, 'click', () => {
					if (this._pickLocatorToggle.classList.contains('disabled')) return;
					const e = {
						inspecting: 'standby',
						none: 'inspecting',
						standby: 'inspecting',
						recording: 'recording-inspecting',
						'recording-inspecting': 'recording',
						assertingText: 'recording-inspecting',
						assertingVisibility: 'recording-inspecting',
						assertingValue: 'recording-inspecting',
						assertingSnapshot: 'recording-inspecting',
					};
					this._recorder.setMode(e[this._recorder.state.mode]);
				}),
				Le(this._assertVisibilityToggle, 'click', () => {
					this._assertVisibilityToggle.classList.contains('disabled') ||
						this._recorder.setMode(
							this._recorder.state.mode === 'assertingVisibility'
								? 'recording'
								: 'assertingVisibility',
						);
				}),
				Le(this._assertTextToggle, 'click', () => {
					this._assertTextToggle.classList.contains('disabled') ||
						this._recorder.setMode(
							this._recorder.state.mode === 'assertingText' ? 'recording' : 'assertingText',
						);
				}),
				Le(this._assertValuesToggle, 'click', () => {
					this._assertValuesToggle.classList.contains('disabled') ||
						this._recorder.setMode(
							this._recorder.state.mode === 'assertingValue' ? 'recording' : 'assertingValue',
						);
				}),
				Le(this._assertSnapshotToggle, 'click', () => {
					this._assertSnapshotToggle.classList.contains('disabled') ||
						this._recorder.setMode(
							this._recorder.state.mode === 'assertingSnapshot' ? 'recording' : 'assertingSnapshot',
						);
				}),
			]);
	}
	install() {
		this._recorder.highlight.appendChild(this._overlayElement),
			this._refreshListeners(),
			this._updateVisualPosition();
	}
	contains(e) {
		return this._recorder.injectedScript.utils.isInsideScope(this._overlayElement, e);
	}
	setUIState(e) {
		this._recordToggle.classList.toggle(
			'toggled',
			e.mode === 'recording' ||
				e.mode === 'assertingText' ||
				e.mode === 'assertingVisibility' ||
				e.mode === 'assertingValue' ||
				e.mode === 'assertingSnapshot' ||
				e.mode === 'recording-inspecting',
		),
			this._pickLocatorToggle.classList.toggle(
				'toggled',
				e.mode === 'inspecting' || e.mode === 'recording-inspecting',
			),
			this._assertVisibilityToggle.classList.toggle('toggled', e.mode === 'assertingVisibility'),
			this._assertVisibilityToggle.classList.toggle(
				'disabled',
				e.mode === 'none' || e.mode === 'standby' || e.mode === 'inspecting',
			),
			this._assertTextToggle.classList.toggle('toggled', e.mode === 'assertingText'),
			this._assertTextToggle.classList.toggle(
				'disabled',
				e.mode === 'none' || e.mode === 'standby' || e.mode === 'inspecting',
			),
			this._assertValuesToggle.classList.toggle('toggled', e.mode === 'assertingValue'),
			this._assertValuesToggle.classList.toggle(
				'disabled',
				e.mode === 'none' || e.mode === 'standby' || e.mode === 'inspecting',
			),
			this._assertSnapshotToggle.classList.toggle('toggled', e.mode === 'assertingSnapshot'),
			this._assertSnapshotToggle.classList.toggle(
				'disabled',
				e.mode === 'none' || e.mode === 'standby' || e.mode === 'inspecting',
			),
			this._offsetX !== e.overlay.offsetX &&
				((this._offsetX = e.overlay.offsetX), this._updateVisualPosition()),
			e.mode === 'none' ? this._hideOverlay() : this._showOverlay();
	}
	flashToolSucceeded(e) {
		let n;
		e === 'assertingVisibility'
			? (n = this._assertVisibilityToggle)
			: e === 'assertingSnapshot'
				? (n = this._assertSnapshotToggle)
				: (n = this._assertValuesToggle),
			n.classList.add('succeeded'),
			this._recorder.injectedScript.utils.builtins.setTimeout(
				() => n.classList.remove('succeeded'),
				2e3,
			);
	}
	_hideOverlay() {
		this._overlayElement.setAttribute('hidden', 'true');
	}
	_showOverlay() {
		this._overlayElement.hasAttribute('hidden') &&
			(this._overlayElement.removeAttribute('hidden'), this._updateVisualPosition());
	}
	_updateVisualPosition() {
		(this._measure = this._overlayElement.getBoundingClientRect()),
			(this._overlayElement.style.left =
				(this._recorder.injectedScript.window.innerWidth - this._measure.width) / 2 +
				this._offsetX +
				'px');
	}
	onMouseMove(e) {
		if (!e.buttons) return (this._dragState = void 0), !1;
		if (this._dragState) {
			this._offsetX = this._dragState.offsetX + e.clientX - this._dragState.dragStart.x;
			const n = (this._recorder.injectedScript.window.innerWidth - this._measure.width) / 2 - 10;
			return (
				(this._offsetX = Math.max(-n, Math.min(n, this._offsetX))),
				this._updateVisualPosition(),
				this._recorder.setOverlayState({ offsetX: this._offsetX }),
				Oe(e),
				!0
			);
		}
		return !1;
	}
	onMouseUp(e) {
		return this._dragState ? (Oe(e), !0) : !1;
	}
	onClick(e) {
		return this._dragState ? ((this._dragState = void 0), Oe(e), !0) : !1;
	}
	onDblClick(e) {
		return !1;
	}
}
class q_ {
	constructor(e) {
		(this._listeners = []),
			(this._lastHighlightedSelector = void 0),
			(this._lastHighlightedAriaTemplateJSON = 'undefined'),
			(this.state = {
				mode: 'none',
				testIdAttributeName: 'data-testid',
				language: 'javascript',
				overlay: { offsetX: 0 },
			}),
			(this._delegate = {}),
			(this.document = e.document),
			(this.injectedScript = e),
			(this.highlight = e.createHighlight()),
			(this._tools = {
				none: new ym(),
				standby: new ym(),
				inspecting: new mu(this, !1),
				recording: new H_(this),
				'recording-inspecting': new mu(this, !1),
				assertingText: new gu(this, 'text'),
				assertingVisibility: new mu(this, !0),
				assertingValue: new gu(this, 'value'),
				assertingSnapshot: new gu(this, 'snapshot'),
			}),
			(this._currentTool = this._tools.none),
			e.window.top === e.window &&
				((this.overlay = new U_(this)), this.overlay.setUIState(this.state)),
			(this._stylesheet = new e.window.CSSStyleSheet()),
			this._stylesheet.replaceSync(`
      body[data-pw-cursor=pointer] *, body[data-pw-cursor=pointer] *::after { cursor: pointer !important; }
      body[data-pw-cursor=text] *, body[data-pw-cursor=text] *::after { cursor: text !important; }
    `),
			this.installListeners(),
			e.utils.cacheNormalizedWhitespaces(),
			e.isUnderTest && console.error('Recorder script ready for test'),
			e.consoleApi.install();
	}
	installListeners() {
		var s;
		gy(this._listeners),
			(this._listeners = [
				Le(this.document, 'click', (o) => this._onClick(o), !0),
				Le(this.document, 'auxclick', (o) => this._onClick(o), !0),
				Le(this.document, 'dblclick', (o) => this._onDblClick(o), !0),
				Le(this.document, 'contextmenu', (o) => this._onContextMenu(o), !0),
				Le(this.document, 'dragstart', (o) => this._onDragStart(o), !0),
				Le(this.document, 'input', (o) => this._onInput(o), !0),
				Le(this.document, 'keydown', (o) => this._onKeyDown(o), !0),
				Le(this.document, 'keyup', (o) => this._onKeyUp(o), !0),
				Le(this.document, 'pointerdown', (o) => this._onPointerDown(o), !0),
				Le(this.document, 'pointerup', (o) => this._onPointerUp(o), !0),
				Le(this.document, 'mousedown', (o) => this._onMouseDown(o), !0),
				Le(this.document, 'mouseup', (o) => this._onMouseUp(o), !0),
				Le(this.document, 'mousemove', (o) => this._onMouseMove(o), !0),
				Le(this.document, 'mouseleave', (o) => this._onMouseLeave(o), !0),
				Le(this.document, 'mouseenter', (o) => this._onMouseEnter(o), !0),
				Le(this.document, 'focus', (o) => this._onFocus(o), !0),
				Le(this.document, 'scroll', (o) => this._onScroll(o), !0),
			]),
			this.highlight.install();
		let e;
		const n = () => {
			this.highlight.install(), (e = this.injectedScript.utils.builtins.setTimeout(n, 500));
		};
		(e = this.injectedScript.utils.builtins.setTimeout(n, 500)),
			this._listeners.push(() => this.injectedScript.utils.builtins.clearTimeout(e)),
			this.highlight.appendChild(yy(this.document, z_)),
			(s = this.overlay) == null || s.install(),
			this.document.adoptedStyleSheets.push(this._stylesheet);
	}
	_switchCurrentTool() {
		var n, s, o;
		const e = this._tools[this.state.mode];
		e !== this._currentTool &&
			((s = (n = this._currentTool).cleanup) == null || s.call(n),
			this.clearHighlight(),
			(this._currentTool = e),
			(o = this.injectedScript.document.body) == null ||
				o.setAttribute('data-pw-cursor', e.cursor()));
	}
	setUIState(e, n) {
		var l;
		(this._delegate = n),
			(e.actionPoint &&
				this.state.actionPoint &&
				e.actionPoint.x === this.state.actionPoint.x &&
				e.actionPoint.y === this.state.actionPoint.y) ||
				(!e.actionPoint && !this.state.actionPoint) ||
				(e.actionPoint
					? this.highlight.showActionPoint(e.actionPoint.x, e.actionPoint.y)
					: this.highlight.hideActionPoint()),
			(this.state = e),
			this.highlight.setLanguage(e.language),
			this._switchCurrentTool(),
			(l = this.overlay) == null || l.setUIState(e);
		let s = 'noop';
		if (e.actionSelector !== this._lastHighlightedSelector) {
			const c = e.actionSelector
				? K_(this.injectedScript, e.language, e.actionSelector, this.document)
				: null;
			(s = c != null && c.length ? c : 'clear'),
				(this._lastHighlightedSelector = c != null && c.length ? e.actionSelector : void 0);
		}
		const o = JSON.stringify(e.ariaTemplate);
		if (this._lastHighlightedAriaTemplateJSON !== o) {
			const c = e.ariaTemplate
				? this.injectedScript.getAllByAria(this.document, e.ariaTemplate)
				: [];
			if (c.length) {
				const u = c.length > 1 ? Ht.multiple : Ht.single;
				(s = c.map((d) => ({ element: d, color: u }))), (this._lastHighlightedAriaTemplateJSON = o);
			} else
				this._lastHighlightedSelector || (s = 'clear'),
					(this._lastHighlightedAriaTemplateJSON = 'undefined');
		}
		s === 'clear'
			? this.highlight.clearHighlight()
			: s !== 'noop' && this.highlight.updateHighlight(s);
	}
	clearHighlight() {
		this.updateHighlight(null, !1);
	}
	_onClick(e) {
		var n, s, o;
		e.isTrusted &&
			(((n = this.overlay) != null && n.onClick(e)) ||
				this._ignoreOverlayEvent(e) ||
				(o = (s = this._currentTool).onClick) == null ||
				o.call(s, e));
	}
	_onDblClick(e) {
		var n, s, o;
		e.isTrusted &&
			(((n = this.overlay) != null && n.onDblClick(e)) ||
				this._ignoreOverlayEvent(e) ||
				(o = (s = this._currentTool).onDblClick) == null ||
				o.call(s, e));
	}
	_onContextMenu(e) {
		var n, s;
		e.isTrusted &&
			(this._ignoreOverlayEvent(e) ||
				(s = (n = this._currentTool).onContextMenu) == null ||
				s.call(n, e));
	}
	_onDragStart(e) {
		var n, s;
		e.isTrusted &&
			(this._ignoreOverlayEvent(e) ||
				(s = (n = this._currentTool).onDragStart) == null ||
				s.call(n, e));
	}
	_onPointerDown(e) {
		var n, s;
		e.isTrusted &&
			(this._ignoreOverlayEvent(e) ||
				(s = (n = this._currentTool).onPointerDown) == null ||
				s.call(n, e));
	}
	_onPointerUp(e) {
		var n, s;
		e.isTrusted &&
			(this._ignoreOverlayEvent(e) ||
				(s = (n = this._currentTool).onPointerUp) == null ||
				s.call(n, e));
	}
	_onMouseDown(e) {
		var n, s;
		e.isTrusted &&
			(this._ignoreOverlayEvent(e) ||
				(s = (n = this._currentTool).onMouseDown) == null ||
				s.call(n, e));
	}
	_onMouseUp(e) {
		var n, s, o;
		e.isTrusted &&
			(((n = this.overlay) != null && n.onMouseUp(e)) ||
				this._ignoreOverlayEvent(e) ||
				(o = (s = this._currentTool).onMouseUp) == null ||
				o.call(s, e));
	}
	_onMouseMove(e) {
		var n, s, o;
		e.isTrusted &&
			(((n = this.overlay) != null && n.onMouseMove(e)) ||
				this._ignoreOverlayEvent(e) ||
				(o = (s = this._currentTool).onMouseMove) == null ||
				o.call(s, e));
	}
	_onMouseEnter(e) {
		var n, s;
		e.isTrusted &&
			(this._ignoreOverlayEvent(e) ||
				(s = (n = this._currentTool).onMouseEnter) == null ||
				s.call(n, e));
	}
	_onMouseLeave(e) {
		var n, s;
		e.isTrusted &&
			(this._ignoreOverlayEvent(e) ||
				(s = (n = this._currentTool).onMouseLeave) == null ||
				s.call(n, e));
	}
	_onFocus(e) {
		var n, s;
		e.isTrusted &&
			(this._ignoreOverlayEvent(e) ||
				(s = (n = this._currentTool).onFocus) == null ||
				s.call(n, e));
	}
	_onScroll(e) {
		var n, s;
		e.isTrusted &&
			((this._lastHighlightedSelector = void 0),
			(this._lastHighlightedAriaTemplateJSON = 'undefined'),
			this.highlight.hideActionPoint(),
			(s = (n = this._currentTool).onScroll) == null || s.call(n, e));
	}
	_onInput(e) {
		var n, s;
		this._ignoreOverlayEvent(e) || (s = (n = this._currentTool).onInput) == null || s.call(n, e);
	}
	_onKeyDown(e) {
		var n, s;
		e.isTrusted &&
			(this._ignoreOverlayEvent(e) ||
				(s = (n = this._currentTool).onKeyDown) == null ||
				s.call(n, e));
	}
	_onKeyUp(e) {
		var n, s;
		e.isTrusted &&
			(this._ignoreOverlayEvent(e) ||
				(s = (n = this._currentTool).onKeyUp) == null ||
				s.call(n, e));
	}
	updateHighlight(e, n) {
		(this._lastHighlightedSelector = void 0),
			(this._lastHighlightedAriaTemplateJSON = 'undefined'),
			this._updateHighlight(e, n);
	}
	_updateHighlight(e, n) {
		var o, l;
		let s = e == null ? void 0 : e.tooltipText;
		s === void 0 &&
			e != null &&
			e.selector &&
			(s = this.injectedScript.utils.asLocator(this.state.language, e.selector)),
			e
				? this.highlight.updateHighlight(
						e.elements.map((c) => ({ element: c, color: e.color, tooltipText: s })),
					)
				: this.highlight.clearHighlight(),
			n && ((l = (o = this._delegate).highlightUpdated) == null || l.call(o));
	}
	_ignoreOverlayEvent(e) {
		return e.composedPath().some((n) => (n.nodeName || '').toLowerCase() === 'x-pw-glass');
	}
	deepEventTarget(e) {
		var n;
		for (const s of e.composedPath()) if (!((n = this.overlay) != null && n.contains(s))) return s;
		return e.composedPath()[0];
	}
	setMode(e) {
		var n, s;
		(s = (n = this._delegate).setMode) == null || s.call(n, e);
	}
	async performAction(e) {
		var n, s;
		await ((s = (n = this._delegate).performAction) == null
			? void 0
			: s.call(n, e).catch(() => {}));
	}
	recordAction(e) {
		var n, s;
		(s = (n = this._delegate).recordAction) == null || s.call(n, e);
	}
	setOverlayState(e) {
		var n, s;
		(s = (n = this._delegate).setOverlayState) == null || s.call(n, e);
	}
	elementPicked(e, n) {
		var o, l;
		const s = this.injectedScript.ariaSnapshot(n.elements[0]);
		(l = (o = this._delegate).elementPicked) == null || l.call(o, { selector: e, ariaSnapshot: s });
	}
}
class V_ {
	constructor(e) {
		(this._dialogElement = null), (this._recorder = e);
	}
	isShowing() {
		return !!this._dialogElement;
	}
	show(e) {
		const n = this._recorder.document.createElement('x-pw-tool-item');
		(n.title = 'Accept'),
			n.classList.add('accept'),
			n.appendChild(this._recorder.document.createElement('x-div')),
			n.addEventListener('click', () => e.onCommit());
		const s = this._recorder.document.createElement('x-pw-tool-item');
		(s.title = 'Close'),
			s.classList.add('cancel'),
			s.appendChild(this._recorder.document.createElement('x-div')),
			s.addEventListener('click', () => {
				var u;
				this.close(), (u = e.onCancel) == null || u.call(e);
			}),
			(this._dialogElement = this._recorder.document.createElement('x-pw-dialog')),
			(this._keyboardListener = (u) => {
				var d;
				if (u.key === 'Escape') {
					this.close(), (d = e.onCancel) == null || d.call(e);
					return;
				}
				if (u.key === 'Enter' && (u.ctrlKey || u.metaKey)) {
					this._dialogElement && e.onCommit();
					return;
				}
			}),
			this._recorder.document.addEventListener('keydown', this._keyboardListener, !0);
		const o = this._recorder.document.createElement('x-pw-tools-list'),
			l = this._recorder.document.createElement('label');
		(l.textContent = e.label),
			o.appendChild(l),
			o.appendChild(this._recorder.document.createElement('x-spacer')),
			o.appendChild(n),
			o.appendChild(s),
			this._dialogElement.appendChild(o);
		const c = this._recorder.document.createElement('x-pw-dialog-body');
		return (
			c.appendChild(e.body),
			this._dialogElement.appendChild(c),
			this._recorder.highlight.appendChild(this._dialogElement),
			this._dialogElement
		);
	}
	moveTo(e, n) {
		this._dialogElement &&
			((this._dialogElement.style.top = e + 'px'), (this._dialogElement.style.left = n + 'px'));
	}
	close() {
		this._dialogElement &&
			(this._dialogElement.remove(),
			this._recorder.document.removeEventListener('keydown', this._keyboardListener),
			(this._dialogElement = null));
	}
}
function W_(t) {
	let e = t.activeElement;
	for (; e && e.shadowRoot && e.shadowRoot.activeElement; ) e = e.shadowRoot.activeElement;
	return e;
}
function yu(t) {
	return (t.altKey ? 1 : 0) | (t.ctrlKey ? 2 : 0) | (t.metaKey ? 4 : 0) | (t.shiftKey ? 8 : 0);
}
function vm(t) {
	switch (t.which) {
		case 1:
			return 'left';
		case 2:
			return 'middle';
		case 3:
			return 'right';
	}
	return 'left';
}
function vu(t) {
	if (t.target.nodeName === 'CANVAS') return { x: t.offsetX, y: t.offsetY };
}
function Oe(t) {
	t.preventDefault(), t.stopPropagation(), t.stopImmediatePropagation();
}
function wu(t) {
	if (!t || t.nodeName !== 'INPUT') return null;
	const e = t;
	return ['checkbox', 'radio'].includes(e.type) ? e : null;
}
function Su(t) {
	return !t || t.nodeName !== 'INPUT' ? !1 : t.type.toLowerCase() === 'range';
}
function Le(t, e, n, s) {
	return (
		t.addEventListener(e, n, s),
		() => {
			t.removeEventListener(e, n, s);
		}
	);
}
function gy(t) {
	for (const e of t) e();
	t.splice(0, t.length);
}
function K_(t, e, n, s) {
	try {
		const o = t.parseSelector(n),
			l = t.querySelectorAll(o, s),
			c = l.length > 1 ? Ht.multiple : Ht.single,
			u = t.utils.asLocator(e, n);
		return l.map((d, p) => {
			const g = l.length > 1 ? ` [${p + 1} of ${l.length}]` : '';
			return { element: d, color: c, tooltipText: u + g };
		});
	} catch {
		return [];
	}
}
function yy(t, { tagName: e, attrs: n, children: s }) {
	const o = t.createElementNS('http://www.w3.org/2000/svg', e);
	if (n) for (const [l, c] of Object.entries(n)) o.setAttribute(l, c);
	if (s) for (const l of s) o.appendChild(yy(t, l));
	return o;
}
function G_(t, e) {
	t = t
		.replace(/AriaRole\s*\.\s*([\w]+)/g, (l, c) => c.toLowerCase())
		.replace(
			/(get_by_role|getByRole)\s*\(\s*(?:["'`])([^'"`]+)['"`]/g,
			(l, c, u) => `${c}(${u.toLowerCase()}`,
		);
	const n = [];
	let s = '';
	for (let l = 0; l < t.length; ++l) {
		const c = t[l];
		if (c !== '"' && c !== "'" && c !== '`' && c !== '/') {
			s += c;
			continue;
		}
		const u = t[l - 1] === 'r' || t[l] === '/';
		++l;
		let d = '';
		for (; l < t.length; ) {
			if (t[l] === '\\') {
				u
					? (t[l + 1] !== c && (d += t[l]), ++l, (d += t[l]))
					: (++l,
						t[l] === 'n'
							? (d += `
`)
							: t[l] === 'r'
								? (d += '\r')
								: t[l] === 't'
									? (d += '	')
									: (d += t[l])),
					++l;
				continue;
			}
			if (t[l] !== c) {
				d += t[l++];
				continue;
			}
			break;
		}
		n.push({ quote: c, text: d }), (s += (c === '/' ? 'r' : '') + '$' + n.length);
	}
	s = s
		.toLowerCase()
		.replace(/get_by_alt_text/g, 'getbyalttext')
		.replace(/get_by_test_id/g, 'getbytestid')
		.replace(/get_by_([\w]+)/g, 'getby$1')
		.replace(/has_not_text/g, 'hasnottext')
		.replace(/has_text/g, 'hastext')
		.replace(/has_not/g, 'hasnot')
		.replace(/frame_locator/g, 'framelocator')
		.replace(/content_frame/g, 'contentframe')
		.replace(/[{}\s]/g, '')
		.replace(/new\(\)/g, '')
		.replace(/new[\w]+\.[\w]+options\(\)/g, '')
		.replace(/\.set/g, ',set')
		.replace(/\.or_\(/g, 'or(')
		.replace(/\.and_\(/g, 'and(')
		.replace(/:/g, '=')
		.replace(/,re\.ignorecase/g, 'i')
		.replace(/,pattern.case_insensitive/g, 'i')
		.replace(/,regexoptions.ignorecase/g, 'i')
		.replace(/re.compile\(([^)]+)\)/g, '$1')
		.replace(/pattern.compile\(([^)]+)\)/g, 'r$1')
		.replace(/newregex\(([^)]+)\)/g, 'r$1')
		.replace(/string=/g, '=')
		.replace(/regex=/g, '=')
		.replace(/,,/g, ',')
		.replace(/,\)/g, ')');
	const o = n.map((l) => l.quote).filter((l) => '\'"`'.includes(l))[0];
	return { selector: vy(s, n, e), preferredQuote: o };
}
function wm(t) {
	return [...t.matchAll(/\$\d+/g)].length;
}
function Sm(t, e) {
	return t.replace(/\$(\d+)/g, (n, s) => `$${s - e}`);
}
function vy(t, e, n) {
	for (;;) {
		const o = t.match(/filter\(,?(has=|hasnot=|sethas\(|sethasnot\()/);
		if (!o) break;
		const l = o.index + o[0].length;
		let c = 0,
			u = l;
		for (; u < t.length && (t[u] === '(' ? c++ : t[u] === ')' && c--, !(c < 0)); u++);
		let d = t.substring(0, l),
			p = 0;
		['sethas(', 'sethasnot('].includes(o[1]) &&
			((p = 1), (d = d.replace(/sethas\($/, 'has=').replace(/sethasnot\($/, 'hasnot=')));
		const g = wm(t.substring(0, l)),
			y = Sm(t.substring(l, u), g),
			v = wm(y),
			S = e.slice(g, g + v),
			k = JSON.stringify(vy(y, S, n));
		t = d.replace(/=$/, '2=') + `$${g + 1}` + Sm(t.substring(u + p), v - 1);
		const _ = e.slice(0, g),
			E = e.slice(g + v);
		e = _.concat([{ quote: '"', text: k }]).concat(E);
	}
	t = t
		.replace(/\,set([\w]+)\(([^)]+)\)/g, (o, l, c) => ',' + l.toLowerCase() + '=' + c.toLowerCase())
		.replace(/framelocator\(([^)]+)\)/g, '$1.internal:control=enter-frame')
		.replace(/contentframe(\(\))?/g, 'internal:control=enter-frame')
		.replace(/locator\(([^)]+),hastext=([^),]+)\)/g, 'locator($1).internal:has-text=$2')
		.replace(/locator\(([^)]+),hasnottext=([^),]+)\)/g, 'locator($1).internal:has-not-text=$2')
		.replace(/locator\(([^)]+),hastext=([^),]+)\)/g, 'locator($1).internal:has-text=$2')
		.replace(/locator\(([^)]+)\)/g, '$1')
		.replace(/getbyrole\(([^)]+)\)/g, 'internal:role=$1')
		.replace(/getbytext\(([^)]+)\)/g, 'internal:text=$1')
		.replace(/getbylabel\(([^)]+)\)/g, 'internal:label=$1')
		.replace(/getbytestid\(([^)]+)\)/g, `internal:testid=[${n}=$1]`)
		.replace(/getby(placeholder|alt|title)(?:text)?\(([^)]+)\)/g, 'internal:attr=[$1=$2]')
		.replace(/first(\(\))?/g, 'nth=0')
		.replace(/last(\(\))?/g, 'nth=-1')
		.replace(/nth\(([^)]+)\)/g, 'nth=$1')
		.replace(/filter\(,?visible=true\)/g, 'visible=true')
		.replace(/filter\(,?visible=false\)/g, 'visible=false')
		.replace(/filter\(,?hastext=([^)]+)\)/g, 'internal:has-text=$1')
		.replace(/filter\(,?hasnottext=([^)]+)\)/g, 'internal:has-not-text=$1')
		.replace(/filter\(,?has2=([^)]+)\)/g, 'internal:has=$1')
		.replace(/filter\(,?hasnot2=([^)]+)\)/g, 'internal:has-not=$1')
		.replace(/,exact=false/g, '')
		.replace(/,exact=true/g, 's')
		.replace(/,includehidden=/g, ',include-hidden=')
		.replace(/\,/g, '][');
	const s = t.split('.');
	for (let o = 0; o < s.length - 1; o++)
		if (s[o] === 'internal:control=enter-frame' && s[o + 1].startsWith('nth=')) {
			const [l] = s.splice(o, 1);
			s.splice(o + 1, 0, l);
		}
	return s
		.map((o) =>
			!o.startsWith('internal:') || o === 'internal:control'
				? o.replace(/\$(\d+)/g, (l, c) => e[+c - 1].text)
				: ((o = o.includes('[') ? o.replace(/\]/, '') + ']' : o),
					(o = o
						.replace(/(?:r)\$(\d+)(i)?/g, (l, c, u) => {
							const d = e[+c - 1];
							return o.startsWith('internal:attr') ||
								o.startsWith('internal:testid') ||
								o.startsWith('internal:role')
								? ht(new RegExp(d.text), !1) + (u || '')
								: kt(new RegExp(d.text, u), !1);
						})
						.replace(/\$(\d+)(i|s)?/g, (l, c, u) => {
							const d = e[+c - 1];
							return o.startsWith('internal:has=') || o.startsWith('internal:has-not=')
								? d.text
								: o.startsWith('internal:testid')
									? ht(d.text, !0)
									: o.startsWith('internal:attr') || o.startsWith('internal:role')
										? ht(d.text, u === 's')
										: kt(d.text, u === 's');
						})),
					o),
		)
		.join(' >> ');
}
function Q_(t, e, n) {
	try {
		return J_(t, e, n);
	} catch {
		return '';
	}
}
function J_(t, e, n) {
	try {
		return Vi(e), e;
	} catch {}
	const { selector: s, preferredQuote: o } = G_(e, n),
		l = ag(t, s, void 0, void 0, o),
		c = xm(t, e);
	return l.some((u) => xm(t, u) === c) ? s : '';
}
function xm(t, e) {
	return (
		(e = e.replace(/\s/g, '')),
		t === 'javascript' && (e = e.replace(/\\?["`]/g, "'").replace(/,{}/g, '')),
		e
	);
}
const X_ = ({ url: t }) =>
		w.jsxs('div', {
			className: 'browser-frame-header',
			children: [
				w.jsxs('div', {
					style: { whiteSpace: 'nowrap' },
					children: [
						w.jsx('span', {
							className: 'browser-frame-dot',
							style: { backgroundColor: 'rgb(242, 95, 88)' },
						}),
						w.jsx('span', {
							className: 'browser-frame-dot',
							style: { backgroundColor: 'rgb(251, 190, 60)' },
						}),
						w.jsx('span', {
							className: 'browser-frame-dot',
							style: { backgroundColor: 'rgb(88, 203, 66)' },
						}),
					],
				}),
				w.jsxs('div', {
					className: 'browser-frame-address-bar',
					title: t || 'about:blank',
					children: [t || 'about:blank', t && w.jsx(Yu, { value: t })],
				}),
				w.jsx('div', {
					style: { marginLeft: 'auto' },
					children: w.jsxs('div', {
						children: [
							w.jsx('span', { className: 'browser-frame-menu-bar' }),
							w.jsx('span', { className: 'browser-frame-menu-bar' }),
							w.jsx('span', { className: 'browser-frame-menu-bar' }),
						],
					}),
				}),
			],
		}),
	bf = Symbol.for('yaml.alias'),
	Fu = Symbol.for('yaml.document'),
	tr = Symbol.for('yaml.map'),
	wy = Symbol.for('yaml.pair'),
	dn = Symbol.for('yaml.scalar'),
	Ls = Symbol.for('yaml.seq'),
	Vt = Symbol.for('yaml.node.type'),
	Ir = (t) => !!t && typeof t == 'object' && t[Vt] === bf,
	Lr = (t) => !!t && typeof t == 'object' && t[Vt] === Fu,
	Ms = (t) => !!t && typeof t == 'object' && t[Vt] === tr,
	Me = (t) => !!t && typeof t == 'object' && t[Vt] === wy,
	ke = (t) => !!t && typeof t == 'object' && t[Vt] === dn,
	js = (t) => !!t && typeof t == 'object' && t[Vt] === Ls;
function $e(t) {
	if (t && typeof t == 'object')
		switch (t[Vt]) {
			case tr:
			case Ls:
				return !0;
		}
	return !1;
}
function Re(t) {
	if (t && typeof t == 'object')
		switch (t[Vt]) {
			case bf:
			case tr:
			case dn:
			case Ls:
				return !0;
		}
	return !1;
}
const Y_ = (t) => (ke(t) || $e(t)) && !!t.anchor,
	bt = Symbol('break visit'),
	Sy = Symbol('skip children'),
	fn = Symbol('remove node');
function nr(t, e) {
	const n = xy(e);
	Lr(t)
		? ys(null, t.contents, n, Object.freeze([t])) === fn && (t.contents = null)
		: ys(null, t, n, Object.freeze([]));
}
nr.BREAK = bt;
nr.SKIP = Sy;
nr.REMOVE = fn;
function ys(t, e, n, s) {
	const o = _y(t, e, n, s);
	if (Re(o) || Me(o)) return Ey(t, s, o), ys(t, o, n, s);
	if (typeof o != 'symbol') {
		if ($e(e)) {
			s = Object.freeze(s.concat(e));
			for (let l = 0; l < e.items.length; ++l) {
				const c = ys(l, e.items[l], n, s);
				if (typeof c == 'number') l = c - 1;
				else {
					if (c === bt) return bt;
					c === fn && (e.items.splice(l, 1), (l -= 1));
				}
			}
		} else if (Me(e)) {
			s = Object.freeze(s.concat(e));
			const l = ys('key', e.key, n, s);
			if (l === bt) return bt;
			l === fn && (e.key = null);
			const c = ys('value', e.value, n, s);
			if (c === bt) return bt;
			c === fn && (e.value = null);
		}
	}
	return o;
}
async function Zl(t, e) {
	const n = xy(e);
	Lr(t)
		? (await vs(null, t.contents, n, Object.freeze([t]))) === fn && (t.contents = null)
		: await vs(null, t, n, Object.freeze([]));
}
Zl.BREAK = bt;
Zl.SKIP = Sy;
Zl.REMOVE = fn;
async function vs(t, e, n, s) {
	const o = await _y(t, e, n, s);
	if (Re(o) || Me(o)) return Ey(t, s, o), vs(t, o, n, s);
	if (typeof o != 'symbol') {
		if ($e(e)) {
			s = Object.freeze(s.concat(e));
			for (let l = 0; l < e.items.length; ++l) {
				const c = await vs(l, e.items[l], n, s);
				if (typeof c == 'number') l = c - 1;
				else {
					if (c === bt) return bt;
					c === fn && (e.items.splice(l, 1), (l -= 1));
				}
			}
		} else if (Me(e)) {
			s = Object.freeze(s.concat(e));
			const l = await vs('key', e.key, n, s);
			if (l === bt) return bt;
			l === fn && (e.key = null);
			const c = await vs('value', e.value, n, s);
			if (c === bt) return bt;
			c === fn && (e.value = null);
		}
	}
	return o;
}
function xy(t) {
	return typeof t == 'object' && (t.Collection || t.Node || t.Value)
		? Object.assign(
				{ Alias: t.Node, Map: t.Node, Scalar: t.Node, Seq: t.Node },
				t.Value && { Map: t.Value, Scalar: t.Value, Seq: t.Value },
				t.Collection && { Map: t.Collection, Seq: t.Collection },
				t,
			)
		: t;
}
function _y(t, e, n, s) {
	var o, l, c, u, d;
	if (typeof n == 'function') return n(t, e, s);
	if (Ms(e)) return (o = n.Map) == null ? void 0 : o.call(n, t, e, s);
	if (js(e)) return (l = n.Seq) == null ? void 0 : l.call(n, t, e, s);
	if (Me(e)) return (c = n.Pair) == null ? void 0 : c.call(n, t, e, s);
	if (ke(e)) return (u = n.Scalar) == null ? void 0 : u.call(n, t, e, s);
	if (Ir(e)) return (d = n.Alias) == null ? void 0 : d.call(n, t, e, s);
}
function Ey(t, e, n) {
	const s = e[e.length - 1];
	if ($e(s)) s.items[t] = n;
	else if (Me(s)) t === 'key' ? (s.key = n) : (s.value = n);
	else if (Lr(s)) s.contents = n;
	else {
		const o = Ir(s) ? 'alias' : 'scalar';
		throw new Error(`Cannot replace node with ${o} parent`);
	}
}
const Z_ = { '!': '%21', ',': '%2C', '[': '%5B', ']': '%5D', '{': '%7B', '}': '%7D' },
	eE = (t) => t.replace(/[!,[\]{}]/g, (e) => Z_[e]);
class dt {
	constructor(e, n) {
		(this.docStart = null),
			(this.docEnd = !1),
			(this.yaml = Object.assign({}, dt.defaultYaml, e)),
			(this.tags = Object.assign({}, dt.defaultTags, n));
	}
	clone() {
		const e = new dt(this.yaml, this.tags);
		return (e.docStart = this.docStart), e;
	}
	atDocument() {
		const e = new dt(this.yaml, this.tags);
		switch (this.yaml.version) {
			case '1.1':
				this.atNextDocument = !0;
				break;
			case '1.2':
				(this.atNextDocument = !1),
					(this.yaml = { explicit: dt.defaultYaml.explicit, version: '1.2' }),
					(this.tags = Object.assign({}, dt.defaultTags));
				break;
		}
		return e;
	}
	add(e, n) {
		this.atNextDocument &&
			((this.yaml = { explicit: dt.defaultYaml.explicit, version: '1.1' }),
			(this.tags = Object.assign({}, dt.defaultTags)),
			(this.atNextDocument = !1));
		const s = e.trim().split(/[ \t]+/),
			o = s.shift();
		switch (o) {
			case '%TAG': {
				if (
					s.length !== 2 &&
					(n(0, '%TAG directive should contain exactly two parts'), s.length < 2)
				)
					return !1;
				const [l, c] = s;
				return (this.tags[l] = c), !0;
			}
			case '%YAML': {
				if (((this.yaml.explicit = !0), s.length !== 1))
					return n(0, '%YAML directive should contain exactly one part'), !1;
				const [l] = s;
				if (l === '1.1' || l === '1.2') return (this.yaml.version = l), !0;
				{
					const c = /^\d+\.\d+$/.test(l);
					return n(6, `Unsupported YAML version ${l}`, c), !1;
				}
			}
			default:
				return n(0, `Unknown directive ${o}`, !0), !1;
		}
	}
	tagName(e, n) {
		if (e === '!') return '!';
		if (e[0] !== '!') return n(`Not a valid tag: ${e}`), null;
		if (e[1] === '<') {
			const c = e.slice(2, -1);
			return c === '!' || c === '!!'
				? (n(`Verbatim tags aren't resolved, so ${e} is invalid.`), null)
				: (e[e.length - 1] !== '>' && n('Verbatim tags must end with a >'), c);
		}
		const [, s, o] = e.match(/^(.*!)([^!]*)$/s);
		o || n(`The ${e} tag has no suffix`);
		const l = this.tags[s];
		if (l)
			try {
				return l + decodeURIComponent(o);
			} catch (c) {
				return n(String(c)), null;
			}
		return s === '!' ? e : (n(`Could not resolve tag: ${e}`), null);
	}
	tagString(e) {
		for (const [n, s] of Object.entries(this.tags))
			if (e.startsWith(s)) return n + eE(e.substring(s.length));
		return e[0] === '!' ? e : `!<${e}>`;
	}
	toString(e) {
		const n = this.yaml.explicit ? [`%YAML ${this.yaml.version || '1.2'}`] : [],
			s = Object.entries(this.tags);
		let o;
		if (e && s.length > 0 && Re(e.contents)) {
			const l = {};
			nr(e.contents, (c, u) => {
				Re(u) && u.tag && (l[u.tag] = !0);
			}),
				(o = Object.keys(l));
		} else o = [];
		for (const [l, c] of s)
			(l === '!!' && c === 'tag:yaml.org,2002:') ||
				((!e || o.some((u) => u.startsWith(c))) && n.push(`%TAG ${l} ${c}`));
		return n.join(`
`);
	}
}
dt.defaultYaml = { explicit: !1, version: '1.2' };
dt.defaultTags = { '!!': 'tag:yaml.org,2002:' };
function ky(t) {
	if (/[\x00-\x19\s,[\]{}]/.test(t)) {
		const n = `Anchor must not contain whitespace or control characters: ${JSON.stringify(t)}`;
		throw new Error(n);
	}
	return !0;
}
function by(t) {
	const e = new Set();
	return (
		nr(t, {
			Value(n, s) {
				s.anchor && e.add(s.anchor);
			},
		}),
		e
	);
}
function Ty(t, e) {
	for (let n = 1; ; ++n) {
		const s = `${t}${n}`;
		if (!e.has(s)) return s;
	}
}
function tE(t, e) {
	const n = [],
		s = new Map();
	let o = null;
	return {
		onAnchor: (l) => {
			n.push(l), o || (o = by(t));
			const c = Ty(e, o);
			return o.add(c), c;
		},
		setAnchors: () => {
			for (const l of n) {
				const c = s.get(l);
				if (typeof c == 'object' && c.anchor && (ke(c.node) || $e(c.node)))
					c.node.anchor = c.anchor;
				else {
					const u = new Error('Failed to resolve repeated object (this should not happen)');
					throw ((u.source = l), u);
				}
			}
		},
		sourceObjects: s,
	};
}
function ws(t, e, n, s) {
	if (s && typeof s == 'object')
		if (Array.isArray(s))
			for (let o = 0, l = s.length; o < l; ++o) {
				const c = s[o],
					u = ws(t, s, String(o), c);
				u === void 0 ? delete s[o] : u !== c && (s[o] = u);
			}
		else if (s instanceof Map)
			for (const o of Array.from(s.keys())) {
				const l = s.get(o),
					c = ws(t, s, o, l);
				c === void 0 ? s.delete(o) : c !== l && s.set(o, c);
			}
		else if (s instanceof Set)
			for (const o of Array.from(s)) {
				const l = ws(t, s, o, o);
				l === void 0 ? s.delete(o) : l !== o && (s.delete(o), s.add(l));
			}
		else
			for (const [o, l] of Object.entries(s)) {
				const c = ws(t, s, o, l);
				c === void 0 ? delete s[o] : c !== l && (s[o] = c);
			}
	return t.call(e, n, s);
}
function Ut(t, e, n) {
	if (Array.isArray(t)) return t.map((s, o) => Ut(s, String(o), n));
	if (t && typeof t.toJSON == 'function') {
		if (!n || !Y_(t)) return t.toJSON(e, n);
		const s = { aliasCount: 0, count: 1, res: void 0 };
		n.anchors.set(t, s),
			(n.onCreate = (l) => {
				(s.res = l), delete n.onCreate;
			});
		const o = t.toJSON(e, n);
		return n.onCreate && n.onCreate(o), o;
	}
	return typeof t == 'bigint' && !(n != null && n.keep) ? Number(t) : t;
}
class Tf {
	constructor(e) {
		Object.defineProperty(this, Vt, { value: e });
	}
	clone() {
		const e = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
		return this.range && (e.range = this.range.slice()), e;
	}
	toJS(e, { mapAsMap: n, maxAliasCount: s, onAnchor: o, reviver: l } = {}) {
		if (!Lr(e)) throw new TypeError('A document argument is required');
		const c = {
				anchors: new Map(),
				doc: e,
				keep: !0,
				mapAsMap: n === !0,
				mapKeyWarned: !1,
				maxAliasCount: typeof s == 'number' ? s : 100,
			},
			u = Ut(this, '', c);
		if (typeof o == 'function') for (const { count: d, res: p } of c.anchors.values()) o(p, d);
		return typeof l == 'function' ? ws(l, { '': u }, '', u) : u;
	}
}
class ea extends Tf {
	constructor(e) {
		super(bf),
			(this.source = e),
			Object.defineProperty(this, 'tag', {
				set() {
					throw new Error('Alias nodes cannot have tags');
				},
			});
	}
	resolve(e) {
		let n;
		return (
			nr(e, {
				Node: (s, o) => {
					if (o === this) return nr.BREAK;
					o.anchor === this.source && (n = o);
				},
			}),
			n
		);
	}
	toJSON(e, n) {
		if (!n) return { source: this.source };
		const { anchors: s, doc: o, maxAliasCount: l } = n,
			c = this.resolve(o);
		if (!c) {
			const d = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
			throw new ReferenceError(d);
		}
		let u = s.get(c);
		if ((u || (Ut(c, null, n), (u = s.get(c))), !u || u.res === void 0)) {
			const d = 'This should not happen: Alias anchor was not resolved?';
			throw new ReferenceError(d);
		}
		if (
			l >= 0 &&
			((u.count += 1),
			u.aliasCount === 0 && (u.aliasCount = Nl(o, c, s)),
			u.count * u.aliasCount > l)
		) {
			const d = 'Excessive alias count indicates a resource exhaustion attack';
			throw new ReferenceError(d);
		}
		return u.res;
	}
	toString(e, n, s) {
		const o = `*${this.source}`;
		if (e) {
			if ((ky(this.source), e.options.verifyAliasOrder && !e.anchors.has(this.source))) {
				const l = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
				throw new Error(l);
			}
			if (e.implicitKey) return `${o} `;
		}
		return o;
	}
}
function Nl(t, e, n) {
	if (Ir(e)) {
		const s = e.resolve(t),
			o = n && s && n.get(s);
		return o ? o.count * o.aliasCount : 0;
	} else if ($e(e)) {
		let s = 0;
		for (const o of e.items) {
			const l = Nl(t, o, n);
			l > s && (s = l);
		}
		return s;
	} else if (Me(e)) {
		const s = Nl(t, e.key, n),
			o = Nl(t, e.value, n);
		return Math.max(s, o);
	}
	return 1;
}
const Cy = (t) => !t || (typeof t != 'function' && typeof t != 'object');
class ue extends Tf {
	constructor(e) {
		super(dn), (this.value = e);
	}
	toJSON(e, n) {
		return n != null && n.keep ? this.value : Ut(this.value, e, n);
	}
	toString() {
		return String(this.value);
	}
}
ue.BLOCK_FOLDED = 'BLOCK_FOLDED';
ue.BLOCK_LITERAL = 'BLOCK_LITERAL';
ue.PLAIN = 'PLAIN';
ue.QUOTE_DOUBLE = 'QUOTE_DOUBLE';
ue.QUOTE_SINGLE = 'QUOTE_SINGLE';
const nE = 'tag:yaml.org,2002:';
function rE(t, e, n) {
	if (e) {
		const s = n.filter((l) => l.tag === e),
			o = s.find((l) => !l.format) ?? s[0];
		if (!o) throw new Error(`Tag ${e} not found`);
		return o;
	}
	return n.find((s) => {
		var o;
		return ((o = s.identify) == null ? void 0 : o.call(s, t)) && !s.format;
	});
}
function zi(t, e, n) {
	var y, v, S;
	if ((Lr(t) && (t = t.contents), Re(t))) return t;
	if (Me(t)) {
		const k = (v = (y = n.schema[tr]).createNode) == null ? void 0 : v.call(y, n.schema, null, n);
		return k.items.push(t), k;
	}
	(t instanceof String ||
		t instanceof Number ||
		t instanceof Boolean ||
		(typeof BigInt < 'u' && t instanceof BigInt)) &&
		(t = t.valueOf());
	const { aliasDuplicateObjects: s, onAnchor: o, onTagObj: l, schema: c, sourceObjects: u } = n;
	let d;
	if (s && t && typeof t == 'object') {
		if (((d = u.get(t)), d)) return d.anchor || (d.anchor = o(t)), new ea(d.anchor);
		(d = { anchor: null, node: null }), u.set(t, d);
	}
	e != null && e.startsWith('!!') && (e = nE + e.slice(2));
	let p = rE(t, e, c.tags);
	if (!p) {
		if ((t && typeof t.toJSON == 'function' && (t = t.toJSON()), !t || typeof t != 'object')) {
			const k = new ue(t);
			return d && (d.node = k), k;
		}
		p = t instanceof Map ? c[tr] : Symbol.iterator in Object(t) ? c[Ls] : c[tr];
	}
	l && (l(p), delete n.onTagObj);
	const g =
		p != null && p.createNode
			? p.createNode(n.schema, t, n)
			: typeof ((S = p == null ? void 0 : p.nodeClass) == null ? void 0 : S.from) == 'function'
				? p.nodeClass.from(n.schema, t, n)
				: new ue(t);
	return e ? (g.tag = e) : p.default || (g.tag = p.tag), d && (d.node = g), g;
}
function Ul(t, e, n) {
	let s = n;
	for (let o = e.length - 1; o >= 0; --o) {
		const l = e[o];
		if (typeof l == 'number' && Number.isInteger(l) && l >= 0) {
			const c = [];
			(c[l] = s), (s = c);
		} else s = new Map([[l, s]]);
	}
	return zi(s, void 0, {
		aliasDuplicateObjects: !1,
		keepUndefined: !1,
		onAnchor: () => {
			throw new Error('This should not happen, please report a bug.');
		},
		schema: t,
		sourceObjects: new Map(),
	});
}
const Pi = (t) => t == null || (typeof t == 'object' && !!t[Symbol.iterator]().next().done);
class Ny extends Tf {
	constructor(e, n) {
		super(e),
			Object.defineProperty(this, 'schema', {
				value: n,
				configurable: !0,
				enumerable: !1,
				writable: !0,
			});
	}
	clone(e) {
		const n = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
		return (
			e && (n.schema = e),
			(n.items = n.items.map((s) => (Re(s) || Me(s) ? s.clone(e) : s))),
			this.range && (n.range = this.range.slice()),
			n
		);
	}
	addIn(e, n) {
		if (Pi(e)) this.add(n);
		else {
			const [s, ...o] = e,
				l = this.get(s, !0);
			if ($e(l)) l.addIn(o, n);
			else if (l === void 0 && this.schema) this.set(s, Ul(this.schema, o, n));
			else throw new Error(`Expected YAML collection at ${s}. Remaining path: ${o}`);
		}
	}
	deleteIn(e) {
		const [n, ...s] = e;
		if (s.length === 0) return this.delete(n);
		const o = this.get(n, !0);
		if ($e(o)) return o.deleteIn(s);
		throw new Error(`Expected YAML collection at ${n}. Remaining path: ${s}`);
	}
	getIn(e, n) {
		const [s, ...o] = e,
			l = this.get(s, !0);
		return o.length === 0 ? (!n && ke(l) ? l.value : l) : $e(l) ? l.getIn(o, n) : void 0;
	}
	hasAllNullValues(e) {
		return this.items.every((n) => {
			if (!Me(n)) return !1;
			const s = n.value;
			return (
				s == null || (e && ke(s) && s.value == null && !s.commentBefore && !s.comment && !s.tag)
			);
		});
	}
	hasIn(e) {
		const [n, ...s] = e;
		if (s.length === 0) return this.has(n);
		const o = this.get(n, !0);
		return $e(o) ? o.hasIn(s) : !1;
	}
	setIn(e, n) {
		const [s, ...o] = e;
		if (o.length === 0) this.set(s, n);
		else {
			const l = this.get(s, !0);
			if ($e(l)) l.setIn(o, n);
			else if (l === void 0 && this.schema) this.set(s, Ul(this.schema, o, n));
			else throw new Error(`Expected YAML collection at ${s}. Remaining path: ${o}`);
		}
	}
}
const sE = (t) => t.replace(/^(?!$)(?: $)?/gm, '#');
function Cn(t, e) {
	return /^\n+$/.test(t) ? t.substring(1) : e ? t.replace(/^(?! *$)/gm, e) : t;
}
const _r = (t, e, n) =>
		t.endsWith(`
`)
			? Cn(n, e)
			: n.includes(`
`)
				? `
` + Cn(n, e)
				: (t.endsWith(' ') ? '' : ' ') + n,
	Ay = 'flow',
	Bu = 'block',
	Al = 'quoted';
function ta(
	t,
	e,
	n = 'flow',
	{ indentAtStart: s, lineWidth: o = 80, minContentWidth: l = 20, onFold: c, onOverflow: u } = {},
) {
	if (!o || o < 0) return t;
	o < l && (l = 0);
	const d = Math.max(1 + l, 1 + o - e.length);
	if (t.length <= d) return t;
	const p = [],
		g = {};
	let y = o - e.length;
	typeof s == 'number' && (s > o - Math.max(2, l) ? p.push(0) : (y = o - s));
	let v,
		S,
		k = !1,
		_ = -1,
		E = -1,
		C = -1;
	n === Bu && ((_ = _m(t, _, e.length)), _ !== -1 && (y = _ + d));
	for (let O; (O = t[(_ += 1)]); ) {
		if (n === Al && O === '\\') {
			switch (((E = _), t[_ + 1])) {
				case 'x':
					_ += 3;
					break;
				case 'u':
					_ += 5;
					break;
				case 'U':
					_ += 9;
					break;
				default:
					_ += 1;
			}
			C = _;
		}
		if (
			O ===
			`
`
		)
			n === Bu && (_ = _m(t, _, e.length)), (y = _ + e.length + d), (v = void 0);
		else {
			if (
				O === ' ' &&
				S &&
				S !== ' ' &&
				S !==
					`
` &&
				S !== '	'
			) {
				const D = t[_ + 1];
				D &&
					D !== ' ' &&
					D !==
						`
` &&
					D !== '	' &&
					(v = _);
			}
			if (_ >= y)
				if (v) p.push(v), (y = v + d), (v = void 0);
				else if (n === Al) {
					for (; S === ' ' || S === '	'; ) (S = O), (O = t[(_ += 1)]), (k = !0);
					const D = _ > C + 1 ? _ - 2 : E - 1;
					if (g[D]) return t;
					p.push(D), (g[D] = !0), (y = D + d), (v = void 0);
				} else k = !0;
		}
		S = O;
	}
	if ((k && u && u(), p.length === 0)) return t;
	c && c();
	let A = t.slice(0, p[0]);
	for (let O = 0; O < p.length; ++O) {
		const D = p[O],
			F = p[O + 1] || t.length;
		D === 0
			? (A = `
${e}${t.slice(0, F)}`)
			: (n === Al && g[D] && (A += `${t[D]}\\`),
				(A += `
${e}${t.slice(D + 1, F)}`));
	}
	return A;
}
function _m(t, e, n) {
	let s = e,
		o = e + 1,
		l = t[o];
	for (; l === ' ' || l === '	'; )
		if (e < o + n) l = t[++e];
		else {
			do l = t[++e];
			while (
				l &&
				l !==
					`
`
			);
			(s = e), (o = e + 1), (l = t[o]);
		}
	return s;
}
const na = (t, e) => ({
		indentAtStart: e ? t.indent.length : t.indentAtStart,
		lineWidth: t.options.lineWidth,
		minContentWidth: t.options.minContentWidth,
	}),
	ra = (t) => /^(%|---|\.\.\.)/m.test(t);
function iE(t, e, n) {
	if (!e || e < 0) return !1;
	const s = e - n,
		o = t.length;
	if (o <= s) return !1;
	for (let l = 0, c = 0; l < o; ++l)
		if (
			t[l] ===
			`
`
		) {
			if (l - c > s) return !0;
			if (((c = l + 1), o - c <= s)) return !1;
		}
	return !0;
}
function Di(t, e) {
	const n = JSON.stringify(t);
	if (e.options.doubleQuotedAsJSON) return n;
	const { implicitKey: s } = e,
		o = e.options.doubleQuotedMinMultiLineLength,
		l = e.indent || (ra(t) ? '  ' : '');
	let c = '',
		u = 0;
	for (let d = 0, p = n[d]; p; p = n[++d])
		if (
			(p === ' ' &&
				n[d + 1] === '\\' &&
				n[d + 2] === 'n' &&
				((c += n.slice(u, d) + '\\ '), (d += 1), (u = d), (p = '\\')),
			p === '\\')
		)
			switch (n[d + 1]) {
				case 'u':
					{
						c += n.slice(u, d);
						const g = n.substr(d + 2, 4);
						switch (g) {
							case '0000':
								c += '\\0';
								break;
							case '0007':
								c += '\\a';
								break;
							case '000b':
								c += '\\v';
								break;
							case '001b':
								c += '\\e';
								break;
							case '0085':
								c += '\\N';
								break;
							case '00a0':
								c += '\\_';
								break;
							case '2028':
								c += '\\L';
								break;
							case '2029':
								c += '\\P';
								break;
							default:
								g.substr(0, 2) === '00' ? (c += '\\x' + g.substr(2)) : (c += n.substr(d, 6));
						}
						(d += 5), (u = d + 1);
					}
					break;
				case 'n':
					if (s || n[d + 2] === '"' || n.length < o) d += 1;
					else {
						for (
							c +=
								n.slice(u, d) +
								`

`;
							n[d + 2] === '\\' && n[d + 3] === 'n' && n[d + 4] !== '"';
						)
							(c += `
`),
								(d += 2);
						(c += l), n[d + 2] === ' ' && (c += '\\'), (d += 1), (u = d + 1);
					}
					break;
				default:
					d += 1;
			}
	return (c = u ? c + n.slice(u) : n), s ? c : ta(c, l, Al, na(e, !1));
}
function zu(t, e) {
	if (
		e.options.singleQuote === !1 ||
		(e.implicitKey &&
			t.includes(`
`)) ||
		/[ \t]\n|\n[ \t]/.test(t)
	)
		return Di(t, e);
	const n = e.indent || (ra(t) ? '  ' : ''),
		s =
			"'" +
			t.replace(/'/g, "''").replace(
				/\n+/g,
				`$&
${n}`,
			) +
			"'";
	return e.implicitKey ? s : ta(s, n, Ay, na(e, !1));
}
function Ss(t, e) {
	const { singleQuote: n } = e.options;
	let s;
	if (n === !1) s = Di;
	else {
		const o = t.includes('"'),
			l = t.includes("'");
		o && !l ? (s = zu) : l && !o ? (s = Di) : (s = n ? zu : Di);
	}
	return s(t, e);
}
let Hu;
try {
	Hu = new RegExp(
		`(^|(?<!
))
+(?!
|$)`,
		'g',
	);
} catch {
	Hu = /\n+(?!\n|$)/g;
}
function Il({ comment: t, type: e, value: n }, s, o, l) {
	const { blockQuote: c, commentString: u, lineWidth: d } = s.options;
	if (!c || /\n[\t ]+$/.test(n) || /^\s*$/.test(n)) return Ss(n, s);
	const p = s.indent || (s.forceBlockIndent || ra(n) ? '  ' : ''),
		g =
			c === 'literal'
				? !0
				: c === 'folded' || e === ue.BLOCK_FOLDED
					? !1
					: e === ue.BLOCK_LITERAL
						? !0
						: !iE(n, d, p.length);
	if (!n)
		return g
			? `|
`
			: `>
`;
	let y, v;
	for (v = n.length; v > 0; --v) {
		const z = n[v - 1];
		if (
			z !==
				`
` &&
			z !== '	' &&
			z !== ' '
		)
			break;
	}
	let S = n.substring(v);
	const k = S.indexOf(`
`);
	k === -1 ? (y = '-') : n === S || k !== S.length - 1 ? ((y = '+'), l && l()) : (y = ''),
		S &&
			((n = n.slice(0, -S.length)),
			S[S.length - 1] ===
				`
` && (S = S.slice(0, -1)),
			(S = S.replace(Hu, `$&${p}`)));
	let _ = !1,
		E,
		C = -1;
	for (E = 0; E < n.length; ++E) {
		const z = n[E];
		if (z === ' ') _ = !0;
		else if (
			z ===
			`
`
		)
			C = E;
		else break;
	}
	let A = n.substring(0, C < E ? C + 1 : E);
	A && ((n = n.substring(A.length)), (A = A.replace(/\n+/g, `$&${p}`)));
	let D = (g ? '|' : '>') + (_ ? (p ? '2' : '1') : '') + y;
	if ((t && ((D += ' ' + u(t.replace(/ ?[\r\n]+/g, ' '))), o && o()), g))
		return (
			(n = n.replace(/\n+/g, `$&${p}`)),
			`${D}
${p}${A}${n}${S}`
		);
	n = n
		.replace(
			/\n+/g,
			`
$&`,
		)
		.replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, '$1$2')
		.replace(/\n+/g, `$&${p}`);
	const F = ta(`${A}${n}${S}`, p, Bu, na(s, !0));
	return `${D}
${p}${F}`;
}
function oE(t, e, n, s) {
	const { type: o, value: l } = t,
		{ actualString: c, implicitKey: u, indent: d, indentStep: p, inFlow: g } = e;
	if (
		(u &&
			l.includes(`
`)) ||
		(g && /[[\]{},]/.test(l))
	)
		return Ss(l, e);
	if (
		!l ||
		/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(l)
	)
		return u ||
			g ||
			!l.includes(`
`)
			? Ss(l, e)
			: Il(t, e, n, s);
	if (
		!u &&
		!g &&
		o !== ue.PLAIN &&
		l.includes(`
`)
	)
		return Il(t, e, n, s);
	if (ra(l)) {
		if (d === '') return (e.forceBlockIndent = !0), Il(t, e, n, s);
		if (u && d === p) return Ss(l, e);
	}
	const y = l.replace(
		/\n+/g,
		`$&
${d}`,
	);
	if (c) {
		const v = (_) => {
				var E;
				return (
					_.default &&
					_.tag !== 'tag:yaml.org,2002:str' &&
					((E = _.test) == null ? void 0 : E.test(y))
				);
			},
			{ compat: S, tags: k } = e.doc.schema;
		if (k.some(v) || (S != null && S.some(v))) return Ss(l, e);
	}
	return u ? y : ta(y, d, Ay, na(e, !1));
}
function Wi(t, e, n, s) {
	const { implicitKey: o, inFlow: l } = e,
		c = typeof t.value == 'string' ? t : Object.assign({}, t, { value: String(t.value) });
	let { type: u } = t;
	u !== ue.QUOTE_DOUBLE &&
		/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(c.value) &&
		(u = ue.QUOTE_DOUBLE);
	const d = (g) => {
		switch (g) {
			case ue.BLOCK_FOLDED:
			case ue.BLOCK_LITERAL:
				return o || l ? Ss(c.value, e) : Il(c, e, n, s);
			case ue.QUOTE_DOUBLE:
				return Di(c.value, e);
			case ue.QUOTE_SINGLE:
				return zu(c.value, e);
			case ue.PLAIN:
				return oE(c, e, n, s);
			default:
				return null;
		}
	};
	let p = d(u);
	if (p === null) {
		const { defaultKeyType: g, defaultStringType: y } = e.options,
			v = (o && g) || y;
		if (((p = d(v)), p === null)) throw new Error(`Unsupported default string type ${v}`);
	}
	return p;
}
function Iy(t, e) {
	const n = Object.assign(
		{
			blockQuote: !0,
			commentString: sE,
			defaultKeyType: null,
			defaultStringType: 'PLAIN',
			directives: null,
			doubleQuotedAsJSON: !1,
			doubleQuotedMinMultiLineLength: 40,
			falseStr: 'false',
			flowCollectionPadding: !0,
			indentSeq: !0,
			lineWidth: 80,
			minContentWidth: 20,
			nullStr: 'null',
			simpleKeys: !1,
			singleQuote: null,
			trueStr: 'true',
			verifyAliasOrder: !0,
		},
		t.schema.toStringOptions,
		e,
	);
	let s;
	switch (n.collectionStyle) {
		case 'block':
			s = !1;
			break;
		case 'flow':
			s = !0;
			break;
		default:
			s = null;
	}
	return {
		anchors: new Set(),
		doc: t,
		flowCollectionPadding: n.flowCollectionPadding ? ' ' : '',
		indent: '',
		indentStep: typeof n.indent == 'number' ? ' '.repeat(n.indent) : '  ',
		inFlow: s,
		options: n,
	};
}
function lE(t, e) {
	var o;
	if (e.tag) {
		const l = t.filter((c) => c.tag === e.tag);
		if (l.length > 0) return l.find((c) => c.format === e.format) ?? l[0];
	}
	let n, s;
	if (ke(e)) {
		s = e.value;
		let l = t.filter((c) => {
			var u;
			return (u = c.identify) == null ? void 0 : u.call(c, s);
		});
		if (l.length > 1) {
			const c = l.filter((u) => u.test);
			c.length > 0 && (l = c);
		}
		n = l.find((c) => c.format === e.format) ?? l.find((c) => !c.format);
	} else (s = e), (n = t.find((l) => l.nodeClass && s instanceof l.nodeClass));
	if (!n) {
		const l = ((o = s == null ? void 0 : s.constructor) == null ? void 0 : o.name) ?? typeof s;
		throw new Error(`Tag not resolved for ${l} value`);
	}
	return n;
}
function aE(t, e, { anchors: n, doc: s }) {
	if (!s.directives) return '';
	const o = [],
		l = (ke(t) || $e(t)) && t.anchor;
	l && ky(l) && (n.add(l), o.push(`&${l}`));
	const c = t.tag ? t.tag : e.default ? null : e.tag;
	return c && o.push(s.directives.tagString(c)), o.join(' ');
}
function bs(t, e, n, s) {
	var d;
	if (Me(t)) return t.toString(e, n, s);
	if (Ir(t)) {
		if (e.doc.directives) return t.toString(e);
		if ((d = e.resolvedAliases) != null && d.has(t))
			throw new TypeError('Cannot stringify circular structure without alias nodes');
		e.resolvedAliases ? e.resolvedAliases.add(t) : (e.resolvedAliases = new Set([t])),
			(t = t.resolve(e.doc));
	}
	let o;
	const l = Re(t) ? t : e.doc.createNode(t, { onTagObj: (p) => (o = p) });
	o || (o = lE(e.doc.schema.tags, l));
	const c = aE(l, o, e);
	c.length > 0 && (e.indentAtStart = (e.indentAtStart ?? 0) + c.length + 1);
	const u =
		typeof o.stringify == 'function'
			? o.stringify(l, e, n, s)
			: ke(l)
				? Wi(l, e, n, s)
				: l.toString(e, n, s);
	return c
		? ke(l) || u[0] === '{' || u[0] === '['
			? `${c} ${u}`
			: `${c}
${e.indent}${u}`
		: u;
}
function cE({ key: t, value: e }, n, s, o) {
	const {
		allNullValues: l,
		doc: c,
		indent: u,
		indentStep: d,
		options: { commentString: p, indentSeq: g, simpleKeys: y },
	} = n;
	let v = (Re(t) && t.comment) || null;
	if (y) {
		if (v) throw new Error('With simple keys, key nodes cannot have comments');
		if ($e(t) || (!Re(t) && typeof t == 'object')) {
			const q = 'With simple keys, collection cannot be used as a key value';
			throw new Error(q);
		}
	}
	let S =
		!y &&
		(!t ||
			(v && e == null && !n.inFlow) ||
			$e(t) ||
			(ke(t) ? t.type === ue.BLOCK_FOLDED || t.type === ue.BLOCK_LITERAL : typeof t == 'object'));
	n = Object.assign({}, n, { allNullValues: !1, implicitKey: !S && (y || !l), indent: u + d });
	let k = !1,
		_ = !1,
		E = bs(
			t,
			n,
			() => (k = !0),
			() => (_ = !0),
		);
	if (!S && !n.inFlow && E.length > 1024) {
		if (y)
			throw new Error(
				'With simple keys, single line scalar must not span more than 1024 characters',
			);
		S = !0;
	}
	if (n.inFlow) {
		if (l || e == null) return k && s && s(), E === '' ? '?' : S ? `? ${E}` : E;
	} else if ((l && !y) || (e == null && S))
		return (E = `? ${E}`), v && !k ? (E += _r(E, n.indent, p(v))) : _ && o && o(), E;
	k && (v = null),
		S
			? (v && (E += _r(E, n.indent, p(v))),
				(E = `? ${E}
${u}:`))
			: ((E = `${E}:`), v && (E += _r(E, n.indent, p(v))));
	let C, A, O;
	Re(e)
		? ((C = !!e.spaceBefore), (A = e.commentBefore), (O = e.comment))
		: ((C = !1), (A = null), (O = null), e && typeof e == 'object' && (e = c.createNode(e))),
		(n.implicitKey = !1),
		!S && !v && ke(e) && (n.indentAtStart = E.length + 1),
		(_ = !1),
		!g &&
			d.length >= 2 &&
			!n.inFlow &&
			!S &&
			js(e) &&
			!e.flow &&
			!e.tag &&
			!e.anchor &&
			(n.indent = n.indent.substring(2));
	let D = !1;
	const F = bs(
		e,
		n,
		() => (D = !0),
		() => (_ = !0),
	);
	let z = ' ';
	if (v || C || A) {
		if (
			((z = C
				? `
`
				: ''),
			A)
		) {
			const q = p(A);
			z += `
${Cn(q, n.indent)}`;
		}
		F === '' && !n.inFlow
			? z ===
					`
` &&
				(z = `

`)
			: (z += `
${n.indent}`);
	} else if (!S && $e(e)) {
		const q = F[0],
			B = F.indexOf(`
`),
			M = B !== -1,
			G = n.inFlow ?? e.flow ?? e.items.length === 0;
		if (M || !G) {
			let K = !1;
			if (M && (q === '&' || q === '!')) {
				let $ = F.indexOf(' ');
				q === '&' && $ !== -1 && $ < B && F[$ + 1] === '!' && ($ = F.indexOf(' ', $ + 1)),
					($ === -1 || B < $) && (K = !0);
			}
			K ||
				(z = `
${n.indent}`);
		}
	} else
		(F === '' ||
			F[0] ===
				`
`) &&
			(z = '');
	return (
		(E += z + F),
		n.inFlow ? D && s && s() : O && !D ? (E += _r(E, n.indent, p(O))) : _ && o && o(),
		E
	);
}
function Ly(t, e) {
	(t === 'debug' || t === 'warn') &&
		(typeof process < 'u' && process.emitWarning ? process.emitWarning(e) : console.warn(e));
}
const ml = '<<',
	Nn = {
		identify: (t) => t === ml || (typeof t == 'symbol' && t.description === ml),
		default: 'key',
		tag: 'tag:yaml.org,2002:merge',
		test: /^<<$/,
		resolve: () => Object.assign(new ue(Symbol(ml)), { addToJSMap: My }),
		stringify: () => ml,
	},
	uE = (t, e) =>
		(Nn.identify(e) || (ke(e) && (!e.type || e.type === ue.PLAIN) && Nn.identify(e.value))) &&
		(t == null ? void 0 : t.doc.schema.tags.some((n) => n.tag === Nn.tag && n.default));
function My(t, e, n) {
	if (((n = t && Ir(n) ? n.resolve(t.doc) : n), js(n))) for (const s of n.items) xu(t, e, s);
	else if (Array.isArray(n)) for (const s of n) xu(t, e, s);
	else xu(t, e, n);
}
function xu(t, e, n) {
	const s = t && Ir(n) ? n.resolve(t.doc) : n;
	if (!Ms(s)) throw new Error('Merge sources must be maps or map aliases');
	const o = s.toJSON(null, t, Map);
	for (const [l, c] of o)
		e instanceof Map
			? e.has(l) || e.set(l, c)
			: e instanceof Set
				? e.add(l)
				: Object.prototype.hasOwnProperty.call(e, l) ||
					Object.defineProperty(e, l, { value: c, writable: !0, enumerable: !0, configurable: !0 });
	return e;
}
function jy(t, e, { key: n, value: s }) {
	if (Re(n) && n.addToJSMap) n.addToJSMap(t, e, s);
	else if (uE(t, n)) My(t, e, s);
	else {
		const o = Ut(n, '', t);
		if (e instanceof Map) e.set(o, Ut(s, o, t));
		else if (e instanceof Set) e.add(o);
		else {
			const l = fE(n, o, t),
				c = Ut(s, l, t);
			l in e
				? Object.defineProperty(e, l, { value: c, writable: !0, enumerable: !0, configurable: !0 })
				: (e[l] = c);
		}
	}
	return e;
}
function fE(t, e, n) {
	if (e === null) return '';
	if (typeof e != 'object') return String(e);
	if (Re(t) && n != null && n.doc) {
		const s = Iy(n.doc, {});
		s.anchors = new Set();
		for (const l of n.anchors.keys()) s.anchors.add(l.anchor);
		(s.inFlow = !0), (s.inStringifyKey = !0);
		const o = t.toString(s);
		if (!n.mapKeyWarned) {
			let l = JSON.stringify(o);
			l.length > 40 && (l = l.substring(0, 36) + '..."'),
				Ly(
					n.doc.options.logLevel,
					`Keys with collection values will be stringified due to JS Object restrictions: ${l}. Set mapAsMap: true to use object keys.`,
				),
				(n.mapKeyWarned = !0);
		}
		return o;
	}
	return JSON.stringify(e);
}
function Cf(t, e, n) {
	const s = zi(t, void 0, n),
		o = zi(e, void 0, n);
	return new at(s, o);
}
class at {
	constructor(e, n = null) {
		Object.defineProperty(this, Vt, { value: wy }), (this.key = e), (this.value = n);
	}
	clone(e) {
		let { key: n, value: s } = this;
		return Re(n) && (n = n.clone(e)), Re(s) && (s = s.clone(e)), new at(n, s);
	}
	toJSON(e, n) {
		const s = n != null && n.mapAsMap ? new Map() : {};
		return jy(n, s, this);
	}
	toString(e, n, s) {
		return e != null && e.doc ? cE(this, e, n, s) : JSON.stringify(this);
	}
}
function Py(t, e, n) {
	return ((e.inFlow ?? t.flow) ? hE : dE)(t, e, n);
}
function dE(
	{ comment: t, items: e },
	n,
	{ blockItemPrefix: s, flowChars: o, itemIndent: l, onChompKeep: c, onComment: u },
) {
	const {
			indent: d,
			options: { commentString: p },
		} = n,
		g = Object.assign({}, n, { indent: l, type: null });
	let y = !1;
	const v = [];
	for (let k = 0; k < e.length; ++k) {
		const _ = e[k];
		let E = null;
		if (Re(_))
			!y && _.spaceBefore && v.push(''), ql(n, v, _.commentBefore, y), _.comment && (E = _.comment);
		else if (Me(_)) {
			const A = Re(_.key) ? _.key : null;
			A && (!y && A.spaceBefore && v.push(''), ql(n, v, A.commentBefore, y));
		}
		y = !1;
		let C = bs(
			_,
			g,
			() => (E = null),
			() => (y = !0),
		);
		E && (C += _r(C, l, p(E))), y && E && (y = !1), v.push(s + C);
	}
	let S;
	if (v.length === 0) S = o.start + o.end;
	else {
		S = v[0];
		for (let k = 1; k < v.length; ++k) {
			const _ = v[k];
			S += _
				? `
${d}${_}`
				: `
`;
		}
	}
	return (
		t
			? ((S +=
					`
` + Cn(p(t), d)),
				u && u())
			: y && c && c(),
		S
	);
}
function hE({ items: t }, e, { flowChars: n, itemIndent: s }) {
	const {
		indent: o,
		indentStep: l,
		flowCollectionPadding: c,
		options: { commentString: u },
	} = e;
	s += l;
	const d = Object.assign({}, e, { indent: s, inFlow: !0, type: null });
	let p = !1,
		g = 0;
	const y = [];
	for (let k = 0; k < t.length; ++k) {
		const _ = t[k];
		let E = null;
		if (Re(_))
			_.spaceBefore && y.push(''), ql(e, y, _.commentBefore, !1), _.comment && (E = _.comment);
		else if (Me(_)) {
			const A = Re(_.key) ? _.key : null;
			A && (A.spaceBefore && y.push(''), ql(e, y, A.commentBefore, !1), A.comment && (p = !0));
			const O = Re(_.value) ? _.value : null;
			O
				? (O.comment && (E = O.comment), O.commentBefore && (p = !0))
				: _.value == null && A != null && A.comment && (E = A.comment);
		}
		E && (p = !0);
		let C = bs(_, d, () => (E = null));
		k < t.length - 1 && (C += ','),
			E && (C += _r(C, s, u(E))),
			!p &&
				(y.length > g ||
					C.includes(`
`)) &&
				(p = !0),
			y.push(C),
			(g = y.length);
	}
	const { start: v, end: S } = n;
	if (y.length === 0) return v + S;
	if (!p) {
		const k = y.reduce((_, E) => _ + E.length + 2, 2);
		p = e.options.lineWidth > 0 && k > e.options.lineWidth;
	}
	if (p) {
		let k = v;
		for (const _ of y)
			k += _
				? `
${l}${o}${_}`
				: `
`;
		return `${k}
${o}${S}`;
	} else return `${v}${c}${y.join(' ')}${c}${S}`;
}
function ql({ indent: t, options: { commentString: e } }, n, s, o) {
	if ((s && o && (s = s.replace(/^\n+/, '')), s)) {
		const l = Cn(e(s), t);
		n.push(l.trimStart());
	}
}
function Er(t, e) {
	const n = ke(e) ? e.value : e;
	for (const s of t)
		if (Me(s) && (s.key === e || s.key === n || (ke(s.key) && s.key.value === n))) return s;
}
class Lt extends Ny {
	static get tagName() {
		return 'tag:yaml.org,2002:map';
	}
	constructor(e) {
		super(tr, e), (this.items = []);
	}
	static from(e, n, s) {
		const { keepUndefined: o, replacer: l } = s,
			c = new this(e),
			u = (d, p) => {
				if (typeof l == 'function') p = l.call(n, d, p);
				else if (Array.isArray(l) && !l.includes(d)) return;
				(p !== void 0 || o) && c.items.push(Cf(d, p, s));
			};
		if (n instanceof Map) for (const [d, p] of n) u(d, p);
		else if (n && typeof n == 'object') for (const d of Object.keys(n)) u(d, n[d]);
		return typeof e.sortMapEntries == 'function' && c.items.sort(e.sortMapEntries), c;
	}
	add(e, n) {
		var c;
		let s;
		Me(e)
			? (s = e)
			: !e || typeof e != 'object' || !('key' in e)
				? (s = new at(e, e == null ? void 0 : e.value))
				: (s = new at(e.key, e.value));
		const o = Er(this.items, s.key),
			l = (c = this.schema) == null ? void 0 : c.sortMapEntries;
		if (o) {
			if (!n) throw new Error(`Key ${s.key} already set`);
			ke(o.value) && Cy(s.value) ? (o.value.value = s.value) : (o.value = s.value);
		} else if (l) {
			const u = this.items.findIndex((d) => l(s, d) < 0);
			u === -1 ? this.items.push(s) : this.items.splice(u, 0, s);
		} else this.items.push(s);
	}
	delete(e) {
		const n = Er(this.items, e);
		return n ? this.items.splice(this.items.indexOf(n), 1).length > 0 : !1;
	}
	get(e, n) {
		const s = Er(this.items, e),
			o = s == null ? void 0 : s.value;
		return (!n && ke(o) ? o.value : o) ?? void 0;
	}
	has(e) {
		return !!Er(this.items, e);
	}
	set(e, n) {
		this.add(new at(e, n), !0);
	}
	toJSON(e, n, s) {
		const o = s ? new s() : n != null && n.mapAsMap ? new Map() : {};
		n != null && n.onCreate && n.onCreate(o);
		for (const l of this.items) jy(n, o, l);
		return o;
	}
	toString(e, n, s) {
		if (!e) return JSON.stringify(this);
		for (const o of this.items)
			if (!Me(o))
				throw new Error(`Map items must all be pairs; found ${JSON.stringify(o)} instead`);
		return (
			!e.allNullValues &&
				this.hasAllNullValues(!1) &&
				(e = Object.assign({}, e, { allNullValues: !0 })),
			Py(this, e, {
				blockItemPrefix: '',
				flowChars: { start: '{', end: '}' },
				itemIndent: e.indent || '',
				onChompKeep: s,
				onComment: n,
			})
		);
	}
}
const Ps = {
	collection: 'map',
	default: !0,
	nodeClass: Lt,
	tag: 'tag:yaml.org,2002:map',
	resolve(t, e) {
		return Ms(t) || e('Expected a mapping for this tag'), t;
	},
	createNode: (t, e, n) => Lt.from(t, e, n),
};
class rr extends Ny {
	static get tagName() {
		return 'tag:yaml.org,2002:seq';
	}
	constructor(e) {
		super(Ls, e), (this.items = []);
	}
	add(e) {
		this.items.push(e);
	}
	delete(e) {
		const n = gl(e);
		return typeof n != 'number' ? !1 : this.items.splice(n, 1).length > 0;
	}
	get(e, n) {
		const s = gl(e);
		if (typeof s != 'number') return;
		const o = this.items[s];
		return !n && ke(o) ? o.value : o;
	}
	has(e) {
		const n = gl(e);
		return typeof n == 'number' && n < this.items.length;
	}
	set(e, n) {
		const s = gl(e);
		if (typeof s != 'number') throw new Error(`Expected a valid index, not ${e}.`);
		const o = this.items[s];
		ke(o) && Cy(n) ? (o.value = n) : (this.items[s] = n);
	}
	toJSON(e, n) {
		const s = [];
		n != null && n.onCreate && n.onCreate(s);
		let o = 0;
		for (const l of this.items) s.push(Ut(l, String(o++), n));
		return s;
	}
	toString(e, n, s) {
		return e
			? Py(this, e, {
					blockItemPrefix: '- ',
					flowChars: { start: '[', end: ']' },
					itemIndent: (e.indent || '') + '  ',
					onChompKeep: s,
					onComment: n,
				})
			: JSON.stringify(this);
	}
	static from(e, n, s) {
		const { replacer: o } = s,
			l = new this(e);
		if (n && Symbol.iterator in Object(n)) {
			let c = 0;
			for (let u of n) {
				if (typeof o == 'function') {
					const d = n instanceof Set ? u : String(c++);
					u = o.call(n, d, u);
				}
				l.items.push(zi(u, void 0, s));
			}
		}
		return l;
	}
}
function gl(t) {
	let e = ke(t) ? t.value : t;
	return (
		e && typeof e == 'string' && (e = Number(e)),
		typeof e == 'number' && Number.isInteger(e) && e >= 0 ? e : null
	);
}
const Os = {
		collection: 'seq',
		default: !0,
		nodeClass: rr,
		tag: 'tag:yaml.org,2002:seq',
		resolve(t, e) {
			return js(t) || e('Expected a sequence for this tag'), t;
		},
		createNode: (t, e, n) => rr.from(t, e, n),
	},
	sa = {
		identify: (t) => typeof t == 'string',
		default: !0,
		tag: 'tag:yaml.org,2002:str',
		resolve: (t) => t,
		stringify(t, e, n, s) {
			return (e = Object.assign({ actualString: !0 }, e)), Wi(t, e, n, s);
		},
	},
	ia = {
		identify: (t) => t == null,
		createNode: () => new ue(null),
		default: !0,
		tag: 'tag:yaml.org,2002:null',
		test: /^(?:~|[Nn]ull|NULL)?$/,
		resolve: () => new ue(null),
		stringify: ({ source: t }, e) =>
			typeof t == 'string' && ia.test.test(t) ? t : e.options.nullStr,
	},
	Nf = {
		identify: (t) => typeof t == 'boolean',
		default: !0,
		tag: 'tag:yaml.org,2002:bool',
		test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
		resolve: (t) => new ue(t[0] === 't' || t[0] === 'T'),
		stringify({ source: t, value: e }, n) {
			if (t && Nf.test.test(t)) {
				const s = t[0] === 't' || t[0] === 'T';
				if (e === s) return t;
			}
			return e ? n.options.trueStr : n.options.falseStr;
		},
	};
function tn({ format: t, minFractionDigits: e, tag: n, value: s }) {
	if (typeof s == 'bigint') return String(s);
	const o = typeof s == 'number' ? s : Number(s);
	if (!isFinite(o)) return isNaN(o) ? '.nan' : o < 0 ? '-.inf' : '.inf';
	let l = JSON.stringify(s);
	if (!t && e && (!n || n === 'tag:yaml.org,2002:float') && /^\d/.test(l)) {
		let c = l.indexOf('.');
		c < 0 && ((c = l.length), (l += '.'));
		let u = e - (l.length - c - 1);
		for (; u-- > 0; ) l += '0';
	}
	return l;
}
const Oy = {
		identify: (t) => typeof t == 'number',
		default: !0,
		tag: 'tag:yaml.org,2002:float',
		test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
		resolve: (t) =>
			t.slice(-3).toLowerCase() === 'nan'
				? NaN
				: t[0] === '-'
					? Number.NEGATIVE_INFINITY
					: Number.POSITIVE_INFINITY,
		stringify: tn,
	},
	$y = {
		identify: (t) => typeof t == 'number',
		default: !0,
		tag: 'tag:yaml.org,2002:float',
		format: 'EXP',
		test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
		resolve: (t) => parseFloat(t),
		stringify(t) {
			const e = Number(t.value);
			return isFinite(e) ? e.toExponential() : tn(t);
		},
	},
	Ry = {
		identify: (t) => typeof t == 'number',
		default: !0,
		tag: 'tag:yaml.org,2002:float',
		test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
		resolve(t) {
			const e = new ue(parseFloat(t)),
				n = t.indexOf('.');
			return n !== -1 && t[t.length - 1] === '0' && (e.minFractionDigits = t.length - n - 1), e;
		},
		stringify: tn,
	},
	oa = (t) => typeof t == 'bigint' || Number.isInteger(t),
	Af = (t, e, n, { intAsBigInt: s }) => (s ? BigInt(t) : parseInt(t.substring(e), n));
function Dy(t, e, n) {
	const { value: s } = t;
	return oa(s) && s >= 0 ? n + s.toString(e) : tn(t);
}
const Fy = {
		identify: (t) => oa(t) && t >= 0,
		default: !0,
		tag: 'tag:yaml.org,2002:int',
		format: 'OCT',
		test: /^0o[0-7]+$/,
		resolve: (t, e, n) => Af(t, 2, 8, n),
		stringify: (t) => Dy(t, 8, '0o'),
	},
	By = {
		identify: oa,
		default: !0,
		tag: 'tag:yaml.org,2002:int',
		test: /^[-+]?[0-9]+$/,
		resolve: (t, e, n) => Af(t, 0, 10, n),
		stringify: tn,
	},
	zy = {
		identify: (t) => oa(t) && t >= 0,
		default: !0,
		tag: 'tag:yaml.org,2002:int',
		format: 'HEX',
		test: /^0x[0-9a-fA-F]+$/,
		resolve: (t, e, n) => Af(t, 2, 16, n),
		stringify: (t) => Dy(t, 16, '0x'),
	},
	pE = [Ps, Os, sa, ia, Nf, Fy, By, zy, Oy, $y, Ry];
function Em(t) {
	return typeof t == 'bigint' || Number.isInteger(t);
}
const yl = ({ value: t }) => JSON.stringify(t),
	mE = [
		{
			identify: (t) => typeof t == 'string',
			default: !0,
			tag: 'tag:yaml.org,2002:str',
			resolve: (t) => t,
			stringify: yl,
		},
		{
			identify: (t) => t == null,
			createNode: () => new ue(null),
			default: !0,
			tag: 'tag:yaml.org,2002:null',
			test: /^null$/,
			resolve: () => null,
			stringify: yl,
		},
		{
			identify: (t) => typeof t == 'boolean',
			default: !0,
			tag: 'tag:yaml.org,2002:bool',
			test: /^true|false$/,
			resolve: (t) => t === 'true',
			stringify: yl,
		},
		{
			identify: Em,
			default: !0,
			tag: 'tag:yaml.org,2002:int',
			test: /^-?(?:0|[1-9][0-9]*)$/,
			resolve: (t, e, { intAsBigInt: n }) => (n ? BigInt(t) : parseInt(t, 10)),
			stringify: ({ value: t }) => (Em(t) ? t.toString() : JSON.stringify(t)),
		},
		{
			identify: (t) => typeof t == 'number',
			default: !0,
			tag: 'tag:yaml.org,2002:float',
			test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
			resolve: (t) => parseFloat(t),
			stringify: yl,
		},
	],
	gE = {
		default: !0,
		tag: '',
		test: /^/,
		resolve(t, e) {
			return e(`Unresolved plain scalar ${JSON.stringify(t)}`), t;
		},
	},
	yE = [Ps, Os].concat(mE, gE),
	If = {
		identify: (t) => t instanceof Uint8Array,
		default: !1,
		tag: 'tag:yaml.org,2002:binary',
		resolve(t, e) {
			if (typeof Buffer == 'function') return Buffer.from(t, 'base64');
			if (typeof atob == 'function') {
				const n = atob(t.replace(/[\n\r]/g, '')),
					s = new Uint8Array(n.length);
				for (let o = 0; o < n.length; ++o) s[o] = n.charCodeAt(o);
				return s;
			} else
				return (
					e(
						'This environment does not support reading binary tags; either Buffer or atob is required',
					),
					t
				);
		},
		stringify({ comment: t, type: e, value: n }, s, o, l) {
			const c = n;
			let u;
			if (typeof Buffer == 'function')
				u = c instanceof Buffer ? c.toString('base64') : Buffer.from(c.buffer).toString('base64');
			else if (typeof btoa == 'function') {
				let d = '';
				for (let p = 0; p < c.length; ++p) d += String.fromCharCode(c[p]);
				u = btoa(d);
			} else
				throw new Error(
					'This environment does not support writing binary tags; either Buffer or btoa is required',
				);
			if ((e || (e = ue.BLOCK_LITERAL), e !== ue.QUOTE_DOUBLE)) {
				const d = Math.max(s.options.lineWidth - s.indent.length, s.options.minContentWidth),
					p = Math.ceil(u.length / d),
					g = new Array(p);
				for (let y = 0, v = 0; y < p; ++y, v += d) g[y] = u.substr(v, d);
				u = g.join(
					e === ue.BLOCK_LITERAL
						? `
`
						: ' ',
				);
			}
			return Wi({ comment: t, type: e, value: u }, s, o, l);
		},
	};
function Hy(t, e) {
	if (js(t))
		for (let n = 0; n < t.items.length; ++n) {
			let s = t.items[n];
			if (!Me(s)) {
				if (Ms(s)) {
					s.items.length > 1 && e('Each pair must have its own sequence indicator');
					const o = s.items[0] || new at(new ue(null));
					if (
						(s.commentBefore &&
							(o.key.commentBefore = o.key.commentBefore
								? `${s.commentBefore}
${o.key.commentBefore}`
								: s.commentBefore),
						s.comment)
					) {
						const l = o.value ?? o.key;
						l.comment = l.comment
							? `${s.comment}
${l.comment}`
							: s.comment;
					}
					s = o;
				}
				t.items[n] = Me(s) ? s : new at(s);
			}
		}
	else e('Expected a sequence for this tag');
	return t;
}
function Uy(t, e, n) {
	const { replacer: s } = n,
		o = new rr(t);
	o.tag = 'tag:yaml.org,2002:pairs';
	let l = 0;
	if (e && Symbol.iterator in Object(e))
		for (let c of e) {
			typeof s == 'function' && (c = s.call(e, String(l++), c));
			let u, d;
			if (Array.isArray(c))
				if (c.length === 2) (u = c[0]), (d = c[1]);
				else throw new TypeError(`Expected [key, value] tuple: ${c}`);
			else if (c && c instanceof Object) {
				const p = Object.keys(c);
				if (p.length === 1) (u = p[0]), (d = c[u]);
				else throw new TypeError(`Expected tuple with one key, not ${p.length} keys`);
			} else u = c;
			o.items.push(Cf(u, d, n));
		}
	return o;
}
const Lf = {
	collection: 'seq',
	default: !1,
	tag: 'tag:yaml.org,2002:pairs',
	resolve: Hy,
	createNode: Uy,
};
class xs extends rr {
	constructor() {
		super(),
			(this.add = Lt.prototype.add.bind(this)),
			(this.delete = Lt.prototype.delete.bind(this)),
			(this.get = Lt.prototype.get.bind(this)),
			(this.has = Lt.prototype.has.bind(this)),
			(this.set = Lt.prototype.set.bind(this)),
			(this.tag = xs.tag);
	}
	toJSON(e, n) {
		if (!n) return super.toJSON(e);
		const s = new Map();
		n != null && n.onCreate && n.onCreate(s);
		for (const o of this.items) {
			let l, c;
			if (
				(Me(o) ? ((l = Ut(o.key, '', n)), (c = Ut(o.value, l, n))) : (l = Ut(o, '', n)), s.has(l))
			)
				throw new Error('Ordered maps must not include duplicate keys');
			s.set(l, c);
		}
		return s;
	}
	static from(e, n, s) {
		const o = Uy(e, n, s),
			l = new this();
		return (l.items = o.items), l;
	}
}
xs.tag = 'tag:yaml.org,2002:omap';
const Mf = {
	collection: 'seq',
	identify: (t) => t instanceof Map,
	nodeClass: xs,
	default: !1,
	tag: 'tag:yaml.org,2002:omap',
	resolve(t, e) {
		const n = Hy(t, e),
			s = [];
		for (const { key: o } of n.items)
			ke(o) &&
				(s.includes(o.value)
					? e(`Ordered maps must not include duplicate keys: ${o.value}`)
					: s.push(o.value));
		return Object.assign(new xs(), n);
	},
	createNode: (t, e, n) => xs.from(t, e, n),
};
function qy({ value: t, source: e }, n) {
	return e && (t ? Vy : Wy).test.test(e) ? e : t ? n.options.trueStr : n.options.falseStr;
}
const Vy = {
		identify: (t) => t === !0,
		default: !0,
		tag: 'tag:yaml.org,2002:bool',
		test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
		resolve: () => new ue(!0),
		stringify: qy,
	},
	Wy = {
		identify: (t) => t === !1,
		default: !0,
		tag: 'tag:yaml.org,2002:bool',
		test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
		resolve: () => new ue(!1),
		stringify: qy,
	},
	vE = {
		identify: (t) => typeof t == 'number',
		default: !0,
		tag: 'tag:yaml.org,2002:float',
		test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
		resolve: (t) =>
			t.slice(-3).toLowerCase() === 'nan'
				? NaN
				: t[0] === '-'
					? Number.NEGATIVE_INFINITY
					: Number.POSITIVE_INFINITY,
		stringify: tn,
	},
	wE = {
		identify: (t) => typeof t == 'number',
		default: !0,
		tag: 'tag:yaml.org,2002:float',
		format: 'EXP',
		test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
		resolve: (t) => parseFloat(t.replace(/_/g, '')),
		stringify(t) {
			const e = Number(t.value);
			return isFinite(e) ? e.toExponential() : tn(t);
		},
	},
	SE = {
		identify: (t) => typeof t == 'number',
		default: !0,
		tag: 'tag:yaml.org,2002:float',
		test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
		resolve(t) {
			const e = new ue(parseFloat(t.replace(/_/g, ''))),
				n = t.indexOf('.');
			if (n !== -1) {
				const s = t.substring(n + 1).replace(/_/g, '');
				s[s.length - 1] === '0' && (e.minFractionDigits = s.length);
			}
			return e;
		},
		stringify: tn,
	},
	Ki = (t) => typeof t == 'bigint' || Number.isInteger(t);
function la(t, e, n, { intAsBigInt: s }) {
	const o = t[0];
	if (((o === '-' || o === '+') && (e += 1), (t = t.substring(e).replace(/_/g, '')), s)) {
		switch (n) {
			case 2:
				t = `0b${t}`;
				break;
			case 8:
				t = `0o${t}`;
				break;
			case 16:
				t = `0x${t}`;
				break;
		}
		const c = BigInt(t);
		return o === '-' ? BigInt(-1) * c : c;
	}
	const l = parseInt(t, n);
	return o === '-' ? -1 * l : l;
}
function jf(t, e, n) {
	const { value: s } = t;
	if (Ki(s)) {
		const o = s.toString(e);
		return s < 0 ? '-' + n + o.substr(1) : n + o;
	}
	return tn(t);
}
const xE = {
		identify: Ki,
		default: !0,
		tag: 'tag:yaml.org,2002:int',
		format: 'BIN',
		test: /^[-+]?0b[0-1_]+$/,
		resolve: (t, e, n) => la(t, 2, 2, n),
		stringify: (t) => jf(t, 2, '0b'),
	},
	_E = {
		identify: Ki,
		default: !0,
		tag: 'tag:yaml.org,2002:int',
		format: 'OCT',
		test: /^[-+]?0[0-7_]+$/,
		resolve: (t, e, n) => la(t, 1, 8, n),
		stringify: (t) => jf(t, 8, '0'),
	},
	EE = {
		identify: Ki,
		default: !0,
		tag: 'tag:yaml.org,2002:int',
		test: /^[-+]?[0-9][0-9_]*$/,
		resolve: (t, e, n) => la(t, 0, 10, n),
		stringify: tn,
	},
	kE = {
		identify: Ki,
		default: !0,
		tag: 'tag:yaml.org,2002:int',
		format: 'HEX',
		test: /^[-+]?0x[0-9a-fA-F_]+$/,
		resolve: (t, e, n) => la(t, 2, 16, n),
		stringify: (t) => jf(t, 16, '0x'),
	};
class _s extends Lt {
	constructor(e) {
		super(e), (this.tag = _s.tag);
	}
	add(e) {
		let n;
		Me(e)
			? (n = e)
			: e && typeof e == 'object' && 'key' in e && 'value' in e && e.value === null
				? (n = new at(e.key, null))
				: (n = new at(e, null)),
			Er(this.items, n.key) || this.items.push(n);
	}
	get(e, n) {
		const s = Er(this.items, e);
		return !n && Me(s) ? (ke(s.key) ? s.key.value : s.key) : s;
	}
	set(e, n) {
		if (typeof n != 'boolean')
			throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof n}`);
		const s = Er(this.items, e);
		s && !n ? this.items.splice(this.items.indexOf(s), 1) : !s && n && this.items.push(new at(e));
	}
	toJSON(e, n) {
		return super.toJSON(e, n, Set);
	}
	toString(e, n, s) {
		if (!e) return JSON.stringify(this);
		if (this.hasAllNullValues(!0))
			return super.toString(Object.assign({}, e, { allNullValues: !0 }), n, s);
		throw new Error('Set items must all have null values');
	}
	static from(e, n, s) {
		const { replacer: o } = s,
			l = new this(e);
		if (n && Symbol.iterator in Object(n))
			for (let c of n)
				typeof o == 'function' && (c = o.call(n, c, c)), l.items.push(Cf(c, null, s));
		return l;
	}
}
_s.tag = 'tag:yaml.org,2002:set';
const Pf = {
	collection: 'map',
	identify: (t) => t instanceof Set,
	nodeClass: _s,
	default: !1,
	tag: 'tag:yaml.org,2002:set',
	createNode: (t, e, n) => _s.from(t, e, n),
	resolve(t, e) {
		if (Ms(t)) {
			if (t.hasAllNullValues(!0)) return Object.assign(new _s(), t);
			e('Set items must all have null values');
		} else e('Expected a mapping for this tag');
		return t;
	},
};
function Of(t, e) {
	const n = t[0],
		s = n === '-' || n === '+' ? t.substring(1) : t,
		o = (c) => (e ? BigInt(c) : Number(c)),
		l = s
			.replace(/_/g, '')
			.split(':')
			.reduce((c, u) => c * o(60) + o(u), o(0));
	return n === '-' ? o(-1) * l : l;
}
function Ky(t) {
	let { value: e } = t,
		n = (c) => c;
	if (typeof e == 'bigint') n = (c) => BigInt(c);
	else if (isNaN(e) || !isFinite(e)) return tn(t);
	let s = '';
	e < 0 && ((s = '-'), (e *= n(-1)));
	const o = n(60),
		l = [e % o];
	return (
		e < 60
			? l.unshift(0)
			: ((e = (e - l[0]) / o), l.unshift(e % o), e >= 60 && ((e = (e - l[0]) / o), l.unshift(e))),
		s +
			l
				.map((c) => String(c).padStart(2, '0'))
				.join(':')
				.replace(/000000\d*$/, '')
	);
}
const Gy = {
		identify: (t) => typeof t == 'bigint' || Number.isInteger(t),
		default: !0,
		tag: 'tag:yaml.org,2002:int',
		format: 'TIME',
		test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
		resolve: (t, e, { intAsBigInt: n }) => Of(t, n),
		stringify: Ky,
	},
	Qy = {
		identify: (t) => typeof t == 'number',
		default: !0,
		tag: 'tag:yaml.org,2002:float',
		format: 'TIME',
		test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
		resolve: (t) => Of(t, !1),
		stringify: Ky,
	},
	aa = {
		identify: (t) => t instanceof Date,
		default: !0,
		tag: 'tag:yaml.org,2002:timestamp',
		test: RegExp(
			'^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:(?:t|T|[ \\t]+)([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?)?$',
		),
		resolve(t) {
			const e = t.match(aa.test);
			if (!e) throw new Error('!!timestamp expects a date, starting with yyyy-mm-dd');
			const [, n, s, o, l, c, u] = e.map(Number),
				d = e[7] ? Number((e[7] + '00').substr(1, 3)) : 0;
			let p = Date.UTC(n, s - 1, o, l || 0, c || 0, u || 0, d);
			const g = e[8];
			if (g && g !== 'Z') {
				let y = Of(g, !1);
				Math.abs(y) < 30 && (y *= 60), (p -= 6e4 * y);
			}
			return new Date(p);
		},
		stringify: ({ value: t }) => t.toISOString().replace(/((T00:00)?:00)?\.000Z$/, ''),
	},
	km = [Ps, Os, sa, ia, Vy, Wy, xE, _E, EE, kE, vE, wE, SE, If, Nn, Mf, Lf, Pf, Gy, Qy, aa],
	bm = new Map([
		['core', pE],
		['failsafe', [Ps, Os, sa]],
		['json', yE],
		['yaml11', km],
		['yaml-1.1', km],
	]),
	Tm = {
		binary: If,
		bool: Nf,
		float: Ry,
		floatExp: $y,
		floatNaN: Oy,
		floatTime: Qy,
		int: By,
		intHex: zy,
		intOct: Fy,
		intTime: Gy,
		map: Ps,
		merge: Nn,
		null: ia,
		omap: Mf,
		pairs: Lf,
		seq: Os,
		set: Pf,
		timestamp: aa,
	},
	bE = {
		'tag:yaml.org,2002:binary': If,
		'tag:yaml.org,2002:merge': Nn,
		'tag:yaml.org,2002:omap': Mf,
		'tag:yaml.org,2002:pairs': Lf,
		'tag:yaml.org,2002:set': Pf,
		'tag:yaml.org,2002:timestamp': aa,
	};
function _u(t, e, n) {
	const s = bm.get(e);
	if (s && !t) return n && !s.includes(Nn) ? s.concat(Nn) : s.slice();
	let o = s;
	if (!o)
		if (Array.isArray(t)) o = [];
		else {
			const l = Array.from(bm.keys())
				.filter((c) => c !== 'yaml11')
				.map((c) => JSON.stringify(c))
				.join(', ');
			throw new Error(`Unknown schema "${e}"; use one of ${l} or define customTags array`);
		}
	if (Array.isArray(t)) for (const l of t) o = o.concat(l);
	else typeof t == 'function' && (o = t(o.slice()));
	return (
		n && (o = o.concat(Nn)),
		o.reduce((l, c) => {
			const u = typeof c == 'string' ? Tm[c] : c;
			if (!u) {
				const d = JSON.stringify(c),
					p = Object.keys(Tm)
						.map((g) => JSON.stringify(g))
						.join(', ');
				throw new Error(`Unknown custom tag ${d}; use one of ${p}`);
			}
			return l.includes(u) || l.push(u), l;
		}, [])
	);
}
const TE = (t, e) => (t.key < e.key ? -1 : t.key > e.key ? 1 : 0);
class ca {
	constructor({
		compat: e,
		customTags: n,
		merge: s,
		resolveKnownTags: o,
		schema: l,
		sortMapEntries: c,
		toStringDefaults: u,
	}) {
		(this.compat = Array.isArray(e) ? _u(e, 'compat') : e ? _u(null, e) : null),
			(this.name = (typeof l == 'string' && l) || 'core'),
			(this.knownTags = o ? bE : {}),
			(this.tags = _u(n, this.name, s)),
			(this.toStringOptions = u ?? null),
			Object.defineProperty(this, tr, { value: Ps }),
			Object.defineProperty(this, dn, { value: sa }),
			Object.defineProperty(this, Ls, { value: Os }),
			(this.sortMapEntries = typeof c == 'function' ? c : c === !0 ? TE : null);
	}
	clone() {
		const e = Object.create(ca.prototype, Object.getOwnPropertyDescriptors(this));
		return (e.tags = this.tags.slice()), e;
	}
}
function CE(t, e) {
	var d;
	const n = [];
	let s = e.directives === !0;
	if (e.directives !== !1 && t.directives) {
		const p = t.directives.toString(t);
		p ? (n.push(p), (s = !0)) : t.directives.docStart && (s = !0);
	}
	s && n.push('---');
	const o = Iy(t, e),
		{ commentString: l } = o.options;
	if (t.commentBefore) {
		n.length !== 1 && n.unshift('');
		const p = l(t.commentBefore);
		n.unshift(Cn(p, ''));
	}
	let c = !1,
		u = null;
	if (t.contents) {
		if (Re(t.contents)) {
			if ((t.contents.spaceBefore && s && n.push(''), t.contents.commentBefore)) {
				const y = l(t.contents.commentBefore);
				n.push(Cn(y, ''));
			}
			(o.forceBlockIndent = !!t.comment), (u = t.contents.comment);
		}
		const p = u ? void 0 : () => (c = !0);
		let g = bs(t.contents, o, () => (u = null), p);
		u && (g += _r(g, '', l(u))),
			(g[0] === '|' || g[0] === '>') && n[n.length - 1] === '---'
				? (n[n.length - 1] = `--- ${g}`)
				: n.push(g);
	} else n.push(bs(t.contents, o));
	if ((d = t.directives) != null && d.docEnd)
		if (t.comment) {
			const p = l(t.comment);
			p.includes(`
`)
				? (n.push('...'), n.push(Cn(p, '')))
				: n.push(`... ${p}`);
		} else n.push('...');
	else {
		let p = t.comment;
		p && c && (p = p.replace(/^\n+/, '')),
			p && ((!c || u) && n[n.length - 1] !== '' && n.push(''), n.push(Cn(l(p), '')));
	}
	return (
		n.join(`
`) +
		`
`
	);
}
class $s {
	constructor(e, n, s) {
		(this.commentBefore = null),
			(this.comment = null),
			(this.errors = []),
			(this.warnings = []),
			Object.defineProperty(this, Vt, { value: Fu });
		let o = null;
		typeof n == 'function' || Array.isArray(n)
			? (o = n)
			: s === void 0 && n && ((s = n), (n = void 0));
		const l = Object.assign(
			{
				intAsBigInt: !1,
				keepSourceTokens: !1,
				logLevel: 'warn',
				prettyErrors: !0,
				strict: !0,
				stringKeys: !1,
				uniqueKeys: !0,
				version: '1.2',
			},
			s,
		);
		this.options = l;
		let { version: c } = l;
		s != null && s._directives
			? ((this.directives = s._directives.atDocument()),
				this.directives.yaml.explicit && (c = this.directives.yaml.version))
			: (this.directives = new dt({ version: c })),
			this.setSchema(c, s),
			(this.contents = e === void 0 ? null : this.createNode(e, o, s));
	}
	clone() {
		const e = Object.create($s.prototype, { [Vt]: { value: Fu } });
		return (
			(e.commentBefore = this.commentBefore),
			(e.comment = this.comment),
			(e.errors = this.errors.slice()),
			(e.warnings = this.warnings.slice()),
			(e.options = Object.assign({}, this.options)),
			this.directives && (e.directives = this.directives.clone()),
			(e.schema = this.schema.clone()),
			(e.contents = Re(this.contents) ? this.contents.clone(e.schema) : this.contents),
			this.range && (e.range = this.range.slice()),
			e
		);
	}
	add(e) {
		us(this.contents) && this.contents.add(e);
	}
	addIn(e, n) {
		us(this.contents) && this.contents.addIn(e, n);
	}
	createAlias(e, n) {
		if (!e.anchor) {
			const s = by(this);
			e.anchor = !n || s.has(n) ? Ty(n || 'a', s) : n;
		}
		return new ea(e.anchor);
	}
	createNode(e, n, s) {
		let o;
		if (typeof n == 'function') (e = n.call({ '': e }, '', e)), (o = n);
		else if (Array.isArray(n)) {
			const E = (A) => typeof A == 'number' || A instanceof String || A instanceof Number,
				C = n.filter(E).map(String);
			C.length > 0 && (n = n.concat(C)), (o = n);
		} else s === void 0 && n && ((s = n), (n = void 0));
		const {
				aliasDuplicateObjects: l,
				anchorPrefix: c,
				flow: u,
				keepUndefined: d,
				onTagObj: p,
				tag: g,
			} = s ?? {},
			{ onAnchor: y, setAnchors: v, sourceObjects: S } = tE(this, c || 'a'),
			k = {
				aliasDuplicateObjects: l ?? !0,
				keepUndefined: d ?? !1,
				onAnchor: y,
				onTagObj: p,
				replacer: o,
				schema: this.schema,
				sourceObjects: S,
			},
			_ = zi(e, g, k);
		return u && $e(_) && (_.flow = !0), v(), _;
	}
	createPair(e, n, s = {}) {
		const o = this.createNode(e, null, s),
			l = this.createNode(n, null, s);
		return new at(o, l);
	}
	delete(e) {
		return us(this.contents) ? this.contents.delete(e) : !1;
	}
	deleteIn(e) {
		return Pi(e)
			? this.contents == null
				? !1
				: ((this.contents = null), !0)
			: us(this.contents)
				? this.contents.deleteIn(e)
				: !1;
	}
	get(e, n) {
		return $e(this.contents) ? this.contents.get(e, n) : void 0;
	}
	getIn(e, n) {
		return Pi(e)
			? !n && ke(this.contents)
				? this.contents.value
				: this.contents
			: $e(this.contents)
				? this.contents.getIn(e, n)
				: void 0;
	}
	has(e) {
		return $e(this.contents) ? this.contents.has(e) : !1;
	}
	hasIn(e) {
		return Pi(e) ? this.contents !== void 0 : $e(this.contents) ? this.contents.hasIn(e) : !1;
	}
	set(e, n) {
		this.contents == null
			? (this.contents = Ul(this.schema, [e], n))
			: us(this.contents) && this.contents.set(e, n);
	}
	setIn(e, n) {
		Pi(e)
			? (this.contents = n)
			: this.contents == null
				? (this.contents = Ul(this.schema, Array.from(e), n))
				: us(this.contents) && this.contents.setIn(e, n);
	}
	setSchema(e, n = {}) {
		typeof e == 'number' && (e = String(e));
		let s;
		switch (e) {
			case '1.1':
				this.directives
					? (this.directives.yaml.version = '1.1')
					: (this.directives = new dt({ version: '1.1' })),
					(s = { resolveKnownTags: !1, schema: 'yaml-1.1' });
				break;
			case '1.2':
			case 'next':
				this.directives
					? (this.directives.yaml.version = e)
					: (this.directives = new dt({ version: e })),
					(s = { resolveKnownTags: !0, schema: 'core' });
				break;
			case null:
				this.directives && delete this.directives, (s = null);
				break;
			default: {
				const o = JSON.stringify(e);
				throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${o}`);
			}
		}
		if (n.schema instanceof Object) this.schema = n.schema;
		else if (s) this.schema = new ca(Object.assign(s, n));
		else throw new Error('With a null YAML version, the { schema: Schema } option is required');
	}
	toJS({ json: e, jsonArg: n, mapAsMap: s, maxAliasCount: o, onAnchor: l, reviver: c } = {}) {
		const u = {
				anchors: new Map(),
				doc: this,
				keep: !e,
				mapAsMap: s === !0,
				mapKeyWarned: !1,
				maxAliasCount: typeof o == 'number' ? o : 100,
			},
			d = Ut(this.contents, n ?? '', u);
		if (typeof l == 'function') for (const { count: p, res: g } of u.anchors.values()) l(g, p);
		return typeof c == 'function' ? ws(c, { '': d }, '', d) : d;
	}
	toJSON(e, n) {
		return this.toJS({ json: !0, jsonArg: e, mapAsMap: !1, onAnchor: n });
	}
	toString(e = {}) {
		if (this.errors.length > 0) throw new Error('Document with errors cannot be stringified');
		if ('indent' in e && (!Number.isInteger(e.indent) || Number(e.indent) <= 0)) {
			const n = JSON.stringify(e.indent);
			throw new Error(`"indent" option must be a positive integer, not ${n}`);
		}
		return CE(this, e);
	}
}
function us(t) {
	if ($e(t)) return !0;
	throw new Error('Expected a YAML collection as document contents');
}
class $f extends Error {
	constructor(e, n, s, o) {
		super(), (this.name = e), (this.code = s), (this.message = o), (this.pos = n);
	}
}
class kr extends $f {
	constructor(e, n, s) {
		super('YAMLParseError', e, n, s);
	}
}
class Jy extends $f {
	constructor(e, n, s) {
		super('YAMLWarning', e, n, s);
	}
}
const Vl = (t, e) => (n) => {
	if (n.pos[0] === -1) return;
	n.linePos = n.pos.map((u) => e.linePos(u));
	const { line: s, col: o } = n.linePos[0];
	n.message += ` at line ${s}, column ${o}`;
	let l = o - 1,
		c = t.substring(e.lineStarts[s - 1], e.lineStarts[s]).replace(/[\n\r]+$/, '');
	if (l >= 60 && c.length > 80) {
		const u = Math.min(l - 39, c.length - 79);
		(c = '…' + c.substring(u)), (l -= u - 1);
	}
	if ((c.length > 80 && (c = c.substring(0, 79) + '…'), s > 1 && /^ *$/.test(c.substring(0, l)))) {
		let u = t.substring(e.lineStarts[s - 2], e.lineStarts[s - 1]);
		u.length > 80 &&
			(u =
				u.substring(0, 79) +
				`…
`),
			(c = u + c);
	}
	if (/[^ ]/.test(c)) {
		let u = 1;
		const d = n.linePos[1];
		d && d.line === s && d.col > o && (u = Math.max(1, Math.min(d.col - o, 80 - l)));
		const p = ' '.repeat(l) + '^'.repeat(u);
		n.message += `:

${c}
${p}
`;
	}
};
function Ts(
	t,
	{ flow: e, indicator: n, next: s, offset: o, onError: l, parentIndent: c, startOnNewline: u },
) {
	let d = !1,
		p = u,
		g = u,
		y = '',
		v = '',
		S = !1,
		k = !1,
		_ = null,
		E = null,
		C = null,
		A = null,
		O = null,
		D = null,
		F = null;
	for (const B of t)
		switch (
			(k &&
				(B.type !== 'space' &&
					B.type !== 'newline' &&
					B.type !== 'comma' &&
					l(
						B.offset,
						'MISSING_CHAR',
						'Tags and anchors must be separated from the next token by white space',
					),
				(k = !1)),
			_ &&
				(p &&
					B.type !== 'comment' &&
					B.type !== 'newline' &&
					l(_, 'TAB_AS_INDENT', 'Tabs are not allowed as indentation'),
				(_ = null)),
			B.type)
		) {
			case 'space':
				!e &&
					(n !== 'doc-start' || (s == null ? void 0 : s.type) !== 'flow-collection') &&
					B.source.includes('	') &&
					(_ = B),
					(g = !0);
				break;
			case 'comment': {
				g ||
					l(
						B,
						'MISSING_CHAR',
						'Comments must be separated from other tokens by white space characters',
					);
				const M = B.source.substring(1) || ' ';
				y ? (y += v + M) : (y = M), (v = ''), (p = !1);
				break;
			}
			case 'newline':
				p ? (y ? (y += B.source) : (d = !0)) : (v += B.source),
					(p = !0),
					(S = !0),
					(E || C) && (A = B),
					(g = !0);
				break;
			case 'anchor':
				E && l(B, 'MULTIPLE_ANCHORS', 'A node can have at most one anchor'),
					B.source.endsWith(':') &&
						l(B.offset + B.source.length - 1, 'BAD_ALIAS', 'Anchor ending in : is ambiguous', !0),
					(E = B),
					F === null && (F = B.offset),
					(p = !1),
					(g = !1),
					(k = !0);
				break;
			case 'tag': {
				C && l(B, 'MULTIPLE_TAGS', 'A node can have at most one tag'),
					(C = B),
					F === null && (F = B.offset),
					(p = !1),
					(g = !1),
					(k = !0);
				break;
			}
			case n:
				(E || C) &&
					l(B, 'BAD_PROP_ORDER', `Anchors and tags must be after the ${B.source} indicator`),
					D && l(B, 'UNEXPECTED_TOKEN', `Unexpected ${B.source} in ${e ?? 'collection'}`),
					(D = B),
					(p = n === 'seq-item-ind' || n === 'explicit-key-ind'),
					(g = !1);
				break;
			case 'comma':
				if (e) {
					O && l(B, 'UNEXPECTED_TOKEN', `Unexpected , in ${e}`), (O = B), (p = !1), (g = !1);
					break;
				}
			default:
				l(B, 'UNEXPECTED_TOKEN', `Unexpected ${B.type} token`), (p = !1), (g = !1);
		}
	const z = t[t.length - 1],
		q = z ? z.offset + z.source.length : o;
	return (
		k &&
			s &&
			s.type !== 'space' &&
			s.type !== 'newline' &&
			s.type !== 'comma' &&
			(s.type !== 'scalar' || s.source !== '') &&
			l(
				s.offset,
				'MISSING_CHAR',
				'Tags and anchors must be separated from the next token by white space',
			),
		_ &&
			((p && _.indent <= c) ||
				(s == null ? void 0 : s.type) === 'block-map' ||
				(s == null ? void 0 : s.type) === 'block-seq') &&
			l(_, 'TAB_AS_INDENT', 'Tabs are not allowed as indentation'),
		{
			comma: O,
			found: D,
			spaceBefore: d,
			comment: y,
			hasNewline: S,
			anchor: E,
			tag: C,
			newlineAfterProp: A,
			end: q,
			start: F ?? q,
		}
	);
}
function Hi(t) {
	if (!t) return null;
	switch (t.type) {
		case 'alias':
		case 'scalar':
		case 'double-quoted-scalar':
		case 'single-quoted-scalar':
			if (
				t.source.includes(`
`)
			)
				return !0;
			if (t.end) {
				for (const e of t.end) if (e.type === 'newline') return !0;
			}
			return !1;
		case 'flow-collection':
			for (const e of t.items) {
				for (const n of e.start) if (n.type === 'newline') return !0;
				if (e.sep) {
					for (const n of e.sep) if (n.type === 'newline') return !0;
				}
				if (Hi(e.key) || Hi(e.value)) return !0;
			}
			return !1;
		default:
			return !0;
	}
}
function Uu(t, e, n) {
	if ((e == null ? void 0 : e.type) === 'flow-collection') {
		const s = e.end[0];
		s.indent === t &&
			(s.source === ']' || s.source === '}') &&
			Hi(e) &&
			n(s, 'BAD_INDENT', 'Flow end indicator should be more indented than parent', !0);
	}
}
function Xy(t, e, n) {
	const { uniqueKeys: s } = t.options;
	if (s === !1) return !1;
	const o =
		typeof s == 'function' ? s : (l, c) => l === c || (ke(l) && ke(c) && l.value === c.value);
	return e.some((l) => o(l.key, n));
}
const Cm = 'All mapping items must start at the same column';
function NE({ composeNode: t, composeEmptyNode: e }, n, s, o, l) {
	var g;
	const c = (l == null ? void 0 : l.nodeClass) ?? Lt,
		u = new c(n.schema);
	n.atRoot && (n.atRoot = !1);
	let d = s.offset,
		p = null;
	for (const y of s.items) {
		const { start: v, key: S, sep: k, value: _ } = y,
			E = Ts(v, {
				indicator: 'explicit-key-ind',
				next: S ?? (k == null ? void 0 : k[0]),
				offset: d,
				onError: o,
				parentIndent: s.indent,
				startOnNewline: !0,
			}),
			C = !E.found;
		if (C) {
			if (
				(S &&
					(S.type === 'block-seq'
						? o(
								d,
								'BLOCK_AS_IMPLICIT_KEY',
								'A block sequence may not be used as an implicit map key',
							)
						: 'indent' in S && S.indent !== s.indent && o(d, 'BAD_INDENT', Cm)),
				!E.anchor && !E.tag && !k)
			) {
				(p = E.end),
					E.comment &&
						(u.comment
							? (u.comment +=
									`
` + E.comment)
							: (u.comment = E.comment));
				continue;
			}
			(E.newlineAfterProp || Hi(S)) &&
				o(
					S ?? v[v.length - 1],
					'MULTILINE_IMPLICIT_KEY',
					'Implicit keys need to be on a single line',
				);
		} else ((g = E.found) == null ? void 0 : g.indent) !== s.indent && o(d, 'BAD_INDENT', Cm);
		n.atKey = !0;
		const A = E.end,
			O = S ? t(n, S, E, o) : e(n, A, v, null, E, o);
		n.schema.compat && Uu(s.indent, S, o),
			(n.atKey = !1),
			Xy(n, u.items, O) && o(A, 'DUPLICATE_KEY', 'Map keys must be unique');
		const D = Ts(k ?? [], {
			indicator: 'map-value-ind',
			next: _,
			offset: O.range[2],
			onError: o,
			parentIndent: s.indent,
			startOnNewline: !S || S.type === 'block-scalar',
		});
		if (((d = D.end), D.found)) {
			C &&
				((_ == null ? void 0 : _.type) === 'block-map' &&
					!D.hasNewline &&
					o(d, 'BLOCK_AS_IMPLICIT_KEY', 'Nested mappings are not allowed in compact mappings'),
				n.options.strict &&
					E.start < D.found.offset - 1024 &&
					o(
						O.range,
						'KEY_OVER_1024_CHARS',
						'The : indicator must be at most 1024 chars after the start of an implicit block mapping key',
					));
			const F = _ ? t(n, _, D, o) : e(n, d, k, null, D, o);
			n.schema.compat && Uu(s.indent, _, o), (d = F.range[2]);
			const z = new at(O, F);
			n.options.keepSourceTokens && (z.srcToken = y), u.items.push(z);
		} else {
			C && o(O.range, 'MISSING_CHAR', 'Implicit map keys need to be followed by map values'),
				D.comment &&
					(O.comment
						? (O.comment +=
								`
` + D.comment)
						: (O.comment = D.comment));
			const F = new at(O);
			n.options.keepSourceTokens && (F.srcToken = y), u.items.push(F);
		}
	}
	return (
		p && p < d && o(p, 'IMPOSSIBLE', 'Map comment with trailing content'),
		(u.range = [s.offset, d, p ?? d]),
		u
	);
}
function AE({ composeNode: t, composeEmptyNode: e }, n, s, o, l) {
	const c = (l == null ? void 0 : l.nodeClass) ?? rr,
		u = new c(n.schema);
	n.atRoot && (n.atRoot = !1), n.atKey && (n.atKey = !1);
	let d = s.offset,
		p = null;
	for (const { start: g, value: y } of s.items) {
		const v = Ts(g, {
			indicator: 'seq-item-ind',
			next: y,
			offset: d,
			onError: o,
			parentIndent: s.indent,
			startOnNewline: !0,
		});
		if (!v.found)
			if (v.anchor || v.tag || y)
				y && y.type === 'block-seq'
					? o(v.end, 'BAD_INDENT', 'All sequence items must start at the same column')
					: o(d, 'MISSING_CHAR', 'Sequence item without - indicator');
			else {
				(p = v.end), v.comment && (u.comment = v.comment);
				continue;
			}
		const S = y ? t(n, y, v, o) : e(n, v.end, g, null, v, o);
		n.schema.compat && Uu(s.indent, y, o), (d = S.range[2]), u.items.push(S);
	}
	return (u.range = [s.offset, d, p ?? d]), u;
}
function Gi(t, e, n, s) {
	let o = '';
	if (t) {
		let l = !1,
			c = '';
		for (const u of t) {
			const { source: d, type: p } = u;
			switch (p) {
				case 'space':
					l = !0;
					break;
				case 'comment': {
					n &&
						!l &&
						s(
							u,
							'MISSING_CHAR',
							'Comments must be separated from other tokens by white space characters',
						);
					const g = d.substring(1) || ' ';
					o ? (o += c + g) : (o = g), (c = '');
					break;
				}
				case 'newline':
					o && (c += d), (l = !0);
					break;
				default:
					s(u, 'UNEXPECTED_TOKEN', `Unexpected ${p} at node end`);
			}
			e += d.length;
		}
	}
	return { comment: o, offset: e };
}
const Eu = 'Block collections are not allowed within flow collections',
	ku = (t) => t && (t.type === 'block-map' || t.type === 'block-seq');
function IE({ composeNode: t, composeEmptyNode: e }, n, s, o, l) {
	const c = s.start.source === '{',
		u = c ? 'flow map' : 'flow sequence',
		d = (l == null ? void 0 : l.nodeClass) ?? (c ? Lt : rr),
		p = new d(n.schema);
	p.flow = !0;
	const g = n.atRoot;
	g && (n.atRoot = !1), n.atKey && (n.atKey = !1);
	let y = s.offset + s.start.source.length;
	for (let E = 0; E < s.items.length; ++E) {
		const C = s.items[E],
			{ start: A, key: O, sep: D, value: F } = C,
			z = Ts(A, {
				flow: u,
				indicator: 'explicit-key-ind',
				next: O ?? (D == null ? void 0 : D[0]),
				offset: y,
				onError: o,
				parentIndent: s.indent,
				startOnNewline: !1,
			});
		if (!z.found) {
			if (!z.anchor && !z.tag && !D && !F) {
				E === 0 && z.comma
					? o(z.comma, 'UNEXPECTED_TOKEN', `Unexpected , in ${u}`)
					: E < s.items.length - 1 &&
						o(z.start, 'UNEXPECTED_TOKEN', `Unexpected empty item in ${u}`),
					z.comment &&
						(p.comment
							? (p.comment +=
									`
` + z.comment)
							: (p.comment = z.comment)),
					(y = z.end);
				continue;
			}
			!c &&
				n.options.strict &&
				Hi(O) &&
				o(
					O,
					'MULTILINE_IMPLICIT_KEY',
					'Implicit keys of flow sequence pairs need to be on a single line',
				);
		}
		if (E === 0) z.comma && o(z.comma, 'UNEXPECTED_TOKEN', `Unexpected , in ${u}`);
		else if ((z.comma || o(z.start, 'MISSING_CHAR', `Missing , between ${u} items`), z.comment)) {
			let q = '';
			e: for (const B of A)
				switch (B.type) {
					case 'comma':
					case 'space':
						break;
					case 'comment':
						q = B.source.substring(1);
						break e;
					default:
						break e;
				}
			if (q) {
				let B = p.items[p.items.length - 1];
				Me(B) && (B = B.value ?? B.key),
					B.comment
						? (B.comment +=
								`
` + q)
						: (B.comment = q),
					(z.comment = z.comment.substring(q.length + 1));
			}
		}
		if (!c && !D && !z.found) {
			const q = F ? t(n, F, z, o) : e(n, z.end, D, null, z, o);
			p.items.push(q), (y = q.range[2]), ku(F) && o(q.range, 'BLOCK_IN_FLOW', Eu);
		} else {
			n.atKey = !0;
			const q = z.end,
				B = O ? t(n, O, z, o) : e(n, q, A, null, z, o);
			ku(O) && o(B.range, 'BLOCK_IN_FLOW', Eu), (n.atKey = !1);
			const M = Ts(D ?? [], {
				flow: u,
				indicator: 'map-value-ind',
				next: F,
				offset: B.range[2],
				onError: o,
				parentIndent: s.indent,
				startOnNewline: !1,
			});
			if (M.found) {
				if (!c && !z.found && n.options.strict) {
					if (D)
						for (const $ of D) {
							if ($ === M.found) break;
							if ($.type === 'newline') {
								o(
									$,
									'MULTILINE_IMPLICIT_KEY',
									'Implicit keys of flow sequence pairs need to be on a single line',
								);
								break;
							}
						}
					z.start < M.found.offset - 1024 &&
						o(
							M.found,
							'KEY_OVER_1024_CHARS',
							'The : indicator must be at most 1024 chars after the start of an implicit flow sequence key',
						);
				}
			} else
				F &&
					('source' in F && F.source && F.source[0] === ':'
						? o(F, 'MISSING_CHAR', `Missing space after : in ${u}`)
						: o(M.start, 'MISSING_CHAR', `Missing , or : between ${u} items`));
			const G = F ? t(n, F, M, o) : M.found ? e(n, M.end, D, null, M, o) : null;
			G
				? ku(F) && o(G.range, 'BLOCK_IN_FLOW', Eu)
				: M.comment &&
					(B.comment
						? (B.comment +=
								`
` + M.comment)
						: (B.comment = M.comment));
			const K = new at(B, G);
			if ((n.options.keepSourceTokens && (K.srcToken = C), c)) {
				const $ = p;
				Xy(n, $.items, B) && o(q, 'DUPLICATE_KEY', 'Map keys must be unique'), $.items.push(K);
			} else {
				const $ = new Lt(n.schema);
				($.flow = !0), $.items.push(K);
				const X = (G ?? B).range;
				($.range = [B.range[0], X[1], X[2]]), p.items.push($);
			}
			y = G ? G.range[2] : M.end;
		}
	}
	const v = c ? '}' : ']',
		[S, ...k] = s.end;
	let _ = y;
	if (S && S.source === v) _ = S.offset + S.source.length;
	else {
		const E = u[0].toUpperCase() + u.substring(1),
			C = g
				? `${E} must end with a ${v}`
				: `${E} in block collection must be sufficiently indented and end with a ${v}`;
		o(y, g ? 'MISSING_CHAR' : 'BAD_INDENT', C), S && S.source.length !== 1 && k.unshift(S);
	}
	if (k.length > 0) {
		const E = Gi(k, _, n.options.strict, o);
		E.comment &&
			(p.comment
				? (p.comment +=
						`
` + E.comment)
				: (p.comment = E.comment)),
			(p.range = [s.offset, _, E.offset]);
	} else p.range = [s.offset, _, _];
	return p;
}
function bu(t, e, n, s, o, l) {
	const c =
			n.type === 'block-map'
				? NE(t, e, n, s, l)
				: n.type === 'block-seq'
					? AE(t, e, n, s, l)
					: IE(t, e, n, s, l),
		u = c.constructor;
	return o === '!' || o === u.tagName ? ((c.tag = u.tagName), c) : (o && (c.tag = o), c);
}
function LE(t, e, n, s, o) {
	var v;
	const l = s.tag,
		c = l ? e.directives.tagName(l.source, (S) => o(l, 'TAG_RESOLVE_FAILED', S)) : null;
	if (n.type === 'block-seq') {
		const { anchor: S, newlineAfterProp: k } = s,
			_ = S && l ? (S.offset > l.offset ? S : l) : (S ?? l);
		_ &&
			(!k || k.offset < _.offset) &&
			o(_, 'MISSING_CHAR', 'Missing newline after block sequence props');
	}
	const u =
		n.type === 'block-map'
			? 'map'
			: n.type === 'block-seq'
				? 'seq'
				: n.start.source === '{'
					? 'map'
					: 'seq';
	if (
		!l ||
		!c ||
		c === '!' ||
		(c === Lt.tagName && u === 'map') ||
		(c === rr.tagName && u === 'seq')
	)
		return bu(t, e, n, o, c);
	let d = e.schema.tags.find((S) => S.tag === c && S.collection === u);
	if (!d) {
		const S = e.schema.knownTags[c];
		if (S && S.collection === u) e.schema.tags.push(Object.assign({}, S, { default: !1 })), (d = S);
		else
			return (
				S != null && S.collection
					? o(
							l,
							'BAD_COLLECTION_TYPE',
							`${S.tag} used for ${u} collection, but expects ${S.collection}`,
							!0,
						)
					: o(l, 'TAG_RESOLVE_FAILED', `Unresolved tag: ${c}`, !0),
				bu(t, e, n, o, c)
			);
	}
	const p = bu(t, e, n, o, c, d),
		g =
			((v = d.resolve) == null
				? void 0
				: v.call(d, p, (S) => o(l, 'TAG_RESOLVE_FAILED', S), e.options)) ?? p,
		y = Re(g) ? g : new ue(g);
	return (y.range = p.range), (y.tag = c), d != null && d.format && (y.format = d.format), y;
}
function Yy(t, e, n) {
	const s = e.offset,
		o = ME(e, t.options.strict, n);
	if (!o) return { value: '', type: null, comment: '', range: [s, s, s] };
	const l = o.mode === '>' ? ue.BLOCK_FOLDED : ue.BLOCK_LITERAL,
		c = e.source ? jE(e.source) : [];
	let u = c.length;
	for (let _ = c.length - 1; _ >= 0; --_) {
		const E = c[_][1];
		if (E === '' || E === '\r') u = _;
		else break;
	}
	if (u === 0) {
		const _ =
			o.chomp === '+' && c.length > 0
				? `
`.repeat(Math.max(1, c.length - 1))
				: '';
		let E = s + o.length;
		return (
			e.source && (E += e.source.length),
			{ value: _, type: l, comment: o.comment, range: [s, E, E] }
		);
	}
	let d = e.indent + o.indent,
		p = e.offset + o.length,
		g = 0;
	for (let _ = 0; _ < u; ++_) {
		const [E, C] = c[_];
		if (C === '' || C === '\r') o.indent === 0 && E.length > d && (d = E.length);
		else {
			E.length < d &&
				n(
					p + E.length,
					'MISSING_CHAR',
					'Block scalars with more-indented leading empty lines must use an explicit indentation indicator',
				),
				o.indent === 0 && (d = E.length),
				(g = _),
				d === 0 &&
					!t.atRoot &&
					n(p, 'BAD_INDENT', 'Block scalar values in collections must be indented');
			break;
		}
		p += E.length + C.length + 1;
	}
	for (let _ = c.length - 1; _ >= u; --_) c[_][0].length > d && (u = _ + 1);
	let y = '',
		v = '',
		S = !1;
	for (let _ = 0; _ < g; ++_)
		y +=
			c[_][0].slice(d) +
			`
`;
	for (let _ = g; _ < u; ++_) {
		let [E, C] = c[_];
		p += E.length + C.length + 1;
		const A = C[C.length - 1] === '\r';
		if ((A && (C = C.slice(0, -1)), C && E.length < d)) {
			const D = `Block scalar lines must not be less indented than their ${o.indent ? 'explicit indentation indicator' : 'first line'}`;
			n(p - C.length - (A ? 2 : 1), 'BAD_INDENT', D), (E = '');
		}
		l === ue.BLOCK_LITERAL
			? ((y += v + E.slice(d) + C),
				(v = `
`))
			: E.length > d || C[0] === '	'
				? (v === ' '
						? (v = `
`)
						: !S &&
							v ===
								`
` &&
							(v = `

`),
					(y += v + E.slice(d) + C),
					(v = `
`),
					(S = !0))
				: C === ''
					? v ===
						`
`
						? (y += `
`)
						: (v = `
`)
					: ((y += v + C), (v = ' '), (S = !1));
	}
	switch (o.chomp) {
		case '-':
			break;
		case '+':
			for (let _ = u; _ < c.length; ++_)
				y +=
					`
` + c[_][0].slice(d);
			y[y.length - 1] !==
				`
` &&
				(y += `
`);
			break;
		default:
			y += `
`;
	}
	const k = s + o.length + e.source.length;
	return { value: y, type: l, comment: o.comment, range: [s, k, k] };
}
function ME({ offset: t, props: e }, n, s) {
	if (e[0].type !== 'block-scalar-header')
		return s(e[0], 'IMPOSSIBLE', 'Block scalar header not found'), null;
	const { source: o } = e[0],
		l = o[0];
	let c = 0,
		u = '',
		d = -1;
	for (let v = 1; v < o.length; ++v) {
		const S = o[v];
		if (!u && (S === '-' || S === '+')) u = S;
		else {
			const k = Number(S);
			!c && k ? (c = k) : d === -1 && (d = t + v);
		}
	}
	d !== -1 && s(d, 'UNEXPECTED_TOKEN', `Block scalar header includes extra characters: ${o}`);
	let p = !1,
		g = '',
		y = o.length;
	for (let v = 1; v < e.length; ++v) {
		const S = e[v];
		switch (S.type) {
			case 'space':
				p = !0;
			case 'newline':
				y += S.source.length;
				break;
			case 'comment':
				n &&
					!p &&
					s(
						S,
						'MISSING_CHAR',
						'Comments must be separated from other tokens by white space characters',
					),
					(y += S.source.length),
					(g = S.source.substring(1));
				break;
			case 'error':
				s(S, 'UNEXPECTED_TOKEN', S.message), (y += S.source.length);
				break;
			default: {
				const k = `Unexpected token in block scalar header: ${S.type}`;
				s(S, 'UNEXPECTED_TOKEN', k);
				const _ = S.source;
				_ && typeof _ == 'string' && (y += _.length);
			}
		}
	}
	return { mode: l, indent: c, chomp: u, comment: g, length: y };
}
function jE(t) {
	const e = t.split(/\n( *)/),
		n = e[0],
		s = n.match(/^( *)/),
		l = [s != null && s[1] ? [s[1], n.slice(s[1].length)] : ['', n]];
	for (let c = 1; c < e.length; c += 2) l.push([e[c], e[c + 1]]);
	return l;
}
function Zy(t, e, n) {
	const { offset: s, type: o, source: l, end: c } = t;
	let u, d;
	const p = (v, S, k) => n(s + v, S, k);
	switch (o) {
		case 'scalar':
			(u = ue.PLAIN), (d = PE(l, p));
			break;
		case 'single-quoted-scalar':
			(u = ue.QUOTE_SINGLE), (d = OE(l, p));
			break;
		case 'double-quoted-scalar':
			(u = ue.QUOTE_DOUBLE), (d = $E(l, p));
			break;
		default:
			return (
				n(t, 'UNEXPECTED_TOKEN', `Expected a flow scalar value, but found: ${o}`),
				{ value: '', type: null, comment: '', range: [s, s + l.length, s + l.length] }
			);
	}
	const g = s + l.length,
		y = Gi(c, g, e, n);
	return { value: d, type: u, comment: y.comment, range: [s, g, y.offset] };
}
function PE(t, e) {
	let n = '';
	switch (t[0]) {
		case '	':
			n = 'a tab character';
			break;
		case ',':
			n = 'flow indicator character ,';
			break;
		case '%':
			n = 'directive indicator character %';
			break;
		case '|':
		case '>': {
			n = `block scalar indicator ${t[0]}`;
			break;
		}
		case '@':
		case '`': {
			n = `reserved character ${t[0]}`;
			break;
		}
	}
	return n && e(0, 'BAD_SCALAR_START', `Plain value cannot start with ${n}`), ev(t);
}
function OE(t, e) {
	return (
		(t[t.length - 1] !== "'" || t.length === 1) &&
			e(t.length, 'MISSING_CHAR', "Missing closing 'quote"),
		ev(t.slice(1, -1)).replace(/''/g, "'")
	);
}
function ev(t) {
	let e, n;
	try {
		(e = new RegExp(
			`(.*?)(?<![ 	])[ 	]*\r?
`,
			'sy',
		)),
			(n = new RegExp(
				`[ 	]*(.*?)(?:(?<![ 	])[ 	]*)?\r?
`,
				'sy',
			));
	} catch {
		(e = /(.*?)[ \t]*\r?\n/sy), (n = /[ \t]*(.*?)[ \t]*\r?\n/sy);
	}
	let s = e.exec(t);
	if (!s) return t;
	let o = s[1],
		l = ' ',
		c = e.lastIndex;
	for (n.lastIndex = c; (s = n.exec(t)); )
		s[1] === ''
			? l ===
				`
`
				? (o += l)
				: (l = `
`)
			: ((o += l + s[1]), (l = ' ')),
			(c = n.lastIndex);
	const u = /[ \t]*(.*)/sy;
	return (u.lastIndex = c), (s = u.exec(t)), o + l + ((s == null ? void 0 : s[1]) ?? '');
}
function $E(t, e) {
	let n = '';
	for (let s = 1; s < t.length - 1; ++s) {
		const o = t[s];
		if (
			!(
				o === '\r' &&
				t[s + 1] ===
					`
`
			)
		)
			if (
				o ===
				`
`
			) {
				const { fold: l, offset: c } = RE(t, s);
				(n += l), (s = c);
			} else if (o === '\\') {
				let l = t[++s];
				const c = DE[l];
				if (c) n += c;
				else if (
					l ===
					`
`
				)
					for (l = t[s + 1]; l === ' ' || l === '	'; ) l = t[++s + 1];
				else if (
					l === '\r' &&
					t[s + 1] ===
						`
`
				)
					for (l = t[++s + 1]; l === ' ' || l === '	'; ) l = t[++s + 1];
				else if (l === 'x' || l === 'u' || l === 'U') {
					const u = { x: 2, u: 4, U: 8 }[l];
					(n += FE(t, s + 1, u, e)), (s += u);
				} else {
					const u = t.substr(s - 1, 2);
					e(s - 1, 'BAD_DQ_ESCAPE', `Invalid escape sequence ${u}`), (n += u);
				}
			} else if (o === ' ' || o === '	') {
				const l = s;
				let c = t[s + 1];
				for (; c === ' ' || c === '	'; ) c = t[++s + 1];
				c !==
					`
` &&
					!(
						c === '\r' &&
						t[s + 2] ===
							`
`
					) &&
					(n += s > l ? t.slice(l, s + 1) : o);
			} else n += o;
	}
	return (
		(t[t.length - 1] !== '"' || t.length === 1) &&
			e(t.length, 'MISSING_CHAR', 'Missing closing "quote'),
		n
	);
}
function RE(t, e) {
	let n = '',
		s = t[e + 1];
	for (
		;
		(s === ' ' ||
			s === '	' ||
			s ===
				`
` ||
			s === '\r') &&
		!(
			s === '\r' &&
			t[e + 2] !==
				`
`
		);
	)
		s ===
			`
` &&
			(n += `
`),
			(e += 1),
			(s = t[e + 1]);
	return n || (n = ' '), { fold: n, offset: e };
}
const DE = {
	0: '\0',
	a: '\x07',
	b: '\b',
	e: '\x1B',
	f: '\f',
	n: `
`,
	r: '\r',
	t: '	',
	v: '\v',
	N: '',
	_: ' ',
	L: '\u2028',
	P: '\u2029',
	' ': ' ',
	'"': '"',
	'/': '/',
	'\\': '\\',
	'	': '	',
};
function FE(t, e, n, s) {
	const o = t.substr(e, n),
		c = o.length === n && /^[0-9a-fA-F]+$/.test(o) ? parseInt(o, 16) : NaN;
	if (isNaN(c)) {
		const u = t.substr(e - 2, n + 2);
		return s(e - 2, 'BAD_DQ_ESCAPE', `Invalid escape sequence ${u}`), u;
	}
	return String.fromCodePoint(c);
}
function tv(t, e, n, s) {
	const {
			value: o,
			type: l,
			comment: c,
			range: u,
		} = e.type === 'block-scalar' ? Yy(t, e, s) : Zy(e, t.options.strict, s),
		d = n ? t.directives.tagName(n.source, (y) => s(n, 'TAG_RESOLVE_FAILED', y)) : null;
	let p;
	t.options.stringKeys && t.atKey
		? (p = t.schema[dn])
		: d
			? (p = BE(t.schema, o, d, n, s))
			: e.type === 'scalar'
				? (p = zE(t, o, e, s))
				: (p = t.schema[dn]);
	let g;
	try {
		const y = p.resolve(o, (v) => s(n ?? e, 'TAG_RESOLVE_FAILED', v), t.options);
		g = ke(y) ? y : new ue(y);
	} catch (y) {
		const v = y instanceof Error ? y.message : String(y);
		s(n ?? e, 'TAG_RESOLVE_FAILED', v), (g = new ue(o));
	}
	return (
		(g.range = u),
		(g.source = o),
		l && (g.type = l),
		d && (g.tag = d),
		p.format && (g.format = p.format),
		c && (g.comment = c),
		g
	);
}
function BE(t, e, n, s, o) {
	var u;
	if (n === '!') return t[dn];
	const l = [];
	for (const d of t.tags)
		if (!d.collection && d.tag === n)
			if (d.default && d.test) l.push(d);
			else return d;
	for (const d of l) if ((u = d.test) != null && u.test(e)) return d;
	const c = t.knownTags[n];
	return c && !c.collection
		? (t.tags.push(Object.assign({}, c, { default: !1, test: void 0 })), c)
		: (o(s, 'TAG_RESOLVE_FAILED', `Unresolved tag: ${n}`, n !== 'tag:yaml.org,2002:str'), t[dn]);
}
function zE({ atKey: t, directives: e, schema: n }, s, o, l) {
	const c =
		n.tags.find((u) => {
			var d;
			return (
				(u.default === !0 || (t && u.default === 'key')) &&
				((d = u.test) == null ? void 0 : d.test(s))
			);
		}) || n[dn];
	if (n.compat) {
		const u =
			n.compat.find((d) => {
				var p;
				return d.default && ((p = d.test) == null ? void 0 : p.test(s));
			}) ?? n[dn];
		if (c.tag !== u.tag) {
			const d = e.tagString(c.tag),
				p = e.tagString(u.tag),
				g = `Value may be parsed as either ${d} or ${p}`;
			l(o, 'TAG_RESOLVE_FAILED', g, !0);
		}
	}
	return c;
}
function HE(t, e, n) {
	if (e) {
		n === null && (n = e.length);
		for (let s = n - 1; s >= 0; --s) {
			let o = e[s];
			switch (o.type) {
				case 'space':
				case 'comment':
				case 'newline':
					t -= o.source.length;
					continue;
			}
			for (o = e[++s]; (o == null ? void 0 : o.type) === 'space'; )
				(t += o.source.length), (o = e[++s]);
			break;
		}
	}
	return t;
}
const UE = { composeNode: nv, composeEmptyNode: Rf };
function nv(t, e, n, s) {
	const o = t.atKey,
		{ spaceBefore: l, comment: c, anchor: u, tag: d } = n;
	let p,
		g = !0;
	switch (e.type) {
		case 'alias':
			(p = qE(t, e, s)),
				(u || d) && s(e, 'ALIAS_PROPS', 'An alias node must not specify any properties');
			break;
		case 'scalar':
		case 'single-quoted-scalar':
		case 'double-quoted-scalar':
		case 'block-scalar':
			(p = tv(t, e, d, s)), u && (p.anchor = u.source.substring(1));
			break;
		case 'block-map':
		case 'block-seq':
		case 'flow-collection':
			(p = LE(UE, t, e, n, s)), u && (p.anchor = u.source.substring(1));
			break;
		default: {
			const y = e.type === 'error' ? e.message : `Unsupported token (type: ${e.type})`;
			s(e, 'UNEXPECTED_TOKEN', y), (p = Rf(t, e.offset, void 0, null, n, s)), (g = !1);
		}
	}
	return (
		u && p.anchor === '' && s(u, 'BAD_ALIAS', 'Anchor cannot be an empty string'),
		o &&
			t.options.stringKeys &&
			(!ke(p) || typeof p.value != 'string' || (p.tag && p.tag !== 'tag:yaml.org,2002:str')) &&
			s(d ?? e, 'NON_STRING_KEY', 'With stringKeys, all keys must be strings'),
		l && (p.spaceBefore = !0),
		c && (e.type === 'scalar' && e.source === '' ? (p.comment = c) : (p.commentBefore = c)),
		t.options.keepSourceTokens && g && (p.srcToken = e),
		p
	);
}
function Rf(t, e, n, s, { spaceBefore: o, comment: l, anchor: c, tag: u, end: d }, p) {
	const g = { type: 'scalar', offset: HE(e, n, s), indent: -1, source: '' },
		y = tv(t, g, u, p);
	return (
		c &&
			((y.anchor = c.source.substring(1)),
			y.anchor === '' && p(c, 'BAD_ALIAS', 'Anchor cannot be an empty string')),
		o && (y.spaceBefore = !0),
		l && ((y.comment = l), (y.range[2] = d)),
		y
	);
}
function qE({ options: t }, { offset: e, source: n, end: s }, o) {
	const l = new ea(n.substring(1));
	l.source === '' && o(e, 'BAD_ALIAS', 'Alias cannot be an empty string'),
		l.source.endsWith(':') &&
			o(e + n.length - 1, 'BAD_ALIAS', 'Alias ending in : is ambiguous', !0);
	const c = e + n.length,
		u = Gi(s, c, t.strict, o);
	return (l.range = [e, c, u.offset]), u.comment && (l.comment = u.comment), l;
}
function VE(t, e, { offset: n, start: s, value: o, end: l }, c) {
	const u = Object.assign({ _directives: e }, t),
		d = new $s(void 0, u),
		p = { atKey: !1, atRoot: !0, directives: d.directives, options: d.options, schema: d.schema },
		g = Ts(s, {
			indicator: 'doc-start',
			next: o ?? (l == null ? void 0 : l[0]),
			offset: n,
			onError: c,
			parentIndent: 0,
			startOnNewline: !0,
		});
	g.found &&
		((d.directives.docStart = !0),
		o &&
			(o.type === 'block-map' || o.type === 'block-seq') &&
			!g.hasNewline &&
			c(
				g.end,
				'MISSING_CHAR',
				'Block collection cannot start on same line with directives-end marker',
			)),
		(d.contents = o ? nv(p, o, g, c) : Rf(p, g.end, s, null, g, c));
	const y = d.contents.range[2],
		v = Gi(l, y, !1, c);
	return v.comment && (d.comment = v.comment), (d.range = [n, y, v.offset]), d;
}
function Ni(t) {
	if (typeof t == 'number') return [t, t + 1];
	if (Array.isArray(t)) return t.length === 2 ? t : [t[0], t[1]];
	const { offset: e, source: n } = t;
	return [e, e + (typeof n == 'string' ? n.length : 1)];
}
function Nm(t) {
	var o;
	let e = '',
		n = !1,
		s = !1;
	for (let l = 0; l < t.length; ++l) {
		const c = t[l];
		switch (c[0]) {
			case '#':
				(e +=
					(e === ''
						? ''
						: s
							? `

`
							: `
`) + (c.substring(1) || ' ')),
					(n = !0),
					(s = !1);
				break;
			case '%':
				((o = t[l + 1]) == null ? void 0 : o[0]) !== '#' && (l += 1), (n = !1);
				break;
			default:
				n || (s = !0), (n = !1);
		}
	}
	return { comment: e, afterEmptyLine: s };
}
class Df {
	constructor(e = {}) {
		(this.doc = null),
			(this.atDirectives = !1),
			(this.prelude = []),
			(this.errors = []),
			(this.warnings = []),
			(this.onError = (n, s, o, l) => {
				const c = Ni(n);
				l ? this.warnings.push(new Jy(c, s, o)) : this.errors.push(new kr(c, s, o));
			}),
			(this.directives = new dt({ version: e.version || '1.2' })),
			(this.options = e);
	}
	decorate(e, n) {
		const { comment: s, afterEmptyLine: o } = Nm(this.prelude);
		if (s) {
			const l = e.contents;
			if (n)
				e.comment = e.comment
					? `${e.comment}
${s}`
					: s;
			else if (o || e.directives.docStart || !l) e.commentBefore = s;
			else if ($e(l) && !l.flow && l.items.length > 0) {
				let c = l.items[0];
				Me(c) && (c = c.key);
				const u = c.commentBefore;
				c.commentBefore = u
					? `${s}
${u}`
					: s;
			} else {
				const c = l.commentBefore;
				l.commentBefore = c
					? `${s}
${c}`
					: s;
			}
		}
		n
			? (Array.prototype.push.apply(e.errors, this.errors),
				Array.prototype.push.apply(e.warnings, this.warnings))
			: ((e.errors = this.errors), (e.warnings = this.warnings)),
			(this.prelude = []),
			(this.errors = []),
			(this.warnings = []);
	}
	streamInfo() {
		return {
			comment: Nm(this.prelude).comment,
			directives: this.directives,
			errors: this.errors,
			warnings: this.warnings,
		};
	}
	*compose(e, n = !1, s = -1) {
		for (const o of e) yield* this.next(o);
		yield* this.end(n, s);
	}
	*next(e) {
		switch (e.type) {
			case 'directive':
				this.directives.add(e.source, (n, s, o) => {
					const l = Ni(e);
					(l[0] += n), this.onError(l, 'BAD_DIRECTIVE', s, o);
				}),
					this.prelude.push(e.source),
					(this.atDirectives = !0);
				break;
			case 'document': {
				const n = VE(this.options, this.directives, e, this.onError);
				this.atDirectives &&
					!n.directives.docStart &&
					this.onError(e, 'MISSING_CHAR', 'Missing directives-end/doc-start indicator line'),
					this.decorate(n, !1),
					this.doc && (yield this.doc),
					(this.doc = n),
					(this.atDirectives = !1);
				break;
			}
			case 'byte-order-mark':
			case 'space':
				break;
			case 'comment':
			case 'newline':
				this.prelude.push(e.source);
				break;
			case 'error': {
				const n = e.source ? `${e.message}: ${JSON.stringify(e.source)}` : e.message,
					s = new kr(Ni(e), 'UNEXPECTED_TOKEN', n);
				this.atDirectives || !this.doc ? this.errors.push(s) : this.doc.errors.push(s);
				break;
			}
			case 'doc-end': {
				if (!this.doc) {
					const s = 'Unexpected doc-end without preceding document';
					this.errors.push(new kr(Ni(e), 'UNEXPECTED_TOKEN', s));
					break;
				}
				this.doc.directives.docEnd = !0;
				const n = Gi(e.end, e.offset + e.source.length, this.doc.options.strict, this.onError);
				if ((this.decorate(this.doc, !0), n.comment)) {
					const s = this.doc.comment;
					this.doc.comment = s
						? `${s}
${n.comment}`
						: n.comment;
				}
				this.doc.range[2] = n.offset;
				break;
			}
			default:
				this.errors.push(new kr(Ni(e), 'UNEXPECTED_TOKEN', `Unsupported token ${e.type}`));
		}
	}
	*end(e = !1, n = -1) {
		if (this.doc) this.decorate(this.doc, !0), yield this.doc, (this.doc = null);
		else if (e) {
			const s = Object.assign({ _directives: this.directives }, this.options),
				o = new $s(void 0, s);
			this.atDirectives && this.onError(n, 'MISSING_CHAR', 'Missing directives-end indicator line'),
				(o.range = [0, n, n]),
				this.decorate(o, !1),
				yield o;
		}
	}
}
function WE(t, e = !0, n) {
	if (t) {
		const s = (o, l, c) => {
			const u = typeof o == 'number' ? o : Array.isArray(o) ? o[0] : o.offset;
			if (n) n(u, l, c);
			else throw new kr([u, u + 1], l, c);
		};
		switch (t.type) {
			case 'scalar':
			case 'single-quoted-scalar':
			case 'double-quoted-scalar':
				return Zy(t, e, s);
			case 'block-scalar':
				return Yy({ options: { strict: e } }, t, s);
		}
	}
	return null;
}
function KE(t, e) {
	const { implicitKey: n = !1, indent: s, inFlow: o = !1, offset: l = -1, type: c = 'PLAIN' } = e,
		u = Wi(
			{ type: c, value: t },
			{
				implicitKey: n,
				indent: s > 0 ? ' '.repeat(s) : '',
				inFlow: o,
				options: { blockQuote: !0, lineWidth: -1 },
			},
		),
		d = e.end ?? [
			{
				type: 'newline',
				offset: -1,
				indent: s,
				source: `
`,
			},
		];
	switch (u[0]) {
		case '|':
		case '>': {
			const p = u.indexOf(`
`),
				g = u.substring(0, p),
				y =
					u.substring(p + 1) +
					`
`,
				v = [{ type: 'block-scalar-header', offset: l, indent: s, source: g }];
			return (
				rv(v, d) ||
					v.push({
						type: 'newline',
						offset: -1,
						indent: s,
						source: `
`,
					}),
				{ type: 'block-scalar', offset: l, indent: s, props: v, source: y }
			);
		}
		case '"':
			return { type: 'double-quoted-scalar', offset: l, indent: s, source: u, end: d };
		case "'":
			return { type: 'single-quoted-scalar', offset: l, indent: s, source: u, end: d };
		default:
			return { type: 'scalar', offset: l, indent: s, source: u, end: d };
	}
}
function GE(t, e, n = {}) {
	let { afterKey: s = !1, implicitKey: o = !1, inFlow: l = !1, type: c } = n,
		u = 'indent' in t ? t.indent : null;
	if ((s && typeof u == 'number' && (u += 2), !c))
		switch (t.type) {
			case 'single-quoted-scalar':
				c = 'QUOTE_SINGLE';
				break;
			case 'double-quoted-scalar':
				c = 'QUOTE_DOUBLE';
				break;
			case 'block-scalar': {
				const p = t.props[0];
				if (p.type !== 'block-scalar-header') throw new Error('Invalid block scalar header');
				c = p.source[0] === '>' ? 'BLOCK_FOLDED' : 'BLOCK_LITERAL';
				break;
			}
			default:
				c = 'PLAIN';
		}
	const d = Wi(
		{ type: c, value: e },
		{
			implicitKey: o || u === null,
			indent: u !== null && u > 0 ? ' '.repeat(u) : '',
			inFlow: l,
			options: { blockQuote: !0, lineWidth: -1 },
		},
	);
	switch (d[0]) {
		case '|':
		case '>':
			QE(t, d);
			break;
		case '"':
			Tu(t, d, 'double-quoted-scalar');
			break;
		case "'":
			Tu(t, d, 'single-quoted-scalar');
			break;
		default:
			Tu(t, d, 'scalar');
	}
}
function QE(t, e) {
	const n = e.indexOf(`
`),
		s = e.substring(0, n),
		o =
			e.substring(n + 1) +
			`
`;
	if (t.type === 'block-scalar') {
		const l = t.props[0];
		if (l.type !== 'block-scalar-header') throw new Error('Invalid block scalar header');
		(l.source = s), (t.source = o);
	} else {
		const { offset: l } = t,
			c = 'indent' in t ? t.indent : -1,
			u = [{ type: 'block-scalar-header', offset: l, indent: c, source: s }];
		rv(u, 'end' in t ? t.end : void 0) ||
			u.push({
				type: 'newline',
				offset: -1,
				indent: c,
				source: `
`,
			});
		for (const d of Object.keys(t)) d !== 'type' && d !== 'offset' && delete t[d];
		Object.assign(t, { type: 'block-scalar', indent: c, props: u, source: o });
	}
}
function rv(t, e) {
	if (e)
		for (const n of e)
			switch (n.type) {
				case 'space':
				case 'comment':
					t.push(n);
					break;
				case 'newline':
					return t.push(n), !0;
			}
	return !1;
}
function Tu(t, e, n) {
	switch (t.type) {
		case 'scalar':
		case 'double-quoted-scalar':
		case 'single-quoted-scalar':
			(t.type = n), (t.source = e);
			break;
		case 'block-scalar': {
			const s = t.props.slice(1);
			let o = e.length;
			t.props[0].type === 'block-scalar-header' && (o -= t.props[0].source.length);
			for (const l of s) l.offset += o;
			delete t.props, Object.assign(t, { type: n, source: e, end: s });
			break;
		}
		case 'block-map':
		case 'block-seq': {
			const o = {
				type: 'newline',
				offset: t.offset + e.length,
				indent: t.indent,
				source: `
`,
			};
			delete t.items, Object.assign(t, { type: n, source: e, end: [o] });
			break;
		}
		default: {
			const s = 'indent' in t ? t.indent : -1,
				o =
					'end' in t && Array.isArray(t.end)
						? t.end.filter(
								(l) => l.type === 'space' || l.type === 'comment' || l.type === 'newline',
							)
						: [];
			for (const l of Object.keys(t)) l !== 'type' && l !== 'offset' && delete t[l];
			Object.assign(t, { type: n, indent: s, source: e, end: o });
		}
	}
}
const JE = (t) => ('type' in t ? Wl(t) : Ll(t));
function Wl(t) {
	switch (t.type) {
		case 'block-scalar': {
			let e = '';
			for (const n of t.props) e += Wl(n);
			return e + t.source;
		}
		case 'block-map':
		case 'block-seq': {
			let e = '';
			for (const n of t.items) e += Ll(n);
			return e;
		}
		case 'flow-collection': {
			let e = t.start.source;
			for (const n of t.items) e += Ll(n);
			for (const n of t.end) e += n.source;
			return e;
		}
		case 'document': {
			let e = Ll(t);
			if (t.end) for (const n of t.end) e += n.source;
			return e;
		}
		default: {
			let e = t.source;
			if ('end' in t && t.end) for (const n of t.end) e += n.source;
			return e;
		}
	}
}
function Ll({ start: t, key: e, sep: n, value: s }) {
	let o = '';
	for (const l of t) o += l.source;
	if ((e && (o += Wl(e)), n)) for (const l of n) o += l.source;
	return s && (o += Wl(s)), o;
}
const qu = Symbol('break visit'),
	XE = Symbol('skip children'),
	sv = Symbol('remove item');
function Cr(t, e) {
	'type' in t && t.type === 'document' && (t = { start: t.start, value: t.value }),
		iv(Object.freeze([]), t, e);
}
Cr.BREAK = qu;
Cr.SKIP = XE;
Cr.REMOVE = sv;
Cr.itemAtPath = (t, e) => {
	let n = t;
	for (const [s, o] of e) {
		const l = n == null ? void 0 : n[s];
		if (l && 'items' in l) n = l.items[o];
		else return;
	}
	return n;
};
Cr.parentCollection = (t, e) => {
	const n = Cr.itemAtPath(t, e.slice(0, -1)),
		s = e[e.length - 1][0],
		o = n == null ? void 0 : n[s];
	if (o && 'items' in o) return o;
	throw new Error('Parent collection not found');
};
function iv(t, e, n) {
	let s = n(e, t);
	if (typeof s == 'symbol') return s;
	for (const o of ['key', 'value']) {
		const l = e[o];
		if (l && 'items' in l) {
			for (let c = 0; c < l.items.length; ++c) {
				const u = iv(Object.freeze(t.concat([[o, c]])), l.items[c], n);
				if (typeof u == 'number') c = u - 1;
				else {
					if (u === qu) return qu;
					u === sv && (l.items.splice(c, 1), (c -= 1));
				}
			}
			typeof s == 'function' && o === 'key' && (s = s(e, t));
		}
	}
	return typeof s == 'function' ? s(e, t) : s;
}
const ua = '\uFEFF',
	fa = '',
	da = '',
	Ui = '',
	YE = (t) => !!t && 'items' in t,
	ZE = (t) =>
		!!t &&
		(t.type === 'scalar' ||
			t.type === 'single-quoted-scalar' ||
			t.type === 'double-quoted-scalar' ||
			t.type === 'block-scalar');
function ek(t) {
	switch (t) {
		case ua:
			return '<BOM>';
		case fa:
			return '<DOC>';
		case da:
			return '<FLOW_END>';
		case Ui:
			return '<SCALAR>';
		default:
			return JSON.stringify(t);
	}
}
function ov(t) {
	switch (t) {
		case ua:
			return 'byte-order-mark';
		case fa:
			return 'doc-mode';
		case da:
			return 'flow-error-end';
		case Ui:
			return 'scalar';
		case '---':
			return 'doc-start';
		case '...':
			return 'doc-end';
		case '':
		case `
`:
		case `\r
`:
			return 'newline';
		case '-':
			return 'seq-item-ind';
		case '?':
			return 'explicit-key-ind';
		case ':':
			return 'map-value-ind';
		case '{':
			return 'flow-map-start';
		case '}':
			return 'flow-map-end';
		case '[':
			return 'flow-seq-start';
		case ']':
			return 'flow-seq-end';
		case ',':
			return 'comma';
	}
	switch (t[0]) {
		case ' ':
		case '	':
			return 'space';
		case '#':
			return 'comment';
		case '%':
			return 'directive-line';
		case '*':
			return 'alias';
		case '&':
			return 'anchor';
		case '!':
			return 'tag';
		case "'":
			return 'single-quoted-scalar';
		case '"':
			return 'double-quoted-scalar';
		case '|':
		case '>':
			return 'block-scalar-header';
	}
	return null;
}
const tk = Object.freeze(
	Object.defineProperty(
		{
			__proto__: null,
			BOM: ua,
			DOCUMENT: fa,
			FLOW_END: da,
			SCALAR: Ui,
			createScalarToken: KE,
			isCollection: YE,
			isScalar: ZE,
			prettyToken: ek,
			resolveAsScalar: WE,
			setScalarValue: GE,
			stringify: JE,
			tokenType: ov,
			visit: Cr,
		},
		Symbol.toStringTag,
		{ value: 'Module' },
	),
);
function Zt(t) {
	switch (t) {
		case void 0:
		case ' ':
		case `
`:
		case '\r':
		case '	':
			return !0;
		default:
			return !1;
	}
}
const Am = new Set('0123456789ABCDEFabcdef'),
	nk = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()"),
	vl = new Set(',[]{}'),
	rk = new Set(` ,[]{}
\r	`),
	Cu = (t) => !t || rk.has(t);
class lv {
	constructor() {
		(this.atEnd = !1),
			(this.blockScalarIndent = -1),
			(this.blockScalarKeep = !1),
			(this.buffer = ''),
			(this.flowKey = !1),
			(this.flowLevel = 0),
			(this.indentNext = 0),
			(this.indentValue = 0),
			(this.lineEndPos = null),
			(this.next = null),
			(this.pos = 0);
	}
	*lex(e, n = !1) {
		if (e) {
			if (typeof e != 'string') throw TypeError('source is not a string');
			(this.buffer = this.buffer ? this.buffer + e : e), (this.lineEndPos = null);
		}
		this.atEnd = !n;
		let s = this.next ?? 'stream';
		for (; s && (n || this.hasChars(1)); ) s = yield* this.parseNext(s);
	}
	atLineEnd() {
		let e = this.pos,
			n = this.buffer[e];
		for (; n === ' ' || n === '	'; ) n = this.buffer[++e];
		return !n ||
			n === '#' ||
			n ===
				`
`
			? !0
			: n === '\r'
				? this.buffer[e + 1] ===
					`
`
				: !1;
	}
	charAt(e) {
		return this.buffer[this.pos + e];
	}
	continueScalar(e) {
		let n = this.buffer[e];
		if (this.indentNext > 0) {
			let s = 0;
			for (; n === ' '; ) n = this.buffer[++s + e];
			if (n === '\r') {
				const o = this.buffer[s + e + 1];
				if (
					o ===
						`
` ||
					(!o && !this.atEnd)
				)
					return e + s + 1;
			}
			return n ===
				`
` ||
				s >= this.indentNext ||
				(!n && !this.atEnd)
				? e + s
				: -1;
		}
		if (n === '-' || n === '.') {
			const s = this.buffer.substr(e, 3);
			if ((s === '---' || s === '...') && Zt(this.buffer[e + 3])) return -1;
		}
		return e;
	}
	getLine() {
		let e = this.lineEndPos;
		return (
			(typeof e != 'number' || (e !== -1 && e < this.pos)) &&
				((e = this.buffer.indexOf(
					`
`,
					this.pos,
				)),
				(this.lineEndPos = e)),
			e === -1
				? this.atEnd
					? this.buffer.substring(this.pos)
					: null
				: (this.buffer[e - 1] === '\r' && (e -= 1), this.buffer.substring(this.pos, e))
		);
	}
	hasChars(e) {
		return this.pos + e <= this.buffer.length;
	}
	setNext(e) {
		return (
			(this.buffer = this.buffer.substring(this.pos)),
			(this.pos = 0),
			(this.lineEndPos = null),
			(this.next = e),
			null
		);
	}
	peek(e) {
		return this.buffer.substr(this.pos, e);
	}
	*parseNext(e) {
		switch (e) {
			case 'stream':
				return yield* this.parseStream();
			case 'line-start':
				return yield* this.parseLineStart();
			case 'block-start':
				return yield* this.parseBlockStart();
			case 'doc':
				return yield* this.parseDocument();
			case 'flow':
				return yield* this.parseFlowCollection();
			case 'quoted-scalar':
				return yield* this.parseQuotedScalar();
			case 'block-scalar':
				return yield* this.parseBlockScalar();
			case 'plain-scalar':
				return yield* this.parsePlainScalar();
		}
	}
	*parseStream() {
		let e = this.getLine();
		if (e === null) return this.setNext('stream');
		if ((e[0] === ua && (yield* this.pushCount(1), (e = e.substring(1))), e[0] === '%')) {
			let n = e.length,
				s = e.indexOf('#');
			for (; s !== -1; ) {
				const l = e[s - 1];
				if (l === ' ' || l === '	') {
					n = s - 1;
					break;
				} else s = e.indexOf('#', s + 1);
			}
			for (;;) {
				const l = e[n - 1];
				if (l === ' ' || l === '	') n -= 1;
				else break;
			}
			const o = (yield* this.pushCount(n)) + (yield* this.pushSpaces(!0));
			return yield* this.pushCount(e.length - o), this.pushNewline(), 'stream';
		}
		if (this.atLineEnd()) {
			const n = yield* this.pushSpaces(!0);
			return yield* this.pushCount(e.length - n), yield* this.pushNewline(), 'stream';
		}
		return yield fa, yield* this.parseLineStart();
	}
	*parseLineStart() {
		const e = this.charAt(0);
		if (!e && !this.atEnd) return this.setNext('line-start');
		if (e === '-' || e === '.') {
			if (!this.atEnd && !this.hasChars(4)) return this.setNext('line-start');
			const n = this.peek(3);
			if ((n === '---' || n === '...') && Zt(this.charAt(3)))
				return (
					yield* this.pushCount(3),
					(this.indentValue = 0),
					(this.indentNext = 0),
					n === '---' ? 'doc' : 'stream'
				);
		}
		return (
			(this.indentValue = yield* this.pushSpaces(!1)),
			this.indentNext > this.indentValue &&
				!Zt(this.charAt(1)) &&
				(this.indentNext = this.indentValue),
			yield* this.parseBlockStart()
		);
	}
	*parseBlockStart() {
		const [e, n] = this.peek(2);
		if (!n && !this.atEnd) return this.setNext('block-start');
		if ((e === '-' || e === '?' || e === ':') && Zt(n)) {
			const s = (yield* this.pushCount(1)) + (yield* this.pushSpaces(!0));
			return (
				(this.indentNext = this.indentValue + 1),
				(this.indentValue += s),
				yield* this.parseBlockStart()
			);
		}
		return 'doc';
	}
	*parseDocument() {
		yield* this.pushSpaces(!0);
		const e = this.getLine();
		if (e === null) return this.setNext('doc');
		let n = yield* this.pushIndicators();
		switch (e[n]) {
			case '#':
				yield* this.pushCount(e.length - n);
			case void 0:
				return yield* this.pushNewline(), yield* this.parseLineStart();
			case '{':
			case '[':
				return yield* this.pushCount(1), (this.flowKey = !1), (this.flowLevel = 1), 'flow';
			case '}':
			case ']':
				return yield* this.pushCount(1), 'doc';
			case '*':
				return yield* this.pushUntil(Cu), 'doc';
			case '"':
			case "'":
				return yield* this.parseQuotedScalar();
			case '|':
			case '>':
				return (
					(n += yield* this.parseBlockScalarHeader()),
					(n += yield* this.pushSpaces(!0)),
					yield* this.pushCount(e.length - n),
					yield* this.pushNewline(),
					yield* this.parseBlockScalar()
				);
			default:
				return yield* this.parsePlainScalar();
		}
	}
	*parseFlowCollection() {
		let e,
			n,
			s = -1;
		do
			(e = yield* this.pushNewline()),
				e > 0 ? ((n = yield* this.pushSpaces(!1)), (this.indentValue = s = n)) : (n = 0),
				(n += yield* this.pushSpaces(!0));
		while (e + n > 0);
		const o = this.getLine();
		if (o === null) return this.setNext('flow');
		if (
			((s !== -1 && s < this.indentNext && o[0] !== '#') ||
				(s === 0 && (o.startsWith('---') || o.startsWith('...')) && Zt(o[3]))) &&
			!(s === this.indentNext - 1 && this.flowLevel === 1 && (o[0] === ']' || o[0] === '}'))
		)
			return (this.flowLevel = 0), yield da, yield* this.parseLineStart();
		let l = 0;
		for (; o[l] === ','; )
			(l += yield* this.pushCount(1)), (l += yield* this.pushSpaces(!0)), (this.flowKey = !1);
		switch (((l += yield* this.pushIndicators()), o[l])) {
			case void 0:
				return 'flow';
			case '#':
				return yield* this.pushCount(o.length - l), 'flow';
			case '{':
			case '[':
				return yield* this.pushCount(1), (this.flowKey = !1), (this.flowLevel += 1), 'flow';
			case '}':
			case ']':
				return (
					yield* this.pushCount(1),
					(this.flowKey = !0),
					(this.flowLevel -= 1),
					this.flowLevel ? 'flow' : 'doc'
				);
			case '*':
				return yield* this.pushUntil(Cu), 'flow';
			case '"':
			case "'":
				return (this.flowKey = !0), yield* this.parseQuotedScalar();
			case ':': {
				const c = this.charAt(1);
				if (this.flowKey || Zt(c) || c === ',')
					return (this.flowKey = !1), yield* this.pushCount(1), yield* this.pushSpaces(!0), 'flow';
			}
			default:
				return (this.flowKey = !1), yield* this.parsePlainScalar();
		}
	}
	*parseQuotedScalar() {
		const e = this.charAt(0);
		let n = this.buffer.indexOf(e, this.pos + 1);
		if (e === "'")
			for (; n !== -1 && this.buffer[n + 1] === "'"; ) n = this.buffer.indexOf("'", n + 2);
		else
			for (; n !== -1; ) {
				let l = 0;
				for (; this.buffer[n - 1 - l] === '\\'; ) l += 1;
				if (l % 2 === 0) break;
				n = this.buffer.indexOf('"', n + 1);
			}
		const s = this.buffer.substring(0, n);
		let o = s.indexOf(
			`
`,
			this.pos,
		);
		if (o !== -1) {
			for (; o !== -1; ) {
				const l = this.continueScalar(o + 1);
				if (l === -1) break;
				o = s.indexOf(
					`
`,
					l,
				);
			}
			o !== -1 && (n = o - (s[o - 1] === '\r' ? 2 : 1));
		}
		if (n === -1) {
			if (!this.atEnd) return this.setNext('quoted-scalar');
			n = this.buffer.length;
		}
		return yield* this.pushToIndex(n + 1, !1), this.flowLevel ? 'flow' : 'doc';
	}
	*parseBlockScalarHeader() {
		(this.blockScalarIndent = -1), (this.blockScalarKeep = !1);
		let e = this.pos;
		for (;;) {
			const n = this.buffer[++e];
			if (n === '+') this.blockScalarKeep = !0;
			else if (n > '0' && n <= '9') this.blockScalarIndent = Number(n) - 1;
			else if (n !== '-') break;
		}
		return yield* this.pushUntil((n) => Zt(n) || n === '#');
	}
	*parseBlockScalar() {
		let e = this.pos - 1,
			n = 0,
			s;
		e: for (let l = this.pos; (s = this.buffer[l]); ++l)
			switch (s) {
				case ' ':
					n += 1;
					break;
				case `
`:
					(e = l), (n = 0);
					break;
				case '\r': {
					const c = this.buffer[l + 1];
					if (!c && !this.atEnd) return this.setNext('block-scalar');
					if (
						c ===
						`
`
					)
						break;
				}
				default:
					break e;
			}
		if (!s && !this.atEnd) return this.setNext('block-scalar');
		if (n >= this.indentNext) {
			this.blockScalarIndent === -1
				? (this.indentNext = n)
				: (this.indentNext =
						this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext));
			do {
				const l = this.continueScalar(e + 1);
				if (l === -1) break;
				e = this.buffer.indexOf(
					`
`,
					l,
				);
			} while (e !== -1);
			if (e === -1) {
				if (!this.atEnd) return this.setNext('block-scalar');
				e = this.buffer.length;
			}
		}
		let o = e + 1;
		for (s = this.buffer[o]; s === ' '; ) s = this.buffer[++o];
		if (s === '	') {
			for (
				;
				s === '	' ||
				s === ' ' ||
				s === '\r' ||
				s ===
					`
`;
			)
				s = this.buffer[++o];
			e = o - 1;
		} else if (!this.blockScalarKeep)
			do {
				let l = e - 1,
					c = this.buffer[l];
				c === '\r' && (c = this.buffer[--l]);
				const u = l;
				for (; c === ' '; ) c = this.buffer[--l];
				if (
					c ===
						`
` &&
					l >= this.pos &&
					l + 1 + n > u
				)
					e = l;
				else break;
			} while (!0);
		return yield Ui, yield* this.pushToIndex(e + 1, !0), yield* this.parseLineStart();
	}
	*parsePlainScalar() {
		const e = this.flowLevel > 0;
		let n = this.pos - 1,
			s = this.pos - 1,
			o;
		for (; (o = this.buffer[++s]); )
			if (o === ':') {
				const l = this.buffer[s + 1];
				if (Zt(l) || (e && vl.has(l))) break;
				n = s;
			} else if (Zt(o)) {
				let l = this.buffer[s + 1];
				if (
					(o === '\r' &&
						(l ===
						`
`
							? ((s += 1),
								(o = `
`),
								(l = this.buffer[s + 1]))
							: (n = s)),
					l === '#' || (e && vl.has(l)))
				)
					break;
				if (
					o ===
					`
`
				) {
					const c = this.continueScalar(s + 1);
					if (c === -1) break;
					s = Math.max(s, c - 2);
				}
			} else {
				if (e && vl.has(o)) break;
				n = s;
			}
		return !o && !this.atEnd
			? this.setNext('plain-scalar')
			: (yield Ui, yield* this.pushToIndex(n + 1, !0), e ? 'flow' : 'doc');
	}
	*pushCount(e) {
		return e > 0 ? (yield this.buffer.substr(this.pos, e), (this.pos += e), e) : 0;
	}
	*pushToIndex(e, n) {
		const s = this.buffer.slice(this.pos, e);
		return s ? (yield s, (this.pos += s.length), s.length) : (n && (yield ''), 0);
	}
	*pushIndicators() {
		switch (this.charAt(0)) {
			case '!':
				return (
					(yield* this.pushTag()) + (yield* this.pushSpaces(!0)) + (yield* this.pushIndicators())
				);
			case '&':
				return (
					(yield* this.pushUntil(Cu)) +
					(yield* this.pushSpaces(!0)) +
					(yield* this.pushIndicators())
				);
			case '-':
			case '?':
			case ':': {
				const e = this.flowLevel > 0,
					n = this.charAt(1);
				if (Zt(n) || (e && vl.has(n)))
					return (
						e ? this.flowKey && (this.flowKey = !1) : (this.indentNext = this.indentValue + 1),
						(yield* this.pushCount(1)) +
							(yield* this.pushSpaces(!0)) +
							(yield* this.pushIndicators())
					);
			}
		}
		return 0;
	}
	*pushTag() {
		if (this.charAt(1) === '<') {
			let e = this.pos + 2,
				n = this.buffer[e];
			for (; !Zt(n) && n !== '>'; ) n = this.buffer[++e];
			return yield* this.pushToIndex(n === '>' ? e + 1 : e, !1);
		} else {
			let e = this.pos + 1,
				n = this.buffer[e];
			for (; n; )
				if (nk.has(n)) n = this.buffer[++e];
				else if (n === '%' && Am.has(this.buffer[e + 1]) && Am.has(this.buffer[e + 2]))
					n = this.buffer[(e += 3)];
				else break;
			return yield* this.pushToIndex(e, !1);
		}
	}
	*pushNewline() {
		const e = this.buffer[this.pos];
		return e ===
			`
`
			? yield* this.pushCount(1)
			: e === '\r' &&
					this.charAt(1) ===
						`
`
				? yield* this.pushCount(2)
				: 0;
	}
	*pushSpaces(e) {
		let n = this.pos - 1,
			s;
		do s = this.buffer[++n];
		while (s === ' ' || (e && s === '	'));
		const o = n - this.pos;
		return o > 0 && (yield this.buffer.substr(this.pos, o), (this.pos = n)), o;
	}
	*pushUntil(e) {
		let n = this.pos,
			s = this.buffer[n];
		for (; !e(s); ) s = this.buffer[++n];
		return yield* this.pushToIndex(n, !1);
	}
}
class av {
	constructor() {
		(this.lineStarts = []),
			(this.addNewLine = (e) => this.lineStarts.push(e)),
			(this.linePos = (e) => {
				let n = 0,
					s = this.lineStarts.length;
				for (; n < s; ) {
					const l = (n + s) >> 1;
					this.lineStarts[l] < e ? (n = l + 1) : (s = l);
				}
				if (this.lineStarts[n] === e) return { line: n + 1, col: 1 };
				if (n === 0) return { line: 0, col: e };
				const o = this.lineStarts[n - 1];
				return { line: n, col: e - o + 1 };
			});
	}
}
function xr(t, e) {
	for (let n = 0; n < t.length; ++n) if (t[n].type === e) return !0;
	return !1;
}
function Im(t) {
	for (let e = 0; e < t.length; ++e)
		switch (t[e].type) {
			case 'space':
			case 'comment':
			case 'newline':
				break;
			default:
				return e;
		}
	return -1;
}
function cv(t) {
	switch (t == null ? void 0 : t.type) {
		case 'alias':
		case 'scalar':
		case 'single-quoted-scalar':
		case 'double-quoted-scalar':
		case 'flow-collection':
			return !0;
		default:
			return !1;
	}
}
function wl(t) {
	switch (t.type) {
		case 'document':
			return t.start;
		case 'block-map': {
			const e = t.items[t.items.length - 1];
			return e.sep ?? e.start;
		}
		case 'block-seq':
			return t.items[t.items.length - 1].start;
		default:
			return [];
	}
}
function fs(t) {
	var n;
	if (t.length === 0) return [];
	let e = t.length;
	e: for (; --e >= 0; )
		switch (t[e].type) {
			case 'doc-start':
			case 'explicit-key-ind':
			case 'map-value-ind':
			case 'seq-item-ind':
			case 'newline':
				break e;
		}
	for (; ((n = t[++e]) == null ? void 0 : n.type) === 'space'; );
	return t.splice(e, t.length);
}
function Lm(t) {
	if (t.start.type === 'flow-seq-start')
		for (const e of t.items)
			e.sep &&
				!e.value &&
				!xr(e.start, 'explicit-key-ind') &&
				!xr(e.sep, 'map-value-ind') &&
				(e.key && (e.value = e.key),
				delete e.key,
				cv(e.value)
					? e.value.end
						? Array.prototype.push.apply(e.value.end, e.sep)
						: (e.value.end = e.sep)
					: Array.prototype.push.apply(e.start, e.sep),
				delete e.sep);
}
class Ff {
	constructor(e) {
		(this.atNewLine = !0),
			(this.atScalar = !1),
			(this.indent = 0),
			(this.offset = 0),
			(this.onKeyLine = !1),
			(this.stack = []),
			(this.source = ''),
			(this.type = ''),
			(this.lexer = new lv()),
			(this.onNewLine = e);
	}
	*parse(e, n = !1) {
		this.onNewLine && this.offset === 0 && this.onNewLine(0);
		for (const s of this.lexer.lex(e, n)) yield* this.next(s);
		n || (yield* this.end());
	}
	*next(e) {
		if (((this.source = e), this.atScalar)) {
			(this.atScalar = !1), yield* this.step(), (this.offset += e.length);
			return;
		}
		const n = ov(e);
		if (n)
			if (n === 'scalar') (this.atNewLine = !1), (this.atScalar = !0), (this.type = 'scalar');
			else {
				switch (((this.type = n), yield* this.step(), n)) {
					case 'newline':
						(this.atNewLine = !0),
							(this.indent = 0),
							this.onNewLine && this.onNewLine(this.offset + e.length);
						break;
					case 'space':
						this.atNewLine && e[0] === ' ' && (this.indent += e.length);
						break;
					case 'explicit-key-ind':
					case 'map-value-ind':
					case 'seq-item-ind':
						this.atNewLine && (this.indent += e.length);
						break;
					case 'doc-mode':
					case 'flow-error-end':
						return;
					default:
						this.atNewLine = !1;
				}
				this.offset += e.length;
			}
		else {
			const s = `Not a YAML token: ${e}`;
			yield* this.pop({ type: 'error', offset: this.offset, message: s, source: e }),
				(this.offset += e.length);
		}
	}
	*end() {
		for (; this.stack.length > 0; ) yield* this.pop();
	}
	get sourceToken() {
		return { type: this.type, offset: this.offset, indent: this.indent, source: this.source };
	}
	*step() {
		const e = this.peek(1);
		if (this.type === 'doc-end' && (!e || e.type !== 'doc-end')) {
			for (; this.stack.length > 0; ) yield* this.pop();
			this.stack.push({ type: 'doc-end', offset: this.offset, source: this.source });
			return;
		}
		if (!e) return yield* this.stream();
		switch (e.type) {
			case 'document':
				return yield* this.document(e);
			case 'alias':
			case 'scalar':
			case 'single-quoted-scalar':
			case 'double-quoted-scalar':
				return yield* this.scalar(e);
			case 'block-scalar':
				return yield* this.blockScalar(e);
			case 'block-map':
				return yield* this.blockMap(e);
			case 'block-seq':
				return yield* this.blockSequence(e);
			case 'flow-collection':
				return yield* this.flowCollection(e);
			case 'doc-end':
				return yield* this.documentEnd(e);
		}
		yield* this.pop();
	}
	peek(e) {
		return this.stack[this.stack.length - e];
	}
	*pop(e) {
		const n = e ?? this.stack.pop();
		if (!n)
			yield {
				type: 'error',
				offset: this.offset,
				source: '',
				message: 'Tried to pop an empty stack',
			};
		else if (this.stack.length === 0) yield n;
		else {
			const s = this.peek(1);
			switch (
				(n.type === 'block-scalar'
					? (n.indent = 'indent' in s ? s.indent : 0)
					: n.type === 'flow-collection' && s.type === 'document' && (n.indent = 0),
				n.type === 'flow-collection' && Lm(n),
				s.type)
			) {
				case 'document':
					s.value = n;
					break;
				case 'block-scalar':
					s.props.push(n);
					break;
				case 'block-map': {
					const o = s.items[s.items.length - 1];
					if (o.value) {
						s.items.push({ start: [], key: n, sep: [] }), (this.onKeyLine = !0);
						return;
					} else if (o.sep) o.value = n;
					else {
						Object.assign(o, { key: n, sep: [] }), (this.onKeyLine = !o.explicitKey);
						return;
					}
					break;
				}
				case 'block-seq': {
					const o = s.items[s.items.length - 1];
					o.value ? s.items.push({ start: [], value: n }) : (o.value = n);
					break;
				}
				case 'flow-collection': {
					const o = s.items[s.items.length - 1];
					!o || o.value
						? s.items.push({ start: [], key: n, sep: [] })
						: o.sep
							? (o.value = n)
							: Object.assign(o, { key: n, sep: [] });
					return;
				}
				default:
					yield* this.pop(), yield* this.pop(n);
			}
			if (
				(s.type === 'document' || s.type === 'block-map' || s.type === 'block-seq') &&
				(n.type === 'block-map' || n.type === 'block-seq')
			) {
				const o = n.items[n.items.length - 1];
				o &&
					!o.sep &&
					!o.value &&
					o.start.length > 0 &&
					Im(o.start) === -1 &&
					(n.indent === 0 || o.start.every((l) => l.type !== 'comment' || l.indent < n.indent)) &&
					(s.type === 'document' ? (s.end = o.start) : s.items.push({ start: o.start }),
					n.items.splice(-1, 1));
			}
		}
	}
	*stream() {
		switch (this.type) {
			case 'directive-line':
				yield { type: 'directive', offset: this.offset, source: this.source };
				return;
			case 'byte-order-mark':
			case 'space':
			case 'comment':
			case 'newline':
				yield this.sourceToken;
				return;
			case 'doc-mode':
			case 'doc-start': {
				const e = { type: 'document', offset: this.offset, start: [] };
				this.type === 'doc-start' && e.start.push(this.sourceToken), this.stack.push(e);
				return;
			}
		}
		yield {
			type: 'error',
			offset: this.offset,
			message: `Unexpected ${this.type} token in YAML stream`,
			source: this.source,
		};
	}
	*document(e) {
		if (e.value) return yield* this.lineEnd(e);
		switch (this.type) {
			case 'doc-start': {
				Im(e.start) !== -1
					? (yield* this.pop(), yield* this.step())
					: e.start.push(this.sourceToken);
				return;
			}
			case 'anchor':
			case 'tag':
			case 'space':
			case 'comment':
			case 'newline':
				e.start.push(this.sourceToken);
				return;
		}
		const n = this.startBlockValue(e);
		n
			? this.stack.push(n)
			: yield {
					type: 'error',
					offset: this.offset,
					message: `Unexpected ${this.type} token in YAML document`,
					source: this.source,
				};
	}
	*scalar(e) {
		if (this.type === 'map-value-ind') {
			const n = wl(this.peek(2)),
				s = fs(n);
			let o;
			e.end ? ((o = e.end), o.push(this.sourceToken), delete e.end) : (o = [this.sourceToken]);
			const l = {
				type: 'block-map',
				offset: e.offset,
				indent: e.indent,
				items: [{ start: s, key: e, sep: o }],
			};
			(this.onKeyLine = !0), (this.stack[this.stack.length - 1] = l);
		} else yield* this.lineEnd(e);
	}
	*blockScalar(e) {
		switch (this.type) {
			case 'space':
			case 'comment':
			case 'newline':
				e.props.push(this.sourceToken);
				return;
			case 'scalar':
				if (((e.source = this.source), (this.atNewLine = !0), (this.indent = 0), this.onNewLine)) {
					let n =
						this.source.indexOf(`
`) + 1;
					for (; n !== 0; )
						this.onNewLine(this.offset + n),
							(n =
								this.source.indexOf(
									`
`,
									n,
								) + 1);
				}
				yield* this.pop();
				break;
			default:
				yield* this.pop(), yield* this.step();
		}
	}
	*blockMap(e) {
		var s;
		const n = e.items[e.items.length - 1];
		switch (this.type) {
			case 'newline':
				if (((this.onKeyLine = !1), n.value)) {
					const o = 'end' in n.value ? n.value.end : void 0,
						l = Array.isArray(o) ? o[o.length - 1] : void 0;
					(l == null ? void 0 : l.type) === 'comment'
						? o == null || o.push(this.sourceToken)
						: e.items.push({ start: [this.sourceToken] });
				} else n.sep ? n.sep.push(this.sourceToken) : n.start.push(this.sourceToken);
				return;
			case 'space':
			case 'comment':
				if (n.value) e.items.push({ start: [this.sourceToken] });
				else if (n.sep) n.sep.push(this.sourceToken);
				else {
					if (this.atIndentedComment(n.start, e.indent)) {
						const o = e.items[e.items.length - 2],
							l = (s = o == null ? void 0 : o.value) == null ? void 0 : s.end;
						if (Array.isArray(l)) {
							Array.prototype.push.apply(l, n.start), l.push(this.sourceToken), e.items.pop();
							return;
						}
					}
					n.start.push(this.sourceToken);
				}
				return;
		}
		if (this.indent >= e.indent) {
			const o = !this.onKeyLine && this.indent === e.indent,
				l = o && (n.sep || n.explicitKey) && this.type !== 'seq-item-ind';
			let c = [];
			if (l && n.sep && !n.value) {
				const u = [];
				for (let d = 0; d < n.sep.length; ++d) {
					const p = n.sep[d];
					switch (p.type) {
						case 'newline':
							u.push(d);
							break;
						case 'space':
							break;
						case 'comment':
							p.indent > e.indent && (u.length = 0);
							break;
						default:
							u.length = 0;
					}
				}
				u.length >= 2 && (c = n.sep.splice(u[1]));
			}
			switch (this.type) {
				case 'anchor':
				case 'tag':
					l || n.value
						? (c.push(this.sourceToken), e.items.push({ start: c }), (this.onKeyLine = !0))
						: n.sep
							? n.sep.push(this.sourceToken)
							: n.start.push(this.sourceToken);
					return;
				case 'explicit-key-ind':
					!n.sep && !n.explicitKey
						? (n.start.push(this.sourceToken), (n.explicitKey = !0))
						: l || n.value
							? (c.push(this.sourceToken), e.items.push({ start: c, explicitKey: !0 }))
							: this.stack.push({
									type: 'block-map',
									offset: this.offset,
									indent: this.indent,
									items: [{ start: [this.sourceToken], explicitKey: !0 }],
								}),
						(this.onKeyLine = !0);
					return;
				case 'map-value-ind':
					if (n.explicitKey)
						if (n.sep)
							if (n.value) e.items.push({ start: [], key: null, sep: [this.sourceToken] });
							else if (xr(n.sep, 'map-value-ind'))
								this.stack.push({
									type: 'block-map',
									offset: this.offset,
									indent: this.indent,
									items: [{ start: c, key: null, sep: [this.sourceToken] }],
								});
							else if (cv(n.key) && !xr(n.sep, 'newline')) {
								const u = fs(n.start),
									d = n.key,
									p = n.sep;
								p.push(this.sourceToken),
									delete n.key,
									delete n.sep,
									this.stack.push({
										type: 'block-map',
										offset: this.offset,
										indent: this.indent,
										items: [{ start: u, key: d, sep: p }],
									});
							} else
								c.length > 0
									? (n.sep = n.sep.concat(c, this.sourceToken))
									: n.sep.push(this.sourceToken);
						else if (xr(n.start, 'newline'))
							Object.assign(n, { key: null, sep: [this.sourceToken] });
						else {
							const u = fs(n.start);
							this.stack.push({
								type: 'block-map',
								offset: this.offset,
								indent: this.indent,
								items: [{ start: u, key: null, sep: [this.sourceToken] }],
							});
						}
					else
						n.sep
							? n.value || l
								? e.items.push({ start: c, key: null, sep: [this.sourceToken] })
								: xr(n.sep, 'map-value-ind')
									? this.stack.push({
											type: 'block-map',
											offset: this.offset,
											indent: this.indent,
											items: [{ start: [], key: null, sep: [this.sourceToken] }],
										})
									: n.sep.push(this.sourceToken)
							: Object.assign(n, { key: null, sep: [this.sourceToken] });
					this.onKeyLine = !0;
					return;
				case 'alias':
				case 'scalar':
				case 'single-quoted-scalar':
				case 'double-quoted-scalar': {
					const u = this.flowScalar(this.type);
					l || n.value
						? (e.items.push({ start: c, key: u, sep: [] }), (this.onKeyLine = !0))
						: n.sep
							? this.stack.push(u)
							: (Object.assign(n, { key: u, sep: [] }), (this.onKeyLine = !0));
					return;
				}
				default: {
					const u = this.startBlockValue(e);
					if (u) {
						o && u.type !== 'block-seq' && e.items.push({ start: c }), this.stack.push(u);
						return;
					}
				}
			}
		}
		yield* this.pop(), yield* this.step();
	}
	*blockSequence(e) {
		var s;
		const n = e.items[e.items.length - 1];
		switch (this.type) {
			case 'newline':
				if (n.value) {
					const o = 'end' in n.value ? n.value.end : void 0,
						l = Array.isArray(o) ? o[o.length - 1] : void 0;
					(l == null ? void 0 : l.type) === 'comment'
						? o == null || o.push(this.sourceToken)
						: e.items.push({ start: [this.sourceToken] });
				} else n.start.push(this.sourceToken);
				return;
			case 'space':
			case 'comment':
				if (n.value) e.items.push({ start: [this.sourceToken] });
				else {
					if (this.atIndentedComment(n.start, e.indent)) {
						const o = e.items[e.items.length - 2],
							l = (s = o == null ? void 0 : o.value) == null ? void 0 : s.end;
						if (Array.isArray(l)) {
							Array.prototype.push.apply(l, n.start), l.push(this.sourceToken), e.items.pop();
							return;
						}
					}
					n.start.push(this.sourceToken);
				}
				return;
			case 'anchor':
			case 'tag':
				if (n.value || this.indent <= e.indent) break;
				n.start.push(this.sourceToken);
				return;
			case 'seq-item-ind':
				if (this.indent !== e.indent) break;
				n.value || xr(n.start, 'seq-item-ind')
					? e.items.push({ start: [this.sourceToken] })
					: n.start.push(this.sourceToken);
				return;
		}
		if (this.indent > e.indent) {
			const o = this.startBlockValue(e);
			if (o) {
				this.stack.push(o);
				return;
			}
		}
		yield* this.pop(), yield* this.step();
	}
	*flowCollection(e) {
		const n = e.items[e.items.length - 1];
		if (this.type === 'flow-error-end') {
			let s;
			do yield* this.pop(), (s = this.peek(1));
			while (s && s.type === 'flow-collection');
		} else if (e.end.length === 0) {
			switch (this.type) {
				case 'comma':
				case 'explicit-key-ind':
					!n || n.sep
						? e.items.push({ start: [this.sourceToken] })
						: n.start.push(this.sourceToken);
					return;
				case 'map-value-ind':
					!n || n.value
						? e.items.push({ start: [], key: null, sep: [this.sourceToken] })
						: n.sep
							? n.sep.push(this.sourceToken)
							: Object.assign(n, { key: null, sep: [this.sourceToken] });
					return;
				case 'space':
				case 'comment':
				case 'newline':
				case 'anchor':
				case 'tag':
					!n || n.value
						? e.items.push({ start: [this.sourceToken] })
						: n.sep
							? n.sep.push(this.sourceToken)
							: n.start.push(this.sourceToken);
					return;
				case 'alias':
				case 'scalar':
				case 'single-quoted-scalar':
				case 'double-quoted-scalar': {
					const o = this.flowScalar(this.type);
					!n || n.value
						? e.items.push({ start: [], key: o, sep: [] })
						: n.sep
							? this.stack.push(o)
							: Object.assign(n, { key: o, sep: [] });
					return;
				}
				case 'flow-map-end':
				case 'flow-seq-end':
					e.end.push(this.sourceToken);
					return;
			}
			const s = this.startBlockValue(e);
			s ? this.stack.push(s) : (yield* this.pop(), yield* this.step());
		} else {
			const s = this.peek(2);
			if (
				s.type === 'block-map' &&
				((this.type === 'map-value-ind' && s.indent === e.indent) ||
					(this.type === 'newline' && !s.items[s.items.length - 1].sep))
			)
				yield* this.pop(), yield* this.step();
			else if (this.type === 'map-value-ind' && s.type !== 'flow-collection') {
				const o = wl(s),
					l = fs(o);
				Lm(e);
				const c = e.end.splice(1, e.end.length);
				c.push(this.sourceToken);
				const u = {
					type: 'block-map',
					offset: e.offset,
					indent: e.indent,
					items: [{ start: l, key: e, sep: c }],
				};
				(this.onKeyLine = !0), (this.stack[this.stack.length - 1] = u);
			} else yield* this.lineEnd(e);
		}
	}
	flowScalar(e) {
		if (this.onNewLine) {
			let n =
				this.source.indexOf(`
`) + 1;
			for (; n !== 0; )
				this.onNewLine(this.offset + n),
					(n =
						this.source.indexOf(
							`
`,
							n,
						) + 1);
		}
		return { type: e, offset: this.offset, indent: this.indent, source: this.source };
	}
	startBlockValue(e) {
		switch (this.type) {
			case 'alias':
			case 'scalar':
			case 'single-quoted-scalar':
			case 'double-quoted-scalar':
				return this.flowScalar(this.type);
			case 'block-scalar-header':
				return {
					type: 'block-scalar',
					offset: this.offset,
					indent: this.indent,
					props: [this.sourceToken],
					source: '',
				};
			case 'flow-map-start':
			case 'flow-seq-start':
				return {
					type: 'flow-collection',
					offset: this.offset,
					indent: this.indent,
					start: this.sourceToken,
					items: [],
					end: [],
				};
			case 'seq-item-ind':
				return {
					type: 'block-seq',
					offset: this.offset,
					indent: this.indent,
					items: [{ start: [this.sourceToken] }],
				};
			case 'explicit-key-ind': {
				this.onKeyLine = !0;
				const n = wl(e),
					s = fs(n);
				return (
					s.push(this.sourceToken),
					{
						type: 'block-map',
						offset: this.offset,
						indent: this.indent,
						items: [{ start: s, explicitKey: !0 }],
					}
				);
			}
			case 'map-value-ind': {
				this.onKeyLine = !0;
				const n = wl(e),
					s = fs(n);
				return {
					type: 'block-map',
					offset: this.offset,
					indent: this.indent,
					items: [{ start: s, key: null, sep: [this.sourceToken] }],
				};
			}
		}
		return null;
	}
	atIndentedComment(e, n) {
		return this.type !== 'comment' || this.indent <= n
			? !1
			: e.every((s) => s.type === 'newline' || s.type === 'space');
	}
	*documentEnd(e) {
		this.type !== 'doc-mode' &&
			(e.end ? e.end.push(this.sourceToken) : (e.end = [this.sourceToken]),
			this.type === 'newline' && (yield* this.pop()));
	}
	*lineEnd(e) {
		switch (this.type) {
			case 'comma':
			case 'doc-start':
			case 'doc-end':
			case 'flow-seq-end':
			case 'flow-map-end':
			case 'map-value-ind':
				yield* this.pop(), yield* this.step();
				break;
			case 'newline':
				this.onKeyLine = !1;
			case 'space':
			case 'comment':
			default:
				e.end ? e.end.push(this.sourceToken) : (e.end = [this.sourceToken]),
					this.type === 'newline' && (yield* this.pop());
		}
	}
}
function uv(t) {
	const e = t.prettyErrors !== !1;
	return { lineCounter: t.lineCounter || (e && new av()) || null, prettyErrors: e };
}
function sk(t, e = {}) {
	const { lineCounter: n, prettyErrors: s } = uv(e),
		o = new Ff(n == null ? void 0 : n.addNewLine),
		l = new Df(e),
		c = Array.from(l.compose(o.parse(t)));
	if (s && n) for (const u of c) u.errors.forEach(Vl(t, n)), u.warnings.forEach(Vl(t, n));
	return c.length > 0 ? c : Object.assign([], { empty: !0 }, l.streamInfo());
}
function fv(t, e = {}) {
	const { lineCounter: n, prettyErrors: s } = uv(e),
		o = new Ff(n == null ? void 0 : n.addNewLine),
		l = new Df(e);
	let c = null;
	for (const u of l.compose(o.parse(t), !0, t.length))
		if (!c) c = u;
		else if (c.options.logLevel !== 'silent') {
			c.errors.push(
				new kr(
					u.range.slice(0, 2),
					'MULTIPLE_DOCS',
					'Source contains multiple documents; please use YAML.parseAllDocuments()',
				),
			);
			break;
		}
	return s && n && (c.errors.forEach(Vl(t, n)), c.warnings.forEach(Vl(t, n))), c;
}
function ik(t, e, n) {
	let s;
	typeof e == 'function' ? (s = e) : n === void 0 && e && typeof e == 'object' && (n = e);
	const o = fv(t, n);
	if (!o) return null;
	if ((o.warnings.forEach((l) => Ly(o.options.logLevel, l)), o.errors.length > 0)) {
		if (o.options.logLevel !== 'silent') throw o.errors[0];
		o.errors = [];
	}
	return o.toJS(Object.assign({ reviver: s }, n));
}
function ok(t, e, n) {
	let s = null;
	if (
		(typeof e == 'function' || Array.isArray(e) ? (s = e) : n === void 0 && e && (n = e),
		typeof n == 'string' && (n = n.length),
		typeof n == 'number')
	) {
		const o = Math.round(n);
		n = o < 1 ? void 0 : o > 8 ? { indent: 8 } : { indent: o };
	}
	if (t === void 0) {
		const { keepUndefined: o } = n ?? e ?? {};
		if (!o) return;
	}
	return Lr(t) && !s ? t.toString(n) : new $s(t, s, n).toString(n);
}
const dv = Object.freeze(
		Object.defineProperty(
			{
				__proto__: null,
				Alias: ea,
				CST: tk,
				Composer: Df,
				Document: $s,
				Lexer: lv,
				LineCounter: av,
				Pair: at,
				Parser: Ff,
				Scalar: ue,
				Schema: ca,
				YAMLError: $f,
				YAMLMap: Lt,
				YAMLParseError: kr,
				YAMLSeq: rr,
				YAMLWarning: Jy,
				isAlias: Ir,
				isCollection: $e,
				isDocument: Lr,
				isMap: Ms,
				isNode: Re,
				isPair: Me,
				isScalar: ke,
				isSeq: js,
				parse: ik,
				parseAllDocuments: sk,
				parseDocument: fv,
				stringify: ok,
				visit: nr,
				visitAsync: Zl,
			},
			Symbol.toStringTag,
			{ value: 'Module' },
		),
	),
	lk = ({
		action: t,
		sdkLanguage: e,
		testIdAttributeName: n,
		isInspecting: s,
		setIsInspecting: o,
		highlightedElement: l,
		setHighlightedElement: c,
	}) => {
		const [u, d] = R.useState('action'),
			[p, g] = Es('shouldPopulateCanvasFromScreenshot', !1),
			y = R.useMemo(() => fk(t), [t]),
			v = R.useMemo(() => {
				const S = y[u];
				return S ? dk(S, p) : void 0;
			}, [y, u, p]);
		return w.jsxs('div', {
			className: 'snapshot-tab vbox',
			children: [
				w.jsxs(Zu, {
					children: [
						w.jsx(qt, {
							className: 'pick-locator',
							title: 'Pick locator',
							icon: 'target',
							toggled: s,
							onClick: () => o(!s),
						}),
						['action', 'before', 'after'].map((S) =>
							w.jsx(yg, { id: S, title: uk(S), selected: u === S, onSelect: () => d(S) }, S),
						),
						w.jsx('div', { style: { flex: 'auto' } }),
						w.jsx(qt, {
							icon: 'link-external',
							title: 'Open snapshot in a new tab',
							disabled: !(v != null && v.popoutUrl),
							onClick: () => {
								const S = window.open((v == null ? void 0 : v.popoutUrl) || '', '_blank');
								S == null ||
									S.addEventListener('DOMContentLoaded', () => {
										new my(S, {
											isUnderTest: pv,
											sdkLanguage: e,
											testIdAttributeName: n,
											stableRafCount: 1,
											browserName: 'chromium',
											inputFileRoleTextbox: !1,
											customEngines: [],
										}).consoleApi.install();
									});
							},
						}),
					],
				}),
				w.jsx(ak, {
					snapshotUrls: v,
					sdkLanguage: e,
					testIdAttributeName: n,
					isInspecting: s,
					setIsInspecting: o,
					highlightedElement: l,
					setHighlightedElement: c,
				}),
			],
		});
	},
	ak = ({
		snapshotUrls: t,
		sdkLanguage: e,
		testIdAttributeName: n,
		isInspecting: s,
		setIsInspecting: o,
		highlightedElement: l,
		setHighlightedElement: c,
	}) => {
		const u = R.useRef(null),
			d = R.useRef(null),
			[p, g] = R.useState({ viewport: mv, url: '' }),
			y = R.useRef({ iteration: 0, visibleIframe: 0 });
		return (
			R.useEffect(() => {
				(async () => {
					const v = y.current.iteration + 1,
						S = 1 - y.current.visibleIframe;
					y.current.iteration = v;
					const k = await hk(t == null ? void 0 : t.snapshotInfoUrl);
					if (y.current.iteration !== v) return;
					const _ = [u, d][S].current;
					if (_) {
						let E = () => {};
						const C = new Promise((A) => (E = A));
						try {
							_.addEventListener('load', E), _.addEventListener('error', E);
							const A = (t == null ? void 0 : t.snapshotUrl) || pk;
							_.contentWindow ? _.contentWindow.location.replace(A) : (_.src = A), await C;
						} catch {
						} finally {
							_.removeEventListener('load', E), _.removeEventListener('error', E);
						}
					}
					y.current.iteration === v && ((y.current.visibleIframe = S), g(k));
				})();
			}, [t]),
			w.jsxs('div', {
				className: 'vbox',
				tabIndex: 0,
				onKeyDown: (v) => {
					v.key === 'Escape' && s && o(!1);
				},
				children: [
					w.jsx(Mm, {
						isInspecting: s,
						sdkLanguage: e,
						testIdAttributeName: n,
						highlightedElement: l,
						setHighlightedElement: c,
						iframe: u.current,
						iteration: y.current.iteration,
					}),
					w.jsx(Mm, {
						isInspecting: s,
						sdkLanguage: e,
						testIdAttributeName: n,
						highlightedElement: l,
						setHighlightedElement: c,
						iframe: d.current,
						iteration: y.current.iteration,
					}),
					w.jsx(ck, {
						snapshotInfo: p,
						children: w.jsxs('div', {
							className: 'snapshot-switcher',
							children: [
								w.jsx('iframe', {
									ref: u,
									name: 'snapshot',
									title: 'DOM Snapshot',
									className: ze(y.current.visibleIframe === 0 && 'snapshot-visible'),
								}),
								w.jsx('iframe', {
									ref: d,
									name: 'snapshot',
									title: 'DOM Snapshot',
									className: ze(y.current.visibleIframe === 1 && 'snapshot-visible'),
								}),
							],
						}),
					}),
				],
			})
		);
	},
	ck = ({ snapshotInfo: t, children: e }) => {
		const [n, s] = Nr(),
			l = { width: t.viewport.width, height: t.viewport.height + 40 },
			c = Math.min(n.width / l.width, n.height / l.height, 1),
			u = { x: (n.width - l.width) / 2, y: (n.height - l.height) / 2 };
		return w.jsx('div', {
			ref: s,
			className: 'snapshot-wrapper',
			children: w.jsxs('div', {
				className: 'snapshot-container',
				style: {
					width: l.width + 'px',
					height: l.height + 'px',
					transform: `translate(${u.x}px, ${u.y}px) scale(${c})`,
				},
				children: [w.jsx(X_, { url: t.url }), e],
			}),
		});
	};
function uk(t) {
	return t === 'before' ? 'Before' : t === 'after' ? 'After' : t === 'action' ? 'Action' : t;
}
const Mm = ({
	iframe: t,
	isInspecting: e,
	sdkLanguage: n,
	testIdAttributeName: s,
	highlightedElement: o,
	setHighlightedElement: l,
	iteration: c,
}) => (
	R.useEffect(() => {
		const u = o.lastEdited === 'ariaSnapshot' ? o.ariaSnapshot : void 0,
			d = o.lastEdited === 'locator' ? o.locator : void 0,
			p = !!u || !!d || e,
			g = [],
			y = new URLSearchParams(window.location.search).get('isUnderTest') === 'true';
		try {
			hv(g, p, n, s, y, '', t == null ? void 0 : t.contentWindow);
		} catch {}
		const v = u ? ef(dv, u) : void 0,
			S = d ? Q_(n, d, s) : void 0;
		for (const { recorder: k, frameSelector: _ } of g) {
			const E = S != null && S.startsWith(_) ? S.substring(_.length).trim() : void 0,
				C = (v == null ? void 0 : v.errors.length) === 0 ? v.fragment : void 0;
			k.setUIState(
				{
					mode: e ? 'inspecting' : 'none',
					actionSelector: E,
					ariaTemplate: C,
					language: n,
					testIdAttributeName: s,
					overlay: { offsetX: 0 },
				},
				{
					async elementPicked(A) {
						l({ locator: er(n, _ + A.selector), ariaSnapshot: A.ariaSnapshot, lastEdited: 'none' });
					},
					highlightUpdated() {
						for (const A of g) A.recorder !== k && A.recorder.clearHighlight();
					},
				},
			);
		}
	}, [t, e, o, l, n, s, c]),
	w.jsx(w.Fragment, {})
);
function hv(t, e, n, s, o, l, c) {
	if (!c) return;
	const u = c;
	if (!u._recorder && e) {
		const d = new my(c, {
				isUnderTest: o,
				sdkLanguage: n,
				testIdAttributeName: s,
				stableRafCount: 1,
				browserName: 'chromium',
				inputFileRoleTextbox: !1,
				customEngines: [],
			}),
			p = new q_(d);
		(u._injectedScript = d),
			(u._recorder = { recorder: p, frameSelector: l }),
			o &&
				((window._weakRecordersForTest = window._weakRecordersForTest || new Set()),
				window._weakRecordersForTest.add(new WeakRef(p)));
	}
	u._recorder && t.push(u._recorder);
	for (let d = 0; d < c.frames.length; ++d) {
		const p = c.frames[d],
			g = p.frameElement
				? u._injectedScript.generateSelectorSimple(p.frameElement, {
						omitInternalEngines: !0,
						testIdAttributeName: s,
					}) + ' >> internal:control=enter-frame >> '
				: '';
		hv(t, e, n, s, o, l + g, p);
	}
}
function fk(t) {
	if (!t) return {};
	let e = t.beforeSnapshot ? { action: t, snapshotName: t.beforeSnapshot } : void 0;
	if (!e) {
		for (let o = Rp(t); o; o = Rp(o))
			if (o.endTime <= t.startTime && o.afterSnapshot) {
				e = { action: o, snapshotName: o.afterSnapshot };
				break;
			}
	}
	let n = t.afterSnapshot ? { action: t, snapshotName: t.afterSnapshot } : void 0;
	if (!n) {
		let o;
		for (let l = Dp(t); l && l.startTime <= t.endTime; l = Dp(l))
			l.endTime > t.endTime || !l.afterSnapshot || (o && o.endTime > l.endTime) || (o = l);
		o ? (n = { action: o, snapshotName: o.afterSnapshot }) : (n = e);
	}
	const s = t.inputSnapshot ? { action: t, snapshotName: t.inputSnapshot, hasInputTarget: !0 } : n;
	return s && (s.point = t.point), { action: s, before: e, after: n };
}
const pv = new URLSearchParams(window.location.search).has('isUnderTest'),
	jm = new URLSearchParams(window.location.search).get('server');
function dk(t, e) {
	const n = new URLSearchParams();
	n.set('trace', jl(t.action).traceUrl),
		n.set('name', t.snapshotName),
		pv && n.set('isUnderTest', 'true'),
		t.point &&
			(n.set('pointX', String(t.point.x)),
			n.set('pointY', String(t.point.y)),
			t.hasInputTarget && n.set('hasInputTarget', '1')),
		e && n.set('shouldPopulateCanvasFromScreenshot', '1');
	const s = new URL(`snapshot/${t.action.pageId}?${n.toString()}`, window.location.href).toString(),
		o = new URL(`snapshotInfo/${t.action.pageId}?${n.toString()}`, window.location.href).toString(),
		l = new URLSearchParams();
	l.set('r', s),
		jm && l.set('server', jm),
		l.set('trace', jl(t.action).traceUrl),
		t.point &&
			(l.set('pointX', String(t.point.x)),
			l.set('pointY', String(t.point.y)),
			t.hasInputTarget && n.set('hasInputTarget', '1'));
	const c = new URL(`snapshot.html?${l.toString()}`, window.location.href).toString();
	return { snapshotInfoUrl: o, snapshotUrl: s, popoutUrl: c };
}
async function hk(t) {
	const e = { url: '', viewport: mv, timestamp: void 0, wallTime: void 0 };
	if (t) {
		const s = await (await fetch(t)).json();
		s.error ||
			((e.url = s.url),
			(e.viewport = s.viewport),
			(e.timestamp = s.timestamp),
			(e.wallTime = s.wallTime));
	}
	return e;
}
const mv = { width: 1280, height: 720 },
	pk = 'data:text/html,<body style="background: #ddd"></body>',
	gv = { width: 200, height: 45 },
	ps = 2.5,
	mk = gv.height + ps * 2,
	gk = ({ model: t, boundaries: e, previewPoint: n }) => {
		var g, y;
		const [s, o] = Nr(),
			l = R.useRef(null);
		let c = 0;
		if (l.current && n) {
			const v = l.current.getBoundingClientRect();
			c = ((n.clientY - v.top + l.current.scrollTop) / mk) | 0;
		}
		const u =
			(y = (g = t == null ? void 0 : t.pages) == null ? void 0 : g[c]) == null
				? void 0
				: y.screencastFrames;
		let d, p;
		if (n !== void 0 && u && u.length) {
			const v = e.minimum + ((e.maximum - e.minimum) * n.x) / s.width;
			d = u[Om(u, v, yv) - 1];
			const S = {
				width: Math.min(800, (window.innerWidth / 2) | 0),
				height: Math.min(800, (window.innerHeight / 2) | 0),
			};
			p = d ? vv({ width: d.width, height: d.height }, S) : void 0;
		}
		return w.jsxs('div', {
			className: 'film-strip',
			ref: o,
			children: [
				w.jsx('div', {
					className: 'film-strip-lanes',
					ref: l,
					children:
						t == null
							? void 0
							: t.pages.map((v, S) =>
									v.screencastFrames.length
										? w.jsx(yk, { boundaries: e, page: v, width: s.width }, S)
										: null,
								),
				}),
				(n == null ? void 0 : n.x) !== void 0 &&
					w.jsxs('div', {
						className: 'film-strip-hover',
						style: { top: s.bottom + 5, left: Math.min(n.x, s.width - (p ? p.width : 0) - 10) },
						children: [
							n.action &&
								w.jsx('div', { className: 'film-strip-hover-title', children: Xu(n.action, n) }),
							d &&
								p &&
								w.jsx('div', {
									style: { width: p.width, height: p.height },
									children: w.jsx('img', {
										src: `sha1/${d.sha1}`,
										width: p.width,
										height: p.height,
									}),
								}),
						],
					}),
			],
		});
	},
	yk = ({ boundaries: t, page: e, width: n }) => {
		const s = { width: 0, height: 0 },
			o = e.screencastFrames;
		for (const _ of o)
			(s.width = Math.max(s.width, _.width)), (s.height = Math.max(s.height, _.height));
		const l = vv(s, gv),
			c = o[0].timestamp,
			u = o[o.length - 1].timestamp,
			d = t.maximum - t.minimum,
			p = ((c - t.minimum) / d) * n,
			g = ((t.maximum - u) / d) * n,
			v = ((((u - c) / d) * n) / (l.width + 2 * ps)) | 0,
			S = (u - c) / v,
			k = [];
		for (let _ = 0; c && S && _ < v; ++_) {
			const E = c + S * _,
				C = Om(o, E, yv) - 1;
			k.push(
				w.jsx(
					'div',
					{
						className: 'film-strip-frame',
						style: {
							width: l.width,
							height: l.height,
							backgroundImage: `url(sha1/${o[C].sha1})`,
							backgroundSize: `${l.width}px ${l.height}px`,
							margin: ps,
							marginRight: ps,
						},
					},
					_,
				),
			);
		}
		return (
			k.push(
				w.jsx(
					'div',
					{
						className: 'film-strip-frame',
						style: {
							width: l.width,
							height: l.height,
							backgroundImage: `url(sha1/${o[o.length - 1].sha1})`,
							backgroundSize: `${l.width}px ${l.height}px`,
							margin: ps,
							marginRight: ps,
						},
					},
					k.length,
				),
			),
			w.jsx('div', {
				className: 'film-strip-lane',
				style: { marginLeft: p + 'px', marginRight: g + 'px' },
				children: k,
			})
		);
	};
function yv(t, e) {
	return t - e.timestamp;
}
function vv(t, e) {
	const n = Math.max(t.width / e.width, t.height / e.height);
	return { width: (t.width / n) | 0, height: (t.height / n) | 0 };
}
const vk = ({
	model: t,
	boundaries: e,
	consoleEntries: n,
	onSelected: s,
	highlightedAction: o,
	highlightedEntry: l,
	highlightedConsoleEntry: c,
	selectedTime: u,
	setSelectedTime: d,
	sdkLanguage: p,
}) => {
	const [g, y] = Nr(),
		[v, S] = R.useState(),
		[k, _] = R.useState(),
		{
			offsets: E,
			curtainLeft: C,
			curtainRight: A,
		} = R.useMemo(() => {
			let G = u || e;
			if (v && v.startX !== v.endX) {
				const ce = un(g.width, e, v.startX),
					Ae = un(g.width, e, v.endX);
				G = { minimum: Math.min(ce, Ae), maximum: Math.max(ce, Ae) };
			}
			const K = Bt(g.width, e, G.minimum),
				X = Bt(g.width, e, e.maximum) - Bt(g.width, e, G.maximum);
			return { offsets: wk(g.width, e), curtainLeft: K, curtainRight: X };
		}, [u, e, v, g]),
		O = R.useMemo(() => {
			const G = [];
			for (const K of (t == null ? void 0 : t.actions) || [])
				K.class !== 'Test' &&
					G.push({
						action: K,
						leftTime: K.startTime,
						rightTime: K.endTime || e.maximum,
						leftPosition: Bt(g.width, e, K.startTime),
						rightPosition: Bt(g.width, e, K.endTime || e.maximum),
						active: !1,
						error: !!K.error,
					});
			for (const K of (t == null ? void 0 : t.resources) || []) {
				const $ = K._monotonicTime,
					X = K._monotonicTime + K.time;
				G.push({
					resource: K,
					leftTime: $,
					rightTime: X,
					leftPosition: Bt(g.width, e, $),
					rightPosition: Bt(g.width, e, X),
					active: !1,
					error: !1,
				});
			}
			for (const K of n || [])
				G.push({
					consoleMessage: K,
					leftTime: K.timestamp,
					rightTime: K.timestamp,
					leftPosition: Bt(g.width, e, K.timestamp),
					rightPosition: Bt(g.width, e, K.timestamp),
					active: !1,
					error: K.isError,
				});
			return G;
		}, [t, n, e, g]);
	R.useMemo(() => {
		for (const G of O)
			o
				? (G.active = G.action === o)
				: l
					? (G.active = G.resource === l)
					: c
						? (G.active = G.consoleMessage === c)
						: (G.active = !1);
	}, [O, o, l, c]);
	const D = R.useCallback(
			(G) => {
				if ((_(void 0), !y.current)) return;
				const K = G.clientX - y.current.getBoundingClientRect().left,
					$ = un(g.width, e, K),
					X = u ? Bt(g.width, e, u.minimum) : 0,
					ce = u ? Bt(g.width, e, u.maximum) : 0;
				u && Math.abs(K - X) < 10
					? S({ startX: ce, endX: K, type: 'resize' })
					: u && Math.abs(K - ce) < 10
						? S({ startX: X, endX: K, type: 'resize' })
						: u &&
								$ > u.minimum &&
								$ < u.maximum &&
								G.clientY - y.current.getBoundingClientRect().top < 20
							? S({ startX: X, endX: ce, pivot: K, type: 'move' })
							: S({ startX: K, endX: K, type: 'resize' });
			},
			[e, g, y, u],
		),
		F = R.useCallback(
			(G) => {
				if (!y.current) return;
				const K = G.clientX - y.current.getBoundingClientRect().left,
					$ = un(g.width, e, K),
					X = t == null ? void 0 : t.actions.findLast((ge) => ge.startTime <= $);
				if (!G.buttons) {
					S(void 0);
					return;
				}
				if ((X && s(X), !v)) return;
				let ce = v;
				if (v.type === 'resize') ce = { ...v, endX: K };
				else {
					const ge = K - v.pivot;
					let J = v.startX + ge,
						se = v.endX + ge;
					J < 0 && ((J = 0), (se = J + (v.endX - v.startX))),
						se > g.width && ((se = g.width), (J = se - (v.endX - v.startX))),
						(ce = { ...v, startX: J, endX: se, pivot: K });
				}
				S(ce);
				const Ae = un(g.width, e, ce.startX),
					be = un(g.width, e, ce.endX);
				Ae !== be && d({ minimum: Math.min(Ae, be), maximum: Math.max(Ae, be) });
			},
			[e, v, g, t, s, y, d],
		),
		z = R.useCallback(() => {
			if ((_(void 0), !!v)) {
				if (v.startX !== v.endX) {
					const G = un(g.width, e, v.startX),
						K = un(g.width, e, v.endX);
					d({ minimum: Math.min(G, K), maximum: Math.max(G, K) });
				} else {
					const G = un(g.width, e, v.startX),
						K = t == null ? void 0 : t.actions.findLast(($) => $.startTime <= G);
					K && s(K), d(void 0);
				}
				S(void 0);
			}
		}, [e, v, g, t, d, s]),
		q = R.useCallback(
			(G) => {
				if (!y.current) return;
				const K = G.clientX - y.current.getBoundingClientRect().left,
					$ = un(g.width, e, K),
					X = t == null ? void 0 : t.actions.findLast((ce) => ce.startTime <= $);
				_({ x: K, clientY: G.clientY, action: X, sdkLanguage: p });
			},
			[e, g, t, y, p],
		),
		B = R.useCallback(() => {
			_(void 0);
		}, []),
		M = R.useCallback(() => {
			d(void 0);
		}, [d]);
	return w.jsxs('div', {
		style: { flex: 'none', borderBottom: '1px solid var(--vscode-panel-border)' },
		children: [
			!!v &&
				w.jsx(fg, {
					cursor: (v == null ? void 0 : v.type) === 'resize' ? 'ew-resize' : 'grab',
					onPaneMouseUp: z,
					onPaneMouseMove: F,
					onPaneDoubleClick: M,
				}),
			w.jsxs('div', {
				ref: y,
				className: 'timeline-view',
				onMouseDown: D,
				onMouseMove: q,
				onMouseLeave: B,
				children: [
					w.jsx('div', {
						className: 'timeline-grid',
						children: E.map((G, K) =>
							w.jsx(
								'div',
								{
									className: 'timeline-divider',
									style: { left: G.position + 'px' },
									children: w.jsx('div', {
										className: 'timeline-time',
										children: pt(G.time - e.minimum),
									}),
								},
								K,
							),
						),
					}),
					w.jsx('div', { style: { height: 8 } }),
					w.jsx(gk, { model: t, boundaries: e, previewPoint: k }),
					w.jsx('div', {
						className: 'timeline-bars',
						children: O.map((G, K) =>
							w.jsx(
								'div',
								{
									className: ze(
										'timeline-bar',
										G.action && 'action',
										G.resource && 'network',
										G.consoleMessage && 'console-message',
										G.active && 'active',
										G.error && 'error',
									),
									style: {
										left: G.leftPosition,
										width: Math.max(5, G.rightPosition - G.leftPosition),
										top: Sk(G),
										bottom: 0,
									},
								},
								K,
							),
						),
					}),
					w.jsx('div', {
						className: 'timeline-marker',
						style: {
							display: k !== void 0 ? 'block' : 'none',
							left: ((k == null ? void 0 : k.x) || 0) + 'px',
						},
					}),
					u &&
						w.jsxs('div', {
							className: 'timeline-window',
							children: [
								w.jsx('div', { className: 'timeline-window-curtain left', style: { width: C } }),
								w.jsx('div', { className: 'timeline-window-resizer', style: { left: -5 } }),
								w.jsx('div', {
									className: 'timeline-window-center',
									children: w.jsx('div', { className: 'timeline-window-drag' }),
								}),
								w.jsx('div', { className: 'timeline-window-resizer', style: { left: 5 } }),
								w.jsx('div', { className: 'timeline-window-curtain right', style: { width: A } }),
							],
						}),
				],
			}),
		],
	});
};
function wk(t, e) {
	let s = t / 64;
	const o = e.maximum - e.minimum,
		l = t / o;
	let c = o / s;
	const u = Math.ceil(Math.log(c) / Math.LN10);
	(c = Math.pow(10, u)), c * l >= 5 * 64 && (c = c / 5), c * l >= 2 * 64 && (c = c / 2);
	const d = e.minimum;
	let p = e.maximum;
	(p += 64 / l), (s = Math.ceil((p - d) / c)), c || (s = 0);
	const g = [];
	for (let y = 0; y < s; ++y) {
		const v = d + c * y;
		g.push({ position: Bt(t, e, v), time: v });
	}
	return g;
}
function Bt(t, e, n) {
	return ((n - e.minimum) / (e.maximum - e.minimum)) * t;
}
function un(t, e, n) {
	return (n / t) * (e.maximum - e.minimum) + e.minimum;
}
function Sk(t) {
	return t.resource ? 25 : 20;
}
const xk = ({ model: t }) => {
		var n, s;
		if (!t) return w.jsx(w.Fragment, {});
		const e =
			t.wallTime !== void 0
				? new Date(t.wallTime).toLocaleString(void 0, { timeZoneName: 'short' })
				: void 0;
		return w.jsxs('div', {
			'data-testid': 'metadata-view',
			className: 'vbox',
			style: { flexShrink: 0 },
			children: [
				w.jsx('div', { className: 'call-section', style: { paddingTop: 2 }, children: 'Time' }),
				!!e &&
					w.jsxs('div', {
						className: 'call-line',
						children: [
							'start time:',
							w.jsx('span', { className: 'call-value datetime', title: e, children: e }),
						],
					}),
				w.jsxs('div', {
					className: 'call-line',
					children: [
						'duration:',
						w.jsx('span', {
							className: 'call-value number',
							title: pt(t.endTime - t.startTime),
							children: pt(t.endTime - t.startTime),
						}),
					],
				}),
				w.jsx('div', { className: 'call-section', children: 'Browser' }),
				w.jsxs('div', {
					className: 'call-line',
					children: [
						'engine:',
						w.jsx('span', {
							className: 'call-value string',
							title: t.browserName,
							children: t.browserName,
						}),
					],
				}),
				t.channel &&
					w.jsxs('div', {
						className: 'call-line',
						children: [
							'channel:',
							w.jsx('span', {
								className: 'call-value string',
								title: t.channel,
								children: t.channel,
							}),
						],
					}),
				t.platform &&
					w.jsxs('div', {
						className: 'call-line',
						children: [
							'platform:',
							w.jsx('span', {
								className: 'call-value string',
								title: t.platform,
								children: t.platform,
							}),
						],
					}),
				t.options.userAgent &&
					w.jsxs('div', {
						className: 'call-line',
						children: [
							'user agent:',
							w.jsx('span', {
								className: 'call-value datetime',
								title: t.options.userAgent,
								children: t.options.userAgent,
							}),
						],
					}),
				t.options.baseURL &&
					w.jsxs(w.Fragment, {
						children: [
							w.jsx('div', {
								className: 'call-section',
								style: { paddingTop: 2 },
								children: 'Config',
							}),
							w.jsxs('div', {
								className: 'call-line',
								children: [
									'baseURL:',
									w.jsx('a', {
										className: 'call-value string',
										href: t.options.baseURL,
										title: t.options.baseURL,
										target: '_blank',
										rel: 'noopener noreferrer',
										children: t.options.baseURL,
									}),
								],
							}),
						],
					}),
				w.jsx('div', { className: 'call-section', children: 'Viewport' }),
				t.options.viewport &&
					w.jsxs('div', {
						className: 'call-line',
						children: [
							'width:',
							w.jsx('span', {
								className: 'call-value number',
								title: String(!!((n = t.options.viewport) != null && n.width)),
								children: t.options.viewport.width,
							}),
						],
					}),
				t.options.viewport &&
					w.jsxs('div', {
						className: 'call-line',
						children: [
							'height:',
							w.jsx('span', {
								className: 'call-value number',
								title: String(!!((s = t.options.viewport) != null && s.height)),
								children: t.options.viewport.height,
							}),
						],
					}),
				w.jsxs('div', {
					className: 'call-line',
					children: [
						'is mobile:',
						w.jsx('span', {
							className: 'call-value boolean',
							title: String(!!t.options.isMobile),
							children: String(!!t.options.isMobile),
						}),
					],
				}),
				t.options.deviceScaleFactor &&
					w.jsxs('div', {
						className: 'call-line',
						children: [
							'device scale:',
							w.jsx('span', {
								className: 'call-value number',
								title: String(t.options.deviceScaleFactor),
								children: String(t.options.deviceScaleFactor),
							}),
						],
					}),
				w.jsx('div', { className: 'call-section', children: 'Counts' }),
				w.jsxs('div', {
					className: 'call-line',
					children: [
						'pages:',
						w.jsx('span', { className: 'call-value number', children: t.pages.length }),
					],
				}),
				w.jsxs('div', {
					className: 'call-line',
					children: [
						'actions:',
						w.jsx('span', { className: 'call-value number', children: t.actions.length }),
					],
				}),
				w.jsxs('div', {
					className: 'call-line',
					children: [
						'events:',
						w.jsx('span', { className: 'call-value number', children: t.events.length }),
					],
				}),
			],
		});
	},
	_k = ({ annotations: t }) =>
		t.length
			? w.jsx('div', {
					className: 'annotations-tab',
					children: t.map((e, n) =>
						w.jsxs(
							'div',
							{
								className: 'annotation-item',
								children: [
									w.jsx('span', { style: { fontWeight: 'bold' }, children: e.type }),
									e.description && w.jsxs('span', { children: [': ', hg(e.description)] }),
								],
							},
							`annotation-${n}`,
						),
					),
				})
			: w.jsx(Ar, { text: 'No annotations' }),
	Ek = ({
		sdkLanguage: t,
		setIsInspecting: e,
		highlightedElement: n,
		setHighlightedElement: s,
	}) => {
		const [o, l] = R.useState(),
			c = R.useCallback(
				(u) => {
					const { errors: d } = ef(dv, u, { prettyErrors: !1 }),
						p = d.map((g) => ({
							message: g.message,
							line: g.range[1].line,
							column: g.range[1].col,
							type: 'subtle-error',
						}));
					l(p), s({ ...n, ariaSnapshot: u, lastEdited: 'ariaSnapshot' }), e(!1);
				},
				[n, s, e],
			);
		return w.jsxs('div', {
			style: {
				flex: 'auto',
				backgroundColor: 'var(--vscode-sideBar-background)',
				padding: '0 10px 10px 10px',
				overflow: 'auto',
			},
			children: [
				w.jsxs('div', {
					className: 'hbox',
					style: { lineHeight: '28px', color: 'var(--vscode-editorCodeLens-foreground)' },
					children: [
						w.jsx('div', { style: { flex: 'auto' }, children: 'Locator' }),
						w.jsx(qt, {
							icon: 'files',
							title: 'Copy locator',
							onClick: () => {
								Np(n.locator || '');
							},
						}),
					],
				}),
				w.jsx('div', {
					style: { height: 50 },
					children: w.jsx(ks, {
						text: n.locator || '',
						language: t,
						isFocused: !0,
						wrapLines: !0,
						onChange: (u) => {
							s({ ...n, locator: u, lastEdited: 'locator' }), e(!1);
						},
					}),
				}),
				w.jsxs('div', {
					className: 'hbox',
					style: { lineHeight: '28px', color: 'var(--vscode-editorCodeLens-foreground)' },
					children: [
						w.jsx('div', { style: { flex: 'auto' }, children: 'Aria snapshot' }),
						w.jsx(qt, {
							icon: 'files',
							title: 'Copy snapshot',
							onClick: () => {
								Np(n.ariaSnapshot || '');
							},
						}),
					],
				}),
				w.jsx('div', {
					style: { height: 150 },
					children: w.jsx(ks, {
						text: n.ariaSnapshot || '',
						language: 'yaml',
						wrapLines: !1,
						highlight: o,
						onChange: c,
					}),
				}),
			],
		});
	},
	Lk = ({
		model: t,
		showSourcesFirst: e,
		rootDir: n,
		fallbackLocation: s,
		isLive: o,
		hideTimeline: l,
		status: c,
		annotations: u,
		inert: d,
		onOpenExternally: p,
		revealSource: g,
		testRunMetadata: y,
	}) => {
		var Mn;
		const [v, S] = R.useState(void 0),
			[k, _] = R.useState(void 0),
			[E, C] = R.useState(void 0),
			[A, O] = R.useState(),
			[D, F] = R.useState(),
			[z, q] = R.useState(),
			[B, M] = R.useState('actions'),
			[G, K] = Es('propertiesTab', e ? 'source' : 'call'),
			[$, X] = R.useState(!1),
			[ce, Ae] = R.useState({ lastEdited: 'none' }),
			[be, ge] = R.useState(),
			[J, se] = Es('propertiesSidebarLocation', 'bottom'),
			Z = R.useCallback((le) => {
				S(le == null ? void 0 : le.callId), _(void 0);
			}, []),
			I = R.useMemo(() => (t == null ? void 0 : t.actions.find((le) => le.callId === A)), [t, A]),
			H = R.useCallback((le) => {
				O(le == null ? void 0 : le.callId);
			}, []),
			de = R.useMemo(() => (t == null ? void 0 : t.sources) || new Map(), [t]);
		R.useEffect(() => {
			ge(void 0), _(void 0);
		}, [t]);
		const fe = R.useMemo(() => {
				if (v) {
					const rn = t == null ? void 0 : t.actions.find((jt) => jt.callId === v);
					if (rn) return rn;
				}
				const le = t == null ? void 0 : t.failedAction();
				if (le) return le;
				if (t != null && t.actions.length) {
					let rn = t.actions.length - 1;
					for (let jt = 0; jt < t.actions.length; ++jt)
						if (t.actions[jt].title === 'After Hooks' && jt) {
							rn = jt - 1;
							break;
						}
					return t.actions[rn];
				}
			}, [t, v]),
			pe = R.useMemo(() => I || fe, [fe, I]),
			ye = R.useMemo(() => (k ? k.stack : pe == null ? void 0 : pe.stack), [pe, k]),
			Se = R.useCallback(
				(le) => {
					Z(le), H(void 0);
				},
				[Z, H],
			),
			he = R.useCallback(
				(le) => {
					K(le), le !== 'inspector' && X(!1);
				},
				[K],
			),
			_e = R.useCallback(
				(le) => {
					!$ && le && he('inspector'), X(le);
				},
				[X, he, $],
			),
			ct = R.useCallback(
				(le) => {
					Ae(le), he('inspector');
				},
				[he],
			),
			Mr = R.useCallback(
				(le) => {
					he('attachments'),
						C((rn) => {
							if (!rn) return [le, 0];
							const jt = rn[1];
							return [le, jt + 1];
						});
				},
				[he],
			);
		R.useEffect(() => {
			g && he('source');
		}, [g, he]);
		const jr = dS(t, be),
			ir = RS(t, be),
			Pr = lS(t),
			hn = (t == null ? void 0 : t.sdkLanguage) || 'javascript',
			Qi = {
				id: 'inspector',
				title: 'Locator',
				render: () =>
					w.jsx(Ek, {
						sdkLanguage: hn,
						setIsInspecting: _e,
						highlightedElement: ce,
						setHighlightedElement: Ae,
					}),
			},
			Rs = {
				id: 'call',
				title: 'Call',
				render: () =>
					w.jsx(C1, {
						action: pe,
						startTimeOffset: (t == null ? void 0 : t.startTime) ?? 0,
						sdkLanguage: hn,
					}),
			},
			Ji = { id: 'log', title: 'Log', render: () => w.jsx(I1, { action: pe, isLive: o }) },
			Ds = {
				id: 'errors',
				title: 'Errors',
				errorCount: Pr.errors.size,
				render: () =>
					w.jsx(cS, {
						errorsModel: Pr,
						model: t,
						testRunMetadata: y,
						sdkLanguage: hn,
						revealInSource: (le) => {
							le.action ? Z(le.action) : _(le), he('source');
						},
						wallTime: (t == null ? void 0 : t.wallTime) ?? 0,
					}),
			};
		let An;
		!fe && s && (An = (Mn = s.source) == null ? void 0 : Mn.errors.length);
		const nn = {
				id: 'source',
				title: 'Source',
				errorCount: An,
				render: () =>
					w.jsx(sS, {
						stack: ye,
						sources: de,
						rootDir: n,
						stackFrameLocation: J === 'bottom' ? 'right' : 'bottom',
						fallbackLocation: s,
						onOpenExternally: p,
					}),
			},
			Fs = {
				id: 'console',
				title: 'Console',
				count: jr.entries.length,
				render: () =>
					w.jsx(hS, {
						consoleModel: jr,
						boundaries: Or,
						selectedTime: be,
						onAccepted: (le) => ge({ minimum: le.timestamp, maximum: le.timestamp }),
						onEntryHovered: q,
					}),
			},
			Xi = {
				id: 'network',
				title: 'Network',
				count: ir.resources.length,
				render: () =>
					w.jsx(DS, {
						boundaries: Or,
						networkModel: ir,
						onEntryHovered: F,
						sdkLanguage: (t == null ? void 0 : t.sdkLanguage) ?? 'javascript',
					}),
			},
			Yi = {
				id: 'attachments',
				title: 'Attachments',
				count: t == null ? void 0 : t.visibleAttachments.length,
				render: () => w.jsx(Q1, { model: t, revealedAttachment: E }),
			},
			In = [Qi, Rs, Ji, Ds, Fs, Xi, nn, Yi];
		if (u !== void 0) {
			const le = {
				id: 'annotations',
				title: 'Annotations',
				count: u.length,
				render: () => w.jsx(_k, { annotations: u }),
			};
			In.push(le);
		}
		if (e) {
			const le = In.indexOf(nn);
			In.splice(le, 1), In.splice(1, 0, nn);
		}
		const { boundaries: Or } = R.useMemo(() => {
			const le = {
				minimum: (t == null ? void 0 : t.startTime) || 0,
				maximum: (t == null ? void 0 : t.endTime) || 3e4,
			};
			return (
				le.minimum > le.maximum && ((le.minimum = 0), (le.maximum = 3e4)),
				(le.maximum += (le.maximum - le.minimum) / 20),
				{ boundaries: le }
			);
		}, [t]);
		let Ln = 0;
		!o && t && t.endTime >= 0
			? (Ln = t.endTime - t.startTime)
			: t && t.wallTime && (Ln = Date.now() - t.wallTime);
		const $r = {
				id: 'actions',
				title: 'Actions',
				component: w.jsxs('div', {
					className: 'vbox',
					children: [
						c &&
							w.jsxs('div', {
								className: 'workbench-run-status',
								children: [
									w.jsx('span', { className: ze('codicon', ug(c)) }),
									w.jsx('div', { children: S1(c) }),
									w.jsx('div', { className: 'spacer' }),
									w.jsx('div', { className: 'workbench-run-duration', children: Ln ? pt(Ln) : '' }),
								],
							}),
						w.jsx(b1, {
							sdkLanguage: hn,
							actions: (t == null ? void 0 : t.actions) || [],
							selectedAction: t ? fe : void 0,
							selectedTime: be,
							setSelectedTime: ge,
							onSelected: Se,
							onHighlighted: H,
							revealAttachment: Mr,
							revealConsole: () => he('console'),
							isLive: o,
						}),
					],
				}),
			},
			Zi = { id: 'metadata', title: 'Metadata', component: w.jsx(xk, { model: t }) };
		return w.jsxs('div', {
			className: 'vbox workbench',
			...(d ? { inert: 'true' } : {}),
			children: [
				!l &&
					w.jsx(vk, {
						model: t,
						consoleEntries: jr.entries,
						boundaries: Or,
						highlightedAction: I,
						highlightedEntry: D,
						highlightedConsoleEntry: z,
						onSelected: Se,
						sdkLanguage: hn,
						selectedTime: be,
						setSelectedTime: ge,
					}),
				w.jsx(Pl, {
					sidebarSize: 250,
					orientation: J === 'bottom' ? 'vertical' : 'horizontal',
					settingName: 'propertiesSidebar',
					main: w.jsx(Pl, {
						sidebarSize: 250,
						orientation: 'horizontal',
						sidebarIsFirst: !0,
						settingName: 'actionListSidebar',
						main: w.jsx(lk, {
							action: pe,
							model: t,
							sdkLanguage: hn,
							testIdAttributeName: (t == null ? void 0 : t.testIdAttributeName) || 'data-testid',
							isInspecting: $,
							setIsInspecting: _e,
							highlightedElement: ce,
							setHighlightedElement: ct,
						}),
						sidebar: w.jsx(Mu, { tabs: [$r, Zi], selectedTab: B, setSelectedTab: M }),
					}),
					sidebar: w.jsx(Mu, {
						tabs: In,
						selectedTab: G,
						setSelectedTab: he,
						rightToolbar: [
							J === 'bottom'
								? w.jsx(qt, {
										title: 'Dock to right',
										icon: 'layout-sidebar-right-off',
										onClick: () => {
											se('right');
										},
									})
								: w.jsx(qt, {
										title: 'Dock to bottom',
										icon: 'layout-panel-off',
										onClick: () => {
											se('bottom');
										},
									}),
						],
						mode: J === 'bottom' ? 'default' : 'select',
					}),
				}),
			],
		});
	};
var Pm;
((t) => {
	function e(n) {
		for (const s of n.splice(0)) s.dispose();
	}
	t.disposeAll = e;
})(Pm || (Pm = {}));
class Ai {
	constructor() {
		(this._listeners = new Set()),
			(this.event = (e, n) => {
				this._listeners.add(e);
				let s = !1;
				const o = this,
					l = {
						dispose() {
							s || ((s = !0), o._listeners.delete(e));
						},
					};
				return n && n.push(l), l;
			});
	}
	fire(e) {
		const n = !this._deliveryQueue;
		this._deliveryQueue || (this._deliveryQueue = []);
		for (const s of this._listeners) this._deliveryQueue.push({ listener: s, event: e });
		if (n) {
			for (let s = 0; s < this._deliveryQueue.length; s++) {
				const { listener: o, event: l } = this._deliveryQueue[s];
				o.call(null, l);
			}
			this._deliveryQueue = void 0;
		}
	}
	dispose() {
		this._listeners.clear(), this._deliveryQueue && (this._deliveryQueue = []);
	}
}
class Mk {
	constructor(e) {
		this._ws = new WebSocket(e);
	}
	onmessage(e) {
		this._ws.addEventListener('message', (n) => e(n.data.toString()));
	}
	onopen(e) {
		this._ws.addEventListener('open', e);
	}
	onerror(e) {
		this._ws.addEventListener('error', e);
	}
	onclose(e) {
		this._ws.addEventListener('close', e);
	}
	send(e) {
		this._ws.send(e);
	}
	close() {
		this._ws.close();
	}
}
class jk {
	constructor(e) {
		(this._onCloseEmitter = new Ai()),
			(this._onReportEmitter = new Ai()),
			(this._onStdioEmitter = new Ai()),
			(this._onTestFilesChangedEmitter = new Ai()),
			(this._onLoadTraceRequestedEmitter = new Ai()),
			(this._lastId = 0),
			(this._callbacks = new Map()),
			(this._isClosed = !1),
			(this.onClose = this._onCloseEmitter.event),
			(this.onReport = this._onReportEmitter.event),
			(this.onStdio = this._onStdioEmitter.event),
			(this.onTestFilesChanged = this._onTestFilesChangedEmitter.event),
			(this.onLoadTraceRequested = this._onLoadTraceRequestedEmitter.event),
			(this._transport = e),
			this._transport.onmessage((s) => {
				const o = JSON.parse(s),
					{ id: l, result: c, error: u, method: d, params: p } = o;
				if (l) {
					const g = this._callbacks.get(l);
					if (!g) return;
					this._callbacks.delete(l), u ? g.reject(new Error(u)) : g.resolve(c);
				} else this._dispatchEvent(d, p);
			});
		const n = setInterval(() => this._sendMessage('ping').catch(() => {}), 3e4);
		(this._connectedPromise = new Promise((s, o) => {
			this._transport.onopen(s), this._transport.onerror(o);
		})),
			this._transport.onclose(() => {
				(this._isClosed = !0), this._onCloseEmitter.fire(), clearInterval(n);
			});
	}
	isClosed() {
		return this._isClosed;
	}
	async _sendMessage(e, n) {
		const s = globalThis.__logForTest;
		s == null || s({ method: e, params: n }), await this._connectedPromise;
		const o = ++this._lastId,
			l = { id: o, method: e, params: n };
		return (
			this._transport.send(JSON.stringify(l)),
			new Promise((c, u) => {
				this._callbacks.set(o, { resolve: c, reject: u });
			})
		);
	}
	_sendMessageNoReply(e, n) {
		this._sendMessage(e, n).catch(() => {});
	}
	_dispatchEvent(e, n) {
		e === 'report'
			? this._onReportEmitter.fire(n)
			: e === 'stdio'
				? this._onStdioEmitter.fire(n)
				: e === 'testFilesChanged'
					? this._onTestFilesChangedEmitter.fire(n)
					: e === 'loadTraceRequested' && this._onLoadTraceRequestedEmitter.fire(n);
	}
	async initialize(e) {
		await this._sendMessage('initialize', e);
	}
	async ping(e) {
		await this._sendMessage('ping', e);
	}
	async pingNoReply(e) {
		this._sendMessageNoReply('ping', e);
	}
	async watch(e) {
		await this._sendMessage('watch', e);
	}
	watchNoReply(e) {
		this._sendMessageNoReply('watch', e);
	}
	async open(e) {
		await this._sendMessage('open', e);
	}
	openNoReply(e) {
		this._sendMessageNoReply('open', e);
	}
	async resizeTerminal(e) {
		await this._sendMessage('resizeTerminal', e);
	}
	resizeTerminalNoReply(e) {
		this._sendMessageNoReply('resizeTerminal', e);
	}
	async checkBrowsers(e) {
		return await this._sendMessage('checkBrowsers', e);
	}
	async installBrowsers(e) {
		await this._sendMessage('installBrowsers', e);
	}
	async runGlobalSetup(e) {
		return await this._sendMessage('runGlobalSetup', e);
	}
	async runGlobalTeardown(e) {
		return await this._sendMessage('runGlobalTeardown', e);
	}
	async startDevServer(e) {
		return await this._sendMessage('startDevServer', e);
	}
	async stopDevServer(e) {
		return await this._sendMessage('stopDevServer', e);
	}
	async clearCache(e) {
		return await this._sendMessage('clearCache', e);
	}
	async listFiles(e) {
		return await this._sendMessage('listFiles', e);
	}
	async listTests(e) {
		return await this._sendMessage('listTests', e);
	}
	async runTests(e) {
		return await this._sendMessage('runTests', e);
	}
	async findRelatedTestFiles(e) {
		return await this._sendMessage('findRelatedTestFiles', e);
	}
	async stopTests(e) {
		await this._sendMessage('stopTests', e);
	}
	stopTestsNoReply(e) {
		this._sendMessageNoReply('stopTests', e);
	}
	async closeGracefully(e) {
		await this._sendMessage('closeGracefully', e);
	}
	close() {
		try {
			this._transport.close();
		} catch {}
	}
}
const kk = ({ settings: t }) =>
		w.jsx('div', {
			className: 'vbox settings-view',
			children: t.map(({ value: e, set: n, name: s, title: o }) => {
				const l = `setting-${s}`;
				return w.jsxs(
					'div',
					{
						className: 'setting',
						title: o,
						children: [
							w.jsx('input', { type: 'checkbox', id: l, checked: e, onChange: () => n(!e) }),
							w.jsx('label', { htmlFor: l, children: s }),
						],
					},
					s,
				);
			}),
		}),
	Pk = () => {
		const [t, e] = Es('shouldPopulateCanvasFromScreenshot', !1),
			[n, s] = k0();
		return w.jsx(kk, {
			settings: [
				{ value: n, set: s, name: 'Dark mode' },
				{
					value: t,
					set: e,
					name: 'Display canvas content',
					title:
						'Attempt to display the captured canvas appearance in the snapshot preview. May not be accurate.',
				},
			],
		});
	};
export {
	Pk as D,
	W1 as E,
	Ik as M,
	Mt as R,
	Pl as S,
	qt as T,
	Mk as W,
	F1 as _,
	jk as a,
	Lk as b,
	Tk as c,
	Ak as d,
	Nu as e,
	Ck as f,
	Nk as g,
	ze as h,
	v1 as i,
	w as j,
	Zu as k,
	Es as l,
	pt as m,
	g0 as n,
	R as r,
	Sr as s,
	ug as t,
	Nr as u,
};

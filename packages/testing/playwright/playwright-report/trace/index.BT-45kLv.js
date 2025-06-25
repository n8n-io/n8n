import {
	r as s,
	j as e,
	T as F,
	D as M,
	M as E,
	a as B,
	W as C,
	b as U,
	c as z,
	d as I,
} from './assets/defaultSettingsView-CzQxXsO4.js';
const A = ({
		className: n,
		style: o,
		open: r,
		width: a,
		verticalOffset: d,
		requestClose: u,
		anchor: h,
		dataTestId: T,
		children: y,
	}) => {
		const w = s.useRef(null),
			[b, x] = s.useState(0);
		let S = o;
		if (h != null && h.current) {
			const g = h.current.getBoundingClientRect();
			S = {
				position: 'fixed',
				margin: 0,
				top: g.bottom + (d ?? 0),
				left: O(g, a),
				width: a,
				zIndex: 1,
				...o,
			};
		}
		return (
			s.useEffect(() => {
				const g = (j) => {
						!w.current ||
							!(j.target instanceof Node) ||
							w.current.contains(j.target) ||
							u == null ||
							u();
					},
					p = (j) => {
						j.key === 'Escape' && (u == null || u());
					};
				return r
					? (document.addEventListener('mousedown', g),
						document.addEventListener('keydown', p),
						() => {
							document.removeEventListener('mousedown', g),
								document.removeEventListener('keydown', p);
						})
					: () => {};
			}, [r, u]),
			s.useEffect(() => {
				const g = () => x((p) => p + 1);
				return (
					window.addEventListener('resize', g),
					() => {
						window.removeEventListener('resize', g);
					}
				);
			}, []),
			r &&
				e.jsx('dialog', { ref: w, style: S, className: n, 'data-testid': T, open: !0, children: y })
		);
	},
	O = (n, o) => {
		const r = N(n, o, 'left');
		if (r.inBounds) return r.value;
		const a = N(n, o, 'right');
		return a.inBounds ? a.value : r.value;
	},
	N = (n, o, r) => {
		const a = document.documentElement.clientWidth;
		if (r === 'left') {
			const d = n.left;
			return { value: d, inBounds: d + o <= a };
		} else return { value: n.right - o, inBounds: n.right - o >= 0 };
	},
	V = () => {
		const n = s.useRef(null),
			[o, r] = s.useState(!1);
		return e.jsxs(e.Fragment, {
			children: [
				e.jsx(F, { ref: n, icon: 'settings-gear', title: 'Settings', onClick: () => r((a) => !a) }),
				e.jsx(A, {
					style: { backgroundColor: 'var(--vscode-sideBar-background)', padding: '4px 8px' },
					open: o,
					width: 200,
					verticalOffset: 8,
					requestClose: () => r(!1),
					anchor: n,
					dataTestId: 'settings-toolbar-dialog',
					children: e.jsx(M, {}),
				}),
			],
		});
	},
	$ = () => {
		const [n, o] = s.useState(!1),
			[r, a] = s.useState([]),
			[d, u] = s.useState([]),
			[h, T] = s.useState(D),
			[y, w] = s.useState({ done: 0, total: 0 }),
			[b, x] = s.useState(!1),
			[S, g] = s.useState(null),
			[p, j] = s.useState(null),
			L = s.useCallback((t) => {
				const c = [],
					l = [],
					i = new URL(window.location.href);
				for (let f = 0; f < t.length; f++) {
					const v = t.item(f);
					if (!v) continue;
					const R = URL.createObjectURL(v);
					c.push(R),
						l.push(v.name),
						i.searchParams.append('trace', R),
						i.searchParams.append('traceFileName', v.name);
				}
				const m = i.toString();
				window.history.pushState({}, '', m), a(c), u(l), x(!1), g(null);
			}, []);
		s.useEffect(() => {
			const t = async (c) => {
				var l;
				if ((l = c.clipboardData) != null && l.files.length) {
					for (const i of c.clipboardData.files) if (i.type !== 'application/zip') return;
					c.preventDefault(), L(c.clipboardData.files);
				}
			};
			return document.addEventListener('paste', t), () => document.removeEventListener('paste', t);
		}),
			s.useEffect(() => {
				const t = (c) => {
					const { method: l, params: i } = c.data;
					if (l !== 'load' || !((i == null ? void 0 : i.trace) instanceof Blob)) return;
					const m = new File([i.trace], 'trace.zip', { type: 'application/zip' }),
						f = new DataTransfer();
					f.items.add(m), L(f.files);
				};
				return (
					window.addEventListener('message', t), () => window.removeEventListener('message', t)
				);
			});
		const P = s.useCallback(
				(t) => {
					t.preventDefault(), L(t.dataTransfer.files);
				},
				[L],
			),
			W = s.useCallback(
				(t) => {
					t.preventDefault(), t.target.files && L(t.target.files);
				},
				[L],
			);
		s.useEffect(() => {
			const t = new URL(window.location.href).searchParams,
				c = t.getAll('trace');
			o(t.has('isServer'));
			for (const l of c)
				if (l.startsWith('file:')) {
					j(l || null);
					return;
				}
			if (t.has('isServer')) {
				const l = new URLSearchParams(window.location.search).get('ws'),
					i = new URL(`../${l}`, window.location.toString());
				i.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
				const m = new B(new C(i));
				m.onLoadTraceRequested(async (f) => {
					a(f.traceUrl ? [f.traceUrl] : []), x(!1), g(null);
				}),
					m.initialize({}).catch(() => {});
			} else c.some((l) => l.startsWith('blob:')) || a(c);
		}, []),
			s.useEffect(() => {
				(async () => {
					if (r.length) {
						const t = (i) => {
							i.data.method === 'progress' && w(i.data.params);
						};
						navigator.serviceWorker.addEventListener('message', t), w({ done: 0, total: 1 });
						const c = [];
						for (let i = 0; i < r.length; i++) {
							const m = r[i],
								f = new URLSearchParams();
							f.set('trace', m),
								d.length && f.set('traceFileName', d[i]),
								f.set('limit', String(r.length));
							const v = await fetch(`contexts?${f.toString()}`);
							if (!v.ok) {
								n || a([]), g((await v.json()).error);
								return;
							}
							c.push(...(await v.json()));
						}
						navigator.serviceWorker.removeEventListener('message', t);
						const l = new E(c);
						w({ done: 0, total: 0 }), T(l);
					} else T(D);
				})();
			}, [n, r, d]);
		const k = !!(!n && !b && !p && (!r.length || S));
		return e.jsxs('div', {
			className: 'vbox workbench-loader',
			onDragOver: (t) => {
				t.preventDefault(), x(!0);
			},
			children: [
				e.jsxs('div', {
					className: 'hbox header',
					...(k ? { inert: 'true' } : {}),
					children: [
						e.jsx('div', {
							className: 'logo',
							children: e.jsx('img', { src: 'playwright-logo.svg', alt: 'Playwright logo' }),
						}),
						e.jsx('div', { className: 'product', children: 'Playwright' }),
						h.title && e.jsx('div', { className: 'title', children: h.title }),
						e.jsx('div', { className: 'spacer' }),
						e.jsx(V, {}),
					],
				}),
				e.jsx('div', {
					className: 'progress',
					children: e.jsx('div', {
						className: 'inner-progress',
						style: { width: y.total ? (100 * y.done) / y.total + '%' : 0 },
					}),
				}),
				e.jsx(U, { model: h, inert: k }),
				p &&
					e.jsxs('div', {
						className: 'drop-target',
						children: [
							e.jsx('div', {
								children: 'Trace Viewer uses Service Workers to show traces. To view trace:',
							}),
							e.jsxs('div', {
								style: { paddingTop: 20 },
								children: [
									e.jsxs('div', {
										children: [
											'1. Click ',
											e.jsx('a', { href: p, children: 'here' }),
											' to put your trace into the download shelf',
										],
									}),
									e.jsxs('div', {
										children: [
											'2. Go to ',
											e.jsx('a', {
												href: 'https://trace.playwright.dev',
												children: 'trace.playwright.dev',
											}),
										],
									}),
									e.jsx('div', {
										children: '3. Drop the trace from the download shelf into the page',
									}),
								],
							}),
						],
					}),
				k &&
					e.jsxs('div', {
						className: 'drop-target',
						children: [
							e.jsx('div', { className: 'processing-error', role: 'alert', children: S }),
							e.jsx('div', {
								className: 'title',
								role: 'heading',
								'aria-level': 1,
								children: 'Drop Playwright Trace to load',
							}),
							e.jsx('div', { children: 'or' }),
							e.jsx('button', {
								onClick: () => {
									const t = document.createElement('input');
									(t.type = 'file'),
										(t.multiple = !0),
										t.click(),
										t.addEventListener('change', (c) => W(c));
								},
								type: 'button',
								children: 'Select file(s)',
							}),
							e.jsx('div', {
								style: { maxWidth: 400 },
								children:
									'Playwright Trace Viewer is a Progressive Web App, it does not send your trace anywhere, it opens it locally.',
							}),
						],
					}),
				n &&
					!r.length &&
					e.jsx('div', {
						className: 'drop-target',
						children: e.jsx('div', {
							className: 'title',
							children: 'Select test to see the trace',
						}),
					}),
				b &&
					e.jsx('div', {
						className: 'drop-target',
						onDragLeave: () => {
							x(!1);
						},
						onDrop: (t) => P(t),
						children: e.jsx('div', {
							className: 'title',
							children: 'Release to analyse the Playwright Trace',
						}),
					}),
			],
		});
	},
	D = new E([]),
	G = ({ traceJson: n }) => {
		const [o, r] = s.useState(void 0),
			[a, d] = s.useState(0),
			u = s.useRef(null);
		return (
			s.useEffect(
				() => (
					u.current && clearTimeout(u.current),
					(u.current = setTimeout(async () => {
						try {
							const h = await H(n);
							r(h);
						} catch {
							const h = new E([]);
							r(h);
						} finally {
							d(a + 1);
						}
					}, 500)),
					() => {
						u.current && clearTimeout(u.current);
					}
				),
				[n, a],
			),
			e.jsx(U, { model: o, isLive: !0 })
		);
	};
async function H(n) {
	const o = new URLSearchParams();
	o.set('trace', n), o.set('limit', '1');
	const a = await (await fetch(`contexts?${o.toString()}`)).json();
	return new E(a);
}
(async () => {
	const n = new URLSearchParams(window.location.search);
	if ((z(), window.location.protocol !== 'file:')) {
		if (
			(n.get('isUnderTest') === 'true' && (await new Promise((d) => setTimeout(d, 1e3))),
			!navigator.serviceWorker)
		)
			throw new Error(`Service workers are not supported.
Make sure to serve the Trace Viewer (${window.location}) via HTTPS or localhost.`);
		navigator.serviceWorker.register('sw.bundle.js'),
			navigator.serviceWorker.controller ||
				(await new Promise((d) => {
					navigator.serviceWorker.oncontrollerchange = () => d();
				})),
			setInterval(function () {
				fetch('ping');
			}, 1e4);
	}
	const o = n.get('trace'),
		a = (o == null ? void 0 : o.endsWith('.json')) ? e.jsx(G, { traceJson: o }) : e.jsx($, {});
	I.createRoot(document.querySelector('#root')).render(a);
})();

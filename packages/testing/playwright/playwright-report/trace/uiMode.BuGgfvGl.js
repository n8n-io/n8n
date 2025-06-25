const __vite__mapDeps = (
	i,
	m = __vite__mapDeps,
	d = m.f || (m.f = ['./assets/xtermModule-BoAIEibi.js', './xtermModule.Beg8tuEN.css']),
) => i.map((i) => d[i]);
import {
	u as Mt,
	r as K,
	e as Dt,
	_ as Ft,
	f as Ot,
	g as At,
	j as o,
	R as u,
	E as Ut,
	s as vt,
	h as at,
	i as Wt,
	t as zt,
	m as Vt,
	k as Y,
	T as F,
	M as St,
	b as Kt,
	l as $t,
	a as Ht,
	W as qt,
	S as Yt,
	D as Qt,
	c as Xt,
	d as Jt,
} from './assets/defaultSettingsView-CzQxXsO4.js';
var Zt = {};
class ot {
	constructor(t, e = {}) {
		(this.isListing = !1),
			(this._tests = new Map()),
			(this._rootSuite = new Q('', 'root')),
			(this._options = e),
			(this._reporter = t);
	}
	reset() {
		(this._rootSuite._entries = []), this._tests.clear();
	}
	dispatch(t) {
		const { method: e, params: s } = t;
		if (e === 'onConfigure') {
			this._onConfigure(s.config);
			return;
		}
		if (e === 'onProject') {
			this._onProject(s.project);
			return;
		}
		if (e === 'onBegin') {
			this._onBegin();
			return;
		}
		if (e === 'onTestBegin') {
			this._onTestBegin(s.testId, s.result);
			return;
		}
		if (e === 'onTestEnd') {
			this._onTestEnd(s.test, s.result);
			return;
		}
		if (e === 'onStepBegin') {
			this._onStepBegin(s.testId, s.resultId, s.step);
			return;
		}
		if (e === 'onAttach') {
			this._onAttach(s.testId, s.resultId, s.attachments);
			return;
		}
		if (e === 'onStepEnd') {
			this._onStepEnd(s.testId, s.resultId, s.step);
			return;
		}
		if (e === 'onError') {
			this._onError(s.error);
			return;
		}
		if (e === 'onStdIO') {
			this._onStdIO(s.type, s.testId, s.resultId, s.data, s.isBase64);
			return;
		}
		if (e === 'onEnd') return this._onEnd(s.result);
		if (e === 'onExit') return this._onExit();
	}
	_onConfigure(t) {
		var e, s;
		(this._rootDir = t.rootDir),
			(this._config = this._parseConfig(t)),
			(s = (e = this._reporter).onConfigure) == null || s.call(e, this._config);
	}
	_onProject(t) {
		let e = this._options.mergeProjects
			? this._rootSuite.suites.find((s) => s.project().name === t.name)
			: void 0;
		e || ((e = new Q(t.name, 'project')), this._rootSuite._addSuite(e)),
			(e._project = this._parseProject(t));
		for (const s of t.suites) this._mergeSuiteInto(s, e);
	}
	_onBegin() {
		var t, e;
		(e = (t = this._reporter).onBegin) == null || e.call(t, this._rootSuite);
	}
	_onTestBegin(t, e) {
		var c, n;
		const s = this._tests.get(t);
		this._options.clearPreviousResultsWhenTestBegins && (s.results = []);
		const i = s._createTestResult(e.id);
		(i.retry = e.retry),
			(i.workerIndex = e.workerIndex),
			(i.parallelIndex = e.parallelIndex),
			i.setStartTimeNumber(e.startTime),
			(n = (c = this._reporter).onTestBegin) == null || n.call(c, s, i);
	}
	_onTestEnd(t, e) {
		var c, n, g;
		const s = this._tests.get(t.testId);
		(s.timeout = t.timeout), (s.expectedStatus = t.expectedStatus);
		const i = s.results.find((l) => l._id === e.id);
		(i.duration = e.duration),
			(i.status = e.status),
			(i.errors = e.errors),
			(i.error = (c = i.errors) == null ? void 0 : c[0]),
			e.attachments && (i.attachments = this._parseAttachments(e.attachments)),
			e.annotations && ((i.annotations = e.annotations), (s.annotations = i.annotations)),
			(g = (n = this._reporter).onTestEnd) == null || g.call(n, s, i),
			(i._stepMap = new Map());
	}
	_onStepBegin(t, e, s) {
		var _, a;
		const i = this._tests.get(t),
			c = i.results.find((h) => h._id === e),
			n = s.parentStepId ? c._stepMap.get(s.parentStepId) : void 0,
			g = this._absoluteLocation(s.location),
			l = new te(s, n, g, c);
		n ? n.steps.push(l) : c.steps.push(l),
			c._stepMap.set(s.id, l),
			(a = (_ = this._reporter).onStepBegin) == null || a.call(_, i, c, l);
	}
	_onStepEnd(t, e, s) {
		var g, l;
		const i = this._tests.get(t),
			c = i.results.find((_) => _._id === e),
			n = c._stepMap.get(s.id);
		(n._endPayload = s),
			(n.duration = s.duration),
			(n.error = s.error),
			(l = (g = this._reporter).onStepEnd) == null || l.call(g, i, c, n);
	}
	_onAttach(t, e, s) {
		this._tests
			.get(t)
			.results.find((n) => n._id === e)
			.attachments.push(
				...s.map((n) => ({
					name: n.name,
					contentType: n.contentType,
					path: n.path,
					body: n.base64 && globalThis.Buffer ? Buffer.from(n.base64, 'base64') : void 0,
				})),
			);
	}
	_onError(t) {
		var e, s;
		(s = (e = this._reporter).onError) == null || s.call(e, t);
	}
	_onStdIO(t, e, s, i, c) {
		var _, a, h, v;
		const n = c ? (globalThis.Buffer ? Buffer.from(i, 'base64') : atob(i)) : i,
			g = e ? this._tests.get(e) : void 0,
			l = g && s ? g.results.find((d) => d._id === s) : void 0;
		t === 'stdout'
			? (l == null || l.stdout.push(n),
				(a = (_ = this._reporter).onStdOut) == null || a.call(_, n, g, l))
			: (l == null || l.stderr.push(n),
				(v = (h = this._reporter).onStdErr) == null || v.call(h, n, g, l));
	}
	async _onEnd(t) {
		var e, s;
		await ((s = (e = this._reporter).onEnd) == null
			? void 0
			: s.call(e, { status: t.status, startTime: new Date(t.startTime), duration: t.duration }));
	}
	_onExit() {
		var t, e;
		return (e = (t = this._reporter).onExit) == null ? void 0 : e.call(t);
	}
	_parseConfig(t) {
		const e = { ...se, ...t };
		return (
			this._options.configOverrides &&
				((e.configFile = this._options.configOverrides.configFile),
				(e.reportSlowTests = this._options.configOverrides.reportSlowTests),
				(e.quiet = this._options.configOverrides.quiet),
				(e.reporter = [...this._options.configOverrides.reporter])),
			e
		);
	}
	_parseProject(t) {
		return {
			metadata: t.metadata,
			name: t.name,
			outputDir: this._absolutePath(t.outputDir),
			repeatEach: t.repeatEach,
			retries: t.retries,
			testDir: this._absolutePath(t.testDir),
			testIgnore: st(t.testIgnore),
			testMatch: st(t.testMatch),
			timeout: t.timeout,
			grep: st(t.grep),
			grepInvert: st(t.grepInvert),
			dependencies: t.dependencies,
			teardown: t.teardown,
			snapshotDir: this._absolutePath(t.snapshotDir),
			use: t.use,
		};
	}
	_parseAttachments(t) {
		return t.map((e) => ({
			...e,
			body: e.base64 && globalThis.Buffer ? Buffer.from(e.base64, 'base64') : void 0,
		}));
	}
	_mergeSuiteInto(t, e) {
		let s = e.suites.find((i) => i.title === t.title);
		s || ((s = new Q(t.title, e.type === 'project' ? 'file' : 'describe')), e._addSuite(s)),
			(s.location = this._absoluteLocation(t.location)),
			t.entries.forEach((i) => {
				'testId' in i ? this._mergeTestInto(i, s) : this._mergeSuiteInto(i, s);
			});
	}
	_mergeTestInto(t, e) {
		let s = this._options.mergeTestCases
			? e.tests.find((i) => i.title === t.title && i.repeatEachIndex === t.repeatEachIndex)
			: void 0;
		s ||
			((s = new Gt(t.testId, t.title, this._absoluteLocation(t.location), t.repeatEachIndex)),
			e._addTest(s),
			this._tests.set(s.id, s)),
			this._updateTest(t, s);
	}
	_updateTest(t, e) {
		return (
			(e.id = t.testId),
			(e.location = this._absoluteLocation(t.location)),
			(e.retries = t.retries),
			(e.tags = t.tags ?? []),
			(e.annotations = t.annotations ?? []),
			e
		);
	}
	_absoluteLocation(t) {
		return t && { ...t, file: this._absolutePath(t.file) };
	}
	_absolutePath(t) {
		if (t !== void 0)
			return this._options.resolvePath
				? this._options.resolvePath(this._rootDir, t)
				: this._rootDir + '/' + t;
	}
}
class Q {
	constructor(t, e) {
		(this._entries = []),
			(this._requireFile = ''),
			(this._parallelMode = 'none'),
			(this.title = t),
			(this._type = e);
	}
	get type() {
		return this._type;
	}
	get suites() {
		return this._entries.filter((t) => t.type !== 'test');
	}
	get tests() {
		return this._entries.filter((t) => t.type === 'test');
	}
	entries() {
		return this._entries;
	}
	allTests() {
		const t = [],
			e = (s) => {
				for (const i of s.entries()) i.type === 'test' ? t.push(i) : e(i);
			};
		return e(this), t;
	}
	titlePath() {
		const t = this.parent ? this.parent.titlePath() : [];
		return (this.title || this._type !== 'describe') && t.push(this.title), t;
	}
	project() {
		var t;
		return this._project ?? ((t = this.parent) == null ? void 0 : t.project());
	}
	_addTest(t) {
		(t.parent = this), this._entries.push(t);
	}
	_addSuite(t) {
		(t.parent = this), this._entries.push(t);
	}
}
class Gt {
	constructor(t, e, s, i) {
		(this.fn = () => {}),
			(this.results = []),
			(this.type = 'test'),
			(this.expectedStatus = 'passed'),
			(this.timeout = 0),
			(this.annotations = []),
			(this.retries = 0),
			(this.tags = []),
			(this.repeatEachIndex = 0),
			(this.id = t),
			(this.title = e),
			(this.location = s),
			(this.repeatEachIndex = i);
	}
	titlePath() {
		const t = this.parent ? this.parent.titlePath() : [];
		return t.push(this.title), t;
	}
	outcome() {
		return ie(this);
	}
	ok() {
		const t = this.outcome();
		return t === 'expected' || t === 'flaky' || t === 'skipped';
	}
	_createTestResult(t) {
		const e = new ee(this.results.length, t);
		return this.results.push(e), e;
	}
}
class te {
	constructor(t, e, s, i) {
		(this.duration = -1),
			(this.steps = []),
			(this._startTime = 0),
			(this.title = t.title),
			(this.category = t.category),
			(this.location = s),
			(this.parent = e),
			(this._startTime = t.startTime),
			(this._result = i);
	}
	titlePath() {
		var e;
		return [...(((e = this.parent) == null ? void 0 : e.titlePath()) || []), this.title];
	}
	get startTime() {
		return new Date(this._startTime);
	}
	set startTime(t) {
		this._startTime = +t;
	}
	get attachments() {
		var t, e;
		return (
			((e = (t = this._endPayload) == null ? void 0 : t.attachments) == null
				? void 0
				: e.map((s) => this._result.attachments[s])) ?? []
		);
	}
	get annotations() {
		var t;
		return ((t = this._endPayload) == null ? void 0 : t.annotations) ?? [];
	}
}
class ee {
	constructor(t, e) {
		(this.parallelIndex = -1),
			(this.workerIndex = -1),
			(this.duration = -1),
			(this.stdout = []),
			(this.stderr = []),
			(this.attachments = []),
			(this.annotations = []),
			(this.status = 'skipped'),
			(this.steps = []),
			(this.errors = []),
			(this._stepMap = new Map()),
			(this._startTime = 0),
			(this.retry = t),
			(this._id = e);
	}
	setStartTimeNumber(t) {
		this._startTime = t;
	}
	get startTime() {
		return new Date(this._startTime);
	}
	set startTime(t) {
		this._startTime = +t;
	}
}
const se = {
	forbidOnly: !1,
	fullyParallel: !1,
	globalSetup: null,
	globalTeardown: null,
	globalTimeout: 0,
	grep: /.*/,
	grepInvert: null,
	maxFailures: 0,
	metadata: {},
	preserveOutput: 'always',
	projects: [],
	reporter: [[Zt.CI ? 'dot' : 'list']],
	reportSlowTests: { max: 5, threshold: 3e5 },
	configFile: '',
	rootDir: '',
	quiet: !1,
	shard: null,
	updateSnapshots: 'missing',
	updateSourceMethod: 'patch',
	version: '',
	workers: 0,
	webServer: null,
};
function st(r) {
	return r.map((t) => (t.s !== void 0 ? t.s : new RegExp(t.r.source, t.r.flags)));
}
function ie(r) {
	let t = 0,
		e = 0,
		s = 0;
	for (const i of r.results)
		i.status === 'interrupted' ||
			(i.status === 'skipped' && r.expectedStatus === 'skipped'
				? ++t
				: i.status === 'skipped' || (i.status === r.expectedStatus ? ++e : ++s));
	return e === 0 && s === 0
		? 'skipped'
		: s === 0
			? 'expected'
			: e === 0 && t === 0
				? 'unexpected'
				: 'flaky';
}
class nt {
	constructor(t, e, s, i, c) {
		(this._treeItemById = new Map()), (this._treeItemByTestId = new Map());
		const n = i && [...i.values()].some(Boolean);
		(this.pathSeparator = c),
			(this.rootItem = {
				kind: 'group',
				subKind: 'folder',
				id: t,
				title: '',
				location: { file: '', line: 0, column: 0 },
				duration: 0,
				parent: void 0,
				children: [],
				status: 'none',
				hasLoadErrors: !1,
			}),
			this._treeItemById.set(t, this.rootItem);
		const g = (l, _, a) => {
			for (const h of _.suites) {
				if (!h.title) {
					g(l, h, a);
					continue;
				}
				let v = a.children.find((d) => d.kind === 'group' && d.title === h.title);
				v ||
					((v = {
						kind: 'group',
						subKind: 'describe',
						id: 'suite:' + _.titlePath().join('') + '' + h.title,
						title: h.title,
						location: h.location,
						duration: 0,
						parent: a,
						children: [],
						status: 'none',
						hasLoadErrors: !1,
					}),
					this._addChild(a, v)),
					g(l, h, v);
			}
			for (const h of _.tests) {
				const v = h.title;
				let d = a.children.find((C) => C.kind !== 'group' && C.title === v);
				d ||
					((d = {
						kind: 'case',
						id: 'test:' + h.titlePath().join(''),
						title: v,
						parent: a,
						children: [],
						tests: [],
						location: h.location,
						duration: 0,
						status: 'none',
						project: void 0,
						test: void 0,
						tags: h.tags,
					}),
					this._addChild(a, d));
				const S = h.results[0];
				let b = 'none';
				(S == null ? void 0 : S[X]) === 'scheduled'
					? (b = 'scheduled')
					: (S == null ? void 0 : S[X]) === 'running'
						? (b = 'running')
						: (S == null ? void 0 : S.status) === 'skipped'
							? (b = 'skipped')
							: (S == null ? void 0 : S.status) === 'interrupted'
								? (b = 'none')
								: S && h.outcome() !== 'expected'
									? (b = 'failed')
									: S && h.outcome() === 'expected' && (b = 'passed'),
					d.tests.push(h);
				const B = {
					kind: 'test',
					id: h.id,
					title: l.name,
					location: h.location,
					test: h,
					parent: d,
					children: [],
					status: b,
					duration: h.results.length ? Math.max(0, h.results[0].duration) : 0,
					project: l,
				};
				this._addChild(d, B),
					this._treeItemByTestId.set(h.id, B),
					(d.duration = d.children.reduce((C, T) => C + T.duration, 0));
			}
		};
		for (const l of (e == null ? void 0 : e.suites) || [])
			if (!(n && !i.get(l.title)))
				for (const _ of l.suites) {
					const a = this._fileItem(_.location.file.split(c), !0);
					g(l.project(), _, a);
				}
		for (const l of s) {
			if (!l.location) continue;
			const _ = this._fileItem(l.location.file.split(c), !0);
			_.hasLoadErrors = !0;
		}
	}
	_addChild(t, e) {
		t.children.push(e), (e.parent = t), this._treeItemById.set(e.id, e);
	}
	filterTree(t, e, s) {
		const i = t.trim().toLowerCase().split(' '),
			c = [...e.values()].some(Boolean),
			n = (l) => {
				const _ = [...l.tests[0].titlePath(), ...l.tests[0].tags].join(' ').toLowerCase();
				return !i.every((a) => _.includes(a)) &&
					!l.tests.some((a) => (s == null ? void 0 : s.has(a.id)))
					? !1
					: ((l.children = l.children.filter(
							(a) => !c || (s == null ? void 0 : s.has(a.test.id)) || e.get(a.status),
						)),
						(l.tests = l.children.map((a) => a.test)),
						!!l.children.length);
			},
			g = (l) => {
				const _ = [];
				for (const a of l.children)
					a.kind === 'case'
						? n(a) && _.push(a)
						: (g(a), (a.children.length || a.hasLoadErrors) && _.push(a));
				l.children = _;
			};
		g(this.rootItem);
	}
	_fileItem(t, e) {
		if (t.length === 0) return this.rootItem;
		const s = t.join(this.pathSeparator),
			i = this._treeItemById.get(s);
		if (i) return i;
		const c = this._fileItem(t.slice(0, t.length - 1), !1),
			n = {
				kind: 'group',
				subKind: e ? 'file' : 'folder',
				id: s,
				title: t[t.length - 1],
				location: { file: s, line: 0, column: 0 },
				duration: 0,
				parent: c,
				children: [],
				status: 'none',
				hasLoadErrors: !1,
			};
		return this._addChild(c, n), n;
	}
	sortAndPropagateStatus() {
		bt(this.rootItem);
	}
	flattenForSingleProject() {
		const t = (e) => {
			e.kind === 'case' && e.children.length === 1
				? ((e.project = e.children[0].project),
					(e.test = e.children[0].test),
					(e.children = []),
					this._treeItemByTestId.set(e.test.id, e))
				: e.children.forEach(t);
		};
		t(this.rootItem);
	}
	shortenRoot() {
		let t = this.rootItem;
		for (
			;
			t.children.length === 1 &&
			t.children[0].kind === 'group' &&
			t.children[0].subKind === 'folder';
		)
			t = t.children[0];
		(t.location = this.rootItem.location), (this.rootItem = t);
	}
	testIds() {
		const t = new Set(),
			e = (s) => {
				s.kind === 'case' && s.tests.forEach((i) => t.add(i.id)), s.children.forEach(e);
			};
		return e(this.rootItem), t;
	}
	fileNames() {
		const t = new Set(),
			e = (s) => {
				s.kind === 'group' && s.subKind === 'file' ? t.add(s.id) : s.children.forEach(e);
			};
		return e(this.rootItem), [...t];
	}
	flatTreeItems() {
		const t = [],
			e = (s) => {
				t.push(s), s.children.forEach(e);
			};
		return e(this.rootItem), t;
	}
	treeItemById(t) {
		return this._treeItemById.get(t);
	}
	collectTestIds(t) {
		return t ? re(t) : new Set();
	}
}
function bt(r) {
	for (const n of r.children) bt(n);
	r.kind === 'group' &&
		r.children.sort(
			(n, g) => n.location.file.localeCompare(g.location.file) || n.location.line - g.location.line,
		);
	let t = r.children.length > 0,
		e = r.children.length > 0,
		s = !1,
		i = !1,
		c = !1;
	for (const n of r.children)
		(e = e && n.status === 'skipped'),
			(t = t && (n.status === 'passed' || n.status === 'skipped')),
			(s = s || n.status === 'failed'),
			(i = i || n.status === 'running'),
			(c = c || n.status === 'scheduled');
	i
		? (r.status = 'running')
		: c
			? (r.status = 'scheduled')
			: s
				? (r.status = 'failed')
				: e
					? (r.status = 'skipped')
					: t && (r.status = 'passed');
}
function re(r) {
	const t = new Set(),
		e = (s) => {
			var i;
			s.kind === 'case'
				? s.tests.map((c) => c.id).forEach((c) => t.add(c))
				: s.kind === 'test'
					? t.add(s.id)
					: (i = s.children) == null || i.forEach(e);
		};
	return e(r), t;
}
const X = Symbol('statusEx');
class oe {
	constructor(t) {
		(this.loadErrors = []),
			(this.progress = { total: 0, passed: 0, failed: 0, skipped: 0 }),
			(this._lastRunTestCount = 0),
			(this._receiver = new ot(this._createReporter(), {
				mergeProjects: !0,
				mergeTestCases: !0,
				resolvePath: (e, s) => e + t.pathSeparator + s,
				clearPreviousResultsWhenTestBegins: !0,
			})),
			(this._options = t);
	}
	_createReporter() {
		return {
			version: () => 'v2',
			onConfigure: (t) => {
				(this.config = t),
					(this._lastRunReceiver = new ot(
						{
							version: () => 'v2',
							onBegin: (e) => {
								(this._lastRunTestCount = e.allTests().length), (this._lastRunReceiver = void 0);
							},
						},
						{
							mergeProjects: !0,
							mergeTestCases: !1,
							resolvePath: (e, s) => e + this._options.pathSeparator + s,
						},
					));
			},
			onBegin: (t) => {
				var e;
				if ((this.rootSuite || (this.rootSuite = t), this._testResultsSnapshot)) {
					for (const s of this.rootSuite.allTests())
						s.results =
							((e = this._testResultsSnapshot) == null ? void 0 : e.get(s.id)) || s.results;
					this._testResultsSnapshot = void 0;
				}
				(this.progress.total = this._lastRunTestCount),
					(this.progress.passed = 0),
					(this.progress.failed = 0),
					(this.progress.skipped = 0),
					this._options.onUpdate(!0);
			},
			onEnd: () => {
				this._options.onUpdate(!0);
			},
			onTestBegin: (t, e) => {
				(e[X] = 'running'), this._options.onUpdate();
			},
			onTestEnd: (t, e) => {
				t.outcome() === 'skipped'
					? ++this.progress.skipped
					: t.outcome() === 'unexpected'
						? ++this.progress.failed
						: ++this.progress.passed,
					(e[X] = e.status),
					this._options.onUpdate();
			},
			onError: (t) => this._handleOnError(t),
			printsToStdio: () => !1,
		};
	}
	processGlobalReport(t) {
		const e = new ot({
			version: () => 'v2',
			onConfigure: (s) => {
				this.config = s;
			},
			onError: (s) => this._handleOnError(s),
		});
		for (const s of t) e.dispatch(s);
	}
	processListReport(t) {
		var s;
		const e = ((s = this.rootSuite) == null ? void 0 : s.allTests()) || [];
		(this._testResultsSnapshot = new Map(e.map((i) => [i.id, i.results]))), this._receiver.reset();
		for (const i of t) this._receiver.dispatch(i);
	}
	processTestReportEvent(t) {
		var e, s, i;
		(s = (e = this._lastRunReceiver) == null ? void 0 : e.dispatch(t)) == null || s.catch(() => {}),
			(i = this._receiver.dispatch(t)) == null || i.catch(() => {});
	}
	_handleOnError(t) {
		var e, s;
		this.loadErrors.push(t),
			(s = (e = this._options).onError) == null || s.call(e, t),
			this._options.onUpdate();
	}
	asModel() {
		return {
			rootSuite: this.rootSuite || new Q('', 'root'),
			config: this.config,
			loadErrors: this.loadErrors,
			progress: this.progress,
		};
	}
}
const ne = ({ source: r }) => {
		const [t, e] = Mt(),
			[s, i] = K.useState(Dt()),
			[c] = K.useState(
				Ft(
					() => import('./assets/xtermModule-BoAIEibi.js'),
					__vite__mapDeps([0, 1]),
					import.meta.url,
				).then((g) => g.default),
			),
			n = K.useRef(null);
		return (
			K.useEffect(() => (Ot(i), () => At(i)), []),
			K.useEffect(() => {
				const g = r.write,
					l = r.clear;
				return (
					(async () => {
						const { Terminal: _, FitAddon: a } = await c,
							h = e.current;
						if (!h) return;
						const v = s === 'dark-mode' ? le : ae;
						if (n.current && n.current.terminal.options.theme === v) return;
						n.current && (h.textContent = '');
						const d = new _({
								convertEol: !0,
								fontSize: 13,
								scrollback: 1e4,
								fontFamily: 'var(--vscode-editor-font-family)',
								theme: v,
							}),
							S = new a();
						d.loadAddon(S);
						for (const b of r.pending) d.write(b);
						(r.write = (b) => {
							r.pending.push(b), d.write(b);
						}),
							(r.clear = () => {
								(r.pending = []), d.clear();
							}),
							d.open(h),
							S.fit(),
							(n.current = { terminal: d, fitAddon: S });
					})(),
					() => {
						(r.clear = l), (r.write = g);
					}
				);
			}, [c, n, e, r, s]),
			K.useEffect(() => {
				setTimeout(() => {
					n.current &&
						(n.current.fitAddon.fit(), r.resize(n.current.terminal.cols, n.current.terminal.rows));
				}, 250);
			}, [t, r]),
			o.jsx('div', {
				'data-testid': 'output',
				className: 'xterm-wrapper',
				style: { flex: 'auto' },
				ref: e,
			})
		);
	},
	ae = {
		foreground: '#383a42',
		background: '#fafafa',
		cursor: '#383a42',
		black: '#000000',
		red: '#e45649',
		green: '#50a14f',
		yellow: '#c18401',
		blue: '#4078f2',
		magenta: '#a626a4',
		cyan: '#0184bc',
		white: '#a0a0a0',
		brightBlack: '#000000',
		brightRed: '#e06c75',
		brightGreen: '#98c379',
		brightYellow: '#d19a66',
		brightBlue: '#4078f2',
		brightMagenta: '#a626a4',
		brightCyan: '#0184bc',
		brightWhite: '#383a42',
		selectionBackground: '#d7d7d7',
		selectionForeground: '#383a42',
	},
	le = {
		foreground: '#f8f8f2',
		background: '#1e1e1e',
		cursor: '#f8f8f0',
		black: '#000000',
		red: '#ff5555',
		green: '#50fa7b',
		yellow: '#f1fa8c',
		blue: '#bd93f9',
		magenta: '#ff79c6',
		cyan: '#8be9fd',
		white: '#bfbfbf',
		brightBlack: '#4d4d4d',
		brightRed: '#ff6e6e',
		brightGreen: '#69ff94',
		brightYellow: '#ffffa5',
		brightBlue: '#d6acff',
		brightMagenta: '#ff92df',
		brightCyan: '#a4ffff',
		brightWhite: '#e6e6e6',
		selectionBackground: '#44475a',
		selectionForeground: '#f8f8f2',
	},
	ce = ({
		filterText: r,
		setFilterText: t,
		statusFilters: e,
		setStatusFilters: s,
		projectFilters: i,
		setProjectFilters: c,
		testModel: n,
		runTests: g,
	}) => {
		const [l, _] = u.useState(!1),
			a = u.useRef(null);
		u.useEffect(() => {
			var d;
			(d = a.current) == null || d.focus();
		}, []);
		const h =
				[...e.entries()]
					.filter(([d, S]) => S)
					.map(([d]) => d)
					.join(' ') || 'all',
			v =
				[...i.entries()]
					.filter(([d, S]) => S)
					.map(([d]) => d)
					.join(' ') || 'all';
		return o.jsxs('div', {
			className: 'filters',
			children: [
				o.jsx(Ut, {
					expanded: l,
					setExpanded: _,
					title: o.jsx('input', {
						ref: a,
						type: 'search',
						placeholder: 'Filter (e.g. text, @tag)',
						spellCheck: !1,
						value: r,
						onChange: (d) => {
							t(d.target.value);
						},
						onKeyDown: (d) => {
							d.key === 'Enter' && g();
						},
					}),
				}),
				o.jsxs('div', {
					className: 'filter-summary',
					title:
						'Status: ' +
						h +
						`
Projects: ` +
						v,
					onClick: () => _(!l),
					children: [
						o.jsx('span', { className: 'filter-label', children: 'Status:' }),
						' ',
						h,
						o.jsx('span', { className: 'filter-label', children: 'Projects:' }),
						' ',
						v,
					],
				}),
				l &&
					o.jsxs('div', {
						className: 'hbox',
						style: { marginLeft: 14, maxHeight: 200, overflowY: 'auto' },
						children: [
							o.jsx('div', {
								className: 'filter-list',
								role: 'list',
								'data-testid': 'status-filters',
								children: [...e.entries()].map(([d, S]) =>
									o.jsx(
										'div',
										{
											className: 'filter-entry',
											role: 'listitem',
											children: o.jsxs('label', {
												children: [
													o.jsx('input', {
														type: 'checkbox',
														checked: S,
														onChange: () => {
															const b = new Map(e);
															b.set(d, !b.get(d)), s(b);
														},
													}),
													o.jsx('div', { children: d }),
												],
											}),
										},
										d,
									),
								),
							}),
							o.jsx('div', {
								className: 'filter-list',
								role: 'list',
								'data-testid': 'project-filters',
								children: [...i.entries()].map(([d, S]) =>
									o.jsx(
										'div',
										{
											className: 'filter-entry',
											role: 'listitem',
											children: o.jsxs('label', {
												children: [
													o.jsx('input', {
														type: 'checkbox',
														checked: S,
														onChange: () => {
															var C;
															const b = new Map(i);
															b.set(d, !b.get(d)), c(b);
															const B =
																(C = n == null ? void 0 : n.config) == null ? void 0 : C.configFile;
															B &&
																vt.setObject(
																	B + ':projects',
																	[...b.entries()].filter(([T, L]) => L).map(([T]) => T),
																);
														},
													}),
													o.jsx('div', { children: d || 'untitled' }),
												],
											}),
										},
										d,
									),
								),
							}),
						],
					}),
			],
		});
	},
	de = ({ tag: r, style: t, onClick: e }) =>
		o.jsx('span', {
			className: at('tag', `tag-color-${ue(r)}`),
			onClick: e,
			style: { margin: '6px 0 0 6px', ...t },
			title: `Click to filter by tag: ${r}`,
			children: r,
		});
function ue(r) {
	let t = 0;
	for (let e = 0; e < r.length; e++) t = r.charCodeAt(e) + ((t << 8) - t);
	return Math.abs(t % 6);
}
const he = Wt,
	fe = ({
		filterText: r,
		testModel: t,
		testServerConnection: e,
		testTree: s,
		runTests: i,
		runningState: c,
		watchAll: n,
		watchedTreeIds: g,
		setWatchedTreeIds: l,
		isLoading: _,
		onItemSelected: a,
		requestedCollapseAllCount: h,
		requestedExpandAllCount: v,
		setFilterText: d,
		onRevealSource: S,
	}) => {
		const [b, B] = u.useState({ expandedItems: new Map() }),
			[C, T] = u.useState(),
			[L, O] = u.useState(h),
			[$, N] = u.useState(v);
		u.useEffect(() => {
			if (L !== h) {
				b.expandedItems.clear();
				for (const x of s.flatTreeItems()) b.expandedItems.set(x.id, !1);
				O(h), T(void 0), B({ ...b });
				return;
			}
			if ($ !== v) {
				b.expandedItems.clear();
				for (const x of s.flatTreeItems()) b.expandedItems.set(x.id, !0);
				N(v), T(void 0), B({ ...b });
				return;
			}
			if (!c || c.itemSelectedByUser) return;
			let f;
			const E = (x) => {
				var M;
				x.children.forEach(E),
					!f &&
						x.status === 'failed' &&
						((x.kind === 'test' && c.testIds.has(x.test.id)) ||
							(x.kind === 'case' && c.testIds.has((M = x.tests[0]) == null ? void 0 : M.id))) &&
						(f = x);
			};
			E(s.rootItem), f && T(f.id);
		}, [c, T, s, L, O, h, $, N, v, b, B]);
		const R = u.useMemo(() => {
			if (C) return s.treeItemById(C);
		}, [C, s]);
		u.useEffect(() => {
			if (!t) return;
			const f = pe(R, t);
			let E;
			(R == null ? void 0 : R.kind) === 'test'
				? (E = R.test)
				: (R == null ? void 0 : R.kind) === 'case' && R.tests.length === 1 && (E = R.tests[0]),
				a({ treeItem: R, testCase: E, testFile: f });
		}, [t, R, a]),
			u.useEffect(() => {
				if (!_)
					if (n) e == null || e.watchNoReply({ fileNames: s.fileNames() });
					else {
						const f = new Set();
						for (const E of g.value) {
							const x = s.treeItemById(E),
								M = x == null ? void 0 : x.location.file;
							M && f.add(M);
						}
						e == null || e.watchNoReply({ fileNames: [...f] });
					}
			}, [_, s, n, g, e]);
		const J = (f) => {
				T(f.id), i('bounce-if-busy', s.collectTestIds(f));
			},
			H = (f, E) => {
				if ((f.preventDefault(), f.stopPropagation(), f.metaKey || f.ctrlKey)) {
					const x = r.split(' ');
					x.includes(E)
						? d(
								x
									.filter((M) => M !== E)
									.join(' ')
									.trim(),
							)
						: d((r + ' ' + E).trim());
				} else
					d(
						(
							r
								.split(' ')
								.filter((x) => !x.startsWith('@'))
								.join(' ') +
							' ' +
							E
						).trim(),
					);
			};
		return o.jsx(he, {
			name: 'tests',
			treeState: b,
			setTreeState: B,
			rootItem: s.rootItem,
			dataTestId: 'test-tree',
			render: (f) => {
				const E = f.id.replace(/[^\w\d-_]/g, '-'),
					x = E + '-label',
					M = E + '-time';
				return o.jsxs('div', {
					className: 'hbox ui-mode-tree-item',
					'aria-labelledby': `${x} ${M}`,
					children: [
						o.jsxs('div', {
							id: x,
							className: 'ui-mode-tree-item-title',
							children: [
								o.jsx('span', { children: f.title }),
								f.kind === 'case'
									? f.tags.map((q) => o.jsx(de, { tag: q.slice(1), onClick: (Z) => H(Z, q) }, q))
									: null,
							],
						}),
						!!f.duration &&
							f.status !== 'skipped' &&
							o.jsx('div', {
								id: M,
								className: 'ui-mode-tree-item-time',
								children: Vt(f.duration),
							}),
						o.jsxs(Y, {
							noMinHeight: !0,
							noShadow: !0,
							children: [
								o.jsx(F, {
									icon: 'play',
									title: 'Run',
									onClick: () => J(f),
									disabled: !!c && !c.completed,
								}),
								o.jsx(F, {
									icon: 'go-to-file',
									title: 'Show source',
									onClick: S,
									style:
										f.kind === 'group' && f.subKind === 'folder' ? { visibility: 'hidden' } : {},
								}),
								!n &&
									o.jsx(F, {
										icon: 'eye',
										title: 'Watch',
										onClick: () => {
											g.value.has(f.id) ? g.value.delete(f.id) : g.value.add(f.id), l({ ...g });
										},
										toggled: g.value.has(f.id),
									}),
							],
						}),
					],
				});
			},
			icon: (f) => zt(f.status),
			title: (f) => f.title,
			selectedItem: R,
			onAccepted: J,
			onSelected: (f) => {
				c && (c.itemSelectedByUser = !0), T(f.id);
			},
			isError: (f) => (f.kind === 'group' ? f.hasLoadErrors : !1),
			autoExpandDepth: r ? 5 : 1,
			noItemsMessage: _ ? 'Loading…' : 'No tests',
		});
	};
function pe(r, t) {
	if (!(!r || !t))
		return {
			file: r.location.file,
			line: r.location.line,
			column: r.location.column,
			source: {
				errors: t.loadErrors
					.filter((e) => {
						var s;
						return ((s = e.location) == null ? void 0 : s.file) === r.location.file;
					})
					.map((e) => ({ line: e.location.line, message: e.message })),
				content: void 0,
			},
		};
}
function ge(r) {
	return `.playwright-artifacts-${r}`;
}
const me = ({ item: r, rootDir: t, onOpenExternally: e, revealSource: s, pathSeparator: i }) => {
		var h, v;
		const [c, n] = u.useState(void 0),
			[g, l] = u.useState(0),
			_ = u.useRef(null),
			{ outputDir: a } = u.useMemo(
				() => ({ outputDir: r.testCase ? _e(r.testCase) : void 0 }),
				[r],
			);
		return (
			u.useEffect(() => {
				var B, C;
				_.current && clearTimeout(_.current);
				const d = (B = r.testCase) == null ? void 0 : B.results[0];
				if (!d) {
					n(void 0);
					return;
				}
				const S = d && d.duration >= 0 && d.attachments.find((T) => T.name === 'trace');
				if (S && S.path) {
					mt(S.path).then((T) => n({ model: T, isLive: !1 }));
					return;
				}
				if (!a) {
					n(void 0);
					return;
				}
				const b = [
					a,
					ge(d.workerIndex),
					'traces',
					`${((C = r.testCase)) == null ? void 0 : C.id}.json`,
				].join(i);
				return (
					(_.current = setTimeout(async () => {
						try {
							const T = await mt(b);
							n({ model: T, isLive: !0 });
						} catch {
							const T = new St([]);
							T.errorDescriptors.push(
								...d.errors.flatMap((L) => (L.message ? [{ message: L.message }] : [])),
							),
								n({ model: T, isLive: !1 });
						} finally {
							l(g + 1);
						}
					}, 500)),
					() => {
						_.current && clearTimeout(_.current);
					}
				);
			}, [a, r, n, g, l, i]),
			o.jsx(
				Kt,
				{
					model: c == null ? void 0 : c.model,
					showSourcesFirst: !0,
					rootDir: t,
					fallbackLocation: r.testFile,
					isLive: c == null ? void 0 : c.isLive,
					status: (h = r.treeItem) == null ? void 0 : h.status,
					annotations: ((v = r.testCase) == null ? void 0 : v.annotations) ?? [],
					onOpenExternally: e,
					revealSource: s,
				},
				'workbench',
			)
		);
	},
	_e = (r) => {
		var t;
		for (let e = r.parent; e; e = e.parent)
			if (e.project()) return (t = e.project()) == null ? void 0 : t.outputDir;
	};
async function mt(r) {
	const t = new URLSearchParams();
	t.set('trace', r), t.set('limit', '1');
	const s = await (await fetch(`contexts?${t.toString()}`)).json();
	return new St(s);
}
let _t = { cols: 80 };
const z = { pending: [], clear: () => {}, write: (r) => z.pending.push(r), resize: () => {} },
	A = new URLSearchParams(window.location.search),
	we = new URL(A.get('server') ?? '../', window.location.href),
	lt = new URL(A.get('ws'), we);
lt.protocol = lt.protocol === 'https:' ? 'wss:' : 'ws:';
const I = {
	args: A.getAll('arg'),
	grep: A.get('grep') || void 0,
	grepInvert: A.get('grepInvert') || void 0,
	projects: A.getAll('project'),
	workers: A.get('workers') || void 0,
	headed: A.has('headed'),
	updateSnapshots: A.get('updateSnapshots') || void 0,
	reporters: A.has('reporter') ? A.getAll('reporter') : void 0,
	pathSeparator: A.get('pathSeparator') || '/',
};
I.updateSnapshots &&
	!['all', 'none', 'missing'].includes(I.updateSnapshots) &&
	(I.updateSnapshots = void 0);
const wt = navigator.platform === 'MacIntel',
	ve = ({}) => {
		var gt;
		const [r, t] = u.useState(''),
			[e, s] = u.useState(!1),
			[i, c] = u.useState(!1),
			[n, g] = u.useState(
				new Map([
					['passed', !1],
					['failed', !1],
					['skipped', !1],
				]),
			),
			[l, _] = u.useState(new Map()),
			[a, h] = u.useState(),
			[v, d] = u.useState(),
			[S, b] = u.useState({}),
			[B, C] = u.useState(new Set()),
			[T, L] = u.useState(!1),
			[O, $] = u.useState(),
			N = O && !O.completed,
			[R, J] = $t('watch-all', !1),
			[H, f] = u.useState({ value: new Set() }),
			E = u.useRef(Promise.resolve()),
			x = u.useRef(new Set()),
			[M, q] = u.useState(0),
			[Z, xt] = u.useState(0),
			[Tt, kt] = u.useState(!1),
			[ct, dt] = u.useState(!0),
			[w, jt] = u.useState(),
			[G, Et] = u.useState(),
			[tt, yt] = u.useState(!1),
			[Se, be] = u.useState(!1),
			[It, ut] = u.useState(!1),
			Rt = u.useCallback(() => ut(!0), [ut]),
			Bt = !1,
			[ht, xe] = u.useState(!1),
			[ft, Te] = u.useState(!1),
			[pt, ke] = u.useState(!1),
			Ct = u.useRef(null),
			et = u.useCallback(() => {
				jt((p) => (p == null || p.close(), new Ht(new qt(lt))));
			}, []);
		u.useEffect(() => {
			var p;
			(p = Ct.current) == null || p.focus(), L(!0), et();
		}, [et]),
			u.useEffect(() => {
				if (!w) return;
				const p = [
					w.onStdio((m) => {
						if (m.buffer) {
							const k = atob(m.buffer);
							z.write(k);
						} else z.write(m.text);
						m.type === 'stderr' && c(!0);
					}),
					w.onClose(() => kt(!0)),
				];
				return (
					(z.resize = (m, k) => {
						(_t = { cols: m, rows: k }), w.resizeTerminalNoReply({ cols: m, rows: k });
					}),
					() => {
						for (const m of p) m.dispose();
					}
				);
			}, [w]),
			u.useEffect(() => {
				if (!w) return;
				let p;
				const m = new oe({
					onUpdate: (k) => {
						clearTimeout(p),
							(p = void 0),
							k
								? h(m.asModel())
								: p ||
									(p = setTimeout(() => {
										h(m.asModel());
									}, 250));
					},
					onError: (k) => {
						z.write(
							(k.stack || k.value || '') +
								`
`,
						),
							c(!0);
					},
					pathSeparator: I.pathSeparator,
				});
				return (
					Et(m),
					h(void 0),
					L(!0),
					f({ value: new Set() }),
					(async () => {
						try {
							await w.initialize({ interceptStdio: !0, watchTestDirs: !0 });
							const { status: k, report: y } = await w.runGlobalSetup({});
							if ((m.processGlobalReport(y), k !== 'passed')) return;
							const P = await w.listTests({
								projects: I.projects,
								locations: I.args,
								grep: I.grep,
								grepInvert: I.grepInvert,
							});
							m.processListReport(P.report),
								w.onReport((D) => {
									m.processTestReportEvent(D);
								});
							const { hasBrowsers: U } = await w.checkBrowsers({});
							dt(U);
						} finally {
							L(!1);
						}
					})(),
					() => {
						clearTimeout(p);
					}
				);
			}, [w]),
			u.useEffect(() => {
				if (!a) return;
				const { config: p, rootSuite: m } = a,
					k = p.configFile ? vt.getObject(p.configFile + ':projects', void 0) : void 0,
					y = new Map(l);
				for (const P of y.keys()) m.suites.find((U) => U.title === P) || y.delete(P);
				for (const P of m.suites)
					y.has(P.title) || y.set(P.title, !!(k != null && k.includes(P.title)));
				!k && y.size && ![...y.values()].includes(!0) && y.set(y.entries().next().value[0], !0),
					(l.size !== y.size || [...l].some(([P, U]) => y.get(P) !== U)) && _(y);
			}, [l, a]),
			u.useEffect(() => {
				N && a != null && a.progress ? d(a.progress) : a || d(void 0);
			}, [a, N]);
		const { testTree: Pt } = u.useMemo(() => {
				if (!a) return { testTree: new nt('', new Q('', 'root'), [], l, I.pathSeparator) };
				const p = new nt('', a.rootSuite, a.loadErrors, l, I.pathSeparator);
				return (
					p.filterTree(r, n, N ? (O == null ? void 0 : O.testIds) : void 0),
					p.sortAndPropagateStatus(),
					p.shortenRoot(),
					p.flattenForSingleProject(),
					C(p.testIds()),
					{ testTree: p }
				);
			}, [r, a, n, l, C, O, N]),
			V = u.useCallback(
				(p, m) => {
					!w ||
						!a ||
						(p === 'bounce-if-busy' && N) ||
						((x.current = new Set([...x.current, ...m])),
						(E.current = E.current.then(async () => {
							var P, U, D;
							const k = x.current;
							if (((x.current = new Set()), !k.size)) return;
							{
								for (const j of ((P = a.rootSuite) == null ? void 0 : P.allTests()) || [])
									if (k.has(j.id)) {
										j.results = [];
										const W = j._createTestResult('pending');
										W[X] = 'scheduled';
									}
								h({ ...a });
							}
							const y = '  [' + new Date().toLocaleTimeString() + ']';
							z.write('\x1B[2m—'.repeat(Math.max(0, _t.cols - y.length)) + y + '\x1B[22m'),
								d({ total: 0, passed: 0, failed: 0, skipped: 0 }),
								$({ testIds: k }),
								await w.runTests({
									locations: I.args,
									grep: I.grep,
									grepInvert: I.grepInvert,
									testIds: [...k],
									projects: [...l].filter(([j, W]) => W).map(([j]) => j),
									...(ht ? { workers: '1' } : {}),
									...(ft ? { headed: !0 } : {}),
									...(pt ? { updateSnapshots: 'all' } : {}),
									reporters: I.reporters,
									trace: 'on',
								});
							for (const j of ((U = a.rootSuite) == null ? void 0 : U.allTests()) || [])
								((D = j.results[0]) == null ? void 0 : D.duration) === -1 && (j.results = []);
							h({ ...a }), $((j) => (j ? { ...j, completed: !0 } : void 0));
						})));
				},
				[l, N, a, w, ht, ft, pt],
			);
		u.useEffect(() => {
			if (!w || !G) return;
			const p = w.onTestFilesChanged(async (m) => {
				if (
					((E.current = E.current.then(async () => {
						L(!0);
						try {
							const D = await w.listTests({
								projects: I.projects,
								locations: I.args,
								grep: I.grep,
								grepInvert: I.grepInvert,
							});
							G.processListReport(D.report);
						} catch (D) {
							console.log(D);
						} finally {
							L(!1);
						}
					})),
					await E.current,
					m.testFiles.length === 0)
				)
					return;
				const k = G.asModel(),
					y = new nt('', k.rootSuite, k.loadErrors, l, I.pathSeparator),
					P = [],
					U = new Set(m.testFiles);
				if (R) {
					const D = (j) => {
						const W = j.location.file;
						W && U.has(W) && P.push(...y.collectTestIds(j)),
							j.kind === 'group' && j.subKind === 'folder' && j.children.forEach(D);
					};
					D(y.rootItem);
				} else
					for (const D of H.value) {
						const j = y.treeItemById(D),
							W = j == null ? void 0 : j.location.file;
						W && U.has(W) && P.push(...y.collectTestIds(j));
					}
				V('queue-if-busy', new Set(P));
			});
			return () => p.dispose();
		}, [V, w, R, H, G, l]),
			u.useEffect(() => {
				if (!w) return;
				const p = (m) => {
					m.code === 'Backquote' && m.ctrlKey
						? (m.preventDefault(), s(!e))
						: m.code === 'F5' && m.shiftKey
							? (m.preventDefault(), w == null || w.stopTestsNoReply({}))
							: m.code === 'F5' && (m.preventDefault(), V('bounce-if-busy', B));
				};
				return (
					addEventListener('keydown', p),
					() => {
						removeEventListener('keydown', p);
					}
				);
			}, [V, et, w, B, e]);
		const it = u.useRef(null),
			Nt = u.useCallback((p) => {
				var m;
				p.preventDefault(), p.stopPropagation(), (m = it.current) == null || m.showModal();
			}, []),
			rt = u.useCallback((p) => {
				var m;
				p.preventDefault(), p.stopPropagation(), (m = it.current) == null || m.close();
			}, []),
			Lt = u.useCallback(
				(p) => {
					rt(p),
						s(!0),
						w == null ||
							w.installBrowsers({}).then(async () => {
								s(!1);
								const { hasBrowsers: m } = await (w == null ? void 0 : w.checkBrowsers({}));
								dt(m);
							});
				},
				[rt, w],
			);
		return o.jsxs('div', {
			className: 'vbox ui-mode',
			children: [
				!ct &&
					o.jsxs('dialog', {
						ref: it,
						children: [
							o.jsxs('div', {
								className: 'title',
								children: [
									o.jsx('span', { className: 'codicon codicon-lightbulb' }),
									'Install browsers',
								],
							}),
							o.jsxs('div', {
								className: 'body',
								children: [
									'Playwright did not find installed browsers.',
									o.jsx('br', {}),
									'Would you like to run `playwright install`?',
									o.jsx('br', {}),
									o.jsx('button', { className: 'button', onClick: Lt, children: 'Install' }),
									o.jsx('button', {
										className: 'button secondary',
										onClick: rt,
										children: 'Dismiss',
									}),
								],
							}),
						],
					}),
				Tt &&
					o.jsxs('div', {
						className: 'disconnected',
						children: [
							o.jsx('div', { className: 'title', children: 'UI Mode disconnected' }),
							o.jsxs('div', {
								children: [
									o.jsx('a', {
										href: '#',
										onClick: () => (window.location.href = '/'),
										children: 'Reload the page',
									}),
									' to reconnect',
								],
							}),
						],
					}),
				o.jsx(Yt, {
					sidebarSize: 250,
					minSidebarSize: 150,
					orientation: 'horizontal',
					sidebarIsFirst: !0,
					settingName: 'testListSidebar',
					main: o.jsxs('div', {
						className: 'vbox',
						children: [
							o.jsxs('div', {
								className: at('vbox', !e && 'hidden'),
								children: [
									o.jsxs(Y, {
										children: [
											o.jsx('div', {
												className: 'section-title',
												style: { flex: 'none' },
												children: 'Output',
											}),
											o.jsx(F, {
												icon: 'circle-slash',
												title: 'Clear output',
												onClick: () => {
													z.clear(), c(!1);
												},
											}),
											o.jsx('div', { className: 'spacer' }),
											o.jsx(F, { icon: 'close', title: 'Close', onClick: () => s(!1) }),
										],
									}),
									o.jsx(ne, { source: z }),
								],
							}),
							o.jsx('div', {
								className: at('vbox', e && 'hidden'),
								children: o.jsx(me, {
									pathSeparator: I.pathSeparator,
									item: S,
									rootDir: (gt = a == null ? void 0 : a.config) == null ? void 0 : gt.rootDir,
									revealSource: It,
									onOpenExternally: (p) =>
										w == null
											? void 0
											: w.openNoReply({
													location: { file: p.file, line: p.line, column: p.column },
												}),
								}),
							}),
						],
					}),
					sidebar: o.jsxs('div', {
						className: 'vbox ui-mode-sidebar',
						children: [
							o.jsxs(Y, {
								noShadow: !0,
								noMinHeight: !0,
								children: [
									o.jsx('img', { src: 'playwright-logo.svg', alt: 'Playwright logo' }),
									o.jsx('div', { className: 'section-title', children: 'Playwright' }),
									o.jsx(F, {
										icon: 'refresh',
										title: 'Reload',
										onClick: () => et(),
										disabled: N || T,
									}),
									o.jsxs('div', {
										style: { position: 'relative' },
										children: [
											o.jsx(F, {
												icon: 'terminal',
												title: 'Toggle output — ' + (wt ? '⌃`' : 'Ctrl + `'),
												toggled: e,
												onClick: () => {
													s(!e);
												},
											}),
											i &&
												o.jsx('div', {
													title: 'Output contains error',
													style: {
														position: 'absolute',
														top: 2,
														right: 2,
														width: 7,
														height: 7,
														borderRadius: '50%',
														backgroundColor: 'var(--vscode-notificationsErrorIcon-foreground)',
													},
												}),
										],
									}),
									!ct &&
										o.jsx(F, {
											icon: 'lightbulb-autofix',
											style: { color: 'var(--vscode-list-warningForeground)' },
											title: 'Playwright browsers are missing',
											onClick: Nt,
										}),
								],
							}),
							o.jsx(ce, {
								filterText: r,
								setFilterText: t,
								statusFilters: n,
								setStatusFilters: g,
								projectFilters: l,
								setProjectFilters: _,
								testModel: a,
								runTests: () => V('bounce-if-busy', B),
							}),
							o.jsxs(Y, {
								noMinHeight: !0,
								children: [
									!N && !v && o.jsx('div', { className: 'section-title', children: 'Tests' }),
									!N &&
										v &&
										o.jsx('div', {
											'data-testid': 'status-line',
											className: 'status-line',
											children: o.jsxs('div', {
												children: [
													v.passed,
													'/',
													v.total,
													' passed (',
													((v.passed / v.total) * 100) | 0,
													'%)',
												],
											}),
										}),
									N &&
										v &&
										o.jsx('div', {
											'data-testid': 'status-line',
											className: 'status-line',
											children: o.jsxs('div', {
												children: [
													'Running ',
													v.passed,
													'/',
													O.testIds.size,
													' passed (',
													((v.passed / O.testIds.size) * 100) | 0,
													'%)',
												],
											}),
										}),
									o.jsx(F, {
										icon: 'play',
										title: 'Run all — F5',
										onClick: () => V('bounce-if-busy', B),
										disabled: N || T,
									}),
									o.jsx(F, {
										icon: 'debug-stop',
										title: 'Stop — ' + (wt ? '⇧F5' : 'Shift + F5'),
										onClick: () => (w == null ? void 0 : w.stopTests({})),
										disabled: !N || T,
									}),
									o.jsx(F, {
										icon: 'eye',
										title: 'Watch all',
										toggled: R,
										onClick: () => {
											f({ value: new Set() }), J(!R);
										},
									}),
									o.jsx(F, {
										icon: 'collapse-all',
										title: 'Collapse all',
										onClick: () => {
											q(M + 1);
										},
									}),
									o.jsx(F, {
										icon: 'expand-all',
										title: 'Expand all',
										onClick: () => {
											xt(Z + 1);
										},
									}),
								],
							}),
							o.jsx(fe, {
								filterText: r,
								testModel: a,
								testTree: Pt,
								testServerConnection: w,
								runningState: O,
								runTests: V,
								onItemSelected: b,
								watchAll: R,
								watchedTreeIds: H,
								setWatchedTreeIds: f,
								isLoading: T,
								requestedCollapseAllCount: M,
								requestedExpandAllCount: Z,
								setFilterText: t,
								onRevealSource: Rt,
							}),
							Bt,
							o.jsxs(Y, {
								noShadow: !0,
								noMinHeight: !0,
								className: 'settings-toolbar',
								onClick: () => yt(!tt),
								children: [
									o.jsx('span', {
										className: `codicon codicon-${tt ? 'chevron-down' : 'chevron-right'}`,
										style: { marginLeft: 5 },
										title: tt ? 'Hide Settings' : 'Show Settings',
									}),
									o.jsx('div', { className: 'section-title', children: 'Settings' }),
								],
							}),
							tt && o.jsx(Qt, {}),
						],
					}),
				}),
			],
		});
	};
(async () => {
	if ((Xt(), window.location.protocol !== 'file:')) {
		if (
			(window.location.href.includes('isUnderTest=true') &&
				(await new Promise((r) => setTimeout(r, 1e3))),
			!navigator.serviceWorker)
		)
			throw new Error(`Service workers are not supported.
Make sure to serve the website (${window.location}) via HTTPS or localhost.`);
		navigator.serviceWorker.register('sw.bundle.js'),
			navigator.serviceWorker.controller ||
				(await new Promise((r) => {
					navigator.serviceWorker.oncontrollerchange = () => r();
				})),
			setInterval(function () {
				fetch('ping');
			}, 1e4);
	}
	Jt.createRoot(document.querySelector('#root')).render(o.jsx(ve, {}));
})();

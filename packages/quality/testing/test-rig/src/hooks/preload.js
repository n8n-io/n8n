// @ts-check
// Loaded into n8n through NODE_OPTIONS as a data URL, so it can use Node built-ins only.
// Hook points come from the TEST_RIG_HOOKS env var (JSON list); see README.md for the format.
(() => {
	const fs = process.getBuiltinModule('node:fs');
	const path = process.getBuiltinModule('node:path');
	const Module = /** @type {any} */ (process.getBuiltinModule('node:module'));
	const { AsyncLocalStorage } = process.getBuiltinModule('node:async_hooks');

	const CONTROL_DIR = process.env.TEST_RIG_HOOK_DIR || '/tmp/test-rig-hooks';
	const POLL_MS = Number(process.env.TEST_RIG_HOOK_POLL_MS || 10);
	const MAX_PAUSE_MS = Number(process.env.TEST_RIG_HOOK_MAX_PAUSE_MS || 120000);
	const TAG = '[test-rig]';

	/**
	 * @typedef {{ file: string, target: string, method: string }} MethodRef
	 * @typedef {MethodRef & {
	 *   point: string, kind?: string, arm?: string, once?: boolean, scope?: MethodRef,
	 *   where?: Array<{ path: string, equals?: unknown, truthy?: boolean }>,
	 *   detail?: Record<string, string>, phase?: string, returns?: unknown, async?: boolean,
	 *   preserve?: string[], message?: string, roles?: string[], lazy?: boolean, installed?: boolean
	 * }} Hook
	 * @typedef {{ args: unknown[], this: unknown, scope?: any, result?: unknown }} Context
	 */

	/** @param {string} event @param {string} point @param {unknown} [detail] */
	const log = (event, point, detail) =>
		process.stdout.write(
			`${TAG} ${new Date().toISOString()} pid=${process.pid} ${event} ${point}${detail === undefined ? '' : ` ${JSON.stringify(detail)}`}\n`,
		);

	const KEYS = new Set([
		'point',
		'file',
		'target',
		'method',
		'kind',
		'arm',
		'once',
		'scope',
		'where',
		'detail',
		'phase',
		'returns',
		'async',
		'preserve',
		'message',
		'roles',
		'lazy',
	]);
	const ENUMS = /** @type {Record<string, string[]>} */ ({
		kind: ['pause', 'observe', 'fault', 'drop'],
		arm: ['file', 'always'],
		phase: ['before', 'after'],
	});
	const isText = (/** @type {unknown} */ value) => typeof value === 'string' && value.length > 0;

	/**
	 * Returns why a hook spec is invalid, or undefined. Mirrors hookSpecSchema in spec.ts.
	 * @param {any} hook
	 */
	function invalid(hook) {
		if (!hook || typeof hook !== 'object' || Array.isArray(hook)) return 'spec: not an object';
		for (const key of Object.keys(hook)) if (!KEYS.has(key)) return `${key}: unknown field`;
		if (typeof hook.point !== 'string' || !/^[\w-]+$/.test(hook.point)) return 'point: invalid';
		if (!isText(hook.file)) return 'file: required';
		if (typeof hook.target !== 'string') return 'target: required';
		if (!isText(hook.method)) return 'method: required';
		for (const [key, allowed] of Object.entries(ENUMS)) {
			if (hook[key] !== undefined && !allowed.includes(hook[key])) return `${key}: invalid`;
		}
		for (const key of ['once', 'async', 'lazy']) {
			if (hook[key] !== undefined && typeof hook[key] !== 'boolean') return `${key}: not a boolean`;
		}
		if (hook.scope !== undefined) {
			const s = hook.scope;
			if (!s || !isText(s.file) || typeof s.target !== 'string' || !isText(s.method))
				return 'scope: invalid';
		}
		if (hook.where !== undefined) {
			if (!Array.isArray(hook.where)) return 'where: not a list';
			if (hook.where.some((/** @type {any} */ rule) => !rule || !isText(rule.path)))
				return 'where: invalid rule';
		}
		if (hook.detail !== undefined) {
			if (!hook.detail || typeof hook.detail !== 'object') return 'detail: not an object';
			if (Object.values(hook.detail).some((v) => typeof v !== 'string'))
				return 'detail: paths must be strings';
		}
		if (hook.preserve !== undefined && !Array.isArray(hook.preserve)) return 'preserve: not a list';
		if (hook.roles !== undefined && !Array.isArray(hook.roles)) return 'roles: not a list';
		return undefined;
	}

	/** @type {Hook[]} */
	const hooks = [];
	try {
		const parsed = JSON.parse(process.env.TEST_RIG_HOOKS || '[]');
		const seen = new Set();
		for (const [index, hook] of (Array.isArray(parsed) ? parsed : [parsed]).entries()) {
			const reason = invalid(hook) ?? (seen.has(hook.point) ? 'point: duplicate' : undefined);
			if (reason) {
				log(
					'invalid',
					typeof hook?.point === 'string' && /^[\w-]+$/.test(hook.point) ? hook.point : `#${index}`,
					{ reason },
				);
				continue;
			}
			seen.add(hook.point);
			hooks.push(hook);
		}
	} catch (error) {
		log('invalid', 'TEST_RIG_HOOKS', { reason: /** @type {Error} */ (error).message });
	}

	fs.mkdirSync(CONTROL_DIR, { recursive: true });

	/** @param {string} point @param {string} kind */
	const file = (point, kind) => path.join(CONTROL_DIR, `${point}.${kind}`);
	const delay = async (/** @type {number} */ ms) => await new Promise((r) => setTimeout(r, ms));

	/** @param {any} root @param {string} dotted */
	function get(root, dotted) {
		let value = root;
		for (const key of String(dotted).split('.')) {
			if (value === null || value === undefined) return undefined;
			value = value[key];
		}
		return value;
	}

	/** @param {unknown} value */
	function plain(value) {
		if (value === null || value === undefined) return value;
		if (['string', 'number', 'boolean'].includes(typeof value)) return value;
		if (typeof value === 'bigint') return String(value);
		try {
			const text = JSON.stringify(value);
			return text === undefined ? undefined : JSON.parse(text);
		} catch {
			return '[unserialisable]';
		}
	}

	/** @param {Hook} hook @param {Context} ctx */
	function details(hook, ctx) {
		/** @type {Record<string, unknown>} */
		const out = {};
		for (const [key, dotted] of Object.entries(hook.detail || {}))
			out[key] = plain(get(ctx, dotted));
		return out;
	}

	/** @param {Hook} hook @param {Context} ctx */
	function matches(hook, ctx) {
		return (hook.where || []).every((rule) => {
			const value = get(ctx, rule.path);
			if ('equals' in rule) return value === rule.equals;
			if ('truthy' in rule) return Boolean(value) === rule.truthy;
			return true;
		});
	}

	const isArmed = (/** @type {Hook} */ hook) =>
		hook.arm === 'always' || fs.existsSync(file(hook.point, 'arm'));

	/** @param {Hook} hook */
	function consumeArm(hook) {
		if (hook.arm === 'always' || !hook.once) return true;
		try {
			fs.unlinkSync(file(hook.point, 'arm'));
			return true;
		} catch {
			return false;
		}
	}

	/** @param {Hook} hook @param {number} hitAt */
	async function waitRelease(hook, hitAt) {
		const release = file(hook.point, 'release');
		while (!fs.existsSync(release)) {
			if (Date.now() - hitAt > MAX_PAUSE_MS) {
				log('timeout', hook.point, { afterMs: MAX_PAUSE_MS });
				return;
			}
			await delay(POLL_MS);
		}
		try {
			fs.unlinkSync(release);
		} catch {}
		log('release', hook.point, { pausedMs: Date.now() - hitAt });
	}

	/** @param {Hook} hook @param {Context} ctx */
	function hit(hook, ctx) {
		const detail = details(hook, ctx);
		const hitAt = Date.now();
		if (hook.kind !== 'observe')
			fs.writeFileSync(file(hook.point, 'hit'), JSON.stringify({ hitAt, ...detail }));
		log('hit', hook.point, detail);
		return hitAt;
	}

	/** @type {Map<string, MethodRef & { storage: InstanceType<typeof AsyncLocalStorage>, installed?: boolean }>} */
	const scopes = new Map();
	const scopeKey = (/** @type {MethodRef} */ scope) =>
		`${scope.file}#${scope.target}#${scope.method}`;

	for (const hook of hooks) {
		hook.kind = hook.kind || 'pause';
		hook.arm = hook.arm || (hook.kind === 'observe' ? 'always' : 'file');
		hook.once = hook.once ?? hook.kind !== 'drop';
		if (hook.scope && !scopes.has(scopeKey(hook.scope))) {
			scopes.set(scopeKey(hook.scope), { ...hook.scope, storage: new AsyncLocalStorage() });
		}
	}

	/** @param {Hook} hook @param {Context} ctx */
	function shouldFire(hook, ctx) {
		if (!matches(hook, ctx)) return false;
		if (hook.scope) {
			const store = ctx.scope;
			if (!store) return false;
			if (store.fired.has(hook.point)) return false;
		}
		if (!isArmed(hook)) return false;
		if (!consumeArm(hook)) return false;
		if (hook.scope) ctx.scope.fired.add(hook.point);
		return true;
	}

	/** @param {Hook} hook @param {Function} original */
	function wrap(hook, original) {
		const scope = hook.scope && scopes.get(scopeKey(hook.scope));
		/** @this {any} @param {unknown[]} args */
		return function (...args) {
			/** @type {Context} */
			const ctx = { args, this: this, scope: scope ? scope.storage.getStore() : undefined };
			if (hook.kind === 'observe') {
				if (!matches(hook, ctx) || (hook.scope && !ctx.scope)) return original.apply(this, args);
				if (hook.phase !== 'after') {
					hit(hook, ctx);
					return original.apply(this, args);
				}
				const result = original.apply(this, args);
				Promise.resolve(result).then(
					(value) => hit(hook, { ...ctx, result: value }),
					() => {},
				);
				return result;
			}
			if (hook.kind === 'pause' && hook.phase === 'after') {
				return Promise.resolve(original.apply(this, args)).then(async (value) => {
					const after = { ...ctx, result: value };
					if (!shouldFire(hook, after)) return value;
					await waitRelease(hook, hit(hook, after));
					return value;
				});
			}
			if (!shouldFire(hook, ctx)) return original.apply(this, args);
			if (hook.kind === 'drop') {
				hit(hook, ctx);
				return hook.async === false ? hook.returns : Promise.resolve(hook.returns);
			}
			if (hook.kind === 'fault') {
				hit(hook, ctx);
				const error = new Error(hook.message || `test-rig fault at ${hook.point}`);
				if (hook.phase === 'before') {
					if (hook.async === false) throw error;
					return Promise.reject(error);
				}
				const result = original.apply(this, args);
				/** @type {any} */
				const failed = Promise.resolve(result).then(() => {
					throw error;
				});
				for (const prop of hook.preserve || []) {
					if (typeof result?.[prop] === 'function') failed[prop] = result[prop].bind(result);
				}
				return failed;
			}
			const hitAt = hit(hook, ctx);
			return waitRelease(hook, hitAt).then(() => original.apply(this, args));
		};
	}

	/** @param {any} owner @param {string} method @param {(original: Function) => Function} wrapper */
	function patch(owner, method, wrapper) {
		if (!owner || typeof owner[method] !== 'function') return false;
		owner[method] = wrapper(owner[method]);
		return true;
	}

	/** @param {{ storage: InstanceType<typeof AsyncLocalStorage> }} scope */
	function scopeWrapper(scope) {
		return (/** @type {Function} */ original) =>
			/** @this {any} @param {unknown[]} args */
			function (...args) {
				return scope.storage.run({ args, this: this, fired: new Set() }, () =>
					original.apply(this, args),
				);
			};
	}

	/** @param {string} filename @param {string} suffix */
	const matchesFile = (filename, suffix) =>
		filename
			.split(path.sep)
			.join('/')
			.endsWith(`/${suffix.replace(/^\/+/, '')}`);

	/** @param {{ exports: any }} module @param {string} filename */
	function onLoad(module, filename) {
		for (const scope of scopes.values()) {
			if (scope.installed || !matchesFile(filename, scope.file)) continue;
			const owner = scope.target ? get(module.exports, scope.target) : module.exports;
			scope.installed = patch(owner, scope.method, scopeWrapper(scope));
			log(
				scope.installed ? 'scope-installed' : 'missing',
				`${scope.target || 'exports'}.${scope.method}`,
			);
		}
		for (const hook of hooks) {
			if (hook.installed || !matchesFile(filename, hook.file)) continue;
			const owner = hook.target ? get(module.exports, hook.target) : module.exports;
			hook.installed = patch(owner, hook.method, (original) => wrap(hook, original));
			log(hook.installed ? 'installed' : 'missing', hook.point, {
				file: hook.file,
				target: hook.target,
				method: hook.method,
			});
		}
	}

	const loadJs = Module._extensions['.js'];
	Module._extensions['.js'] = function (/** @type {any} */ module, /** @type {string} */ filename) {
		loadJs.call(this, module, filename);
		if (hooks.length) onLoad(module, filename);
	};

	log('declared', hooks.map((h) => h.point).join(',') || '-', {
		argv: process.argv.slice(2).join(' '),
	});
})();

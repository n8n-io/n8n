/* eslint-disable */
// Loaded into n8n through NODE_OPTIONS. Uses only process.getBuiltinModule, so it runs under --require and --import.
// Hook points come from the REPRO_HOOKS env var (JSON list); see README.md for the format.
(() => {
	const fs = process.getBuiltinModule('node:fs');
	const path = process.getBuiltinModule('node:path');
	const Module = process.getBuiltinModule('node:module');
	const { AsyncLocalStorage } = process.getBuiltinModule('node:async_hooks');

	const CONTROL_DIR = process.env.REPRO_HOOK_DIR || '/tmp/repro-hooks';
	const POLL_MS = Number(process.env.REPRO_HOOK_POLL_MS || 10);
	const MAX_PAUSE_MS = Number(process.env.REPRO_HOOK_MAX_PAUSE_MS || 120000);
	const TAG = '[repro-hook]';

	let hooks = [];
	try {
		hooks = JSON.parse(process.env.REPRO_HOOKS || '[]');
	} catch (error) {
		process.stdout.write(`${TAG} invalid REPRO_HOOKS: ${error.message}\n`);
	}

	fs.mkdirSync(CONTROL_DIR, { recursive: true });

	const log = (event, point, detail) =>
		process.stdout.write(
			`${TAG} ${new Date().toISOString()} pid=${process.pid} ${event} ${point}${detail === undefined ? '' : ` ${JSON.stringify(detail)}`}\n`,
		);
	const file = (point, kind) => path.join(CONTROL_DIR, `${point}.${kind}`);
	const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

	function get(root, dotted) {
		let value = root;
		for (const key of String(dotted).split('.')) {
			if (value === null || value === undefined) return undefined;
			value = value[key];
		}
		return value;
	}

	function plain(value) {
		if (value === null || value === undefined) return value;
		if (['string', 'number', 'boolean'].includes(typeof value)) return value;
		if (typeof value === 'bigint') return String(value);
		try {
			return JSON.parse(JSON.stringify(value));
		} catch {
			return String(value);
		}
	}

	function details(hook, ctx) {
		const out = {};
		for (const [key, dotted] of Object.entries(hook.detail || {}))
			out[key] = plain(get(ctx, dotted));
		return out;
	}

	function matches(hook, ctx) {
		return (hook.where || []).every((rule) => {
			const value = get(ctx, rule.path);
			if ('equals' in rule) return value === rule.equals;
			if ('truthy' in rule) return Boolean(value) === rule.truthy;
			return true;
		});
	}

	const isArmed = (hook) => hook.arm === 'always' || fs.existsSync(file(hook.point, 'arm'));

	function consumeArm(hook) {
		if (hook.arm === 'always' || !hook.once) return true;
		try {
			fs.unlinkSync(file(hook.point, 'arm'));
			return true;
		} catch {
			return false;
		}
	}

	async function waitRelease(hook, hitAt) {
		const release = file(hook.point, 'release');
		while (!fs.existsSync(release)) {
			if (Date.now() - hitAt > MAX_PAUSE_MS) {
				log('timeout', hook.point, { afterMs: MAX_PAUSE_MS });
				return;
			}
			await sleep(POLL_MS);
		}
		try {
			fs.unlinkSync(release);
		} catch {}
		log('release', hook.point, { pausedMs: Date.now() - hitAt });
	}

	function hit(hook, ctx) {
		const detail = details(hook, ctx);
		const hitAt = Date.now();
		if (hook.kind !== 'observe')
			fs.writeFileSync(file(hook.point, 'hit'), JSON.stringify({ hitAt, ...detail }));
		log('hit', hook.point, detail);
		return hitAt;
	}

	const scopes = new Map();
	const scopeKey = (scope) => `${scope.file}#${scope.target}#${scope.method}`;

	for (const hook of hooks) {
		hook.kind = hook.kind || 'pause';
		hook.arm = hook.arm || (hook.kind === 'observe' ? 'always' : 'file');
		hook.once = hook.once ?? hook.kind !== 'drop';
		if (hook.scope && !scopes.has(scopeKey(hook.scope))) {
			scopes.set(scopeKey(hook.scope), { ...hook.scope, storage: new AsyncLocalStorage() });
		}
	}

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

	function wrap(hook, original) {
		const scope = hook.scope && scopes.get(scopeKey(hook.scope));
		return function (...args) {
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
			if (!shouldFire(hook, ctx)) return original.apply(this, args);
			if (hook.kind === 'drop') {
				hit(hook, ctx);
				return hook.async === false ? hook.returns : Promise.resolve(hook.returns);
			}
			if (hook.kind === 'fault') {
				hit(hook, ctx);
				const error = new Error(hook.message || `repro-hook fault at ${hook.point}`);
				if (hook.phase === 'before') {
					if (hook.async === false) throw error;
					return Promise.reject(error);
				}
				const result = original.apply(this, args);
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

	function patch(owner, method, point, wrapper) {
		const holder = owner && typeof owner[method] === 'function' ? owner : undefined;
		if (!holder) return false;
		holder[method] = wrapper(holder[method]);
		return true;
	}

	function scopeWrapper(scope) {
		return (original) =>
			function (...args) {
				return scope.storage.run({ args, this: this, fired: new Set() }, () =>
					original.apply(this, args),
				);
			};
	}

	const matchesFile = (filename, suffix) =>
		filename
			.split(path.sep)
			.join('/')
			.endsWith(`/${suffix.replace(/^\/+/, '')}`);

	function onLoad(module, filename) {
		for (const scope of scopes.values()) {
			if (scope.installed || !matchesFile(filename, scope.file)) continue;
			const owner = scope.target ? get(module.exports, scope.target) : module.exports;
			scope.installed = patch(owner, scope.method, 'scope', scopeWrapper(scope));
			log(
				scope.installed ? 'scope-installed' : 'missing',
				`${scope.target || 'exports'}.${scope.method}`,
			);
		}
		for (const hook of hooks) {
			if (hook.installed || !matchesFile(filename, hook.file)) continue;
			const owner = hook.target ? get(module.exports, hook.target) : module.exports;
			hook.installed = patch(owner, hook.method, hook.point, (original) => wrap(hook, original));
			log(hook.installed ? 'installed' : 'missing', hook.point, {
				file: hook.file,
				target: hook.target,
				method: hook.method,
			});
		}
	}

	const loadJs = Module._extensions['.js'];
	Module._extensions['.js'] = function (module, filename) {
		loadJs.call(this, module, filename);
		if (hooks.length) onLoad(module, filename);
	};

	log('declared', hooks.map((h) => h.point).join(',') || '-', {
		argv: process.argv.slice(2).join(' '),
	});
})();

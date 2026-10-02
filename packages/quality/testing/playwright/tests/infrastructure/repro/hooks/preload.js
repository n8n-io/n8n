/* eslint-disable */
// Loaded into n8n through NODE_OPTIONS. Uses only process.getBuiltinModule, so it runs under --require and --import.
(() => {
	const fs = process.getBuiltinModule('node:fs');
	const path = process.getBuiltinModule('node:path');
	const Module = process.getBuiltinModule('node:module');
	const { AsyncLocalStorage } = process.getBuiltinModule('node:async_hooks');

	const CONTROL_DIR = process.env.REPRO_HOOK_DIR || '/tmp/repro-hooks';
	const POLL_MS = Number(process.env.REPRO_HOOK_POLL_MS || 10);
	const MAX_PAUSE_MS = Number(process.env.REPRO_HOOK_MAX_PAUSE_MS || 120000);
	const TAG = '[repro-hook]';

	fs.mkdirSync(CONTROL_DIR, { recursive: true });

	const log = (msg) =>
		process.stdout.write(`${TAG} ${new Date().toISOString()} pid=${process.pid} ${msg}\n`);
	const file = (point, kind) => path.join(CONTROL_DIR, `${point}.${kind}`);

	async function pauseAt(point, detail) {
		const arm = file(point, 'arm');
		if (!fs.existsSync(arm)) return;
		try {
			fs.unlinkSync(arm);
		} catch {
			return;
		}
		const hitAt = Date.now();
		fs.writeFileSync(file(point, 'hit'), JSON.stringify({ point, hitAt, ...detail }));
		log(`hit ${point} ${JSON.stringify(detail)}`);
		const release = file(point, 'release');
		while (!fs.existsSync(release)) {
			if (Date.now() - hitAt > MAX_PAUSE_MS) {
				log(`timeout ${point} after ${MAX_PAUSE_MS}ms`);
				return;
			}
			await new Promise((r) => setTimeout(r, POLL_MS));
		}
		const requestedAt = Number(fs.readFileSync(release, 'utf8')) || undefined;
		fs.unlinkSync(release);
		const now = Date.now();
		log(
			`release ${point} pausedMs=${now - hitAt}${requestedAt ? ` channelMs=${now - requestedAt}` : ''}`,
		);
	}

	const jobContext = new AsyncLocalStorage();
	const patched = new WeakSet();

	function patchJobProcessor(exports) {
		const proto = exports && exports.JobProcessor && exports.JobProcessor.prototype;
		if (!proto || typeof proto.processJob !== 'function') {
			log(
				'job-processor loaded without JobProcessor.processJob; hook job-before-track not installed',
			);
			return;
		}
		const original = proto.processJob;
		proto.processJob = function (job) {
			const persistence = this.executionPersistence;
			if (
				persistence &&
				typeof persistence.findSingleExecution === 'function' &&
				!patched.has(persistence)
			) {
				patched.add(persistence);
				const find = persistence.findSingleExecution;
				persistence.findSingleExecution = async function (...args) {
					const ctx = jobContext.getStore();
					if (ctx && !ctx.paused) {
						ctx.paused = true;
						await pauseAt('job-before-track', {
							jobId: String(ctx.jobId),
							executionId: String(ctx.executionId),
						});
					}
					return await find.apply(this, args);
				};
			}
			return jobContext.run(
				{ jobId: job.id, executionId: job.data && job.data.executionId, paused: false },
				() => original.call(this, job),
			);
		};
		log('installed job-before-track on JobProcessor.processJob before findSingleExecution');
	}

	const targets = [[/[\\/]dist[\\/]scaling[\\/]job-processor\.js$/, patchJobProcessor]];

	const loadJs = Module._extensions['.js'];
	Module._extensions['.js'] = function (module, filename) {
		loadJs.call(this, module, filename);
		for (const [pattern, patch] of targets) if (pattern.test(filename)) patch(module.exports);
	};

	log(`preload active argv=${process.argv.slice(2).join(' ')} dir=${CONTROL_DIR}`);
})();

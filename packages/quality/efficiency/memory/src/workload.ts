import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

export async function runWorkload(
	command: string[],
	url: string,
	signal: AbortSignal,
	cwd: string,
): Promise<number | null> {
	const [executable, ...args] = command;
	if (!executable) throw new Error('Provide a workload command after --.');
	if (process.platform === 'win32')
		throw new Error(
			'Foreground workloads require macOS or Linux process groups. Manual capture is available on Windows.',
		);
	signal.throwIfAborted();
	const env: NodeJS.ProcessEnv = {
		...process.env,
		N8N_BASE_URL: url,
		PLAYWRIGHT_SKIP_WEBSERVER: 'true',
		RESET_E2E_DB: 'false',
	};
	// Split-editor mode starts services and enables teardown of the attached backend.
	delete env.N8N_EDITOR_URL;
	const child = spawn(executable, args, {
		cwd,
		detached: true,
		stdio: ['ignore', 'inherit', 'inherit'],
		env,
	});
	let exited = false;
	let stopping = false;
	let groupGone = false;
	let cleanupFailure: unknown;
	const completion = new Promise<number | null>((resolve, reject) => {
		child.once('error', reject);
		child.once('close', (code) => {
			exited = true;
			resolve(code);
		});
	});
	const kill = (kind: NodeJS.Signals) => {
		if (groupGone || child.pid === undefined) return;
		try {
			process.kill(-child.pid, kind);
		} catch (error) {
			if (error instanceof Error && 'code' in error && error.code === 'ESRCH') groupGone = true;
			else throw error;
		}
	};
	const groupExists = () => {
		if (groupGone || child.pid === undefined) return false;
		try {
			process.kill(-child.pid, 0);
			return true;
		} catch (error) {
			if (error instanceof Error && 'code' in error && error.code === 'ESRCH') {
				groupGone = true;
				return false;
			}
			// Darwin can report EPERM while the parent's exit notification is pending.
			if (error instanceof Error && 'code' in error && error.code === 'EPERM' && !exited)
				return true;
			throw error;
		}
	};
	const stop = () => {
		if (!stopping) {
			stopping = true;
			try {
				kill('SIGTERM');
			} catch (error) {
				cleanupFailure = error;
			}
		}
	};
	let rejectAbort: (reason: unknown) => void = () => {};
	const aborted = new Promise<never>((_, reject) => {
		rejectAbort = reject;
	});
	const rejectOnAbort = () => rejectAbort(signal.reason);
	signal.addEventListener('abort', stop, { once: true });
	signal.addEventListener('abort', rejectOnAbort, { once: true });
	if (signal.aborted) {
		stop();
		rejectOnAbort();
	}
	let result: number | null = null;
	let failure: unknown;
	try {
		result = await Promise.race([completion, aborted]);
		if (result !== 0) stop();
	} catch (error) {
		failure = error;
	} finally {
		signal.removeEventListener('abort', stop);
		signal.removeEventListener('abort', rejectOnAbort);
	}
	if (stopping || !exited) {
		try {
			stop();
			const deadline = Date.now() + 2000;
			// Let the parent exit notification arrive before probing its surviving group.
			await Promise.race([completion.catch(() => null), delay(25)]);
			while (groupExists() && Date.now() < deadline) await delay(25);
			if (groupExists()) kill('SIGKILL');
			await completion.catch(() => null);
		} catch (error) {
			cleanupFailure = error;
		}
	}
	if (cleanupFailure) {
		const detail = cleanupFailure instanceof Error ? cleanupFailure.message : 'Unknown error';
		throw new Error(
			`${failure instanceof Error ? `${failure.message}. ` : ''}Workload cleanup failed: ${detail}`,
			{ cause: cleanupFailure },
		);
	}
	if (failure) throw failure instanceof Error ? failure : new Error('Workload interrupted.');
	return result;
}

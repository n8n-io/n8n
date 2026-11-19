import type { Page } from '@playwright/test';
import type { N8NStack } from 'n8n-containers';

/** What the runner records when a page load fails, so a CI failure explains itself. */
export interface Diagnostics {
	url: string;
	/** HTTP status (or error text) of `/healthz` and `/healthz/readiness` at failure time. */
	backend: { healthz: string; readiness: string };
	/** Text of every `[role="alert"]` on the page (the editor's error toasts). */
	alerts: string[];
	/** Console errors and uncaught page errors since the iteration started. */
	consoleErrors: string[];
	/** Last lines of the n8n container log, container stands only. */
	containerLogTail: string[] | null;
}

async function probe(url: string): Promise<string> {
	try {
		const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
		return String(response.status);
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
}

export async function probeBackend(baseURL: string): Promise<Diagnostics['backend']> {
	const base = baseURL.replace(/\/$/, '');
	const [healthz, readiness] = await Promise.all([
		probe(`${base}/healthz`),
		probe(`${base}/healthz/readiness`),
	]);
	return { healthz, readiness };
}

/** Polls readiness until the backend answers 200 or the deadline passes. */
export async function waitForBackend(baseURL: string, timeoutMs: number): Promise<boolean> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const { readiness } = await probeBackend(baseURL);
		if (readiness === '200') return true;
		await new Promise((resolve) => setTimeout(resolve, 2_000));
	}
	return false;
}

export interface ConsoleCollector {
	stop: () => string[];
}

/** Collects console errors and page errors until `stop()` is called. */
export function collectConsoleErrors(page: Page): ConsoleCollector {
	const messages: string[] = [];
	const onConsole = (message: { type: () => string; text: () => string }) => {
		if (message.type() === 'error') messages.push(message.text());
	};
	const onPageError = (error: Error) => messages.push(`pageerror: ${error.message}`);
	page.on('console', onConsole);
	page.on('pageerror', onPageError);
	return {
		stop: () => {
			page.off('console', onConsole);
			page.off('pageerror', onPageError);
			return messages;
		},
	};
}

export async function readPageAlerts(page: Page): Promise<string[]> {
	try {
		return await page.evaluate(() =>
			Array.from(document.querySelectorAll('[role="alert"]'))
				.map((element) => (element as HTMLElement).innerText.replace(/\s+/g, ' ').trim())
				.filter((text) => text.length > 0),
		);
	} catch (error) {
		return [`could not read alerts: ${error instanceof Error ? error.message : String(error)}`];
	}
}

export async function readContainerLogTail(
	stack: N8NStack | undefined,
	lines: number,
): Promise<string[] | null> {
	if (!stack) return null;
	const [main] = stack.findContainers(/-n8n(-main-\d+)?$/);
	if (!main) return null;
	try {
		// The log stream follows the container and never ends on its own, so read
		// for a bounded time and then close it.
		const stream = await main.logs();
		const text = await new Promise<string>((resolve) => {
			let buffer = '';
			const finish = () => {
				clearTimeout(timer);
				stream.destroy();
				resolve(buffer);
			};
			const timer = setTimeout(finish, 3_000);
			stream.on('data', (chunk: Buffer | string) => {
				buffer += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
			});
			stream.on('end', finish);
			stream.on('error', finish);
		});
		return text
			.split('\n')
			.filter((line) => line.length > 0)
			.slice(-lines);
	} catch (error) {
		return [
			`could not read container logs: ${error instanceof Error ? error.message : String(error)}`,
		];
	}
}

export async function collectDiagnostics(args: {
	page: Page;
	baseURL: string;
	stack: N8NStack | undefined;
	consoleErrors: string[];
}): Promise<Diagnostics> {
	const [backend, alerts, containerLogTail] = await Promise.all([
		probeBackend(args.baseURL),
		readPageAlerts(args.page),
		readContainerLogTail(args.stack, 200),
	]);
	return {
		url: args.page.url(),
		backend,
		alerts,
		consoleErrors: args.consoleErrors,
		containerLogTail,
	};
}

import type { BrowserContext, ConsoleMessage, TestInfo } from '@playwright/test';

interface ConsoleError {
	type: string;
	text: string;
	location: string;
	timestamp: number;
}

/**
 * Monitors browser context for console errors.
 * Attaches diagnostic info to test results when errors occur.
 * No-op when no errors are detected.
 */
class ConsoleErrorMonitor {
	private errors: ConsoleError[] = [];

	private readonly listener = (message: ConsoleMessage) => {
		if (message.type() === 'error') {
			this.errors.push({
				type: message.type(),
				text: message.text(),
				location: message.location().url,
				timestamp: Date.now(),
			});
		}
	};

	attach(context: BrowserContext): void {
		context.on('console', this.listener);
	}

	detach(context: BrowserContext): void {
		context.off('console', this.listener);
	}

	hasErrors(): boolean {
		return this.errors.length > 0;
	}

	getErrors(): ConsoleError[] {
		return this.errors;
	}
}

/**
 * Console error monitor fixtures for capturing browser errors.
 * Spread into test.extend() to enable monitoring.
 */
export const consoleErrorFixtures = {
	_consoleErrorMonitor: [
		async (
			{ context }: { context: BrowserContext },
			use: (monitor: ConsoleErrorMonitor) => Promise<void>,
			testInfo: TestInfo,
		) => {
			const monitor = new ConsoleErrorMonitor();
			monitor.attach(context);

			await use(monitor);

			monitor.detach(context);

			// Attach diagnostics if errors occurred
			if (monitor.hasErrors()) {
				await testInfo.attach('console-errors', {
					body: JSON.stringify(
						{
							errors: monitor.getErrors(),
							testTitle: testInfo.title,
							project: testInfo.project.name,
						},
						null,
						2,
					),
					contentType: 'application/json',
				});
			}
		},
		{ auto: true },
	],
};

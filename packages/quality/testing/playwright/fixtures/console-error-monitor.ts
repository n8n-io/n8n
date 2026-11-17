import type { BrowserContext, ConsoleMessage, TestInfo } from '@playwright/test';

interface ConsoleError {
	type: string;
	text: string;
	location: string;
	timestamp: number;
}

/**
 * Records console errors from a browser context. `report()` stops recording and
 * attaches the errors to the test result, if there are any.
 */
export function watchConsoleErrors(context: BrowserContext) {
	const errors: ConsoleError[] = [];
	const listener = (message: ConsoleMessage) => {
		if (message.type() !== 'error') return;
		errors.push({
			type: message.type(),
			text: message.text(),
			location: message.location().url,
			timestamp: Date.now(),
		});
	};
	context.on('console', listener);

	return {
		async report(testInfo: TestInfo) {
			context.off('console', listener);
			if (errors.length === 0) return;
			await testInfo.attach('console-errors', {
				body: JSON.stringify(
					{ errors, testTitle: testInfo.title, project: testInfo.project.name },
					null,
					2,
				),
				contentType: 'application/json',
			});
		},
	};
}

import type { BrowserContext, TestInfo } from '@playwright/test';
import { randomBytes } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

// Files in this directory are merged by `pnpm coverage:report` and uploaded
// to Codecov as the `frontend-e2e` flag. The aggregate workflow expects
// `.nyc_output/coverage/*.json` so files must land directly in this folder,
// not in per-test subdirectories. Resolving from `__dirname` keeps the path
// stable regardless of Playwright worker subprocess cwd.
const OUT_DIR = path.resolve(__dirname, '..', '.nyc_output', 'coverage');
const COVERAGE_PROJECT_NAME = 'coverage';
const BROWSER_HOOK = '__n8nDumpCoverage__';

type IstanbulCoverage = Record<string, unknown>;

declare global {
	interface Window {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		__coverage__?: IstanbulCoverage;
		[BROWSER_HOOK]?: (json: string) => void;
	}
}

async function writeCoverage(coverage: IstanbulCoverage, fileName: string): Promise<void> {
	if (Object.keys(coverage).length === 0) return;
	await mkdir(OUT_DIR, { recursive: true });
	await writeFile(path.join(OUT_DIR, fileName), JSON.stringify(coverage));
}

function fileName(testInfo: TestInfo, suffix: string): string {
	return `${testInfo.testId}-${testInfo.retry}-${suffix}.json`;
}

/**
 * Writes browser-collected istanbul coverage (`window.__coverage__`) to
 * `.nyc_output/coverage/*.json` after each test in the `coverage` Playwright
 * project. Runs alongside the Currents coverage fixture, which is responsible
 * for uploading to the Currents dashboard but does not own the local files
 * the aggregate workflow needs.
 *
 * A `beforeunload` listener captures coverage from pages that navigate or
 * close mid-test; a final snapshot at fixture teardown captures coverage
 * from pages still open when the test finishes.
 */
const log = (msg: string, extra?: Record<string, unknown>): void => {
	const payload = extra ? ` ${JSON.stringify(extra)}` : '';
	console.log(`[coverage-writer] ${msg}${payload}`);
};

export const coverageWriterFixtures = {
	_coverageWriter: [
		async (
			{ context }: { context: BrowserContext },
			use: (value: undefined) => Promise<void>,
			testInfo: TestInfo,
		) => {
			log('fixture entered', {
				project: testInfo.project.name,
				testId: testInfo.testId,
				outDir: OUT_DIR,
			});
			if (testInfo.project.name !== COVERAGE_PROJECT_NAME) {
				log('skipped: project name mismatch');
				await use(undefined);
				return;
			}

			try {
				await context.exposeFunction(BROWSER_HOOK, async (json: string) => {
					if (!json) return;
					try {
						const parsed: unknown = JSON.parse(json);
						if (parsed && typeof parsed === 'object') {
							const name = fileName(testInfo, `unload-${randomBytes(4).toString('hex')}`);
							await writeCoverage(parsed as IstanbulCoverage, name);
							log('wrote unload snapshot', { name });
						}
					} catch (error) {
						log('unload write failed', { error: String(error) });
					}
				});
				log('exposeFunction registered');
			} catch (error) {
				log('exposeFunction threw', { error: String(error) });
			}

			try {
				await context.addInitScript((hook) => {
					window.addEventListener('beforeunload', () => {
						const cov = window.__coverage__;
						const dump = (window as unknown as Record<string, unknown>)[hook];
						if (cov && typeof dump === 'function') {
							(dump as (json: string) => void)(JSON.stringify(cov));
						}
					});
				}, BROWSER_HOOK);
				log('addInitScript registered');
			} catch (error) {
				log('addInitScript threw', { error: String(error) });
			}

			await use(undefined);

			const pages = context.pages();
			log('test ended', { pageCount: pages.length });
			for (const [index, page] of pages.entries()) {
				try {
					const cov = await page.evaluate(() => window.__coverage__);
					if (cov) {
						const name = fileName(testInfo, `final-${index}`);
						await writeCoverage(cov, name);
						log('wrote final snapshot', { name, fileKeys: Object.keys(cov).length });
					} else {
						log('no coverage on page', { index });
					}
				} catch (error) {
					log('final read failed', { index, error: String(error) });
				}
			}
		},
		{ auto: true },
	],
};

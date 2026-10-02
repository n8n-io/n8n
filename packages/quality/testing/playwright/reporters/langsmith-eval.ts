import type {
	FullConfig,
	FullResult,
	Reporter,
	Suite,
	TestCase,
	TestResult,
} from '@playwright/test/reporter';
import debug from 'debug';
import { Client } from 'langsmith';

import { LANGSMITH_RUN_ID_ANNOTATION } from '../fixtures/langsmith';

const log = debug('langsmith-eval');

// eslint-disable-next-line import-x/no-default-export
export default class LangSmithEvalReporter implements Reporter {
	private client: Client | undefined;

	private feedbackPromises: Array<Promise<unknown>> = [];

	onBegin(_config: FullConfig, suite: Suite): void {
		if (process.env.LANGSMITH_API_KEY) {
			this.client = new Client();
		}
		const project = process.env.LANGSMITH_PROJECT ?? 'unset';
		const mode = this.client ? 'live' : 'offline';
		process.stdout.write(
			`[langsmith-eval] active mode=${mode} project=${project} tests=${suite.allTests().length}\n`,
		);
	}

	onTestBegin(test: TestCase): void {
		log('start id=%s title=%s', test.id, test.title);
	}

	onTestEnd(test: TestCase, result: TestResult): void {
		const runIds = result.annotations
			.filter((a) => a.type === LANGSMITH_RUN_ID_ANNOTATION)
			.map((a) => a.description)
			.filter((id): id is string => Boolean(id));
		log('end id=%s status=%s runs=%d', test.id, result.status, runIds.length);

		if (this.client) {
			const score = result.status === 'passed' ? 1 : 0;
			const comment = result.error?.message;
			for (const runId of runIds) {
				this.feedbackPromises.push(
					this.client
						.createFeedback(runId, 'passed', { score, comment })
						.catch((error: unknown) => log('feedback failed runId=%s err=%o', runId, error)),
				);
			}
		}
	}

	async onEnd(result: FullResult): Promise<void> {
		await Promise.all(this.feedbackPromises);
		if (this.client) await this.client.awaitPendingTraceBatches();
		process.stdout.write(
			`[langsmith-eval] done status=${result.status} feedback=${this.feedbackPromises.length}\n`,
		);
	}
}

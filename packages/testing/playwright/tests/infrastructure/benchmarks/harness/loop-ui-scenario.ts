import type { n8nPage } from '../../../../pages/n8nPage';

export interface UiScenarioResult {
	kind: 'ui-scenario';
	latenciesMs: number[];
}

export interface LoopUiScenarioOptions {
	n8n: n8nPage;
	scenario: (n8n: n8nPage) => Promise<void>;
	repeats: number;
}

export async function loopUiScenario(options: LoopUiScenarioOptions): Promise<UiScenarioResult> {
	const { n8n, scenario, repeats } = options;
	console.log(`[UI] Running ${repeats} iterations`);
	const latenciesMs: number[] = [];
	for (let i = 0; i < repeats; i++) {
		const t0 = Date.now();
		await scenario(n8n);
		latenciesMs.push(Date.now() - t0);
	}
	return { kind: 'ui-scenario', latenciesMs };
}

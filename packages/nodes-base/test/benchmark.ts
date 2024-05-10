import glob from 'fast-glob';
import Bench from 'tinybench';
import { withCodSpeed } from '@codspeed/tinybench-plugin';
import { setup, workflowToTests as toTests } from './nodes/Helpers';
import { executeWorkflow } from './nodes/ExecuteWorkflow';

async function main() {
	const filePaths = await glob('nodes/**/*.workflow.json');

	console.log(`Found ${filePaths.length} workflows to benchmark`);

	const tests = toTests(filePaths);
	const nodeTypes = setup(tests);
	const bench = withCodSpeed(new Bench({ time: 0, iterations: 1 })); // @TODO temp config

	// for (const test of tests) {
	for (const test of tests.slice(0, 1)) {
		bench.add(test.description, async () => {
			await executeWorkflow(test, nodeTypes);
		});
	}

	await bench.warmup();
	await bench.run();

	console.table(bench.table());
}

void main();

import glob from 'fast-glob';
import Bench from 'tinybench';
import { withCodSpeed } from '@codspeed/tinybench-plugin';
import { setup, workflowToTests as toTests } from './nodes/Helpers';
import { performExecution, setupExecution } from './nodes/ExecuteWorkflow';

async function main() {
	const filePaths = await glob('nodes/**/*.workflow.json');

	console.log(`Found ${filePaths.length} workflows to benchmark`);

	const tests = toTests(filePaths);
	const nodeTypes = setup(tests);
	const bench = withCodSpeed(new Bench({ time: 0, iterations: 1 })); // @TODO temp config

	for (const test of tests) {
		const { waitPromise, additionalData, executionMode, workflowInstance, nodeExecutionOrder } =
			await setupExecution(test, nodeTypes);

		bench.add(test.description, async () => {
			await performExecution(
				waitPromise,
				additionalData,
				executionMode,
				test,
				workflowInstance,
				nodeExecutionOrder,
			);
		});
	}

	await bench.warmup();
	await bench.run();
}

void main();

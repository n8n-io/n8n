import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const workflowPaths = fs
	.readdirSync('workflows')
	.filter((file) => file.endsWith('.json'))
	.map((file) => path.join('workflows', file))
	.sort();

function loadWorkflow(workflowPath) {
	return JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
}

test('workflows do not contain duplicate nodes or composer polling loops', () => {
	for (const workflowPath of workflowPaths) {
		const workflow = loadWorkflow(workflowPath);
		const nodeNames = workflow.nodes.map((node) => node.name);
		const duplicateNodeNames = nodeNames.filter((name, index) => nodeNames.indexOf(name) !== index);
		const code = workflow.nodes.map((node) => node.parameters?.jsCode || '').join('\n');

		assert.deepEqual(duplicateNodeNames, [], `${workflowPath} should not contain duplicate node names`);
		assert.doesNotMatch(code, /managed-job-runner\.mjs/, `${workflowPath} should not use managed runner`);
		assert.doesNotMatch(code, /detached:\s*true/, `${workflowPath} should not detach a background runner`);
		assert.equal(
			workflow.nodes.some((node) => ['Wait For Composer', 'Check Composer Status', 'Composer Complete?'].includes(node.name)),
			false,
			`${workflowPath} should not contain composer polling nodes`,
		);
		assert.equal(
			Object.keys(workflow.connections || {}).some((name) => ['Wait For Composer', 'Check Composer Status', 'Composer Complete?'].includes(name)),
			false,
			`${workflowPath} should not contain composer polling connections`,
		);

		for (const [sourceNode, connection] of Object.entries(workflow.connections || {})) {
			for (const output of connection.main || []) {
				for (const edge of output || []) {
					assert.notEqual(edge.node, sourceNode, `${workflowPath} should not contain self-loop ${sourceNode}`);
				}
			}
		}
	}
});

test('direct composer workflow code nodes compile', () => {
	for (const workflowPath of workflowPaths) {
		const workflow = loadWorkflow(workflowPath);
		for (const node of workflow.nodes) {
			const code = node.parameters?.jsCode;
			if (!code) continue;
			assert.doesNotThrow(
				() => new vm.Script(`(async function(){\n${code}\n})`),
				`${workflowPath} ${node.name} should compile`,
			);
		}
	}
});

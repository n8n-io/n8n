import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const workflowPaths = [
	'workflows/video-clip-tts-workflow.json',
	'workflows/video-clip-ai-podcast-workflow.json',
	'workflows/presentation-ai-podcast-workflow.json',
	'workflows/pdf-enhanced-ai-podcast-workflow.json',
	'workflows/pdf-science-explainer-video-workflow.json',
];

function loadWorkflow(workflowPath) {
	return JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
}

function getNode(workflow, name) {
	const node = workflow.nodes.find((candidate) => candidate.name === name);
	assert.ok(node, `Expected node ${name} in ${workflow.name}`);

	return node;
}

test('composer workflows run in a direct linear chain without polling loops', () => {
	for (const workflowPath of workflowPaths) {
		const workflow = loadWorkflow(workflowPath);
		const composerNode = workflow.nodes.find((node) => /Composer/.test(node.name));
		assert.ok(composerNode, `${workflowPath} should have a composer node`);
		const code = composerNode.parameters?.jsCode || '';
		assert.doesNotMatch(code, /managed-job-runner\.mjs/, `${composerNode.name} should not use managed runner`);
		assert.doesNotMatch(code, /detached:\s*true/, `${composerNode.name} should not detach a background runner`);
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

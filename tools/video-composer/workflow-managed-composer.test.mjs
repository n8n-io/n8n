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

test('long-running composer workflows use managed background jobs', () => {
	for (const workflowPath of workflowPaths) {
		const workflow = loadWorkflow(workflowPath);
		const composerNode = workflow.nodes.find((node) => /Composer/.test(node.name));
		assert.ok(composerNode, `${workflowPath} should have a composer node`);
		const code = composerNode.parameters?.jsCode || '';
		assert.match(code, /managed-job-runner\.mjs/, `${composerNode.name} should use managed runner`);
		assert.doesNotMatch(code, /child\.on\('close'/, `${composerNode.name} should not wait on child close`);
		assert.match(code, /detached:\s*true/, `${composerNode.name} should detach the runner`);

		const waitNode = getNode(workflow, 'Wait For Composer');
		assert.equal(waitNode.type, 'n8n-nodes-base.wait');
		assert.equal(waitNode.parameters.amount, 30);

		const checkNode = getNode(workflow, 'Check Composer Status');
		assert.equal(checkNode.type, 'n8n-nodes-base.code');
		assert.match(checkNode.parameters.jsCode, /composerStatusPath/);

		const ifNode = getNode(workflow, 'Composer Complete?');
		assert.equal(ifNode.type, 'n8n-nodes-base.if');
	}
});

test('managed composer workflow code nodes compile', () => {
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

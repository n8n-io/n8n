import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = JSON.parse(
	fs.readFileSync('workflows/pdf-science-explainer-video-workflow.json', 'utf8'),
);

function getNode(name) {
	const node = workflow.nodes.find((candidate) => candidate.name === name);
	assert.ok(node, `Expected workflow node: ${name}`);
	return node;
}

test('science explainer workflow has the expected import name and nodes', () => {
	assert.equal(workflow.name, 'MVP - PDF Science Explainer Video Composer');

	for (const nodeName of [
		'Upload Science Explainer Assets',
		'Prepare Science Explainer Job',
		'Extract PDF Pages',
		'Analyze PDF Page Visuals',
		'Generate Science Explainer Script',
		'Run Page TTS',
		'Build Science Explainer Video Job',
		'Run Science Explainer Composer',
		'Prepare Response',
		'Respond to Webhook',
	]) {
		getNode(nodeName);
	}
});

test('science explainer workflow defaults to vertical single-speaker output', () => {
	const form = getNode('Upload Science Explainer Assets');
	const fields = form.parameters.formFields.values;
	const aspectRatio = fields.find((field) => field.fieldLabel === 'aspect_ratio');
	const narrationMode = fields.find((field) => field.fieldLabel === 'narration_mode');

	assert.equal(aspectRatio.defaultValue, '9:16');
	assert.equal(narrationMode.defaultValue, 'single_speaker');
});

test('science explainer workflow stores generated files under project tmp by default', () => {
	const prepareJobCode = getNode('Prepare Science Explainer Job').parameters.jsCode;

	assert.match(prepareJobCode, /const tmpDir = repoDir \+ '\/tmp';/);
	assert.match(
		prepareJobCode,
		/const baseDir = trimTrailingSlash\(item\.json\.jobs_dir \|\| \$env\.VIDEO_COMPOSER_JOBS_DIR \|\| \$env\.N8N_VIDEO_COMPOSER_JOBS_DIR \|\| tmpDir \+ '\/n8n-video-jobs'\);/,
	);
});

test('science explainer workflow calls the science composer script', () => {
	const composerCode = getNode('Run Science Explainer Composer').parameters.jsCode;

	assert.match(composerCode, /compose-science-explainer-video\.mjs/);
	assert.match(composerCode, /science-video-job\.json/);
});

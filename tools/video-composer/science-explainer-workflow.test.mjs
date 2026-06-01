import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const workflow = JSON.parse(
	fs.readFileSync('workflows/pdf-science-explainer-video-workflow.json', 'utf8'),
);

function getNode(name) {
	const node = workflow.nodes.find((candidate) => candidate.name === name);
	assert.ok(node, `Expected workflow node: ${name}`);
	return node;
}

test('science explainer workflow has the expected import name and nodes', () => {
	assert.equal(workflow.id, 'pdf-science-explainer-video-workflow');
	assert.equal(workflow.name, 'MVP - PDF Science Explainer Video Composer');

	for (const nodeName of [
		'Upload Science Explainer Assets',
		'Prepare Science Explainer Job',
		'Extract PDF Pages',
		'Analyze PDF Page Visuals',
		'Generate Science Explainer Script',
		'Run Continuous Science Narration',
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

test('science explainer workflow defaults to execution binary previews for final video and audio', () => {
	const formFields = getNode('Upload Science Explainer Assets').parameters.formFields.values;
	const previewField = formFields.find((field) => field.fieldLabel === 'include_execution_binary_preview');
	const prepareJobCode = getNode('Prepare Science Explainer Job').parameters.jsCode;
	const responseCode = getNode('Prepare Response').parameters.jsCode;

	assert.equal(previewField.defaultValue, 'include_execution_binary_preview');
	assert.match(prepareJobCode, /const includeBinaryPreview = normalizeChoice\(item\.json\.include_execution_binary_preview, 'include_execution_binary_preview'\)/);
	assert.match(prepareJobCode, /voiceB, includeBinaryPreview/);
	assert.match(responseCode, /finalVideo: await this\.helpers\.prepareBinaryData\(video, 'final\.mp4', 'video\/mp4'\)/);
	assert.match(responseCode, /scienceExplainerAudio: await this\.helpers\.prepareBinaryData\(audio, 'merged-audio\.mp3', 'audio\/mpeg'\)/);
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
	assert.match(composerCode, /item\.composerJobPath/);
	assert.doesNotMatch(composerCode, /managed-job-runner\.mjs/);
});

test('science explainer workflow generates one continuous narration before slicing by page', () => {
	const narrationCode = getNode('Run Continuous Science Narration').parameters.jsCode;

	assert.match(narrationCode, /continuous-podcast-client\.mjs/);
	assert.match(narrationCode, /researchScriptPath: item\.pageScriptPath/);
	assert.match(narrationCode, /pageAudioManifestPath/);
	assert.doesNotMatch(narrationCode, /presentation-podcast-client\.mjs/);
	assert.doesNotMatch(narrationCode, /pageScriptPath:/);
});

test('science explainer code nodes avoid modules blocked by n8n task runner', () => {
	const disallowedModules = ['path'];

	for (const node of workflow.nodes) {
		const jsCode = node.parameters?.jsCode;
		if (!jsCode) continue;

		for (const moduleName of disallowedModules) {
			assert.doesNotMatch(
				jsCode,
				new RegExp(`require\\(['"]${moduleName}['"]\\)`),
				`${node.name} must not require ${moduleName}`,
			);
		}
	}
});

test('science explainer code nodes are valid n8n task-runner JavaScript', () => {
	for (const node of workflow.nodes) {
		const jsCode = node.parameters?.jsCode;
		if (!jsCode) continue;

		assert.doesNotThrow(
			() => new vm.Script(`(async function(){\n${jsCode}\n})`),
			`${node.name} must compile in the n8n task runner`,
		);
	}
});

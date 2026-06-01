import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const workflow = JSON.parse(
	fs.readFileSync('workflows/pdf-science-explainer-video-workflow.json', 'utf8'),
);
const presentationWorkflow = JSON.parse(
	fs.readFileSync('workflows/presentation-ai-podcast-workflow.json', 'utf8'),
);

function getNode(name) {
	const node = workflow.nodes.find((candidate) => candidate.name === name);
	assert.ok(node, `Expected workflow node: ${name}`);
	return node;
}

function getPresentationNode(name) {
	const node = presentationWorkflow.nodes.find((candidate) => candidate.name === name);
	assert.ok(node, `Expected presentation workflow node: ${name}`);
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
	const voiceA = fields.find((field) => field.fieldLabel === 'voice_a');
	const voiceB = fields.find((field) => field.fieldLabel === 'voice_b');

	assert.equal(aspectRatio.defaultValue, '9:16');
	assert.equal(narrationMode.defaultValue, 'single_speaker');
	assert.ok(voiceA, 'single speaker voice field must remain available');
	assert.ok(voiceB, 'second speaker voice field must remain available for two-speaker mode');
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

test('science explainer workflow reuses the proven presentation PDF extraction path', () => {
	const presentationExtractCode = getPresentationNode('Convert Presentation').parameters.jsCode;
	const scienceExtractCode = getNode('Extract PDF Pages').parameters.jsCode;
	const prepareJobCode = getNode('Prepare Science Explainer Job').parameters.jsCode;

	assert.match(prepareJobCode, /fs\.writeFileSync\(extractJobPath, JSON\.stringify\(\{ jobId, sourcePath: pdfPath, presentationDir, pagesDir, pagesManifestPath \}/);
	assert.match(presentationExtractCode, /extract-presentation\.mjs/);
	assert.match(scienceExtractCode, /extract-presentation\.mjs/);
	assert.match(scienceExtractCode, /\[item\.extractJobPath\]/);
});

test('science explainer workflow calls the science composer script', () => {
	const composerCode = getNode('Run Science Explainer Composer').parameters.jsCode;

	assert.match(composerCode, /compose-science-explainer-video\.mjs/);
	assert.match(composerCode, /item\.composerJobPath/);
	assert.doesNotMatch(composerCode, /managed-job-runner\.mjs/);
});

test('science explainer workflow uses the dedicated science script client with visual analysis', () => {
	const prepareJobCode = getNode('Prepare Science Explainer Job').parameters.jsCode;
	const visualCode = getNode('Analyze PDF Page Visuals').parameters.jsCode;
	const scriptCode = getNode('Generate Science Explainer Script').parameters.jsCode;

	assert.match(prepareJobCode, /analysisDir/);
	assert.match(prepareJobCode, /pageVisualAnalysisPath/);
	assert.match(prepareJobCode, /visualAnalysisJobPath/);
	assert.match(visualCode, /science-visual-analysis-client\.mjs/);
	assert.match(scriptCode, /science-explainer-script-client\.mjs/);
	assert.match(scriptCode, /pageVisualAnalysisPath: item\.pageVisualAnalysisPath/);
	assert.doesNotMatch(scriptCode, /presentation-script-client\.mjs/);
	assert.doesNotMatch(prepareJobCode, /const podcastStyle/);
});

test('science explainer workflow uses continuous science narration for the generated script', () => {
	const narrationCode = getNode('Run Continuous Science Narration').parameters.jsCode;

	assert.match(narrationCode, /continuous-podcast-client\.mjs/);
	assert.match(narrationCode, /researchScriptPath: item\.pageScriptPath/);
	assert.match(narrationCode, /pageAudioManifestPath/);
	assert.doesNotMatch(narrationCode, /presentation-podcast-client\.mjs/);
	assert.doesNotMatch(narrationCode, /presentation-tts-client\.mjs/);
	assert.equal(workflow.nodes.find((node) => node.name === 'Run Page AI Podcast'), undefined);
});

test('science explainer script rules are inline and do not depend on a separate skill file', () => {
	const scienceSkillPath = 'tools/video-composer/pdf-science-explainer-script/SKILL.md';
	const scienceUtils = fs.readFileSync('tools/video-composer/science-explainer-utils.mjs', 'utf8');
	const presentationScriptClient = fs.readFileSync(
		'tools/video-composer/presentation-script-client.mjs',
		'utf8',
	);

	assert.equal(fs.existsSync(scienceSkillPath), false);
	assert.doesNotMatch(scienceUtils, /pdf-science-explainer-script skill/);
	assert.doesNotMatch(presentationScriptClient, /pdf-science-explainer-script skill/);
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

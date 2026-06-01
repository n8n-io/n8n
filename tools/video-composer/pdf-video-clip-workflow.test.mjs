import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflowPath = 'workflows/pdf-video-clip-ai-podcast-workflow.json';
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

function getNode(name) {
	const node = workflow.nodes.find((candidate) => candidate.name === name);
	assert.ok(node, `Expected workflow node: ${name}`);
	return node;
}

function getCode(name) {
	return getNode(name).parameters.jsCode;
}

test('PDF video clip workflow collects cover, screenshot, PDF, viewpoint, and background video', () => {
	assert.equal(workflow.name, 'MVP - PDF Video Clip AI Podcast Composer');

	const fields = getNode('Upload PDF Video Clip Assets').parameters.formFields.values;
	const labels = fields.map((field) => field.fieldLabel);

	for (const label of ['cover_image', 'proof_screenshot', 'pdf_file', 'viewpoint', 'background_video']) {
		assert.ok(labels.includes(label), `Expected upload field ${label}`);
	}

	assert.equal(fields.find((field) => field.fieldLabel === 'cover_image').requiredField, true);
	assert.equal(fields.find((field) => field.fieldLabel === 'proof_screenshot').requiredField, true);
	assert.equal(fields.find((field) => field.fieldLabel === 'pdf_file').requiredField, true);
	assert.equal(fields.find((field) => field.fieldLabel === 'background_video').requiredField, true);
	assert.equal(fields.find((field) => field.fieldLabel === 'viewpoint').requiredField, false);
	assert.equal(
		fields.find((field) => field.fieldLabel === 'include_execution_binary_preview').defaultValue,
		'include_execution_binary_preview',
	);
});

test('PDF video clip workflow uses PDF text to generate one continuous blog-style podcast script', () => {
	const prepareJobCode = getCode('Prepare PDF Video Clip Job');
	const scriptCode = getCode('Generate Blog Podcast Script');
	const podcastCode = getCode('Run Continuous AI Podcast');

	assert.match(prepareJobCode, /pagesManifestPath/);
	assert.match(prepareJobCode, /researchScriptJobPath/);
	assert.match(prepareJobCode, /博客式讲解/);
	assert.match(prepareJobCode, /整篇 PDF 作为一篇连续博客式讲解/);
	assert.match(prepareJobCode, /用户观点优先/);
	assert.match(prepareJobCode, /PDF 页面文本用于校验/);
	assert.match(prepareJobCode, /const aiPodcastTimeoutMs = Number\(item\.json\.ai_podcast_timeout_ms \|\| 270000\)/);
	assert.match(prepareJobCode, /podcastSpeakerB, aiPodcastTimeoutMs/);
	assert.match(scriptCode, /research-podcast-script-client\.mjs/);
	assert.match(scriptCode, /item\.researchScriptJobPath/);
	assert.match(podcastCode, /continuous-podcast-client\.mjs/);
	assert.match(podcastCode, /item\.podcastJobPath/);
});

test('PDF video clip workflow builds the requested cover and screenshot video layout', () => {
	const buildCode = getCode('Build PDF Video Clip Job Config');
	const composerCode = getCode('Run PDF Video Clip Composer');

	assert.match(composerCode, /compose-video\.mjs/);
	assert.match(buildCode, /layoutMode: 'cover-screenshot-podcast'/);
	assert.match(buildCode, /coverDuration: Number\(item\.cover_duration_seconds \|\| 3\)/);
	assert.match(buildCode, /screenshotTopDuration: Number\(item\.screenshot_top_seconds \|\| 3\)/);
	assert.match(buildCode, /screenshotDuration: 0/);
	assert.match(buildCode, /coverTop/);
	assert.match(buildCode, /screenshotTop/);
	assert.match(buildCode, /subtitleBottomMargin: Number\(item\.subtitle_bottom_margin \|\| 90\)/);
});

test('PDF video clip workflow avoids disallowed Code node modules and polling loops', () => {
	const code = workflow.nodes.map((node) => node.parameters?.jsCode || '').join('\n');

	assert.doesNotMatch(code, /require\(['"]path['"]\)/);
	assert.doesNotMatch(code, /managed-job-runner\.mjs/);
	assert.doesNotMatch(code, /detached:\s*true/);
	assert.equal(
		workflow.nodes.some((node) => ['Wait For Composer', 'Check Composer Status', 'Composer Complete?'].includes(node.name)),
		false,
	);
});

test('PDF video clip workflow defaults to binary previews for the n8n execution view', () => {
	const prepareJobCode = getCode('Prepare PDF Video Clip Job');
	const responseCode = getCode('Prepare Response');

	assert.match(prepareJobCode, /normalizeChoice\(item\.json\.include_execution_binary_preview, 'include_execution_binary_preview'\)/);
	assert.match(responseCode, /const includeBinaryPreview = item\.includeBinaryPreview === 'include_execution_binary_preview'/);
	assert.match(responseCode, /if \(!includeBinaryPreview\) return \[\{ json }\];/);
	assert.match(responseCode, /finalVideo/);
	assert.match(responseCode, /podcastAudio/);
	assert.match(responseCode, /videoPath: item\.outputVideoPath/);
	assert.match(responseCode, /audioPath: item\.outputAudioPath/);
});

test('PDF video clip workflow responds through a dedicated webhook response node', () => {
	const formTrigger = getNode('Upload PDF Video Clip Assets');
	const respondNode = getNode('Respond to Webhook');

	assert.equal(formTrigger.type, 'n8n-nodes-base.formTrigger');
	assert.ok(formTrigger.typeVersion > 2.1);
	assert.equal(formTrigger.parameters.responseMode, 'responseNode');
	assert.equal(respondNode.type, 'n8n-nodes-base.respondToWebhook');
	assert.match(respondNode.parameters.responseBody, /videoPath/);
	assert.match(respondNode.parameters.responseBody, /audioPath/);
	assert.equal(workflow.connections['Prepare Response'].main[0][0].node, 'Respond to Webhook');
});

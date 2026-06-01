import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = JSON.parse(
	fs.readFileSync('workflows/pdf-enhanced-ai-podcast-workflow.json', 'utf8'),
);

function getNode(name) {
	const node = workflow.nodes.find((candidate) => candidate.name === name);
	assert.ok(node, `Expected workflow node: ${name}`);
	return node;
}

test('enhanced PDF workflow stores generated tmp files under the project root tmp directory', () => {
	const prepareJobCode = getNode('Prepare Enhanced PDF Job').parameters.jsCode;

	assert.match(prepareJobCode, /const tmpDir = repoDir \+ '\/tmp';/);
	assert.match(
		prepareJobCode,
		/const baseDir = trimTrailingSlash\(item\.json\.jobs_dir \|\| \$env\.VIDEO_COMPOSER_JOBS_DIR \|\| \$env\.N8N_VIDEO_COMPOSER_JOBS_DIR \|\| tmpDir \+ '\/n8n-video-jobs'\);/,
	);
	assert.match(prepareJobCode, /return \[\{ json: \{ \.\.\.item\.json, jobId, repoDir, tmpDir, baseDir,/);
});

test('enhanced PDF workflow avoids disallowed Code node modules', () => {
	for (const node of workflow.nodes.filter((candidate) => candidate.type === 'n8n-nodes-base.code')) {
		assert.doesNotMatch(node.parameters.jsCode, /require\(['"]path['"]\)/, node.name);
	}
});

test('enhanced PDF workflow defaults to execution binary previews for final video and audio', () => {
	const formFields = getNode('Upload Enhanced PDF Assets').parameters.formFields.values;
	const previewField = formFields.find((field) => field.fieldLabel === 'include_execution_binary_preview');
	const prepareJobCode = getNode('Prepare Enhanced PDF Job').parameters.jsCode;
	const responseCode = getNode('Prepare Response').parameters.jsCode;

	assert.equal(previewField.defaultValue, 'include_execution_binary_preview');
	assert.match(prepareJobCode, /normalizeChoice\(item\.json\.include_execution_binary_preview, 'include_execution_binary_preview'\)/);
	assert.match(responseCode, /finalVideo: await this\.helpers\.prepareBinaryData\(video, 'final\.mp4', 'video\/mp4'\)/);
	assert.match(responseCode, /podcastAudio: await this\.helpers\.prepareBinaryData\(audio, 'merged-audio\.mp3', 'audio\/mpeg'\)/);
});

test('enhanced PDF workflow uses continuous research podcast generation', () => {
	const prepareJobCode = getNode('Prepare Enhanced PDF Job').parameters.jsCode;
	const scriptNode = getNode('Generate Research Podcast Script');
	const podcastNode = getNode('Run Continuous AI Podcast');
	const oldScriptNode = workflow.nodes.find((node) => node.name === 'Generate Page Podcast Script');
	const oldPodcastNode = workflow.nodes.find((node) => node.name === 'Run Page AI Podcast');

	assert.equal(oldScriptNode, undefined);
	assert.equal(oldPodcastNode, undefined);
	assert.match(prepareJobCode, /researchScriptPath: scriptDir \+ '\/research-podcast-script\.json'/);
	assert.match(prepareJobCode, /researchScriptJobPath/);
	assert.match(prepareJobCode, /researchScriptPath: paths\.researchScriptPath/);
	assert.match(prepareJobCode, /整篇 PDF 作为一整集连续双人播客/);
	assert.match(prepareJobCode, /页面只作为视频画面的视觉锚点/);
	assert.doesNotMatch(prepareJobCode, /每页只解释当前页面/);
	assert.doesNotMatch(prepareJobCode, /pageScriptPath: paths\.pageScriptPath, audioDir/);
	assert.match(scriptNode.parameters.jsCode, /research-podcast-script-client\.mjs/);
	assert.match(scriptNode.parameters.jsCode, /item\.researchScriptJobPath/);
	assert.match(podcastNode.parameters.jsCode, /continuous-podcast-client\.mjs/);
	assert.match(podcastNode.parameters.jsCode, /item\.podcastJobPath/);
});

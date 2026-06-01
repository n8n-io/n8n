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

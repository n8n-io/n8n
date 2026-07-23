import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { WorkflowTestData } from 'n8n-workflow';
import nock from 'nock';

const credentials = {
	gitlabApi: {
		accessToken: 'test-token',
		server: 'https://gitlab.com',
	},
};

const api = () => nock('https://gitlab.com/api/v4');

function setupErrorTest(workflowFile: string, error: string) {
	const harness = new NodeTestHarness();
	const workflowData = harness.readWorkflowJSON(workflowFile);
	const testData: WorkflowTestData = {
		description: workflowFile.replace('.json', ''),
		input: { workflowData },
		output: { nodeData: {}, error },
		credentials,
	};
	harness.setupTest(testData, { credentials });
}

describe('Gitlab Node - File Operations', () => {
	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
	});

	afterEach(() => {
		nock.cleanAll();
	});

	describe('file:create', () => {
		describe('with text content', () => {
			beforeAll(() => {
				api()
					.post('/projects/test-owner%2Ftest-repo/repository/files/docs%2FREADME.md', {
						branch: 'main',
						commit_message: 'Add docs',
						content: 'Hello, World!',
					})
					.reply(200, { file_path: 'docs/README.md', branch: 'main' });
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['file.create.text.workflow.json'],
			});
		});

		describe('with base64 text content', () => {
			beforeAll(() => {
				api()
					.post('/projects/test-owner%2Ftest-repo/repository/files/docs%2FREADME.md')
					.reply(200, { file_path: 'docs/README.md' });
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['file.create.text.base64.workflow.json'],
			});
		});

		describe('from a start branch', () => {
			beforeAll(() => {
				api()
					.post('/projects/test-owner%2Ftest-repo/repository/files/docs%2FREADME.md', {
						branch: 'feature',
						commit_message: 'Branch off',
						start_branch: 'main',
						content: 'x',
					})
					.reply(200, { file_path: 'docs/README.md' });
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['file.create.startBranch.workflow.json'],
			});
		});

		describe('with author metadata', () => {
			beforeAll(() => {
				api()
					.post('/projects/test-owner%2Ftest-repo/repository/files/docs%2FREADME.md', {
						branch: 'main',
						commit_message: 'Add docs',
						author_name: 'Octo Cat',
						author_email: 'octo@example.com',
						content: 'x',
					})
					.reply(200, { file_path: 'docs/README.md' });
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['file.create.author.workflow.json'],
			});
		});

		describe('with a missing project', () => {
			beforeEach(() => {
				api()
					.post('/projects/missing%2Fnope/repository/files/docs%2FREADME.md')
					.reply(404, { message: '404 Project Not Found' });
			});

			setupErrorTest(
				'file.create.404.workflow.json',
				'The resource you are requesting could not be found',
			);
		});
	});

	describe('file:edit', () => {
		describe('with text content', () => {
			beforeAll(() => {
				api()
					.put('/projects/test-owner%2Ftest-repo/repository/files/docs%2FREADME.md', {
						branch: 'main',
						commit_message: 'Update docs',
						content: 'Updated body',
					})
					.reply(200, { file_path: 'docs/README.md', branch: 'main' });
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['file.edit.text.workflow.json'],
			});
		});

		describe('with a missing file', () => {
			beforeEach(() => {
				api()
					.put('/projects/test-owner%2Ftest-repo/repository/files/docs%2Fmissing.md')
					.reply(404, { message: '404 File Not Found' });
			});

			setupErrorTest(
				'file.edit.404.workflow.json',
				'The resource you are requesting could not be found',
			);
		});
	});

	describe('file:get', () => {
		describe('with the default ref', () => {
			beforeAll(() => {
				api()
					.get('/projects/test-owner%2Ftest-repo/repository/files/docs%2FREADME.md')
					.query({ ref: 'master' })
					.reply(200, { file_name: 'README.md', content: 'eA==' });
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['file.get.json.defaultRef.workflow.json'],
			});
		});

		describe('with an explicit ref', () => {
			beforeAll(() => {
				api()
					.get('/projects/test-owner%2Ftest-repo/repository/files/docs%2FREADME.md')
					.query({ ref: 'release-1.0' })
					.reply(200, { content: 'x' });
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['file.get.json.explicitRef.workflow.json'],
			});
		});

		describe('when the file path is a folder', () => {
			beforeEach(() => {
				api()
					.get('/projects/test-owner%2Ftest-repo/repository/files/docs')
					.query(true)
					.reply(200, [{ file_name: 'a.md' }, { file_name: 'b.md' }]);
			});

			setupErrorTest('file.get.folder.workflow.json', 'File Path is a folder, not a file.');
		});

		describe('with a missing file', () => {
			beforeEach(() => {
				api()
					.get('/projects/test-owner%2Ftest-repo/repository/files/docs%2Fmissing.md')
					.query(true)
					.reply(404, { message: '404 File Not Found' });
			});

			setupErrorTest(
				'file.get.404.workflow.json',
				'The resource you are requesting could not be found',
			);
		});
	});

	describe('file:delete', () => {
		describe('without author metadata', () => {
			beforeAll(() => {
				api()
					.delete('/projects/test-owner%2Ftest-repo/repository/files/docs%2FREADME.md', {
						branch: 'main',
						commit_message: 'Remove docs',
					})
					.reply(200, {});
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['file.delete.workflow.json'],
			});
		});

		describe('with author metadata', () => {
			beforeAll(() => {
				api()
					.delete('/projects/test-owner%2Ftest-repo/repository/files/docs%2FREADME.md', {
						branch: 'main',
						commit_message: 'Remove docs',
						author_name: 'Octo Cat',
						author_email: 'octo@example.com',
					})
					.reply(200, {});
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['file.delete.author.workflow.json'],
			});
		});
	});

	describe('file:list', () => {
		describe('with returnAll=true', () => {
			beforeAll(() => {
				api()
					.get('/projects/test-owner%2Ftest-repo/repository/tree')
					.query(true)
					.reply(200, [
						{ id: 'a', name: 'README.md', type: 'blob', path: 'README.md' },
						{ id: 'b', name: 'src', type: 'tree', path: 'src' },
					]);
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['file.list.all.workflow.json'],
			});
		});

		describe('with returnAll=false', () => {
			beforeAll(() => {
				api()
					.get('/projects/test-owner%2Ftest-repo/repository/tree')
					.query({ per_page: 10, page: 2, path: 'src' })
					.reply(200, [{ id: 'a', name: 'a.ts', type: 'blob', path: 'src/a.ts' }]);
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['file.list.limited.workflow.json'],
			});
		});

		describe('recursively', () => {
			beforeAll(() => {
				api()
					.get('/projects/test-owner%2Ftest-repo/repository/tree')
					.query(true)
					.reply(200, [{ id: 'r', name: 'README.md', type: 'blob', path: 'README.md' }]);
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['file.list.recursive.workflow.json'],
			});
		});

		describe('with an empty result', () => {
			beforeAll(() => {
				api().get('/projects/test-owner%2Ftest-repo/repository/tree').query(true).reply(200, []);
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['file.list.empty.workflow.json'],
			});
		});

		describe('with continueOnFail=true', () => {
			beforeAll(() => {
				api()
					.get('/projects/test-owner%2Ftest-repo/repository/tree')
					.query(true)
					.reply(500, { message: '500 Internal Server Error' });
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['file.list.continueOnFail.workflow.json'],
			});
		});
	});
});

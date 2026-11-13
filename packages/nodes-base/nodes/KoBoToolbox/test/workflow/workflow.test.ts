import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const formId = 'aZLQ9vAWYa3qFKtq5WwUvS';
const submissionId = 482710;
const hookId = 'hBrYTxMEKZbSoAapbaqUTm';
const logId = 1520;
const fileId = 'afQoJxA4kmKEXVpkH6SYbK';

const form = { uid: formId, name: 'Household survey' };
const submission = { _id: submissionId, _uuid: '6f1c3b2a-9d4e-4a8b-b1c2-3d4e5f6a7b8c' };
const hook = { uid: hookId, name: 'Export to data warehouse' };
const file = { uid: fileId, file_type: 'form_media', metadata: { filename: 'logo.png' } };

describe('KoBoToolbox > Workflows', () => {
	const credentials = {
		koBoToolboxApi: {
			URL: 'https://kf.kobotoolbox.org',
			token: 'fake-token',
		},
	};

	beforeAll(() => {
		const assets = '/api/v2/assets';
		const formPath = `${assets}/${formId}`;
		const mock = nock('https://kf.kobotoolbox.org');
		mock.get(formPath).reply(200, form);
		mock
			.get(`${assets}/`)
			.query({ limit: 1 })
			.reply(200, { count: 1, next: null, results: [form] });
		mock.patch(`${formPath}/deployment/`).reply(200, { version_id: 'vXyZ', active: true });
		mock
			.get(`${formPath}/data/`)
			.query({ limit: 2 })
			.reply(200, { count: 1, next: null, results: [submission] });
		mock.get(`${formPath}/data/${submissionId}`).reply(200, submission);
		mock.delete(`${formPath}/data/${submissionId}`).reply(204);
		mock
			.get(`${formPath}/data/${submissionId}/validation_status/`)
			.reply(200, { uid: 'validation_status_approved', label: 'Approved' });
		mock
			.patch(`${formPath}/data/${submissionId}/validation_status/`, {
				'validation_status.uid': 'validation_status_on_hold',
			})
			.reply(200, { uid: 'validation_status_on_hold', label: 'On Hold' });
		mock
			.get(`${formPath}/hooks/`)
			.query({ limit: 10 })
			.reply(200, { count: 1, next: null, results: [hook] });
		mock.get(`${formPath}/hooks/${hookId}`).reply(200, hook);
		mock
			.patch(`${formPath}/hooks/${hookId}/retry/`)
			.reply(200, { detail: 'Task successfully scheduled', pending_uids: [] });
		mock
			.get(`${formPath}/hooks/${hookId}/logs/`)
			.reply(200, { count: 1, next: null, results: [{ uid: logId, status_code: 500 }] });
		mock
			.patch(`${formPath}/hooks/${hookId}/logs/${logId}/retry/`)
			.reply(200, { detail: 'Task successfully scheduled' });
		mock
			.get(`${formPath}/files`)
			.query({ file_type: 'form_media' })
			.reply(200, { count: 1, next: null, results: [file] });
		mock.get(`${formPath}/files/${fileId}`).reply(200, file);
		mock.get(`${formPath}/files/${fileId}/content`).reply(200, Buffer.from('file content'));
		mock.delete(`${formPath}/files/${fileId}`).reply(200, {});
		mock
			.post(`${formPath}/files/`, {
				description: 'Uploaded file',
				file_type: 'form_media',
				metadata: { redirect_url: 'https://example.com/logo.png' },
			})
			.reply(201, file);
	});

	new NodeTestHarness().setupTests({
		credentials,
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});

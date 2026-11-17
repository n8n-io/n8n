import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Google Drive Node v2 - request URLs', () => {
	beforeAll(() => {
		const files = '/drive/v3/files';
		const drive = '/drive/v3/drives/0AJm4kQ2xYz8tUk9PVA';

		nock('https://www.googleapis.com')
			.post('/drive/v3/drives')
			.query(true)
			.reply(200, { id: '0AJm4kQ2xYz8tUk9PVA', name: 'Marketing' })
			.get(drive)
			.query(true)
			.reply(200, { id: '0AJm4kQ2xYz8tUk9PVA', name: 'Marketing' })
			.patch(drive)
			.reply(200, { id: '0AJm4kQ2xYz8tUk9PVA', name: 'Marketing EU' })
			.delete(drive)
			.reply(204)
			.get('/drive/v3/drives')
			.query(true)
			.reply(200, { drives: [{ id: '0AJm4kQ2xYz8tUk9PVA', name: 'Marketing EU' }] })
			.post(`${files}/1Hq7sLm3Nw9bVc2xZr5Tk8YpDf4Gj6UaE/copy`)
			.query(true)
			.reply(200, { id: '1Cp8Yb3Nm6Lk9Jh2Gf5Ds8Aq1Wz4Xe7Rt', name: 'Budget copy' })
			.get(`${files}/1Dn4Lw7Fq0Zr3Xt6Vb9Mn2Ck5Jh8Gp1Sa`)
			.query((qs) => qs.fields === 'mimeType,name')
			.reply(200, { mimeType: 'text/plain', name: 'notes.txt' })
			.get(`${files}/1Dn4Lw7Fq0Zr3Xt6Vb9Mn2Ck5Jh8Gp1Sa`)
			.query((qs) => qs.alt === 'media')
			.reply(200, 'Plain notes', { 'content-type': 'text/plain' })
			.get(`${files}/1Ex9Pq2Rs5Tu8Vw1Xy4Za7Bc0De3Fg6Hi`)
			.query(true)
			.reply(200, { mimeType: 'application/vnd.google-apps.document', name: 'Notes' })
			.get(`${files}/1Ex9Pq2Rs5Tu8Vw1Xy4Za7Bc0De3Fg6Hi/export`)
			.query(true)
			.reply(200, 'Notes', { 'content-type': 'text/plain' })
			.get(files)
			.query(true)
			.reply(200, { files: [{ id: '1Up4Da7Te9Me2Ta5Da8Ta1Fi3Le6Id0Xy', name: 'Q3 report' }] })
			.post('/upload/drive/v3/files')
			.query(true)
			.reply(200, { id: '1Ul6Oa9Dd2Ff5Ii8Ll1Ee4Ii7Dd0Xx3Yy' })
			.patch(`${files}/1Ul6Oa9Dd2Ff5Ii8Ll1Ee4Ii7Dd0Xx3Yy`)
			.query(true)
			.reply(200, { id: '1Ul6Oa9Dd2Ff5Ii8Ll1Ee4Ii7Dd0Xx3Yy', name: 'notes.txt' })
			.get(`${files}/1Ul6Oa9Dd2Ff5Ii8Ll1Ee4Ii7Dd0Xx3Yy`)
			.query({ fields: '*' })
			.reply(200, {
				id: '1Ul6Oa9Dd2Ff5Ii8Ll1Ee4Ii7Dd0Xx3Yy',
				name: 'notes.txt',
				mimeType: 'text/plain',
			})
			.patch(`${files}/1Up4Da7Te9Me2Ta5Da8Ta1Fi3Le6Id0Xy`)
			.query(true)
			.reply(200, { id: '1Up4Da7Te9Me2Ta5Da8Ta1Fi3Le6Id0Xy', name: 'Q3 report' })
			.delete(`${files}/1Rt5Yu8Io1Pa4Sd7Fg0Hj3Kl6Zx9Cv2Bn`)
			.query(true)
			.reply(204)
			.post(`${files}/1Sh2Ar5Ef8Il1Ei4Dx7Yw0Vu3Ts6Rq9Po/permissions`)
			.query(true)
			.reply(200, { id: '04815162342', type: 'user', role: 'reader' })
			.post(files)
			.query(true)
			.reply(200, { id: '1Nf7Ol2De5Rr8Ii1Dd4Ee7Ff0Gg3Hh6Jj', name: 'Invoices' })
			.delete(`${files}/1Fo5Ld8Er1De4Le7Te0Id3Ab6Cd9Ef2Gh`)
			.query(true)
			.reply(204);
	});

	afterAll(() => {
		expect(nock.pendingMocks()).toEqual([]);
	});

	new NodeTestHarness().setupTests({
		credentials: {
			googleDriveOAuth2Api: {
				scope: 'https://www.googleapis.com/auth/drive',
				oauthTokenData: { access_token: 'test-access-token' },
			},
		},
		workflowFiles: ['requests.workflow.json'],
	});
});

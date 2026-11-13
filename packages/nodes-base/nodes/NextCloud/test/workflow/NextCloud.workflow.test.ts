import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('NextCloud > Workflows', () => {
	const credentials = {
		nextCloudApi: {
			webDavUrl: 'https://nextcloud.example.com/remote.php/webdav',
			user: 'admin',
			password: 'fake-password',
		},
	};

	const ocsSuccessResponse = `<?xml version="1.0"?>
<ocs>
  <meta><status>ok</status></meta>
  <data><id>123</id><url>https://nc.example.com/s/abc</url></data>
</ocs>`;

	const ocsUserResponse = `<?xml version="1.0"?>
<ocs>
  <meta><status>ok</status></meta>
  <data><id>alice</id><email>alice@example.com</email><displayname>Alice</displayname></data>
</ocs>`;

	const ocsUserListResponse = `<?xml version="1.0"?>
<ocs>
  <meta><status>ok</status></meta>
  <data><users><element>alice</element><element>bob</element></users></data>
</ocs>`;

	const webDavFolderListResponse = `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
  <d:response>
    <d:href>/remote.php/webdav/projects/</d:href>
    <d:propstat><d:prop><d:resourcetype><d:collection /></d:resourcetype><d:getetag>"folder-etag"</d:getetag></d:prop></d:propstat>
  </d:response>
  <d:response>
    <d:href>/remote.php/webdav/projects/file1.txt</d:href>
    <d:propstat><d:prop><d:getlastmodified>Tue, 02 Jan 2024</d:getlastmodified><d:getcontentlength>1024</d:getcontentlength><d:getcontenttype>text/plain</d:getcontenttype><d:resourcetype></d:resourcetype><d:getetag>"file-etag"</d:getetag></d:prop></d:propstat>
  </d:response>
</d:multistatus>`;

	beforeAll(() => {
		const api = nock('https://nextcloud.example.com');

		api
			.post('/ocs/v1.php/cloud/users', 'userid=alice&email=alice@example.com')
			.reply(200, ocsSuccessResponse);
		api.delete('/ocs/v1.php/cloud/users/bob').reply(200, ocsSuccessResponse);
		api.get('/ocs/v1.php/cloud/users/alice').reply(200, ocsUserResponse);
		api.get('/ocs/v1.php/cloud/users').reply(200, ocsUserListResponse);
		api
			.put('/ocs/v1.php/cloud/users/carol', 'key=email&value=carol@example.com')
			.reply(200, ocsSuccessResponse);
		api
			.post(
				'/ocs/v2.php/apps/files_sharing/api/v1/shares',
				'path=%2Finvoices%2F2024%2Freport.pdf&shareType=0&shareWith=alice',
			)
			.reply(200, ocsSuccessResponse);
		api.intercept('/remote.php/webdav//projects', 'PROPFIND').reply(207, webDavFolderListResponse);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});

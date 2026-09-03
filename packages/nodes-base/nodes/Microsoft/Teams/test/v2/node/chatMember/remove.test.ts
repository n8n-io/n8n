import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

describe('Test MicrosoftTeamsV2, chatMember => remove', () => {
	// The base64 membership id has to be the last path segment - a `userId` here would
	// not match.
	nock('https://graph.microsoft.com')
		.delete(
			'/v1.0/chats/19:ebed9ad42c904d6c83adf0db360053ec@thread.v2/members/MCMjMCMjZmJlMmJmNDctMTZjOC00N2NmLWI0YTUtNGI5YTE5YzBmZTI4IyMxOTpiOTVhNTc3NGMxYzc0MjJmYjNkMTljMTU2Y2E5N2I5NEB0aHJlYWQudjIjIzg2MTA0MDBhLTUyYzYtNGI2Yy04MTZjLThjNjIzZDNlZmQ5Yg==',
		)
		.reply(204);

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['remove.workflow.json'],
	});
});

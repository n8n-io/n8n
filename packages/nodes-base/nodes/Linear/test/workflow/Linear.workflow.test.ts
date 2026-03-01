import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import {
	addCommentRequest,
	addCommentWithParentRequest,
	addCommentLink,
	issueCreateRequest,
	getIssueRequest,
	getManyIssuesRequest,
	updateIssueRequest,
	deleteIssueRequest,
} from './apiRequest';
import {
	commentCreateResponse,
	commentCreateWithParentResponse,
	attachmentLinkURLResponse,
	issueCreateResponse,
	getIssueResponse,
	getManyIssueResponse,
	issueUpdateResponse,
	deleteIssueResponse,
} from './apiResponses';

describe('Linear', () => {
	describe('Run Test Workflow', () => {
		beforeAll(() => {
			const mock = nock('https://api.linear.app');
			mock.post('/graphql', addCommentRequest).reply(200, commentCreateResponse);
			mock.post('/graphql', addCommentLink).reply(200, attachmentLinkURLResponse);
			mock
				.post('/graphql', addCommentWithParentRequest)
				.reply(200, commentCreateWithParentResponse);
			mock.post('/graphql', issueCreateRequest).reply(200, issueCreateResponse);
			mock.post('/graphql', getIssueRequest).reply(200, getIssueResponse);
			mock.post('/graphql', getManyIssuesRequest).reply(200, getManyIssueResponse);
			mock.post('/graphql', updateIssueRequest).reply(200, issueUpdateResponse);
			mock.post('/graphql', deleteIssueRequest).reply(200, deleteIssueResponse);
		});

		new NodeTestHarness().setupTests();
	});
});

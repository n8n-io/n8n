import nock from 'nock';

import { equalityTest, setup, workflowToTests } from '@test/nodes/Helpers';

describe('Azure Storage Node', () => {
	const workflows = [
		'nodes/Microsoft/Storage/test/workflows/container_getAllLimitOptions.workflow.json',
	];
	const workflowTests = workflowToTests(workflows);

	beforeEach(() => {
		// https://github.com/nock/nock/issues/2057#issuecomment-663665683
		if (!nock.isActive()) {
			nock.activate();
		}
	});

	describe('should get all containers with limit and options', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://myaccount.blob.core.windows.net',
				mocks: [
					{
						method: 'get',
						path: '/?comp=list&maxresults=1&include=metadata%2Cdeleted%2Csystem&prefix=mycontainer',
						statusCode: 200,
						responseBody:
							'<?xml version="1.0" encoding="utf-8"?><EnumerationResults ServiceEndpoint="https://myaccount.blob.core.windows.net/"><Prefix>mycontainer</Prefix><MaxResults>1</MaxResults><Containers><Container><Name>mycontainer1</Name><Deleted>true</Deleted><Version>01DB7228F6BEE6E7</Version><Properties><Last-Modified>Wed, 29 Jan 2025 08:37:00 GMT</Last-Modified><Etag>"0x8DD40401935032C"</Etag><LeaseStatus>unlocked</LeaseStatus><LeaseState>expired</LeaseState><HasImmutabilityPolicy>false</HasImmutabilityPolicy><HasLegalHold>false</HasLegalHold><ImmutableStorageWithVersioningEnabled>false</ImmutableStorageWithVersioningEnabled><DeletedTime>Wed, 29 Jan 2025 08:38:21 GMT</DeletedTime><RemainingRetentionDays>7</RemainingRetentionDays></Properties><Metadata><key1>value1</key1></Metadata></Container></Containers><NextMarker>mycontainer2</NextMarker></EnumerationResults>',
					},
				],
			};
			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});

import * as genericFunctions from '../../../GenericFunctions';
import { GoogleDocs } from '../../../GoogleDocs.node';
import { createMockExecuteFunction, docsNode } from '../../helpers';

jest.mock('../../../GenericFunctions', () => {
	const originalModule = jest.requireActual('../../../GenericFunctions');
	return {
		...originalModule,
		googleApiRequest: jest.fn(async () => {
			return { id: 'docId123' };
		}),
	};
});

beforeEach(() => {
	jest.clearAllMocks();
});

describe('GoogleDocs node: document create', () => {
	it('should create the file in MyDrive', async () => {
		const node = new GoogleDocs();

		// Parameters for a single item
		const nodeParameters = {
			resource: 'document',
			operation: 'create',
			title: 'Test docs from api',
			folderId: 'default',
			// Use "My Drive" here; adjust if your UI uses a different default
			driveId: 'myDrive',
		};

		await node.execute.call(createMockExecuteFunction(nodeParameters, docsNode));

		// Body the node should send
		const expectedBody = {
			name: 'Test docs from api',
			mimeType: 'application/vnd.google-apps.document',
			parents: ['root'],
		};

		// Query string the node should send
		const expectedQs = {
			includeItemsFromAllDrives: true,
			supportsAllDrives: true,
			spaces: 'drive',
			corpora: 'allDrives',
		};

		expect(genericFunctions.googleApiRequest).toHaveBeenCalledTimes(1);
		expect(genericFunctions.googleApiRequest).toHaveBeenCalledWith(
			'POST',
			'',
			expectedBody,
			expectedQs,
			'https://www.googleapis.com/drive/v3/files',
		);
	});

	it('should create the file in default shared drive id', async () => {
		const node = new GoogleDocs();

		// Parameters for a single item
		const nodeParameters = {
			resource: 'document',
			operation: 'create',
			title: 'Test docs from api',
			folderId: 'default', // No folder selected
			driveId: '2ghhghvq8e7t-e0N8Gti5sQ9A', // Shared drive
		};

		await node.execute.call(createMockExecuteFunction(nodeParameters, docsNode));

		// Body the node should send
		const expectedBody = {
			name: 'Test docs from api',
			mimeType: 'application/vnd.google-apps.document',
			parents: ['2ghhghvq8e7t-e0N8Gti5sQ9A'],
		};

		// Query string the node should send
		const expectedQs = {
			includeItemsFromAllDrives: true,
			supportsAllDrives: true,
			spaces: 'drive',
			corpora: 'allDrives',
		};

		expect(genericFunctions.googleApiRequest).toHaveBeenCalledTimes(1);
		expect(genericFunctions.googleApiRequest).toHaveBeenCalledWith(
			'POST',
			'',
			expectedBody,
			expectedQs,
			'https://www.googleapis.com/drive/v3/files',
		);
	});

	it('should create the file in share drive folder', async () => {
		const node = new GoogleDocs();

		// Parameters for a single item
		const nodeParameters = {
			resource: 'document',
			operation: 'create',
			title: 'Test docs from api',
			folderId: 'folderIDxxxxxx',
			driveId: '2ghhghvq8e7t-e0N8Gti5sQ9A', // Shared drive
		};

		await node.execute.call(createMockExecuteFunction(nodeParameters, docsNode));

		// Body the node should send
		const expectedBody = {
			name: 'Test docs from api',
			mimeType: 'application/vnd.google-apps.document',
			parents: ['folderIDxxxxxx'],
		};

		// Query string the node should send
		const expectedQs = {
			includeItemsFromAllDrives: true,
			supportsAllDrives: true,
			spaces: 'drive',
			corpora: 'allDrives',
		};

		expect(genericFunctions.googleApiRequest).toHaveBeenCalledTimes(1);
		expect(genericFunctions.googleApiRequest).toHaveBeenCalledWith(
			'POST',
			'',
			expectedBody,
			expectedQs,
			'https://www.googleapis.com/drive/v3/files',
		);
	});

	it('should default to root when Shared with me drive is used without folder selection', async () => {
		const node = new GoogleDocs();

		const nodeParameters = {
			resource: 'document',
			operation: 'create',
			title: 'Test docs from api',
			folderId: 'default',
			driveId: 'sharedWithMe',
		};

		await node.execute.call(createMockExecuteFunction(nodeParameters, docsNode));

		const expectedBody = {
			name: 'Test docs from api',
			mimeType: 'application/vnd.google-apps.document',
			parents: ['root'],
		};

		const expectedQs = {
			includeItemsFromAllDrives: true,
			supportsAllDrives: true,
			spaces: 'drive',
			corpora: 'allDrives',
		};

		expect(genericFunctions.googleApiRequest).toHaveBeenCalledWith(
			'POST',
			'',
			expectedBody,
			expectedQs,
			'https://www.googleapis.com/drive/v3/files',
		);
	});
});

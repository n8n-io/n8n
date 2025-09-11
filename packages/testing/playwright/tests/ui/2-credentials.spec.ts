import { test } from '../../fixtures/base';

// Test constants for credential types and test data
const CREDENTIAL_TYPES = {
	NOTION: 'Notion API',
	GOOGLE_OAUTH2: 'Google OAuth2 API',
	GOOGLE_SERVICE_ACCOUNT: 'Google Service Account',
	TRELLO: 'Trello API',
	PIPEDRIVE: 'Pipedrive API',
	ADALO: 'Adalo API',
	HTTP_BASIC_AUTH: 'HTTP Basic Auth',
	QUERY_AUTH: 'Query Auth',
	SLACK_OAUTH2: 'Slack OAuth2 API',
};

const TEST_CREDENTIAL_NAMES = {
	NOTION: 'My awesome Notion account',
	GOOGLE_OAUTH2: 'My Google OAuth2 Account',
	TRELLO: 'My Trello Account',
	RENAMED: 'Something else',
	RENAMED_2: 'Something else entirely',
};

const TEST_DATA = {
	NOTION_SECRET: '1234567890',
	GOOGLE_OAUTH2: {
		clientId: 'test_client_id',
		clientSecret: 'test_client_secret',
	},
	TRELLO: {
		apiKey: 'test_api_key',
		apiToken: 'test_api_token',
	},
};

test.describe('Credentials', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.navigate.toCredentials();
	});

	test.describe('Credential Creation - Primary Flow (70% of functionality)', () => {
		test('should create a new credential using empty state', async ({ n8n }) => {
			const projectId = await n8n.start.fromNewProject();
			await n8n.navigate.toCredentials(projectId);
			await n8n.page.pause();
			// GOAL: Test the first-time user experience when no credentials exist
			//
			// STEPS:
			// 1. Navigate to empty credentials page
			// 2. Click "Add first credential" button
			// 3. Search for and select "Notion API" credential type
			// 4. Click "Create" to open credential form
			// 5. Fill in the "Internal Integration Secret" field with test data
			// 6. Set credential name to "My awesome Notion account"
			// 7. Save and close the credential modal
			//
			// ASSERTIONS:
			// - Credential modal opens correctly
			// - Credential type can be selected and searched
			// - Form fields are accessible and fillable
			// - Save operation completes successfully
			// - Credential appears in the credentials list (count = 1)
			// - Modal closes properly after save
		});

		test('should create credentials from NDV for node with multiple auth options', async ({
			n8n,
		}) => {
			// GOAL: Test credential creation for complex nodes with multiple authentication methods
			//
			// CONTEXT: Gmail node supports both OAuth2 and Service Account authentication
			// This is the most complex credential creation scenario
			//
			// STEPS:
			// 1. Create new workflow
			// 2. Add Schedule Trigger node (prerequisite for Gmail)
			// 3. Add Gmail node to canvas
			// 4. Open Gmail node in NDV (Node Details View)
			// 5. Click on credential selector dropdown
			// 6. Click "Create new credential" option
			// 7. Verify credential modal opens with auth type selection
			// 8. Verify exactly 2 radio buttons are shown (OAuth2 vs Service Account)
			// 9. Select first auth type (OAuth2)
			// 10. Fill in OAuth2-specific fields (clientId, clientSecret)
			// 11. Set credential name
			// 12. Save credential
			//
			// ASSERTIONS:
			// - NDV opens correctly for Gmail node
			// - Credential selector is available
			// - Modal shows auth type selection (2 radio buttons)
			// - OAuth2 fields are displayed when selected
			// - Credential saves successfully
			// - Created credential is auto-selected in node
			// - Credential name appears in the selector dropdown
		});

		test('should show multiple credential types in the same dropdown', async ({ n8n }) => {
			// GOAL: Test that multiple credentials of different auth types can coexist
			//
			// CONTEXT: Gmail supports OAuth2 AND Service Account - users should be able
			// to create both types and see both in the dropdown for selection
			//
			// STEPS:
			// 1. Create new workflow with Gmail node (same setup as previous test)
			// 2. Create first credential: OAuth2 type
			//   - Select OAuth2 auth type
			//   - Fill OAuth2 fields
			//   - Save credential
			// 3. Create second credential: Service Account type
			//   - Open credential selector again
			//   - Create new credential
			//   - Select Service Account auth type
			//   - Fill Service Account fields
			//   - Save credential
			// 4. Open credential selector dropdown
			//
			// ASSERTIONS:
			// - First credential creation works (OAuth2)
			// - Can create second credential of different type
			// - Dropdown shows 3 options total:
			//   * OAuth2 credential
			//   * Service Account credential
			//   * "Create new credential" option
			// - Both credential types are selectable
			// - Switching between credentials works properly
		});

		test('should correctly render required and optional credentials', async ({ n8n }) => {
			// GOAL: Test complex credential scenarios with required AND optional credentials
			//
			// CONTEXT: Pipedrive node with "incoming authentication" has both:
			// - Required credential (primary auth)
			// - Optional credential (secondary auth)
			//
			// STEPS:
			// 1. Create new workflow
			// 2. Add Pipedrive node to canvas
			// 3. Open Pipedrive node in NDV
			// 4. Configure "incomingAuthentication" parameter to "Basic Auth"
			// 5. Verify TWO credential selector fields appear
			// 6. Test first credential selector:
			//   - Click to create new credential
			//   - Verify auth type selector appears (multiple options)
			//   - Close without creating
			// 7. Test second credential selector:
			//   - Click to create new credential
			//   - Verify NO auth type selector (single option only)
			//
			// ASSERTIONS:
			// - Parameter change triggers credential field visibility
			// - Exactly 2 credential selectors appear
			// - First credential: shows auth type selection (required credential)
			// - Second credential: no auth type selection (optional, single type)
			// - UI clearly distinguishes between required/optional fields
		});

		test('should create credentials from NDV for node with no auth options', async ({ n8n }) => {
			// GOAL: Test simple credential creation for nodes with single authentication method
			//
			// CONTEXT: Trello node only supports one auth type (API Key + Token)
			// This is the "simple path" credential creation
			//
			// STEPS:
			// 1. Create new workflow
			// 2. Add Schedule Trigger + Trello nodes
			// 3. Open Trello node in NDV
			// 4. Click credential selector
			// 5. Click "Create new credential"
			// 6. Verify NO auth type selector appears (single auth method)
			// 7. Fill Trello-specific fields (API Key, API Token)
			// 8. Set credential name
			// 9. Save credential
			//
			// ASSERTIONS:
			// - Credential modal opens without auth type selection
			// - Trello-specific form fields are displayed
			// - Fields can be filled with test data
			// - Credential saves successfully
			// - Created credential auto-populates in node selector
			// - Credential name matches what was entered
		});

		test('should setup generic authentication for HTTP node', async ({ n8n }) => {
			// GOAL: Test flexible authentication system for HTTP Request node
			//
			// CONTEXT: HTTP Request node supports "Generic Credential Type" which allows
			// users to select from ANY available credential type (Query Auth, Basic Auth, etc.)
			//
			// STEPS:
			// 1. Create workflow with Schedule Trigger + HTTP Request nodes
			// 2. Open HTTP Request node in NDV
			// 3. Set "authentication" parameter to "Generic Credential Type"
			// 4. Verify "Generic Auth Type" selector appears
			// 5. Click generic auth type selector
			// 6. Verify dropdown shows multiple auth options (Query Auth, Basic Auth, etc.)
			// 7. Select "Query Auth" from dropdown
			// 8. Verify credential selector appears
			// 9. Create new Query Auth credential
			// 10. Fill Query Auth fields (key, value)
			// 11. Save credential
			//
			// ASSERTIONS:
			// - Authentication parameter change shows generic selector
			// - Generic auth type dropdown has multiple options
			// - Selecting auth type shows appropriate credential selector
			// - Credential creation works for generic types
			// - Query Auth fields are accessible and fillable
			// - Created credential appears in selector
		});

		test('should not show OAuth redirect URL section when OAuth2 credentials are overridden', async ({
			n8n,
			page,
		}) => {
			// GOAL: Test enterprise/admin override functionality for OAuth credentials
			//
			// CONTEXT: When admins pre-configure OAuth client credentials, users shouldn't
			// see or need to configure redirect URLs - this tests security/admin features
			//
			// SETUP:
			// 1. Mock the /types/credentials.json response
			// 2. Modify Slack OAuth2 credential to have __overwrittenProperties: ['clientId', 'clientSecret']
			// 3. This simulates admin pre-configuration
			//
			// STEPS:
			// 1. Create workflow with Manual + Slack nodes
			// 2. Configure Slack for "Get a channel" operation
			// 3. Open credential creation for Slack
			// 4. Select OAuth2 auth type
			// 5. Verify OAuth redirect URL copy input is NOT visible
			//
			// ASSERTIONS:
			// - Route mocking works correctly
			// - Slack node accepts operation configuration
			// - Credential creation modal opens
			// - OAuth redirect URL input is hidden (due to override)
			// - Other OAuth fields may or may not be visible (depends on override config)
			//
			// IMPORTANCE: Tests enterprise security features
		});
	});

	test.describe('Credential Management - Using Existing Credentials (30% of functionality)', () => {
		test('should delete credentials from NDV', async ({ n8n }) => {
			// GOAL: Test complete credential lifecycle - create, use, then delete
			//
			// CONTEXT: Users need ability to clean up credentials they no longer need
			// Deletion should be safe with confirmation and proper cleanup
			//
			// STEPS:
			// 1. Create workflow with Schedule Trigger + Notion nodes
			// 2. Open Notion node and create credential (same as creation test)
			// 3. Fill credential with test data and save
			// 4. Verify credential is selected in node
			// 5. Click "Edit credential" button in NDV
			// 6. Click "Delete" button in credential modal
			// 7. Confirm deletion in confirmation dialog ("Yes")
			// 8. Verify success notification appears
			// 9. Verify credential is no longer selected in node
			//
			// ASSERTIONS:
			// - Credential creation works (prerequisite)
			// - Edit credential button is accessible
			// - Delete button appears in edit mode
			// - Confirmation dialog appears and is dismissible
			// - Success notification shows "Credential deleted"
			// - Node credential selector shows no credential selected
			// - Deleted credential doesn't appear in future dropdowns
		});

		test('should rename credentials from NDV', async ({ n8n }) => {
			// GOAL: Test credential name management and persistence across sessions
			//
			// CONTEXT: Users should be able to give meaningful names to credentials
			// and those names should persist even after page reloads
			//
			// STEPS:
			// 1. Create workflow with Schedule Trigger + Trello nodes
			// 2. Create Trello credential with initial name "My Trello Account"
			// 3. Edit credential and rename to "Something else"
			// 4. Save and verify name change in node selector
			// 5. Close NDV and save workflow
			// 6. Reload page (test persistence)
			// 7. Reopen same node and edit credential again
			// 8. Rename to "Something else entirely"
			// 9. Save and verify final name change
			//
			// ASSERTIONS:
			// - Initial credential creation and naming works
			// - Edit mode allows name changes
			// - Name changes reflect immediately in UI
			// - Workflow save and page reload work
			// - Renamed credentials survive page reload
			// - Second rename operation works
			// - Final name persists correctly
			//
			// IMPORTANCE: Tests data persistence and user experience
		});

		test('should edit credential for non-standard credential type', async ({ n8n }) => {
			// GOAL: Test credential editing for complex/nested node configurations
			//
			// CONTEXT: AI Tool nodes use "Predefined Credential Type" pattern where
			// users first select a credential type, then create/edit credentials of that type
			//
			// STEPS:
			// 1. Create workflow with AI Agent + AI Tool: HTTP Request nodes
			// 2. Open AI Tool node in NDV
			// 3. Set "authentication" to "Predefined Credential Type"
			// 4. Select "Adalo API" as the credential type
			// 5. Create new Adalo credential
			// 6. Fill Adalo-specific fields
			// 7. Save credential
			// 8. Edit the created credential
			// 9. Rename credential to test name
			// 10. Save edited credential
			//
			// ASSERTIONS:
			// - Complex node configuration works (AI Tool setup)
			// - Predefined credential type selection works
			// - Credential type dropdown shows available options
			// - Non-standard credential creation works
			// - Edit mode works for non-standard credentials
			// - Rename functionality works in edit mode
			// - Edited credential reflects in node selector
		});

		test('should set a default credential when adding nodes', async ({ n8n }) => {
			// GOAL: Test smart credential defaults to improve user experience
			//
			// CONTEXT: If user has existing Notion credential and adds another Notion node,
			// the existing credential should be automatically selected
			//
			// STEPS:
			// 1. Start with empty workflow
			// 2. Create a Notion credential (via temporary node):
			//   - Add Notion node
			//   - Create and save credential
			//   - Delete the temporary node
			// 3. Add new Notion node to canvas
			// 4. Open new Notion node
			// 5. Verify existing credential is auto-selected
			// 6. Clean up: delete the credential
			//
			// ASSERTIONS:
			// - Credential creation works (setup step)
			// - Node deletion works without affecting credential
			// - New node of same type auto-selects existing credential
			// - Auto-selection shows correct credential name
			// - Cleanup (deletion) works properly
			//
			// IMPORTANCE: Tests user experience and smart defaults
		});

		test('should set a default credential when editing a node', async ({ n8n }) => {
			// GOAL: Test credential defaults when changing node configuration
			//
			// CONTEXT: HTTP Request node can be configured to use any credential type
			// When user selects "Notion API" it should auto-select existing Notion credentials
			//
			// STEPS:
			// 1. Create Notion credential (via temporary Notion node)
			// 2. Add HTTP Request node to workflow
			// 3. Set authentication to "Predefined Credential Type"
			// 4. Select "Notion API" as the credential type
			// 5. Verify existing Notion credential is auto-selected
			// 6. Clean up: delete the credential
			//
			// ASSERTIONS:
			// - Prerequisite credential creation works
			// - HTTP Request auth configuration works
			// - Credential type selection triggers default behavior
			// - Existing credential auto-populates
			// - Auto-selected credential shows correct name
			//
			// IMPORTANCE: Tests cross-node credential reuse
		});

		test('should sort credentials', async ({ n8n }) => {
			// GOAL: Test credential organization and discovery features
			//
			// CONTEXT: Users with many credentials need sorting/searching to find them
			// This tests the credentials page management features
			//
			// PREREQUISITES:
			// - Need existing credentials to sort (may require setup)
			//
			// STEPS:
			// 1. Navigate to credentials page
			// 2. Ensure some test credentials exist
			// 3. Clear search field (empty search = show all)
			// 4. Click sort dropdown
			// 5. Select "Name (Z-A)" / descending sort
			// 6. Verify first credential card shows expected credential
			// 7. Change sort to "Name (A-Z)" / ascending
			// 8. Verify sort order changed
			//
			// ASSERTIONS:
			// - Credentials page loads with existing credentials
			// - Search field is accessible and clearable
			// - Sort dropdown has expected options
			// - Sort operations actually change display order
			// - Credential cards reflect sort order
			//
			// NOTE: May need credential setup in beforeEach or test data
		});
	});

	test.describe('Error Handling & Edge Cases (15% of functionality)', () => {
		test('should show notifications above credential modal overlay', async ({ n8n, page }) => {
			// GOAL: Test UI layering and error handling during credential save failures
			//
			// CONTEXT: When credential save fails, error notification should be visible
			// above the modal overlay (z-index testing)
			//
			// SETUP:
			// 1. Mock all POST requests to /rest/credentials to fail
			// 2. This simulates network errors or server failures
			//
			// STEPS:
			// 1. Go to credentials page
			// 2. Click "Create credential" button
			// 3. Select Notion API credential type
			// 4. Fill credential form with test data
			// 5. Click Save (will trigger mocked failure)
			// 6. Verify error notification appears
			// 7. Verify error notification is visible above modal
			//
			// ASSERTIONS:
			// - Route mocking successfully blocks credential creation
			// - Error notification appears when save fails
			// - Notification is visible (not hidden behind modal)
			// - Error notification has higher z-index (2100) than modal overlay (2001)
			// - Notification contains appropriate error message
			//
			// IMPORTANCE: Tests error UX and visual hierarchy
			// TECHNICAL: Tests z-index CSS and error handling
		});
	});
});

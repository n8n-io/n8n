import { E2E_TEST_NODE_NAME } from '../../config/constants';
import { test, expect } from '../../fixtures/base';

const NO_CREDENTIALS_MESSAGE = 'Add your credential';
const INVALID_CREDENTIALS_MESSAGE = 'Check your credential';
const MODE_SELECTOR_LIST = 'From list';

test.describe('Resource Locator', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
	});

	test('should render both RLC components in google sheets', async ({ n8n }) => {
		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.addNode('Google Sheets', { closeNDV: false, action: 'Update row in sheet' });

		await expect(n8n.ndv.getResourceLocator('documentId')).toBeVisible();
		await expect(n8n.ndv.getResourceLocator('sheetName')).toBeVisible();
		await expect(n8n.ndv.getResourceLocatorModeSelectorInput('documentId')).toHaveValue(
			MODE_SELECTOR_LIST,
		);
		await expect(n8n.ndv.getResourceLocatorModeSelectorInput('sheetName')).toHaveValue(
			MODE_SELECTOR_LIST,
		);
	});

	test('should show appropriate error when credentials are not set', async ({ n8n }) => {
		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.addNode('Google Sheets', { closeNDV: false, action: 'Update row in sheet' });

		await expect(n8n.ndv.getResourceLocator('documentId')).toBeVisible();

		await n8n.ndv.getResourceLocatorInput('documentId').click();

		await expect(n8n.ndv.getResourceLocatorErrorMessage('documentId')).toContainText(
			NO_CREDENTIALS_MESSAGE,
		);
	});

	test('should show create credentials modal when clicking "add your credential"', async ({
		n8n,
	}) => {
		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.addNode('Google Sheets', { closeNDV: false, action: 'Update row in sheet' });

		await expect(n8n.ndv.getResourceLocator('documentId')).toBeVisible();

		await n8n.ndv.getResourceLocatorInput('documentId').click();

		await expect(n8n.ndv.getResourceLocatorErrorMessage('documentId')).toContainText(
			NO_CREDENTIALS_MESSAGE,
		);

		await n8n.ndv.getResourceLocatorAddCredentials('documentId').click();

		await expect(n8n.canvas.credentialModal.getModal()).toBeVisible();
	});

	test('should show appropriate error when credentials are not valid', async ({ n8n }) => {
		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.addNode('Google Sheets', { closeNDV: false, action: 'Update row in sheet' });

		// Add oAuth credentials
		await n8n.ndv.getNodeCredentialsSelect().click();
		await n8n.ndv.credentialDropdownCreateNewCredential().click();

		await expect(n8n.canvas.credentialModal.getModal()).toBeVisible();

		await n8n.canvas.credentialModal.getAuthTypeRadioButtons().first().click();
		await n8n.canvas.credentialModal.fillAllFields({
			clientId: 'dummy-client-id',
			clientSecret: 'dummy-client-secret',
		});
		await n8n.canvas.credentialModal.save();
		await n8n.canvas.credentialModal.close();
		// Close warning modal about not connecting the OAuth credentials
		const closeButton = n8n.page.locator('.el-message-box').locator('button:has-text("Close")');
		await closeButton.click();

		await n8n.ndv.getResourceLocatorInput('documentId').click();

		await expect(n8n.ndv.getResourceLocatorErrorMessage('documentId')).toContainText(
			INVALID_CREDENTIALS_MESSAGE,
		);
	});

	test('should show appropriate errors when search filter is required', async ({ n8n }) => {
		await n8n.canvas.addNode('GitHub', { closeNDV: false, trigger: 'On pull request' });

		await expect(n8n.ndv.getResourceLocator('owner')).toBeVisible();
		await n8n.ndv.getResourceLocatorInput('owner').click();

		await expect(n8n.ndv.getResourceLocatorErrorMessage('owner')).toContainText(
			NO_CREDENTIALS_MESSAGE,
		);
	});

	test('should reset resource locator when dependent field is changed', async ({ n8n }) => {
		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.addNode('Google Sheets', { closeNDV: false, action: 'Update row in sheet' });

		await n8n.ndv.setRLCValue('documentId', '123');
		await n8n.ndv.setRLCValue('sheetName', '123', 1);
		await n8n.ndv.setRLCValue('documentId', '321');

		await expect(n8n.ndv.getResourceLocatorInput('sheetName').locator('input')).toHaveValue('');
	});

	// unlike RMC and remote options, RLC does not support loadOptionDependsOn
	test('should retrieve list options when other params throw errors', async ({ n8n }) => {
		await n8n.canvas.addNode(E2E_TEST_NODE_NAME, { closeNDV: false, action: 'Resource Locator' });

		await n8n.ndv.getResourceLocatorInput('rlc').click();

		await expect(n8n.page.getByTestId('rlc-item').first()).toBeVisible();
		const visiblePopper = n8n.ndv.getVisiblePopper();
		await expect(visiblePopper).toHaveCount(1);
		await expect(visiblePopper.getByTestId('rlc-item')).toHaveCount(5);

		await n8n.ndv.setInvalidExpression({ fieldName: 'fieldId' });

		await n8n.ndv.getInputPanel().click(); // remove focus from input, hide expression preview

		// wait for the expression to be evaluated and show the error
		await expect(n8n.ndv.getParameterInputHint()).toContainText('ERROR');

		await n8n.ndv.getResourceLocatorInput('rlc').click();

		await expect(n8n.page.getByTestId('rlc-item').first()).toBeVisible();
		const visiblePopperAfter = n8n.ndv.getVisiblePopper();
		await expect(visiblePopperAfter).toHaveCount(1);
		await expect(visiblePopperAfter.getByTestId('rlc-item')).toHaveCount(5);
	});
});

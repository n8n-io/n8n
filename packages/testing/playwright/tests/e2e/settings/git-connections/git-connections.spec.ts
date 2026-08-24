import { nanoid } from 'nanoid';

import { expect, test } from '../../../../fixtures/base';

test.use({ capability: 'git-connections' });

test.describe(
	'Git Connections @capability:git-connections @licensed',
	{
		annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }],
	},
	() => {
		const connectionName = `E2E git connection ${nanoid(8)}`;

		// A leaked connection keeps a real working copy on the instance, so clean up
		// even when the test failed part-way through.
		test.afterEach(async ({ n8n }) => {
			await n8n.gitConnections.deleteConnectionIfPresent(connectionName);
		});

		test('an admin can create a git connector, find it after a reload, and delete it', async ({
			n8n,
		}) => {
			await n8n.gitConnections.goto();
			await n8n.gitConnections.addGitConnector();
			await n8n.gitConnections.fillConnection(connectionName, 'git@github.com:acme/promotions.git');
			await n8n.gitConnections.save();

			await expect(n8n.gitConnections.getDeployKeyStep()).toContainText('ssh-');
			await n8n.gitConnections.confirmDeployKey();
			await expect(n8n.gitConnections.getConnectionCard(connectionName)).toBeVisible();

			await n8n.page.reload();
			await expect(n8n.gitConnections.getConnectionCard(connectionName)).toBeVisible();

			await n8n.gitConnections.deleteConnection(connectionName);
			await expect(n8n.gitConnections.getConnectionCard(connectionName)).toBeHidden();
		});
	},
);

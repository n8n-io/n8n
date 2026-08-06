import { existsSync } from 'fs';
import path from 'path';

import { expect, test } from '../../fixtures/base';

/**
 * Asserts that the backend started by this run respects N8N_USER_FOLDER —
 * the sqlite database must be created inside the run's generated user folder
 * (see USER_FOLDER in playwright.config.ts), not in the default ~/.n8n.
 * Together with the non-default-port smoke variant this covers the full
 * "relocated dev instance" setup: custom ports and a custom data folder.
 */

test.describe(
	'Dev-server user folder',
	{
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{
				type: 'description',
				description:
					'Verifies the dev backend creates its sqlite database inside the N8N_USER_FOLDER configured for the run.',
			},
		],
	},
	() => {
		test('sqlite database is created in the configured user folder', async ({ n8n }) => {
			const userFolder = process.env.N8N_TEST_USER_FOLDER;
			test.skip(!userFolder, 'This run does not manage the n8n webServer');

			// Visiting the app guarantees the backend has fully booted.
			await n8n.start.fromHome();

			expect(existsSync(path.join(userFolder!, '.n8n', 'database.sqlite'))).toBe(true);
		});
	},
);

import { adminViewsExecutionsList } from '../../../composables/journeys/admin-views-executions-list';
import { test } from '../../../fixtures/base';

test.describe(
	'an admin can view the execution list',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('renders the project executions list with seeded executions', async ({ n8n, api }) => {
			await adminViewsExecutionsList({ n8n, api });
		});
	},
);

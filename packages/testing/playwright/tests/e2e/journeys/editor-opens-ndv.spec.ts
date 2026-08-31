import { editorOpensNdv } from '../../../composables/journeys/editor-opens-ndv';
import { test } from '../../../fixtures/base';

test.describe(
	'an editor can open a node in the details view',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('surfaces accessibility violations at its checkpoints without blocking the journey', async ({
			n8n,
			a11yGate,
		}) => {
			await editorOpensNdv({ n8n, a11yGate });
		});
	},
);

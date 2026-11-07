import { WORKFLOW_SETTINGS_SCOPE } from '../src/workflow-settings-scope';

describe('WORKFLOW_SETTINGS_SCOPE', () => {
	it('versions the engine', () => {
		expect(WORKFLOW_SETTINGS_SCOPE.engineType).toBe('version');
	});
});

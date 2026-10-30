import { WORKFLOW_SETTINGS_SCOPE } from '../src/workflow-settings-scope';

describe('WORKFLOW_SETTINGS_SCOPE', () => {
	it('versions only the engine', () => {
		const versioned = Object.entries(WORKFLOW_SETTINGS_SCOPE)
			.filter(([, scope]) => scope === 'version')
			.map(([key]) => key);

		expect(versioned).toEqual(['engineType']);
	});

	it('keeps access and data protection settings live', () => {
		expect(WORKFLOW_SETTINGS_SCOPE).toMatchObject({
			availableInMCP: 'live',
			callerPolicy: 'live',
			callerIds: 'live',
			redactionPolicy: 'live',
			redactCallerExecutions: 'live',
		});
	});
});

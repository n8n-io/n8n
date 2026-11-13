import type { VersionedWorkflowSettingKey } from '../src/workflow-settings-scope';

describe('VersionedWorkflowSettingKey', () => {
	it('versions only the engine', () => {
		expectTypeOf<VersionedWorkflowSettingKey>().toEqualTypeOf<'engineType'>();
	});
});

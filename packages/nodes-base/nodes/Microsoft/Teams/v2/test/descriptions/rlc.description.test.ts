import { byIdUnderSp } from '../../actions/task/helpers';
import * as rlc from '../../descriptions/rlc.description';

// Pins the emitted shape of every v2 resource locator, key presence included: pretty-format
// prints `undefined`-valued keys and sorts keys, so a `required: undefined` or a dropped
// `typeOptions` key is a diff while key order is not. A copy change is a reviewed `.snap` diff.
describe('Microsoft Teams v2 rlc.description', () => {
	it('emits the pinned INodeProperties', () => {
		expect({ ...rlc }).toMatchSnapshot();
	});

	// The Service Principal By-ID copies of the three Planner RLCs, with and without the
	// `required: false` override. The composed node's SP contract is asserted in
	// `Teams/test/v2/servicePrincipalDisplayOptions.test.ts`.
	it('emits the pinned Service Principal By-ID copies', () => {
		const assignedTo = {
			displayName: 'Assigned To',
			name: 'assignedTo',
			description: 'Who the task should be assigned to',
		};

		expect({
			plan: byIdUnderSp(rlc.planRLC),
			planOptional: byIdUnderSp(rlc.planRLC, { required: false }),
			bucket: byIdUnderSp(rlc.bucketRLC),
			bucketOptional: byIdUnderSp(rlc.bucketRLC, { required: false }),
			assignedTo: byIdUnderSp(rlc.memberRLC, assignedTo),
			assignedToOptional: byIdUnderSp(rlc.memberRLC, { ...assignedTo, required: false }),
		}).toMatchSnapshot();
	});
});

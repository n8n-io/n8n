import { byIdUnderSp } from '../../actions/task/helpers';
import * as rlc from '../../descriptions/rlc.description';

// Pins the emitted shape of every v2 resource locator, key presence included: pretty-format
// prints `undefined`-valued keys and sorts keys, so a `required: undefined` or a dropped
// `typeOptions` key is a diff while key order is not. A copy change is a reviewed `.snap` diff.
describe('Microsoft Teams v2 resource locators', () => {
	it('emit the pinned INodeProperties', () => {
		expect({ ...rlc }).toMatchSnapshot();
		// Each locator owns its mode objects (outer objects only); a hoisted shared mode would pass the snapshot.
		expect(rlc.teamRLC.modes?.[2]).not.toBe(rlc.groupRLC.modes?.[1]);
	});

	// The Service Principal By-ID copies: seven call sites in task:create, task:update and
	// task:getAll, six distinct inputs (create and getAll both pass a bare `planRLC`).
	it('emit the pinned Service Principal By-ID copies', () => {
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

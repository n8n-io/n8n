import type { TaskBoardEvent } from 'n8n-workflow';

import { shouldEmit } from '../shouldEmit';

const baseEvent: TaskBoardEvent = {
	event: 'task.commented',
	projectId: 'p1',
	boardId: 'b1',
	taskId: 't1',
	actor: { type: 'user', id: 'u1' },
};
const options = { boardId: 'b1', events: ['task.commented' as const], ignoreAgentAuthored: true };

describe('shouldEmit', () => {
	it('keeps a user-authored event', () => {
		expect(shouldEmit(baseEvent, options)).toBe(true);
	});

	it('drops an agent-authored event by default', () => {
		expect(shouldEmit({ ...baseEvent, actor: { type: 'agent', id: 'a1' } }, options)).toBe(false);
	});

	it('keeps an agent-authored event when the flag is off', () => {
		const event = { ...baseEvent, actor: { type: 'agent' as const, id: 'a1' } };
		expect(shouldEmit(event, { ...options, ignoreAgentAuthored: false })).toBe(true);
	});

	it('keeps a workflow-authored event', () => {
		expect(shouldEmit({ ...baseEvent, actor: { type: 'workflow', id: 'w1' } }, options)).toBe(true);
	});

	it('drops an event from another board or an unselected event', () => {
		expect(shouldEmit({ ...baseEvent, boardId: 'b2' }, options)).toBe(false);
		expect(shouldEmit({ ...baseEvent, event: 'task.moved' }, options)).toBe(false);
	});
});

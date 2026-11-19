import type { TaskBoardEvent, TaskBoardEventName } from 'n8n-workflow';

export type ShouldEmitOptions = {
	boardId: string;
	events: TaskBoardEventName[];
	ignoreAgentAuthored: boolean;
};

/**
 * Only events whose actor is an `agent` are treated as agent-authored.
 * Events from a `workflow` actor still pass, so an intake workflow can start a dispatcher.
 */
export function shouldEmit(event: TaskBoardEvent, options: ShouldEmitOptions): boolean {
	if (event.boardId !== options.boardId) return false;
	if (!options.events.includes(event.event)) return false;
	if (options.ignoreAgentAuthored && event.actor.type === 'agent') return false;
	return true;
}

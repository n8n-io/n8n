import { closeWindow, openWindow } from './lookback';
import { type Ctx, newCtx } from './paginations/fetch';
import { type State, loadState, toJson } from './state';
import { pollLatest } from './styles/latest';
import { pollNewest } from './styles/newestFirst';
import { pollSince, pollTail } from './styles/oldestFirst';
import type { Outcome } from './styles/sorted';
import type { FetchPage, Poll, PollConfig, PollResult } from './types';

const run = async (ctx: Ctx, state: State | undefined): Promise<Outcome> => {
	const { order, useSince } = ctx.config;
	if (order === 'newestFirst') return await pollNewest(ctx, state);
	return useSince ? await pollSince(ctx, state) : await pollTail(ctx, state);
};

/** Any rejected fetch rejects the whole poll, so the caller keeps the previous state. */
export const poll: Poll = async (
	config: PollConfig,
	rawState: unknown,
	fetchPage: FetchPage,
): Promise<PollResult> => {
	const state = loadState(rawState);
	if (config.order === 'latest') return await pollLatest(config, state, fetchPage);
	const now = config.clock();
	const window = openWindow(config, state);
	const ctx = newCtx(config, fetchPage);
	ctx.cap = state?.position?.cap;
	ctx.lookback = window.from;
	ctx.recent = new Set(window.entries.map((entry) => entry.hash));
	const outcome = await run(ctx, state);
	if (outcome.state.position && ctx.cap !== undefined) outcome.state.position.cap = ctx.cap;
	closeWindow(config, state, outcome.state, outcome.items, window, now);
	return {
		items: outcome.items,
		state: toJson(outcome.state),
		warnings: [],
		baseline: outcome.baseline === true,
	};
};

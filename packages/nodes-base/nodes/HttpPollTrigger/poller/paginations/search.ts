import type { Position } from '../state';
import type { PollConfig } from '../types';
import { midpoint } from './fetch';

/** The search keeps the walk's `since` and the keys of the last items read, which still prove a page once found. */
const carried = (pos: Position): Position => ({
	since: pos.since,
	anchors: pos.anchors,
	edge: pos.edge,
});

/** Insertions pushed the boundary past this all-Behind page: gallop forward, or bisect once an upper bound is known. */
export const forward = (pos: Position, lo: number, n: number): Position => {
	const hi = pos.hi !== undefined && pos.hi > lo ? pos.hi : undefined;
	if (hi !== undefined) return { ...carried(pos), offset: midpoint(lo, hi), lo, hi };
	const jump = pos.step !== undefined && pos.step > 0 ? pos.step : 0;
	return { ...carried(pos), offset: lo + jump, lo, step: jump ? jump * 2 : n };
};

/** Deletions pulled the boundary before this page: gallop back, or bisect once a lower bound is known. */
export const backward = (config: PollConfig, pos: Position, hi: number, n: number): Position => {
	const lo = pos.lo !== undefined && pos.lo < hi ? pos.lo : undefined;
	if (lo !== undefined) return { ...carried(pos), offset: midpoint(lo, hi), lo, hi };
	const jump = pos.step !== undefined && pos.step < 0 ? -pos.step * 2 : n || config.pageSize;
	return { ...carried(pos), offset: Math.max(0, hi - jump), hi, step: -jump };
};

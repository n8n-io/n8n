export { FILES, hookSpecSchema, parseHookSpecs } from './hooks/spec';
export type { HookSpec, HarnessHookSpec, Role, SetHookSpec } from './hooks/spec';
export { hook, parseHookLine, preloadNodeOptions } from './hooks/control';
export type { HookHit } from './hooks/control';
export {
	freeze,
	logs,
	signal,
	startAgain,
	until,
	waitForExit,
	waitForLog,
} from './process';
export type { Container, ExitResult, LogMatch, Signal } from './process';

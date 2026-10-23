import { lineMatcher } from './process';

describe('lineMatcher', () => {
	it('matches a snippet only once its line is complete', () => {
		const match = lineMatcher(['drain waits']);
		expect(match('worker: drain wa')).toBeUndefined();
		expect(match('its for 1\n')).toBe('worker: drain waits for 1');
	});

	it('matches any of several snippets and skips other lines', () => {
		const match = lineMatcher(['exited', 'started']);
		expect(match('noise\nexecution 4 started\nexited\n')).toBe('execution 4 started');
	});

	it('returns undefined when no complete line matches', () => {
		expect(lineMatcher(['x'])('a\nb\nx without newline')).toBeUndefined();
	});
});

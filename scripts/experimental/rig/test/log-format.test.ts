import { stripVTControlCharacters } from 'node:util';
import { describe, expect, it } from 'vitest';

import { formatLogLine } from '../src/ui/log-format';
import { truncateVisible } from '../src/ui/status-line';

const plain = (text: string) => stripVTControlCharacters(text);

describe('JSON log lines', () => {
	it('should show time, level, message, scopes, and extra metadata', () => {
		const line = JSON.stringify({
			level: 'warn',
			message: 'Slow query',
			metadata: {
				timestamp: '2026-11-13T21:09:52.000Z',
				file: 'db.js',
				function: 'run',
				scopes: ['db'],
				ms: 1200,
				query: 'select 1',
			},
		});
		const formatted = plain(formatLogLine(line));
		const stamp = new Date('2026-11-13T21:09:52.000Z').toLocaleTimeString(undefined, {
			hour12: false,
		});
		expect(formatted).toBe(`${stamp} warn  Slow query [db] ms=1200 query="select 1"`);
		expect(formatted).not.toContain('db.js');
	});

	it('should keep lines that are not n8n JSON logs', () => {
		expect(formatLogLine('n8n ready on ::, port 5678')).toBe('n8n ready on ::, port 5678');
		expect(formatLogLine('{"not":"a log"}')).toBe('{"not":"a log"}');
		expect(formatLogLine('{"broken')).toBe('{"broken');
	});

	it('should strip control characters from the message, the level, and the metadata', () => {
		const line = JSON.stringify({
			level: 'info',
			message: 'bad \u001b[2J message',
			metadata: { hint: 'x\u001b]52;c;YWFh\u0007', scopes: ['db\u001b[1m'] },
		});
		const formatted = plain(formatLogLine(line));
		expect(formatted).toContain('bad  message');
		expect(formatted).not.toContain('[2J');
		expect(formatted).not.toContain('YWFh');
		expect(formatted).not.toContain('[1m');
	});

	it('should strip control characters from lines that are not n8n JSON logs', () => {
		expect(formatLogLine('plain \u001b[31mred\u001b[39m')).toBe('plain red');
		expect(formatLogLine('\u001b[2J{"broken')).toBe('{"broken');
	});
});

describe('status line', () => {
	it('should cut colored text to the visible width', () => {
		const text = '\u001b[32m●\u001b[39m main-1  \u001b[33m◌\u001b[39m worker-1';
		const cut = truncateVisible(text, 10);
		expect(plain(cut)).toBe('● main-1 …');
		expect(truncateVisible(text, 80)).toBe(text);
	});
});

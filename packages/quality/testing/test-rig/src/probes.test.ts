import { lines, parseHash, parseStatusRow, PostgresProbe, quote, RedisProbe } from './probes';

const fakeExec = (outputs: Record<string, string>) => {
	const calls: string[][] = [];
	const exec = async (command: string[]) => {
		calls.push(command);
		const key = Object.keys(outputs).find((part) => command.join(' ').includes(part));
		return await Promise.resolve(key === undefined ? '' : outputs[key]);
	};
	return { exec, calls };
};

describe('parsers', () => {
	it('parses a status row', () => {
		expect(parseStatusRow('success|t')).toEqual({ status: 'success', finished: true });
		expect(parseStatusRow('')).toEqual({ status: '', finished: false });
	});

	it('parses a Bull hash without data and opts', () => {
		expect(parseHash('name\njob\ndata\n{"big":1}\nopts\n{}\nattemptsMade\n0')).toEqual({
			name: 'job',
			attemptsMade: '0',
		});
		expect(parseHash('')).toEqual({});
	});

	it('splits output into non-empty lines and quotes SQL text', () => {
		expect(lines('1\n\n2\n')).toEqual(['1', '2']);
		expect(quote("it's")).toBe("'it''s'");
	});
});

describe('PostgresProbe', () => {
	it('reads an execution with its stalled error', async () => {
		const { exec, calls } = fakeExec({ 'select status': 'crashed|f', 'select count': '1' });
		expect(await new PostgresProbe(exec).execution('12')).toEqual({
			status: 'crashed',
			finished: false,
			stalledError: true,
		});
		expect(calls[0].slice(0, 6)).toEqual(['psql', '-U', 'n8n_user', '-d', 'n8n_db', '-tAc']);
		expect(calls[0][6]).toContain('where id = 12');
	});

	it('escapes the text it searches for and the workflow id it filters on', async () => {
		const { exec, calls } = fakeExec({ 'select count': '0', 'select id from': '3\n4' });
		const probe = new PostgresProbe(exec);
		expect(await probe.executionDataContains('5', "can't")).toBe(false);
		expect(calls[0][6]).toContain("like '%can''t%'");
		expect(await probe.executionsOf("w'1")).toEqual(['3', '4']);
		expect(calls[1][6]).toContain("\"workflowId\" = 'w''1'");
	});

	it('reads the status of every execution of a workflow', async () => {
		const { exec } = fakeExec({ 'select id, status': '1|success\n2|crashed' });
		expect(await new PostgresProbe(exec).statusesOf('w')).toEqual({ 1: 'success', 2: 'crashed' });
	});

	it('waits until the execution leaves a pending status', async () => {
		let polls = 0;
		const exec = async (command: string[]) =>
			await Promise.resolve(
				command.join(' ').includes('select status')
					? ++polls < 2
						? 'running|f'
						: 'success|t'
					: '0',
			);
		expect((await new PostgresProbe(exec).waitForExecution('1', 5_000)).status).toBe('success');
		expect(polls).toBe(2);
	});
});

describe('RedisProbe', () => {
	it('reads the Bull lists and one job', async () => {
		const { exec } = fakeExec({
			'LRANGE bull:jobs:wait': '7',
			'LRANGE bull:jobs:active': '',
			ZRANGE: '5\n6',
			HGETALL: 'name\njob',
			'EXISTS bull:jobs:7:lock': '0',
			'EXISTS bull:jobs:7': '1',
		});
		expect(await new RedisProbe(exec).bull('7')).toEqual({
			wait: ['7'],
			active: [],
			failed: ['5', '6'],
			job: { name: 'job', exists: true, lock: false },
		});
	});

	it('reads the multi-main leader, undefined when vacant', async () => {
		expect(await new RedisProbe(fakeExec({ GET: 'main-a' }).exec).leader()).toBe('main-a');
		expect(await new RedisProbe(fakeExec({}).exec).leader()).toBeUndefined();
	});
});

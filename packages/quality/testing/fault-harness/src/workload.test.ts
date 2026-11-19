import { readResponse, STARTING_UP } from './workload';

describe('readResponse', () => {
	it('accept a 200 and take its body as the execution id', () => {
		expect(readResponse(200, '42')).toEqual({ accepted: true, executionId: '42' });
	});

	it('accept a 200 with an empty body without an execution id', () => {
		expect(readResponse(200, '')).toEqual({ accepted: true, executionId: undefined });
	});

	it('refuse the starting-up answer although its status is 200', () => {
		expect(readResponse(200, STARTING_UP)).toEqual({ accepted: false, executionId: undefined });
	});

	it('accept a 200 whose body only starts with the starting-up text', () => {
		expect(readResponse(200, `${STARTING_UP}!`).accepted).toBe(true);
	});

	it('refuse any other status', () => {
		expect(readResponse(503, STARTING_UP)).toEqual({ accepted: false, executionId: undefined });
		expect(readResponse(0, 'fetch failed')).toEqual({ accepted: false, executionId: undefined });
		expect(readResponse(500, '42')).toEqual({ accepted: false, executionId: undefined });
	});
});

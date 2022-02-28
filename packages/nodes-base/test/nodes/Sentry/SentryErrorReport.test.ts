const ErrorReportFunctions = require('../../../nodes/SentryIo/ErrorReportFunctions');

describe('parseStacktraceLine', () => {
	it('should return {raw_function, abs_path, lineno, colno} from stack trace line string', () => {
		const traceLine = "    at Object.execute (/nodes/EmailNotification/EmailStatusUpdater.node.ts:39:55)";
		expect(ErrorReportFunctions.parseStacktraceLine(traceLine)).toEqual({
			abs_path:"/nodes/EmailNotification/EmailStatusUpdater.node.ts",
			colno: 55,
			lineno: 39,
			raw_function: "Object.execute",
		});
	});
});

describe('extractStacktrace', () => {
	it('should extract correct stack data from error info', function () {
		const errorData = {
			stack: "TypeError: Cannot read property 'id' of undefined\n" +
        '    at Object.execute (/nodes/EmailNotification/EmailStatusUpdater.node.ts:39:55)\n' +
        '    at processTicksAndRejections (internal/process/task_queues.js:95:5)\n' +
        '    at /Users/admin/n8n/packages/core/src/WorkflowExecute.ts:814:26'
		};

		expect(ErrorReportFunctions.extractStacktrace(errorData)).toEqual({
			frames: [
				{abs_path: "/Users/admin/n8n/packages/core/src/WorkflowExecute.ts", colno: 26, lineno: 814},
				{abs_path: "internal/process/task_queues.js", colno: 5, lineno: 95, raw_function: "processTicksAndRejections"},
				{abs_path: "/nodes/EmailNotification/EmailStatusUpdater.node.ts", colno: 55, lineno: 39, raw_function: "Object.execute"},
			]
		});
	});
});



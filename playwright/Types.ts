export class TestError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'TestError';
	}
}

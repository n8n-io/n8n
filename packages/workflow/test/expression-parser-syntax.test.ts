import { validateExpressionSyntax } from '../src/extensions/expression-parser';

describe('validateExpressionSyntax', () => {
	it.each([
		'',
		'literal text',
		'Hello {{ $json.candidate?.name ?? "candidate" }}',
		'{{ {candidate: {status: "ready"} } }}',
		'{{ $json.items.map(item => ({name: item.name})) }}',
	])('accepts runtime expression syntax: %s', async (expression) => {
		await expect(validateExpressionSyntax(expression)).resolves.toBeUndefined();
	});

	it.each(['{{ {candidate: {status: "ready"}} }}', '{{ $json. }}', '{{ (true ? }}'])(
		'rejects malformed runtime syntax: %s',
		async (expression) => {
			await expect(validateExpressionSyntax(expression)).rejects.toBeInstanceOf(SyntaxError);
		},
	);

	it('parses without executing the expression', async () => {
		await expect(
			validateExpressionSyntax('{{ (() => { throw new Error("must not run"); })() }}'),
		).resolves.toBeUndefined();
	});
});

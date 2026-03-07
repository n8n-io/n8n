// Test for GHC-2498: JavaScript expressions not evaluated when attribute names contain emojis
import * as Helpers from './helpers';
import { Workflow } from '../src/workflow';

describe('Expression evaluation with emoji property names (GHC-2498)', () => {
	const nodeTypes = Helpers.NodeTypes();
	const workflow = new Workflow({
		id: '1',
		nodes: [
			{
				name: 'node',
				typeVersion: 1,
				type: 'test.set',
				id: 'uuid-1234',
				position: [0, 0],
				parameters: {},
			},
		],
		connections: {},
		active: false,
		nodeTypes,
	});
	const expression = workflow.expression;

	const evaluateExpression = (expr: string, inputData: Record<string, unknown>): unknown => {
		return expression.getParameterValue(`=${expr}`, null, 0, 0, 'node', [{ json: inputData }], 'manual', {});
	};

	describe('Bracket notation access', () => {
		it('should evaluate expression with basic emoji in property name (📧)', () => {
			const data = {
				'📧 Email': 'test@example.com',
			};

			const result = evaluateExpression('{{ $json["📧 Email"] }}', data);
			expect(result).toBe('test@example.com');
		});

		it('should evaluate expression with checkmark emoji (✅)', () => {
			const data = {
				'✅ Status': 'completed',
			};

			const result = evaluateExpression('{{ $json["✅ Status"] }}', data);
			expect(result).toBe('completed');
		});

		it('should evaluate expression with cross mark emoji (❌)', () => {
			const data = {
				'❌ Failed': 'error',
			};

			const result = evaluateExpression('{{ $json["❌ Failed"] }}', data);
			expect(result).toBe('error');
		});

		it('should evaluate expression with warning emoji (⚠️)', () => {
			const data = {
				'⚠️ Warning': 'caution',
			};

			const result = evaluateExpression('{{ $json["⚠️ Warning"] }}', data);
			expect(result).toBe('caution');
		});

		it('should evaluate expression with multiple emojis in property name (🎉🎊)', () => {
			const data = {
				'🎉🎊 Celebration': 'party',
			};

			const result = evaluateExpression('{{ $json["🎉🎊 Celebration"] }}', data);
			expect(result).toBe('party');
		});

		it('should evaluate expression with arrow emoji (➡️)', () => {
			const data = {
				'➡️ Direction': 'forward',
			};

			const result = evaluateExpression('{{ $json["➡️ Direction"] }}', data);
			expect(result).toBe('forward');
		});

		it('should evaluate expression with information emoji (ℹ️)', () => {
			const data = {
				'ℹ️ Info': 'information',
			};

			const result = evaluateExpression('{{ $json["ℹ️ Info"] }}', data);
			expect(result).toBe('information');
		});

		it('should evaluate expression with various symbol emojis', () => {
			const data = {
				'⭐ Star': 'rating',
				'💡 Idea': 'innovation',
				'📊 Chart': 'data',
				'🔔 Bell': 'notification',
			};

			expect(evaluateExpression('{{ $json["⭐ Star"] }}', data)).toBe('rating');
			expect(evaluateExpression('{{ $json["💡 Idea"] }}', data)).toBe('innovation');
			expect(evaluateExpression('{{ $json["📊 Chart"] }}', data)).toBe('data');
			expect(evaluateExpression('{{ $json["🔔 Bell"] }}', data)).toBe('notification');
		});
	});

	describe('Template string interpolation', () => {
		it('should interpolate emoji property in template string', () => {
			const data = {
				'📧 Email': 'user@example.com',
				name: 'John',
			};

			const result = evaluateExpression(
				'Hello {{ $json.name }}, your email is {{ $json["📧 Email"] }}',
				data,
			);
			expect(result).toBe('Hello John, your email is user@example.com');
		});

		it('should handle multiple emoji properties in same template', () => {
			const data = {
				'✅ Success': 5,
				'❌ Failed': 2,
			};

			const result = evaluateExpression(
				'Passed: {{ $json["✅ Success"] }}, Failed: {{ $json["❌ Failed"] }}',
				data,
			);
			expect(result).toBe('Passed: 5, Failed: 2');
		});

		it('should handle emoji properties with transformations', () => {
			const data = {
				'📧 Email': 'TEST@EXAMPLE.COM',
			};

			const result = evaluateExpression('{{ $json["📧 Email"].toLowerCase() }}', data);
			expect(result).toBe('test@example.com');
		});
	});

	describe('Complex expressions', () => {
		it('should handle emoji properties in conditional expressions', () => {
			const data = {
				'✅ Status': 'active',
			};

			const result = evaluateExpression(
				'{{ $json["✅ Status"] === "active" ? "yes" : "no" }}',
				data,
			);
			expect(result).toBe('yes');
		});

		it('should handle emoji properties in nested object access', () => {
			const data = {
				'📊 Stats': {
					count: 42,
					active: true,
				},
			};

			const result = evaluateExpression('{{ $json["📊 Stats"].count }}', data);
			expect(result).toBe(42);
		});

		it('should handle emoji properties in array operations', () => {
			const data = {
				'📋 Items': ['apple', 'banana', 'cherry'],
			};

			const result = evaluateExpression('{{ $json["📋 Items"][1] }}', data);
			expect(result).toBe('banana');
		});
	});

	describe('Edge cases', () => {
		it('should handle property name that is only an emoji', () => {
			const data = {
				'📧': 'email@example.com',
			};

			const result = evaluateExpression('{{ $json["📧"] }}', data);
			expect(result).toBe('email@example.com');
		});

		it('should handle emoji at different positions in property name', () => {
			const data = {
				'Email 📧': 'start',
				'📧 Email': 'middle',
				'📧': 'end',
			};

			expect(evaluateExpression('{{ $json["Email 📧"] }}', data)).toBe('start');
			expect(evaluateExpression('{{ $json["📧 Email"] }}', data)).toBe('middle');
			expect(evaluateExpression('{{ $json["📧"] }}', data)).toBe('end');
		});

		it('should handle emojis from different Unicode ranges', () => {
			const data = {
				// Miscellaneous Symbols (U+2600-U+26FF)
				'☀️ Sun': 'sunny',
				'☁️ Cloud': 'cloudy',
				// Dingbats (U+2700-U+27BF)
				'✅ Check': 'done',
				'❌ Cross': 'failed',
				// Emoticons (U+1F600-U+1F64F)
				'😀 Happy': 'joy',
				'😢 Sad': 'sorrow',
				// Supplemental Symbols (U+1F900-U+1F9FF)
				'🤖 Robot': 'ai',
			};

			expect(evaluateExpression('{{ $json["☀️ Sun"] }}', data)).toBe('sunny');
			expect(evaluateExpression('{{ $json["☁️ Cloud"] }}', data)).toBe('cloudy');
			expect(evaluateExpression('{{ $json["✅ Check"] }}', data)).toBe('done');
			expect(evaluateExpression('{{ $json["❌ Cross"] }}', data)).toBe('failed');
			expect(evaluateExpression('{{ $json["😀 Happy"] }}', data)).toBe('joy');
			expect(evaluateExpression('{{ $json["😢 Sad"] }}', data)).toBe('sorrow');
			expect(evaluateExpression('{{ $json["🤖 Robot"] }}', data)).toBe('ai');
		});
	});
});

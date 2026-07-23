import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WhatsAppChatbot } from './WhatsAppChatbot.node';
import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';

describe('WhatsAppChatbot Node', () => {
	let node: WhatsAppChatbot;

	beforeEach(() => {
		node = new WhatsAppChatbot();
	});

	describe('Node Description', () => {
		it('debería tener displayName correcto', () => {
			expect(node.description.displayName).toBe('WhatsApp Chatbot');
		});

		it('debería tener nombre correcto', () => {
			expect(node.description.name).toBe('whatsAppChatbot');
		});

		it('debería estar en grupo output', () => {
			expect(node.description.group).toContain('output');
		});

		it('debería tener versión 1', () => {
			expect(node.description.version).toBe(1);
		});

		it('debería tener color verde WhatsApp', () => {
			expect(node.description.defaults.color).toBe('#25D366');
		});

		it('debería tener inputs y outputs', () => {
			expect(node.description.inputs).toEqual(['main']);
			expect(node.description.outputs).toEqual(['main']);
		});
	});

	describe('Properties', () => {
		it('debería tener propiedad operation', () => {
			const operationProp = node.description.properties.find((p) => p.name === 'operation');
			expect(operationProp).toBeDefined();
			expect(operationProp?.type).toBe('options');
		});

		it('debería tener 3 operaciones disponibles', () => {
			const operationProp = node.description.properties.find((p) => p.name === 'operation');
			expect(operationProp?.options).toHaveLength(3);
		});

		it('debería tener operación processMessage', () => {
			const operationProp = node.description.properties.find((p) => p.name === 'operation');
			const processMessage = (operationProp?.options as any[]).find(
				(o) => o.value === 'processMessage',
			);
			expect(processMessage).toBeDefined();
		});

		it('debería requerir apiToken', () => {
			const tokenProp = node.description.properties.find((p) => p.name === 'apiToken');
			expect(tokenProp?.required).toBe(true);
		});

		it('debería tener propiedad message', () => {
			const messageProp = node.description.properties.find((p) => p.name === 'message');
			expect(messageProp).toBeDefined();
			expect(messageProp?.required).toBe(true);
		});

		it('debería tener propiedad useAI', () => {
			const aiProp = node.description.properties.find((p) => p.name === 'useAI');
			expect(aiProp?.type).toBe('boolean');
			expect(aiProp?.default).toBe(false);
		});

		it('debería tener propiedad saveToDb', () => {
			const dbProp = node.description.properties.find((p) => p.name === 'saveToDb');
			expect(dbProp?.type).toBe('boolean');
			expect(dbProp?.default).toBe(true);
		});
	});

	describe('Métodos privados', () => {
		it('validatePhoneNumber: debería aceptar número válido', () => {
			const result = (node as any).validatePhoneNumber('+599xxxxxxxxx');
			expect(result).toBe(true);
		});

		it('validatePhoneNumber: debería rechazar número sin +', () => {
			const result = (node as any).validatePhoneNumber('599xxxxxxxxx');
			expect(result).toBe(false);
		});

		it('validatePhoneNumber: debería rechazar número con espacios', () => {
			const result = (node as any).validatePhoneNumber('+599 xxx xx xxx');
			expect(result).toBe(false);
		});

		it('validatePhoneNumber: debería normalizar espacios', () => {
			const result = (node as any).validatePhoneNumber('  +599xxxxxxxxx  ');
			expect(result).toBe(true);
		});

		it('normalizePhoneNumber: debería remover caracteres especiales', () => {
			const result = (node as any).normalizePhoneNumber('+599-xxx-xx-xxx');
			expect(result).toBe('+599xxxxxxxxx');
		});

		it('normalizePhoneNumber: debería remover espacios', () => {
			const result = (node as any).normalizePhoneNumber('  +599 xxx xx xxx  ');
			expect(result).toBe('+599xxxxxxxxx');
		});

		it('sanitizeMessage: debería limitar a 4096 caracteres', () => {
			const longMessage = 'a'.repeat(5000);
			const result = (node as any).sanitizeMessage(longMessage);
			expect(result.length).toBe(4096);
		});

		it('sanitizeMessage: debería remover espacios en blanco', () => {
			const result = (node as any).sanitizeMessage('  Hello World  ');
			expect(result).toBe('Hello World');
		});

		it('extractRecipientFromData: debería extraer de estructura webhook', () => {
			const data = {
				entry: [
					{
						changes: [
							{
								value: {
									messages: [
										{
											from: '+599xxxxxxxxx',
										},
									],
								},
							},
						],
					},
				],
			};
			const result = (node as any).extractRecipientFromData(data);
			expect(result).toBe('+599xxxxxxxxx');
		});

		it('extractRecipientFromData: debería extraer de .sender', () => {
			const data = { sender: '+599xxxxxxxxx' };
			const result = (node as any).extractRecipientFromData(data);
			expect(result).toBe('+599xxxxxxxxx');
		});

		it('extractRecipientFromData: debería retornar null si no encuentra', () => {
			const result = (node as any).extractRecipientFromData({});
			expect(result).toBeNull();
		});
	});

	describe('Validaciones', () => {
		it('debería rechazar token vacío', async () => {
			const mockExecution = {
				getInputData: () => [{ json: {} }],
				getNodeParameter: vi.fn((param: string) => {
					if (param === 'operation') return 'processMessage';
					if (param === 'apiToken') return '';
					return '';
				}),
				getNode: () => ({ name: 'test' }),
			} as unknown as IExecuteFunctions;

			// Este debería lanzar un error
			try {
				await node.execute.call(mockExecution);
				expect.fail('Debería haber lanzado error');
			} catch (error) {
				expect(error).toBeInstanceOf(NodeOperationError);
			}
		});
	});

	describe('Formato de números', () => {
		const testCases = [
			{ input: '+599xxxxxxxxx', valid: true, description: 'Formato correcto' },
			{ input: '+1xxxxxxxxxx', valid: true, description: 'Código US' },
			{ input: '+34xxxxxxxxx', valid: true, description: 'Código España' },
			{ input: '599xxxxxxxxx', valid: false, description: 'Sin +' },
			{ input: '+599 xxx xx x', valid: false, description: 'Con espacios' },
			{ input: '+599-xxxxxxxxx', valid: false, description: 'Con guiones' },
			{ input: '', valid: false, description: 'Vacío' },
		];

		testCases.forEach(({ input, valid, description }) => {
			it(`${description}: "${input}"`, () => {
				const result = (node as any).validatePhoneNumber(input);
				expect(result).toBe(valid);
			});
		});
	});

	describe('Límites', () => {
		it('mensaje no debería exceder 4096 chars', () => {
			const longMsg = 'A'.repeat(4200);
			const result = (node as any).sanitizeMessage(longMsg);
			expect(result.length).toBeLessThanOrEqual(4096);
		});

		it('número debería tener máximo 15 dígitos', () => {
			const result = (node as any).validatePhoneNumber('+1' + '9'.repeat(16));
			expect(result).toBe(false);
		});
	});

	describe('Operaciones', () => {
		it('processMessage: debería estar configurado', () => {
			const ops = (node.description.properties[0].options as any[]) || [];
			const processMsg = ops.find((o) => o.value === 'processMessage');
			expect(processMsg).toBeDefined();
		});

		it('configureRules: debería estar configurado', () => {
			const ops = (node.description.properties[0].options as any[]) || [];
			const configRules = ops.find((o) => o.value === 'configureRules');
			expect(configRules).toBeDefined();
		});

		it('getHistory: debería estar configurado', () => {
			const ops = (node.description.properties[0].options as any[]) || [];
			const getHistory = ops.find((o) => o.value === 'getHistory');
			expect(getHistory).toBeDefined();
		});
	});
});

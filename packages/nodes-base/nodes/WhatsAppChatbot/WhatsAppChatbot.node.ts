import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

interface WhatsAppResponse {
	messaging_product: string;
	messages?: Array<{
		id: string;
		message_status: string;
	}>;
	contacts?: Array<{
		input: string;
		wa_id: string;
	}>;
	error?: {
		message: string;
		type: string;
		code: number;
	};
}

export class WhatsAppChatbot implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WhatsApp Chatbot',
		name: 'whatsAppChatbot',
		icon: 'file:whatsapp.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Envía mensajes a WhatsApp y gestiona respuestas automáticas',
		defaults: {
			name: 'WhatsApp Chatbot',
			color: '#25D366',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Operación',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Procesar Mensaje',
						value: 'processMessage',
						description: 'Envía un mensaje a WhatsApp',
					},
					{
						name: 'Configurar Reglas',
						value: 'configureRules',
						description: 'Configura reglas de respuesta automática',
					},
					{
						name: 'Obtener Historial',
						value: 'getHistory',
						description: 'Obtiene historial de conversaciones',
					},
				],
				default: 'processMessage',
			},
			{
				displayName: 'Token de API',
				name: 'apiToken',
				type: 'string',
				typeOptions: {
					password: true,
				},
				default: '',
				required: true,
				description: 'Token de acceso de WhatsApp Business API',
				displayOptions: {
					show: {
						operation: ['processMessage', 'configureRules', 'getHistory'],
					},
				},
			},
			{
				displayName: 'ID del Número de Teléfono',
				name: 'phoneNumberId',
				type: 'string',
				default: '',
				required: true,
				description: 'ID del número de teléfono de WhatsApp Business',
				displayOptions: {
					show: {
						operation: ['processMessage', 'configureRules'],
					},
				},
			},
			{
				displayName: 'Número de Destino',
				name: 'recipientNumber',
				type: 'string',
				default: '',
				placeholder: '+599xxxxxxxxx',
				description: 'Número de teléfono (formato: +codigopais número)',
				displayOptions: {
					show: {
						operation: ['processMessage'],
					},
				},
			},
			{
				displayName: 'Contenido del Mensaje',
				name: 'message',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				required: true,
				description: 'Contenido del mensaje (máx 4096 caracteres)',
				displayOptions: {
					show: {
						operation: ['processMessage'],
					},
				},
			},
			{
				displayName: 'Palabras Clave',
				name: 'keywords',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				placeholder: 'hola\nayuda\nhorario',
				description: 'Palabras clave para disparar respuestas (una por línea)',
				displayOptions: {
					show: {
						operation: ['configureRules'],
					},
				},
			},
			{
				displayName: 'Respuesta Automática',
				name: 'autoResponse',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: 'Gracias por tu mensaje. Un agente te responderá pronto.',
				description: 'Mensaje de respuesta automática',
				displayOptions: {
					show: {
						operation: ['configureRules'],
					},
				},
			},
			{
				displayName: 'Usar Inteligencia Artificial',
				name: 'useAI',
				type: 'boolean',
				default: false,
				description: 'Integrar con IA para respuestas contextuales',
			},
			{
				displayName: 'Guardar en Base de Datos',
				name: 'saveToDb',
				type: 'boolean',
				default: true,
				description: 'Guardar mensajes en base de datos',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0) as string;
		const apiToken = this.getNodeParameter('apiToken', 0) as string;
		const useAI = this.getNodeParameter('useAI', 0) as boolean;
		const saveToDb = this.getNodeParameter('saveToDb', 0) as boolean;

		if (!apiToken || !apiToken.trim()) {
			throw new NodeOperationError(this.getNode(), 'Token de API de WhatsApp es obligatorio');
		}

		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const item = items[itemIndex];

			try {
				switch (operation) {
					case 'processMessage': {
						const phoneNumberId = (
							this.getNodeParameter('phoneNumberId', itemIndex) as string
						).trim();
						let recipientNumber = (
							this.getNodeParameter('recipientNumber', itemIndex) as string
						).trim();
						const message = (this.getNodeParameter('message', itemIndex) as string).trim();

						if (!phoneNumberId || !message) {
							throw new NodeOperationError(
								this.getNode(),
								'phoneNumberId y message son obligatorios',
							);
						}

						if (!recipientNumber) {
							// Intenta extraer el número del payload
							const itemJson = item.json as any;
							if (itemJson?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from) {
								recipientNumber = String(itemJson.entry[0].changes[0].value.messages[0].from);
							} else if (itemJson?.sender) {
								recipientNumber = String(itemJson.sender);
							} else if (itemJson?.phone_number) {
								recipientNumber = String(itemJson.phone_number);
							}
						}

						if (!recipientNumber) {
							throw new NodeOperationError(
								this.getNode(),
								'recipientNumber es obligatorio o debe estar en el payload',
							);
						}

						// Validar formato de número de teléfono
						const phoneRegex = /^\+\d{1,15}$/;
						if (!phoneRegex.test(recipientNumber.trim())) {
							throw new NodeOperationError(
								this.getNode(),
								`Número inválido: "${recipientNumber}". Usa formato: +codigopais número`,
							);
						}

						const normalizedNumber = recipientNumber.trim().replace(/[^\d+]/g, '');
						const sanitizedMessage = message.trim().substring(0, 4096);

						const response = (await this.helpers.httpRequest({
							method: 'POST',
							url: `https://graph.instagram.com/v18.0/${phoneNumberId}/messages`,
							headers: {
								Authorization: `Bearer ${apiToken}`,
								'Content-Type': 'application/json',
							},
							body: {
								messaging_product: 'whatsapp',
								to: normalizedNumber,
								type: 'text',
								text: {
									preview_url: false,
									body: sanitizedMessage,
								},
							},
						})) as WhatsAppResponse;

						const messageId = response.messages?.[0]?.id || 'unknown';
						const messageStatus = response.messages?.[0]?.message_status || 'queued';

						item.json = {
							...item.json,
							success: true,
							status: messageStatus,
							messageId,
							recipientNumber: normalizedNumber,
							messageLength: sanitizedMessage.length,
							timestamp: new Date().toISOString(),
							useAI,
							saveToDb,
						};
						break;
					}

					case 'configureRules': {
						const phoneNumberId = (
							this.getNodeParameter('phoneNumberId', itemIndex) as string
						).trim();
						const keywordsInput = (this.getNodeParameter('keywords', itemIndex) as string).trim();
						const autoResponse = (
							this.getNodeParameter('autoResponse', itemIndex) as string
						).trim();

						if (!phoneNumberId) {
							throw new NodeOperationError(this.getNode(), 'phoneNumberId es obligatorio');
						}

						const keywords = keywordsInput
							.split('\n')
							.map((k) => k.trim())
							.filter((k) => k.length > 0)
							.map((k) => k.toLowerCase());

						if (!autoResponse) {
							throw new NodeOperationError(this.getNode(), 'Respuesta automática es obligatoria');
						}

						item.json = {
							...item.json,
							config: {
								phoneNumberId,
								keywords,
								autoResponse: autoResponse.trim().substring(0, 4096),
								active: true,
								useAI,
							},
							status: 'configurado',
							keywordCount: keywords.length,
							timestamp: new Date().toISOString(),
						};
						break;
					}

					case 'getHistory': {
						const phoneNumberId = (
							this.getNodeParameter('phoneNumberId', itemIndex) as string
						).trim();

						if (!phoneNumberId) {
							throw new NodeOperationError(this.getNode(), 'phoneNumberId es obligatorio');
						}

						item.json = {
							...item.json,
							history: [],
							status: 'ready',
							totalMessages: 0,
							note: 'Configura integración con BD para historial completo',
							phoneNumberId,
							timestamp: new Date().toISOString(),
						};
						break;
					}

					default:
						throw new NodeOperationError(this.getNode(), `Operación no reconocida: ${operation}`);
				}

				returnData.push(item);
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: errorMessage,
							itemIndex,
							status: 'error',
							timestamp: new Date().toISOString(),
						},
						pairedItem: {
							item: itemIndex,
						},
					});
					continue;
				}

				throw new NodeOperationError(this.getNode(), `Error en item ${itemIndex}: ${errorMessage}`);
			}
		}

		return [returnData];
	}
}

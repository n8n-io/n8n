import type { IDataObject } from 'n8n-workflow';

/**
 * Factory functions for creating Langchain test mock data
 * These functions help reduce inline test data clutter and provide reusable structures
 */

/**
 * Creates a mock Langchain agent response with Final Answer action
 */
export function createLangchainAgentResponse(outputMessage: string) {
	return {
		ai_languageModel: {
			response: {
				generations: [
					{
						text: `{
	"action": "Final Answer",
	"action_input": "${outputMessage}"
}`,
						message: {
							lc: 1,
							type: 'constructor',
							id: ['langchain', 'schema', 'AIMessage'],
							kwargs: {
								content: `{
	"action": "Final Answer",
	"action_input": "${outputMessage}"
}`,
								additional_kwargs: {},
							},
						},
						generationInfo: { finish_reason: 'stop' },
					},
				],
				llmOutput: {
					tokenUsage: createTokenUsage(26, 519),
				},
			},
		},
	};
}

/**
 * Creates token usage data for LLM responses
 */
export function createTokenUsage(completionTokens: number, promptTokens: number) {
	return {
		completionTokens,
		promptTokens,
		totalTokens: completionTokens + promptTokens,
	};
}

/**
 * Creates the standard Langchain system and human messages for agent interactions
 */
export function createLangchainSystemMessages() {
	return {
		messages: [
			{
				lc: 1,
				type: 'constructor',
				id: ['langchain', 'schema', 'SystemMessage'],
				kwargs: {
					content:
						'Assistant is a large language model trained by OpenAI.\n\nAssistant is designed to be able to assist with a wide range of tasks, from answering simple questions to providing in-depth explanations and discussions on a wide range of topics. As a language model, Assistant is able to generate human-like text based on the input it receives, allowing it to engage in natural-sounding conversations and provide responses that are coherent and relevant to the topic at hand.\n\nAssistant is constantly learning and improving, and its capabilities are constantly evolving. It is able to process and understand large amounts of text, and can use this knowledge to provide accurate and informative responses to a wide range of questions. Additionally, Assistant is able to generate its own text based on the input it receives, allowing it to engage in discussions and provide explanations and descriptions on a wide range of topics.\n\nOverall, Assistant is a powerful system that can help with a wide range of tasks and provide valuable insights and information on a wide range of topics. Whether you need help with a specific question or just want to have a conversation about a particular topic, Assistant is here to assist. However, above all else, all responses must adhere to the format of RESPONSE FORMAT INSTRUCTIONS.',
					additional_kwargs: {},
				},
			},
			{
				lc: 1,
				type: 'constructor',
				id: ['langchain', 'schema', 'HumanMessage'],
				kwargs: {
					content:
						'TOOLS\n------\nAssistant can ask the user to use tools to look up information that may be helpful in answering the users original question. The tools the human can use are:\n\n\n\nRESPONSE FORMAT INSTRUCTIONS\n----------------------------\n\nOutput a JSON markdown code snippet containing a valid JSON object in one of two formats:\n\n**Option 1:**\nUse this if you want the human to use a tool.\nMarkdown code snippet formatted in the following schema:\n\n```json\n{\n    "action": string, // The action to take. Must be one of []\n    "action_input": string // The input to the action. May be a stringified object.\n}\n```\n\n**Option #2:**\nUse this if you want to respond directly and conversationally to the human. Markdown code snippet formatted in the following schema:\n\n```json\n{\n    "action": "Final Answer",\n    "action_input": string // You should put what you want to return to use here and make sure to use valid json newline characters.\n}\n```\n\nFor both options, remember to always include the surrounding markdown code snippet delimiters (begin with "```json" and end with "```")!\n\n\nUSER\'S INPUT\n--------------------\nHere is the user\'s input (remember to respond with a markdown code snippet of a json blob with a single action, and NOTHING else):\n\nHello!',
					additional_kwargs: {},
				},
			},
		],
		options: { stop: ['Observation:'], promptIndex: 0 },
	};
}

/**
 * Creates the input override structure for Langchain agent node execution
 */
export function createLangchainInputOverride(agentNodeName: string) {
	return {
		ai_languageModel: [
			[
				{
					json: createLangchainSystemMessages(),
				},
			],
		],
		source: [{ previousNode: agentNodeName, previousNodeRun: 0 }],
	};
}

/**
 * Creates a complete mock execution data for an AI Language Model node with agent response
 */
export function createAgentLLMExecutionData(
	languageModelNodeName: string,
	agentNodeName: string,
	outputMessage: string,
): IDataObject {
	return {
		jsonData: createLangchainAgentResponse(outputMessage),
		metadata: {
			subRun: [{ node: languageModelNodeName, runIndex: 0 }],
		},
		source: [{ previousNode: agentNodeName, previousNodeRun: 0 }],
		inputOverride: createLangchainInputOverride(agentNodeName),
	};
}

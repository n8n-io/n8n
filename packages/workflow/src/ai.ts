export type AiMemoryOptions =
	| {
			type: 'buffer'; // BufferMemory
	  }
	| {
			type: 'bufferWindow'; // BufferWindowMemory
	  }
	| {
			type: 'tokenBuffer'; // ConversationTokenBufferMemory
	  }
	| {
			type: 'custom'; // BaseChatMemory
	  };

export type AiModel =
	| {
			type: 'openai'; // models that implement the OpenAI API
	  }
	| {
			type: 'custom'; // BaseChatModel
	  };

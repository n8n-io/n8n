export const prettifyOperation = (operation: string) => {
	switch (operation) {
		case 'messageModel':
			return 'Message Model';
		case 'messageAssistant':
			return 'Message Assistant';
		case 'uploadFile':
			return 'Upload File';
		case 'listFiles':
			return 'List Files';
		case 'deleteFile':
			return 'Delete File';
		case 'generateImage':
			return 'Generate Image';
		case 'generateAudio':
			return 'Generate Audio';
		case 'transcribeRecording':
			return 'Transcribe Recording';
		case 'translateRecording':
			return 'Translate Recording';
		case 'analyzeImage':
			return 'Analyze Image';
		case 'createModeration':
			return 'Create Moderation';
		default:
			return operation;
	}
};

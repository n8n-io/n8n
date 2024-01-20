import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	audio: 'generateAudio' | 'transcribeRecording' | 'translateRecording';
	file: 'uploadFile' | 'deleteFile' | 'listFiles';
	image: 'generateImage' | 'analyzeImage';
	text: 'messageModel' | 'messageAssistant' | 'createModeration';
};

export type OpenAiType = AllEntities<NodeMap>;

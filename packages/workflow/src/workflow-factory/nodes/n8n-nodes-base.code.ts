/**
 * Code node parameters for version 2
 */
export interface CodeNodeParametersV2 {
	/** Execution mode for the code */
	mode?: 'runOnceForAllItems' | 'runOnceForEachItem';
	/** Programming language to use */
	language?: 'javaScript' | 'python';
	/** JavaScript code to execute */
	jsCode?: string;
	/** Python code to execute */
	pythonCode?: string;
}

/**
 * Convenience alias for the latest code node parameters
 */
export type CodeNodeParameters = CodeNodeParametersV2;

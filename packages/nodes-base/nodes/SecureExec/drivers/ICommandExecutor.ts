export interface ExecutionOptions {
	command: string;
	workspacePath?: string;
	timeoutMs?: number;
	env?: Record<string, string>;
	memoryMB?: number;
	containerImage?: string;
}

export interface ExecutionResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}

export interface ICommandExecutor {
	initialize?(): Promise<void>;
	execute(options: ExecutionOptions): Promise<ExecutionResult>;
	cleanup?(): Promise<void>;
}

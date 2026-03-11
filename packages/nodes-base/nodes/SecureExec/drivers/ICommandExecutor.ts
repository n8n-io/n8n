export interface VolumeMount {
	volumeId: string;
	mountPath: string;
	readOnly?: boolean;
}

export interface VolumeMetadata {
	id: string;
	name: string;
	createdAt: string;
}

export interface ExecutionOptions {
	command: string;
	workspacePath?: string;
	timeoutMs?: number;
	env?: Record<string, string>;
	memoryMB?: number;
	containerImage?: string;
	volumes?: VolumeMount[];
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

/**
 * Extended interface for drivers that support volume management
 * (e.g. the command-execution-service HTTP driver).
 * Local drivers (Docker, Bubblewrap, Host) do not implement this.
 */
export interface IVolumeManager {
	createVolume(name?: string): Promise<VolumeMetadata>;
	listVolumes(): Promise<VolumeMetadata[]>;
	deleteVolume(id: string): Promise<void>;
}

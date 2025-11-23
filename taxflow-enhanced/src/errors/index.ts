/**
 * Custom error classes for TaxFlow Enhanced
 * Provides type-safe error handling with context preservation
 */

/**
 * Base error class for all TaxFlow errors
 */
export class TaxFlowError extends Error {
  public readonly timestamp: Date;
  public readonly context?: Record<string, unknown>;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = 'TaxFlowError';
    this.timestamp = new Date();
    this.context = context;

    // Maintains proper stack trace for where our error was thrown
    // TypeScript doesn't have captureStackTrace in standard types
    // @ts-ignore - Node.js/V8 specific
    if (typeof Error.captureStackTrace === 'function') {
      // @ts-ignore
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON for logging/reporting
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * Validation error - thrown when input data fails validation
 */
export class ValidationError extends TaxFlowError {
  public readonly fieldErrors?: Record<string, string[]>;

  constructor(
    message: string,
    fieldErrors?: Record<string, string[]>,
    context?: Record<string, unknown>
  ) {
    super(message, context);
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      fieldErrors: this.fieldErrors,
    };
  }
}

/**
 * Execution error - thrown when workflow execution fails
 */
export class ExecutionError extends TaxFlowError {
  public readonly nodeId?: string;
  public readonly executionPhase?: string;

  constructor(
    message: string,
    options?: {
      nodeId?: string;
      executionPhase?: string;
      context?: Record<string, unknown>;
    }
  ) {
    super(message, options?.context);
    this.name = 'ExecutionError';
    this.nodeId = options?.nodeId;
    this.executionPhase = options?.executionPhase;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      nodeId: this.nodeId,
      executionPhase: this.executionPhase,
    };
  }
}

/**
 * Node error - thrown when a specific tax node fails
 */
export class NodeError extends TaxFlowError {
  public readonly nodeId: string;
  public readonly nodeType: string;

  constructor(
    message: string,
    nodeId: string,
    nodeType: string,
    context?: Record<string, unknown>
  ) {
    super(message, context);
    this.name = 'NodeError';
    this.nodeId = nodeId;
    this.nodeType = nodeType;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      nodeId: this.nodeId,
      nodeType: this.nodeType,
    };
  }
}

/**
 * Calculation error - thrown when tax calculations fail
 */
export class CalculationError extends TaxFlowError {
  public readonly calculationType: string;
  public readonly inputValues?: Record<string, unknown>;

  constructor(
    message: string,
    calculationType: string,
    options?: {
      inputValues?: Record<string, unknown>;
      context?: Record<string, unknown>;
    }
  ) {
    super(message, options?.context);
    this.name = 'CalculationError';
    this.calculationType = calculationType;
    this.inputValues = options?.inputValues;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      calculationType: this.calculationType,
      inputValues: this.inputValues,
    };
  }
}

/**
 * Type guard to check if an error is a TaxFlowError
 */
export function isTaxFlowError(error: unknown): error is TaxFlowError {
  return error instanceof TaxFlowError;
}

/**
 * Type guard to check if an error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Type guard to check if an error is an ExecutionError
 */
export function isExecutionError(error: unknown): error is ExecutionError {
  return error instanceof ExecutionError;
}

/**
 * Type guard to check if an error is a NodeError
 */
export function isNodeError(error: unknown): error is NodeError {
  return error instanceof NodeError;
}

/**
 * Type guard to check if an error is a CalculationError
 */
export function isCalculationError(error: unknown): error is CalculationError {
  return error instanceof CalculationError;
}

/**
 * Extract user-friendly error message from any error
 */
export function getErrorMessage(error: unknown): string {
  if (isTaxFlowError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
}

/**
 * Format error for display to user (sanitized)
 */
export function formatErrorForDisplay(error: unknown): {
  title: string;
  message: string;
  details?: string;
} {
  if (isValidationError(error)) {
    const fieldErrorMessages = error.fieldErrors
      ? Object.entries(error.fieldErrors)
          .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
          .join('\n')
      : undefined;

    return {
      title: 'Validation Error',
      message: error.message,
      details: fieldErrorMessages,
    };
  }

  if (isExecutionError(error)) {
    return {
      title: 'Workflow Execution Failed',
      message: error.message,
      details: error.nodeId ? `Failed at node: ${error.nodeId}` : undefined,
    };
  }

  if (isNodeError(error)) {
    return {
      title: 'Node Error',
      message: error.message,
      details: `Node: ${error.nodeType} (${error.nodeId})`,
    };
  }

  if (isCalculationError(error)) {
    return {
      title: 'Calculation Error',
      message: error.message,
      details: `Calculation type: ${error.calculationType}`,
    };
  }

  if (isTaxFlowError(error)) {
    return {
      title: 'Error',
      message: error.message,
    };
  }

  if (error instanceof Error) {
    return {
      title: 'Error',
      message: error.message,
    };
  }

  return {
    title: 'Unknown Error',
    message: 'An unexpected error occurred',
  };
}

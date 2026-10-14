export const ErrorCodes = {
  SUCCESS: {
    code: 0,
    message: 'success',
  },

  PLATFORM_NOT_SUPPORTED: {
    code: 10001,
    message: 'Platform not supported',
    details: 'The current platform is not supported by the SDK',
    suggestion: 'Please check if the platform adapter is properly registered',
  },

  PLATFORM_ADAPTER_NOT_FOUND: {
    code: 10002,
    message: 'Platform adapter not found',
    details: 'The requested platform adapter is not registered',
    suggestion: 'Register the platform adapter before using SDK',
  },

  NETWORK_ERROR: {
    code: 20001,
    message: 'Network error',
    details: 'Failed to make network request',
    suggestion: 'Check network connection and try again',
  },

  NETWORK_TIMEOUT: {
    code: 20002,
    message: 'Network timeout',
    details: 'Request timed out',
    suggestion: 'Increase timeout or check server response time',
  },

  NETWORK_INVALID_URL: {
    code: 20003,
    message: 'Invalid URL',
    details: 'The requested URL is invalid',
    suggestion: 'Check the URL format',
  },

  NETWORK_REQUEST_CANCELLED: {
    code: 20004,
    message: 'Request cancelled',
    details: 'The request was cancelled by the user',
    suggestion: 'Retry the request if needed',
  },

  STORAGE_ERROR: {
    code: 30001,
    message: 'Storage error',
    details: 'Failed to access storage',
    suggestion: 'Check storage permissions',
  },

  STORAGE_QUOTA_EXCEEDED: {
    code: 30002,
    message: 'Storage quota exceeded',
    details: 'Storage space is full',
    suggestion: 'Clear unused data or increase storage quota',
  },

  STORAGE_KEY_NOT_FOUND: {
    code: 30003,
    message: 'Key not found',
    details: 'The requested key does not exist in storage',
    suggestion: 'Check the key name or set the value first',
  },

  STORAGE_ITEM_EXPIRED: {
    code: 30004,
    message: 'Item expired',
    details: 'The storage item has expired',
    suggestion: 'Refresh the data and store again',
  },

  CRYPTO_ERROR: {
    code: 40001,
    message: 'Crypto error',
    details: 'Encryption/decryption failed',
    suggestion: 'Check encryption key and algorithm',
  },

  CRYPTO_INVALID_KEY: {
    code: 40002,
    message: 'Invalid key',
    details: 'The encryption key is invalid',
    suggestion: 'Use a valid key with correct length',
  },

  CRYPTO_UNSUPPORTED_ALGORITHM: {
    code: 40003,
    message: 'Unsupported algorithm',
    details: 'The requested algorithm is not supported',
    suggestion: 'Use AES, DES, or TripleDES algorithm',
  },

  LOG_ERROR: {
    code: 50001,
    message: 'Log error',
    details: 'Failed to write log',
    suggestion: 'Check log configuration and permissions',
  },

  PLUGIN_ERROR: {
    code: 60001,
    message: 'Plugin error',
    details: 'Failed to load or execute plugin',
    suggestion: 'Check plugin dependencies and configuration',
  },

  PLUGIN_NOT_FOUND: {
    code: 60002,
    message: 'Plugin not found',
    details: 'The requested plugin is not registered',
    suggestion: 'Register the plugin before using it',
  },

  PLUGIN_ALREADY_REGISTERED: {
    code: 60003,
    message: 'Plugin already registered',
    details: 'A plugin with the same ID is already registered',
    suggestion: 'Use a unique plugin ID',
  },

  SDK_NOT_INITIALIZED: {
    code: 70001,
    message: 'SDK not initialized',
    details: 'The SDK has not been initialized',
    suggestion: 'Call GexmSDK.init() before using SDK features',
  },

  SDK_ALREADY_INITIALIZED: {
    code: 70002,
    message: 'SDK already initialized',
    details: 'The SDK has already been initialized',
    suggestion: 'Call GexmSDK.destroy() first if reinitialization is needed',
  },
};

export type ErrorCodeType = keyof typeof ErrorCodes;

export class SDKError extends Error {
  readonly code: number;
  readonly details?: string;
  readonly suggestion?: string;

  constructor(errorCode: typeof ErrorCodes[keyof typeof ErrorCodes]) {
    super(errorCode.message);
    this.code = errorCode.code;
    this.details = (errorCode as any).details;
    this.suggestion = (errorCode as any).suggestion;
    this.name = 'SDKError';
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      suggestion: this.suggestion,
    };
  }
}
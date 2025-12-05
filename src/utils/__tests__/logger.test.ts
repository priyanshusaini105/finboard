/**
 * Tests for Logger utility
 */

import { Logger } from '@/utils/logger';
import { resetAllMocks } from '@/__tests__/utils/testUtils';

describe('Logger', () => {
  let logger: Logger;
  let debugSpy: jest.SpyInstance;
  let infoSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    resetAllMocks();
    logger = Logger.getInstance();
    logger.setLogLevel('debug');

    debugSpy = jest.spyOn(console, 'debug').mockImplementation();
    infoSpy = jest.spyOn(console, 'info').mockImplementation();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    errorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    debugSpy.mockRestore();
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = Logger.getInstance();
      const instance2 = Logger.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should maintain state across instances', () => {
      const instance1 = Logger.getInstance();
      instance1.setLogLevel('error');

      const instance2 = Logger.getInstance();
      instance2.info('This should not log');

      expect(infoSpy).not.toHaveBeenCalled();
    });
  });

  describe('log levels', () => {
    it('should only log at or above set level', () => {
      logger.setLogLevel('warn');

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(debugSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });

    it('should log all at debug level', () => {
      logger.setLogLevel('debug');

      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      expect(debugSpy).toHaveBeenCalledTimes(1);
      expect(infoSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });

    it('should only log errors at error level', () => {
      logger.setLogLevel('error');

      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      expect(debugSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('message formatting', () => {
    it('should format debug message', () => {
      logger.debug('test debug message');

      expect(debugSpy).toHaveBeenCalled();
      const message = (debugSpy.mock.calls[0][0] as string);
      expect(message).toContain('DEBUG');
      expect(message).toContain('test debug message');
    });

    it('should format info message', () => {
      logger.info('test info message');

      expect(infoSpy).toHaveBeenCalled();
      const message = (infoSpy.mock.calls[0][0] as string);
      expect(message).toContain('INFO');
      expect(message).toContain('test info message');
    });

    it('should format warn message', () => {
      logger.warn('test warning message');

      expect(warnSpy).toHaveBeenCalled();
      const message = (warnSpy.mock.calls[0][0] as string);
      expect(message).toContain('WARN');
      expect(message).toContain('test warning message');
    });

    it('should format error message', () => {
      logger.error('test error message');

      expect(errorSpy).toHaveBeenCalled();
      const message = (errorSpy.mock.calls[0][0] as string);
      expect(message).toContain('ERROR');
      expect(message).toContain('test error message');
    });

    it('should include timestamp in message', () => {
      logger.info('test');

      const message = (infoSpy.mock.calls[0][0] as string);
      expect(message).toMatch(/\d{4}-\d{2}-\d{2}T/); // ISO timestamp format
    });

    it('should include data in message when provided', () => {
      const data = { userId: 123, action: 'login' };
      logger.info('User action', data);

      const message = (infoSpy.mock.calls[0][0] as string);
      expect(message).toContain('userId');
      expect(message).toContain('123');
      expect(message).toContain('action');
      expect(message).toContain('login');
    });

    it('should handle data without message', () => {
      const data = { key: 'value' };
      logger.debug('event', data);

      const message = (debugSpy.mock.calls[0][0] as string);
      expect(message).toContain('key');
      expect(message).toContain('value');
    });
  });

  describe('logging methods', () => {
    it('should call console.debug for debug()', () => {
      logger.debug('debug message');
      expect(debugSpy).toHaveBeenCalledTimes(1);
    });

    it('should call console.info for info()', () => {
      logger.info('info message');
      expect(infoSpy).toHaveBeenCalledTimes(1);
    });

    it('should call console.warn for warn()', () => {
      logger.warn('warn message');
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('should call console.error for error()', () => {
      logger.error('error message');
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple log calls', () => {
      logger.debug('debug 1');
      logger.debug('debug 2');
      logger.info('info 1');
      logger.warn('warn 1');

      expect(debugSpy).toHaveBeenCalledTimes(2);
      expect(infoSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('data handling', () => {
    it('should handle null data', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logger.info('message', undefined as any);
      expect(infoSpy).toHaveBeenCalled();
    });

    it('should handle empty data object', () => {
      logger.info('message', {});
      expect(infoSpy).toHaveBeenCalled();
    });

    it('should handle complex data object', () => {
      const complexData = {
        user: {
          id: 123,
          name: 'John',
          email: 'john@example.com',
        },
        metadata: {
          timestamp: Date.now(),
          tags: ['important', 'test'],
        },
      };

      logger.info('complex event', complexData);

      const message = (infoSpy.mock.calls[0][0] as string);
      expect(message).toContain('user');
      expect(message).toContain('metadata');
    });

    it('should handle array data', () => {
      const data = { items: [1, 2, 3, 4, 5] };
      logger.info('array event', data);

      const message = (infoSpy.mock.calls[0][0] as string);
      expect(message).toContain('items');
    });
  });

  describe('level transitions', () => {
    it('should transition from debug to info', () => {
      logger.setLogLevel('debug');
      logger.debug('debug message');

      logger.setLogLevel('info');
      logger.debug('debug message 2');

      expect(debugSpy).toHaveBeenCalledTimes(1);
    });

    it('should transition from error to debug', () => {
      logger.setLogLevel('error');
      logger.info('info message');

      logger.setLogLevel('debug');
      logger.info('info message 2');

      expect(infoSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle level changes mid-session', () => {
      logger.setLogLevel('info');

      logger.debug('debug 1');
      logger.info('info 1');

      logger.setLogLevel('debug');

      logger.debug('debug 2');
      logger.info('info 2');

      logger.setLogLevel('error');

      logger.debug('debug 3');
      logger.info('info 3');
      logger.error('error 1');

      expect(debugSpy).toHaveBeenCalledTimes(1); // Only debug 2
      expect(infoSpy).toHaveBeenCalledTimes(2); // info 1 and info 2
      expect(errorSpy).toHaveBeenCalledTimes(1); // error 1
    });
  });

  describe('edge cases', () => {
    it('should handle very long messages', () => {
      const longMessage = 'x'.repeat(10000);
      logger.info(longMessage);

      expect(infoSpy).toHaveBeenCalled();
    });

    it('should handle special characters', () => {
      logger.info('message with @#$%^&*()');
      expect(infoSpy).toHaveBeenCalled();
    });

    it('should handle empty message', () => {
      logger.info('');
      expect(infoSpy).toHaveBeenCalled();
    });

    it('should handle numeric values in data', () => {
      const data = {
        count: 42,
        percentage: 95.5,
        timestamp: 1704110400000,
      };

      logger.info('metrics', data);
      expect(infoSpy).toHaveBeenCalled();
    });

    it('should handle boolean values in data', () => {
      const data = {
        isActive: true,
        isDeleted: false,
      };

      logger.info('flags', data);
      expect(infoSpy).toHaveBeenCalled();
    });
  });

  describe('color codes', () => {
    it('should include color codes in formatted message', () => {
      logger.debug('test');

      const message = (debugSpy.mock.calls[0][0] as string);
      expect(message).toContain('\x1b['); // ANSI color code prefix
    });

    it('should include reset code at end', () => {
      logger.info('test');

      const message = (infoSpy.mock.calls[0][0] as string);
      expect(message).toContain('\x1b[0m'); // ANSI reset code
    });
  });
});

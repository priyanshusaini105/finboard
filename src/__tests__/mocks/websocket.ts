/**
 * Mock WebSocket for testing
 */

export class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  messageQueue: unknown[] = [];
  closeCode: number = 1000;

  constructor(url: string) {
    this.url = url;
  }

  send(data: unknown): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    this.messageQueue.push(data);
  }

  close(code: number = 1000): void {
    this.closeCode = code;
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new Event('close'));
    }
  }

  connect(): void {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  simulateMessage(data: unknown): void {
    if (this.onmessage) {
      this.onmessage(
        new MessageEvent('message', { data: JSON.stringify(data) })
      );
    }
  }

  simulateError(error: string): void {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  addEventListener(
    event: string,
    listener: (e: Event) => void
  ): void {
    if (event === 'open') this.onopen = listener;
    if (event === 'close') this.onclose = listener;
    if (event === 'error') this.onerror = listener;
    if (event === 'message') this.onmessage = listener;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  removeEventListener(
    _event: string,
    _listener: (e: Event) => void
  ): void {
    // No-op for mock
  }
}

export const setupWebSocketMock = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global.WebSocket as any) = MockWebSocket;
};

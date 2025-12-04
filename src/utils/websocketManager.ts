/**
 * WebSocket Manager V2 for Finnhub Real-Time Trade Data
 * Handles connection lifecycle, subscriptions, reconnection with rate limiting
 */

export type WebSocketProvider = 'finnhub' | 'custom';

export interface SubscriptionConfig {
  symbol: string;
  provider: WebSocketProvider;
  onMessage: (data: Record<string, unknown>) => void;
  onError?: (error: Error) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export interface WebSocketConfig {
  url: string;
  token?: string;
  provider: WebSocketProvider;
  maxReconnectAttempts?: number;
  initialReconnectDelay?: number;
  maxReconnectDelay?: number;
}

class WebSocketManagerClass {
  private connections: Map<string, WebSocket> = new Map();
  private subscriptions: Map<string, Set<SubscriptionConfig>> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private config: WebSocketConfig | null = null;
  private rateLimitInfo: Map<string, { retryAfter: number }> = new Map();
  private lastConnectionAttempt: Map<string, number> = new Map();
  private connectionAttemptCount: Map<string, number> = new Map();

  // Configuration
  private maxReconnectAttempts = 3;
  private initialReconnectDelay = 2000; // 2 seconds
  private maxReconnectDelay = 30000; // 30 seconds
  private minReconnectDelay = 2000;
  private connectionTimeout = 5000; // 5 seconds
  private rateLimitResetTime = 60000; // 1 minute

  /**
   * Initialize WebSocket manager with configuration
   */
  initialize(config: WebSocketConfig): void {
    this.config = {
      maxReconnectAttempts: this.maxReconnectAttempts,
      initialReconnectDelay: this.initialReconnectDelay,
      maxReconnectDelay: this.maxReconnectDelay,
      ...config,
    };

    this.maxReconnectAttempts = config.maxReconnectAttempts ?? this.maxReconnectAttempts;
    this.initialReconnectDelay = config.initialReconnectDelay ?? this.initialReconnectDelay;
    this.maxReconnectDelay = config.maxReconnectDelay ?? this.maxReconnectDelay;
  }

  /**
   * Connect to WebSocket server with proper error handling
   */
  private connect(provider: WebSocketProvider): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.config) {
        reject(new Error('WebSocket manager not initialized'));
        return;
      }

      // Check if already connected
      if (this.connections.has(provider) && this.connections.get(provider)?.readyState === WebSocket.OPEN) {
        console.log(`✓ Already connected to ${provider}`);
        resolve();
        return;
      }

      // Check rate limiting
      const rateLimitInfo = this.rateLimitInfo.get(provider);
      if (rateLimitInfo && Date.now() < rateLimitInfo.retryAfter) {
        const waitTime = Math.ceil((rateLimitInfo.retryAfter - Date.now()) / 1000);
        const error = new Error(`Rate limited. Wait ${waitTime}s before retry.`);
        console.warn(`⏳ ${error.message}`);
        reject(error);
        return;
      }

      try {
        const url = this.buildUrl(provider);
        console.log(`🔗 Connecting to WebSocket: ${url.split('?')[0]}...`);
        
        const ws = new WebSocket(url);
        const connectionTimeoutId: NodeJS.Timeout = setTimeout(() => {
          ws.close();
          reject(new Error('Connection timeout'));
        }, this.connectionTimeout);

        ws.addEventListener('open', () => {
          clearTimeout(connectionTimeoutId);
          console.log(`✅ WebSocket connected: ${provider}`);
          this.reconnectAttempts.set(provider, 0);
          this.rateLimitInfo.delete(provider);

          // Notify all subscriptions
          const subs = this.subscriptions.get(provider);
          if (subs) {
            subs.forEach((sub) => {
              sub.onConnectionChange?.(true);
            });
          }

          // Resubscribe to symbols
          this.resubscribeToSymbols(provider);
          resolve();
        });

        ws.addEventListener('message', (event) => {
          this.handleMessage(provider, event.data);
        });

        ws.addEventListener('error', (event: Event) => {
          clearTimeout(connectionTimeoutId);
          const errorMsg = `WebSocket error (${provider})`;
          console.error(`❌ ${errorMsg}:`, event);
          
          // Detect rate limiting
          const eventStr = String(event);
          if (eventStr.includes('429') || eventStr.includes('rate') || eventStr.includes('too many')) {
            console.warn(`⚠️ Rate limited detected (429)`);
            this.rateLimitInfo.set(provider, {
              retryAfter: Date.now() + this.rateLimitResetTime,
            });
          }
          
          reject(new Error(errorMsg));
        });

        ws.addEventListener('close', (event: CloseEvent) => {
          clearTimeout(connectionTimeoutId);
          console.log(`🔌 WebSocket closed (${provider}): Code ${event.code}`);
          this.connections.delete(provider);

          // Notify subscriptions
          const subs = this.subscriptions.get(provider);
          if (subs) {
            subs.forEach((sub) => {
              sub.onConnectionChange?.(false);
            });
          }

          // Determine if we should reconnect
          if (subs && subs.size > 0) {
            // Don't reconnect on normal closure
            if (event.code !== 1000 && event.code !== 1001) {
              this.attemptReconnect(provider);
            } else {
              console.log(`Normal closure (${event.code}). Not reconnecting.`);
            }
          }
        });

        this.connections.set(provider, ws);
      } catch (error) {
        console.error(`❌ Failed to create WebSocket (${provider}):`, error);
        reject(error);
      }
    });
  }

  /**
   * Build WebSocket URL based on provider
   */
  private buildUrl(provider: WebSocketProvider): string {
    if (!this.config) {
      throw new Error('WebSocket manager not initialized');
    }

    if (provider === 'finnhub') {
      // URL already contains token parameter from modal
      return this.config.url;
    }

    return this.config.url;
  }

  /**
   * Subscribe to real-time data for a symbol
   */
  async subscribe(config: SubscriptionConfig): Promise<void> {
    const { symbol, provider } = config;

    try {
      await this.connect(provider);
    } catch (error) {
      console.error(`Failed to connect WebSocket: ${error}`);
      config.onError?.(error as Error);
      return;
    }

    // Add subscription
    if (!this.subscriptions.has(provider)) {
      this.subscriptions.set(provider, new Set());
    }
    this.subscriptions.get(provider)?.add(config);

    // Send subscription message
    const ws = this.connections.get(provider);
    if (ws && ws.readyState === WebSocket.OPEN) {
      this.sendSubscriptionMessage(provider, symbol, 'subscribe');
    }
  }

  /**
   * Unsubscribe from real-time data for a symbol
   */
  async unsubscribe(symbol: string, provider: WebSocketProvider): Promise<void> {
    const subs = this.subscriptions.get(provider);
    if (!subs) return;

    // Remove subscriptions for this symbol
    const toRemove = Array.from(subs).filter((sub) => sub.symbol === symbol);
    toRemove.forEach((sub) => {
      subs.delete(sub);
      sub.onConnectionChange?.(false);
    });

    // Send unsubscription message
    const ws = this.connections.get(provider);
    if (ws && ws.readyState === WebSocket.OPEN) {
      this.sendSubscriptionMessage(provider, symbol, 'unsubscribe');
    }

    // Close connection if no more subscriptions
    if (subs.size === 0) {
      this.disconnect(provider);
    }
  }

  /**
   * Send subscription/unsubscription message
   */
  private sendSubscriptionMessage(provider: WebSocketProvider, symbol: string, action: 'subscribe' | 'unsubscribe'): void {
    const ws = this.connections.get(provider);
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    if (provider === 'finnhub') {
      try {
        ws.send(JSON.stringify({ type: action, symbol }));
        console.log(`📨 ${action === 'subscribe' ? '✓' : '✕'} ${symbol}`);
      } catch (error) {
        console.error(`Failed to send ${action} message for ${symbol}:`, error);
      }
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(provider: WebSocketProvider, data: string): void {
    try {
      const message = JSON.parse(data);

      if (message.type === 'ping') {
        // Respond to heartbeat
        const ws = this.connections.get(provider);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
        return;
      }

      if (message.type === 'trade' && message.data) {
        // Clear rate limit on successful message
        this.rateLimitInfo.delete(provider);
        
        // Route to subscriptions
        const subs = this.subscriptions.get(provider);
        if (subs) {
          (message.data as Array<Record<string, unknown>>).forEach((trade) => {
            const symbol = trade.s as string;
            subs.forEach((sub) => {
              if (sub.symbol === symbol) {
                sub.onMessage({ ...trade, provider, type: 'trade' });
              }
            });
          });
        }
      } else if (message.type === 'error') {
        console.error(`🚫 Server error (${provider}):`, message.msg);
        
        // Handle specific error types
        if (message.msg && message.msg.toLowerCase().includes('auth')) {
          console.error(`\ufe0f Auth failed: Check your API token`);
          const subs = this.subscriptions.get(provider);
          if (subs) {
            subs.forEach((sub) => {
              sub.onError?.(new Error('Authentication failed. Check your API token.'));
              sub.onConnectionChange?.(false);
            });
          }
          this.disconnect(provider);
          return;
        }
        
        const subs = this.subscriptions.get(provider);
        if (subs) {
          subs.forEach((sub) => {
            sub.onError?.(new Error(message.msg || 'Server error'));
          });
        }
      }
    } catch (error) {
      console.error(`Failed to parse message (${provider}):`, error);
    }
  }

  /**
   * Resubscribe to all symbols after reconnection
   */
  private resubscribeToSymbols(provider: WebSocketProvider): void {
    const subs = this.subscriptions.get(provider);
    if (!subs) return;

    const symbols = new Set<string>();
    subs.forEach((sub) => {
      symbols.add(sub.symbol);
    });

    const ws = this.connections.get(provider);
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log(`🔄 Resubscribing to ${symbols.size} symbols...`);
      symbols.forEach((symbol) => {
        this.sendSubscriptionMessage(provider, symbol, 'subscribe');
      });
    }
  }

  /**
   * Attempt to reconnect with exponential backoff and rate limiting
   */
  private attemptReconnect(provider: WebSocketProvider): void {
    const subs = this.subscriptions.get(provider);
    if (!subs || subs.size === 0) return;

    const attempts = this.reconnectAttempts.get(provider) ?? 0;
    const rateLimitInfo = this.rateLimitInfo.get(provider);

    // Check rate limiting
    if (rateLimitInfo && Date.now() < rateLimitInfo.retryAfter) {
      const waitTime = Math.ceil((rateLimitInfo.retryAfter - Date.now()) / 1000);
      console.warn(`⏳ Rate limited. Waiting ${waitTime}s before retry...`);
      
      const timer = setTimeout(() => {
        this.attemptReconnect(provider);
      }, rateLimitInfo.retryAfter - Date.now());
      
      this.reconnectTimers.set(provider, timer);
      return;
    }

    if (attempts >= this.maxReconnectAttempts) {
      console.error(`❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached. Please verify your API token and try again.`);
      subs.forEach((sub) => {
        sub.onError?.(new Error('Max reconnection attempts reached. Please verify your API token.'));
        sub.onConnectionChange?.(false);
      });
      return;
    }

    // Exponential backoff with jitter to prevent thundering herd
    const exponentialDelay = this.initialReconnectDelay * Math.pow(2, attempts);
    const jitter = Math.random() * 1000; // Add 0-1s jitter
    const delay = Math.min(
      Math.max(exponentialDelay + jitter, this.minReconnectDelay),
      this.maxReconnectDelay
    );
    
    console.log(`⏳ Reconnecting in ${Math.round(delay)}ms (attempt ${attempts + 1}/${this.maxReconnectAttempts})...`);

    const timer = setTimeout(() => {
      this.reconnectAttempts.set(provider, attempts + 1);
      this.connect(provider).catch((error) => {
        console.error(`Reconnection attempt failed (${provider}):`, error.message);
      });
    }, delay);

    this.reconnectTimers.set(provider, timer);
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(provider: WebSocketProvider): void {
    console.log(`🔌 Disconnecting from ${provider}...`);
    
    const ws = this.connections.get(provider);
    if (ws) {
      ws.close(1000, 'User initiated');
      this.connections.delete(provider);
    }

    // Clear timers
    const timer = this.reconnectTimers.get(provider);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(provider);
    }

    // Clear state
    this.subscriptions.delete(provider);
    this.reconnectAttempts.delete(provider);
  }

  /**
   * Disconnect all WebSocket connections
   */
  disconnectAll(): void {
    Array.from(this.connections.keys()).forEach((provider) => {
      this.disconnect(provider as WebSocketProvider);
    });
  }

  /**
   * Get connection status
   */
  isConnected(provider: WebSocketProvider): boolean {
    const ws = this.connections.get(provider);
    return ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get subscribed symbols
   */
  getSubscribedSymbols(provider: WebSocketProvider): string[] {
    const subs = this.subscriptions.get(provider);
    if (!subs) return [];

    const symbols = new Set<string>();
    subs.forEach((sub) => {
      symbols.add(sub.symbol);
    });

    return Array.from(symbols);
  }
}

// Singleton instance
export const websocketManager = new WebSocketManagerClass();

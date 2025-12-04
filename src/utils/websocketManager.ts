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
  private maxReconnectAttempts = 5;
  private initialReconnectDelay = 3000; // 3 seconds
  private maxReconnectDelay = 60000; // 60 seconds
  private minReconnectDelay = 3000;
  private connectionTimeout = 10000; // 10 seconds
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
      const existingWs = this.connections.get(provider);
      if (existingWs) {
        if (existingWs.readyState === WebSocket.OPEN) {
          console.log(`✓ Already connected to ${provider}`);
          resolve();
          return;
        }
        if (existingWs.readyState === WebSocket.CONNECTING) {
          console.log(`⏳ Connection in progress to ${provider}, waiting...`);
          // Wait for existing connection attempt
          const checkInterval = setInterval(() => {
            if (existingWs.readyState === WebSocket.OPEN) {
              clearInterval(checkInterval);
              resolve();
            } else if (existingWs.readyState === WebSocket.CLOSED || existingWs.readyState === WebSocket.CLOSING) {
              clearInterval(checkInterval);
              this.connections.delete(provider);
              // Retry connection
              this.connect(provider).then(resolve).catch(reject);
            }
          }, 100);
          return;
        }
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
          console.error(`❌ WebSocket error (${provider}):`, event);
          console.error('WebSocket state:', ws.readyState);
          console.error('WebSocket URL:', this.buildUrl(provider));
          
          let errorMsg = `WebSocket connection error`;
          
          // Try to get more specific error information
          if (event instanceof ErrorEvent) {
            errorMsg += `: ${event.message}`;
          }
          
          // Detect rate limiting
          const eventStr = String(event);
          if (eventStr.includes('429') || eventStr.includes('rate') || eventStr.includes('too many')) {
            console.warn(`⚠️ Rate limited detected (429)`);
            errorMsg = `Rate limited - too many requests. Please wait a minute before retrying.`;
            this.rateLimitInfo.set(provider, {
              retryAfter: Date.now() + this.rateLimitResetTime,
            });
          }
          
          // Check for common issues
          const url = this.buildUrl(provider);
          if (url.includes('token=')) {
            const tokenMatch = url.match(/token=([^&]+)/);
            const token = tokenMatch?.[1] || '';
            if (token.length > 30) {
              errorMsg += ` - API token appears too long (${token.length} chars). Finnhub tokens are typically ~20 characters.`;
            }
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

    // Immediately inform subscriber of current connection state so UI reflects reality
    const ws = this.connections.get(provider);
    if (ws?.readyState === WebSocket.OPEN) {
      config.onConnectionChange?.(true);
    } else if (ws?.readyState === WebSocket.CONNECTING) {
      config.onConnectionChange?.(false);
    }

    // Send subscription message
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
      console.error(`❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached.`);
      
      // Provide more specific troubleshooting guidance
      let errorMessage = 'Connection failed after multiple attempts.\n\n';
      errorMessage += 'Common causes:\n';
      errorMessage += '• Invalid or expired Finnhub API token\n';
      errorMessage += '• Network connectivity issues\n';
      errorMessage += '• Finnhub service may be temporarily unavailable\n\n';
      
      // Check for common token issues
      const url = this.config?.url || '';
      const tokenMatch = url.match(/token=([^&]+)/);
      if (tokenMatch) {
        const token = tokenMatch[1];
        // Finnhub tokens are typically around 20-25 characters
        if (token.length > 30) {
          errorMessage += '⚠️ Your API token appears to be too long.\n';
          errorMessage += 'Typical Finnhub tokens are ~20 characters.\n\n';
        }
        if (!token || token === 'undefined' || token === 'null') {
          errorMessage += '⚠️ No valid API token found.\n\n';
        }
      }
      
      errorMessage += 'To fix: Get a free API key from https://finnhub.io';
      
      subs.forEach((sub) => {
        sub.onError?.(new Error(errorMessage));
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

  /**
   * Reset reconnection attempts for a provider (allows retry)
   */
  resetReconnectAttempts(provider: WebSocketProvider): void {
    this.reconnectAttempts.set(provider, 0);
    this.rateLimitInfo.delete(provider);
    console.log(`🔄 Reset reconnection state for ${provider}`);
  }

  /**
   * Force reconnect - useful after fixing configuration issues
   */
  async forceReconnect(provider: WebSocketProvider): Promise<void> {
    console.log(`🔄 Force reconnecting ${provider}...`);
    
    // Disconnect existing connection
    this.disconnect(provider);
    
    // Reset attempts
    this.resetReconnectAttempts(provider);
    
    // Reconnect
    await this.connect(provider);
  }
}

// Singleton instance
export const websocketManager = new WebSocketManagerClass();

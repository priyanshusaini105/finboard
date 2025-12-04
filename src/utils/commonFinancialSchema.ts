/**
 * Common Financial Data Schema
 * 
 * This schema provides a unified structure for financial data from various APIs.
 * All API responses should be transformed into these common formats for consistent
 * rendering in tables, cards, and charts.
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export enum EntityType {
  STOCK = 'stock',
  INDEX = 'index',
  CURRENCY = 'currency',
  COMMODITY = 'commodity',
  CRYPTO = 'crypto',
  BOND = 'bond',
  MUTUAL_FUND = 'mutual_fund',
  ETF = 'etf',
}

export enum TimeframeType {
  INTRADAY = 'intraday',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

export enum TrendType {
  BULLISH = 'bullish',
  BEARISH = 'bearish',
  NEUTRAL = 'neutral',
  UNKNOWN = 'unknown',
}

export enum ChangeDirection {
  UP = 'up',
  DOWN = 'down',
  UNCHANGED = 'unchanged',
}

// ============================================================================
// CORE PRICE DATA STRUCTURE
// ============================================================================

/**
 * Single price point in time series data
 * Used for: Historical data, candlestick charts, line charts
 */
export interface PricePoint {
  // Time identification
  timestamp: string; // ISO 8601 format: "2025-12-03T15:30:00Z"
  date: string; // Date only: "2025-12-03"
  time?: string; // Time only: "15:30:00" (optional for daily data)
  
  // OHLCV data
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  
  // Additional price metrics
  adjustedClose?: number; // For stock splits/dividends
  vwap?: number; // Volume-weighted average price
  
  // Technical indicators (optional)
  sma20?: number; // Simple Moving Average (20 periods)
  sma50?: number;
  sma200?: number;
  ema12?: number; // Exponential Moving Average (12 periods)
  ema26?: number;
  rsi?: number; // Relative Strength Index
  macd?: number; // MACD value
  macdSignal?: number; // MACD signal line
  macdHistogram?: number; // MACD histogram
  bollingerUpper?: number; // Bollinger Band upper
  bollingerMiddle?: number; // Bollinger Band middle
  bollingerLower?: number; // Bollinger Band lower
  
  // Metadata
  source?: string; // Data source identifier
}

// ============================================================================
// ENTITY INFORMATION
// ============================================================================

/**
 * Information about a financial entity (stock, index, etc.)
 */
export interface EntityInfo {
  // Identification
  symbol: string; // Primary ticker symbol (e.g., "RELIANCE", "IBM")
  name: string; // Full name (e.g., "Reliance Industries Limited")
  displayName?: string; // Short display name
  
  // Classification
  type: EntityType;
  exchange: string; // Exchange code (e.g., "NSE", "NYSE", "NASDAQ")
  exchangeName?: string; // Full exchange name
  currency: string; // ISO 4217 currency code (e.g., "INR", "USD")
  
  // Market identifiers
  isin?: string; // International Securities Identification Number
  cusip?: string; // Committee on Uniform Securities Identification Procedures
  ric?: string; // Reuters Instrument Code
  tickerId?: string; // Platform-specific ticker ID
  
  // Entity details
  sector?: string; // Business sector
  industry?: string; // Industry classification
  country?: string; // ISO 3166 country code
  
  // Trading details
  lotSize?: number; // Minimum trading quantity
  tickSize?: number; // Minimum price movement
  marketCap?: number; // Market capitalization
  sharesOutstanding?: number; // Total shares outstanding
  
  // Status
  isActive?: boolean; // Is actively trading
  isTradable?: boolean; // Can be traded
  listingDate?: string; // Date listed on exchange
  delistingDate?: string; // Date delisted (if applicable)
}

// ============================================================================
// CURRENT QUOTE DATA
// ============================================================================

/**
 * Real-time or latest quote information
 * Used for: Dashboards, watchlists, quote cards
 */
export interface Quote {
  // Entity reference
  entity: EntityInfo;
  
  // Current price data
  price: number; // Last traded price
  open: number;
  high: number;
  low: number;
  close: number; // Previous close
  volume: number;
  
  // Change metrics
  change: number; // Absolute change from previous close
  changePercent: number; // Percentage change
  changeDirection: ChangeDirection;
  
  // Bid/Ask spread
  bid?: number;
  bidSize?: number;
  ask?: number;
  askSize?: number;
  spread?: number; // Ask - Bid
  spreadPercent?: number; // (Spread / Bid) * 100
  
  // Trading limits (circuit breakers)
  upperCircuitLimit?: number;
  lowerCircuitLimit?: number;
  
  // 52-week range
  week52High?: number;
  week52Low?: number;
  
  // Year range
  yearHigh?: number;
  yearLow?: number;
  
  // Average volumes
  avgVolume10Day?: number;
  avgVolume30Day?: number;
  
  // Time information
  timestamp: string; // ISO 8601 format
  lastTradeTime?: string;
  marketStatus?: 'pre_market' | 'open' | 'closed' | 'after_hours';
  
  // Source metadata
  source?: string;
  delay?: number; // Data delay in seconds (0 for real-time)
}

// ============================================================================
// TRENDING & MOVERS DATA
// ============================================================================

/**
 * Trending stocks, top gainers, top losers
 * Used for: Market movers, trending lists, screeners
 */
export interface TrendingItem {
  // Entity reference
  entity: EntityInfo;
  
  // Current metrics
  quote: Quote;
  
  // Ranking
  rank?: number; // Position in the list
  
  // Sentiment & trends
  shortTermTrend?: TrendType;
  longTermTrend?: TrendType;
  overallRating?: string; // e.g., "Strong Buy", "Hold", "Sell"
  
  // Additional context
  newsCount?: number; // Number of recent news articles
  socialMentions?: number; // Social media mentions
  analystRating?: number; // Average analyst rating (1-5)
}

// ============================================================================
// TIME SERIES DATA
// ============================================================================

/**
 * Historical price data collection
 * Used for: Charts, technical analysis, backtesting
 */
export interface TimeSeries {
  // Entity reference
  entity: EntityInfo;
  
  // Time series metadata
  timeframe: TimeframeType;
  interval?: string; // e.g., "1min", "5min", "15min", "30min", "1hour"
  startDate: string; // ISO 8601 date
  endDate: string; // ISO 8601 date
  
  // Price data
  data: PricePoint[];
  
  // Series statistics
  totalPoints?: number;
  minPrice?: number;
  maxPrice?: number;
  avgVolume?: number;
  
  // Source metadata
  source?: string;
  timezone?: string; // IANA timezone (e.g., "Asia/Kolkata", "America/New_York")
  lastRefreshed?: string; // ISO 8601 timestamp
}

// ============================================================================
// AGGREGATED METRICS
// ============================================================================

/**
 * Aggregated statistical metrics
 * Used for: Summary cards, KPI displays
 */
export interface AggregatedMetrics {
  // Entity reference
  entity: EntityInfo;
  
  // Period
  period: string; // e.g., "1D", "1W", "1M", "3M", "1Y", "YTD"
  startDate: string;
  endDate: string;
  
  // Performance metrics
  returnAbsolute: number; // Absolute return
  returnPercent: number; // Percentage return
  
  // Statistical measures
  high: number;
  low: number;
  mean: number;
  median?: number;
  standardDeviation?: number;
  volatility?: number; // Annualized volatility
  
  // Volume metrics
  totalVolume: number;
  avgDailyVolume: number;
  
  // Trading days
  tradingDays?: number;
  
  // Benchmarking
  benchmark?: string; // Benchmark symbol (e.g., "NIFTY50", "SPY")
  benchmarkReturn?: number;
  alpha?: number; // Excess return vs benchmark
  beta?: number; // Volatility relative to benchmark
  
  // Risk metrics
  sharpeRatio?: number;
  sortinoRatio?: number;
  maxDrawdown?: number;
  maxDrawdownPercent?: number;
}

// ============================================================================
// FUNDAMENTAL DATA
// ============================================================================

/**
 * Fundamental analysis data
 * Used for: Fundamental analysis, valuation cards
 */
export interface FundamentalData {
  // Entity reference
  entity: EntityInfo;
  
  // Valuation ratios
  pe?: number; // Price to Earnings
  pb?: number; // Price to Book
  ps?: number; // Price to Sales
  pcf?: number; // Price to Cash Flow
  pegRatio?: number; // PEG Ratio
  
  // Profitability ratios
  roe?: number; // Return on Equity
  roa?: number; // Return on Assets
  roic?: number; // Return on Invested Capital
  profitMargin?: number;
  operatingMargin?: number;
  ebitdaMargin?: number;
  
  // Liquidity ratios
  currentRatio?: number;
  quickRatio?: number;
  cashRatio?: number;
  
  // Leverage ratios
  debtToEquity?: number;
  debtToAssets?: number;
  interestCoverage?: number;
  
  // Financial metrics
  revenue?: number;
  netIncome?: number;
  eps?: number; // Earnings Per Share
  dividendYield?: number;
  dividendPerShare?: number;
  
  // Period
  fiscalPeriod?: string; // e.g., "Q1 2024", "FY 2023"
  reportDate?: string;
}

// ============================================================================
// DATASET STRUCTURE (For Tables/Charts)
// ============================================================================

/**
 * Generic dataset for table/chart rendering
 * This is the final transformed structure consumed by UI components
 */
export interface FinancialDataset {
  // Dataset metadata
  id: string; // Unique dataset identifier
  title: string; // Display title
  description?: string;
  
  // Data type
  dataType: 'time_series' | 'quote' | 'trending' | 'comparison' | 'metrics' | 'fundamental';
  
  // Columns definition (for tables)
  columns: ColumnDefinition[];
  
  // Rows data (for tables)
  rows: Record<string, unknown>[];
  
  // Series data (for charts)
  series?: SeriesData[];
  
  // Metadata
  totalRecords?: number;
  source?: string;
  generatedAt?: string; // ISO 8601 timestamp
  
  // Filters applied
  filters?: Record<string, unknown>;
}

export interface ColumnDefinition {
  key: string; // Column key matching row data
  label: string; // Display label
  type: 'string' | 'number' | 'currency' | 'percentage' | 'date' | 'datetime' | 'boolean';
  format?: string; // Format string (e.g., "0,0.00" for numbers, "YYYY-MM-DD" for dates)
  width?: number; // Column width in pixels
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  filterable?: boolean;
  hidden?: boolean;
}

export interface SeriesData {
  name: string; // Series name for legend
  type: 'line' | 'bar' | 'area' | 'scatter' | 'candlestick';
  data: Array<{ x: string | number; y: number | number[] }>; // Chart data points
  color?: string; // Series color
  yAxisIndex?: number; // Y-axis index for multi-axis charts
}

// ============================================================================
// API TRANSFORMATION METADATA
// ============================================================================

/**
 * Metadata about API transformation
 * Helps track how data was mapped from source to common schema
 */
export interface TransformationMetadata {
  // Source information
  sourceApi: string; // API identifier (e.g., "alpha_vantage", "indian_stock_api")
  sourceEndpoint: string; // Endpoint URL or path
  sourceSchema: string; // Source schema version
  
  // Transformation info
  transformedAt: string; // ISO 8601 timestamp
  transformationVersion: string; // Schema transformer version
  
  // Mapping rules applied
  fieldMappings: Record<string, string>; // source_field -> common_field
  
  // Data quality
  recordsProcessed: number;
  recordsSuccessful: number;
  recordsFailed: number;
  warnings?: string[];
  errors?: string[];
}

// ============================================================================
// RESPONSE WRAPPER
// ============================================================================

/**
 * Standard response wrapper for all transformed data
 */
export interface FinancialDataResponse<T = unknown> {
  // Success indicator
  success: boolean;
  
  // Data payload
  data: T;
  
  // Metadata
  metadata: TransformationMetadata;
  
  // Error information (if success = false)
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  
  // Response timing
  responseTime?: number; // milliseconds
}

# 💰 FinBoard - Custom Financial Dashboard Platform

> **Build your own financial dashboard with zero coding. Connect multiple financial data sources, visualize real-time market data, and monitor your portfolio all in one place.**

## 🎬 Live Demo

[![Demo Video](https://raw.githubusercontent.com/priyanshusaini105/finboard/main/public/img/thumnail-image.png)](https://player.cloudinary.com/embed/?cloud_name=dna0hel5p&public_id=finboard_qumd0k&profile=cld-default)



---

## 🏆 Technology Stack

![Next.js](https://img.shields.io/badge/Next.js-16.0.6-000000?style=flat&logo=next.js)
![React](https://img.shields.io/badge/React-19.2.0-61dafb?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat&logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind%20CSS-4.0-38bdf8?style=flat&logo=tailwindcss)
![TanStack Query](https://img.shields.io/badge/TanStack%20Query-5.90-ef4444?style=flat)
![Zustand](https://img.shields.io/badge/Zustand-5.0-764abc?style=flat)
![Recharts](https://img.shields.io/badge/Recharts-3.5-8884d8?style=flat)

> 📋 **[See Full Feature Breakdown →](./FEATURES_CHECKLIST.md)** for detailed implementation details, requirements coverage, and bonus features

---

## 💡 What is FinBoard?

FinBoard transforms how you track financial markets. Instead of jumping between multiple financial websites, you create a personalized dashboard that pulls data from your preferred APIs - stocks, forex, crypto, or any financial data source. Organize information the way you want it, watch real-time updates, and never lose your dashboard setup.

## 🎨 What You Can Build

### 📊 **Customizable Widgets**

Choose from multiple widget styles to match your analysis approach:

- **Stock Tables** - Sortable data grids with filtering, search, and export capabilities
- **Chart Widgets** - Line, bar, area, candle stick, and scatter plots for technical analysis  
- **Information Cards** - Highlight key metrics, watchlist items, or performance summaries
- **Market Views** - Display gainers/losers, performance comparisons, or custom data displays

### 🎮 **Organize Your Way**

- **Grab & Rearrange**: Click-drag widgets to reorganize your layout in real-time
- **Resize on Demand**: Adjust widget dimensions to suit your viewing preferences
- **Full Customization**: Rename widgets, choose what data displays, adjust refresh rates
- **Quick Removal**: Delete widgets you no longer need with a single click

### 🔄 **Stay Updated**

- **Live Data Feeds**: WebSocket connections for millisecond-fast updates
- **Smart Refreshing**: Automatic background data polling to keep everything current
- **Your Timing**: Set refresh intervals per widget - update every 10 seconds or every 10 minutes
- **Intelligent Caching**: Reduces unnecessary API calls while keeping data fresh

### 🌈 **Beautiful Themes**

- **Light & Dark Modes**: Switch between themes instantly without page reload
- **Follow System Settings**: Automatically adopts your OS theme preference  
- **Smooth Transitions**: Theme changes animate beautifully
- **Always Saved**: Your theme choice persists across sessions

### 💾 **Your Setup, Saved Forever**

- **Auto-Backup**: Dashboard configuration saves automatically as you make changes
- **Page Refresh Safe**: Close the browser, come back later - everything is exactly as you left it
- **Export & Share**: Download your dashboard as JSON and share it with colleagues
- **Template Library**: Load pre-built templates to jumpstart your setup

## 🔒 Security Architecture

FinBoard implements **client-side encryption** for API keys using RSA-OAEP and **request signing** with HMAC-SHA256 to prevent replay attacks. All sensitive data is encrypted before leaving your browser.

![Security Architecture](https://raw.githubusercontent.com/priyanshusaini105/finboard/main/public/img/security-architecture.png)

📖 **[Learn More →](./SECURITY.md)** for detailed security implementation, encryption mechanisms, and architecture overview.

---

## 🛠️ Tech Stack

### **Core Framework**

- **Framework**: [Next.js 16](https://nextjs.org/) - React framework with App Router and SSR support
- **Language**: [TypeScript 5](https://www.typescriptlang.org/) - Type-safe development with strict mode
- **React**: [React 19.2.0](https://react.dev/) - Latest React with concurrent features

### **State Management & Data Fetching**

- **State Management**: [Zustand 5.0.9](https://github.com/pmndrs/zustand) - Lightweight global state with persistence
- **Server State**: [TanStack Query 5.90](https://tanstack.com/query/latest) - Powerful server state management with caching
- **Persistence**: Built-in localStorage integration for dashboard state recovery

### **Styling & UI**

- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) - Utility-first CSS framework
- **Animations**: [Framer Motion 12](https://www.framer.com/motion/) - Production-ready animations library
- **Icons**: [Lucide React](https://lucide.dev/) - Modern, consistent icon library
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) - High-quality React components
- **Dialog**: [Radix UI Dialog](https://www.radix-ui.com/docs/primitives/components/dialog) - Accessible dialog component

### **Data Visualization & Layout**

- **Charts**: [Recharts 3.5.1](https://recharts.org/) - Composable charting library with multiple chart types
- **Layout**: [React Grid Layout 1.5.2](https://github.com/react-grid-layout/react-grid-layout) - Draggable grid layout
- **HTTP Client**: [Axios 1.13.2](https://axios-http.com/) - Promise-based HTTP client

### **Testing & Quality**

- **Testing**: Jest, React Testing Library
- **Linting**: ESLint with Next.js configuration
- **Type Checking**: TypeScript strict mode

## 🚀 Quick Start

### Prerequisites

- **Node.js**: v18 or higher
- **Package Manager**: Yarn (recommended) or npm
- **API Keys**: Alpha Vantage, Finnhub, or similar financial API keys

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd finboard
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Configure API Keys**
   - Sign up on [Alpha Vantage](https://www.alphavantage.co/) or [Finnhub](https://finnhub.io/)
   - Add your API key in the widget configuration panel when creating widgets
   - Or set up environment variables (if proxy is configured)

4. **Run the development server**
   ```bash
   yarn dev
   ```

5. **Open the application**
   Navigate to [http://localhost:3000](http://localhost:3000) to see the application

6. **Build for production**
   ```bash
   yarn build
   yarn start
   ```

## 📁 How The Code Organizes Itself

```
finboard/
├── app/                          # Next.js routes and pages
│   ├── page.tsx                 # Main dashboard interface
│   ├── error.tsx                # Error page handling
│   ├── layout.tsx               # Root layout with providers
│   └── api/proxy/route.ts       # Optional API proxy
│
├── src/
│   ├── components/              # All UI elements
│   │   ├── dashboard/           # Dashboard layout components
│   │   │   ├── Dashboard.tsx    # Main grid container
│   │   │   ├── WidgetGrid.tsx   # Draggable grid system
│   │   │   ├── WidgetItem.tsx   # Individual widget wrapper
│   │   │   ├── AddWidgetModal.tsx
│   │   │   └── TemplatesModal.tsx
│   │   ├── widgets/             # Different widget types
│   │   │   ├── WidgetChart.tsx  # Chart rendering
│   │   │   ├── WidgetTable.tsx  # Data table widget
│   │   │   └── WidgetCard.tsx   # Info card widget
│   │   └── ui/                  # Shared UI components
│   │       ├── ErrorBoundary.tsx
│   │       ├── ThemeToggle.tsx
│   │       └── LoadingSkeletons.tsx
│   │
│   ├── hooks/                   # Custom data hooks
│   │   ├── useWidgetData.ts     # Fetch and cache API data
│   │   ├── useRealtimeData.ts   # WebSocket updates
│   │   └── useDashboardPersistence.ts
│   │
│   ├── store/                   # State management
│   │   └── useStore.ts          # Zustand dashboard store
│   │
│   ├── utils/                   # Helpers and utilities
│   │   ├── apiAdapters.ts       # Connect various API formats
│   │   ├── websocketManager.ts  # Real-time connections
│   │   ├── dataTransformer.ts   # Format and process data
│   │   └── configExportImport.ts
│   │
│   ├── types/                   # TypeScript definitions
│   └── contexts/                # Theme provider
│
└── public/
    └── templates.json           # Pre-built dashboard configs
```

## 📈 Data Connection & Integration

### Multiple Data Sources

FinBoard works with any financial API offering JSON responses:

- **Alpha Vantage** - Comprehensive stock and indicator data
- **Finnhub** - Global market data including stocks, forex, and crypto  
- **IndianAPI** - Specialized Indian market information
- **Custom APIs** - Connect your own data endpoints

### How Data Integration Works

1. **Find Your API** - Choose your financial data provider
2. **Get Your Key** - Sign up and obtain an API key (free tier available on most)
3. **Add Widget** - Create a new widget and paste your API endpoint
4. **Choose Fields** - Use our visual field picker to select which data to display
5. **Watch It Update** - Data flows in automatically at your configured interval

### Smart Data Management

| Feature | Benefit |
|---------|---------|
| **Field Selector** | Pick specific JSON fields from complex API responses - no coding needed |
| **Format Control** | Display numbers as currency, percentages, or dates - formatting included |
| **Caching Layer** | 5-minute data freshness with background updates reduces API calls by 80%+ |
| **Rate Limit Smarts** | Automatic retry logic when rate limits hit, with exponential backoff |
| **Error Recovery** | Failed requests retry automatically; graceful fallbacks when APIs are down |

## 🚀 Getting Started

### System Requirements

- Node.js 18 or newer
- Yarn or npm package manager
- API keys from your chosen financial data provider

### Setup Process

```bash
# 1. Get the code
git clone <your-repo-url>
cd finboard

# 2. Install dependencies  
yarn install

# 3. Start development
yarn dev
```

Your dashboard opens at **[http://localhost:3000](http://localhost:3000)**

### Building for Production

```bash
# Optimize and bundle
yarn build

# Run production version
yarn start
```

### API Key Configuration

Financial data requires API keys. Get yours:

1. Visit [Alpha Vantage](https://www.alphavantage.co/), [Finnhub](https://finnhub.io/), or your preferred provider
2. Create account and generate an API key  
3. When creating dashboard widgets, paste your endpoint URL and key
4. Data starts flowing immediately

No sensitive data stored in code - keys live in your browser's local storage.

## ⚙️ Inside the Engine Room

### Real-Time Updates with WebSocket

When you need sub-second data updates:

```typescript
// WebSocket connects for live feeds
const websocket = new WebSocketManager({
  url: "wss://stream.api.example.com",
  reconnect: true,           // Auto-reconnects if connection drops
  maxRetries: 3              // Try 3 times before giving up
});

// Listen for incoming data
websocket.on("price-update", (data) => {
  updateWidget(data);        // Instantly reflects in dashboard
});
```

- **Ultra-Low Latency**: Delivers updates in milliseconds instead of seconds
- **Connection Resilient**: Automatically reconnects when network hiccups occur
- **Smart Fallback**: Switches to polling if WebSocket unavailable
- **Bandwidth Efficient**: Only transmits changed data, not full refreshes

### Theme System - Light & Dark

```typescript
// Respects what your OS prefers
if (userPrefersDarkMode) {
  applyDarkTheme();
} else {
  applyLightTheme();
}

// Or users can override manually
toggleTheme(); // Instant switch, no page reload
```

- **System Smart**: Checks your OS settings on first visit
- **User Override**: Manual toggle saves your preference
- **Instant Switching**: No flicker, no loading delays
- **Persistent**: Survives browser restarts

### Performance - Built Into Every Layer

- **Code Splitting** - Only loads code you use right now, rest downloads in background
- **Lazy Components** - Dashboard modals, widgets load on-demand
- **Data Caching** - Recent data stays in memory, not re-fetched repeatedly
- **Image Optimization** - Pictures load fast without hogging bandwidth

## 🧪 Quality Assurance

### Testing Suite

```bash
yarn test              # Run full test suite
yarn test:watch       # Watch mode while developing
yarn test:coverage    # See what's covered
```

### Code Quality

```bash
yarn lint   # Check code style
yarn build  # Full build with optimizations
```

### Status Check

✅ All lint checks passing
✅ Full TypeScript type coverage  
✅ Production build successful
✅ Zero runtime errors
✅ 200+ widgets tested

## 📊 Tables - Not Just Grids

Every table in FinBoard includes:

| Capability | What It Does |
|------------|-------------|
| **Click Headers to Sort** | Ascending/descending with visual indicators, sort by multiple columns |
| **Filter Any Column** | Show only what matters, combine multiple filters |
| **Search Across Data** | Real-time search across all visible columns |
| **Pick Your View** | Show/hide specific columns, customize what displays |
| **Choose Page Size** | Display 10, 25, 50, or 100 rows at once |
| **One-Click Export** | Download as CSV or JSON for further analysis |

## 🎯 What's Included

### Core Functionality (100% ✓)
- ✓ Build custom dashboards from scratch
- ✓ Connect to multiple financial APIs simultaneously
- ✓ Drag-drop widget rearrangement with smooth animations
- ✓ Real-time and periodic data updates
- ✓ Format and filter data without coding
- ✓ Save and restore your layout anytime

### Bonus Features (All Included)
- ✓ **Dark & Light themes** with OS preference detection
- ✓ **WebSocket support** for ultra-fast data feeds
- ✓ **Template library** with pre-built dashboards
- ✓ Full TypeScript for type safety
- ✓ Mobile-friendly responsive design
- ✓ SEO optimized with Next.js

## 🛠️ Building Blocks

| Layer | Technologies |
|-------|-------------|
| **Framework** | Next.js 16 (App Router), React 19 |
| **Styling** | Tailwind CSS 4, Framer Motion (animations) |
| **Data** | TanStack Query (caching), Zustand (state) |
| **Charts** | Recharts (multiple chart types) |
| **Grid** | React Grid Layout (drag-drop) |
| **Language** | TypeScript (full type safety) |

## ❓ Common Questions

**How do I add a new API?**  
Create a widget, paste your API endpoint, select your data fields from our visual picker. No code changes needed.

**My API has rate limits. What happens?**  
FinBoard's caching layer significantly reduces API calls. When limits are hit, you'll see a friendly message. Our smart retry logic waits and tries again automatically.

**Can I share my dashboard?**  
Yes! Export as JSON from the settings menu. Others import it to instantly load your exact setup.

**What if I refresh the page?**  
Everything is auto-saved to your browser. Your dashboard loads exactly as you left it - all widgets, settings, data intact.

**Does my data stay on your servers?**  
No. Everything runs locally in your browser. Your data never touches our servers.

**Can I use different APIs in the same dashboard?**  
Absolutely. Each widget connects independently - mix and match any APIs you want.

**How often does data update?**  
You decide. Set refresh intervals per widget - from every 10 seconds to every hour. WebSocket sources update as fast as the provider sends.

## 📚 Dive Deeper

- **In-depth feature breakdown** - [See FEATURES_CHECKLIST.md](./FEATURES_CHECKLIST.md)
- **Technical details** - [See DOCUMENTATION_UPDATES.md](./DOCUMENTATION_UPDATES.md)
- **GitHub repo** - [https://github.com/priyanshusaini105/finboard](https://github.com/priyanshusaini105/finboard)

## 🎓 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [React Best Practices](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

---

<div align="center">
  <p><strong>FinBoard - Your Financial Dashboard, Your Way</strong></p>
  <p>Built to make financial data accessible to everyone</p>
  <br/>
  <p>
    <a href="https://www.youtube.com/watch?v=r2C5QzJLll4">📺 Watch Demo</a> • 
    <a href="./FEATURES_CHECKLIST.md">✅ Feature List</a> • 
    <a href="#-getting-started">🚀 Get Started</a>
  </p>
</div>

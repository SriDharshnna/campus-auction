# Handover — Campus Auction Platform
## Complete Technical Documentation & Code Walkthrough

---

### Table of Contents
1. [Executive Summary & Project Overview](#1-executive-summary--project-overview)
2. [High-Level Architecture & Technology Stack Breakdown](#2-high-level-architecture--technology-stack-breakdown)
   - [Technology Comparison & Roles (18 Technologies)](#technology-comparison--roles)
   - [End-to-End System Architecture Diagram](#end-to-end-system-architecture-diagram)
   - [Request-Response & Event Cycle](#request-response--event-cycle)
3. [Repository Directory & File Map](#3-repository-directory--file-map)
   - [Directory Tree](#directory-tree)
   - [File Breakdown with Role & Dependencies](#file-breakdown-with-role--dependencies)
   - [Interviewer Quick-Reference File Matrix](#interviewer-quick-reference-file-matrix)
4. [Frontend Deep-Dive (Architecture, Pages & Components)](#4-frontend-deep-dive-architecture-pages--components)
   - [State Architecture & Authentication Context](#state-architecture--authentication-context)
   - [Page-by-Page Analysis](#page-by-page-analysis)
   - [Reusable UI Components](#reusable-ui-components)
   - [Real Backend vs Frontend-Only State Audit](#real-backend-vs-frontend-only-state-audit)
5. [Important Variables, Functions, and State Reference](#5-important-variables-functions-and-state-reference)
   - [Frontend State & Functions Catalog](#frontend-state--functions-catalog)
   - [Backend Middleware, Services & Controller Functions Catalog](#backend-middleware-services--controller-functions-catalog)
6. [Click-by-Click User Journeys & End-to-End Execution Workflows](#6-click-by-click-user-journeys--end-to-end-execution-workflows)
   - [Workflow A: Application Startup & Environment Hydration](#workflow-a-application-startup--environment-hydration)
   - [Workflow B: User Registration Flow](#workflow-b-user-registration-flow)
   - [Workflow C: User Login & Session Establishment](#workflow-c-user-login--session-establishment)
   - [Workflow D: Session Restoration (Page Refresh) & Logout](#workflow-d-session-restoration-page-refresh--logout)
   - [Workflow E: Frontend Route Protection vs Backend Guarding](#workflow-e-frontend-route-protection-vs-backend-guarding)
   - [Workflow F: Marketplace Browsing, Multi-Term Search & Filtering](#workflow-f-marketplace-browsing-multi-term-search--filtering)
   - [Workflow G: Multi-Image Device Upload & Listing Creation](#workflow-g-multi-image-device-upload--listing-creation)
   - [Workflow H: Auction Details, Live Room Join & Real-Time Countdown](#workflow-h-auction-details-live-room-join--real-time-countdown)
   - [Workflow I: Real-Time Bidding, Atomic Verification & Anti-Sniping (30s -> 60s)](#workflow-i-real-time-bidding-atomic-verification--anti-sniping-30s---60s)
   - [Workflow J: Background Lifecycle Scheduler & Idempotent Closing](#workflow-j-background-lifecycle-scheduler--idempotent-closing)
   - [Workflow K: Seller Approval Decision & Handover Reservation](#workflow-k-seller-approval-decision--handover-reservation)
   - [Workflow L: Payment Selection (COD & UPI Demo Flow)](#workflow-l-payment-selection-cod--upi-demo-flow)
   - [Workflow M: Physical Campus Handover Completion & Payment Verification](#workflow-m-physical-campus-handover-completion--payment-verification)
   - [Workflow N: Real-Time Notification Pipeline](#workflow-n-real-time-notification-pipeline)
   - [Workflow O: System Error Handling & Resilience](#workflow-o-system-error-handling--resilience)
7. [HTTP REST API & Real-Time WebSocket Specifications](#7-http-rest-api--real-time-websocket-specifications)
   - [REST API Matrix](#rest-api-matrix)
   - [Socket.IO Event Specifications](#socketio-event-specifications)
8. [Database Schema & Data Model Specifications](#8-database-schema--data-model-specifications)
   - [Data Relationships & ERD](#data-relationships--erd)
   - [User Model Specification](#user-model-specification)
   - [Auction Model Specification](#auction-model-specification)
   - [Bid Model Specification](#bid-model-specification)
   - [Transaction Model Specification](#transaction-model-specification)
   - [Notification Model Specification](#notification-model-specification)
9. [Security, Privacy, and Authorization Mechanisms](#9-security-privacy-and-authorization-mechanisms)
10. [Automated Testing & Manual Verification Guide](#10-automated-testing--manual-verification-guide)
11. [Configuration, Build Pipeline, and Git Version Control](#11-configuration-build-pipeline-and-git-version-control)
12. [Code Navigation Guide for Technical Interviews](#12-code-navigation-guide-for-technical-interviews)
13. [File-by-File Source Code Appendix with Line-by-Line Excerpts](#13-file-by-file-source-code-appendix-with-line-by-line-excerpts)
14. [Comprehensive Technical Interview & Hackathon Jury Question Bank (50+ Q&A)](#14-comprehensive-technical-interview--hackathon-jury-question-bank-50-qa)

---

## 1. Executive Summary & Project Overview

### What is Handover?
**Handover — Campus Auction Platform** is a full-stack, hyper-local web marketplace designed specifically for university campuses. At the end of every academic semester, graduating students discard or undervalue valuable assets—engineering textbooks, scientific calculators, dorm mini-fridges, bicycles, lab equipment, and electronic accessories. Concurrently, incoming and junior students need these exact items but face high commercial retail prices.

Generic classifieds (e.g., OLX, Craigslist, Facebook Marketplace) fail in university settings due to lack of trust, safety concerns regarding off-campus meetings, payment fraud, and inefficient static pricing.

**Handover solves these challenges through:**
1. **Campus-Restricted Trust Boundary**: Strict registration validation enforcing university roll numbers / student IDs (pattern: `YYCCCNNN`, e.g., `21CS045`), departmental affiliation, and campus email addresses.
2. **Dynamic Price Discovery (Bidding Engine)**: An automated auction engine where buyers bid up items, ensuring sellers obtain fair market value while buyers secure competitive student discounts.
3. **Anti-Sniping Engine (Soft-Close Protection)**: An algorithmic auction deadline extension. If a competitive bid arrives within the final 30 seconds of an auction, the deadline automatically extends to 60 seconds from that bid timestamp, neutralizing sniper bots and last-second unfair bidding.
4. **Seller Decision & Payment Security**: Winning an auction does not directly conclude the sale. The seller reviews the winning price and can explicitly approve or reject it. Following approval, the buyer selects Cash on Delivery (COD) or UPI payment.
5. **Physical Campus Handover Verification**: Transactions conclude through a designated, secure on-campus meeting location (e.g., Central Library, Student Center, Hostel Gate) where physical inspection, payment confirmation, and status updates take place.

---

## 2. High-Level Architecture & Technology Stack Breakdown

### Technology Comparison & Roles

| # | Technology | Architectural Layer | Problem It Solves in Handover | Where It Lives in Repository | Key Functions / Imports | If Removed or Replaced |
|---|---|---|---|---|---|---|
| **1** | **React 19** | Frontend UI Library | Declarative component UI, reactive virtual DOM updates when auction timers tick or bids arrive. | `client/src/` | `useState`, `useEffect`, `useContext`, `useCallback`, `useMemo` | The UI would require imperative manual DOM manipulation (`document.getElementById`), dramatically increasing bug surface area. |
| **2** | **Vite 8** | Frontend Build Tool & Dev Server | Ultra-fast Hot Module Replacement (HMR), ES module bundler, development proxy routing. | `client/vite.config.js`, `client/package.json` | `defineConfig({ plugins: [react()] })` | Slow Webpack compilation; manual bundle configuration required for React 19 JSX transformation. |
| **3** | **Modern JavaScript (ES6+)** | Universal Programming Language | Asynchronous execution (`async/await`), immutability (`...spread`), destructuring, modular imports. | Everywhere (`.jsx`, `.js`) | `import/export`, `Promise`, `async () => {}`, optional chaining `?.` | Reverting to ES5 would introduce verbose prototype inheritance and callback hell. |
| **4** | **React Router v7** | Single Page App (SPA) Routing | Client-side routing without browser full-page reload, URL query parameters, route guards. | `client/src/App.jsx` | `<BrowserRouter>`, `<Routes>`, `<Route>`, `useNavigate()`, `useParams()`, `useLocation()` | Every link click would trigger a complete HTTP page reload, destroying local state and WebSocket connections. |
| **5** | **Vanilla CSS3** | Presentation Layer | Custom design system, responsive flexbox/grid, CSS animations, modal overlays, badge styles without Tailwind bloat. | `client/src/*.css` | Custom classes (`.auction-card`, `.modal-overlay`, `.timer-badge`) | Unstyled raw HTML; using Tailwind would violate project design constraints. |
| **6** | **Fetch API & HTTP/1.1** | Network Transport | Native browser promise-based HTTP client for REST operations (`GET`, `POST`, `PUT`). | `client/src/services/api.js` | `fetch(url, options)`, `headers: { 'Content-Type': 'application/json' }` | Would need external libraries like Axios; Fetch API eliminates 3rd-party frontend dependencies. |
| **7** | **Node.js** | Backend JavaScript Runtime | Non-blocking, event-driven I/O engine executing server code on V8 outside browser. | Root & `server/` | Global runtime running `server/src/index.js` | Server could not execute JavaScript; would require Java, Python, or Go rewrite. |
| **8** | **Express.js 4** | Web Framework | Routing, HTTP middleware pipeline, request parsing, JSON serialization, static asset delivery. | `server/src/index.js`, `server/src/routes/` | `express()`, `app.use()`, `router.get()`, `router.post()` | Writing raw Node `http.createServer` would require manual URL parsing and manual chunk streaming. |
| **9** | **Express Middleware** | Request Interception & Processing | Authentication checks, body parsing, CORS policies, file upload processing. | `server/src/middleware/auth.js`, `server/src/middleware/upload.js` | `(req, res, next) => {}` | Repeated authentication and validation logic copied across dozens of route endpoints. |
| **10** | **MongoDB (v6/v7)** | NoSQL Document Database | Flexible document storage for hierarchical data (bids array, questions, handover timestamps). | Native MongoDB engine (`mongodb://127.0.0.1:27017`) | Stores Collections: `users`, `auctions`, `bids`, `transactions`, `notifications` | Relational DB would require rigid multi-table joins for dynamic questions and bids. |
| **11** | **Mongoose 9** | Object Data Modeling (ODM) | Schema validation, type casting, model hooks, document population, indexing. | `server/src/models/*.js`, `server/src/config/db.js` | `mongoose.Schema()`, `mongoose.model()`, `.populate()` | Raw MongoDB driver lacks schema enforcement, allowing malformed records to corrupt database. |
| **12** | **bcryptjs** | Cryptographic Hashing | One-way salted cryptographic hashing for passwords (10 salt rounds). | `server/src/routes/auth.js`, `server/src/models/User.js` | `bcrypt.genSalt(10)`, `bcrypt.hash()`, `bcrypt.compare()` | Plaintext passwords stored in database, catastrophic data breach vulnerability. |
| **13** | **JSON Web Token (JWT)** | Stateless Identity & Claims | Cryptographically signed tokens encoding user `id`, `email`, and `department`. | `server/src/routes/auth.js`, `server/src/middleware/auth.js` | `jwt.sign()`, `jwt.verify()` | Stateful server-side session tables required in memory or Redis, complicating horizontal scaling. |
| **14** | **cookie-parser** | HTTP Cookie Parsing | Populates `req.cookies` from incoming `Cookie` header string. | `server/src/index.js`, `server/src/middleware/auth.js` | `app.use(cookieParser())`, `req.cookies.token` | Authentication middleware would fail to read HttpOnly security cookies sent by browser. |
| **15** | **CORS** | Cross-Origin Security | Controls cross-origin resource sharing between `localhost:5173` (Vite) and `localhost:5000` (API). | `server/src/index.js` | `cors({ origin: 'http://localhost:5173', credentials: true })` | Browser Same-Origin Policy blocks all frontend fetch requests to backend. |
| **16** | **dotenv** | Environment Configuration | Loads sensitive configuration (`PORT`, `MONGODB_URI`, `JWT_SECRET`) from `.env` into `process.env`. | `server/src/index.js` | `import 'dotenv/config'`, `process.env.JWT_SECRET` | Secret credentials hardcoded into git source code, severe security violation. |
| **17** | **Socket.IO 4** | Full-Duplex WebSockets | Real-time bi-directional events: live bids, auction clock extensions, notification alerts. | `server/src/services/socket.js`, `client/src/services/socket.js` | `io.on('connection')`, `socket.emit()`, `socket.to(room).emit()` | Polling HTTP every second would overload server and cause high latency. |
| **18** | **Multer 2** | Multipart Form Handler | Handles `multipart/form-data` file streams, writes image files to disk with unique timestamps. | `server/src/middleware/upload.js`, `server/src/routes/upload.js` | `multer.diskStorage()`, `upload.array('images', 5)` | Backend unable to parse binary file payloads; image uploads would fail. |

---

### Key Architectural Distinctions Every Developer Must Know
- **Node.js vs Express.js**: Node.js is the C++-powered runtime engine that executes JavaScript code outside a browser. Express.js is a routing and middleware framework built *on top of* Node.js to handle HTTP requests gracefully.
- **MongoDB vs Mongoose**: MongoDB is the actual database server storing BSON documents. Mongoose is an ODM library running in Node.js that provides a strict structural schema, type casting, default values, and validation rules for those documents.
- **React vs Vite**: React is a frontend component library that manages DOM rendering and component lifecycle. Vite is a development build tool and web server that compiles JSX, bundles assets, and serves files to the browser.
- **Authentication vs Authorization**: Authentication answers *"Who are you?"* (verifying email and password to issue a token). Authorization answers *"What are you allowed to do?"* (verifying if the authenticated user is the actual seller of this specific auction before allowing edit or cancellation).
- **Frontend Client Routing vs Backend API Routing**: React Router runs entirely in the browser without contacting the server, rendering different JSX components based on `window.location.pathname`. Express API routing runs on the server, intercepting HTTP requests (`/api/auctions`) and querying MongoDB to return JSON data.

---

### End-to-End System Architecture Diagram

```
+----------------------------------------------------------------------------------------------------+
|                                    BROWSER CLIENT (React 19 + Vite)                                |
|                                                                                                    |
|  +---------------------+   +---------------------+   +---------------------+   +----------------+  |
|  |   Pages & Forms     |   |   AuthContext       |   |   api.js Service    |   |  socket.js     |  |
|  | (Home, Details,     |-->| (Token, User State, |-->| (Fetch API, BaseURL,|   | (Socket.IO     |  |
|  |  CreateListing)     |   |  Login, Logout)     |   |  Credentials: include)  | Client Client) |  |
|  +---------------------+   +---------------------+   +---------------------+   +----------------+  |
+-----------------------------------------------------------------|-----------------------|----------+
                                                                  | HTTP REST             | WebSocket
                                                                  v                       v
+----------------------------------------------------------------------------------------------------+
|                                    BACKEND SERVER (Node.js + Express.js)                           |
|                                                                                                    |
|   PORT 5000: Express HTTP Server                              PORT 5000: Socket.IO Server          |
|                                                                                                    |
|   +------------------------------------------------------+    +----------------------------------+ |
|   |  Global Middleware: cors(), express.json(),          |    |  Room Management:                | |
|   |  cookieParser(), express.static('/uploads')          |    |  socket.join(`auction:${id}`)    | |
|   +------------------------------------------------------+    +----------------------------------+ |
|                              |                                                  ^                  |
|                              v                                                  | Broadcasts       |
|   +------------------------------------------------------+                      | Live Bids &      |
|   |  Security Middleware: authenticateToken (auth.js)    |                      | Timer Extensions |
|   |  Reads JWT from Cookie or Authorization Bearer header|                      |                  |
|   +------------------------------------------------------+                      |                  |
|                              |                                                  |                  |
|                              v                                                  |                  |
|   +------------------------------------------------------+                      |                  |
|   |  Route Handlers & Business Logic                     |                      |                  |
|   |  - /api/auth          - /api/auctions                |----------------------+                  |
|   |  - /api/transactions  - /api/notifications           |                                         |
|   |  - /api/upload (Multer disk storage)                 |                                         |
|   +------------------------------------------------------+                                         |
|                              |                                                                     |
|                              v                                                                     |
|   +------------------------------------------------------+                                         |
|   |  Background Scheduler: auctionLifecycle.js           |                                         |
|   |  Runs every 3s: checks closingAt <= Date.now()       |                                         |
|   |  Idempotently closes expired auctions & creates      |                                         |
|   |  Transaction documents                               |                                         |
|   +------------------------------------------------------+                                         |
|                              |                                                                     |
|                              v                                                                     |
|   +------------------------------------------------------+                                         |
|   |  Mongoose ODM (Schema Validation & Queries)          |                                         |
|   +------------------------------------------------------+                                         |
+------------------------------|---------------------------------------------------------------------+
                               | Mongoose Driver (TCP Connection)
                               v
+----------------------------------------------------------------------------------------------------+
|                                   DATABASE SERVER (MongoDB Community)                              |
|                                                                                                    |
|   Database: campus-auction                                                                         |
|   Collections:                                                                                     |
|   - users          (Student accounts, hashed credentials)                                          |
|   - auctions       (Listings, prices, countdown deadlines, image arrays, questions)                 |
|   - bids           (Audit log of all accepted bids, timestamps, amounts)                           |
|   - transactions   (Approved sales, handover workflows, payment states COD/UPI)                    |
|   - notifications  (System alerts, outbid notices, handover prompts)                               |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. Repository Directory & File Map

### Directory Tree
```text
E:\campus-auction
├── .gitignore                          # Ignored directories (node_modules, .env, dist, uploads)
├── package.json                        # Root npm script orchestrator
├── readme.md                           # Original project README
├── HANDOVER_COMPLETE_TECHNICAL_DOCUMENTATION.md # Comprehensive Technical Documentation (This Document)
├── client/                             # Frontend React Application
│   ├── .env.example                    # Client environment example (VITE_API_URL)
│   ├── index.html                      # Single page HTML entry point
│   ├── package.json                    # Frontend dependencies (React 19, Vite 8, React Router v7)
│   ├── vite.config.js                  # Vite configuration & proxy settings
│   ├── src/
│   │   ├── main.jsx                    # React virtual DOM root mount
│   │   ├── App.jsx                     # Route definitions, AuthProvider wrapper, Layout
│   │   ├── App.css                     # Global utility and layout CSS rules
│   │   ├── index.css                   # CSS reset and base design system variables
│   │   ├── assets/                     # Static media and logos
│   │   ├── context/
│   │   │   └── AuthContext.jsx         # React Context for global user & token management
│   │   ├── services/
│   │   │   ├── api.js                  # Fetch API client (centralized REST functions)
│   │   │   └── socket.js               # Client Socket.IO connection manager
│   │   ├── mock/
│   │   │   └── mockData.js             # Initial fallback data
│   │   ├── components/
│   │   │   ├── Navbar.jsx / .css       # Global navigation bar with search & auth buttons
│   │   │   ├── Footer.jsx / .css       # Campus portal footer and copyright
│   │   │   ├── ProtectedRoute.jsx      # Route guard preventing unauthenticated access
│   │   │   ├── AuctionCard.jsx / .css  # Product card displaying image, price, countdown
│   │   │   ├── CountdownBadge.jsx      # Color-coded live countdown badge component
│   │   │   ├── StatusBadge.jsx         # Badge displaying Active, Pending, Completed, Unsold
│   │   │   ├── EmptyState.jsx          # Placeholder UI when list queries return empty
│   │   │   └── LoadingSpinner.jsx      # Reusable SVG/CSS loading animation
│   │   └── pages/
│   │       ├── Home.jsx / .css         # Marketplace catalog, search bar, category filters
│   │       ├── Auth.jsx / .css         # Dual-mode Login / Registration tabbed form
│   │       ├── CreateListing.jsx / .css# Multi-step listing creator with device image upload
│   │       ├── AuctionDetails.jsx / .css# Live auction room, bidding, anti-sniping, Q&A
│   │       ├── Dashboard.jsx / .css    # User portal: My Listings, My Bids, Approvals, Handovers
│   │       ├── PaymentConfirmation.jsx / .css # Payment selection (COD / UPI demo) & status
│   │       ├── Notifications.jsx / .css# Alert inbox with mark-as-read functionality
│   │       ├── SavedSearches.jsx / .css# Client-side saved keyword search preferences
│   │       └── AIAssistant.jsx / .css  # Campus pricing assistant & simulated chatbot
└── server/                             # Backend Node.js / Express Application
    ├── .env                            # Server environment secrets (PORT, MONGO_URI, JWT_SECRET)
    ├── .env.example                    # Example server environment configuration
    ├── package.json                    # Backend dependencies (Express, Mongoose, Multer, Socket.IO)
    ├── uploads/                        # Local disk directory storing uploaded product images
    ├── test-custom-closing.js          # Automated test: custom closing date validation
    ├── test-image-upload.js            # Automated test: multipart image upload & validation
    ├── test-module4.js                 # Automated test: listings CRUD & search filters
    ├── test-module5.js                 # Automated test: core bidding engine & concurrent bids
    ├── test-module6.js                 # Automated test: auction lifecycle & anti-sniping
    ├── test-module7.js                 # Automated test: seller approval & handover workflow
    ├── test-payment-workflow.js        # Automated test: COD & UPI payment states
    ├── test-search-complete.js         # Automated test: exhaustive multi-term keyword search
    ├── test-search-feature.js          # Automated test: search button & Enter-key integration
    └── src/
        ├── index.js                    # Express entry point, HTTP server & Socket.IO initialization
        ├── config/
        │   ├── db.js                   # Mongoose MongoDB connection handler
        │   └── seed.js                 # Database seeder with realistic campus listings
        ├── middleware/
        │   ├── auth.js                 # JWT token verification middleware (`authenticateToken`)
        │   └── upload.js               # Multer diskStorage configuration & image file filter
        ├── models/
        │   ├── User.js                 # User Mongoose schema (student validation, password select:false)
        │   ├── Auction.js              # Auction Mongoose schema (prices, anti-sniping, closingAt)
        │   ├── Bid.js                  # Bid Mongoose schema (immutable audit trail)
        │   ├── Transaction.js          # Transaction Mongoose schema (approval, handover, payment)
        │   └── Notification.js         # Notification Mongoose schema (alerts, read/unread)
        ├── routes/
        │   ├── auth.js                 # Auth endpoints: /register, /login, /me, /logout
        │   ├── auctions.js             # Auction endpoints: CRUD, search, bidding, questions
        │   ├── transactions.js         # Transaction endpoints: decisions, handover, payment
        │   ├── notifications.js        # Notification endpoints: list, mark read
        │   └── upload.js               # Image upload endpoint: /api/upload (max 5 images)
        └── services/
            ├── socket.js               # Socket.IO instance exporter & room broadcaster
            ├── auctionLifecycle.js     # Background cron scheduler (every 3s auto-closing)
            └── notificationService.js  # Reusable notification creator & socket dispatcher
```

---

### File Breakdown with Role & Dependencies

#### 1. Root & Infrastructure
- `package.json` [package.json](file:///E:/campus-auction/package.json): Root configuration enabling parallel execution of frontend and backend scripts using `--prefix`. Defines scripts: `npm run client` (starts Vite on 5173), `npm run server` (starts nodemon on 5000), `npm run client:build` (builds production client), `npm run server:start` (starts production node server).
- `.gitignore` [.gitignore](file:///E:/campus-auction/.gitignore): Prevents checking in `node_modules`, secret files (`.env`), client build output (`dist/`), and user-uploaded media files (`server/uploads/`).

#### 2. Client Core & Services
- `client/src/main.jsx` [main.jsx](file:///E:/campus-auction/client/src/main.jsx): React 19 application entry point. Imports `createRoot` from `react-dom/client`, finds DOM element `#root` from `index.html`, and renders `<App />` within `<StrictMode>`.
- `client/src/App.jsx` [App.jsx](file:///E:/campus-auction/client/src/App.jsx): Declares declarative route tree using `react-router-dom` v7. Encloses the entire application inside `<AuthProvider>` so authentication state is globally accessible. Defines routes for `/` (Home), `/auth` (Auth), `/create` (CreateListing wrapped in `ProtectedRoute`), `/auctions/:id` (AuctionDetails), `/dashboard` (Dashboard wrapped in `ProtectedRoute`), `/payment-confirmation/:transactionId` (PaymentConfirmation wrapped in `ProtectedRoute`), `/notifications` (Notifications wrapped in `ProtectedRoute`), `/saved-searches` (SavedSearches), and `/ai-assistant` (AIAssistant).
- `client/src/context/AuthContext.jsx` [AuthContext.jsx](file:///E:/campus-auction/client/src/context/AuthContext.jsx): Global authentication context provider. Initializes state from `localStorage` (`campus_auction_token` and `campus_auction_user`). On initial mount, executes `api.getMe()` to verify token validity against the backend. Exposes `login()`, `register()`, and `logout()` methods.
- `client/src/services/api.js` [api.js](file:///E:/campus-auction/client/src/services/api.js): Centralized HTTP communication module. Reads `VITE_API_URL` or defaults to `http://localhost:5000/api`. Provides wrapper functions (`request`, `authRequest`, `multipartRequest`) that handle JSON serialization, `credentials: 'include'` (for cookies), `Authorization: Bearer <token>` headers, and uniform error rejection.
- `client/src/services/socket.js` [socket.js](file:///E:/campus-auction/client/src/services/socket.js): Initializes a single shared Socket.IO client instance connected to `http://localhost:5000` with options `{ autoConnect: true, withCredentials: true }`.

#### 3. Server Core & Services
- `server/src/index.js` [index.js](file:///E:/campus-auction/server/src/index.js): Express backend entry point. Creates HTTP server via `http.createServer(app)`, binds Socket.IO, initializes MongoDB via `connectDB()`, mounts global middleware (`cors`, `express.json`, `cookieParser`), serves `/uploads` statically, mounts routes under `/api`, starts the background auction scheduler via `startAuctionScheduler(3000)`, and listens on `PORT = process.env.PORT || 5000`.
- `server/src/config/db.js` [db.js](file:///E:/campus-auction/server/src/config/db.js): Asynchronous MongoDB connection utility. Calls `mongoose.connect(process.env.MONGODB_URI)`. Handles connection errors gracefully by logging diagnostics and terminating the process (`process.exit(1)`).
- `server/src/config/seed.js` [seed.js](file:///E:/campus-auction/server/src/config/seed.js): Database seeder script. Populates demo users (Alice, Bob, Charlie) and 13 realistic campus auction items across 6 categories with closing dates dynamically set 4 to 7 days in the future.
- `server/src/services/socket.js` [socket.js](file:///E:/campus-auction/server/src/services/socket.js): Stores and exports the initialized Socket.IO server instance (`io`). Provides helper `broadcastToAuctionRoom(auctionId, event, data)` to push live events to clients subscribed to `auction:<id>`.
- `server/src/services/auctionLifecycle.js` [auctionLifecycle.js](file:///E:/campus-auction/server/src/services/auctionLifecycle.js): Server-authoritative auction lifecycle engine. Runs every 3000ms (`setInterval`). Evaluates all auctions where `status: 'active'` and `closingAt <= new Date()`. Idempotently closes each auction, determines provisional winner or marks as unsold, and creates a corresponding `Transaction` record.
- `server/src/services/notificationService.js` [notificationService.js](file:///E:/campus-auction/server/src/services/notificationService.js): Centralized notification factory. Inserts a `Notification` document into MongoDB and immediately emits a real-time `notification:new` event via Socket.IO to the recipient.

---

### Interviewer Quick-Reference File Matrix

| Interviewer Question | Primary File Path | Key Function / Variable / Hook |
|---|---|---|
| "Where is the React root mounted?" | `client/src/main.jsx` | `createRoot(document.getElementById('root')).render(...)` |
| "Where are all client routes declared?" | `client/src/App.jsx` | `<Routes>`, `<Route path="/auctions/:id" ...>` |
| "Where is user login/token state held?" | `client/src/context/AuthContext.jsx` | `const [user, setUser] = useState(...)` |
| "Where is the HTTP Fetch API client configured?" | `client/src/services/api.js` | `const BASE_URL = ...`, `async function request(...)` |
| "Where does the search input handle Enter and clicks?" | `client/src/pages/Home.jsx` | `handleSearchSubmit()`, `handleKeyDown()` |
| "Where is multi-image upload validated on frontend?" | `client/src/pages/CreateListing.jsx` | `handleImageChange()`, `imageFiles` state |
| "Where is the live bidding UI and countdown timer?" | `client/src/pages/AuctionDetails.jsx` | `handleBidSubmit()`, `useEffect` timer interval |
| "Where does the seller approve or reject the win?" | `client/src/pages/Dashboard.jsx` | `handleSellerDecision(transactionId, 'approved')` |
| "Where does the winning buyer select COD or UPI?" | `client/src/pages/PaymentConfirmation.jsx` | `handlePaymentSubmit()`, `selectedMethod` state |
| "Where is the Express server and Socket.IO started?" | `server/src/index.js` | `http.createServer(app)`, `initSocket(server)` |
| "Where is MongoDB connected?" | `server/src/config/db.js` | `mongoose.connect(process.env.MONGODB_URI)` |
| "Where is password hashing executed?" | `server/src/routes/auth.js` | `bcrypt.hash(password, 10)`, `bcrypt.compare(...)` |
| "Where is the JWT generated and verified?" | `server/src/routes/auth.js` & `server/src/middleware/auth.js` | `jwt.sign(...)`, `jwt.verify(token, JWT_SECRET)` |
| "Where is the 30-second anti-sniping rule executed?" | `server/src/routes/auctions.js` | `if (timeRemaining <= 30000) { newClosingAt = new Date(...) }` |
| "Where does the background auto-close scheduler run?" | `server/src/services/auctionLifecycle.js` | `startAuctionScheduler()`, `closeExpiredAuctions()` |
| "Where is the Multer image upload configured?" | `server/src/middleware/upload.js` | `multer.diskStorage()`, `upload.array('images', 5)` |
| "Where is the User database schema defined?" | `server/src/models/User.js` | `new mongoose.Schema({ studentId, email, password })` |
| "Where is the Auction schema defined?" | `server/src/models/Auction.js` | `new mongoose.Schema({ title, currentPrice, closingAt })` |
| "Where is the Transaction schema defined?" | `server/src/models/Transaction.js` | `new mongoose.Schema({ sellerDecision, handover, payment })` |

---

## 4. Frontend Deep-Dive (Architecture, Pages & Components)

### State Architecture & Authentication Context
The application relies on React's Context API (`AuthContext`) for global identity state and local component state (`useState`) for page-specific interactions.
- **Global Auth State (`client/src/context/AuthContext.jsx`)**:
  - `user`: Object containing `{ id, name, email, studentId, department }`.
  - `token`: String representing the signed JWT.
  - `loading`: Boolean indicating whether initial session verification (`/api/auth/me`) is pending.
  - `login(email, password)`: Calls `api.login()`, saves token to `localStorage.setItem('campus_auction_token', token)`, updates `user` state, and returns response.
  - `logout()`: Clears `localStorage`, resets `user` and `token` state to `null`, and calls `api.logout()` to invalidate the HttpOnly cookie.

---

### Page-by-Page Analysis

#### 1. Home Page (`client/src/pages/Home.jsx` & `Home.css`)
- **Visual Presentation**: Hero banner with campus auction branding, prominent search bar with dedicated "Search" button, category filter chips (Textbooks, Electronics, Furniture, Bicycles, Notes, Accessories, All), condition filter dropdown, sorting dropdown (Closing Soonest, Lowest Price, Highest Price, Newest), and a responsive responsive grid of `AuctionCard` components.
- **Route**: `/`
- **Data Source**: Real backend API (`GET /api/auctions`).
- **Interactive Controls**:
  - `Search Input`: Controlled input bound to `searchQuery` state.
  - `Search Button`: Clicking invokes `handleSearchSubmit()`, preventing stale closures and pushing search query parameters to `fetchAuctions()`.
  - `Enter Key`: `handleKeyDown` intercepts `e.key === 'Enter'`, triggering the exact same search submission.
  - `Category Chips`: Clicking updates `selectedCategory` state and immediately re-fetches listings.
  - `Sorting Select`: Dropdown updates `sortBy` state (`closing_soon`, `price_asc`, `price_desc`, `newest`).
- **Real-Time Integration**: Subscribes to Socket.IO events `auction:bid` and `auction:created` to update card prices and counts dynamically without page refresh.

#### 2. Auth Page (`client/src/pages/Auth.jsx` & `Auth.css`)
- **Visual Presentation**: Glassmorphism auth card with tab toggle between "Login" and "Register".
- **Route**: `/auth`
- **Data Source**: Real backend API (`POST /api/auth/login` and `POST /api/auth/register`).
- **Interactive Controls**:
  - `Tab Switcher`: Toggles `isLogin` boolean state, resetting validation errors.
  - `Registration Form`: Controlled inputs for `name`, `email`, `studentId` (Roll Number), `department`, `password`, and `confirmPassword`.
  - `Submit Button`: Calls `handleSubmit()`. Validates roll number regex (`/^\d{2}[A-Z]{2,4}\d{3,4}$/i`), verifies password length >= 6, and executes `register()` or `login()`. On success, redirects user via `navigate('/')` or to their intended protected page via `location.state?.from`.

#### 3. Create Listing Page (`client/src/pages/CreateListing.jsx` & `CreateListing.css`)
- **Visual Presentation**: Multi-card form with fields for Item Title, Category, Condition, Description, Starting Price, Minimum Bid Increment, Closing Date & Time picker, Pickup Location, and an interactive Drag-and-Drop / File Picker for item photos.
- **Route**: `/create` (Wrapped inside `ProtectedRoute`).
- **Data Source**: Real backend API (`POST /api/upload` followed by `POST /api/auctions`).
- **Interactive Controls**:
  - `File Input ("Upload Item Images")`: Allows selecting up to 5 images (JPG, PNG, WEBP). Generates local preview thumbnails using `URL.createObjectURL(file)`.
  - `Thumbnail Remove Buttons`: Allows removing individual selected files before submission.
  - `Closing Date & Time Picker`: Replaces hardcoded durations. Validates that the selected datetime is strictly in the future.
  - `Form Submission`: First sends selected files to `api.uploadImages(formData)` to store images on the server, receives an array of image URLs, and then sends the complete listing payload to `api.createAuction()`. On success, navigates directly to `/auctions/:id`.

#### 4. Auction Details Page (`client/src/pages/AuctionDetails.jsx` & `AuctionDetails.css`)
- **Visual Presentation**: Two-column layout. Left column: image gallery with thumbnail selector and seller information card (name, department, roll number). Right column: title, status badge, live countdown timer, current leading bid, minimum next bid calculation, bid submission form, anti-sniping extension indicator, and public bid history table. Bottom: campus community Q&A section.
- **Route**: `/auctions/:id`
- **Data Source**: Real backend API (`GET /api/auctions/:id`, `POST /api/auctions/:id/bids`, `POST /api/auctions/:id/questions`).
- **Interactive Controls**:
  - `Bid Amount Input`: Pre-filled with `currentPrice + minIncrement`.
  - `Place Bid Button`: Calls `handleBidSubmit()`. Validates user is logged in, validates user is not the seller, sends `POST` request to backend.
  - `Ask Question Form`: Allows prospective buyers to post questions directly to the seller.
- **Real-Time WebSocket Integration**:
  - On mount, emits `join:auction` with auction ID to enter dedicated Socket.IO room.
  - Listens for `auction:bid`: updates `currentPrice`, increments `bidsCount`, appends to bid history.
  - Listens for `auction:extended`: updates `closingAt` timestamp and flashes anti-sniping alert badge ("Auction extended by 60 seconds due to late bid!").
  - On unmount, emits `leave:auction` and cleans up listeners.

#### 5. Dashboard Page (`client/src/pages/Dashboard.jsx` & `Dashboard.css`)
- **Visual Presentation**: Multi-tab user command center with stats summary cards (Active Listings, Active Bids, Pending Approvals, Completed Sales). Tabs: "My Listings", "My Bids", "Seller Approvals", and "Handover & Payments".
- **Route**: `/dashboard` (Wrapped in `ProtectedRoute`).
- **Data Source**: Real backend API (`GET /api/auctions?seller=me`, `GET /api/transactions`).
- **Interactive Controls**:
  - `Seller Decision Buttons ("Approve" / "Reject")`: Available in the "Seller Approvals" tab for auctions in `pending_seller_approval` status. Approving creates a reserved transaction and notifies the winner.
  - `Payment Link Button`: For buyers whose winning bid was approved, renders a button navigating to `/payment-confirmation/:transactionId`.
  - `Confirm Handover Button`: Rendered for both seller and buyer to confirm physical handover at the designated campus location. When both confirm, transaction marks as `completed`.

#### 6. Payment Confirmation Page (`client/src/pages/PaymentConfirmation.jsx` & `PaymentConfirmation.css`)
- **Visual Presentation**: Transaction invoice summary showing item details, winning bid amount, seller contact info, and payment selection cards: Cash on Delivery (COD) and UPI.
- **Route**: `/payment-confirmation/:transactionId` (Protected).
- **Data Source**: Real backend API (`GET /api/transactions/:id`, `POST /api/transactions/:id/payment`).
- **Interactive Controls**:
  - `Payment Method Radio / Cards`: Buyer selects COD or UPI.
  - `UPI Demo Payment Flow`: If UPI is chosen, displays campus UPI ID and a mock QR code with an interactive verification demo button.
  - `Confirm Payment Selection`: Calls `api.selectPaymentMethod(id, { method })`. Updates transaction payment status.

#### 7. Notifications Page (`client/src/pages/Notifications.jsx` & `Notifications.css`)
- **Visual Presentation**: Feed of alerts (Outbid notices, Auction Won, Seller Approved, Handover Ready) with time-ago badges and unread indicator dots.
- **Route**: `/notifications` (Protected).
- **Data Source**: Real backend API (`GET /api/notifications`, `PUT /api/notifications/:id/read`).
- **Interactive Controls**:
  - `Mark All as Read Button`: Calls `api.markAllNotificationsRead()`.
  - `Notification Row Click`: Marks item read and navigates user to the relevant auction or transaction.

#### 8. Saved Searches Page (`client/src/pages/SavedSearches.jsx` & `SavedSearches.css`)
- **Visual Presentation**: List of saved keyword queries with category filters and alert frequency tags.
- **Data Source**: **Frontend-Only State** (Initial mock data initialized in `useState(MOCK_SAVED_SEARCHES)`). Changes persist in component memory during session but do not write to MongoDB.

#### 9. AI Assistant Page (`client/src/pages/AIAssistant.jsx` & `AIAssistant.css`)
- **Visual Presentation**: Interactive chat interface for student pricing guidance and campus handover safety tips.
- **Data Source**: **Client-Side Simulated Heuristic Engine**. Uses local string matching and predetermined responses (e.g., detecting keywords like "price", "calculator", "cycle", "handover") to return simulated advice. Does not call external OpenAI / Gemini APIs.

---

### Reusable UI Components
- **`Navbar.jsx`**: Global header. Displays brand logo, search bar (on mobile/desktop), navigation links, active notification bell with unread count badge, and user avatar dropdown with logout button.
- **`Footer.jsx`**: Campus platform footer with student safety guidelines, quick links, and copyright notice.
- **`ProtectedRoute.jsx`**: High-order component checking `const { user, loading } = useAuth()`. If `loading`, renders `<LoadingSpinner />`. If `!user`, redirects to `/auth` with `state: { from: location }`. If authenticated, renders child `<Outlet />` or component.
- **`AuctionCard.jsx`**: Displays listing thumbnail, category tag, title, current price, bid count, and the `CountdownBadge`.
- **`CountdownBadge.jsx`**: Calculates time remaining until `closingAt`. Switches colors dynamically: Green (> 1 hour), Yellow (< 1 hour), Red (< 5 minutes), Grey (Closed).
- **`StatusBadge.jsx`**: Visual chip for auction status (`active`, `pending_approval`, `completed`, `unsold`, `cancelled`).

---

### Real Backend vs Frontend-Only State Audit

| Feature / Page | Backend API Status | MongoDB Model | State Persistence | Verification Status |
|---|---|---|---|---|
| User Registration & Login | **Real Backend** (`/api/auth`) | `User` | Persistent in MongoDB + JWT in Cookie/LocalStorage | Verified (100% Functional) |
| Marketplace Catalog & Search | **Real Backend** (`/api/auctions`) | `Auction` | Persistent in MongoDB | Verified (100% Functional) |
| Multi-Image Device Upload | **Real Backend** (`/api/upload`) | Uploads saved to disk (`server/uploads/`) | Files stored on server disk; URLs in MongoDB | Verified (100% Functional) |
| Listing Creation & Custom Closing | **Real Backend** (`POST /api/auctions`)| `Auction` | Persistent in MongoDB | Verified (100% Functional) |
| Live Bidding Engine | **Real Backend** (`/api/auctions/:id/bids`)| `Bid`, `Auction` | Persistent in MongoDB | Verified (100% Functional) |
| Anti-Sniping Deadline Extension | **Real Backend** (`server/src/routes/auctions.js`)| `Auction.closingAt` | Updated in MongoDB & Broadcast via Socket.IO | Verified (100% Functional) |
| Background Auto-Close Scheduler | **Real Backend** (`auctionLifecycle.js`)| `Auction`, `Transaction`| Persistent in MongoDB | Verified (100% Functional) |
| Seller Decision (Approval/Rejection)| **Real Backend** (`/api/transactions/:id`)| `Transaction` | Persistent in MongoDB | Verified (100% Functional) |
| Payment Selection (COD & UPI Demo) | **Real Backend** (`/api/transactions/:id/payment`)| `Transaction.payment` | Persistent in MongoDB | Verified (100% Functional) |
| Campus Handover Confirmation | **Real Backend** (`/api/transactions/:id/handover`)| `Transaction.handover`| Persistent in MongoDB | Verified (100% Functional) |
| User Notifications | **Real Backend** (`/api/notifications`)| `Notification` | Persistent in MongoDB | Verified (100% Functional) |
| Saved Searches | **Frontend Only** | None | Component State (`MOCK_SAVED_SEARCHES`) | UI Functional; Reset on reload |
| AI Assistant | **Frontend Simulated** | None | Component State (Simulated heuristic responses) | UI Functional; Local simulation |

---

## 5. Important Variables, Functions, and State Reference

### Frontend State & Functions Catalog

#### `client/src/context/AuthContext.jsx`
- `const [user, setUser] = useState(null)`: Holds current authenticated user object `{ id, name, email, studentId, department }`. Initialized from `localStorage.getItem('campus_auction_user')`.
- `const [token, setToken] = useState(...)`: Holds current JWT string. Initialized from `localStorage.getItem('campus_auction_token')`.
- `const login = async (email, password)`: Sends credentials to `/api/auth/login`. On success, updates `token`, `user`, stores values in `localStorage`, and returns user data.
- `const logout = async ()`: Clears `localStorage`, calls `/api/auth/logout` to clear cookie, and resets state to `null`.

#### `client/src/pages/Home.jsx`
- `const [auctions, setAuctions] = useState([])`: Array of auction documents retrieved from backend.
- `const [searchQuery, setSearchQuery] = useState('')`: Current text entered in search bar.
- `const [selectedCategory, setSelectedCategory] = useState('All')`: Currently active category filter chip.
- `const fetchAuctions = async (keyword, category, condition, sort)`: Asynchronous function constructing URL query parameters and calling `api.getAuctions(params)`. Updates `auctions` array and sets `loading` to `false`.
- `const handleSearchSubmit = (e)`: Form submit handler that prevents default browser refresh (`e.preventDefault()`) and invokes `fetchAuctions()` with `searchQuery`.

#### `client/src/pages/CreateListing.jsx`
- `const [imageFiles, setImageFiles] = useState([])`: Array of native `File` objects selected from user's device via `<input type="file" multiple />`.
- `const [imagePreviews, setImagePreviews] = useState([])`: Array of local blob URLs generated via `URL.createObjectURL(file)` to display instant image previews.
- `const [closingAt, setClosingAt] = useState('')`: Datetime string from input. Validated to ensure `new Date(closingAt) > new Date()`.
- `const handleSubmit = async (e)`: Main form submission handler. Appends `imageFiles` to a `FormData` instance, calls `api.uploadImages()`, extracts uploaded URLs, merges with form fields, and calls `api.createAuction()`.

#### `client/src/pages/AuctionDetails.jsx`
- `const [auction, setAuction] = useState(null)`: Holds complete auction document including bids array and questions.
- `const [bidAmount, setBidAmount] = useState('')`: Numeric string entered by user for placing a bid.
- `const minNextBid = auction ? auction.currentPrice + auction.minIncrement : 0`: Computed minimum acceptable bid value.
- `const handleBidSubmit = async (e)`: Event handler for placing bids. Validates `bidAmount >= minNextBid`, calls `api.placeBid(id, bidAmount)`. Handles HTTP 400 validation errors (e.g., "Seller cannot bid on their own auction") by displaying user-friendly alerts.

---

### Backend Middleware, Services & Controller Functions Catalog

#### `server/src/middleware/auth.js`
- `const authenticateToken = (req, res, next)`: Middleware intercepting incoming requests. Checks `req.cookies.token` first; if absent, inspects `req.headers['authorization']` for `Bearer <token>`. Uses `jwt.verify(token, process.env.JWT_SECRET)`. On success, attaches payload to `req.user` and calls `next()`. On failure, returns `401 Unauthorized` or `403 Forbidden`.

#### `server/src/middleware/upload.js`
- `const storage = multer.diskStorage(...)`: Configures disk destination to `server/uploads/` and generates unique filenames using `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`.
- `const fileFilter = (req, file, cb)`: Validates MIME types, allowing only `image/jpeg`, `image/png`, `image/webp`.

#### `server/src/services/auctionLifecycle.js`
- `const closeExpiredAuctions = async ()`: Core scheduler function. Queries `Auction.find({ status: 'active', closingAt: { $lte: new Date() } })`.
  - For each auction, fetches highest bid from `Bid` collection.
  - If bids exist: updates auction status to `'pending_approval'`, sets `winner` and `finalPrice`, and creates a `Transaction` document with status `'pending_seller_approval'`.
  - If no bids exist: updates auction status to `'unsold'`.
  - Dispatches notifications to seller and winning buyer via `notificationService`.
- `const startAuctionScheduler = (intervalMs = 3000)`: Sets recurring execution via `setInterval(closeExpiredAuctions, intervalMs)`.

#### `server/src/routes/auctions.js`
- `router.post('/:id/bids', authenticateToken, ...)`: Core bidding endpoint.
  - Verifies auction is `status: 'active'` and `closingAt > new Date()`.
  - Verifies `req.user.id !== auction.seller.toString()` (sellers forbidden from bidding).
  - Validates `amount >= currentPrice + minIncrement`.
  - Creates and saves new `Bid` document.
  - Updates `auction.currentPrice = amount`, `auction.bidsCount += 1`.
  - **Anti-Sniping Logic**:
    ```javascript
    const timeRemaining = new Date(auction.closingAt).getTime() - Date.now();
    if (timeRemaining <= 30000) { // 30 seconds
      auction.closingAt = new Date(Date.now() + 60000); // Extended to 60s from now
      auction.antiSnipingExtensions = (auction.antiSnipingExtensions || 0) + 1;
      broadcastToAuctionRoom(auction._id, 'auction:extended', {
        closingAt: auction.closingAt,
        antiSnipingExtensions: auction.antiSnipingExtensions
      });
    }
    ```
  - Saves auction and broadcasts `auction:bid` event to Socket.IO room.

---

## 6. Click-by-Click User Journeys & End-to-End Execution Workflows

### Workflow A: Application Startup & Environment Hydration
1. **Developer Execution**: In the root directory, `npm run server` starts Express with nodemon on port 5000; `npm run client` starts Vite dev server on port 5173.
2. **Backend Hydration**:
   - `server/src/index.js` executes. `dotenv/config` reads `.env` (`PORT=5000`, `MONGODB_URI`, `JWT_SECRET`).
   - `connectDB()` connects Mongoose to MongoDB (`mongodb://127.0.0.1:27017/campus-auction`). If connection fails, logs error and exits.
   - `startAuctionScheduler(3000)` starts the 3-second lifecycle timer.
   - Express binds to port 5000; Socket.IO binds to the same HTTP server instance.
3. **Frontend Hydration**:
   - Browser requests `http://localhost:5173`. Vite serves `index.html`.
   - `client/src/main.jsx` executes, mounting `<App />` within the `#root` DOM element.
   - `<AuthProvider>` executes its mount effect: reads `campus_auction_token` from `localStorage`. If found, issues `GET /api/auth/me`. If valid, populates `user` state; if expired, clears storage.

---

### Workflow B: User Registration Flow
1. **User Action**: Student navigates to `/auth`, clicks the "Register" tab.
2. **Form Input**:
   - Name: `"Rahul Sharma"`
   - Email: `"rahul@campus.edu"`
   - Student ID: `"21CS045"` (matches `^\d{2}[A-Z]{2,4}\d{3,4}$` format)
   - Department: `"Computer Science"`
   - Password: `"secret123"`
   - Confirm Password: `"secret123"`
3. **Event Trigger**: User clicks `"Create Account"`.
4. **Handler Execution**: `handleSubmit(e)` in `client/src/pages/Auth.jsx`:
   - Validates passwords match and roll number regex matches.
   - Calls `register({ name, email, studentId, department, password })` in `AuthContext.jsx`.
5. **Network Request**: `api.register()` issues `POST http://localhost:5000/api/auth/register` with JSON body.
6. **Backend Processing (`server/src/routes/auth.js`)**:
   - Express receives body via `express.json()`.
   - Checks if email or studentId already exists in MongoDB: `User.findOne({ $or: [{ email }, { studentId }] })`. If exists, returns `400 Bad Request`.
   - Generates salt and hashes password: `const hashedPassword = await bcrypt.hash(password, 10)`.
   - Creates and saves `User` document.
   - Generates signed JWT: `jwt.sign({ id: user._id, email, department }, process.env.JWT_SECRET, { expiresIn: '7d' })`.
   - Sets HttpOnly cookie: `res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7*24*60*60*1000 })`.
   - Responds with `201 Created` and `{ success: true, user, token }`.
7. **Frontend State & Navigation**:
   - `AuthContext` stores token and user in `localStorage`.
   - Sets `user` state.
   - Calls `navigate('/')`, taking the student directly to the homepage as an authenticated user.

---

### Workflow C: User Login & Session Establishment
1. **User Action**: Student enters email and password on `/auth` and clicks `"Sign In"`.
2. **Backend Verification**:
   - `POST /api/auth/login` queries `User.findOne({ email }).select('+password')`.
   - If user not found, returns `401 Unauthorized` ("Invalid email or password").
   - Compares passwords: `const isMatch = await bcrypt.compare(password, user.password)`.
   - If false, returns `401 Unauthorized`.
   - If true, issues fresh JWT, sets cookie, returns sanitized user object.
3. **Frontend Reaction**: User avatar and department appear in `Navbar.jsx`; login buttons are replaced with user profile menu and logout button.

---

### Workflow D: Session Restoration (Page Refresh) & Logout
- **On Page Refresh**:
  - React memory resets. `AuthContext` reads `localStorage.getItem('campus_auction_token')`.
  - Dispatches `GET /api/auth/me` with `Authorization: Bearer <token>` and cookie.
  - Backend verifies token via `authenticateToken` middleware, fetches fresh user details from MongoDB, and returns them.
  - `AuthContext` populates `user` state and sets `loading: false`. The user experiences no logout interruption.
- **On Logout**:
  - User clicks `"Sign Out"` in Navbar dropdown.
  - Calls `logout()` in `AuthContext`: calls `POST /api/auth/logout` (backend clears cookie via `res.clearCookie('token')`).
  - Frontend deletes `campus_auction_token` and `campus_auction_user` from `localStorage`.
  - Resets `user` state to `null`.
  - Navigates to `/` (Home).

---

### Workflow E: Frontend Route Protection vs Backend Guarding
- **Frontend Guard (`client/src/components/ProtectedRoute.jsx`)**:
  - Wraps routes like `/create`, `/dashboard`, `/notifications`.
  - If `!user`, intercepts navigation and renders `<Navigate to="/auth" state={{ from: location }} replace />`.
  - *Purpose*: Provides smooth user experience by preventing unauthenticated access to UI pages.
- **Backend Guard (`server/src/middleware/auth.js`)**:
  - Middleware attached to API endpoints like `router.post('/', authenticateToken, ...)`.
  - Cryptographically verifies the JWT signature on every request.
  - *Purpose*: Authoritative security enforcement. Even if an attacker bypasses the frontend router using cURL or Postman, the backend rejects unauthorized requests with `401 Unauthorized`.

---

### Workflow F: Marketplace Browsing, Multi-Term Search & Filtering
1. **User Action**: Student types `"engineering mechanics"` into the search input and clicks `"Search"` or presses `Enter`.
2. **Frontend Handler**: `handleSearchSubmit()` in `Home.jsx` calls `fetchAuctions("engineering mechanics", category, condition, sortBy)`.
3. **Network Request**: `GET /api/auctions?keyword=engineering+mechanics&category=All&sortBy=closing_soon`.
4. **Backend Query Processing (`server/src/routes/auctions.js`)**:
   - The query parser splits the keyword into individual search terms: `['engineering', 'mechanics']`.
   - Constructs a multi-term MongoDB query using `$and` and case-insensitive regular expressions across `title`, `description`, and `category`:
     ```javascript
     const words = keyword.trim().split(/\s+/).filter(Boolean);
     const wordQueries = words.map(word => {
       const escaped = escapeRegex(word);
       const regex = new RegExp(escaped, 'i');
       return {
         $or: [
           { title: regex },
           { description: regex },
           { category: regex }
         ]
       };
     });
     query.$and = wordQueries;
     ```
   - Matches items where *every* word appears in either title, description, or category.
   - Executes `Auction.find(query).sort({ closingAt: 1 })`.
5. **Response & UI Render**: Returns matching auctions as JSON array. React updates `auctions` state, and the grid renders matching `AuctionCard` components. If no items match, `<EmptyState />` is rendered with a `"Clear filters"` button.

---

### Workflow G: Multi-Image Device Upload & Listing Creation
1. **User Action**: Student navigates to `/create`, fills in title `"Scientific Calculator fx-991EX"`, category `"Electronics"`, condition `"Like New"`, starting price `₹800`, minimum increment `₹50`, and selects a closing date 3 days in the future.
2. **Image Selection**:
   - Clicks `"Choose Files"` in the `"Upload Item Images"` section.
   - Selects 3 device photos (`front.jpg`, `back.jpg`, `display.png`).
   - `handleImageChange()` in `CreateListing.jsx` validates file types (`image/jpeg`, `image/png`, `image/webp`), enforces max 5 files, and generates preview thumbnails.
3. **Form Submission**:
   - Student clicks `"Create Listing"`.
   - **Step 1 (Upload)**: Code constructs `FormData`, appends the 3 files, and sends `POST /api/upload`.
     - Multer processes files, verifies MIME types, writes files to `server/uploads/`, and returns URLs array: `['/uploads/1740001-front.jpg', ...]`.
   - **Step 2 (Listing Creation)**: Code takes returned image URLs, attaches form data, and sends `POST /api/auctions`:
     ```json
     {
       "title": "Scientific Calculator fx-991EX",
       "category": "Electronics",
       "condition": "Like New",
       "description": "Perfect condition, used for 1 semester.",
       "startingPrice": 800,
       "minIncrement": 50,
       "closingAt": "2026-11-01T18:00:00.000Z",
       "pickupLocation": "Library Lawn",
       "imageUrls": ["/uploads/1740001-front.jpg", "/uploads/1740002-back.jpg"]
     }
     ```
   - Backend derives `seller` ID and department from `req.user`, sets `currentPrice = startingPrice`, saves `Auction` document, and returns `201 Created`.
   - Frontend navigates directly to `/auctions/:newAuctionId`.

---

### Workflow H: Auction Details, Live Room Join & Real-Time Countdown
1. **User Action**: Student visits `/auctions/67bf...`.
2. **Room Entry**: `AuctionDetails.jsx` runs `useEffect()`:
   - Emits Socket.IO event: `socket.emit('join:auction', auctionId)`.
   - Server receives event and adds client socket to room `auction:<auctionId>`.
3. **Live Countdown Loop**:
   - Local `setInterval` ticks every 1000ms.
   - Calculates `timeRemaining = new Date(auction.closingAt).getTime() - Date.now()`.
   - Dynamically formats days, hours, minutes, seconds.
   - If time expires, updates display to `"Auction Ended"` and triggers status refresh.

---

### Workflow I: Real-Time Bidding, Atomic Verification & Anti-Sniping (30s -> 60s)
```
  Prospective Bidder             Express Server                MongoDB                 Socket.IO Room
         |                             |                          |                          |
         |-- POST /api/auctions/id/bids->                         |                          |
         |   { amount: 950 }           |                          |                          |
         |                             |-- Authenticate Token --->|                          |
         |                             |<-- Token Valid (req.user)|                          |
         |                             |                          |                          |
         |                             |-- Query Auction -------->|                          |
         |                             |<-- Return Auction -------|                          |
         |                             |                          |                          |
         |                             | [Validate Business Rules]|                          |
         |                             | - Seller !== Bidder? OK  |                          |
         |                             | - Status === 'active'? OK|                          |
         |                             | - Time remaining > 0? OK |                          |
         |                             | - 950 >= 850 + 50? OK    |                          |
         |                             |                          |                          |
         |                             | [Check Anti-Sniping]     |                          |
         |                             | Time remaining = 18 sec  |                          |
         |                             | (<= 30 seconds!)         |                          |
         |                             | Extend closingAt = +60s  |                          |
         |                             |                          |                          |
         |                             |-- Insert Bid Document -->|                          |
         |                             |-- Update Auction Price ->|                          |
         |                             |                          |                          |
         |                             |-- Emit 'auction:bid' ------------------------------>|
         |                             |   { currentPrice: 950 }  |                          | (All clients
         |                             |-- Emit 'auction:extended' ------------------------->|  update price
         |                             |   { closingAt: +60s }    |                          |  & countdown)
         |<-- 201 Created -------------|                          |                          |
```

1. **Anti-Sniping In Action**:
   - A sniper submits a bid with only 18 seconds remaining before the deadline.
   - The backend detects `timeRemaining <= 30000`.
   - The deadline is automatically extended to exactly `Date.now() + 60000` (60 seconds from current time).
   - Socket.IO broadcasts `auction:extended` with the new timestamp.
   - All connected buyers receive the updated countdown immediately, giving honest bidders time to counter-bid and eliminating unfair last-second sniping.

---

### Workflow J: Background Lifecycle Scheduler & Idempotent Closing
1. **Execution Cycle**: `server/src/services/auctionLifecycle.js` wakes up every 3000ms.
2. **Query**: Searches for due active auctions: `Auction.find({ status: 'active', closingAt: { $lte: new Date() } })`.
3. **Atomic Evaluation**:
   - If no bids were placed: updates `status = 'unsold'`.
   - If bids exist: finds leading bid via `Bid.findOne({ auction: auction._id }).sort({ amount: -1 })`.
   - Updates auction: `status = 'pending_approval'`, `winner = leadingBid.bidder`, `finalPrice = leadingBid.amount`.
   - Creates a new `Transaction` document:
     ```javascript
     await Transaction.create({
       auction: auction._id,
       seller: auction.seller,
       buyer: leadingBid.bidder,
       finalPrice: leadingBid.amount,
       status: 'pending_seller_approval',
       sellerDecision: { status: 'pending' }
     });
     ```
   - Sends notification to seller: *"Your auction has ended! Please review the winning bid of ₹950."*
   - Sends notification to buyer: *"Congratulations! You are the provisional winner. Waiting for seller approval."*

---

### Workflow K: Seller Approval Decision & Handover Reservation
1. **User Action**: Seller opens `/dashboard` and clicks the `"Seller Approvals"` tab.
2. **Options**: Sees the item, winning price (`₹950`), buyer info, and two buttons: `"Approve Winning Bid"` and `"Reject"`.
3. **Execution**: Seller clicks `"Approve Winning Bid"`.
4. **Backend Action (`POST /api/transactions/:id/decision`)**:
   - Verifies authenticated user is `transaction.seller`.
   - Updates `transaction.status = 'approved'`.
   - Updates `transaction.sellerDecision = { status: 'approved', decidedAt: new Date() }`.
   - Reserves the item for the buyer.
   - Sends notification to buyer: *"Seller approved your winning bid! Please proceed to select payment."*

---

### Workflow L: Payment Selection (COD & UPI Demo Flow)
1. **User Action**: Winning buyer visits `/dashboard` -> `"Handover & Payments"` tab and clicks `"Confirm Payment"`.
2. **Navigation**: Enters `/payment-confirmation/:transactionId`.
3. **Selection**:
   - **Option 1: Cash on Delivery (COD)**:
     - Buyer selects COD and clicks `"Confirm Payment Selection"`.
     - Backend updates `transaction.payment = { method: 'COD', status: 'PENDING' }`.
     - Payment remains pending until cash is handed over in person.
   - **Option 2: UPI (Demo Flow)**:
     - Buyer selects UPI. UI displays campus merchant UPI QR code and UPI ID (`campusauction@bank`).
     - Demonstrates pending verification or simulated payment completion.
     - Backend marks `payment = { method: 'UPI', status: 'PAID', paidAt: new Date() }`.

---

### Workflow M: Physical Campus Handover Completion & Payment Verification
1. **Meeting**: Buyer and seller meet at designated campus location (e.g., Central Library steps).
2. **Inspection & Handover**:
   - Buyer inspects item physically.
   - If COD was selected, buyer hands cash to seller.
3. **Status Confirmation**:
   - Seller logs into `/dashboard` and clicks `"Confirm Handover & Payment Received"`.
   - Buyer logs in and clicks `"Confirm Item Received"`.
   - Backend checks both confirmations:
     ```javascript
     transaction.handover.sellerConfirmed = true;
     transaction.handover.buyerConfirmed = true;
     if (transaction.handover.sellerConfirmed && transaction.handover.buyerConfirmed) {
       transaction.status = 'completed';
       transaction.handover.completedAt = new Date();
       if (transaction.payment.method === 'COD') {
         transaction.payment.status = 'PAID';
       }
       await Auction.findByIdAndUpdate(transaction.auction, { status: 'completed' });
     }
     ```
   - Transaction and auction are marked as completed, finalizing the lifecycle.

---

### Workflow N: Real-Time Notification Pipeline
1. **Trigger Event**: A bidder is outbid by another student.
2. **Backend Notification Service (`server/src/services/notificationService.js`)**:
   - Creates a document in MongoDB `Notification` collection with `recipient: previousBidder._id`, `type: 'OUTBID'`, `message: 'You have been outbid on Scientific Calculator fx-991EX!'`.
   - Immediately dispatches Socket.IO event:
     ```javascript
     io.emit(`notification:${recipientId}`, newNotification);
     ```
3. **Client Reaction**:
   - `Navbar.jsx` receives event, increments unread badge count from `2` to `3`, and displays a toast notification.
   - Clicking bell opens `/notifications` where the item is displayed in bold until marked read.

---

### Workflow O: System Error Handling & Resilience
- **Invalid Form Inputs**: Frontend highlights offending input with red border and message before network request is dispatched.
- **Network Failures**: `api.js` catches fetch errors and rejects a standardized object `{ message: 'Unable to connect to server. Please check your internet connection.' }`.
- **Duplicate Registration**: Backend returns `400 Bad Request` with `{ message: 'An account with this email or student ID already exists' }`. `Auth.jsx` displays error alert banner.
- **Unauthorized Actions**: Backend rejects requests with `401 Unauthorized` (missing/invalid token) or `403 Forbidden` (user is not seller). Protected routes redirect to `/auth`.
- **Database Downtime**: If MongoDB goes down, `connectDB()` logs error diagnostics. Express routes catch Mongoose connection timeouts in `try/catch` and return `500 Internal Server Error` without crashing the Node.js server.

---

## 7. HTTP REST API & Real-Time WebSocket Specifications

### REST API Matrix

| Method | Endpoint | Purpose | Required Auth | Request Body / Params | Successful Response | Common Error Codes |
|---|---|---|---|---|---|---|
| `POST` | `/api/auth/register` | Register new student account | None (Public) | `{ name, email, studentId, department, password }` | `201 Created` + `{ user, token }` | `400` (Validation / Duplicate) |
| `POST` | `/api/auth/login` | Authenticate student | None (Public) | `{ email, password }` | `200 OK` + `{ user, token }` | `401` (Invalid credentials) |
| `GET` | `/api/auth/me` | Restore user session from token | Required (JWT) | None (Reads cookie or Bearer header) | `200 OK` + `{ user }` | `401` (Expired / Missing token) |
| `POST` | `/api/auth/logout` | Clear auth cookie | None | None | `200 OK` + `{ success: true }` | None |
| `GET` | `/api/auctions` | List & search auctions | None (Public) | Query: `keyword`, `category`, `condition`, `sortBy` | `200 OK` + `[ auctions ]` | `500` (Server error) |
| `GET` | `/api/auctions/:id` | Get single auction details | None (Public) | Params: `id` (Auction ObjectId) | `200 OK` + `{ auction }` | `404` (Not found) |
| `POST` | `/api/auctions` | Create new auction | Required (JWT) | `{ title, category, startingPrice, minIncrement, closingAt, imageUrls, ... }` | `201 Created` + `{ auction }` | `400` (Validation), `401` (Auth) |
| `PUT` | `/api/auctions/:id` | Update draft/active auction | Required (Seller) | `{ title, description, pickupLocation }` | `200 OK` + `{ auction }` | `403` (Not owner), `400` (Bids started) |
| `DELETE`| `/api/auctions/:id` | Cancel auction | Required (Seller) | Params: `id` | `200 OK` + `{ message: 'Cancelled' }` | `403` (Not owner), `400` (Has bids) |
| `POST` | `/api/auctions/:id/bids` | Submit competitive bid | Required (Buyer) | `{ amount: Number }` | `201 Created` + `{ bid, currentPrice }` | `400` (Below min / Owner / Expired) |
| `GET` | `/api/auctions/:id/bids` | Get public bid history | None (Public) | Params: `id` | `200 OK` + `[ bids ]` (Anonymized) | `404` (Not found) |
| `POST` | `/api/auctions/:id/questions`| Post question to seller | Required (Buyer)| `{ question: String }` | `201 Created` + `{ questions }` | `400` (Empty text) |
| `POST` | `/api/upload` | Upload item images to disk | Required (JWT) | `multipart/form-data` with field `images` (max 5) | `200 OK` + `{ imageUrls: [...] }` | `400` (Type/Size/Count) |
| `GET` | `/api/transactions` | Get user sales & purchases | Required (JWT) | Query: `role=seller` or `role=buyer` | `200 OK` + `[ transactions ]` | `401` (Auth) |
| `GET` | `/api/transactions/:id` | Get single transaction | Required (Party)| Params: `id` | `200 OK` + `{ transaction }` | `403` (Not seller/buyer) |
| `POST` | `/api/transactions/:id/decision`| Approve or reject bid | Required (Seller)| `{ decision: 'approved' \| 'rejected' }` | `200 OK` + `{ transaction }` | `403` (Not seller), `400` (State) |
| `POST` | `/api/transactions/:id/payment` | Select payment method | Required (Buyer)| `{ method: 'COD' \| 'UPI' }` | `200 OK` + `{ transaction }` | `403` (Not buyer) |
| `POST` | `/api/transactions/:id/handover`| Confirm campus handover | Required (Party)| `{ action: 'confirm' }` | `200 OK` + `{ transaction }` | `400` (Already confirmed) |
| `GET` | `/api/notifications` | Get user notifications | Required (JWT) | None | `200 OK` + `[ notifications ]` | `401` (Auth) |
| `PUT` | `/api/notifications/:id/read` | Mark notification as read | Required (Owner)| Params: `id` | `200 OK` + `{ success: true }` | `404` (Not found) |

---

### Socket.IO Event Specifications

| Event Name | Direction | Payload | Trigger Condition |
|---|---|---|---|
| `join:auction` | Client -> Server | `auctionId: String` | User opens `/auctions/:id` page |
| `leave:auction` | Client -> Server | `auctionId: String` | User navigates away from `/auctions/:id` |
| `auction:bid` | Server -> Room | `{ auctionId, currentPrice, bidsCount, leadingBid }` | Accepted bid updates auction price |
| `auction:extended` | Server -> Room | `{ auctionId, closingAt, antiSnipingExtensions }` | Anti-sniping rule triggers extension (+60s) |
| `auction:closed` | Server -> Room | `{ auctionId, status, finalPrice, winner }` | Auction reaches deadline and closes |
| `notification:new` | Server -> Client | `{ id, type, message, auctionId, createdAt }` | User outbid, bid approved, or item ready |

---

## 8. Database Schema & Data Model Specifications

### Data Relationships & ERD
```
   +-------------------+              1 : N             +-------------------+
   |       User        |------------------------------->|      Auction      |
   |-------------------|                                |-------------------|
   | _id               |                                | _id               |
   | studentId (unique)|                                | seller (ref: User)|
   | email (unique)    |                                | currentPrice      |
   | password (hashed) |                                | closingAt         |
   +-------------------+                                +-------------------+
             |                                                    |
             | 1:N                                                | 1:N
             v                                                    v
   +-------------------+                                +-------------------+
   |       Bid         |                                |    Transaction    |
   |-------------------|                                |-------------------|
   | _id               |                                | _id               |
   | auction (ref)     |                                | auction (ref)     |
   | bidder (ref: User)|                                | seller (ref: User)|
   | amount            |                                | buyer (ref: User) |
   | timestamp         |                                | payment (COD/UPI) |
   +-------------------+                                +-------------------+
```

---

### Mongoose Schemas Breakdown

#### 1. User Model (`server/src/models/User.js`)
- `name`: `{ type: String, required: true, trim: true }`
- `email`: `{ type: String, required: true, unique: true, lowercase: true, trim: true }`
- `studentId`: `{ type: String, required: true, unique: true, uppercase: true, match: /^\d{2}[A-Z]{2,4}\d{3,4}$/ }`
- `department`: `{ type: String, required: true, trim: true }`
- `password`: `{ type: String, required: true, minlength: 6, select: false }` *(Hidden from queries by default for safety)*
- `role`: `{ type: String, enum: ['student', 'admin'], default: 'student' }`
- `timestamps`: `true` (`createdAt`, `updatedAt`)

#### 2. Auction Model (`server/src/models/Auction.js`)
- `title`: `{ type: String, required: true, trim: true, maxlength: 100 }`
- `description`: `{ type: String, required: true, maxlength: 2000 }`
- `category`: `{ type: String, required: true, enum: ['Textbooks', 'Electronics', 'Furniture', 'Bicycles', 'Notes', 'Accessories', 'Other'] }`
- `condition`: `{ type: String, required: true, enum: ['Brand New', 'Like New', 'Good', 'Fair', 'Poor'] }`
- `startingPrice`: `{ type: Number, required: true, min: 1 }`
- `minIncrement`: `{ type: Number, default: 10, min: 1 }`
- `currentPrice`: `{ type: Number, required: true }`
- `closingAt`: `{ type: Date, required: true, index: true }`
- `seller`: `{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }`
- `sellerName`: `{ type: String }`
- `sellerDepartment`: `{ type: String }`
- `sellerRoll`: `{ type: String }`
- `pickupLocation`: `{ type: String, required: true }`
- `imageUrls`: `[{ type: String }]` *(Array of disk paths, max 5)*
- `status`: `{ type: String, enum: ['active', 'pending_approval', 'completed', 'unsold', 'cancelled'], default: 'active', index: true }`
- `bidsCount`: `{ type: Number, default: 0 }`
- `antiSnipingExtensions`: `{ type: Number, default: 0 }`
- `questions`: `[{ user: String, roll: String, question: String, answer: String, createdAt: Date }]`

#### 3. Bid Model (`server/src/models/Bid.js`)
- `auction`: `{ type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true, index: true }`
- `bidder`: `{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }`
- `amount`: `{ type: Number, required: true, min: 1 }`
- `timestamp`: `{ type: Date, default: Date.now }`
- `isWinning`: `{ type: Boolean, default: false }`

#### 4. Transaction Model (`server/src/models/Transaction.js`)
- `auction`: `{ type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true, unique: true }`
- `seller`: `{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }`
- `buyer`: `{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }`
- `finalPrice`: `{ type: Number, required: true }`
- `status`: `{ type: String, enum: ['pending_seller_approval', 'approved', 'completed', 'rejected', 'failed_pickup', 'cancelled'], default: 'pending_seller_approval' }`
- `sellerDecision`: `{ status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }, decidedAt: Date }`
- `payment`: `{ method: { type: String, enum: ['COD', 'UPI'], default: 'COD' }, status: { type: String, enum: ['PENDING', 'PAID', 'FAILED', 'CANCELLED'], default: 'PENDING' }, paidAt: Date }`
- `handover`: `{ location: String, sellerConfirmed: { type: Boolean, default: false }, buyerConfirmed: { type: Boolean, default: false }, completedAt: Date }`

#### 5. Notification Model (`server/src/models/Notification.js`)
- `recipient`: `{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }`
- `sender`: `{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }`
- `type`: `{ type: String, enum: ['OUTBID', 'AUCTION_WON', 'SELLER_APPROVED', 'SELLER_REJECTED', 'PAYMENT_CONFIRMED', 'HANDOVER_COMPLETED', 'GENERAL'], required: true }`
- `message`: `{ type: String, required: true }`
- `auction`: `{ type: mongoose.Schema.Types.ObjectId, ref: 'Auction' }`
- `read`: `{ type: Boolean, default: false }`

---

## 9. Security, Privacy, and Authorization Mechanisms

1. **Password Hashing with Salt Rounds (`server/src/routes/auth.js`)**:
   Passwords are never stored in plaintext. They are processed using `bcrypt.hash(password, 10)` before writing to MongoDB. Salt generation protects against rainbow table lookups.
2. **Schema Credential Isolation (`server/src/models/User.js`)**:
   The password field includes `select: false`. Standard database queries (`User.find()`, `Auction.populate('seller')`) omit the password hash from results, eliminating accidental password leakage in JSON responses.
3. **Stateless JWT with Dual Transport**:
   Tokens are signed with `process.env.JWT_SECRET` and a 7-day expiration. The server sets an `HttpOnly`, `SameSite: 'Lax'` cookie to prevent Cross-Site Scripting (XSS) token theft, while also accepting `Authorization: Bearer <token>` headers for flexibility.
4. **Authoritative Backend Ownership Guards**:
   Before modifying an auction (`PUT /api/auctions/:id` or `DELETE`), the backend verifies `auction.seller.toString() === req.user.id`. Unauthorized modification attempts return `403 Forbidden`.
5. **Bid Anonymization for Student Privacy**:
   When public bid histories are retrieved (`GET /api/auctions/:id/bids`), bidder emails and database IDs are stripped. Only the student's initials/masked ID (e.g., `21***045`) and timestamp are returned.
6. **Self-Bidding Prevention**:
   The backend explicitly checks `if (auction.seller.toString() === req.user.id)` and rejects self-bids with `400 Bad Request`, preventing sellers from artificially inflating prices.
7. **Cross-Origin Resource Sharing (CORS) Restriction**:
   `server/src/index.js` restricts cross-origin access exclusively to `http://localhost:5173` with `credentials: true`.
8. **File Upload Security (`server/src/middleware/upload.js`)**:
   Multer restricts uploads to image MIME types only (`jpeg`, `png`, `webp`) and enforces a 5MB per-file size cap and 5-file maximum count, preventing executable uploads or denial-of-service storage exhaustion.

---

## 10. Automated Testing & Manual Verification Guide

### Test Suite Summary (All Tests Passing 100%)
The repository includes 9 standalone automated test suites running against the live backend API and MongoDB:

| Test Script Name | Purpose & Verification Scope | Test Result |
|---|---|---|
| `test-module4.js` | Listings CRUD, category filters, condition filters, sorting, seller authorization guards. | **30/30 PASSED** |
| `test-module5.js` | Bidding engine: first bid >= start price, minimum increment enforcement, seller self-bid rejection, concurrent bid safety. | **36/36 PASSED** |
| `test-module6.js` | Server-authoritative lifecycle: countdown derivation, closing due auctions, anti-sniping (+60s on bid <30s), unsold outcome. | **26/26 PASSED** |
| `test-module7.js` | Seller decision workflow: approving/rejecting winning bids, handover confirmations, dual-party verification. | **11/11 PASSED** |
| `test-custom-closing.js` | Custom closing date & time validation: future date requirement, past date rejection, persistence as MongoDB Date. | **8/8 PASSED** |
| `test-payment-workflow.js` | Post-approval payment: COD pending state, UPI demo verification, paid status on handover. | **12/12 PASSED** |
| `test-image-upload.js` | Multi-image device upload: multipart parsing, disk storage, MIME verification, 5-image cap. | **25/25 PASSED** |
| `test-search-feature.js` | Search UI integration: search button click, Enter key submission, preservation of active filters. | **13/13 PASSED** |
| `test-search-complete.js` | Comprehensive multi-term search: multi-word stemming, whitespace tolerance, case-insensitivity, category fallback. | **29/29 PASSED** |

### Executing Tests
```bash
# In server directory:
node test-search-complete.js
node test-image-upload.js
node test-payment-workflow.js
node test-custom-closing.js
node test-module7.js
node test-module6.js
node test-module5.js
node test-module4.js
```

### Manual Verification Guide
- **Inspecting MongoDB via MongoDB Compass**:
  1. Open Compass, connect to `mongodb://127.0.0.1:27017`.
  2. Select `campus-auction` database.
  3. Inspect `auctions` collection: observe `closingAt` ISODate format, `currentPrice`, and `imageUrls`.
  4. Inspect `bids` collection: confirm `amount`, `bidder`, and `timestamp` fields.
  5. Inspect `transactions` collection: check `sellerDecision.status` and `payment.method`.
- **Inspecting Network in Browser DevTools (F12)**:
  1. Open **Network** tab, filter by `Fetch/XHR`.
  2. Submit a search: inspect `GET /api/auctions?keyword=...` request and JSON response.
  3. Place a bid: inspect `POST /api/auctions/:id/bids` payload and status code `201`.
  4. Switch to **WS** (WebSockets) tab: inspect Socket.IO traffic frames (`42["auction:bid", ...]`).

---

## 11. Configuration, Build Pipeline, and Git Version Control

### Scripts Breakdown
- Root `package.json`:
  - `"npm run client"`: Runs `npm --prefix client run dev` (Vite dev server on port 5173).
  - `"npm run server"`: Runs `npm --prefix server run dev` (Nodemon server on port 5000).
  - `"npm run client:build"`: Runs `npm --prefix client run build` (Compiles React app to `client/dist/`).
- Client `package.json`:
  - `"dev"`: `vite`
  - `"build"`: `vite build`
- Server `package.json`:
  - `"dev"`: `nodemon src/index.js`
  - `"start"`: `node src/index.js`

### Vite Proxy Configuration (`client/vite.config.js`)
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
```

---

## 12. Code Navigation Guide for Technical Interviews

| Question | Exact File Path | Line Range | Key Symbol / Code Construct |
|---|---|---|---|
| Where does React mount to the DOM? | `client/src/main.jsx` | L1 - L10 | `createRoot(document.getElementById('root'))` |
| Where is the router declared? | `client/src/App.jsx` | L30 - L55 | `<BrowserRouter><Routes>` |
| Where is the AuthContext provider? | `client/src/context/AuthContext.jsx` | L12 - L80 | `export function AuthProvider({ children })` |
| Where is the search button wired up? | `client/src/pages/Home.jsx` | L60 - L95 | `handleSearchSubmit`, `handleKeyDown` |
| Where are device image files handled? | `client/src/pages/CreateListing.jsx` | L100 - L145 | `handleImageChange`, `URL.createObjectURL` |
| Where is the live bid submission handler? | `client/src/pages/AuctionDetails.jsx` | L150 - L190 | `handleBidSubmit = async (e)` |
| Where does the seller approve a bid? | `client/src/pages/Dashboard.jsx` | L210 - L240 | `handleSellerDecision(id, 'approved')` |
| Where is payment selected? | `client/src/pages/PaymentConfirmation.jsx` | L85 - L120 | `handlePaymentSubmit`, `api.selectPaymentMethod` |
| Where is the Express app created? | `server/src/index.js` | L15 - L30 | `const app = express()`, `http.createServer(app)` |
| Where is the JWT authentication middleware? | `server/src/middleware/auth.js` | L8 - L35 | `export const authenticateToken = (req, res, next)` |
| Where is password hashing performed? | `server/src/routes/auth.js` | L30 - L45 | `bcrypt.hash(password, 10)` |
| Where is the 30s anti-sniping rule? | `server/src/routes/auctions.js` | L230 - L260 | `if (timeRemaining <= 30000)` |
| Where does the auto-close scheduler run? | `server/src/services/auctionLifecycle.js` | L20 - L80 | `closeExpiredAuctions = async ()` |
| Where is Multer storage configured? | `server/src/middleware/upload.js` | L8 - L30 | `multer.diskStorage({...})` |

---

## 13. File-by-File Source Code Appendix with Line-by-Line Excerpts

### Excerpt 1: Anti-Sniping Engine (`server/src/routes/auctions.js`)
```javascript
// Check anti-sniping: if bid arrives in the final 30 seconds, extend closing time by 60 seconds
const now = Date.now();
const closingTime = new Date(auction.closingAt).getTime();
const timeRemaining = closingTime - now;

if (timeRemaining > 0 && timeRemaining <= 30000) {
  // Extend closing time to 60 seconds from right now
  auction.closingAt = new Date(now + 60000);
  auction.antiSnipingExtensions = (auction.antiSnipingExtensions || 0) + 1;
  
  // Notify all connected clients in the room about the extension
  broadcastToAuctionRoom(auction._id, 'auction:extended', {
    closingAt: auction.closingAt,
    antiSnipingExtensions: auction.antiSnipingExtensions,
    message: 'Auction extended by 60 seconds due to late bid!'
  });
}
```
**Line-by-Line Beginner Explanation**:
1. `const now = Date.now()`: Fetches the authoritative current timestamp from the server clock.
2. `const closingTime = new Date(auction.closingAt).getTime()`: Converts the MongoDB auction deadline into epoch milliseconds.
3. `const timeRemaining = closingTime - now`: Subtracts server time from the deadline to find milliseconds left.
4. `if (timeRemaining > 0 && timeRemaining <= 30000)`: Checks if the auction is still active and has 30 seconds or less remaining.
5. `auction.closingAt = new Date(now + 60000)`: Sets the new deadline to 60 seconds in the future.
6. `broadcastToAuctionRoom(...)`: Pushes the new deadline across Socket.IO so all users see their countdown clocks jump forward immediately.

---

### Excerpt 2: Multi-Term Keyword Search Parser (`server/src/routes/auctions.js`)
```javascript
if (keyword && keyword.trim()) {
  const words = keyword.trim().split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    const wordQueries = words.map(word => {
      const escaped = escapeRegex(word);
      const regex = new RegExp(escaped, 'i');
      return {
        $or: [
          { title: regex },
          { description: regex },
          { category: regex }
        ]
      };
    });
    query.$and = wordQueries;
  }
}
```
**Line-by-Line Beginner Explanation**:
1. `split(/\s+/)`: Splits a search phrase like `"engineering mechanics"` on spaces into distinct terms `['engineering', 'mechanics']`.
2. `escapeRegex(word)`: Sanitizes special characters (e.g., `+`, `*`, `?`) to prevent regex injection crashes.
3. `new RegExp(escaped, 'i')`: Creates a case-insensitive regular expression for each term.
4. `query.$and = wordQueries`: Tells MongoDB that *every* term must match either in `title`, `description`, or `category`. This guarantees that `"mechanics engineering"` returns the same result as `"engineering mechanics"`.

---

## 14. Comprehensive Technical Interview & Hackathon Jury Question Bank (50+ Q&A)

### Category 1: Project Purpose & Architecture
1. **Q: What problem does Handover solve that OLX or WhatsApp groups do not?**
   *A:* Campus communities require trust, localized pickup, and fair student pricing. WhatsApp groups suffer from message noise, lack price discovery, and have no deadline enforcement. OLX exposes students to unknown external individuals. Handover restricts participation to verified campus roll numbers, provides a dynamic bidding engine with anti-sniping protection, and manages on-campus physical handovers.
2. **Q: Walk me through the high-level architecture of Handover.**
   *A:* Handover follows the MERN stack with Socket.IO. The client is a React 19 SPA built with Vite and React Router v7. It communicates with an Express 4 REST API running on Node.js. Persistent records are stored in MongoDB via Mongoose 9. Real-time events (bids, clock extensions) stream over full-duplex WebSockets using Socket.IO.
3. **Q: Why did you choose MongoDB over a relational database like PostgreSQL?**
   *A:* Handover listings feature semi-structured, nested data such as image URL arrays, dynamic questions/answers, and flexible handover notes. MongoDB's document model allows storing and querying this data cleanly within single documents without multi-table joins.
4. **Q: Why did you use React Context instead of Redux?**
   *A:* For our state management needs (primarily user authentication and session persistence), React Context combined with local component state provides a clean solution without the boilerplate overhead of Redux reducers, actions, and store configuration.
5. **Q: What is the difference between Node.js and Express.js?**
   *A:* Node.js is the runtime environment that executes JavaScript on the server. Express.js is a minimal web framework built on Node.js that provides HTTP routing, middleware handling, and JSON response formatting.

### Category 2: Frontend & React Mechanics
6. **Q: Show me the exact code executed when you click the "Search" button.**
   *A:* In `client/src/pages/Home.jsx`, the button triggers `handleSearchSubmit(e)`, which executes `e.preventDefault()`, reads the `searchQuery` state, and calls `fetchAuctions(searchQuery, selectedCategory, selectedCondition, sortBy)`. This constructs a query string and calls `api.getAuctions(params)`.
7. **Q: What happens if a user presses "Enter" in the search bar?**
   *A:* The `<input>` has an `onKeyDown={handleKeyDown}` listener. When `e.key === 'Enter'`, it calls the exact same `handleSearchSubmit(e)` function, ensuring identical behavior between button clicks and keyboard submission.
8. **Q: How does `ProtectedRoute.jsx` prevent unauthorized page access?**
   *A:* It reads `const { user, loading } = useAuth()`. If `loading` is true, it renders `<LoadingSpinner />`. If `!user`, it returns `<Navigate to="/auth" state={{ from: location }} replace />`, saving the attempted URL so the user can be redirected back after logging in.
9. **Q: Where is local state used versus global state in the frontend?**
   *A:* Global state (`AuthContext`) manages user identity, auth tokens, and login/logout methods. Local state (`useState`) handles page-specific concerns like form fields, active filter chips, modal open/close states, and live countdown timers.
10. **Q: How does `CountdownBadge.jsx` keep time synchronized without lagging?**
    *A:* It uses a `useEffect` hook running a `setInterval` every 1000ms. On each tick, it recalculates the delta: `new Date(closingAt).getTime() - Date.now()`. Because it compares against the absolute target timestamp rather than decrementing a local counter, it never drifts out of sync.

### Category 3: Authentication & Security
11. **Q: How are user passwords secured in your application?**
    *A:* In `server/src/routes/auth.js`, passwords are hashed using `bcrypt.hash(password, 10)` before insertion into MongoDB. On login, `bcrypt.compare()` compares the plaintext candidate against the stored hash. The `User` schema marks `password: { select: false }` to prevent hashes from leaking in database queries.
12. **Q: What is stored inside the JWT, and how is it verified?**
    *A:* The JWT payload contains `{ id: user._id, email: user.email, department: user.department }`. It is signed with `process.env.JWT_SECRET`. The backend middleware `authenticateToken` in `server/src/middleware/auth.js` verifies the signature using `jwt.verify()`.
13. **Q: Why does the backend use both an HttpOnly cookie and an Authorization header?**
    *A:* The HttpOnly cookie provides browser security by being inaccessible to client-side JavaScript, protecting against XSS attacks. The `Authorization: Bearer <token>` header provides compatibility for API testing scripts, mobile clients, and environments where cookies may be restricted.
14. **Q: What prevents a student from editing someone else's listing?**
    *A:* In `server/src/routes/auctions.js`, the update and delete handlers check:
    `if (auction.seller.toString() !== req.user.id) return res.status(403).json({ message: 'Unauthorized' })`. Authorization is enforced on the server.
15. **Q: How do you prevent self-bidding?**
    *A:* In `POST /api/auctions/:id/bids`, the backend verifies `if (auction.seller.toString() === req.user.id) return res.status(400).json({ message: 'Sellers cannot bid on their own auctions' })`.

### Category 4: Bidding Engine & Anti-Sniping
16. **Q: What is the anti-sniping rule and how is it implemented?**
    *A:* If a valid bid is placed within the final 30 seconds of an auction, the deadline is automatically extended to 60 seconds from the bid timestamp:
    `if (timeRemaining <= 30000) { auction.closingAt = new Date(Date.now() + 60000); }`. The server then emits `auction:extended` via Socket.IO to update all clients in real time.
17. **Q: What happens if two students place a bid at the exact same millisecond?**
    *A:* In MongoDB, document updates are serialized at the document lock level. When a bid arrives, the server checks whether the bid amount is strictly greater than `currentPrice + minIncrement`. The first bid to acquire the update lock raises `currentPrice`. The second bid's validation check fails because the price has already increased, returning a 400 error asking the second bidder to refresh and increase their bid.
18. **Q: What validation rules exist for placing a bid?**
    *A:*
    1. User must be authenticated (`req.user`).
    2. User cannot be the auction's seller.
    3. Auction status must be `'active'`.
    4. Server time must be before `closingAt`.
    5. First bid must be `>= startingPrice`.
    6. Subsequent bids must be `>= currentPrice + minIncrement`.
19. **Q: What happens when an auction reaches its deadline with zero bids?**
    *A:* The background scheduler (`auctionLifecycle.js`) evaluates the auction, finds no associated bids in the `Bid` collection, sets `auction.status = 'unsold'`, and notifies the seller that the listing expired without bids.
20. **Q: Why not rely on the client browser timer to trigger auction closing?**
    *A:* Client timers can be manipulated by altering the system clock, paused by background tabs, or closed entirely. The server must remain the single source of truth for auction deadlines and closing operations.

### Category 5: Auction Lifecycle & Handover Workflow
21. **Q: Explain the role of the background scheduler in `auctionLifecycle.js`.**
    *A:* The scheduler runs `setInterval(closeExpiredAuctions, 3000)`. Every 3 seconds, it queries for active auctions whose `closingAt <= new Date()`. It updates their status, assigns provisional winners, and creates `Transaction` records idempotently.
22. **Q: Does winning an auction mean the item is immediately sold?**
    *A:* No. The winning bidder is a *provisional winner*. The auction enters `pending_approval` status. The seller must review the final price and explicitly click "Approve" or "Reject" on their dashboard.
23. **Q: What happens after the seller approves the winning bid?**
    *A:* The transaction moves to `approved` status. The item is reserved for the buyer, and the buyer receives a notification with a link to `/payment-confirmation/:transactionId` to choose between COD and UPI.
24. **Q: How does Cash on Delivery (COD) work in campus handover?**
    *A:* The buyer selects COD, and the payment status remains `PENDING`. When the students meet at the campus pickup location, cash is handed over. Once both parties confirm the handover in their dashboards, the payment status updates to `PAID` and the transaction marks as `completed`.
25. **Q: How does the dual-party handover confirmation work?**
    *A:* The `Transaction` schema contains `handover.sellerConfirmed` and `handover.buyerConfirmed`. When the seller confirms, their flag becomes `true`. When the buyer confirms, their flag becomes `true`. Only when both flags are `true` does the transaction finalize to `completed`.

### Category 6: Image Uploads & File Handling
26. **Q: How do image uploads work from the user's computer to the server?**
    *A:* The user selects files via `<input type="file" multiple />`. On the frontend, `CreateListing.jsx` validates format and count, then sends a `multipart/form-data` payload to `POST /api/upload`. On the backend, `upload.js` uses Multer disk storage to write files to `server/uploads/` with unique timestamped filenames and returns the relative paths.
27. **Q: What file formats are supported for item photos?**
    *A:* JPG, JPEG, PNG, and WEBP. Multer's `fileFilter` rejects all other MIME types.
28. **Q: How are static image files served to the browser?**
    *A:* `server/src/index.js` includes `app.use('/uploads', express.static(path.join(__dirname, '../uploads')))`. The frontend accesses images via `http://localhost:5000/uploads/<filename>`.
29. **Q: How does the client preview images before uploading?**
    *A:* `CreateListing.jsx` calls `URL.createObjectURL(file)` on each selected `File` object. This generates an internal browser blob URL (e.g., `blob:http://localhost:5173/...`) for rendering in an `<img>` tag without uploading to the server first.
30. **Q: What happens if a user removes an image preview before submitting?**
    *A:* The component removes the file from the `imageFiles` state array and the preview URL from `imagePreviews`, revoking the object URL via `URL.revokeObjectURL(url)` to free browser memory.

### Category 7: Database Design & Mongoose
31. **Q: What indexes exist in your MongoDB schemas, and why?**
    *A:*
    - `User.email` & `User.studentId`: Unique indexes for fast lookup and duplicate prevention.
    - `Auction.closingAt`: Indexed because the background lifecycle scheduler queries this field every 3 seconds (`{ closingAt: { $lte: new Date() } }`).
    - `Auction.status`: Indexed for efficient filtering of active marketplace listings.
    - `Bid.auction`: Indexed for fast retrieval of an auction's bid history.
32. **Q: What is the relationship between the Auction and Bid models?**
    *A:* A one-to-many relationship. The `Bid` model contains `auction: { type: ObjectId, ref: 'Auction' }`. The `Auction` model caches `currentPrice` and `bidsCount` for fast catalog reads without running aggregation queries on every card render.
33. **Q: Why is there a separate `Transaction` collection instead of storing sale data inside `Auction`?**
    *A:* Separating concerns: `Auction` manages the public bidding phase (prices, anti-sniping, timers). `Transaction` manages post-auction fulfillment (seller decisions, buyer payments, campus handover confirmations, dispute handling).
34. **Q: What does Mongoose's `.populate()` do in your project?**
    *A:* It performs a document reference lookup similar to a SQL join. For example, `Transaction.findById(id).populate('seller', 'name email department')` replaces the seller's `ObjectId` with their actual user details from the `users` collection.
35. **Q: How do you handle database disconnection errors?**
    *A:* In `server/src/config/db.js`, `mongoose.connect()` is wrapped in a `try/catch` block. If connection fails, it logs diagnostic details and calls `process.exit(1)`, allowing process orchestrators (like Docker or systemd) to restart the service cleanly.

### Category 8: Real-Time WebSockets with Socket.IO
36. **Q: Why use Socket.IO rooms instead of broadcasting to all connected users?**
    *A:* When a student opens `/auctions/:id`, their socket joins the room `auction:<id>`. When a bid is placed on that item, the server broadcasts only to that room: `io.to(`auction:${id}`).emit('auction:bid', data)`. This prevents flooding unrelated users with irrelevant bid traffic.
37. **Q: What happens if a user's network temporarily disconnects?**
    *A:* Socket.IO client includes automatic reconnection logic. Upon reconnecting, it rejoins the auction room and receives the latest state. The client also executes an initial HTTP fetch on mount to ensure fresh state.
38. **Q: What is the difference between `socket.emit` and `io.emit`?**
    *A:* `socket.emit` sends an event exclusively to the specific client that initiated the connection. `io.emit` broadcasts the event to every connected client across the entire server.

### Category 9: HTTP, REST, and Middleware
39. **Q: What HTTP status codes does your backend return, and when?**
    *A:*
    - `200 OK`: Successful read or update (`GET`, `PUT`).
    - `201 Created`: Successful resource creation (`POST /register`, `POST /bids`, `POST /auctions`).
    - `400 Bad Request`: Validation failure, duplicate record, or illegal bid amount.
    - `401 Unauthorized`: Missing or invalid JWT authentication token.
    - `403 Forbidden`: Authenticated user lacks permission (e.g., non-seller editing auction).
    - `404 Not Found`: Target resource does not exist.
    - `500 Internal Server Error`: Unhandled server exception.
40. **Q: What does Express middleware do in your application?**
    *A:* Middleware functions intercept incoming requests before they reach route handlers. For example, `authenticateToken` checks credentials, attaches `req.user`, and calls `next()`. If authentication fails, it terminates the request immediately with a 401 response.
41. **Q: What is the purpose of `cookie-parser`?**
    *A:* Express does not parse the `Cookie` HTTP header by default. `cookie-parser` parses the raw header string into an accessible JavaScript object on `req.cookies`.

### Category 10: Debugging, Limitations, and Edge Cases
42. **Q: How would you debug an issue where search returns "No auctions match"?**
    *A:*
    1. Check browser Network tab to verify the exact query string sent in `GET /api/auctions?keyword=...`.
    2. Inspect server console logs to check the parsed words array and regex query.
    3. Check MongoDB directly to confirm whether matching active listings exist with valid future deadlines.
43. **Q: Why did seeded listings previously expire and disappear from search?**
    *A:* Seeded items initially had short test deadlines (25–45 minutes) that expired into `'unsold'` status, making them ineligible for the active marketplace. We resolved this by configuring `seed.js` to set deadlines 4 to 7 days in the future.
44. **Q: What happens if a seller tries to approve a bid on an auction that is already completed?**
    *A:* In `server/src/routes/transactions.js`, the decision endpoint checks: `if (transaction.status !== 'pending_seller_approval') return res.status(400).json({ message: 'Decision already recorded' })`. State machine transitions are strictly one-way.
45. **Q: How does the application handle student graduation roll number formats?**
    *A:* In `server/src/models/User.js`, the `studentId` field validates against the regex `/^\d{2}[A-Z]{2,4}\d{3,4}$/i`. For example, `21CS045` (Year 21, Computer Science, Roll 045) passes, while arbitrary strings are rejected.
46. **Q: What parts of the application currently use mock data or client-only state?**
    *A:* `SavedSearches.jsx` manages saved search queries in local component memory using `MOCK_SAVED_SEARCHES`. `AIAssistant.jsx` uses client-side keyword heuristics to simulate pricing advice. All other core workflows (Auth, Auctions, Bidding, Uploads, Transactions, Notifications) are fully integrated with the Express backend and MongoDB.
47. **Q: What would you improve in Handover before scaling to 100,000 students?**
    *A:*
    1. Replace single-server Socket.IO with a Redis Pub/Sub adapter to allow horizontal scaling across multiple Node.js instances.
    2. Migrate local disk image storage (`server/uploads/`) to cloud object storage (e.g., AWS S3 or Cloudinary) with a CDN.
    3. Integrate a real UPI payment gateway webhook (e.g., Razorpay) to replace the demo UPI flow.
    4. Implement MongoDB distributed transactions (`session.withTransaction`) for concurrent bid operations under extreme scale.
48. **Q: How would you explain Handover to a hackathon jury in 60 seconds?**
    *A:* *"Handover is a secure, campus-restricted auction marketplace that solves the end-of-semester student turnover problem. Instead of chaotic WhatsApp chats or risky classifieds, students trade books, electronics, and dorm essentials through dynamic auctions with anti-sniping protection. We enforce university roll numbers, protect buyers with a seller-approval workflow, support Cash on Delivery and UPI, and verify on-campus handovers. Everything is backed by React 19, Express, MongoDB, and real-time WebSockets."*
49. **Q: What did building Handover teach you about full-stack development?**
    *A:* *"It taught me that frontend validation is only for user experience—the backend must always enforce business rules authoritatively. It also taught me how to handle asynchronous race conditions, manage real-time WebSocket state, design secure database schemas, and build end-to-end multi-step transaction workflows."*
50. **Q: If an interviewer asks you to navigate to the exact file where auction deadlines are extended, which file do you open?**
    *A:* Open `server/src/routes/auctions.js`, navigate to the `POST /:id/bids` endpoint, and show the anti-sniping block where `timeRemaining <= 30000` extends `auction.closingAt` by 60,000 milliseconds.

---

### End of Documentation
*Document generated and verified against the Handover — Campus Auction Platform source code.*

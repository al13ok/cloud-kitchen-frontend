# Cloud Kitchen - Frontend Application Documentation



---

## 🏗️ Frontend Directory Structure

The project is structured to separate the **User Interface (UI)** from the **Application Logic**.

### 📁 Root Directory
```
├── public/                 # Static assets (images, fonts, icons)
├── src/                    # Main application source code
├── .env.local              # Local environment variables
├── next.config.ts          # Next.js configuration
├── package.json            # Dependencies and scripts
└── tailwind.config.ts      # Tailwind CSS styling configuration
```

### 🎨 UI & Presentation Layer
This layer handles everything the user sees and interacts with.

#### 1. App Router (`src/app/`)
The application uses the Next.js App Router for navigation and page rendering.
```
src/app/
├── (admin)/                    # Protected Dashboard Routes (requires login)
│   ├── (ui-elements)/          # Feature-specific pages
│   │   ├── dashboard/          # Main Analytics Dashboard
│   │   ├── employee/           # HR Employee List & Details
│   │   ├── customer/           # CRM Customer Management
│   │   ├── helpdesk/           # Ticketing System
│   │   └── ...
│   └── layout.tsx              # Admin Layout (Sidebar + Header)
├── (full-width-pages)/         # Public Routes (no sidebar)
│   ├── (auth)/                 # Login, Register, Password Reset
│   └── (error-pages)/          # 404, 500 Pages
├── globals.css                 # Global CSS imports
└── layout.tsx                  # Root application layout
```

#### 2. Component Library (`src/components/`)
Reusable UI building blocks, organized by feature.
```
src/components/
├── auth/                       # Authentication forms (Login, Register)
├── charts/                     # Reusable Chart wrappers (ApexCharts, Recharts)
├── common/                     # Generic UI elements (Buttons, Cards, Modals, Loaders)
├── dashboard/                  # Dashboard-specific widgets (Stats Cards, Recent Activity)
├── ess-portal/                 # Employee Self-Service specific components
├── form/                       # Form controls (Inputs, Selects, DatePickers)
├── header/                     # Top navigation bar components
├── ui/                         # Base atomic components (Alerts, Badge, Avatars)
├── tables/                     # Data tables with sorting/filtering
└── Chatbot/                    # Floating Chatbot widget
```

#### 3. Styles (`src/styles/` & `src/layout/`)
- **src/styles/**: Contains SCSS modules and global theme variables.
- **src/layout/**: Structural components defining the page skeleton (Sidebar, Header wrappers).

---

### 🧠 Application Logic Layer
This layer handles state management, data fetching, and business rules within the frontend.

#### 1. Services (`src/services/`)
Modules that handle API communication and business logic.
```
src/services/
├── AuthService.ts              # Handles Login API, Logout, Token storage
├── NavigationService.ts        # Manages dynamic sidebar menus
├── SessionManager.ts           # Tracks user session and inactivity
├── RouteGuard.ts               # Protects routes based on authentication status
└── ...
```

#### 2. Context & State (`src/context/`)
Global state management using React Context.
```
src/context/
├── AuthContext.tsx             # Global accessible User & Login state
├── SidebarContext.tsx          # Controls Sidebar open/close state
├── ThemeContext.tsx            # Manages Dark/Light mode
└── NotificationContext.tsx     # Global Toast/Alert system
```

#### 3. Utilities (`src/utils/`)
Helper functions for data processing and external libraries.
```
src/utils/
├── api.ts                      # Axios configuration (Interceptors, Headers)
├── cookieUtils.ts              # Browser cookie management
├── roleUtils.ts                # Permissions checking logic
└── validation.ts               # Form validation helpers
```

#### 4. Hooks (`src/hooks/`)
Custom React Hooks for sharing logic between components.
- `useClickOutside`: Detects clicks outside a component.
- `useWindowSize`: Tracks screen dimensions for responsiveness.

---

## 🚀 Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5
- **UI Library**: React 19, Material UI (MUI) v7
- **Styling**: Tailwind CSS 4, SCSS
- **State Management**: React Context API
- **Form Handling**: React Hook Form
- **Data Fetching**: Axios
- **Visualization**: ApexCharts, Recharts
- **Icons**: React Icons, Lucide React

---

## 🛠️ Getting Started

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
# Server runs on http://localhost:3000
```

### Production Build
```bash
npm run build
npm run start
```

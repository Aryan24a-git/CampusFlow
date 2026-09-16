# CampusFlow 🎓⚡

CampusFlow is an AI-powered campus issue resolution and facility management platform. It streamlines the reporting, assignment, and resolution of campus maintenance issues, grievances, and lost & found items through an intelligent, conversational AI interface. 

---

## 🏗️ System Architecture & Tech Stack

CampusFlow is built using a modern, decoupled architecture designed for scalability, real-time sync, and AI integration.

### 1. Frontend Layer
* **Framework**: Next.js 14 (App Router)
* **Language**: TypeScript
* **Styling**: Tailwind CSS
* **Key Features**: 
  * Responsive, mobile-friendly design
  * Role-based dashboards (Student, Maintenance Staff, Faculty, Admin, Dept Head)
  * Real-time UI updates using Supabase Realtime subscriptions
  * Direct-to-bucket secure photo uploads

### 2. Backend API Server
* **Runtime**: Node.js
* **Framework**: Express.js
* **Language**: TypeScript
* **Responsibilities**:
  * Orchestrating AI chat intents and natural language parsing
  * Centralized business logic and role-based access control (RBAC) validations
  * Managing automated ticket creation and assignment routing

### 3. Database Tier
* **Provider**: Supabase (PostgreSQL)
* **Key Features**:
  * Fully relational database schema (Users, Issues, Departments, Locations, Notifications, etc.)
  * Row Level Security (RLS) policies for strict data access isolation
  * Supabase Auth for JWT-based user authentication and session management
  * Supabase Realtime (Postgres Changes) for live queue synchronization

### 4. Vector Engine
* **Technology**: `pgvector` extension (within Supabase PostgreSQL)
* **Use Case**: 
  * Storing embeddings for historical issues and campus knowledge base
  * Powering the AI's Retrieval-Augmented Generation (RAG) to provide instant, verified campus answers
  * Semantic duplicate detection (e.g., detecting if a "broken AC in Room 101" was already reported)

### 5. AI / Foundation Layer
* **Primary Provider**: Groq
* **Model**: `qwen/qwen3.8-27b` (Qwen 27B)
* **Capabilities**:
  * **Intent Classification**: Routing chat messages (e.g., Maintenance Report vs. Emergency Info)
  * **Structured Extraction**: Extracting location, category, severity, and description from natural language
  * **Conversational Interface**: Guiding users to provide missing details (like asking for photo evidence)

### 6. Hosting & Storage
* **Frontend Hosting**: Vercel (Optimized for Next.js)
* **Backend Hosting**: Render / Railway (Node.js environment)
* **Object Storage**: Supabase Storage
  * **Bucket**: `attachments`
  * Used for storing issue evidence photos, staff completion photos, and lost & found item pictures securely.

---

## ✨ Key Features

1. **Conversational Ticketing**: Report issues through a natural chat interface. The AI automatically parses details and categorizes the ticket.
2. **Live Maintenance Queue**: Staff receive instant, real-time updates when new tickets are created—no page refreshes needed.
3. **Photo Evidence Workflow**: Students attach photos of issues, and staff upload completion photos when marking jobs resolved.
4. **Universal Visibility with Strict Actions**: Anyone on campus can view reported issues, but only authorized staff can accept jobs or mark them resolved.
5. **Role-Based Access**: 5 distinct permission levels mapping to tailored dashboards and workflows.
6. **Lost & Found Hub**: AI-assisted registry for reporting and matching lost campus items.
7. **Instant Campus RAG Answers**: Get immediate answers about campus facilities, emergency contacts, or procedures.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Supabase Project (Database, Storage, Auth)
- Groq API Key

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Aryan24a-git/CampusFlow.git
   cd CampusFlow
   ```

2. **Install dependencies:**
   ```bash
   # Frontend
   cd apps/web
   npm install

   # Backend
   cd ../../backend
   npm install
   ```

3. **Set up Environment Variables:**
   * Create a `.env.local` in `apps/web` with your Supabase URL/Anon Key.
   * Create a `.env` in `backend` with your Supabase URL, Service Key, and Groq API Key.

4. **Run the Development Servers:**
   ```bash
   # Start backend
   cd backend
   npm run dev

   # Start frontend
   cd apps/web
   npm run dev
   ```

5. **Access the Application:**
   Navigate to `http://localhost:3000` in your browser. Use the provided demo credentials to explore different roles.

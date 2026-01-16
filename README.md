# DataConductor: Connection Manager

A modern, enterprise-grade Next.js 16 application for managing and orchestrating data pipelines. This platform enables users to connect to various data sources (RSS Feeds, Databases), visually build processing pipelines, and schedule synchronization tasks.

## Key Features

### 🔌 Connection Management
-   **Centralized Dashboard**: Real-time view of all data connections with status monitoring (Active, Paused, Error).
-   **Multi-Source Support**: Built-in support for RSS Feeds, with extensibility for Databases and APIs.
-   **Detail View**: Detailed analytics and history for each connection.
-   **Storage Support**: Save data to local filesystem or **AWS S3**.

### ⚙️ Visual Pipeline Builder
-   **Drag-and-Drop Interface**: Built with [React Flow](https://reactflow.dev/) to visually design data processing flows.
-   **Node Library**:
    -   **Source Trigger**: Automatically attached to the connection source.
    -   **REST API**: Fetch additional data from external APIs.
    -   **Transform JSON**: Powerful data reshaping using **JSONata**. Supports both a simple "Field Mapper" GUI and raw expression editing.
    -   **File Output**: Save processed data to the local filesystem. Supports dynamic filename templating (e.g., `report-{{date}}.json`).
-   **Configuration Panel**: Context-aware side panel for configuring node properties.

### 🔄 Orchestration & Scheduling
-   **Automated Scheduler**: Background scheduler (using `node-cron`) to periodically sync active connections.
-   **Manual Execution**: Trigger syncs and pipeline runs manually from the UI.
-   **Execution Logs**: Track pipeline runs, success/failure status, and detailed error logs.

## Tech Stack

-   **Framework**: Next.js 16 (App Router)
-   **Language**: TypeScript
-   **Database**: PostgreSQL
-   **Access Object**: `node-postgres` (`pg`)
-   **Styling**: CSS Modules (Vanilla CSS, Dark Mode)
-   **State Management**: React Hooks & Context
-   **Pipeline Engine**: Custom graph traversal engine
-   **Libraries**:
    -   `reactflow` (Graph UI)
    -   `jsonata` (JSON Transformation)
    -   `rss-parser` (Feed ingestion)
    -   `node-cron` (Scheduling)

## Getting Started

### Prerequisites
-   Node.js (v18+)
-   PostgreSQL Database

### Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd data-conductor
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Setup**:
    Create a `.env` file in the root directory:
    ```bash
    DATABASE_URL=postgresql://user:password@localhost:5432/data_expert
    PIPELINE_OUTPUT_DIR=data/pipeline_output
    # Optional: Storage Configuration
    STORAGE_TYPE=local # or 's3'
    # Required if STORAGE_TYPE=s3
    AWS_S3_BUCKET=my-data-bucket
    AWS_REGION=us-east-1
    AWS_ACCESS_KEY_ID=...
    AWS_SECRET_ACCESS_KEY=...

    CRON_SCHEDULE="*/15 * * * *" # Default: every minute check
    ```

4.  **Database Migration** (if applicable):
    Ensure your database schema is up to date (schema scripts located in `migrations/`).

5.  **Run Development Server**:
    ```bash
    npm run dev
    ```

6.  **Access the Dashboard**:
    Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                 # Next.js App Router (Pages & API Routes)
│   ├── api/             # Backend API Endpoints (Connections, Pipeline)
│   ├── connections/     # Connection Detail Pages
│   └── page.tsx         # Main Dashboard
├── components/          # React Components
│   ├── pipeline/        # Pipeline Builder (Canvas, Nodes, Sidebar, Config)
│   └── ...              # Shared UI (Header, StatusBadge, etc.)
├── lib/                 # Core Logic
│   ├── pipeline/        # Orchestrator & Node Handlers
│   │   ├── nodes/       # Node implementations (Registry, Processors)
│   │   └── orchestrator.ts # Pipeline Execution Engine
│   ├── db.ts            # Database Client
│   ├── scheduler.ts     # Cron Scheduler
│   └── sync.ts          # Connection Sync Logic
└── types/               # TypeScript Definitions
```

## Usage Guide

1.  **Create a Connection**: Click "Add Connection" on the dashboard, select "RSS Feed", and enter the URL.
2.  **Build a Pipeline**: Go to the Connection Detail page and click "Pipeline".
    -   Drag a **Transform JSON** node to the canvas.
    -   Connect the **Source** to the **Transform** node.
    -   Click the Transform node to map fields (e.g., `title` = `items[0].title`) or write a JSONata expression.
    -   Drag a **File Destination** node and connect it. Configure a filename like `output-{{timestamp}}.json`.
    -   Click **Save Pipeline**.
3.  **Run**: active connections run automatically. You can also click **Run** on the connection page to trigger immediately.

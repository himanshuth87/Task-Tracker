# Task Tracker

A modern, fast, and secure web application for team-based task management. Built with React, TypeScript, and Supabase.

![Task Tracker Dashboard](public/favicon.svg) <!-- Replace with an actual screenshot of the app -->

## Features

- **Team Management:** Create teams, invite members, and isolate data using strict Row-Level Security (RLS).
- **Task Lifecycle:** Track tasks from `Pending` -> `In Progress` -> `Blocked` -> `Completed`.
- **Daily Updates:** Assignees can easily post daily progress updates directly on their tasks.
- **Advanced Task Details:** Support for Subtasks, File Attachments, and Task Dependencies.
- **Analytics Dashboard:** Visualize team performance, completion rates, and workload distribution.
- **Notifications & Reminders:** Automated email notifications for new assignments and upcoming deadlines via Supabase Edge Functions & Resend.
- **Exporting:** Export task reports to Excel or add individual tasks directly to Outlook/Apple Calendar via `.ics` files.

## Tech Stack

- **Frontend:** React 18, Vite, TypeScript
- **Styling:** Vanilla CSS with custom glass-morphism UI, Framer Motion for animations
- **Icons:** Lucide React
- **Backend & Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth (Email/Password)
- **Email Delivery:** Resend API

## Getting Started

### Prerequisites
- Node.js (v22 or higher recommended)
- A [Supabase](https://supabase.com/) account for the database backend

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/himanshuth87/Task-Tracker.git
   cd Task-Tracker
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

## Database Setup
The application relies on Supabase for data storage. All SQL migrations, tables (tasks, profiles, task_comments, etc.), and Row Level Security (RLS) policies are located in the `supabase/migrations/` folder.

## Deployment
This project is configured to be deployed easily on platforms like Vercel, Netlify, or Render (see `render.yaml`). Ensure your environment variables are correctly set in your deployment environment.

---
*Built by [High Spirit Commercial Ventures Pvt. Ltd.](https://github.com/himanshuth87)*

# Career Compass - Job Application Tracker

A clean, responsive web application to track and manage job applications. It helps you organize your job search, see application statistics, and manage custom options (like categories, job statuses, and tags) all in one place.

## Tech Stack

*   **Frontend Framework:** React 19
*   **Routing & SSR:** TanStack Start (file-based routing with Server-Side Rendering)
*   **State Management & Data Fetching:** TanStack Query (React Query)
*   **Styling:** Tailwind CSS v4 & shadcn/ui
*   **Database & Authentication:** Supabase
*   **Bundler & Dev Server:** Vite
*   **Language:** TypeScript

## Key Features

*   **Dashboard & Statistics:** Real-time counters showing total applications, interviews scheduled, offers received, and rejections.
*   **Job Tracking Table:** Filter, search, and manage roles with details such as company name, job title, salary, status, application date, and notes.
*   **Custom Options Manager:** Manage status options, platforms, and other drop-down categories dynamically.
*   **User Authentication:** Secure user sign-up, sign-in, and password recovery powered by Supabase Auth.
*   **Responsive Layout:** Fits desktop monitors, tablets, and mobile screens.

## Local Setup

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd job-tracker
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env` file in the root directory (based on `.env.example`):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```
Replace the values with your actual Supabase Project URL and Anon Public Key from the Supabase Dashboard (Settings > API).

### 4. Set up the Database Schema
Execute the SQL commands in `supabase/schema.sql` inside your Supabase SQL Editor to set up the necessary tables (`job_applications` and `user_options`) and Row Level Security (RLS) policies.

### 5. Run the development server
```bash
npm run dev
```
Open `http://localhost:8080` in your browser.

## Deployment

### Deploying to Vercel
TanStack Start has native compatibility with Vercel. 
1. Push your code to a GitHub repository.
2. Go to the [Vercel Dashboard](https://vercel.com) and import the repository.
3. Vercel should automatically detect the project framework or use the Vite preset.
4. Add your environment variables (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`) in the Vercel project settings.
5. Deploy!

*Note: Since the project contains Cloudflare configurations (`wrangler.jsonc`), you can also build and deploy it directly to Cloudflare Pages/Workers if desired.*

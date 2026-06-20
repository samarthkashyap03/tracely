import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useJobs, useResumes } from "@/lib/queries";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  TrendingUp,
  Layers,
  PieChartIcon,
  CheckCircle2,
  XCircle,
  Calendar,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/analytics")({
  component: AnalyticsPage,
});

const COLORS = [
  "oklch(0.72 0.18 295)", // primary / violet
  "oklch(0.7 0.14 230)", // info / blue
  "oklch(0.72 0.17 155)", // success / green
  "oklch(0.8 0.16 80)", // warning / yellow
  "oklch(0.62 0.22 25)", // destructive / red
];

function AnalyticsPage() {
  const { user } = useAuth();
  const { data: jobs = [], isLoading: loadingJobs } = useJobs(user?.id);
  const { data: resumes = [], isLoading: loadingResumes } = useResumes(user?.id);
  const isLoading = loadingJobs || loadingResumes;

  // 1. Calculations & KPI metrics
  const stats = React.useMemo(() => {
    const total = jobs.length;
    const interviews = jobs.filter(
      (j) => j.status.toLowerCase() === "interview" || j.status.toLowerCase() === "under process",
    ).length;
    const offers = jobs.filter((j) => j.status.toLowerCase() === "offer").length;
    const rejected = jobs.filter((j) => j.status.toLowerCase() === "rejected").length;

    const interviewRate = total > 0 ? ((interviews / total) * 100).toFixed(0) : "0";
    const successRate = total > 0 ? ((offers / total) * 100).toFixed(0) : "0";

    return { total, interviews, offers, rejected, interviewRate, successRate };
  }, [jobs]);

  // 2. Status Data for Donut Chart
  const statusData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    jobs.forEach((j) => {
      counts[j.status] = (counts[j.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [jobs]);

  // 3. Platform Data for Bar Chart
  const platformData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    jobs.forEach((j) => {
      const plat = j.platform || "Direct / Other";
      counts[plat] = (counts[plat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // top 5 platforms
  }, [jobs]);

  // 4. Cumulative timeline data
  const timelineData = React.useMemo(() => {
    const sortedJobs = [...jobs].sort(
      (a, b) => new Date(a.applied_at).getTime() - new Date(b.applied_at).getTime(),
    );
    const counts: Record<string, number> = {};
    let cumulative = 0;

    const data: { date: string; count: number; cumulative: number }[] = [];

    sortedJobs.forEach((j) => {
      const dateStr = new Date(j.applied_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      counts[dateStr] = (counts[dateStr] || 0) + 1;
    });

    Object.entries(counts).forEach(([date, count]) => {
      cumulative += count;
      data.push({ date, count, cumulative });
    });

    return data;
  }, [jobs]);

  // 5. Top Role by response rate
  const topRoleInfo = React.useMemo(() => {
    const roleStats: Record<string, { total: number; responses: number }> = {};
    const responseStatuses = ["interview", "offer", "under process"];

    jobs.forEach((j) => {
      const role = j.role || "Not Specified";
      if (!roleStats[role]) {
        roleStats[role] = { total: 0, responses: 0 };
      }
      roleStats[role].total += 1;
      if (responseStatuses.includes(j.status.toLowerCase())) {
        roleStats[role].responses += 1;
      }
    });

    let bestRole = "None";
    let maxResponses = -1;
    let totalForBest = 0;

    Object.entries(roleStats).forEach(([role, stats]) => {
      if (stats.responses > maxResponses && stats.responses > 0) {
        bestRole = role;
        maxResponses = stats.responses;
        totalForBest = stats.total;
      }
    });

    return { name: bestRole, responses: maxResponses, total: totalForBest };
  }, [jobs]);

  // 6. Top Resume by response rate
  const topResumeInfo = React.useMemo(() => {
    const resumeStats: Record<string, { total: number; responses: number }> = {};
    const responseStatuses = ["interview", "offer", "under process"];

    jobs.forEach((j) => {
      if (!j.resume_id) return;
      const resume = resumes.find((r) => r.id === j.resume_id);
      const resumeName = resume ? resume.name : "Unknown Resume";

      if (!resumeStats[resumeName]) {
        resumeStats[resumeName] = { total: 0, responses: 0 };
      }
      resumeStats[resumeName].total += 1;
      if (responseStatuses.includes(j.status.toLowerCase())) {
        resumeStats[resumeName].responses += 1;
      }
    });

    let bestResume = "None";
    let maxResponses = -1;
    let totalForBest = 0;

    Object.entries(resumeStats).forEach(([resumeName, stats]) => {
      if (stats.responses > maxResponses && stats.responses > 0) {
        bestResume = resumeName;
        maxResponses = stats.responses;
        totalForBest = stats.total;
      }
    });

    return { name: bestResume, responses: maxResponses, total: totalForBest };
  }, [jobs, resumes]);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] grid place-items-center text-muted-foreground">
        Loading analytics…
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12 text-center space-y-6">
        <div className="grid size-16 place-items-center rounded-2xl bg-accent text-primary mx-auto">
          <BarChart3 className="size-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">No analytics available</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Once you add job applications to your dashboard, we'll generate visual analyses of your
            applications, conversion rates, and trends.
          </p>
        </div>
        <Link
          to="/dashboard"
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Go to Dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <div className="flex items-center gap-2">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mr-2"
        >
          <ChevronLeft className="size-4" /> Back to Dashboard
        </Link>
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Job Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Visual insights and progression tracking for your job search.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/40 border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Applications
            </CardTitle>
            <Calendar className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Submitted in total</p>
          </CardContent>
        </Card>

        <Card className="bg-card/40 border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Interviews Scheduled
            </CardTitle>
            <Layers className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.interviews}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.interviewRate}% interview conversion rate
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/40 border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Offers Received
            </CardTitle>
            <CheckCircle2 className="size-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.offers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.successRate}% offer conversion rate
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/40 border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejections</CardTitle>
            <XCircle className="size-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground mt-1">Closed applications</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Cumulative Timeline */}
        <Card className="md:col-span-2 lg:col-span-2 bg-card/40 border-border/60">
          <CardHeader>
            <CardTitle className="text-md font-semibold flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" /> Cumulative Growth
            </CardTitle>
            <CardDescription>Total applications submitted over time</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.72 0.18 295)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.72 0.18 295)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  stroke="oklch(0.68 0.02 270 / 40%)"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis stroke="oklch(0.68 0.02 270 / 40%)" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(0.2 0.014 270)",
                    borderColor: "oklch(1 0 0 / 8%)",
                  }}
                  labelStyle={{ color: "var(--foreground)" }}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke="oklch(0.72 0.18 295)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCumulative)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution Donut */}
        <Card className="bg-card/40 border-border/60">
          <CardHeader>
            <CardTitle className="text-md font-semibold flex items-center gap-2">
              <PieChartIcon className="size-4 text-primary" /> Status Breakdown
            </CardTitle>
            <CardDescription>Applications by recruitment stage</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] flex flex-col justify-between">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.2 0.014 270)",
                      borderColor: "oklch(1 0 0 / 8%)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Status Legend */}
            <div className="flex flex-wrap gap-2 justify-center text-xs pb-2">
              {statusData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-muted-foreground">
                    {entry.name} ({entry.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Platform Breakdown */}
        <Card className="md:col-span-2 lg:col-span-2 bg-card/40 border-border/60">
          <CardHeader>
            <CardTitle className="text-md font-semibold flex items-center gap-2">
              <BarChart3 className="size-4 text-primary" /> Top Job Platforms
            </CardTitle>
            <CardDescription>Where you applied the most</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platformData} layout="vertical">
                <XAxis
                  type="number"
                  stroke="oklch(0.68 0.02 270 / 40%)"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="oklch(0.68 0.02 270 / 40%)"
                  fontSize={11}
                  width={100}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(0.2 0.014 270)",
                    borderColor: "oklch(1 0 0 / 8%)",
                  }}
                />
                <Bar dataKey="value" fill="oklch(0.72 0.18 295)" radius={[0, 4, 4, 0]}>
                  {platformData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conversion Insights Card */}
        <Card className="bg-card/40 border-border/60">
          <CardHeader>
            <CardTitle className="text-md font-semibold flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> Conversion Insights
            </CardTitle>
            <CardDescription>Highest converting roles and resumes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-1.5 p-3 rounded-lg bg-accent/20 border border-border/30">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Top Performing Role
              </div>
              <div className="text-sm font-semibold text-foreground truncate">
                {topRoleInfo.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {topRoleInfo.responses > 0
                  ? `${topRoleInfo.responses} response${topRoleInfo.responses > 1 ? "s" : ""} from ${topRoleInfo.total} application${topRoleInfo.total > 1 ? "s" : ""} (${((topRoleInfo.responses / topRoleInfo.total) * 100).toFixed(0)}%)`
                  : "No responses recorded yet"}
              </div>
            </div>

            <div className="space-y-1.5 p-3 rounded-lg bg-accent/20 border border-border/30">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Top Performing Resume
              </div>
              <div
                className="text-sm font-semibold text-foreground truncate"
                title={topResumeInfo.name}
              >
                {topResumeInfo.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {topResumeInfo.responses > 0
                  ? `${topResumeInfo.responses} response${topResumeInfo.responses > 1 ? "s" : ""} from ${topResumeInfo.total} application${topResumeInfo.total > 1 ? "s" : ""} (${((topResumeInfo.responses / topResumeInfo.total) * 100).toFixed(0)}%)`
                  : "No responses recorded yet"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

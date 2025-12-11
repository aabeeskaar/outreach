"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Eye,
  Mail,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Crown,
  UserPlus,
  Activity,
  BarChart3,
} from "lucide-react";

interface Analytics {
  overview: {
    totalUsers: number;
    newUsersInPeriod: number;
    activeUsersInPeriod: number;
    totalProUsers: number;
    newProUsersInPeriod: number;
    canceledInPeriod: number;
    conversionRate: string;
    churnRate: string;
  };
  emails: {
    total: number;
    inPeriod: number;
    sentInPeriod: number;
    avgPerUser: string;
  };
  pageViews: {
    total: number;
    inPeriod: number;
    uniqueVisitors: number;
    avgPerVisitor: string;
  };
  revenue: {
    estimated: number;
    periodRevenue: number;
    mrr: number;
    arr: number;
  };
  topPages: Array<{ path: string; views: number }>;
  charts: {
    pageViews: Array<{ date: string; count: number }>;
    newUsers: Array<{ date: string; count: number }>;
    emails: Array<{ date: string; count: number }>;
  };
  usersByPlan: { free: number; pro: number };
  recentSignups: Array<{
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    createdAt: string;
    subscription: { status: string } | null;
  }>;
  period: string;
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7d");

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Failed to load analytics
      </div>
    );
  }

  const periodLabel = period === "7d" ? "7 days" : period === "30d" ? "30 days" : "90 days";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive overview of your application metrics
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              +{analytics.overview.newUsersInPeriod} in last {periodLabel}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pro Subscribers</CardTitle>
            <Crown className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalProUsers}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.overview.conversionRate}% conversion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Page Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.pageViews.inPeriod.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.pageViews.uniqueVisitors} unique visitors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.revenue.mrr)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(analytics.revenue.arr)} ARR
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Page Views Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Page Views (Last 7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-end gap-1">
              {analytics.charts.pageViews.map((day, i) => {
                const max = Math.max(...analytics.charts.pageViews.map((d) => d.count), 1);
                const height = (day.count / max) * 100;
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-full bg-primary rounded-t transition-all"
                      style={{ height: `${height}%`, minHeight: day.count > 0 ? "4px" : "0" }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(day.date).split(" ")[1]}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* New Users Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              New Users (Last 7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-end gap-1">
              {analytics.charts.newUsers.map((day, i) => {
                const max = Math.max(...analytics.charts.newUsers.map((d) => d.count), 1);
                const height = (day.count / max) * 100;
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-full bg-green-500 rounded-t transition-all"
                      style={{ height: `${height}%`, minHeight: day.count > 0 ? "4px" : "0" }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(day.date).split(" ")[1]}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Emails Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Emails Generated (Last 7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-end gap-1">
              {analytics.charts.emails.map((day, i) => {
                const max = Math.max(...analytics.charts.emails.map((d) => d.count), 1);
                const height = (day.count / max) * 100;
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-full bg-blue-500 rounded-t transition-all"
                      style={{ height: `${height}%`, minHeight: day.count > 0 ? "4px" : "0" }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(day.date).split(" ")[1]}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* User Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">User Distribution</CardTitle>
            <CardDescription>Free vs Pro users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span className="text-sm">Free Users</span>
              </div>
              <span className="font-medium">{analytics.usersByPlan.free}</span>
            </div>
            <Progress
              value={(analytics.usersByPlan.free / (analytics.usersByPlan.free + analytics.usersByPlan.pro)) * 100}
              className="h-2"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-sm">Pro Users</span>
              </div>
              <span className="font-medium">{analytics.usersByPlan.pro}</span>
            </div>
            <Progress
              value={(analytics.usersByPlan.pro / (analytics.usersByPlan.free + analytics.usersByPlan.pro)) * 100}
              className="h-2 [&>div]:bg-yellow-500"
            />
          </CardContent>
        </Card>

        {/* Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Top Pages
            </CardTitle>
            <CardDescription>Most visited pages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topPages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No page views yet
                </p>
              ) : (
                analytics.topPages.slice(0, 5).map((page, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm truncate max-w-[180px]">{page.path}</span>
                    <Badge variant="secondary">{page.views}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Email Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Generated</span>
              <span className="font-medium">{analytics.emails.total.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">This Period</span>
              <span className="font-medium">{analytics.emails.inPeriod}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Sent This Period</span>
              <span className="font-medium">{analytics.emails.sentInPeriod}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Avg Per User</span>
              <span className="font-medium">{analytics.emails.avgPerUser}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Activity Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity Overview
            </CardTitle>
            <CardDescription>Key activity metrics for the period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Active Users</p>
                <p className="text-xl font-bold">{analytics.overview.activeUsersInPeriod}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">New Subscriptions</p>
                <p className="text-xl font-bold flex items-center gap-1">
                  {analytics.overview.newProUsersInPeriod}
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Canceled</p>
                <p className="text-xl font-bold flex items-center gap-1">
                  {analytics.overview.canceledInPeriod}
                  {analytics.overview.canceledInPeriod > 0 && (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Churn Rate</p>
                <p className="text-xl font-bold">{analytics.overview.churnRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Signups */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Recent Signups
            </CardTitle>
            <CardDescription>Latest users to join</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.recentSignups.map((user) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.image || undefined} />
                      <AvatarFallback>
                        {(user.name || user.email)[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{user.name || user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </p>
                    </div>
                  </div>
                  {user.subscription?.status === "ACTIVE" ? (
                    <Badge className="bg-yellow-500">Pro</Badge>
                  ) : (
                    <Badge variant="secondary">Free</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

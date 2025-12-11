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
  Users,
  Mail,
  Send,
  Crown,
  MessageSquare,
  HeadphonesIcon,
  TrendingUp,
} from "lucide-react";

interface Stats {
  totalUsers: number;
  totalEmails: number;
  totalEmailsSent: number;
  proUsers: number;
  openTickets: number;
  pendingFeedback: number;
  newUsersThisWeek: number;
  emailsThisWeek: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      description: `+${stats?.newUsersThisWeek || 0} this week`,
      icon: Users,
      color: "text-blue-500",
    },
    {
      title: "Pro Subscribers",
      value: stats?.proUsers || 0,
      description: "Active subscriptions",
      icon: Crown,
      color: "text-yellow-500",
    },
    {
      title: "Emails Generated",
      value: stats?.totalEmails || 0,
      description: `+${stats?.emailsThisWeek || 0} this week`,
      icon: Mail,
      color: "text-green-500",
    },
    {
      title: "Emails Sent",
      value: stats?.totalEmailsSent || 0,
      description: "Successfully delivered",
      icon: Send,
      color: "text-purple-500",
    },
    {
      title: "Open Tickets",
      value: stats?.openTickets || 0,
      description: "Needs attention",
      icon: HeadphonesIcon,
      color: "text-red-500",
    },
    {
      title: "Feedback Received",
      value: stats?.pendingFeedback || 0,
      description: "Total submissions",
      icon: MessageSquare,
      color: "text-orange-500",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your application metrics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Conversion Rate</span>
              <span className="font-medium">
                {stats?.totalUsers
                  ? ((stats.proUsers / stats.totalUsers) * 100).toFixed(1)
                  : 0}
                %
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Emails/User</span>
              <span className="font-medium">
                {stats?.totalUsers
                  ? (stats.totalEmails / stats.totalUsers).toFixed(1)
                  : 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email Send Rate</span>
              <span className="font-medium">
                {stats?.totalEmails
                  ? ((stats.totalEmailsSent / stats.totalEmails) * 100).toFixed(1)
                  : 0}
                %
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Support Overview</CardTitle>
            <CardDescription>Current support status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Open Tickets</span>
              <span
                className={`font-medium ${
                  (stats?.openTickets || 0) > 5 ? "text-red-500" : "text-green-500"
                }`}
              >
                {stats?.openTickets || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Feedback Items</span>
              <span className="font-medium">{stats?.pendingFeedback || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status</span>
              <span
                className={`text-sm px-2 py-1 rounded-full ${
                  (stats?.openTickets || 0) === 0
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {(stats?.openTickets || 0) === 0 ? "All Clear" : "Needs Attention"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

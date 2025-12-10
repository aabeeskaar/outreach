"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User,
  FileText,
  Users,
  Mail,
  PenSquare,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { format } from "date-fns";

interface DashboardData {
  profileCompletion: number;
  documentsCount: number;
  recipientsCount: number;
  emailsCount: number;
  gmailConnected: boolean;
  recentEmails: Array<{
    id: string;
    subject: string;
    recipientName: string;
    status: string;
    createdAt: string;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/dashboard");
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your email outreach activity
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.profileCompletion || 0}%</div>
            <Progress value={data?.profileCompletion || 0} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {(data?.profileCompletion || 0) < 100
                ? "Complete your profile for better emails"
                : "Profile complete!"}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.documentsCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Uploaded documents
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recipients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.recipientsCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Saved recipients
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.emailsCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Total emails sent
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Gmail Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Gmail Connection
            </CardTitle>
            <CardDescription>
              Connect your Gmail to send emails directly
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data?.gmailConnected ? (
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Connected</p>
                  <p className="text-sm text-muted-foreground">
                    Your Gmail account is connected and ready to send emails
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="font-medium">Not Connected</p>
                    <p className="text-sm text-muted-foreground">
                      Connect Gmail to send emails
                    </p>
                  </div>
                </div>
                <Button asChild>
                  <Link href="/settings">Connect Gmail</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Start */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenSquare className="h-5 w-5" />
              Quick Start
            </CardTitle>
            <CardDescription>
              Start composing a new personalized email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create AI-powered personalized emails for job applications,
                research inquiries, collaborations, and more.
              </p>
              <Button asChild className="w-full">
                <Link href="/compose">
                  Compose New Email
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Emails */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Emails</CardTitle>
          <CardDescription>
            Your latest generated and sent emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data?.recentEmails && data.recentEmails.length > 0 ? (
            <div className="space-y-4">
              {data.recentEmails.map((email) => (
                <div
                  key={email.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{email.subject}</p>
                    <p className="text-sm text-muted-foreground">
                      To: {email.recipientName}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        email.status === "SENT"
                          ? "default"
                          : email.status === "DRAFT"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {email.status === "SENT" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                      {email.status === "DRAFT" && <Clock className="mr-1 h-3 w-3" />}
                      {email.status === "FAILED" && <AlertCircle className="mr-1 h-3 w-3" />}
                      {email.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(email.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
              ))}
              <Button variant="outline" asChild className="w-full">
                <Link href="/history">View All Emails</Link>
              </Button>
            </div>
          ) : (
            <div className="text-center py-6">
              <Mail className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                No emails yet. Start by composing your first email!
              </p>
              <Button asChild className="mt-4">
                <Link href="/compose">Compose Email</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 mt-2" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-2 w-full mt-4" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  BarChart3,
  Mail,
  MailOpen,
  MousePointerClick,
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  Clock,
  Crown,
  Lock,
  TrendingUp,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

interface Email {
  id: string;
  subject: string;
  status: string;
  sentAt: string | null;
  openCount: number;
  clickCount: number;
  recipient: {
    name: string;
    email: string;
  };
}

interface TrackingData {
  emailId: string;
  isPro: boolean;
  opens: {
    total: number;
    unique: number;
    recent?: Array<{
      openedAt: string;
      device: string;
      browser: string;
      os: string;
    }>;
    deviceStats?: Record<string, number>;
    browserStats?: Record<string, number>;
    osStats?: Record<string, number>;
    timeline?: Record<string, number>;
  };
  clicks: {
    total: number;
    unique: number;
    byUrl?: Record<string, number>;
    recent?: Array<{
      clickedAt: string;
      url: string;
      device: string;
      browser: string;
    }>;
  };
}

const deviceIcons: Record<string, React.ReactNode> = {
  Desktop: <Monitor className="h-4 w-4" />,
  mobile: <Smartphone className="h-4 w-4" />,
  tablet: <Tablet className="h-4 w-4" />,
  Unknown: <Globe className="h-4 w-4" />,
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string>("");
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [subscription, setSubscription] = useState<{ isPro: boolean } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedEmailId) {
      fetchTrackingData(selectedEmailId);
    }
  }, [selectedEmailId]);

  const fetchData = async () => {
    try {
      const [emailsRes, subRes] = await Promise.all([
        fetch("/api/emails?status=SENT&limit=50"),
        fetch("/api/subscription"),
      ]);

      if (emailsRes.ok) {
        const data = await emailsRes.json();
        setEmails(data.emails || []);
        if (data.emails?.length > 0) {
          setSelectedEmailId(data.emails[0].id);
        }
      }

      if (subRes.ok) {
        setSubscription(await subRes.json());
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchTrackingData = async (emailId: string) => {
    setTrackingLoading(true);
    try {
      const res = await fetch(`/api/emails/${emailId}/tracking`);
      if (res.ok) {
        setTrackingData(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch tracking:", error);
    } finally {
      setTrackingLoading(false);
    }
  };

  if (loading) {
    return <AnalyticsSkeleton />;
  }

  if (!subscription?.isPro) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Email Analytics</h2>
          <p className="text-muted-foreground">
            Detailed insights into your email performance
          </p>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="mx-auto w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mb-6">
              <Lock className="h-8 w-8 text-yellow-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Pro Feature</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Advanced email analytics is available exclusively for Pro subscribers.
              Get detailed insights into opens, clicks, devices, and more.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto text-sm">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span>Open tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                  <span>Click analytics</span>
                </div>
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <span>Device breakdown</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span>Performance trends</span>
                </div>
              </div>
              <Button onClick={() => router.push("/pricing")} className="bg-gradient-to-r from-yellow-500 to-orange-500">
                <Crown className="mr-2 h-4 w-4" />
                Upgrade to Pro
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedEmail = emails.find((e) => e.id === selectedEmailId);

  // Calculate totals
  const totalOpens = emails.reduce((sum, e) => sum + (e.openCount || 0), 0);
  const totalClicks = emails.reduce((sum, e) => sum + (e.clickCount || 0), 0);
  const avgOpenRate = emails.length > 0
    ? (emails.filter(e => e.openCount > 0).length / emails.length * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Email Analytics
          </h2>
          <p className="text-muted-foreground">
            Detailed insights into your email performance
          </p>
        </div>
        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500">
          <Crown className="h-3 w-3 mr-1" />
          Pro
        </Badge>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{emails.length}</p>
                <p className="text-sm text-muted-foreground">Emails Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <MailOpen className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalOpens}</p>
                <p className="text-sm text-muted-foreground">Total Opens</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <MousePointerClick className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalClicks}</p>
                <p className="text-sm text-muted-foreground">Total Clicks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgOpenRate}%</p>
                <p className="text-sm text-muted-foreground">Open Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Email Selector */}
      {emails.length > 0 ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Select Email</CardTitle>
              <CardDescription>Choose an email to view detailed analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedEmailId} onValueChange={setSelectedEmailId}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Select an email" />
                </SelectTrigger>
                <SelectContent>
                  {emails.map((email) => (
                    <SelectItem key={email.id} value={email.id}>
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[300px]">{email.subject}</span>
                        <Badge variant="outline" className="ml-2">
                          {email.openCount} opens
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Detailed Analytics */}
          {trackingLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
          ) : trackingData ? (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Opens Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MailOpen className="h-5 w-5 text-blue-500" />
                    Opens
                  </CardTitle>
                  <CardDescription>
                    {selectedEmail?.subject}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-3xl font-bold">{trackingData.opens.total}</p>
                      <p className="text-sm text-muted-foreground">Total Opens</p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-3xl font-bold">{trackingData.opens.unique}</p>
                      <p className="text-sm text-muted-foreground">Unique Opens</p>
                    </div>
                  </div>

                  {trackingData.opens.deviceStats && (
                    <div>
                      <h4 className="font-medium mb-3">Device Breakdown</h4>
                      <div className="space-y-2">
                        {Object.entries(trackingData.opens.deviceStats).map(([device, count]) => (
                          <div key={device} className="flex items-center gap-2">
                            {deviceIcons[device] || <Globe className="h-4 w-4" />}
                            <span className="flex-1 text-sm">{device}</span>
                            <span className="text-sm text-muted-foreground">{count}</span>
                            <Progress
                              value={(count / trackingData.opens.total) * 100}
                              className="w-20 h-2"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {trackingData.opens.recent && trackingData.opens.recent.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Recent Opens</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {trackingData.opens.recent.slice(0, 5).map((open, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span>{format(new Date(open.openedAt), "MMM d, h:mm a")}</span>
                            <Badge variant="outline" className="text-xs">
                              {open.device}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Clicks Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MousePointerClick className="h-5 w-5 text-green-500" />
                    Clicks
                  </CardTitle>
                  <CardDescription>
                    Link click analytics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-3xl font-bold">{trackingData.clicks.total}</p>
                      <p className="text-sm text-muted-foreground">Total Clicks</p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-3xl font-bold">{trackingData.clicks.unique}</p>
                      <p className="text-sm text-muted-foreground">Unique Clicks</p>
                    </div>
                  </div>

                  {trackingData.clicks.byUrl && Object.keys(trackingData.clicks.byUrl).length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Clicks by URL</h4>
                      <div className="space-y-2">
                        {Object.entries(trackingData.clicks.byUrl).map(([url, count]) => (
                          <div key={url} className="flex items-center gap-2">
                            <span className="flex-1 text-sm truncate" title={url}>
                              {url.length > 40 ? url.slice(0, 40) + "..." : url}
                            </span>
                            <Badge variant="secondary">{count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {trackingData.clicks.recent && trackingData.clicks.recent.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Recent Clicks</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {trackingData.clicks.recent.slice(0, 5).map((click, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span>{format(new Date(click.clickedAt), "MMM d, h:mm a")}</span>
                            <Badge variant="outline" className="text-xs">
                              {click.device}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {trackingData.clicks.total === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <MousePointerClick className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No clicks recorded yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No sent emails yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Send your first email to see analytics
            </p>
            <Button asChild className="mt-4">
              <Link href="/compose">Compose Email</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 mt-2" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full max-w-md" />
        </CardContent>
      </Card>
    </div>
  );
}

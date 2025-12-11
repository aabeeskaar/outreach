"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Bot, Zap, DollarSign, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";

interface AIUsage {
  id: string;
  provider: string;
  model: string | null;
  tokens: number | null;
  cost: number | null;
  success: boolean;
  error: string | null;
  createdAt: string;
  user?: { email: string; name: string | null };
}

interface ProviderStats {
  provider: string;
  count: number;
  tokens: number;
  cost: number;
}

export default function AIUsagePage() {
  const [usage, setUsage] = useState<AIUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ totalRequests: 0, totalTokens: 0, totalCost: 0, successRate: "100" });
  const [byProvider, setByProvider] = useState<ProviderStats[]>([]);
  const [dailyUsage, setDailyUsage] = useState<Array<{ date: string; count: number }>>([]);
  const [providerFilter, setProviderFilter] = useState("all");
  const [period, setPeriod] = useState("7d");

  useEffect(() => {
    fetchUsage();
  }, [page, providerFilter, period]);

  const fetchUsage = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        period,
        ...(providerFilter !== "all" && { provider: providerFilter }),
      });
      const res = await fetch(`/api/admin/ai-usage?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsage(data.usage);
        setTotalPages(data.pagination.totalPages);
        setStats(data.stats);
        setByProvider(data.byProvider);
        setDailyUsage(data.dailyUsage);
      }
    } catch (error) {
      console.error("Failed to fetch AI usage:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const totalCount = byProvider.reduce((acc, p) => acc + p.count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Usage</h1>
          <p className="text-muted-foreground">Monitor AI provider usage and costs</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.totalRequests.toLocaleString()}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.totalTokens.toLocaleString()}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">${stats.totalCost.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.successRate}%</div></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Usage by Provider</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {byProvider.map((p) => (
              <div key={p.provider} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{p.provider}</span>
                  <span className="text-sm text-muted-foreground">{p.count} requests</span>
                </div>
                <Progress value={(p.count / totalCount) * 100} className="h-2" />
              </div>
            ))}
            {byProvider.length === 0 && <p className="text-center text-muted-foreground">No usage data</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Daily Usage (Last 7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-end gap-1">
              {dailyUsage.map((day, i) => {
                const max = Math.max(...dailyUsage.map((d) => d.count), 1);
                const height = (day.count / max) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-primary rounded-t" style={{ height: `${height}%`, minHeight: day.count > 0 ? "4px" : "0" }} />
                    <span className="text-[10px] text-muted-foreground">{day.date.split("-")[2]}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Usage Log</CardTitle>
              <CardDescription>Recent AI requests</CardDescription>
            </div>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                <SelectItem value="gemini">Gemini</SelectItem>
                <SelectItem value="groq">Groq</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : usage.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No usage data</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Tokens</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usage.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="text-sm">{u.user?.name || u.user?.email || "—"}</TableCell>
                      <TableCell><Badge variant="outline">{u.provider}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.model || "—"}</TableCell>
                      <TableCell>{u.tokens?.toLocaleString() || "—"}</TableCell>
                      <TableCell>
                        {u.success ? (
                          <Badge className="bg-green-100 text-green-700">Success</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700">Failed</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDate(u.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

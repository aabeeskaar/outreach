"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollText, ChevronLeft, ChevronRight, Eye } from "lucide-react";

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; email: string; name: string | null } | null;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [actions, setActions] = useState<string[]>([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => { fetchLogs(); }, [page, actionFilter, entityFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        ...(actionFilter !== "all" && { action: actionFilter }),
        ...(entityFilter !== "all" && { entityType: entityFilter }),
      });
      const res = await fetch(`/api/admin/audit-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotalPages(data.pagination.totalPages);
        setActions(data.filters.actions);
        setEntityTypes(data.filters.entityTypes);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      CREATE: "bg-green-100 text-green-700",
      UPDATE: "bg-blue-100 text-blue-700",
      DELETE: "bg-red-100 text-red-700",
      GRANT: "bg-yellow-100 text-yellow-700",
      REVOKE: "bg-orange-100 text-orange-700",
    };
    const prefix = action.split("_")[0];
    return <Badge className={colors[prefix] || "bg-gray-100 text-gray-700"}>{action}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground">Track all admin actions</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>All administrative actions</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="All Actions" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="All Entities" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {entityTypes.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <ScrollText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No audit logs yet</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {log.user ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback>{(log.user.name || log.user.email)[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{log.user.name || log.user.email}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">System</span>
                        )}
                      </TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{log.entityType}</div>
                          {log.entityId && <div className="text-xs text-muted-foreground font-mono">{log.entityId.slice(0, 8)}...</div>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDate(log.createdAt)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedLog(log)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
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

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Audit Log Details</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Action:</span> {selectedLog?.action}</div>
              <div><span className="text-muted-foreground">Entity:</span> {selectedLog?.entityType}</div>
              <div><span className="text-muted-foreground">User:</span> {selectedLog?.user?.email || "System"}</div>
              <div><span className="text-muted-foreground">IP:</span> {selectedLog?.ipAddress || "N/A"}</div>
            </div>
            {selectedLog?.oldValue && (
              <div>
                <p className="text-sm font-medium mb-1">Old Value:</p>
                <pre className="bg-muted p-2 rounded text-xs overflow-auto">{JSON.stringify(selectedLog.oldValue, null, 2)}</pre>
              </div>
            )}
            {selectedLog?.newValue && (
              <div>
                <p className="text-sm font-medium mb-1">New Value:</p>
                <pre className="bg-muted p-2 rounded text-xs overflow-auto">{JSON.stringify(selectedLog.newValue, null, 2)}</pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

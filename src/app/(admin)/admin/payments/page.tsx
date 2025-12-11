"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, CreditCard, ChevronLeft, ChevronRight } from "lucide-react";

interface Transaction {
  id: string;
  userId: string;
  provider: string;
  providerTxId: string | null;
  amount: number;
  currency: string;
  status: string;
  type: string;
  description: string | null;
  createdAt: string;
  user?: { email: string; name: string | null };
}

export default function PaymentsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ totalRevenue: 0, totalTransactions: 0 });
  const [providerFilter, setProviderFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchPayments();
  }, [page, providerFilter, statusFilter]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        ...(providerFilter !== "all" && { provider: providerFilter }),
        ...(statusFilter !== "all" && { status: statusFilter }),
      });
      const res = await fetch(`/api/admin/payments?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions);
        setTotalPages(data.pagination.totalPages);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      COMPLETED: "bg-green-100 text-green-700",
      PENDING: "bg-yellow-100 text-yellow-700",
      FAILED: "bg-red-100 text-red-700",
      REFUNDED: "bg-gray-100 text-gray-700",
    };
    return <Badge className={styles[status] || ""}>{status}</Badge>;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payments</h1>
        <p className="text-muted-foreground">View all payment transactions</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>All payment transactions</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  <SelectItem value="STRIPE">Stripe</SelectItem>
                  <SelectItem value="PAYPAL">PayPal</SelectItem>
                  <SelectItem value="MANUAL">Manual</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="REFUNDED">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No transactions found</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{tx.user?.name || "—"}</div>
                          <div className="text-muted-foreground">{tx.user?.email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        ${tx.amount.toFixed(2)} {tx.currency}
                      </TableCell>
                      <TableCell><Badge variant="outline">{tx.provider}</Badge></TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                      <TableCell>{tx.type}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDate(tx.createdAt)}</TableCell>
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

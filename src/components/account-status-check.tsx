"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Ban, Clock, Mail } from "lucide-react";

interface AccountStatus {
  status: "ACTIVE" | "SUSPENDED" | "BANNED";
  isActive: boolean;
  isSuspended: boolean;
  isBanned: boolean;
}

export function AccountStatusCheck({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/status")
      .then((res) => res.json())
      .then((data) => {
        setStatus(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (status?.isSuspended) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <CardTitle className="text-2xl">Account Suspended</CardTitle>
            <CardDescription>
              Your account has been temporarily suspended
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Why was my account suspended?</p>
                  <p>
                    Account suspensions may occur due to policy violations, suspicious activity,
                    or other security concerns. This is usually temporary.
                  </p>
                </div>
              </div>
            </div>
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                If you believe this is a mistake, please contact our support team.
              </p>
              <Button onClick={() => router.push("/support")} className="w-full">
                <Mail className="mr-2 h-4 w-4" />
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status?.isBanned) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Ban className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Account Banned</CardTitle>
            <CardDescription>
              Your account has been permanently banned
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">
                  <p className="font-medium mb-1">Account Permanently Disabled</p>
                  <p>
                    This account has been banned due to serious violations of our terms of service.
                    This action is permanent and cannot be reversed.
                  </p>
                </div>
              </div>
            </div>
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                If you have questions about this decision, you may contact support,
                but please note that ban appeals are rarely successful.
              </p>
              <Button variant="outline" onClick={() => router.push("/support")} className="w-full">
                <Mail className="mr-2 h-4 w-4" />
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

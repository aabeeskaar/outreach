"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Moon,
  Sun,
  Unlink,
  Link as LinkIcon,
} from "lucide-react";

interface GmailStatus {
  connected: boolean;
  email: string | null;
  expiresAt: string | null;
  connectedAt: string | null;
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();
  const [gmailStatus, setGmailStatus] = useState<GmailStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    // Handle callback messages
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "gmail_connected") {
      toast.success("Gmail connected successfully!");
      // Clean URL
      window.history.replaceState({}, "", "/settings");
    }
    if (error) {
      const errorMessages: Record<string, string> = {
        gmail_auth_failed: "Gmail authentication failed",
        no_code: "No authorization code received",
        invalid_tokens: "Invalid tokens received",
        no_email: "Could not retrieve email address",
        callback_failed: "Connection callback failed",
      };
      toast.error(errorMessages[error] || "An error occurred");
      window.history.replaceState({}, "", "/settings");
    }

    fetchGmailStatus();
  }, [searchParams]);

  const fetchGmailStatus = async () => {
    try {
      const response = await fetch("/api/gmail/status");
      if (response.ok) {
        const data = await response.json();
        setGmailStatus(data);
      }
    } catch (error) {
      console.error("Failed to fetch Gmail status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGmail = async () => {
    setConnecting(true);
    try {
      const response = await fetch("/api/gmail/connect");
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      } else {
        toast.error("Failed to initiate Gmail connection");
        setConnecting(false);
      }
    } catch (error) {
      console.error("Connect error:", error);
      toast.error("Failed to initiate Gmail connection");
      setConnecting(false);
    }
  };

  const handleDisconnectGmail = async () => {
    if (!confirm("Are you sure you want to disconnect Gmail?")) return;

    setDisconnecting(true);
    try {
      const response = await fetch("/api/gmail/disconnect", {
        method: "POST",
      });

      if (response.ok) {
        setGmailStatus({ connected: false, email: null, expiresAt: null, connectedAt: null });
        toast.success("Gmail disconnected");
      } else {
        toast.error("Failed to disconnect Gmail");
      }
    } catch (error) {
      console.error("Disconnect error:", error);
      toast.error("Failed to disconnect Gmail");
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings and connections
        </p>
      </div>

      {/* Gmail Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Gmail Connection
          </CardTitle>
          <CardDescription>
            Connect your Gmail account to send emails directly from OutreachAI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {gmailStatus?.connected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900 dark:text-green-100">
                      Connected
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {gmailStatus.email}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={handleDisconnectGmail}
                  disabled={disconnecting}
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  {disconnecting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Unlink className="mr-2 h-4 w-4" />
                  )}
                  Disconnect
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Your Gmail account is connected and ready to send emails. You can
                disconnect at any time.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-900">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-yellow-900 dark:text-yellow-100">
                      Not Connected
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Connect Gmail to send emails
                    </p>
                  </div>
                </div>
                <Button onClick={handleConnectGmail} disabled={connecting}>
                  {connecting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LinkIcon className="mr-2 h-4 w-4" />
                  )}
                  Connect Gmail
                </Button>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>By connecting Gmail, OutreachAI will be able to:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Send emails on your behalf</li>
                  <li>Compose and create draft emails</li>
                  <li>Access your email address</li>
                </ul>
                <p className="mt-2">
                  We only use these permissions to send emails you explicitly
                  request. Your data is never shared with third parties.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize how OutreachAI looks on your device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dark-mode" className="text-base">
                Dark Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                Switch between light and dark themes
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-muted-foreground" />
              <Switch
                id="dark-mode"
                checked={theme === "dark"}
                onCheckedChange={(checked) =>
                  setTheme(checked ? "dark" : "light")
                }
              />
              <Moon className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data & Privacy */}
      <Card>
        <CardHeader>
          <CardTitle>Data & Privacy</CardTitle>
          <CardDescription>
            Manage your data and privacy settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium">Your Data</p>
                <p className="text-sm text-muted-foreground">
                  All your data is stored securely and encrypted at rest
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium">OAuth Tokens</p>
                <p className="text-sm text-muted-foreground">
                  Gmail tokens are encrypted using AES-256 encryption
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium">AI Processing</p>
                <p className="text-sm text-muted-foreground">
                  Your profile and documents are used to generate personalized emails
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { X, Info, AlertTriangle, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: "INFO" | "WARNING" | "SUCCESS" | "ERROR";
  dismissible: boolean;
  link: string | null;
  linkText: string | null;
}

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load dismissed announcements from localStorage
    const stored = localStorage.getItem("dismissed_announcements");
    if (stored) {
      try {
        setDismissed(new Set(JSON.parse(stored)));
      } catch {
        // Ignore parse errors
      }
    }

    // Fetch announcements
    fetch("/api/announcements")
      .then((res) => res.json())
      .then((data) => setAnnouncements(data.announcements || []))
      .catch(() => {});
  }, []);

  const handleDismiss = (id: string) => {
    const newDismissed = new Set(dismissed);
    newDismissed.add(id);
    setDismissed(newDismissed);
    localStorage.setItem("dismissed_announcements", JSON.stringify([...newDismissed]));
  };

  const visibleAnnouncements = announcements.filter((a) => !dismissed.has(a.id));

  if (visibleAnnouncements.length === 0) return null;

  const getStyles = (type: string) => {
    switch (type) {
      case "WARNING":
        return {
          bg: "bg-yellow-50 border-yellow-200",
          icon: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
          text: "text-yellow-800",
        };
      case "SUCCESS":
        return {
          bg: "bg-green-50 border-green-200",
          icon: <CheckCircle className="h-4 w-4 text-green-600" />,
          text: "text-green-800",
        };
      case "ERROR":
        return {
          bg: "bg-red-50 border-red-200",
          icon: <AlertCircle className="h-4 w-4 text-red-600" />,
          text: "text-red-800",
        };
      default:
        return {
          bg: "bg-blue-50 border-blue-200",
          icon: <Info className="h-4 w-4 text-blue-600" />,
          text: "text-blue-800",
        };
    }
  };

  return (
    <div className="space-y-2 mb-4">
      {visibleAnnouncements.map((announcement) => {
        const styles = getStyles(announcement.type);
        return (
          <div
            key={announcement.id}
            className={`${styles.bg} border rounded-lg px-4 py-3 flex items-start gap-3`}
          >
            <div className="flex-shrink-0 mt-0.5">{styles.icon}</div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${styles.text}`}>{announcement.title}</p>
              <p className={`text-sm ${styles.text} opacity-90 mt-0.5`}>{announcement.message}</p>
              {announcement.link && (
                <Link
                  href={announcement.link}
                  className={`text-sm ${styles.text} underline inline-flex items-center gap-1 mt-1 hover:opacity-80`}
                  target={announcement.link.startsWith("http") ? "_blank" : undefined}
                >
                  {announcement.linkText || "Learn more"}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
            {announcement.dismissible && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={() => handleDismiss(announcement.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

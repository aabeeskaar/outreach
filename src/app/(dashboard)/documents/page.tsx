"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  MoreVertical,
  FileType,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  FileSearch,
} from "lucide-react";
import { format } from "date-fns";

interface Document {
  id: string;
  name: string;
  type: "CV" | "TRANSCRIPT" | "COVER_LETTER" | "OTHER";
  filePath: string;
  extractedText: string | null;
  mimeType: string | null;
  size: number | null;
  createdAt: string;
}

const documentTypeLabels = {
  CV: "CV / Resume",
  TRANSCRIPT: "Transcript",
  COVER_LETTER: "Cover Letter",
  OTHER: "Other",
};

const documentTypeBadgeVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  CV: "default",
  TRANSCRIPT: "secondary",
  COVER_LETTER: "outline",
  OTHER: "outline",
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>("CV");
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [viewDoc, setViewDoc] = useState<Document | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch("/api/documents");
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit");
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", selectedType);

    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const newDoc = await response.json();
        setDocuments([newDoc, ...documents]);
        toast.success("Document uploaded successfully");

        // Auto-extract text
        await handleExtract(newDoc.id);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to upload document");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleExtract = async (id: string) => {
    setExtracting(id);
    try {
      const response = await fetch(`/api/documents/${id}/extract`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(
          documents.map((doc) =>
            doc.id === id ? { ...doc, extractedText: data.extractedText } : doc
          )
        );
        toast.success("Text extracted successfully");
      } else {
        toast.error("Failed to extract text");
      }
    } catch (error) {
      console.error("Extract error:", error);
      toast.error("Failed to extract text");
    } finally {
      setExtracting(null);
    }
  };

  const handleDownload = async (id: string, name: string) => {
    try {
      const response = await fetch(`/api/documents/${id}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        toast.error("Failed to download document");
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download document");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDocuments(documents.filter((doc) => doc.id !== id));
        toast.success("Document deleted");
      } else {
        toast.error("Failed to delete document");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete document");
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return <DocumentsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Documents</h2>
          <p className="text-muted-foreground">
            Upload your CV, transcripts, and other documents for AI context
          </p>
        </div>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Document
          </CardTitle>
          <CardDescription>
            Supported formats: PDF, DOCX, DOC, TXT (max 10MB)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CV">CV / Resume</SelectItem>
                <SelectItem value="TRANSCRIPT">Transcript</SelectItem>
                <SelectItem value="COVER_LETTER">Cover Letter</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button
                  asChild
                  variant="outline"
                  className="w-full cursor-pointer"
                  disabled={uploading}
                >
                  <span>
                    {uploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {uploading ? "Uploading..." : "Choose File"}
                  </span>
                </Button>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Documents</CardTitle>
          <CardDescription>
            {documents.length} document{documents.length !== 1 ? "s" : ""} uploaded
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                No documents uploaded yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Upload your CV or other documents to enhance AI email generation
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileType className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate max-w-[200px]">{doc.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={documentTypeBadgeVariants[doc.type]}>
                        {documentTypeLabels[doc.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatFileSize(doc.size)}</TableCell>
                    <TableCell>
                      {doc.extractedText ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-xs">Extracted</span>
                        </div>
                      ) : extracting === doc.id ? (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-xs">Extracting...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-yellow-600">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-xs">Pending</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(doc.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setViewDoc(doc)}
                          >
                            <FileSearch className="mr-2 h-4 w-4" />
                            View Document
                          </DropdownMenuItem>
                          {doc.extractedText && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    setPreviewDoc(doc);
                                  }}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Extracted Text
                                </DropdownMenuItem>
                              </DialogTrigger>
                            </Dialog>
                          )}
                          {!doc.extractedText && extracting !== doc.id && (
                            <DropdownMenuItem
                              onClick={() => handleExtract(doc.id)}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Extract Text
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDownload(doc.id, doc.name)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(doc.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog - Extracted Text */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{previewDoc?.name}</DialogTitle>
            <DialogDescription>Extracted text content</DialogDescription>
          </DialogHeader>
          <div className="mt-4 max-h-[60vh] overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
              {previewDoc?.extractedText || "No text extracted"}
            </pre>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Document Dialog - Actual File */}
      <Dialog open={!!viewDoc} onOpenChange={() => setViewDoc(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{viewDoc?.name}</DialogTitle>
            <DialogDescription>
              Document preview - {viewDoc?.mimeType || "Unknown type"}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 h-[70vh] overflow-hidden rounded-lg border">
            {viewDoc?.mimeType === "application/pdf" ? (
              <iframe
                src={`/api/documents/${viewDoc.id}/view`}
                className="w-full h-full"
                title={viewDoc.name}
              />
            ) : viewDoc?.mimeType === "text/plain" ? (
              <iframe
                src={`/api/documents/${viewDoc.id}/view`}
                className="w-full h-full bg-white"
                title={viewDoc.name}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full bg-muted">
                <FileType className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-sm mb-4">
                  Preview not available for this file type
                </p>
                <Button
                  variant="outline"
                  onClick={() => viewDoc && handleDownload(viewDoc.id, viewDoc.name)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download to View
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DocumentsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72 mt-2" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 flex-1" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

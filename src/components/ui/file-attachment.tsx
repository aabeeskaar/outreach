"use client";

import { useCallback, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Badge } from "./badge";
import {
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  File,
  Upload,
  Loader2,
} from "lucide-react";

export interface AttachmentFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  isUploading?: boolean;
  error?: string;
}

interface FileAttachmentProps {
  attachments: AttachmentFile[];
  onAttachmentsChange: (attachments: AttachmentFile[]) => void;
  maxFileSize?: number; // in bytes, default 10MB
  maxFiles?: number;
  acceptedTypes?: string[];
  disabled?: boolean;
  className?: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const getFileIcon = (type: string) => {
  if (type.startsWith("image/")) {
    return <ImageIcon className="h-4 w-4" />;
  }
  if (type === "application/pdf" || type.includes("document")) {
    return <FileText className="h-4 w-4" />;
  }
  return <File className="h-4 w-4" />;
};

export function FileAttachment({
  attachments,
  onAttachmentsChange,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  maxFiles = 10,
  acceptedTypes,
  disabled = false,
  className,
}: FileAttachmentProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File): Promise<AttachmentFile> => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const attachment: AttachmentFile = {
      id: tempId,
      name: file.name,
      size: file.size,
      type: file.type,
      isUploading: true,
    };

    // Add to state immediately with uploading status
    onAttachmentsChange([...attachments, attachment]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/attachments/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await response.json();

      // Update the attachment with server response
      return {
        id: data.id,
        name: data.name,
        size: data.size,
        type: data.type,
        url: data.url,
        isUploading: false,
      };
    } catch (error) {
      return {
        ...attachment,
        isUploading: false,
        error: error instanceof Error ? error.message : "Upload failed",
      };
    }
  };

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      if (disabled) return;

      const fileArray = Array.from(files);
      const validFiles: File[] = [];
      const errors: string[] = [];

      for (const file of fileArray) {
        // Check max files
        if (attachments.length + validFiles.length >= maxFiles) {
          errors.push(`Maximum ${maxFiles} files allowed`);
          break;
        }

        // Check file size
        if (file.size > maxFileSize) {
          errors.push(`${file.name} exceeds ${formatFileSize(maxFileSize)} limit`);
          continue;
        }

        // Check file type if specified
        if (acceptedTypes && acceptedTypes.length > 0) {
          const isAccepted = acceptedTypes.some(
            (type) =>
              file.type === type ||
              (type.endsWith("/*") && file.type.startsWith(type.replace("/*", "/")))
          );
          if (!isAccepted) {
            errors.push(`${file.name} is not an accepted file type`);
            continue;
          }
        }

        validFiles.push(file);
      }

      if (errors.length > 0) {
        console.error("File validation errors:", errors);
      }

      // Upload files
      const uploadPromises = validFiles.map(async (file) => {
        const result = await uploadFile(file);
        return result;
      });

      const results = await Promise.all(uploadPromises);

      // Update attachments with final results
      onAttachmentsChange([
        ...attachments.filter((a) => !a.isUploading),
        ...results,
      ]);
    },
    [attachments, onAttachmentsChange, disabled, maxFiles, maxFileSize, acceptedTypes]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (!disabled && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [disabled, handleFiles]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
        e.target.value = ""; // Reset input
      }
    },
    [handleFiles]
  );

  const removeAttachment = useCallback(
    (id: string) => {
      onAttachmentsChange(attachments.filter((a) => a.id !== id));
    },
    [attachments, onAttachmentsChange]
  );

  return (
    <div className={cn("space-y-3", className)}>
      {/* Drop Zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-4 transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div className="text-sm">
            <span className="text-muted-foreground">Drag & drop files here or </span>
            <button
              type="button"
              className="text-primary hover:underline font-medium"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
            >
              browse
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Max {formatFileSize(maxFileSize)} per file, up to {maxFiles} files
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
          accept={acceptedTypes?.join(",")}
          disabled={disabled}
        />
      </div>

      {/* Attachment List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg border bg-muted/30",
                attachment.error && "border-destructive bg-destructive/5"
              )}
            >
              <div className="flex-shrink-0 text-muted-foreground">
                {attachment.isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  getFileIcon(attachment.type)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{attachment.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.size)}
                  {attachment.error && (
                    <span className="text-destructive ml-2">{attachment.error}</span>
                  )}
                </p>
              </div>
              {!attachment.isUploading && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 flex-shrink-0"
                  onClick={() => removeAttachment(attachment.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Quick Add Button */}
      {attachments.length > 0 && attachments.length < maxFiles && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          <Paperclip className="h-4 w-4 mr-2" />
          Add More Files
        </Button>
      )}
    </div>
  );
}

export default FileAttachment;

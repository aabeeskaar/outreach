import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

interface AuditLogParams {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(params: AuditLogParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValue: params.oldValue ? (params.oldValue as Prisma.InputJsonValue) : Prisma.JsonNull,
        newValue: params.newValue ? (params.newValue as Prisma.InputJsonValue) : Prisma.JsonNull,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}

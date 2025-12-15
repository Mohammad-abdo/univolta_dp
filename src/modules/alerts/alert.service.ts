import prisma from "../../config/prisma.js";
import { AlertType, AlertSeverity } from "@prisma/client";

export interface CreateAlertParams {
  type: AlertType;
  severity?: AlertSeverity;
  title: string;
  message: string;
  resource?: string;
  resourceId?: string;
  userId?: string;
  universityId?: string;
  metadata?: Record<string, any>;
}

/**
 * Create an alert in the database
 */
export async function createAlert(params: CreateAlertParams) {
  try {
    const alert = await prisma.alert.create({
      data: {
        type: params.type,
        severity: params.severity || AlertSeverity.INFO,
        title: params.title,
        message: params.message,
        resource: params.resource,
        resourceId: params.resourceId,
        userId: params.userId,
        universityId: params.universityId,
        metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        university: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return alert;
  } catch (error) {
    // Don't throw error if alert creation fails - it shouldn't break the main operation
    console.error("Failed to create alert:", error);
    return null;
  }
}

/**
 * Create alert for CRUD operations
 */
export async function createOperationAlert(
  operation: "create" | "update" | "delete",
  resource: string,
  resourceName: string,
  resourceId: string,
  userId?: string,
  universityId?: string,
  metadata?: Record<string, any>
) {
  const typeMap: Record<string, AlertType> = {
    create: AlertType.CREATE,
    update: AlertType.UPDATE,
    delete: AlertType.DELETE,
  };

  const severityMap: Record<string, AlertSeverity> = {
    create: AlertSeverity.SUCCESS,
    update: AlertSeverity.INFO,
    delete: AlertSeverity.WARNING,
  };

  const actionMap: Record<string, string> = {
    create: "created",
    update: "updated",
    delete: "deleted",
  };

  return createAlert({
    type: typeMap[operation],
    severity: severityMap[operation],
    title: `${resourceName} ${actionMap[operation]}`,
    message: `A ${resource} "${resourceName}" has been ${actionMap[operation]}.`,
    resource,
    resourceId,
    userId,
    universityId,
    metadata,
  });
}

/**
 * Create alert for status changes
 */
export async function createStatusChangeAlert(
  resource: string,
  resourceName: string,
  resourceId: string,
  oldStatus: string,
  newStatus: string,
  userId?: string,
  universityId?: string,
  metadata?: Record<string, any>
) {
  return createAlert({
    type: AlertType.STATUS_CHANGE,
    severity: AlertSeverity.INFO,
    title: `${resourceName} status changed`,
    message: `The ${resource} "${resourceName}" status has been changed from ${oldStatus} to ${newStatus}.`,
    resource,
    resourceId,
    userId,
    universityId,
    metadata: {
      ...metadata,
      oldStatus,
      newStatus,
    },
  });
}

/**
 * Create alert for payment operations
 */
export async function createPaymentAlert(
  title: string,
  message: string,
  resourceId: string,
  userId?: string,
  universityId?: string,
  metadata?: Record<string, any>
) {
  return createAlert({
    type: AlertType.PAYMENT,
    severity: AlertSeverity.SUCCESS,
    title,
    message,
    resource: "payments",
    resourceId,
    userId,
    universityId,
    metadata,
  });
}


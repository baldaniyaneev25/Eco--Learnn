import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ContentAuditLogSchema = new Schema(
  {
    actorId: String,
    actorEmail: { type: String, default: "system" },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true },
    entityId: { type: String, index: true },
    summary: String,
    details: Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

ContentAuditLogSchema.index({ createdAt: -1 });

export type ContentAuditLogDoc = InferSchemaType<typeof ContentAuditLogSchema>;
export const ContentAuditLog: Model<ContentAuditLogDoc> =
  (models.ContentAuditLog as Model<ContentAuditLogDoc>) ??
  model<ContentAuditLogDoc>("ContentAuditLog", ContentAuditLogSchema, "contentAuditLogs");

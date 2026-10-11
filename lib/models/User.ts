import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const ROLES = ["student", "editor", "admin"] as const;
export type Role = (typeof ROLES)[number];

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: "student", index: true },
    board: { type: String, default: "GSEB" },
    classLevel: { type: String, default: "12" },
    preferredLanguage: { type: String, enum: ["en", "gu"], default: "gu" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof UserSchema>;
export const User: Model<UserDoc> = (models.User as Model<UserDoc>) ?? model<UserDoc>("User", UserSchema, "users");

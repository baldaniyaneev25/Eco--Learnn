import mongoose from "mongoose";
import { env } from "./env";

// Reuse one connection across hot reloads and route handler invocations.
const globalForMongoose = globalThis as unknown as {
  mongooseConn?: Promise<typeof mongoose>;
};

export async function connectDB(uri: string = env.mongodbUri): Promise<typeof mongoose> {
  if (!globalForMongoose.mongooseConn) {
    mongoose.set("strictQuery", true);
    globalForMongoose.mongooseConn = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 10_000, maxPoolSize: 10 })
      .catch((err) => {
        globalForMongoose.mongooseConn = undefined;
        throw err;
      });
  }
  return globalForMongoose.mongooseConn;
}

export async function disconnectDB(): Promise<void> {
  if (globalForMongoose.mongooseConn) {
    await mongoose.disconnect();
    globalForMongoose.mongooseConn = undefined;
  }
}

import { Client, Databases, Storage } from "node-appwrite";

const serverClient = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1")
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "unconfigured_source_project")
  .setKey(process.env.APPWRITE_API_KEY || ""); // ✅ Works with node-appwrite

export const serverDatabase = new Databases(serverClient);
export const serverStorage = new Storage(serverClient);
export { serverClient };

import { Client, Account, OAuthProvider } from "appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1")
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "unconfigured_source_project");

export const account = new Account(client);

// Sign in with Google (you can add Apple, GitHub, etc.)
export const signInWithGoogle = () => {
  return account.createOAuth2Session(
    OAuthProvider.Google,
    process.env.NEXT_PUBLIC_GOOGLE_OAUTH_SUCCESS!, // e.g., https://example.com/account
    process.env.NEXT_PUBLIC_GOOGLE_OAUTH_FAILURE!  // e.g., https://example.com/login
  );
};


// Get current logged-in user
export const getCurrentUser = async () => {
  try {
    const user = await account.get();
    return user;
  } catch {
    return null;
  }
};

// Logout
export const logoutUser = async () => {
  try {
    await account.deleteSession('current');
  } catch (err) {
    console.log("Logout failed:", err);
  }
};

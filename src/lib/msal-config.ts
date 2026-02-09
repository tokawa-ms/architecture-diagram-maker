import {
  PublicClientApplication,
  type Configuration,
  LogLevel,
} from "@azure/msal-browser";

/**
 * Returns true when the required MSAL environment variables are set.
 * Because the variables use the NEXT_PUBLIC_ prefix they are available both
 * on the server and the client.
 */
export const isMsalConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID &&
      process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID,
  );

const buildMsalConfig = (): Configuration => {
  const clientId = process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID ?? "";
  const tenantId = process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID ?? "";
  const redirectUri =
    process.env.NEXT_PUBLIC_AZURE_AD_REDIRECT_URI ?? "http://localhost:3000";

  return {
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      redirectUri,
      postLogoutRedirectUri: redirectUri,
    },
    cache: {
      cacheLocation: "localStorage",
    },
    system: {
      loggerOptions: {
        loggerCallback: (_level, message, containsPii) => {
          if (containsPii) return;
          console.log("[MSAL]", message);
        },
        logLevel: LogLevel.Warning,
        piiLoggingEnabled: false,
      },
    },
  };
};

/**
 * Singleton MSAL instance.  Initialise lazily so we never create it on the
 * server or when MSAL is not configured.
 */
let msalInstance: PublicClientApplication | null = null;

export const getMsalInstance = (): PublicClientApplication | null => {
  if (typeof window === "undefined") return null;
  if (!isMsalConfigured()) return null;
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(buildMsalConfig());
  }
  return msalInstance;
};

/**
 * MSAL login scopes.  We only request openid/profile/email so the ID token
 * contains the user's email claim.
 */
export const loginRequest = {
  scopes: ["openid", "profile", "email"],
};

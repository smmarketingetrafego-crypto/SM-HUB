import { createServerFn } from "@tanstack/react-start";

export const getGoogleAuthUrl = createServerFn({ method: 'GET' })
  .handler(async () => {
    const { getAuthUrl } = await import("./google-auth");
    return getAuthUrl();
  });

export const processGoogleCallback = createServerFn({ method: 'POST' })
  .validator((code: string) => code)
  .handler(async ({ data: code }) => {
    try {
      const { getTokensFromCode } = await import("./google-auth");
      const fs = await import("fs");
      const path = await import("path");
      const tokens = await getTokensFromCode(code);
      const tokensPath = path.resolve(process.cwd(), '.google-tokens.json');
      fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));
      return { success: true };
    } catch (e: any) {
      console.error("Error saving google code:", e);
      return { success: false, error: e.message };
    }
  });

export const checkDriveConnection = createServerFn({ method: 'GET' })
  .handler(async () => {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const tokensPath = path.resolve(process.cwd(), '.google-tokens.json');
      return fs.existsSync(tokensPath);
    } catch {
      return false;
    }
  });

export const disconnectDrive = createServerFn({ method: 'POST' })
  .handler(async () => {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const tokensPath = path.resolve(process.cwd(), '.google-tokens.json');
      if (fs.existsSync(tokensPath)) {
        fs.unlinkSync(tokensPath);
      }
      return { success: true };
    } catch {
      return { success: false };
    }
  });

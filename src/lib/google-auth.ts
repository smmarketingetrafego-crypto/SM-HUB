export async function getOAuth2Client() {
  const { google } = await import("googleapis");
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file'
];

export async function getAuthUrl() {
  const client = await getOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
}

export async function getTokensFromCode(code: string) {
  const client = await getOAuth2Client();
  const { tokens } = await client.getToken(code);
  return tokens;
}

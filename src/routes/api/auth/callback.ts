import { createAPIFileRoute } from '@tanstack/react-start/api';
import { getTokensFromCode } from '../../../lib/google-auth';
import * as fs from 'fs';
import * as path from 'path';

export const APIRoute = createAPIFileRoute('/api/auth/callback')({
  GET: async ({ request }) => {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');

    if (!code) {
      return new Response('No code provided', { status: 400 });
    }

    try {
      const tokens = await getTokensFromCode(code);
      
      // Save tokens securely locally for server-side usage
      const tokensPath = path.resolve(process.cwd(), '.google-tokens.json');
      fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));

      return new Response(null, {
        status: 302,
        headers: {
          Location: '/configuracoes?drive_connected=true',
        },
      });
    } catch (error: any) {
      return new Response(`Error exchanging code: ${error.message}`, { status: 500 });
    }
  },
});

import { createAPIFileRoute } from '@tanstack/react-start/api';
import { getAuthUrl } from '../../../lib/google-auth';

export const APIRoute = createAPIFileRoute('/api/auth/google')({
  GET: async () => {
    const url = getAuthUrl();
    return new Response(null, {
      status: 302,
      headers: {
        Location: url,
      },
    });
  },
});

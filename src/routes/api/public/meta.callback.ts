import { createAPIFileRoute } from '@tanstack/react-start/api';
// import { supabaseAdmin } from '@/integrations/supabase/client.server';

export const APIRoute = createAPIFileRoute('/api/public/meta/callback')({
  GET: async ({ request }) => {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code) {
      return new Response('Code not provided', { status: 400 });
    }

    try {
      // 1. Trocar o código temporário por um token de curto prazo
      // const tokenResponse = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${process.env.META_APP_ID}&redirect_uri=${process.env.META_REDIRECT_URI}&client_secret=${process.env.META_APP_SECRET}&code=${code}`);
      // const tokenData = await tokenResponse.json();

      // 2. Trocar token de curto prazo por um de longo prazo (60 dias)
      // const longLivedResponse = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`);
      // const longLivedData = await longLivedResponse.json();

      // 3. Salvar no Supabase (mock para demonstração, pois precisa do supabaseAdmin real)
      /*
      await supabaseAdmin.from('meta_connections').upsert({
        user_id: state, // O state idealmente contem o userId assinado/JWT
        access_token: longLivedData.access_token,
        token_expires_at: new Date(Date.now() + longLivedData.expires_in * 1000).toISOString()
      }, { onConflict: 'user_id' });
      */

      // Redireciona de volta para a tela de conexões
      return new Response(null, {
        status: 302,
        headers: {
          Location: '/meta-ads/conexao?success=true'
        }
      });
    } catch (error) {
      console.error('Error exchanging Meta token', error);
      return new Response('Authentication failed', { status: 500 });
    }
  }
});

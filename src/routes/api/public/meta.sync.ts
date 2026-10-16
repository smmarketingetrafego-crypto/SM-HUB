import { createAPIFileRoute } from '@tanstack/react-start/api';
// import { supabaseAdmin } from '@/integrations/supabase/client.server';

export const APIRoute = createAPIFileRoute('/api/public/meta/sync')({
  GET: async ({ request }) => {
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret');

    // Validação básica do cron job
    if (secret !== process.env.CRON_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    try {
      /*
      // 1. Puxar todas as contas vinculadas e seus tokens
      const { data: accounts } = await supabaseAdmin
        .from('meta_ad_accounts')
        .select(`
          account_id,
          meta_connections ( access_token )
        `)
        .eq('linked', true);

      // 2. Iterar sobre as contas e buscar Insights da Meta
      for (const account of accounts) {
        const token = account.meta_connections.access_token;
        const response = await fetch(`https://graph.facebook.com/v18.0/${account.account_id}/insights?fields=spend,impressions,clicks,actions,action_values&date_preset=today&access_token=${token}`);
        const insights = await response.json();

        // 3. Salvar/Atualizar no Supabase (meta_insights_daily)
        if (insights.data && insights.data.length > 0) {
          const row = insights.data[0];
          await supabaseAdmin.from('meta_insights_daily').upsert({
            account_id: account.account_id,
            date: new Date().toISOString().split('T')[0],
            spend: row.spend || 0,
            impressions: row.impressions || 0,
            clicks: row.clicks || 0,
            conversions: row.actions?.find(a => a.action_type === 'offsite_conversion')?.value || 0,
            revenue: row.action_values?.find(a => a.action_type === 'offsite_conversion')?.value || 0
          }, { onConflict: 'account_id, date' });
        }
      }
      */

      return new Response(JSON.stringify({ success: true, message: 'Sync simulated successfully' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Meta sync error', error);
      return new Response('Sync failed', { status: 500 });
    }
  }
});

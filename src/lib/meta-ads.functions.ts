// Simulação das server functions para rodar no client enquanto o SSR não está configurado

export const getMetaConnection = async () => {
  return { connected: false };
};

export const startMetaOAuth = async () => {
  const appId = 'DEMO';
  const redirectUri = 'DEMO';
  const scopes = 'ads_read,business_management';
  const state = 'mock-user-id'; 
  
  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&state=${state}&scope=${scopes}`;
  return { url: authUrl };
};

export const listMetaAdAccounts = async () => {
  return [];
};

export const setMetaAccountLinked = async (data: any) => {
  return { success: true };
};

export const disconnectMeta = async () => {
  return { success: true };
};

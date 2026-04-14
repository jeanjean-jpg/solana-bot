// Set required env vars before any module imports env.ts
process.env.HELIUS_API_KEY ??= "test";
process.env.HELIUS_RPC_URL ??= "https://mainnet.helius-rpc.com/?api-key=test";
process.env.SUPABASE_URL ??= "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";
process.env.WALLET_ENCRYPTION_KEY ??= "abcdef1234567890abcdef1234567890";
process.env.NODE_ENV ??= "development";

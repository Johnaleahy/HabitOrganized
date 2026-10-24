import { createClient } from '@supabase/supabase-js';
import publicConfig from './supabase-public.json';
import type { Database } from './database.types';
// These are public browser credentials. Row-level security protects all data.
// Environment variables can override the project for another deployment.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || publicConfig.projectUrl;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || publicConfig.publishableKey;
export const supabase = url && key ? createClient<Database>(url, key) : null;

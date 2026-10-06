import ClientApp from "./ClientApp";
import { hasSupabaseEnv } from "@/lib/supabase";

export default function Page() {
  const isSupabaseConfigured = hasSupabaseEnv();
  return <ClientApp hasSupabase={isSupabaseConfigured} />;
}

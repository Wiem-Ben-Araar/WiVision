import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Configuration Supabase manquante");
  process.exit(1);
}

// ⚡ CLIENT SUPABASE OPTIMISÉ
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    fetch: fetch as any,
    headers: {
      "X-Client-Info": "bim-express/1.0",
    },
  },
});

// ✅ INITIALISATION ASYNCHRONE
(async () => {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const hasIfcBucket = buckets?.some(b => b.name === "ifc-files");
    
    if (!hasIfcBucket) {
      await supabase.storage.createBucket("ifc-files", {
        public: false,
        fileSizeLimit: 250 * 1024 * 1024, // 250MB
        allowedMimeTypes: ["application/octet-stream", "application/ifc"],
      });
      console.log("✅ Bucket ifc-files créé");
    }
  } catch (error) {
    console.error("❌ Initialisation Supabase:", error);
  }
})();
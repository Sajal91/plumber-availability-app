// @ts-nocheck — Deno Edge Function; types resolve via deno.json / Deno LSP, not Node tsserver.
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const E164_REGEX = /^\+[1-9]\d{6,14}$/;
const LOCAL_10_DIGIT = /^\d{10}$/;

function normalizePhone(input: string): string | null {
  const trimmed = input.trim().replace(/[\s()-]/g, "");
  if (E164_REGEX.test(trimmed)) {
    return trimmed;
  }
  if (LOCAL_10_DIGIT.test(trimmed)) {
    return `+91${trimmed}`;
  }
  if (trimmed.startsWith("91") && trimmed.length === 12 && /^\d+$/.test(trimmed)) {
    return `+${trimmed}`;
  }
  return null;
}

/** GoTrue OTP lookup matches phones without a leading '+'. */
function toAuthPhone(e164: string): string {
  return e164.startsWith("+") ? e164.slice(1) : e164;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function requireAdmin(
  req: Request,
  admin: ReturnType<typeof createClient>,
) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: jsonResponse({ message: "Not authenticated" }, 401) };
  }

  const jwt = authHeader.slice("Bearer ".length).trim();
  if (!jwt) {
    return { error: jsonResponse({ message: "Not authenticated" }, 401) };
  }

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(jwt);

  if (userError || !user) {
    return { error: jsonResponse({ message: "Not authenticated" }, 401) };
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("admin profile lookup error:", profileError.message);
    return { error: jsonResponse({ message: "Unable to verify admin" }, 500) };
  }

  if (!profile || profile.role !== "admin") {
    return { error: jsonResponse({ message: "Admin access required" }, 403) };
  }

  return { adminId: user.id };
}

async function createPlumber(
  admin: ReturnType<typeof createClient>,
  name: string,
  phone: string,
) {
  const { data: existing, error: existingError } = await admin
    .from("profiles")
    .select("id")
    .eq("phone_number", phone)
    .maybeSingle();

  if (existingError) {
    console.error("duplicate phone check error:", existingError.message);
    return jsonResponse({ message: "Unable to create plumber" }, 500);
  }

  if (existing) {
    return jsonResponse({ message: "Phone number already registered" }, 409);
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    phone: toAuthPhone(phone),
    phone_confirm: true,
    user_metadata: { name, role: "plumber" },
  });

  if (createError) {
    const lowered = (createError.message || "").toLowerCase();
    if (lowered.includes("already") || lowered.includes("registered")) {
      return jsonResponse({ message: "Phone number already registered" }, 409);
    }
    console.error("createUser error:", createError.message);
    return jsonResponse({ message: createError.message || "Unable to create plumber" }, 400);
  }

  const userId = created.user?.id;
  if (!userId) {
    return jsonResponse({ message: "Unable to create plumber" }, 500);
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .insert({
      id: userId,
      name,
      phone_number: phone,
      role: "plumber",
      status: "offline",
      last_updated: new Date().toISOString(),
    })
    .select("id, name, phone_number, role, status, last_updated")
    .single();

  if (profileError) {
    console.error("profile insert error:", profileError.message);
    // Roll back Auth user so login stays invite-only and consistent.
    await admin.auth.admin.deleteUser(userId);
    return jsonResponse({ message: "Unable to create plumber profile" }, 500);
  }

  return jsonResponse({
    message: "Plumber added successfully",
    plumber: {
      id: profile.id,
      name: profile.name,
      phoneNumber: profile.phone_number,
      role: profile.role,
      status: profile.status,
      lastUpdated: profile.last_updated,
    },
  });
}

async function deletePlumber(
  admin: ReturnType<typeof createClient>,
  adminId: string,
  userId: string,
) {
  if (userId === adminId) {
    return jsonResponse({ message: "You cannot remove your own account" }, 400);
  }

  const { data: target, error: targetError } = await admin
    .from("profiles")
    .select("id, role, name")
    .eq("id", userId)
    .maybeSingle();

  if (targetError) {
    console.error("delete target lookup error:", targetError.message);
    return jsonResponse({ message: "Unable to remove user" }, 500);
  }

  if (!target) {
    return jsonResponse({ message: "User not found" }, 404);
  }

  if (target.role !== "plumber") {
    return jsonResponse({ message: "Only plumbers can be removed from the admin panel" }, 400);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error("deleteUser error:", deleteError.message);
    return jsonResponse({ message: deleteError.message || "Unable to remove user" }, 400);
  }

  return jsonResponse({
    message: "Plumber removed successfully",
    userId,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ message: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ message: "Server configuration error" }, 500);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const adminCheck = await requireAdmin(req, admin);
    if (adminCheck.error) {
      return adminCheck.error;
    }

    const body = await req.json();
    const action = typeof body?.action === "string" ? body.action : "";

    if (action === "create") {
      const name = typeof body?.name === "string" ? body.name.trim() : "";
      const phoneNumber = typeof body?.phoneNumber === "string" ? body.phoneNumber : "";
      const phone = normalizePhone(phoneNumber);

      if (!name) {
        return jsonResponse({ message: "Enter a plumber name" }, 400);
      }
      if (!phone) {
        return jsonResponse({ message: "Enter a valid phone number" }, 400);
      }

      return await createPlumber(admin, name, phone);
    }

    if (action === "delete") {
      const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
      if (!userId) {
        return jsonResponse({ message: "User id is required" }, 400);
      }

      return await deletePlumber(admin, adminCheck.adminId, userId);
    }

    return jsonResponse({ message: "Unknown action" }, 400);
  } catch (error) {
    console.error("manage-users error:", error);
    return jsonResponse({ message: "Invalid request body" }, 400);
  }
});

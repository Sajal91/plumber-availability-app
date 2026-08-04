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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ message: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const phoneNumber = typeof body?.phoneNumber === "string" ? body.phoneNumber : "";
    const phone = normalizePhone(phoneNumber);

    if (!phone) {
      return new Response(
        JSON.stringify({ message: "Enter a valid phone number" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ message: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: resolved, error } = await supabase.rpc("resolve_registered_phone", {
      phone,
    });

    if (error) {
      console.error("resolve_registered_phone error:", error.message);
      return new Response(
        JSON.stringify({ message: "Unable to verify phone number" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const profile = Array.isArray(resolved) ? resolved[0] : resolved;

    if (!profile?.profile_id || !profile?.phone_number) {
      return new Response(
        JSON.stringify({
          message: "Phone number not registered. Contact admin.",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const authPhone = toAuthPhone(profile.phone_number);

    // Keep Auth phone in GoTrue's lookup format so shouldCreateUser:false works.
    const { error: syncError } = await supabase.auth.admin.updateUserById(
      profile.profile_id,
      { phone: authPhone },
    );

    if (syncError) {
      console.error("auth phone sync error:", syncError.message);
      // Still allow OTP — client sends E.164; Auth may already match.
    }

    return new Response(
      JSON.stringify({
        message: "OTP may be sent",
        phone: profile.phone_number.startsWith("+")
          ? profile.phone_number
          : `+${profile.phone_number}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("request-otp error:", error);
    return new Response(JSON.stringify({ message: "Invalid request body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

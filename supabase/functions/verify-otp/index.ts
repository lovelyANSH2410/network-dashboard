import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyOtpRequest {
  email?: string;
  phone?: string;
  otp: string;
  isSignUp: boolean;
  userData?: {
    first_name: string;
    last_name: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, phone, otp, isSignUp, userData }: VerifyOtpRequest = await req.json();

    if (!email && !phone) {
      return new Response(
        JSON.stringify({ error: "Email or phone number is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!otp || otp.length !== 6) {
      return new Response(
        JSON.stringify({ error: "Valid 6-digit OTP is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Verifying OTP: ${otp} for ${email || phone}`);

    // Find and verify OTP
    const { data: otpRecords, error: otpError } = await supabase
      .from("otp_codes")
      .select("*")
      .eq(email ? "email" : "phone", email || phone)
      .eq("otp_code", otp)
      .eq("verified", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    const otpRecord = otpRecords?.[0];

    if (otpError || !otpRecord) {
      console.error("OTP verification failed:", otpError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired OTP code" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mark OTP as verified
    const { error: updateError } = await supabase
      .from("otp_codes")
      .update({ verified: true })
      .eq("id", otpRecord.id);

    if (updateError) {
      console.error("Error updating OTP:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to verify OTP" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let authResult;

    if (isSignUp) {
      // Create new user
      if (email) {
        authResult = await supabase.auth.admin.createUser({
          email: email,
          email_confirm: true, // Skip email confirmation since we verified via OTP
          user_metadata: userData || {}
        });
      } else {
        // For phone signup, create user with phone
        authResult = await supabase.auth.admin.createUser({
          phone: phone,
          phone_confirm: true, // Skip phone confirmation since we verified via OTP
          user_metadata: userData || {}
        });
      }

      if (authResult.error) {
        console.error("Error creating user:", authResult.error);
        return new Response(
          JSON.stringify({ error: "Failed to create user account" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("User created successfully:", authResult.data.user?.id);
    } else {
      // For sign in, find existing user
      const { data: users } = await supabase.auth.admin.listUsers();
      const existingUser = users.users?.find(user => 
        email ? user.email === email : user.phone === phone
      );

      if (!existingUser) {
        console.error("User not found");
        return new Response(
          JSON.stringify({ error: "User not found. Please sign up first." }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      authResult = { data: { user: existingUser }, error: null };
    }

    // Generate session token for the user
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email || authResult.data.user?.email || '',
      options: {
        redirectTo: `${req.headers.get('origin') || 'http://localhost:3000'}/`
      }
    });

    if (sessionError) {
      console.error("Error generating session:", sessionError);
      return new Response(
        JSON.stringify({ error: "Failed to create session" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Clean up old OTP codes for this email/phone
    await supabase
      .from("otp_codes")
      .delete()
      .eq(email ? "email" : "phone", email || phone)
      .neq("id", otpRecord.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        user: authResult.data.user,
        session: sessionData,
        message: isSignUp ? "Account created successfully" : "Signed in successfully"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in verify-otp function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
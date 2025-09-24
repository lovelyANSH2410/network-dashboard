import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PendingRequest {
  firstName: string;
  lastName: string;
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { firstName, lastName, email }: PendingRequest = await req.json();

    console.log(`Received pending request from ${email}: ${firstName} ${lastName}`);

    const adminEmail = Deno.env.get("ADMIN_EMAIL") || "admin@example.com"; // Replace with actual admin email

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb; text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
          New User Registration - IIM-AMS
        </h1>

        <p>Dear Admin,</p>

        <p>A new user has successfully registered on the IIM-AMS platform and is now pending approval. Please review their profile and take appropriate action.</p>

        <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0;">
          <h3 style="color: #2563eb; margin-top: 0;">New User Details:</h3>
          <ul style="list-style-type: none; padding: 0;">
            <li><strong>Name:</strong> ${firstName} ${lastName}</li>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Registration Time:</strong> ${new Date().toLocaleString()}</li>
            <li><strong>Status:</strong> Pending Approval</li>
          </ul>
        </div>

        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
          <h3 style="color: #f59e0b; margin-top: 0;">Action Required:</h3>
          <p style="margin-bottom: 0;">
            Please log in to the admin dashboard to review and approve this user's profile. 
            The user will be notified once their profile is approved.
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${Deno.env.get("ADMIN_DASHBOARD_URL") || "https://your-app.com/admin"}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Go to Admin Dashboard
          </a>
        </div>

        <p>Best regards,<br>
        IIM-AMS Automated System</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280; text-align: center;">
          This is an automated message from IIM-AMS Alumni Management System
        </p>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "IIM-AMS <onboarding@resend.dev>",
      to: [adminEmail], // Send to admin
      reply_to: email, // Set reply-to to user's email
      subject: `New User Registration: ${firstName} ${lastName} - Pending Approval`,
      html: htmlContent,
    });

    console.log("Pending request email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("Error in request-pending function:", error);
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

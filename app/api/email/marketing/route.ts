import { NextResponse } from "next/server";
import { getResend } from "@/lib/resend";


export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      to,
      subject,
      headline,
      subtext,
      heroImage,
      productImages,
      ctaLabel,
      ctaUrl,
    } = body || {};

    if (!to || (Array.isArray(to) && to.length === 0) || !subject) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: to, subject" },
        { status: 400 }
      );
    }

    const safeHeadline = headline || "New Drop | Live Now";
    const safeSubtext =
      subtext ||
      "Fresh pieces just landed. Tap in before sizes sell out.";
    const safeHeroImage = heroImage || "";

    const productGridHtml = Array.isArray(productImages)
      ? productImages
          .filter(Boolean)
          .map(
            (src: string) => `
              <td align="center" style="padding:6px;">
                <img src="${src}" alt="" width="120" height="120" style="display:block; border-radius:8px; border:1px solid #e5e5e5; object-fit:cover;" />
              </td>
            `
          )
          .join("")
      : "";

    const hasGrid = productGridHtml.length > 0;

    const whatsappLink =
      process.env.NEXT_PUBLIC_WHATSAPP_URL || "https://wa.me/YOUR_SUPPORT_PHONE";
    const whatsappChannelLink =
      process.env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL || "https://whatsapp.com/channel";
    const instagramLink =
      process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://example.com";

    const html = `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f5; padding:24px 0;">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" border="0" style="max-width:540px; width:100%; background:#ffffff; border-radius:18px; overflow:hidden; border:1px solid #e5e5e5;">
              <tr>
                <td align="center" style="padding:18px 22px 10px 22px; font-family:Arial,Helvetica,sans-serif;">
                  <div style="font-size:11px; letter-spacing:3px; text-transform:uppercase; color:#a3a3a3; margin-bottom:6px;">
                    BLING’D 
                  </div>
                  <div style="font-size:22px; font-weight:700; color:#111111; margin-bottom:4px;">
                    ${safeHeadline}
                  </div>
                  <div style="font-size:13px; color:#666666; max-width:420px; margin:0 auto;">
                    ${safeSubtext}
                  </div>
                </td>
              </tr>

              ${
                safeHeroImage
                  ? `
              <tr>
                <td align="center" style="padding:12px 22px 4px 22px;">
                  <img src="${safeHeroImage}" alt="" style="max-width:100%; border-radius:16px; display:block; border:1px solid #e5e5e5;" />
                </td>
              </tr>`
                  : ""
              }

              ${
                hasGrid
                  ? `
              <tr>
                <td align="center" style="padding:10px 14px 4px 14px;">
                  <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto; max-width:460px;">
                    <tr>
                      ${productGridHtml}
                    </tr>
                  </table>
                </td>
              </tr>`
                  : ""
              }

              <tr>
                <td align="center" style="padding:16px 22px 6px 22px;">
                  <a
                    href="${ctaUrl || process.env.NEXT_PUBLIC_SITE_URL || "#"}"
                    style="display:inline-block; background:#050505; color:#ffffff; text-decoration:none; font-family:Arial,Helvetica,sans-serif; font-size:14px; font-weight:bold; padding:11px 38px; border-radius:999px; letter-spacing:1px; border:1px solid #050505;"
                  >
                    ${ctaLabel || "SHOP NOW"}
                  </a>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding:4px 22px 12px 22px;">
                  <a
                    href="${ctaUrl || process.env.NEXT_PUBLIC_SITE_URL || "#"}"
                    style="display:inline-block; background:#ffffff; color:#050505; text-decoration:none; font-family:Arial,Helvetica,sans-serif; font-size:13px; font-weight:500; padding:9px 34px; border-radius:999px; border:1px solid #050505; letter-spacing:0.5px;"
                  >
                    VIEW DROP
                  </a>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding:4px 22px 14px 22px;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" style="padding:0 6px;">
                        <a href="${whatsappLink}">
                          <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/WhatsApp_icon.png" alt="WhatsApp" width="20" height="20" style="display:block; border-radius:6px; filter:grayscale(100%);">
                        </a>
                      </td>
                      <td align="center" style="padding:0 6px;">
                        <a href="${whatsappChannelLink}">
                          <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/WhatsApp_icon.png" alt="WhatsApp Channel" width="20" height="20" style="display:block; border-radius:6px; filter:grayscale(100%); opacity:0.85;">
                        </a>
                      </td>
                      <td align="center" style="padding:0 6px;">
                        <a href="${instagramLink}">
                          <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png" alt="Instagram" width="20" height="20" style="display:block; border-radius:6px; filter:grayscale(100%);">
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding:0 22px 18px 22px; font-family:Arial,Helvetica,sans-serif; font-size:11px; color:#9e9e9e; line-height:1.6;">
                  You are receiving this because you interacted with BLING’D.<br/>
                  No spam, only important drops and updates.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;

    const recipientsRaw = Array.isArray(to) ? to.filter(Boolean) : [to];
    const recipients = recipientsRaw.map(r => {
      if (r === 'ADMIN') {
        return process.env.ADMIN_NOTIFICATION_EMAIL || "officialtimzi@gmail.com";
      }
      return r;
    }).filter(Boolean);

    await Promise.all(
      recipients.map((recipient) =>
        getResend().emails.send({
          from: 'BLING’D <marketing@example.com>',
          to: recipient as string,
          subject: subject,
          html: html,
        })
      )
    );

    return NextResponse.json(
      { success: true, sent: recipients.length },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("marketing email error", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to send email" },
      { status: 500 }
    );
  }
}

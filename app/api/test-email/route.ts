import { NextResponse } from 'next/server';
import { getResend } from '@/lib/resend';

export async function GET() {
  try {
    const { data, error } = await getResend().emails.send({
      from: 'BLING’D <orders@example.com>',
      to: 'timileyinajayi1206@gmail.com',
      subject: 'Hello World',
      html: '<p>Congrats on sending your <strong>first email</strong> via Resend in BLING’D!</p>'
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ message: 'Test email sent successfully', data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

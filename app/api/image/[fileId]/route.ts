import { NextResponse } from 'next/server';
import { Config } from '@/lib/appwriteConfig';

export async function GET(_req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;

  // Prefer server-side proxy using Appwrite API key when available
  const project = Config.projectId;
  const bucket = Config.bucketId;

  // Build Appwrite view URL (public, may require auth)
  const endpoint = (Config.endpoint || 'https://fra.cloud.appwrite.io/v1').replace(/\/$/, '');
  const viewUrl = `${endpoint}/storage/buckets/${encodeURIComponent(bucket)}/files/${encodeURIComponent(fileId)}/view?project=${encodeURIComponent(project)}`;

  try {
    // If no server API key is present, redirect browser to the public view URL and let the client show the error (401/403/404)
    if (!process.env.APPWRITE_API_KEY) {
      return NextResponse.redirect(viewUrl);
    }

    const headers: Record<string, string> = {
      'X-Appwrite-Key': process.env.APPWRITE_API_KEY as string,
      'X-Appwrite-Project': project,
    };

    const res = await fetch(viewUrl, { headers });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json({ error: 'Failed to fetch file from Appwrite', status: res.status, body: text }, { status: 502 });
    }

    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const stream = res.body;

    return new NextResponse(stream, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (err: any) {
    console.error('Image proxy error', err);
    return NextResponse.json({ error: 'Server error fetching image' }, { status: 500 });
  }
}

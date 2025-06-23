// src/app/api/wasm/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const fileName = resolvedParams.path.join('/');
    
    // Pour Vercel, on utilise une approche différente
    // Redirection vers les fichiers statiques
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : new URL(request.url).origin;
    
    const staticUrl = `${baseUrl}/wasm/${fileName}`;
    
    try {
      const response = await fetch(staticUrl);
      
      if (!response.ok) {
        return new NextResponse(`WASM file not found: ${fileName}`, { status: 404 });
      }
      
      const arrayBuffer = await response.arrayBuffer();
      
      return new NextResponse(arrayBuffer, {
        headers: {
          'Content-Type': 'application/wasm',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Cross-Origin-Embedder-Policy': 'require-corp',
          'Cross-Origin-Opener-Policy': 'same-origin',
        }
      });
    } catch (fetchError) {
      console.error('Error fetching WASM file:', fetchError);
      return new NextResponse('WASM file not accessible', { status: 404 });
    }
    
  } catch (error) {
    console.error('Error in WASM route:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
// src/app/api/wasm/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // Change this for Vercel

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const fileName = resolvedParams.path.join('/');
    
    // Map of WASM files - add your actual WASM files here
    const wasmFiles: { [key: string]: string } = {
      'web-ifc.wasm': '/wasm/web-ifc.wasm',
      'web-ifc-mt.wasm': '/wasm/web-ifc-mt.wasm',
      // Add other WASM files as needed
    };
    
    const publicPath = wasmFiles[fileName];
    
    if (!publicPath) {
      return new NextResponse('WASM file not found', { status: 404 });
    }
    
    // For Vercel, we need to fetch from the public URL
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : request.nextUrl.origin;
    
    const wasmUrl = `${baseUrl}${publicPath}`;
    
    const response = await fetch(wasmUrl);
    
    if (!response.ok) {
      return new NextResponse('WASM file not found', { status: 404 });
    }
    
    const wasmBuffer = await response.arrayBuffer();
    
    return new NextResponse(wasmBuffer, {
      headers: {
        'Content-Type': 'application/wasm',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
    
  } catch (error) {
    console.error('Error serving WASM file:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
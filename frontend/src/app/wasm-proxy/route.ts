// app/wasm-proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const runtime = 'edge'; // Utilisez le runtime Edge

export async function GET(request: NextRequest) {
  // Récupère le chemin du fichier WASM demandé
  const url = new URL(request.nextUrl);
  const path = url.pathname.replace('/wasm-proxy/', '');
  
  // URL de base pour les fichiers WASM (peut être ajusté si nécessaire)
  const wasmBaseUrl = 'https://wi-vision.vercel.app/wasm/';
  
  try {
    const response = await fetch(`${wasmBaseUrl}${path}`);
    
    if (!response.ok) {
      return new NextResponse('WASM file not found', { status: 404 });
    }
    
    const wasmFile = await response.arrayBuffer();
    
    return new NextResponse(wasmFile, {
      headers: {
        'Content-Type': 'application/wasm',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
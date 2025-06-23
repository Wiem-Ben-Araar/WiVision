import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"

export async function GET( { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await params
    const filePath = join(process.cwd(), "public", "wasm", ...path)

    // Security check
    if (!filePath.includes(join(process.cwd(), "public", "wasm"))) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const fileBuffer = await readFile(filePath)

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/wasm",
        "Cross-Origin-Embedder-Policy": "require-corp",
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Resource-Policy": "cross-origin",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error) {
    console.error("Error serving WASM file:", error)
    return new NextResponse("WASM file not found", { status: 404 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await params
    const fileName = path[path.length - 1]

    // Security check
    if (!fileName.endsWith(".wasm")) {
      return new NextResponse("Only WASM files allowed", { status: 403 })
    }

    let filePath: string

    // Try different locations for the WASM file
    const possiblePaths = [
      join(process.cwd(), "public", "wasm", fileName),
      join(process.cwd(), "node_modules", "web-ifc", fileName),
      join(process.cwd(), "node_modules", "web-ifc", "dist", fileName),
      join(process.cwd(), ".next", "static", "chunks", "wasm", fileName),
    ]

    let fileBuffer: Buffer | null = null

    for (const possiblePath of possiblePaths) {
      try {
        fileBuffer = await readFile(possiblePath)
        filePath = possiblePath
        console.log(`Found WASM file at: ${possiblePath}`)
        break
      } catch (error) {
        console.log(`WASM file not found at: ${possiblePath}`)
      }
    }

    if (!fileBuffer) {
      console.error(`WASM file ${fileName} not found in any location`)
      return new NextResponse("WASM file not found", { status: 404 })
    }

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
    return new NextResponse("Internal server error", { status: 500 })
  }
}

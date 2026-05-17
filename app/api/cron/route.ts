import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  revalidatePath("/")
  return NextResponse.json({ ok: true, revalidatedAt: new Date().toISOString() })
}

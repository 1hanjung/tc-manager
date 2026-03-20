import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 프로젝트 삭제
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.project.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}

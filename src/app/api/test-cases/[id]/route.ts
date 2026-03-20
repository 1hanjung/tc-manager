import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 테스트 케이스 상태/내용 수정
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const updated = await prisma.testCase.update({
    where: { id: Number(id) },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.title && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.precondition !== undefined && { precondition: body.precondition }),
      ...(body.steps && { steps: JSON.stringify(body.steps) }),
      ...(body.expected && { expected: body.expected }),
      ...(body.priority && { priority: body.priority }),
    },
  });
  return NextResponse.json(updated);
}

// 테스트 케이스 삭제
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.testCase.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 프로젝트 목록 조회
export async function GET() {
  const projects = await prisma.project.findMany({
    include: {
      _count: { select: { testCases: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(projects);
}

// 프로젝트 생성
export async function POST(req: Request) {
  const body = await req.json();
  const project = await prisma.project.create({
    data: {
      name: body.name,
      description: body.description,
    },
  });
  return NextResponse.json(project, { status: 201 });
}

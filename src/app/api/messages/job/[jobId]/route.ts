import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const messages = await prisma.message.findMany({
      where: { jobId: params.jobId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('get messages error:', error);
    return NextResponse.json(
      { message: 'Ошибка получения сообщений' },
      { status: 500 }
    );
  }
}

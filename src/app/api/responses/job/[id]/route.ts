import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const responses = await prisma.response.findMany({
      where: { jobId: params.id },
      include: {
        worker: {
          select: {
            id: true,
            name: true,
            rating: true,
            city: true,
            jobsDone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ responses });
  } catch (error) {
    console.error('get responses error:', error);
    return NextResponse.json(
      { message: 'Ошибка получения откликов' },
      { status: 500 }
    );
  }
}

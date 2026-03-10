import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const job = await prisma.job.findUnique({
      where: { id: params.id },
      include: {
        employer: {
          select: {
            id: true,
            name: true,
            rating: true,
            city: true,
            phone: true,
          },
        },
        worker: {
          select: {
            id: true,
            name: true,
            rating: true,
            phone: true,
          },
        },
        _count: {
          select: { responses: true },
        },
      },
    });

    if (!job) {
      return NextResponse.json(
        { message: 'Заказ не найден' },
        { status: 404 }
      );
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error('get job error:', error);
    return NextResponse.json(
      { message: 'Ошибка получения заказа' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const ratings = await prisma.rating.findMany({
      where: { toUserId: params.userId },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
          },
        },
        job: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ ratings });
  } catch (error) {
    console.error('get ratings error:', error);
    return NextResponse.json(
      { message: 'Ошибка получения отзывов' },
      { status: 500 }
    );
  }
}

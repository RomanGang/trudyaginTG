import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employerId = searchParams.get('employerId');
    const workerId = searchParams.get('workerId');

    let where: Record<string, unknown> = {};
    
    if (employerId) {
      where.employerId = employerId;
    } else if (workerId) {
      where.workerId = workerId;
    }

    const jobs = await prisma.job.findMany({
      where,
      include: {
        employer: {
          select: {
            id: true,
            name: true,
            rating: true,
          },
        },
        worker: {
          select: {
            id: true,
            name: true,
            rating: true,
          },
        },
        _count: {
          select: { responses: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('my-jobs error:', error);
    return NextResponse.json(
      { message: 'Ошибка получения заказов' },
      { status: 500 }
    );
  }
}

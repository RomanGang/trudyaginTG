import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const [jobsCount, workersCount, completedCount] = await Promise.all([
      prisma.job.count({ where: { status: 'open' } }),
      prisma.user.count({ where: { role: 'worker' } }),
      prisma.job.count({ where: { status: 'completed' } }),
    ]);

    return NextResponse.json({
      jobs: jobsCount,
      workers: workersCount,
      done: completedCount,
    });
  } catch (error) {
    console.error('stats error:', error);
    return NextResponse.json(
      { message: 'Ошибка получения статистики' },
      { status: 500 }
    );
  }
}

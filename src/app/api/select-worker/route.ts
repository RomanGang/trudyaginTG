import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const selectWorkerSchema = z.object({
  jobId: z.string(),
  workerId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, workerId } = selectWorkerSchema.parse(body);

    // Update job with selected worker
    const job = await prisma.job.update({
      where: { id: jobId },
      data: {
        workerId,
        status: 'in_progress',
      },
    });

    // Update response status
    await prisma.response.updateMany({
      where: { jobId, workerId },
      data: { status: 'accepted' },
    });

    // Reject other responses
    await prisma.response.updateMany({
      where: {
        jobId,
        workerId: { not: workerId },
      },
      data: { status: 'rejected' },
    });

    return NextResponse.json({ success: true, job });
  } catch (error) {
    console.error('select-worker error:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка выбора исполнителя' },
      { status: 400 }
    );
  }
}

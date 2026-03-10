import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { jobId, workerId } = await req.json();
    if (!jobId || !workerId) {
      return NextResponse.json({ success: false, message: 'Ошибка' });
    }
    db.updateJob(jobId, { workerId, status: 'in_progress' });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Ошибка' });
  }
}

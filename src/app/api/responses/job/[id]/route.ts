import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const responses = db.getResponses(params.id);
    const responsesWithWorkers = responses.map(r => ({
      ...r,
      worker: db.getUserById(r.workerId)
    }));
    return NextResponse.json({ responses: responsesWithWorkers });
  } catch (error) {
    return NextResponse.json({ message: 'Ошибка' }, { status: 500 });
  }
}

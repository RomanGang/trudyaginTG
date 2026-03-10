import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const job = db.getJobById(params.id);
    if (!job) {
      return NextResponse.json({ message: 'Заказ не найден' }, { status: 404 });
    }
    const employer = db.getUserById(job.employerId);
    const responseCount = db.getResponses(job.id).length;
    return NextResponse.json({ 
      job: {
        ...job,
        employer: employer ? { id: employer.id, name: employer.name, rating: employer.rating, city: employer.city, phone: employer.phone } : null,
        worker: job.workerId ? db.getUserById(job.workerId) : null,
        _count: { responses: responseCount }
      }
    });
  } catch (error) {
    return NextResponse.json({ message: 'Ошибка получения заказа' }, { status: 500 });
  }
}

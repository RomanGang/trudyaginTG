import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');
    
    if (!userId || !role) {
      return NextResponse.json({ message: 'Ошибка' }, { status: 400 });
    }
    
    let jobs;
    if (role === 'employer') {
      jobs = db.getJobs({ employerId: userId });
    } else {
      const responses = db.getResponses(undefined, userId);
      const jobIds = responses.map(r => r.jobId);
      jobs = db.getJobs().filter(j => j.workerId === userId || jobIds.includes(j.id));
    }
    
    return NextResponse.json({ jobs });
  } catch (error) {
    return NextResponse.json({ message: 'Ошибка' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city') || undefined;
    const category = searchParams.get('category') || undefined;
    const employerId = searchParams.get('employerId') || undefined;
    const workerId = searchParams.get('workerId') || undefined;
    
    const jobs = db.getJobs({ city, category, employerId, workerId, status: 'open' });
    
    const jobsWithEmployer = jobs.map(job => {
      const employer = db.getUserById(job.employerId);
      const responseCount = db.getResponses(job.id).length;
      return {
        ...job,
        employer: employer ? { id: employer.id, name: employer.name, rating: employer.rating, city: employer.city } : null,
        _count: { responses: responseCount }
      };
    });
    
    return NextResponse.json({ jobs: jobsWithEmployer });
  } catch (error) {
    return NextResponse.json({ message: 'Ошибка получения заказов' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { title, description, payment, category, city, district, date, employerId } = await request.json();
    
    if (!title || !description || !payment || !category || !city || !date || !employerId) {
      return NextResponse.json({ success: false, message: 'Заполните все поля' });
    }
    
    const job = db.createJob({
      title,
      description,
      payment: Number(payment),
      category,
      city,
      district: district || '',
      date: new Date(date),
      employerId
    });
    
    return NextResponse.json({ success: true, job });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Ошибка создания заказа' });
  }
}

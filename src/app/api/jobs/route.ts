import { NextResponse } from 'next/server';

// In-memory jobs store
let jobs: any[] = [];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city') || undefined;
    const category = searchParams.get('category') || undefined;
    let filtered = jobs.filter(j => j.status === 'open');
    if (city) filtered = filtered.filter(j => j.city === city);
    if (category) filtered = filtered.filter(j => j.category === category);
    return NextResponse.json({ jobs: filtered });
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
    const job = { id: 'job_' + Date.now(), title, description, payment: Number(payment), category, city, district: district || '', date, status: 'open', employerId, createdAt: new Date().toISOString(), employer: { name: 'Employer', rating: 0 } };
    jobs.push(job);
    return NextResponse.json({ success: true, job });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Ошибка создания заказа' });
  }
}

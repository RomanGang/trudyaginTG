import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const createJobSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  payment: z.number().min(100),
  category: z.string().min(1),
  city: z.string().min(1),
  district: z.string().optional(),
  date: z.string(),
  employerId: z.string(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get('city');
    const category = searchParams.get('category');
    const status = searchParams.get('status') || 'open';

    const where: Record<string, unknown> = { status };
    
    if (city) where.city = city;
    if (category) where.category = category;

    const jobs = await prisma.job.findMany({
      where,
      include: {
        employer: {
          select: {
            id: true,
            name: true,
            rating: true,
            city: true,
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
    console.error('get jobs error:', error);
    return NextResponse.json(
      { message: 'Ошибка получения заказов' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createJobSchema.parse(body);

    const job = await prisma.job.create({
      data: {
        title: data.title,
        description: data.description,
        payment: data.payment,
        category: data.category,
        city: data.city,
        district: data.district,
        date: new Date(data.date),
        employerId: data.employerId,
      },
      include: {
        employer: {
          select: {
            id: true,
            name: true,
            rating: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, job });
  } catch (error) {
    console.error('create job error:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка создания заказа' },
      { status: 400 }
    );
  }
}

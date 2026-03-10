import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const loginSchema = z.object({
  phone: z.string().min(10),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, password } = loginSchema.parse(body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Пользователь не найден' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Неверный пароль' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        city: user.city,
        district: user.district,
        rating: user.rating,
        jobsDone: user.jobsDone,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('login error:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка входа' },
      { status: 400 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  code: z.string().length(4),
  password: z.string().min(4),
  role: z.enum(['worker', 'employer']),
  city: z.string().min(1),
  district: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    // Verify SMS code
    const smsCode = await prisma.smsCode.findFirst({
      where: {
        phone: data.phone,
        code: data.code,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!smsCode) {
      return NextResponse.json(
        { success: false, message: 'Неверный или истёкший код' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { phone: data.phone },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Пользователь уже существует' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        phone: data.phone,
        password: hashedPassword,
        name: data.name,
        role: data.role,
        city: data.city,
        district: data.district,
      },
    });

    // Mark code as used
    await prisma.smsCode.update({
      where: { id: smsCode.id },
      data: { used: true },
    });

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
    console.error('register error:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка регистрации' },
      { status: 400 }
    );
  }
}

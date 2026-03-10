import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateSmsCode } from '@/lib/utils';
import { z } from 'zod';

const sendCodeSchema = z.object({
  phone: z.string().min(10),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone } = sendCodeSchema.parse(body);

    // Generate code
    const code = generateSmsCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Delete old codes for this phone
    await prisma.smsCode.deleteMany({
      where: { phone },
    });

    // Create new code
    await prisma.smsCode.create({
      data: {
        phone,
        code,
        expiresAt,
      },
    });

    // In development, return the code
    const isDev = process.env.NODE_ENV !== 'production';
    
    return NextResponse.json({
      success: true,
      message: isDev ? `Код: ${code}` : 'Код отправлен',
      debug_code: isDev ? code : undefined,
    });
  } catch (error) {
    console.error('send-code error:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка отправки кода' },
      { status: 400 }
    );
  }
}

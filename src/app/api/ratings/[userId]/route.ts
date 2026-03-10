import { NextResponse } from 'next/server';
export async function GET(req: any, { params }: { params: { userId: string } }) {
  return NextResponse.json({ ratings: [] });
}

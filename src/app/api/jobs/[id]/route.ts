import { NextResponse } from 'next/server';
export async function GET(req: any, { params }: { params: { id: string } }) {
  return NextResponse.json({ job: null });
}

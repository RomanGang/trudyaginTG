import { NextResponse } from 'next/server';
export async function GET(req: any, { params }: { params: { jobId: string } }) {
  return NextResponse.json({ messages: [] });
}

import { NextRequest, NextResponse } from 'next/server';
import { createReport, getReports, deleteReport } from '@/config/firebase/backendService';

export async function POST(req: NextRequest) {
  try {
    const { userId, ...reportData } = await req.json();
    const result = await createReport(userId, reportData);
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.url.split('/').pop();
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    const result = await getReports(userId);
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const [userId, reportId] = req.url.split('/').slice(-2);
    if (!userId || !reportId) {
      return NextResponse.json({ error: 'User ID and Report ID are required' }, { status: 400 });
    }
    const result = await deleteReport(userId, reportId);
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error deleting report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '../../auth/[...nextauth]/options';
import dbConnect from '@/lib/dbConnect';
import CompanyModel from '@/models/Company';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 });
  }

  await dbConnect();

  const company = await CompanyModel.findById(session.user.companyId).select(
    'name avatarUrl slug designations settings',
  );

  if (!company) {
    return NextResponse.json({ message: 'Company not found' }, { status: 404 });
  }

  return NextResponse.json({ company }, { status: 200 });
}

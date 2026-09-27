import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import dbConnect from "@/lib/dbConnect";
import CompanyModel from "@/models/Company";
import mongoose from "mongoose";

/**
 * GET /api/company/me
 *
 * Returns the full Company document for the authenticated user s company.
 * Used by CompanyContext to populate the sidebar company name, avatar, and settings.
 */
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });

  if (!token?._id || !token?.companyId) {
    return NextResponse.json({ message: "Unauthorised" }, { status: 401 });
  }

  await dbConnect();

  try {
    const companyId = new mongoose.Types.ObjectId(String(token.companyId));

    const company = await CompanyModel.findById(companyId).lean();

    if (!company) {
      return NextResponse.json({ message: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      company: {
        _id:          String(company._id),
        name:         company.name,
        domain:       company.domain ?? null,
        avatarUrl:    company.avatarUrl ?? null,
        slug:         company.slug,
        designations: company.designations ?? [],
        settings:     company.settings ?? {},
      },
    });
  } catch (error) {
    console.error("[GET /api/company/me]", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

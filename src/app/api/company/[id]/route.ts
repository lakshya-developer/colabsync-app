import { Transaction } from "@/helper/transaction";
import dbConnect from "@/lib/dbConnect";
import { AuditLogModel } from "@/models/AuditLog";
import CompanyModel from "@/models/Company";
import UserModel from "@/models/User";
import mongoose, { ObjectId } from "mongoose";
import { getToken } from "next-auth/jwt";
import { parseAppSegmentConfig } from "next/dist/build/segment-config/app/app-segment-config";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  dbConnect();

  try {
    const paramsInfo = await params;
    const companyId = paramsInfo.id;

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Company Id provided is not valid Object Id.",
        },
        { status: 400 },
      );
    }


    const company = await CompanyModel.findOne({ _id: companyId });

    if (!company) {
      return Response.json(
        {
          success: true,
          message: "Workspace with this Id does not exist.",
        },
        { status: 404 },
      );
    }

    if (company.isDeleted) {
      return Response.json(
        {
          success: true,
          message:
            "Workspace has been deleted please contact our team or request on __________ to revive your workspace.",
        },
        { status: 404 },
      );
    }

    return Response.json(
      {
        success: true,
        message: "Data found.",
        data: company,
      },
      { status: 200 },
    );
  } catch (error) {
    console.log("Error getting Company Data.", error);
    return Response.json(
      {
        success: false,
        message: "There was and error while getting comapny data",
        error: error,
      },
      { status: 500 },
    );
  }
}


export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await dbConnect();

  try {
    const paramsInfo = await params;
    if (!mongoose.Types.ObjectId.isValid(paramsInfo.id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Company Id provided is not valid Object Id.",
        },
        { status: 400 },
      );
    }

    const token = await getToken({ req: request });

    if (!token || token.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message:
            "You are not authenticated or authorized to update workspace.",
        },
        { status: 400 },
      );
    }

    const companyInfo = await CompanyModel.findOne({
      _id: new mongoose.Types.ObjectId(String(token.companyId)),
    });

    if (!companyInfo) {
      return NextResponse.json(
        {
          success: false,
          message: "The workspace does not exist or you don't have access.",
        },
        { status: 404 },
      );
    }

    const body = await request.json();
    const allowedTopFields = [
      "name",
      "domain",
      "avatarUrl",
      "slug",
      "isDeleted",
    ];

    const allowedSettingsFields = ["timezone"];

    const allowedWorkingHoursFields = ["start", "end"];

    const allowedTaskFields = ["defaultPriority", "allowTaskDelete"];

    const allowedChatFields = ["allowFileSharing", "archivePeriodDays"];

    const allowedPolicyFields = ["passwordExpiryDays", "allowExternalUsers"];

    const updates: any = {};
    const arrayUpdates: any = {};

    // Top level fields
    for (const field of allowedTopFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // Settings level
    for (const field of allowedSettingsFields) {
      if (body.settings?.[field] !== undefined) {
        updates[`settings.${field}`] = body.settings[field];
      }
    }

    // Working hours
    for (const field of allowedWorkingHoursFields) {
      if (body.settings?.workingHours?.[field] !== undefined) {
        updates[`settings.workingHours.${field}`] =
          body.settings.workingHours[field];
      }
    }

    // Task settings
    for (const field of allowedTaskFields) {
      if (body.settings?.task?.[field] !== undefined) {
        updates[`settings.task.${field}`] = body.settings.task[field];
      }
    }

    // Chat settings
    for (const field of allowedChatFields) {
      if (body.settings?.chat?.[field] !== undefined) {
        updates[`settings.chat.${field}`] = body.settings.chat[field];
      }
    }

    // Policies
    for (const field of allowedPolicyFields) {
      if (body.settings?.policies?.[field] !== undefined) {
        updates[`settings.policies.${field}`] = body.settings.policies[field];
      }
    }

    // Custom object (direct replace)
    if (body.settings?.custom !== undefined) {
      updates["settings.custom"] = body.settings.custom;
    }

    // Array updates (designations)
    if (body.designations?.length) {
      arrayUpdates["designations"] = {
        $each: body.designations,
      };
    }

    // No updates check
    if (
      Object.keys(updates).length === 0 &&
      Object.keys(arrayUpdates).length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "No valid update field provided",
        },
        { status: 400 },
      );
    }

    const companyUpdate = await Transaction(async (session) => {
      // Update query
      const company = await CompanyModel.findByIdAndUpdate(
        paramsInfo.id,
        {
          ...(Object.keys(updates).length && { $set: updates }),
          ...(Object.keys(arrayUpdates).length && {
            $addToSet: arrayUpdates,
          }),
        },
        { new: true },
      ).session(session);

      if (!company) {
        return NextResponse.json(
          {
            success: false,
            message: "No such User with that id found.",
          },
          { status: 404 },
        );
      }

      function getValue(obj: any, path: string) {
        return path.split(".").reduce((o, key) => o?.[key], obj);
      }

      const previousFields: any = [];
      const currentFields: any = [];
      const query: any = {};

      // $set updates
      if (query.$set) {
        for (const field of Object.keys(query.$set)) {
          const prevValue = getValue(companyInfo, field);

          const currValue = getValue(company, field);

          // skip unchanged values
          if (JSON.stringify(prevValue) === JSON.stringify(currValue)) {
            continue;
          }

          previousFields.push({
            field,

            value: prevValue,
          });

          currentFields.push({
            field,

            value: currValue,
          });
        }
      }

      // designation add/remove tracking
      if (query.$addToSet?.designations || query.$pull?.designations) {
        previousFields.push({
          field: "designations",

          value: companyInfo.designations,
        });

        currentFields.push({
          field: "designations",

          value: company.designations,
        });
      }

      // create audit only if changes exist
      if (previousFields.length) {
        await AuditLogModel.create(
          [
            {
              action: "WORKSPACE_UPDATED",

              actorId: new mongoose.Types.ObjectId(token._id as string),

              targetType: "company",

              targetId: new mongoose.Types.ObjectId(paramsInfo.id),

              meta: {
                previous: previousFields,

                current: currentFields,

                note: `User ${token._id} updated workspace information ${paramsInfo.id}`,
              },
            },
          ],
          { session },
        );
      }

      return company;
    });

    return NextResponse.json(
      {
        success: true,
        message: "Workspace updated",
        data: companyUpdate,
      },
      { status: 200 },
    );
  } catch (error) {
    console.log("Error occured while updating workspace information.");
    return NextResponse.json(
      {
        success: false,
        message: "There was an error while updating workspace info.",
        error,
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await dbConnect();

  try {
    const paramsInfo = await params;
    if (!mongoose.Types.ObjectId.isValid(paramsInfo.id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Workspace id provided is not a valid objected id.",
        },
        { status: 400 },
      );
    }

    const token = await getToken({ req: request });
    if (!token || token.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your are not authenticated or authorized to remove workspace.",
        },
        { status: 400 },
      );
    }

    const company = await CompanyModel.findOne({
      _id: paramsInfo.id,
      createdBy: token._id,
    });
    if (!company || token.companyId !== company._id) {
      return NextResponse.json(
        {
          success: false,
          message: "Your are not authorized or the company does not exist.",
        },
        { status: 404 },
      );
    }

    const companyRemove = await Transaction(async (session) => {
      const companyUpdate = await CompanyModel.findOneAndUpdate(
        { _id: paramsInfo.id, companyId: token.companyId },
        { $set: { isDeleted: true } },
      ).session(session);

      await AuditLogModel.create(
        [
          {
            action: "WORKSPACE_REMOVED",
            actorId: token._id,
            targetType: "company",
            targetId: paramsInfo.id,
            meta: {
              note: `${token.name} with id: ${token._id} removed workspace ${company.name} with id:  ${paramsInfo.id}`,
            },
          },
        ],
        { session },
      );

      return company;
    });

    return NextResponse.json(
      {
        success: true,
        message: "Workspace removed successfully.",
        data: company,
      },
      { status: 200 },
    );
  } catch (error) {
    console.log("Ther was an error while removing the workspace.", error);
    return NextResponse.json(
      {
        success: false,
        message: "Threr was an error while removing the workspace.",
        error,
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await dbConnect();

  try {
    const paramsInfo = await params;
    if (!mongoose.Types.ObjectId.isValid(paramsInfo.id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Workspace id provided is not a valid objected id.",
        },
        { status: 400 },
      );
    }

    const token = await getToken({ req: request });
    if (!token || token.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your are not authenticated or authorized to remove workspace.",
        },
        { status: 400 },
      );
    }

    const company = await CompanyModel.findOne({
      _id: paramsInfo.id,
      createdBy: token._id,
    });
    if (!company || token.companyId !== company._id) {
      return NextResponse.json(
        {
          success: false,
          message: "Your are not authorized or the company does not exist.",
        },
        { status: 404 },
      );
    }

    const deleteCompany = await Transaction(async (session) => {
      const companyDelete = await CompanyModel.deleteOne({
        _id: paramsInfo.id,
        createdBy: token._id,
      }).session(session);

      const managers = await UserModel.findOneAndUpdate(
        {companyId: paramsInfo.id, role: 'manager'},
        {$set: {companyId: null, isDeleted: true}}
      )

      const employee = await UserModel.findOneAndUpdate(
        {companyId: paramsInfo.id, role: 'employee'},
        {$set: {companyId: null, isDeleted: true}}
      )

      const admin = await UserModel.findOneAndUpdate(
        {_id: token._id, companyId: paramsInfo.id},
        {$set: {companyId: null}}
      )

      await AuditLogModel.create([{
        action: "COMPANY_DELETED",
        actorId: token._id,
        targetType: "company",
        targetId: paramsInfo.id,
        meta: {
          note: `${token.name} with id: ${token._id} deleted company ${company.name} ${paramsInfo.id}`,
        },
      }], { session });

      return company;
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Company Deleted successfully.',
        data: company
      },
      { status: 200 }
    )
  } catch (error) {
    console.log("Ther was an error while deleting the workspace.", error);
    return NextResponse.json(
      {
        success: false,
        message: "Threr was an error while deleting the workspace.",
        error,
      },
      { status: 500 },
    );
  }
}

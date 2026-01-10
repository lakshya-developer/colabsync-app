import dbConnect from "@/lib/dbConnect";
import UserModel from "@/models/User";
import CompanyModel from "@/models/Company";
import mongoose from "mongoose";

export function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id); 
}


export async function POST(request: Request) {
  dbConnect();

  try {

    const { name, domain, slug, avatar, createdBy} = await request.json()

    const existing = await CompanyModel.findOne({ slug });

    if(existing) {
      return Response.json(
        {
          success: false,
          message: "Company with that workspace already exist."
        },
        { status: 400 }
      )
    }
    
    const companyOwner = await UserModel.findOne({ _id: createdBy })

    if(!companyOwner) {
      return Response.json(
        {
          success: false,
          message: "User with that id does not exist."
        },
        { status: 404 }
      )
    }

    const newCompany = new CompanyModel({
      name: name,
      domain: domain,
      slug: slug,
      avatarUrl: avatar,
      createdBy: createdBy
    })

    await newCompany.save()

    companyOwner.companyId = newCompany._id
    await companyOwner.save()

    return Response.json(
      {
        success: true,
        message: "Company registered successfully.",
        data: newCompany
      },
      { status: 201 }
    )

  } catch (error) {
    console.log("Error in registring company.")
    return Response.json(
      {
        success: false,
        message: "There was an error in registring company",
        error: error
      },
      { status : 500}
    )
  }
}


export async function GET(request: Request) {
  dbConnect();

  try {
    const {searchParams} = new URL(request.url)
    const companyId = searchParams.get('cid')?.toString()
    

    const result = isValidObjectId(companyId as string)

    if(!result) {
      return Response.json(
        {
          success: false,
          message: 'Given Id is not a valid Objected Id'
        },
        { status: 400 }
      )
    }

    const company = await CompanyModel.findOne({ _id: companyId })

    if(!company) {
      return Response.json(
        {
          success: true,
          message: 'Workspace with this Id does not exist.'
        }
      )
    }

    return Response.json(
      {
        success: true,
        message: 'Data found.',
        data: company
      },
      { status: 200}
    )

  } catch (error) {
    console.log("Error getting Company Data.", error);
    return Response.json(
      {
        success: false,
        message: "There was and error while getting comapny data",
        error: error
      },
      { status: 500 }
    )
  }
}
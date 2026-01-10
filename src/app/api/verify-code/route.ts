import dbConnect from "@/lib/dbConnect";
import UserModel from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  await dbConnect()

  try {
    const {email,  code} = await request.json()

    const user = await UserModel.findOne({email})

    if(!user) {
      return Response.json(
        {
          success: false,
          message: "User does not exist."
        },
        { status: 404}
      )
    }

    const isCodeValid = await bcrypt.compare(
      code,
      user.emailVerification.codeHash
    )
    const isCodeExpired = new Date(user.emailVerification.expiresAt) < new Date()

    if(isCodeValid && !isCodeExpired){
      user.isVerified = true
      await user.save()

      return Response.json(
        {
          success: true,
          message: 'User verification complete.'
        },
        { status: 200}
      )
    } else if(isCodeExpired) {
      return Response.json(
        {
          success: false,
          message: 'Verification code is expired.'
        },
        { status: 400 }
      )
    } else {
      return Response.json(
        {
          success: false,
          message: 'Verification code does not match.'
        },
        { status: 400}
      )
    }

  } catch (error) {
    console.log("Error occured while verifing user.");
    return Response.json(
      {
        success: false,
        message: "There was an error while verifying user.",
        error: error
      },
      { status: 500 }
    )
  }
}
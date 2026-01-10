import dbConnect from "@/lib/dbConnect";
import UserModel from "@/models/User";
import bcrypt from 'bcryptjs'


import { sendVerificationEmail } from "@/helper/sendVerificationEmail";
import generateVerificationCode from "@/lib/generateVerificationCode";

export async function POST(request: Request) {
  await dbConnect();

  try {
    
    const {name, email, password, avatar} = await request.json();
    
    const existingUserWithEmail = await UserModel.findOne({ email });

    const  {code, codeHash, expiresAt} = await generateVerificationCode();
    console.log(code)

    if(existingUserWithEmail) {
      if(existingUserWithEmail.isVerified) {
        return Response.json(
          {
            success: false,
            message: "User with this email already exist."
          },
          {
            status: 400
          }
        )
      } else {
        const hashedPassword = await bcrypt.hash(password, 10)
        existingUserWithEmail.name = name
        existingUserWithEmail.passwordHashed = hashedPassword
        existingUserWithEmail.avatarUrl = avatar
        existingUserWithEmail.emailVerification = {codeHash, expiresAt}
        await existingUserWithEmail.save()
      }
    } else {
      const hashedPassword = await bcrypt.hash(password, 10)

      const newAdmin = new UserModel({
        name: name,
        email: email,
        passwordHashed: hashedPassword,
        role: 'admin',
        avatarUrl: avatar,
        emailVerification: {codeHash, expiresAt}
      })

      await newAdmin.save()
    }

    // send Verification Email

    const emailResponse = await sendVerificationEmail(
      email,
      name,
      code
    )

    if(!emailResponse.success) {
      return Response.json(
        {
          success: false,
          message: emailResponse.message
        },
        {status: 500}
      )
    }

    return Response.json(
      {
        success: true,
        message: 'User <Admin> registered successfully'
      },
      { status: 201 }
    )

  } catch (error) {
    console.log("Error registering Admin", error);
    return Response.json(
      {
        success: false,
        message: "Error registering user",
        error: error
      },
      {status: 500}
    )
  }
}
import dbConnect from "@/lib/dbConnect"
import NextAuth, { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import UserModel from "@/models/User"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: {label: 'Email', type: 'text'},
        password: {label: 'Password', type: 'password'}
      },
      async authorize(credentials: any): Promise<any> {
        await dbConnect()
        try {
          const user = await UserModel.findOne({
            email: credentials.identifier
          })

          if(!user) {
            throw new Error('No user found with that email.')
          }

          if(!user.isVerified) {
            throw new Error('Please verify your account before login')
          }

          const isPasswordCorrect = await bcrypt.compare(credentials.password, user.passwordHashed)

          if(isPasswordCorrect) {
            return user
          } else {
            throw new Error('Incorrect Password.')
          }
        } catch (err: any) {
          throw new Error(err)
        }
      }
    })
  ],
  callbacks: {
    async session({session, token}) {
      if(token) {
        session.user._id = token._id
        session.user.isVerified = token.isVerified
        session.user.companyId = token.companyId
        session.user.email = token.email
        session.user.name = token.email
        session.user.role = token.role
      }
      return session
    },
    async jwt({token, user}) {
      if(user) {
        token._id = user._id
        token.isVerified = user.isVerified
        token.companyId = user.companyId
        token.email = user.email
        token.name = user.name
        token.role = user.role
      }
      return token
    }
  },
  pages: {
    signIn: '/sign-in',
    signOut: '/sign-in'
  },
  session: {
    strategy: "jwt"
  },
  secret: process.env.NEXTAUTH_SECRET
}
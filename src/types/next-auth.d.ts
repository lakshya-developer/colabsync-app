import 'next-auth'
import { DefaultSession } from 'next-auth';
import mongoose from 'mongoose';


declare module 'next-auth' {
  interface User {
    _id?: string;
    email?: string;
    isVerified?: boolean;
    role?: "admin" | "manager" | "employee";
    companyId?: mongoose.Types.ObjectId;
  }
  interface Session{
    user: {
      _id?: string;
      email?: string;
      isVerified?: boolean;
      role?: "admin" | "manager" | "employee";
      companyId?: mongoose.Types.ObjectId;
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt'{
  interface JWT {
    _id?: string;
    email?: string;
    isVerified?: boolean;
    role?: "admin" | "manager" | "employee";
    companyId?: mongoose.Types.ObjectId;
  }
}
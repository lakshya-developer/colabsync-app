import mongoose from "mongoose";


export async function Transaction<T>(
  operations: (session: mongoose.ClientSession) => Promise<T>
): Promise<T>{
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const result = await operations(session);

    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
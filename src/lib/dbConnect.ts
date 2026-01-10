import mongoose from 'mongoose'

type ConnectionObject = {
  isConnected?: number
}

const connection: ConnectionObject = {}

async function dbConnect(): Promise<void> {
  if(connection.isConnected) {
    console.log("This is connection ",connection)
    console.log("Already connected to database.")
    return
  }

  try {
    const db = await mongoose.connect(process.env.MONGODB_URI || "", {})

    // console.log("DataBase connection response: ", db);

    connection.isConnected = db.connections[0].readyState

    console.log("DataBase connected successfully.")
    
  } catch (error) {
    console.log("Error while connecting Database", error)

    process.exit(1)
  }
}

export default dbConnect;
import dotenv from "dotenv";
dotenv.config();
import app from "./app";

const PORT = process.env.PORT || 3000;

async function connectDB() {
  console.log("DB connected (mock)");
}
async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);}
}

startServer();

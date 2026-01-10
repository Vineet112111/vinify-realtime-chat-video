import express from "express";
// import dotenv from "dotenv";
// dotenv.config();

// or 

import 'dotenv/config';

import authRoutes from "./routes/auth.route.js";
import { connectDB } from "./lib/db.js";
// import userRoutes from "./routes/user.route.js";
// import chatRoutes from "./routes/chat.route.js";


const app = express();
const PORT = process.env.PORT || 5001;
 
app.use("/api/auth", authRoutes);
// app.use("/api/users", userRoutes);
// app.use("/api/chat", chatRoutes);


app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
    connectDB();
})
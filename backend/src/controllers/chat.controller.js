import { generateStreamToken } from "../lib/stream.js";

export async function getStreamToken(req, res) {
  try {
    const userId = req.user.id;
    console.log(`[Chat] Generating Stream token for userId: ${userId}`);

    const token = generateStreamToken(userId);

    if (!token || typeof token !== "string") {
      console.error(`[Chat] Token generation returned invalid value for userId: ${userId}`);
      return res.status(500).json({ message: "Failed to generate stream token" });
    }

    console.log(`[Chat] Stream token sent to client for userId: ${userId}`);
    res.status(200).json({ token });
  } catch (error) {
    console.error("[Chat] Error in getStreamToken controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
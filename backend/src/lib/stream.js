import { StreamChat } from "stream-chat";
import "dotenv/config";

const apiKey = process.env.STEAM_API_KEY;
const apiSecret = process.env.STEAM_API_SECRET;

if (!apiKey || !apiSecret) {
  console.error(
    "[Stream] CRITICAL: Stream API key or Secret is missing from environment variables. " +
    "Video calling and chat will NOT work. Check STEAM_API_KEY and STEAM_API_SECRET in backend/.env"
  );
}

const streamClient = StreamChat.getInstance(apiKey, apiSecret);

export const upsertStreamUser = async (userData) => {
  try {
    await streamClient.upsertUsers([userData]);
    console.log(`[Stream] Upserted user: ${userData.id} (${userData.name})`);
    return userData;
  } catch (error) {
    console.error("[Stream] Error upserting user:", error.message);
    throw error; // re-throw so callers can handle it
  }
};

export const generateStreamToken = (userId) => {
  try {
    if (!userId) throw new Error("userId is required to generate a Stream token");
    // ensure userId is a string
    const userIdStr = userId.toString();
    const token = streamClient.createToken(userIdStr);
    console.log(`[Stream] Generated token for userId: ${userIdStr}`);
    return token;
  } catch (error) {
    console.error("[Stream] Error generating token:", error.message);
    throw error; // re-throw — do NOT silently return undefined
  }
};
import { create } from "zustand";
import { StreamChat } from "stream-chat";
import { StreamVideoClient } from "@stream-io/video-react-sdk";
import toast from "react-hot-toast";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

if (!STREAM_API_KEY) {
  console.error("[StreamStore] CRITICAL: VITE_STREAM_API_KEY is not set. Video calls and chat will fail.");
}

export const useStreamStore = create((set, get) => ({
  chatClient: null,
  videoClient: null,
  unreadMessageCount: 0,
  notificationsEnabled: localStorage.getItem("notifications-enabled") !== "false",
  isProfileModalOpen: false,
  queryClientRef: null,

  setNotificationsEnabled: (enabled) => {
    localStorage.setItem("notifications-enabled", enabled);
    set({ notificationsEnabled: enabled });
  },

  setProfileModalOpen: (isOpen) => {
    set({ isProfileModalOpen: isOpen });
  },

  initStream: async (authUser, token, queryClient) => {
    if (!authUser || !token) {
      console.warn("[StreamStore] initStream called without authUser or token — skipping.");
      return;
    }

    if (!STREAM_API_KEY) {
      console.error("[StreamStore] Cannot init Stream — API key missing.");
      return;
    }

    // Avoid duplicate initialization for the same user
    if (get().chatClient && get().chatClient.userID === authUser._id) {
      console.log("[StreamStore] Stream already initialized for user:", authUser._id);
      set({ queryClientRef: queryClient });
      return;
    }

    try {
      console.log("[StreamStore] Initializing Stream clients for user:", authUser._id, authUser.fullName);

      // Disconnect any existing video client before creating a new one
      const existingVideoClient = get().videoClient;
      if (existingVideoClient) {
        console.log("[StreamStore] Disconnecting existing videoClient before re-init...");
        try {
          await existingVideoClient.disconnectUser();
        } catch (e) {
          console.warn("[StreamStore] Error disconnecting old videoClient:", e.message);
        }
      }

      // Initialize Stream Chat
      const chatClient = StreamChat.getInstance(STREAM_API_KEY);

      if (chatClient.wsConnection?.connection_id) {
        console.log("[StreamStore] Disconnecting existing chat connection...");
        await chatClient.disconnectUser();
      }

      console.log("[StreamStore] Connecting chat user...");
      await chatClient.connectUser(
        {
          id: authUser._id,
          name: authUser.fullName,
          image: authUser.profilePic,
        },
        token
      );
      console.log("[StreamStore] Chat user connected:", authUser._id);

      // Initialize Stream Video Client
      console.log("[StreamStore] Creating StreamVideoClient...");
      const videoClient = new StreamVideoClient({
        apiKey: STREAM_API_KEY,
        user: {
          id: authUser._id,
          name: authUser.fullName,
          image: authUser.profilePic,
        },
        token,
      });
      console.log("[StreamStore] StreamVideoClient created successfully.");

      set({
        chatClient,
        videoClient,
        unreadMessageCount: chatClient.getUnreadCount(),
        queryClientRef: queryClient,
      });

      // Global listeners
      chatClient.on((event) => {
        const queryClient = get().queryClientRef;

        // Custom events for friend requests
        if (event.type === "friend_request_received" || event.type === "friend_request_accepted") {
          console.log("[StreamStore] Real-time friend request event:", event.type);
          if (queryClient) {
            queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
            queryClient.invalidateQueries({ queryKey: ["friends"] });
            queryClient.invalidateQueries({ queryKey: ["users"] });
            queryClient.invalidateQueries({ queryKey: ["outgoingFriendReqs"] });
          }

          if (event.type === "friend_request_received") {
            toast.success("New friend request received!");
            if (get().notificationsEnabled) {
              const sound = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav");
              sound.play().catch(err => console.log("Sound error:", err));
            }
          } else {
            toast.success("Friend request accepted! You can now chat.");
          }
        }

        // Unread message count
        if (event.type === "notification.message_new" || event.type === "message.new") {
          set({ unreadMessageCount: chatClient.getUnreadCount() });

          const notificationsEnabled = get().notificationsEnabled;
          if (notificationsEnabled && event.message?.user?.id !== authUser._id) {
            const isNotOnActiveChat = window.location.pathname !== `/chat/${event.message?.user?.id}`;
            if (document.hidden || isNotOnActiveChat) {
              const sound = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav");
              sound.play().catch(err => console.log("Sound error:", err));

              if (Notification.permission === "granted") {
                const notification = new Notification(`New message from ${event.message?.user?.name || "Friend"}`, {
                  body: event.message?.text || "Sent an attachment",
                  icon: event.message?.user?.image || "/logo.png",
                });
                notification.onclick = () => {
                  window.focus();
                  window.location.href = `/chat/${event.message?.user?.id}`;
                };
              }
            }
          }
        }

        if (event.type === "message.read" || event.type === "notification.mark_read") {
          set({ unreadMessageCount: chatClient.getUnreadCount() });
        }
      });

    } catch (error) {
      console.error("[StreamStore] Error in initStream:", error);
      toast.error("Failed to initialize messaging/video services. Please refresh.");
    }
  },

  disconnectStream: async () => {
    const { chatClient, videoClient } = get();
    console.log("[StreamStore] Disconnecting Stream services...");
    if (chatClient) {
      try {
        await chatClient.disconnectUser();
        console.log("[StreamStore] Chat disconnected.");
      } catch (e) {
        console.warn("[StreamStore] Error disconnecting chat:", e.message);
      }
    }
    if (videoClient) {
      try {
        await videoClient.disconnectUser();
        console.log("[StreamStore] Video disconnected.");
      } catch (e) {
        console.warn("[StreamStore] Error disconnecting video:", e.message);
      }
    }
    set({ chatClient: null, videoClient: null, unreadMessageCount: 0, queryClientRef: null });
  }
}));


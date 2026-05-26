import { create } from "zustand";
import { StreamChat } from "stream-chat";
import { StreamVideoClient } from "@stream-io/video-react-sdk";
import toast from "react-hot-toast";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

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
    if (!authUser || !token) return;

    // Avoid duplicate initialization
    if (get().chatClient && get().chatClient.userID === authUser._id) {
      set({ queryClientRef: queryClient });
      return;
    }

    try {
      console.log("Initializing global Stream clients...");
      const chatClient = StreamChat.getInstance(STREAM_API_KEY);

      if (chatClient.wsConnection?.connection_id) {
        await chatClient.disconnectUser();
      }

      await chatClient.connectUser(
        {
          id: authUser._id,
          name: authUser.fullName,
          image: authUser.profilePic,
        },
        token
      );

      const videoClient = new StreamVideoClient({
        apiKey: STREAM_API_KEY,
        user: {
          id: authUser._id,
          name: authUser.fullName,
          image: authUser.profilePic,
        },
        token,
      });

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
          console.log("Real-time friend request event received:", event);
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
      console.error("Error in initStream:", error);
    }
  },

  disconnectStream: async () => {
    const { chatClient, videoClient } = get();
    if (chatClient) {
      await chatClient.disconnectUser();
    }
    if (videoClient) {
      await videoClient.disconnectUser();
    }
    set({ chatClient: null, videoClient: null, unreadMessageCount: 0, queryClientRef: null });
  }
}));

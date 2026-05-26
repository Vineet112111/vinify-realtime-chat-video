import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { useQuery } from "@tanstack/react-query";
import { getUserFriends } from "../lib/api";
import { useStreamStore } from "../store/useStreamStore";
import { Channel, Chat, MessageInput, MessageList, Thread, Window } from "stream-chat-react";
import { VideoIcon, ArrowLeftIcon, MessageSquareIcon } from "lucide-react";
import toast from "react-hot-toast";
import ChatLoader from "../components/ChatLoader";

const ChatPage = () => {
  const { id: targetUserId } = useParams();
  const navigate = useNavigate();

  const [channel, setChannel] = useState(null);
  const [presenceData, setPresenceData] = useState({});
  const [channelsData, setChannelsData] = useState({});
  const [loadingChannel, setLoadingChannel] = useState(false);

  const { authUser } = useAuthUser();
  const { chatClient, videoClient } = useStreamStore();

  // Fetch all friends
  const { data: friends = [], isLoading: loadingFriends } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
    enabled: !!authUser,
  });

  // Query real-time presence of friends via Stream Chat
  useEffect(() => {
    if (!chatClient || friends.length === 0) return;

    const fetchPresence = async () => {
      try {
        const friendIds = friends.map((f) => f._id);
        const res = await chatClient.queryUsers({ id: { $in: friendIds } });
        const presences = {};
        res.users.forEach((u) => {
          presences[u.id] = u.online;
        });
        setPresenceData(presences);
      } catch (err) {
        console.error("Error querying presence:", err);
      }
    };

    fetchPresence();

    const listener = chatClient.on("user.presence.changed", (event) => {
      if (event.user) {
        setPresenceData((prev) => ({
          ...prev,
          [event.user.id]: event.user.online,
        }));
      }
    });

    return () => listener.unsubscribe();
  }, [chatClient, friends]);

  // Query channel lists for last message and unread count previews
  useEffect(() => {
    if (!chatClient || !authUser || friends.length === 0) return;

    const fetchChannels = async () => {
      try {
        const res = await chatClient.queryChannels({
          type: "messaging",
          members: { $in: [authUser._id] },
        });

        const channelMap = {};
        res.forEach((ch) => {
          const otherMember = Object.keys(ch.state.members).find((id) => id !== authUser._id);
          if (otherMember) {
            channelMap[otherMember] = {
              unread: ch.countUnread(),
              lastMessage: ch.state.messages[ch.state.messages.length - 1]?.text || "Attachment",
              channelId: ch.id,
            };
          }
        });
        setChannelsData(channelMap);
      } catch (err) {
        console.error("Error querying channels:", err);
      }
    };

    fetchChannels();

    const listener = chatClient.on((event) => {
      if (
        event.type === "message.new" ||
        event.type === "notification.message_new" ||
        event.type === "message.read" ||
        event.type === "notification.mark_read"
      ) {
        fetchChannels();
      }
    });

    return () => listener.unsubscribe();
  }, [chatClient, friends, authUser]);

  // Handle active channel watching
  useEffect(() => {
    if (!chatClient || !authUser || !targetUserId) {
      setChannel(null);
      return;
    }

    let active = true;
    const watchActiveChannel = async () => {
      setLoadingChannel(true);
      try {
        const channelId = [authUser._id, targetUserId].sort().join("-");
        const currChannel = chatClient.channel("messaging", channelId, {
          members: [authUser._id, targetUserId],
        });

        await currChannel.watch();

        if (active) {
          setChannel(currChannel);
          // Mark channel read immediately
          await currChannel.markRead();
        }
      } catch (error) {
        console.error("Error watching channel:", error);
        toast.error("Could not load chat history");
      } finally {
        if (active) setLoadingChannel(false);
      }
    };

    watchActiveChannel();

    return () => {
      active = false;
    };
  }, [chatClient, targetUserId, authUser]);

  // Reverted to stable Link-Based Video Calling
  const handleVideoCall = async () => {
    if (!channel || !authUser) {
      toast.error("Chat channel is not ready.");
      return;
    }

    try {
      const callId = crypto.randomUUID();
      const callLink = `${window.location.origin}/call/${callId}`;

      // Send call invitation link as a message in the channel
      await channel.sendMessage({
        text: `📞 Join my video call: ${callLink}`,
      });

      // Navigate caller directly to the call screen
      navigate(`/call/${callId}`);
    } catch (error) {
      console.error("Call initialization error:", error);
      toast.error("Could not initiate call");
    }
  };

  if (!chatClient || loadingFriends) return <ChatLoader />;

  const targetFriend = friends.find((f) => f._id === targetUserId);
  const isOnline = targetUserId && presenceData[targetUserId];

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-base-100 overflow-hidden">
      {/* SIDEBAR: CHATS LIST (responsive hidden on mobile if active chat is open) */}
      <div
        className={`w-full md:w-80 border-r border-base-300 flex flex-col bg-base-200 ${
          targetUserId ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="p-4 border-b border-base-300 flex items-center justify-between bg-base-300/40">
          <h2 className="text-xl font-bold">Chats</h2>
          <Link to="/" className="btn btn-ghost btn-circle btn-sm">
            <ArrowLeftIcon className="size-4" />
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-base-300/50">
          {friends.length === 0 ? (
            <div className="p-6 text-center text-sm opacity-60">No connected friends yet. Add partners from Home page!</div>
          ) : (
            friends.map((friend) => {
              const chInfo = channelsData[friend._id];
              const isSelected = friend._id === targetUserId;
              const friendOnline = presenceData[friend._id];

              return (
                <Link
                  key={friend._id}
                  to={`/chat/${friend._id}`}
                  className={`flex items-center gap-3 p-4 hover:bg-base-300/50 transition-colors ${
                    isSelected ? "bg-base-300" : ""
                  }`}
                >
                  <div className="relative">
                    <div className="avatar size-12 rounded-full overflow-hidden">
                      <img src={friend.profilePic} alt={friend.fullName} className="object-cover" />
                    </div>
                    {friendOnline && (
                      <span className="absolute bottom-0 right-0 size-3 bg-success rounded-full border-2 border-base-200" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-semibold text-sm truncate text-base-content">{friend.fullName}</h3>
                    </div>
                    <p className="text-xs text-base-content/60 truncate">
                      {chInfo?.lastMessage || `Start chatting...`}
                    </p>
                  </div>

                  {chInfo?.unread > 0 && (
                    <span className="badge badge-primary badge-sm text-xs font-bold font-mono">
                      {chInfo.unread}
                    </span>
                  )}
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* CHAT WINDOW (responsive full screen on mobile if active chat is open) */}
      <div
        className={`flex-1 flex flex-col relative ${
          !targetUserId ? "hidden md:flex items-center justify-center bg-base-300/10" : "flex"
        }`}
      >
        {loadingChannel ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        ) : channel && targetFriend ? (
          <Chat client={chatClient}>
            <Channel channel={channel}>
              <div className="w-full h-full flex flex-col relative overflow-hidden">
                {/* Chat Custom Header */}
                <div className="p-3 border-b border-base-300 bg-base-200 flex items-center justify-between z-10 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Link to="/chat" className="btn btn-ghost btn-circle btn-sm md:hidden">
                      <ArrowLeftIcon className="size-5" />
                    </Link>
                    <div className="avatar size-10 rounded-full overflow-hidden">
                      <img src={targetFriend.profilePic} alt={targetFriend.fullName} className="object-cover" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm leading-tight">{targetFriend.fullName}</h4>
                      <p className="text-[10px] opacity-75 mt-0.5 flex items-center gap-1">
                        <span className={`size-1.5 rounded-full ${isOnline ? "bg-success" : "bg-neutral"} inline-block`} />
                        {isOnline ? "Online" : "Offline"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleVideoCall}
                    className="btn btn-circle btn-success btn-sm text-white hover:scale-105 transition-all shadow-md gap-1"
                    title="Direct Video Call"
                  >
                    <VideoIcon className="size-4" />
                  </button>
                </div>

                {/* Stream Chat Window */}
                <div className="flex-1 overflow-hidden relative flex flex-col bg-base-100/50">
                  <Window>
                    <MessageList />
                    <MessageInput focus />
                  </Window>
                </div>
              </div>
              <Thread />
            </Channel>
          </Chat>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center gap-4 text-base-content/40">
            <div className="p-5 rounded-full bg-base-200 border border-base-content/5 shadow-inner">
              <MessageSquareIcon className="size-16 opacity-60" />
            </div>
            <h3 className="text-xl font-bold">Your Conversations</h3>
            <p className="text-sm max-w-sm">Select a contact from the sidebar or click Message on any friend to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
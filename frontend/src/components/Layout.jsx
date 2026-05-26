import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import EditProfileModal from "./EditProfileModal";
import { Link, useLocation } from "react-router";
import { HomeIcon, MessageSquareIcon, UsersIcon, BellIcon } from "lucide-react";
import { useStreamStore } from "../store/useStreamStore";
import { useQuery } from "@tanstack/react-query";
import { getFriendRequests } from "../lib/api";
import useAuthUser from "../hooks/useAuthUser";

const Layout = ({ children, showSidebar = false }) => {
  const { authUser } = useAuthUser();
  const location = useLocation();
  const currentPath = location.pathname;
  const { unreadMessageCount, setProfileModalOpen } = useStreamStore();

  const { data: friendRequests } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: getFriendRequests,
    enabled: !!authUser,
  });

  const incomingCount = friendRequests?.incomingReqs?.length || 0;

  // Hide bottom navigation inside a chat room (e.g. /chat/:id) on mobile screens
  const isChatRoom = /^\/chat\/[a-zA-Z0-9_-]+$/.test(currentPath);
  const hideBottomNav = isChatRoom;

  return (
    <div className={`min-h-screen flex flex-col bg-base-100 ${hideBottomNav ? "" : "pb-16 lg:pb-0"}`}>
      <EditProfileModal />
      
      <div className="flex flex-1 overflow-hidden">
        {showSidebar && <Sidebar />}

        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />

          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      {!hideBottomNav && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-base-200 border-t border-base-300 lg:hidden flex justify-around items-center py-2 px-1 shadow-lg backdrop-blur-md bg-opacity-95">
          <Link
            to="/"
            className={`flex flex-col items-center gap-1 text-xs transition-colors flex-1 py-1 ${
              currentPath === "/" ? "text-primary font-bold" : "text-base-content/70 hover:text-primary"
            }`}
          >
            <HomeIcon className="size-5" />
            <span>Home</span>
          </Link>

          <Link
            to="/chat"
            className={`flex flex-col items-center gap-1 text-xs transition-colors flex-1 py-1 relative ${
              currentPath.startsWith("/chat") ? "text-primary font-bold" : "text-base-content/70 hover:text-primary"
            }`}
          >
            <MessageSquareIcon className="size-5" />
            <span>Chats</span>
            {unreadMessageCount > 0 && (
              <span className="badge badge-primary badge-xs absolute top-0.5 right-[30%] px-1 text-[9px] font-bold">
                {unreadMessageCount}
              </span>
            )}
          </Link>

          <Link
            to="/friends"
            className={`flex flex-col items-center gap-1 text-xs transition-colors flex-1 py-1 ${
              currentPath === "/friends" ? "text-primary font-bold" : "text-base-content/70 hover:text-primary"
            }`}
          >
            <UsersIcon className="size-5" />
            <span>Friends</span>
          </Link>

          <Link
            to="/notifications"
            className={`flex flex-col items-center gap-1 text-xs transition-colors flex-1 py-1 relative ${
              currentPath === "/notifications" ? "text-primary font-bold" : "text-base-content/70 hover:text-primary"
            }`}
          >
            <BellIcon className="size-5" />
            <span>Alerts</span>
            {incomingCount > 0 && (
              <span className="badge badge-secondary badge-xs absolute top-0.5 right-[30%] px-1 text-[9px] font-bold">
                {incomingCount}
              </span>
            )}
          </Link>

          <button
            onClick={() => setProfileModalOpen(true)}
            className="flex flex-col items-center gap-1 text-xs text-base-content/70 hover:text-primary transition-colors flex-1 py-1"
          >
            <div className="avatar">
              <div className="w-5 rounded-full ring-1 ring-base-content/30 overflow-hidden">
                <img 
                  src={authUser?.profilePic || "https://api.dicebear.com/7.x/identicon/png?seed=default"} 
                  alt="Avatar" 
                  className="object-cover"
                />
              </div>
            </div>
            <span>Profile</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Layout;
import { useState } from "react";
import { Link, useLocation } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { 
  BellIcon, 
  LogOutIcon, 
  ShipWheelIcon, 
  MessageSquareIcon, 
  MenuIcon, 
  XIcon, 
  SettingsIcon 
} from "lucide-react";
import ThemeSelector from "./ThemeSelector";
import useLogout from "../hooks/useLogout";
import { useStreamStore } from "../store/useStreamStore";
import { useQuery } from "@tanstack/react-query";
import { getFriendRequests } from "../lib/api";

const Navbar = () => {
  const { authUser } = useAuthUser();
  const location = useLocation();
  const { setProfileModalOpen, unreadMessageCount } = useStreamStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { data: friendRequests } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: getFriendRequests,
    enabled: !!authUser,
  });

  const incomingCount = friendRequests?.incomingReqs?.length || 0;
  const { logoutMutation } = useLogout();

  return (
    <nav className="bg-base-200 border-b border-base-300 sticky top-0 z-30 h-16 flex items-center relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between w-full">
          {/* LOGO - ALWAYS VISIBLE */}
          <div className="flex-1 flex justify-start">
            <Link to="/" className="flex items-center gap-2 sm:gap-2.5">
              <ShipWheelIcon className="size-8 sm:size-9 text-primary animate-spin-slow" />
              <span className="text-2xl sm:text-3xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-wider">
                Vinify
              </span>
            </Link>
          </div>

          {/* DESKTOP MENU - Hidden on Mobile */}
          <div className="hidden sm:flex items-center gap-3 sm:gap-4">
            <Link to={"/chat"}>
              <button className="btn btn-ghost btn-circle relative" title="Chats">
                <MessageSquareIcon className="h-6 w-6 text-base-content opacity-70" />
                {unreadMessageCount > 0 && (
                  <span className="badge badge-primary badge-xs absolute top-1.5 right-1.5 p-1 font-bold text-[10px]">
                    {unreadMessageCount}
                  </span>
                )}
              </button>
            </Link>

            <Link to={"/notifications"}>
              <button className="btn btn-ghost btn-circle relative" title="Friend Requests">
                <BellIcon className="h-6 w-6 text-base-content opacity-70" />
                {incomingCount > 0 && (
                  <span className="badge badge-secondary badge-xs absolute top-1.5 right-1.5 p-1 font-bold text-[10px]">
                    {incomingCount}
                  </span>
                )}
              </button>
            </Link>

            <ThemeSelector />

            <div 
              className="avatar cursor-pointer hover:opacity-85 transition-opacity"
              onClick={() => setProfileModalOpen(true)}
              title="Edit Profile & Settings"
            >
              <div className="w-9 rounded-full ring-2 ring-primary ring-offset-1 overflow-hidden">
                <img src={authUser?.profilePic || "https://api.dicebear.com/7.x/identicon/png?seed=default"} alt="User Avatar" className="object-cover w-full h-full" />
              </div>
            </div>

            <button className="btn btn-ghost btn-circle" onClick={logoutMutation} title="Logout">
              <LogOutIcon className="h-6 w-6 text-base-content opacity-70" />
            </button>
          </div>

          {/* MOBILE MENU TRIGGER - Shown on Mobile */}
          <div className="flex sm:hidden items-center gap-2">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)} 
              className="btn btn-ghost btn-circle"
              aria-label="Toggle Menu"
            >
              {isMenuOpen ? <XIcon className="size-6 text-base-content opacity-80" /> : <MenuIcon className="size-6 text-base-content opacity-80" />}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE DROPDOWN DRAWER */}
      {isMenuOpen && (
        <div className="absolute top-16 right-4 z-50 bg-base-200 border border-base-300 rounded-xl shadow-xl w-52 p-3 flex flex-col gap-2 sm:hidden animate-fade-in">
          <button
            onClick={() => {
              setIsMenuOpen(false);
              setProfileModalOpen(true);
            }}
            className="btn btn-ghost btn-sm justify-start w-full gap-2 text-sm text-base-content"
          >
            <SettingsIcon className="size-4 opacity-70" />
            <span>Settings</span>
          </button>
          
          <div className="divider my-0 opacity-20" />
          
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-xs font-semibold opacity-70">Theme</span>
            <ThemeSelector />
          </div>
          
          <div className="divider my-0 opacity-20" />

          <button
            onClick={() => {
              setIsMenuOpen(false);
              logoutMutation();
            }}
            className="btn btn-ghost btn-sm btn-error justify-start w-full gap-2 text-sm text-error"
          >
            <LogOutIcon className="size-4" />
            <span>Logout</span>
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
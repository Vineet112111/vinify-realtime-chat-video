import { useCalls, CallingState } from "@stream-io/video-react-sdk";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { PhoneIcon, PhoneOffIcon } from "lucide-react";

const IncomingCallModal = () => {
  const calls = useCalls();
  const navigate = useNavigate();
  const [ringingSound, setRingingSound] = useState(null);

  // Find an incoming call in RINGING state
  const incomingCall = calls.find(
    (call) => !call.isCreatedByMe && call.state.callingState === CallingState.RINGING
  );

  useEffect(() => {
    let audio = null;
    if (incomingCall) {
      // Ring sound
      audio = new Audio("https://assets.mixkit.co/active_storage/sfx/1359/1359-84.wav");
      audio.loop = true;
      audio.play().catch((err) => console.log("Sound autoplay blocked:", err));
      setRingingSound(audio);

      // Ask for browser notification permission if not asked
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
      
      // Trigger native notification
      if (Notification.permission === "granted") {
        new Notification("Incoming Call", {
          body: `${incomingCall.state.createdBy?.name || "A friend"} is calling you...`,
          icon: incomingCall.state.createdBy?.image || "/default-avatar.png",
        });
      }
    } else {
      if (ringingSound) {
        ringingSound.pause();
        setRingingSound(null);
      }
    }

    return () => {
      if (audio) {
        audio.pause();
      }
    };
  }, [incomingCall]);

  if (!incomingCall) return null;

  const callerName = incomingCall.state.createdBy?.name || "Someone";
  const callerImage = incomingCall.state.createdBy?.image || "https://api.dicebear.com/7.x/identicon/png?seed=default";

  const handleAccept = async () => {
    if (ringingSound) {
      ringingSound.pause();
    }
    try {
      await incomingCall.join();
      navigate(`/call/${incomingCall.id}`);
    } catch (error) {
      console.error("Error accepting call:", error);
    }
  };

  const handleReject = async () => {
    if (ringingSound) {
      ringingSound.pause();
    }
    try {
      await incomingCall.leave({ reject: true, reason: "decline" });
    } catch (error) {
      console.error("Error rejecting call:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-base-200 border border-base-content/15 rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl animate-bounce-short">
        <div className="flex flex-col items-center gap-5">
          {/* Pulsating Avatar */}
          <div className="relative">
            <div className="avatar size-24 rounded-full ring-4 ring-success ring-offset-base-100 ring-offset-4 overflow-hidden animate-pulse">
              <img src={callerImage} alt={callerName} className="object-cover w-full h-full" />
            </div>
            <span className="absolute bottom-0 right-0 size-6 bg-success rounded-full border-4 border-base-200 flex items-center justify-center">
              <span className="size-2 bg-white rounded-full animate-ping" />
            </span>
          </div>

          <div>
            <h3 className="text-xl font-bold text-base-content">{callerName}</h3>
            <p className="text-sm text-base-content/70 mt-1 animate-pulse">Incoming Video Call...</p>
          </div>

          <div className="flex items-center gap-4 w-full mt-4">
            <button
              onClick={handleReject}
              className="btn btn-error flex-1 text-white gap-2 font-semibold"
            >
              <PhoneOffIcon className="size-4" />
              Decline
            </button>
            <button
              onClick={handleAccept}
              className="btn btn-success flex-1 text-white gap-2 font-semibold animate-pulse"
            >
              <PhoneIcon className="size-4" />
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;

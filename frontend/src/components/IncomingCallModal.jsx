import { useCalls, CallingState } from "@stream-io/video-react-sdk";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router";
import { PhoneIcon, PhoneOffIcon } from "lucide-react";
import toast from "react-hot-toast";

// Web Audio API Ringtone Generator
const startPhoneRingTone = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    const ctx = new AudioContext();
    
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // modulated phone ring frequencies
    osc1.frequency.setValueAtTime(400, ctx.currentTime);
    osc2.frequency.setValueAtTime(450, ctx.currentTime);
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    
    osc1.start();
    osc2.start();

    if (ctx.state === "suspended") {
      ctx.resume().catch(err => console.log("Failed to resume ctx initially:", err));
    }

    const resumeOnInteraction = () => {
      if (ctx.state === "suspended") {
        ctx.resume().catch(err => console.log("Failed to resume ctx on interaction:", err));
      }
    };
    window.addEventListener("click", resumeOnInteraction);

    // ring cadence: 1.2s on, 1.8s silence
    let isRinging = true;
    let ringInterval = setInterval(() => {
      if (isRinging) {
        gainNode.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
      } else {
        gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
      }
      isRinging = !isRinging;
    }, 1500);

    return () => {
      clearInterval(ringInterval);
      window.removeEventListener("click", resumeOnInteraction);
      try {
        osc1.stop();
        osc2.stop();
        ctx.close();
      } catch (e) {}
    };
  } catch (error) {
    console.error("Audio Context failed:", error);
    return null;
  }
};

const IncomingCallModal = () => {
  const calls = useCalls();
  const navigate = useNavigate();
  const [stopRinging, setStopRinging] = useState(null);

  const wasRingingRef = useRef(false);
  const acceptedOrRejectedRef = useRef(false);
  const callerNameRef = useRef("");

  // Find an incoming call in RINGING state
  const incomingCall = calls.find(
    (call) => !call.isCreatedByMe && call.state.callingState === CallingState.RINGING
  );

  useEffect(() => {
    let stopFn = null;
    if (incomingCall) {
      wasRingingRef.current = true;
      acceptedOrRejectedRef.current = false;
      callerNameRef.current = incomingCall.state.createdBy?.name || "A friend";

      // Start ringing sound
      stopFn = startPhoneRingTone();
      setStopRinging(() => stopFn);
      
      // Trigger native notification
      if (Notification.permission === "granted") {
        const notification = new Notification("Incoming Call", {
          body: `${callerNameRef.current} is calling you...`,
          icon: incomingCall.state.createdBy?.image || "/default-avatar.png",
        });
        notification.onclick = () => {
          window.focus();
        };
      }
    } else {
      if (stopRinging) {
        stopRinging();
        setStopRinging(null);
      }

      // Check if this was a missed call
      if (wasRingingRef.current && !acceptedOrRejectedRef.current) {
        console.log("Missed call detected!");
        if (Notification.permission === "granted") {
          new Notification("Missed Call", {
            body: `You missed a video call from ${callerNameRef.current}`,
            icon: "/default-avatar.png",
          });
        }
        toast.error(`Missed video call from ${callerNameRef.current}`);
      }
      wasRingingRef.current = false;
    }

    return () => {
      if (stopFn) stopFn();
    };
  }, [incomingCall]);

  if (!incomingCall) return null;

  const callerName = incomingCall.state.createdBy?.name || "Someone";
  const callerImage = incomingCall.state.createdBy?.image || "https://api.dicebear.com/7.x/identicon/png?seed=default";

  const handleAccept = async () => {
    acceptedOrRejectedRef.current = true;
    if (stopRinging) {
      stopRinging();
      setStopRinging(null);
    }
    try {
      await incomingCall.join();
      navigate(`/call/${incomingCall.id}`);
    } catch (error) {
      console.error("Error accepting call:", error);
    }
  };

  const handleReject = async () => {
    acceptedOrRejectedRef.current = true;
    if (stopRinging) {
      stopRinging();
      setStopRinging(null);
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
          <div className="relative flex justify-center">
            <div className="avatar">
              <div className="w-24 h-24 rounded-full ring-4 ring-success ring-offset-base-100 ring-offset-4 overflow-hidden animate-pulse">
                <img src={callerImage} alt={callerName} className="object-cover w-full h-full" />
              </div>
            </div>
            <span className="absolute bottom-0 right-[35%] size-6 bg-success rounded-full border-4 border-base-200 flex items-center justify-center">
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

import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { useStreamStore } from "../store/useStreamStore";
import useAuthUser from "../hooks/useAuthUser";
import {
  StreamCall,
  StreamVideo,
  ParticipantView,
  CallingState,
  StreamTheme,
  useCall,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import toast from "react-hot-toast";
import PageLoader from "../components/PageLoader";
import {
  MicIcon,
  MicOffIcon,
  VideoIcon,
  VideoOffIcon,
  PhoneOffIcon,
  ClockIcon,
  UsersIcon,
} from "lucide-react";

const CallPage = () => {
  const { id: callId } = useParams();
  const navigate = useNavigate();

  const { videoClient } = useStreamStore();
  const { authUser, isLoading: authLoading } = useAuthUser();
  const [call, setCall] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [micError, setMicError] = useState(null);

  useEffect(() => {
    // Wait until both authUser and videoClient are ready
    if (!callId) {
      console.error("[CallPage] No callId in URL — cannot join call.");
      navigate("/chat");
      return;
    }

    if (!authUser) {
      console.log("[CallPage] Waiting for authUser...");
      return;
    }

    if (!videoClient) {
      console.log("[CallPage] Waiting for videoClient to be initialized...");
      // Stay in connecting/loading state — don't navigate away yet
      return;
    }

    let callInstance;
    let active = true;

    const initCall = async () => {
      try {
        console.log("[CallPage] Initializing Stream call:", callId, "for user:", authUser._id);
        callInstance = videoClient.call("default", callId);

        console.log("[CallPage] Joining call (create: true)...");
        await callInstance.join({ create: true });
        console.log("[CallPage] Call join() succeeded. CallingState:", callInstance.state.callingState);

        if (!active) {
          console.log("[CallPage] Component unmounted during join — leaving call.");
          callInstance.leave().catch(() => {});
          return;
        }

        // Enable camera with graceful error handling
        try {
          console.log("[CallPage] Enabling camera...");
          await callInstance.camera.enable();
          console.log("[CallPage] Camera enabled successfully.");
        } catch (camErr) {
          if (active) {
            console.warn("[CallPage] Camera failed to enable:", camErr.name, camErr.message);
            setCameraError(camErr.name || camErr.message || "Failed");
            toast.error("Camera access failed or blocked.");
          }
        }

        if (!active) return;

        // Enable microphone with graceful error handling
        try {
          console.log("[CallPage] Enabling microphone...");
          await callInstance.microphone.enable();
          console.log("[CallPage] Microphone enabled successfully.");
        } catch (micErr) {
          if (active) {
            console.warn("[CallPage] Microphone failed to enable:", micErr.name, micErr.message);
            setMicError(micErr.name || micErr.message || "Failed");
            toast.error("Microphone access failed or blocked.");
          }
        }

        if (active) {
          console.log("[CallPage] Call ready — setting call state.");
          setCall(callInstance);
        }
      } catch (error) {
        if (active) {
          console.error("[CallPage] Error joining/creating call:", error);
          toast.error("Could not connect to video call");
          navigate("/chat");
        }
      } finally {
        if (active) {
          console.log("[CallPage] Initialization complete — isConnecting = false.");
          setIsConnecting(false);
        }
      }
    };

    initCall();

    return () => {
      active = false;
      if (callInstance) {
        console.log("[CallPage] Cleanup: leaving call on unmount.");
        callInstance.leave().catch((err) => console.log("[CallPage] Call cleanup leave error:", err));
      }
    };
  }, [videoClient, callId, authUser, navigate]);

  // Show loader while auth or stream client is loading, or while connecting to call
  if (authLoading || isConnecting) {
    return <PageLoader />;
  }

  // If videoClient isn't ready yet but we're done "connecting" (which won't happen —
  // isConnecting stays true until videoClient is ready), show a graceful fallback.
  if (!videoClient || !call) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-white relative overflow-hidden">
        <div className="text-center p-6 space-y-4">
          <p className="text-xl opacity-75">Could not connect to call room. Please refresh.</p>
          <button onClick={() => navigate("/")} className="btn btn-primary btn-md">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-white relative overflow-hidden">
      <StreamCall call={call}>
        <StreamTheme>
          <CallContent cameraError={cameraError} micError={micError} />
        </StreamTheme>
      </StreamCall>
    </div>
  );
};

const CallContent = ({ cameraError, micError }) => {
  const call = useCall();
  const { useCallCallingState, useParticipants } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participants = useParticipants();
  const navigate = useNavigate();
  const { authUser } = useAuthUser();

  const hadOtherParticipantRef = useRef(false);

  // Log calling state changes for diagnostics
  useEffect(() => {
    console.log("[CallContent] CallingState changed:", callingState);
  }, [callingState]);

  // Log participant changes for diagnostics
  useEffect(() => {
    console.log(
      "[CallContent] Participants updated:",
      participants.map((p) => ({ userId: p.userId, name: p.name, sessionId: p.sessionId }))
    );
  }, [participants]);

  // Monitor participants count to auto-disconnect if the remote user leaves
  useEffect(() => {
    if (participants.length > 1) {
      hadOtherParticipantRef.current = true;
    } else if (hadOtherParticipantRef.current && participants.length === 1) {
      console.log("[CallContent] Remote participant left — ending call.");
      toast.success("Other participant left the call");
      if (call) {
        call.leave().catch((err) => console.log("[CallContent] Leave error:", err));
      }
      navigate("/chat");
    }
  }, [participants, call, navigate]);

  // Auto-navigate away when call ends
  useEffect(() => {
    if (
      callingState === CallingState.LEFT ||
      callingState === CallingState.REJECTED ||
      callingState === CallingState.OFFLINE
    ) {
      console.log("[CallContent] Call ended (state:", callingState, ") — navigating to /chat.");
      toast.error("Call ended or declined");
      navigate("/chat");
    }
  }, [callingState, navigate]);

  // Render loading state while connecting (JOINING)
  if (callingState === CallingState.JOINING) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 animate-fade-in p-4 text-center">
        <span className="loading loading-spinner loading-lg text-primary animate-spin" />
        <h2 className="text-xl font-bold">Connecting Call...</h2>
        <p className="text-sm opacity-60">Setting up secure media channels</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center p-4">
      {/* Top Indicators Header */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10 px-2 sm:px-4">
        <div className="bg-black/60 px-3 py-1.5 rounded-full flex items-center gap-2 text-xs border border-white/5 shadow-md">
          <UsersIcon className="size-3.5" />
          <span>{participants.length} Active</span>
        </div>
        <CallTimer />
      </div>

      {/* Modern Participant Videos Grid */}
      <div
        className={`w-full max-w-5xl h-full flex flex-col ${
          participants.length > 1 ? "md:grid md:grid-cols-2" : "md:max-w-2xl md:mx-auto"
        } gap-4 items-center justify-center py-16 overflow-y-auto`}
      >
        {participants.map((p) => {
          const isMicEnabled = p.audioEnabled;
          const isCamEnabled = p.videoEnabled;
          // FIX: use .toString() to safely compare MongoDB ObjectId string with Stream's userId string
          const isLocal = p.userId === authUser?._id?.toString();

          return (
            <div
              key={p.sessionId}
              className="relative w-full aspect-video md:h-full max-h-[40vh] md:max-h-none rounded-2xl overflow-hidden bg-slate-900 border border-white/5 shadow-lg group"
            >
              {isCamEnabled ? (
                <ParticipantView participant={p} className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-4 text-center">
                  <div className="avatar size-16 rounded-full overflow-hidden mb-2 ring-2 ring-white/10">
                    <img
                      src={p.image || "https://api.dicebear.com/7.x/identicon/png?seed=default"}
                      alt={p.name}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <span className="text-xs font-semibold">{p.name}</span>
                  {isLocal && cameraError && (
                    <span className="text-[10px] text-error mt-1.5 bg-error/10 border border-error/20 px-2 py-0.5 rounded">
                      Camera:{" "}
                      {cameraError === "NotReadableError"
                        ? "In use by another app"
                        : "Not accessible / Blocked"}
                    </span>
                  )}
                </div>
              )}

              {/* Status Overlay */}
              <div className="absolute bottom-3 left-3 bg-black/60 border border-white/5 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs flex items-center gap-2">
                <span className="font-semibold">{p.name}</span>
                {!isMicEnabled && <MicOffIcon className="size-3.5 text-error" />}
                {!isCamEnabled && <VideoOffIcon className="size-3.5 text-error" />}
                {isLocal && micError && (
                  <span className="text-[10px] text-error font-medium bg-error/10 border border-error/20 px-1.5 py-0.5 rounded">
                    Mic error:{" "}
                    {micError === "NotFoundError" ? "No mic detected" : "Blocked"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Call Controls */}
      <CustomCallControls />
    </div>
  );
};

const CallTimer = () => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="bg-black/60 px-4 py-1.5 rounded-full flex items-center gap-2 text-xs border border-white/5 shadow-md font-mono text-success">
      <ClockIcon className="size-3.5" />
      <span>{formatTime(seconds)}</span>
    </div>
  );
};

const CustomCallControls = () => {
  const call = useCall();
  const { useMicrophoneState, useCameraState } = useCallStateHooks();

  // FIX: The Stream SDK v1.x returns `isMute` (not `isMuted`) from these hooks.
  // The old code used `isMuted` which was always `undefined`, breaking mic/cam toggles.
  const { isMute: isMicMute } = useMicrophoneState();
  const { isMute: isCamMute } = useCameraState();

  const navigate = useNavigate();

  const toggleMic = async () => {
    if (!call) return;
    try {
      if (isMicMute) {
        console.log("[CallControls] Unmuting microphone...");
        await call.microphone.unmute();
      } else {
        console.log("[CallControls] Muting microphone...");
        await call.microphone.mute();
      }
    } catch (err) {
      console.error("[CallControls] Error toggling microphone:", err);
      toast.error("Could not toggle microphone");
    }
  };

  const toggleCam = async () => {
    if (!call) return;
    try {
      if (isCamMute) {
        console.log("[CallControls] Turning camera on...");
        await call.camera.unmute();
      } else {
        console.log("[CallControls] Turning camera off...");
        await call.camera.mute();
      }
    } catch (err) {
      console.error("[CallControls] Error toggling camera:", err);
      toast.error("Could not toggle camera");
    }
  };

  const handleHangup = async () => {
    console.log("[CallControls] Hanging up...");
    if (call) {
      try {
        await call.leave();
        console.log("[CallControls] Call left successfully.");
      } catch (err) {
        console.error("[CallControls] Error leaving call:", err);
      }
    }
    navigate("/chat");
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/80 border border-white/10 backdrop-blur-lg px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-2xl flex items-center gap-4 sm:gap-6 shadow-2xl z-20">
      <button
        onClick={toggleMic}
        className={`btn btn-circle btn-sm sm:btn-md ${isMicMute ? "btn-error text-white" : "btn-neutral"} transition-all`}
        title={isMicMute ? "Unmute Mic" : "Mute Mic"}
      >
        {isMicMute ? <MicOffIcon className="size-4" /> : <MicIcon className="size-4" />}
      </button>
      <button
        onClick={toggleCam}
        className={`btn btn-circle btn-sm sm:btn-md ${isCamMute ? "btn-error text-white" : "btn-neutral"} transition-all`}
        title={isCamMute ? "Turn Camera On" : "Turn Camera Off"}
      >
        {isCamMute ? <VideoOffIcon className="size-4" /> : <VideoIcon className="size-4" />}
      </button>
      <button
        onClick={handleHangup}
        className="btn btn-circle btn-error text-white btn-sm sm:btn-md scale-105 sm:scale-110 hover:scale-115 active:scale-95 transition-all shadow-lg"
        title="Hang Up"
      >
        <PhoneOffIcon className="size-4 sm:size-5" />
      </button>
    </div>
  );
};

export default CallPage;
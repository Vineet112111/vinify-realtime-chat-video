import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useStreamStore } from "../store/useStreamStore";
import useAuthUser from "../hooks/useAuthUser";
import {
  StreamCall,
  StreamVideo,
  ParticipantView,
  useCallStateHooks,
  CallingState,
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
  UsersIcon 
} from "lucide-react";

// Web Audio API Ringback Tone Generator
const startRingbackTone = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    const ctx = new AudioContext();
    
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // US ringback tone frequencies: 440Hz + 480Hz
    osc1.frequency.setValueAtTime(440, ctx.currentTime);
    osc2.frequency.setValueAtTime(480, ctx.currentTime);
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Set a subtle volume
    gainNode.gain.setValueAtTime(0.06, ctx.currentTime);
    
    osc1.start();
    osc2.start();

    // 2 seconds on, 4 seconds off ringing cadence
    let ringInterval = setInterval(() => {
      // fade out
      gainNode.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 1.8);
      
      setTimeout(() => {
        // fade back in
        gainNode.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.2);
      }, 2000);
    }, 4000);

    return () => {
      clearInterval(ringInterval);
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

const CallPage = () => {
  const { id: callId } = useParams();
  const [searchParams] = useSearchParams();
  const isRingingMode = searchParams.get("ringing") === "true";
  const targetUserId = searchParams.get("targetUserId");
  const navigate = useNavigate();

  const { videoClient } = useStreamStore();
  const { authUser, isLoading: authLoading } = useAuthUser();
  const [call, setCall] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);

  useEffect(() => {
    if (!videoClient || !callId || !authUser) return;

    let callInstance;
    let active = true;

    const initCall = async () => {
      try {
        console.log("Initializing Stream call:", callId);
        callInstance = videoClient.call("default", callId);

        if (isRingingMode && targetUserId) {
          // Caller side: create call and ring recipient
          await callInstance.getOrCreate({
            ring: true,
            video: true,
            data: {
              members: [
                { user_id: authUser._id },
                { user_id: targetUserId }
              ]
            }
          });
        } else {
          // Receiver side: join existing ringing call
          await callInstance.join();
        }

        if (active) {
          setCall(callInstance);
        }
      } catch (error) {
        console.error("Error joining/creating call:", error);
        toast.error("Could not connect to video call");
        navigate("/");
      } finally {
        if (active) setIsConnecting(false);
      }
    };

    initCall();

    return () => {
      active = false;
      if (callInstance) {
        callInstance.leave().catch((err) => console.log("Call cleanup leave error:", err));
      }
    };
  }, [videoClient, callId, isRingingMode, targetUserId, authUser, navigate]);

  if (authLoading || isConnecting) return <PageLoader />;

  return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-white relative overflow-hidden">
      {videoClient && call ? (
        <StreamCall call={call}>
          <CallContent isRingingMode={isRingingMode} />
        </StreamCall>
      ) : (
        <div className="text-center p-6 space-y-4">
          <p className="text-xl opacity-75">Could not connect to call room. Please refresh.</p>
          <button onClick={() => navigate("/")} className="btn btn-primary btn-md">
            Go Home
          </button>
        </div>
      )}
    </div>
  );
};

const CallContent = ({ isRingingMode }) => {
  const { useCallCallingState, useCallMembers, useParticipants } = useCallStateHooks();
  const callingState = useCallCallingState();
  const members = useCallMembers();
  const participants = useParticipants();
  const navigate = useNavigate();
  const { authUser } = useAuthUser();
  const [stopRinging, setStopRinging] = useState(null);

  // Auto-navigate away when call ends
  useEffect(() => {
    if (
      callingState === CallingState.LEFT || 
      callingState === CallingState.REJECTED || 
      callingState === CallingState.OFFLINE
    ) {
      if (stopRinging) stopRinging();
      toast.error("Call ended or declined");
      navigate("/chat");
    }
  }, [callingState, navigate, stopRinging]);

  // Handle dialing sound synthesis
  useEffect(() => {
    if (callingState === CallingState.RINGING && isRingingMode) {
      const stop = startRingbackTone();
      setStopRinging(() => stop);
    } else {
      if (stopRinging) {
        stopRinging();
        setStopRinging(null);
      }
    }
    return () => {
      if (stopRinging) stopRinging();
    };
  }, [callingState, isRingingMode]);

  // Find other call member details
  const recipientMember = members.find((m) => m.user.id !== authUser?._id);
  const recipientName = recipientMember?.user?.name || "User";
  const recipientImage = recipientMember?.user?.image || "https://api.dicebear.com/7.x/identicon/png?seed=default";

  // Render dialing screen if not connected yet
  if (callingState === CallingState.RINGING) {
    return (
      <div className="flex flex-col items-center justify-center space-y-8 animate-fade-in p-4 text-center">
        <div className="relative flex items-center justify-center">
          {/* pulsating visual rings */}
          <div className="absolute size-44 bg-primary/20 rounded-full animate-ping opacity-60" />
          <div className="absolute size-36 bg-success/15 rounded-full animate-pulse opacity-85" />
          
          <div className="avatar size-28 rounded-full overflow-hidden ring-4 ring-primary relative z-10">
            <img src={recipientImage} alt={recipientName} className="object-cover w-full h-full" />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold">{recipientName}</h2>
          <p className="text-sm opacity-60 mt-2 flex items-center justify-center gap-1.5 animate-pulse">
            Ringing...
          </p>
        </div>

        <button 
          onClick={async () => {
            if (stopRinging) stopRinging();
            navigate("/chat");
          }} 
          className="btn btn-circle btn-error text-white btn-lg hover:scale-110 transition-transform shadow-xl mt-6"
        >
          <PhoneOffIcon className="size-6" />
        </button>
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
      <div className="w-full max-w-5xl h-full flex flex-col md:grid md:grid-cols-2 gap-4 items-center justify-center py-16 overflow-y-auto">
        {participants.map((p) => {
          const isMicEnabled = p.isMicrophoneEnabled;
          const isCamEnabled = p.isVideoEnabled;

          return (
            <div 
              key={p.sessionId} 
              className="relative w-full aspect-video md:h-full max-h-[40vh] md:max-h-none rounded-2xl overflow-hidden bg-slate-900 border border-white/5 shadow-lg group"
            >
              {isCamEnabled ? (
                <ParticipantView participant={p} className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-400">
                  <div className="avatar size-16 rounded-full overflow-hidden mb-2 ring-2 ring-white/10">
                    <img src={p.image || "https://api.dicebear.com/7.x/identicon/png?seed=default"} alt={p.name} className="object-cover w-full h-full" />
                  </div>
                  <span className="text-xs opacity-75">{p.name}</span>
                </div>
              )}

              {/* Status Overlay Overlay */}
              <div className="absolute bottom-3 left-3 bg-black/60 border border-white/5 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs flex items-center gap-2">
                <span className="font-semibold">{p.name}</span>
                {!isMicEnabled && <MicOffIcon className="size-3.5 text-error" />}
                {!isCamEnabled && <VideoOffIcon className="size-3.5 text-error" />}
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
  const { useCall } = useCallStateHooks();
  const call = useCall();
  const { useMicrophoneState, useCameraState } = useCallStateHooks();
  const { isMuted: isMicMuted } = useMicrophoneState();
  const { isMuted: isCamMuted } = useCameraState();
  const navigate = useNavigate();

  const toggleMic = async () => {
    if (call) await call.microphone.toggle();
  };

  const toggleCam = async () => {
    if (call) await call.camera.toggle();
  };

  const handleHangup = async () => {
    if (call) {
      await call.leave();
    }
    navigate("/chat");
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/80 border border-white/10 backdrop-blur-lg px-6 py-3.5 rounded-2xl flex items-center gap-6 shadow-2xl z-20">
      <button 
        onClick={toggleMic} 
        className={`btn btn-circle btn-sm sm:btn-md ${isMicMuted ? 'btn-error text-white' : 'btn-neutral'} transition-all`}
        title={isMicMuted ? "Unmute Mic" : "Mute Mic"}
      >
        {isMicMuted ? <MicOffIcon className="size-4" /> : <MicIcon className="size-4" />}
      </button>
      <button 
        onClick={toggleCam} 
        className={`btn btn-circle btn-sm sm:btn-md ${isCamMuted ? 'btn-error text-white' : 'btn-neutral'} transition-all`}
        title={isCamMuted ? "Turn Camera On" : "Turn Camera Off"}
      >
        {isCamMuted ? <VideoOffIcon className="size-4" /> : <VideoIcon className="size-4" />}
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
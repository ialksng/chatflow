import { X, Video, Phone, PenTool, Bot } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore, AI_ASSISTANT_ID } from "../store/useChatStore";
import { useCallStore } from "../store/useCallStore"; 

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const { initiateCall } = useCallStore();

  if (!selectedUser) return null;

  const uId = selectedUser.id || selectedUser._id;
  const isAi = Boolean(
    selectedUser.isAI ||
    uId === AI_ASSISTANT_ID ||
    selectedUser.email === "ai@chatflow.app" ||
    selectedUser.fullName?.toLowerCase().includes("ai assistant")
  );
  const isOnline = isAi || onlineUsers.includes(uId) || Boolean(selectedUser.isOnline);

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img
                src={selectedUser.profilePic || `${import.meta.env.BASE_URL}avatar.png`}
                alt={selectedUser.fullName}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `${import.meta.env.BASE_URL}avatar.png`;
                }}
              />
            </div>
          </div>
          <div>
            <h3 className="font-medium flex items-center gap-1.5">
              {selectedUser.fullName}
              {isAi && <Bot className="size-4 text-primary" />}
            </h3>
            <p className="text-sm text-base-content/70">
              {isAi ? "Always Online" : (isOnline ? "Online" : "Offline")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Only show draw, audio call, and video call for human contacts */}
          {!isAi && (
            <>
              <button 
                className="text-base-content/70 hover:text-primary transition-colors tooltip tooltip-bottom" 
                data-tip="Draw Together"
                onClick={() => initiateCall("draw")}
              >
                <PenTool className="size-5" />
              </button>
              <button 
                className="text-base-content/70 hover:text-primary transition-colors tooltip tooltip-bottom" 
                data-tip="Audio Call"
                onClick={() => initiateCall("audio")}
              >
                <Phone className="size-5" />
              </button>
              <button 
                className="text-base-content/70 hover:text-primary transition-colors tooltip tooltip-bottom" 
                data-tip="Video & Screen Share"
                onClick={() => initiateCall("video")}
              >
                <Video className="size-5" />
              </button>
            </>
          )}

          <button onClick={() => setSelectedUser(null)} className="ml-4 hover:text-primary transition-colors">
            <X className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
export default ChatHeader;
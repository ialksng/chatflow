import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";
import { Reply, Edit2, Trash2, SmilePlus, X, Check, Ban, Copy, Code } from "lucide-react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢"];

// Helper to extract plain text string from React children
const extractCodeText = (elem) => {
  if (!elem) return "";
  if (typeof elem === "string") return elem;
  if (Array.isArray(elem)) return elem.map(extractCodeText).join("");
  if (elem.props?.children) return extractCodeText(elem.props.children);
  return "";
};

// Custom component to wrap code blocks with language badge and full copy button
const CustomPre = ({ children, ...props }) => {
  const [copied, setCopied] = useState(false);
  
  const codeProps = children?.props || {};
  const className = codeProps.className || "";
  const match = /language-(\w+)/.exec(className);
  const language = match ? match[1] : "code";

  const codeString = extractCodeText(children);

  const handleCopy = (e) => {
    e.stopPropagation();
    if (codeString) {
      navigator.clipboard.writeText(codeString.replace(/\n$/, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative group my-2.5 rounded-xl overflow-hidden border border-base-300 bg-neutral/90 shadow-md">
      <div className="flex items-center justify-between px-3 py-1.5 bg-base-300/80 text-[11px] font-mono text-base-content/80 border-b border-base-300">
        <span className="uppercase tracking-wider font-semibold flex items-center gap-1.5">
          <Code size={12} className="text-primary" />
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="btn btn-ghost btn-xs gap-1 hover:bg-base-200 text-base-content transition-colors px-2 rounded-md"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check size={12} className="text-success" />
              <span className="text-success text-[10px]">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span className="text-[10px]">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs font-mono text-neutral-content leading-relaxed" {...props}>
        {children}
      </pre>
    </div>
  );
};

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    isTyping,
    isAiTyping,
    setReplyingTo,
    deleteMessage,
    editMessage,
    reactToMessage
  } = useChatStore();
  
  const { authUser } = useAuthStore();
  const scrollRef = useRef(null);

  // Local state for inline editing
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editInputValue, setEditInputValue] = useState("");
  
  // State for mobile touch support (active message actions)
  const [activeMessageId, setActiveMessageId] = useState(null);

  useEffect(() => {
    getMessages(selectedUser._id);
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (scrollRef.current && !editingMessageId) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isAiTyping, editingMessageId]);

  const handleStartEdit = (message) => {
    setEditingMessageId(message._id);
    setEditInputValue(message.text || "");
  };

  const handleSaveEdit = (messageId) => {
    if (editInputValue.trim()) {
      editMessage(messageId, editInputValue);
    }
    setEditingMessageId(null);
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto relative">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((message) => {
          const isMine = message.senderId === authUser._id;
          const isDeleted = message.isDeleted;
          const isEditing = editingMessageId === message._id;

          // Group reactions by emoji to count them
          const reactionCounts = message.reactions?.reduce((acc, curr) => {
            acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
            return acc;
          }, {}) || {};

          return (
            <div 
              key={message._id} 
              className={`chat ${isMine ? "chat-end" : "chat-start"} group`}
              onClick={() => setActiveMessageId(activeMessageId === message._id ? null : message._id)}
            >
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img
                    src={isMine ? authUser.profilePic || `${import.meta.env.BASE_URL}avatar.png` : selectedUser.profilePic || `${import.meta.env.BASE_URL}avatar.png`}
                    alt="profile pic"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `${import.meta.env.BASE_URL}avatar.png`;
                    }}
                  />
                </div>
              </div>

              <div className="chat-header mb-1 flex gap-2 items-center">
                <time className="text-xs opacity-50 ml-1">
                  {formatMessageTime(message.createdAt)}
                </time>
                {message.isEdited && !isDeleted && (
                  <span className="text-[10px] opacity-40 italic">(edited)</span>
                )}
              </div>

              {/* Chat Bubble Wrapper */}
              <div className="flex flex-col relative">
                <div className={`chat-bubble flex flex-col min-w-[120px] ${isDeleted ? "bg-base-200 text-base-content/50 italic" : ""}`}>
                  
                  {/* Replied-To Message Preview */}
                  {message.replyTo && !isDeleted && (
                    <div className="bg-base-300/50 p-2 rounded mb-2 border-l-4 border-primary/50 text-xs text-base-content/80">
                      <p className="font-semibold mb-1 opacity-70">
                        {message.replyTo.senderId === authUser._id ? "You" : selectedUser.fullName}
                      </p>
                      <p className="truncate max-w-[200px]">{message.replyTo.text || "📷 Image"}</p>
                    </div>
                  )}

                  {/* Main Message Content */}
                  {isDeleted ? (
                    <div className="flex items-center gap-2 py-1">
                      <Ban className="size-4" /> This message was deleted
                    </div>
                  ) : isEditing ? (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="text" 
                        className="input input-sm input-bordered text-base-content w-full"
                        value={editInputValue}
                        onChange={(e) => setEditInputValue(e.target.value)}
                        autoFocus
                      />
                      <button onClick={() => handleSaveEdit(message._id)} className="btn btn-xs btn-success btn-circle text-white">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setEditingMessageId(null)} className="btn btn-xs btn-error btn-circle text-white">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      {message.image && (
                        <img src={message.image} alt="Attachment" className="sm:max-w-[200px] rounded-md mb-2" />
                      )}
                      
                      {message.text && (
                        <ReactMarkdown
                          className="text-sm flex flex-col gap-2 overflow-hidden break-words"
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            p: ({ node, ...props }) => <p className="leading-relaxed my-0.5" {...props} />,
                            pre: CustomPre,
                            code: ({ node, inline, className, children, ...props }) => {
                              const match = /language-(\w+)/.exec(className || "");
                              return !match && inline !== false ? (
                                <code className="bg-black/25 text-primary px-1.5 py-0.5 rounded font-mono text-xs font-semibold" {...props}>
                                  {children}
                                </code>
                              ) : (
                                <code className={`${className || ""} block font-mono text-xs`} {...props}>
                                  {children}
                                </code>
                              );
                            },
                            table: ({ node, ...props }) => (
                              <div className="overflow-x-auto my-2 rounded-lg border border-base-300">
                                <table className="table table-xs sm:table-sm w-full bg-base-200/60" {...props} />
                              </div>
                            ),
                            thead: ({ node, ...props }) => <thead className="bg-base-300 text-base-content font-bold border-b border-base-300" {...props} />,
                            tbody: ({ node, ...props }) => <tbody className="divide-y divide-base-300/60" {...props} />,
                            tr: ({ node, ...props }) => <tr className="hover:bg-base-300/40 transition-colors" {...props} />,
                            th: ({ node, ...props }) => <th className="px-3 py-2 text-left font-semibold" {...props} />,
                            td: ({ node, ...props }) => <td className="px-3 py-2" {...props} />,
                            ul: ({ node, ...props }) => <ul className="list-disc ml-5 space-y-1 my-1" {...props} />,
                            ol: ({ node, ...props }) => <ol className="list-decimal ml-5 space-y-1 my-1" {...props} />,
                            li: ({ node, ...props }) => <li className="my-0.5 leading-normal" {...props} />,
                            blockquote: ({ node, ...props }) => (
                              <blockquote className="border-l-4 border-primary pl-3 italic opacity-85 my-2 bg-base-300/30 py-1 rounded-r" {...props} />
                            ),
                            strong: ({ node, ...props }) => <strong className="font-bold text-primary" {...props} />,
                            a: ({ node, ...props }) => (
                              <a className="text-primary underline hover:opacity-80 transition-opacity" target="_blank" rel="noopener noreferrer" {...props} />
                            ),
                          }}
                        >
                          {message.text}
                        </ReactMarkdown>
                      )}

                    </>
                  )}
                </div>

                {/* Display Reactions */}
                {!isDeleted && Object.keys(reactionCounts).length > 0 && (
                  <div className={`flex gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                    {Object.entries(reactionCounts).map(([emoji, count]) => (
                      <div key={emoji} className="bg-base-200 px-2 py-0.5 rounded-full text-xs flex items-center gap-1 border border-base-300">
                        <span>{emoji}</span>
                        <span className="opacity-70">{count}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Message Actions (Visible on Hover or Tap) */}
                {!isDeleted && !isEditing && (
                  <div 
                    className={`absolute top-0 flex items-center gap-1 transition-opacity bg-base-100/90 p-1 rounded-lg shadow-sm border border-base-300 z-10 
                      ${activeMessageId === message._id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
                      ${isMine ? "-left-28 flex-row-reverse" : "-right-28"} `}
                    onClick={(e) => e.stopPropagation()}
                  >
                    
                    <button onClick={() => setReplyingTo(message)} className="btn btn-ghost btn-xs btn-circle tooltip" data-tip="Reply">
                      <Reply className="size-3.5" />
                    </button>
                    
                    <div className="dropdown dropdown-top dropdown-end">
                      <button tabIndex={0} className="btn btn-ghost btn-xs btn-circle tooltip" data-tip="React">
                        <SmilePlus className="size-3.5" />
                      </button>
                      <ul tabIndex={0} className="dropdown-content z-[1] menu p-1 shadow bg-base-200 rounded-box flex-row gap-1 border border-base-300">
                        {EMOJIS.map(emoji => (
                          <li key={emoji}>
                            <button onClick={() => {
                              reactToMessage(message._id, emoji);
                              setActiveMessageId(null); // Optionally close actions after reacting
                            }} className="px-2 py-1 hover:bg-base-300 text-lg rounded">
                              {emoji}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {isMine && (
                      <>
                        <button onClick={() => handleStartEdit(message)} className="btn btn-ghost btn-xs btn-circle tooltip" data-tip="Edit">
                          <Edit2 className="size-3.5" />
                        </button>
                        <button onClick={() => deleteMessage(message._id)} className="btn btn-ghost btn-xs btn-circle tooltip text-error" data-tip="Delete">
                          <Trash2 className="size-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {(isTyping || isAiTyping) && (
          <div className="chat chat-start">
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                  <img
                    src={selectedUser.profilePic || `${import.meta.env.BASE_URL}avatar.png`}
                    alt="profile pic"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `${import.meta.env.BASE_URL}avatar.png`;
                    }}
                  />
              </div>
            </div>
            <div className="chat-header mb-1">
              <span className="text-xs opacity-50 ml-1">
                {selectedUser.isAI ? "Thinking..." : "Typing..."}
              </span>
            </div>
            <div className="chat-bubble flex items-center justify-center w-16 h-12 bg-base-200">
              <span className="loading loading-dots loading-md"></span>
            </div>
          </div>
        )}

        <div ref={scrollRef}></div>
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;
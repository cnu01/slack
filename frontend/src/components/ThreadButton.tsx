interface ThreadButtonProps {
  messageId: string;
  replyCount?: number;
  onStartThread: (messageId: string) => void;
}

function ThreadButton({ messageId, replyCount = 0, onStartThread }: ThreadButtonProps) {
  return (
    <button
      onClick={() => onStartThread(messageId)}
      className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded px-2 py-1 transition-colors"
    >
      <span>💬</span>
      <span>
        {replyCount > 0 ? `${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}` : 'Start thread'}
      </span>
    </button>
  );
}

export default ThreadButton;

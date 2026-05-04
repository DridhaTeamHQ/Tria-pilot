'use client'

/**
 * TYPING BUBBLE
 *
 * 3-dot animated indicator shown in the messages area when the peer is
 * typing. Matches the inbox neo-brutalism style — bordered bubble with
 * drop shadow, dots pulse in sequence.
 */

export function TypingBubble({ peerName }: { peerName?: string }) {
  return (
    <div className="flex justify-start mt-3 msg-enter">
      <div className="relative px-4 py-3 bg-white border-2 border-black rounded-2xl rounded-bl-sm shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
        <div className="flex items-center gap-1">
          <span className="typing-dot" style={{ animationDelay: '0ms' }} />
          <span className="typing-dot" style={{ animationDelay: '160ms' }} />
          <span className="typing-dot" style={{ animationDelay: '320ms' }} />
        </div>
        {peerName && (
          <span className="sr-only">{peerName} is typing…</span>
        )}
      </div>

      <style jsx>{`
        .typing-dot {
          width: 7px;
          height: 7px;
          border-radius: 9999px;
          background: #111;
          display: inline-block;
          animation: typingPulse 1.05s ease-in-out infinite;
        }
        @keyframes typingPulse {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
          30% { transform: translateY(-3px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

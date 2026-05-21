'use client'

/**
 * TYPING BUBBLE
 *
 * 3-dot animated indicator shown in the messages area when the peer is
 * typing. Matches the inbox neo-brutalism style - bordered bubble with
 * drop shadow, dots pulse in sequence.
 */

const typingDotClass =
  'inline-block h-[7px] w-[7px] rounded-full bg-[#111] animate-[typingPulse_1.05s_ease-in-out_infinite]'

export function TypingBubble({ peerName }: { peerName?: string }) {
  return (
    <div className="mt-3 flex justify-start msg-enter">
      <div className="relative rounded-2xl rounded-bl-sm border-2 border-black bg-white px-4 py-3 shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
        <div className="flex items-center gap-1">
          <span className={typingDotClass} style={{ animationDelay: '0ms' }} />
          <span className={typingDotClass} style={{ animationDelay: '160ms' }} />
          <span className={typingDotClass} style={{ animationDelay: '320ms' }} />
        </div>
        {peerName ? <span className="sr-only">{peerName} is typing...</span> : null}
      </div>
    </div>
  )
}

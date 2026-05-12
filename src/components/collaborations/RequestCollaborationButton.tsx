'use client'

import { useState } from 'react'
import RequestModal from './RequestModal'

interface RequestCollaborationButtonProps {
  productId?: string
  productName?: string
  brandName?: string
  influencerId?: string
}

export default function RequestCollaborationButton({
  productId,
  productName,
  brandName,
  influencerId,
}: RequestCollaborationButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button type="button"
        className="w-full border-[3px] border-black bg-white py-3 rounded-xl text-xs font-black uppercase tracking-widest text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
        onClick={() => setIsOpen(true)}
      >
        Request Collaboration
      </button>
      <RequestModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        productId={productId}
        productName={productName}
        brandName={brandName}
        influencerId={influencerId}
      />
    </>
  )
}


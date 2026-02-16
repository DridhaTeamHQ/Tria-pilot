'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface RequestModalProps {
  isOpen: boolean
  onClose: () => void
  influencerId?: string
  productId?: string
  brandName?: string
  productName?: string
  brandId?: string
}

export default function RequestModal({
  isOpen,
  onClose,
  influencerId,
  productId,
  brandName,
  productName,
  brandId,
}: RequestModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    budget: '',
    timeline: '',
    goals: '',
    notes: '',
  })

  if (!isOpen) return null

  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Immediate visual feedback - show loading state instantly
    setLoading(true)

    try {
      // API route handles productId and fetches brandId server-side
      // No need for extra API call - this eliminates the 1-second delay!
      const response = await fetch('/api/collaborations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(influencerId && { influencerId }),
          ...(brandId && { brandId }),
          ...(productId && { productId }), // API will handle getting brandId from product
          budget: formData.budget ? parseFloat(formData.budget) : undefined,
          timeline: formData.timeline,
          goals: formData.goals.split(',').map((g) => g.trim()).filter(Boolean),
          notes: formData.notes,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send collaboration request')
      }

      // Immediate success feedback
      toast.success('Collaboration request sent!', {
        duration: 3000,
      })
      onClose()
      setFormData({
        budget: '',
        timeline: '',
        goals: '',
        notes: '',
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/55 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 14 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl max-h-[calc(100dvh-1rem)]"
        >
      <Card className="w-full max-h-[calc(100dvh-1rem)] overflow-y-auto border-[3px] border-black rounded-2xl bg-[#FFFDF8] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Request Collaboration</CardTitle>
              <CardDescription>
                {influencerId
                  ? `Send a collaboration request to this influencer`
                  : `Request collaboration for ${productName}`}
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 border-2 border-black hover:bg-[#FFD93D]">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {brandName && (
              <div>
                <Label>Brand</Label>
                <Input value={brandName} disabled />
              </div>
            )}
            {productName && (
              <div>
                <Label>Product</Label>
                <Input value={productName} disabled />
              </div>
            )}
            <div>
              <Label htmlFor="budget">Budget (INR)</Label>
              <Input
                id="budget"
                type="number"
                placeholder="5000"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="timeline">Timeline</Label>
              <Input
                id="timeline"
                placeholder="e.g., 2 weeks, 1 month"
                value={formData.timeline}
                onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="goals">Goals (comma-separated)</Label>
              <Input
                id="goals"
                placeholder="e.g., brand awareness, sales, engagement"
                value={formData.goals}
                onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="notes">Message</Label>
              <textarea
                id="notes"
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Tell the influencer about your collaboration proposal..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                required
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Sending...' : 'Send Request'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}


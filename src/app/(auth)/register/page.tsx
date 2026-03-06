'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, LayoutGroup } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Camera, Building2, Check, Sparkles, Zap, Star, Users, Megaphone } from 'lucide-react'

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F9F8F4]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#FF8C69] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-black/60 font-medium">Loading...</p>
          </div>
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  )
}

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedRole, setSelectedRole] = useState<'INFLUENCER' | 'BRAND' | null>(null)

  // Check URL params for role preselection
  useEffect(() => {
    const roleParam = searchParams.get('role')
    if (roleParam === 'influencer') {
      setSelectedRole('INFLUENCER')
    } else if (roleParam === 'brand') {
      setSelectedRole('BRAND')
    }
  }, [searchParams])

  const handleJoin = (role: 'INFLUENCER' | 'BRAND') => {
    const routeRole = role.toLowerCase()
    router.push(`/signup/${routeRole}`)
  }

  // Dynamic Background & Layout Logic
  // SWAPPED MAPPING:
  // Brand Role -> uses 'influencer.png' (Brand Studio) -> Layout: Flipped (Form Left)
  // Influencer Role -> uses 'brand.png' (Welcome Back) -> Layout: Normal (Form Right)
  const bgImage = selectedRole === 'BRAND'
    ? '/assets/auth-bg-influencer.png'
    : '/assets/auth-bg-brand.png'

  const isLayoutFlipped = selectedRole === 'BRAND'

  return (
    <div className="min-h-screen w-full relative bg-[#F9F8F4]">
      {/* MOBILE BACKGROUND */}
      <div
        className="lg:hidden absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${bgImage}')` }}
      >
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm" />
      </div>

      {/* MOBILE CONTENT */}
      <div className="lg:hidden relative z-10 min-h-screen px-4 py-6 flex items-center justify-center">
        <div className="w-full max-w-md bg-white/95 border-[3px] border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="mb-6">
            <h2 className="text-3xl font-black text-black mb-2 uppercase tracking-tight">Join Us</h2>
            <p className="text-black/60 font-medium">Choose your path to get started.</p>
          </div>

          <div className="space-y-4">
            <div
              onClick={() => setSelectedRole('INFLUENCER')}
              className={`cursor-pointer relative bg-white border-[3px] border-black p-4 transition-all ${selectedRole === 'INFLUENCER' ? 'shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] bg-[#FFF5EE]' : 'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'}`}
            >
              {selectedRole === 'INFLUENCER' && (
                <div className="absolute top-3 right-3 w-7 h-7 bg-[#FF8C69] border-2 border-black flex items-center justify-center">
                  <Check className="w-4 h-4 text-black" strokeWidth={3} />
                </div>
              )}
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 border-2 border-black flex items-center justify-center ${selectedRole === 'INFLUENCER' ? 'bg-[#FF8C69]' : 'bg-gray-100'}`}>
                  <Camera className="w-6 h-6 text-black" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-black uppercase">Influencer</h3>
                  <p className="text-xs text-black/60 font-medium mt-1">Create content, grow your audience, and earn.</p>
                </div>
              </div>
              <button type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleJoin('INFLUENCER')
                }}
                className="w-full mt-4 py-2 border-2 border-black font-black uppercase text-xs flex items-center justify-center gap-2 bg-black text-white hover:bg-[#FF8C69] hover:text-black transition-all"
              >
                Continue as Influencer <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div
              onClick={() => setSelectedRole('BRAND')}
              className={`cursor-pointer relative bg-white border-[3px] border-black p-4 transition-all ${selectedRole === 'BRAND' ? 'shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] bg-[#F8FFED]' : 'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'}`}
            >
              {selectedRole === 'BRAND' && (
                <div className="absolute top-3 right-3 w-7 h-7 bg-[#B4F056] border-2 border-black flex items-center justify-center">
                  <Check className="w-4 h-4 text-black" strokeWidth={3} />
                </div>
              )}
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 border-2 border-black flex items-center justify-center ${selectedRole === 'BRAND' ? 'bg-[#B4F056]' : 'bg-gray-100'}`}>
                  <Building2 className="w-6 h-6 text-black" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-black uppercase">Brand</h3>
                  <p className="text-xs text-black/60 font-medium mt-1">Launch campaigns and find top talent.</p>
                </div>
              </div>
              <button type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleJoin('BRAND')
                }}
                className="w-full mt-4 py-2 border-2 border-black font-black uppercase text-xs flex items-center justify-center gap-2 bg-black text-white hover:bg-[#B4F056] hover:text-black transition-all"
              >
                Continue as Brand <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link href="/login" className="inline-block text-black font-bold uppercase tracking-wide border-b-2 border-transparent hover:border-black transition-all">
              Already have an account? Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* DESKTOP LAYOUT - Dynamic Direction with Animation */}
      <LayoutGroup>
        <motion.div
          layout
          className={`hidden lg:flex w-full relative z-0 h-screen overflow-hidden ${isLayoutFlipped ? 'flex-row-reverse' : 'flex-row'}`}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >

          {/* IMAGE SIDE */}
          <motion.div
            layout
            className="flex-1 relative overflow-hidden bg-black h-full"
          >
            <motion.div
              key={selectedRole || 'default'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 z-0 bg-cover bg-no-repeat transition-all duration-700"
              style={{
                backgroundImage: `url('${bgImage}')`,
                backgroundPosition: isLayoutFlipped ? 'right center' : 'left center'
              }}
            />
          </motion.div>

          {/* CONTENT SIDE */}
          <motion.div
            layout
            className="w-full lg:w-[50%] xl:w-[45%] flex items-center justify-center p-6 lg:p-12 relative z-10 bg-transparent"
          >
            <motion.div
              layout
              className="w-full max-w-[500px]"
            >
              <div className="mb-8">
                <h2 className="text-4xl font-black text-black mb-3 uppercase tracking-tight">Join Us</h2>
                <p className="text-black/60 font-medium text-lg">Choose your path to get started.</p>
              </div>

              <div className="space-y-6">
                {/* Influencer Card */}
                <motion.div
                  layout
                  onClick={() => setSelectedRole('INFLUENCER')}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`group cursor-pointer relative bg-white border-[3px] border-black p-6 transition-all ${selectedRole === 'INFLUENCER' ? 'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-[#FFF5EE]' : 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'}`}
                >
                  {selectedRole === 'INFLUENCER' && (
                    <div className="absolute top-4 right-4 w-8 h-8 bg-[#FF8C69] border-2 border-black flex items-center justify-center">
                      <Check className="w-5 h-5 text-black" strokeWidth={3} />
                    </div>
                  )}

                  <div className="flex items-start gap-5">
                    <div className={`w-16 h-16 border-2 border-black flex items-center justify-center transition-colors ${selectedRole === 'INFLUENCER' ? 'bg-[#FF8C69]' : 'bg-gray-100 group-hover:bg-[#FF8C69]/20'}`}>
                      <Camera className="w-8 h-8 text-black" strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-black text-black mb-1 uppercase">Influencer</h3>
                      <p className="text-sm text-black/60 font-medium mb-3">Create content, grow your audience, and earn.</p>

                      <div className="flex gap-2 flex-wrap">
                        <span className="px-2 py-1 bg-black/5 border border-black/10 rounded text-xs font-bold uppercase flex items-center gap-1">
                          <Zap className="w-3 h-3" /> Try-Ons
                        </span>
                      </div>
                    </div>
                  </div>

                  <button type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleJoin('INFLUENCER')
                    }}
                    className={`w-full mt-6 py-3 border-2 border-black font-black uppercase text-sm flex items-center justify-center gap-2 transition-all ${selectedRole === 'INFLUENCER' ? 'bg-black text-white hover:bg-[#FF8C69] hover:text-black' : 'bg-transparent text-black opacity-0 group-hover:opacity-100'}`}
                  >
                    Continue as Influencer <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>

                {/* Brand Card */}
                <motion.div
                  layout
                  onClick={() => setSelectedRole('BRAND')}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`group cursor-pointer relative bg-white border-[3px] border-black p-6 transition-all ${selectedRole === 'BRAND' ? 'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-[#F8FFED]' : 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'}`}
                >
                  {selectedRole === 'BRAND' && (
                    <div className="absolute top-4 right-4 w-8 h-8 bg-[#B4F056] border-2 border-black flex items-center justify-center">
                      <Check className="w-5 h-5 text-black" strokeWidth={3} />
                    </div>
                  )}

                  <div className="flex items-start gap-5">
                    <div className={`w-16 h-16 border-2 border-black flex items-center justify-center transition-colors ${selectedRole === 'BRAND' ? 'bg-[#B4F056]' : 'bg-gray-100 group-hover:bg-[#B4F056]/20'}`}>
                      <Building2 className="w-8 h-8 text-black" strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-black text-black mb-1 uppercase">Brand</h3>
                      <p className="text-sm text-black/60 font-medium mb-3">Launch campaigns and find top talent.</p>

                      <div className="flex gap-2 flex-wrap">
                        <span className="px-2 py-1 bg-black/5 border border-black/10 rounded text-xs font-bold uppercase flex items-center gap-1">
                          <Users className="w-3 h-3" /> Discovery
                        </span>
                      </div>
                    </div>
                  </div>

                  <button type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleJoin('BRAND')
                    }}
                    className={`w-full mt-6 py-3 border-2 border-black font-black uppercase text-sm flex items-center justify-center gap-2 transition-all ${selectedRole === 'BRAND' ? 'bg-black text-white hover:bg-[#B4F056] hover:text-black' : 'bg-transparent text-black opacity-0 group-hover:opacity-100'}`}
                  >
                    Continue as Brand <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              </div>

              <div className="mt-12 text-center">
                <Link href="/login" className="inline-block text-black font-bold uppercase tracking-wide border-b-2 border-transparent hover:border-black transition-all">
                  Already have an account? Sign In
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </LayoutGroup>
    </div>
  )
}

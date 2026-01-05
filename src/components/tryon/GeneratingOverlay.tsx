'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { Camera, Brain, Shirt, Wand2, Check, Sparkles, Shield, ScanFace, Layers, Sun } from 'lucide-react'

interface GeneratingOverlayProps {
    isVisible: boolean
    modelType: 'flash' | 'pro' | 'production'
    isComplete?: boolean
}

const steps = [
    { id: 0, icon: Camera, label: 'Scanning identity anchor', video: '/mascot/analyzing.mp4' },
    { id: 1, icon: Brain, label: 'Reconstructing environment', video: '/mascot/thinking.mp4' },
    { id: 2, icon: Shirt, label: 'Simulating fabric physics', video: '/mascot/loading.mp4' },
    { id: 3, icon: Wand2, label: 'Blending contact shadows', video: '/mascot/loading.mp4' },
]

// Production pipeline has 7 stages (Stage 7 is optional refinement)
const productionSteps = [
    { id: 0, icon: Camera, label: 'Input quality gate', video: '/mascot/analyzing.mp4' },
    { id: 1, icon: ScanFace, label: 'Face freeze (pixel extraction)', video: '/mascot/analyzing.mp4' },
    { id: 2, icon: Brain, label: 'Prompt assembly', video: '/mascot/thinking.mp4' },
    { id: 3, icon: Layers, label: 'Nano Banana generation', video: '/mascot/loading.mp4' },
    { id: 4, icon: Shield, label: 'Face reintegration', video: '/mascot/loading.mp4' },
    { id: 5, icon: Wand2, label: 'Body proportion validation', video: '/mascot/loading.mp4' },
    { id: 6, icon: Sun, label: 'Environment refinement', video: '/mascot/loading.mp4' },
]

const funMessages = [
    "Locking identity coordinates...",
    "Calculating environmental light falloff...",
    "Warping fabric mesh to body...",
    "Matching camera lens distortion...",
    "Rebuilding scene depth...",
    "Finalizing texture realism...",
]

const productionMessages = [
    "Freezing original face pixels...",
    "Validating input quality...",
    "Stripping forbidden prompt terms...",
    "Generating with Nano Banana Pro...",
    "Reintegrating original face...",
    "Validating body proportions...",
    "Refining lighting and environment...",
    "Ensuring zero identity drift...",
]

export function GeneratingOverlay({ isVisible, modelType, isComplete = false }: GeneratingOverlayProps) {
    const [currentStep, setCurrentStep] = useState(0)
    const [currentMessage, setCurrentMessage] = useState(0)
    const [progress, setProgress] = useState(0)
    const videoRef = useRef<HTMLVideoElement>(null)

    // Use production steps for production model
    const activeSteps = modelType === 'production' ? productionSteps : steps
    const activeMessages = modelType === 'production' ? productionMessages : funMessages
    const estimatedTime = modelType === 'production' ? 45 : modelType === 'pro' ? 60 : 15

    // Get current video based on step or completion
    const currentVideo = isComplete
        ? '/mascot/success.mp4'
        : (activeSteps[currentStep]?.video || '/mascot/loading.mp4')

    useEffect(() => {
        if (!isVisible) {
            setCurrentStep(0)
            setProgress(0)
            setCurrentMessage(0)
            return
        }

        // Progress animation
        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 95) return prev
                const increment = modelType === 'pro' ? 0.25 : 1
                return Math.min(prev + increment, 95)
            })
        }, 200)

        // Step progression
        const stepInterval = setInterval(() => {
            setCurrentStep((prev) => (prev < activeSteps.length - 1 ? prev + 1 : prev))
        }, estimatedTime * 250)

        // Fun message rotation
        const messageInterval = setInterval(() => {
            setCurrentMessage((prev) => (prev + 1) % activeMessages.length)
        }, 3500)

        return () => {
            clearInterval(progressInterval)
            clearInterval(stepInterval)
            clearInterval(messageInterval)
        }
    }, [isVisible, estimatedTime, modelType])

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-50 flex items-center justify-center"
                >
                    {/* Beautiful gradient backdrop */}
                    <motion.div
                        className="absolute inset-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{
                            background: 'linear-gradient(135deg, rgba(232,121,109,0.95) 0%, rgba(180,90,130,0.95) 50%, rgba(100,80,160,0.95) 100%)',
                        }}
                    />

                    {/* Animated background shapes */}
                    <div className="absolute inset-0 overflow-hidden">
                        {[...Array(6)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute rounded-full bg-white/10"
                                style={{
                                    width: 80 + i * 40,
                                    height: 80 + i * 40,
                                    left: `${10 + i * 15}%`,
                                    top: `${5 + i * 18}%`,
                                }}
                                animate={{
                                    y: [0, -20, 0],
                                    scale: [1, 1.05, 1],
                                    opacity: [0.08, 0.15, 0.08],
                                }}
                                transition={{
                                    duration: 4 + i,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                    delay: i * 0.3,
                                }}
                            />
                        ))}
                    </div>

                    {/* Main content card - LARGER */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: 30 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className="relative z-10 w-full max-w-xl mx-4"
                    >
                        <div className="bg-white backdrop-blur-xl rounded-[2.5rem] shadow-2xl overflow-hidden">
                            {/* Mascot Video Section - BIGGER */}
                            <div className="relative bg-gradient-to-br from-peach/10 via-rose/5 to-purple-100/20 pt-10 pb-6">
                                {/* Decorative sparkles */}
                                <motion.div
                                    className="absolute top-6 right-10 text-2xl"
                                    animate={{ rotate: [0, 15, 0], scale: [1, 1.2, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                >
                                    ✨
                                </motion.div>
                                <motion.div
                                    className="absolute top-12 left-10 text-xl"
                                    animate={{ rotate: [0, -15, 0], scale: [1, 1.1, 1] }}
                                    transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                                >
                                    💫
                                </motion.div>

                                {/* Video container - MUCH BIGGER with smooth transitions */}
                                <div className="flex justify-center px-6">
                                    <motion.div
                                        className="relative"
                                        animate={{ y: [0, -6, 0] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                    >
                                        {/* Glow effect */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-peach/40 to-rose/40 rounded-3xl blur-2xl scale-110" />

                                        {/* Video player - with background to prevent white flash */}
                                        <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-72 md:h-72 rounded-3xl overflow-hidden border-4 border-white shadow-2xl bg-gradient-to-br from-peach/30 to-rose/30">
                                            <video
                                                key={currentVideo}
                                                ref={videoRef}
                                                autoPlay
                                                loop
                                                muted
                                                playsInline
                                                preload="auto"
                                                className="w-full h-full object-cover"
                                                style={{ objectPosition: 'center 20%' }}
                                            >
                                                <source src={currentVideo} type="video/mp4" />
                                            </video>
                                        </div>
                                    </motion.div>
                                </div>

                                {/* Current step label */}
                                <motion.div
                                    className="mt-5 text-center"
                                    key={isComplete ? 'complete' : currentStep}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/90 backdrop-blur-sm rounded-full text-charcoal font-semibold shadow-lg">
                                        {isComplete ? (
                                            <>
                                                <Sparkles className="w-5 h-5 text-green-500" />
                                                <span className="text-green-600">Generation Complete!</span>
                                            </>
                                        ) : (
                                            <>
                                                {(() => {
                                                    const StepIcon = activeSteps[currentStep].icon
                                                    return <StepIcon className="w-5 h-5 text-peach" />
                                                })()}
                                                {activeSteps[currentStep].label}
                                            </>
                                        )}
                                    </span>
                                </motion.div>
                            </div>

                            {/* Progress section */}
                            <div className="px-10 py-8">
                                {/* Step indicators - LARGER */}
                                <div className="flex justify-between mb-8">
                                    {activeSteps.map((step, index) => {
                                        const isActive = index === currentStep && !isComplete
                                        const isCompleted = index < currentStep || isComplete

                                        return (
                                            <div key={step.id} className="flex flex-col items-center">
                                                <motion.div
                                                    className={`${modelType === 'production' ? 'w-10 h-10' : 'w-12 h-12'} rounded-full flex items-center justify-center transition-all duration-500 ${isCompleted
                                                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                                                        : isActive
                                                            ? modelType === 'production'
                                                                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/40'
                                                                : 'bg-gradient-to-br from-peach to-rose text-white shadow-lg shadow-peach/40'
                                                            : 'bg-gray-100 text-gray-400'
                                                        }`}
                                                    animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                                                    transition={{ duration: 1.5, repeat: Infinity }}
                                                >
                                                    {isCompleted ? (
                                                        <Check className={`${modelType === 'production' ? 'w-5 h-5' : 'w-6 h-6'}`} />
                                                    ) : (
                                                        <step.icon className={`${modelType === 'production' ? 'w-5 h-5' : 'w-6 h-6'}`} />
                                                    )}
                                                </motion.div>
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Progress bar - THICKER */}
                                <div className="mb-5">
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-charcoal/60 font-medium">Progress</span>
                                        <span className="text-charcoal font-bold text-lg">{isComplete ? 100 : Math.round(progress)}%</span>
                                    </div>
                                    <div className="h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-peach via-rose to-purple-500 rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{ width: isComplete ? '100%' : `${progress}%` }}
                                            transition={{ duration: 0.4 }}
                                        />
                                    </div>
                                </div>

                                {/* Fun message */}
                                <AnimatePresence mode="wait">
                                    <motion.p
                                        key={isComplete ? 'done' : currentMessage}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.3 }}
                                        className="text-center text-charcoal/70 text-base font-medium"
                                    >
                                        {isComplete ? "🎉 Your try-on is ready!" : activeMessages[currentMessage]}
                                    </motion.p>
                                </AnimatePresence>

                                {/* Model badge - LARGER */}
                                <div className="mt-5 flex justify-center">
                                    <div className={`px-5 py-2 rounded-full text-sm font-bold tracking-wide ${modelType === 'production'
                                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
                                        : modelType === 'pro'
                                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                                            : 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/30'
                                        }`}>
                                        {modelType === 'production'
                                            ? '🔒 PRODUCTION PIPELINE'
                                            : modelType === 'pro'
                                                ? '⚡ PRO MODEL'
                                                : '🚀 FLASH MODEL'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

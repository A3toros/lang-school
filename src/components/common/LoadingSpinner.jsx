import { motion } from 'framer-motion'

const LoadingSpinner = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <motion.div
        className="flex flex-col items-center space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <p className="text-neutral-600 text-sm">Loading...</p>
      </motion.div>
    </div>
  )
}

export default LoadingSpinner

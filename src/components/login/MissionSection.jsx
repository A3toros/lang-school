import { motion } from 'framer-motion'

const MissionSection = ({ mission }) => {
  // Use the passed mission data directly (now comes from static content)
  const missionData = mission

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-4xl mx-auto"
    >
      <div className="relative">
        {/* Banner Image */}
        <div 
          className="h-64 bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center relative"
          style={{
            backgroundImage: missionData.banner_image ? `url(${missionData.banner_image})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-40"></div>
          <div className="text-center text-white relative z-10">
            <h2 className="text-4xl font-bold mb-4">{missionData.title}</h2>
            <div className="w-16 h-1 bg-white mx-auto rounded-full" />
          </div>
        </div>
        
        {/* Mission Content */}
        <div className="p-8 md:p-12">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-lg text-neutral-600 leading-relaxed">
              {missionData.content}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default MissionSection

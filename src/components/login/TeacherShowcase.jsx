import { motion } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'

const TeacherShowcase = ({ 
  teachers = [], 
  title = "Meet Our Teachers", 
  subtitle = "Our experienced and passionate teachers are here to help you achieve your language learning goals",
  showSelection = false,
  selectedTeachers = [],
  onSelectionChange,
  displayCount = null
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const scrollContainerRef = useRef(null)
  const [teachersPerView, setTeachersPerView] = useState(displayCount)
  const maxIndex = Math.max(0, teachers.length - teachersPerView)

  const scrollToNext = () => {
    if (currentIndex < maxIndex) {
      setCurrentIndex(prev => Math.min(prev + 1, maxIndex))
    } else {
      // Loop back to beginning
      setCurrentIndex(0)
    }
  }

  const scrollToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => Math.max(prev - 1, 0))
    } else {
      // Loop back to end
      setCurrentIndex(maxIndex)
    }
  }

  // Calculate how many teachers can fit in the container
  useEffect(() => {
    const calculateTeachersPerView = () => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current
        const containerWidth = container.offsetWidth
        const cardWidth = showSelection ? 192 : 256 // w-48 = 192px, w-64 = 256px
        const gap = 32 // gap-8 = 32px
        const padding = 32 // px-4 = 32px total
        
        const availableWidth = containerWidth - padding
        const maxTeachers = Math.floor(availableWidth / (cardWidth + gap))
        
        // If displayCount is provided, respect it but don't exceed what fits
        if (displayCount && displayCount > 0) {
          const calculatedCount = Math.min(displayCount, maxTeachers, teachers.length)
          setTeachersPerView(calculatedCount)
        } else {
          // If no displayCount, calculate based on available space
          const calculatedCount = Math.max(1, Math.min(maxTeachers, teachers.length))
          setTeachersPerView(calculatedCount)
        }
      }
    }

    calculateTeachersPerView()
    window.addEventListener('resize', calculateTeachersPerView)
    
    return () => window.removeEventListener('resize', calculateTeachersPerView)
  }, [teachers.length, showSelection, displayCount])

  // Scroll to the current teacher card
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const cardWidth = showSelection ? 192 : 256
      const gap = 32
      const scrollPosition = currentIndex * (cardWidth + gap)
      container.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      })
    }
  }, [currentIndex, showSelection])

  const visibleTeachers = teachers.slice(currentIndex, currentIndex + teachersPerView)

  const handleTeacherToggle = (teacherId) => {
    if (!onSelectionChange) return
    
    const isSelected = selectedTeachers.includes(teacherId)
    let newSelection
    
    if (isSelected) {
      newSelection = selectedTeachers.filter(id => id !== teacherId)
    } else {
      newSelection = [...selectedTeachers, teacherId]
    }
    
    onSelectionChange(newSelection)
  }

  return (
    <div className="text-center mb-16">
      <h2 className="text-3xl font-bold text-neutral-800 mb-4">
        {title}
      </h2>
      <p className="text-neutral-600 mb-8 max-w-2xl mx-auto">
        {subtitle}
      </p>
      
      <div className="relative w-full px-4 md:px-8 lg:px-16 xl:px-24">
        {/* Scroll Arrows - Only show if more than teachersPerView teachers */}
        {teachers.length > teachersPerView && (
          <>
            <button
              onClick={scrollToPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center transition-all duration-200 hover:bg-gray-50 hover:shadow-xl"
              title="Previous teachers"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <button
              onClick={scrollToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center transition-all duration-200 hover:bg-gray-50 hover:shadow-xl"
              title="Next teachers"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Teachers Grid */}
        <div 
          ref={scrollContainerRef}
          className={`flex gap-8 transition-all duration-500 ease-in-out overflow-x-auto overflow-y-hidden pb-4 scrollbar-hide ${
            showSelection 
              ? 'justify-start' 
              : 'justify-center'
          }`}
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none'
          }}
        >
          {visibleTeachers.map((teacher, index) => {
            const isSelected = showSelection && selectedTeachers.includes(teacher.id)
            
            return (
              <motion.div
                key={teacher.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`bg-transparent rounded-lg p-4 hover:shadow-xl transition-all duration-300 flex-shrink-0 ${
                  showSelection 
                    ? `cursor-pointer w-48 ${isSelected ? 'ring-2 ring-primary-500 ring-offset-2' : ''}` 
                    : 'clickable w-64'
                }`}
                onClick={showSelection ? () => handleTeacherToggle(teacher.id) : undefined}
              >
                <div className={`mx-auto mb-4 rounded-full overflow-hidden shadow-lg ${showSelection ? 'w-32 h-32' : 'w-40 h-40'}`} style={{ background: 'linear-gradient(135deg, #fefce8 0%, #faf5ff 100%)' }}>
                  <img
                    src={teacher.photo_url || '/pics/teachers/default.jpg'}
                    alt={teacher.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDgiIGN5PSI0OCIgcj0iNDgiIGZpbGw9IiNGM0Y0RjYiLz4KPHBhdGggZD0iTTQ4IDI0QzM5LjE2NDkgMjQgMzIgMzEuMTY0OSAzMiA0MEMzMiA0OC44MzUxIDM5LjE2NDkgNTYgNDggNTZDNTYuODM1MSA1NiA2NCA0OC44MzUxIDY0IDQwQzY0IDMxLjE2NDkgNTYuODM1MSAyNCA0OCAyNFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTQ4IDY0QzM5LjE2NDkgNjQgMzIgNzEuMTY0OSAzMiA4MEMzMiA4OC44MzUxIDM5LjE2NDkgOTYgNDggOTZDNTYuODM1MSA5NiA2NCA4OC44MzUxIDY0IDgwQzY0IDcxLjE2NDkgNTYuODM1MSA2NCA0OCA2NFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+'
                    }}
                  />
                </div>
                <h3 className={`font-semibold text-neutral-800 mb-2 text-center ${showSelection ? 'text-lg' : 'text-xl'}`}>
                  {teacher.name}
                </h3>
                
                {/* Show description only in normal mode, checkbox only in selection mode */}
                {showSelection ? (
                  <div className="flex justify-center">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                      isSelected 
                        ? 'bg-primary-500 border-primary-500' 
                        : 'border-gray-300 hover:border-primary-400'
                    }`}>
                      {isSelected && (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-neutral-600 text-sm leading-relaxed">
                    {teacher.description}
                  </p>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Dots Indicator - Only show if more than teachersPerView teachers */}
        {teachers.length > teachersPerView && (
          <div className="flex justify-center mt-6 space-x-2">
            {Array.from({ length: maxIndex + 1 }, (_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  index === currentIndex 
                    ? 'bg-primary-500' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                title={`View teachers ${index + 1}-${Math.min(index + teachersPerView, teachers.length)}`}
              />
            ))}
          </div>
        )}
        
        {/* Selection Summary - Only show in selection mode */}
        {showSelection && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {selectedTeachers.length} of {teachers.length} teachers selected
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default TeacherShowcase
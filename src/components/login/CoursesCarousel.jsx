
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const CoursesCarousel = ({ courses = [], title = "Our Courses", subtitle = "Choose from our wide range of language courses designed to meet your learning goals" }) => {
  const [currentCourse, setCurrentCourse] = useState(0)
  const [showModal, setShowModal] = useState(false)

  const nextCourse = () => {
    setCurrentCourse((prev) => (prev + 1) % courses.length)
  }

  const prevCourse = () => {
    setCurrentCourse((prev) => (prev - 1 + courses.length) % courses.length)
  }

  if (!courses || courses.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-3xl font-bold text-neutral-800 mb-4">{title}</h2>
        <p className="text-neutral-600">No courses available at the moment.</p>
      </div>
    )
  }

  const course = courses[currentCourse]

  return (
    <div className="text-center">
      <h2 className="text-3xl font-bold text-neutral-800 mb-4">
        {title}
      </h2>
      <p className="text-neutral-600 mb-8 max-w-2xl mx-auto">
        {subtitle}
      </p>

      <div className="max-w-4xl mx-auto">
        <motion.div
          key={currentCourse}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.5 }}
          className="relative bg-white rounded-2xl shadow-xl overflow-hidden cursor-pointer"
          onClick={() => setShowModal(true)}
        >
          {/* Course Background Image */}
          <div 
            className="h-80 bg-gradient-to-r from-primary-500 to-secondary-500 relative"
            style={{
              backgroundImage: course.background_image ? `url(${course.background_image})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <div className="absolute inset-0 bg-black bg-opacity-30" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <h3 className="text-4xl font-bold mb-4">{course.name}</h3>
                <p className="text-xl max-w-2xl mx-auto px-4">{course.description}</p>
              </div>
            </div>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              prevCourse()
            }}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-all duration-200 clickable"
            title="Previous course"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              nextCourse()
            }}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-all duration-200 clickable"
            title="Next course"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Course Counter */}
          <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
            {currentCourse + 1} / {courses.length}
          </div>
        </motion.div>

        {/* Dot Indicators */}
        {courses.length > 1 && (
          <div className="flex justify-center mt-6 space-x-2">
            {courses.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentCourse(index)}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  index === currentCourse 
                    ? 'bg-primary-500' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                title={`View course ${index + 1}: ${courses[index].name}`}
              />
            ))}
          </div>
        )}

        {/* Course Details Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-3xl font-bold text-neutral-800">{course.name}</h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <p className="text-lg text-neutral-600">{course.description}</p>
                  <p className="text-neutral-700 leading-relaxed">{course.detailed_description}</p>
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    onClick={() => setShowModal(false)}
                    className="btn-primary"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default CoursesCarousel

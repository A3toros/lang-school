import { motion } from 'framer-motion'

const TeacherShowcase = ({ teachers = [], title = "Meet Our Teachers", subtitle = "Our experienced and passionate teachers are here to help you achieve your language learning goals" }) => {

  return (
    <div className="text-center mb-16">
      <h2 className="text-3xl font-bold text-neutral-800 mb-4">
        {title}
      </h2>
      <p className="text-neutral-600 mb-8 max-w-2xl mx-auto">
        {subtitle}
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {teachers.map((teacher, index) => (
          <motion.div
            key={teacher.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="card hover:shadow-xl transition-all duration-300 clickable"
          >
            <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden bg-neutral-200">
              <img
                src={teacher.photo_url || '/pics/teachers/default.jpg'}
                alt={teacher.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDgiIGN5PSI0OCIgcj0iNDgiIGZpbGw9IiNGM0Y0RjYiLz4KPHBhdGggZD0iTTQ4IDI0QzM5LjE2NDkgMjQgMzIgMzEuMTY0OSAzMiA0MEMzMiA0OC44MzUxIDM5LjE2NDkgNTYgNDggNTZDNTYuODM1MSA1NiA2NCA0OC44MzUxIDY0IDQwQzY0IDMxLjE2NDkgNTYuODM1MSAyNCA0OCAyNFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTQ4IDY0QzM5LjE2NDkgNjQgMzIgNzEuMTY0OSAzMiA4MEMzMiA4OC44MzUxIDM5LjE2NDkgOTYgNDggOTZDNTYuODM1MSA5NiA2NCA4OC44MzUxIDY0IDgwQzY0IDcxLjE2NDkgNTYuODM1MSA2NCA0OCA2NFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+'
                }}
              />
            </div>
            <h3 className="text-xl font-semibold text-neutral-800 mb-2">
              {teacher.name}
            </h3>
            <p className="text-neutral-600 text-sm leading-relaxed">
              {teacher.description}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default TeacherShowcase

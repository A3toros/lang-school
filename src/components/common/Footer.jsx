import React from 'react'
import { motion } from 'framer-motion'

const Footer = () => {
  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-neutral-800 text-white py-8 mt-16"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">LangSchool</h3>
            <p className="text-neutral-300 text-sm">
              Breaking down language barriers and connecting people across cultures 
              through innovative teaching methods and experienced instructors.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/" className="text-neutral-300 hover:text-white transition-colors">
                  Home
                </a>
              </li>
              <li>
                <a href="/admin" className="text-neutral-300 hover:text-white transition-colors">
                  Admin Dashboard
                </a>
              </li>
              <li>
                <a href="/teacher" className="text-neutral-300 hover:text-white transition-colors">
                  Teacher Dashboard
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <div className="text-sm text-neutral-300 space-y-2">
              <p>Email: info@langschool.com</p>
              <p>Phone: +1 (555) 123-4567</p>
              <p>Address: 123 Language St, Education City</p>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-700 mt-8 pt-8 text-center">
          <p className="text-neutral-400 text-sm">
            © 2024 LangSchool. All rights reserved.
          </p>
        </div>
      </div>
    </motion.footer>
  )
}

export default Footer

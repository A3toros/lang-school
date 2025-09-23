import React, { forwardRef } from 'react'

const Input = forwardRef(({ 
  type = 'text',
  label,
  error,
  helperText,
  required = false,
  disabled = false,
  className = '',
  ...props 
}, ref) => {
  const baseClasses = 'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors'
  const errorClasses = error ? 'border-error focus:ring-error' : 'border-neutral-300'
  const disabledClasses = disabled ? 'bg-neutral-100 cursor-not-allowed' : 'bg-white'
  
  const classes = `${baseClasses} ${errorClasses} ${disabledClasses} ${className}`

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-neutral-700">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        className={classes}
        disabled={disabled}
        {...props}
      />
      {error && (
        <p className="text-sm text-error">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-sm text-neutral-500">{helperText}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input

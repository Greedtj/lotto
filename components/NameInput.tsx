'use client'
import { useState } from 'react'

/** Username field: spaces are removed as you type (the server strips them too). */
export function NameInput({ defaultValue, ...rest }: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>) {
  const [value, setValue] = useState(String(defaultValue ?? ''))
  return (
    <input
      {...rest}
      className="input"
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      maxLength={20}
      value={value}
      onChange={(e) => setValue(e.target.value.replace(/[\s​-‍⁠﻿]/g, ''))}
    />
  )
}

'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { motion } from 'framer-motion'

interface ThemeToggleProps {
  variant?: 'default' | 'mobile'
}

export default function ThemeToggle({ variant = 'default' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      className={`
        relative rounded-full transition-all duration-300
        ${variant === 'mobile'
          ? 'w-14 h-7 bg-gray-600/50 dark:bg-gray-400/30'
          : 'w-16 h-8 bg-gray-300/60 dark:bg-gray-600/60'
        }
        hover:bg-gray-400/70 dark:hover:bg-gray-500/70
        focus:outline-none focus:ring-2 focus:ring-offset-2
        focus:ring-gray-400 dark:focus:ring-gray-500
        backdrop-blur-sm border border-gray-400/30 dark:border-gray-500/30
      `}
    >
      {/* スライドする丸いノブ */}
      <motion.div
        className={`
          absolute top-0.5 flex items-center justify-center rounded-full
          bg-white dark:bg-gray-800 shadow-md
          ${variant === 'mobile' ? 'w-6 h-6' : 'w-7 h-7'}
        `}
        animate={{
          x: theme === 'dark'
            ? (variant === 'mobile' ? 28 : 32)
            : 4,
        }}
        transition={{
          type: 'spring',
          stiffness: 700,
          damping: 30,
        }}
      >
        {/* アイコンのフェード切り替え */}
        <motion.div
          initial={false}
          animate={{
            scale: theme === 'light' ? 1 : 0,
            opacity: theme === 'light' ? 1 : 0,
          }}
          transition={{ duration: 0.2 }}
          className="absolute"
        >
          <Sun size={variant === 'mobile' ? 14 : 16} className="text-yellow-500" />
        </motion.div>

        <motion.div
          initial={false}
          animate={{
            scale: theme === 'dark' ? 1 : 0,
            opacity: theme === 'dark' ? 1 : 0,
          }}
          transition={{ duration: 0.2 }}
          className="absolute"
        >
          <Moon size={variant === 'mobile' ? 14 : 16} className="text-blue-400" />
        </motion.div>
      </motion.div>

      {/* 背景のアイコン表示（オプション） */}
      <div className="absolute inset-0 flex items-center justify-between px-2">
        <Sun
          size={variant === 'mobile' ? 12 : 14}
          className={`transition-opacity ${theme === 'light' ? 'opacity-0' : 'opacity-40'} text-yellow-300`}
        />
        <Moon
          size={variant === 'mobile' ? 12 : 14}
          className={`transition-opacity ${theme === 'dark' ? 'opacity-0' : 'opacity-40'} text-blue-300`}
        />
      </div>
    </button>
  )
}

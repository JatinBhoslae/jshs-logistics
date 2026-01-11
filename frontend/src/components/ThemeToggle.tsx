import { useTheme } from '../theme/ThemeContext'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme()

  return (
    <button
      type="button"
      onClick={toggle}
      className={`btn-ghost ${className}`}
      aria-label="Toggle light/dark theme"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  )
}

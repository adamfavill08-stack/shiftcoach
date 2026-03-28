import type { Config } from 'tailwindcss'

const config: Config = {
  // Light-only app; re-enable when implementing dark mode properly
  darkMode: false,
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
}

export default config


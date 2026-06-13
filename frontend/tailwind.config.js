/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                beeswax: {
                    50: '#FFFBF0',
                    100: '#FEF6E0',
                    200: '#FDEDC0',
                    300: '#FBDE91',
                    400: '#F8C95B',
                    500: '#F5B033',
                    600: '#E8961F',
                    700: '#C17516',
                    800: '#9A5B16',
                    900: '#7D4B17',
                },
                honey: {
                    50: '#FFF8E8',
                    100: '#FFEFC4',
                    200: '#FFDF88',
                    300: '#FFCB4D',
                    400: '#FFB21A',
                    500: '#E8980C',
                    600: '#C77508',
                    700: '#9F540B',
                    800: '#824211',
                    900: '#6F3714',
                },
                ambercomb: {
                    50: '#FFFBEB',
                    100: '#FEF3C7',
                    200: '#FDE68A',
                    300: '#FCD34D',
                    400: '#FBBF24',
                    500: '#D97706',
                    600: '#B45309',
                    700: '#92400E',
                    800: '#78350F',
                    900: '#451A03',
                },
                cream: {
                    900: '#2D2418',
                    800: '#3D3224',
                    700: '#504331',
                    600: '#6B5A43',
                },
                panel: {
                    bg: '#1C1712',
                    card: '#2A2219',
                    border: '#3D3224',
                    text: '#F5E6D3',
                    muted: '#B8A88A',
                }
            },
            fontFamily: {
                display: ['"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
            },
            animation: {
                'scan': 'scan 3s linear infinite',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'glow': 'glow 2s ease-in-out infinite alternate',
                'shine': 'shine 2.5s ease-in-out infinite',
                'float': 'float 6s ease-in-out infinite',
                'spin-slow': 'spin 12s linear infinite',
            },
            keyframes: {
                scan: {
                    '0%': { transform: 'translateY(-100%)', opacity: '0' },
                    '10%': { opacity: '0.8' },
                    '90%': { opacity: '0.8' },
                    '100%': { transform: 'translateY(100%)', opacity: '0' },
                },
                glow: {
                    '0%': { boxShadow: '0 0 5px rgba(251, 191, 36, 0.4), 0 0 10px rgba(251, 191, 36, 0.2)' },
                    '100%': { boxShadow: '0 0 20px rgba(251, 191, 36, 0.8), 0 0 40px rgba(251, 191, 36, 0.4)' },
                },
                shine: {
                    '0%, 100%': { opacity: '0.6' },
                    '50%': { opacity: '1' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-6px)' },
                },
            },
        },
    },
    plugins: [],
}

import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			danger: 'hsl(var(--danger))',
  			success: 'hsl(var(--success))',
  			warning: 'hsl(var(--warning))',
  			'background-element': 'hsl(var(--background-element))',
  			'background-selected': 'hsl(var(--background-selected))',
  			'text-secondary': 'hsl(var(--text-secondary))',
  			brand: {
  				from: 'hsl(var(--brand-gradient-from))',
  				to: 'hsl(var(--brand-gradient-to))'
  			},
  			glass: {
  				DEFAULT: 'var(--glass-bg)',
  				strong: 'var(--glass-bg-strong)',
  				border: 'var(--glass-border)'
  			},
  			stat: {
  				blue: { from: 'hsl(var(--stat-blue-from))', to: 'hsl(var(--stat-blue-to))' },
  				teal: { from: 'hsl(var(--stat-teal-from))', to: 'hsl(var(--stat-teal-to))' },
  				orange: { from: 'hsl(var(--stat-orange-from))', to: 'hsl(var(--stat-orange-to))' },
  				pink: { from: 'hsl(var(--stat-pink-from))', to: 'hsl(var(--stat-pink-to))' }
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			none: '0',
  			sm: '0.25rem',
  			DEFAULT: '0.375rem',
  			md: '0.375rem',
  			lg: '0.5rem',
  			xl: '0.75rem',
  			'2xl': '1rem',
  			'3xl': '1.25rem',
  			round: '1rem',
  			'round-lg': '1.75rem'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		},
  		transitionDuration: {
  			'motion-fast': 'var(--motion-fast)',
  			'motion-base': 'var(--motion-base)',
  			'motion-slow': 'var(--motion-slow)'
  		},
  		transitionTimingFunction: {
  			motion: 'var(--motion-ease)'
  		},
  		backdropBlur: {
  			glass: '0px'
  		},
  		boxShadow: {
  			'neu-raised': '6px 6px 14px hsl(var(--neu-dark) / 0.55), -6px -6px 14px hsl(var(--neu-light) / 0.9)',
  			'neu-raised-dark': '6px 6px 14px hsl(var(--neu-dark) / 0.55), -5px -5px 12px hsl(var(--neu-light) / 0.05)',
  			'neu-raised-sm': '3px 3px 7px hsl(var(--neu-dark) / 0.5), -3px -3px 7px hsl(var(--neu-light) / 0.85)',
  			'neu-raised-sm-dark': '3px 3px 7px hsl(var(--neu-dark) / 0.55), -3px -3px 6px hsl(var(--neu-light) / 0.05)',
  			'neu-inset': 'inset 3px 3px 7px hsl(var(--neu-dark) / 0.45), inset -3px -3px 7px hsl(var(--neu-light) / 0.85)',
  			'neu-inset-dark': 'inset 3px 3px 7px hsl(var(--neu-dark) / 0.6), inset -3px -3px 6px hsl(var(--neu-light) / 0.05)',
  			'neu-glow': '3px 3px 7px hsl(var(--neu-dark) / 0.5), -3px -3px 7px hsl(var(--neu-light) / 0.85)',
  			'neu-glow-dark': '3px 3px 7px hsl(var(--neu-dark) / 0.55), -3px -3px 6px hsl(var(--neu-light) / 0.05)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;

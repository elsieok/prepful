import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#EEEDFE',
          500: '#534AB7',
          900: '#26215C',
        }
      }
    }
  },
  plugins: [],
};
export default config;

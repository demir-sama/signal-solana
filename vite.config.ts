import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],server:{proxy:{'/api/rpc':{target:'https://api.devnet.solana.com',changeOrigin:true,rewrite:()=>'/'} }},worker:{format:'es'},build:{target:'es2022',chunkSizeWarningLimit:1200}});

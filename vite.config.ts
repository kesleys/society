import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// Documentação: Plugin personalizado para resolver caminhos de imagens exportadas do Figma
function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    // Correção: Adicionamos ': string' para tipar o parâmetro 'id'
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

// Documentação: Configuração principal do Vite para construção do projeto
export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // Os plugins React e Tailwind são necessários, não remover
    react(),
    tailwindcss(),
  ],
  // Importante para o GitHub Pages: Caminho base do repositório
  base: '/society/',
  resolve: {
    alias: {
      // Cria o atalho '@' para apontar diretamente para a pasta 'src'
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Tipos de ficheiros suportados para importação bruta (sem processamento)
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { CharacterGenerator } from './services/CharacterGenerator.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Inicializar serviços
const characterGenerator = new CharacterGenerator();

// Rotas da API
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Gerador de Personagens D&D 2024 funcionando!',
    timestamp: new Date().toISOString()
  });
});

// Gerar personagem
app.post('/api/generate', async (req, res) => {
  try {
    const {
      level,
      class: characterClass,
      subclass,
      race,
      powerLevel = 'medium',
      includeHistory = false,
      includePersonality = false,
      spellcastersOnly = false,
      context = ''
    } = req.body;

    const character = await characterGenerator.generateCharacter({
      level,
      class: characterClass,
      subclass,
      race,
      powerLevel,
      includeHistory,
      includePersonality,
      spellcastersOnly,
      context
    });

    res.json(character);
  } catch (error) {
    console.error('Erro ao gerar personagem:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : String(error),
      details: error instanceof Error ? error.stack : undefined
    });
  }
});

// Inicializar o servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📱 Interface disponível em: http://localhost:${PORT}`);
  console.log(`🔗 API disponível em: http://localhost:${PORT}/api`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
});

export default app; 
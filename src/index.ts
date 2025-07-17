import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { CharacterGenerator } from './services/CharacterGenerator.js';
import { PDFGenerator } from './services/PDFGenerator.js';
import { HTMLPDFGenerator } from './services/HTMLPDFGenerator.js';
import { DnDDataService } from './services/DnDDataService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Inicializar serviços
const characterGenerator = new CharacterGenerator();
const pdfGenerator = new PDFGenerator();
const htmlPdfGenerator = new HTMLPDFGenerator();
const dataService = new DnDDataService();

// Rotas da API
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Gerador de Personagens D&D 2024 funcionando!',
    timestamp: new Date().toISOString()
  });
});

// Rotas para dados D&D
app.get('/api/data/races', (req, res) => {
  try {
    const races = dataService.getRaces();
    res.json({ success: true, data: races, count: races.length });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

app.get('/api/data/classes', (req, res) => {
  try {
    const classes = dataService.getClasses();
    res.json({ success: true, data: classes, count: classes.length });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

app.get('/api/data/classes/:className/subclasses', (req, res) => {
  try {
    const { className } = req.params;
    const subclasses = dataService.getSubclassesByClass(className);
    res.json({ success: true, data: subclasses, count: subclasses.length });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

app.get('/api/data/spells', (req, res) => {
  try {
    const { class: className, level, school, source } = req.query;
    const filters: any = {};
    
    if (className) filters.class = className as string;
    if (level) filters.level = parseInt(level as string);
    if (school) filters.school = school as string;
    if (source) filters.source = source as string;

    const result = dataService.filterSpells(filters);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

app.get('/api/data/feats', (req, res) => {
  try {
    const { category, source } = req.query;
    const filters: any = {};
    
    if (category) filters.category = category as string;
    if (source) filters.source = source as string;

    const result = dataService.filterFeats(filters);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

app.get('/api/data/spells/:className', (req, res) => {
  try {
    const { className } = req.params;
    const spells = dataService.getSpellsByClass(className);
    res.json({ success: true, data: spells, count: spells.length });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

app.get('/api/data/suggestions/spells/:className/:level', (req, res) => {
  try {
    const { className, level } = req.params;
    const count = parseInt(req.query.count as string) || 5;
    const suggestions = dataService.getSpellSuggestions(className, parseInt(level), count);
    res.json({ success: true, data: suggestions, count: suggestions.length });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

app.get('/api/data/suggestions/feats/:className/:level', (req, res) => {
  try {
    const { className, level } = req.params;
    const count = parseInt(req.query.count as string) || 3;
    const suggestions = dataService.getFeatSuggestions(className, parseInt(level), count);
    res.json({ success: true, data: suggestions, count: suggestions.length });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
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

// Gerar PDF da ficha
app.post('/api/generate-pdf', async (req, res) => {
  try {
    const character = req.body;

    if (!character || !character.race || !character.class) {
      return res.status(400).json({ 
        error: 'Dados do personagem inválidos. Gere um personagem primeiro.' 
      });
    }

    const pdfBytes = await pdfGenerator.generateCharacterSheet(character);

    // Configurar headers para download do PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="DnD_Character_Sheet.pdf"');
    res.setHeader('Content-Length', pdfBytes.length);

    return res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : String(error),
      details: error instanceof Error ? error.stack : undefined
    });
  }
});

// Gerar PDF a partir do HTML
app.post('/api/generate-html-pdf', async (req, res) => {
  try {
    const character = req.body;

    if (!character || !character.race || !character.class) {
      return res.status(400).json({ 
        error: 'Dados do personagem inválidos. Gere um personagem primeiro.' 
      });
    }

    const pdfBuffer = await htmlPdfGenerator.generatePDF(character);

    // Configurar headers para download do PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="DnD_Character_Sheet_HTML.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Erro ao gerar PDF HTML:', error);
    return res.status(500).json({ 
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
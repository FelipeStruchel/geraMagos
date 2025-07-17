import OpenAI from 'openai';
import { config } from 'dotenv';
import { DnDDataService } from './DnDDataService.js';
import type { SimpleCharacter, FullCharacter, Spell } from '../types/dnd-data.js';
config();

export interface GenerateCharacterParams {
  level: number;
  class: string;
  subclass?: string;
  race?: string;
  powerLevel?: string;
  includeHistory?: boolean;
  includePersonality?: boolean;
  spellcastersOnly?: boolean;
  context?: string;
  rolledStats?: number[];
}

export class CharacterGenerator {
  private openai: OpenAI;
  private dataService: DnDDataService;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY as string
    });
    this.dataService = new DnDDataService();
  }

  async generateCharacter(params: GenerateCharacterParams): Promise<FullCharacter> {
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
    } = params;

    // Validação de nível (D&D 2024 vai até nível 20)
    if (level < 1 || level > 20) {
      throw new Error(`Nível inválido: ${level}. O nível deve estar entre 1 e 20.`);
    }

    try {
      // Gerar atributos usando 4d6 descarta o menor
      const rolledStats = this.generateAbilityScores();
      
      // Gerar personagem simples com GPT, passando os atributos rolados
      const simpleCharacter = await this.generateSimpleCharacter({
        level,
        class: characterClass,
        subclass: subclass || '',
        race: race || '',
        powerLevel,
        includeHistory,
        includePersonality,
        context,
        rolledStats
      });

      // Validar o personagem gerado
      const validation = this.dataService.validateCharacter(simpleCharacter);
      if (!validation.valid) {
        console.warn('Problemas encontrados na validação:', validation.issues);
        console.warn('Sugestões:', validation.suggestions);
      }

      // Enriquecer com dados completos
      const fullCharacter = this.dataService.enrichCharacter(simpleCharacter);

      // Adicionar informações sobre as operações nos atributos (se fornecidas pelo GPT)
      if (simpleCharacter.abilityScoreOperations) {
        fullCharacter.abilityScoreOperations = simpleCharacter.abilityScoreOperations;
      }

      return fullCharacter;
    } catch (error) {
      console.error('Erro na geração do personagem:', error);
      throw error;
    }
  }

  // Gerar atributos usando 4d6 descarta o menor
  private generateAbilityScores(): number[] {
    const scores: number[] = [];
    
    for (let i = 0; i < 6; i++) {
      const rolls: number[] = [];
      
      // Rolar 4d6
      for (let j = 0; j < 4; j++) {
        rolls.push(Math.floor(Math.random() * 6) + 1);
      }
      
      // Descarta o menor
      rolls.sort((a, b) => b - a);
      const finalScore = (rolls[0] || 0) + (rolls[1] || 0) + (rolls[2] || 0);
      
      scores.push(finalScore);
    }
    
    // Verificar se atende aos requisitos mínimos
    const total = scores.reduce((sum, score) => sum + score, 0);
    const hasHighScore = scores.some(score => score >= 16);
    
    // Se não atender aos requisitos, rolar novamente
    if (total < 75 || !hasHighScore) {
      console.log(`Atributos não atenderam requisitos (total: ${total}, tem 16+: ${hasHighScore}), rolando novamente...`);
      return this.generateAbilityScores();
    }
    
    console.log('Atributos rolados:', scores, 'Total:', total);
    return scores;
  }

  private async generateSimpleCharacter(params: GenerateCharacterParams): Promise<SimpleCharacter> {
    const prompt = this.buildSimplePrompt(params);

    // Imprimir o prompt para debug
    console.log('=== PROMPT ENVIADO PARA O GPT ===');
    console.log(prompt);
    console.log('=== FIM DO PROMPT ===');

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a Dungeons & Dragons 5e expert. Generate valid characters that are consistent with the D&D 5e game system. DO NOT generate character names. Respond ONLY in valid JSON, without additional explanations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 2000
      });
      
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Resposta vazia da API OpenAI');
      }
      
      // Imprimir a resposta do ChatGPT para debug
      console.log('=== RESPOSTA DO CHATGPT ===');
      console.log(content);
      console.log('=== FIM DA RESPOSTA ===');
      
      try {
        // A API Chat Completions com response_format: json_object retorna JSON válido
        const simpleCharacter = JSON.parse(content) as SimpleCharacter;
        
        // Validar estrutura básica
        if (!simpleCharacter.race || !simpleCharacter.class || !simpleCharacter.level) {
          console.error('Resposta recebida:', content);
          throw new Error('Resposta incompleta: campos obrigatórios faltando');
        }

        return simpleCharacter;
      } catch (parseError) {
        console.error('Erro ao processar a resposta:', parseError);
        console.error('Conteúdo recebido:', content);
        throw new Error('Resposta da IA não está no formato esperado');
      }
    } catch (error) {
      console.error('Erro na chamada da API OpenAI:', error);
      throw new Error(`Falha na geração do personagem: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private buildSimplePrompt(params: GenerateCharacterParams): string {
    const {
      level,
      class: characterClass,
      subclass,
      race,
      powerLevel,
      includeHistory,
      includePersonality,
      spellcastersOnly,
      context,
      rolledStats
    } = params;

    // Obter dados disponíveis para o prompt
    const races = this.dataService.getRaces();
    const classes = this.dataService.getClasses();
    const feats = this.dataService.getFeats();
    
    const availableRaces = races && races.length > 0 ? races.map(r => r.name) : [];
    const availableClasses = classes && classes.length > 0 ? classes.map(c => c.name) : [];
    
    // Obter subclasses válidas para a classe selecionada
    let availableSubclasses: string[] = [];
    if (characterClass) {
      availableSubclasses = this.dataService.getSubclassesByClass(characterClass) || [];
    }
    
    // Obter magias por nível para a classe selecionada
    let spellsByLevel: { [key: number]: string[] } = {};
    if (characterClass) {
      const allSpells = this.dataService.getSpellsByClass(characterClass, subclass);
      
      spellsByLevel = allSpells.reduce((acc, spell) => {
        const level = spell.level || 0;
        if (!acc[level]) acc[level] = [];
        acc[level].push(spell.name);
        return acc;
      }, {} as { [key: number]: string[] });
    }
    
    // Obter feats disponíveis
    const availableFeats = feats && feats.length > 0 ? feats.map(f => f.name).filter(Boolean) : [];

    // Determinar se é geração aleatória ou com parâmetros específicos
    const isRandomGeneration = !characterClass && !race && !subclass;
    
    // Instruções baseadas no que foi selecionado
    let classInstructions: string;
    let subclassInstructions: string;
    let raceInstructions: string;
    
    if (characterClass) {
      classInstructions = `- Class: ${characterClass} (FIXED)`;
      if (subclass) {
        subclassInstructions = `- Subclass: ${subclass} (FIXED)`;
      } else {
        subclassInstructions = `- Subclass: Choose ONE of the following subclasses for ${characterClass}: ${availableSubclasses.join(', ')}`;
      }
    } else {
      if (spellcastersOnly) {
        const spellcasterClasses = availableClasses.filter(c => 
          ['Wizard', 'Sorcerer', 'Warlock', 'Cleric', 'Druid', 'Bard', 'Paladin', 'Ranger', 'Artificer', 'Fighter', 'Rogue'].includes(c)
        );
        classInstructions = `- Class: Choose ONE of the following SPELLCASTER classes: ${spellcasterClasses.join(', ')}`;
      } else {
        classInstructions = `- Class: Choose ONE of the following classes: ${availableClasses.join(', ')}`;
      }
      
      if (spellcastersOnly) {
        subclassInstructions = `- Subclass: Choose an appropriate subclass for the selected class. For Fighter, prefer "Eldritch Knight". For Rogue, prefer "Arcane Trickster".`;
      } else {
        subclassInstructions = `- Subclass: Choose an appropriate subclass for the selected class`;
      }
    }
        
    if (race) {
      raceInstructions = `- Race: ${race} (FIXED)`;
    } else {
      raceInstructions = `- Race: Choose ONE of the following races: ${availableRaces.join(', ')}`;
    }

    // Lista de fontes permitidas
    const allowedSources = [
      'PHB (Player\'s Handbook)',
      'XGE (Xanathar\'s Guide to Everything)',
      'TCE (Tasha\'s Cauldron of Everything)',
      'MPMM (Monsters of the Multiverse)',
      'VRGR (Van Richten\'s Guide to Ravenloft)',
      'EGW (Explorer\'s Guide to Wildemount)',
      'FTD (Fizban\'s Treasury of Dragons)',
      'GGR (Guildmaster\'s Guide to Ravnica)',
      'SATO', 'SCC', 'etc.'
    ];

    return `
Generate a D&D 5e character with the following JSON structure:

{
  "race": "race name",
  "feats": ["feat1", "feat2"],
  "level": ${level},
  "class": "class name",
  "subclass": "subclass name",
  "spells": ["spell1", "spell2", "spell3", "spell4", "spell5", "spell6", "spell7", "spell8", "spell9", "spell10"],
  "background": "${includeHistory ? 'brief background story' : ''}",
  "personality": "${includePersonality ? 'personality traits' : ''}",
  "equipment": [
    {
      "name": "item name",
      "mechanicalDescription": "what this item does mechanically",
      "visualDescription": "simple visual description of the item"
    }
  ],
  "abilities": {
    "strength": 15,
    "dexterity": 14,
    "constitution": 13,
    "intelligence": 12,
    "wisdom": 10,
    "charisma": 8
  },
  "armorClass": 16,
  "whyStrong": "brief explanation of why this character is powerful/optimized",
  "howToPlay": "brief tactical advice on how to play this character effectively"
}

ROLLED ABILITY SCORES (4d6 drop lowest):
${rolledStats ? `The following values were rolled: [${rolledStats.join(', ')}]
You must distribute these values among the 6 abilities (Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma).
After distributing, apply bonuses from the chosen race and background.
Ability scores can exceed 18 up to 20 (or more if the class allows).
Use "Ability Score Improvement" if necessary to optimize the character.` : 'Generate appropriate ability scores for the character.'}

Specifications:
- Level: ${level}
${classInstructions}
${subclassInstructions}
${raceInstructions}
- Power Level: ${powerLevel}
  ${powerLevel === 'low' ? 'Low: Character without combos and not properly optimized' : ''}
  ${powerLevel === 'medium' ? 'Medium: No combos but optimized' : ''}
  ${powerLevel === 'high' ? 'High: With combos and optimized' : ''}
  ${powerLevel === 'epic' ? 'Epic: With the best combos and maximally optimized' : ''}
${includeHistory ? '- Include background story: YES' : '- Include background story: NO'}
${includePersonality ? '- Include personality: YES' : '- Include personality: NO'}
${spellcastersOnly ? '- Spellcasters only: YES (choose only spellcasting classes)' : '- Spellcasters only: NO'}
${context ? `- Setting: ${context}` : ''}
${rolledStats ? `- Ability Scores: [${rolledStats.join(', ')}]` : ''}

Allowed sources (official books):
- ${allowedSources.join('\n- ')}

AVAILABLE OPTIONS:
${!characterClass ? `- Available classes: ${availableClasses.join(', ')}` : ''}
${!race ? `- Available races: ${availableRaces.join(', ')}` : ''}
${characterClass && !subclass && availableSubclasses.length > 0 ? `- Available subclasses for ${characterClass}: ${availableSubclasses.join(', ')}` : ''}
${characterClass ? `- Available spells for ${characterClass} (level ${level}):` : '- Spells: Choose appropriate spells for the selected class'}
${characterClass && Object.keys(spellsByLevel).length > 0 ? 
  Object.entries(spellsByLevel)
    .filter(([spellLevel]) => parseInt(spellLevel) <= Math.ceil(level / 2))
    .map(([spellLevel, spells]) => `  Level ${spellLevel}: ${spells.join(', ')}`)
    .join('\n') : ''
}
${(characterClass === 'Fighter' && subclass === 'Eldritch Knight') || (characterClass === 'Rogue' && subclass === 'Arcane Trickster') ? 
  `\nNote: ${characterClass} (${subclass}) can choose from Wizard spells. ${subclass === 'Eldritch Knight' ? 'Prefer Evocation and Abjuration schools.' : 'Prefer Illusion and Enchantment schools.'}` : ''
}
- Available feats: ${availableFeats.join(', ')}

MANDATORY RULES:
1. Use ONLY names from the options listed above
2. For spells, choose ONLY the spells the character has LEARNED/KNOWN (not all available spells)
3. Spell limits by class and level:
   - WIZARD: ${level >= 1 ? '4 cantrips' : '3 cantrips'} + ${Math.min(level + 2, 20)} known spells
   - SORCERER: ${level >= 1 ? '4 cantrips' : '3 cantrips'} + ${Math.min(level + 1, 20)} known spells
   - WARLOCK: ${level >= 1 ? '4 cantrips' : '3 cantrips'} + ${Math.min(level + 1, 20)} known spells
   - CLERIC: ${level >= 1 ? '4 cantrips' : '3 cantrips'} + ${Math.min(level + 1, 20)} known spells
   - DRUID: ${level >= 1 ? '4 cantrips' : '3 cantrips'} + ${Math.min(level + 1, 20)} known spells
   - BARD: ${level >= 1 ? '4 cantrips' : '3 cantrips'} + ${Math.min(level + 1, 20)} known spells
   - PALADIN: ${Math.min(Math.floor(level/2) + 1, 5)} known spells
   - RANGER: ${Math.min(Math.floor(level/2) + 1, 5)} known spells
   - ARTIFICER: ${level >= 1 ? '4 cantrips' : '3 cantrips'} + ${Math.min(level + 1, 20)} known spells
   - FIGHTER (Eldritch Knight): ${level >= 3 ? '2 cantrips' : '0 cantrips'} + ${Math.min(Math.floor(level/3) + 1, 13)} known spells (Wizard spells only)
   - ROGUE (Arcane Trickster): ${level >= 3 ? '3 cantrips' : '0 cantrips'} + ${Math.min(Math.floor(level/3) + 1, 13)} known spells (Wizard spells only)
4. Choose appropriate feats for level ${level}
5. If class is not specified, choose ONE class from the list
6. If race is not specified, choose ONE race from the list
7. If subclass is not specified, choose ONE appropriate subclass for the class
8. Respond ONLY in valid JSON
9. DO NOT generate character names
10. DO NOT invent subclasses that don't exist (like "Adept of the White Robes")
11. DO NOT use subclasses from other classes
12. ONLY include "personality" if requested (checkbox checked)
13. ONLY include "background" if requested (checkbox checked)
14. For Eldritch Knight and Arcane Trickster: Choose ONLY Wizard spells, and respect the spell level restrictions. Eldritch Knight prefers Evocation and Abjuration schools, Arcane Trickster prefers Illusion and Enchantment schools. Other schools are allowed but limited.
14. Calculate armorClass considering base armor, Dexterity modifier, and class features (like Unarmored Defense for Barbarians/Monks)
15. For equipment, provide realistic items with mechanical and visual descriptions
16. Explain whyStrong based on the power level chosen
17. Provide howToPlay tactical advice for experienced D&D players
18. Include abilityScoreOperations object with:
    - originalRolls: the 6 ability scores you received
    - finalScores: the final ability scores after applying race/background bonuses
    - operations: array of strings explaining how each ability score was calculated (e.g., "Strength: 15 (original value)", "Constitution: 13 → 15 (+2 from race bonus)")

Respond only with JSON, without additional explanations.`;
  }

  // Método para gerar múltiplos personagens
  async generateMultipleCharacters(params: GenerateCharacterParams, count = 3): Promise<FullCharacter[]> {
    const characters: FullCharacter[] = [];

    for (let i = 0; i < count; i++) {
      try {
        const character = await this.generateCharacter(params);
        characters.push(character);
      } catch (error) {
        console.error(`Erro ao gerar personagem ${i + 1}:`, error);
        // Adicionar um personagem de erro para manter a contagem
        const errorCharacter: FullCharacter = {
          race: 'Erro',
          feats: [],
          level: 1,
          class: 'Erro',
          subclass: 'Erro',
          spells: [],
          abilities: {
            strength: 10,
            dexterity: 10,
            constitution: 10,
            intelligence: 10,
            wisdom: 10,
            charisma: 10
          }
        };
        characters.push(errorCharacter);
      }
    }

    return characters;
  }

  // Método para obter sugestões de magias
  getSpellSuggestions(className: string, level: number, count: number = 5, subclass?: string): Spell[] {
    return this.dataService.getSpellSuggestions(className, level, count, subclass);
  }

  // Método para obter sugestões de feats
  getFeatSuggestions(className: string, level: number, count: number = 3) {
    return this.dataService.getFeatSuggestions(className, level, count);
  }

  // Método para validar personagem
  validateCharacter(character: SimpleCharacter) {
    return this.dataService.validateCharacter(character);
  }

  // Método para enriquecer personagem
  enrichCharacter(character: SimpleCharacter): FullCharacter {
    return this.dataService.enrichCharacter(character);
  }

} 
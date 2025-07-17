import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type {
  Spell,
  Feat,
  Race,
  Class,
  SpellFilters,
  FeatFilters,
  RaceFilters,
  ClassFilters,
  ApiResponse,
  SpellProgression,
  SpellFilterResult,
  FeatFilterResult,
  RaceFilterResult,
  SimpleCharacter,
  FullCharacter
} from '../types/dnd-data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface SpellWithClasses extends Spell {
  classes: string[];
}

interface ClassData {
  name: string;
  subclasses: string[];
  [key: string]: any;
}

interface RaceData {
  _meta: any;
  race: Race[];
}

interface SpellIndex {
  [source: string]: string;
}

interface SpellSources {
  [source: string]: {
    [spellName: string]: {
      class: Array<{ name: string }>;
    };
  };
}

interface ClassesIndex {
  [className: string]: string;
}

interface FeatData {
  feat: Feat[];
}

export class DnDDataService {
  private spells: SpellWithClasses[];
  private races: Race[];
  private classes: Record<string, ClassData>;
  private feats: Feat[];

  constructor() {
    console.log('Inicializando DnDDataService...');
    this.spells = this.loadSpellsData();
    console.log(`Carregadas ${this.spells.length} magias`);
    this.races = this.loadRacesData();
    console.log(`Carregadas ${this.races.length} raças`);
    this.classes = this.loadClassesData();
    console.log(`Carregadas ${Object.keys(this.classes).length} classes`);
    this.feats = this.loadFeatsData();
    console.log(`Carregados ${this.feats.length} feats`);
  }

  private loadSpellsData(): SpellWithClasses[] {
    try {
      // Carregar o index de magias
      const indexPath = join(__dirname, '..', '..', 'data', 'spells', 'index.json');
      const indexData: SpellIndex = JSON.parse(readFileSync(indexPath, 'utf8'));
      
      // Carregar o mapeamento de classes por magia
      const sourcesPath = join(__dirname, '..', '..', 'data', 'spells', 'sources.json');
      const sourcesData: SpellSources = JSON.parse(readFileSync(sourcesPath, 'utf8'));

      // Carregar todas as magias de todos os arquivos
      const allSpells: SpellWithClasses[] = [];
      
      for (const [source, fileName] of Object.entries(indexData)) {
        try {
          const filePath = join(__dirname, '..', '..', 'data', 'spells', fileName);
          const spellsData = JSON.parse(readFileSync(filePath, 'utf8'));
          
          if (spellsData.spell && Array.isArray(spellsData.spell)) {
            for (const spell of spellsData.spell) {
              // Adicionar campo 'classes' usando o sources.json
              const spellClasses = sourcesData[source]?.[spell.name]?.class || [];
              const classes = spellClasses.map((c: { name: string }) => c.name);
              
              allSpells.push({
                ...spell,
                source,
                classes
              });
            }
          }
        } catch (error) {
          console.error(`Erro ao carregar magias de ${source}:`, error instanceof Error ? error.message : String(error));
        }
      }
      
      return allSpells;
    } catch (error) {
      console.error('Erro ao carregar spells:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  private loadClassesData(): Record<string, ClassData> {
    try {
      // Carregar classes da pasta organizada
      const classesPath = join(__dirname, '..', '..', 'data', 'classes', 'index.json');
      const classesIndex: ClassesIndex = JSON.parse(readFileSync(classesPath, 'utf8'));
      
      const classesData: Record<string, ClassData> = {};
      
      // Processar cada classe
      for (const [className, fileName] of Object.entries(classesIndex)) {
        try {
          const classPath = join(__dirname, '..', '..', 'data', 'classes', fileName);
          const fileData = JSON.parse(readFileSync(classPath, 'utf8'));
          
          // A estrutura é { "class": [{ ... }], "subclass": [...] }
          if (fileData.class && Array.isArray(fileData.class) && fileData.class.length > 0) {
            const classData = fileData.class[0];
            // Inclui o campo 'subclass' se existir no arquivo
            if (fileData.subclass && Array.isArray(fileData.subclass)) {
              classData.subclass = fileData.subclass;
            }
            classesData[className] = {
              name: classData.name,
              subclasses: this.extractSubclasses(classData),
              ...classData
            };
          }
        } catch (error) {
          console.error(`Erro ao carregar classe ${className}:`, error instanceof Error ? error.message : String(error));
        }
      }
      
      return classesData;
    } catch (error) {
      console.error('Erro ao carregar classes:', error instanceof Error ? error.message : String(error));
      return {};
    }
  }

  private extractSubclasses(classData: any): string[] {
    // Tentar extrair subclasses de diferentes locais possíveis
    if (classData.subclasses) {
      return classData.subclasses;
    }
    
    // Extrair subclasses do campo 'subclass'
    if (classData.subclass && Array.isArray(classData.subclass)) {
      return classData.subclass.map((subclass: any) => subclass.name).filter(Boolean);
    }
    
    // Extrair subclasses de subclassTableGroups
    if (classData.subclassTableGroups && Array.isArray(classData.subclassTableGroups)) {
      const subclasses: string[] = [];
      
      for (const group of classData.subclassTableGroups) {
        if (group.subclasses && Array.isArray(group.subclasses)) {
          for (const subclass of group.subclasses) {
            if (subclass.name && !subclasses.includes(subclass.name)) {
              subclasses.push(subclass.name);
            }
          }
        }
      }
      
      return subclasses;
    }
    
    // Se não houver subclasses definidas, retornar array vazio
    return [];
  }

  private loadRacesData(): Race[] {
    try {
      const filePath = join(__dirname, '..', '..', 'data', 'races', 'races.json');
      const data = readFileSync(filePath, 'utf8');
      const parsedData: RaceData = JSON.parse(data);
      
      // Mapear os dados para o formato esperado
      return (parsedData.race || []).map(race => ({
        name: race.name,
        description: this.extractRaceDescription(race),
        size: Array.isArray(race.size) ? race.size[0] : race.size,
        speed: this.extractRaceSpeed(race.speed),
        traits: this.extractRaceTraits(race),
        source: race.source,
        page: race.page || 0
      }));
    } catch (error) {
      console.error('Erro ao carregar races.json:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  private extractRaceDescription(race: any): string {
    // Tentar extrair descrição de diferentes campos
    if (race.entries && Array.isArray(race.entries)) {
      // Pegar o primeiro entry que não seja um traço específico
      const firstEntry = race.entries.find((entry: any) => 
        entry.type === 'entries' && !entry.name
      );
      if (firstEntry && Array.isArray(firstEntry.entries)) {
        return this.cleanReferences(firstEntry.entries[0] || '');
      }
    }
    return '';
  }

  private extractRaceTraits(race: any): Array<{name: string, description: string}> {
    const traits: Array<{name: string, description: string}> = [];
    
    if (race.entries && Array.isArray(race.entries)) {
      for (const entry of race.entries) {
        if (entry.type === 'entries' && entry.name) {
          // Extrair descrição do traço
          let description = '';
          if (entry.entries && Array.isArray(entry.entries)) {
            description = entry.entries.join(' ');
          }
          
          traits.push({
            name: entry.name,
            description: this.cleanReferences(description)
          });
        }
      }
    }
    
    return traits;
  }

  private extractRaceSpeed(speed: any): number {
    if (typeof speed === 'number') {
      return speed;
    }
    if (typeof speed === 'object' && speed && typeof speed.walk === 'number') {
      return speed.walk;
    }
    return 30; // velocidade padrão
  }

  private cleanReferences(text: string): string {
    if (!text || typeof text !== 'string') return text;
    
    // Limpar referências do tipo {@dice 1d4}
    text = text.replace(/\{@dice\s+([^}]+)\}/g, '$1');
    
    // Limpar referências do tipo {@item X|Y} - pegar o primeiro valor após o pipe
    text = text.replace(/\{@item\s+([^|]+)\|([^}]+)\}/g, '$1');
    
    // Limpar referências do tipo {@variantrule X|Y} - pegar o primeiro valor após o pipe
    text = text.replace(/\{@variantrule\s+([^|]+)\|([^}]+)\}/g, '$1');
    
    // Limpar referências do tipo {@condition X|Y} - pegar o primeiro valor após o pipe
    text = text.replace(/\{@condition\s+([^|]+)\|([^}]+)\}/g, '$1');
    
    // Limpar referências do tipo {@creature X|Y} - pegar o primeiro valor após o pipe
    text = text.replace(/\{@creature\s+([^|]+)\|([^}]+)\}/g, '$1');
    
    // Limpar referências do tipo {@action X|Y} - pegar o primeiro valor após o pipe
    text = text.replace(/\{@action\s+([^|]+)\|([^}]+)\}/g, '$1');
    
    // Limpar referências do tipo {@damage X} - pegar apenas o valor do dano
    text = text.replace(/\{@damage\s+([^}]+)\}/g, '$1');
    
    // Limpar referências do tipo {@spell X|Y} - pegar o primeiro valor após o pipe
    text = text.replace(/\{@spell\s+([^|]+)\|([^}]+)\}/g, '$1');
    
    // Limpar referências do tipo {@skill X|Y} - pegar o primeiro valor após o pipe
    text = text.replace(/\{@skill\s+([^|]+)\|([^}]+)\}/g, '$1');
    
    // Limpar referências do tipo {@sense X|Y} - pegar o primeiro valor após o pipe
    text = text.replace(/\{@sense\s+([^|]+)\|([^}]+)\}/g, '$1');
    
    // Limpar outras referências do tipo {@X Y|Z|W} - pegar o primeiro valor após o pipe
    text = text.replace(/\{@[^}]+\|([^|}]+)(?:\|[^}]*)?\}/g, '$1');
    
    // Limpar referências simples do tipo {@X Y}
    text = text.replace(/\{@[^}]+\s+([^}]+)\}/g, '$1');
    
    return text;
  }

  private loadFeatsData(): Feat[] {
    try {
      const filePath = join(__dirname, '..', '..', 'data', 'feats', 'feats.json');
      const data = readFileSync(filePath, 'utf8');
      const parsedData: FeatData = JSON.parse(data);
      
      return parsedData.feat || [];
    } catch (error) {
      console.error('Erro ao carregar feats.json:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  // Métodos para buscar dados
  getSpells(): SpellWithClasses[] {
    return this.spells;
  }

  getSpellsByClass(className: string, subclass?: string): SpellWithClasses[] {
    let spells = this.spells.filter(spell => spell.classes.includes(className));
    
    // Para Eldritch Knight e Arcane Trickster, incluir magias de mago
    if ((className.toLowerCase() === 'fighter' && subclass?.toLowerCase().includes('eldritch knight')) ||
        (className.toLowerCase() === 'rogue' && subclass?.toLowerCase().includes('arcane trickster'))) {
      const wizardSpells = this.spells.filter(spell => spell.classes.includes('Wizard'));
      spells = [...spells, ...wizardSpells];
    }
    
    return spells;
  }

  getSpellByName(spellName: string): SpellWithClasses | undefined {
    return this.spells.find(s => s.name.toLowerCase() === spellName.toLowerCase());
  }

  filterSpells(filters: SpellFilters = {}): SpellFilterResult {
    const filteredSpells = this.spells.filter(spell => this.matchesSpellFilters(spell, filters));
    
    return {
      count: filteredSpells.length,
      items: filteredSpells,
      spells: filteredSpells
    };
  }

  private matchesSpellFilters(spell: SpellWithClasses, filters: SpellFilters): boolean {
    if (filters.level !== undefined && spell.level !== filters.level) {
      return false;
    }
    
    if (filters.school && spell.school !== filters.school) {
      return false;
    }
    
    if (filters.class && !spell.classes.includes(filters.class)) {
      return false;
    }
    
    if (filters.source && spell.source !== filters.source) {
      return false;
    }
    
    return true;
  }

  getRaces(): Race[] {
    return this.races;
  }

  getRaceByName(raceName: string): Race | undefined {
    return this.races.find(r => r.name.toLowerCase() === raceName.toLowerCase());
  }

  filterRaces(filters: RaceFilters = {}): RaceFilterResult {
    const filteredRaces = this.races.filter(race => this.matchesRaceFilters(race, filters));
    
    return {
      count: filteredRaces.length,
      items: filteredRaces,
      races: filteredRaces
    };
  }

  private matchesRaceFilters(race: Race, filters: RaceFilters): boolean {
    if (filters.size && race.size !== filters.size) {
      return false;
    }
    
    if (filters.source && race.source !== filters.source) {
      return false;
    }
    
    return true;
  }

  getClasses(): Class[] {
    return Object.values(this.classes).map(classData => ({
      name: classData.name,
      description: classData['description'] || '',
      hitDie: classData['hitDie'] || 6,
      primaryAbility: classData['primaryAbility'] || [],
      savingThrowProficiencies: classData['savingThrowProficiencies'] || [],
      armorProficiencies: classData['armorProficiencies'] || [],
      weaponProficiencies: classData['weaponProficiencies'] || [],
      toolProficiencies: classData['toolProficiencies'] || [],
      skillProficiencies: classData['skillProficiencies'] || { choose: 0, from: [] },
      spellcasting: classData['spellcasting'],
      subclasses: classData.subclasses || [],
      source: classData['source'] || 'PHB'
    }));
  }

  getClassByName(className: string): Class | undefined {
    const key = Object.keys(this.classes).find(
      k => k.toLowerCase() === className.toLowerCase()
    );
    if (!key) {
      return undefined;
    }

    const classData = this.classes[key];
    if (!classData) return undefined;
    return {
      name: classData.name,
      description: classData['description'] || '',
      hitDie: `d${classData['hd']?.faces || 6}`,
      primaryAbility: classData['primaryAbility'] || [],
      savingThrowProficiencies: classData['savingThrowProficiencies'] || [],
      armorProficiencies: classData['armorProficiencies'] || [],
      weaponProficiencies: classData['weaponProficiencies'] || [],
      toolProficiencies: classData['toolProficiencies'] || [],
      skillProficiencies: classData['skillProficiencies'] || { choose: 0, from: [] },
      spellcasting: classData['spellcasting'],
      subclasses: classData.subclasses || [],
      source: classData['source'] || 'PHB'
    };
  }

  getSubclassesByClass(className: string): string[] {
    // Buscar a chave correta ignorando maiúsculas/minúsculas
    const key = Object.keys(this.classes).find(
      k => k.toLowerCase() === className.toLowerCase()
    );
    if (!key) return [];
    const classData = this.classes[key];
    if (!classData) return [];
    if (classData.subclasses) return classData.subclasses;
    if (classData.subclass && Array.isArray(classData.subclass)) {
      return classData.subclass.map((sub: any) => sub.name).filter(Boolean);
    }
    return [];
  }

  getFeats(): Feat[] {
    return this.feats;
  }

  getFeatByName(featName: string): Feat | undefined {
    return this.feats.find(f => f.name.toLowerCase() === featName.toLowerCase());
  }

  filterFeats(filters: FeatFilters = {}): FeatFilterResult {
    const filteredFeats = this.feats.filter(feat => this.matchesFeatFilters(feat, filters));
    
    return {
      count: filteredFeats.length,
      items: filteredFeats,
      feats: filteredFeats
    };
  }

  private matchesFeatFilters(feat: Feat, filters: FeatFilters): boolean {
    if (filters.category && feat.category !== filters.category) {
      return false;
    }
    
    if (filters.source && feat.source !== filters.source) {
      return false;
    }
    
    if (filters.prerequisites && filters.prerequisites.length > 0) {
      const hasPrerequisites = filters.prerequisites.every(prereq => 
        feat.prerequisites?.includes(prereq)
      );
      if (!hasPrerequisites) {
        return false;
      }
    }
    
    return true;
  }

  // Método principal para enriquecer personagem simples
  enrichCharacter(simpleCharacter: SimpleCharacter): FullCharacter {
    const fullCharacter: FullCharacter = { ...simpleCharacter };

    // Enriquecer dados da raça
    if (simpleCharacter.race) {
      fullCharacter.raceData = this.getRaceByName(simpleCharacter.race);
    }

    // Enriquecer dados da classe
    if (simpleCharacter.class) {
      fullCharacter.classData = this.getClassByName(simpleCharacter.class);
      // Adicionar spellSlots
      const classDataRaw = this.classes[simpleCharacter.class];
      if (classDataRaw && Array.isArray(classDataRaw.classTableGroups)) {
        const spellSlotTable = classDataRaw.classTableGroups.find(
          (g: any) => g.title && g.title.toLowerCase().includes('spell slots') && Array.isArray(g.rowsSpellProgression)
        );
        if (spellSlotTable && Array.isArray(spellSlotTable.rowsSpellProgression)) {
          // O nível do personagem é 1-indexado, mas o array é 0-indexado
          const slots = spellSlotTable.rowsSpellProgression[simpleCharacter.level - 1];
          if (slots) {
            fullCharacter.spellSlots = slots;
          }
        }
      }
      
      // Gerar spell slots manuais para Eldritch Knight e Arcane Trickster
      if ((simpleCharacter.class.toLowerCase() === 'fighter' && simpleCharacter.subclass?.toLowerCase().includes('eldritch knight')) ||
          (simpleCharacter.class.toLowerCase() === 'rogue' && simpleCharacter.subclass?.toLowerCase().includes('arcane trickster'))) {
        fullCharacter.spellSlots = this.generateSpellSlotsForThirdCaster(simpleCharacter.level);
      }
    }

    // Enriquecer dados das magias
    if (simpleCharacter.spells && simpleCharacter.spells.length > 0) {
      fullCharacter.spellData = simpleCharacter.spells
        .map(spellName => this.getSpellByName(spellName))
        .filter((spell): spell is SpellWithClasses => spell !== undefined);
    }

    // Enriquecer dados dos feats
    if (simpleCharacter.feats && simpleCharacter.feats.length > 0) {
      fullCharacter.featData = simpleCharacter.feats
        .map(featName => this.getFeatByName(featName))
        .filter((feat): feat is Feat => feat !== undefined);
    }

    return fullCharacter;
  }

  // Método para validar personagem
  validateCharacter(character: SimpleCharacter): {
    valid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Validar nível
    if (character.level < 1 || character.level > 20) {
      issues.push('Nível deve estar entre 1 e 20');
    }

    // Validar classe
    const classData = this.getClassByName(character.class);
    if (!classData) {
      issues.push(`Classe '${character.class}' não é válida`);
    } else {
      // Validar subclasse
      if (character.subclass && !classData.subclasses.includes(character.subclass)) {
        issues.push(`Subclasse '${character.subclass}' não é válida para a classe '${character.class}'`);
        suggestions.push(`Subclasses válidas: ${classData.subclasses.join(', ')}`);
      }
    }

    // Validar raça
    const raceData = this.getRaceByName(character.race);
    if (!raceData) {
      issues.push(`Raça '${character.race}' não é válida`);
    }

    // Validar magias
    if (character.spells) {
      for (const spellName of character.spells) {
        const spell = this.getSpellByName(spellName);
        if (!spell) {
          issues.push(`Magia '${spellName}' não encontrada`);
        } else if (character.class) {
          // Permitir magias de mago para Arcane Trickster e Eldritch Knight
          if (
            (character.class.toLowerCase() === 'rogue' &&
             character.subclass &&
             character.subclass.toLowerCase().includes('arcane trickster') &&
             spell.classes.includes('Wizard')) ||
            (character.class.toLowerCase() === 'fighter' &&
             character.subclass &&
             character.subclass.toLowerCase().includes('eldritch knight') &&
             spell.classes.includes('Wizard'))
          ) {
            // ok
          } else if (!spell.classes.includes(character.class)) {
            issues.push(`Magia '${spellName}' não está disponível para a classe '${character.class}'`);
          }
        }
      }
    }

    // Validar feats
    if (character.feats) {
      for (const featName of character.feats) {
        const feat = this.getFeatByName(featName);
        if (!feat) {
          issues.push(`Feat '${featName}' não encontrado`);
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      suggestions
    };
  }

  // Método para obter sugestões de magias por classe e nível
  getSpellSuggestions(className: string, level: number, count: number = 5, subclass?: string): SpellWithClasses[] {
    const classSpells = this.getSpellsByClass(className, subclass);
    const levelSpells = classSpells.filter(spell => spell.level <= level);
    
    // Ordenar por nível e depois por nome
    levelSpells.sort((a, b) => {
      if (a.level !== b.level) {
        return a.level - b.level;
      }
      return a.name.localeCompare(b.name);
    });

    return levelSpells.slice(0, count);
  }

  // Método para obter sugestões de feats
  getFeatSuggestions(className: string, level: number, count: number = 3): Feat[] {
    const allFeats = this.getFeats();
    
    // Filtrar feats apropriados para o nível
    const appropriateFeats = allFeats.filter(feat => {
      // Lógica simples: feats básicos para níveis baixos
      if (level < 4 && feat.prerequisites && feat.prerequisites.length > 0) {
        return false;
      }
      return true;
    });

    return appropriateFeats.slice(0, count);
  }

  // Método para gerar spell slots para third-casters (Eldritch Knight, Arcane Trickster)
  private generateSpellSlotsForThirdCaster(level: number): number[] {
    // Third-casters ganham spellcasting no nível 3
    if (level < 3) {
      return [0, 0, 0, 0, 0, 0, 0, 0, 0]; // Sem spell slots
    }

    // Calcular caster level (nível da classe / 3)
    const casterLevel = Math.floor(level / 3);
    
    // Spell slots baseados no caster level (usando tabela de Wizard)
    const spellSlots: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0]; // 9 níveis de magia
    
    if (casterLevel >= 1) spellSlots[0] = 2; // 2 spell slots de 1º nível
    if (casterLevel >= 2) spellSlots[1] = 2; // 2 spell slots de 2º nível
    if (casterLevel >= 3) spellSlots[2] = 2; // 2 spell slots de 3º nível
    if (casterLevel >= 4) spellSlots[3] = 2; // 2 spell slots de 4º nível
    if (casterLevel >= 5) spellSlots[4] = 2; // 2 spell slots de 5º nível
    if (casterLevel >= 6) spellSlots[5] = 2; // 2 spell slots de 6º nível
    if (casterLevel >= 7) spellSlots[6] = 2; // 2 spell slots de 7º nível
    if (casterLevel >= 8) spellSlots[7] = 2; // 2 spell slots de 8º nível
    if (casterLevel >= 9) spellSlots[8] = 2; // 2 spell slots de 9º nível
    
    return spellSlots;
  }
} 
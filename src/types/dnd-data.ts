// Tipos para dados de D&D 2024

export interface Spell {
  name: string;
  level: number;
  school: string;
  time: Array<{
    number: number;
    unit: string;
  }>;
  range: {
    type: string;
    distance?: {
      type: string;
      amount: number;
    };
  };
  components: {
    v?: boolean;
    s?: boolean;
    m?: string | {
      text: string;
      cost?: number;
    };
  };
  duration: Array<{
    type: string;
    duration?: {
      type: string;
      amount: number;
    };
    concentration?: boolean;
  }>;
  entries: string[];
  classes: string[];
  source: string;
  page?: number;
}

export interface Feat {
  name: string;
  entries: any[];
  category?: string;
  prerequisites?: string[];
  source: string;
  page?: number;
}

export interface Race {
  name: string;
  description: string;
  size: 'S' | 'M' | 'L';
  speed: number;
  traits: Array<{
    name: string;
    description: string;
  }>;
  source: string;
  page?: number;
}

export interface Class {
  name: string;
  description: string;
  hitDie: string;
  primaryAbility: string[];
  savingThrowProficiencies: string[];
  armorProficiencies: string[];
  weaponProficiencies: string[];
  toolProficiencies: string[];
  skillProficiencies: {
    choose: number;
    from: string[];
  };
  spellcasting?: {
    ability: string;
    progression: 'full' | 'half' | 'third';
  };
  subclasses: string[];
  source: string;
  page?: number;
}

export interface SpellProgression {
  level: number;
  cantrips: number;
  spells: number[];
  spellSlots: number[][];
}

export interface Subclass {
  name: string;
  description: string;
  class: string;
  features: string[];
  source: string;
  page?: number;
}

// Tipos para filtros
export interface SpellFilters {
  level?: number;
  school?: string;
  class?: string;
  source?: string;
}

export interface FeatFilters {
  category?: string;
  prerequisites?: string[];
  source?: string;
}

export interface RaceFilters {
  size?: 'S' | 'M' | 'L';
  source?: string;
}

export interface ClassFilters {
  spellcasting?: boolean;
  source?: string;
}

// Tipos para resultados de filtros
export interface FilterResult<T> {
  count: number;
  items: T[];
}

export interface SpellFilterResult extends FilterResult<Spell> {
  spells: Spell[];
}

export interface FeatFilterResult extends FilterResult<Feat> {
  feats: Feat[];
}

export interface RaceFilterResult extends FilterResult<Race> {
  races: Race[];
}

// Tipos para respostas da API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Tipos para personagem simplificado do GPT
export interface SimpleCharacter {
  race: string;
  feats: string[];
  level: number;
  class: string;
  subclass: string;
  spells: string[];
  background?: string;
  personality?: string;
  equipment?: Array<{
    name: string;
    mechanicalDescription: string;
    visualDescription: string;
  }>;
  abilities?: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  armorClass?: number;
  whyStrong?: string;
  howToPlay?: string;
  abilityScoreOperations?: AbilityScoreOperations;
  maxHitPoints?: number;
  currentHitPoints?: number;
}

// Tipos para operações de atributos
export interface AbilityScoreOperations {
  originalRolls: number[];
  finalScores: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  operations: string[];
}

// Tipos para personagem completo
export interface FullCharacter extends SimpleCharacter {
  raceData?: Race | undefined;
  classData?: Class | undefined;
  spellData?: Spell[];
  featData?: Feat[];
  spellSlots?: number[];
  abilityScoreOperations?: AbilityScoreOperations;
  // Outros dados enriquecidos
} 
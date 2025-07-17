// character.d.ts - Tipos para o frontend

export interface CharacterModel {
  name?: string;
  race: string;
  class: string;
  subclass: string;
  level: number;
  attributes: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  spells: {
    cantrips: string[];
    level1: string[];
    level2: string[];
    level3: string[];
    [key: string]: string[]; // Para suportar outros níveis
  };
  equipment: string[];
  proficiencies: string[];
  features: string[];
  background?: string;
  personality?: string;
}

export interface GenerateCharacterParams {
  level: number;
  class: string;
  subclass?: string;
  race?: string;
  powerLevel?: string;
  includeHistory?: boolean;
  includePersonality?: boolean;
  context?: string;
}

// Tipos para as respostas da API
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  details?: string;
}

export interface CharacterGenerationResponse extends ApiResponse<CharacterModel> {} 
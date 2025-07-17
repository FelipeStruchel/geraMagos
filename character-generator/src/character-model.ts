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

export const CharacterModelSchema = {
  name: 'character',
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      race: { type: 'string' },
      class: { type: 'string' },
      subclass: { type: 'string' },
      level: { type: 'number' },
      attributes: {
        type: 'object',
        properties: {
          strength: { type: 'number' },
          dexterity: { type: 'number' },
          constitution: { type: 'number' },
          intelligence: { type: 'number' },
          wisdom: { type: 'number' },
          charisma: { type: 'number' }
        },
        required: [
          'strength',
          'dexterity',
          'constitution',
          'intelligence',
          'wisdom',
          'charisma'
        ]
      },
      spells: {
        type: 'object',
        patternProperties: {
          '^.*$': {
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: ['cantrips', 'level1', 'level2', 'level3']
      },
      equipment: {
        type: 'array',
        items: { type: 'string' }
      },
      proficiencies: {
        type: 'array',
        items: { type: 'string' }
      },
      features: {
        type: 'array',
        items: { type: 'string' }
      },
      background: { type: 'string' },
      personality: { type: 'string' }
    },
    required: [
      'race',
      'class',
      'subclass',
      'level',
      'attributes',
      'spells',
      'equipment',
      'proficiencies',
      'features'
    ]
  }
}; 
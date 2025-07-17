import { PDFDocument, PDFForm } from 'pdf-lib';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { CharacterModel } from '../character-model.js';

export class PDFGenerator {
  private templatePath: string;

  constructor() {
    this.templatePath = join(process.cwd(), 'public', 'DnD_2024_Character-Sheet - fillable.pdf');
  }

  async generateCharacterSheet(character: CharacterModel): Promise<Uint8Array> {
    try {
      // Carregar o template PDF
      const templateBytes = readFileSync(this.templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes);
      
      // Obter o formulário do PDF
      const form = pdfDoc.getForm();
      
      // Preencher os campos básicos
      this.fillBasicInfo(form, character);
      
      // Preencher atributos
      this.fillAttributes(form, character);
      
      // Preencher magias
      this.fillSpells(form, character);
      
      // Preencher equipamento
      this.fillEquipment(form, character);
      
      // Preencher proficiências
      this.fillProficiencies(form, character);
      
      // Preencher características
      this.fillFeatures(form, character);
      
      // Preencher história e personalidade (se disponível)
      if (character.background) {
        this.fillBackground(form, character.background);
      }
      
      if (character.personality) {
        this.fillPersonality(form, character.personality);
      }
      
      // Salvar o PDF preenchido
      return await pdfDoc.save();
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      throw new Error(`Falha na geração do PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private fillBasicInfo(form: PDFForm, character: CharacterModel) {
    // Campos básicos do personagem
    this.setFieldValue(form, 'Character Name', character.name || 'Personagem Sem Nome');
    this.setFieldValue(form, 'Class & Level', `${character.class} ${character.level}`);
    this.setFieldValue(form, 'Background', 'Aventureiro'); // Valor padrão
    this.setFieldValue(form, 'Race', character.race);
    this.setFieldValue(form, 'Subclass', character.subclass);
    
    // Informações do jogador (deixar em branco para preenchimento manual)
    this.setFieldValue(form, 'Player Name', '');
    this.setFieldValue(form, 'Experience Points', character.level.toString());
  }

  private fillAttributes(form: PDFForm, character: CharacterModel) {
    // Preencher valores dos atributos
    this.setFieldValue(form, 'Strength', character.attributes.strength.toString());
    this.setFieldValue(form, 'Dexterity', character.attributes.dexterity.toString());
    this.setFieldValue(form, 'Constitution', character.attributes.constitution.toString());
    this.setFieldValue(form, 'Intelligence', character.attributes.intelligence.toString());
    this.setFieldValue(form, 'Wisdom', character.attributes.wisdom.toString());
    this.setFieldValue(form, 'Charisma', character.attributes.charisma.toString());
    
    // Calcular modificadores (regra D&D: (valor - 10) / 2, arredondado para baixo)
    this.setFieldValue(form, 'Strength Modifier', this.calculateModifier(character.attributes.strength));
    this.setFieldValue(form, 'Dexterity Modifier', this.calculateModifier(character.attributes.dexterity));
    this.setFieldValue(form, 'Constitution Modifier', this.calculateModifier(character.attributes.constitution));
    this.setFieldValue(form, 'Intelligence Modifier', this.calculateModifier(character.attributes.intelligence));
    this.setFieldValue(form, 'Wisdom Modifier', this.calculateModifier(character.attributes.wisdom));
    this.setFieldValue(form, 'Charisma Modifier', this.calculateModifier(character.attributes.charisma));
  }

  private fillSpells(form: PDFForm, character: CharacterModel) {
    // Preencher cantrips
    const cantrips = character.spells.cantrips || [];
    for (let i = 0; i < Math.min(cantrips.length, 8); i++) {
      const spell = cantrips[i];
      if (spell) {
        this.setFieldValue(form, `Cantrip ${i + 1}`, spell);
      }
    }
    
    // Preencher magias de 1º nível
    const level1Spells = character.spells.level1 || [];
    for (let i = 0; i < Math.min(level1Spells.length, 12); i++) {
      const spell = level1Spells[i];
      if (spell) {
        this.setFieldValue(form, `1st Level Spell ${i + 1}`, spell);
      }
    }
    
    // Preencher magias de 2º nível
    const level2Spells = character.spells.level2 || [];
    for (let i = 0; i < Math.min(level2Spells.length, 12); i++) {
      const spell = level2Spells[i];
      if (spell) {
        this.setFieldValue(form, `2nd Level Spell ${i + 1}`, spell);
      }
    }
    
    // Preencher magias de 3º nível
    const level3Spells = character.spells.level3 || [];
    for (let i = 0; i < Math.min(level3Spells.length, 12); i++) {
      const spell = level3Spells[i];
      if (spell) {
        this.setFieldValue(form, `3rd Level Spell ${i + 1}`, spell);
      }
    }
  }

  private fillEquipment(form: PDFForm, character: CharacterModel) {
    const equipment = character.equipment || [];
    for (let i = 0; i < Math.min(equipment.length, 20); i++) {
      const item = equipment[i];
      if (item) {
        this.setFieldValue(form, `Equipment ${i + 1}`, item);
      }
    }
  }

  private fillProficiencies(form: PDFForm, character: CharacterModel) {
    const proficiencies = character.proficiencies || [];
    for (let i = 0; i < Math.min(proficiencies.length, 15); i++) {
      const prof = proficiencies[i];
      if (prof) {
        this.setFieldValue(form, `Proficiency ${i + 1}`, prof);
      }
    }
  }

  private fillFeatures(form: PDFForm, character: CharacterModel) {
    const features = character.features || [];
    for (let i = 0; i < Math.min(features.length, 10); i++) {
      const feature = features[i];
      if (feature) {
        this.setFieldValue(form, `Feature ${i + 1}`, feature);
      }
    }
  }

  private fillBackground(form: PDFForm, background: string) {
    this.setFieldValue(form, 'Background Story', background);
  }

  private fillPersonality(form: PDFForm, personality: string) {
    this.setFieldValue(form, 'Personality Traits', personality);
  }

  private setFieldValue(form: PDFForm, fieldName: string, value: string) {
    try {
      const field = form.getTextField(fieldName);
      if (field) {
        field.setText(value);
      }
    } catch (error) {
      // Campo não encontrado, ignorar silenciosamente
      console.debug(`Campo não encontrado: ${fieldName}`);
    }
  }

  private calculateModifier(attribute: number): string {
    const modifier = Math.floor((attribute - 10) / 2);
    return modifier >= 0 ? `+${modifier}` : `${modifier}`;
  }
}

// Utilitário para listar campos do PDF
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const { PDFDocument } = await import('pdf-lib');
    const { readFileSync } = await import('fs');
    const { join } = await import('path');
    const templatePath = join(process.cwd(), 'public', 'DnD_2024_Character-Sheet - fillable.pdf');
    const templateBytes = readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    console.log('Campos do formulário PDF:');
    fields.forEach(field => {
      console.log('-', field.getName());
    });
  })();
} 
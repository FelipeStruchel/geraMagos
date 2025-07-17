import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import type { FullCharacter } from '../types/dnd-data.js';

export class HTMLPDFGenerator {
    private template: HandlebarsTemplateDelegate;

    constructor() {
        this.template = null as any;
        this.loadTemplate();
    }

    private async loadTemplate() {
        try {
            const templatePath = path.join(process.cwd(), 'templates', 'characterSheet.html');
            const templateContent = await fs.readFile(templatePath, 'utf-8');
            this.template = Handlebars.compile(templateContent);
        } catch (error) {
            console.error('Erro ao carregar template:', error);
        }
    }

    private calculateModifier(stat: number): string {
        const modifier = Math.floor((stat - 10) / 2);
        return modifier >= 0 ? `+${modifier}` : `${modifier}`;
    }

    private calculateHP(level: number, hitDie: string, constitution: number): number {
        if (!level || !hitDie || !constitution) return 8;
        
        // Extrair o número do dado (ex: "d6" -> 6)
        const dieSize = parseInt(hitDie.replace('d', ''));
        if (isNaN(dieSize)) return 8;
        
        // Calcular modificador de Constituição
        const conModifier = Math.floor((constitution - 10) / 2);
        
        // HP do primeiro nível: máximo do dado + modificador de CON
        let totalHP = dieSize + conModifier;
        
        // HP dos níveis seguintes: rolar o dado + modificador de CON
        for (let i = 2; i <= level; i++) {
            const roll = Math.floor(Math.random() * dieSize) + 1;
            totalHP += roll + conModifier;
        }
        
        return totalHP;
    }

    private groupSpellsByLevel(spellData: any[]): { level: number, levelLabel: string, spells: any[] }[] {
        if (!spellData || !Array.isArray(spellData)) return [];
        const levelLabels = [
            'Truques', '1º nível', '2º nível', '3º nível', '4º nível', '5º nível', '6º nível', '7º nível', '8º nível', '9º nível'
        ];
        const grouped: Record<number, any[]> = {};
        for (const spell of spellData) {
            const lvl = spell.level || 0;
            if (!grouped[lvl]) grouped[lvl] = [];
            grouped[lvl].push(spell);
        }
        return Object.keys(grouped).sort((a, b) => Number(a) - Number(b)).map(lvl => ({
            level: Number(lvl),
            levelLabel: levelLabels[Number(lvl)] || `${lvl}º nível`,
            spells: grouped[Number(lvl)] || []
        }));
    }

    private formatSpell(spell: any) {
        return {
            ...spell,
            castingTime: this.formatCastingTime(spell.time),
            range: this.formatRange(spell.range),
            duration: this.formatDuration(spell.duration),
            school: this.formatSpellSchool(spell.school),
            description: this.extractFullDescription(spell.entries)
        };
    }

    private formatCastingTime(time: any): string {
        if (!time) return 'N/A';
        if (Array.isArray(time)) {
            const timeObj = time[0];
            if (timeObj.number && timeObj.unit) {
                let unit = timeObj.unit;
                if (unit === 'bonus') unit = 'ação bônus';
                if (unit === 'reaction') unit = 'reação';
                if (unit === 'action') unit = 'ação';
                return `${timeObj.number} ${unit}${timeObj.number > 1 ? 's' : ''}`;
            }
        }
        return JSON.stringify(time);
    }

    private formatRange(range: any): string {
        if (!range) return 'N/A';
        if (typeof range === 'string') return range;
        if (range.type === 'self') return 'Você mesmo';
        if (range.type === 'touch') return 'Toque';
        if (range.distance) {
            if (range.distance.type === 'feet') return `${range.distance.amount} pés`;
            if (range.distance.type === 'miles') return `${range.distance.amount} milha${range.distance.amount > 1 ? 's' : ''}`;
            if (range.distance.type === 'touch') return 'Toque';
            if (range.distance.type === 'self') return 'Você mesmo';
        }
        if (range.type === 'sphere' && range.distance) {
            return `Esfera de ${range.distance.amount} ${range.distance.type}`;
        }
        if (range.type === 'radius' && range.distance) {
            if (range.distance.type === 'feet') return `Raio de ${range.distance.amount} pés`;
            if (range.distance.type === 'miles') return `Raio de ${range.distance.amount} milha${range.distance.amount > 1 ? 's' : ''}`;
            return `Raio de ${range.distance.amount} ${range.distance.type}`;
        }
        return JSON.stringify(range);
    }

    private formatDuration(duration: any): string {
        if (!duration) return 'N/A';
        if (Array.isArray(duration)) {
            const durationObj = duration[0];
            if (durationObj.type === 'instant') return 'Instantânea';
            if (durationObj.type === 'timed' && durationObj.duration) {
                const amount = durationObj.duration.amount;
                const unit = durationObj.duration.type;
                let unitText = '';
                switch (unit) {
                    case 'round': unitText = 'rodada'; break;
                    case 'minute': unitText = 'minuto'; break;
                    case 'hour': unitText = 'hora'; break;
                    case 'day': unitText = 'dia'; break;
                    default: unitText = unit;
                }
                let text = `${amount} ${unitText}${amount > 1 ? 's' : ''}`;
                if (durationObj.concentration) text += ' (Concentração)';
                return text;
            }
        }
        return JSON.stringify(duration);
    }

    private formatSpellSchool(school: string): string {
        const schoolMap: Record<string, string> = {
            'A': 'Abjuração',
            'C': 'Conjuração',
            'D': 'Divinação',
            'E': 'Encantamento',
            'V': 'Evocação',
            'I': 'Ilusão',
            'N': 'Necromancia',
            'T': 'Transmutação'
        };
        return schoolMap[school] || school || 'N/A';
    }

    private extractFullDescription(entries: any): string {
        if (!entries || !Array.isArray(entries)) return '';
        let result = '';
        for (const entry of entries) {
            if (typeof entry === 'string') {
                result += entry + '\n';
            } else if (entry.type === 'list' && Array.isArray(entry.items)) {
                for (const item of entry.items) {
                    if (typeof item === 'string') {
                        result += '• ' + item + '\n';
                    } else if (item.entries) {
                        result += this.extractFullDescription(item.entries);
                    }
                }
            } else if (entry.entries) {
                result += this.extractFullDescription(entry.entries);
            }
        }
        return result.trim();
    }

    private formatPrimaryAbilities(primaryAbilities: any): string {
        if (!primaryAbilities || !Array.isArray(primaryAbilities)) return 'N/A';
        const abilityMap: Record<string, string> = {
            'str': 'Força',
            'dex': 'Destreza',
            'con': 'Constituição',
            'int': 'Inteligência',
            'wis': 'Sabedoria',
            'cha': 'Carisma'
        };
        const abilityNames: string[] = [];
        for (const ability of primaryAbilities) {
            if (typeof ability === 'object' && ability !== null) {
                const keys = Object.keys(ability);
                for (const key of keys) {
                    const abilityName = abilityMap[key.toLowerCase()] || key;
                    abilityNames.push(abilityName);
                }
            } else if (typeof ability === 'string') {
                const abilityName = abilityMap[ability.toLowerCase()] || ability;
                abilityNames.push(abilityName);
            }
        }
        return abilityNames.length > 0 ? abilityNames.join(', ') : 'N/A';
    }

    private formatCharacterData(character: FullCharacter) {
        const spellData = (character.spells || []).map((spell: any) => this.formatSpell(spell));
        const spellsByLevel = this.groupSpellsByLevel(spellData);
        const classPrimaryAbility = character.classData && character.classData.primaryAbility
            ? this.formatPrimaryAbilities(character.classData.primaryAbility)
            : '';
        const maxHitPoints = character['maxHitPoints'];
        const currentHitPoints = character['currentHitPoints'] !== undefined ? character['currentHitPoints'] : maxHitPoints;
        return {
            characterName: 'Personagem Sem Nome',
            race: character.race,
            class: character.class,
            subclass: character.subclass,
            level: character.level,
            
            // Atributos
            strength: character.abilities?.strength || 10,
            strengthModifier: this.calculateModifier(character.abilities?.strength || 10),
            dexterity: character.abilities?.dexterity || 10,
            dexterityModifier: this.calculateModifier(character.abilities?.dexterity || 10),
            constitution: character.abilities?.constitution || 10,
            constitutionModifier: this.calculateModifier(character.abilities?.constitution || 10),
            intelligence: character.abilities?.intelligence || 10,
            intelligenceModifier: this.calculateModifier(character.abilities?.intelligence || 10),
            wisdom: character.abilities?.wisdom || 10,
            wisdomModifier: this.calculateModifier(character.abilities?.wisdom || 10),
            charisma: character.abilities?.charisma || 10,
            charismaModifier: this.calculateModifier(character.abilities?.charisma || 10),
            
            // Combate
            armorClass: character.armorClass || 10,
            initiative: this.calculateModifier(character.abilities?.dexterity || 10),
            speed: 30,
            maxHitPoints,
            currentHitPoints,
            proficiencyBonus: Math.floor((character.level - 1) / 4) + 2,
            
            // Magias
            spellLevels: spellsByLevel,
            spellSlots: character.spellSlots || [],
            
            // Feats
            features: character.feats?.map(feat => ({
                name: feat,
                description: feat
            })) || [],
            
            // Equipamento
            equipment: character.equipment?.map(item => {
                if (typeof item === 'string') {
                    return { name: item };
                } else {
                    return {
                        name: item.name || 'Item sem nome',
                        mechanicalDescription: item.mechanicalDescription,
                        visualDescription: item.visualDescription
                    };
                }
            }) || [],
            
            // Campos adicionais
            whyStrong: character.whyStrong,
            howToPlay: character.howToPlay,
            background: character.background,
            personality: character.personality,
            raceData: character.raceData,
            classData: character.classData,
            abilityScoreOperations: character.abilityScoreOperations,
            spellData,
            classPrimaryAbility,
        };
    }

    public async generatePDF(character: FullCharacter): Promise<Buffer> {
        if (!this.template) {
            await this.loadTemplate();
        }

        const data = this.formatCharacterData(character);
        const html = this.template(data);

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        try {
            const page = await browser.newPage();
            
            // Configurar viewport para A4
            await page.setViewport({
                width: 794, // A4 width in pixels at 96 DPI
                height: 1123, // A4 height in pixels at 96 DPI
                deviceScaleFactor: 2 // Para melhor qualidade
            });

            // Definir conteúdo HTML
            await page.setContent(html, {
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            // Aguardar um pouco para garantir que tudo foi renderizado
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Gerar PDF
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '10mm',
                    right: '10mm',
                    bottom: '10mm',
                    left: '10mm'
                }
            });

            return Buffer.from(pdfBuffer);
        } finally {
            await browser.close();
        }
    }

    public async generatePDFFromHTML(html: string): Promise<Buffer> {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        try {
            const page = await browser.newPage();
            
            await page.setViewport({
                width: 794,
                height: 1123,
                deviceScaleFactor: 2
            });

            await page.setContent(html, {
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            await new Promise(resolve => setTimeout(resolve, 1000));

            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '10mm',
                    right: '10mm',
                    bottom: '10mm',
                    left: '10mm'
                }
            });

            return Buffer.from(pdfBuffer);
        } finally {
            await browser.close();
        }
    }
} 
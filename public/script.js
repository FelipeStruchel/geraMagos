// ===== CONFIGURAÇÕES E CONSTANTES =====
const API_BASE_URL = "";

// ===== ESTADO DA APLICAÇÃO =====
class AppState {
    constructor() {
        this.currentCharacter = null;
        this.isLoading = false;
        this.theme = localStorage.getItem('theme') || 'light';
        this.formData = {
            level: 1,
            class: '',
            subclass: '',
            race: '',
            powerLevel: 'medium',
            includeHistory: false,
            includePersonality: false,
            spellcastersOnly: false,
            context: ''
        };
    }

    setTheme(theme) {
        this.theme = theme;
        localStorage.setItem('theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    }

    updateFormData(data) {
        this.formData = { ...this.formData, ...data };
    }
}

// ===== GERENCIADOR DE COMPONENTES =====
class ComponentManager {
    constructor() {
        this.components = new Map();
    }

    register(name, component) {
        this.components.set(name, component);
    }

    get(name) {
        return this.components.get(name);
    }

    render(name, data) {
        const component = this.get(name);
        if (component && component.render) {
            return component.render(data);
        }
        return '';
    }
}

// ===== COMPONENTES =====
class ThemeToggle {
    constructor() {
        this.lightIcon = document.getElementById('lightIcon');
        this.darkIcon = document.getElementById('darkIcon');
        this.button = document.getElementById('themeToggle');
    }

    init() {
        this.updateIcons();
        this.button.addEventListener('click', () => this.toggle());
    }

    updateIcons() {
        const isDark = appState.theme === 'dark';
        this.lightIcon.style.display = isDark ? 'none' : 'inline';
        this.darkIcon.style.display = isDark ? 'inline' : 'none';
    }

    toggle() {
        const newTheme = appState.theme === 'light' ? 'dark' : 'light';
        appState.setTheme(newTheme);
        this.updateIcons();
    }
}

class FormManager {
    constructor() {
        this.form = document.getElementById('characterForm');
        this.classSelect = document.getElementById('characterClass');
        this.subclassSelect = document.getElementById('subclass');
        this.raceSelect = document.getElementById('race');
        this.levelInput = document.getElementById('level');
        this.powerLevelSelect = document.getElementById('powerLevel');
        this.includeHistoryCheckbox = document.getElementById('includeHistory');
        this.includePersonalityCheckbox = document.getElementById('includePersonality');
        this.spellcastersOnlyCheckbox = document.getElementById('spellcastersOnly');
        this.contextTextarea = document.getElementById('context');
        this.generateBtn = document.getElementById('generateBtn');
    }

    init() {
        this.setupEventListeners();
        this.loadInitialData();
    }

    setupEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.classSelect.addEventListener('change', () => this.handleClassChange());
        this.levelInput.addEventListener('change', () => this.handleLevelChange());
        
        // Real-time form updates
        this.form.addEventListener('input', (e) => this.handleFormInput(e));
        this.form.addEventListener('change', (e) => this.handleFormChange(e));
    }

    async loadInitialData() {
        try {
            await this.populateClassSelect();
            await this.populateRaceSelect();
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
            this.showError('Erro ao carregar dados iniciais. Verifique se o servidor está rodando.');
        }
    }

    async populateClassSelect() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/data/classes`);
            
            if (!response.ok) {
                throw new Error(`Erro ao carregar classes: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Erro desconhecido ao carregar classes');
            }
            
            const classes = data.data || [];
            
            this.classSelect.innerHTML = '<option value="">Selecione uma classe</option>';
            
            if (classes.length === 0) {
                throw new Error('Nenhuma classe encontrada na API');
            }
            
            classes.forEach(classData => {
                const option = document.createElement('option');
                option.value = classData.name;
                option.textContent = classData.name;
                this.classSelect.appendChild(option);
            });
            
        } catch (error) {
            console.error('Erro ao carregar classes da API:', error);
            this.showError('Erro ao carregar classes. Verifique se o servidor está rodando.');
        }
    }

    async populateRaceSelect() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/data/races`);
            
            if (!response.ok) {
                throw new Error(`Erro ao carregar raças: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Erro desconhecido ao carregar raças');
            }
            
            const races = data.data || [];
            
            this.raceSelect.innerHTML = '<option value="">Selecione uma raça</option>';
            
            if (races.length === 0) {
                this.raceSelect.innerHTML = '<option value="">Nenhuma raça disponível</option>';
                this.raceSelect.disabled = true;
                this.showError('Nenhuma raça foi encontrada na base de dados.');
                return;
            } else {
                this.raceSelect.disabled = false;
            }
            
            races.forEach(raceData => {
                const option = document.createElement('option');
                option.value = raceData.name;
                option.textContent = raceData.name;
                this.raceSelect.appendChild(option);
            });
            
        } catch (error) {
            console.error('Erro ao carregar raças da API:', error);
            this.raceSelect.innerHTML = '<option value="">Erro ao carregar raças</option>';
            this.raceSelect.disabled = true;
            this.showError('Erro ao carregar raças. Verifique se o servidor está rodando.');
        }
    }

    populateSelect(select, items) {
        select.innerHTML = '<option value="">Selecione uma opção</option>';
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            option.textContent = item;
            select.appendChild(option);
        });
    }

    async handleClassChange() {
        const selectedClass = this.classSelect.value;
        
        if (!selectedClass) {
            this.subclassSelect.innerHTML = '<option value="">Selecione uma subclasse</option>';
            // Reabilitar checkbox de spellcasters quando nenhuma classe está selecionada
            this.spellcastersOnlyCheckbox.disabled = false;
            return;
        }
        
        // Desabilitar checkbox de spellcasters quando uma classe é selecionada
        this.spellcastersOnlyCheckbox.disabled = true;
        this.spellcastersOnlyCheckbox.checked = false;
        
        // Carregar subclasses da API
        await this.populateSubclassSelect(selectedClass);
        
        // Atualizar estado
        appState.updateFormData({ class: selectedClass, subclass: '', spellcastersOnly: false });
    }

    async populateSubclassSelect(className) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/data/classes/${encodeURIComponent(className)}/subclasses`);
            
            if (!response.ok) {
                throw new Error(`Erro ao carregar subclasses: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Erro desconhecido ao carregar subclasses');
            }
            
            const subclasses = data.data || [];
            
            this.subclassSelect.innerHTML = '<option value="">Selecione uma subclasse</option>';
            
            if (subclasses.length === 0) {
                this.subclassSelect.innerHTML = '<option value="">Nenhuma subclasse disponível</option>';
                this.subclassSelect.disabled = true;
            } else {
                this.subclassSelect.disabled = false;
                subclasses.forEach(subclass => {
                    const option = document.createElement('option');
                    option.value = subclass;
                    option.textContent = subclass;
                    this.subclassSelect.appendChild(option);
                });
            }
            
        } catch (error) {
            console.error('Erro ao carregar subclasses da API:', error);
            this.subclassSelect.innerHTML = '<option value="">Erro ao carregar subclasses</option>';
            this.subclassSelect.disabled = true;
            this.showError(`Erro ao carregar subclasses: ${error.message}`);
        }
    }

    handleLevelChange() {
        const level = parseInt(this.levelInput.value);
        
        // Validação de nível (D&D 2024 vai até nível 20)
        if (level < 1 || level > 20) {
            this.showError('Nível deve estar entre 1 e 20.');
            this.levelInput.value = Math.max(1, Math.min(20, level));
            return;
        }
        
        const selectedSubclass = this.subclassSelect.value;
        
        // Validar subclasses tardias
        if (level < 3 && ['Cavaleiro Arcano', 'Trapaceiro Arcano'].includes(selectedSubclass)) {
            this.showError('Esta subclasse requer nível mínimo 3.');
            this.subclassSelect.value = '';
        }
        
        appState.updateFormData({ level });
    }

    handleFormInput(e) {
        const { name, value, type, checked } = e.target;
        const fieldValue = type === 'checkbox' ? checked : value;
        
        // Validação especial para nível
        if (name === 'level') {
            const level = parseInt(value);
            if (level < 1 || level > 20) {
                this.levelInput.classList.add('error');
                return;
            } else {
                this.levelInput.classList.remove('error');
            }
        }
        
        appState.updateFormData({ [name]: fieldValue });
    }

    handleFormChange(e) {
        const { name, value, type, checked } = e.target;
        const fieldValue = type === 'checkbox' ? checked : value;
        
        appState.updateFormData({ [name]: fieldValue });
    }

    async handleSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(this.form);
        const level = parseInt(formData.get('level'));
        const characterClass = formData.get('characterClass');
        
        // Validações antes do envio
        if (level < 1 || level > 20) {
            this.showError('Nível deve estar entre 1 e 20.');
            return;
        }
        
        const characterData = {
            level,
            class: characterClass,
            subclass: formData.get('subclass') || '',
            race: formData.get('race') || '',
            powerLevel: formData.get('powerLevel'),
            includeHistory: formData.get('includeHistory') === 'on',
            includePersonality: formData.get('includePersonality') === 'on',
            spellcastersOnly: formData.get('spellcastersOnly') === 'on',
            context: formData.get('context') || ''
        };
        
        await characterService.generateCharacter(characterData);
    }

    showError(message) {
        errorModal.show(message);
    }

    setLoading(loading) {
        this.generateBtn.disabled = loading;
        if (loading) {
            this.generateBtn.innerHTML = '<div class="loading"></div> Gerando...';
        } else {
            this.generateBtn.innerHTML = '<i class="fas fa-magic"></i> Gerar Personagem';
        }
    }
}

class CharacterDisplay {
    constructor() {
        this.resultsSection = document.getElementById('resultsSection');
        this.characterCard = document.getElementById('characterCard');
    }

    show(character) {
        this.characterCard.innerHTML = this.renderCharacter(character);
        this.resultsSection.classList.remove('hidden');
        this.resultsSection.scrollIntoView({ behavior: 'smooth' });
        
        // Adicionar animação
        this.resultsSection.classList.add('fade-in');
    }

    hide() {
        this.resultsSection.classList.add('hidden');
        this.resultsSection.classList.remove('fade-in');
    }

    // Funções auxiliares para formatar dados das magias
    formatSpellLevel(level) {
        if (level === 0) return 'Truque';
        if (level === 1) return '1º nível';
        if (level === 2) return '2º nível';
        if (level === 3) return '3º nível';
        if (level === 4) return '4º nível';
        if (level === 5) return '5º nível';
        if (level === 6) return '6º nível';
        if (level === 7) return '7º nível';
        if (level === 8) return '8º nível';
        if (level === 9) return '9º nível';
        return level || 'N/A';
    }

    formatSpellSchool(school) {
        const schoolMap = {
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

    formatCastingTime(time) {
        if (!time) return 'N/A';
        if (Array.isArray(time)) {
            const timeObj = time[0];
            if (timeObj.number && timeObj.unit) {
                let unit = timeObj.unit;
                if (unit === 'bonus') {
                    unit = 'bonus action';
                }
                return `${timeObj.number} ${unit}${timeObj.number > 1 ? 's' : ''}`;
            }
        }
        return JSON.stringify(time);
    }

    formatRange(range) {
        if (!range) return 'N/A';
        if (typeof range === 'string') return range;
        if (range.type === 'self') return 'Você mesmo';
        if (range.type === 'touch') return 'Toque';
        if (range.distance) {
            if (range.distance.type === 'feet') {
                return `${range.distance.amount} pés`;
            }
            if (range.distance.type === 'miles') {
                return `${range.distance.amount} milha${range.distance.amount > 1 ? 's' : ''}`;
            }
            if (range.distance.type === 'touch') {
                return 'Toque';
            }
            if (range.distance.type === 'self') {
                return 'Você mesmo';
            }
        }
        if (range.type === 'sphere' && range.distance) {
            return `Esfera de ${range.distance.amount} ${range.distance.type}`;
        }
        if (range.type === 'radius' && range.distance) {
            if (range.distance.type === 'feet') {
                return `Raio de ${range.distance.amount} pés`;
            }
            if (range.distance.type === 'miles') {
                return `Raio de ${range.distance.amount} milha${range.distance.amount > 1 ? 's' : ''}`;
            }
            return `Raio de ${range.distance.amount} ${range.distance.type}`;
        }
        return JSON.stringify(range);
    }

    formatDuration(duration) {
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
                if (durationObj.concentration) {
                    text += ' (Concentração)';
                }
                return text;
            }
        }
        return JSON.stringify(duration);
    }

    cleanReferences(text) {
        if (!text || typeof text !== 'string') {
            // Se não for string, tentar converter ou retornar string vazia
            if (typeof text === 'object' && text !== null) {
                return '[Objeto complexo]';
            }
            return text || '';
        }
        
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
        
        // Limpar outras referências do tipo {@X Y|Z|W} - pegar o primeiro valor após o pipe
        text = text.replace(/\{@[^}]+\|([^|}]+)(?:\|[^}]*)?\}/g, '$1');
        
        // Limpar referências simples do tipo {@X Y}
        text = text.replace(/\{@[^}]+\s+([^}]+)\}/g, '$1');
        
        return text;
    }

    extractFullDescription(entries) {
        if (!entries || !Array.isArray(entries)) return '';
        let result = '';
        for (const entry of entries) {
            if (typeof entry === 'string') {
                result += this.cleanReferences(entry) + '\n';
            } else if (entry.type === 'list' && Array.isArray(entry.items)) {
                for (const item of entry.items) {
                    if (typeof item === 'string') {
                        result += '• ' + this.cleanReferences(item) + '\n';
                    } else if (item.entries) {
                        result += this.extractFullDescription(item.entries);
                    }
                }
            } else if (entry.type === 'entries' && Array.isArray(entry.entries)) {
                result += this.extractFullDescription(entry.entries);
            } else if (entry.entries) {
                result += this.extractFullDescription(entry.entries);
            } else if (entry.name && entry.entry) {
                // Para objetos com nome e entrada
                result += `**${entry.name}:** ${this.cleanReferences(entry.entry)}\n`;
            } else if (entry.name && entry.entries) {
                // Para objetos com nome e entradas aninhadas
                result += `**${entry.name}:**\n`;
                result += this.extractFullDescription(entry.entries);
            } else if (typeof entry === 'object' && entry !== null) {
                // Para outros objetos, tentar extrair informações úteis
                if (entry.text) {
                    result += this.cleanReferences(entry.text) + '\n';
                } else if (entry.name) {
                    result += `**${entry.name}**\n`;
                } else {
                    // Se não conseguir extrair nada útil, pular o objeto
                    continue;
                }
            }
        }
        return result.trim();
    }

    formatPrimaryAbilities(primaryAbilities) {
        if (!primaryAbilities || !Array.isArray(primaryAbilities)) return 'N/A';
        
        const abilityNames = [];
        for (const ability of primaryAbilities) {
            if (typeof ability === 'object' && ability !== null) {
                // Extrair as chaves do objeto (str, dex, con, int, wis, cha)
                const keys = Object.keys(ability);
                for (const key of keys) {
                    const abilityName = this.getAbilityName(key);
                    if (abilityName) {
                        abilityNames.push(abilityName);
                    }
                }
            } else if (typeof ability === 'string') {
                const abilityName = this.getAbilityName(ability);
                if (abilityName) {
                    abilityNames.push(abilityName);
                }
            }
        }
        
        return abilityNames.length > 0 ? abilityNames.join(', ') : 'N/A';
    }

    getAbilityName(abilityKey) {
        const abilityMap = {
            'str': 'Força',
            'dex': 'Destreza',
            'con': 'Constituição',
            'int': 'Inteligência',
            'wis': 'Sabedoria',
            'cha': 'Carisma'
        };
        return abilityMap[abilityKey.toLowerCase()] || abilityKey;
    }

    calculateHP(level, hitDie, constitution) {
        if (!level || !hitDie || !constitution) return 'N/A';
        
        // Converter hitDie de string (ex: "d8") para número
        let hitDieNumber;
        if (typeof hitDie === 'string') {
            // Extrair o número do dado (ex: "d8" -> 8)
            const match = hitDie.match(/d(\d+)/);
            if (match) {
                hitDieNumber = parseInt(match[1]);
            } else {
                return 'N/A';
            }
        } else {
            hitDieNumber = hitDie;
        }
        
        // Calcular modificador de Constituição
        const conModifier = Math.floor((constitution - 10) / 2);
        
        // HP do primeiro nível: máximo do dado + modificador de CON
        let totalHP = hitDieNumber + conModifier;
        
        // HP dos níveis seguintes: usar média do dado + modificador de CON (mais consistente)
        for (let i = 2; i <= level; i++) {
            const averageRoll = Math.ceil(hitDieNumber / 2) + 0.5; // Média do dado
            totalHP += Math.floor(averageRoll) + conModifier;
        }
        
        return totalHP;
    }

    getAbilityModifier(abilityScore) {
        return Math.floor((abilityScore - 10) / 2);
    }

    renderCharacter(character) {
        return `
            <div class="character-header">
                <div class="character-name">Personagem Sem Nome</div>
                <div class="character-basics">
                    <div class="character-basic-info">Nível ${character.level}</div>
                    <div class="character-basic-info">${character.race}</div>
                    <div class="character-basic-info">${character.class}</div>
                    ${character.subclass ? `<div class="character-basic-info">${character.subclass}</div>` : ''}
                </div>
            </div>
            
            <div class="character-content">
                <div class="character-section">
                    <h3><i class="fas fa-dice-d20"></i> Atributos</h3>
                    <div class="attributes-grid">
                        <div class="attribute-item">
                            <span>Força</span>
                            <span class="attribute-value">${character.abilities?.strength || 'N/A'}</span>
                        </div>
                        <div class="attribute-item">
                            <span>Destreza</span>
                            <span class="attribute-value">${character.abilities?.dexterity || 'N/A'}</span>
                        </div>
                        <div class="attribute-item">
                            <span>Constituição</span>
                            <span class="attribute-value">${character.abilities?.constitution || 'N/A'}</span>
                        </div>
                        <div class="attribute-item">
                            <span>Inteligência</span>
                            <span class="attribute-value">${character.abilities?.intelligence || 'N/A'}</span>
                        </div>
                        <div class="attribute-item">
                            <span>Sabedoria</span>
                            <span class="attribute-value">${character.abilities?.wisdom || 'N/A'}</span>
                        </div>
                        <div class="attribute-item">
                            <span>Carisma</span>
                            <span class="attribute-value">${character.abilities?.charisma || 'N/A'}</span>
                        </div>
                    </div>
                    ${character.abilities?.constitution && character.classData?.hitDie ? `
                        <div class="hp-info">
                            <p><strong>Pontos de Vida:</strong> ${this.calculateHP(character.level, character.classData.hitDie, character.abilities.constitution)}</p>
                        </div>
                    ` : ''}
                </div>
                
                ${character.spells && character.spells.length > 0 ? `
                    <div class="character-section spells-scroll">
                        <h3><i class="fas fa-magic"></i> Magias</h3>
                        ${character.spellData && character.spellData.length > 0 ? 
                            character.spellData.map(spell => `
                                <div class="spell-detail">
                                    <h4>${spell.name || 'Magia sem nome'}</h4>
                                    <p><strong>Nível:</strong> ${this.formatSpellLevel(spell.level)}</p>
                                    <p><strong>Escola:</strong> ${this.formatSpellSchool(spell.school)}</p>
                                    <p><strong>Tempo de Conjuração:</strong> ${this.formatCastingTime(spell.time)}</p>
                                    <p><strong>Alcance:</strong> ${this.formatRange(spell.range)}</p>
                                    <p><strong>Duração:</strong> ${this.formatDuration(spell.duration)}</p>
                                    <p>${this.extractFullDescription(spell.entries) || 'Descrição não disponível'}</p>
                                </div>
                            `).join('') : 
                            `<div class="spell-items">
                                ${character.spells.map(spell => `<span class="spell-item">${spell || 'Magia sem nome'}</span>`).join('')}
                            </div>`
                        }
                    </div>
                ` : ''}
                
                ${character.feats && character.feats.length > 0 ? `
                    <div class="character-section">
                        <h3><i class="fas fa-star"></i> Feats</h3>
                        <div class="feats-list">
                            ${character.featData && character.featData.length > 0 ? 
                                character.featData.map(feat => `
                                    <div class="feat-detail">
                                        <h4>${feat.name || 'Feat sem nome'}</h4>
                                        <p>${this.extractFullDescription(feat.entries) || 'Descrição não disponível'}</p>
                                    </div>
                                `).join('') : 
                                `<ul>
                                    ${character.feats.map(feat => `<li>${feat || 'Feat sem nome'}</li>`).join('')}
                                </ul>`
                            }
                        </div>
                    </div>
                ` : ''}
                
                ${character.equipment && character.equipment.length > 0 ? `
                    <div class="character-section">
                        <h3><i class="fas fa-backpack"></i> Equipamento</h3>
                        ${Array.isArray(character.equipment) && typeof character.equipment[0] === 'object' ? 
                            character.equipment.map(item => `
                                <div class="equipment-item">
                                    <h4>${item.name || 'Item sem nome'}</h4>
                                    <p><strong>Descrição Mecânica:</strong> ${item.mechanicalDescription || 'N/A'}</p>
                                    <p><strong>Descrição Visual:</strong> ${item.visualDescription || 'N/A'}</p>
                                </div>
                            `).join('') :
                            `<ul>
                                ${character.equipment.map(item => `<li>${item || 'Item sem nome'}</li>`).join('')}
                            </ul>`
                        }
                    </div>
                ` : ''}
                
                ${character.armorClass ? `
                    <div class="character-section">
                        <h3><i class="fas fa-shield-alt"></i> Classe de Armadura</h3>
                        <p><strong>CA:</strong> ${character.armorClass}</p>
                    </div>
                ` : ''}
                
                ${character.whyStrong ? `
                    <div class="character-section">
                        <h3><i class="fas fa-crown"></i> Por que é Forte</h3>
                        <p>${character.whyStrong}</p>
                    </div>
                ` : ''}
                
                ${character.howToPlay ? `
                    <div class="character-section">
                        <h3><i class="fas fa-gamepad"></i> Como Jogar</h3>
                        <p>${character.howToPlay}</p>
                    </div>
                ` : ''}
                
                ${character.background ? `
                    <div class="character-section">
                        <h3><i class="fas fa-book"></i> História de Fundo</h3>
                        <p>${character.background}</p>
                    </div>
                ` : ''}
                
                ${character.personality ? `
                    <div class="character-section">
                        <h3><i class="fas fa-brain"></i> Personalidade</h3>
                        <p>${character.personality}</p>
                    </div>
                ` : ''}
                
                ${character.raceData ? `
                    <div class="character-section">
                        <h3><i class="fas fa-dragon"></i> Traços da Raça</h3>
                        <p><strong>${character.raceData.name}</strong></p>
                        <p>${character.raceData.description || ''}</p>
                        ${character.raceData.traits && character.raceData.traits.length > 0 ? `
                            <div class="race-traits">
                                ${character.raceData.traits.map(trait => `
                                    <div class="race-trait">
                                        <h4>${trait.name}</h4>
                                        <p>${this.cleanReferences(trait.description)}</p>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
                
                ${character.classData ? `
                    <div class="character-section">
                        <h3><i class="fas fa-shield-alt"></i> Informações da Classe</h3>
                        <p><strong>${character.classData.name}</strong></p>
                        <p>${character.classData.description || ''}</p>
                        <p><strong>Dado de Vida:</strong> ${character.classData.hitDie || 'd6'}</p>
                        ${character.classData.primaryAbility && character.classData.primaryAbility.length > 0 ? `
                            <p><strong>Habilidade Principal:</strong> ${this.formatPrimaryAbilities(character.classData.primaryAbility)}</p>
                        ` : ''}
                    </div>
                ` : ''}
                
                ${character.spellSlots && character.spellSlots.length > 0 ? `
                    <div class="character-section">
                        <h3><i class="fas fa-battery-full"></i> Spell Slots</h3>
                        <div class="spell-slots-row">
                            ${character.spellSlots.map((slot, idx) => `
                                <div class="spell-slot-circle" title="Nível ${idx + 1}" data-empty="${slot === 0}">${slot}</div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${character.abilityScoreOperations ? `
                    <div class="character-section">
                        <h3><i class="fas fa-calculator"></i> Operações nos Atributos</h3>
                        <div class="ability-operations">
                            <div class="original-rolls">
                                <h4>Valores Originais Rolados:</h4>
                                <p><strong>[${character.abilityScoreOperations.originalRolls.join(', ')}]</strong></p>
                            </div>
                            <div class="operations-list">
                                <h4>Operações Realizadas:</h4>
                                <ul>
                                    ${character.abilityScoreOperations.operations.map(op => `<li>${op}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    </div>
                ` : ''}
                

                

            </div>
        `;
    }
}

class LoadingModal {
    constructor() {
        this.modal = document.getElementById('loadingModal');
        this.message = document.getElementById('loadingMessage');
    }

    show(message = 'Carregando...') {
        this.message.textContent = message;
        this.modal.classList.add('show');
    }

    hide() {
        this.modal.classList.remove('show');
    }
}

class ErrorModal {
    constructor() {
        this.modal = document.getElementById('errorModal');
        this.message = document.getElementById('errorMessage');
    }

    show(message) {
        this.message.textContent = message;
        this.modal.classList.add('show');
    }

    hide() {
        this.modal.classList.remove('show');
    }
}

// ===== SERVIÇOS =====
class CharacterService {
    async generateCharacter(characterData) {
        try {
            loadingModal.show('Gerando seu personagem...');
            formManager.setLoading(true);
            
            const response = await fetch(`${API_BASE_URL}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(characterData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro na geração do personagem');
            }
            
            const character = await response.json();
            
            appState.currentCharacter = character;
            characterDisplay.show(character);
            
        } catch (error) {
            console.error('Erro ao gerar personagem:', error);
            errorModal.show(error.message);
        } finally {
            loadingModal.hide();
            formManager.setLoading(false);
        }
    }

    async generatePDF() {
        if (!appState.currentCharacter) return;
        
        try {
            loadingModal.show('Gerando PDF...');
            
            const response = await fetch(`${API_BASE_URL}/api/generate-pdf`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(appState.currentCharacter)
            });
            
            if (!response.ok) {
                throw new Error('Erro ao gerar PDF');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'DnD_Character_Sheet.pdf';
            a.click();
            window.URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            errorModal.show('Erro ao gerar PDF');
        } finally {
            loadingModal.hide();
        }
    }

    async generateHTMLPDF() {
        if (!appState.currentCharacter) return;
        
        try {
            loadingModal.show('Gerando PDF HTML...');
            
            const response = await fetch(`${API_BASE_URL}/api/generate-html-pdf`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(appState.currentCharacter)
            });
            
            if (!response.ok) {
                throw new Error('Erro ao gerar PDF HTML');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'DnD_Character_Sheet_HTML.pdf';
            a.click();
            window.URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('Erro ao gerar PDF HTML:', error);
            errorModal.show('Erro ao gerar PDF HTML');
        } finally {
            loadingModal.hide();
        }
    }

    downloadCharacter() {
        if (!appState.currentCharacter) return;
        
        const dataStr = JSON.stringify(appState.currentCharacter, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `Personagem_Sem_Nome_D&D_Character.json`;
        link.click();
    }

    printCharacter() {
        if (!appState.currentCharacter) return;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(this.generatePrintHTML());
        printWindow.document.close();
        printWindow.print();
    }

    generatePrintHTML() {
        const character = appState.currentCharacter;
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Personagem Sem Nome - Ficha D&D</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .section { margin-bottom: 20px; }
                    .section h3 { color: #333; border-bottom: 2px solid #ccc; }
                    .attributes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
                    .attribute { padding: 5px; background: #f5f5f5; }
                    .spells { margin-top: 10px; }
                    .spell-item { display: inline-block; margin: 2px; padding: 2px 8px; background: #e0e0e0; border-radius: 10px; }
                    .spell-detail { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
                    .feat-detail { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
                    .spells-list {
                        max-height: 350px;
                        overflow-y: auto;
                    }
                    .character-section.spells-scroll {
                        max-height: 350px;
                        overflow-y: auto;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Personagem Sem Nome</h1>
                    <p>Nível ${character.level} ${character.race} ${character.class}${character.subclass ? ` (${character.subclass})` : ''}</p>
                </div>
                
                <div class="section">
                    <h3>Atributos</h3>
                    <div class="attributes">
                        <div class="attribute"><strong>Força:</strong> ${character.abilities?.strength || 'N/A'}</div>
                        <div class="attribute"><strong>Destreza:</strong> ${character.abilities?.dexterity || 'N/A'}</div>
                        <div class="attribute"><strong>Constituição:</strong> ${character.abilities?.constitution || 'N/A'}</div>
                        <div class="attribute"><strong>Inteligência:</strong> ${character.abilities?.intelligence || 'N/A'}</div>
                        <div class="attribute"><strong>Sabedoria:</strong> ${character.abilities?.wisdom || 'N/A'}</div>
                        <div class="attribute"><strong>Carisma:</strong> ${character.abilities?.charisma || 'N/A'}</div>
                    </div>
                </div>
                
                ${character.spells && character.spells.length > 0 ? `
                    <div class="section">
                        <h3>Magias</h3>
                        <div class="spells">
                            ${character.spells.map(spell => `<span class="spell-item">${spell}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${character.feats && character.feats.length > 0 ? `
                    <div class="section">
                        <h3>Feats</h3>
                        <ul>${character.feats.map(feat => `<li>${feat}</li>`).join('')}</ul>
                    </div>
                ` : ''}
                
                ${character.equipment && character.equipment.length > 0 ? `
                    <div class="section">
                        <h3>Equipamento</h3>
                        <ul>${character.equipment.map(item => `<li>${item}</li>`).join('')}</ul>
                    </div>
                ` : ''}
                
                ${character.background ? `
                    <div class="section">
                        <h3>História de Fundo</h3>
                        <p>${character.background}</p>
                    </div>
                ` : ''}
                
                ${character.personality ? `
                    <div class="section">
                        <h3>Personalidade</h3>
                        <p>${character.personality}</p>
                    </div>
                ` : ''}
                
                ${character.raceData ? `
                    <div class="section">
                        <h3>Traços da Raça</h3>
                        <p><strong>${character.raceData.name}</strong></p>
                        <p>${character.raceData.description}</p>
                        <ul>${character.raceData.traits.map(trait => `<li>${trait}</li>`).join('')}</ul>
                    </div>
                ` : ''}
                
                ${character.classData ? `
                    <div class="section">
                        <h3>Informações da Classe</h3>
                        <p><strong>${character.classData.name}</strong></p>
                        <p>${character.classData.description}</p>
                        <p><strong>Dado de Vida:</strong> ${character.classData.hitDie}</p>
                        <p><strong>Habilidade Principal:</strong> ${character.classData.primaryAbility.join(', ')}</p>
                    </div>
                ` : ''}
                
                ${character.spellData && character.spellData.length > 0 ? `
                    <div class="section">
                        <h3>Detalhes das Magias</h3>
                        ${character.spellData.map(spell => `
                            <div class="spell-detail">
                                <h4>${spell.name}</h4>
                                <p><strong>Nível:</strong> ${spell.level === 0 ? 'Truque' : spell.level}</p>
                                <p><strong>Escola:</strong> ${spell.school}</p>
                                <p><strong>Tempo de Conjuração:</strong> ${spell.castingTime}</p>
                                <p><strong>Alcance:</strong> ${spell.range}</p>
                                <p><strong>Duração:</strong> ${spell.duration}</p>
                                <p>${spell.description}</p>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                ${character.featData && character.featData.length > 0 ? `
                    <div class="section">
                        <h3>Detalhes dos Feats</h3>
                        ${character.featData.map(feat => `
                            <div class="feat-detail">
                                <h4>${feat.name}</h4>
                                <p>${feat.description}</p>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </body>
            </html>
        `;
    }
}

// ===== INICIALIZAÇÃO =====
let appState, formManager, characterDisplay, loadingModal, errorModal, characterService, themeToggle;

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar estado
    appState = new AppState();
    
    // Inicializar componentes
    themeToggle = new ThemeToggle();
    formManager = new FormManager();
    characterDisplay = new CharacterDisplay();
    loadingModal = new LoadingModal();
    errorModal = new ErrorModal();
    characterService = new CharacterService();
    
    // Configurar tema inicial
    appState.setTheme(appState.theme);
    
    // Inicializar componentes
    themeToggle.init();
    formManager.init();
    
    // Configurar event listeners globais
    setupGlobalEventListeners();
});

function setupGlobalEventListeners() {
    // Botões de ação
    document.getElementById('downloadBtn').addEventListener('click', () => characterService.downloadCharacter());
    document.getElementById('printBtn').addEventListener('click', () => characterService.printCharacter());
    document.getElementById('generatePdfBtn').addEventListener('click', () => characterService.generatePDF());
    document.getElementById('generateHtmlPdfBtn').addEventListener('click', () => characterService.generateHTMLPDF());
    document.getElementById('generateAnotherBtn').addEventListener('click', showForm);
    
    // Fechar modais
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
        }
    });
}

function showForm() {
    characterDisplay.hide();
    document.getElementById('formSection').scrollIntoView({ behavior: 'smooth' });
}

function closeErrorModal() {
    errorModal.hide();
}

// ===== UTILITÁRIOS =====
function showSuccess(message) {
    // Implementar toast de sucesso
    console.log('Sucesso:', message);
}

function showError(message) {
    errorModal.show(message);
} 
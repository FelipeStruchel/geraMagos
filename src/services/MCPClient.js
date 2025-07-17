import axios from 'axios';

export class MCPClient {
  constructor() {
    this.mcpServerUrl = process.env.MCP_SERVER_URL || 'http://localhost:3001';
    this.baseURL = `${this.mcpServerUrl}/api`;
  }

  async makeRequest(endpoint, method = 'GET', data = null) {
    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`Erro na requisição MCP para ${endpoint}:`, error.message);
      throw new Error(`Falha na comunicação com o servidor MCP: ${error.message}`);
    }
  }

  async getSpellsByClass(className) {
    return this.makeRequest(`/spells/${encodeURIComponent(className)}`);
  }

  async getSubclassesByClass(className) {
    return this.makeRequest(`/subclasses/${encodeURIComponent(className)}`);
  }

  async getRaces() {
    return this.makeRequest('/races');
  }

  async getRacesByClass(className) {
    return this.makeRequest(`/races/${encodeURIComponent(className)}`);
  }

  async validateCharacter(params) {
    return this.makeRequest('/validate', 'POST', params);
  }

  async getSuggestions(params) {
    return this.makeRequest('/suggestions', 'POST', params);
  }

  async getAllSpells() {
    return this.makeRequest('/spells');
  }

  async getClassInfo(className) {
    return this.makeRequest(`/classes/${encodeURIComponent(className)}`);
  }

  // Método para obter dados completos para geração de personagem
  async getCharacterData(characterClass, level) {
    try {
      const [spells, subclasses, races, classInfo] = await Promise.all([
        this.getSpellsByClass(characterClass),
        this.getSubclassesByClass(characterClass),
        this.getRacesByClass(characterClass),
        this.getClassInfo(characterClass)
      ]);

      return {
        spells,
        subclasses,
        races,
        classInfo,
        level
      };
    } catch (error) {
      console.error('Erro ao obter dados do personagem:', error);
      throw error;
    }
  }

  // Método para validar combinação antes da geração
  async validateCharacterCombination(params) {
    try {
      const validation = await this.validateCharacter(params);
      
      if (!validation.valid) {
        throw new Error(`Combinação inválida: ${validation.errors.join(', ')}`);
      }

      return validation;
    } catch (error) {
      console.error('Erro na validação:', error);
      throw error;
    }
  }

  // Método para obter sugestões baseadas no nível de poder
  async getPowerBasedSuggestions(characterClass, powerLevel, level) {
    try {
      const suggestions = await this.getSuggestions({
        class: characterClass,
        powerLevel,
        level
      });

      return suggestions;
    } catch (error) {
      console.error('Erro ao obter sugestões:', error);
      throw error;
    }
  }
} 
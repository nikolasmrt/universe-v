export const PLANET_CONFIGS = {
    Aegis: {
        key: 'Aegis',
        title: 'Aegis-9 (O Cristalino)',
        targetItems: 15,
        itemName: 'Cristais Prismáticos',
        gravityLabel: '1.0G (Nominal)',
        hazardLabel: 'Estável',
        description: 'Planeta composto por estruturas cristalinas prismáticas que refratam a luz estelar.'
    },
    Gaea: {
        key: 'Gaea',
        title: 'Bio-Gaea (O Mutante)',
        targetItems: 10,
        itemName: 'Amostras Bioluminescentes',
        gravityLabel: '0.6G (Baixa)',
        hazardLabel: 'Atmosfera Tóxica (-2 HP/s)',
        description: 'Biosfera mutante onde esporos bioluminescentes curam o traje contra a toxina atmosférica.'
    },
    Kronos: {
        key: 'Kronos',
        title: 'Kronos-V (O Abissal)',
        targetItems: 8,
        itemName: 'Núcleos Magnéticos',
        gravityLabel: '2.5G (Extrema)',
        hazardLabel: 'Tempestade Eletromagnética',
        description: 'Gigante metálico de alta gravidade com pilares de basalto e tempestades elétricas.'
    }
};

/**
 * Gerencia estado da missão, integridade do traje (HP) e sincronização com o HUD.
 */
export class GameManager {
    constructor() {
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.currentPlanet = 'Aegis';
        this.collectedItems = 0;
        this.targetItems = PLANET_CONFIGS.Aegis.targetItems;
        this.missionCompleted = false;
        this.isDead = false;
        this.emergencyResetMessage = '';
    }

    /**
     * Reinicia telemetria e objetivos para o planeta selecionado.
     * @param {string} planetName
     */
    resetForPlanet(planetName) {
        const config = PLANET_CONFIGS[planetName] || PLANET_CONFIGS.Aegis;
        this.currentPlanet = config.key;
        this.health = this.maxHealth;
        this.collectedItems = 0;
        this.targetItems = config.targetItems;
        this.missionCompleted = false;
        this.isDead = false;
        this.emergencyResetMessage = '';
        this.updateHUD();
    }

    /**
     * Registra coleta de item da missão e aplica cura opcional.
     * @param {number} healAmount
     */
    collectItem(healAmount = 0) {
        if (this.collectedItems < this.targetItems) {
            this.collectedItems += 1;
        }
        if (healAmount > 0) {
            this.heal(healAmount);
        }
        if (this.collectedItems >= this.targetItems) {
            this.missionCompleted = true;
        }
        this.emergencyResetMessage = '';
        this.updateHUD();
    }

    /**
     * Aplica dano ao traje espacial e ativa protocolo de emergência se zerar o HP.
     * @param {number} amount
     */
    takeDamage(amount) {
        if (amount <= 0) return;

        this.health = Math.max(0, this.health - amount);
        if (this.health === 0) {
            this.isDead = true;
            this.health = this.maxHealth;
            this.isDead = false;
            this.emergencyResetMessage = 'Protocolo de emergência ativado: escudos restaurados para 100%!';
        }
        this.updateHUD();
    }

    /**
     * Recupera integridade do traje até o limite máximo.
     * @param {number} amount
     */
    heal(amount) {
        if (amount <= 0) return;
        this.health = Math.min(this.maxHealth, this.health + amount);
        this.updateHUD();
    }

    /**
     * Retorna a configuração do planeta atual.
     */
    getCurrentConfig() {
        return PLANET_CONFIGS[this.currentPlanet] || PLANET_CONFIGS.Aegis;
    }

    /**
     * Atualiza elementos do HUD no navegador de forma segura.
     */
    updateHUD() {
        if (typeof document === 'undefined') return;

        const config = this.getCurrentConfig();
        const healthPercent = Math.max(0, Math.min(100, (this.health / this.maxHealth) * 100));
        const progressPercent = this.targetItems > 0
            ? Math.min(100, (this.collectedItems / this.targetItems) * 100)
            : 0;

        const healthBarFill = document.getElementById('health-bar-fill');
        const healthText = document.getElementById('health-text');
        const objectiveText = document.getElementById('objective-text');
        const hudPlanetName = document.getElementById('hud-planet-name');
        const hudGravity = document.getElementById('hud-gravity');
        const hudHazard = document.getElementById('hud-hazard');
        const hudProgressFill = document.getElementById('hud-progress-fill');

        if (healthBarFill) {
            healthBarFill.style.width = `${healthPercent.toFixed(1)}%`;
            if (healthPercent > 60) {
                healthBarFill.style.background = '#00ff66';
            } else if (healthPercent > 30) {
                healthBarFill.style.background = '#ffaa00';
            } else {
                healthBarFill.style.background = '#ff0055';
            }
        }

        if (healthText) {
            healthText.textContent = `HP: ${Math.ceil(this.health)}%`;
        }

        if (objectiveText) {
            if (this.emergencyResetMessage) {
                objectiveText.textContent = `${this.emergencyResetMessage} (${this.collectedItems}/${this.targetItems} ${config.itemName})`;
            } else if (this.missionCompleted) {
                objectiveText.textContent = `Missão concluída! Todos os ${this.targetItems} ${config.itemName} coletados. Retorne à órbita [O] ou continue explorando.`;
            } else {
                objectiveText.textContent = `Colete ${config.itemName}: ${this.collectedItems}/${this.targetItems}`;
            }
        }

        if (hudPlanetName) hudPlanetName.textContent = config.title;
        if (hudGravity) hudGravity.textContent = `Gravidade: ${config.gravityLabel}`;
        if (hudHazard) hudHazard.textContent = `Risco: ${config.hazardLabel}`;
        if (hudProgressFill) {
            hudProgressFill.style.width = `${progressPercent.toFixed(1)}%`;
        }
    }
}

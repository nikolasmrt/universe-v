import { GameEngine } from './core/GameEngine.js';
import { PLANET_CONFIGS } from './core/GameManager.js';

document.addEventListener('DOMContentLoaded', () => {
    try {
        const engine = new GameEngine('webgl-container');
        const blocker = document.getElementById('blocker');
        const btnStartExplore = document.getElementById('btn-start-explore');
        const btnReturn = document.getElementById('btn-return-orbit');
        const btnHudOrbit = document.getElementById('btn-hud-orbit');
        const orbitPlanetInfo = document.getElementById('orbit-planet-info');

        const planetDestinations = [
            { id: 'btn-aegis', name: 'Aegis' },
            { id: 'btn-gaea', name: 'Gaea' },
            { id: 'btn-kronos', name: 'Kronos' }
        ];

        const updateOrbitPreview = (planetName) => {
            if (!orbitPlanetInfo) return;
            const cfg = PLANET_CONFIGS[planetName];
            if (!cfg) return;
            orbitPlanetInfo.innerHTML = `
                <strong>${cfg.title}</strong><br/>
                <span>${cfg.description}</span><br/>
                <small>Gravidade: ${cfg.gravityLabel} • Risco: ${cfg.hazardLabel}</small>
            `;
        };

        planetDestinations.forEach(dest => {
            const btn = document.getElementById(dest.id);
            if (btn) {
                btn.addEventListener('mouseenter', () => updateOrbitPreview(dest.name));
                btn.addEventListener('focus', () => updateOrbitPreview(dest.name));
                btn.addEventListener('click', () => {
                    engine.loadPlanetSurface(dest.name);
                });
            }
        });

        if (btnStartExplore) {
            btnStartExplore.addEventListener('click', (e) => {
                e.stopPropagation();
                engine.startSurfaceExploration();
            });
        }

        if (blocker) {
            blocker.addEventListener('click', (e) => {
                if (e.target.id === 'btn-return-orbit') return;
                engine.startSurfaceExploration();
            });
        }

        if (btnReturn) {
            btnReturn.addEventListener('click', (e) => {
                e.stopPropagation();
                engine.exitPlanetSurface();
            });
        }

        if (btnHudOrbit) {
            btnHudOrbit.addEventListener('click', (e) => {
                e.stopPropagation();
                engine.exitPlanetSurface();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyO' && engine.scene.userData.currentMode === 'FPS') {
                engine.exitPlanetSurface();
            }
        });
    } catch (error) {
        console.error('❌ ERRO CRÍTICO NO ARRANQUE DO JOGO:', error);
    }
});

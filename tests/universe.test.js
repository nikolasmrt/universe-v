import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const THREE_STUB_SOURCE = `
export class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    set(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }
    distanceTo(other) {
        return Math.hypot(this.x - other.x, this.y - other.y, this.z - other.z);
    }
}
export class Color {
    constructor(val) { this.value = val; }
}
export class FogExp2 {
    constructor(color, density) { this.color = color; this.density = density; }
}
export class Group {
    constructor() {
        this.children = [];
        this.visible = true;
        this.rotation = { x: 0, y: 0, z: 0 };
        this.position = new Vector3();
    }
    add(obj) {
        if (!this.children.includes(obj)) this.children.push(obj);
    }
    remove(obj) {
        this.children = this.children.filter(item => item !== obj);
    }
}
export class BufferAttribute {
    constructor(array, itemSize) {
        this.array = array;
        this.itemSize = itemSize;
        this.count = array.length / itemSize;
    }
}
export class BufferGeometry {
    constructor() {
        this.attributes = {};
    }
    setAttribute(name, attr) {
        this.attributes[name] = attr;
    }
}
export class PlaneGeometry {
    constructor(w, h, ws = 1, hs = 1) {
        const count = (ws + 1) * (hs + 1);
        const xs = new Float32Array(count);
        const ys = new Float32Array(count);
        const zs = new Float32Array(count);
        let idx = 0;
        for (let iz = 0; iz <= hs; iz++) {
            for (let ix = 0; ix <= ws; ix++) {
                xs[idx] = (ix / ws - 0.5) * w;
                zs[idx] = (iz / hs - 0.5) * h;
                idx += 1;
            }
        }
        this.attributes = {
            position: {
                count,
                getX: (i) => xs[i],
                getY: (i) => ys[i],
                getZ: (i) => zs[i],
                setY: (i, val) => { ys[i] = val; }
            }
        };
    }
    rotateX() {}
    computeVertexNormals() {}
}
export class OctahedronGeometry { constructor(r, d) { this.r = r; this.d = d; } }
export class IcosahedronGeometry { constructor(r, d) { this.r = r; this.d = d; } }
export class CylinderGeometry { constructor(rt, rb, h, s) { this.rt = rt; this.rb = rb; this.h = h; this.s = s; } }
export class DodecahedronGeometry { constructor(r, d) { this.r = r; this.d = d; } }
export class MeshStandardMaterial { constructor(opts = {}) { Object.assign(this, opts); } }
export class PointsMaterial { constructor(opts = {}) { Object.assign(this, opts); } }
export class Mesh {
    constructor(geometry, material) {
        this.geometry = geometry;
        this.material = material;
        this.position = new Vector3();
        this.rotation = { x: 0, y: 0, z: 0 };
        this.scale = new Vector3(1, 1, 1);
        this.visible = true;
        this.userData = {};
    }
}
export class Points extends Mesh {}
export class AmbientLight {
    constructor(color, intensity) { this.color = color; this.intensity = intensity; }
}
export class DirectionalLight {
    constructor(color, intensity) {
        this.color = color;
        this.intensity = intensity;
        this.position = new Vector3();
    }
}
export class PointLight {
    constructor(color, intensity, distance) {
        this.color = color;
        this.intensity = intensity;
        this.distance = distance;
        this.position = new Vector3();
    }
}
`;

registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier === 'three') {
            return { shortCircuit: true, url: 'three-stub://three' };
        }
        return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
        if (url === 'three-stub://three') {
            return { shortCircuit: true, format: 'module', source: THREE_STUB_SOURCE };
        }
        return nextLoad(url, context);
    }
});

const { GameManager, PLANET_CONFIGS } = await import('../assets/js/core/GameManager.js');
const { PlanetFactory } = await import('../assets/js/components/PlanetFactory.js');
const { PlanetAegis } = await import('../assets/js/planets/PlanetAegis.js');
const { PlanetGaea } = await import('../assets/js/planets/PlanetGaea.js');
const { PlanetKronos } = await import('../assets/js/planets/PlanetKronos.js');

test('GameManager: configurações iniciais e resetForPlanet para Aegis, Gaea e Kronos', () => {
    const gm = new GameManager();

    gm.resetForPlanet('Aegis');
    assert.equal(gm.currentPlanet, 'Aegis');
    assert.equal(gm.health, 100);
    assert.equal(gm.collectedItems, 0);
    assert.equal(gm.targetItems, 15);
    assert.equal(gm.missionCompleted, false);

    gm.resetForPlanet('Gaea');
    assert.equal(gm.currentPlanet, 'Gaea');
    assert.equal(gm.targetItems, 10);

    gm.resetForPlanet('Kronos');
    assert.equal(gm.currentPlanet, 'Kronos');
    assert.equal(gm.targetItems, 8);

    gm.resetForPlanet('PlanetaInexistente');
    assert.equal(gm.currentPlanet, 'Aegis');
    assert.equal(gm.targetItems, PLANET_CONFIGS.Aegis.targetItems);
});

test('GameManager: coleta de itens, conclusão de missão, dano, cura e protocolo de emergência', () => {
    const gm = new GameManager();
    gm.resetForPlanet('Kronos');

    gm.takeDamage(45);
    assert.equal(gm.health, 55);

    gm.collectItem(10);
    assert.equal(gm.collectedItems, 1);
    assert.equal(gm.health, 65);
    assert.equal(gm.missionCompleted, false);

    gm.heal(50);
    assert.equal(gm.health, 100);

    gm.takeDamage(120);
    assert.equal(gm.health, 100);
    assert.match(gm.emergencyResetMessage, /Protocolo de emergência ativado/);

    for (let i = 1; i < gm.targetItems; i++) {
        gm.collectItem();
    }
    assert.equal(gm.collectedItems, 8);
    assert.equal(gm.missionCompleted, true);
    assert.equal(gm.emergencyResetMessage, '');

    gm.collectItem();
    assert.equal(gm.collectedItems, 8);
});

test('GameManager: sincronização com elementos simulados do DOM em updateHUD', () => {
    const mockElements = {
        'health-bar-fill': { style: { width: '', background: '' } },
        'health-text': { textContent: '' },
        'objective-text': { textContent: '' },
        'hud-planet-name': { textContent: '' },
        'hud-gravity': { textContent: '' },
        'hud-hazard': { textContent: '' },
        'hud-progress-fill': { style: { width: '' } }
    };

    const previousDocument = globalThis.document;
    globalThis.document = {
        getElementById: (id) => mockElements[id] || null
    };

    try {
        const gm = new GameManager();
        gm.resetForPlanet('Gaea');

        assert.equal(mockElements['hud-planet-name'].textContent, 'Bio-Gaea (O Mutante)');
        assert.equal(mockElements['hud-gravity'].textContent, 'Gravidade: 0.6G (Baixa)');
        assert.equal(mockElements['hud-hazard'].textContent, 'Risco: Atmosfera Tóxica (-2 HP/s)');
        assert.equal(mockElements['health-bar-fill'].style.width, '100.0%');
        assert.equal(mockElements['health-bar-fill'].style.background, '#00ff66');
        assert.equal(mockElements['health-text'].textContent, 'HP: 100%');
        assert.equal(mockElements['hud-progress-fill'].style.width, '0.0%');
        assert.match(mockElements['objective-text'].textContent, /0\/10/);

        gm.takeDamage(55);
        assert.equal(mockElements['health-bar-fill'].style.background, '#ffaa00');
        assert.equal(mockElements['health-text'].textContent, 'HP: 45%');

        gm.takeDamage(25);
        assert.equal(mockElements['health-bar-fill'].style.background, '#ff0055');
        assert.equal(mockElements['health-text'].textContent, 'HP: 20%');

        for (let i = 0; i < 10; i++) {
            gm.collectItem();
        }
        assert.equal(mockElements['hud-progress-fill'].style.width, '100.0%');
        assert.match(mockElements['objective-text'].textContent, /Missão concluída/);
    } finally {
        if (previousDocument === undefined) {
            delete globalThis.document;
        } else {
            globalThis.document = previousDocument;
        }
    }
});

test('Planetas e PlanetFactory: relevo determinístico, colecionáveis, pouso seguro e ciclo de atualização', () => {
    const orbitDefs = PlanetFactory.createPlanets();
    assert.equal(orbitDefs.length, 3);
    assert.deepEqual(orbitDefs.map(p => p.key), ['Aegis', 'Gaea', 'Kronos']);

    const aegis = new PlanetAegis();
    assert.equal(aegis.gravityModifier, 1.0);
    assert.equal(aegis.crystals.length, 15);
    assert.equal(
        aegis.getTerrainHeight(25, -40),
        Math.sin(25 * 0.02) * Math.cos(-40 * 0.02) * 30 + Math.sin(25 * 0.1) * 5
    );

    const gaea = new PlanetGaea();
    assert.equal(gaea.gravityModifier, 0.6);
    assert.equal(gaea.samples.length, 10);
    assert.equal(
        gaea.getTerrainHeight(15, 30),
        Math.sin(15 * 0.04) * Math.cos(30 * 0.04) * 15
    );

    const kronos = new PlanetKronos();
    assert.equal(kronos.gravityModifier, 2.5);
    assert.equal(kronos.cores.length, 8);
    assert.equal(
        kronos.getTerrainHeight(-20, 50),
        Math.sin(-20 * 0.01) * 15 + Math.cos(50 * 0.015) * 8
    );

    const pillars = kronos.getCollidables().slice(1);
    assert.equal(pillars.length, 150);
    pillars.forEach(pillar => {
        const distFromOrigin = Math.hypot(pillar.position.x, pillar.position.z);
        assert.ok(distFromOrigin >= 15, `Pilar próximo demais da origem: ${distFromOrigin}`);
    });

    const gm = new GameManager();
    gm.resetForPlanet('Gaea');
    const firstSample = gaea.samples[0];
    const mockPlayer = {
        camera: {
            position: {
                x: firstSample.mesh.position.x,
                y: firstSample.mesh.position.y,
                z: firstSample.mesh.position.z,
                distanceTo(other) {
                    return Math.hypot(this.x - other.x, this.y - other.y, this.z - other.z);
                }
            }
        }
    };

    gm.takeDamage(30);
    gaea.update(0.5, mockPlayer, gm);
    assert.equal(firstSample.collected, true);
    assert.equal(gm.collectedItems, 1);
    assert.equal(gm.health, 84);

    gaea.reset();
    assert.equal(firstSample.collected, false);

    gm.resetForPlanet('Aegis');
    const firstCrystal = aegis.crystals[0];
    mockPlayer.camera.position.x = firstCrystal.mesh.position.x;
    mockPlayer.camera.position.y = firstCrystal.mesh.position.y;
    mockPlayer.camera.position.z = firstCrystal.mesh.position.z;
    aegis.update(0.016, mockPlayer, gm);
    assert.equal(firstCrystal.collected, true);
    assert.equal(gm.collectedItems, 1);
    aegis.reset();
    assert.equal(firstCrystal.collected, false);

    gm.resetForPlanet('Kronos');
    const firstCore = kronos.cores[0];
    mockPlayer.camera.position.x = firstCore.mesh.position.x;
    mockPlayer.camera.position.y = firstCore.mesh.position.y;
    mockPlayer.camera.position.z = firstCore.mesh.position.z;
    kronos.update(0.016, mockPlayer, gm);
    assert.equal(firstCore.collected, true);
    assert.equal(gm.collectedItems, 1);
    kronos.reset();
    assert.equal(firstCore.collected, false);
});

test('Integridade do index.html e assets/css/style.css', () => {
    const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
    const css = fs.readFileSync(path.join(rootDir, 'assets/css/style.css'), 'utf8');

    assert.match(html, /type="importmap"/);
    assert.match(html, /three\.module\.js/);

    const requiredIds = [
        'webgl-container',
        'crosshair',
        'blocker',
        'planet-title',
        'planet-subtitle',
        'btn-start-explore',
        'btn-return-orbit',
        'fps-hud',
        'health-bar-fill',
        'health-text',
        'hud-planet-name',
        'hud-gravity',
        'hud-hazard',
        'hud-telemetry-coords',
        'objective-text',
        'hud-progress-fill',
        'btn-hud-orbit',
        'hud-orbit',
        'btn-aegis',
        'btn-gaea',
        'btn-kronos',
        'orbit-planet-info'
    ];

    requiredIds.forEach(id => {
        assert.ok(html.includes(`id="${id}"`), `ID '${id}' ausente no index.html`);
    });

    assert.ok(css.includes('#hud-progress-fill'));
    assert.ok(css.includes('#blocker'));
    assert.ok(css.includes('#fps-hud'));
    assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length);
});

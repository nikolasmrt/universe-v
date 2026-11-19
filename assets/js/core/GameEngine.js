import * as THREE from 'three';
import { PlayerController } from '../controls/PlayerController.js';
import { GameManager, PLANET_CONFIGS } from './GameManager.js';
import { PlanetFactory } from '../components/PlanetFactory.js';
import { PlanetAegis } from '../planets/PlanetAegis.js';
import { PlanetGaea } from '../planets/PlanetGaea.js';
import { PlanetKronos } from '../planets/PlanetKronos.js';

/**
 * Motor 3D principal responsável pela alternância entre Órbita e Exploração Planetária FPS.
 */
export class GameEngine {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) throw new Error('Container WebGL não encontrado no HTML.');

        this.scene = new THREE.Scene();
        this.scene.userData = { currentMode: 'ORBIT' };

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.container.appendChild(this.renderer.domElement);

        this.clock = new THREE.Clock();

        this.gameManager = new GameManager();
        this.player = new PlayerController(this.camera, this.renderer.domElement, this.scene, this.gameManager);

        this.environments = {
            Aegis: new PlanetAegis(),
            Gaea: new PlanetGaea(),
            Kronos: new PlanetKronos()
        };

        this.activePlanet = null;
        this.orbitGroup = new THREE.Group();
        this.scene.add(this.orbitGroup);

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.initGalaxySpace();

        window.addEventListener('resize', () => this.onResize());
        window.addEventListener('click', (e) => this.onMouseClick(e));

        this.animate();
    }

    buildOrbitStarfield() {
        const starCount = 1500;
        const positions = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount; i++) {
            const radius = 160 + Math.random() * 260;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);
        }

        const starGeo = new THREE.BufferGeometry();
        starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const starMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1.1,
            transparent: true,
            opacity: 0.85
        });

        return new THREE.Points(starGeo, starMat);
    }

    initGalaxySpace() {
        this.scene.userData.currentMode = 'ORBIT';
        this.scene.background = new THREE.Color(0x010008);
        this.scene.fog = new THREE.FogExp2(0x010008, 0.0018);

        this.player.resetState();

        while (this.orbitGroup.children.length > 0) {
            this.orbitGroup.remove(this.orbitGroup.children[0]);
        }

        this.orbitGroup.add(this.buildOrbitStarfield());
        this.orbitGroup.add(new THREE.AmbientLight(0x334466, 1.1));

        const sunLight = new THREE.PointLight(0xffdd88, 3.2, 260);
        sunLight.position.set(0, 0, 0);
        this.orbitGroup.add(sunLight);

        const sun = new THREE.Mesh(
            new THREE.SphereGeometry(8, 32, 32),
            new THREE.MeshBasicMaterial({ color: 0xffb703 })
        );
        this.orbitGroup.add(sun);

        const sunHalo = new THREE.Mesh(
            new THREE.SphereGeometry(10.2, 24, 24),
            new THREE.MeshBasicMaterial({
                color: 0xff8800,
                transparent: true,
                opacity: 0.22
            })
        );
        this.orbitGroup.add(sunHalo);

        const planetsMeta = PlanetFactory.createPlanets();
        planetsMeta.forEach((p, idx) => {
            const ringGeo = new THREE.RingGeometry(p.distance - 0.15, p.distance + 0.15, 96);
            ringGeo.rotateX(-Math.PI / 2);
            const ringMat = new THREE.MeshBasicMaterial({
                color: p.colorHex,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.28
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            this.orbitGroup.add(ring);

            const mesh = new THREE.Mesh(p.geometry, p.material);
            mesh.position.x = p.distance;
            mesh.userData = { targetPlanet: p.key };

            const pivot = new THREE.Group();
            pivot.rotation.y = idx * 1.1;
            pivot.add(mesh);
            pivot.userData = { speed: p.speed, planetMesh: mesh };
            this.orbitGroup.add(pivot);
        });

        this.orbitGroup.visible = true;
        if (this.activePlanet && this.activePlanet.group) {
            this.activePlanet.group.visible = false;
        }

        this.camera.position.set(0, 42, 74);
        this.camera.lookAt(0, 0, 0);

        const hudOrbit = document.getElementById('hud-orbit');
        const blocker = document.getElementById('blocker');
        const fpsHud = document.getElementById('fps-hud');
        const crosshair = document.getElementById('crosshair');
        const btnReturn = document.getElementById('btn-return-orbit');

        if (hudOrbit) hudOrbit.style.display = 'block';
        if (blocker) blocker.style.display = 'none';
        if (fpsHud) fpsHud.style.display = 'none';
        if (crosshair) crosshair.style.display = 'none';
        if (btnReturn) btnReturn.style.display = 'none';
    }

    onMouseClick(event) {
        if (this.scene.userData.currentMode !== 'ORBIT') return;
        if (event.target !== this.renderer.domElement) return;

        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.orbitGroup.children, true);

        if (intersects.length > 0) {
            const obj = intersects[0].object;
            if (obj.userData && obj.userData.targetPlanet) {
                this.loadPlanetSurface(obj.userData.targetPlanet);
            }
        }
    }

    loadPlanetSurface(planetName) {
        this.activePlanet = this.environments[planetName];
        if (!this.activePlanet) {
            console.error(`❌ Planeta '${planetName}' não encontrado.`);
            return;
        }

        if (typeof this.activePlanet.reset === 'function') {
            this.activePlanet.reset();
        }

        this.player.resetState();

        this.scene.userData.currentMode = 'FPS';
        this.orbitGroup.visible = false;

        if (!this.scene.children.includes(this.activePlanet.group)) {
            this.scene.add(this.activePlanet.group);
        }
        this.activePlanet.group.visible = true;

        this.scene.background = this.activePlanet.bgColor;
        this.scene.fog = this.activePlanet.fog;

        if (this.gameManager && typeof this.gameManager.resetForPlanet === 'function') {
            this.gameManager.resetForPlanet(planetName);
        }

        const modifier = this.activePlanet.gravityModifier || 1.0;
        this.player.currentGravity = this.player.baseGravity * modifier;
        this.player.jumpForce = 20.0 / Math.sqrt(modifier);

        const groundY = typeof this.activePlanet.getTerrainHeight === 'function'
            ? this.activePlanet.getTerrainHeight(0, 0)
            : 0;
        const spawnY = groundY + this.player.playerHeight + 2;
        const lookY = groundY + this.player.playerHeight;

        this.camera.position.set(0, spawnY, 0);
        this.camera.lookAt(0, lookY, -20);
        this.player.canJump = true;
        this.player.updateTelemetryCoords();

        const config = PLANET_CONFIGS[planetName] || PLANET_CONFIGS.Aegis;
        const hudOrbit = document.getElementById('hud-orbit');
        const blocker = document.getElementById('blocker');
        const fpsHud = document.getElementById('fps-hud');
        const crosshair = document.getElementById('crosshair');
        const planetTitle = document.getElementById('planet-title');
        const planetSubtitle = document.getElementById('planet-subtitle');
        const btnReturn = document.getElementById('btn-return-orbit');

        if (hudOrbit) hudOrbit.style.display = 'none';
        if (fpsHud) fpsHud.style.display = 'none';
        if (crosshair) crosshair.style.display = 'none';
        if (blocker) blocker.style.display = 'flex';
        if (planetTitle) planetTitle.innerText = config.title;
        if (planetSubtitle) planetSubtitle.innerText = config.description;
        if (btnReturn) btnReturn.style.display = 'inline-block';
    }

    /**
     * Inicia exploração ativa na superfície (suporta Pointer Lock e fallback sem lock).
     */
    startSurfaceExploration() {
        if (this.scene.userData.currentMode !== 'FPS') return;

        this.player.setExplorationActive(true);
        try {
            const lockPromise = this.player.controls.lock();
            if (lockPromise && typeof lockPromise.catch === 'function') {
                lockPromise.catch(() => {});
            }
        } catch (_) {
            // Ambiente sem suporte pleno a Pointer Lock continua explorável pelo teclado.
        }
    }

    exitPlanetSurface() {
        if (this.player.controls.isLocked) {
            this.player.controls.unlock();
        }
        this.initGalaxySpace();
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate = () => {
        requestAnimationFrame(this.animate);
        const delta = Math.min(this.clock.getDelta(), 0.1);

        if (this.scene.userData.currentMode === 'FPS') {
            const collidables = this.activePlanet && typeof this.activePlanet.getCollidables === 'function'
                ? this.activePlanet.getCollidables()
                : [];

            if (this.player) this.player.update(delta, collidables);

            if (this.player.active && this.activePlanet && typeof this.activePlanet.update === 'function') {
                this.activePlanet.update(delta, this.player, this.gameManager);
            }
        } else if (this.scene.userData.currentMode === 'ORBIT') {
            if (this.orbitGroup && this.orbitGroup.visible) {
                this.orbitGroup.children.forEach(pivot => {
                    if (pivot.userData && pivot.userData.speed) {
                        pivot.rotation.y += pivot.userData.speed * delta;
                        if (pivot.userData.planetMesh) {
                            pivot.userData.planetMesh.rotation.y += delta * 0.8;
                        }
                    }
                });
            }
        }

        this.renderer.render(this.scene, this.camera);
    };
}

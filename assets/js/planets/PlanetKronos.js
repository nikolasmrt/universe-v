import * as THREE from 'three';

/**
 * Planeta Kronos-V: gigante metálico com gravidade extrema (2.5G) e tempestades elétricas.
 */
export class PlanetKronos {
    constructor() {
        this.group = new THREE.Group();
        this.name = 'Kronos-V';

        this.fog = new THREE.FogExp2(0x22070c, 0.011);
        this.bgColor = new THREE.Color(0x22070c);

        this.time = 0;
        this.electricLights = [];
        this.collidables = [];
        this.cores = [];
        this.particles = null;

        this.gravityModifier = 2.5;

        this.buildTerrain();
        this.buildBasaltPillars();
        this.buildCollectibles();
        this.buildAshParticles();
        this.buildLighting();
    }

    /**
     * Calcula a altitude determinística do terreno nas coordenadas (x, z).
     * @param {number} x
     * @param {number} z
     * @returns {number}
     */
    getTerrainHeight(x, z) {
        return Math.sin(x * 0.01) * 15 + Math.cos(z * 0.015) * 8;
    }

    buildTerrain() {
        const geo = new THREE.PlaneGeometry(1000, 1000, 64, 64);
        geo.rotateX(-Math.PI / 2);

        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getZ(i);
            pos.setY(i, this.getTerrainHeight(x, z));
        }
        geo.computeVertexNormals();

        const mat = new THREE.MeshStandardMaterial({
            color: 0x26080c,
            roughness: 0.78,
            metalness: 0.55
        });
        const terrainMesh = new THREE.Mesh(geo, mat);

        this.group.add(terrainMesh);
        this.collidables.push(terrainMesh);
    }

    buildBasaltPillars() {
        const pillarGeo = new THREE.CylinderGeometry(4, 4, 1, 6);
        const pillarMat = new THREE.MeshStandardMaterial({
            color: 0xff0055,
            roughness: 0.28,
            metalness: 0.85,
            emissive: 0x22000a,
            emissiveIntensity: 0.35,
            flatShading: true
        });

        let created = 0;
        while (created < 150) {
            const x = (Math.random() - 0.5) * 600;
            const z = (Math.random() - 0.5) * 600;
            if (Math.hypot(x, z) < 15) continue;

            const height = Math.random() * 55 + 12;
            const mesh = new THREE.Mesh(pillarGeo, pillarMat);

            mesh.scale.set(1, height, 1);
            const yBase = this.getTerrainHeight(x, z);

            mesh.position.set(x, yBase + height / 2, z);
            mesh.rotation.y = Math.random() * Math.PI;

            this.group.add(mesh);
            this.collidables.push(mesh);
            created += 1;
        }
    }

    buildCollectibles() {
        const coreGeo = new THREE.DodecahedronGeometry(1.8, 0);
        const coreMat = new THREE.MeshStandardMaterial({
            color: 0xffaa00,
            emissive: 0xff3366,
            emissiveIntensity: 0.95,
            roughness: 0.2,
            metalness: 0.7
        });

        const nearSpawnCoords = [
            { x: 0, z: -18 },
            { x: 15, z: -26 },
            { x: -15, z: -26 }
        ];

        for (let i = 0; i < 8; i++) {
            const mesh = new THREE.Mesh(coreGeo, coreMat);
            let x;
            let z;

            if (i < nearSpawnCoords.length) {
                x = nearSpawnCoords[i].x;
                z = nearSpawnCoords[i].z;
            } else {
                const angle = ((i - nearSpawnCoords.length) / 5) * Math.PI * 2;
                const radius = 50 + ((i * 29) % 130);
                x = Math.cos(angle) * radius;
                z = Math.sin(angle) * radius;
            }

            const baseY = this.getTerrainHeight(x, z) + 3.2;
            mesh.position.set(x, baseY, z);

            this.cores.push({
                mesh,
                baseY,
                phase: i * 1.1,
                collected: false
            });
            this.group.add(mesh);
        }
    }

    buildAshParticles() {
        const count = 350;
        const positions = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 450;
            const z = (Math.random() - 0.5) * 450;
            const y = this.getTerrainHeight(x, z) + 2 + Math.random() * 55;
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const mat = new THREE.PointsMaterial({
            color: 0xff6688,
            size: 0.9,
            transparent: true,
            opacity: 0.75
        });

        this.particles = new THREE.Points(geo, mat);
        this.group.add(this.particles);
    }

    buildLighting() {
        this.group.add(new THREE.AmbientLight(0xff3355, 0.55));

        const dirLight = new THREE.DirectionalLight(0xffb5c5, 1.25);
        dirLight.position.set(-70, 140, 80);
        this.group.add(dirLight);

        for (let i = 0; i < 4; i++) {
            const stormLight = new THREE.PointLight(0xffffff, 0, 420);
            stormLight.position.set((Math.random() - 0.5) * 400, 100, (Math.random() - 0.5) * 400);
            this.electricLights.push(stormLight);
            this.group.add(stormLight);
        }
    }

    /**
     * Restaura os núcleos magnéticos coletáveis ao revisitar Kronos-V.
     */
    reset() {
        this.time = 0;
        this.cores.forEach(c => {
            c.collected = false;
            c.mesh.visible = true;
            c.mesh.position.y = c.baseY;
            if (!this.group.children.includes(c.mesh)) {
                this.group.add(c.mesh);
            }
        });
    }

    getCollidables() {
        return this.collidables;
    }

    update(delta, playerController, gameManager) {
        this.time += delta;

        if (this.particles) {
            this.particles.rotation.y += delta * 0.04;
        }

        this.electricLights.forEach(light => {
            if (Math.random() > 0.97) {
                light.intensity = Math.random() * 8;
            } else {
                light.intensity = Math.max(0, light.intensity - delta * 15);
            }
        });

        const playerPos = playerController.camera.position;
        this.cores.forEach(core => {
            if (core.collected) return;

            core.mesh.rotation.y += delta * 1.8;
            core.mesh.rotation.z += delta * 0.7;
            core.mesh.position.y = core.baseY + Math.sin(this.time * 2.8 + core.phase) * 0.6;

            const dist = playerPos.distanceTo(core.mesh.position);
            if (dist < 4.5) {
                core.collected = true;
                this.group.remove(core.mesh);
                if (gameManager && typeof gameManager.collectItem === 'function') {
                    gameManager.collectItem(10);
                }
            }
        });
    }
}

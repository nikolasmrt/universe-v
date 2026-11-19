import * as THREE from 'three';

/**
 * Planeta Aegis-9: mundo cristalino de gravidade nominal (1.0G).
 */
export class PlanetAegis {
    constructor() {
        this.group = new THREE.Group();
        this.name = 'Aegis';

        this.fog = new THREE.FogExp2(0x001538, 0.0085);
        this.bgColor = new THREE.Color(0x001538);

        this.crystals = [];
        this.terrainMesh = null;
        this.particles = null;

        this.gravityModifier = 1.0;

        this.buildTerrain();
        this.buildCollectibles();
        this.buildAtmosphericParticles();
        this.buildLighting();
    }

    /**
     * Calcula a altitude determinística do terreno nas coordenadas (x, z).
     * @param {number} x
     * @param {number} z
     * @returns {number}
     */
    getTerrainHeight(x, z) {
        return Math.sin(x * 0.02) * Math.cos(z * 0.02) * 30 + Math.sin(x * 0.1) * 5;
    }

    buildTerrain() {
        const geo = new THREE.PlaneGeometry(1000, 1000, 128, 128);
        geo.rotateX(-Math.PI / 2);

        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getZ(i);
            pos.setY(i, this.getTerrainHeight(x, z));
        }
        geo.computeVertexNormals();

        const mat = new THREE.MeshStandardMaterial({
            color: 0x0b5ea8,
            roughness: 0.22,
            metalness: 0.78,
            flatShading: true
        });

        this.terrainMesh = new THREE.Mesh(geo, mat);
        this.group.add(this.terrainMesh);
    }

    buildCollectibles() {
        const geo = new THREE.OctahedronGeometry(1.7, 0);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x00f3ff,
            emissive: 0x00aaff,
            emissiveIntensity: 0.9,
            roughness: 0.15,
            metalness: 0.6
        });

        const nearSpawnCoords = [
            { x: 0, z: -18 },
            { x: 12, z: -28 },
            { x: -14, z: -24 }
        ];

        for (let i = 0; i < 15; i++) {
            const mesh = new THREE.Mesh(geo, mat);
            let x;
            let z;

            if (i < nearSpawnCoords.length) {
                x = nearSpawnCoords[i].x;
                z = nearSpawnCoords[i].z;
            } else {
                const angle = ((i - nearSpawnCoords.length) / 12) * Math.PI * 2;
                const radius = 45 + ((i * 23) % 140);
                x = Math.cos(angle) * radius;
                z = Math.sin(angle) * radius;
            }

            const baseY = this.getTerrainHeight(x, z) + 3.0;
            mesh.position.set(x, baseY, z);

            this.crystals.push({
                mesh,
                baseY,
                phase: i * 0.7,
                collected: false
            });
            this.group.add(mesh);
        }
    }

    buildAtmosphericParticles() {
        const particleCount = 350;
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            const x = (Math.random() - 0.5) * 450;
            const z = (Math.random() - 0.5) * 450;
            const y = this.getTerrainHeight(x, z) + 2 + Math.random() * 45;
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const mat = new THREE.PointsMaterial({
            color: 0x80f9ff,
            size: 0.9,
            transparent: true,
            opacity: 0.75
        });

        this.particles = new THREE.Points(geo, mat);
        this.group.add(this.particles);
    }

    buildLighting() {
        this.group.add(new THREE.AmbientLight(0x44bbff, 0.65));

        const dirLight = new THREE.DirectionalLight(0xd8f5ff, 1.35);
        dirLight.position.set(80, 140, 60);
        this.group.add(dirLight);

        const pointLight = new THREE.PointLight(0x00f3ff, 2.0, 350);
        pointLight.position.set(0, 90, -20);
        this.group.add(pointLight);
    }

    /**
     * Restaura todos os cristais coletáveis ao revisitar Aegis.
     */
    reset() {
        this.crystals.forEach(c => {
            c.collected = false;
            c.mesh.visible = true;
            c.mesh.position.y = c.baseY;
            if (!this.group.children.includes(c.mesh)) {
                this.group.add(c.mesh);
            }
        });
    }

    getCollidables() {
        return [this.terrainMesh];
    }

    update(delta, playerController, gameManager) {
        const playerPos = playerController.camera.position;
        const elapsed = Date.now() * 0.0025;

        if (this.particles) {
            this.particles.rotation.y += delta * 0.03;
        }

        this.crystals.forEach(c => {
            if (c.collected) return;

            c.mesh.rotation.y += delta * 1.4;
            c.mesh.rotation.x += delta * 0.4;
            c.mesh.position.y = c.baseY + Math.sin(elapsed + c.phase) * 0.65;

            const dist = playerPos.distanceTo(c.mesh.position);
            if (dist < 4.5) {
                c.collected = true;
                this.group.remove(c.mesh);
                if (gameManager && typeof gameManager.collectItem === 'function') {
                    gameManager.collectItem();
                }
            }
        });
    }
}

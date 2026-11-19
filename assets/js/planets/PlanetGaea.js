import * as THREE from 'three';

/**
 * Planeta Bio-Gaea: biosfera mutante de gravidade leve (0.6G) e atmosfera tóxica.
 */
export class PlanetGaea {
    constructor() {
        this.group = new THREE.Group();
        this.name = 'Bio-Gaea';

        this.fog = new THREE.FogExp2(0x02240d, 0.014);
        this.bgColor = new THREE.Color(0x02240d);

        this.spores = [];
        this.samples = [];
        this.particles = null;
        this.time = 0;

        this.gravityModifier = 0.6;
        this.terrainMesh = null;

        this.buildTerrain();
        this.buildSpores();
        this.buildCollectibles();
        this.buildPollenParticles();
        this.buildLighting();
    }

    /**
     * Calcula a altitude determinística do terreno nas coordenadas (x, z).
     * @param {number} x
     * @param {number} z
     * @returns {number}
     */
    getTerrainHeight(x, z) {
        return Math.sin(x * 0.04) * Math.cos(z * 0.04) * 15;
    }

    buildTerrain() {
        const geo = new THREE.PlaneGeometry(800, 800, 64, 64);
        geo.rotateX(-Math.PI / 2);

        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getZ(i);
            pos.setY(i, this.getTerrainHeight(x, z));
        }
        geo.computeVertexNormals();

        const mat = new THREE.MeshStandardMaterial({
            color: 0x0b3b18,
            roughness: 0.85,
            flatShading: false
        });

        this.terrainMesh = new THREE.Mesh(geo, mat);
        this.group.add(this.terrainMesh);
    }

    buildSpores() {
        const sporeGeo = new THREE.IcosahedronGeometry(3.6, 1);
        const sporeMat = new THREE.MeshStandardMaterial({
            color: 0x00ff66,
            emissive: 0x005522,
            emissiveIntensity: 0.85,
            roughness: 0.45
        });

        for (let i = 0; i < 80; i++) {
            const mesh = new THREE.Mesh(sporeGeo, sporeMat);
            let x = (Math.random() - 0.5) * 380;
            let z = (Math.random() - 0.5) * 380;
            if (Math.hypot(x, z) < 10) {
                x += 16;
                z -= 16;
            }
            const y = this.getTerrainHeight(x, z) + 2.8;

            mesh.position.set(x, y, z);
            this.spores.push({ mesh, randomOffset: Math.random() * Math.PI * 2 });
            this.group.add(mesh);
        }
    }

    buildCollectibles() {
        const sampleGeo = new THREE.OctahedronGeometry(1.5, 1);
        const sampleMat = new THREE.MeshStandardMaterial({
            color: 0x2bffd5,
            emissive: 0x00ffaa,
            emissiveIntensity: 1.0,
            roughness: 0.2
        });

        const nearSpawnCoords = [
            { x: 0, z: -16 },
            { x: -12, z: -25 },
            { x: 14, z: -22 }
        ];

        for (let i = 0; i < 10; i++) {
            const mesh = new THREE.Mesh(sampleGeo, sampleMat);
            let x;
            let z;

            if (i < nearSpawnCoords.length) {
                x = nearSpawnCoords[i].x;
                z = nearSpawnCoords[i].z;
            } else {
                const angle = ((i - nearSpawnCoords.length) / 7) * Math.PI * 2;
                const radius = 38 + ((i * 19) % 120);
                x = Math.cos(angle) * radius;
                z = Math.sin(angle) * radius;
            }

            const baseY = this.getTerrainHeight(x, z) + 3.2;
            mesh.position.set(x, baseY, z);

            this.samples.push({
                mesh,
                baseY,
                phase: i * 0.9,
                collected: false
            });
            this.group.add(mesh);
        }
    }

    buildPollenParticles() {
        const count = 400;
        const positions = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 400;
            const z = (Math.random() - 0.5) * 400;
            const y = this.getTerrainHeight(x, z) + 1.5 + Math.random() * 30;
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const mat = new THREE.PointsMaterial({
            color: 0x66ffaa,
            size: 0.85,
            transparent: true,
            opacity: 0.7
        });

        this.particles = new THREE.Points(geo, mat);
        this.group.add(this.particles);
    }

    buildLighting() {
        this.group.add(new THREE.AmbientLight(0x33ff88, 0.55));
        const dirLight = new THREE.DirectionalLight(0xc8ffd8, 1.3);
        dirLight.position.set(50, 110, 50);
        this.group.add(dirLight);
    }

    /**
     * Restaura as amostras coletáveis ao revisitar Bio-Gaea.
     */
    reset() {
        this.time = 0;
        this.samples.forEach(s => {
            s.collected = false;
            s.mesh.visible = true;
            s.mesh.position.y = s.baseY;
            if (!this.group.children.includes(s.mesh)) {
                this.group.add(s.mesh);
            }
        });
    }

    getCollidables() {
        return [this.terrainMesh];
    }

    update(delta, playerController, gameManager) {
        this.time += delta;

        this.spores.forEach(spore => {
            const scale = 1 + Math.sin(this.time * 2 + spore.randomOffset) * 0.15;
            spore.mesh.scale.set(scale, scale, scale);
        });

        if (this.particles) {
            this.particles.rotation.y -= delta * 0.025;
        }

        const playerPos = playerController.camera.position;
        this.samples.forEach(sample => {
            if (sample.collected) return;

            sample.mesh.rotation.y += delta * 1.6;
            sample.mesh.position.y = sample.baseY + Math.sin(this.time * 2.5 + sample.phase) * 0.55;

            const dist = playerPos.distanceTo(sample.mesh.position);
            if (dist < 4.5) {
                sample.collected = true;
                this.group.remove(sample.mesh);
                if (gameManager && typeof gameManager.collectItem === 'function') {
                    gameManager.collectItem(15);
                }
            }
        });

        if (gameManager && typeof gameManager.takeDamage === 'function') {
            gameManager.takeDamage(2 * delta);
        }
    }
}

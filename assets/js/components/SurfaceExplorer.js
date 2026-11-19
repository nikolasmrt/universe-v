import * as THREE from 'three';

export class SurfaceExplorer {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.surfaceGroup = new THREE.Group();
        this.active = false;
        
        this.moveState = { forward: false, backward: false, left: false, right: false };
        this.initTerrain();
        this.initListeners();
    }

    initTerrain() {
        const geometry = new THREE.PlaneGeometry(500, 500, 128, 128);
        geometry.rotateX(-Math.PI / 2);

        const pos = geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const vx = pos.getX(i);
            const vz = pos.getZ(i);
            pos.setY(i, Math.sin(vx * 0.05) * Math.cos(vz * 0.05) * 8 + Math.sin(vx * 0.2) * 2);
        }
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({ 
            color: 0x0a0a1a, 
            roughness: 0.85,
            flatShading: true 
        });

        this.terrain = new THREE.Mesh(geometry, material);
        this.surfaceGroup.add(this.terrain);

        const ambient = new THREE.AmbientLight(0x00f3ff, 0.7);
        this.surfaceGroup.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
        dirLight.position.set(100, 300, 100);
        this.surfaceGroup.add(dirLight);

        this.surfaceGroup.visible = false;
        this.scene.add(this.surfaceGroup);
    }

    initListeners() {
        window.addEventListener('keydown', (e) => {
            if (!this.active) return;
            switch (e.code) {
                case 'KeyW': case 'ArrowUp': this.moveState.forward = true; break;
                case 'KeyS': case 'ArrowDown': this.moveState.backward = true; break;
                case 'KeyA': case 'ArrowLeft': this.moveState.left = true; break;
                case 'KeyD': case 'ArrowRight': this.moveState.right = true; break;
            }
        });

        window.addEventListener('keyup', (e) => {
            if (!this.active) return;
            switch (e.code) {
                case 'KeyW': case 'ArrowUp': this.moveState.forward = false; break;
                case 'KeyS': case 'ArrowDown': this.moveState.backward = false; break;
                case 'KeyA': case 'ArrowLeft': this.moveState.left = false; break;
                case 'KeyD': case 'ArrowRight': this.moveState.right = false; break;
            }
        });
    }

    enter() {
        this.active = true;
        this.surfaceGroup.visible = true;
        this.camera.position.set(0, 5, 20);
        this.camera.lookAt(0, 5, 0);
    }

    exit() {
        this.active = false;
        this.surfaceGroup.visible = false;
    }

    update() {
        if (!this.active) return;

        const speed = 0.6;
        const forwardVector = new THREE.Vector3();
        this.camera.getWorldDirection(forwardVector);
        forwardVector.y = 0; // Trava no plano horizontal
        forwardVector.normalize();

        const sideVector = new THREE.Vector3();
        sideVector.crossVectors(this.camera.up, forwardVector).normalize();

        if (this.moveState.forward) this.camera.position.addScaledVector(forwardVector, speed);
        if (this.moveState.backward) this.camera.position.addScaledVector(forwardVector, -speed);
        if (this.moveState.left) this.camera.position.addScaledVector(sideVector, speed);
        if (this.moveState.right) this.camera.position.addScaledVector(sideVector, -speed);
    }
}
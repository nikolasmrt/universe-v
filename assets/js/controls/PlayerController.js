import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

/**
 * Controlador de primeira pessoa responsável por movimento, gravidade e colisão com o terreno.
 */
export class PlayerController {
    constructor(camera, domElement, scene, gameManager) {
        this.camera = camera;
        this.controls = new PointerLockControls(camera, domElement);
        this.scene = scene;
        this.gameManager = gameManager;

        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.moveState = { forward: false, backward: false, left: false, right: false, sprint: false };

        this.active = false;
        this.canJump = false;

        this.baseGravity = 30.0;
        this.currentGravity = this.baseGravity;
        this.jumpForce = 15.0;
        this.baseSpeed = 20.0;
        this.playerHeight = 3.0;

        this.headBobTimer = 0;

        this.raycaster = new THREE.Raycaster();
        this.downVector = new THREE.Vector3(0, -1, 0);

        this.initEvents();
    }

    initEvents() {
        this.controls.addEventListener('lock', () => {
            this.setExplorationActive(true);
        });

        this.controls.addEventListener('unlock', () => {
            if (this.scene.userData.currentMode === 'FPS') {
                this.setExplorationActive(false, true);
            } else {
                this.setExplorationActive(false, false);
            }
        });

        document.addEventListener('keydown', (e) => this.handleKey(e.code, true));
        document.addEventListener('keyup', (e) => this.handleKey(e.code, false));
    }

    /**
     * Alterna visibilidade de HUD/overlay e estado ativo de exploração FPS.
     * @param {boolean} active
     * @param {boolean} showPauseBlocker
     */
    setExplorationActive(active, showPauseBlocker = false) {
        this.active = active;

        if (typeof document === 'undefined') return;

        const blocker = document.getElementById('blocker');
        const fpsHud = document.getElementById('fps-hud');
        const crosshair = document.getElementById('crosshair');
        const btnOrbit = document.getElementById('btn-return-orbit');

        if (active) {
            if (blocker) blocker.style.display = 'none';
            if (fpsHud) fpsHud.style.display = 'block';
            if (crosshair) crosshair.style.display = 'block';
            if (btnOrbit) btnOrbit.style.display = 'inline-block';
        } else {
            if (fpsHud) fpsHud.style.display = 'none';
            if (crosshair) crosshair.style.display = 'none';
            if (blocker) blocker.style.display = showPauseBlocker ? 'flex' : 'none';
            if (btnOrbit) btnOrbit.style.display = showPauseBlocker ? 'inline-block' : 'none';
            this.clearMoveState();
        }
    }

    clearMoveState() {
        this.moveState.forward = false;
        this.moveState.backward = false;
        this.moveState.left = false;
        this.moveState.right = false;
        this.moveState.sprint = false;
    }

    /**
     * Zera velocidades e estado de entrada ao trocar de planeta ou voltar à órbita.
     */
    resetState() {
        this.velocity.set(0, 0, 0);
        this.direction.set(0, 0, 0);
        this.headBobTimer = 0;
        this.canJump = false;
        this.clearMoveState();
        this.active = false;
    }

    handleKey(code, isPressed) {
        switch (code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveState.forward = isPressed;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.moveState.left = isPressed;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.moveState.backward = isPressed;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.moveState.right = isPressed;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.moveState.sprint = isPressed;
                break;
            case 'Space':
                if (isPressed && this.active && this.canJump) {
                    this.velocity.y = this.jumpForce;
                    this.canJump = false;
                }
                break;
            case 'Escape':
                if (isPressed && this.active && this.scene.userData.currentMode === 'FPS') {
                    if (!this.controls.isLocked) {
                        this.setExplorationActive(false, true);
                    }
                }
                break;
        }
    }

    updateTelemetryCoords() {
        if (typeof document === 'undefined') return;
        const coordsEl = document.getElementById('hud-telemetry-coords');
        if (!coordsEl) return;

        const { x, y, z } = this.camera.position;
        const speed = Math.hypot(this.velocity.x, this.velocity.z);
        coordsEl.textContent = `POS: (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}) | VEL: ${speed.toFixed(1)} m/s`;
    }

    update(delta, collidableMeshes = []) {
        if (!this.active) return;

        this.velocity.x -= this.velocity.x * 10.0 * delta;
        this.velocity.z -= this.velocity.z * 10.0 * delta;
        this.velocity.y -= this.currentGravity * delta;

        this.direction.z = Number(this.moveState.forward) - Number(this.moveState.backward);
        this.direction.x = Number(this.moveState.right) - Number(this.moveState.left);
        this.direction.normalize();

        const currentSpeed = this.moveState.sprint ? this.baseSpeed * 1.8 : this.baseSpeed;

        if (this.moveState.forward || this.moveState.backward) {
            this.velocity.z -= this.direction.z * currentSpeed * delta;
        }
        if (this.moveState.left || this.moveState.right) {
            this.velocity.x -= this.direction.x * currentSpeed * delta;
        }

        this.controls.moveRight(-this.velocity.x * delta);
        this.controls.moveForward(-this.velocity.z * delta);
        this.camera.position.y += this.velocity.y * delta;

        if ((this.moveState.forward || this.moveState.backward || this.moveState.left || this.moveState.right) && this.canJump) {
            this.headBobTimer += delta * (this.moveState.sprint ? 15 : 10);
            this.camera.position.y += Math.sin(this.headBobTimer) * 0.05;
        }

        if (collidableMeshes.length > 0) {
            const rayOrigin = new THREE.Vector3(
                this.camera.position.x,
                this.camera.position.y + 10,
                this.camera.position.z
            );
            this.raycaster.set(rayOrigin, this.downVector);

            const intersects = this.raycaster.intersectObjects(collidableMeshes, false);

            if (intersects.length > 0) {
                const groundHeight = intersects[0].point.y;

                if (this.camera.position.y < groundHeight + this.playerHeight) {
                    this.camera.position.y = groundHeight + this.playerHeight;
                    this.velocity.y = 0;
                    this.canJump = true;
                }
            }
        }

        this.updateTelemetryCoords();
    }
}

import * as THREE from 'three';

/**
 * Fábrica responsável pelas definições orbitais e visuais dos planetas.
 */
export class PlanetFactory {
    static createPlanets() {
        return [
            {
                key: 'Aegis',
                name: 'Aegis-9 (O Cristalino)',
                type: 'Mundo Cristalino Refletivo',
                radius: 2.5,
                distance: 22,
                speed: 0.45,
                colorHex: '#00f3ff',
                gravity: '1.0G (Nominal)',
                hazard: 'Estável',
                geometry: new THREE.OctahedronGeometry(2.5, 0),
                material: new THREE.MeshStandardMaterial({
                    color: 0x00f3ff,
                    roughness: 0.1,
                    metalness: 0.85,
                    emissive: 0x003355,
                    emissiveIntensity: 0.5,
                    flatShading: true
                }),
                description: 'Planeta composto por estruturas cristalinas prismáticas que refratam a luz estelar.'
            },
            {
                key: 'Gaea',
                name: 'Bio-Gaea (O Mutante)',
                type: 'Biosfera Bioluminescente',
                radius: 3.2,
                distance: 36,
                speed: 0.28,
                colorHex: '#00ff66',
                gravity: '0.6G (Baixa)',
                hazard: 'Atmosfera Tóxica (-2 HP/s)',
                geometry: new THREE.IcosahedronGeometry(3.2, 1),
                material: new THREE.MeshStandardMaterial({
                    color: 0x00ff66,
                    roughness: 0.65,
                    metalness: 0.15,
                    emissive: 0x00441a,
                    emissiveIntensity: 0.65,
                    flatShading: true
                }),
                description: 'Mundo coberto por biomas mutantes que pulsam energia no vácuo e exigem coleta de amostras.'
            },
            {
                key: 'Kronos',
                name: 'Kronos-V (O Abissal)',
                type: 'Gigante Magnético de Ferro',
                radius: 4.2,
                distance: 52,
                speed: 0.16,
                colorHex: '#ff0055',
                gravity: '2.5G (Extrema)',
                hazard: 'Tempestade Eletromagnética',
                geometry: new THREE.DodecahedronGeometry(4.2, 0),
                material: new THREE.MeshStandardMaterial({
                    color: 0xff0055,
                    roughness: 0.25,
                    metalness: 0.9,
                    emissive: 0x3a0014,
                    emissiveIntensity: 0.5,
                    flatShading: true
                }),
                description: 'Núcleo planetário exposto gerando tempestades eletromagnéticas colossais e gravidade extrema.'
            }
        ];
    }
}

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { merge } from "../helpers/merge.js";
import {CylinderHelper} from "../helpers/cylinder_helper.js";
import {BoxHelper} from "../helpers/box_helper.js";
/*
 * parameters = {
 *  url: String,
 *  credits: String,
 *  scale: Vector3,
 *  helpersColor: Color,
 *  walkingSpeed: Float,
 *  defaultDirection: Float,_
 *  turningSpeed: Float,
 *  runningFactor: Float,
 *  keyCodes: { realisticViewMode: String, fixedView: String, firstPersonView: String, thirdPersonView: String, topView: String, miniMap: String, statistics: String, userInterface: String, help: String, boundingVolumes: String, ambientLight: String, directionalLight: String, spotLight: String, flashLight: String, shadows: String, fog: String, left: String, right: String, backward: String, forward: String, jump: String, yes: String, no: String, wave: String, punch: String, thumbsUp: String }
 * }
 */
export default class Player extends THREE.Group {
    constructor(parameters) {
        super();
        merge(this, parameters);

        // Convert default direction from degrees to radians
        this.defaultDirection = THREE.MathUtils.degToRad(this.defaultDirection);

        // Initialize keyboard key states
        this.keyStates = { realisticViewMode: false, fixedView: false, firstPersonView: false, thirdPersonView: false, topView: false, miniMap: false, statistics: false, userInterface: false, help: false, boundingVolumes: false, ambientLight: false, directionalLight: false, spotLight: false, flashLight: false, shadows: false, fog: false, left: false, right: false, backward: false, forward: false, jump: false, yes: false, no: false, wave: false, punch: false, thumbsUp: false, shiftKey: false };

        this.loaded = false;

        this.onLoad = function (description) {
            /*description.scene.traverse(child => {
                console.log(child.name);
            });*/
            this.add(description.scene);
            this.animations = description.animations;

            // Get the object's axis-aligned bounding box (AABB) in 3D space
            const aabb = new THREE.Box3();
            aabb.setFromObject(this); // This function may result in a larger box than strictly necessary: https://threejs.org/docs/#api/en/math/Box3.setFromObject

            // Compute the object size
            this.size = new THREE.Vector3();
            aabb.getSize(this.size);

            // Adjust the object's oversized dimensions (hard-coded; see previous comments)
            this.size.x = 3.0;
            this.size.y = 4.4;
            this.size.z = 2.6;

            this.size.multiply(this.scale);

            // Compute the object's half size (required by collision detection method OBB/AABB) and radius (required by collision detection method BC/AABB)
            this.halfSize = this.size.clone().divideScalar(2.0);
            this.radius = (this.halfSize.x + this.halfSize.z) / 2.0;

            // Get the objects's body, face and head end
            this.body = this.getObjectByName("SK_BoxyBoomo"); // When visible, collision helpers are children of the body
            this.face = this.getObjectByName("head_main_JNT_055"); // Required for computing the target of flashlight, first-person, third-person, and top-view cameras
            this.headEnd = this.getObjectByName("head_main_JNT_055"); // Required by realistic view mode

            // Compute the body position and scale in world space
            this.body.worldPosition = new THREE.Vector3();
            this.body.worldScale = new THREE.Vector3();

            this.body.getWorldPosition(this.body.worldPosition);
            this.body.getWorldScale(this.body.worldScale);

            // Compute the face position in world space
            this.face.worldPosition = new THREE.Vector3();
            this.face.getWorldPosition(this.face.worldPosition);

            // Create the collision helpers, and set their positions and sizes
            this.cylinderHelper = new CylinderHelper(this.helpersColor); // Bounding cylinder
            this.cylinderHelper.position.set((0.0 - this.body.worldPosition.x) / this.body.worldScale.x, (this.halfSize.y - this.body.worldPosition.y) / this.body.worldScale.y, (0.0 - this.body.worldPosition.z) / this.body.worldScale.z);
            this.cylinderHelper.scale.set(this.radius / this.body.worldScale.x, this.halfSize.y / this.body.worldScale.y, this.radius / this.body.worldScale.z);
            this.boxHelper = new BoxHelper(this.helpersColor); // Oriented bounding box
            this.boxHelper.position.set((0.0 - this.body.worldPosition.x) / this.body.worldScale.x, (this.halfSize.y - this.body.worldPosition.y) / this.body.worldScale.y, (0.0 - this.body.worldPosition.z) / this.body.worldScale.z);
            this.boxHelper.scale.set(this.halfSize.x / this.body.worldScale.x, this.halfSize.y / this.body.worldScale.y, this.halfSize.z / this.body.worldScale.z);

            // Turn on shadows for this object
            this.setShadow();

            this.loaded = true;
        }

        const onProgress = function (url, xhr) {
            console.log("Resource '" + url + "' " + (100.0 * xhr.loaded / xhr.total).toFixed(0) + "% loaded.");
        }

        const onError = function (url, error) {
            console.error("Error loading resource '" + url + "' (" + error + ").");
        }

        // Create a resource .gltf or .glb file loader
        const loader = new GLTFLoader();

        // Load a model description resource file
        loader.load(
            //Resource URL
            this.url,

            // onLoad callback
            description => this.onLoad(description),

            // onProgress callback
            xhr => onProgress(this.url, xhr),

            // onError callback
            error => onError(this.url, error)
        );
    }

    setShadow() {
        this.traverseVisible(child => { // Modifying the scene graph inside the callback is discouraged: https://threejs.org/docs/index.html?q=object3d#api/en/core/Object3D.traverseVisible
            if (child instanceof THREE.Object3D) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }

    isInElevatorCell() {
        // Get the player's current cell coordinates
        const playerCell = this.cartesianToCell(this.position);

        // Check if the cell has an elevator value (6, 7, 10, or 11)
        const cellValue = this.floorPlan.map[playerCell[0]][playerCell[1]];

        return [6, 7, 10, 11].includes(cellValue);
    }
}

export const playerController = {
    url: "/player/puppyModel/project_playtime_boxy_boo.glb",
    credits: "Model created by <a href='https://sketchfab.com/3d-models/project-playtime-boxy-boo-ce0d9aa6de2140ecaf6d4b9c2d96820a' target='_blank' rel='noopener'>RaySharkG1</a>",
    scale: new THREE.Vector3(0.25, 0.25, 0.25),
    helpersColor: new THREE.Color(0xffffff),
    walkingSpeed: 0.75,
    defaultDirection: 0.0, // Expressed in degrees
    turningSpeed: 75.0, // Expressed in degrees / second
    runningFactor: 2.5, // Affects walking speed and turning speed
    keyCodes: {
        realisticViewMode: "Digit1", fixedView: "Digit2", firstPersonView: "Digit3", thirdPersonView: "Digit4", topView: "Digit5", miniMap: "KeyM",
        statistics: "KeyZ", userInterface: "KeyU", help: "KeyH",
        boundingVolumes: "KeyB", spotLight: "KeyG", flashLight: "KeyF",
        /*ambientLight: "KeyL", directionalLight: "KeyP", shadows: "", fog: "", */
        left: "KeyA", right: "KeyD", backward: "KeyS", forward: "KeyW", jump: "Space",
        /* emotes should be used by accessing side menu instead of keyCodes */
        yes: "Y", no: "N", wave: "", punch: "", thumbsUp: "" }
}
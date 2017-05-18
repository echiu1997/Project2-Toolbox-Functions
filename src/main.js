const THREE = require('three'); // older modules are imported like this. You shouldn't have to worry about this much
import Framework from './framework'
const OBJLoader = require('three-obj-loader')(THREE)

var startTime = Date.now();
var featherGeo;
var featherMatrix = [];
var allMeshes = new Set();

var smithLoaded = new Promise((resolve, reject) => {
    (new THREE.OBJLoader()).load(require('./assets/smith.obj'), function(obj) {
        var smith = new THREE.Geometry().fromBufferGeometry(obj.children[0].geometry);
        smith.computeBoundingSphere();
        //do these 3 steps to smooth the object out
        smith.computeFaceNormals();
        smith.mergeVertices();
        smith.computeVertexNormals();
        resolve(smith);
    });
});

var featherLoaded = new Promise((resolve, reject) => {
    (new THREE.OBJLoader()).load(require('./assets/feather.obj'), function(obj) {
        var feather = obj.children[0].geometry;
        feather.computeBoundingSphere();
        resolve(feather);
    });
});

///////////////////////////SLIDERS///////////////////////////////

var Sliders = function() {
  this.curvature = 0.5;
  this.orientation = 70.0;
  this.size = 1.0;
  this.distribution = 1.5;
  this.turbulence = 1.0;
  this.flapspeed = 1.0;
  this.flapmotion = 2.0;
};
var sliders = new Sliders();

/////////////////////////TOOLBOX FUNCTIONS////////////////////////////

function bias(b, t) {
    return Math.pow(t, Math.log(b) / Math.log(0.5));
}

function gain(g, t) {
    if (t < 0.5)
        return bias(1.0 - g, 2.0*t) / 2; 
    else 
        return 1 - bias(1.0 - g, 2.0 - 2.0*t) / 2;
}

function sin(freq, x, t) {
    return Math.sin(freq * (x+t));
}

/////////////////////////////////////////////////////////////////////

// called after the scene loads
function onLoad(framework) {
    var scene = framework.scene;
    var camera = framework.camera;
    var renderer = framework.renderer;
    var gui = framework.gui;
    var stats = framework.stats;
    var controls = framework.controls;

    // Set light
    var directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );
    directionalLight.color.setHSL(0.1, 1, 1);
    directionalLight.position.set(1, 3, 2);
    directionalLight.position.multiplyScalar(10);
    scene.add(directionalLight);

    // set camera position and rotation point
    camera.position.set(0, 15, 20);
    camera.lookAt(new THREE.Vector3(0, 2, -3));
    controls.target.set(0, 2, -3);

    //add smith head to scene
    smithLoaded.then(function(smith) {
        /*
        var smithMaterial = new THREE.MeshStandardMaterial({map: new THREE.TextureLoader().load('../assets/smithtexture.bmp')});
        smithMaterial.normalMap = new THREE.TextureLoader().load('../assets/smithnormal.jpg');
        smithMaterial.roughness = 1;
        smithMaterial.metalness = 0;
        */
        var smithMaterial = new THREE.ShaderMaterial( {
            uniforms: {
                normalMap: { type: "t", value: new THREE.TextureLoader().load('./assets/smithnormal.jpg') },
                u_useNormalMap : { type: 'i', value: true },
                texture: { type: "t", value: new THREE.TextureLoader().load('./assets/smithtexture.bmp') },
                u_useTexture: { type: 'i', value: true },
                u_albedo: { type: 'v3', value: new THREE.Vector3(1, 1, 1) },
                u_ambient: { type: 'f', value: 0.2 },
                u_lightPos: { type: 'v3', value: new THREE.Vector3(30, 50, 40) },
                u_lightCol: { type: 'v3', value: new THREE.Vector3(1, 1, 1) },
                u_lightIntensity: { type: 'f', value: 1.0 }
            },
            vertexShader: require('./shaders/iridescence-vert.glsl'),
            fragmentShader: require('./shaders/iridescence-frag.glsl')
        });
        var mesh = new THREE.Mesh( smith, smithMaterial);
        scene.add(mesh);
    });

    initializeFeathers(framework);

    //add sliders for user to adjust
    // more information here: https://workshop.chromeexperiments.com/examples/gui/#1--Basic-Usage
    gui.add(sliders, 'curvature', 0.0, 1.0).step(0.1).onChange(function(newVal) {initializeFeathers(framework)} );
    gui.add(sliders, 'orientation', 50.0, 70.0).step(1.0).onChange(function(newVal) {initializeFeathers(framework)} );
    gui.add(sliders, 'size', 1.0, 2.0).step(0.1).onChange(function(newVal) {initializeFeathers(framework)} );
    gui.add(sliders, 'distribution', 1.0, 2.0).step(0.1).onChange(function(newVal) {initializeFeathers(framework)} );
    gui.add(sliders, 'turbulence', 0.5, 1.5).step(0.1).onChange(function(newVal) {initializeFeathers(framework)} );
    gui.add(sliders, 'flapspeed', 0.0, 1.5).step(0.1).onChange(function(newVal) {initializeFeathers(framework)} );
    gui.add(sliders, 'flapmotion', 1.0, 3.0).step(0.5).onChange(function(newVal) {initializeFeathers(framework)} );
}

function initializeFeathers(framework) {

    //disposes all meshses in scene
    for (var mesh of allMeshes) {
      //mesh.material.dispose();
      //mesh.geometry.dispose();
      framework.scene.remove(mesh);
      //framework.renderer.deallocateObject( mesh );
    }

    featherLoaded.then(function(feather) {   
        //initialize global variable featherGeo to feather
        featherGeo = feather; 

        for (var layer = 0.0; layer <= 1.0; layer += 0.5) {

            //interpolate feather scaling base for each layer, numbers chosen myself
            var scaleBase = 1.0 * (1.0 - layer) + 0.5 * layer;
            //interpolate feather scaling factor (max scaling), numbers chosen myself
            var scaleFactor = (2.0*sliders.size) * (1.0 - layer) + (0.5*sliders.size) * layer;
            //interpolate feather distribution, numbers chosen myself
            var featherDistribution = (0.04/sliders.distribution) * (1.0 - layer) + (0.02/sliders.distribution) * layer;
            //interpolate feather color darkness
            var darkness = 0.6 * (1.0 - layer) + 1.0 * layer;

            var featherMaterial = new THREE.ShaderMaterial( {
                uniforms: {
                    normalMap: { type: "t", value: null },
                    u_useNormalMap : { type: 'i', value: false },
                    texture: { type: "t", value: new THREE.TextureLoader().load('../assets/feathertexture.jpg') },
                    u_useTexture: { type: 'i', value: true },
                    u_albedo: { type: 'v3', value: new THREE.Vector3(darkness, darkness, darkness) },
                    u_ambient: { type: 'f', value: 0.2 },
                    u_lightPos: { type: 'v3', value: new THREE.Vector3(30, 50, 40) },
                    u_lightCol: { type: 'v3', value: new THREE.Vector3(1, 1, 1) },
                    u_lightIntensity: { type: 'f', value: 1.0 }
                },
                vertexShader: require('./shaders/iridescence-vert.glsl'),
                fragmentShader: require('./shaders/iridescence-frag.glsl')
            });

            for (var i = 0.0; i <= 1.0; i += featherDistribution) {
                var featherMesh = new THREE.Mesh(featherGeo, featherMaterial);
                featherMesh.name = "feather";
                featherMatrix[layer*10.0+i] = new THREE.Matrix4();
                var scalar = scaleBase + gain(0.5, i)*scaleFactor;
                featherMesh.scale.set(scalar, scalar, scalar);
                framework.scene.add(featherMesh);
                allMeshes.add(featherMesh);
            }
        }

        for (var layer = 0.0; layer <= 1.0; layer += 0.5) {

            //interpolate feather scaling base for each layer, numbers chosen myself
            var scaleBase = 1.0 * (1.0 - layer) + 0.5 * layer;
            //interpolate feather scaling factor (max scaling), numbers chosen myself
            var scaleFactor = (2.0*sliders.size) * (1.0 - layer) + (0.5*sliders.size) * layer;
            //interpolate feather distribution, numbers chosen myself
            var featherDistribution = (0.04/sliders.distribution) * (1.0 - layer) + (0.02/sliders.distribution) * layer;
            //interpolate feather color darkness
            var darkness = 0.6 * (1.0 - layer) + 1.0 * layer;

            var featherMaterial = new THREE.ShaderMaterial( {
                uniforms: {
                    normalMap: { type: "t", value: null },
                    u_useNormalMap : { type: 'i', value: false },
                    texture: { type: "t", value: new THREE.TextureLoader().load('../assets/feathertexture.jpg') },
                    u_useTexture: { type: 'i', value: true },
                    u_albedo: { type: 'v3', value: new THREE.Vector3(darkness, darkness, darkness) },
                    u_ambient: { type: 'f', value: 0.2 },
                    u_lightPos: { type: 'v3', value: new THREE.Vector3(30, 50, 40) },
                    u_lightCol: { type: 'v3', value: new THREE.Vector3(1, 1, 1) },
                    u_lightIntensity: { type: 'f', value: 1.0 }
                },
                vertexShader: require('./shaders/iridescence-vert.glsl'),
                fragmentShader: require('./shaders/iridescence-frag.glsl')
            });

            for (var i = 0.0; i <= 1.0; i += featherDistribution) {
                var featherMesh = new THREE.Mesh(featherGeo, featherMaterial);
                featherMesh.name = "feather";
                featherMatrix[(layer+2.0)*10.0+i] = new THREE.Matrix4();
                var scalar = scaleBase + gain(0.5, i)*scaleFactor;
                featherMesh.scale.set(scalar, scalar, scalar);
                framework.scene.add(featherMesh);
                allMeshes.add(featherMesh);
            }
        }     

    });

}

// called on frame updates
function onUpdate(framework) {

    //LEFT WING
    //bottom curve
    var curveA = new THREE.CubicBezierCurve3(
        new THREE.Vector3( 0, 0, -5 ),
        new THREE.Vector3( -2 - 2.0 * sliders.curvature, 0, 0 ),
        new THREE.Vector3( 2 + 2.0 * sliders.curvature, sliders.flapmotion * sin(2, 0, (sliders.flapspeed * 0.003) * (Date.now()-startTime)), 0 ),
        new THREE.Vector3( 0, sliders.flapmotion*1.1*sin(2, 0, (sliders.flapspeed * 0.003) * (Date.now()-startTime)) - 0.3*sliders.flapmotion, 5 )
    );
    //top curve
    var curveB = new THREE.CubicBezierCurve3(
        new THREE.Vector3( 0, 0.1, -5 ),
        new THREE.Vector3( -2 - sliders.curvature * 0.5, 1, 0 ),
        new THREE.Vector3( 2 + 2.0 * sliders.curvature, sliders.flapmotion * sin(2, 0, (sliders.flapspeed * 0.003) * (Date.now()-startTime)) + 0.2, 0 ),
        new THREE.Vector3( 0, sliders.flapmotion*sin(2, 0, (sliders.flapspeed * 0.003) * (Date.now()-startTime)), 5 )
    );

    //RIGHT WING
    //bottom curve
    var curveC = new THREE.CubicBezierCurve3(
        new THREE.Vector3( 0, 0, -5 ),
        new THREE.Vector3( 2.0 + 2.0 * sliders.curvature, 0, 0 ),
        new THREE.Vector3( -2.0 - 2.0 * sliders.curvature, sliders.flapmotion * sin(2, 0, (sliders.flapspeed * 0.003) * (Date.now()-startTime)), 0 ),
        new THREE.Vector3( 0, sliders.flapmotion*1.1*sin(2, 0, (sliders.flapspeed * 0.003) * (Date.now()-startTime)) - 0.3*sliders.flapmotion, 5 )
    );
    //top curve
    var curveD = new THREE.CubicBezierCurve3(
        new THREE.Vector3( 0, 0.1, -5 ),
        new THREE.Vector3( 2.0 + 2.0 * sliders.curvature, 1, 0 ),
        new THREE.Vector3( -2.0 - 2.0 * sliders.curvature, sliders.flapmotion * sin(2, 0, (sliders.flapspeed * 0.003) * (Date.now()-startTime)) + 0.2, 0 ),
        new THREE.Vector3( 0, sliders.flapmotion*sin(2, 0, (sliders.flapspeed * 0.003) * (Date.now()-startTime)), 5 )
    );

    var layer = 0.0;
    var j = 0.0;
    var layer2 = 0.0;
    var k = 0.0;
    for (var i = 0; i < framework.scene.children.length; i++) {

        if (framework.scene.children[i].name === "feather" && layer <= 1.0) {

            //interpolate feather scaling base for each layer, numbers chosen myself
            var scaleBase = 1.0 * (1.0 - layer) + 0.5 * layer;
            //interpolate feather scaling factor (max scaling), numbers chosen myself
            var scaleFactor = (2.0*sliders.size) * (1.0 - layer) + (0.5*sliders.size) * layer;
            //interpolate feather distribution, numbers chosen myself
            var featherDistribution = (0.04/sliders.distribution) * (1.0 - layer) + (0.02/sliders.distribution) * layer;
            var y = curveA.getPointAt(j).y * (1.0 - layer) + curveB.getPointAt(j).y * layer;

            var featherMesh = framework.scene.children[i];
            //revert feather back to original position
            featherMesh.applyMatrix(new THREE.Matrix4().getInverse(featherMatrix[layer*10.0+j]));

            var mat4 = new THREE.Matrix4().makeRotationFromQuaternion(
                                new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3(0, 1, 0), Math.PI+gain(0.5, j)*sliders.orientation*Math.PI/180.0) );
            mat4.premultiply(new THREE.Matrix4().makeRotationFromQuaternion(
                                new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3(0, 0, 1), 
                                    (sliders.turbulence)*Math.PI/180.0 * sin(3, curveA.getPointAt(j).x, (sliders.turbulence * 0.003)*(Date.now()-startTime)) )));
            mat4.premultiply(new THREE.Matrix4().makeTranslation(curveA.getPointAt(j).x, y, curveA.getPointAt(j).z));
            mat4.premultiply(new THREE.Matrix4().makeRotationFromQuaternion(
                                new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3(0, 0, 1), Math.PI/2.0) ));
            mat4.premultiply(new THREE.Matrix4().makeRotationFromQuaternion(
                                new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3(1, 0, 0), -Math.PI/4.0) ));
            mat4.premultiply(new THREE.Matrix4().makeRotationFromQuaternion(
                                new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3(0, 1, 0), Math.PI-Math.PI/6.0) ));
            mat4.premultiply(new THREE.Matrix4().makeTranslation(3.6, 5.4, -3.5));
            featherMesh.applyMatrix(mat4);
            featherMatrix[layer*10.0+j] = mat4;

            var scalar = scaleBase + gain(0.5, j)*scaleFactor;
            featherMesh.scale.set(scalar, scalar, scalar);
            
            j += featherDistribution;
            if (j > 1.0) {
                j = 0.0;
                layer += 0.5;
            }
        }
        else if (framework.scene.children[i].name === "feather" && layer2 <= 1.0) {

            //interpolate feather scaling base for each layer, numbers chosen myself
            var scaleBase = 1.0 * (1.0 - layer2) + 0.5 * layer2;
            //interpolate feather scaling factor (max scaling), numbers chosen myself
            var scaleFactor = (2.0*sliders.size) * (1.0 - layer2) + (0.5*sliders.size) * layer2;
            //interpolate feather distribution, numbers chosen myself
            var featherDistribution = (0.04/sliders.distribution) * (1.0 - layer2) + (0.02/sliders.distribution) * layer2;
            var y = curveC.getPointAt(k).y * (1.0 - layer2) + curveD.getPointAt(k).y * layer2;

            var featherMesh = framework.scene.children[i];
            //revert feather back to original position
            featherMesh.applyMatrix(new THREE.Matrix4().getInverse(featherMatrix[(layer2+2.0)*10.0+k]));

            var mat4 = new THREE.Matrix4().makeRotationFromQuaternion(
                                new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3(0, 1, 0), -gain(0.5, k)*sliders.orientation*Math.PI/180.0) );
            mat4.premultiply(new THREE.Matrix4().makeRotationFromQuaternion(
                                new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3(0, 0, 1), 
                                    (sliders.turbulence)*Math.PI/180.0 * sin(3, curveC.getPointAt(k).x, (sliders.turbulence * 0.003)*(Date.now()-startTime)) )));
            mat4.premultiply(new THREE.Matrix4().makeTranslation(curveC.getPointAt(k).x, y, curveC.getPointAt(k).z));
            mat4.premultiply(new THREE.Matrix4().makeRotationFromQuaternion(
                                new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3(0, 0, 1), Math.PI/2.0) ));
            mat4.premultiply(new THREE.Matrix4().makeRotationFromQuaternion(
                                new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3(1, 0, 0), Math.PI+Math.PI/4.0) ));
            mat4.premultiply(new THREE.Matrix4().makeRotationFromQuaternion(
                                new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3(0, 1, 0), Math.PI/6.0) ));
            mat4.premultiply(new THREE.Matrix4().makeTranslation(-3.6, 5.4, -3.5));
            featherMesh.applyMatrix(mat4);
            featherMatrix[(layer2+2.0)*10.0+k] = mat4;

            var scalar = scaleBase + gain(0.5, k)*scaleFactor;
            featherMesh.scale.set(scalar, scalar, scalar);
            
            k += featherDistribution;
            if (k > 1.0) {
                k = 0.0;
                layer2 += 0.5;
            }
        }
    }
}

// when the scene is done initializing, it will call onLoad, then on frame updates, call onUpdate
Framework.init(onLoad, onUpdate);
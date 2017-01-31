
// Skybox texture from: https://github.com/mrdoob/three.js/tree/master/examples/textures/cube/skybox

const THREE = require('three'); // older modules are imported like this. You shouldn't have to worry about this much
import Framework from './framework'

Array.prototype.contains = function(elem) {
    for (var i in this) {
        if (this[i] == elem) return true;
    }
    return false;
}

///////////////////////////SLIDERS///////////////////////////////

var parameterChanged = true;

var CurvatureText = function() {
  this.curvature = 0.5;
};
var curvatureText = new CurvatureText();

var OrientationText = function() {
  this.orientation = 70.0;
};
var orientationText = new OrientationText();

var SizeText = function() {
  this.size = 1.0;
};
var sizeText = new SizeText();

var DistributionText = function() {
  this.distribution = 1.5;
};
var distributionText = new DistributionText();

//////////////////////////MATERIALS//////////////////////////////////

// Basic Lambert white
var lambertWhite = new THREE.MeshLambertMaterial({ color: 0xaaaaaa, side: THREE.DoubleSide });

// create the shader material      
var material = new THREE.ShaderMaterial( {
    uniforms: {
        // float initialized to 0
        time: { type: "f", value: 0.0 },
        // float initialized to 0
        freq: { type: "f", value: 0.0 },
        //float initialized to 25
        amp: { type: "f", value: 10.0 }
    },
    vertexShader: require('./shaders/adam-vert.glsl'),
    fragmentShader: require('./shaders/adam-frag.glsl'),
} );

//////////////////////////////CURVES//////////////////////////////////

var curve1 = new THREE.CubicBezierCurve3(
    new THREE.Vector3( 0, 0, -5 ),
    new THREE.Vector3( -2 - 2.0 * curvatureText.curvature, 0, 0 ),
    new THREE.Vector3( 2 + 2.0 * curvatureText.curvature, 0, 0 ),
    new THREE.Vector3( 0, 0, 5 )
);

var curve2 = new THREE.CubicBezierCurve3(
    new THREE.Vector3( 0, 0, -5 ),
    new THREE.Vector3( -2 - 2.0 * curvatureText.curvature, 1, 0 ),
    new THREE.Vector3( 2 + 2.0 * curvatureText.curvature, 0.1, 0 ),
    new THREE.Vector3( 0, 0, 5 )
);

/////////////////////////TOOLBOX FUNCTIONS////////////////////////////

function bias(b, t) {
    return Math.pow(t, Math.log(b) / Math.log(0.5));
}

function gain(g, t) {
    if (t < 0.5) {
        return bias(1.0 - g, 2.0*t) / 2; 
    }
    else {
        return 1 - bias(1.0 - g, 2.0 - 2.0*t) / 2;
    }
}

// called after the scene loads
function onLoad(framework) {
    var scene = framework.scene;
    var camera = framework.camera;
    var renderer = framework.renderer;
    var gui = framework.gui;
    var stats = framework.stats;

    // Set light
    var directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );
    directionalLight.color.setHSL(0.1, 1, 0.95);
    directionalLight.position.set(1, 3, 2);
    directionalLight.position.multiplyScalar(10);

    // set skybox
    var loader = new THREE.CubeTextureLoader();
    var urlPrefix = '/images/skymap/';
    var skymap = new THREE.CubeTextureLoader().load([
        urlPrefix + 'px.jpg', urlPrefix + 'nx.jpg',
        urlPrefix + 'py.jpg', urlPrefix + 'ny.jpg',
        urlPrefix + 'pz.jpg', urlPrefix + 'nz.jpg'
    ] );
    scene.background = skymap;

    // set camera position
    camera.position.set(0, 1, 5);
    camera.lookAt(new THREE.Vector3(0,0,0));

    scene.add(directionalLight);

    /*
    var geometry = new THREE.Geometry();
    geometry.vertices = curve1.getPoints( 50 );
    var material = new THREE.LineBasicMaterial( { color : 0xff0000 } );
    // Create the final object to add to the scene
    var curveObject1 = new THREE.Line( geometry, material );
    */
    //scene.add(curveObject1);
    /*
    geometry.vertices = curve2.getPoints( 50 );
    // Create the final object to add to the scene
    var curveObject2 = new THREE.Line( geometry, material );
    */
    //scene.add(curveObject2);

    // edit params and listen to changes like this
    // more information here: https://workshop.chromeexperiments.com/examples/gui/#1--Basic-Usage
    gui.add(camera, 'fov', 0, 180).onChange(function(newVal) {
        camera.updateProjectionMatrix();
    });

    //add curvature slider for user to adjust
    gui.add(curvatureText, 'curvature', 0.0, 1.0).step(0.1).onChange(function(newVal) {
        parameterChanged = true;
    });
    //add feather orientation slider for user to adjust
    gui.add(orientationText, 'orientation', 50.0, 90.0).step(10.0).onChange(function(newVal) {
        parameterChanged = true;
    });
    //add feather orientation slider for user to adjust
    gui.add(sizeText, 'size', 1.0, 2.0).step(0.1).onChange(function(newVal) {
        parameterChanged = true;
    });
    //add feather distribution slider for user to adjust
    gui.add(distributionText, 'distribution', 1.0, 2.0).step(0.1).onChange(function(newVal) {
        parameterChanged = true;
    });
}

// called on frame updates
function onUpdate(framework) {

    if (parameterChanged) {

        var newFeathers = [];

        // load a simple obj mesh
        var objLoader = new THREE.OBJLoader();
        objLoader.load('/geo/feather.obj', function(obj) {

            var curve1 = new THREE.CubicBezierCurve3(
                new THREE.Vector3( 0, 0, -5 ),
                new THREE.Vector3( -2 - 2.0 * curvatureText.curvature, 0, 0 ),
                new THREE.Vector3( 2 + 2.0 * curvatureText.curvature, 0, 0 ),
                new THREE.Vector3( 0, 0, 5 )
            );

            var curve2 = new THREE.CubicBezierCurve3(
                new THREE.Vector3( 0, 0, -5 ),
                new THREE.Vector3( -2 - 2.0 * curvatureText.curvature, 1, 0 ),
                new THREE.Vector3( 2 + 2.0 * curvatureText.curvature, 0.1, 0 ),
                new THREE.Vector3( 0, 0, 5 )
            );
            
            // LOOK: This function runs after the obj has finished loading
            var featherGeo = obj.children[0].geometry;

            for (var layer = 0.0; layer <= 1.0; layer += 0.5) {

                //interpolate feather scaling base for each layer, numbers chosen myself
                var scaleBase = 1.0 * (1.0 - layer) + 0.5 * layer;
                //interpolate feather scaling factor (max scaling), numbers chosen myself
                var scaleFactor = (2.0*sizeText.size) * (1.0 - layer) + (0.5*sizeText.size) * layer;
                //interpolate feather distribution, numbers chosen myself
                var featherDistribution = (0.05/distributionText.distribution) * (1.0 - layer) + (0.025/distributionText.distribution) * layer;

                for (var i = 0.0; i <= 1.0; i += featherDistribution) {
                    
                    var featherMesh = new THREE.Mesh(featherGeo, lambertWhite);
                    framework.scene.add(featherMesh);

                    var y = curve1.getPointAt(i).y * (1.0 - layer) + curve2.getPointAt(i).y * layer;
                    featherMesh.position.set(curve1.getPointAt(i).x, y, curve1.getPointAt(i).z);

                    featherMesh.rotateY(180.0 * Math.PI/180.0);
                    featherMesh.rotateY(gain(0.5, i)*orientationText.orientation*Math.PI/180.0);

                    var scalar = scaleBase + gain(0.5, i)*scaleFactor;
                    featherMesh.scale.set(scalar, scalar, scalar);
                    newFeathers.push(featherMesh.id);
                }
            }

            /*
            for (var i = 0.0; i <= 1.0; i += 0.05) {
                var featherMesh = new THREE.Mesh(featherGeo, lambertWhite);
                framework.scene.add(featherMesh);
                console.log(featherMesh.id);
                featherMesh.position.set(curve1.getPointAt(i).x, curve1.getPointAt(i).y, curve1.getPointAt(i).z);
                featherMesh.rotateY(180.0 * Math.PI/180.0);
                featherMesh.rotateY(gain(0.5, i)*orientationText.orientation*Math.PI/180.0);
                var scalar = 1.0 + gain(0.5, i)*2.0;
                featherMesh.scale.set(scalar, scalar, scalar);
                newFeathers.push(featherMesh.id);
            }

            for (var i = 0.0; i <= 1.0; i += 0.04) {
                var featherMesh = new THREE.Mesh(featherGeo, lambertWhite);
                framework.scene.add(featherMesh);
                console.log(featherMesh.id);
                featherMesh.position.set(curve2.getPointAt(i).x, (curve1.getPointAt(i).y + curve2.getPointAt(i).y) / 2.0, curve2.getPointAt(i).z);
                featherMesh.rotateY(180.0 * Math.PI/180.0);
                featherMesh.rotateY(gain(0.5, i)*orientationText.orientation*Math.PI/180.0);
                var scalar = 0.75 + gain(0.5, i)*1.0;
                featherMesh.scale.set(scalar, scalar, scalar);
                newFeathers.push(featherMesh.id);
            }

            for (var i = 0.0; i <= 1.0; i += 0.02) {
                var featherMesh = new THREE.Mesh(featherGeo, lambertWhite);
                framework.scene.add(featherMesh);
                console.log(featherMesh.id);
                featherMesh.position.set(curve2.getPointAt(i).x, curve2.getPointAt(i).y, curve2.getPointAt(i).z);
                featherMesh.rotateY(180.0 * Math.PI/180.0);
                featherMesh.rotateY(gain(0.5, i)*orientationText.orientation*Math.PI/180.0);
                var scalar = 0.5 + gain(0.5, i)*0.5;
                featherMesh.scale.set(scalar, scalar, scalar);
                newFeathers.push(featherMesh.id);
            }
            */
            
        });

        framework.scene.children.forEach(function(object){
            if( !newFeathers.contains(object.id) && object.type === "Mesh" ) {
                framework.scene.remove(object);
            }
        });

        parameterChanged = false;
    }

    /*
    var feather = framework.scene.getObjectByName("feather");    
    if (feather !== undefined) {
        // Simply flap wing
        var date = new Date();
        feather.rotateZ((Math.sin(date.getTime() / 100) * 2) * Math.PI / 180);        
    }
    */
}

// when the scene is done initializing, it will call onLoad, then on frame updates, call onUpdate
Framework.init(onLoad, onUpdate);
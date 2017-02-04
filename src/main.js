
// Skybox texture from: https://github.com/mrdoob/three.js/tree/master/examples/textures/cube/skybox

const THREE = require('three'); // older modules are imported like this. You shouldn't have to worry about this much
import Framework from './framework'

var startTime = Date.now();
var featherGeo;

///////////////////////////SLIDERS///////////////////////////////

var parameterChanged = false;

var Sliders = function() {
  this.curvature = 0.5;
  this.orientation = 70.0;
  this.size = 1.0;
  this.distribution = 1.5;
  this.turbulence = 1.0;
  this.flapspeed = 1.0;
  this.flapmotion = 2.0;
  this.color = 0.9;
};
var sliders = new Sliders();

//////////////////////////MATERIALS///////////////////////////////

// Basic Lambert white
var lambertWhite = new THREE.MeshLambertMaterial({ color: 0xaaaaaa, side: THREE.DoubleSide });

////////////////////////////CURVES//////////////////////////////////

var curve1;
var curve2;

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

    // load a simple obj mesh
    var objLoader = new THREE.OBJLoader();
    objLoader.load('/geo/feather.obj', function(obj) {   
        
        featherGeo = obj.children[0].geometry; 

        //bottom curve
        curve1 = new THREE.CubicBezierCurve3(
            new THREE.Vector3( 0, 0, -5 ),
            new THREE.Vector3( -2 - 2.0 * sliders.curvature, 0, 0 ),
            new THREE.Vector3( 2 + 2.0 * sliders.curvature, sliders.flapmotion/2.0 * sin(2, 0, (sliders.flapspeed * 0.003) * (Date.now()-startTime)) , 0 ),
            new THREE.Vector3( 0, sliders.flapmotion * sin(2, 0, (sliders.flapspeed * 0.003) * (Date.now()-startTime)) - 0.20*sliders.flapmotion, 5 )
        );

        //top curve
        curve2 = new THREE.CubicBezierCurve3(
            new THREE.Vector3( 0, 0.1, -5 ),
            new THREE.Vector3( -2 - 2.0 * sliders.curvature, 1, 0 ),
            new THREE.Vector3( 2 + 2.0 * sliders.curvature, sliders.flapmotion/2.0 * sin(2, 0, (sliders.flapspeed * 0.003) * (Date.now()-startTime)) + 0.2, 0 ),
            new THREE.Vector3( 0, sliders.flapmotion * sin(2, 0, (sliders.flapspeed * 0.003) * (Date.now()-startTime)), 5 )
        );

        for (var layer = 0.0; layer <= 1.0; layer += 0.5) {

            //interpolate feather scaling base for each layer, numbers chosen myself
            var scaleBase = 1.0 * (1.0 - layer) + 0.5 * layer;
            //interpolate feather scaling factor (max scaling), numbers chosen myself
            var scaleFactor = (2.0*sliders.size) * (1.0 - layer) + (0.5*sliders.size) * layer;
            //interpolate feather distribution, numbers chosen myself
            var featherDistribution = (0.05/sliders.distribution) * (1.0 - layer) + (0.025/sliders.distribution) * layer;
            //interpolate feather color darkness
            var darkness = 0.8 * (1.0 - layer) + 0.2 * layer;

            for (var i = 0.0; i <= 1.0; i += featherDistribution) {
                
                var featherMesh = new THREE.Mesh(featherGeo, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }));
                featherMesh.name = "feather";

                featherMesh.material.color.setRGB(darkness*sliders.color, darkness*sliders.color, darkness*1.0);

                var y = curve1.getPointAt(i).y * (1.0 - layer) + curve2.getPointAt(i).y * layer;
                featherMesh.position.set(curve1.getPointAt(i).x, y, curve1.getPointAt(i).z);

                featherMesh.rotateY(180.0 * Math.PI/180.0);
                featherMesh.rotateY(gain(0.5, i)*sliders.orientation*Math.PI/180.0);

                var scalar = scaleBase + gain(0.5, i)*scaleFactor;
                featherMesh.scale.set(scalar, scalar, scalar);

                //animation for wind turbulence
                featherMesh.rotateZ((sliders.turbulence)*Math.PI/180.0 * sin(2, featherMesh.position.x, (sliders.turbulence * 0.003)*(Date.now()-startTime)));

                framework.scene.add(featherMesh);
            }
        }   

    });

    

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
    gui.add(camera, 'fov', 0, 180).onFinishChange(function(newVal) {
        camera.updateProjectionMatrix();
    });

    //add curvature slider for user to adjust
    gui.add(sliders, 'curvature', 0.0, 1.0).step(0.1);

    //add feather orientation slider for user to adjust
    gui.add(sliders, 'orientation', 50.0, 90.0).step(10.0);

    //add feather orientation slider for user to adjust
    gui.add(sliders, 'size', 1.0, 2.0).step(0.1);

    //add feather distribution slider for user to adjust
    gui.add(sliders, 'distribution', 1.0, 2.0).step(0.1);

    //add wind turbulence slider for user to adjust
    gui.add(sliders, 'turbulence', 0.5, 1.5).step(0.1);

    //add wind turbulence slider for user to adjust
    gui.add(sliders, 'flapspeed', 0.0, 1.5).step(0.1);

    //add wind turbulence slider for user to adjust
    gui.add(sliders, 'flapmotion', 1.0, 3.0).step(0.5);

    //add wind turbulence slider for user to adjust
    gui.add(sliders, 'color', 0.3, 0.9).step(0.01);
}

// called on frame updates
function onUpdate(framework) {

    for (var i = framework.scene.children.length - 1; i >= 0; i--) {
        if (framework.scene.children[i].name == "feather") {
            framework.scene.remove(framework.scene.children[i]);
        }
    }

    //bottom curve
    curve1 = new THREE.CubicBezierCurve3(
        new THREE.Vector3( 0, 0, -5 ),
        new THREE.Vector3( -2 - 2.0 * sliders.curvature, 0, 0 ),
        new THREE.Vector3( 2 + 2.0 * sliders.curvature, sliders.flapmotion/2.0 * sin(2, 0, (sliders.flapspeed * 0.003) * (Date.now()-startTime)) , 0 ),
        new THREE.Vector3( 0, sliders.flapmotion * sin(2, 0, (sliders.flapspeed * 0.003) * (Date.now()-startTime)) - 0.20*sliders.flapmotion, 5 )
    );

    //top curve
    curve2 = new THREE.CubicBezierCurve3(
        new THREE.Vector3( 0, 0.1, -5 ),
        new THREE.Vector3( -2 - 2.0 * sliders.curvature, 1, 0 ),
        new THREE.Vector3( 2 + 2.0 * sliders.curvature, sliders.flapmotion/2.0 * sin(2, 0, (sliders.flapspeed * 0.003) * (Date.now()-startTime)) + 0.2, 0 ),
        new THREE.Vector3( 0, sliders.flapmotion * sin(2, 0, (sliders.flapspeed * 0.003) * (Date.now()-startTime)), 5 )
    );

    for (var layer = 0.0; layer <= 1.0; layer += 0.5) {

        //interpolate feather scaling base for each layer, numbers chosen myself
        var scaleBase = 1.0 * (1.0 - layer) + 0.5 * layer;
        //interpolate feather scaling factor (max scaling), numbers chosen myself
        var scaleFactor = (2.0*sliders.size) * (1.0 - layer) + (0.5*sliders.size) * layer;
        //interpolate feather distribution, numbers chosen myself
        var featherDistribution = (0.05/sliders.distribution) * (1.0 - layer) + (0.025/sliders.distribution) * layer;
        //interpolate feather color darkness
        var darkness = 0.8 * (1.0 - layer) + 0.2 * layer;

        for (var i = 0.0; i <= 1.0; i += featherDistribution) {
            
            var featherMesh = new THREE.Mesh(featherGeo, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }));
            featherMesh.name = "feather";

            featherMesh.material.color.setRGB(darkness*sliders.color, darkness*sliders.color, darkness*1.0);

            var y = curve1.getPointAt(i).y * (1.0 - layer) + curve2.getPointAt(i).y * layer;
            featherMesh.position.set(curve1.getPointAt(i).x, y, curve1.getPointAt(i).z);

            featherMesh.rotateY(180.0 * Math.PI/180.0);
            featherMesh.rotateY(gain(0.5, i)*sliders.orientation*Math.PI/180.0);

            var scalar = scaleBase + gain(0.5, i)*scaleFactor;
            featherMesh.scale.set(scalar, scalar, scalar);

            //animation for wind turbulence
            featherMesh.rotateZ((sliders.turbulence)*Math.PI/180.0 * sin(2, featherMesh.position.x, (sliders.turbulence * 0.003)*(Date.now()-startTime)));

            framework.scene.add(featherMesh);
        }
    }   
}

// when the scene is done initializing, it will call onLoad, then on frame updates, call onUpdate
Framework.init(onLoad, onUpdate);
uniform sampler2D texture;
uniform int u_useTexture;
uniform vec3 u_albedo;
uniform float u_ambient;
uniform vec3 u_lightPos;
uniform vec3 u_lightCol;
uniform float u_lightIntensity;

varying vec3 f_position;
varying vec3 f_normal;
varying vec2 f_uv;
varying vec3 f_lightDir;

//https://github.com/mrdoob/three.js/blob/r59/src/renderers/WebGLShaders.js#L1936
varying vec3 vViewPosition;
varying vec3 vNormal;

// uv, position, projectionMatrix, modelViewMatrix, normal
void main() {

	//https://github.com/mrdoob/three.js/blob/r59/src/renderers/WebGLShaders.js#L1936
	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
	vViewPosition = -mvPosition.xyz;
	vNormal = normalize( normalMatrix * normal );

	f_lightDir = vec3( normalize( modelViewMatrix * vec4(normalize(u_lightPos), 0) ) );

    f_uv = uv;
    f_normal = normal;
    f_position = vec3(modelViewMatrix * vec4(position, 1.0));
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
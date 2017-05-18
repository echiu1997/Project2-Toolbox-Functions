#extension GL_OES_standard_derivatives : enable

uniform sampler2D normalMap;
uniform int u_useNormalMap;
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

// HACK FOR Tangent Space Normal Mapping
// http://hacksoflife.blogspot.ch/2009/11/per-pixel-tangent-space-normal-mapping.html
vec3 perturbNormal2Arb( vec3 eye_pos, vec3 surf_norm ) {

    vec3 q0 = dFdx( eye_pos.xyz );
    vec3 q1 = dFdy( eye_pos.xyz );
    vec2 st0 = dFdx( f_uv.st );
    vec2 st1 = dFdy( f_uv.st );

    vec3 S = normalize(  q0 * st1.t - q1 * st0.t );
    vec3 T = normalize( -q0 * st1.s + q1 * st0.s );
    vec3 N = normalize( surf_norm );

    vec3 mapN = texture2D( normalMap, f_uv ).xyz * 2.0 - 1.0;
    mapN.xy = 1.0 * mapN.xy;
    mat3 tsn = mat3( S, T, N );
    return normalize( tsn * mapN );
}

void main() {
    vec4 color = vec4(u_albedo, 1.0);

    //texture mapping
    if (u_useTexture == 1) {
        color *= color * texture2D(texture, f_uv);
    }

    vec3 normal = normalize( vNormal ); //use f_normal if want wings to have no shadow

    //normal mapping
    if (u_useNormalMap == 1) {
        //normal = normalize( vNormal );
        normal = perturbNormal2Arb( -vViewPosition, normal );
    }

    //lambert
    float d = clamp(dot(normal, f_lightDir), u_ambient, 1.0);
    color = vec4(d * color.rgb * u_lightCol * u_lightIntensity, 1.0);

    //iridescence
    vec3 lookVector = normalize(f_position - cameraPosition);
    float angle = dot(lookVector, normal);
    float r = abs(cos(1.5*angle + 1.0));
    float g = abs(cos(1.5*angle + 2.0));
    float b = abs(cos(1.5*angle + 3.0));

    gl_FragColor = 0.9 * color + 0.1 * vec4(r, g, b, 0.0);
}

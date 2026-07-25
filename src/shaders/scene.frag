#version 150

// Constants:
const int MAX_RAY_MARCH_STEPS = 250;
const float MAX_RAY_MARCH_DIST = 500.;
const float INF = 1e6;
#include "shared.h"

// Uniforms:
uniform float iTime;

// Tweakable constants: live uniforms in the editor, literals in release.
#include "tweaks.frag"

float camProjectionRatio = 1.;
float wheelie = 0.;
float globalFade = 1.;
float blink = 0.;
float squintEyes = 0.;
float sheepTears = -1.;
float headDist = 0.; // distance to head (for eyes AO)
float sheepPos = INF;
float lightFalloff = 10000.;
float pupilSize = 0.1;

vec2 headRot = vec2(0., -0.4);

vec3 eyeDir = vec3(0.,-0.2,1.);
vec3 animationSpeed = vec3(1.5);
vec3 camPos;
vec3 camTa;
vec3 headLightOffsetFromMotoRoot = vec3(0.53, 0.98, 0.0);
vec3 breakLightOffsetFromMotoRoot = vec3(-0.8, 0.75, 0.0);


// Outputs:
out vec4 fragColor;

#include "common.frag"
#include "ids.frag"
#include "backgroundContent.frag"
#include "roadContent.frag"
#include "sheep.frag"
#include "rendering.frag"
#include "camera.frag"
#include "logo.frag"


void main()
{
    vec2 iResolution = vec2(XRES, YRES);
    vec2 texCoord = gl_FragCoord.xy/iResolution.xy;
    vec2 uv = (texCoord * 2. - 1.) * vec2(1., iResolution.y / iResolution.x);

    selectShot();

    // camPos and camTa are passed by the vertex shader
    vec3 cameraTarget = camTa;
    vec3 cameraUp = vec3(0., 1., 0.);
    vec3 cameraPosition = camPos;

    // Setup camera
    vec3 cameraForward = normalize(cameraTarget - cameraPosition);
    vec3 ro = cameraPosition;
    if (abs(dot(cameraForward, cameraUp)) > 0.99)
    {
        cameraUp = vec3(1., 0., 0.);
    }
    vec3 cameraRight = normalize(cross(cameraForward, cameraUp));
    cameraUp = normalize(cross(cameraRight, cameraForward));

    uv *= mix(1., length(uv), 0.1);
    vec3 rd = normalize(cameraForward * camProjectionRatio + uv.x * cameraRight + uv.y * cameraUp);

    vec3 radiance = rayMarchScene(ro, rd);
    radiance = pow(radiance, vec3(1.0,1.05,1.1)/2.2);

    // fade in/out
    fragColor.rgb = radiance * globalFade;

    // debug
    // uint n = uint(iTime / 5);
    // digits7(fragColor, vec4(1.,.0,0,1), uv*20.+vec2(18,-10), iResolution, n);

    fragColor /= 1.+pow(length(uv),4.)*0.6;
}

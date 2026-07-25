bool getShot(inout float time, float duration) {
    if (time < duration) {
        return true;
    }
    time -= duration;
    return false;
}

void selectShot() {
    float time = iTime;
    float verticalBump = valueNoise2(6.*iTime).x;
    blink = max(fract(iTime*.333), fract(iTime*.123+.1));

    if (getShot(time, 10.)) {
        globalFade *= smoothstep(0., 7., time);

        float motion = time*.1;
        float vshift = smoothstep(6., 0., time);
        camPos = vec3(1., 0.9 + vshift*.5, 6. - motion);
        camTa = vec3(1., 0.8 + vshift*1., 7. - motion);
        sheepPos = 7. - motion;
        camProjectionRatio = _TV(projRatio, 1.5);

        float headShift =
            smoothstep(6., 6.5, time) * smoothstep(9., 8.5, time);
        headRot = vec2(0., 0.4 - headShift*.5);
        eyeDir = vec3(0.,0.1-headShift*0.2,1.);

    } else {
        camTa = _TV(camTaClose, vec3(0., 1., .7));
        camPos = vec3(4. - 0.1*time, 1., -3.-0.5*time);
        sheepPos = 0.;
        headRot = vec2(0., 0.3);
        camProjectionRatio = 3.;
    }
}

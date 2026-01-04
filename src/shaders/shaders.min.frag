#version 150

uniform float iTime;
float camProjectionRatio=1.,globalFade=1.,blink=0.,headDist=0.,sheepPos=1e6;
vec2 headRot=vec2(0,-.4);
vec3 eyeDir=vec3(0,-.2,1),animationSpeed=vec3(1.5),camPos,camTa,headLightOffsetFromMotoRoot=vec3(.53,.98,0),breakLightOffsetFromMotoRoot=vec3(-.8,.75,0);
out vec4 fragColor;
float hash21(vec2 xy)
{
  return fract(sin(dot(xy,vec2(12.9898,78.233)))*43758.5453);
}
float hash31(vec3 xyz)
{
  return hash21(vec2(hash21(xyz.xy),xyz.z));
}
float noise(vec3 x)
{
  vec3 i=floor(x);
  x=fract(x);
  x=x*x*x*(x*(x*6.-15.)+10.);
  return mix(mix(mix(hash31(i+vec3(0)),hash31(i+vec3(1,0,0)),x.x),mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),x.x),x.y),mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),x.x),mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1)),x.x),x.y),x.z)*2.-1.;
}
float smin(float d1,float d2,float k)
{
  float h=clamp(.5+.5*(d2-d1)/k,0.,1.);
  return mix(d2,d1,h)-k*h*(1.-h);
}
float cappedCone(vec3 p,float h,float r1,float r2)
{
  vec2 q=vec2(length(p.xz),p.y),k1=vec2(r2,h),k2=vec2(r2-r1,2.*h),ca=vec2(q.x-min(q.x,q.y<0.?
    r1:
    r2),abs(q.y)-h);
  q=q-k1+k2*clamp(dot(k1-q,k2)/dot(k2,k2),0.,1.);
  return(q.x<0.&&ca.y<0.?
    -1.:
    1.)*sqrt(min(dot(ca,ca),dot(q,q)));
}
float smax(float a,float b,float k)
{
  k*=1.4;
  float h=max(k-abs(a-b),0.);
  return max(a,b)+h*h*h/(6.*k*k);
}
float Ellipsoid(vec3 p,vec3 r)
{
  float k0=length(p/r);
  return k0*(k0-1.)/length(p/(r*r));
}
float capsule(vec3 p,vec3 a)
{
  p-=a;
  a=vec3(0,2,4.9)-a;
  return length(p-a*clamp(dot(p,a)/dot(a,a),0.,1.))-.2;
}
float Torus(vec3 p)
{
  vec2 t=vec2(.14,.05);
  return length(vec2(length(p.xz)-t.x,p.y))-t.y;
}
mat2 Rotation(float angle)
{
  float c=cos(angle);
  angle=sin(angle);
  return mat2(c,angle,-angle,c);
}
vec2 MinDist(vec2 d1,vec2 d2)
{
  return d1.x<d2.x?
    d1:
    d2;
}
vec2 terrainShape(vec3 p)
{
  float isRoad=1.-smoothstep(3.5,5.,abs(p.x)),height=mix(noise(p*5.)*.1+.5*noise(vec3(p.xz,0)*.4),0.,isRoad*isRoad);
  if(isRoad>0.)
    {
      float x=clamp(abs(p.x/3.5),0.,1.);
      height+=.2*(1.-x*x*x)+pow(noise(mod(p*50,100))*.5+.5,.01)*.1;
    }
  return vec2(p.y-height,1);
}
float tree(vec3 localP,vec2 id)
{
  float h1=hash21(id),h2=fract(sin(h1)*43758.5453),d=3.5;
  if(abs(id.x)<14.)
    return d;
  float treeHeight=mix(7.,20.,h1),treeWidth=max(3.5,treeHeight*mix(.3,.4,h2*h2));
  localP.y-=-1.+.5*treeHeight;
  localP.xz+=(vec2(h1,h2)-.5)*1.5;
  d=min(d,Ellipsoid(localP,.5*vec3(treeWidth,treeHeight,treeWidth)));
  id+=vec2(2.*atan(localP.z,localP.x),localP.y);
  return d+.2*noise(2.*id.xyy)+.5;
}
vec2 treesShape(vec3 p)
{
  vec2 id=round(p.xz/10.)*10.;
  p.xz-=id;
  return vec2(tree(p,id),0);
}
vec2 sheep(vec3 p)
{
  p=(p-vec3(1,.46,sheepPos))/.15;
  float tb=iTime*animationSpeed.x*3.14;
  vec3 bodyMove=vec3(cos(tb),cos(tb*2.)*.1,0)*.025;
  tb=length(p*vec3(1,1,.825)-vec3(0,1.5,2.55)-bodyMove)-2.;
  if(tb>=3.)
    return vec2(tb*.15,2);
  float n=pow(noise((p-bodyMove+vec3(0)+vec3(0,0,.5))*2.)*.5+.5,.75)*2.-1.;
  tb=tb+.05-n*.2;
  n=mod(iTime*animationSpeed.x,2.);
  float a=smoothstep(0.,.5,n),b=smoothstep(.5,1.,n),c=smoothstep(1.,1.5,n),d=smoothstep(1.5,2.,n);
  vec4 legsRot=vec4(b*(1.-b),d*(1.-d),a*(1.-a),c*(1.-c)),legsPos=n*.5-vec4(b,d,a,c);
  bodyMove=p;
  bodyMove.x-=.8;
  bodyMove.z-=2.+legsPos.x;
  bodyMove.yz=Rotation(legsRot.x)*bodyMove.yz;
  a=cappedCone(bodyMove-vec3(0),.7,.3,.2);
  b=cappedCone(bodyMove-vec3(0,-.8,0),.2,.35,.3);
  bodyMove=p;
  bodyMove.x+=1.;
  bodyMove.z-=2.+legsPos.y;
  bodyMove.yz=Rotation(legsRot.y)*bodyMove.yz;
  a=min(a,cappedCone(bodyMove-vec3(0),.7,.3,.2));
  b=min(b,cappedCone(bodyMove-vec3(0,-.8,0),.2,.35,.3));
  bodyMove=p;
  bodyMove.x-=1.;
  bodyMove.z-=4.+legsPos.z;
  bodyMove.yz=Rotation(legsRot.z)*bodyMove.yz;
  a=min(a,cappedCone(bodyMove-vec3(0),.7,.3,.2));
  b=min(b,cappedCone(bodyMove-vec3(0,-.8,0),.2,.35,.3));
  bodyMove=p;
  bodyMove.x+=1.;
  bodyMove.z-=4.+legsPos.w;
  bodyMove.yz=Rotation(legsRot.w)*bodyMove.yz;
  a=min(a,cappedCone(bodyMove-vec3(0),.7,.3,.2));
  b=min(b,cappedCone(bodyMove-vec3(0,-.8,0),.2,.35,.3));
  bodyMove=p+vec3(0,-2,-1.2);
  bodyMove.xz=Rotation((smoothstep(0.,1.,abs(mod(iTime,1.)*2.-1.))*animationSpeed.y-.5)*.25*.2+headRot.x)*bodyMove.xz;
  bodyMove.zy=Rotation(sin(iTime*animationSpeed.y)*.25*.2-headRot.y)*bodyMove.zy;
  c=smin(length(bodyMove-vec3(0,-1.3,-1.2))-1.,length(bodyMove-vec3(0))-.5,1.8);
  vec3 pp;
  d=smin(length(bodyMove-vec3(0,.35,-.1))-.55-(cos(bodyMove.z*8.+bodyMove.y*4.5+bodyMove.x*4.)+cos(bodyMove.z*4.+bodyMove.y*6.5+bodyMove.x*8.))*.05,tb,.1);
  pp=bodyMove;
  pp.yz=Rotation(-.6)*pp.yz;
  pp.x=abs(p.x)-.8;
  pp*=vec3(.3,1,.4);
  pp-=vec3(0,-.05-pow(pp.x,2.)*5.,-.1);
  n=smax(length(pp)-.15,-length(pp-vec3(0,-.1,0))+.12,.01);
  pp.y*=.3;
  pp.y-=-.11;
  float earsClip=length(pp)-.16;
  pp=bodyMove;
  pp.x=abs(bodyMove.x)-.4;
  float eyes=length(pp*vec3(1)-vec3(0,0,-1))-.3,eyeCap=abs(eyes)-.02,blink=mix(smoothstep(.95,.96,blink)*.3+cos(iTime*10.)*.02,.1,0.);
  eyeCap=smin(smax(eyeCap,smin(-abs(bodyMove.y+bodyMove.z*.025)+.25-blink,-bodyMove.z-1.,.2),.01),c,.02);
  c=min(c,eyeCap);
  pp.x=abs(bodyMove.x)-.2;
  pp.xz=Rotation(-.45)*pp.xz;
  c=smin(smax(c,-length(pp-vec3(-.7,-1.2,-2.05))+.14,.1),Torus(pp.xzy-vec3(-.7,-1.94,-1.2)),.05);
  eyeCap=smin(tb,capsule(p-vec3(0,-.1,cos(p.y-.7)*.5),vec3(cos(iTime*animationSpeed.z)*.25,.2,5))-(cos(p.z*8.+p.y*4.5+p.x*4.)+cos(p.z*4.+p.y*6.5+p.x*3.))*.02,.1);
  vec2 dmat=MinDist(MinDist(vec2(tb,2),vec2(eyeCap,2)),vec2(d,2));
  dmat.x=smax(dmat.x,-earsClip,.15);
  dmat=MinDist(MinDist(MinDist(MinDist(MinDist(dmat,vec2(a,3)),vec2(c,3)),vec2(eyes,4)),vec2(b,5)),vec2(n,3));
  headDist=c;
  dmat.x*=.15;
  return dmat;
}
vec2 sceneSDF(vec3 p)
{
  return MinDist(MinDist(terrainShape(p),treesShape(p)),sheep(p));
}
float fastAO(vec3 pos,vec3 nor,float maxDist,float falloff)
{
  return clamp(1.-falloff*1.5*(.5*maxDist-sceneSDF(pos+nor*maxDist*.5).x+.95*(maxDist-sceneSDF(pos+nor*maxDist).x)),0.,1.);
}
float shadow(vec3 ro,vec3 rd)
{
  float res=1.,t=.08;
  for(int i=0;i<64;i++)
    {
      float h=sceneSDF(ro+rd*t).x;
      res=min(res,10.*h/t);
      t+=h;
      if(res<1e-4||t>40.)
        break;
    }
  return clamp(res,0.,1.);
}
float trace(vec3 ro,vec3 rd)
{
  float t=.1;
  for(int i=0;i<250;i++)
    {
      float d=sceneSDF(ro+rd*t).x;
      t+=d;
      if(t>5e2||abs(d)<.001)
        break;
    }
  return t;
}
float specular(vec3 v,vec3 l,float size)
{
  float spe=max(dot(v,normalize(l+v)),0.),a=2e3/size;
  size=3./size;
  return(pow(spe,a)*(a+2.)+pow(spe,size)*(size+2.)*2.)*.008;
}
vec3 rayMarchScene(vec3 ro,vec3 rd)
{
  float t=trace(ro,rd);
  vec3 p=ro+rd*t;
  vec2 dmat=sceneSDF(p),eps=vec2(1e-4,0);
  vec3 n=normalize(vec3(dmat.x-sceneSDF(p-eps.xyy).x,dmat.x-sceneSDF(p-eps.yxy).x,dmat.x-sceneSDF(p-eps.yyx).x)),sunDir=normalize(vec3(3.5,3,-1)),fogColor=vec3(.3,.5,.6);
  float ao=fastAO(p,n,.15,1.)*fastAO(p,n,1.,.1)*.5,material=dmat.y,shad=material==3?
    1.:
    shadow(p,sunDir),fre=1.+dot(rd,n);
  vec3 diff=vec3(1,.8,.7)*max(dot(n,sunDir),0.)*pow(vec3(shad),vec3(1,1.2,1.5)),bnc=vec3(1,.8,.7)*.1*max(dot(n,-sunDir),0.)*ao,sss=vec3(.5)*mix(fastAO(p,rd,.3,.75),fastAO(p,sunDir,.3,.75),.5),spe=vec3(1)*max(dot(reflect(rd,n),sunDir),0.),envm=vec3(0),amb=vec3(.4,.45,.5)*ao,emi=vec3(0);
  sunDir=vec3(0);
  if(t>=5e2)
    return mix(fogColor,mix(vec3(.7),vec3(.2,.2,.6),noise(rd/(.05+rd.y))),pow(smoothstep(0.,1.,rd.y),.4));
  if(material--==0.)
    sunDir=vec3(.2,.3,.2),sss*=.2,spe*=0.;
  else if(material--==0.)
    if(abs(p.x)<3.5)
      {
        vec2 laneUV=p.xz/3.5;
        float tireTrails=sin((laneUV.x+.2)*7.85)*.5+.5;
        tireTrails=mix(mix(tireTrails,smoothstep(0.,1.,tireTrails),.25),noise(vec3(laneUV*vec2(50,2),0)),.2)*.3;
        vec3 color=vec3(mix(vec3(.2,.2,.3),vec3(.3,.4,.5),tireTrails));
        sss*=0.;
        sunDir=color;
        spe*=mix(0.,.1,tireTrails);
      }
    else
       sss*=.3,sunDir=vec3(.2,.3,.2),spe*=0.;
  else if(material--==0.)
    sunDir=vec3(.4),sss*=fre*.5+.5,emi=vec3(.35),spe=pow(spe,vec3(4))*fre*.25;
  else if(material--==0.)
    sunDir=vec3(1,.7,.5),amb*=vec3(1,.75,.75),sss=pow(sss,vec3(.5,2.5,4)+2.)*3.,spe=pow(spe,vec3(4))*fre*.02;
  else if(material--==0.)
    {
      sss*=.5;
      vec3 dir=normalize(eyeDir+(noise(vec3(iTime,iTime*.5,iTime*1.5))*2.-1.)*.01),t=cross(dir,vec3(0,1,0)),b=cross(dir,t);
      t=cross(b,dir);
      dir=n.z*dir+n.x*t+n.y*b;
      t=rd.z*eyeDir+rd.x*t+rd.y*b;
      vec2 offset=t.xy/t.z*length(dir.xy)/length(ro-p)*.4;
      dir.xy-=offset*smoothstep(.01,0.,dot(dir,rd));
      float er=length(dir.xy),theta=atan(dir.x,dir.y);
      sunDir=mix(mix(vec3(.5,.3,.1),vec3(0,.8,1),smoothstep(.16,.3,er)*.3+cos(theta*15.)*.04)*.3,mix(sunDir,vec3(.8),smoothstep(.29,.3,er)),smoothstep(0.,.05,abs(er-.3)+.01));
      n=mix(normalize(n+(eyeDir+n)*4.),n,smoothstep(.3,.32,er));
      t=reflect(rd,n);
      dir=normalize(vec3(1,1.5,-1));
      b=vec3(-dir.x,dir.y*.5,dir.z);
      theta=specular(t,dir,.1)+specular(t,b,2.)*.1+specular(t,normalize(dir+vec3(.2,0,0)),.3)+specular(t,normalize(dir+vec3(.2,0,.2)),.5)+specular(t,normalize(b+vec3(.1,0,.2)),8.)*.5;
      envm=(mix(mix(vec3(.3,.3,0),vec3(.1),smoothstep(-.7,.2,t.y)),vec3(.3,.65,1),smoothstep(0.,1.,t.y))+theta*vec3(1,.9,.8))*mix(.15,.2,smoothstep(.1,.12,er))*sqrt(fre)*2.5;
      sceneSDF(p);
      sunDir*=smoothstep(0.,.015,headDist)*.4+.6;
      spe*=0.;
    }
  else if(material--==0.)
    sunDir=vec3(.025),sss*=0.,spe=pow(spe,vec3(15))*fre*10.;
  else if(material--==0.)
    sunDir=vec3(.6),sss*=0.,spe=pow(spe,vec3(8))*fre*2.;
  else if(material--==0.)
    sunDir=vec3(1,.01,.01)*.3,diff*=vec3(3),amb*=vec3(2)*fre*fre,sss*=0.,spe=vec3(1,.3,.3)*pow(spe,vec3(500))*5.;
  diff=sunDir*(amb+diff*.5+bnc*2.+sss*2.)+envm+spe+emi;
  return mix(diff,fogColor,1.-exp(-t*.005));
}
bool getShot(inout float time)
{
  if(time<10.)
    return true;
  time-=10.;
  return false;
}
void selectShot()
{
  float time=iTime;
  blink=max(fract(iTime*.333),fract(iTime*.123+.1));
  if(getShot(time))
    {
      globalFade*=smoothstep(0.,7.,time);
      float motion=time*.1,vshift=smoothstep(6.,0.,time);
      camPos=vec3(1,.9+vshift*.5,6.-motion);
      camTa=vec3(1,.8+vshift,7.-motion);
      sheepPos=7.-motion;
      camProjectionRatio=1.5;
      motion=smoothstep(6.,6.5,time)*smoothstep(9.,8.5,time);
      headRot=vec2(0,.4-motion*.5);
      eyeDir=vec3(0,.1-motion*.2,1);
    }
  else
     camTa=vec3(0,1,.7),camPos=vec3(4.-.1*time,1,-3.-.5*time),sheepPos=0.,headRot=vec2(0,.3),camProjectionRatio=3.;
}
void main()
{
  vec2 iResolution=vec2(1920,1080),texCoord=gl_FragCoord.xy/iResolution.xy;
  iResolution=(texCoord*2.-1.)*vec2(1,iResolution.y/iResolution.x);
  selectShot();
  vec3 cameraTarget=camTa,cameraUp=vec3(0,1,0),cameraPosition=camPos;
  cameraTarget=normalize(cameraTarget-cameraPosition);
  if(abs(dot(cameraTarget,cameraUp))>.99)
    cameraUp=vec3(1,0,0);
  vec3 cameraRight=normalize(cross(cameraTarget,cameraUp));
  cameraUp=normalize(cross(cameraRight,cameraTarget));
  iResolution*=mix(1.,length(iResolution),.1);
  cameraRight=normalize(cameraTarget*camProjectionRatio+iResolution.x*cameraRight+iResolution.y*cameraUp);
  cameraRight=rayMarchScene(cameraPosition,cameraRight);
  cameraRight=pow(cameraRight,vec3(1,1.05,1.1)/2.2);
  fragColor.xyz=cameraRight*globalFade;
  fragColor/=1.+pow(length(iResolution),4.)*.6;
}


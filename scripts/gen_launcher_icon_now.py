from __future__ import annotations
import os, pathlib
from PIL import Image, ImageDraw, ImageFont
WIN=os.environ.get("WINDIR","C:\Windows")
def font(size):
    for c in ["SegoeUI-Bold.ttf","SegoeUI.ttf","Roboto-Bold.ttf","Roboto-Regular.ttf","Arial.ttf","DejaVuSans-Bold.ttf","DejaVuSans.ttf"]:
        cand=os.path.join(WIN,c)
        if os.path.exists(cand):
            try: return ImageFont.truetype(cand,size)
            except Exception: continue
    return ImageFont.load_default()
def logo(sz):
    im=Image.new("RGBA",sz,(0,0,0,0)); dr=ImageDraw.Draw(im)
    cx,cy=sz[0]//2,sz[1]//2; diam=int(sz[0]*0.46); l=t=cx-diam//2
    dr.ellipse([l,t,l+diam,t+diam],fill=(225,29,72,255))
    ii=int(diam*0.70); dr.ellipse([cx-ii//2,cy-ii//2,cx+ii//2,cy+ii//2],fill=(7,7,9,255))
    import math
    for i in range(5):
        a=(2*math.pi*i)/5
        x1=cx+int(diam*0.22*math.cos(a)); y1=cy+int(diam*0.22*math.sin(a))
        x2=cx+int(diam*0.40*math.cos(a)); y2=cy+int(diam*0.40*math.sin(a))
        dr.line([(x1,y1),(x2,y2)],fill=(255,23,68,255),width=max(2,diam//22))
    f=font(int(diam*0.42)); txt="V"; b=dr.textbbox((0,0),txt,font=f)
    tw,th=b[2]-b[0],b[3]-b[1]
    dr.text((cx-tw/2-b[0],cy-th/2-b[1]-int(th*0.05)),txt,font=f,fill=(255,255,255,255))
    return im
def main():
    base=pathlib.Path("android/app/src/main/res")
    fg=base/"drawable-nodpi"/"ic_launcher_fg_bitmap.png"
    fg.parent.mkdir(parents=True,exist_ok=True)
    im=Image.new("RGBA",(108,108),(0,0,0,0))
    im.alpha_composite(logo((108,108)),(0,0)); im.save(fg,"PNG")
    for dn,sz in {"mdpi":48,"hdpi":72,"xhdpi":96,"xxhdpi":144,"xxxhdpi":192}.items():
        mp=base/f"mipmap-{dn}"; mp.mkdir(parents=True,exist_ok=True)
        lr=Image.open(fg).convert("RGBA").resize((sz,sz),Image.NEAREST)
        sq=Image.new("RGBA",(sz,sz),(7,7,9,255)); sq.alpha_composite(lr,(0,0)); sq.convert("RGB").save(mp/"ic_launcher.png","PNG")
        m=Image.new("L",(sz,sz),0); ImageDraw.Draw(m).ellipse([1,1,sz-2,sz-2],fill=255)
        r=Image.new("RGBA",(sz,sz),(7,7,9,255)); r.alpha_composite(lr,(0,0)); r.putalpha(m); r.convert("RGB").save(mp/"ic_launcher_round.png","PNG")
    print("done")
if __name__=="__main__":
    main()

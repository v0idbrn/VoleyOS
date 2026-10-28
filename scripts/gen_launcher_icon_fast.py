from __future__ import annotations
import os, pathlib
from PIL import Image, ImageDraw, ImageFont
FG=((225,29,72,255),(255,23,68,255))
BLACK=(7,7,9,255)
WHITE=(255,255,255,255)
RED=(255,23,68,255)
def font(draw,size):
    for c in ["SegoeUI-Bold.ttf","SegoeUI.ttf","Roboto-Bold.ttf","Roboto-Regular.ttf","Arial.ttf","DejaVuSans-Bold.ttf","DejaVuSans.ttf"]:
        for r in (os.environ.get("WINDIR","C:\Windows"),"/usr/share/fonts","/usr/local/share/fonts"):
            if not r or not os.path.isdir(r): continue
            for dp,_,fs in os.walk(r):
                if c in fs:
                    try: return ImageFont.truetype(os.path.join(dp,c),size)
                    except Exception: continue
    try: return ImageFont.truetype("arial.ttf",size)
    except Exception: return ImageFont.load_default()
def logo(sz):
    im=Image.new("RGBA",sz,(0,0,0,0)); d=ImageDraw.Draw(im)
    cx,cy=sz[0]//2,sz[1]//2; diam=int(sz[0]*0.46); l=t=cx-diam//2
    d.ellipse([l,t,l+diam,t+diam],fill=FG[0])
    inner=int(diam*0.70); d.ellipse([cx-inner//2,cy-inner//2,cx+inner//2,cy+inner//2],fill=BLACK)
    import math
    for i in range(5):
        a=(2*math.pi*i)/5
        x1=cx+int(diam*0.22*math.cos(a)); y1=cy+int(diam*0.22*math.sin(a))
        x2=cx+int(diam*0.40*math.cos(a)); y2=cy+int(diam*0.40*math.sin(a))
        d.line([(x1,y1),(x2,y2)],fill=FG[1],width=max(2,diam//22))
    f=font(d,int(diam*0.42)); txt="V"; b=d.textbbox((0,0),txt,font=f)
    tw,th=b[2]-b[0],b[3]-b[1]
    d.text((cx-tw/2-b[0],cy-th/2-b[1]-int(th*0.05)),txt,font=f,fill=WHITE)
    return im
def word(sz):
    im=Image.new("RGBA",sz,(0,0,0,0)); d=ImageDraw.Draw(im)
    name="VoleyOS"; px=int(sz[1]*0.16); f=font(d,px)
    while px>8:
        b=d.textbbox((0,0),name,font=f)
        if (b[2]-b[0])<=sz[0]*0.80 or px<=10: break
        px=int(px*0.85); f=font(d,px)
    b=d.textbbox((0,0),name,font=f); tw,th=b[2]-b[0],b[3]-b[1]
    x=(sz[0]-tw)/2-b[0]; y=sz[1]-int(sz[1]*0.28); c=x
    for i,ch in enumerate(name):
        col=RED if ch=="S" and i==len(name)-1 else WHITE
        d.text((c,y-b[1]),ch,font=f,fill=col)
        cb=d.textbbox((0,0),ch,font=f); c+=(cb[2]-cb[0])
    return im
def main():
    base=pathlib.Path("android/app/src/main/res")
    fg=base/"drawable-nodpi"/"ic_launcher_fg_bitmap.png"
    fg.parent.mkdir(parents=True,exist_ok=True)
    im=Image.new("RGBA",(432,432),(0,0,0,0))
    im.alpha_composite(logo((432,432)),(0,0)); im.save(fg,"PNG")
    sizes={"mdpi":48,"hdpi":72,"xhdpi":96,"xxhdpi":144,"xxxhdpi":192}
    for dn,sz in sizes.items():
        mp=base/f"mipmap-{dn}"; mp.mkdir(parents=True,exist_ok=True)
        fgr=Image.open(fg).convert("RGBA").resize((sz,sz),Image.LANCZOS)
        sq=Image.new("RGBA",(sz,sz),BLACK); sq.alpha_composite(fgr,(0,0)); sq.convert("RGB").save(mp/"ic_launcher.png","PNG")
        msk=Image.new("L",(sz,sz),0); ImageDraw.Draw(msk).ellipse([1,1,sz-2,sz-2],fill=255)
        rd=Image.new("RGBA",(sz,sz),BLACK); rd.alpha_composite(fgr,(0,0)); rd.putalpha(msk); rd.convert("RGB").save(mp/"ic_launcher_round.png","PNG")
    xml='''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_fg_bitmap" />
</adaptive-icon>
'''
    (base/"mipmap-anydpi-v26").mkdir(parents=True,exist_ok=True)
    (base/"mipmap-anydpi-v26"/"ic_launcher.xml").write_text(xml)
    (base/"mipmap-anydpi-v26"/"ic_launcher_round.xml").write_text(xml)
    bg='''<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="oval">
    <solid android:color="#070709" />
</shape>
'''
    (base/"drawable").mkdir(parents=True,exist_ok=True)
    (base/"drawable"/"ic_launcher_background.xml").write_text(bg)
    print("done")
if __name__=="__main__":
    main()

# Materiales PBR del frente del Ebro (1938): mapas de color y de normal+rugosidad, todos repetibles (sin costuras).
# Salida por material: <nombre>_c.jpg (color, con la oclusión ya metida) y <nombre>_n.jpg (R,G = normal X,Y; B = rugosidad).
import numpy as np, sys
from PIL import Image
from scipy.ndimage import gaussian_filter
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
N = 1024
rng = np.random.default_rng(1938)
def blur(a, s): return gaussian_filter(a, s, mode='wrap')
def fnoise(n, beta, seed):       # ruido fractal repetible (espectro 1/f^beta)
    r = np.random.default_rng(seed); w = r.standard_normal((n, n))
    fy = np.fft.fftfreq(n)[:, None]; fx = np.fft.fftfreq(n)[None, :]; f = np.sqrt(fx * fx + fy * fy); f[0, 0] = 1
    a = np.real(np.fft.ifft2(np.fft.fft2(w) / f ** beta)); a -= a.mean(); return a / (a.std() + 1e-9)
def nrm(h, strength, rough, name):
    du = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) / 2; dv = -(np.roll(h, -1, 0) - np.roll(h, 1, 0)) / 2       # v hacia arriba de la imagen
    nx, ny, nz = -du * strength, -dv * strength, np.ones_like(h); l = np.sqrt(nx * nx + ny * ny + nz * nz)
    img = np.dstack([(nx / l) * 0.5 + 0.5, (ny / l) * 0.5 + 0.5, np.clip(rough, 0, 1)])
    save(img, name + '_n')
def save(img, name):
    im = Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8))
    im.save(f'{OUT}/{name}.jpg', quality=93); im.resize((N // 2, N // 2), Image.LANCZOS).save(f'{OUT}/{name}_m.jpg', quality=90)
def lum(c): return c[..., 0] * 0.3 + c[..., 1] * 0.59 + c[..., 2] * 0.11

# ---- 1. piedra: las dos mejores fotos (piedra seca de los márgenes; mampostería irregular con mortero de cal de casas, iglesia y ermita) ----
for src, name, k in (('piedra_0', 'seca', 9.0), ('piedra_1', 'mamp', 8.0)):
    c = np.asarray(Image.open(f'{OUT}/{src}.jpg').convert('RGB'), np.float32) / 255
    L = lum(c); h = blur(L, 1.6) - blur(L, 28) * 0.85; h += blur(np.clip(0.33 - L, 0, 1), 3) * -1.2       # juntas y huecos, hundidos
    h = blur(h, 0.8)
    rough = 0.78 + 0.18 * (1 - (L - L.min()) / (L.max() - L.min()))
    nrm(h, k, rough, name)
    L3 = lum(c)[..., None]; c = np.clip((c * 0.8 + L3 * 0.2) * np.array([1.07, 1.06, 0.94]), 0, 1)       # algo menos saturada (sin el tono de la foto) y algo más clara
    save(c, name + '_c')

# ---- 2. teja árabe: canales y cobijas alternas, hiladas de 33 cm, terracota de horno moruno ----
S = 2.0; px = N / S; W = 0.25; CL = 2.0 / 6
y, x = np.mgrid[0:N, 0:N].astype(np.float32); u = x / px; v = (N - 1 - y) / px       # v hacia arriba (cumbrera)
col = np.floor(u / W).astype(int); fu = (u / W) % 1
cob = col % 2 == 1       # cobija (boca arriba, convexa) / canal (cóncava)
off = np.where(cob, CL * 0.5, 0.0); cv = (v + off) / CL; course = np.floor(cv).astype(int); fv = cv % 1
taper = 0.86 + 0.14 * (1 - fv)       # la teja es más ancha abajo
fw = np.clip((fu - 0.5) / taper + 0.5, 0, 1); prof = np.sin(np.pi * fw)       # sección de la teja
base = np.where(cob, 0.04 + 0.05 * prof, 0.04 - 0.035 * prof)
lap = (1 - fv) * 0.012       # cada teja monta sobre la de abajo: más alta en su borde inferior
h = base + lap + fnoise(N, 1.2, 3) * 0.0015 + fnoise(N, 0.6, 4) * 0.0004
h = h + np.where(fv < 0.04, -0.01 * (1 - fv / 0.04), 0)       # labio inferior: sombra bajo la teja
tid = (col * 131 + course * 71) % 977; tr = np.random.default_rng(5).random(1000)
hue = tr[tid]; tr2 = np.random.default_rng(6).random(1000)[tid]
terr = np.array([0.78, 0.42, 0.25]); dark = np.array([0.56, 0.3, 0.19]); pale = np.array([0.86, 0.6, 0.42])
cimg = terr[None, None] * (1 - hue[..., None]) * 0.7 + dark[None, None] * hue[..., None] * 0.7 + pale[None, None] * tr2[..., None] * 0.35
cimg *= (0.9 + 0.1 * fnoise(N, 1.4, 7))[..., None]
lich = np.clip((fnoise(N, 1.6, 8) - 1.1) * 1.5, 0, 1) * np.clip(fnoise(N, 0.4, 9) * 0.5 + 0.6, 0, 1)       # líquenes y manchas de humedad
cimg = cimg * (1 - lich[..., None] * 0.6) + np.array([0.62, 0.6, 0.48]) * lich[..., None] * 0.6
dirt = np.where(cob, 0, (1 - prof) * 0.35) + np.clip(0.04 - fv, 0, 0.04) / 0.04 * 0.45       # polvo en los canales y bajo cada labio
cimg *= (1 - dirt * 0.55)[..., None]
ao = np.clip(1 - blur(np.clip(h.max() - h, 0, None), 4) * 7, 0.55, 1); cimg *= ao[..., None]
nrm(h * px, 1.6, 0.66 + 0.14 * tr2 + lich * 0.15, 'teja'); save(cimg, 'teja_c')

# ---- 3. sacos terreros de arpillera rellenos de tierra, en hiladas a tresbolillo ----
S = 1.6; px = N / S; BL, BH = 0.53, 0.16
u = x / px; v = (N - 1 - y) / px
row = np.floor(v / BH).astype(int); fv = (v / BH) % 1
ub = u / BL + np.where(row % 2 == 1, 0.5, 0) + (np.random.default_rng(11).random(64)[row % 64] - 0.5) * 0.3
bag = np.floor(ub).astype(int); fb = ub % 1
rb = np.random.default_rng(17).random((4, 4096)); bk = (bag * 61 + row * 29) % 4096
fv2 = fv
ex = np.abs(fb * 2 - 1); ey = np.abs(fv2 * 2 - 1)
ear = np.where(rb[2][bk] > 0.5, fb, 1 - fb)       # la boca atada estrecha un extremo
ey = ey / np.clip(1 - np.clip((ear - 0.82) / 0.18, 0, 1) * 0.45, 0.4, 1)
ex = ex * (0.95 + rb[0][bk] * 0.04); ey = ey * (0.86 + rb[1][bk] * 0.06)       # bien apretados: se tocan unos con otros (cada uno algo distinto)
r2 = ex ** 4.0 + np.clip(ey, 0, 1.5) ** 3.0
pillow = np.clip(1 - r2, 0, 1) ** 0.3
crease = blur(fnoise(N, 0.9, 18), (6, 1.2)) * 0.7 + fnoise(N, 1.5, 19) * 0.3       # arrugas de la arpillera
wr = fnoise(N, 1.0, 12) * 0.25 + fnoise(N, 1.7, 13) * 0.5
h = pillow * 0.07 + (wr * 0.004 + crease * 0.006) * pillow
weave = (np.sin(x * np.pi * 0.62) * np.sin(y * np.pi * 0.62)) * 0.5 + 0.5
h = h + weave * 0.0006 * pillow
bid = (bag * 97 + row * 53) % 991; br = np.random.default_rng(14).random(1000)[bid]
burl = np.array([0.66, 0.57, 0.41]); bdk = np.array([0.47, 0.41, 0.3])
cimg = burl[None, None] * (1 - br[..., None] * 0.5) + bdk[None, None] * br[..., None] * 0.5
cimg *= (0.93 + 0.07 * weave)[..., None] * (0.9 + 0.1 * fnoise(N, 1.3, 15))[..., None]
soil = np.clip(fnoise(N, 1.2, 16) * 0.6 + (1 - fv) * 0.5 - 0.3, 0, 1) * 0.5       # tierra pegada abajo
cimg = cimg * (1 - soil[..., None]) + np.array([0.42, 0.33, 0.22]) * soil[..., None]
gap = 1 - pillow; cimg = cimg * (1 - gap[..., None] ** 1.5) + np.array([0.3, 0.24, 0.17]) * gap[..., None] ** 1.5; cimg *= (1 - gap ** 3 * 0.5)[..., None] * (1 + crease * 0.05 * pillow)[..., None]
nrm(h * px, 1.3, 0.93 + 0.05 * br, 'sacos'); save(cimg, 'sacos_c')

# ---- 4. hormigón de encofrado de tablas (fortines de 1937-38): tablas de 15 cm, poros y chorreones ----
S = 3.0; px = N / S; TB = 0.15
u = x / px; v = (N - 1 - y) / px
brd = np.floor(v / TB).astype(int); fv = (v / TB) % 1
cut = (np.random.default_rng(21).random(64)[brd % 64]) * S
jx = ((u - cut) % 1.5 < 0.006 * 1.5 / 1.5).astype(np.float32)       # testas de las tablas
gx = blur(np.random.default_rng(23).standard_normal((N, N)), (2.0, 60)); gx /= gx.std(); gx = gx * 0.6 + fnoise(N, 1.2, 24) * 0.4       # veta de la madera impresa
step = (np.random.default_rng(25).random(64)[brd % 64] - 0.5) * 0.008
fin = np.exp(-((fv - 0.015) / 0.012) ** 2) * 0.0025       # rebaba de lechada que se coló entre tabla y tabla
h = step + gx * 0.0012 + fin - np.where((fv > 0.03) & (fv < 0.06), 0.0012, 0) + fnoise(N, 1.8, 26) * 0.0018
pores = np.clip(fnoise(N, 0.2, 27) - 2.1, 0, None); h -= pores * 0.004
grey = np.array([0.62, 0.6, 0.55])
cimg = grey[None, None] * (0.86 + 0.07 * fnoise(N, 1.5, 28) + 0.04 * gx)[..., None]
tone = (np.random.default_rng(31).random(64)[brd % 64] - 0.5) * 0.1
cimg *= (1 + step * 10 + tone)[..., None] * (1 + gx * 0.02)[..., None]
streak = blur(np.clip(fnoise(N, 1.0, 29), 0, None), (60, 1.5)); streak = np.clip(streak * 0.35 * (0.6 + 0.4 * v / S), 0, 0.4)       # chorreones de agua
cimg = cimg * (1 - streak[..., None]) + np.array([0.42, 0.4, 0.36]) * streak[..., None]
cimg *= (1 - np.clip(pores, 0, 1) * 0.6)[..., None] * (1 - (fv < 0.03) * 0.2)[..., None]
nrm(h * px, 1.4, 0.88 + 0.08 * np.clip(fnoise(N, 1.2, 30), -1, 1), 'hormigon'); save(cimg, 'hormigon_c')
print('ok')

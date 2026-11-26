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

# ---- 5. sillería: piedra caliza labrada en hiladas (pilastras, molduras, esquinales, portadas y suelo de la iglesia) (foto piedra_3) ----
c = np.asarray(Image.open(f'{OUT}/piedra_3.jpg').convert('RGB'), np.float32) / 255
if c.shape[0] != N: c = np.asarray(Image.fromarray((c * 255).astype(np.uint8)).resize((N, N), Image.LANCZOS), np.float32) / 255
L = lum(c); h = blur(L, 1.2) - blur(L, 24) * 0.8; h += blur(np.clip(0.36 - L, 0, 1), 2.5) * -1.4       # juntas finas y poros
h = blur(h, 0.7) + fnoise(N, 1.9, 41) * 0.012       # labra menuda
rough = 0.7 + 0.2 * (1 - (L - L.min()) / (L.max() - L.min()))
nrm(h, 7.0, rough, 'sillar')
L3 = lum(c)[..., None]; c = np.clip((c * 0.68 + L3 * 0.32) * np.array([1.2, 1.18, 1.08]) + 0.03, 0, 1)       # más clara y menos saturada: piedra labrada
stain = np.clip(blur(fnoise(N, 1.0, 42), (40, 3)) * 0.5, 0, 1) * 0.18       # chorreones de lluvia, verticales
lich = np.clip((fnoise(N, 1.4, 43) - 1.35) * 2.2, 0, 1)       # líquenes ocres y grises
c = c * (1 - stain[..., None]) + np.array([0.42, 0.4, 0.34]) * stain[..., None]
c = c * (1 - lich[..., None] * 0.45) + np.array([0.72, 0.62, 0.36]) * lich[..., None] * 0.45
save(c, 'sillar_c')

# ---- 6. roca: caliza de la Terra Alta, con estratos, grietas irregulares, picaduras, líquenes y musgo en las grietas ----
y, x = np.mgrid[0:N, 0:N].astype(np.float32)
wx = x + fnoise(N, 1.6, 63) * 38 + fnoise(N, 2.2, 64) * 9; wy = y + fnoise(N, 1.6, 65) * 38 + fnoise(N, 2.2, 66) * 9       # coordenadas torcidas
pts = np.random.default_rng(54).random((16, 2)) * N
d1 = np.full((N, N), 1e9, np.float32); d2 = np.full((N, N), 1e9, np.float32)
for px_, py_ in pts:
    for ox in (-N, 0, N):
        for oy in (-N, 0, N):
            d = np.hypot(wx - px_ - ox, wy - py_ - oy); m = d < d1; d2 = np.where(m, d1, np.minimum(d2, d)); d1 = np.where(m, d, d1)
edge = np.clip((d2 - d1) / (3.0 + 5.0 * np.clip(fnoise(N, 1.4, 67) * 0.5 + 0.5, 0, 1)), 0, 1)
crack = (1 - edge) ** 1.5 * np.clip(fnoise(N, 1.2, 55) * 0.9 + 0.35, 0, 1)       # solo algunos tramos de cada borde se abren
strata = np.sin((y + fnoise(N, 1.8, 68) * 40) / N * 2 * np.pi * 9) * 0.5 + 0.5       # estratos de la caliza
base = fnoise(N, 1.7, 51) * 0.6 + fnoise(N, 1.15, 52) * 0.32 + blur(fnoise(N, 0.75, 53), 0.9) * 0.08
pits = np.clip(fnoise(N, 0.55, 56) - 1.4, 0, None)
h = base * 0.02 + strata * 0.004 - crack * 0.03 - pits * 0.012 + blur(1 - edge, 6) * -0.004
lime = np.array([0.7, 0.67, 0.6]); warm = np.array([0.74, 0.64, 0.5]); grey = np.array([0.52, 0.52, 0.5])
t1 = np.clip(fnoise(N, 1.4, 57) * 0.45 + 0.5, 0, 1)[..., None]; t2 = np.clip(fnoise(N, 1.2, 58) * 0.35 + 0.2, 0, 1)[..., None]
cimg = lime * (1 - t1) + warm * t1; cimg = cimg * (1 - t2 * 0.45) + grey * t2 * 0.45
cimg *= (0.86 + 0.1 * np.clip(base * 0.5 + 0.5, 0, 1) + 0.04 * strata)[..., None]
cimg *= (1 - crack * 0.6)[..., None] * (1 - np.clip(pits, 0, 1) * 0.45)[..., None]
lichO = np.clip((fnoise(N, 1.2, 59) - 1.3) * 2.5, 0, 1) * np.clip(fnoise(N, 2.4, 69) * 0.6 + 0.6, 0, 1)
lichG = np.clip((fnoise(N, 1.4, 60) - 1.05) * 2.0, 0, 1)
cimg = cimg * (1 - lichO[..., None] * 0.6) + np.array([0.8, 0.55, 0.17]) * lichO[..., None] * 0.6       # liquen naranja
cimg = cimg * (1 - lichG[..., None] * 0.45) + np.array([0.7, 0.72, 0.63]) * lichG[..., None] * 0.45       # liquen gris verdoso
moss = np.clip(blur(crack, 3.0) * 1.8 + fnoise(N, 1.3, 61) * 0.3 - 0.5, 0, 1)       # musgo en grietas y huecos
mcol = np.array([0.27, 0.34, 0.12]) * (0.7 + 0.6 * np.clip(fnoise(N, 2.0, 62) * 0.5 + 0.5, 0, 1))[..., None]
cimg = cimg * (1 - moss[..., None] * 0.85) + mcol * moss[..., None] * 0.85
ao = np.clip(1 + blur(h - blur(h, 12), 3) * 14, 0.6, 1.08); cimg *= ao[..., None]
nrm(blur(h + moss * 0.003, 0.7) * (N / 2.2), 1.6, 0.8 + 0.14 * moss + 0.04 * t2[..., 0], 'roca'); save(cimg, 'roca_c')
print('ok sillar roca')

# ---- 7. madera: pino y chopo viejos (vigas, puertas, muebles, cubas): veta a lo largo de X, anillos, poros, nudos y fendas ----
S = 1.2; px = N / S
y, x = np.mgrid[0:N, 0:N].astype(np.float32)
def anoise(n, beta, seed, ax):       # ruido repetible alargado ax veces a lo largo de X
    r = np.random.default_rng(seed); w = r.standard_normal((n, n))
    fy = np.fft.fftfreq(n)[:, None]; fx = np.fft.fftfreq(n)[None, :] * ax; f = np.sqrt(fx * fx + fy * fy); f[0, 0] = 1
    a = np.real(np.fft.ifft2(np.fft.fft2(w) / f ** beta)); a -= a.mean(); return a / (a.std() + 1e-9)
def sst(a, b, v): t = np.clip((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
NR = 70       # anillos por baldosa (entero: repite sin costura)
ring = y / N * NR + anoise(N, 1.9, 71, 6) * 3.0 + anoise(N, 1.3, 72, 10) * 0.3       # anillos ondulados (y alguna catedral)
kin = np.zeros((N, N), np.float32); krim = np.zeros((N, N), np.float32); kring = np.zeros((N, N), np.float32)
for kx, ky, rk in ((0.23, 0.31, 17), (0.71, 0.74, 24), (0.58, 0.12, 11), (0.05, 0.86, 13)):
    dx = (x - kx * N + N / 2) % N - N / 2; dy = (y - ky * N + N / 2) % N - N / 2
    d = np.sqrt((dx / 1.5) ** 2 + dy ** 2)
    ring += rk * 1.5 * np.tanh(dy / (0.7 * rk)) * np.exp(-(d / (2.8 * rk)) ** 2) / (N / NR)       # la veta rodea el nudo
    k = np.clip(1 - d / rk, 0, 1); kin = np.maximum(kin, k)
    krim = np.maximum(krim, np.exp(-((d - rk) / 1.6) ** 2) * (0.5 + 0.5 * np.clip(anoise(N, 1.5, 80 + int(rk), 1) + 0.3, 0, 1)))
    kring = np.where(k > 0, np.sin(d / rk * 2 * np.pi * 3.5) * 0.5 + 0.5, kring)
p = ring % 1
late = sst(0.5, 0.88, p) * (1 - sst(0.9, 0.99, p))       # madera de verano: banda fina y oscura
fib = anoise(N, 0.85, 73, 28)       # fibras
dash = np.clip(anoise(N, 0.25, 74, 14) - 1.9, 0, None)       # poros
crn = anoise(N, 1.25, 75, 26); crm = np.clip((anoise(N, 1.7, 76, 3) - 0.85) * 2.2, 0, 1)
crack = np.exp(-(crn / 0.03) ** 2) * crm       # fendas a lo largo de la veta
grey = np.clip(fnoise(N, 1.3, 77) * 0.35 + 0.3, 0, 1)       # madera vieja, agrisada a manchas
tone = anoise(N, 1.6, 78, 3)
early = np.array([0.6, 0.45, 0.3]); latec = np.array([0.34, 0.22, 0.13])
cimg = early * (1 - late[..., None]) + latec * late[..., None]
cimg *= (0.93 + 0.05 * tone + 0.045 * fib)[..., None] * (1 - np.clip(dash, 0, 1) * 0.35)[..., None]
cimg = cimg * (1 - grey[..., None] * 0.4) + np.array([0.5, 0.47, 0.42]) * (cimg.mean(-1, keepdims=True) / 0.42) * grey[..., None] * 0.4
kc = np.array([0.29, 0.18, 0.1]) * (0.8 + 0.3 * kring)[..., None]
km = sst(0.0, 0.3, kin)[..., None]; cimg = cimg * (1 - km * 0.9) + kc * km * 0.9
cimg *= (1 - krim * 0.55)[..., None] * (1 - crack * 0.7)[..., None]
cimg *= (1 - blur(crack + krim * 0.6, 2.5) * 0.25)[..., None]       # sucio en fendas y alrededor de los nudos
h = late * 0.00035 + fib * 0.00007 - crack * 0.0016 - np.clip(dash, 0, 1) * 0.00025 + kin * 0.0003 - krim * 0.0008 + fnoise(N, 1.8, 79) * 0.00008
rough = np.clip(0.84 - late * 0.12 + crack * 0.12 + grey * 0.05 - km[..., 0] * 0.15, 0, 1)
nrm(blur(h, 0.6) * px, 1.7, rough, 'madera'); save(cimg, 'madera_c')
print('ok madera', np.round(cimg.reshape(-1, 3).mean(0), 3))

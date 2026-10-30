"""GLB -> GLB optimizado (texturas WebP + KHR_mesh_quantization) -> gzip -> base64 (.txt)."""
import json, struct, sys, io, gzip, base64, hashlib, os
import numpy as np
from PIL import Image

CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT2': 4, 'MAT3': 9, 'MAT4': 16}
MAXTEX = int(os.environ.get('MAXTEX', 2048))
WEBPQ = int(os.environ.get('WEBPQ', 85))


def read_glb(p):
    d = open(p, 'rb').read()
    assert d[:4] == b'glTF'
    off = 12; j = None; b = b''
    while off < len(d):
        ln, ty = struct.unpack('<II', d[off:off + 8])
        chunk = d[off + 8:off + 8 + ln]
        if ty == 0x4E4F534A: j = json.loads(chunk)
        elif ty == 0x004E4942: b = chunk
        off += 8 + ln
    return j, b


def write_glb(j, b):
    js = json.dumps(j, separators=(',', ':')).encode()
    js += b' ' * ((4 - len(js) % 4) % 4)
    b += b'\0' * ((4 - len(b) % 4) % 4)
    total = 12 + 8 + len(js) + 8 + len(b)
    return (struct.pack('<III', 0x46546C67, 2, total) + struct.pack('<II', len(js), 0x4E4F534A) + js +
            struct.pack('<II', len(b), 0x004E4942) + b)


def optimize(src):
    j, binb = read_glb(src)
    bvs = j.get('bufferViews', []); accs = j.get('accessors', [])

    def read_acc(i):
        a = accs[i]; dt = np.dtype(CT[a['componentType']]); n = NC[a['type']]
        if 'bufferView' not in a or 'sparse' in a: return None
        bv = bvs[a['bufferView']]
        start = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        stride = bv.get('byteStride', dt.itemsize * n)
        arr = np.ndarray((a['count'], n), dt, binb, start, (stride, dt.itemsize))
        out = arr.astype(np.float64) if dt != np.float32 else arr.astype(np.float32).copy()
        if a.get('normalized'):
            out = out.astype(np.float64)
            if dt == np.int8: out = np.maximum(out / 127, -1)
            elif dt == np.uint8: out = out / 255
            elif dt == np.int16: out = np.maximum(out / 32767, -1)
            elif dt == np.uint16: out = out / 65535
        return out

    # --- nuevo buffer ---
    newbin = bytearray(); newbvs = []; dedup = {}

    def add_bv(data, stride=None, target=None):
        key = (hashlib.sha1(data).digest(), stride, target)
        if key in dedup: return dedup[key]
        while len(newbin) % 4: newbin.append(0)
        bv = {'buffer': 0, 'byteOffset': len(newbin), 'byteLength': len(data)}
        if stride: bv['byteStride'] = stride
        if target: bv['target'] = target
        newbin.extend(data); newbvs.append(bv)
        dedup[key] = len(newbvs) - 1
        return dedup[key]

    oldbv_map = {}

    def copy_bv(i):
        if i in oldbv_map: return oldbv_map[i]
        bv = bvs[i]; o = bv.get('byteOffset', 0)
        oldbv_map[i] = add_bv(bytes(binb[o:o + bv['byteLength']]), bv.get('byteStride'), bv.get('target'))
        return oldbv_map[i]

    new_accs = []; acc_cache = {}

    def emit_acc(desc, arr_bytes, stride, target):
        bvi = add_bv(arr_bytes, stride, target)
        desc = dict(desc); desc['bufferView'] = bvi; desc.pop('byteOffset', None)
        key = json.dumps(desc, sort_keys=True)
        if key in acc_cache: return acc_cache[key]
        new_accs.append(desc); acc_cache[key] = len(new_accs) - 1
        return acc_cache[key]

    def padded(arr, stride):
        """arr (count, n) of dtype -> bytes with given stride"""
        cnt = arr.shape[0]; row = arr.dtype.itemsize * arr.shape[1]
        buf = np.zeros((cnt, stride), np.uint8)
        buf[:, :row] = arr.view(np.uint8).reshape(cnt, row)
        return buf.tobytes()

    passthru = {}

    def keep_acc(i):
        if i in passthru: return passthru[i]
        a = dict(accs[i])
        if 'bufferView' in a: a['bufferView'] = copy_bv(a['bufferView'])
        if 'sparse' in a:
            sp = json.loads(json.dumps(a['sparse']))
            sp['indices']['bufferView'] = copy_bv(sp['indices']['bufferView'])
            sp['values']['bufferView'] = copy_bv(sp['values']['bufferView'])
            a['sparse'] = sp
        new_accs.append(a); passthru[i] = len(new_accs) - 1
        return passthru[i]

    def q_snorm(v, bits):  # v in [-1,1]
        m = (1 << (bits - 1)) - 1
        return np.clip(np.round(v * m), -m, m).astype(np.int8 if bits == 8 else np.int16)

    def q_unorm16(v):
        return np.clip(np.round(v * 65535), 0, 65535).astype(np.uint16)

    meshes = j.get('meshes', [])
    skinned = {n['mesh'] for n in j.get('nodes', []) if 'mesh' in n and 'skin' in n}
    mesh_xf = {}  # mesh index -> (center, scale)
    stats = {'quantMeshes': 0}

    mats = j.get('materials', [])

    def tex_usage(mi):
        uv = set(); tan = False
        if mi is None: return uv, tan
        def walk(o, key=None):
            nonlocal tan
            if isinstance(o, dict):
                if 'index' in o and key and key.endswith('Texture'):
                    uv.add(o.get('texCoord', 0))
                    tt = o.get('extensions', {}).get('KHR_texture_transform', {})
                    if 'texCoord' in tt: uv.add(tt['texCoord'])
                    if 'normal' in key.lower(): tan = True
                for k, v in o.items(): walk(v, k)
            elif isinstance(o, list):
                for v in o: walk(v, key)
        walk(mats[mi])
        return uv, tan

    for mi, m in enumerate(meshes):
        prims = m['primitives']
        can_q = mi not in skinned and all('targets' not in p for p in prims)
        if can_q:
            mins = []; maxs = []
            for p in prims:
                pa = p['attributes'].get('POSITION')
                arr = read_acc(pa) if pa is not None else None
                if arr is None or arr.shape[0] == 0: can_q = False; break
                mins.append(arr.min(0)); maxs.append(arr.max(0))
        if can_q:
            mn = np.min(mins, 0); mx = np.max(maxs, 0)
            center = (mn + mx) / 2; half = float(np.max(mx - mn) / 2) or 1.0
            mesh_xf[mi] = (center, half); stats['quantMeshes'] += 1
        for p in prims:
            na = {}
            used_uv, need_tan = tex_usage(p.get('material'))
            for sem in list(p['attributes']):
                if (sem.startswith('TEXCOORD_') and int(sem[9:]) not in used_uv) or (sem == 'TANGENT' and not need_tan):
                    del p['attributes'][sem]; stats['dropped'] = stats.get('dropped', 0) + 1
            for sem, ai in p['attributes'].items():
                a = accs[ai]; arr = read_acc(ai) if can_q else None
                if arr is None: na[sem] = keep_acc(ai); continue
                if sem == 'POSITION':
                    q = q_snorm((arr - center) / half, 16)
                    d = {'componentType': 5122, 'normalized': True, 'count': a['count'], 'type': 'VEC3',
                         'min': q.min(0).tolist(), 'max': q.max(0).tolist()}
                    na[sem] = emit_acc(d, padded(q, 8), 8, 34962)
                elif sem == 'NORMAL':
                    nn = arr / np.maximum(np.linalg.norm(arr, axis=1, keepdims=True), 1e-12)
                    q = q_snorm(nn, 8)
                    na[sem] = emit_acc({'componentType': 5120, 'normalized': True, 'count': a['count'], 'type': 'VEC3'}, padded(q, 4), 4, 34962)
                elif sem == 'TANGENT':
                    t = arr.copy(); t[:, :3] /= np.maximum(np.linalg.norm(t[:, :3], axis=1, keepdims=True), 1e-12)
                    q = q_snorm(t, 8)
                    na[sem] = emit_acc({'componentType': 5120, 'normalized': True, 'count': a['count'], 'type': 'VEC4'}, padded(q, 4), 4, 34962)
                elif sem.startswith('TEXCOORD') and arr.min() >= 0 and arr.max() <= 1:
                    q = q_unorm16(arr)
                    na[sem] = emit_acc({'componentType': 5123, 'normalized': True, 'count': a['count'], 'type': 'VEC2'}, padded(q, 4), 4, 34962)
                elif sem.startswith('COLOR') and arr.min() >= 0 and arr.max() <= 1:
                    q = q_unorm16(arr); n = arr.shape[1]
                    na[sem] = emit_acc({'componentType': 5123, 'normalized': True, 'count': a['count'], 'type': a['type']}, padded(q, 8), 8, 34962)
                else:
                    f = arr.astype(np.float32); n = f.shape[1]
                    d = {k: v for k, v in a.items() if k in ('componentType', 'normalized', 'count', 'type', 'min', 'max')}
                    if a['componentType'] != 5126:
                        na[sem] = keep_acc(ai); continue
                    if sem.startswith('TEXCOORD'):  # fuera de [0,1]: recorta mantisa (~13 bits)
                        f = (f.view(np.uint32) & np.uint32(0xFFFFFC00)).view(np.float32)
                    na[sem] = emit_acc(d, padded(f, n * 4), n * 4 if n * 4 % 4 == 0 else None, 34962)
            p['attributes'] = na
            if 'indices' in p:
                ia = accs[p['indices']]; arr = read_acc(p['indices'])
                if arr is None: p['indices'] = keep_acc(p['indices'])
                else:
                    iv = arr.astype(np.int64).ravel()
                    if iv.max(initial=0) < 65535:
                        p['indices'] = emit_acc({'componentType': 5123, 'count': ia['count'], 'type': 'SCALAR'}, iv.astype(np.uint16).tobytes(), None, 34963)
                    else:
                        p['indices'] = emit_acc({'componentType': 5125, 'count': ia['count'], 'type': 'SCALAR'}, iv.astype(np.uint32).tobytes(), None, 34963)
            if 'targets' in p:
                p['targets'] = [{k: keep_acc(v) for k, v in t.items()} for t in p['targets']]

    for an in j.get('animations', []):
        for s in an['samplers']:
            s['input'] = keep_acc(s['input']); s['output'] = keep_acc(s['output'])
    for sk in j.get('skins', []):
        if 'inverseBindMatrices' in sk: sk['inverseBindMatrices'] = keep_acc(sk['inverseBindMatrices'])

    # --- texturas -> WebP ---
    imgs = j.get('images', []); img_bytes_before = img_bytes_after = 0
    for im in imgs:
        if 'bufferView' not in im:
            continue
        bv = bvs[im['bufferView']]; o = bv.get('byteOffset', 0)
        raw = bytes(binb[o:o + bv['byteLength']]); img_bytes_before += len(raw)
        try:
            pim = Image.open(io.BytesIO(raw)); pim.load()
            if max(pim.size) > MAXTEX:
                r = MAXTEX / max(pim.size)
                pim = pim.resize((max(1, round(pim.size[0] * r)), max(1, round(pim.size[1] * r))), Image.LANCZOS)
            has_a = pim.mode in ('RGBA', 'LA') or (pim.mode == 'P' and 'transparency' in pim.info)
            pim = pim.convert('RGBA' if has_a else 'RGB')
            if has_a and pim.getchannel('A').getextrema() == (255, 255): pim = pim.convert('RGB')
            out = io.BytesIO(); pim.save(out, 'WEBP', quality=WEBPQ, method=6)
            data = out.getvalue()
            if len(data) < len(raw):
                raw = data; im['mimeType'] = 'image/webp'
        except Exception as e:
            print('  img fail', e)
        img_bytes_after += len(raw)
        im['bufferView'] = add_bv(raw)
    if any(im.get('mimeType') == 'image/webp' for im in imgs):
        webp = {i for i, im in enumerate(imgs) if im.get('mimeType') == 'image/webp'}
        for t in j.get('textures', []):
            if t.get('source') in webp:
                t['extensions'] = {**t.get('extensions', {}), 'EXT_texture_webp': {'source': t.pop('source')}}
        for key in ('extensionsUsed', 'extensionsRequired'):
            j[key] = sorted(set(j.get(key, [])) | {'EXT_texture_webp'})

    # --- nodos: hijo con la descuantización ---
    nodes = j.get('nodes', [])
    for ni in range(len(nodes)):
        n = nodes[ni]
        if 'mesh' in n and n['mesh'] in mesh_xf:
            c, h = mesh_xf[n['mesh']]
            child = {'name': (n.get('name') or 'mesh') + '_q', 'mesh': n.pop('mesh'),
                     'translation': [float(x) for x in c], 'scale': [h, h, h]}
            if 'weights' in n: child['weights'] = n.pop('weights')
            nodes.append(child); n.setdefault('children', []).append(len(nodes) - 1)
    if stats['quantMeshes']:
        for key in ('extensionsUsed', 'extensionsRequired'):
            j[key] = sorted(set(j.get(key, [])) | {'KHR_mesh_quantization'})

    j['accessors'] = new_accs; j['bufferViews'] = newbvs
    j['buffers'] = [{'byteLength': len(newbin)}]
    j.setdefault('asset', {})['generator'] = 'apunta-visor optimizer (WebP + KHR_mesh_quantization)'
    plain = write_glb(j, bytes(newbin))
    filtered = apply_filters(j, newbin)
    return plain, filtered, stats, img_bytes_before, img_bytes_after, j


def apply_filters(j, binb):
    """Filtros reversibles para que gzip comprima mejor (los deshace el visor).
    v: delta por byte entre vértices consecutivos + transposición por stride.
    i2/i4: delta entre índices consecutivos + transposición de bytes."""
    j = json.loads(json.dumps(j)); b = bytearray(binb)
    ict = {}
    for a in j['accessors']:
        if 'bufferView' in a and j['bufferViews'][a['bufferView']].get('target') == 34963:
            ict[a['bufferView']] = a['componentType']
    for i, bv in enumerate(j['bufferViews']):
        o, L = bv['byteOffset'], bv['byteLength']
        if bv.get('target') == 34962 and bv.get('byteStride') and L % bv['byteStride'] == 0:
            s = bv['byteStride']
            a = np.frombuffer(bytes(b[o:o + L]), np.uint8).reshape(-1, s).copy()
            a[1:] = a[1:] - a[:-1]
            b[o:o + L] = a.T.tobytes(); bv['extras'] = {'f': 'v'}
        elif i in ict and ict[i] in (5123, 5125):
            dt = np.uint16 if ict[i] == 5123 else np.uint32
            a = np.frombuffer(bytes(b[o:o + L]), dt).copy(); a[1:] = a[1:] - a[:-1]
            w = a.itemsize; b[o:o + L] = a.view(np.uint8).reshape(-1, w).T.tobytes()
            bv['extras'] = {'f': 'i%d' % w}
    return write_glb(j, bytes(b))


def unfilter(glb):
    """Misma lógica que el visor JS, para verificar."""
    j, b = read_glb_bytes(glb); b = bytearray(b)
    for bv in j['bufferViews']:
        f = bv.get('extras', {}).get('f')
        if not f: continue
        o, L = bv['byteOffset'], bv['byteLength']
        if f == 'v':
            s = bv['byteStride']; a = np.frombuffer(bytes(b[o:o + L]), np.uint8).reshape(s, -1).T.copy()
            a = np.cumsum(a, axis=0, dtype=np.uint8); b[o:o + L] = a.tobytes()
        else:
            w = int(f[1]); dt = np.uint16 if w == 2 else np.uint32
            a = np.frombuffer(bytes(b[o:o + L]), np.uint8).reshape(w, -1).T.copy().view(dt).ravel()
            a = np.cumsum(a, dtype=dt); b[o:o + L] = a.tobytes()
        del bv['extras']
    return j, bytes(b)


def read_glb_bytes(d):
    off = 12; j = None; b = b''
    while off < len(d):
        ln, ty = struct.unpack('<II', d[off:off + 8]); chunk = d[off + 8:off + 8 + ln]
        if ty == 0x4E4F534A: j = json.loads(chunk)
        elif ty == 0x004E4942: b = chunk
        off += 8 + ln
    return j, b


if __name__ == '__main__':
    src, outdir = sys.argv[1], sys.argv[2]
    name = os.path.splitext(os.path.basename(src))[0]
    glb, filt, st, ib, ia, j = optimize(src)
    uj, ub = unfilter(filt); pj, pb = read_glb_bytes(glb)
    assert ub == pb and uj == pj, 'roundtrip failed'
    gz = gzip.compress(filt, 9, mtime=0)
    b64 = b'AGZ1:' + base64.b64encode(gz)
    open(os.path.join(outdir, name + '.txt'), 'wb').write(b64)
    open(os.path.join(os.environ.get('OPTDIR', os.path.join(outdir, '..', 'glb_opt')), name + '.glb'), 'wb').write(glb)
    info = {'id': name, 'archivo': name + '.txt', 'original': os.path.getsize(src), 'glb_opt': len(glb),
            'gzip': len(gz), 'txt': len(b64), 'mallas_cuantizadas': st['quantMeshes'],
            'animaciones': [a.get('name', f'Anim {i+1}') for i, a in enumerate(j.get('animations', []))],
            'img_antes': ib, 'img_despues': ia}
    print(json.dumps(info))

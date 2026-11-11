const PREFIX = 'Breda30__';

function sample(track, time, result) {
  let lo = 0, hi = track.t.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (track.t[mid] <= time) lo = mid;
    else hi = mid;
  }
  const alpha = Math.min(1, Math.max(0, (time - track.t[lo]) / (track.t[hi] - track.t[lo] || 1)));
  result.fromArray(track.v[lo]);
  return { next: track.v[hi], alpha };
}

/**
 * Vista en primera persona con los brazos del soldado nacional.
 * Pasa el namespace THREE, un GLTFLoader de esa versión y una cámara en la escena.
 * Ejemplo: const breda = await crearBreda30FPV({ THREE, loader: new GLTFLoader(), camera });
 * Llama a breda.update(deltaEnSegundos) antes de renderizar.
 * breda.play('Recargar'), breda.setAim(1), breda.setBipod(1).
 */
export async function crearBreda30FPV({ THREE, loader, camera, baseURL = new URL('.', import.meta.url) }) {
  const base = new URL(baseURL, import.meta.url);
  const [person, armsLibrary] = await Promise.all([
    loader.loadAsync(new URL('soldado_nacional.json', base).href),
    loader.loadAsync(new URL('armas.json', base).href)
  ]);
  const data = person.parser.json.asset.extras?.breda30;
  if (!data) throw new Error('soldado_nacional.json no trae los datos de la Breda 30');
  const soldier = person.scene, gun = armsLibrary.scene.getObjectByName(data.root);
  const arms = soldier.getObjectByName(data.arms), hand = soldier.getObjectByName(data.mountBone);
  if (!gun || !arms?.isSkinnedMesh || !hand) throw new Error('Falta la Breda, el hueso del arma o los brazos FPV');

  soldier.traverse(object => {
    if (object.isMesh) object.visible = object === arms;
  });
  // La selección de triángulos comparte el esqueleto del cuerpo. Su caja cambia con cada pose.
  arms.frustumCulled = false;
  hand.add(gun);
  gun.position.fromArray(data.mount.translation);
  gun.quaternion.fromArray(data.mount.rotation);
  gun.scale.setScalar(data.mount.scale);

  const view = new THREE.Group();
  view.name = 'Breda30_FPV';
  const align = new THREE.Group();
  align.matrixAutoUpdate = false;
  align.add(soldier);
  view.add(align);
  camera.add(view);

  const soldierMixer = new THREE.AnimationMixer(soldier);
  const weaponMixer = new THREE.AnimationMixer(gun);
  const names = new Set();
  gun.traverse(object => names.add(object.name));
  const personClips = new Map(person.animations.map(clip => [clip.name, clip]));
  const weaponClips = new Map(armsLibrary.animations.filter(c => c.name.startsWith(PREFIX)).map(c => [
    c.name, new THREE.AnimationClip(c.name, c.duration, c.tracks.filter(t => names.has(t.name.slice(0, t.name.lastIndexOf('.')))))
  ]));
  const extras = new Map(person.parser.json.animations.map(clip => [clip.name, clip.extras?.fpv]));
  const definitions = data.clips;
  const legs = ['izq', 'der'].map(side => {
    const object = gun.getObjectByName('breda30_pata_' + side);
    return { object, folded: object.quaternion.clone() };
  });
  const muzzle = gun.getObjectByName('breda30_boca');
  const rear = new THREE.Vector3().fromArray(data.sights.rear);
  const hip = new THREE.Vector3().fromArray(data.camera.hip);
  const ads = new THREE.Vector3().fromArray(data.camera.aim);
  const aimRotation = new THREE.Quaternion().fromArray(data.camera.rotation);
  const position = new THREE.Vector3(), offset = new THREE.Vector3(), nextT = new THREE.Vector3();
  const rotation = new THREE.Quaternion(), nextQ = new THREE.Quaternion(), upright = new THREE.Quaternion();
  const inModel = new THREE.Matrix4(), anchor = new THREE.Matrix4();
  const fromRear = new THREE.Matrix4().makeTranslation(-rear.x, -rear.y, -rear.z);
  const unit = new THREE.Vector3(1, 1, 1);
  let current, bodyAction, weaponAction, aimLayer, aim = 0, aimTarget = 0, bipod = 0;

  function action(mixer, clip, loop) {
    const a = mixer.clipAction(clip).reset();
    a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    a.clampWhenFinished = !loop;
    return a.play();
  }

  function play(name, { loop = definitions[name]?.loop } = {}) {
    const key = PREFIX + name, c = personClips.get(key), w = weaponClips.get(key);
    if (!c || !w) throw new RangeError('Clip Breda 30 desconocido: ' + name);
    soldierMixer.stopAllAction();
    weaponMixer.stopAllAction();
    current = name;
    bodyAction = action(soldierMixer, c, loop);
    weaponAction = action(weaponMixer, w, loop);
    aimLayer = undefined;
    if (name === 'Sujetar') {
      aimLayer = action(soldierMixer, personClips.get(PREFIX + 'Apuntar'), false);
      aimLayer.paused = true;
      aimLayer.time = aimLayer.getClip().duration * .98;
    }
    if (name === 'Apuntar') aimTarget = 1;
    return bodyAction;
  }

  function update(delta) {
    const dt = Math.max(0, delta);
    aim += (aimTarget - aim) * (1 - Math.exp(-dt * 16));
    const oneShot = bodyAction.loop === THREE.LoopOnce;
    if (oneShot && bodyAction.paused && current !== 'Guardar') {
      if (current === 'Bipode' || current === 'Tumbarse') bipod = 1;
      play('Sujetar');
    }
    if (aimLayer) {
      bodyAction.setEffectiveWeight(1 - aim);
      aimLayer.setEffectiveWeight(aim);
    }
    soldierMixer.update(dt);
    weaponMixer.update(dt);
    if (current !== 'Bipode' && current !== 'Tumbarse') {
      for (const { object, folded } of legs) object.quaternion.copy(folded).slerp(upright, bipod);
    }
    const fx = extras.get(PREFIX + current), t = bodyAction.time;
    offset.set(0, 0, 0);
    rotation.identity();
    if (fx) {
      const tFrame = sample(fx.translation, t, offset);
      const rFrame = sample(fx.rotation, t, rotation);
      offset.lerp(nextT.fromArray(tFrame.next), tFrame.alpha);
      rotation.slerp(nextQ.fromArray(rFrame.next), rFrame.alpha);
    }
    const relax = current === 'Recargar' || current === 'Inspeccionar' || current === 'Quitar_Cargador'
      ? Math.sin(Math.PI * Math.min(1, t / bodyAction.getClip().duration)) : 0;
    position.copy(hip).lerp(ads, aim * (1 - relax)).add(offset);
    rotation.multiply(aimRotation);
    // Se ancla el arma a la cámara y se mantiene el contacto de los brazos con ella.
    align.updateWorldMatrix(true, true);
    inModel.copy(align.matrixWorld).invert().multiply(gun.matrixWorld);
    anchor.compose(position, rotation, unit).multiply(fromRear).multiply(inModel.invert());
    align.matrix.copy(anchor);
    align.matrixWorldNeedsUpdate = true;
    align.updateMatrixWorld(true);
  }

  play('Sujetar');
  update(0);
  return {
    view, gun, arms, muzzle, clips: Object.keys(definitions), play, update,
    setAim(value) { aimTarget = THREE.MathUtils.clamp(value, 0, 1); },
    setBipod(value) { bipod = THREE.MathUtils.clamp(value, 0, 1); },
    dispose() {
      soldierMixer.stopAllAction(); weaponMixer.stopAllAction();
      soldierMixer.uncacheRoot(soldier); weaponMixer.uncacheRoot(gun);
      view.removeFromParent();
    }
  };
}

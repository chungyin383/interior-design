const imageInput = document.getElementById("imageInput");
const startCalibrationBtn = document.getElementById("startCalibrationBtn");
const scaleInfo = document.getElementById("scaleInfo");
const calibrationLengthBox = document.getElementById("calibrationLengthBox");
const actualLengthInput = document.getElementById("actualLengthInput");
const confirmLengthBtn = document.getElementById("confirmLengthBtn");
const statusBar = document.getElementById("statusBar");

const objectForm = document.getElementById("objectForm");
const objectType = document.getElementById("objectType");
const objectName = document.getElementById("objectName");
const objectWidth = document.getElementById("objectWidth");
const objectHeight = document.getElementById("objectHeight");
const objectDiameter = document.getElementById("objectDiameter");
const objectColor = document.getElementById("objectColor");
const objectRotation = document.getElementById("objectRotation");
const rectDims = document.getElementById("rectDims");
const circleDims = document.getElementById("circleDims");
const saveObjectBtn = document.getElementById("saveObjectBtn");
const deleteObjectBtn = document.getElementById("deleteObjectBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const objectEditorInfo = document.getElementById("objectEditorInfo");
const objectList = document.getElementById("objectList");
const presetList = document.getElementById("presetList");
const saveProjectBtn = document.getElementById("saveProjectBtn");
const loadProjectBtn = document.getElementById("loadProjectBtn");
const loadProjectInput = document.getElementById("loadProjectInput");
const activityButtons = Array.from(document.querySelectorAll(".activity-button"));
const sidebarViews = Array.from(document.querySelectorAll(".sidebar-view"));
const sidebarTitle = document.getElementById("sidebarTitle");

const canvas = document.getElementById("editorCanvas");
const ctx = canvas.getContext("2d");

const state = {
  floorPlanImage: null,
  floorPlanDataUrl: null,
  imageScale: 1,
  mode: "idle",
  calibrationPoints: [],
  showCalibrationGuides: false,
  pxPerUnit: null,
  objects: [],
  selectedObjectId: null,
  editingObjectId: null,
  activeSidebarSection: "upload",
  dragging: {
    active: false,
    objectId: null,
    offsetX: 0,
    offsetY: 0,
  },
};

const CANVAS_MAX_WIDTH = 1200;
const CANVAS_MAX_HEIGHT = 820;

const DEFAULT_FURNITURE_PRESETS = [
  {
    key: "sofa-l",
    name: "Sofa",
    type: "rectangle",
    width: 240,
    height: 155,
    color: "#b7791f",
    shape: "l-sofa",
    cutoutWidth: 150,
    cutoutHeight: 65,
    cutoutCorner: "top-left",
  },
  {
    key: "tv",
    name: "TV",
    type: "rectangle",
    width: 138,
    height: 35,
    color: "#475569",
  },
  {
    key: "shoes",
    name: "Shoes",
    type: "rectangle",
    width: 105,
    height: 40,
    color: "#0f766e",
  },
  {
    key: "piano",
    name: "Piano",
    type: "rectangle",
    width: 110,
    height: 28,
    color: "#1f2937",
  },
  {
    key: "clothes",
    name: "Clothes",
    type: "rectangle",
    width: 120,
    height: 60,
    color: "#7c3aed",
  },
  {
    key: "desk-1",
    name: "Desk 1",
    type: "rectangle",
    width: 120,
    height: 60,
    color: "#2563eb",
  },
  {
    key: "desk-2",
    name: "Desk 2",
    type: "rectangle",
    width: 120,
    height: 60,
    color: "#0891b2",
  },
  {
    key: "bed",
    name: "Bed",
    type: "rectangle",
    width: 150,
    height: 185,
    color: "#be185d",
  },
  {
    key: "book",
    name: "Book",
    type: "rectangle",
    width: 80,
    height: 28,
    color: "#ca8a04",
  },
];

const SIDEBAR_SECTION_TITLES = {
  upload: "Upload Floor Plan",
  scale: "Set Scale",
  editor: "Create / Edit Object",
  library: "Furniture Library",
  objects: "Objects",
  project: "Project",
};

function setStatus(message) {
  statusBar.textContent = message;
}

function setActiveSidebarSection(sectionName) {
  if (!SIDEBAR_SECTION_TITLES[sectionName]) {
    return;
  }

  state.activeSidebarSection = sectionName;

  activityButtons.forEach((button) => {
    const isActive = button.dataset.section === sectionName;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  sidebarViews.forEach((view) => {
    view.classList.toggle("hidden", view.dataset.section !== sectionName);
    view.classList.toggle("active", view.dataset.section === sectionName);
  });

  sidebarTitle.textContent = SIDEBAR_SECTION_TITLES[sectionName];
}

function updateTypeInputs() {
  const isRect = objectType.value === "rectangle";
  rectDims.classList.toggle("hidden", !isRect);
  circleDims.classList.toggle("hidden", isRect);
}

function updateObjectEditorInfo(message) {
  objectEditorInfo.textContent = message;
}

function updateObjectEditorActions() {
  const isEditing = Boolean(state.editingObjectId);
  saveObjectBtn.textContent = isEditing ? "Update Object" : "Add Object";
  deleteObjectBtn.classList.toggle("hidden", !isEditing);
  cancelEditBtn.classList.toggle("hidden", !isEditing);
}

function resetObjectForm() {
  objectType.value = "rectangle";
  objectName.value = "";
  objectWidth.value = "";
  objectHeight.value = "";
  objectDiameter.value = "";
  objectColor.value = "#2f80ed";
  objectRotation.value = "0";
  state.editingObjectId = null;
  updateObjectEditorActions();
  updateObjectEditorInfo("Click an object on the canvas to edit or delete it here.");
  updateTypeInputs();
}

function clearSelection() {
  state.selectedObjectId = null;
  resetObjectForm();
  renderObjectList();
  redraw();
}

function getPresetPosition(index) {
  const columns = 3;
  const rows = Math.ceil(DEFAULT_FURNITURE_PRESETS.length / columns);
  const col = index % columns;
  const row = Math.floor(index / columns);
  const x = (canvas.width / (columns + 1)) * (col + 1);
  const y = (canvas.height / (rows + 1)) * (row + 1);
  return { x, y };
}

function createObjectFromPreset(preset, index) {
  const position = getPresetPosition(index);
  return {
    id: crypto.randomUUID(),
    x: position.x,
    y: position.y,
    name: preset.name,
    type: preset.type,
    color: preset.color,
    rotationDeg: 0,
    width: preset.width,
    height: preset.height,
    diameter: preset.diameter,
    shape: preset.shape,
    cutoutWidth: preset.cutoutWidth,
    cutoutHeight: preset.cutoutHeight,
    cutoutCorner: preset.cutoutCorner,
  };
}

function createDefaultFurnitureObjects() {
  return DEFAULT_FURNITURE_PRESETS.map((preset, index) => createObjectFromPreset(preset, index));
}

function addPresetObject(presetKey) {
  const preset = DEFAULT_FURNITURE_PRESETS.find((entry) => entry.key === presetKey);
  if (!preset) {
    return;
  }

  const obj = createObjectFromPreset(preset, state.objects.length);
  state.objects.push(obj);
  beginEditObject(obj.id);
  renderObjectList();
  redraw();
  setStatus(`Added preset: ${obj.name}`);
}

function renderPresetList() {
  presetList.innerHTML = "";

  DEFAULT_FURNITURE_PRESETS.forEach((preset) => {
    const li = document.createElement("li");
    li.className = "preset-item";

    const nameEl = document.createElement("div");
    nameEl.className = "preset-name";
    nameEl.textContent = preset.name;

    const metaEl = document.createElement("div");
    metaEl.className = "object-meta";
    metaEl.textContent =
      preset.shape === "l-sofa"
        ? `${preset.width} × ${preset.height} with ${preset.cutoutWidth} × ${preset.cutoutHeight} cut-out`
        : preset.type === "rectangle"
          ? `${preset.width} × ${preset.height}`
          : `D ${preset.diameter}`;

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.textContent = "Add";
    addBtn.addEventListener("click", () => addPresetObject(preset.key));

    li.append(nameEl, metaEl, addBtn);
    presetList.appendChild(li);
  });
}

function getCanvasPoint(evt) {
  const rect = canvas.getBoundingClientRect();
  const x = ((evt.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((evt.clientY - rect.top) / rect.height) * canvas.height;
  return { x, y };
}

function drawCheckerBackground() {
  const size = 20;
  for (let y = 0; y < canvas.height; y += size) {
    for (let x = 0; x < canvas.width; x += size) {
      const even = ((x + y) / size) % 2 === 0;
      ctx.fillStyle = even ? "#f7f9fc" : "#eef3f8";
      ctx.fillRect(x, y, size, size);
    }
  }
}

function getObjectPixelSize(obj) {
  if (!state.pxPerUnit) {
    return null;
  }

  if (obj.type === "rectangle") {
    return {
      widthPx: obj.width * state.pxPerUnit,
      heightPx: obj.height * state.pxPerUnit,
    };
  }

  const diameterPx = obj.diameter * state.pxPerUnit;
  return {
    widthPx: diameterPx,
    heightPx: diameterPx,
  };
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function normalizeRotation(degrees) {
  const normalized = Number.isFinite(degrees) ? degrees % 360 : 0;
  return normalized < 0 ? normalized + 360 : normalized;
}

function getObjectBoundingHalfExtents(obj, size) {
  if (obj.type === "circle") {
    const radius = size.widthPx / 2;
    return { halfW: radius, halfH: radius };
  }

  const halfW = size.widthPx / 2;
  const halfH = size.heightPx / 2;
  const angle = toRadians(obj.rotationDeg || 0);
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));

  return {
    halfW: halfW * cos + halfH * sin,
    halfH: halfW * sin + halfH * cos,
  };
}

function drawCalibrationGuides() {
  if (!state.showCalibrationGuides || !state.calibrationPoints.length) {
    return;
  }

  const [p1, p2] = state.calibrationPoints;
  ctx.save();
  ctx.strokeStyle = "#f97316";
  ctx.fillStyle = "#f97316";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.arc(p1.x, p1.y, 4, 0, Math.PI * 2);
  ctx.fill();

  if (p2) {
    ctx.beginPath();
    ctx.arc(p2.x, p2.y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  ctx.restore();
}

function getRectangleCutoutPixels(obj) {
  if (obj.shape !== "l-sofa") {
    return null;
  }

  return {
    widthPx: (obj.cutoutWidth || 0) * state.pxPerUnit,
    heightPx: (obj.cutoutHeight || 0) * state.pxPerUnit,
    corner: obj.cutoutCorner || "top-left",
  };
}

function traceRectangleShape(obj, size) {
  const left = -size.widthPx / 2;
  const top = -size.heightPx / 2;
  const right = size.widthPx / 2;
  const bottom = size.heightPx / 2;
  const cutout = getRectangleCutoutPixels(obj);

  ctx.beginPath();

  if (!cutout) {
    ctx.rect(left, top, size.widthPx, size.heightPx);
    return;
  }

  const cutoutWidthPx = Math.min(cutout.widthPx, size.widthPx);
  const cutoutHeightPx = Math.min(cutout.heightPx, size.heightPx);

  if (cutout.corner === "top-left") {
    const innerX = left + cutoutWidthPx;
    const innerY = top + cutoutHeightPx;

    ctx.moveTo(innerX, top);
    ctx.lineTo(right, top);
    ctx.lineTo(right, bottom);
    ctx.lineTo(left, bottom);
    ctx.lineTo(left, innerY);
    ctx.lineTo(innerX, innerY);
    ctx.closePath();
    return;
  }

  const innerX = right - cutoutWidthPx;
  const innerY = top + cutoutHeightPx;

  ctx.moveTo(left, top);
  ctx.lineTo(innerX, top);
  ctx.lineTo(innerX, innerY);
  ctx.lineTo(right, innerY);
  ctx.lineTo(right, bottom);
  ctx.lineTo(left, bottom);
  ctx.closePath();
}

function drawObjects() {
  state.objects.forEach((obj) => {
    const size = getObjectPixelSize(obj);
    if (!size) {
      return;
    }

    const isSelected = obj.id === state.selectedObjectId;

    ctx.save();
    ctx.translate(obj.x, obj.y);
    ctx.rotate(toRadians(obj.rotationDeg || 0));
    ctx.fillStyle = obj.color;
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = isSelected ? "#111827" : "#1f2937";
    ctx.lineWidth = isSelected ? 2.5 : 1.25;

    if (obj.type === "rectangle") {
      const left = -size.widthPx / 2;
      const top = -size.heightPx / 2;
      traceRectangleShape(obj, size);
      ctx.fill();
      ctx.globalAlpha = 1;
      traceRectangleShape(obj, size);
      ctx.stroke();

      if (isSelected) {
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = "#2563eb";
        ctx.strokeRect(left - 3, top - 3, size.widthPx + 6, size.heightPx + 6);
        ctx.setLineDash([]);
      }
    } else {
      const radius = size.widthPx / 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();

      if (isSelected) {
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = "#2563eb";
        ctx.beginPath();
        ctx.arc(0, 0, radius + 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    ctx.restore();

    const bounds = getObjectBoundingHalfExtents(obj, size);
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#111827";
    ctx.font = "13px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText(obj.name, obj.x, obj.y - bounds.halfH - 8);
    ctx.restore();
  });
}

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (state.floorPlanImage) {
    ctx.drawImage(state.floorPlanImage, 0, 0, canvas.width, canvas.height);
  } else {
    drawCheckerBackground();
  }

  drawObjects();
  drawCalibrationGuides();
}

function renderObjectList() {
  objectList.innerHTML = "";

  if (!state.objects.length) {
    const li = document.createElement("li");
    li.className = "object-item";
    li.textContent = "No objects yet.";
    objectList.appendChild(li);
    return;
  }

  state.objects.forEach((obj) => {
    const li = document.createElement("li");
    li.className = "object-item";
    li.classList.toggle("selected", obj.id === state.selectedObjectId);
    li.addEventListener("click", (evt) => {
      if (evt.target.closest("button")) {
        return;
      }

      beginEditObject(obj.id);
    });

    const nameEl = document.createElement("div");
    nameEl.innerHTML = `<strong>${obj.name}</strong> (${obj.type})`;

    const metaEl = document.createElement("div");
    metaEl.className = "object-meta";
    metaEl.textContent =
      obj.type === "rectangle"
        ? `${obj.shape === "l-sofa" ? "L-sofa" : "Rect"} ${obj.width} × ${obj.height} • Rot ${obj.rotationDeg || 0}°`
        : `D ${obj.diameter} • Rot ${obj.rotationDeg || 0}°`;

    const actions = document.createElement("div");
    actions.className = "object-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => beginEditObject(obj.id));

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.textContent = "Delete";
    delBtn.className = "delete";
    delBtn.addEventListener("click", () => deleteObject(obj.id));

    actions.append(editBtn, delBtn);
    li.append(nameEl, metaEl, actions);
    objectList.appendChild(li);
  });
}

function beginEditObject(id) {
  const obj = state.objects.find((entry) => entry.id === id);
  if (!obj) {
    return;
  }

  setActiveSidebarSection("editor");
  state.selectedObjectId = id;
  state.editingObjectId = id;

  objectType.value = obj.type;
  objectName.value = obj.name;
  objectColor.value = obj.color;
  objectRotation.value = String(obj.rotationDeg || 0);

  if (obj.type === "rectangle") {
    objectWidth.value = String(obj.width);
    objectHeight.value = String(obj.height);
    objectDiameter.value = "";
  } else {
    objectDiameter.value = String(obj.diameter);
    objectWidth.value = "";
    objectHeight.value = "";
  }

  updateTypeInputs();
  updateObjectEditorActions();
  renderObjectList();
  updateObjectEditorInfo(`Selected object: ${obj.name}`);
  setStatus(`Editing object: ${obj.name}`);
  redraw();
}

function deleteObject(id) {
  const index = state.objects.findIndex((obj) => obj.id === id);
  if (index < 0) {
    return;
  }

  const [removed] = state.objects.splice(index, 1);

  if (state.selectedObjectId === id) {
    state.selectedObjectId = null;
  }

  if (state.editingObjectId === id) {
    resetObjectForm();
  }

  renderObjectList();
  redraw();
  setStatus(`Deleted object: ${removed.name}`);
}

function createOrUpdateObject(evt) {
  evt.preventDefault();

  if (!state.pxPerUnit && !state.editingObjectId) {
    setStatus("Set scale first before adding objects.");
    return;
  }

  const name = objectName.value.trim();
  const type = objectType.value;
  const color = objectColor.value;
  const rotationDegRaw = Number(objectRotation.value);
  const rotationDeg = normalizeRotation(rotationDegRaw);

  if (!name) {
    setStatus("Enter an object name.");
    return;
  }

  if (!Number.isFinite(rotationDegRaw)) {
    setStatus("Enter a valid rotation value.");
    return;
  }

  const base = {
    name,
    type,
    color,
    rotationDeg,
  };

  if (type === "rectangle") {
    const width = Number(objectWidth.value);
    const height = Number(objectHeight.value);

    if (!(width > 0) || !(height > 0)) {
      setStatus("Rectangle needs positive width and height.");
      return;
    }

    base.width = width;
    base.height = height;
  } else {
    const diameter = Number(objectDiameter.value);
    if (!(diameter > 0)) {
      setStatus("Circle needs a positive diameter.");
      return;
    }

    base.diameter = diameter;
  }

  if (state.editingObjectId) {
    const obj = state.objects.find((entry) => entry.id === state.editingObjectId);
    if (!obj) {
      setStatus("The object being edited was not found.");
      return;
    }

    Object.assign(obj, base);
    setStatus(`Updated object: ${obj.name}`);
    state.selectedObjectId = obj.id;
    beginEditObject(obj.id);
  } else {
    const id = crypto.randomUUID();
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const newObj = {
      id,
      x: centerX,
      y: centerY,
      ...base,
    };

    state.objects.push(newObj);
    state.selectedObjectId = id;
    beginEditObject(id);
    setStatus(`Added object: ${newObj.name}. Drag it on the plan.`);
  }

  renderObjectList();
  redraw();
}

function startCalibrationMode() {
  if (!state.floorPlanImage) {
    setStatus("Upload a floor plan image before calibration.");
    return;
  }

  state.mode = "calibrate";
  state.calibrationPoints = [];
  state.showCalibrationGuides = true;
  calibrationLengthBox.classList.add("hidden");
  actualLengthInput.value = "";
  setStatus("Calibration mode: click the first point on the floor plan.");
  redraw();
}

function finishCalibration() {
  const actualLength = Number(actualLengthInput.value);
  if (!(actualLength > 0)) {
    setStatus("Enter a positive actual length.");
    return;
  }

  const [p1, p2] = state.calibrationPoints;
  const pixelDistance = Math.hypot(p2.x - p1.x, p2.y - p1.y);

  if (!(pixelDistance > 0)) {
    setStatus("Calibration points are invalid. Try again.");
    return;
  }

  state.pxPerUnit = pixelDistance / actualLength;
  state.mode = "idle";
  state.calibrationPoints = [];
  state.showCalibrationGuides = false;
  calibrationLengthBox.classList.add("hidden");
  setActiveSidebarSection("editor");

  scaleInfo.textContent = `Scale: ${state.pxPerUnit.toFixed(2)} px per unit`;
  setStatus("Scale set. You can now add objects with actual dimensions.");
  redraw();
}

function getObjectAtPoint(x, y) {
  for (let i = state.objects.length - 1; i >= 0; i -= 1) {
    const obj = state.objects[i];
    const size = getObjectPixelSize(obj);
    if (!size) {
      continue;
    }

    if (obj.type === "rectangle") {
      const angle = toRadians(obj.rotationDeg || 0);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const dx = x - obj.x;
      const dy = y - obj.y;

      const localX = dx * cos + dy * sin;
      const localY = -dx * sin + dy * cos;
      const halfW = size.widthPx / 2;
      const halfH = size.heightPx / 2;

      if (
        localX >= -halfW &&
        localX <= halfW &&
        localY >= -halfH &&
        localY <= halfH
      ) {
        const cutout = getRectangleCutoutPixels(obj);
        if (cutout) {
          const top = -halfH;
          const left = -halfW;
          const right = halfW;
          const cutoutWidthPx = Math.min(cutout.widthPx, size.widthPx);
          const cutoutHeightPx = Math.min(cutout.heightPx, size.heightPx);
          const innerY = top + cutoutHeightPx;

          const isInsideCutout =
            cutout.corner === "top-left"
              ? localX <= left + cutoutWidthPx && localY <= innerY
              : localX >= right - cutoutWidthPx && localY <= innerY;

          if (isInsideCutout) {
            continue;
          }
        }

        return obj;
      }
    } else {
      const radius = size.widthPx / 2;
      const dist = Math.hypot(x - obj.x, y - obj.y);
      if (dist <= radius) {
        return obj;
      }
    }
  }

  return null;
}

function moveObjectToFront(id) {
  const index = state.objects.findIndex((obj) => obj.id === id);
  if (index < 0 || index === state.objects.length - 1) {
    return;
  }

  const [obj] = state.objects.splice(index, 1);
  state.objects.push(obj);
}

function clampObjectPosition(obj) {
  const size = getObjectPixelSize(obj);
  if (!size) {
    return;
  }

  const bounds = getObjectBoundingHalfExtents(obj, size);
  const halfW = bounds.halfW;
  const halfH = bounds.halfH;

  obj.x = Math.min(canvas.width - halfW, Math.max(halfW, obj.x));
  obj.y = Math.min(canvas.height - halfH, Math.max(halfH, obj.y));
}

function onCanvasMouseDown(evt) {
  const point = getCanvasPoint(evt);

  if (state.mode === "calibrate") {
    if (state.calibrationPoints.length < 2) {
      state.calibrationPoints.push(point);

      if (state.calibrationPoints.length === 1) {
        setStatus("Now click the second point.");
      }

      if (state.calibrationPoints.length === 2) {
        calibrationLengthBox.classList.remove("hidden");
        setStatus("Enter the actual distance between those points and click Confirm.");
      }

      redraw();
    }
    return;
  }

  const hit = getObjectAtPoint(point.x, point.y);
  if (!hit) {
    clearSelection();
    return;
  }

  moveObjectToFront(hit.id);
  beginEditObject(hit.id);

  state.dragging.active = true;
  state.dragging.objectId = hit.id;
  state.dragging.offsetX = point.x - hit.x;
  state.dragging.offsetY = point.y - hit.y;

  redraw();
}

function onCanvasMouseMove(evt) {
  if (!state.dragging.active) {
    return;
  }

  const point = getCanvasPoint(evt);
  const obj = state.objects.find((entry) => entry.id === state.dragging.objectId);

  if (!obj) {
    return;
  }

  obj.x = point.x - state.dragging.offsetX;
  obj.y = point.y - state.dragging.offsetY;
  clampObjectPosition(obj);

  redraw();
}

function stopDragging() {
  if (!state.dragging.active) {
    return;
  }

  state.dragging.active = false;
  state.dragging.objectId = null;
  state.dragging.offsetX = 0;
  state.dragging.offsetY = 0;
  setStatus("Object moved.");
}

function resizeCanvasForImage(image) {
  const scale = Math.min(
    CANVAS_MAX_WIDTH / image.naturalWidth,
    CANVAS_MAX_HEIGHT / image.naturalHeight,
    1
  );

  state.imageScale = scale;
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
}

function handleImageUpload(evt) {
  const file = evt.target.files?.[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = String(reader.result);
    const image = new Image();
    image.onload = () => {
      state.floorPlanImage = image;
      state.floorPlanDataUrl = dataUrl;
      resizeCanvasForImage(image);
      state.pxPerUnit = null;
      state.calibrationPoints = [];
      state.showCalibrationGuides = false;
      state.objects = createDefaultFurnitureObjects();
      state.selectedObjectId = null;
      resetObjectForm();
      renderObjectList();
      setActiveSidebarSection("scale");

      scaleInfo.textContent = "Scale not set.";
      setStatus("Image loaded. Click 'Pick 2 Points' to set scale.");
      redraw();
    };

    image.src = dataUrl;
  };

  reader.readAsDataURL(file);
}

function buildProjectData() {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    floorPlanDataUrl: state.floorPlanDataUrl,
    pxPerUnit: state.pxPerUnit,
    objects: state.objects,
  };
}

function saveProject() {
  if (!state.floorPlanDataUrl) {
    setStatus("Upload a floor plan before saving a project.");
    return;
  }

  const project = buildProjectData();
  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `floor-plan-project-${Date.now()}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  setStatus("Project saved.");
}

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load floor plan image from project."));
    image.src = dataUrl;
  });
}

async function handleLoadProjectFile(evt) {
  const file = evt.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const project = JSON.parse(text);

    if (!project.floorPlanDataUrl) {
      throw new Error("Project file is missing floor plan image data.");
    }

    const image = await loadImageFromDataUrl(project.floorPlanDataUrl);
    state.floorPlanImage = image;
    state.floorPlanDataUrl = project.floorPlanDataUrl;
    resizeCanvasForImage(image);

    state.pxPerUnit = Number(project.pxPerUnit) > 0 ? Number(project.pxPerUnit) : null;
    state.calibrationPoints = [];
    state.showCalibrationGuides = false;
    state.objects = Array.isArray(project.objects)
      ? project.objects
          .map((obj) => ({
            ...obj,
            rotationDeg: normalizeRotation(Number(obj.rotationDeg) || 0),
          }))
          .filter((obj) => obj && obj.id && obj.name && obj.type)
      : [];
    state.selectedObjectId = null;
    resetObjectForm();
    renderObjectList();
    setActiveSidebarSection(state.pxPerUnit ? "editor" : "scale");

    if (state.pxPerUnit) {
      scaleInfo.textContent = `Scale: ${state.pxPerUnit.toFixed(2)} px per unit`;
      setStatus("Project loaded.");
    } else {
      scaleInfo.textContent = "Scale not set.";
      setStatus("Project loaded, but scale is not set. Calibrate before adding objects.");
    }

    redraw();
  } catch (error) {
    setStatus(`Failed to load project: ${error.message}`);
  } finally {
    loadProjectInput.value = "";
  }
}

imageInput.addEventListener("change", handleImageUpload);
startCalibrationBtn.addEventListener("click", startCalibrationMode);
confirmLengthBtn.addEventListener("click", finishCalibration);

activityButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveSidebarSection(button.dataset.section);
  });
});

objectType.addEventListener("change", updateTypeInputs);
objectForm.addEventListener("submit", createOrUpdateObject);
deleteObjectBtn.addEventListener("click", () => {
  if (state.editingObjectId) {
    deleteObject(state.editingObjectId);
  }
});
cancelEditBtn.addEventListener("click", () => {
  clearSelection();
  setStatus("Edit canceled.");
});

saveProjectBtn.addEventListener("click", saveProject);
loadProjectBtn.addEventListener("click", () => {
  loadProjectInput.click();
});
loadProjectInput.addEventListener("change", handleLoadProjectFile);

canvas.addEventListener("mousedown", onCanvasMouseDown);
canvas.addEventListener("mousemove", onCanvasMouseMove);
canvas.addEventListener("mouseup", stopDragging);
canvas.addEventListener("mouseleave", stopDragging);

updateTypeInputs();
state.objects = createDefaultFurnitureObjects();
renderPresetList();
renderObjectList();
setActiveSidebarSection(state.activeSidebarSection);
redraw();

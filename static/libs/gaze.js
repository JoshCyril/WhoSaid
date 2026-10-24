/**
 * Local DiceBear Gaze Avatar Engine (100% Offline)
 * Generated from @dicebear/styles@10.6.0 gaze.min.json
 * Supports deterministic avatar generation and active-speaker animated gaze.
 */
(function (root) {
  const SCHEMA = {
    "canvas": {
      "elements": [
        { "name": "g", "type": "element", "attributes": { "class": "dbga-hop" }, "children": [{ "name": "shape", "type": "component" }] },
        { "name": "animation", "type": "component" }
      ],
      "width": 100,
      "height": 100
    },
    "components": {
      "shape": {
        "variants": {
          "circle": { "elements": [{ "name": "circle", "type": "element", "attributes": { "cx": "50", "cy": "50", "r": "34", "fill": { "type": "color", "name": "body" } } }, { "name": "g", "type": "element", "attributes": { "class": "dbga-look" }, "children": [{ "name": "spacing", "type": "component", "attributes": { "transform": "translate(20 46)" } }] }] },
          "square": { "elements": [{ "name": "path", "type": "element", "attributes": { "d": "M16 31q0-15 15-15h38q15 0 15 15v38q0 15-15 15H31q-15 0-15-15Z", "fill": { "type": "color", "name": "body" } } }, { "name": "g", "type": "element", "attributes": { "class": "dbga-look" }, "children": [{ "name": "spacing", "type": "component", "attributes": { "transform": "translate(20 46)" } }] }] },
          "triangle": { "elements": [{ "name": "path", "type": "element", "attributes": { "d": "M43.51 23.27Q50 12 56.49 23.27l25.02 43.46Q88 78 75 78H25q-13 0-6.51-11.27Z", "fill": { "type": "color", "name": "body" } } }, { "name": "g", "type": "element", "attributes": { "class": "dbga-look" }, "children": [{ "name": "spacing", "type": "component", "attributes": { "transform": "matrix(.86 0 0 .86 24.2 51.12)" } }] }] },
          "pentagon": { "elements": [{ "name": "path", "type": "element", "attributes": { "d": "M39.48 21.64Q50 14 60.52 21.64l15.1 10.98q10.52 7.64 6.5 20l-5.77 17.76q-4.01 12.36-17.01 12.36H40.66q-13 0-17.01-12.36l-5.77-17.76q-4.02-12.36 6.5-20Z", "fill": { "type": "color", "name": "body" } } }, { "name": "g", "type": "element", "attributes": { "class": "dbga-look" }, "children": [{ "name": "spacing", "type": "component", "attributes": { "transform": "matrix(.95 0 0 .95 21.5 48.4)" } }] }] },
          "hexagon": { "elements": [{ "name": "path", "type": "element", "attributes": { "d": "M39.61 19Q50 13 60.39 19l11.26 6.5q10.39 6 10.39 18v13q0 12-10.39 18L60.39 81Q50 87 39.61 81l-11.26-6.5q-10.39-6-10.39-18v-13q0-12 10.39-18Z", "fill": { "type": "color", "name": "body" } } }, { "name": "g", "type": "element", "attributes": { "class": "dbga-look" }, "children": [{ "name": "spacing", "type": "component", "attributes": { "transform": "translate(20 45)" } }] }] },
          "octagon": { "elements": [{ "name": "path", "type": "element", "attributes": { "d": "M40.76 17.83q9.24-3.83 18.48 0l6.98 2.89q9.24 3.82 13.06 13.06l2.89 6.98q3.83 9.24 0 18.48l-2.89 6.98q-3.82 9.24-13.06 13.06l-6.98 2.89Q50 86 40.76 82.17l-6.98-2.89q-9.24-3.82-13.06-13.06l-2.89-6.98Q14 50 17.83 40.76l2.89-6.98q3.82-9.24 13.06-13.06Z", "fill": { "type": "color", "name": "body" } } }, { "name": "g", "type": "element", "attributes": { "class": "dbga-look" }, "children": [{ "name": "spacing", "type": "component", "attributes": { "transform": "translate(20 45)" } }] }] },
          "diamond": { "elements": [{ "name": "path", "type": "element", "attributes": { "d": "M39.39 21.61Q50 11 60.61 21.61l17.78 17.78Q89 50 78.39 60.61L60.61 78.39Q50 89 39.39 78.39L21.61 60.61Q11 50 21.61 39.39Z", "fill": { "type": "color", "name": "body" } } }, { "name": "g", "type": "element", "attributes": { "class": "dbga-look" }, "children": [{ "name": "spacing", "type": "component", "attributes": { "transform": "matrix(.82 0 0 .82 25.4 46.44)" } }] }] },
          "pill": { "elements": [{ "name": "rect", "type": "element", "attributes": { "x": "11", "y": "25", "width": "78", "height": "50", "fill": { "type": "color", "name": "body" }, "rx": "25" } }, { "name": "g", "type": "element", "attributes": { "class": "dbga-look" }, "children": [{ "name": "spacing", "type": "component", "attributes": { "transform": "matrix(1.1 0 0 1.1 17 43.2)" } }] }] },
          "column": { "elements": [{ "name": "rect", "type": "element", "attributes": { "x": "28", "y": "11", "width": "44", "height": "78", "fill": { "type": "color", "name": "body" }, "rx": "22" } }, { "name": "g", "type": "element", "attributes": { "class": "dbga-look" }, "children": [{ "name": "spacing", "type": "component", "attributes": { "transform": "matrix(.85 0 0 .85 24.5 43.2)" } }] }] },
          "egg": { "elements": [{ "name": "path", "type": "element", "attributes": { "d": "M50 13c19 0 29 19 29 37 0 22-13 36-29 36S21 72 21 50c0-18 10-37 29-37", "fill": { "type": "color", "name": "body" } } }, { "name": "g", "type": "element", "attributes": { "class": "dbga-look" }, "children": [{ "name": "spacing", "type": "component", "attributes": { "transform": "matrix(.92 0 0 .92 22.4 47.64)" } }] }] },
          "arch": { "elements": [{ "name": "path", "type": "element", "attributes": { "d": "M18 84V46c0-18 14-32 32-32s32 14 32 32v38c0 2.2-1.8 4-4 4H22c-2.2 0-4-1.8-4-4", "fill": { "type": "color", "name": "body" } } }, { "name": "g", "type": "element", "attributes": { "class": "dbga-look" }, "children": [{ "name": "spacing", "type": "component", "attributes": { "transform": "matrix(.95 0 0 .95 21.5 47.4)" } }] }] }
        }
      },
      "spacing": {
        "variants": {
          "close": { "elements": [{ "name": "eyes", "type": "component", "attributes": { "transform": "translate(12.5)" } }, { "name": "eyes", "type": "component", "attributes": { "transform": "translate(31.5)" } }] },
          "snug": { "elements": [{ "name": "eyes", "type": "component", "attributes": { "transform": "translate(11)" } }, { "name": "eyes", "type": "component", "attributes": { "transform": "translate(33)" } }] },
          "normal": { "elements": [{ "name": "eyes", "type": "component", "attributes": { "transform": "translate(9.5)" } }, { "name": "eyes", "type": "component", "attributes": { "transform": "translate(34.5)" } }] },
          "wide": { "elements": [{ "name": "eyes", "type": "component", "attributes": { "transform": "translate(8)" } }, { "name": "eyes", "type": "component", "attributes": { "transform": "translate(36)" } }] },
          "far": { "elements": [{ "name": "eyes", "type": "component", "attributes": { "transform": "translate(6.5)" } }, { "name": "eyes", "type": "component", "attributes": { "transform": "translate(37.5)" } }] }
        }
      },
      "eyes": {
        "variants": {
          "dots": { "elements": [{ "name": "g", "type": "element", "attributes": { "class": "dbga-eye" }, "children": [{ "name": "circle", "type": "element", "attributes": { "cx": "8", "cy": "8", "r": "5.4", "fill": { "type": "color", "name": "ink" } } }] }] },
          "big": { "elements": [{ "name": "g", "type": "element", "attributes": { "class": "dbga-eye" }, "children": [{ "name": "circle", "type": "element", "attributes": { "cx": "8", "cy": "8", "r": "6.8", "fill": { "type": "color", "name": "ink" } } }] }] },
          "small": { "elements": [{ "name": "g", "type": "element", "attributes": { "class": "dbga-eye" }, "children": [{ "name": "circle", "type": "element", "attributes": { "cx": "8", "cy": "8", "r": "3.9", "fill": { "type": "color", "name": "ink" } } }] }] },
          "shine": { "elements": [{ "name": "g", "type": "element", "attributes": { "class": "dbga-eye" }, "children": [{ "name": "g", "type": "element", "children": [{ "name": "circle", "type": "element", "attributes": { "cx": "8", "cy": "8", "r": "5.8", "fill": { "type": "color", "name": "ink" } } }, { "name": "circle", "type": "element", "attributes": { "cx": "10.2", "cy": "5.56", "r": "1.74", "fill": { "type": "color", "name": "glint" } } }] }] }] },
          "beans": { "elements": [{ "name": "g", "type": "element", "attributes": { "class": "dbga-eye" }, "children": [{ "name": "rect", "type": "element", "attributes": { "x": "4.3", "y": "1.4", "width": "7.4", "height": "13.2", "fill": { "type": "color", "name": "ink" }, "rx": "3.7" } }] }] },
          "bars": { "elements": [{ "name": "g", "type": "element", "attributes": { "class": "dbga-eye" }, "children": [{ "name": "rect", "type": "element", "attributes": { "x": "1.4", "y": "4.3", "width": "13.2", "height": "7.4", "fill": { "type": "color", "name": "ink" }, "rx": "3.7" } }] }] },
          "wide": { "elements": [{ "name": "g", "type": "element", "attributes": { "class": "dbga-eye" }, "children": [{ "name": "ellipse", "type": "element", "attributes": { "cx": "8", "cy": "8", "rx": "6.8", "ry": "4.8", "fill": { "type": "color", "name": "ink" } } }] }] },
          "tall": { "elements": [{ "name": "g", "type": "element", "attributes": { "class": "dbga-eye" }, "children": [{ "name": "ellipse", "type": "element", "attributes": { "cx": "8", "cy": "8", "rx": "4.6", "ry": "6.8", "fill": { "type": "color", "name": "ink" } } }] }] },
          "happy": { "elements": [{ "name": "g", "type": "element", "attributes": { "class": "dbga-eye" }, "children": [{ "name": "path", "type": "element", "attributes": { "d": "M2 10.2q6-6.6 12 0", "fill": "none", "stroke": { "type": "color", "name": "ink" }, "stroke-width": "3.4", "stroke-linecap": "round", "stroke-linejoin": "round" } }] }] },
          "grin": { "elements": [{ "name": "g", "type": "element", "attributes": { "class": "dbga-eye" }, "children": [{ "name": "path", "type": "element", "attributes": { "d": "M1 11q7-9 14 0", "fill": "none", "stroke": { "type": "color", "name": "ink" }, "stroke-width": "3.8", "stroke-linecap": "round", "stroke-linejoin": "round" } }] }] },
          "squint": { "elements": [{ "name": "g", "type": "element", "attributes": { "class": "dbga-eye" }, "children": [{ "name": "path", "type": "element", "attributes": { "d": "M1.8 9.6q6.2-4.8 12.4 0", "fill": "none", "stroke": { "type": "color", "name": "ink" }, "stroke-width": "3.1", "stroke-linecap": "round", "stroke-linejoin": "round" } }] }] }
        }
      },
      "animation": {
        "variants": {
          "medium": {
            "elements": [
              { "name": "g", "type": "element", "attributes": { "class": "dbga-medium" } },
              {
                "name": "style",
                "type": "element",
                "children": [
                  {
                    "type": "text",
                    "value": "@keyframes dbgaLook{0%,16%{transform:translate(0,0)}24%,38%{transform:translate(-3.6px,0.9px)}46%,60%{transform:translate(3.4px,-0.7px)}68%,82%{transform:translate(0.7px,1.7px)}90%,100%{transform:translate(0,0)}}@keyframes dbgaBlink{0%,94%,97%,100%{transform:scaleY(1)}95.5%{transform:scaleY(0.06)}}@keyframes dbgaHop{0%,58%,100%{transform:translateY(0) scale(1,1)}64%{transform:translateY(0) scale(1.06,0.94)}73%{transform:translateY(-4px) scale(0.96,1.05)}82%{transform:translateY(0) scale(1.05,0.95)}90%{transform:translateY(0) scale(0.99,1.01)}}.dbga-eye,.dbga-look{transform-box:fill-box;transform-origin:center}.dbga-hop{transform-box:fill-box;transform-origin:50% 100%}.dbga-look{animation:dbgaLook calc(var(--dbga-t,1)*6.4s) ease-in-out infinite}.dbga-eye{animation:dbgaBlink calc(var(--dbga-t,1)*4.4s) linear infinite}.dbga-hop{animation:dbgaHop calc(var(--dbga-t,1)*5.2s) ease-out infinite}.dbga-eye,.dbga-look,.dbga-hop{animation-play-state:var(--dbga-p,paused)}svg.is-speaking .dbga-eye,svg.is-speaking .dbga-look,svg.is-speaking .dbga-hop,.is-speaking svg .dbga-eye,.is-speaking svg .dbga-look,.is-speaking svg .dbga-hop{--dbga-p:running!important;animation-play-state:running!important}"
                  }
                ]
              }
            ]
          }
        }
      }
    }
  };

  function stringHash(str) {
    let hash = 5381;
    const s = String(str || "speaker");
    for (let i = 0; i < s.length; i++) {
      hash = ((hash << 5) + hash) + s.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function pick(arr, index) {
    return arr[Math.abs(index) % arr.length];
  }

  function renderElement(el, ctx) {
    if (!el) return "";
    if (el.type === "text") return el.value || "";
    if (el.type === "component") {
      const comp = SCHEMA.components[el.name];
      if (!comp) return "";
      const varName = ctx[el.name];
      if (!varName || !comp.variants[varName]) return "";
      const varData = comp.variants[varName];
      const content = (varData.elements || []).map(child => renderElement(child, ctx)).join("");
      if (el.attributes) {
        const attrs = Object.entries(el.attributes).map(([k, v]) => `${k}="${v}"`).join(" ");
        return `<g ${attrs}>${content}</g>`;
      }
      return content;
    }
    if (el.type === "element") {
      const attrs = [];
      if (el.attributes) {
        for (const [k, v] of Object.entries(el.attributes)) {
          if (v && typeof v === "object" && v.type === "color") {
            const val = ctx["color_" + v.name] || "#000000";
            attrs.push(`${k}="${val}"`);
          } else {
            attrs.push(`${k}="${v}"`);
          }
        }
      }
      const attrStr = attrs.length > 0 ? " " + attrs.join(" ") : "";
      const children = (el.children || []).map(child => renderElement(child, ctx)).join("");
      if (children || el.name === "style") {
        return `<${el.name}${attrStr}>${children}</${el.name}>`;
      }
      return `<${el.name}${attrStr}/>`;
    }
    return "";
  }

  function renderSvg(seed, rootColor, isSpeaking = false) {
    const s = String(seed || "speaker").trim();
    const hash = stringHash(s);

    const shapeKeys = Object.keys(SCHEMA.components.shape.variants);
    const spacingKeys = Object.keys(SCHEMA.components.spacing.variants);
    const eyeKeys = Object.keys(SCHEMA.components.eyes.variants);

    const shapeVar = pick(shapeKeys, hash);
    const spacingVar = pick(spacingKeys, (hash >> 3) ^ 19);
    const eyeVar = pick(eyeKeys, (hash >> 6) ^ 37);

    const ctx = {
      shape: shapeVar,
      spacing: spacingVar,
      eyes: eyeVar,
      animation: "medium",
      color_body: rootColor || "#38bdf8",
      color_ink: "#0f172a",
      color_glint: "#ffffff"
    };

    const inner = (SCHEMA.canvas.elements || []).map(child => renderElement(child, ctx)).join("");
    const animCls = isSpeaking ? "is-speaking" : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" class="gaze-avatar ${animCls}" shape-rendering="auto">${inner}</svg>`;
  }

  function renderDataUri(seed, rootColor, isSpeaking = false) {
    const svg = renderSvg(seed, rootColor, isSpeaking);
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }

  function toDarkShade(hex) {
    if (!hex || typeof hex !== 'string') return '#0f172a';
    let c = hex.replace('#', '').trim();
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    const num = parseInt(c, 16);
    if (isNaN(num)) return '#0f172a';
    const r = Math.max(0, Math.floor(((num >> 16) & 255) * 0.25));
    const g = Math.max(0, Math.floor(((num >> 8) & 255) * 0.25));
    const b = Math.max(0, Math.floor((num & 255) * 0.25));
    return `rgb(${r}, ${g}, ${b})`;
  }

  function renderHtml(name, id, color = "#38bdf8", size = 26, avatarSeed = null, isSpeaking = false) {
    const seed = (avatarSeed || name || id || "speaker").trim();
    const svg = renderSvg(seed, color, isSpeaking);
    const initial = (name || id || "S").charAt(0).toUpperCase();
    const speakingCls = isSpeaking ? "is-speaking" : "";
    return `
      <span class="speaker-avatar-wrap ${speakingCls}" data-speaker-id="${String(id || '').replace(/"/g, '&quot;')}" style="width:${size}px;height:${size}px;min-width:${size}px;min-height:${size}px;max-width:${size}px;max-height:${size}px;background:transparent;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;" title="${String(name || id || '').replace(/"/g, '&quot;')}">
        ${svg}
        <span class="speaker-avatar-fallback" style="background:transparent; color:${color}; display:none;">${initial}</span>
      </span>
    `;
  }

  const GazeAvatar = {
    renderSvg: renderSvg,
    renderDataUri: renderDataUri,
    renderHtml: renderHtml,
    toDarkShade: toDarkShade
  };

  root.GazeAvatar = GazeAvatar;
  root.DiceBearGaze = GazeAvatar;
  // Aliased for full backwards compatibility
  root.CameoAvatar = GazeAvatar;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = GazeAvatar;
  }
})(typeof window !== "undefined" ? window : globalThis);

/* optimal-fig-finger-skin: Optimal Health explainer figure. Built with Anatomy (MIT). Generated; do not edit. */
(() => {
if (customElements.get("optimal-fig-finger-skin")) return;
const AZIMUTH = 45;
const ELEVATION = 30;
const SHADES = 4;
const RADIANS = Math.PI / 180;
const UNIT = Math.sqrt(1.6);
function cameraOf({ scale, azimuth = AZIMUTH, elevation = ELEVATION }) {
    const a = azimuth * RADIANS;
    const e = elevation * RADIANS;
    return { sinA: Math.sin(a), cosA: Math.cos(a), sinE: Math.sin(e), cosE: Math.cos(e), k: scale * UNIT };
}
function iso([x, y, z], projection) {
    const { origin } = projection;
    const { sinA, cosA, sinE, cosE, k } = cameraOf(projection);
    return [origin[0] + (x * sinA - y * cosA) * k, origin[1] + ((x * cosA + y * sinA) * sinE - z * cosE) * k];
}
function towardViewer(projection) {
    const { sinA, cosA } = cameraOf(projection);
    return [cosA, sinA];
}
function depthOf([x, y, z], projection) {
    const { sinA, cosA, sinE, cosE } = cameraOf(projection);
    return (x * cosA + y * sinA) * cosE + z * sinE;
}
const tenth = (value) => {
    const text = (Math.round(value * 10) / 10).toFixed(1).replace(/\.0$/, "");
    return text === "-0" ? "0" : text;
};
function pathOf(points, closed = false) {
    if (!points.length)
        return "";
    return points.map(([x, y], at) => `${at ? "L" : "M"}${tenth(x)} ${tenth(y)}`).join("") + (closed ? "Z" : "");
}
const joinPaths = (paths) => paths.filter(Boolean).join("");
function roundedPlan({ x, y, w, d, r }, steps = 8) {
    const radius = Math.max(0, Math.min(r, w / 2, d / 2));
    const corners = [
        [x + w - radius, y + radius, -90],
        [x + w - radius, y + d - radius, 0],
        [x + radius, y + d - radius, 90],
        [x + radius, y + radius, 180],
    ];
    const out = [];
    for (const [cx, cy, start] of corners) {
        const count = radius > 0 ? steps : 0;
        for (let step = 0; step <= count; step++) {
            const angle = (start + (count ? (90 * step) / count : 45)) * RADIANS;
            out.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
        }
    }
    return out;
}
function signedArea(points) {
    let area = 0;
    for (let index = 0; index < points.length; index++) {
        const [ax, ay] = points[index];
        const [bx, by] = points[(index + 1) % points.length];
        area += ax * by - bx * ay;
    }
    return area / 2;
}
const oriented = (points) => (signedArea(points) < 0 ? [...points].reverse() : points);
function convexHull(points) {
    const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (sorted.length < 3)
        return sorted;
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [];
    for (const point of sorted) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0)
            lower.pop();
        lower.push(point);
    }
    const upper = [];
    for (let index = sorted.length - 1; index >= 0; index--) {
        const point = sorted[index];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0)
            upper.pop();
        upper.push(point);
    }
    return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}
function runsOf(flags, want) {
    const count = flags.length;
    const runs = [];
    const start = flags.findIndex((flag, index) => flag !== flags[(index + count - 1) % count]);
    if (start < 0)
        return flags[0] === want ? [Array.from({ length: count + 1 }, (_, index) => index % count)] : [];
    let run = null;
    for (let step = 0; step < count; step++) {
        const index = (start + step) % count;
        if (flags[index] === want) {
            if (!run)
                run = [index];
            run.push((index + 1) % count);
        }
        else if (run) {
            runs.push(run);
            run = null;
        }
    }
    if (run)
        runs.push(run);
    return runs;
}
function extrude(ring, z, height, projection, options = {}) {
    const convex = options.convex ?? true;
    const count = ring.length;
    const counter = signedArea(ring) > 0;
    const [vx, vy] = towardViewer(projection);
    const { sinA, cosA } = cameraOf(projection);
    const normals = ring.map(([ax, ay], index) => {
        const [bx, by] = ring[(index + 1) % count];
        const dx = bx - ax;
        const dy = by - ay;
        const length = Math.hypot(dx, dy) || 1;
        return (counter ? [dy / length, -dx / length] : [-dy / length, dx / length]);
    });
    const facing = normals.map(([nx, ny]) => nx * vx + ny * vy > 1e-9);
    const top = ring.map(([x, y]) => iso([x, y, z + height], projection));
    const bottom = ring.map(([x, y]) => iso([x, y, z], projection));
    const outline = [];
    const crease = [];
    for (const run of runsOf(facing, false))
        outline.push(pathOf(run.map((index) => top[index])));
    for (const run of runsOf(facing, true)) {
        crease.push(pathOf(run.map((index) => top[index])));
        if (height > 0)
            outline.push(pathOf(run.map((index) => bottom[index])));
    }
    if (height > 0) {
        for (let index = 0; index < count; index++) {
            if (facing[(index + count - 1) % count] !== facing[index])
                outline.push(pathOf([top[index], bottom[index]]));
        }
    }
    let fill;
    if (convex) {
        fill = pathOf(convexHull([...top, ...bottom]), true);
    }
    else {
        const parts = [pathOf(oriented(top), true), pathOf(oriented(bottom), true)];
        for (let index = 0; index < count; index++) {
            if (!facing[index])
                continue;
            const next = (index + 1) % count;
            parts.push(pathOf(oriented([top[index], top[next], bottom[next], bottom[index]]), true));
        }
        fill = parts.join("");
    }
    const buckets = Array.from({ length: SHADES }, () => []);
    if (height > 0) {
        const [lx, ly] = [-sinA, cosA];
        for (let index = 0; index < count; index++) {
            if (!facing[index])
                continue;
            const [nx, ny] = normals[index];
            const lit = (nx * lx + ny * ly + 1) / 2;
            const shade = Math.min(SHADES - 1, Math.max(0, Math.floor(lit * SHADES)));
            const next = (index + 1) % count;
            buckets[shade].push(pathOf(oriented([top[index], top[next], bottom[next], bottom[index]]), true));
        }
    }
    let bevel;
    if (options.bevel && options.bevel > 0) {
        const by = options.bevel;
        const inset = ring.map(([x, y], index) => {
            const [ax, ay] = normals[(index + count - 1) % count];
            const [bx, by2] = normals[index];
            const mx = ax + bx;
            const my = ay + by2;
            const length = Math.hypot(mx, my) || 1;
            return [x - (mx / length) * by, y - (my / length) * by];
        });
        const insetTop = inset.map(([x, y]) => iso([x, y, z + height], projection));
        bevel = runsOf(facing, true)
            .map((run) => pathOf([top[run[0]], ...run.slice(1, -1).map((index) => insetTop[index]), top[run[run.length - 1]]]))
            .join("");
    }
    return {
        fill,
        outline: outline.join(""),
        crease: crease.join(""),
        top: pathOf(oriented(top), true),
        shades: buckets.map((paths) => paths.join("")),
        bevel,
    };
}
const ringOf = (plan, steps = 8) => roundedPlan(plan, steps);
function slabOf(plan, z, height, projection, steps = 8, bevel = 0) {
    return extrude(ringOf(plan, steps), z, height, projection, { convex: true, bevel });
}
function circleRing(cx, cy, radius, steps = 40) {
    return Array.from({ length: steps }, (_, step) => {
        const angle = (step / steps) * Math.PI * 2;
        return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
    });
}
function cylinder(cx, cy, radius, z, height, projection, steps = 32, bevel = 0) {
    return extrude(circleRing(cx, cy, radius, steps), z, height, projection, { convex: true, bevel });
}
const insetPlan = ({ x, y, w, d, r }, by) => ({ x: x + by, y: y + by, w: w - by * 2, d: d - by * 2, r: Math.max(0, r - by) });
function onTop(points, z, projection, closed = false) {
    return pathOf(points.map(([x, y]) => iso([x, y, z], projection)), closed);
}
const planOutline = (plan, z, projection, steps = 8) => onTop(ringOf(plan, steps), z, projection, true);
const lineOnTop = (from, to, z, projection) => onTop([from, to], z, projection);
const segment = (from, to, projection) => pathOf([iso(from, projection), iso(to, projection)]);
const rise = (at, from, to, projection) => segment([at[0], at[1], from], [at[0], at[1], to], projection);
const ring = (cx, cy, radius, z, projection, steps = 40) => onTop(circleRing(cx, cy, radius, steps), z, projection, true);
const pointsAt = (points, projection) => points.map((point) => iso(point, projection));
function dotGrid(x, y, columns, rows, gap, z, projection) {
    const dots = [];
    for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++)
            dots.push(iso([x + column * gap, y + row * gap, z], projection));
    }
    return dots;
}
function corners({ x, y, w, d }, inset = 0) {
    return [
        [x + inset, y + inset],
        [x + w - inset, y + inset],
        [x + inset, y + d - inset],
        [x + w - inset, y + d - inset],
    ];
}
function boxCorners({ x, y, w, d }, z0, z1) {
    const out = [];
    for (const px of [x, x + w])
        for (const py of [y, y + d])
            for (const z of [z0, z1])
                out.push([px, py, z]);
    return out;
}
function knurl(cx, cy, radius, z0, z1, count, projection, inset = 0.4) {
    const [vx, vy] = towardViewer(projection);
    const lines = [];
    for (let index = 0; index < count; index++) {
        const angle = (index / count) * Math.PI * 2;
        const nx = Math.cos(angle);
        const ny = Math.sin(angle);
        if (nx * vx + ny * vy < 0.15)
            continue;
        lines.push(segment([cx + radius * nx, cy + radius * ny, z0 + inset], [cx + radius * nx, cy + radius * ny, z1 - inset], projection));
    }
    return lines.join("");
}
function sideArc(cx, cy, radius, z, projection, steps = 24) {
    const [vx, vy] = towardViewer(projection);
    const facing = Math.atan2(vy, vx);
    const points = [];
    for (let step = 0; step <= steps; step++) {
        const angle = facing - Math.PI / 2 + (step / steps) * Math.PI;
        points.push(iso([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle), z], projection));
    }
    return pathOf(points);
}
function ringSeam(ring, z, projection) {
    const count = ring.length;
    const counter = signedArea(ring) > 0;
    const [vx, vy] = towardViewer(projection);
    const facing = ring.map(([ax, ay], index) => {
        const [bx, by] = ring[(index + 1) % count];
        const dx = bx - ax;
        const dy = by - ay;
        const [nx, ny] = counter ? [dy, -dx] : [-dy, dx];
        return nx * vx + ny * vy > 1e-9;
    });
    return runsOf(facing, true).map((run) => pathOf(run.map((index) => iso([ring[index][0], ring[index][1], z], projection)))).join("");
}
const sideSeam = (plan, z, projection, steps = 8) => ringSeam(ringOf(plan, steps), z, projection);
function sideRing(center, radius, axis, projection, steps = 20) {
    const [px, py, pz] = center;
    const points = [];
    for (let step = 0; step < steps; step++) {
        const angle = (step / steps) * Math.PI * 2;
        const u = radius * Math.cos(angle);
        const v = radius * Math.sin(angle);
        points.push(iso(axis === "x" ? [px, py + u, pz + v] : [px + u, py, pz + v], projection));
    }
    return pathOf(points, true);
}
function coil(from, to, center, radius, turns, axis, projection, perTurn = 16) {
    const count = Math.max(1, Math.round(turns * perTurn));
    const back = [];
    const front = [];
    let run = [];
    let near = null;
    for (let index = 0; index <= count; index++) {
        const share = index / count;
        const angle = share * turns * Math.PI * 2;
        const u = radius * Math.cos(angle);
        const v = radius * Math.sin(angle);
        const along = from + (to - from) * share;
        const point = axis === "x" ? [along, center[0] + u, center[1] + v] : [center[0] + u, along, center[1] + v];
        const normal = axis === "x" ? [0, Math.cos(angle), Math.sin(angle)] : [Math.cos(angle), 0, Math.sin(angle)];
        const facing = depthOf(normal, projection) > 0;
        const flat = iso(point, projection);
        if (near === null)
            near = facing;
        if (facing !== near) {
            run.push(flat);
            (near ? front : back).push(pathOf(run));
            run = [flat];
            near = facing;
            continue;
        }
        run.push(flat);
    }
    if (run.length > 1)
        (near ? front : back).push(pathOf(run));
    return { back: back.join(""), front: front.join("") };
}
function topTicks(from, to, step, every, edge, z, lengths, projection, axis = "x") {
    const minor = [];
    const major = [];
    const first = Math.ceil(from / step) * step;
    for (let at = first, index = Math.round(first / step); at <= to + 1e-9; at += step, index++) {
        const big = index % every === 0;
        const length = big ? lengths[1] : lengths[0];
        const a = axis === "x" ? [at, edge] : [edge, at];
        const b = axis === "x" ? [at, edge + length] : [edge + length, at];
        (big ? major : minor).push(lineOnTop(a, b, z, projection));
    }
    return { minor: minor.join(""), major: major.join("") };
}
function sideTicks(from, to, step, every, face, top, lengths, projection, axis = "x") {
    const minor = [];
    const major = [];
    const first = Math.ceil(from / step) * step;
    for (let at = first, index = Math.round(first / step); at <= to + 1e-9; at += step, index++) {
        const big = index % every === 0;
        const length = big ? lengths[1] : lengths[0];
        const a = axis === "x" ? [at, face, top] : [face, at, top];
        const b = axis === "x" ? [at, face, top - length] : [face, at, top - length];
        (big ? major : minor).push(segment(a, b, projection));
    }
    return { minor: minor.join(""), major: major.join("") };
}
function radialTicks(cx, cy, radius, count, every, z, lengths, projection, from = 0, span = Math.PI * 2) {
    const minor = [];
    const major = [];
    const closed = Math.abs(span - Math.PI * 2) < 1e-9;
    const steps = closed ? count : count + 1;
    for (let index = 0; index < steps; index++) {
        const angle = from + (index / count) * span;
        const big = index % every === 0;
        const inner = radius - (big ? lengths[1] : lengths[0]);
        const sx = Math.sin(angle);
        const sy = -Math.cos(angle);
        (big ? major : minor).push(lineOnTop([cx + sx * inner, cy + sy * inner], [cx + sx * radius, cy + sy * radius], z, projection));
    }
    return { minor: minor.join(""), major: major.join("") };
}
const haloOf = (plan, z, height, projection) => slabOf(plan, z, height, projection).fill;
function axisVector(projection, [dx, dy, dz]) {
    const origin = iso([0, 0, 0], projection);
    const moved = iso([dx, dy, dz], projection);
    return [moved[0] - origin[0], moved[1] - origin[1]];
}
const fine = (value) => Math.round(value * 100) / 100;
function translateAlong(projection, by) {
    const [x, y] = axisVector(projection, by);
    return `translate(${fine(x)} ${fine(y)})`;
}
const thousandth = (value) => Math.round(value * 1000) / 1000;
function axesAt(at, z, projection) {
    const origin = iso([at[0], at[1], z], projection);
    const along = (point) => {
        const [px, py] = iso(point, projection);
        return [px - origin[0], py - origin[1]];
    };
    return { origin, x: along([at[0] + 1, at[1], z]), y: along([at[0], at[1] + 1, z]), z: along([at[0], at[1], z + 1]) };
}
const matrixOf = (u, v, origin) => `matrix(${thousandth(u[0])} ${thousandth(u[1])} ${thousandth(v[0])} ${thousandth(v[1])} ${thousandth(origin[0])} ${thousandth(origin[1])})`;
function holdStill(element, [dx, dy]) {
    const text = dx || dy ? `translate(${-dx} ${-dy})` : "";
    element.querySelectorAll("[data-hold]").forEach((node) => (text ? node.setAttribute("transform", text) : node.removeAttribute("transform")));
}
function topMatrix(at, z, projection, along = "x") {
    const { origin, x, y } = axesAt(at, z, projection);
    return along === "x" ? matrixOf(x, y, origin) : matrixOf([-y[0], -y[1]], x, origin);
}
function sideMatrix(at, z, projection, face) {
    const { origin, x, y, z: up } = axesAt(at, z, projection);
    const down = [-up[0], -up[1]];
    return face === "left" ? matrixOf(x, down, origin) : matrixOf([-y[0], -y[1]], down, origin);
}
function screenRise(height, projection) {
    const { cosE, k } = cameraOf(projection);
    return height * cosE * k;
}
function fitProjection(points, width, height, { pad = 24, headroom = 0, azimuth = AZIMUTH, elevation = ELEVATION } = {}) {
    const unit = { origin: [0, 0], scale: 1, azimuth, elevation };
    const flat = points.map((point) => iso(point, unit));
    const xs = flat.map(([x]) => x);
    const ys = flat.map(([, y]) => y);
    const left = Math.min(...xs);
    const right = Math.max(...xs);
    const up = Math.min(...ys);
    const down = Math.max(...ys);
    const scale = Math.min((width - pad * 2) / (right - left), (height - pad * 2 - headroom) / (down - up));
    return {
        origin: [width / 2 - ((left + right) / 2) * scale, headroom + (height - headroom) / 2 - ((up + down) / 2) * scale],
        scale,
        azimuth,
        elevation,
    };
}
const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const attrs = (pairs) => Object.entries(pairs)
    .filter(([, value]) => value !== undefined && value !== false)
    .map(([key, value]) => ` ${key}="${escape(String(value))}"`)
    .join("");
function solidSvg(paths, { tone = "hi", crease = "faint", halo = false, lit = false, flat = false, className, inner = "" } = {}) {
    const parts = [];
    if (halo)
        parts.push(`<path class="iso-halo" d="${paths.fill}"/>`);
    parts.push(`<path class="iso-fill" d="${paths.fill}"/>`);
    if (!flat) {
        paths.shades.forEach((d, shade) => {
            if (d)
                parts.push(`<path class="iso-shade" data-shade="${shade}" d="${d}"/>`);
        });
        parts.push(`<path class="iso-top" d="${paths.top}"/>`);
    }
    if (crease !== "none" && paths.crease)
        parts.push(`<path class="iso-line iso-crease" data-tone="${crease}" d="${paths.crease}"/>`);
    if (crease !== "none" && paths.bevel)
        parts.push(`<path class="iso-line iso-bevel" data-tone="${crease}" d="${paths.bevel}"/>`);
    if (inner)
        parts.push(inner);
    parts.push(`<path class="iso-line iso-edge" data-tone="${tone}" d="${paths.outline}"/>`);
    return `<g${attrs({ class: className ? `iso-solid ${className}` : "iso-solid", "data-lit": lit ? "" : undefined, "data-seamless": paths.seamless ? "" : undefined })}>${parts.join("")}</g>`;
}
function lineSvg(d, { tone = "lo", dotted = false, dashed = false, flow = false, className, free } = {}) {
    if (!d)
        return "";
    return `<path${attrs({
        class: className ? `iso-line ${className}` : "iso-line",
        "data-tone": tone,
        "data-free": free === true ? "" : free || undefined,
        "data-dotted": dotted ? "" : undefined,
        "data-dashed": dashed ? "" : undefined,
        "data-flow": flow ? "" : undefined,
        d,
    })}/>`;
}
function dotsSvg(points, { size = 0.5, tone = "mid", pulse = false } = {}) {
    const dots = points
        .map(([x, y, alpha], index) => `<circle cx="${tenth(x)}" cy="${tenth(y)}" r="${size}"${alpha !== undefined && alpha < 1 ? ` fill-opacity="${Math.max(0, alpha).toFixed(2)}"` : ""}${pulse ? ` data-pulse="" style="--pulse-at:${(index * 137) % 1600}ms"` : ""}/>`)
        .join("");
    return `<g class="iso-dots" data-tone="${tone}">${dots}</g>`;
}
function fadedSvg(list, style = {}) {
    const groups = new Map();
    for (const entry of list) {
        const [d, alpha] = Array.isArray(entry) ? entry : [entry.d, entry.alpha];
        if (!d || !(alpha > 0.02))
            continue;
        const level = Math.min(1, Math.round(alpha * 20) / 20);
        groups.set(level, (groups.get(level) ?? "") + d);
    }
    return [...groups].map(([alpha, d]) => (alpha >= 1 ? lineSvg(d, style) : `<g opacity="${alpha.toFixed(2)}">${lineSvg(d, style)}</g>`)).join("");
}
function fadeLineSvg(points, { fade = [0, 0], tone = "lo", className, stops = 6 } = {}) {
    if (points.length < 2)
        return "";
    const ease = (t) => t * t * (3 - 2 * t);
    const hashOf = (text) => {
        let hash = 2166136261;
        for (let index = 0; index < text.length; index++)
            hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
        return (hash >>> 0).toString(36);
    };
    const lengths = [0];
    for (let index = 1; index < points.length; index++)
        lengths.push(lengths[index - 1] + Math.hypot(points[index][0] - points[index - 1][0], points[index][1] - points[index - 1][1]));
    const at = (length) => {
        let index = 1;
        while (index < points.length - 1 && lengths[index] < length)
            index++;
        const span = lengths[index] - lengths[index - 1] || 1;
        const t = Math.max(0, Math.min(1, (length - lengths[index - 1]) / span));
        return [points[index - 1][0] + (points[index][0] - points[index - 1][0]) * t, points[index - 1][1] + (points[index][1] - points[index - 1][1]) * t];
    };
    const pieceOf = (from, to) => [at(from), ...points.filter((_, index) => lengths[index] > from + 1e-6 && lengths[index] < to - 1e-6), at(to)];
    const total = lengths[lengths.length - 1];
    if (total < 1e-6)
        return "";
    let [start, end] = Array.isArray(fade) ? fade : [fade, fade];
    if (start + end > total) {
        const share = total / (start + end);
        start *= share;
        end *= share;
    }
    const paint = `var(--anatomy-${tone})`;
    const ramp = (piece, rising) => {
        const d = pathOf(piece);
        const [x1, y1] = piece[0];
        const [x2, y2] = piece[piece.length - 1];
        const id = `iso-fade-${hashOf(`${d}|${tone}|${rising}`)}`;
        const marks = Array.from({ length: stops + 1 }, (_, index) => {
            const t = index / stops;
            const alpha = ease(rising ? t : 1 - t);
            return `<stop offset="${t.toFixed(3)}" stop-opacity="${alpha.toFixed(3)}" style="stop-color:${paint}"/>`;
        }).join("");
        const gradient = `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${tenth(x1)}" y1="${tenth(y1)}" x2="${tenth(x2)}" y2="${tenth(y2)}">${marks}</linearGradient>`;
        return `<defs>${gradient}</defs><path${attrs({ class: className ? `iso-line ${className}` : "iso-line", "data-tone": tone, "data-free": rising ? "start" : "end", d, style: `stroke:url(#${id})` })}/>`;
    };
    const parts = [];
    if (start > 0.05)
        parts.push(ramp(pieceOf(0, start), true));
    if (total - end - start > 0.05)
        parts.push(lineSvg(pathOf(pieceOf(start, total - end)), { tone, className }));
    if (end > 0.05)
        parts.push(ramp(pieceOf(total - end, total), false));
    return `<g class="iso-fade">${parts.join("")}</g>`;
}
function wireSvg(from, to, { via = [], tone = "lo", dotted = false, dashed = false, flow = false, ends = "both", size = 1.2 } = {}) {
    const d = pathOf([from, ...via, to]);
    const end = ([x, y]) => `<circle class="iso-wire-end" cx="${tenth(x)}" cy="${tenth(y)}" r="${size}"/>`;
    return `<g class="iso-wire" data-tone="${tone}">${lineSvg(d, { tone, dotted, dashed, flow })}${ends === "both" || ends === "from" ? end(from) : ""}${ends === "both" || ends === "to" ? end(to) : ""}</g>`;
}
function faceTextSvg(transform, text, { size = 3, tone = "mid", anchor = "start" } = {}) {
    return `<text class="iso-face-text" data-tone="${tone}" transform="${transform}" font-size="${size}" text-anchor="${anchor}">${escape(text)}</text>`;
}
function groupSvg(children, extra = {}) {
    return `<g${attrs(extra)}>${Array.isArray(children) ? children.join("") : children}</g>`;
}
function figureSvg({ width, height, label, body, standalone = false, className }) {
    const style = standalone ? `<style>${ISO_CSS}</style>` : "";
    return `<svg${attrs({
        xmlns: "http://www.w3.org/2000/svg",
        class: `iso-svg${standalone ? " iso" : ""}${className ? ` ${className}` : ""}`,
        "data-theme": standalone || undefined,
        viewBox: `0 0 ${width} ${height}`,
        role: "img",
        "aria-label": label,
    })}>${style}${Array.isArray(body) ? body.join("") : body}</svg>`;
}
function swatchSvg(mark) {
    if (mark === "raised" || mark === "flat" || mark === "lit") {
        const body = mark === "flat" ? "M2 6.5 8 3.5 14 6.5 8 9.5Z" : "M2 4.5 8 1.5 14 4.5 14 6 8 9 2 6Z";
        const crease = mark === "flat" ? "" : `<path class="iso-swatch-crease" d="M2 4.5 8 7.5 14 4.5"/>`;
        return `<svg class="iso-swatch" data-mark="${mark}" viewBox="0 0 16 10" aria-hidden="true"><path d="${body}"/>${crease}</svg>`;
    }
    return `<svg class="iso-swatch" data-mark="${mark}" viewBox="0 0 16 10" aria-hidden="true"><path d="M1.5 5h13"/></svg>`;
}
function plateHtml({ fig, title, hint, readout = "", keys = [], caption, body }) {
    const corner = (name, text, extra = "") => `<span class="iso-plate-corner" data-corner="${name}"${extra}>${escape(text)}</span>`;
    const legend = keys.length || caption
        ? `<figcaption class="iso-legend">${keys.length ? `<span class="iso-keys">${keys.map((key) => `<span class="iso-key">${swatchSvg(key.mark)}${escape(key.label)}</span>`).join("")}</span>` : ""}${caption ? `<span class="iso-caption">${escape(caption)}</span>` : ""}</figcaption>`
        : "";
    return `<figure class="iso-figure"><div class="iso-plate"><div class="iso-plate-corners" aria-hidden="true">${corner("fig", fig)}${title ? corner("title", title) : ""}${hint ? corner("hint", hint) : ""}${corner("readout", readout, " data-readout")}</div>${body}</div>${legend}</figure>`;
}
function pageHtml({ title, theme = "dark", body, script = "", width = 650 }) {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)}</title><style>${ISO_CSS}${PAGE_CSS.replace("__WIDTH__", String(width))}</style></head><body class="iso" data-theme="${theme}"><main class="iso-page">${body}</main>${script ? `<script type="module">${script.replace(/<\/(script)/gi, "<\\/$1")}</script>` : ""}</body></html>`;
}
const PAGE_CSS = `
*{box-sizing:border-box}
html{color-scheme:dark}
body[data-theme="light"]{color-scheme:light}
body{margin:0;background:var(--anatomy-page);color:var(--anatomy-text);font:14px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
.iso-page{width:min(__WIDTH__px,100% - 32px);margin:64px auto 96px}
`;
const ISO_CSS = `
.iso{
  --anatomy-page:#0b0b0b;--anatomy-card:#131313;--anatomy-text:#a3a3a3;--anatomy-strong:#e6e6e6;--anatomy-muted:#6e6e6e;
  --anatomy-paper:#131313;--anatomy-face:#1b1b1b;--anatomy-top:#1c1c1c;
  --anatomy-shade-0:#0f0f0f;--anatomy-shade-1:#121212;--anatomy-shade-2:#151515;--anatomy-shade-3:#181818;
  --anatomy-lit-top:#262626;--anatomy-lit-shade:#1d1d1d;
  --anatomy-hi:#d4d4d4;--anatomy-mid:#6a6a6a;--anatomy-lo:#3e3e3e;--anatomy-faint:#2a2a2a;--anatomy-lit:#ffffff;
  --anatomy-halo:#050505;--anatomy-halo-opacity:.9;--anatomy-dot:#e6e6e6;
  --anatomy-red:#ff6b6b;--anatomy-green:#6be0a0;--anatomy-blue:#6b9bff;
  --anatomy-weight:.6px;--anatomy-ease:cubic-bezier(.32,.72,0,1);
  --anatomy-mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
  --anatomy-lift:inset 0 1px 0 0 #ffffff0a,inset 0 0 0 1px #ffffff06,0 0 0 1px #00000026,0 1px 1px -.5px #00000014,0 3px 3px -1.5px #00000014,0 6px 6px -3px #00000014,0 12px 12px -6px #00000014;
}
.iso[data-theme="light"]{
  --anatomy-page:#f2f2ef;--anatomy-card:#fbfbfa;--anatomy-text:#57575a;--anatomy-strong:#18181a;--anatomy-muted:#8c8c90;
  --anatomy-paper:#fbfbfa;--anatomy-face:#ffffff;--anatomy-top:#ffffff;
  --anatomy-shade-0:#dcdcd9;--anatomy-shade-1:#e5e5e2;--anatomy-shade-2:#ededea;--anatomy-shade-3:#f4f4f1;
  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#eeeeeb;
  --anatomy-hi:#26262a;--anatomy-mid:#8a8a8f;--anatomy-lo:#b4b4b8;--anatomy-faint:#d4d4d6;--anatomy-lit:#000000;
  --anatomy-halo:#8a8a80;--anatomy-halo-opacity:.32;--anatomy-dot:#3a3a3e;
  --anatomy-red:#e5484d;--anatomy-green:#30a46c;--anatomy-blue:#3e63dd;
  --anatomy-lift:inset 0 1px 0 0 #ffffff,0 0 0 1px #0000000f,0 1px 1px -.5px #0000000a,0 3px 3px -1.5px #0000000a,0 6px 6px -3px #0000000a,0 12px 12px -6px #0000000a;
}
.iso-svg{display:block;width:100%;height:auto;overflow:visible}
.iso-svg path,.iso-svg circle{vector-effect:non-scaling-stroke}
.iso-fill{fill:var(--anatomy-paper);stroke:none}
.iso-solid[data-lit]>.iso-fill{fill:var(--anatomy-face)}
.iso-shade,.iso-top{stroke:none}
.iso-shade[data-shade="0"]{fill:var(--anatomy-shade-0)}
.iso-shade[data-shade="1"]{fill:var(--anatomy-shade-1)}
.iso-shade[data-shade="2"]{fill:var(--anatomy-shade-2)}
.iso-shade[data-shade="3"]{fill:var(--anatomy-shade-3)}
.iso-top{fill:var(--anatomy-top)}
.iso-solid[data-lit]>.iso-top{fill:var(--anatomy-lit-top)}
.iso-solid[data-lit]>.iso-shade{fill:var(--anatomy-lit-shade)}
.iso-solid[data-seamless]>.iso-shade,.iso-solid[data-seamless]>.iso-top{stroke-width:.4;stroke-linejoin:round}
.iso-solid[data-seamless]>.iso-shade[data-shade="0"]{stroke:var(--anatomy-shade-0)}
.iso-solid[data-seamless]>.iso-shade[data-shade="1"]{stroke:var(--anatomy-shade-1)}
.iso-solid[data-seamless]>.iso-shade[data-shade="2"]{stroke:var(--anatomy-shade-2)}
.iso-solid[data-seamless]>.iso-shade[data-shade="3"]{stroke:var(--anatomy-shade-3)}
.iso-solid[data-seamless]>.iso-top{stroke:var(--anatomy-top)}
.iso-solid[data-seamless][data-lit]>.iso-top{stroke:var(--anatomy-lit-top)}
.iso-solid[data-seamless][data-lit]>.iso-shade{stroke:var(--anatomy-lit-shade)}
.iso-solid[data-lit]>.iso-edge{stroke:var(--anatomy-lit)}
.iso-halo{fill:var(--anatomy-halo);stroke:none;filter:blur(9px);opacity:var(--anatomy-halo-opacity);transform:translateY(3px)}
.iso-line{fill:none;stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round}
.iso-line[data-tone="hi"]{stroke:var(--anatomy-hi)}
.iso-line[data-tone="mid"]{stroke:var(--anatomy-mid)}
.iso-line[data-tone="lo"]{stroke:var(--anatomy-lo)}
.iso-line[data-tone="faint"]{stroke:var(--anatomy-faint)}
.iso-line[data-tone="lit"]{stroke:var(--anatomy-lit)}
.iso-line[data-tone="red"]{stroke:var(--anatomy-red)}
.iso-line[data-tone="green"]{stroke:var(--anatomy-green)}
.iso-line[data-tone="blue"]{stroke:var(--anatomy-blue)}
.iso-line[data-dotted]{stroke-dasharray:.01 3.5;stroke-width:1}
.iso-line[data-dashed]{stroke-dasharray:3 3}
.iso-line[data-flow]{stroke-dasharray:2 6}
.iso-wire-end{fill:var(--anatomy-paper);stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight)}
.iso-wire[data-tone="hi"] .iso-wire-end{stroke:var(--anatomy-hi)}
.iso-wire[data-tone="mid"] .iso-wire-end{stroke:var(--anatomy-mid)}
.iso-wire[data-tone="faint"] .iso-wire-end{stroke:var(--anatomy-faint)}
.iso-wire[data-tone="lit"] .iso-wire-end{stroke:var(--anatomy-lit)}
.iso-dots circle{fill:var(--anatomy-dot);stroke:none;opacity:.32}
.iso-dots[data-tone="hi"] circle{opacity:.85}
.iso-dots[data-tone="mid"] circle{opacity:.45}
.iso-dots[data-tone="lo"] circle{opacity:.22}
.iso-dots[data-tone="faint"] circle{opacity:.12}
.iso-face-text{fill:var(--anatomy-mid);font-family:var(--anatomy-mono);letter-spacing:.04em}
.iso-face-text[data-tone="hi"]{fill:var(--anatomy-hi)}
.iso-face-text[data-tone="lo"]{fill:var(--anatomy-lo)}
.iso-face-text[data-tone="faint"]{fill:var(--anatomy-faint)}
.tb-body{fill:var(--anatomy-shade-2);stroke:none}
.tb-shine{fill:var(--anatomy-top);stroke:none}
.tb-shade{fill:var(--anatomy-shade-0);stroke:none}
.tb-ring{fill:none;stroke:var(--anatomy-lo);stroke-width:.45;stroke-linecap:butt;stroke-linejoin:round}
.tb-ring[data-tone="mid"]{stroke:var(--anatomy-mid)}
.tb-ring[data-tone="faint"]{stroke:var(--anatomy-faint)}
.tb-ring[data-tone="hi"]{stroke:var(--anatomy-hi)}
@keyframes iso-flow{to{stroke-dashoffset:-32}}
@keyframes iso-pulse{0%,100%{opacity:.18}12%{opacity:1}40%{opacity:.18}}
.iso-line[data-flow]{animation:iso-flow 1600ms linear infinite}
.iso-dots circle[data-pulse]{animation:iso-pulse 1600ms steps(1,end) infinite;animation-delay:var(--pulse-at,0ms)}
.iso-figure{margin:32px 0 36px}
.iso-plate{position:relative;padding:52px 24px;border-radius:0;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid);--anatomy-paper:var(--anatomy-card)}
.iso-plate-corners{position:absolute;inset:18px 20px;pointer-events:none}
.iso-plate-corner{position:absolute;color:var(--anatomy-muted);font-family:var(--anatomy-mono);font-size:10.5px;line-height:1;letter-spacing:.04em;white-space:nowrap}
.iso-plate-corner[data-corner="fig"]{top:0;left:0;color:var(--anatomy-text)}
.iso-plate-corner[data-corner="title"]{top:0;right:0;text-transform:uppercase;letter-spacing:.1em}
.iso-plate-corner[data-corner="hint"]{bottom:0;left:0;text-transform:uppercase;letter-spacing:.1em}
.iso-plate-corner[data-corner="readout"]{right:0;bottom:0;color:var(--anatomy-text);font-variant-numeric:tabular-nums}
.iso-plate .iso-svg{margin:0 auto}
.iso-legend{display:grid;gap:8px;margin-top:12px;color:var(--anatomy-muted);font-size:13px;line-height:1.55}
.iso-keys{display:flex;flex-wrap:wrap;gap:6px 18px}
.iso-key{display:inline-flex;align-items:center;gap:7px}
.iso-swatch{width:16px;height:10px;flex:none;overflow:visible}
.iso-swatch path{fill:none;stroke:var(--anatomy-hi);stroke-width:1;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}
.iso-swatch[data-mark="raised"] path,.iso-swatch[data-mark="flat"] path{stroke:var(--anatomy-mid)}
.iso-swatch[data-mark="lit"] path{stroke:var(--anatomy-lit)}
.iso-swatch[data-mark="dim"] path{stroke:var(--anatomy-lo)}
.iso-swatch[data-mark="dotted"] path{stroke-dasharray:.01 3;stroke-width:1.4}
.iso-swatch[data-mark="dashed"] path{stroke-dasharray:3 2.5}
.iso-swatch[data-mark="red"] path{stroke:var(--anatomy-red)}
.iso-swatch[data-mark="green"] path{stroke:var(--anatomy-green)}
.iso-swatch[data-mark="blue"] path{stroke:var(--anatomy-blue)}
.iso-swatch-crease{stroke:var(--anatomy-lo)!important}
@media (max-width:560px){.iso-plate{padding:48px 12px 70px}.iso-plate-corner[data-corner="hint"]{bottom:18px}}
@media (prefers-reduced-motion:reduce){.iso-line[data-flow],.iso-dots circle[data-pulse]{animation:none}}
`;

// Fig 1 model: the thermoneutral zone and one hot flash.
//
// Pure functions, no DOM. The build imports it for geometry, and the page inlines
// the same source (exports stripped) for every motion and readout, so nothing on
// screen is tuned by eye. Citation keys refer to reference/truth-pack.md §1.
//
// Temperatures are changes from the woman's own resting core temperature, not
// absolute °C: published thresholds differ by protocol and measuring site
// (≈37.2 °C in [Freedman 1999], ≈38.0 °C in [Freedman & Blacker 2002]), so the
// figure only shows what is comparable: the zone's width and the size of the rise.
//
// e is the estrogen state the knob sets: 1 = pre-menopause (zone like that of
// women without hot flashes), 0 = post-menopause in a woman who has hot flashes.

const TRUTH = {
  zonePre: 0.4, //            °C  interthreshold zone, women without hot flashes [Freedman 1999]
  zonePost: 0.0, //           °C  measured in women with hot flashes, "virtually nonexistent" [Freedman 1999]
  zoneFloor: 0.04, //         °C  drawn gap at the post end so the finger fits; shown as 0.0 (one decimal, the precision measured)
  sweatShare: 0.3 / 0.4, //       share of the narrowing from the sweating threshold falling: 37.5 → 37.2 °C [Freedman 1999 via Gombert-Labedens 2025]
  swing: 0.04, //             °C  a small natural rise in core temperature, the classic trigger "~0.03–0.05 °C" [Jones 2019]
  flashMin: 3.4, //           min duration of one flash, 3.4 ± 1.4 [Low 2008]
  hrRise: 10, //              bpm heart-rate rise during a flash, +9 ± 2 / +10 ± 1 [Low 2008]
  skinRise: 2.7, //           °C  finger skin-temperature rise, mean 2.7 ± 0.2 (range 1–7) [Meldrum 1979; Kronenberg 1994]
  skinPeakMin: 1, //          min sharp rise at onset [Molnar 1975]; time to peak taken as about 1 min (assumption)
  skinElevatedMin: 31, //     min finger temperature stays raised about 31 min [Meldrum 1979]
  chill: 0.05, //             °C  after-chill depth: direction sourced [Kronenberg 1984], size ILLUSTRATIVE (not measured)
  chillMin: [2, 6, 14], //    min dip begins, bottoms, recovers: ILLUSTRATIVE timing
  ratePost: 1.1, //           per hour, interval 54 ± 10 min in highly symptomatic women [Meldrum 1979]; lab 0.7–1.3 [Freedman 1998; Low 2008]
  swingRiseMin: 9, //         min the pre-flash rise is measured over 20 min [Jones 2019]; half of it to the peak
};

// What the figure draws: the scale board's range, the column's travel.
const SCALE = { low: -0.15, high: 0.3 };
const RANGE = { low: -0.07, high: 0.06 };

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Zone at estrogen state e, relative to resting core temperature. */
function zoneOf(e) {
  const width = lerp(TRUTH.zoneFloor, TRUTH.zonePre, e);
  // The post zone is centred on rest; widening comes 75 % from the sweat side.
  const sweat = TRUTH.zoneFloor / 2 + (width - TRUTH.zoneFloor) * TRUTH.sweatShare;
  const shiver = sweat - width;
  const shown = lerp(TRUTH.zonePost, TRUTH.zonePre, e); // 0.0 → 0.4, as measured
  return { sweat, shiver, width, shown };
}

/**
 * Flashes per hour at state e. Core temperature wanders by about σ = swing; the
 * rate at which a wandering (Gaussian) signal crosses a level u above its mean
 * falls as exp(−u²/2σ²) (Rice's formula). Anchored to the symptomatic rate.
 */
function rateOf(e) {
  const s = zoneOf(e).sweat;
  const s0 = zoneOf(0).sweat;
  const sigma = TRUTH.swing;
  return TRUTH.ratePost * Math.exp(-(s * s - s0 * s0) / (2 * sigma * sigma));
}

/** The response to one flash, t minutes after onset. Each part 0..1 or in its unit. */
function flashAt(t) {
  if (t < 0) return { on: 0, hr: 0, skin: 0, louvre: 0, chill: 0 };
  const D = TRUTH.flashMin;
  // Vasodilation (louvres) and heart rate: on for the flash, eased in and out.
  const on = smooth(0, 0.35, t) * (1 - smooth(D - 0.5, D + 0.4, t));
  // Finger skin: sharp rise, slow fall, back near baseline by ~31 min.
  const tau = TRUTH.skinElevatedMin / 3;
  const rise = smooth(0, TRUTH.skinPeakMin, t);
  const fall = t > TRUTH.skinPeakMin ? Math.exp(-(t - TRUTH.skinPeakMin) / tau) : 1;
  const skin = TRUTH.skinRise * rise * fall;
  // After-chill: core falls below rest after the heat is let out, then recovers.
  const [c0, c1, c2] = TRUTH.chillMin;
  const chill = -TRUTH.chill * (smooth(c0, c1, t) - smooth(c1, c2, t));
  return { on, hr: TRUTH.hrRise * on, skin, louvre: on, chill };
}

/** A natural swing of core temperature, s minutes into it (0 → peak → 0 over 2·swingRiseMin). */
function swingAt(s) {
  const T = TRUTH.swingRiseMin;
  return TRUTH.swing * (smooth(0, T, s) - smooth(T, 2 * T, s));
}

/** Knob angle (radians, 0 = −y, clockwise from above) for state e. */
const KNOB = { from: -0.75 * Math.PI, span: 1.5 * Math.PI };
const knobAngle = (e) => KNOB.from + (1 - e) * KNOB.span;

/** The two dials: their scales and where the needle points for a value. */
const DIALS = {
  skin: { unit: "°C", from: -0.75 * Math.PI, span: 1.5 * Math.PI, max: 6, count: 12, every: 2, base: 0 },
  hr: { unit: "bpm", from: -0.75 * Math.PI, span: 1.5 * Math.PI, max: 30, count: 12, every: 2, base: 0 },
};
for (const dial of Object.values(DIALS)) dial.angleOf = (v) => dial.from + clamp(v / dial.max, 0, 1) * dial.span;

// A3 model: the clock for one hot flash seen in the finger's skin. The response itself comes from
// Fig 1's flashAt(t) (inlined alongside): vasodilation `on` (0–1) opens the arteriovenous shunts,
// and `skin` is the finger skin-temperature rise (+2.7 °C peak, raised ≈ 31 min) [Meldrum 1979;
// Kronenberg 1994; Low 2008], truth pack §1.
const CLOCK = {
  start: -1, //    minutes shown before the flash
  slowUntil: 7, // minutes played slowly (the flash itself)
  slow: 0.35, //   minutes per second while it happens
  fast: 2.5, //    minutes per second for the long cool-down
  end: 30, //      last minute shown
  hold: 2, //      seconds held at the end before it repeats
};
/** Minutes into the flash after s seconds of playback. */
function minuteAt(s) {
  const s1 = (CLOCK.slowUntil - CLOCK.start) / CLOCK.slow;
  if (s <= s1) return CLOCK.start + s * CLOCK.slow;
  return Math.min(CLOCK.end, CLOCK.slowUntil + (s - s1) * CLOCK.fast);
}
/** Seconds of playback for one loop, including the hold. */
const loopSeconds = () => (CLOCK.slowUntil - CLOCK.start) / CLOCK.slow + (CLOCK.end - CLOCK.slowUntil) / CLOCK.fast + CLOCK.hold;

// A3 live code: one hot flash in the finger's skin, driven by Fig 1's flashAt(t). `louvre`
// opens the shunts (lumen widens, the nerve's squeeze stops, blood takes the shortcut into the
// plexus); `skin` sets how warm the skin glows and the heat rising off it; the monitor plots it.
const DATA = {"loops":[{"up":[[48.5,176.35114100916988],[48.8,142],[50.5,134]],"down":[[53.5,134],[55.2,142],[55.5,176.35114100916988]]},{"up":[[70.5,172.31439556890987],[70.8,142],[72.5,134]],"down":[[75.5,134],[77.2,142],[77.5,172.31439556890987]]},{"up":[[92.5,170.01050740123404],[92.8,142],[94.5,134]],"down":[[97.5,134],[99.2,142],[99.5,170.01050740123404]]},{"up":[[114.5,171.80794997058132],[114.8,142],[116.5,134]],"down":[[119.5,134],[121.2,142],[121.5,171.80794997058132]]},{"up":[[136.5,175.85889268817508],[136.8,142],[138.5,134]],"down":[[141.5,134],[143.2,142],[143.5,175.85889268817508]]},{"up":[[158.5,177.99883205632077],[158.8,142],[160.5,134]],"down":[[163.5,134],[165.2,142],[165.5,177.99883205632077]]},{"up":[[180.5,176.02783941525436],[180.8,142],[182.5,134]],"down":[[185.5,134],[187.2,142],[187.5,176.02783941525436]]},{"up":[[202.5,171.97216058474564],[202.8,142],[204.5,134]],"down":[[207.5,134],[209.2,142],[209.5,171.97216058474564]]},{"up":[[224.5,170.00116794367923],[224.8,142],[226.5,134]],"down":[[229.5,134],[231.2,142],[231.5,170.00116794367923]]},{"up":[[246.5,172.14110731182492],[246.8,142],[248.5,134]],"down":[[251.5,134],[253.2,142],[253.5,172.14110731182492]]},{"up":[[268.5,176.19205002941868],[268.8,142],[270.5,134]],"down":[[273.5,134],[275.2,142],[275.5,176.19205002941868]]},{"up":[[290.5,177.98949259876596],[290.8,142],[292.5,134]],"down":[[295.5,134],[297.2,142],[297.5,177.98949259876596]]},{"up":[[312.5,175.68560443109013],[312.8,142],[314.5,134]],"down":[[317.5,134],[319.2,142],[319.5,175.68560443109013]]},{"up":[[334.5,171.64885899083012],[334.8,142],[336.5,134]],"down":[[339.5,134],[341.2,142],[341.5,171.64885899083012]]},{"up":[[356.5,170.02916450360777],[356.8,142],[358.5,134]],"down":[[361.5,134],[363.2,142],[363.5,170.02916450360777]]},{"up":[[378.5,172.49162063324673],[378.8,142],[380.5,134]],"down":[[383.5,134],[385.2,142],[385.5,172.49162063324673]]},{"up":[[400.5,176.50474079015325],[400.8,142],[402.5,134]],"down":[[405.5,134],[407.2,142],[407.5,176.50474079015325]]},{"up":[[422.5,177.9429043237266],[422.8,142],[424.5,134]],"down":[[427.5,134],[429.2,142],[429.5,177.9429043237266]]},{"up":[[444.5,175.3276314125141],[444.8,142],[446.5,134]],"down":[[449.5,134],[451.2,142],[451.5,175.3276314125141]]},{"up":[[466.5,171.34750936703682],[466.8,142],[468.5,134]],"down":[[471.5,134],[473.2,142],[473.5,171.34750936703682]]},{"up":[[488.5,170.0942356846829],[488.8,142],[490.5,134]],"down":[[493.5,134],[495.2,142],[495.5,170.0942356846829]]},{"up":[[510.5,172.85621728640524],[510.8,142],[512.5,134]],"down":[[515.5,134],[517.2,142],[517.5,172.85621728640524]]},{"up":[[532.5,176.79404546099573],[532.8,142],[534.5,134]],"down":[[537.5,134],[539.2,142],[539.5,176.79404546099573]]},{"up":[[554.5,177.8595022133742],[554.8,142],[556.5,134]],"down":[[559.5,134],[561.2,142],[561.5,177.8595022133742]]}],"avas":[[[148,306.6],[148.4,304.5],[149.1,302.5],[150.1,300.5],[151.3,298.5],[152.4,296.4],[153.4,294.4],[154.1,292.4],[154.4,290.3],[154.3,288.3],[153.6,286.3],[152.4,284.3],[150.8,282.2],[148.9,280.2],[146.9,278.2],[145,276.2],[143.4,274.1],[142.2,272.1],[141.7,270.1],[141.9,268.1],[142.9,266],[144.7,264],[147.2,262],[150.2,260],[153.6,257.9],[157.1,255.9],[160.4,253.9],[163.4,251.9],[165.7,249.8],[167.3,247.8],[168,245.8],[167.8,243.8],[166.7,241.7],[164.8,239.7],[162.3,237.7],[159.4,235.6],[156.4,233.6],[153.5,231.6],[150.9,229.6],[148.9,227.5],[147.6,225.5],[147,223.5],[147.3,221.5],[148.3,219.4],[149.9,217.4],[152,215.4],[154.4,213.4],[156.8,211.3],[159.2,209.3],[161.3,207.3],[162.9,205.3],[164.1,203.2],[164.7,201.2],[164.9,199.2],[164.6,197.2],[164.1,195.1],[163.4,193.1],[162.7,191.1],[162.2,189.1],[161.9,187],[162,185]],[[300,304.6],[300.4,302.6],[301.1,300.6],[302.1,298.5],[303.3,296.5],[304.4,294.5],[305.4,292.5],[306.1,290.4],[306.4,288.4],[306.3,286.4],[305.6,284.4],[304.4,282.3],[302.8,280.3],[300.9,278.3],[298.9,276.2],[297,274.2],[295.4,272.2],[294.2,270.2],[293.7,268.1],[293.9,266.1],[294.9,264.1],[296.7,262.1],[299.2,260],[302.2,258],[305.6,256],[309.1,254],[312.4,251.9],[315.4,249.9],[317.7,247.9],[319.3,245.8],[320,243.8],[319.8,241.8],[318.7,239.8],[316.8,237.7],[314.3,235.7],[311.4,233.7],[308.4,231.7],[305.5,229.6],[302.9,227.6],[300.9,225.6],[299.6,223.6],[299,221.5],[299.3,219.5],[300.3,217.5],[301.9,215.5],[304,213.4],[306.4,211.4],[308.8,209.4],[311.2,207.3],[313.3,205.3],[314.9,203.3],[316.1,201.3],[316.7,199.2],[316.9,197.2],[316.6,195.2],[316.1,193.2],[315.4,191.1],[314.7,189.1],[314.2,187.1],[313.9,185.1],[314,183]],[[446,303.1],[446.4,301],[447.1,299],[448.1,296.9],[449.3,294.9],[450.4,292.8],[451.4,290.8],[452.1,288.7],[452.4,286.7],[452.3,284.6],[451.6,282.6],[450.4,280.5],[448.8,278.5],[446.9,276.4],[444.9,274.4],[443,272.3],[441.4,270.3],[440.2,268.2],[439.7,266.2],[439.9,264.1],[440.9,262.1],[442.7,260],[445.2,258],[448.2,255.9],[451.6,253.9],[455.1,251.8],[458.4,249.8],[461.4,247.7],[463.7,245.7],[465.3,243.6],[466,241.6],[465.8,239.5],[464.7,237.5],[462.8,235.4],[460.3,233.4],[457.4,231.3],[454.4,229.3],[451.5,227.2],[448.9,225.2],[446.9,223.1],[445.6,221],[445,219],[445.3,216.9],[446.3,214.9],[447.9,212.8],[450,210.8],[452.4,208.7],[454.8,206.7],[457.2,204.6],[459.3,202.6],[460.9,200.5],[462.1,198.5],[462.7,196.4],[462.9,194.4],[462.6,192.3],[462.1,190.3],[461.4,188.2],[460.7,186.2],[460.2,184.1],[459.9,182.1],[460,180]]],"plexus":[[24,179.7],[28,179.9],[32,180],[36,179.9],[40,179.7],[44,179.4],[48,178.9],[52,178.4],[56,177.7],[60,177],[64,176.2],[68,175.4],[72,174.7],[76,174],[80,173.3],[84,172.8],[88,172.4],[92,172.1],[96,172],[100,172],[104,172.2],[108,172.5],[112,172.9],[116,173.5],[120,174.1],[124,174.9],[128,175.6],[132,176.4],[136,177.1],[140,177.9],[144,178.5],[148,179.1],[152,179.5],[156,179.8],[160,180],[164,180],[168,179.9],[172,179.6],[176,179.2],[180,178.7],[184,178],[188,177.3],[192,176.6],[196,175.8],[200,175],[204,174.3],[208,173.6],[212,173.1],[216,172.6],[220,172.3],[224,172.1],[228,172],[232,172.1],[236,172.3],[240,172.7],[244,173.2],[248,173.8],[252,174.5],[256,175.2],[260,176],[264,176.8],[268,177.5],[272,178.2],[276,178.8],[280,179.3],[284,179.7],[288,179.9],[292,180],[296,179.9],[300,179.7],[304,179.4],[308,178.9],[312,178.4],[316,177.7],[320,177],[324,176.2],[328,175.4],[332,174.7],[336,174],[340,173.3],[344,172.8],[348,172.4],[352,172.1],[356,172],[360,172],[364,172.2],[368,172.5],[372,172.9],[376,173.5],[380,174.1],[384,174.9],[388,175.6],[392,176.4],[396,177.1],[400,177.9],[404,178.5],[408,179.1],[412,179.5],[416,179.8],[420,180],[424,180],[428,179.9],[432,179.6],[436,179.2],[440,178.7],[444,178],[448,177.3],[452,176.6],[456,175.8],[460,175],[464,174.3],[468,173.6],[472,173.1],[476,172.6],[480,172.3],[484,172.1],[488,172],[492,172.1],[496,172.3],[500,172.7],[504,173.2],[508,173.8],[512,174.5],[516,175.2],[520,176],[524,176.8],[528,177.5],[532,178.2],[536,178.8],[540,179.3],[544,179.7],[548,179.9],[552,180],[556,179.9],[560,179.7],[564,179.4],[568,178.9],[572,178.4],[576,177.7]],"artery":[[24,314.9],[28,314.7],[32,314.5],[36,314.2],[40,313.8],[44,313.5],[48,313.1],[52,312.7],[56,312.2],[60,311.8],[64,311.3],[68,310.9],[72,310.5],[76,310.1],[80,309.8],[84,309.5],[88,309.3],[92,309.1],[96,309],[100,309],[104,309],[108,309.1],[112,309.3],[116,309.5],[120,309.8],[124,310.1],[128,310.4],[132,310.8],[136,311.2],[140,311.7],[144,312.1],[148,312.6],[152,313],[156,313.4],[160,313.8],[164,314.1],[168,314.4],[172,314.6],[176,314.8],[180,314.9],[184,315],[188,315],[192,314.9],[196,314.8],[200,314.6],[204,314.3],[208,314],[212,313.7],[216,313.3],[220,312.9],[224,312.4],[228,312],[232,311.6],[236,311.1],[240,310.7],[244,310.3],[248,310],[252,309.7],[256,309.4],[260,309.2],[264,309.1],[268,309],[272,309],[276,309.1],[280,309.2],[284,309.4],[288,309.6],[292,309.9],[296,310.2],[300,310.6],[304,311],[308,311.5],[312,311.9],[316,312.3],[320,312.8],[324,313.2],[328,313.6],[332,313.9],[336,314.3],[340,314.5],[344,314.7],[348,314.9],[352,315],[356,315],[360,315],[364,314.9],[368,314.7],[372,314.5],[376,314.2],[380,313.8],[384,313.5],[388,313.1],[392,312.7],[396,312.2],[400,311.8],[404,311.3],[408,310.9],[412,310.5],[416,310.1],[420,309.8],[424,309.5],[428,309.3],[432,309.1],[436,309],[440,309],[444,309],[448,309.1],[452,309.3],[456,309.5],[460,309.8],[464,310.1],[468,310.4],[472,310.8],[476,311.2],[480,311.7],[484,312.1],[488,312.6],[492,313],[496,313.4],[500,313.8],[504,314.1],[508,314.4],[512,314.6],[516,314.8],[520,314.9],[524,315],[528,315],[532,314.9],[536,314.8],[540,314.6],[544,314.3],[548,314],[552,313.7],[556,313.3],[560,312.9],[564,312.4],[568,312],[572,311.6],[576,311.1]],"feeds":[78,214,352,494],"avaX":[148,300,446],"nerve":[[20,262],[90,256],[170,266],[250,258],[330,266],[410,258],[500,264],[580,258]],"branches":[[[138,262],[144,252],[150,246]],[[290,262],[296,252],[302,246]],[[436,262],[442,252],[448,246]]],"surface":[[24,92.1],[26,91],[28,90.2],[30,90],[32,90.2],[34,91],[36,92.1],[38,93.5],[40,95.1],[42,96.9],[44,98.5],[46,99.9],[48,101],[50,101.8],[52,102],[54,101.8],[56,101],[58,99.9],[60,98.5],[62,96.9],[64,95.1],[66,93.5],[68,92.1],[70,91],[72,90.2],[74,90],[76,90.2],[78,91],[80,92.1],[82,93.5],[84,95.1],[86,96.9],[88,98.5],[90,99.9],[92,101],[94,101.8],[96,102],[98,101.8],[100,101],[102,99.9],[104,98.5],[106,96.9],[108,95.1],[110,93.5],[112,92.1],[114,91],[116,90.2],[118,90],[120,90.2],[122,91],[124,92.1],[126,93.5],[128,95.1],[130,96.9],[132,98.5],[134,99.9],[136,101],[138,101.8],[140,102],[142,101.8],[144,101],[146,99.9],[148,98.5],[150,96.9],[152,95.1],[154,93.5],[156,92.1],[158,91],[160,90.2],[162,90],[164,90.2],[166,91],[168,92.1],[170,93.5],[172,95.1],[174,96.9],[176,98.5],[178,99.9],[180,101],[182,101.8],[184,102],[186,101.8],[188,101],[190,99.9],[192,98.5],[194,96.9],[196,95.1],[198,93.5],[200,92.1],[202,91],[204,90.2],[206,90],[208,90.2],[210,91],[212,92.1],[214,93.5],[216,95.1],[218,96.9],[220,98.5],[222,99.9],[224,101],[226,101.8],[228,102],[230,101.8],[232,101],[234,99.9],[236,98.5],[238,96.9],[240,95.1],[242,93.5],[244,92.1],[246,91],[248,90.2],[250,90],[252,90.2],[254,91],[256,92.1],[258,93.5],[260,95.1],[262,96.9],[264,98.5],[266,99.9],[268,101],[270,101.8],[272,102],[274,101.8],[276,101],[278,99.9],[280,98.5],[282,96.9],[284,95.1],[286,93.5],[288,92.1],[290,91],[292,90.2],[294,90],[296,90.2],[298,91],[300,92.1],[302,93.5],[304,95.1],[306,96.9],[308,98.5],[310,99.9],[312,101],[314,101.8],[316,102],[318,101.8],[320,101],[322,99.9],[324,98.5],[326,96.9],[328,95.1],[330,93.5],[332,92.1],[334,91],[336,90.2],[338,90],[340,90.2],[342,91],[344,92.1],[346,93.5],[348,95.1],[350,96.9],[352,98.5],[354,99.9],[356,101],[358,101.8],[360,102],[362,101.8],[364,101],[366,99.9],[368,98.5],[370,96.9],[372,95.1],[374,93.5],[376,92.1],[378,91],[380,90.2],[382,90],[384,90.2],[386,91],[388,92.1],[390,93.5],[392,95.1],[394,96.9],[396,98.5],[398,99.9],[400,101],[402,101.8],[404,102],[406,101.8],[408,101],[410,99.9],[412,98.5],[414,96.9],[416,95.1],[418,93.5],[420,92.1],[422,91],[424,90.2],[426,90],[428,90.2],[430,91],[432,92.1],[434,93.5],[436,95.1],[438,96.9],[440,98.5],[442,99.9],[444,101],[446,101.8],[448,102],[450,101.8],[452,101],[454,99.9],[456,98.5],[458,96.9],[460,95.1],[462,93.5],[464,92.1],[466,91],[468,90.2],[470,90],[472,90.2],[474,91],[476,92.1],[478,93.5],[480,95.1],[482,96.9],[484,98.5],[486,99.9],[488,101],[490,101.8],[492,102],[494,101.8],[496,101],[498,99.9],[500,98.5],[502,96.9],[504,95.1],[506,93.5],[508,92.1],[510,91],[512,90.2],[514,90],[516,90.2],[518,91],[520,92.1],[522,93.5],[524,95.1],[526,96.9],[528,98.5],[530,99.9],[532,101],[534,101.8],[536,102],[538,101.8],[540,101],[542,99.9],[544,98.5],[546,96.9],[548,95.1],[550,93.5],[552,92.1],[554,91],[556,90.2],[558,90],[560,90.2],[562,91],[564,92.1],[566,93.5],[568,95.1],[570,96.9],[572,98.5],[574,99.9],[576,101]],"mon":{"x0":86,"x1":548,"t0":-1,"t1":30,"y0":586,"y1":512,"max":3,"box":[24,468,552,150]},"plexY":176,"artY":312};

function mount(fig) {
  const svg = fig.querySelector("svg");
  const q = (s) => svg.querySelector(s);
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const out = Object.fromEntries([...fig.querySelectorAll("[data-r]")].map((n) => [n.dataset.r, n]));
  const status = fig.querySelector("[data-status]");
  const line = fig.querySelector("[data-scene]");
  const buttons = [...fig.querySelectorAll('[data-control="mode"] .opt-seg-btn')];
  const f1 = (v) => v.toFixed(1);
  const set = (part, attr, v) => q(`[data-part="${part}"]`).setAttribute(attr, v);
  const MON = DATA.mon;

  // ---------------------------------------------------------------- colours from the theme
  const css = getComputedStyle(fig);
  const hex = (name, fb) => {
    const m = /^#?([0-9a-f]{6})$/i.exec((css.getPropertyValue(name) || fb).trim()) || /^#?([0-9a-f]{6})$/i.exec(fb);
    return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  };
  const VENC = hex("--a3-ven", "#5a5fa8");
  const ARTC = hex("--a3-art", "#d0463a");
  const mix = (t) => `rgb(${[0, 1, 2].map((i) => Math.round(VENC[i] + (ARTC[i] - VENC[i]) * t)).join(",")})`;

  // ---------------------------------------------------------------- geometry helpers
  function curve(points, samples = 8) {
    const o = [];
    const n = points.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(n - 1, i + 2)];
      for (let s = 0; s < samples; s++) {
        const t = s / samples, t2 = t * t, t3 = t2 * t;
        o.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
      }
    }
    o.push(points[n - 1]);
    return o;
  }
  function tube(c, w) {
    const L = [];
    const R = [];
    c.forEach((p, i) => {
      const a = c[Math.max(0, i - 1)];
      const b = c[Math.min(c.length - 1, i + 1)];
      let nx = -(b[1] - a[1]);
      let ny = b[0] - a[0];
      const l = Math.hypot(nx, ny) || 1;
      nx /= l;
      ny /= l;
      L.push([p[0] + (nx * w) / 2, p[1] + (ny * w) / 2]);
      R.push([p[0] - (nx * w) / 2, p[1] - (ny * w) / 2]);
    });
    return `M${[...L, ...R.reverse()].map((p) => `${f1(p[0])} ${f1(p[1])}`).join("L")}Z`;
  }
  const measure = (pts) => {
    const acc = [0];
    for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, acc, L: acc[acc.length - 1] };
  };
  const along = (m, s) => {
    let lo = 1;
    let hi = m.acc.length - 1;
    const x = Math.max(0, Math.min(m.L, s));
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (m.acc[mid] < x) lo = mid + 1;
      else hi = mid;
    }
    const a = m.pts[lo - 1];
    const b = m.pts[lo];
    const t = (x - m.acc[lo - 1]) / (m.acc[lo] - m.acc[lo - 1] || 1);
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, tx: (b[0] - a[0]) / l, ty: (b[1] - a[1]) / l };
  };

  // ---------------------------------------------------------------- routes for blood
  const ART = DATA.artery;
  const PLX = DATA.plexus;
  const upTo = (pts, x) => pts.filter((p) => p[0] <= x);
  const from = (pts, x) => pts.filter((p) => p[0] >= x);
  const route = (parts) => {
    // parts: [points, kind]; each kind has its own speed; venous after a capillary bed
    const pts = [];
    const marks = [];
    for (const [p, kind] of parts) {
      if (!p.length) continue;
      const start = pts.length;
      pts.push(...p);
      marks.push({ start, kind });
    }
    const m = measure(pts);
    m.kinds = marks.map((k, i) => ({ kind: k.kind, from: m.acc[k.start], to: i + 1 < marks.length ? m.acc[marks[i + 1].start] : m.L }));
    return m;
  };
  const ROUTES = {
    through: [route([[ART, "art"]])],
    caps: DATA.feeds.map((x, k) => {
      const loop = DATA.loops.reduce((b, l) => (Math.abs(l.up[0][0] - x) < Math.abs(b.up[0][0] - x) ? l : b));
      return route([[upTo(ART, x), "art"], [curve([[x, DATA.artY - 4], [x + 6, 270], [x - 4, 230], [x + 3, 200], [loop.up[0][0], loop.up[0][1]]]), "feed"], [curve([...loop.up, ...loop.down]), "cap"], [from(PLX, loop.down[2][0]), "plexV"]]);
    }),
    shunts: DATA.avas.map((pts) => route([[upTo(ART, pts[0][0]), "art"], [pts, "ava"], [from(PLX, pts[pts.length - 1][0]), "plexA"]])),
  };
  const NERVE = measure(curve(DATA.nerve, 10));

  // ---------------------------------------------------------------- state
  let mode = 0;
  let s = 0;
  let t = -1;
  let open = 0;
  let phase = -1;
  const cells = [];
  const spikes = [];
  const rate = { through: 5, caps: 1.1, shunts: 9 };
  const debt = { through: 0, caps: 0, shunts: 0 };
  const speedOf = (kind) => ({ art: 120, feed: 34, cap: 22, plexV: 34 + 40 * open, ava: 40 + 170 * open, plexA: 60 + 110 * open })[kind];
  function step(dt) {
    const fl = flashAt(t);
    open = fl.louvre;
    // blood: the shunts carry blood only when they're open
    for (const [key, list] of Object.entries(ROUTES)) {
      const r = key === "shunts" ? rate.shunts * open * open : rate[key];
      debt[key] += r * dt * list.length;
      while (debt[key] >= 1) {
        debt[key] -= 1;
        cells.push({ m: list[Math.floor(Math.random() * list.length)], s: 0, j: (Math.random() - 0.5) * 3 });
      }
    }
    for (let i = cells.length - 1; i >= 0; i--) {
      const c = cells[i];
      const k = c.m.kinds.find((kk) => c.s < kk.to) ?? c.m.kinds[c.m.kinds.length - 1];
      c.kind = k.kind;
      c.s += speedOf(k.kind) * dt;
      if (c.s >= c.m.L) cells.splice(i, 1);
    }
    // the nerve fires while it holds the shunts shut
    if (Math.random() < dt * 9 * (1 - open)) spikes.push({ s: 0 });
    for (let i = spikes.length - 1; i >= 0; i--) {
      spikes[i].s += dt * 220;
      if (spikes[i].s > NERVE.L) spikes.splice(i, 1);
    }
  }
  function draw() {
    const fl = flashAt(t);
    const warm = Math.max(0, fl.skin) / TRUTH.skinRise;
    // vessels
    set("art", "d", tube(ART, 13));
    set("plex", "d", tube(PLX, 7 + 7 * open));
    q('[data-part="plex"]').style.fill = mix(0.15 + 0.6 * open);
    set("avaWall", "d", DATA.avas.map((p) => tube(p, 7 + 6 * open)).join(""));
    set("ava", "d", DATA.avas.map((p) => tube(p, 1.6 + 7.4 * open)).join(""));
    q('[data-part="ava"]').style.fill = mix(0.4 + 0.6 * open);
    // warmth in the skin and heat rising off it
    set("warm", "opacity", (0.6 * warm).toFixed(2));
    // the block also flushes its top and side faces
    for (const part of ["topwarm", "sidewarm"]) q(`[data-part="${part}"]`)?.setAttribute("opacity", (0.55 * warm).toFixed(2));
    let heat = "";
    if (warm > 0.03)
      for (let k = 0; k < 9; k++) {
        const x0 = 50 + k * 62;
        let d = "";
        for (let y = 86; y >= 18; y -= 6) {
          const x = x0 + 5 * Math.sin(y * 0.12 + performance.now() / 260 + k);
          d += `${d ? "L" : "M"}${f1(x)} ${y}`;
        }
        heat += d;
      }
    set("heat", "d", heat);
    q('[data-part="heat"]').style.opacity = (0.75 * warm).toFixed(2);
    // cells: oxygen-rich in the artery, the shunts and the plexus they flood; darker after the loops
    let a = "";
    let v = "";
    for (const c of cells) {
      const p = along(c.m, c.s);
      const rx = 3.1;
      const ang = ((Math.atan2(p.ty, p.tx) * 180) / Math.PI).toFixed(0);
      const x = p.x - p.ty * c.j;
      const y = p.y + p.tx * c.j;
      const e = `M${f1(x - p.tx * rx)} ${f1(y - p.ty * rx)}A${rx} 2 ${ang} 1 0 ${f1(x + p.tx * rx)} ${f1(y + p.ty * rx)}A${rx} 2 ${ang} 1 0 ${f1(x - p.tx * rx)} ${f1(y - p.ty * rx)}Z`;
      if (c.kind === "plexV" || c.kind === "cap") v += e;
      else a += e;
    }
    set("cellsA", "d", a);
    set("cellsV", "d", v);
    set("spikes", "d", spikes.map((sp) => {
      const p = along(NERVE, sp.s);
      return `M${f1(p.x - 2.6)} ${f1(p.y)}a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0 -5.2 0`;
    }).join(""));
    // monitor
    const xOf = (tt) => MON.x0 + ((tt - MON.t0) / (MON.t1 - MON.t0)) * (MON.x1 - MON.x0);
    const yOf = (vv) => MON.y0 - (vv / MON.max) * (MON.y0 - MON.y1);
    let d = "";
    for (let tt = MON.t0; tt <= t + 1e-9; tt += 0.1) d += `${d ? "L" : "M"}${f1(xOf(tt))} ${f1(yOf(flashAt(tt).skin))}`;
    set("curve", "d", d);
    set("mdot", "cx", f1(xOf(t)));
    set("mdot", "cy", f1(yOf(fl.skin)));
    out.min.textContent = t < 0 ? "before" : t < 10 ? t.toFixed(1) : `${Math.round(t)}`;
    out.skin.textContent = `+${Math.max(0, fl.skin).toFixed(1)} °C`;
    out.hr.textContent = `+${Math.round(fl.hr)} bpm`;
    const ph = t < 0 ? 0 : open > 0.05 ? 1 : 2;
    if (ph !== phase) {
      phase = ph;
      line.textContent = [
        "Between flashes: the nerve keeps the shunts squeezed shut, and blood takes the slow road through the capillary loops.",
        "The flash: the squeeze lifts, the shunts open, and warm blood floods the veins just under the skin.",
        "The shunts close again within minutes, but the skin gives up its heat slowly: still warm half an hour later.",
      ][ph];
    }
  }

  // ---------------------------------------------------------------- input, loop
  function setMode(i, quiet) {
    mode = i;
    s = 0;
    t = -1;
    buttons.forEach((b, j) => {
      b.setAttribute("aria-checked", j === i ? "true" : "false");
      b.tabIndex = j === i ? 0 : -1;
    });
    if (!quiet) status.textContent = i === 0 ? `A hot flash: the finger's skin warms about ${TRUTH.skinRise} degrees within a minute and stays warm for about half an hour.` : "Between flashes: the shunts stay shut.";
  }
  buttons.forEach((b, i) =>
    b.addEventListener("click", () => {
      setMode(i);
      if (still.matches) renderStill();
    }),
  );
  fig.querySelector('[data-control="mode"]').addEventListener("keydown", (ev) => {
    const i = buttons.indexOf(document.activeElement);
    if (i < 0) return;
    const j = ev.key === "ArrowRight" || ev.key === "ArrowDown" ? i + 1 : ev.key === "ArrowLeft" || ev.key === "ArrowUp" ? i - 1 : null;
    if (j === null) return;
    ev.preventDefault();
    const b = buttons[(j + buttons.length) % buttons.length];
    b.focus();
    b.click();
  });
  function renderStill() {
    t = mode === 0 ? 1 : -1;
    cells.length = 0;
    spikes.length = 0;
    for (let i = 0; i < 360; i++) step(1 / 60);
    draw();
  }
  let raf = 0;
  let last = 0;
  let visible = true;
  function tick(now) {
    raf = 0;
    if (!visible || still.matches) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    if (mode === 0) {
      s += dt;
      if (s > loopSeconds()) s = 0;
      t = minuteAt(s);
    } else t = -1;
    step(dt);
    draw();
    raf = requestAnimationFrame(tick);
  }
  const start = () => {
    if (!raf && visible && !still.matches) {
      last = 0;
      raf = requestAnimationFrame(tick);
    }
  };
  new IntersectionObserver((entries) => {
    visible = entries.some((en) => en.isIntersecting);
    if (visible) start();
  }).observe(svg);
  still.addEventListener("change", () => (still.matches ? renderStill() : start()));
  setMode(0, true);
  if (still.matches) renderStill();
  else {
    for (let i = 0; i < 180; i++) step(1 / 60);
    draw();
    start();
  }
}

class Fig extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: "open" });
    const theme = this.getAttribute("theme") === "dark" ? "dark" : "light";
    root.innerHTML = "<style>" + "\n.iso{\n  --anatomy-page:#0b0b0b;--anatomy-card:#131313;--anatomy-text:#a3a3a3;--anatomy-strong:#e6e6e6;--anatomy-muted:#6e6e6e;\n  --anatomy-paper:#131313;--anatomy-face:#1b1b1b;--anatomy-top:#1c1c1c;\n  --anatomy-shade-0:#0f0f0f;--anatomy-shade-1:#121212;--anatomy-shade-2:#151515;--anatomy-shade-3:#181818;\n  --anatomy-lit-top:#262626;--anatomy-lit-shade:#1d1d1d;\n  --anatomy-hi:#d4d4d4;--anatomy-mid:#6a6a6a;--anatomy-lo:#3e3e3e;--anatomy-faint:#2a2a2a;--anatomy-lit:#ffffff;\n  --anatomy-halo:#050505;--anatomy-halo-opacity:.9;--anatomy-dot:#e6e6e6;\n  --anatomy-red:#ff6b6b;--anatomy-green:#6be0a0;--anatomy-blue:#6b9bff;\n  --anatomy-weight:.6px;--anatomy-ease:cubic-bezier(.32,.72,0,1);\n  --anatomy-mono:ui-monospace,\"SF Mono\",Menlo,Consolas,monospace;\n  --anatomy-lift:inset 0 1px 0 0 #ffffff0a,inset 0 0 0 1px #ffffff06,0 0 0 1px #00000026,0 1px 1px -.5px #00000014,0 3px 3px -1.5px #00000014,0 6px 6px -3px #00000014,0 12px 12px -6px #00000014;\n}\n.iso[data-theme=\"light\"]{\n  --anatomy-page:#f2f2ef;--anatomy-card:#fbfbfa;--anatomy-text:#57575a;--anatomy-strong:#18181a;--anatomy-muted:#8c8c90;\n  --anatomy-paper:#fbfbfa;--anatomy-face:#ffffff;--anatomy-top:#ffffff;\n  --anatomy-shade-0:#dcdcd9;--anatomy-shade-1:#e5e5e2;--anatomy-shade-2:#ededea;--anatomy-shade-3:#f4f4f1;\n  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#eeeeeb;\n  --anatomy-hi:#26262a;--anatomy-mid:#8a8a8f;--anatomy-lo:#b4b4b8;--anatomy-faint:#d4d4d6;--anatomy-lit:#000000;\n  --anatomy-halo:#8a8a80;--anatomy-halo-opacity:.32;--anatomy-dot:#3a3a3e;\n  --anatomy-red:#e5484d;--anatomy-green:#30a46c;--anatomy-blue:#3e63dd;\n  --anatomy-lift:inset 0 1px 0 0 #ffffff,0 0 0 1px #0000000f,0 1px 1px -.5px #0000000a,0 3px 3px -1.5px #0000000a,0 6px 6px -3px #0000000a,0 12px 12px -6px #0000000a;\n}\n.iso-svg{display:block;width:100%;height:auto;overflow:visible}\n.iso-svg path,.iso-svg circle{vector-effect:non-scaling-stroke}\n.iso-fill{fill:var(--anatomy-paper);stroke:none}\n.iso-solid[data-lit]>.iso-fill{fill:var(--anatomy-face)}\n.iso-shade,.iso-top{stroke:none}\n.iso-shade[data-shade=\"0\"]{fill:var(--anatomy-shade-0)}\n.iso-shade[data-shade=\"1\"]{fill:var(--anatomy-shade-1)}\n.iso-shade[data-shade=\"2\"]{fill:var(--anatomy-shade-2)}\n.iso-shade[data-shade=\"3\"]{fill:var(--anatomy-shade-3)}\n.iso-top{fill:var(--anatomy-top)}\n.iso-solid[data-lit]>.iso-top{fill:var(--anatomy-lit-top)}\n.iso-solid[data-lit]>.iso-shade{fill:var(--anatomy-lit-shade)}\n.iso-solid[data-seamless]>.iso-shade,.iso-solid[data-seamless]>.iso-top{stroke-width:.4;stroke-linejoin:round}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"0\"]{stroke:var(--anatomy-shade-0)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"1\"]{stroke:var(--anatomy-shade-1)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"2\"]{stroke:var(--anatomy-shade-2)}\n.iso-solid[data-seamless]>.iso-shade[data-shade=\"3\"]{stroke:var(--anatomy-shade-3)}\n.iso-solid[data-seamless]>.iso-top{stroke:var(--anatomy-top)}\n.iso-solid[data-seamless][data-lit]>.iso-top{stroke:var(--anatomy-lit-top)}\n.iso-solid[data-seamless][data-lit]>.iso-shade{stroke:var(--anatomy-lit-shade)}\n.iso-solid[data-lit]>.iso-edge{stroke:var(--anatomy-lit)}\n.iso-halo{fill:var(--anatomy-halo);stroke:none;filter:blur(9px);opacity:var(--anatomy-halo-opacity);transform:translateY(3px)}\n.iso-line{fill:none;stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round}\n.iso-line[data-tone=\"hi\"]{stroke:var(--anatomy-hi)}\n.iso-line[data-tone=\"mid\"]{stroke:var(--anatomy-mid)}\n.iso-line[data-tone=\"lo\"]{stroke:var(--anatomy-lo)}\n.iso-line[data-tone=\"faint\"]{stroke:var(--anatomy-faint)}\n.iso-line[data-tone=\"lit\"]{stroke:var(--anatomy-lit)}\n.iso-line[data-tone=\"red\"]{stroke:var(--anatomy-red)}\n.iso-line[data-tone=\"green\"]{stroke:var(--anatomy-green)}\n.iso-line[data-tone=\"blue\"]{stroke:var(--anatomy-blue)}\n.iso-line[data-dotted]{stroke-dasharray:.01 3.5;stroke-width:1}\n.iso-line[data-dashed]{stroke-dasharray:3 3}\n.iso-line[data-flow]{stroke-dasharray:2 6}\n.iso-wire-end{fill:var(--anatomy-paper);stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight)}\n.iso-wire[data-tone=\"hi\"] .iso-wire-end{stroke:var(--anatomy-hi)}\n.iso-wire[data-tone=\"mid\"] .iso-wire-end{stroke:var(--anatomy-mid)}\n.iso-wire[data-tone=\"faint\"] .iso-wire-end{stroke:var(--anatomy-faint)}\n.iso-wire[data-tone=\"lit\"] .iso-wire-end{stroke:var(--anatomy-lit)}\n.iso-dots circle{fill:var(--anatomy-dot);stroke:none;opacity:.32}\n.iso-dots[data-tone=\"hi\"] circle{opacity:.85}\n.iso-dots[data-tone=\"mid\"] circle{opacity:.45}\n.iso-dots[data-tone=\"lo\"] circle{opacity:.22}\n.iso-dots[data-tone=\"faint\"] circle{opacity:.12}\n.iso-face-text{fill:var(--anatomy-mid);font-family:var(--anatomy-mono);letter-spacing:.04em}\n.iso-face-text[data-tone=\"hi\"]{fill:var(--anatomy-hi)}\n.iso-face-text[data-tone=\"lo\"]{fill:var(--anatomy-lo)}\n.iso-face-text[data-tone=\"faint\"]{fill:var(--anatomy-faint)}\n.tb-body{fill:var(--anatomy-shade-2);stroke:none}\n.tb-shine{fill:var(--anatomy-top);stroke:none}\n.tb-shade{fill:var(--anatomy-shade-0);stroke:none}\n.tb-ring{fill:none;stroke:var(--anatomy-lo);stroke-width:.45;stroke-linecap:butt;stroke-linejoin:round}\n.tb-ring[data-tone=\"mid\"]{stroke:var(--anatomy-mid)}\n.tb-ring[data-tone=\"faint\"]{stroke:var(--anatomy-faint)}\n.tb-ring[data-tone=\"hi\"]{stroke:var(--anatomy-hi)}\n@keyframes iso-flow{to{stroke-dashoffset:-32}}\n@keyframes iso-pulse{0%,100%{opacity:.18}12%{opacity:1}40%{opacity:.18}}\n.iso-line[data-flow]{animation:iso-flow 1600ms linear infinite}\n.iso-dots circle[data-pulse]{animation:iso-pulse 1600ms steps(1,end) infinite;animation-delay:var(--pulse-at,0ms)}\n.iso-figure{margin:32px 0 36px}\n.iso-plate{position:relative;padding:52px 24px;border-radius:0;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid);--anatomy-paper:var(--anatomy-card)}\n.iso-plate-corners{position:absolute;inset:18px 20px;pointer-events:none}\n.iso-plate-corner{position:absolute;color:var(--anatomy-muted);font-family:var(--anatomy-mono);font-size:10.5px;line-height:1;letter-spacing:.04em;white-space:nowrap}\n.iso-plate-corner[data-corner=\"fig\"]{top:0;left:0;color:var(--anatomy-text)}\n.iso-plate-corner[data-corner=\"title\"]{top:0;right:0;text-transform:uppercase;letter-spacing:.1em}\n.iso-plate-corner[data-corner=\"hint\"]{bottom:0;left:0;text-transform:uppercase;letter-spacing:.1em}\n.iso-plate-corner[data-corner=\"readout\"]{right:0;bottom:0;color:var(--anatomy-text);font-variant-numeric:tabular-nums}\n.iso-plate .iso-svg{margin:0 auto}\n.iso-legend{display:grid;gap:8px;margin-top:12px;color:var(--anatomy-muted);font-size:13px;line-height:1.55}\n.iso-keys{display:flex;flex-wrap:wrap;gap:6px 18px}\n.iso-key{display:inline-flex;align-items:center;gap:7px}\n.iso-swatch{width:16px;height:10px;flex:none;overflow:visible}\n.iso-swatch path{fill:none;stroke:var(--anatomy-hi);stroke-width:1;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}\n.iso-swatch[data-mark=\"raised\"] path,.iso-swatch[data-mark=\"flat\"] path{stroke:var(--anatomy-mid)}\n.iso-swatch[data-mark=\"lit\"] path{stroke:var(--anatomy-lit)}\n.iso-swatch[data-mark=\"dim\"] path{stroke:var(--anatomy-lo)}\n.iso-swatch[data-mark=\"dotted\"] path{stroke-dasharray:.01 3;stroke-width:1.4}\n.iso-swatch[data-mark=\"dashed\"] path{stroke-dasharray:3 2.5}\n.iso-swatch[data-mark=\"red\"] path{stroke:var(--anatomy-red)}\n.iso-swatch[data-mark=\"green\"] path{stroke:var(--anatomy-green)}\n.iso-swatch[data-mark=\"blue\"] path{stroke:var(--anatomy-blue)}\n.iso-swatch-crease{stroke:var(--anatomy-lo)!important}\n@media (max-width:560px){.iso-plate{padding:48px 12px 70px}.iso-plate-corner[data-corner=\"hint\"]{bottom:18px}}\n@media (prefers-reduced-motion:reduce){.iso-line[data-flow],.iso-dots circle[data-pulse]{animation:none}}\n/*\n * Optimal theme for Anatomy figures.\n *\n * Load AFTER the kit's ISO_CSS. Put `class=\"iso optimal\"` on the wrapper:\n *   - no data-theme  -> \"Forest night\"  (exam-room TV, dark)\n *   - data-theme=\"light\" -> \"Cream\"     (beoptimal.ca, the primary target)\n *\n * Values come from the live site (beoptimal-landing src/index.css), the\n * Performance package design and the ALE visualizer spec. The kit's grey\n * ramps are warmed so solids sit on the site's cream paper, and the single\n * \"lit\" accent is Optimal forest green instead of pure black/white.\n */\n\n.iso.optimal {\n  /* Forest night (dark) */\n  --anatomy-page: #152511;\n  --anatomy-card: #1c3118;\n  --anatomy-text: #c9cdbf;\n  --anatomy-strong: #fffcf7;\n  --anatomy-muted: #8e9884;\n  --anatomy-paper: #1c3118;\n  --anatomy-face: #253821;\n  --anatomy-top: #283c24;\n  --anatomy-shade-0: #172812;\n  --anatomy-shade-1: #1a2c16;\n  --anatomy-shade-2: #1e321a;\n  --anatomy-shade-3: #22371e;\n  --anatomy-lit-top: #34492f;\n  --anatomy-lit-shade: #2a3f26;\n  --anatomy-hi: #e9e6dc;\n  --anatomy-mid: #7e8a74;\n  --anatomy-lo: #4d5c46;\n  --anatomy-faint: #33452e;\n  --anatomy-lit: #fffcf7;\n  --anatomy-halo: #0b1508;\n  --anatomy-halo-opacity: 0.9;\n  --anatomy-dot: #e9e6dc;\n  --anatomy-red: #e0745f;\n  --anatomy-green: #8cc67f;\n  --anatomy-blue: #7fa8d9;\n  --anatomy-mono: \"JetBrains Mono\", ui-monospace, \"SF Mono\", Menlo, Consolas, monospace;\n\n  /* Optimal extras (use sparingly; colour only when colour is the subject) */\n  --opt-display: \"Castoro\", Georgia, serif;\n  --opt-ui: \"Public Sans\", system-ui, sans-serif;\n  --opt-forest: #2c4e25;\n  --opt-forest-light: #519044;\n  --opt-sage: #5e7a59;\n  --opt-borderline: #c97b2d;\n  --opt-out: #b3402f;\n  --opt-heat: #ff9776;\n}\n\n.iso.optimal[data-theme=\"light\"] {\n  /* Cream (light) */\n  --anatomy-page: #fef8f1;\n  --anatomy-card: #fffcf7;\n  --anatomy-text: #3e3d39;\n  --anatomy-strong: #252525;\n  --anatomy-muted: #76736d;\n  --anatomy-paper: #fffcf7;\n  --anatomy-face: #fffefb;\n  --anatomy-top: #fffefb;\n  --anatomy-shade-0: #ddd7cc;\n  --anatomy-shade-1: #e7e2d9;\n  --anatomy-shade-2: #f0ede5;\n  --anatomy-shade-3: #f6f3ec;\n  --anatomy-lit-top: #fffefb;\n  --anatomy-lit-shade: #efebe2;\n  --anatomy-hi: #252525;\n  --anatomy-mid: #8a867e;\n  --anatomy-lo: #b9b4aa;\n  --anatomy-faint: #d9d3c8;\n  --anatomy-lit: #2c4e25;\n  --anatomy-halo: #8a8070;\n  --anatomy-halo-opacity: 0.3;\n  --anatomy-dot: #3a3833;\n  --anatomy-red: #b3402f;\n  --anatomy-green: #3f7a35;\n  --anatomy-blue: #3e6a8f;\n}\n\n/* Card typography: brand fonts for titles and readouts, kit mono for plate corners */\n.iso.optimal .iso-plate-title,\n.iso.optimal [data-role=\"title\"] {\n  font-family: var(--opt-display);\n  letter-spacing: -0.02em;\n}\n.iso.optimal [data-role=\"readout\"],\n.iso.optimal .iso-readout {\n  font-family: var(--opt-ui);\n  font-feature-settings: \"tnum\" 1, \"ss01\" 1;\n}\n\n/*\n * Card layout for Optimal figures (shared/page.mjs `plate`).\n * Phone first: the drawing, then a row of real buttons (>=44 px), then a footer\n * where the hint and the readout wrap instead of overlapping at 320 px.\n */\n.iso.optimal {\n  --opt-rule: rgba(233, 230, 220, 0.16);\n  --opt-btn: rgba(233, 230, 220, 0.06);\n  --opt-btn-on: #e9e6dc;\n  --opt-btn-on-text: #1c3118;\n  --opt-title: #fffcf7;\n  --opt-fig: #8cc67f;\n  --opt-heat-ink: #ff9776;\n  --opt-heat-glow: rgba(255, 151, 118, 0.55);\n  --opt-heat-wash: rgba(255, 151, 118, 0.16);\n  --opt-cold-ink: #9cc3e6;\n}\n.iso.optimal[data-theme=\"light\"] {\n  --opt-rule: rgba(44, 78, 37, 0.2);\n  --opt-btn: #fffcf7;\n  --opt-btn-on: #2c4e25;\n  --opt-btn-on-text: #fffcf7;\n  --opt-title: #2c4e25;\n  --opt-fig: #5e7a59;\n  --opt-heat-ink: #c8552e;\n  --opt-heat-glow: rgba(232, 108, 64, 0.42);\n  --opt-heat-wash: rgba(255, 151, 118, 0.22);\n  --opt-cold-ink: #3e6a8f;\n}\n.iso.optimal .opt-plate {\n  padding: 52px 24px 20px;\n  box-shadow: 0 0 0 1px var(--opt-rule);\n  border-radius: 2px;\n}\n.iso.optimal .iso-plate-corner[data-corner=\"fig\"] {\n  font-family: var(--opt-display);\n  font-style: italic;\n  font-size: 15px;\n  letter-spacing: 0;\n  color: var(--opt-fig);\n  top: -2px;\n}\n.iso.optimal .iso-plate-corner[data-corner=\"title\"] {\n  font-family: var(--opt-display);\n  font-size: 17px;\n  text-transform: none;\n  letter-spacing: -0.01em;\n  color: var(--opt-title);\n  top: -4px;\n}\n.iso.optimal .opt-controls {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: center;\n  gap: 8px 12px;\n  margin: 10px 0 0;\n}\n.iso.optimal .opt-seg {\n  display: inline-flex;\n  border-radius: 999px;\n  box-shadow: inset 0 0 0 1px var(--opt-rule);\n  padding: 3px;\n  gap: 2px;\n  max-width: 100%;\n}\n.iso.optimal .opt-seg-btn {\n  appearance: none;\n  border: 0;\n  margin: 0;\n  min-height: 44px;\n  min-width: min-content; /* never shrink a label below its longest word (with the padding, always ≥ 44 px) */\n  padding: 0 16px;\n  border-radius: 999px;\n  background: transparent;\n  color: var(--anatomy-text);\n  font: 500 14px/1.1 var(--opt-ui);\n  letter-spacing: 0;\n  cursor: pointer;\n  touch-action: manipulation;\n  -webkit-tap-highlight-color: transparent;\n  transition: background-color 240ms var(--anatomy-ease), color 240ms var(--anatomy-ease);\n}\n.iso.optimal .opt-seg-btn[aria-checked=\"true\"] {\n  background: var(--opt-btn-on);\n  color: var(--opt-btn-on-text);\n}\n.iso.optimal .opt-seg-btn:focus-visible {\n  outline: 2px solid var(--opt-fig);\n  outline-offset: 2px;\n}\n.iso.optimal .opt-foot {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: flex-end;\n  justify-content: space-between;\n  gap: 10px 20px;\n  margin-top: 16px;\n}\n.iso.optimal .opt-hint {\n  font-family: var(--anatomy-mono);\n  font-size: 10.5px;\n  line-height: 1.4;\n  letter-spacing: 0.1em;\n  text-transform: uppercase;\n  color: var(--anatomy-muted);\n  flex: 1 1 160px;\n  min-width: 0;\n}\n.iso.optimal .opt-readout {\n  display: grid;\n  grid-auto-flow: column;\n  gap: 4px 18px;\n  margin: 0;\n  font-family: var(--opt-ui);\n  font-feature-settings: \"tnum\" 1;\n}\n.iso.optimal .opt-stat { margin: 0; min-width: 0; }\n.iso.optimal .opt-stat dt {\n  font-size: 10px;\n  font-weight: 600;\n  letter-spacing: 0.12em;\n  text-transform: uppercase;\n  color: var(--anatomy-muted);\n  white-space: nowrap;\n}\n.iso.optimal .opt-stat dd {\n  margin: 1px 0 0;\n  font-size: 15px;\n  font-weight: 500;\n  color: var(--anatomy-strong);\n  white-space: nowrap;\n}\n.iso.optimal .iso-legend { font-family: var(--opt-ui); font-size: 13.5px; }\n.iso.optimal .iso-caption { color: var(--anatomy-text); }\n.iso.optimal .iso-caption em { font-style: italic; }\n.iso.optimal .iso-swatch[data-mark=\"heat\"] path { stroke: var(--opt-heat-ink); stroke-width: 2; }\n.iso.optimal .iso-stage { outline: none; border-radius: 4px; touch-action: pan-y; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; }\n.iso.optimal .iso-stage:focus-visible { outline: 1px solid var(--anatomy-muted); outline-offset: 6px; }\n@media (max-width: 560px) {\n  .iso.optimal .opt-plate { padding: 44px 10px 14px; }\n  .iso.optimal .iso-plate-corners { inset: 16px 12px; }\n  .iso.optimal .opt-readout { grid-auto-flow: row; grid-template-columns: repeat(4, minmax(0, auto)); width: 100%; justify-content: space-between; gap: 4px 10px; order: -1; }\n  .iso.optimal .opt-stat dd { font-size: 14px; }\n  /* a long label wraps onto two lines instead of running into its neighbour; values stay on one baseline */\n  .iso.optimal .opt-stat { display: flex; flex-direction: column; justify-content: space-between; }\n  .iso.optimal .opt-stat dt { white-space: normal; line-height: 1.25; }\n  .iso.optimal .opt-seg-btn { padding: 0 12px; font-size: 13.5px; }\n}\n@media (max-width: 350px) {\n  .iso.optimal .opt-seg-btn { padding: 0 7px; font-size: 12.5px; }\n  .iso.optimal .opt-stat dt { font-size: 9px; letter-spacing: 0.08em; }\n  .iso.optimal .opt-stat dd { font-size: 13px; }\n}\n\n:host{display:block}\n.opt-host{background:transparent;color:var(--anatomy-text);font:15px/1.6 var(--opt-ui);-webkit-font-smoothing:antialiased}\n.opt-host *{box-sizing:border-box}\n.opt-host .iso-figure{margin:0}\n/* A3 · fingertip skin in section: a cream epidermis with a pale horny layer, a rose dermis,\n   textbook red and blue vessels, glomus muscle in mauve, a golden nerve; warmth in amber. */\n.iso.optimal {\n  --a3-d0: #7a4a48; --a3-d1: #5a3436; --a3-edge: #d8a89a;\n  --a3-epi: #c99f88; --a3-epi-edge: #e7c3ad; --a3-corneum: #e8d2bd; --a3-kera: rgba(90, 50, 40, 0.28);\n  --a3-collagen: rgba(255, 220, 205, 0.12); --a3-fat: #c9b07a; --a3-fat-edge: #8f7a4c;\n  --a3-gland: #b8c0dc; --a3-duct: #b8c0dc;\n  --a3-art: #d0463a; --a3-ven: #5a5fa8; --a3-vessel-edge: #f0b0a0;\n  --a3-glomus: #9a7aa8; --a3-glomus-edge: #d9b8e0;\n  --a3-nerve: #e6c35a; --a3-spike: #fff2b0;\n  --a3-cell-art: #ff7d6b; --a3-cell-ven: #b2b8f0;\n  --a3-w0: rgba(255, 150, 70, 0.55); --a3-w1: rgba(255, 120, 60, 0.12); --a3-heat: #ffb070;\n  --a3-mon-bg: #0f1b0c; --a3-mon-ink: #c9e3c1; --a3-mon-dim: #33452e; --a3-curve: #ffb070; --a3-band: rgba(255, 176, 112, 0.14);\n}\n.iso.optimal[data-theme=\"light\"] {\n  --a3-d0: #f2c9bf; --a3-d1: #e2aa9d; --a3-edge: #8a5a4e;\n  --a3-epi: #f6dcc8; --a3-epi-edge: #b98a74; --a3-corneum: #fbeee0; --a3-kera: rgba(120, 70, 50, 0.25);\n  --a3-collagen: rgba(140, 70, 60, 0.16); --a3-fat: #f6e3a8; --a3-fat-edge: #b89a4c;\n  --a3-gland: #8f98c8; --a3-duct: #8f98c8;\n  --a3-art: #d0463a; --a3-ven: #5a5fa8; --a3-vessel-edge: #7a2a22;\n  --a3-glomus: #b48ec2; --a3-glomus-edge: #6e4a7a;\n  --a3-nerve: #c99a1c; --a3-spike: #7a5a00;\n  --a3-cell-art: #a8231a; --a3-cell-ven: #2e3480;\n  --a3-w0: rgba(255, 140, 50, 0.45); --a3-w1: rgba(255, 120, 60, 0.08); --a3-heat: #e07a2a;\n  --a3-mon-bg: #1d2a1a; --a3-mon-ink: #d9efd2; --a3-mon-dim: #3d5436; --a3-curve: #ffb070; --a3-band: rgba(255, 176, 112, 0.16);\n}\n.a3-d0 { stop-color: var(--a3-d0); } .a3-d1 { stop-color: var(--a3-d1); }\n.a3-w0 { stop-color: var(--a3-w0); } .a3-w1 { stop-color: var(--a3-w1); }\n.a3-svg .a3-mon path, .a3-svg .a3-mon rect, .a3-svg .a3-mon circle { vector-effect: non-scaling-stroke; }\n.a3-derm { stroke: none; }\n.a3-collagen { fill: none; stroke: var(--a3-collagen); stroke-width: 2.2; stroke-linecap: round; }\n.a3-fat { fill: var(--a3-fat); stroke: var(--a3-fat-edge); stroke-width: 1; opacity: 0.85; }\n.a3-gland { fill: var(--a3-gland); stroke: var(--a3-edge); stroke-width: 0.6; opacity: 0.85; }\n.a3-duct { fill: none; stroke: var(--a3-duct); stroke-width: 2.4; stroke-linecap: round; opacity: 0.85; }\n.a3-feed { fill: none; stroke: var(--a3-art); stroke-width: 3.2; stroke-linecap: round; }\n.a3-art { fill: var(--a3-art); stroke: var(--a3-vessel-edge); stroke-width: 1; }\n.a3-plex { stroke: var(--a3-vessel-edge); stroke-width: 1; }\n.a3-loop-up { fill: none; stroke: var(--a3-art); stroke-width: 2.2; stroke-linecap: round; }\n.a3-loop-dn { fill: none; stroke: var(--a3-ven); stroke-width: 2.2; stroke-linecap: round; }\n.a3-loop-cap { fill: none; stroke: color-mix(in srgb, var(--a3-art) 50%, var(--a3-ven)); stroke-width: 2.2; stroke-linecap: round; }\n.a3-glomus { fill: var(--a3-glomus); stroke: var(--a3-glomus-edge); stroke-width: 0.5; }\n.a3-ava-wall { fill: var(--a3-glomus); stroke: var(--a3-glomus-edge); stroke-width: 0.8; }\n.a3-ava { stroke: none; }\n.a3-nerve { fill: none; stroke: var(--a3-nerve); stroke-width: 2.6; stroke-linecap: round; stroke-dasharray: 7 2; }\n.a3-spike { fill: var(--a3-spike); }\n.a3-cells-art { fill: var(--a3-cell-art); }\n.a3-cells-ven { fill: var(--a3-cell-ven); }\n.a3-epi { fill: var(--a3-epi); stroke: var(--a3-epi-edge); stroke-width: 1; }\n.a3-kera { fill: var(--a3-kera); }\n.a3-corneum { fill: var(--a3-corneum); opacity: 0.95; }\n.a3-warmth { pointer-events: none; mix-blend-mode: normal; }\n.a3-surface { fill: none; stroke: var(--a3-edge); stroke-width: 1.4; }\n.a3-pores { fill: var(--a3-edge); }\n.a3-cut { fill: none; stroke: var(--a3-edge); stroke-width: 1.2; }\n.a3-heat { fill: none; stroke: var(--a3-heat); stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }\n.a3-mon-bg { fill: var(--a3-mon-bg); }\n.a3-mon-title { fill: var(--a3-mon-ink); font: 600 19px/1 var(--opt-ui); }\n.a3-mon-band { fill: var(--a3-curve); font: 600 15px/1 var(--opt-ui); opacity: 0.85; }\n.a3-open-band { fill: var(--a3-band); }\n.a3-grid { fill: none; stroke: var(--a3-mon-dim); stroke-width: 1; stroke-dasharray: 3 4; }\n.a3-axis { fill: none; stroke: var(--a3-mon-ink); stroke-width: 1; opacity: 0.45; }\n.a3-tick { fill: var(--a3-mon-ink); font: 500 17px/1 var(--opt-ui); opacity: 0.8; }\n.a3-curve { fill: none; stroke: var(--a3-curve); stroke-width: 2.6; stroke-linejoin: round; stroke-linecap: round; }\n.a3-curve-ghost { fill: none; stroke: var(--a3-curve); stroke-width: 1.3; stroke-dasharray: 3 4; opacity: 0.4; }\n.a3-dot { fill: var(--a3-curve); stroke: var(--a3-mon-bg); stroke-width: 2; }\n.iso.optimal .iso-swatch[data-mark=\"ava\"] path { stroke: var(--a3-glomus); stroke-width: 5; stroke-linecap: round; }\n.iso.optimal .iso-swatch[data-mark=\"artb\"] path { stroke: var(--a3-art); stroke-width: 5; stroke-linecap: round; }\n.iso.optimal .iso-swatch[data-mark=\"nerve\"] path { stroke: var(--a3-nerve); stroke-width: 3; stroke-dasharray: 4 1.5; }\n.a3-scene { margin: 10px 4px 0; font: 500 14px/1.45 var(--opt-ui); color: var(--anatomy-text); min-height: 4.4em; }\n.a3-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }\n.a3-par { display: block; margin-top: 6px; }\n.a3-par:first-child { margin-top: 0; }\n.a3-par small { font-size: 12.5px; color: var(--anatomy-muted); }\n/* A3 · the skin block: the section on the front face of an isometric cut-away. */\n.b3-top { fill: var(--a3-corneum); stroke: var(--a3-edge); stroke-width: 0.8; }\n.b3-ridge-lit { fill: var(--a3-corneum); }\n.b3-ridge-shade { fill: color-mix(in srgb, var(--a3-epi) 70%, var(--a3-corneum)); }\n.b3-ridge { stroke: color-mix(in srgb, var(--a3-edge) 45%, transparent); stroke-width: 0.5; }\n.b3-pores { fill: var(--a3-edge); opacity: 0.55; }\n.b3-side-derm { fill: color-mix(in srgb, var(--a3-d1) 82%, #000); }\n.b3-side-plex { fill: color-mix(in srgb, var(--a3-ven) 80%, #000); }\n.b3-side-art { fill: color-mix(in srgb, var(--a3-art) 82%, #000); }\n.b3-side-fat { fill: color-mix(in srgb, var(--a3-fat) 85%, #000); }\n.b3-side .a3-corneum, .b3-side .a3-epi { filter: brightness(0.86); }\n.b3-warm { fill: var(--a3-w0); pointer-events: none; }\n.b3-edge { fill: none; stroke: var(--a3-edge); stroke-width: 1.1; }\n.b3-shadow { fill: rgba(0, 0, 0, 0.12); filter: blur(6px); }\n" + "</style><div class=\"iso optimal opt-host\" data-theme=\"" + theme + "\">" + "<figure class=\"iso-figure opt-figure \"><div class=\"iso-plate opt-plate\"><div class=\"iso-plate-corners\" aria-hidden=\"true\"><span class=\"iso-plate-corner\" data-corner=\"fig\">A3</span><span class=\"iso-plate-corner\" data-corner=\"title\">The finger's heat valves</span></div><div class=\"iso-stage a3-stage\"><svg class=\"iso-svg a3-svg\" viewBox=\"0 0 600 630\" role=\"img\" aria-label=\"Fingertip skin in section. Under the ridged surface and the epidermis, small fingers of dermis hold capillary loops that drain into a network of veins. Below lies a small artery. Three coiled shunts, wrapped in muscle, connect the artery directly to the veins, and a nerve keeps them squeezed shut. During a hot flash the shunts open, warm blood floods the veins under the surface, and heat rises off the skin. A monitor shows the finger's skin temperature rising about 2.7 degrees within a minute and staying raised for half an hour.\">\n<defs>\n  <linearGradient id=\"a3-derm\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" class=\"a3-d0\"/><stop offset=\"1\" class=\"a3-d1\"/></linearGradient>\n  <linearGradient id=\"a3-warm\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" class=\"a3-w0\"/><stop offset=\"1\" class=\"a3-w1\"/></linearGradient>\n  <clipPath id=\"a3-skinclip\"><path d=\"M24 92.1L24.0 92.1L26.0 91.0L28.0 90.2L30.0 90.0L32.0 90.2L34.0 91.0L36.0 92.1L38.0 93.5L40.0 95.1L42.0 96.9L44.0 98.5L46.0 99.9L48.0 101.0L50.0 101.8L52.0 102.0L54.0 101.8L56.0 101.0L58.0 99.9L60.0 98.5L62.0 96.9L64.0 95.1L66.0 93.5L68.0 92.1L70.0 91.0L72.0 90.2L74.0 90.0L76.0 90.2L78.0 91.0L80.0 92.1L82.0 93.5L84.0 95.1L86.0 96.9L88.0 98.5L90.0 99.9L92.0 101.0L94.0 101.8L96.0 102.0L98.0 101.8L100.0 101.0L102.0 99.9L104.0 98.5L106.0 96.9L108.0 95.1L110.0 93.5L112.0 92.1L114.0 91.0L116.0 90.2L118.0 90.0L120.0 90.2L122.0 91.0L124.0 92.1L126.0 93.5L128.0 95.1L130.0 96.9L132.0 98.5L134.0 99.9L136.0 101.0L138.0 101.8L140.0 102.0L142.0 101.8L144.0 101.0L146.0 99.9L148.0 98.5L150.0 96.9L152.0 95.1L154.0 93.5L156.0 92.1L158.0 91.0L160.0 90.2L162.0 90.0L164.0 90.2L166.0 91.0L168.0 92.1L170.0 93.5L172.0 95.1L174.0 96.9L176.0 98.5L178.0 99.9L180.0 101.0L182.0 101.8L184.0 102.0L186.0 101.8L188.0 101.0L190.0 99.9L192.0 98.5L194.0 96.9L196.0 95.1L198.0 93.5L200.0 92.1L202.0 91.0L204.0 90.2L206.0 90.0L208.0 90.2L210.0 91.0L212.0 92.1L214.0 93.5L216.0 95.1L218.0 96.9L220.0 98.5L222.0 99.9L224.0 101.0L226.0 101.8L228.0 102.0L230.0 101.8L232.0 101.0L234.0 99.9L236.0 98.5L238.0 96.9L240.0 95.1L242.0 93.5L244.0 92.1L246.0 91.0L248.0 90.2L250.0 90.0L252.0 90.2L254.0 91.0L256.0 92.1L258.0 93.5L260.0 95.1L262.0 96.9L264.0 98.5L266.0 99.9L268.0 101.0L270.0 101.8L272.0 102.0L274.0 101.8L276.0 101.0L278.0 99.9L280.0 98.5L282.0 96.9L284.0 95.1L286.0 93.5L288.0 92.1L290.0 91.0L292.0 90.2L294.0 90.0L296.0 90.2L298.0 91.0L300.0 92.1L302.0 93.5L304.0 95.1L306.0 96.9L308.0 98.5L310.0 99.9L312.0 101.0L314.0 101.8L316.0 102.0L318.0 101.8L320.0 101.0L322.0 99.9L324.0 98.5L326.0 96.9L328.0 95.1L330.0 93.5L332.0 92.1L334.0 91.0L336.0 90.2L338.0 90.0L340.0 90.2L342.0 91.0L344.0 92.1L346.0 93.5L348.0 95.1L350.0 96.9L352.0 98.5L354.0 99.9L356.0 101.0L358.0 101.8L360.0 102.0L362.0 101.8L364.0 101.0L366.0 99.9L368.0 98.5L370.0 96.9L372.0 95.1L374.0 93.5L376.0 92.1L378.0 91.0L380.0 90.2L382.0 90.0L384.0 90.2L386.0 91.0L388.0 92.1L390.0 93.5L392.0 95.1L394.0 96.9L396.0 98.5L398.0 99.9L400.0 101.0L402.0 101.8L404.0 102.0L406.0 101.8L408.0 101.0L410.0 99.9L412.0 98.5L414.0 96.9L416.0 95.1L418.0 93.5L420.0 92.1L422.0 91.0L424.0 90.2L426.0 90.0L428.0 90.2L430.0 91.0L432.0 92.1L434.0 93.5L436.0 95.1L438.0 96.9L440.0 98.5L442.0 99.9L444.0 101.0L446.0 101.8L448.0 102.0L450.0 101.8L452.0 101.0L454.0 99.9L456.0 98.5L458.0 96.9L460.0 95.1L462.0 93.5L464.0 92.1L466.0 91.0L468.0 90.2L470.0 90.0L472.0 90.2L474.0 91.0L476.0 92.1L478.0 93.5L480.0 95.1L482.0 96.9L484.0 98.5L486.0 99.9L488.0 101.0L490.0 101.8L492.0 102.0L494.0 101.8L496.0 101.0L498.0 99.9L500.0 98.5L502.0 96.9L504.0 95.1L506.0 93.5L508.0 92.1L510.0 91.0L512.0 90.2L514.0 90.0L516.0 90.2L518.0 91.0L520.0 92.1L522.0 93.5L524.0 95.1L526.0 96.9L528.0 98.5L530.0 99.9L532.0 101.0L534.0 101.8L536.0 102.0L538.0 101.8L540.0 101.0L542.0 99.9L544.0 98.5L546.0 96.9L548.0 95.1L550.0 93.5L552.0 92.1L554.0 91.0L556.0 90.2L558.0 90.0L560.0 90.2L562.0 91.0L564.0 92.1L566.0 93.5L568.0 95.1L570.0 96.9L572.0 98.5L574.0 99.9L576.0 101.0L576 430L24 430Z\"/></clipPath>\n</defs>\n<path class=\"b3-shadow\" d=\"M139.1 309.6L530.3 394.2L460.7 447.4L69.5 362.8Z\"/><path class=\"b3-top\" d=\"M78.8 119L80.2 118.5L81.5 118.3L82.9 118.4L84.3 118.8L85.7 119.7L87 120.7L88.4 122.1L89.8 123.5L91.2 125.1L92.5 126.5L93.9 127.8L95.3 128.9L96.7 129.7L98.1 130.2L99.4 130.3L100.8 130.1L102.2 129.6L103.6 128.9L104.9 128L106.3 127.1L107.7 126.2L109.1 125.5L110.5 125L111.8 124.8L113.2 124.9L114.6 125.4L116 126.2L117.3 127.3L118.7 128.6L120.1 130.1L121.5 131.6L122.9 133.1L124.2 134.4L125.6 135.5L127 136.3L128.4 136.8L129.7 136.9L131.1 136.7L132.5 136.2L133.9 135.5L135.3 134.6L136.6 133.7L138 132.8L139.4 132.1L140.8 131.6L142.1 131.4L143.5 131.5L144.9 132L146.3 132.8L147.7 133.9L149 135.2L150.4 136.6L151.8 138.2L153.2 139.6L154.5 140.9L155.9 142L157.3 142.8L158.7 143.3L160 143.4L161.4 143.2L162.8 142.7L164.2 142L165.6 141.1L166.9 140.2L168.3 139.3L169.7 138.6L171.1 138.1L172.4 137.9L173.8 138L175.2 138.5L176.6 139.3L178 140.4L179.3 141.7L180.7 143.2L182.1 144.7L183.5 146.2L184.8 147.5L186.2 148.6L187.6 149.4L189 149.9L190.4 150L191.7 149.8L193.1 149.3L194.5 148.6L195.9 147.7L197.2 146.8L198.6 145.9L200 145.2L201.4 144.7L202.8 144.5L204.1 144.6L205.5 145.1L206.9 145.9L208.3 147L209.6 148.3L211 149.8L212.4 151.3L213.8 152.7L215.1 154.1L216.5 155.1L217.9 156L219.3 156.4L220.7 156.5L222 156.3L223.4 155.8L224.8 155.1L226.2 154.2L227.5 153.3L228.9 152.5L230.3 151.7L231.7 151.2L233.1 151L234.4 151.1L235.8 151.6L237.2 152.4L238.6 153.5L239.9 154.8L241.3 156.3L242.7 157.8L244.1 159.3L245.5 160.6L246.8 161.7L248.2 162.5L249.6 163L251 163.1L252.3 162.9L253.7 162.4L255.1 161.7L256.5 160.8L257.9 159.9L259.2 159L260.6 158.3L262 157.8L263.4 157.6L264.7 157.7L266.1 158.2L267.5 159L268.9 160.1L270.2 161.4L271.6 162.9L273 164.4L274.4 165.8L275.8 167.2L277.1 168.3L278.5 169.1L279.9 169.5L281.3 169.7L282.6 169.4L284 168.9L285.4 168.2L286.8 167.4L288.2 166.4L289.5 165.6L290.9 164.8L292.3 164.3L293.7 164.1L295 164.3L296.4 164.7L297.8 165.5L299.2 166.6L300.6 167.9L301.9 169.4L303.3 170.9L304.7 172.4L306.1 173.7L307.4 174.8L308.8 175.6L310.2 176.1L311.6 176.2L313 176L314.3 175.5L315.7 174.8L317.1 173.9L318.5 173L319.8 172.1L321.2 171.4L322.6 170.9L324 170.7L325.3 170.8L326.7 171.3L328.1 172.1L329.5 173.2L330.9 174.5L332.2 176L333.6 177.5L335 178.9L336.4 180.3L337.7 181.4L339.1 182.2L340.5 182.6L341.9 182.8L343.3 182.6L344.6 182.1L346 181.3L347.4 180.5L348.8 179.5L350.1 178.7L351.5 177.9L352.9 177.4L354.3 177.2L355.7 177.4L357 177.8L358.4 178.6L359.8 179.7L361.2 181.1L362.5 182.5L363.9 184L365.3 185.5L366.7 186.8L368.1 187.9L369.4 188.7L370.8 189.2L372.2 189.3L373.6 189.1L374.9 188.6L376.3 187.9L377.7 187L379.1 186.1L380.4 185.2L381.8 184.5L383.2 184L384.6 183.8L386 183.9L387.3 184.4L388.7 185.2L390.1 186.3L391.5 187.6L392.8 189.1L394.2 190.6L395.6 192.1L397 193.4L398.4 194.5L399.7 195.3L401.1 195.7L402.5 195.9L403.9 195.7L405.2 195.2L406.6 194.4L408 193.6L409.4 192.7L410.8 191.8L412.1 191.1L413.5 190.6L414.9 190.3L416.3 190.5L417.6 190.9L419 191.7L420.4 192.8L421.8 194.2L423.2 195.6L424.5 197.1L425.9 198.6L427.3 199.9L428.7 201L430 201.8L431.4 202.3L432.8 202.4L434.2 202.2L435.6 201.7L436.9 201L438.3 200.1L439.7 199.2L441.1 198.3L442.4 197.6L443.8 197.1L445.2 196.9L446.6 197L447.9 197.5L449.3 198.3L450.7 199.4L452.1 200.7L453.5 202.2L454.8 203.7L456.2 205.2L457.6 206.5L459 207.6L521.2 160L519.8 158.9L518.5 157.5L517.1 156.1L515.7 154.6L514.3 153.1L513 151.8L511.6 150.7L510.2 149.9L508.8 149.4L507.5 149.3L506.1 149.5L504.7 150L503.3 150.7L501.9 151.6L500.6 152.5L499.2 153.4L497.8 154.1L496.4 154.6L495.1 154.8L493.7 154.7L492.3 154.2L490.9 153.4L489.5 152.3L488.2 151L486.8 149.5L485.4 148L484 146.5L482.7 145.2L481.3 144.1L479.9 143.3L478.5 142.8L477.1 142.7L475.8 142.9L474.4 143.4L473 144.2L471.6 145L470.3 145.9L468.9 146.8L467.5 147.5L466.1 148L464.7 148.2L463.4 148.1L462 147.7L460.6 146.8L459.2 145.8L457.9 144.4L456.5 143L455.1 141.5L453.7 140L452.3 138.7L451 137.6L449.6 136.8L448.2 136.3L446.8 136.2L445.5 136.4L444.1 136.9L442.7 137.6L441.3 138.5L440 139.4L438.6 140.3L437.2 141L435.8 141.5L434.4 141.7L433.1 141.6L431.7 141.1L430.3 140.3L428.9 139.2L427.6 137.9L426.2 136.4L424.8 134.9L423.4 133.4L422 132.1L420.7 131L419.3 130.2L417.9 129.7L416.5 129.6L415.2 129.8L413.8 130.3L412.4 131L411 131.9L409.6 132.8L408.3 133.7L406.9 134.4L405.5 134.9L404.1 135.1L402.8 135L401.4 134.5L400 133.7L398.6 132.6L397.2 131.3L395.9 129.9L394.5 128.3L393.1 126.9L391.7 125.6L390.4 124.5L389 123.7L387.6 123.2L386.2 123.1L384.9 123.3L383.5 123.8L382.1 124.5L380.7 125.4L379.3 126.3L378 127.2L376.6 127.9L375.2 128.4L373.8 128.6L372.5 128.5L371.1 128L369.7 127.2L368.3 126.1L366.9 124.8L365.6 123.3L364.2 121.8L362.8 120.3L361.4 119L360.1 117.9L358.7 117.1L357.3 116.6L355.9 116.5L354.5 116.7L353.2 117.2L351.8 117.9L350.4 118.8L349 119.7L347.7 120.6L346.3 121.3L344.9 121.8L343.5 122L342.1 121.9L340.8 121.4L339.4 120.6L338 119.5L336.6 118.2L335.3 116.7L333.9 115.2L332.5 113.8L331.1 112.4L329.8 111.4L328.4 110.5L327 110.1L325.6 110L324.2 110.2L322.9 110.7L321.5 111.4L320.1 112.3L318.7 113.2L317.4 114L316 114.8L314.6 115.3L313.2 115.5L311.8 115.4L310.5 114.9L309.1 114.1L307.7 113L306.3 111.7L305 110.2L303.6 108.7L302.2 107.2L300.8 105.9L299.4 104.8L298.1 104L296.7 103.5L295.3 103.4L293.9 103.6L292.6 104.1L291.2 104.8L289.8 105.7L288.4 106.6L287 107.5L285.7 108.2L284.3 108.7L282.9 108.9L281.5 108.8L280.2 108.3L278.8 107.5L277.4 106.4L276 105.1L274.7 103.6L273.3 102.1L271.9 100.7L270.5 99.3L269.1 98.2L267.8 97.4L266.4 97L265 96.8L263.6 97.1L262.3 97.6L260.9 98.3L259.5 99.1L258.1 100.1L256.7 100.9L255.4 101.7L254 102.2L252.6 102.4L251.2 102.2L249.9 101.8L248.5 101L247.1 99.9L245.7 98.6L244.3 97.1L243 95.6L241.6 94.1L240.2 92.8L238.8 91.7L237.5 90.9L236.1 90.4L234.7 90.3L233.3 90.5L231.9 91L230.6 91.7L229.2 92.6L227.8 93.5L226.4 94.4L225.1 95.1L223.7 95.6L222.3 95.8L220.9 95.7L219.6 95.2L218.2 94.4L216.8 93.3L215.4 92L214 90.5L212.7 89L211.3 87.6L209.9 86.2L208.5 85.1L207.2 84.3L205.8 83.9L204.4 83.7L203 83.9L201.6 84.4L200.3 85.2L198.9 86L197.5 87L196.1 87.8L194.8 88.6L193.4 89.1L192 89.3L190.6 89.1L189.2 88.7L187.9 87.9L186.5 86.8L185.1 85.4L183.7 84L182.4 82.5L181 81L179.6 79.7L178.2 78.6L176.8 77.8L175.5 77.3L174.1 77.2L172.7 77.4L171.3 77.9L170 78.6L168.6 79.5L167.2 80.4L165.8 81.3L164.4 82L163.1 82.5L161.7 82.7L160.3 82.6L158.9 82.1L157.6 81.3L156.2 80.2L154.8 78.9L153.4 77.4L152.1 75.9L150.7 74.4L149.3 73.1L147.9 72L146.5 71.2L145.2 70.8L143.8 70.6L142.4 70.8L141 71.3Z\"/><path class=\"b3-ridge b3-ridge-shade\" d=\"M78.8 119L80.2 118.5L81.5 118.3L82.9 118.4L145.2 70.8L143.8 70.6L142.4 70.8L141 71.3Z\"/><path class=\"b3-ridge b3-ridge-lit\" d=\"M82.9 118.4L84.3 118.8L85.7 119.7L87 120.7L88.4 122.1L89.8 123.5L91.2 125.1L92.5 126.5L93.9 127.8L95.3 128.9L96.7 129.7L98.1 130.2L160.3 82.6L158.9 82.1L157.6 81.3L156.2 80.2L154.8 78.9L153.4 77.4L152.1 75.9L150.7 74.4L149.3 73.1L147.9 72L146.5 71.2L145.2 70.8Z\"/><path class=\"b3-ridge b3-ridge-shade\" d=\"M98.1 130.2L99.4 130.3L100.8 130.1L102.2 129.6L103.6 128.9L104.9 128L106.3 127.1L107.7 126.2L109.1 125.5L110.5 125L111.8 124.8L113.2 124.9L175.5 77.3L174.1 77.2L172.7 77.4L171.3 77.9L170 78.6L168.6 79.5L167.2 80.4L165.8 81.3L164.4 82L163.1 82.5L161.7 82.7L160.3 82.6Z\"/><path class=\"b3-ridge b3-ridge-lit\" d=\"M113.2 124.9L114.6 125.4L116 126.2L117.3 127.3L118.7 128.6L120.1 130.1L121.5 131.6L122.9 133.1L124.2 134.4L125.6 135.5L127 136.3L128.4 136.8L190.6 89.1L189.2 88.7L187.9 87.9L186.5 86.8L185.1 85.4L183.7 84L182.4 82.5L181 81L179.6 79.7L178.2 78.6L176.8 77.8L175.5 77.3Z\"/><path class=\"b3-ridge b3-ridge-shade\" d=\"M128.4 136.8L129.7 136.9L131.1 136.7L132.5 136.2L133.9 135.5L135.3 134.6L136.6 133.7L138 132.8L139.4 132.1L140.8 131.6L142.1 131.4L143.5 131.5L205.8 83.9L204.4 83.7L203 83.9L201.6 84.4L200.3 85.2L198.9 86L197.5 87L196.1 87.8L194.8 88.6L193.4 89.1L192 89.3L190.6 89.1Z\"/><path class=\"b3-ridge b3-ridge-lit\" d=\"M143.5 131.5L144.9 132L146.3 132.8L147.7 133.9L149 135.2L150.4 136.6L151.8 138.2L153.2 139.6L154.5 140.9L155.9 142L157.3 142.8L158.7 143.3L220.9 95.7L219.6 95.2L218.2 94.4L216.8 93.3L215.4 92L214 90.5L212.7 89L211.3 87.6L209.9 86.2L208.5 85.1L207.2 84.3L205.8 83.9Z\"/><path class=\"b3-ridge b3-ridge-shade\" d=\"M158.7 143.3L160 143.4L161.4 143.2L162.8 142.7L164.2 142L165.6 141.1L166.9 140.2L168.3 139.3L169.7 138.6L171.1 138.1L172.4 137.9L173.8 138L236.1 90.4L234.7 90.3L233.3 90.5L231.9 91L230.6 91.7L229.2 92.6L227.8 93.5L226.4 94.4L225.1 95.1L223.7 95.6L222.3 95.8L220.9 95.7Z\"/><path class=\"b3-ridge b3-ridge-lit\" d=\"M173.8 138L175.2 138.5L176.6 139.3L178 140.4L179.3 141.7L180.7 143.2L182.1 144.7L183.5 146.2L184.8 147.5L186.2 148.6L187.6 149.4L189 149.9L251.2 102.2L249.9 101.8L248.5 101L247.1 99.9L245.7 98.6L244.3 97.1L243 95.6L241.6 94.1L240.2 92.8L238.8 91.7L237.5 90.9L236.1 90.4Z\"/><path class=\"b3-ridge b3-ridge-shade\" d=\"M189 149.9L190.4 150L191.7 149.8L193.1 149.3L194.5 148.6L195.9 147.7L197.2 146.8L198.6 145.9L200 145.2L201.4 144.7L202.8 144.5L204.1 144.6L266.4 97L265 96.8L263.6 97.1L262.3 97.6L260.9 98.3L259.5 99.1L258.1 100.1L256.7 100.9L255.4 101.7L254 102.2L252.6 102.4L251.2 102.2Z\"/><path class=\"b3-ridge b3-ridge-lit\" d=\"M204.1 144.6L205.5 145.1L206.9 145.9L208.3 147L209.6 148.3L211 149.8L212.4 151.3L213.8 152.7L215.1 154.1L216.5 155.1L217.9 156L219.3 156.4L281.5 108.8L280.2 108.3L278.8 107.5L277.4 106.4L276 105.1L274.7 103.6L273.3 102.1L271.9 100.7L270.5 99.3L269.1 98.2L267.8 97.4L266.4 97Z\"/><path class=\"b3-ridge b3-ridge-shade\" d=\"M219.3 156.4L220.7 156.5L222 156.3L223.4 155.8L224.8 155.1L226.2 154.2L227.5 153.3L228.9 152.5L230.3 151.7L231.7 151.2L233.1 151L234.4 151.1L296.7 103.5L295.3 103.4L293.9 103.6L292.6 104.1L291.2 104.8L289.8 105.7L288.4 106.6L287 107.5L285.7 108.2L284.3 108.7L282.9 108.9L281.5 108.8Z\"/><path class=\"b3-ridge b3-ridge-lit\" d=\"M234.4 151.1L235.8 151.6L237.2 152.4L238.6 153.5L239.9 154.8L241.3 156.3L242.7 157.8L244.1 159.3L245.5 160.6L246.8 161.7L248.2 162.5L249.6 163L311.8 115.4L310.5 114.9L309.1 114.1L307.7 113L306.3 111.7L305 110.2L303.6 108.7L302.2 107.2L300.8 105.9L299.4 104.8L298.1 104L296.7 103.5Z\"/><path class=\"b3-ridge b3-ridge-shade\" d=\"M249.6 163L251 163.1L252.3 162.9L253.7 162.4L255.1 161.7L256.5 160.8L257.9 159.9L259.2 159L260.6 158.3L262 157.8L263.4 157.6L264.7 157.7L327 110.1L325.6 110L324.2 110.2L322.9 110.7L321.5 111.4L320.1 112.3L318.7 113.2L317.4 114L316 114.8L314.6 115.3L313.2 115.5L311.8 115.4Z\"/><path class=\"b3-ridge b3-ridge-lit\" d=\"M264.7 157.7L266.1 158.2L267.5 159L268.9 160.1L270.2 161.4L271.6 162.9L273 164.4L274.4 165.8L275.8 167.2L277.1 168.3L278.5 169.1L279.9 169.5L342.1 121.9L340.8 121.4L339.4 120.6L338 119.5L336.6 118.2L335.3 116.7L333.9 115.2L332.5 113.8L331.1 112.4L329.8 111.4L328.4 110.5L327 110.1Z\"/><path class=\"b3-ridge b3-ridge-shade\" d=\"M279.9 169.5L281.3 169.7L282.6 169.4L284 168.9L285.4 168.2L286.8 167.4L288.2 166.4L289.5 165.6L290.9 164.8L292.3 164.3L293.7 164.1L295 164.3L357.3 116.6L355.9 116.5L354.5 116.7L353.2 117.2L351.8 117.9L350.4 118.8L349 119.7L347.7 120.6L346.3 121.3L344.9 121.8L343.5 122L342.1 121.9Z\"/><path class=\"b3-ridge b3-ridge-lit\" d=\"M295 164.3L296.4 164.7L297.8 165.5L299.2 166.6L300.6 167.9L301.9 169.4L303.3 170.9L304.7 172.4L306.1 173.7L307.4 174.8L308.8 175.6L310.2 176.1L372.5 128.5L371.1 128L369.7 127.2L368.3 126.1L366.9 124.8L365.6 123.3L364.2 121.8L362.8 120.3L361.4 119L360.1 117.9L358.7 117.1L357.3 116.6Z\"/><path class=\"b3-ridge b3-ridge-shade\" d=\"M310.2 176.1L311.6 176.2L313 176L314.3 175.5L315.7 174.8L317.1 173.9L318.5 173L319.8 172.1L321.2 171.4L322.6 170.9L324 170.7L325.3 170.8L387.6 123.2L386.2 123.1L384.9 123.3L383.5 123.8L382.1 124.5L380.7 125.4L379.3 126.3L378 127.2L376.6 127.9L375.2 128.4L373.8 128.6L372.5 128.5Z\"/><path class=\"b3-ridge b3-ridge-lit\" d=\"M325.3 170.8L326.7 171.3L328.1 172.1L329.5 173.2L330.9 174.5L332.2 176L333.6 177.5L335 178.9L336.4 180.3L337.7 181.4L339.1 182.2L340.5 182.6L402.8 135L401.4 134.5L400 133.7L398.6 132.6L397.2 131.3L395.9 129.9L394.5 128.3L393.1 126.9L391.7 125.6L390.4 124.5L389 123.7L387.6 123.2Z\"/><path class=\"b3-ridge b3-ridge-shade\" d=\"M340.5 182.6L341.9 182.8L343.3 182.6L344.6 182.1L346 181.3L347.4 180.5L348.8 179.5L350.1 178.7L351.5 177.9L352.9 177.4L354.3 177.2L355.7 177.4L417.9 129.7L416.5 129.6L415.2 129.8L413.8 130.3L412.4 131L411 131.9L409.6 132.8L408.3 133.7L406.9 134.4L405.5 134.9L404.1 135.1L402.8 135Z\"/><path class=\"b3-ridge b3-ridge-lit\" d=\"M355.7 177.4L357 177.8L358.4 178.6L359.8 179.7L361.2 181.1L362.5 182.5L363.9 184L365.3 185.5L366.7 186.8L368.1 187.9L369.4 188.7L370.8 189.2L433.1 141.6L431.7 141.1L430.3 140.3L428.9 139.2L427.6 137.9L426.2 136.4L424.8 134.9L423.4 133.4L422 132.1L420.7 131L419.3 130.2L417.9 129.7Z\"/><path class=\"b3-ridge b3-ridge-shade\" d=\"M370.8 189.2L372.2 189.3L373.6 189.1L374.9 188.6L376.3 187.9L377.7 187L379.1 186.1L380.4 185.2L381.8 184.5L383.2 184L384.6 183.8L386 183.9L448.2 136.3L446.8 136.2L445.5 136.4L444.1 136.9L442.7 137.6L441.3 138.5L440 139.4L438.6 140.3L437.2 141L435.8 141.5L434.4 141.7L433.1 141.6Z\"/><path class=\"b3-ridge b3-ridge-lit\" d=\"M386 183.9L387.3 184.4L388.7 185.2L390.1 186.3L391.5 187.6L392.8 189.1L394.2 190.6L395.6 192.1L397 193.4L398.4 194.5L399.7 195.3L401.1 195.7L463.4 148.1L462 147.7L460.6 146.8L459.2 145.8L457.9 144.4L456.5 143L455.1 141.5L453.7 140L452.3 138.7L451 137.6L449.6 136.8L448.2 136.3Z\"/><path class=\"b3-ridge b3-ridge-shade\" d=\"M401.1 195.7L402.5 195.9L403.9 195.7L405.2 195.2L406.6 194.4L408 193.6L409.4 192.7L410.8 191.8L412.1 191.1L413.5 190.6L414.9 190.3L416.3 190.5L478.5 142.8L477.1 142.7L475.8 142.9L474.4 143.4L473 144.2L471.6 145L470.3 145.9L468.9 146.8L467.5 147.5L466.1 148L464.7 148.2L463.4 148.1Z\"/><path class=\"b3-ridge b3-ridge-lit\" d=\"M416.3 190.5L417.6 190.9L419 191.7L420.4 192.8L421.8 194.2L423.2 195.6L424.5 197.1L425.9 198.6L427.3 199.9L428.7 201L430 201.8L431.4 202.3L493.7 154.7L492.3 154.2L490.9 153.4L489.5 152.3L488.2 151L486.8 149.5L485.4 148L484 146.5L482.7 145.2L481.3 144.1L479.9 143.3L478.5 142.8Z\"/><path class=\"b3-ridge b3-ridge-shade\" d=\"M431.4 202.3L432.8 202.4L434.2 202.2L435.6 201.7L436.9 201L438.3 200.1L439.7 199.2L441.1 198.3L442.4 197.6L443.8 197.1L445.2 196.9L446.6 197L508.8 149.4L507.5 149.3L506.1 149.5L504.7 150L503.3 150.7L501.9 151.6L500.6 152.5L499.2 153.4L497.8 154.1L496.4 154.6L495.1 154.8L493.7 154.7Z\"/><path class=\"b3-ridge b3-ridge-lit\" d=\"M446.6 197L447.9 197.5L449.3 198.3L450.7 199.4L452.1 200.7L453.5 202.2L454.8 203.7L456.2 205.2L457.6 206.5L459 207.6L521.2 160L519.8 158.9L518.5 157.5L517.1 156.1L515.7 154.6L514.3 153.1L513 151.8L511.6 150.7L510.2 149.9L508.8 149.4Z\"/><path class=\"b3-pores\" d=\"M139.1 74.5L141 74.9L140.1 75.6L138.2 75.1ZM129.6 81.8L131.5 82.2L130.6 82.8L128.7 82.4ZM120 89L122 89.5L121.1 90.1L119.2 89.7ZM110.5 96.3L112.4 96.7L111.6 97.4L109.6 97ZM101 103.6L102.9 104L102 104.7L100.1 104.3ZM91.5 110.9L93.4 111.3L92.5 112L90.6 111.6ZM169.4 81L171.3 81.4L170.4 82.1L168.5 81.7ZM159.9 88.3L161.8 88.7L160.9 89.4L159 89ZM150.3 95.6L152.3 96L151.4 96.7L149.5 96.3ZM140.8 102.9L142.7 103.3L141.9 104L139.9 103.5ZM131.3 110.2L133.2 110.6L132.3 111.2L130.4 110.8ZM121.8 117.4L123.7 117.9L122.8 118.5L120.9 118.1ZM199.7 87.6L201.6 88L200.7 88.7L198.8 88.2ZM190.2 94.9L192.1 95.3L191.2 95.9L189.3 95.5ZM180.6 102.1L182.6 102.6L181.7 103.2L179.8 102.8ZM171.1 109.4L173 109.8L172.2 110.5L170.2 110.1ZM161.6 116.7L163.5 117.1L162.6 117.8L160.7 117.4ZM152.1 124L154 124.4L153.1 125.1L151.2 124.7ZM230 94.1L231.9 94.5L231 95.2L229.1 94.8ZM220.5 101.4L222.4 101.8L221.5 102.5L219.6 102.1ZM210.9 108.7L212.9 109.1L212 109.8L210.1 109.4ZM201.4 116L203.4 116.4L202.5 117.1L200.5 116.7ZM191.9 123.3L193.8 123.7L193 124.4L191 123.9ZM182.4 130.5L184.3 131L183.4 131.6L181.5 131.2ZM260.3 100.7L262.2 101.1L261.3 101.8L259.4 101.4ZM250.8 108L252.7 108.4L251.8 109.1L249.9 108.6ZM241.3 115.3L243.2 115.7L242.3 116.3L240.4 115.9ZM231.7 122.5L233.7 123L232.8 123.6L230.9 123.2ZM222.2 129.8L224.1 130.2L223.3 130.9L221.3 130.5ZM212.7 137.1L214.6 137.5L213.7 138.2L211.8 137.8ZM290.6 107.2L292.5 107.7L291.6 108.3L289.7 107.9ZM281.1 114.5L283 114.9L282.1 115.6L280.2 115.2ZM271.6 121.8L273.5 122.2L272.6 122.9L270.7 122.5ZM262 129.1L264 129.5L263.1 130.2L261.2 129.8ZM252.5 136.4L254.4 136.8L253.6 137.5L251.6 137ZM243 143.7L244.9 144.1L244 144.7L242.1 144.3ZM320.9 113.8L322.8 114.2L322 114.9L320 114.5ZM311.4 121.1L313.3 121.5L312.4 122.2L310.5 121.7ZM301.9 128.4L303.8 128.8L302.9 129.4L301 129ZM292.3 135.6L294.3 136.1L293.4 136.7L291.5 136.3ZM282.8 142.9L284.7 143.3L283.9 144L281.9 143.6ZM273.3 150.2L275.2 150.6L274.3 151.3L272.4 150.9ZM351.2 120.3L353.1 120.8L352.3 121.4L350.3 121ZM341.7 127.6L343.6 128L342.7 128.7L340.8 128.3ZM332.2 134.9L334.1 135.3L333.2 136L331.3 135.6ZM322.6 142.2L324.6 142.6L323.7 143.3L321.8 142.9ZM313.1 149.5L315.1 149.9L314.2 150.6L312.2 150.2ZM303.6 156.8L305.5 157.2L304.7 157.9L302.7 157.4ZM381.5 126.9L383.4 127.3L382.6 128L380.6 127.6ZM372 134.2L373.9 134.6L373 135.3L371.1 134.9ZM362.5 141.5L364.4 141.9L363.5 142.6L361.6 142.1ZM353 148.8L354.9 149.2L354 149.8L352.1 149.4ZM343.4 156L345.4 156.5L344.5 157.1L342.5 156.7ZM333.9 163.3L335.8 163.7L335 164.4L333 164ZM411.8 133.5L413.7 133.9L412.9 134.5L410.9 134.1ZM402.3 140.7L404.2 141.2L403.3 141.8L401.4 141.4ZM392.8 148L394.7 148.4L393.8 149.1L391.9 148.7ZM383.3 155.3L385.2 155.7L384.3 156.4L382.4 156ZM373.7 162.6L375.7 163L374.8 163.7L372.9 163.3ZM364.2 169.9L366.1 170.3L365.3 171L363.3 170.5ZM442.1 140L444.1 140.4L443.2 141.1L441.2 140.7ZM432.6 147.3L434.5 147.7L433.7 148.4L431.7 148ZM423.1 154.6L425 155L424.1 155.7L422.2 155.2ZM413.6 161.9L415.5 162.3L414.6 162.9L412.7 162.5ZM404 169.1L406 169.6L405.1 170.2L403.2 169.8ZM394.5 176.4L396.4 176.8L395.6 177.5L393.6 177.1ZM472.4 146.6L474.4 147L473.5 147.7L471.6 147.2ZM462.9 153.8L464.8 154.3L464 154.9L462 154.5ZM453.4 161.1L455.3 161.5L454.4 162.2L452.5 161.8ZM443.9 168.4L445.8 168.8L444.9 169.5L443 169.1ZM434.3 175.7L436.3 176.1L435.4 176.8L433.5 176.4ZM424.8 183L426.8 183.4L425.9 184.1L423.9 183.7ZM502.7 153.1L504.7 153.5L503.8 154.2L501.9 153.8ZM493.2 160.4L495.1 160.8L494.3 161.5L492.3 161.1ZM483.7 167.7L485.6 168.1L484.7 168.8L482.8 168.4ZM474.2 175L476.1 175.4L475.2 176.1L473.3 175.6ZM464.6 182.3L466.6 182.7L465.7 183.3L463.8 182.9ZM455.1 189.5L457.1 190L456.2 190.6L454.2 190.2Z\"/><path data-part=\"topwarm\" class=\"b3-warm\" opacity=\"0\" d=\"M78.8 119L80.2 118.5L81.5 118.3L82.9 118.4L84.3 118.8L85.7 119.7L87 120.7L88.4 122.1L89.8 123.5L91.2 125.1L92.5 126.5L93.9 127.8L95.3 128.9L96.7 129.7L98.1 130.2L99.4 130.3L100.8 130.1L102.2 129.6L103.6 128.9L104.9 128L106.3 127.1L107.7 126.2L109.1 125.5L110.5 125L111.8 124.8L113.2 124.9L114.6 125.4L116 126.2L117.3 127.3L118.7 128.6L120.1 130.1L121.5 131.6L122.9 133.1L124.2 134.4L125.6 135.5L127 136.3L128.4 136.8L129.7 136.9L131.1 136.7L132.5 136.2L133.9 135.5L135.3 134.6L136.6 133.7L138 132.8L139.4 132.1L140.8 131.6L142.1 131.4L143.5 131.5L144.9 132L146.3 132.8L147.7 133.9L149 135.2L150.4 136.6L151.8 138.2L153.2 139.6L154.5 140.9L155.9 142L157.3 142.8L158.7 143.3L160 143.4L161.4 143.2L162.8 142.7L164.2 142L165.6 141.1L166.9 140.2L168.3 139.3L169.7 138.6L171.1 138.1L172.4 137.9L173.8 138L175.2 138.5L176.6 139.3L178 140.4L179.3 141.7L180.7 143.2L182.1 144.7L183.5 146.2L184.8 147.5L186.2 148.6L187.6 149.4L189 149.9L190.4 150L191.7 149.8L193.1 149.3L194.5 148.6L195.9 147.7L197.2 146.8L198.6 145.9L200 145.2L201.4 144.7L202.8 144.5L204.1 144.6L205.5 145.1L206.9 145.9L208.3 147L209.6 148.3L211 149.8L212.4 151.3L213.8 152.7L215.1 154.1L216.5 155.1L217.9 156L219.3 156.4L220.7 156.5L222 156.3L223.4 155.8L224.8 155.1L226.2 154.2L227.5 153.3L228.9 152.5L230.3 151.7L231.7 151.2L233.1 151L234.4 151.1L235.8 151.6L237.2 152.4L238.6 153.5L239.9 154.8L241.3 156.3L242.7 157.8L244.1 159.3L245.5 160.6L246.8 161.7L248.2 162.5L249.6 163L251 163.1L252.3 162.9L253.7 162.4L255.1 161.7L256.5 160.8L257.9 159.9L259.2 159L260.6 158.3L262 157.8L263.4 157.6L264.7 157.7L266.1 158.2L267.5 159L268.9 160.1L270.2 161.4L271.6 162.9L273 164.4L274.4 165.8L275.8 167.2L277.1 168.3L278.5 169.1L279.9 169.5L281.3 169.7L282.6 169.4L284 168.9L285.4 168.2L286.8 167.4L288.2 166.4L289.5 165.6L290.9 164.8L292.3 164.3L293.7 164.1L295 164.3L296.4 164.7L297.8 165.5L299.2 166.6L300.6 167.9L301.9 169.4L303.3 170.9L304.7 172.4L306.1 173.7L307.4 174.8L308.8 175.6L310.2 176.1L311.6 176.2L313 176L314.3 175.5L315.7 174.8L317.1 173.9L318.5 173L319.8 172.1L321.2 171.4L322.6 170.9L324 170.7L325.3 170.8L326.7 171.3L328.1 172.1L329.5 173.2L330.9 174.5L332.2 176L333.6 177.5L335 178.9L336.4 180.3L337.7 181.4L339.1 182.2L340.5 182.6L341.9 182.8L343.3 182.6L344.6 182.1L346 181.3L347.4 180.5L348.8 179.5L350.1 178.7L351.5 177.9L352.9 177.4L354.3 177.2L355.7 177.4L357 177.8L358.4 178.6L359.8 179.7L361.2 181.1L362.5 182.5L363.9 184L365.3 185.5L366.7 186.8L368.1 187.9L369.4 188.7L370.8 189.2L372.2 189.3L373.6 189.1L374.9 188.6L376.3 187.9L377.7 187L379.1 186.1L380.4 185.2L381.8 184.5L383.2 184L384.6 183.8L386 183.9L387.3 184.4L388.7 185.2L390.1 186.3L391.5 187.6L392.8 189.1L394.2 190.6L395.6 192.1L397 193.4L398.4 194.5L399.7 195.3L401.1 195.7L402.5 195.9L403.9 195.7L405.2 195.2L406.6 194.4L408 193.6L409.4 192.7L410.8 191.8L412.1 191.1L413.5 190.6L414.9 190.3L416.3 190.5L417.6 190.9L419 191.7L420.4 192.8L421.8 194.2L423.2 195.6L424.5 197.1L425.9 198.6L427.3 199.9L428.7 201L430 201.8L431.4 202.3L432.8 202.4L434.2 202.2L435.6 201.7L436.9 201L438.3 200.1L439.7 199.2L441.1 198.3L442.4 197.6L443.8 197.1L445.2 196.9L446.6 197L447.9 197.5L449.3 198.3L450.7 199.4L452.1 200.7L453.5 202.2L454.8 203.7L456.2 205.2L457.6 206.5L459 207.6L521.2 160L519.8 158.9L518.5 157.5L517.1 156.1L515.7 154.6L514.3 153.1L513 151.8L511.6 150.7L510.2 149.9L508.8 149.4L507.5 149.3L506.1 149.5L504.7 150L503.3 150.7L501.9 151.6L500.6 152.5L499.2 153.4L497.8 154.1L496.4 154.6L495.1 154.8L493.7 154.7L492.3 154.2L490.9 153.4L489.5 152.3L488.2 151L486.8 149.5L485.4 148L484 146.5L482.7 145.2L481.3 144.1L479.9 143.3L478.5 142.8L477.1 142.7L475.8 142.9L474.4 143.4L473 144.2L471.6 145L470.3 145.9L468.9 146.8L467.5 147.5L466.1 148L464.7 148.2L463.4 148.1L462 147.7L460.6 146.8L459.2 145.8L457.9 144.4L456.5 143L455.1 141.5L453.7 140L452.3 138.7L451 137.6L449.6 136.8L448.2 136.3L446.8 136.2L445.5 136.4L444.1 136.9L442.7 137.6L441.3 138.5L440 139.4L438.6 140.3L437.2 141L435.8 141.5L434.4 141.7L433.1 141.6L431.7 141.1L430.3 140.3L428.9 139.2L427.6 137.9L426.2 136.4L424.8 134.9L423.4 133.4L422 132.1L420.7 131L419.3 130.2L417.9 129.7L416.5 129.6L415.2 129.8L413.8 130.3L412.4 131L411 131.9L409.6 132.8L408.3 133.7L406.9 134.4L405.5 134.9L404.1 135.1L402.8 135L401.4 134.5L400 133.7L398.6 132.6L397.2 131.3L395.9 129.9L394.5 128.3L393.1 126.9L391.7 125.6L390.4 124.5L389 123.7L387.6 123.2L386.2 123.1L384.9 123.3L383.5 123.8L382.1 124.5L380.7 125.4L379.3 126.3L378 127.2L376.6 127.9L375.2 128.4L373.8 128.6L372.5 128.5L371.1 128L369.7 127.2L368.3 126.1L366.9 124.8L365.6 123.3L364.2 121.8L362.8 120.3L361.4 119L360.1 117.9L358.7 117.1L357.3 116.6L355.9 116.5L354.5 116.7L353.2 117.2L351.8 117.9L350.4 118.8L349 119.7L347.7 120.6L346.3 121.3L344.9 121.8L343.5 122L342.1 121.9L340.8 121.4L339.4 120.6L338 119.5L336.6 118.2L335.3 116.7L333.9 115.2L332.5 113.8L331.1 112.4L329.8 111.4L328.4 110.5L327 110.1L325.6 110L324.2 110.2L322.9 110.7L321.5 111.4L320.1 112.3L318.7 113.2L317.4 114L316 114.8L314.6 115.3L313.2 115.5L311.8 115.4L310.5 114.9L309.1 114.1L307.7 113L306.3 111.7L305 110.2L303.6 108.7L302.2 107.2L300.8 105.9L299.4 104.8L298.1 104L296.7 103.5L295.3 103.4L293.9 103.6L292.6 104.1L291.2 104.8L289.8 105.7L288.4 106.6L287 107.5L285.7 108.2L284.3 108.7L282.9 108.9L281.5 108.8L280.2 108.3L278.8 107.5L277.4 106.4L276 105.1L274.7 103.6L273.3 102.1L271.9 100.7L270.5 99.3L269.1 98.2L267.8 97.4L266.4 97L265 96.8L263.6 97.1L262.3 97.6L260.9 98.3L259.5 99.1L258.1 100.1L256.7 100.9L255.4 101.7L254 102.2L252.6 102.4L251.2 102.2L249.9 101.8L248.5 101L247.1 99.9L245.7 98.6L244.3 97.1L243 95.6L241.6 94.1L240.2 92.8L238.8 91.7L237.5 90.9L236.1 90.4L234.7 90.3L233.3 90.5L231.9 91L230.6 91.7L229.2 92.6L227.8 93.5L226.4 94.4L225.1 95.1L223.7 95.6L222.3 95.8L220.9 95.7L219.6 95.2L218.2 94.4L216.8 93.3L215.4 92L214 90.5L212.7 89L211.3 87.6L209.9 86.2L208.5 85.1L207.2 84.3L205.8 83.9L204.4 83.7L203 83.9L201.6 84.4L200.3 85.2L198.9 86L197.5 87L196.1 87.8L194.8 88.6L193.4 89.1L192 89.3L190.6 89.1L189.2 88.7L187.9 87.9L186.5 86.8L185.1 85.4L183.7 84L182.4 82.5L181 81L179.6 79.7L178.2 78.6L176.8 77.8L175.5 77.3L174.1 77.2L172.7 77.4L171.3 77.9L170 78.6L168.6 79.5L167.2 80.4L165.8 81.3L164.4 82L163.1 82.5L161.7 82.7L160.3 82.6L158.9 82.1L157.6 81.3L156.2 80.2L154.8 78.9L153.4 77.4L152.1 75.9L150.7 74.4L149.3 73.1L147.9 72L146.5 71.2L145.2 70.8L143.8 70.6L142.4 70.8L141 71.3Z\"/><g class=\"b3-side\"><path class=\"b3-side-derm\" d=\"M521.2 160L459 207.6L459 442L521.2 394.4Z\"/><path class=\"a3-corneum\" d=\"M521.2 160L459 207.6L459 214L521.2 166.4Z\"/><path class=\"a3-epi\" d=\"M521.2 166.4L459 214L459 229.6L521.2 182Z\"/><path class=\"b3-side-plex\" d=\"M521.2 209.8L459 257.4L459 264.6L521.2 216.9Z\"/><path class=\"b3-side-art\" d=\"M521.2 305.7L459 353.3L459 362.5L521.2 314.9Z\"/><path class=\"b3-side-fat\" d=\"M521.2 371.6L459 419.2L459 442L521.2 394.4Z\"/><path data-part=\"sidewarm\" class=\"b3-warm\" opacity=\"0\" d=\"M521.2 160L459 207.6L459 442L521.2 394.4Z\"/></g><path class=\"b3-edge\" d=\"M521.2 160L521.2 394.4L459 442\"/><g class=\"b3-front\" transform=\"matrix(0.6888 0.1490 0.0000 0.7126 62.24 49.77)\"><path data-part=\"heat\" class=\"a3-heat\"/>\n<path class=\"a3-derm\" d=\"M24 92.1L24.0 92.1L26.0 91.0L28.0 90.2L30.0 90.0L32.0 90.2L34.0 91.0L36.0 92.1L38.0 93.5L40.0 95.1L42.0 96.9L44.0 98.5L46.0 99.9L48.0 101.0L50.0 101.8L52.0 102.0L54.0 101.8L56.0 101.0L58.0 99.9L60.0 98.5L62.0 96.9L64.0 95.1L66.0 93.5L68.0 92.1L70.0 91.0L72.0 90.2L74.0 90.0L76.0 90.2L78.0 91.0L80.0 92.1L82.0 93.5L84.0 95.1L86.0 96.9L88.0 98.5L90.0 99.9L92.0 101.0L94.0 101.8L96.0 102.0L98.0 101.8L100.0 101.0L102.0 99.9L104.0 98.5L106.0 96.9L108.0 95.1L110.0 93.5L112.0 92.1L114.0 91.0L116.0 90.2L118.0 90.0L120.0 90.2L122.0 91.0L124.0 92.1L126.0 93.5L128.0 95.1L130.0 96.9L132.0 98.5L134.0 99.9L136.0 101.0L138.0 101.8L140.0 102.0L142.0 101.8L144.0 101.0L146.0 99.9L148.0 98.5L150.0 96.9L152.0 95.1L154.0 93.5L156.0 92.1L158.0 91.0L160.0 90.2L162.0 90.0L164.0 90.2L166.0 91.0L168.0 92.1L170.0 93.5L172.0 95.1L174.0 96.9L176.0 98.5L178.0 99.9L180.0 101.0L182.0 101.8L184.0 102.0L186.0 101.8L188.0 101.0L190.0 99.9L192.0 98.5L194.0 96.9L196.0 95.1L198.0 93.5L200.0 92.1L202.0 91.0L204.0 90.2L206.0 90.0L208.0 90.2L210.0 91.0L212.0 92.1L214.0 93.5L216.0 95.1L218.0 96.9L220.0 98.5L222.0 99.9L224.0 101.0L226.0 101.8L228.0 102.0L230.0 101.8L232.0 101.0L234.0 99.9L236.0 98.5L238.0 96.9L240.0 95.1L242.0 93.5L244.0 92.1L246.0 91.0L248.0 90.2L250.0 90.0L252.0 90.2L254.0 91.0L256.0 92.1L258.0 93.5L260.0 95.1L262.0 96.9L264.0 98.5L266.0 99.9L268.0 101.0L270.0 101.8L272.0 102.0L274.0 101.8L276.0 101.0L278.0 99.9L280.0 98.5L282.0 96.9L284.0 95.1L286.0 93.5L288.0 92.1L290.0 91.0L292.0 90.2L294.0 90.0L296.0 90.2L298.0 91.0L300.0 92.1L302.0 93.5L304.0 95.1L306.0 96.9L308.0 98.5L310.0 99.9L312.0 101.0L314.0 101.8L316.0 102.0L318.0 101.8L320.0 101.0L322.0 99.9L324.0 98.5L326.0 96.9L328.0 95.1L330.0 93.5L332.0 92.1L334.0 91.0L336.0 90.2L338.0 90.0L340.0 90.2L342.0 91.0L344.0 92.1L346.0 93.5L348.0 95.1L350.0 96.9L352.0 98.5L354.0 99.9L356.0 101.0L358.0 101.8L360.0 102.0L362.0 101.8L364.0 101.0L366.0 99.9L368.0 98.5L370.0 96.9L372.0 95.1L374.0 93.5L376.0 92.1L378.0 91.0L380.0 90.2L382.0 90.0L384.0 90.2L386.0 91.0L388.0 92.1L390.0 93.5L392.0 95.1L394.0 96.9L396.0 98.5L398.0 99.9L400.0 101.0L402.0 101.8L404.0 102.0L406.0 101.8L408.0 101.0L410.0 99.9L412.0 98.5L414.0 96.9L416.0 95.1L418.0 93.5L420.0 92.1L422.0 91.0L424.0 90.2L426.0 90.0L428.0 90.2L430.0 91.0L432.0 92.1L434.0 93.5L436.0 95.1L438.0 96.9L440.0 98.5L442.0 99.9L444.0 101.0L446.0 101.8L448.0 102.0L450.0 101.8L452.0 101.0L454.0 99.9L456.0 98.5L458.0 96.9L460.0 95.1L462.0 93.5L464.0 92.1L466.0 91.0L468.0 90.2L470.0 90.0L472.0 90.2L474.0 91.0L476.0 92.1L478.0 93.5L480.0 95.1L482.0 96.9L484.0 98.5L486.0 99.9L488.0 101.0L490.0 101.8L492.0 102.0L494.0 101.8L496.0 101.0L498.0 99.9L500.0 98.5L502.0 96.9L504.0 95.1L506.0 93.5L508.0 92.1L510.0 91.0L512.0 90.2L514.0 90.0L516.0 90.2L518.0 91.0L520.0 92.1L522.0 93.5L524.0 95.1L526.0 96.9L528.0 98.5L530.0 99.9L532.0 101.0L534.0 101.8L536.0 102.0L538.0 101.8L540.0 101.0L542.0 99.9L544.0 98.5L546.0 96.9L548.0 95.1L550.0 93.5L552.0 92.1L554.0 91.0L556.0 90.2L558.0 90.0L560.0 90.2L562.0 91.0L564.0 92.1L566.0 93.5L568.0 95.1L570.0 96.9L572.0 98.5L574.0 99.9L576.0 101.0L576 430L24 430Z\" fill=\"url(#a3-derm)\"/>\n<g clip-path=\"url(#a3-skinclip)\">\n  <path class=\"a3-collagen\" d=\"M50.5 271.8q8.9 -3.3 17.8 -3.8M573.3 364.5q15.2 2.1 30.4 6.2M282.3 333.7q10.0 -2.7 20.0 -0.6M340.6 332.9q6.8 1.2 13.7 -4.9M526.2 306.7q9.8 -0.5 19.5 3.1M116.9 314.2q9.0 -2.5 17.9 -4.2M512.0 344.1q9.8 -5.3 19.6 3.9M561.9 348.9q7.7 1.2 15.4 -0.6M340.3 309.2q8.3 -2.1 16.5 -3.4M502.5 243.5q7.1 4.0 14.2 -1.3M111.0 217.4q10.9 4.9 21.9 -4.7M458.8 323.4q13.9 -2.2 27.8 9.0M100.8 333.2q8.8 -3.3 17.5 -6.0M564.8 336.9q12.8 0.3 25.6 -3.2M204.3 227.7q9.2 4.9 18.5 5.4M76.2 311.4q13.8 1.4 27.5 9.5M241.5 309.8q8.2 -3.9 16.5 5.4M189.3 319.9q13.5 2.1 26.9 -5.4M201.0 313.3q8.9 1.1 17.7 -1.9M235.6 340.2q7.7 -3.8 15.4 0.9M472.6 322.3q13.1 -4.9 26.1 2.4M382.5 255.7q13.1 5.8 26.2 -5.3M371.9 240.6q15.8 3.8 31.6 -1.5M123.4 198.3q8.4 -1.7 16.9 -4.6M552.7 263.7q12.1 -6.0 24.2 -2.8M233.9 223.3q14.7 -4.1 29.3 -4.7M441.8 248.3q9.5 4.6 18.9 4.8M189.5 333.2q8.9 4.6 17.8 -1.3M277.4 288.4q14.9 -4.0 29.8 10.0M275.0 278.9q11.0 -3.9 22.0 5.4M268.5 199.0q10.2 2.8 20.5 -1.3M146.3 341.6q12.7 3.7 25.4 -2.0M181.7 212.5q14.4 -3.0 28.8 -9.7M465.8 235.3q12.7 1.7 25.5 6.7M92.0 292.8q11.6 1.6 23.2 -3.6M350.8 293.9q10.4 5.2 20.9 -2.3M552.5 225.5q12.3 1.7 24.6 -5.0M156.7 197.2q7.9 0.3 15.8 -2.9M542.8 348.9q11.9 -2.0 23.8 6.8M523.5 339.6q10.9 4.1 21.8 4.4M89.4 263.8q10.3 4.8 20.6 -7.1M415.5 231.4q8.5 5.5 17.1 -0.0M159.4 274.1q14.5 2.0 29.1 -3.6M226.0 384.8q12.3 3.9 24.6 4.4M93.3 360.5q8.1 -4.0 16.3 -5.1M380.9 296.7q10.6 5.6 21.2 -2.5\"/>\n  <path class=\"a3-fat\" d=\"M62.1 414.0C62.2 417.4 58.5 422.7 54.5 424.7C50.5 426.6 43.1 426.6 38.0 425.8C33.0 425.0 26.2 422.7 24.2 419.9C22.1 417.0 23.6 411.9 25.8 408.7C28.0 405.4 32.8 401.1 37.4 400.4C42.1 399.6 49.3 402.0 53.4 404.2C57.5 406.5 61.9 410.6 62.1 414.0ZM93.7 414.0C93.6 417.3 91.5 421.3 88.0 423.4C84.5 425.5 77.3 427.2 72.8 426.6C68.3 425.9 62.7 422.2 60.9 419.3C59.1 416.4 59.8 412.0 61.8 409.0C63.8 406.1 68.3 402.5 72.8 401.6C77.3 400.7 85.4 401.7 88.9 403.8C92.4 405.9 93.9 410.7 93.7 414.0ZM135.3 414.0C135.5 417.4 131.8 422.6 127.6 424.8C123.5 427.0 115.2 428.4 110.5 427.5C105.8 426.5 101.3 422.2 99.5 419.1C97.8 416.0 98.2 412.1 100.1 409.1C102.0 406.1 106.4 402.0 110.7 401.2C115.1 400.5 122.1 402.4 126.1 404.5C130.2 406.6 135.0 410.6 135.3 414.0ZM170.1 414.0C170.5 417.3 168.7 422.7 165.0 425.0C161.2 427.3 152.2 428.7 147.5 427.7C142.8 426.7 139.1 422.2 137.0 419.0C134.9 415.7 133.0 411.3 134.7 408.3C136.5 405.3 143.1 401.5 147.7 401.0C152.4 400.4 158.9 402.8 162.7 405.0C166.4 407.1 169.7 410.7 170.1 414.0ZM213.1 414.0C213.1 417.2 208.7 421.6 204.7 423.7C200.7 425.9 194.0 427.6 188.9 427.0C183.9 426.4 176.9 423.2 174.7 420.1C172.4 417.0 173.2 411.3 175.6 408.2C178.0 405.1 184.2 401.9 189.0 401.3C193.9 400.6 200.7 402.2 204.7 404.3C208.7 406.4 213.1 410.8 213.1 414.0ZM249.1 414.0C249.1 417.3 245.5 421.5 241.6 423.7C237.7 425.9 230.4 428.0 225.8 427.3C221.1 426.6 215.8 422.7 213.6 419.5C211.3 416.3 210.0 410.9 212.2 408.1C214.3 405.3 221.5 403.5 226.5 402.8C231.4 402.1 238.0 402.2 241.8 404.1C245.6 405.9 249.2 410.7 249.1 414.0ZM287.3 414.0C287.1 417.1 281.7 420.9 277.7 422.9C273.6 425.0 267.9 426.6 263.1 426.1C258.4 425.6 250.9 422.9 249.0 420.0C247.1 417.1 249.3 412.0 251.6 408.9C254.0 405.8 258.6 402.4 263.1 401.6C267.5 400.9 274.5 402.2 278.6 404.3C282.6 406.3 287.4 410.9 287.3 414.0ZM323.6 414.0C323.7 417.6 321.3 422.6 317.4 424.9C313.5 427.2 305.0 428.5 300.1 427.6C295.2 426.7 290.2 422.7 288.1 419.5C285.9 416.2 285.3 411.3 287.4 408.3C289.5 405.4 295.7 402.7 300.6 401.9C305.5 401.1 313.1 401.5 316.9 403.5C320.8 405.5 323.6 410.4 323.6 414.0ZM360.7 414.0C360.5 417.2 356.5 420.9 352.6 423.2C348.7 425.5 342.0 428.3 337.2 427.8C332.3 427.2 325.2 423.2 323.4 420.0C321.6 416.9 323.9 412.0 326.3 408.9C328.7 405.9 333.2 402.7 337.7 401.8C342.2 401.0 349.7 401.9 353.5 403.9C357.4 406.0 360.8 410.8 360.7 414.0ZM400.1 414.0C400.4 417.4 398.8 423.2 395.2 425.1C391.6 427.0 383.3 426.3 378.4 425.4C373.6 424.4 368.1 422.2 365.9 419.4C363.8 416.5 363.4 411.4 365.4 408.5C367.5 405.6 373.5 402.5 378.2 401.8C382.8 401.2 389.6 402.6 393.2 404.6C396.9 406.6 399.7 410.6 400.1 414.0ZM439.8 414.0C439.8 417.5 436.3 422.3 432.4 424.4C428.4 426.4 421.1 427.2 416.1 426.4C411.1 425.7 404.6 422.8 402.5 419.8C400.3 416.8 400.9 411.4 403.2 408.4C405.5 405.4 411.2 402.7 416.2 401.9C421.1 401.0 429.0 401.2 432.9 403.2C436.8 405.2 439.9 410.5 439.8 414.0ZM471.9 414.0C472.0 417.5 470.6 422.8 467.1 424.7C463.6 426.6 456.0 426.2 450.7 425.5C445.5 424.7 438.0 423.0 435.8 420.2C433.5 417.3 434.8 411.6 437.1 408.3C439.5 404.9 445.0 400.9 449.9 400.2C454.9 399.4 463.1 401.3 466.8 403.6C470.4 405.9 471.9 410.5 471.9 414.0ZM513.0 414.0C513.3 417.4 512.0 423.1 508.4 425.0C504.9 426.9 496.9 426.3 491.8 425.4C486.6 424.6 479.8 422.9 477.4 420.0C475.0 417.1 474.7 410.8 477.1 407.9C479.5 405.1 487.1 403.5 491.9 403.0C496.8 402.5 502.8 403.0 506.3 404.9C509.8 406.7 512.6 410.6 513.0 414.0ZM553.6 414.0C553.6 417.7 552.2 423.0 548.5 425.1C544.8 427.2 536.0 427.4 531.4 426.4C526.8 425.4 522.6 421.8 520.6 418.9C518.7 416.0 517.8 411.5 519.7 408.8C521.6 406.1 527.0 403.7 531.8 402.7C536.6 401.8 544.9 401.1 548.5 402.9C552.1 404.8 553.6 410.3 553.6 414.0Z\"/>\n  <path class=\"a3-gland\" d=\"M102.6 384.0a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0M90.7 389.7a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0M86.5 380.3a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0M101.1 380.7a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0M95.9 389.8a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0M84.6 383.5a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0M97.1 378.5a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0M100.3 388.0a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0M85.7 386.9a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0\"/><path class=\"a3-duct\" d=\"M98.0 378.0L99.2 372.2L100.3 366.5L101.4 360.7L102.4 355.0L103.2 349.2L103.8 343.4L104.3 337.7L104.7 331.9L104.9 326.2L105.1 320.4L105.2 314.6L105.2 308.9L105.4 303.1L105.6 297.4L105.9 291.6L106.3 285.8L106.9 280.1L107.6 274.3L108.5 268.6L109.5 262.8L110.7 257.0L111.8 251.3L113.0 245.5L114.2 239.8L115.3 234.0L116.3 228.2L117.2 222.5L117.9 216.7L118.5 211.0L118.9 205.2L119.2 199.4L118.9 193.7L118.4 187.9L117.8 182.2L117.3 176.4L116.8 170.6L116.4 164.9L116.1 159.1L116.0 153.4L116.0 147.6L116.2 141.8L116.6 136.1L117.0 130.3L120.3 124.6L115.8 118.8L114.1 113.0L117.4 107.3L121.5 101.5L121.1 95.8L116.8 90.0\"/><path class=\"a3-gland\" d=\"M388.6 388.0a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0M376.7 393.7a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0M372.5 384.3a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0M387.1 384.7a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0M381.9 393.8a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0M370.6 387.5a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0M383.1 382.5a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0M386.3 392.0a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0M371.7 390.9a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0\"/><path class=\"a3-duct\" d=\"M384.0 382.0L385.9 376.2L387.8 370.3L389.5 364.5L391.2 358.6L392.7 352.8L394.1 347.0L395.3 341.1L396.3 335.3L397.3 329.4L398.1 323.6L398.9 317.8L399.7 311.9L400.5 306.1L401.4 300.2L402.4 294.4L403.6 288.6L404.9 282.7L406.3 276.9L407.9 271.0L409.6 265.2L411.4 259.4L413.3 253.5L415.2 247.7L417.1 241.8L418.9 236.0L420.6 230.2L422.2 224.3L423.6 218.5L424.9 212.6L426.0 206.8L427.0 201.0L426.9 195.1L426.4 189.3L425.8 183.4L425.3 177.6L424.8 171.8L424.4 165.9L424.1 160.1L424.0 154.2L424.0 148.4L424.2 142.6L424.6 136.7L425.0 130.9L428.3 125.0L423.8 119.2L422.1 113.4L425.4 107.5L429.5 101.7L429.1 95.8L424.8 90.0\"/>\n  <path class=\"a3-feed\" d=\"M78.0 306.0C79.0 300.0 84.7 282.7 84.0 270.0C83.3 257.3 74.5 241.7 74.0 230.0C73.5 218.3 80.3 208.4 81.0 200.0C81.7 191.6 78.5 183.0 78.0 179.6M214.0 309.5C215.0 302.9 220.7 283.2 220.0 270.0C219.3 256.8 210.5 241.7 210.0 230.0C209.5 218.3 216.3 208.5 217.0 200.0C217.7 191.5 214.5 182.4 214.0 178.8M352.0 311.0C353.0 304.1 358.7 283.5 358.0 270.0C357.3 256.5 348.5 241.7 348.0 230.0C347.5 218.3 354.3 208.6 355.0 200.0C355.7 191.4 352.5 181.8 352.0 178.1M494.0 309.2C495.0 302.7 500.7 283.2 500.0 270.0C499.3 256.8 490.5 241.7 490.0 230.0C489.5 218.3 496.3 208.6 497.0 200.0C497.7 191.4 494.5 181.8 494.0 178.2\"/>\n  <path class=\"a3-art\" data-part=\"art\"/>\n  <path class=\"a3-plex\" data-part=\"plex\"/>\n  <path class=\"a3-loop-up\" d=\"M48.5 176.4C48.5 170.6 48.5 149.1 48.8 142.0C49.1 134.9 50.2 135.3 50.5 134.0M70.5 172.3C70.5 167.3 70.5 148.4 70.8 142.0C71.1 135.6 72.2 135.3 72.5 134.0M92.5 170.0C92.5 165.3 92.5 148.0 92.8 142.0C93.1 136.0 94.2 135.3 94.5 134.0M114.5 171.8C114.5 166.8 114.5 148.3 114.8 142.0C115.1 135.7 116.2 135.3 116.5 134.0M136.5 175.9C136.6 170.2 136.5 149.0 136.8 142.0C137.1 135.0 138.2 135.3 138.5 134.0M158.5 178.0C158.6 172.0 158.5 149.3 158.8 142.0C159.1 134.7 160.2 135.3 160.5 134.0M180.5 176.0C180.6 170.4 180.5 149.0 180.8 142.0C181.1 135.0 182.2 135.3 182.5 134.0M202.5 172.0C202.6 167.0 202.5 148.3 202.8 142.0C203.1 135.7 204.2 135.3 204.5 134.0M224.5 170.0C224.6 165.3 224.5 148.0 224.8 142.0C225.1 136.0 226.2 135.3 226.5 134.0M246.5 172.1C246.6 167.1 246.5 148.4 246.8 142.0C247.1 135.6 248.2 135.3 248.5 134.0M268.5 176.2C268.6 170.5 268.5 149.0 268.8 142.0C269.1 135.0 270.2 135.3 270.5 134.0M290.5 178.0C290.6 172.0 290.5 149.3 290.8 142.0C291.1 134.7 292.2 135.3 292.5 134.0M312.5 175.7C312.6 170.1 312.5 148.9 312.8 142.0C313.1 135.1 314.2 135.3 314.5 134.0M334.5 171.6C334.6 166.7 334.5 148.3 334.8 142.0C335.1 135.7 336.2 135.3 336.5 134.0M356.5 170.0C356.6 165.4 356.5 148.0 356.8 142.0C357.1 136.0 358.2 135.3 358.5 134.0M378.5 172.5C378.6 167.4 378.5 148.4 378.8 142.0C379.1 135.6 380.2 135.3 380.5 134.0M400.5 176.5C400.6 170.8 400.5 149.1 400.8 142.0C401.1 134.9 402.2 135.3 402.5 134.0M422.5 177.9C422.6 172.0 422.5 149.3 422.8 142.0C423.1 134.7 424.2 135.3 424.5 134.0M444.5 175.3C444.6 169.8 444.5 148.9 444.8 142.0C445.1 135.1 446.2 135.3 446.5 134.0M466.5 171.3C466.6 166.5 466.5 148.2 466.8 142.0C467.1 135.8 468.2 135.3 468.5 134.0M488.5 170.1C488.6 165.4 488.5 148.0 488.8 142.0C489.1 136.0 490.2 135.3 490.5 134.0M510.5 172.9C510.6 167.7 510.5 148.5 510.8 142.0C511.1 135.5 512.2 135.3 512.5 134.0M532.5 176.8C532.5 171.0 532.5 149.1 532.8 142.0C533.1 134.9 534.2 135.3 534.5 134.0M554.5 177.9C554.5 171.9 554.5 149.3 554.8 142.0C555.1 134.7 556.2 135.3 556.5 134.0\"/>\n  <path class=\"a3-loop-dn\" d=\"M53.5 134.0C53.8 135.3 54.9 134.9 55.2 142.0C55.5 149.1 55.5 170.6 55.5 176.4M75.5 134.0C75.8 135.3 76.9 135.6 77.2 142.0C77.5 148.4 77.5 167.3 77.5 172.3M97.5 134.0C97.8 135.3 98.9 136.0 99.2 142.0C99.5 148.0 99.5 165.3 99.5 170.0M119.5 134.0C119.8 135.3 120.9 135.7 121.2 142.0C121.5 148.3 121.5 166.8 121.5 171.8M141.5 134.0C141.8 135.3 142.9 135.0 143.2 142.0C143.5 149.0 143.4 170.2 143.5 175.9M163.5 134.0C163.8 135.3 164.9 134.7 165.2 142.0C165.5 149.3 165.4 172.0 165.5 178.0M185.5 134.0C185.8 135.3 186.9 135.0 187.2 142.0C187.5 149.0 187.4 170.4 187.5 176.0M207.5 134.0C207.8 135.3 208.9 135.7 209.2 142.0C209.5 148.3 209.4 167.0 209.5 172.0M229.5 134.0C229.8 135.3 230.9 136.0 231.2 142.0C231.5 148.0 231.4 165.3 231.5 170.0M251.5 134.0C251.8 135.3 252.9 135.6 253.2 142.0C253.5 148.4 253.4 167.1 253.5 172.1M273.5 134.0C273.8 135.3 274.9 135.0 275.2 142.0C275.5 149.0 275.4 170.5 275.5 176.2M295.5 134.0C295.8 135.3 296.9 134.7 297.2 142.0C297.5 149.3 297.4 172.0 297.5 178.0M317.5 134.0C317.8 135.3 318.9 135.1 319.2 142.0C319.5 148.9 319.4 170.1 319.5 175.7M339.5 134.0C339.8 135.3 340.9 135.7 341.2 142.0C341.5 148.3 341.4 166.7 341.5 171.6M361.5 134.0C361.8 135.3 362.9 136.0 363.2 142.0C363.5 148.0 363.4 165.4 363.5 170.0M383.5 134.0C383.8 135.3 384.9 135.6 385.2 142.0C385.5 148.4 385.4 167.4 385.5 172.5M405.5 134.0C405.8 135.3 406.9 134.9 407.2 142.0C407.5 149.1 407.4 170.8 407.5 176.5M427.5 134.0C427.8 135.3 428.9 134.7 429.2 142.0C429.5 149.3 429.4 172.0 429.5 177.9M449.5 134.0C449.8 135.3 450.9 135.1 451.2 142.0C451.5 148.9 451.4 169.8 451.5 175.3M471.5 134.0C471.8 135.3 472.9 135.8 473.2 142.0C473.5 148.2 473.4 166.5 473.5 171.3M493.5 134.0C493.8 135.3 494.9 136.0 495.2 142.0C495.5 148.0 495.4 165.4 495.5 170.1M515.5 134.0C515.8 135.3 516.9 135.5 517.2 142.0C517.5 148.5 517.5 167.7 517.5 172.9M537.5 134.0C537.8 135.3 538.9 134.9 539.2 142.0C539.5 149.1 539.5 171.0 539.5 176.8M559.5 134.0C559.8 135.3 560.9 134.7 561.2 142.0C561.5 149.3 561.5 171.9 561.5 177.9\"/>\n  <path class=\"a3-loop-cap\" d=\"M50.4 134.0Q52.0 130.0 53.6 134.0M72.4 134.0Q74.0 130.0 75.6 134.0M94.4 134.0Q96.0 130.0 97.6 134.0M116.4 134.0Q118.0 130.0 119.6 134.0M138.4 134.0Q140.0 130.0 141.6 134.0M160.4 134.0Q162.0 130.0 163.6 134.0M182.4 134.0Q184.0 130.0 185.6 134.0M204.4 134.0Q206.0 130.0 207.6 134.0M226.4 134.0Q228.0 130.0 229.6 134.0M248.4 134.0Q250.0 130.0 251.6 134.0M270.4 134.0Q272.0 130.0 273.6 134.0M292.4 134.0Q294.0 130.0 295.6 134.0M314.4 134.0Q316.0 130.0 317.6 134.0M336.4 134.0Q338.0 130.0 339.6 134.0M358.4 134.0Q360.0 130.0 361.6 134.0M380.4 134.0Q382.0 130.0 383.6 134.0M402.4 134.0Q404.0 130.0 405.6 134.0M424.4 134.0Q426.0 130.0 427.6 134.0M446.4 134.0Q448.0 130.0 449.6 134.0M468.4 134.0Q470.0 130.0 471.6 134.0M490.4 134.0Q492.0 130.0 493.6 134.0M512.4 134.0Q514.0 130.0 515.6 134.0M534.4 134.0Q536.0 130.0 537.6 134.0M556.4 134.0Q558.0 130.0 559.6 134.0\"/>\n  <path class=\"a3-glomus\" d=\"M140.4 296.9a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M153.6 304.1a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M143.4 291.5a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M157.2 297.3a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M143.8 289.8a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M158.6 286.8a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M142.0 287.1a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M153.4 277.3a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M136.2 281.1a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M147.6 271.3a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M131.1 270.7a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M146.1 269.5a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M136.5 258.5a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M146.7 269.5a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M146.7 251.5a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M154.3 264.3a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M155.7 246.0a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M164.9 257.8a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M157.5 244.9a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M172.3 246.7a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M156.7 245.2a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M166.7 234.2a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M149.1 239.8a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M157.5 227.4a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M140.0 232.2a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M151.6 222.8a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M137.1 219.2a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M151.3 223.8a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M143.9 209.8a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M153.9 221.0a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M151.1 203.7a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M161.1 214.9a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M154.1 200.2a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M167.9 206.2a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M154.1 198.6a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M168.9 195.8a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M152.4 193.3a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M166.8 188.9a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M292.4 295.0a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M305.6 302.0a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M295.4 289.6a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M309.2 295.4a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M295.8 287.9a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M310.6 284.9a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M294.1 285.2a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M305.3 275.4a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M288.3 279.1a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M299.5 269.3a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M283.1 268.6a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M298.1 267.6a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M288.4 256.7a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M298.8 267.5a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M298.7 249.5a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M306.3 262.5a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M307.8 243.9a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M316.8 255.9a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M309.5 242.9a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M324.3 244.7a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M308.6 243.2a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M318.8 232.2a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M301.0 237.9a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M309.6 225.5a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M292.0 230.4a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M303.6 220.8a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M289.1 217.2a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M303.3 221.8a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M295.8 207.9a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M306.0 218.9a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M303.0 201.8a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M313.2 212.8a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M306.1 198.3a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M319.9 204.3a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M306.1 196.7a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M320.9 193.7a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M304.4 191.3a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M318.8 186.9a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M438.4 293.4a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M451.6 300.4a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M441.4 287.9a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M455.2 293.7a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M441.8 286.0a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M456.6 283.2a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M440.0 283.4a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M451.4 273.6a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M434.2 277.2a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M445.6 267.4a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M429.1 266.7a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M444.1 265.7a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M434.4 254.6a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M444.8 265.4a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M444.7 247.5a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M452.3 260.3a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M453.7 241.8a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M462.9 253.6a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M455.5 240.7a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M470.3 242.5a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M454.6 240.9a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M464.8 229.9a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M447.0 235.5a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M455.6 223.1a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M437.9 227.7a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M449.7 218.5a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M435.1 214.6a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M449.3 219.2a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M441.8 205.3a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M452.0 216.3a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M449.0 199.1a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M459.2 210.1a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M452.1 195.5a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M465.9 201.5a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M452.1 193.7a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M466.9 190.9a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M450.4 188.3a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0M464.8 184.1a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0\"/>\n  <path class=\"a3-ava-wall\" data-part=\"avaWall\"/>\n  <path class=\"a3-ava\" data-part=\"ava\"/>\n  <path class=\"a3-nerve\" d=\"M20.0 262.0C31.7 261.0 65.0 255.3 90.0 256.0C115.0 256.7 143.3 265.7 170.0 266.0C196.7 266.3 223.3 258.0 250.0 258.0C276.7 258.0 303.3 266.0 330.0 266.0C356.7 266.0 381.7 258.3 410.0 258.0C438.3 257.7 471.7 264.0 500.0 264.0C528.3 264.0 566.7 259.0 580.0 258.0M138.0 262.0C139.0 260.3 142.0 254.7 144.0 252.0C146.0 249.3 149.0 247.0 150.0 246.0M290.0 262.0C291.0 260.3 294.0 254.7 296.0 252.0C298.0 249.3 301.0 247.0 302.0 246.0M436.0 262.0C437.0 260.3 440.0 254.7 442.0 252.0C444.0 249.3 447.0 247.0 448.0 246.0\"/>\n  <path class=\"a3-spike\" data-part=\"spikes\"/>\n  <path class=\"a3-cells-art\" data-part=\"cellsA\"/><path class=\"a3-cells-ven\" data-part=\"cellsV\"/>\n  <path class=\"a3-epi\" d=\"M24 92.1L24.0 92.1L26.0 91.0L28.0 90.2L30.0 90.0L32.0 90.2L34.0 91.0L36.0 92.1L38.0 93.5L40.0 95.1L42.0 96.9L44.0 98.5L46.0 99.9L48.0 101.0L50.0 101.8L52.0 102.0L54.0 101.8L56.0 101.0L58.0 99.9L60.0 98.5L62.0 96.9L64.0 95.1L66.0 93.5L68.0 92.1L70.0 91.0L72.0 90.2L74.0 90.0L76.0 90.2L78.0 91.0L80.0 92.1L82.0 93.5L84.0 95.1L86.0 96.9L88.0 98.5L90.0 99.9L92.0 101.0L94.0 101.8L96.0 102.0L98.0 101.8L100.0 101.0L102.0 99.9L104.0 98.5L106.0 96.9L108.0 95.1L110.0 93.5L112.0 92.1L114.0 91.0L116.0 90.2L118.0 90.0L120.0 90.2L122.0 91.0L124.0 92.1L126.0 93.5L128.0 95.1L130.0 96.9L132.0 98.5L134.0 99.9L136.0 101.0L138.0 101.8L140.0 102.0L142.0 101.8L144.0 101.0L146.0 99.9L148.0 98.5L150.0 96.9L152.0 95.1L154.0 93.5L156.0 92.1L158.0 91.0L160.0 90.2L162.0 90.0L164.0 90.2L166.0 91.0L168.0 92.1L170.0 93.5L172.0 95.1L174.0 96.9L176.0 98.5L178.0 99.9L180.0 101.0L182.0 101.8L184.0 102.0L186.0 101.8L188.0 101.0L190.0 99.9L192.0 98.5L194.0 96.9L196.0 95.1L198.0 93.5L200.0 92.1L202.0 91.0L204.0 90.2L206.0 90.0L208.0 90.2L210.0 91.0L212.0 92.1L214.0 93.5L216.0 95.1L218.0 96.9L220.0 98.5L222.0 99.9L224.0 101.0L226.0 101.8L228.0 102.0L230.0 101.8L232.0 101.0L234.0 99.9L236.0 98.5L238.0 96.9L240.0 95.1L242.0 93.5L244.0 92.1L246.0 91.0L248.0 90.2L250.0 90.0L252.0 90.2L254.0 91.0L256.0 92.1L258.0 93.5L260.0 95.1L262.0 96.9L264.0 98.5L266.0 99.9L268.0 101.0L270.0 101.8L272.0 102.0L274.0 101.8L276.0 101.0L278.0 99.9L280.0 98.5L282.0 96.9L284.0 95.1L286.0 93.5L288.0 92.1L290.0 91.0L292.0 90.2L294.0 90.0L296.0 90.2L298.0 91.0L300.0 92.1L302.0 93.5L304.0 95.1L306.0 96.9L308.0 98.5L310.0 99.9L312.0 101.0L314.0 101.8L316.0 102.0L318.0 101.8L320.0 101.0L322.0 99.9L324.0 98.5L326.0 96.9L328.0 95.1L330.0 93.5L332.0 92.1L334.0 91.0L336.0 90.2L338.0 90.0L340.0 90.2L342.0 91.0L344.0 92.1L346.0 93.5L348.0 95.1L350.0 96.9L352.0 98.5L354.0 99.9L356.0 101.0L358.0 101.8L360.0 102.0L362.0 101.8L364.0 101.0L366.0 99.9L368.0 98.5L370.0 96.9L372.0 95.1L374.0 93.5L376.0 92.1L378.0 91.0L380.0 90.2L382.0 90.0L384.0 90.2L386.0 91.0L388.0 92.1L390.0 93.5L392.0 95.1L394.0 96.9L396.0 98.5L398.0 99.9L400.0 101.0L402.0 101.8L404.0 102.0L406.0 101.8L408.0 101.0L410.0 99.9L412.0 98.5L414.0 96.9L416.0 95.1L418.0 93.5L420.0 92.1L422.0 91.0L424.0 90.2L426.0 90.0L428.0 90.2L430.0 91.0L432.0 92.1L434.0 93.5L436.0 95.1L438.0 96.9L440.0 98.5L442.0 99.9L444.0 101.0L446.0 101.8L448.0 102.0L450.0 101.8L452.0 101.0L454.0 99.9L456.0 98.5L458.0 96.9L460.0 95.1L462.0 93.5L464.0 92.1L466.0 91.0L468.0 90.2L470.0 90.0L472.0 90.2L474.0 91.0L476.0 92.1L478.0 93.5L480.0 95.1L482.0 96.9L484.0 98.5L486.0 99.9L488.0 101.0L490.0 101.8L492.0 102.0L494.0 101.8L496.0 101.0L498.0 99.9L500.0 98.5L502.0 96.9L504.0 95.1L506.0 93.5L508.0 92.1L510.0 91.0L512.0 90.2L514.0 90.0L516.0 90.2L518.0 91.0L520.0 92.1L522.0 93.5L524.0 95.1L526.0 96.9L528.0 98.5L530.0 99.9L532.0 101.0L534.0 101.8L536.0 102.0L538.0 101.8L540.0 101.0L542.0 99.9L544.0 98.5L546.0 96.9L548.0 95.1L550.0 93.5L552.0 92.1L554.0 91.0L556.0 90.2L558.0 90.0L560.0 90.2L562.0 91.0L564.0 92.1L566.0 93.5L568.0 95.1L570.0 96.9L572.0 98.5L574.0 99.9L576.0 101.0L576.0 135.9L574.0 140.0L572.0 140.0L570.0 140.0L568.0 140.0L566.0 140.0L564.0 140.0L562.0 135.9L560.0 129.0L558.0 126.0L556.0 129.0L554.0 135.9L552.0 140.0L550.0 140.0L548.0 140.0L546.0 140.0L544.0 140.0L542.0 140.0L540.0 135.9L538.0 129.0L536.0 126.0L534.0 129.0L532.0 135.9L530.0 140.0L528.0 140.0L526.0 140.0L524.0 140.0L522.0 140.0L520.0 140.0L518.0 135.9L516.0 129.0L514.0 126.0L512.0 129.0L510.0 135.9L508.0 140.0L506.0 140.0L504.0 140.0L502.0 140.0L500.0 140.0L498.0 140.0L496.0 135.9L494.0 129.0L492.0 126.0L490.0 129.0L488.0 135.9L486.0 140.0L484.0 140.0L482.0 140.0L480.0 140.0L478.0 140.0L476.0 140.0L474.0 135.9L472.0 129.0L470.0 126.0L468.0 129.0L466.0 135.9L464.0 140.0L462.0 140.0L460.0 140.0L458.0 140.0L456.0 140.0L454.0 140.0L452.0 135.9L450.0 129.0L448.0 126.0L446.0 129.0L444.0 135.9L442.0 140.0L440.0 140.0L438.0 140.0L436.0 140.0L434.0 140.0L432.0 140.0L430.0 135.9L428.0 129.0L426.0 126.0L424.0 129.0L422.0 135.9L420.0 140.0L418.0 140.0L416.0 140.0L414.0 140.0L412.0 140.0L410.0 140.0L408.0 135.9L406.0 129.0L404.0 126.0L402.0 129.0L400.0 135.9L398.0 140.0L396.0 140.0L394.0 140.0L392.0 140.0L390.0 140.0L388.0 140.0L386.0 135.9L384.0 129.0L382.0 126.0L380.0 129.0L378.0 135.9L376.0 140.0L374.0 140.0L372.0 140.0L370.0 140.0L368.0 140.0L366.0 140.0L364.0 135.9L362.0 129.0L360.0 126.0L358.0 129.0L356.0 135.9L354.0 140.0L352.0 140.0L350.0 140.0L348.0 140.0L346.0 140.0L344.0 140.0L342.0 135.9L340.0 129.0L338.0 126.0L336.0 129.0L334.0 135.9L332.0 140.0L330.0 140.0L328.0 140.0L326.0 140.0L324.0 140.0L322.0 140.0L320.0 135.9L318.0 129.0L316.0 126.0L314.0 129.0L312.0 135.9L310.0 140.0L308.0 140.0L306.0 140.0L304.0 140.0L302.0 140.0L300.0 140.0L298.0 135.9L296.0 129.0L294.0 126.0L292.0 129.0L290.0 135.9L288.0 140.0L286.0 140.0L284.0 140.0L282.0 140.0L280.0 140.0L278.0 140.0L276.0 135.9L274.0 129.0L272.0 126.0L270.0 129.0L268.0 135.9L266.0 140.0L264.0 140.0L262.0 140.0L260.0 140.0L258.0 140.0L256.0 140.0L254.0 135.9L252.0 129.0L250.0 126.0L248.0 129.0L246.0 135.9L244.0 140.0L242.0 140.0L240.0 140.0L238.0 140.0L236.0 140.0L234.0 140.0L232.0 135.9L230.0 129.0L228.0 126.0L226.0 129.0L224.0 135.9L222.0 140.0L220.0 140.0L218.0 140.0L216.0 140.0L214.0 140.0L212.0 140.0L210.0 135.9L208.0 129.0L206.0 126.0L204.0 129.0L202.0 135.9L200.0 140.0L198.0 140.0L196.0 140.0L194.0 140.0L192.0 140.0L190.0 140.0L188.0 135.9L186.0 129.0L184.0 126.0L182.0 129.0L180.0 135.9L178.0 140.0L176.0 140.0L174.0 140.0L172.0 140.0L170.0 140.0L168.0 140.0L166.0 135.9L164.0 129.0L162.0 126.0L160.0 129.0L158.0 135.9L156.0 140.0L154.0 140.0L152.0 140.0L150.0 140.0L148.0 140.0L146.0 140.0L144.0 135.9L142.0 129.0L140.0 126.0L138.0 129.0L136.0 135.9L134.0 140.0L132.0 140.0L130.0 140.0L128.0 140.0L126.0 140.0L124.0 140.0L122.0 135.9L120.0 129.0L118.0 126.0L116.0 129.0L114.0 135.9L112.0 140.0L110.0 140.0L108.0 140.0L106.0 140.0L104.0 140.0L102.0 140.0L100.0 135.9L98.0 129.0L96.0 126.0L94.0 129.0L92.0 135.9L90.0 140.0L88.0 140.0L86.0 140.0L84.0 140.0L82.0 140.0L80.0 140.0L78.0 135.9L76.0 129.0L74.0 126.0L72.0 129.0L70.0 135.9L68.0 140.0L66.0 140.0L64.0 140.0L62.0 140.0L60.0 140.0L58.0 140.0L56.0 135.9L54.0 129.0L52.0 126.0L50.0 129.0L48.0 135.9L46.0 140.0L44.0 140.0L42.0 140.0L40.0 140.0L38.0 140.0L36.0 140.0L34.0 135.9L32.0 129.0L30.0 126.0L28.0 129.0L26.0 135.9L24.0 140.0Z\"/>\n  <path class=\"a3-kera\" d=\"M26.5 118.5a1.5446186276102611 1.5446186276102611 0 1 0 3.0892372552205223 0a1.5446186276102611 1.5446186276102611 0 1 0 -3.0892372552205223 0M186.5 125.8a1.0663571518532533 1.0663571518532533 0 1 0 2.1327143037065066 0a1.0663571518532533 1.0663571518532533 0 1 0 -2.1327143037065066 0M154.7 117.5a1.2775374202314183 1.2775374202314183 0 1 0 2.5550748404628365 0a1.2775374202314183 1.2775374202314183 0 1 0 -2.5550748404628365 0M392.9 135.6a1.4179573021065046 1.4179573021065046 0 1 0 2.8359146042130092 0a1.4179573021065046 1.4179573021065046 0 1 0 -2.8359146042130092 0M111.0 109.8a1.187115722417008 1.187115722417008 0 1 0 2.374231444834016 0a1.187115722417008 1.187115722417008 0 1 0 -2.374231444834016 0M379.8 110.3a1.0269436514255996 1.0269436514255996 0 1 0 2.0538873028511992 0a1.0269436514255996 1.0269436514255996 0 1 0 -2.0538873028511992 0M525.8 119.1a1.06120091030486 1.06120091030486 0 1 0 2.12240182060972 0a1.06120091030486 1.06120091030486 0 1 0 -2.12240182060972 0M262.6 136.5a1.4565277314340022 1.4565277314340022 0 1 0 2.9130554628680043 0a1.4565277314340022 1.4565277314340022 0 1 0 -2.9130554628680043 0M152.3 126.3a1.3218771174753803 1.3218771174753803 0 1 0 2.6437542349507606 0a1.3218771174753803 1.3218771174753803 0 1 0 -2.6437542349507606 0M173.3 111.7a1.3541670803950794 1.3541670803950794 0 1 0 2.7083341607901588 0a1.3541670803950794 1.3541670803950794 0 1 0 -2.7083341607901588 0M326.9 132.2a1.2185854776004195 1.2185854776004195 0 1 0 2.437170955200839 0a1.2185854776004195 1.2185854776004195 0 1 0 -2.437170955200839 0M155.7 126.1a1.4488197913382386 1.4488197913382386 0 1 0 2.897639582676477 0a1.4488197913382386 1.4488197913382386 0 1 0 -2.897639582676477 0M115.1 120.1a1.6686308493545567 1.6686308493545567 0 1 0 3.3372616987091135 0a1.6686308493545567 1.6686308493545567 0 1 0 -3.3372616987091135 0M476.1 113.0a1.6389260017209928 1.6389260017209928 0 1 0 3.2778520034419856 0a1.6389260017209928 1.6389260017209928 0 1 0 -3.2778520034419856 0M360.5 123.2a1.1803150113954348 1.1803150113954348 0 1 0 2.3606300227908696 0a1.1803150113954348 1.1803150113954348 0 1 0 -2.3606300227908696 0M224.4 115.9a1.2964749498259973 1.2964749498259973 0 1 0 2.5929498996519946 0a1.2964749498259973 1.2964749498259973 0 1 0 -2.5929498996519946 0M224.2 116.2a1.5827317225120325 1.5827317225120325 0 1 0 3.165463445024065 0a1.5827317225120325 1.5827317225120325 0 1 0 -3.165463445024065 0M238.2 113.4a1.2621739408580344 1.2621739408580344 0 1 0 2.5243478817160687 0a1.2621739408580344 1.2621739408580344 0 1 0 -2.5243478817160687 0M459.9 132.7a1.30281084035785 1.30281084035785 0 1 0 2.6056216807157 0a1.30281084035785 1.30281084035785 0 1 0 -2.6056216807157 0M292.4 114.1a1.211975146189309 1.211975146189309 0 1 0 2.423950292378618 0a1.211975146189309 1.211975146189309 0 1 0 -2.423950292378618 0M311.2 122.8a1.407021872612668 1.407021872612668 0 1 0 2.814043745225336 0a1.407021872612668 1.407021872612668 0 1 0 -2.814043745225336 0M350.4 136.2a1.3289183972672731 1.3289183972672731 0 1 0 2.6578367945345462 0a1.3289183972672731 1.3289183972672731 0 1 0 -2.6578367945345462 0M206.4 113.4a1.5171748747743432 1.5171748747743432 0 1 0 3.0343497495486864 0a1.5171748747743432 1.5171748747743432 0 1 0 -3.0343497495486864 0M227.0 119.2a1.6444975180500163 1.6444975180500163 0 1 0 3.2889950361000326 0a1.6444975180500163 1.6444975180500163 0 1 0 -3.2889950361000326 0M236.2 125.6a1.4541158778165615 1.4541158778165615 0 1 0 2.908231755633123 0a1.4541158778165615 1.4541158778165615 0 1 0 -2.908231755633123 0M202.1 121.3a1.1752939427507054 1.1752939427507054 0 1 0 2.350587885501411 0a1.1752939427507054 1.1752939427507054 0 1 0 -2.350587885501411 0M466.2 125.2a1.097360550609753 1.097360550609753 0 1 0 2.194721101219506 0a1.097360550609753 1.097360550609753 0 1 0 -2.194721101219506 0M367.7 111.9a1.309593553989747 1.309593553989747 0 1 0 2.619187107979494 0a1.309593553989747 1.309593553989747 0 1 0 -2.619187107979494 0M212.2 110.1a1.4767857999790328 1.4767857999790328 0 1 0 2.9535715999580656 0a1.4767857999790328 1.4767857999790328 0 1 0 -2.9535715999580656 0M367.8 137.9a1.3100027476064886 1.3100027476064886 0 1 0 2.620005495212977 0a1.3100027476064886 1.3100027476064886 0 1 0 -2.620005495212977 0M116.8 113.7a1.5285533680380818 1.5285533680380818 0 1 0 3.0571067360761637 0a1.5285533680380818 1.5285533680380818 0 1 0 -3.0571067360761637 0M334.9 125.6a1.1609354601343493 1.1609354601343493 0 1 0 2.3218709202686987 0a1.1609354601343493 1.1609354601343493 0 1 0 -2.3218709202686987 0M59.6 115.7a1.2426104526432329 1.2426104526432329 0 1 0 2.4852209052864658 0a1.2426104526432329 1.2426104526432329 0 1 0 -2.4852209052864658 0M68.6 124.5a1.2377107895330626 1.2377107895330626 0 1 0 2.475421579066125 0a1.2377107895330626 1.2377107895330626 0 1 0 -2.475421579066125 0M263.7 135.1a1.5380199197102522 1.5380199197102522 0 1 0 3.0760398394205044 0a1.5380199197102522 1.5380199197102522 0 1 0 -3.0760398394205044 0M493.8 113.7a1.1156881400530116 1.1156881400530116 0 1 0 2.2313762801060233 0a1.1156881400530116 1.1156881400530116 0 1 0 -2.2313762801060233 0M392.2 123.1a1.5437626597879106 1.5437626597879106 0 1 0 3.087525319575821 0a1.5437626597879106 1.5437626597879106 0 1 0 -3.087525319575821 0M430.0 130.1a1.3175811845972958 1.3175811845972958 0 1 0 2.6351623691945916 0a1.3175811845972958 1.3175811845972958 0 1 0 -2.6351623691945916 0M94.0 116.1a1.5591863288629673 1.5591863288629673 0 1 0 3.1183726577259345 0a1.5591863288629673 1.5591863288629673 0 1 0 -3.1183726577259345 0M61.2 125.3a1.4564954164498443 1.4564954164498443 0 1 0 2.9129908328996885 0a1.4564954164498443 1.4564954164498443 0 1 0 -2.9129908328996885 0M274.5 120.3a1.010498603024053 1.010498603024053 0 1 0 2.020997206048106 0a1.010498603024053 1.010498603024053 0 1 0 -2.020997206048106 0M65.5 109.3a1.3843685748841321 1.3843685748841321 0 1 0 2.7687371497682642 0a1.3843685748841321 1.3843685748841321 0 1 0 -2.7687371497682642 0M401.4 116.1a1.6331356808386144 1.6331356808386144 0 1 0 3.2662713616772288 0a1.6331356808386144 1.6331356808386144 0 1 0 -3.2662713616772288 0M346.5 120.4a1.1822054006459242 1.1822054006459242 0 1 0 2.3644108012918483 0a1.1822054006459242 1.1822054006459242 0 1 0 -2.3644108012918483 0M435.3 120.2a1.6503514629791969 1.6503514629791969 0 1 0 3.3007029259583938 0a1.6503514629791969 1.6503514629791969 0 1 0 -3.3007029259583938 0M537.1 121.2a1.5163655114978232 1.5163655114978232 0 1 0 3.0327310229956463 0a1.5163655114978232 1.5163655114978232 0 1 0 -3.0327310229956463 0M535.5 116.5a1.6653801350997575 1.6653801350997575 0 1 0 3.330760270199515 0a1.6653801350997575 1.6653801350997575 0 1 0 -3.330760270199515 0M449.2 125.8a1.5185304674492501 1.5185304674492501 0 1 0 3.0370609348985003 0a1.5185304674492501 1.5185304674492501 0 1 0 -3.0370609348985003 0M525.1 110.6a1.4963691999636304 1.4963691999636304 0 1 0 2.9927383999272608 0a1.4963691999636304 1.4963691999636304 0 1 0 -2.9927383999272608 0M475.2 113.2a1.3098009224606686 1.3098009224606686 0 1 0 2.619601844921337 0a1.3098009224606686 1.3098009224606686 0 1 0 -2.619601844921337 0M200.7 127.4a1.441107821037162 1.441107821037162 0 1 0 2.882215642074324 0a1.441107821037162 1.441107821037162 0 1 0 -2.882215642074324 0M570.2 126.7a1.1024420472350362 1.1024420472350362 0 1 0 2.2048840944700725 0a1.1024420472350362 1.1024420472350362 0 1 0 -2.2048840944700725 0M371.6 114.6a1.075719090295694 1.075719090295694 0 1 0 2.151438180591388 0a1.075719090295694 1.075719090295694 0 1 0 -2.151438180591388 0M35.1 112.4a1.267511310537822 1.267511310537822 0 1 0 2.535022621075644 0a1.267511310537822 1.267511310537822 0 1 0 -2.535022621075644 0M541.8 111.7a1.0993131345597218 1.0993131345597218 0 1 0 2.1986262691194436 0a1.0993131345597218 1.0993131345597218 0 1 0 -2.1986262691194436 0M303.1 111.6a1.4970736123128547 1.4970736123128547 0 1 0 2.9941472246257095 0a1.4970736123128547 1.4970736123128547 0 1 0 -2.9941472246257095 0M427.7 104.1a1.4591598600234463 1.4591598600234463 0 1 0 2.9183197200468927 0a1.4591598600234463 1.4591598600234463 0 1 0 -2.9183197200468927 0M259.4 121.8a1.567694931959449 1.567694931959449 0 1 0 3.135389863918898 0a1.567694931959449 1.567694931959449 0 1 0 -3.135389863918898 0M220.1 133.4a1.1857007722237154 1.1857007722237154 0 1 0 2.371401544447431 0a1.1857007722237154 1.1857007722237154 0 1 0 -2.371401544447431 0M394.3 135.6a1.193575494171656 1.193575494171656 0 1 0 2.387150988343312 0a1.193575494171656 1.193575494171656 0 1 0 -2.387150988343312 0M433.7 114.4a1.0313060543325787 1.0313060543325787 0 1 0 2.0626121086651574 0a1.0313060543325787 1.0313060543325787 0 1 0 -2.0626121086651574 0M385.1 111.1a1.0533693442152527 1.0533693442152527 0 1 0 2.1067386884305055 0a1.0533693442152527 1.0533693442152527 0 1 0 -2.1067386884305055 0M243.3 122.4a1.1754395790635046 1.1754395790635046 0 1 0 2.350879158127009 0a1.1754395790635046 1.1754395790635046 0 1 0 -2.350879158127009 0M192.2 119.5a1.3708455628909595 1.3708455628909595 0 1 0 2.741691125781919 0a1.3708455628909595 1.3708455628909595 0 1 0 -2.741691125781919 0M27.5 104.0a1.5454523624809946 1.5454523624809946 0 1 0 3.090904724961989 0a1.5454523624809946 1.5454523624809946 0 1 0 -3.090904724961989 0M196.2 130.2a1.1145854496067253 1.1145854496067253 0 1 0 2.2291708992134507 0a1.1145854496067253 1.1145854496067253 0 1 0 -2.2291708992134507 0M133.7 115.6a1.3114331957059289 1.3114331957059289 0 1 0 2.6228663914118577 0a1.3114331957059289 1.3114331957059289 0 1 0 -2.6228663914118577 0M304.5 136.1a1.5404521593735105 1.5404521593735105 0 1 0 3.080904318747021 0a1.5404521593735105 1.5404521593735105 0 1 0 -3.080904318747021 0M166.0 119.0a1.4809900945806782 1.4809900945806782 0 1 0 2.9619801891613564 0a1.4809900945806782 1.4809900945806782 0 1 0 -2.9619801891613564 0M338.2 114.1a1.0490996907922436 1.0490996907922436 0 1 0 2.0981993815844873 0a1.0490996907922436 1.0490996907922436 0 1 0 -2.0981993815844873 0M507.5 116.7a1.1401353074611493 1.1401353074611493 0 1 0 2.2802706149222987 0a1.1401353074611493 1.1401353074611493 0 1 0 -2.2802706149222987 0M379.5 110.0a1.4047481715257728 1.4047481715257728 0 1 0 2.8094963430515456 0a1.4047481715257728 1.4047481715257728 0 1 0 -2.8094963430515456 0M28.5 113.7a1.4960056418050134 1.4960056418050134 0 1 0 2.9920112836100268 0a1.4960056418050134 1.4960056418050134 0 1 0 -2.9920112836100268 0M78.5 118.6a1.4374559188144802 1.4374559188144802 0 1 0 2.8749118376289604 0a1.4374559188144802 1.4374559188144802 0 1 0 -2.8749118376289604 0M198.8 115.0a1.39697812213281 1.39697812213281 0 1 0 2.79395624426562 0a1.39697812213281 1.39697812213281 0 1 0 -2.79395624426562 0M268.6 118.3a1.2871719187471755 1.2871719187471755 0 1 0 2.574343837494351 0a1.2871719187471755 1.2871719187471755 0 1 0 -2.574343837494351 0M569.6 126.1a1.2305893414473061 1.2305893414473061 0 1 0 2.4611786828946123 0a1.2305893414473061 1.2305893414473061 0 1 0 -2.4611786828946123 0M271.4 121.6a1.4871824962433264 1.4871824962433264 0 1 0 2.974364992486653 0a1.4871824962433264 1.4871824962433264 0 1 0 -2.974364992486653 0M163.9 128.6a1.0543619371059927 1.0543619371059927 0 1 0 2.1087238742119854 0a1.0543619371059927 1.0543619371059927 0 1 0 -2.1087238742119854 0M151.8 124.6a1.4013081015099846 1.4013081015099846 0 1 0 2.8026162030199693 0a1.4013081015099846 1.4013081015099846 0 1 0 -2.8026162030199693 0M248.5 106.4a1.2363612346689787 1.2363612346689787 0 1 0 2.4727224693379575 0a1.2363612346689787 1.2363612346689787 0 1 0 -2.4727224693379575 0M45.0 133.5a1.0403163505162265 1.0403163505162265 0 1 0 2.080632701032453 0a1.0403163505162265 1.0403163505162265 0 1 0 -2.080632701032453 0M568.5 131.2a1.1067089439897881 1.1067089439897881 0 1 0 2.2134178879795763 0a1.1067089439897881 1.1067089439897881 0 1 0 -2.2134178879795763 0M71.5 102.2a1.0030764994705808 1.0030764994705808 0 1 0 2.0061529989411615 0a1.0030764994705808 1.0030764994705808 0 1 0 -2.0061529989411615 0M498.1 128.1a1.4171215583264096 1.4171215583264096 0 1 0 2.8342431166528192 0a1.4171215583264096 1.4171215583264096 0 1 0 -2.8342431166528192 0M74.9 112.7a1.2819669431373168 1.2819669431373168 0 1 0 2.5639338862746337 0a1.2819669431373168 1.2819669431373168 0 1 0 -2.5639338862746337 0M40.9 114.4a1.3812221381172745 1.3812221381172745 0 1 0 2.762444276234549 0a1.3812221381172745 1.3812221381172745 0 1 0 -2.762444276234549 0M104.8 122.6a1.2860816334710286 1.2860816334710286 0 1 0 2.572163266942057 0a1.2860816334710286 1.2860816334710286 0 1 0 -2.572163266942057 0M473.0 107.6a1.0484826208543803 1.0484826208543803 0 1 0 2.0969652417087605 0a1.0484826208543803 1.0484826208543803 0 1 0 -2.0969652417087605 0M63.2 119.2a1.660881332690717 1.660881332690717 0 1 0 3.321762665381434 0a1.660881332690717 1.660881332690717 0 1 0 -3.321762665381434 0M440.2 131.1a1.6644875499089133 1.6644875499089133 0 1 0 3.3289750998178267 0a1.6644875499089133 1.6644875499089133 0 1 0 -3.3289750998178267 0M215.0 121.5a1.294122629094983 1.294122629094983 0 1 0 2.588245258189966 0a1.294122629094983 1.294122629094983 0 1 0 -2.588245258189966 0M508.0 134.2a1.0786093616193249 1.0786093616193249 0 1 0 2.1572187232386497 0a1.0786093616193249 1.0786093616193249 0 1 0 -2.1572187232386497 0M250.4 124.9a1.039606793494529 1.039606793494529 0 1 0 2.079213586989058 0a1.039606793494529 1.039606793494529 0 1 0 -2.079213586989058 0M548.6 135.3a1.154189863572074 1.154189863572074 0 1 0 2.308379727144148 0a1.154189863572074 1.154189863572074 0 1 0 -2.308379727144148 0M80.0 127.6a1.6935029175537666 1.6935029175537666 0 1 0 3.387005835107533 0a1.6935029175537666 1.6935029175537666 0 1 0 -3.387005835107533 0M29.6 121.9a1.0992415097535042 1.0992415097535042 0 1 0 2.1984830195070084 0a1.0992415097535042 1.0992415097535042 0 1 0 -2.1984830195070084 0M455.8 136.3a1.200090295309285 1.200090295309285 0 1 0 2.40018059061857 0a1.200090295309285 1.200090295309285 0 1 0 -2.40018059061857 0M118.3 114.0a1.0679372586476963 1.0679372586476963 0 1 0 2.1358745172953926 0a1.0679372586476963 1.0679372586476963 0 1 0 -2.1358745172953926 0M120.7 118.6a1.6816943446003778 1.6816943446003778 0 1 0 3.3633886892007556 0a1.6816943446003778 1.6816943446003778 0 1 0 -3.3633886892007556 0M288.5 127.2a1.243322246748323 1.243322246748323 0 1 0 2.486644493496646 0a1.243322246748323 1.243322246748323 0 1 0 -2.486644493496646 0M117.2 108.4a1.693758227344377 1.693758227344377 0 1 0 3.387516454688754 0a1.693758227344377 1.693758227344377 0 1 0 -3.387516454688754 0M100.1 127.5a1.349420540639591 1.349420540639591 0 1 0 2.698841081279182 0a1.349420540639591 1.349420540639591 0 1 0 -2.698841081279182 0M346.0 132.1a1.4414314682981293 1.4414314682981293 0 1 0 2.8828629365962586 0a1.4414314682981293 1.4414314682981293 0 1 0 -2.8828629365962586 0M445.2 124.7a1.4538323591964621 1.4538323591964621 0 1 0 2.9076647183929243 0a1.4538323591964621 1.4538323591964621 0 1 0 -2.9076647183929243 0M306.6 130.2a1.5659069814401745 1.5659069814401745 0 1 0 3.131813962880349 0a1.5659069814401745 1.5659069814401745 0 1 0 -3.131813962880349 0M259.0 116.5a1.0464299946524482 1.0464299946524482 0 1 0 2.0928599893048965 0a1.0464299946524482 1.0464299946524482 0 1 0 -2.0928599893048965 0M453.2 129.9a1.4060256833732367 1.4060256833732367 0 1 0 2.8120513667464735 0a1.4060256833732367 1.4060256833732367 0 1 0 -2.8120513667464735 0M394.7 128.2a1.3875860304921734 1.3875860304921734 0 1 0 2.775172060984347 0a1.3875860304921734 1.3875860304921734 0 1 0 -2.775172060984347 0M538.6 124.7a1.1079672722685778 1.1079672722685778 0 1 0 2.2159345445371557 0a1.1079672722685778 1.1079672722685778 0 1 0 -2.2159345445371557 0M186.4 131.0a1.6755616130545379 1.6755616130545379 0 1 0 3.3511232261090758 0a1.6755616130545379 1.6755616130545379 0 1 0 -3.3511232261090758 0M153.8 117.2a1.6574092655045998 1.6574092655045998 0 1 0 3.3148185310091995 0a1.6574092655045998 1.6574092655045998 0 1 0 -3.3148185310091995 0M242.1 117.5a1.594097026664854 1.594097026664854 0 1 0 3.188194053329708 0a1.594097026664854 1.594097026664854 0 1 0 -3.188194053329708 0M173.4 119.7a1.2668292243656043 1.2668292243656043 0 1 0 2.5336584487312086 0a1.2668292243656043 1.2668292243656043 0 1 0 -2.5336584487312086 0M336.5 116.2a1.4226873703046583 1.4226873703046583 0 1 0 2.8453747406093166 0a1.4226873703046583 1.4226873703046583 0 1 0 -2.8453747406093166 0M420.2 112.7a1.4905709203710509 1.4905709203710509 0 1 0 2.9811418407421018 0a1.4905709203710509 1.4905709203710509 0 1 0 -2.9811418407421018 0M357.2 117.4a1.4100086120050481 1.4100086120050481 0 1 0 2.8200172240100962 0a1.4100086120050481 1.4100086120050481 0 1 0 -2.8200172240100962 0M193.9 108.4a1.0197389631715965 1.0197389631715965 0 1 0 2.039477926343193 0a1.0197389631715965 1.0197389631715965 0 1 0 -2.039477926343193 0M534.0 121.8a1.2453444016122672 1.2453444016122672 0 1 0 2.4906888032245345 0a1.2453444016122672 1.2453444016122672 0 1 0 -2.4906888032245345 0M417.8 128.3a1.4298269966895012 1.4298269966895012 0 1 0 2.8596539933790024 0a1.4298269966895012 1.4298269966895012 0 1 0 -2.8596539933790024 0M106.3 109.8a1.2597340645359214 1.2597340645359214 0 1 0 2.519468129071843 0a1.2597340645359214 1.2597340645359214 0 1 0 -2.519468129071843 0M143.5 130.3a1.4124670163844404 1.4124670163844404 0 1 0 2.8249340327688808 0a1.4124670163844404 1.4124670163844404 0 1 0 -2.8249340327688808 0M208.0 126.7a1.16356600878161 1.16356600878161 0 1 0 2.32713201756322 0a1.16356600878161 1.16356600878161 0 1 0 -2.32713201756322 0M146.4 123.6a1.195130591462488 1.195130591462488 0 1 0 2.390261182924976 0a1.195130591462488 1.195130591462488 0 1 0 -2.390261182924976 0M73.0 104.5a1.562621189013702 1.562621189013702 0 1 0 3.125242378027404 0a1.562621189013702 1.562621189013702 0 1 0 -3.125242378027404 0M317.8 122.3a1.1282345730608652 1.1282345730608652 0 1 0 2.2564691461217303 0a1.1282345730608652 1.1282345730608652 0 1 0 -2.2564691461217303 0M522.5 130.6a1.6703656141370216 1.6703656141370216 0 1 0 3.340731228274043 0a1.6703656141370216 1.6703656141370216 0 1 0 -3.340731228274043 0M286.7 117.5a1.5385196123630922 1.5385196123630922 0 1 0 3.0770392247261844 0a1.5385196123630922 1.5385196123630922 0 1 0 -3.0770392247261844 0M492.3 114.1a1.3349187663615856 1.3349187663615856 0 1 0 2.669837532723171 0a1.3349187663615856 1.3349187663615856 0 1 0 -2.669837532723171 0M244.0 130.0a1.361554142284723 1.361554142284723 0 1 0 2.723108284569446 0a1.361554142284723 1.361554142284723 0 1 0 -2.723108284569446 0M524.6 130.2a1.1274898668075817 1.1274898668075817 0 1 0 2.2549797336151634 0a1.1274898668075817 1.1274898668075817 0 1 0 -2.2549797336151634 0M43.8 136.0a1.4146744792020642 1.4146744792020642 0 1 0 2.8293489584041285 0a1.4146744792020642 1.4146744792020642 0 1 0 -2.8293489584041285 0M208.2 124.8a1.6640599387363157 1.6640599387363157 0 1 0 3.3281198774726315 0a1.6640599387363157 1.6640599387363157 0 1 0 -3.3281198774726315 0M70.0 128.1a1.094014796329676 1.094014796329676 0 1 0 2.188029592659352 0a1.094014796329676 1.094014796329676 0 1 0 -2.188029592659352 0M187.1 125.5a1.485314512378829 1.485314512378829 0 1 0 2.970629024757658 0a1.485314512378829 1.485314512378829 0 1 0 -2.970629024757658 0M244.8 105.1a1.601683902835179 1.601683902835179 0 1 0 3.203367805670358 0a1.601683902835179 1.601683902835179 0 1 0 -3.203367805670358 0M261.2 125.0a1.032716325654384 1.032716325654384 0 1 0 2.065432651308768 0a1.032716325654384 1.032716325654384 0 1 0 -2.065432651308768 0M308.7 127.8a1.6155811505537305 1.6155811505537305 0 1 0 3.231162301107461 0a1.6155811505537305 1.6155811505537305 0 1 0 -3.231162301107461 0M83.0 115.8a1.2472220476690885 1.2472220476690885 0 1 0 2.494444095338177 0a1.2472220476690885 1.2472220476690885 0 1 0 -2.494444095338177 0M462.6 125.1a1.3395773847956 1.3395773847956 0 1 0 2.6791547695912 0a1.3395773847956 1.3395773847956 0 1 0 -2.6791547695912 0M164.4 114.4a1.2000666362699741 1.2000666362699741 0 1 0 2.4001332725399482 0a1.2000666362699741 1.2000666362699741 0 1 0 -2.4001332725399482 0M352.8 118.2a1.5260903669298536 1.5260903669298536 0 1 0 3.052180733859707 0a1.5260903669298536 1.5260903669298536 0 1 0 -3.052180733859707 0M260.4 113.6a1.3347308986212414 1.3347308986212414 0 1 0 2.669461797242483 0a1.3347308986212414 1.3347308986212414 0 1 0 -2.669461797242483 0M510.1 112.9a1.4591123437593805 1.4591123437593805 0 1 0 2.918224687518761 0a1.4591123437593805 1.4591123437593805 0 1 0 -2.918224687518761 0M182.8 123.4a1.4983760218586548 1.4983760218586548 0 1 0 2.9967520437173096 0a1.4983760218586548 1.4983760218586548 0 1 0 -2.9967520437173096 0M31.4 109.7a1.1027441793146955 1.1027441793146955 0 1 0 2.205488358629391 0a1.1027441793146955 1.1027441793146955 0 1 0 -2.205488358629391 0M509.3 115.1a1.6166053641276483 1.6166053641276483 0 1 0 3.2332107282552967 0a1.6166053641276483 1.6166053641276483 0 1 0 -3.2332107282552967 0M404.5 119.0a1.476933691629147 1.476933691629147 0 1 0 2.953867383258294 0a1.476933691629147 1.476933691629147 0 1 0 -2.953867383258294 0M123.2 125.1a1.6067447471029541 1.6067447471029541 0 1 0 3.2134894942059082 0a1.6067447471029541 1.6067447471029541 0 1 0 -3.2134894942059082 0M539.1 129.1a1.0494393190363789 1.0494393190363789 0 1 0 2.0988786380727578 0a1.0494393190363789 1.0494393190363789 0 1 0 -2.0988786380727578 0M47.2 124.7a1.535017498568648 1.535017498568648 0 1 0 3.070034997137296 0a1.535017498568648 1.535017498568648 0 1 0 -3.070034997137296 0M445.8 122.5a1.1333557374154737 1.1333557374154737 0 1 0 2.2667114748309474 0a1.1333557374154737 1.1333557374154737 0 1 0 -2.2667114748309474 0M500.8 117.5a1.1803465919851759 1.1803465919851759 0 1 0 2.3606931839703518 0a1.1803465919851759 1.1803465919851759 0 1 0 -2.3606931839703518 0M92.9 114.6a1.3426998303669504 1.3426998303669504 0 1 0 2.685399660733901 0a1.3426998303669504 1.3426998303669504 0 1 0 -2.685399660733901 0M147.9 132.4a1.3319974698889978 1.3319974698889978 0 1 0 2.6639949397779956 0a1.3319974698889978 1.3319974698889978 0 1 0 -2.6639949397779956 0M167.8 115.3a1.2292620928764921 1.2292620928764921 0 1 0 2.4585241857529843 0a1.2292620928764921 1.2292620928764921 0 1 0 -2.4585241857529843 0M343.7 106.4a1.397864842599132 1.397864842599132 0 1 0 2.795729685198264 0a1.397864842599132 1.397864842599132 0 1 0 -2.795729685198264 0M426.2 102.9a1.6159099040235483 1.6159099040235483 0 1 0 3.2318198080470966 0a1.6159099040235483 1.6159099040235483 0 1 0 -3.2318198080470966 0M569.0 113.7a1.2887728891230867 1.2887728891230867 0 1 0 2.5775457782461735 0a1.2887728891230867 1.2887728891230867 0 1 0 -2.5775457782461735 0M264.6 134.8a1.1267229562874166 1.1267229562874166 0 1 0 2.253445912574833 0a1.1267229562874166 1.1267229562874166 0 1 0 -2.253445912574833 0M363.2 132.0a1.1037235218134929 1.1037235218134929 0 1 0 2.2074470436269857 0a1.1037235218134929 1.1037235218134929 0 1 0 -2.2074470436269857 0M245.0 116.4a1.5930308267874929 1.5930308267874929 0 1 0 3.1860616535749857 0a1.5930308267874929 1.5930308267874929 0 1 0 -3.1860616535749857 0M391.0 115.2a1.5588023976970486 1.5588023976970486 0 1 0 3.1176047953940973 0a1.5588023976970486 1.5588023976970486 0 1 0 -3.1176047953940973 0M486.5 123.5a1.5223806545346794 1.5223806545346794 0 1 0 3.044761309069359 0a1.5223806545346794 1.5223806545346794 0 1 0 -3.044761309069359 0M222.0 122.0a1.548695620008461 1.548695620008461 0 1 0 3.097391240016922 0a1.548695620008461 1.548695620008461 0 1 0 -3.097391240016922 0M125.8 111.1a1.0758356102982867 1.0758356102982867 0 1 0 2.1516712205965733 0a1.0758356102982867 1.0758356102982867 0 1 0 -2.1516712205965733 0M469.2 107.8a1.0581364981905896 1.0581364981905896 0 1 0 2.1162729963811793 0a1.0581364981905896 1.0581364981905896 0 1 0 -2.1162729963811793 0M493.3 115.5a1.1179202437102052 1.1179202437102052 0 1 0 2.2358404874204103 0a1.1179202437102052 1.1179202437102052 0 1 0 -2.2358404874204103 0M170.7 132.8a1.5043647974304526 1.5043647974304526 0 1 0 3.008729594860905 0a1.5043647974304526 1.5043647974304526 0 1 0 -3.008729594860905 0M461.3 112.9a1.216977289427982 1.216977289427982 0 1 0 2.433954578855964 0a1.216977289427982 1.216977289427982 0 1 0 -2.433954578855964 0M366.6 131.0a1.2946316211434374 1.2946316211434374 0 1 0 2.589263242286875 0a1.2946316211434374 1.2946316211434374 0 1 0 -2.589263242286875 0M84.2 125.2a1.0628058192905092 1.0628058192905092 0 1 0 2.1256116385810184 0a1.0628058192905092 1.0628058192905092 0 1 0 -2.1256116385810184 0M553.1 120.8a1.3380370040778415 1.3380370040778415 0 1 0 2.676074008155683 0a1.3380370040778415 1.3380370040778415 0 1 0 -2.676074008155683 0M172.6 115.0a1.4171120248894318 1.4171120248894318 0 1 0 2.8342240497788636 0a1.4171120248894318 1.4171120248894318 0 1 0 -2.8342240497788636 0M494.5 119.6a1.1497661763799993 1.1497661763799993 0 1 0 2.2995323527599987 0a1.1497661763799993 1.1497661763799993 0 1 0 -2.2995323527599987 0M508.5 113.5a1.451696361789197 1.451696361789197 0 1 0 2.903392723578394 0a1.451696361789197 1.451696361789197 0 1 0 -2.903392723578394 0M151.9 129.0a1.0186945809691164 1.0186945809691164 0 1 0 2.0373891619382327 0a1.0186945809691164 1.0186945809691164 0 1 0 -2.0373891619382327 0M492.7 125.6a1.4890389110325266 1.4890389110325266 0 1 0 2.9780778220650532 0a1.4890389110325266 1.4890389110325266 0 1 0 -2.9780778220650532 0M475.1 113.6a1.2461732294374828 1.2461732294374828 0 1 0 2.4923464588749655 0a1.2461732294374828 1.2461732294374828 0 1 0 -2.4923464588749655 0M363.3 127.9a1.5602910676601258 1.5602910676601258 0 1 0 3.1205821353202516 0a1.5602910676601258 1.5602910676601258 0 1 0 -3.1205821353202516 0M347.0 123.4a1.1455161517909878 1.1455161517909878 0 1 0 2.2910323035819755 0a1.1455161517909878 1.1455161517909878 0 1 0 -2.2910323035819755 0M485.0 115.3a1.4452964485579138 1.4452964485579138 0 1 0 2.8905928971158277 0a1.4452964485579138 1.4452964485579138 0 1 0 -2.8905928971158277 0M335.6 122.4a1.2515948031578166 1.2515948031578166 0 1 0 2.503189606315633 0a1.2515948031578166 1.2515948031578166 0 1 0 -2.503189606315633 0M457.1 113.9a1.3492688586928592 1.3492688586928592 0 1 0 2.6985377173857183 0a1.3492688586928592 1.3492688586928592 0 1 0 -2.6985377173857183 0M541.2 129.5a1.0196089300509625 1.0196089300509625 0 1 0 2.039217860101925 0a1.0196089300509625 1.0196089300509625 0 1 0 -2.039217860101925 0M467.7 118.1a1.1927533717292857 1.1927533717292857 0 1 0 2.3855067434585715 0a1.1927533717292857 1.1927533717292857 0 1 0 -2.3855067434585715 0M31.3 107.8a1.2907999953635036 1.2907999953635036 0 1 0 2.5815999907270073 0a1.2907999953635036 1.2907999953635036 0 1 0 -2.5815999907270073 0M85.4 119.8a1.3141826256310405 1.3141826256310405 0 1 0 2.628365251262081 0a1.3141826256310405 1.3141826256310405 0 1 0 -2.628365251262081 0M312.5 114.8a1.0070652722912516 1.0070652722912516 0 1 0 2.0141305445825033 0a1.0070652722912516 1.0070652722912516 0 1 0 -2.0141305445825033 0M373.4 116.4a1.2227496354121246 1.2227496354121246 0 1 0 2.445499270824249 0a1.2227496354121246 1.2227496354121246 0 1 0 -2.445499270824249 0M145.8 126.2a1.2228202458217927 1.2228202458217927 0 1 0 2.4456404916435854 0a1.2228202458217927 1.2228202458217927 0 1 0 -2.4456404916435854 0M524.1 120.3a1.2091696930203304 1.2091696930203304 0 1 0 2.418339386040661 0a1.2091696930203304 1.2091696930203304 0 1 0 -2.418339386040661 0M116.1 123.8a1.319700797153358 1.319700797153358 0 1 0 2.639401594306716 0a1.319700797153358 1.319700797153358 0 1 0 -2.639401594306716 0M35.6 115.6a1.2264109100461107 1.2264109100461107 0 1 0 2.4528218200922214 0a1.2264109100461107 1.2264109100461107 0 1 0 -2.4528218200922214 0M94.9 123.5a1.5721645228771162 1.5721645228771162 0 1 0 3.1443290457542323 0a1.5721645228771162 1.5721645228771162 0 1 0 -3.1443290457542323 0M391.1 137.4a1.5111560089151896 1.5111560089151896 0 1 0 3.0223120178303793 0a1.5111560089151896 1.5111560089151896 0 1 0 -3.0223120178303793 0M492.3 114.2a1.2233126802587069 1.2233126802587069 0 1 0 2.4466253605174137 0a1.2233126802587069 1.2233126802587069 0 1 0 -2.4466253605174137 0M427.8 115.7a1.3838037975447288 1.3838037975447288 0 1 0 2.7676075950894576 0a1.3838037975447288 1.3838037975447288 0 1 0 -2.7676075950894576 0M96.8 116.1a1.4425509024807726 1.4425509024807726 0 1 0 2.885101804961545 0a1.4425509024807726 1.4425509024807726 0 1 0 -2.885101804961545 0M379.0 102.5a1.1111714576009395 1.1111714576009395 0 1 0 2.222342915201879 0a1.1111714576009395 1.1111714576009395 0 1 0 -2.222342915201879 0M149.8 114.0a1.5366028872659456 1.5366028872659456 0 1 0 3.0732057745318913 0a1.5366028872659456 1.5366028872659456 0 1 0 -3.0732057745318913 0M481.0 118.1a1.417561255551466 1.417561255551466 0 1 0 2.835122511102932 0a1.417561255551466 1.417561255551466 0 1 0 -2.835122511102932 0M378.3 105.2a1.0159702188949755 1.0159702188949755 0 1 0 2.031940437789951 0a1.0159702188949755 1.0159702188949755 0 1 0 -2.031940437789951 0M268.7 120.3a1.372614458596906 1.372614458596906 0 1 0 2.745228917193812 0a1.372614458596906 1.372614458596906 0 1 0 -2.745228917193812 0M284.0 115.9a1.3904994513751001 1.3904994513751001 0 1 0 2.7809989027502002 0a1.3904994513751001 1.3904994513751001 0 1 0 -2.7809989027502002 0M512.0 102.1a1.1141266336796123 1.1141266336796123 0 1 0 2.2282532673592246 0a1.1141266336796123 1.1141266336796123 0 1 0 -2.2282532673592246 0M125.0 116.9a1.214156026080396 1.214156026080396 0 1 0 2.428312052160792 0a1.214156026080396 1.214156026080396 0 1 0 -2.428312052160792 0M509.0 109.7a1.1198508476557683 1.1198508476557683 0 1 0 2.2397016953115365 0a1.1198508476557683 1.1198508476557683 0 1 0 -2.2397016953115365 0M363.1 116.4a1.5361082023811603 1.5361082023811603 0 1 0 3.0722164047623206 0a1.5361082023811603 1.5361082023811603 0 1 0 -3.0722164047623206 0M547.7 109.8a1.4535260469685551 1.4535260469685551 0 1 0 2.9070520939371103 0a1.4535260469685551 1.4535260469685551 0 1 0 -2.9070520939371103 0M114.1 120.8a1.1071644272721972 1.1071644272721972 0 1 0 2.2143288545443944 0a1.1071644272721972 1.1071644272721972 0 1 0 -2.2143288545443944 0M36.2 135.9a1.5841837839076143 1.5841837839076143 0 1 0 3.1683675678152285 0a1.5841837839076143 1.5841837839076143 0 1 0 -3.1683675678152285 0M164.1 112.6a1.390618156958947 1.390618156958947 0 1 0 2.781236313917894 0a1.390618156958947 1.390618156958947 0 1 0 -2.781236313917894 0M430.5 137.6a1.138331543829601 1.138331543829601 0 1 0 2.276663087659202 0a1.138331543829601 1.138331543829601 0 1 0 -2.276663087659202 0M211.8 126.7a1.3177041661624835 1.3177041661624835 0 1 0 2.635408332324967 0a1.3177041661624835 1.3177041661624835 0 1 0 -2.635408332324967 0M68.3 125.1a1.6048228271350475 1.6048228271350475 0 1 0 3.209645654270095 0a1.6048228271350475 1.6048228271350475 0 1 0 -3.209645654270095 0M460.0 129.3a1.0746679326283446 1.0746679326283446 0 1 0 2.149335865256689 0a1.0746679326283446 1.0746679326283446 0 1 0 -2.149335865256689 0M449.2 116.8a1.5026468177816334 1.5026468177816334 0 1 0 3.005293635563267 0a1.5026468177816334 1.5026468177816334 0 1 0 -3.005293635563267 0M325.8 122.4a1.415706456560368 1.415706456560368 0 1 0 2.831412913120736 0a1.415706456560368 1.415706456560368 0 1 0 -2.831412913120736 0M87.7 132.8a1.1990664112838605 1.1990664112838605 0 1 0 2.398132822567721 0a1.1990664112838605 1.1990664112838605 0 1 0 -2.398132822567721 0M344.5 117.6a1.4801121324115545 1.4801121324115545 0 1 0 2.960224264823109 0a1.4801121324115545 1.4801121324115545 0 1 0 -2.960224264823109 0M294.1 105.0a1.671943146802432 1.671943146802432 0 1 0 3.343886293604864 0a1.671943146802432 1.671943146802432 0 1 0 -3.343886293604864 0M219.9 130.8a1.2320159744769483 1.2320159744769483 0 1 0 2.4640319489538967 0a1.2320159744769483 1.2320159744769483 0 1 0 -2.4640319489538967 0M409.7 127.5a1.0757976079134248 1.0757976079134248 0 1 0 2.1515952158268496 0a1.0757976079134248 1.0757976079134248 0 1 0 -2.1515952158268496 0M516.3 131.4a1.5855948228720527 1.5855948228720527 0 1 0 3.1711896457441053 0a1.5855948228720527 1.5855948228720527 0 1 0 -3.1711896457441053 0M98.1 122.0a1.5682036016305942 1.5682036016305942 0 1 0 3.1364072032611885 0a1.5682036016305942 1.5682036016305942 0 1 0 -3.1364072032611885 0M335.6 110.7a1.6643326745036362 1.6643326745036362 0 1 0 3.3286653490072724 0a1.6643326745036362 1.6643326745036362 0 1 0 -3.3286653490072724 0M368.3 127.9a1.1065610096385339 1.1065610096385339 0 1 0 2.2131220192770678 0a1.1065610096385339 1.1065610096385339 0 1 0 -2.2131220192770678 0M314.8 115.6a1.4173264550206497 1.4173264550206497 0 1 0 2.8346529100412994 0a1.4173264550206497 1.4173264550206497 0 1 0 -2.8346529100412994 0M31.0 118.5a1.417678220819382 1.417678220819382 0 1 0 2.835356441638764 0a1.417678220819382 1.417678220819382 0 1 0 -2.835356441638764 0M273.4 127.1a1.6164044898156118 1.6164044898156118 0 1 0 3.2328089796312236 0a1.6164044898156118 1.6164044898156118 0 1 0 -3.2328089796312236 0M500.8 119.4a1.459995534699406 1.459995534699406 0 1 0 2.919991069398812 0a1.459995534699406 1.459995534699406 0 1 0 -2.919991069398812 0M294.7 110.6a1.3410138974348214 1.3410138974348214 0 1 0 2.6820277948696427 0a1.3410138974348214 1.3410138974348214 0 1 0 -2.6820277948696427 0M431.3 106.2a1.2378790346327042 1.2378790346327042 0 1 0 2.4757580692654084 0a1.2378790346327042 1.2378790346327042 0 1 0 -2.4757580692654084 0M285.1 133.3a1.661108145174671 1.661108145174671 0 1 0 3.322216290349342 0a1.661108145174671 1.661108145174671 0 1 0 -3.322216290349342 0M139.0 121.6a1.3579615499898434 1.3579615499898434 0 1 0 2.715923099979687 0a1.3579615499898434 1.3579615499898434 0 1 0 -2.715923099979687 0M384.1 107.2a1.18065848860951 1.18065848860951 0 1 0 2.36131697721902 0a1.18065848860951 1.18065848860951 0 1 0 -2.36131697721902 0M358.9 120.0a1.1227082759353408 1.1227082759353408 0 1 0 2.2454165518706817 0a1.1227082759353408 1.1227082759353408 0 1 0 -2.2454165518706817 0M149.1 124.2a1.6403898020185435 1.6403898020185435 0 1 0 3.280779604037087 0a1.6403898020185435 1.6403898020185435 0 1 0 -3.280779604037087 0M439.9 137.6a1.038886974182806 1.038886974182806 0 1 0 2.077773948365612 0a1.038886974182806 1.038886974182806 0 1 0 -2.077773948365612 0M394.5 134.1a1.3960197168830966 1.3960197168830966 0 1 0 2.792039433766193 0a1.3960197168830966 1.3960197168830966 0 1 0 -2.792039433766193 0M262.4 117.3a1.3394851180626872 1.3394851180626872 0 1 0 2.6789702361253744 0a1.3394851180626872 1.3394851180626872 0 1 0 -2.6789702361253744 0M47.2 121.4a1.2792399935696646 1.2792399935696646 0 1 0 2.558479987139329 0a1.2792399935696646 1.2792399935696646 0 1 0 -2.558479987139329 0M327.2 127.7a1.268264376761638 1.268264376761638 0 1 0 2.536528753523276 0a1.268264376761638 1.268264376761638 0 1 0 -2.536528753523276 0M41.7 121.1a1.3617931047098646 1.3617931047098646 0 1 0 2.723586209419729 0a1.3617931047098646 1.3617931047098646 0 1 0 -2.723586209419729 0M381.8 117.7a1.123909515397539 1.123909515397539 0 1 0 2.247819030795078 0a1.123909515397539 1.123909515397539 0 1 0 -2.247819030795078 0M63.1 137.6a1.6405081741423422 1.6405081741423422 0 1 0 3.2810163482846844 0a1.6405081741423422 1.6405081741423422 0 1 0 -3.2810163482846844 0M354.0 122.5a1.0741206604746363 1.0741206604746363 0 1 0 2.1482413209492726 0a1.0741206604746363 1.0741206604746363 0 1 0 -2.1482413209492726 0M373.1 110.1a1.5028945274212346 1.5028945274212346 0 1 0 3.0057890548424693 0a1.5028945274212346 1.5028945274212346 0 1 0 -3.0057890548424693 0M297.5 111.8a1.1803008776440294 1.1803008776440294 0 1 0 2.3606017552880587 0a1.1803008776440294 1.1803008776440294 0 1 0 -2.3606017552880587 0M39.8 128.4a1.2637356861622404 1.2637356861622404 0 1 0 2.527471372324481 0a1.2637356861622404 1.2637356861622404 0 1 0 -2.527471372324481 0M186.3 121.1a1.5335082922908554 1.5335082922908554 0 1 0 3.067016584581711 0a1.5335082922908554 1.5335082922908554 0 1 0 -3.067016584581711 0M317.5 122.9a1.057663987910062 1.057663987910062 0 1 0 2.115327975820124 0a1.057663987910062 1.057663987910062 0 1 0 -2.115327975820124 0M305.3 114.7a1.3770858338354954 1.3770858338354954 0 1 0 2.754171667670991 0a1.3770858338354954 1.3770858338354954 0 1 0 -2.754171667670991 0M478.9 122.6a1.1444282747287566 1.1444282747287566 0 1 0 2.2888565494575133 0a1.1444282747287566 1.1444282747287566 0 1 0 -2.2888565494575133 0M419.7 119.4a1.5516739919331615 1.5516739919331615 0 1 0 3.103347983866323 0a1.5516739919331615 1.5516739919331615 0 1 0 -3.103347983866323 0M403.6 120.8a1.194621653849838 1.194621653849838 0 1 0 2.389243307699676 0a1.194621653849838 1.194621653849838 0 1 0 -2.389243307699676 0M498.0 122.6a1.0086868956765969 1.0086868956765969 0 1 0 2.0173737913531937 0a1.0086868956765969 1.0086868956765969 0 1 0 -2.0173737913531937 0M338.1 122.5a1.2261332444158692 1.2261332444158692 0 1 0 2.4522664888317385 0a1.2261332444158692 1.2261332444158692 0 1 0 -2.4522664888317385 0M276.8 133.8a1.0171932949379023 1.0171932949379023 0 1 0 2.0343865898758047 0a1.0171932949379023 1.0171932949379023 0 1 0 -2.0343865898758047 0\"/>\n  <path class=\"a3-corneum\" d=\"M24 92.1L24.0 92.1L26.0 91.0L28.0 90.2L30.0 90.0L32.0 90.2L34.0 91.0L36.0 92.1L38.0 93.5L40.0 95.1L42.0 96.9L44.0 98.5L46.0 99.9L48.0 101.0L50.0 101.8L52.0 102.0L54.0 101.8L56.0 101.0L58.0 99.9L60.0 98.5L62.0 96.9L64.0 95.1L66.0 93.5L68.0 92.1L70.0 91.0L72.0 90.2L74.0 90.0L76.0 90.2L78.0 91.0L80.0 92.1L82.0 93.5L84.0 95.1L86.0 96.9L88.0 98.5L90.0 99.9L92.0 101.0L94.0 101.8L96.0 102.0L98.0 101.8L100.0 101.0L102.0 99.9L104.0 98.5L106.0 96.9L108.0 95.1L110.0 93.5L112.0 92.1L114.0 91.0L116.0 90.2L118.0 90.0L120.0 90.2L122.0 91.0L124.0 92.1L126.0 93.5L128.0 95.1L130.0 96.9L132.0 98.5L134.0 99.9L136.0 101.0L138.0 101.8L140.0 102.0L142.0 101.8L144.0 101.0L146.0 99.9L148.0 98.5L150.0 96.9L152.0 95.1L154.0 93.5L156.0 92.1L158.0 91.0L160.0 90.2L162.0 90.0L164.0 90.2L166.0 91.0L168.0 92.1L170.0 93.5L172.0 95.1L174.0 96.9L176.0 98.5L178.0 99.9L180.0 101.0L182.0 101.8L184.0 102.0L186.0 101.8L188.0 101.0L190.0 99.9L192.0 98.5L194.0 96.9L196.0 95.1L198.0 93.5L200.0 92.1L202.0 91.0L204.0 90.2L206.0 90.0L208.0 90.2L210.0 91.0L212.0 92.1L214.0 93.5L216.0 95.1L218.0 96.9L220.0 98.5L222.0 99.9L224.0 101.0L226.0 101.8L228.0 102.0L230.0 101.8L232.0 101.0L234.0 99.9L236.0 98.5L238.0 96.9L240.0 95.1L242.0 93.5L244.0 92.1L246.0 91.0L248.0 90.2L250.0 90.0L252.0 90.2L254.0 91.0L256.0 92.1L258.0 93.5L260.0 95.1L262.0 96.9L264.0 98.5L266.0 99.9L268.0 101.0L270.0 101.8L272.0 102.0L274.0 101.8L276.0 101.0L278.0 99.9L280.0 98.5L282.0 96.9L284.0 95.1L286.0 93.5L288.0 92.1L290.0 91.0L292.0 90.2L294.0 90.0L296.0 90.2L298.0 91.0L300.0 92.1L302.0 93.5L304.0 95.1L306.0 96.9L308.0 98.5L310.0 99.9L312.0 101.0L314.0 101.8L316.0 102.0L318.0 101.8L320.0 101.0L322.0 99.9L324.0 98.5L326.0 96.9L328.0 95.1L330.0 93.5L332.0 92.1L334.0 91.0L336.0 90.2L338.0 90.0L340.0 90.2L342.0 91.0L344.0 92.1L346.0 93.5L348.0 95.1L350.0 96.9L352.0 98.5L354.0 99.9L356.0 101.0L358.0 101.8L360.0 102.0L362.0 101.8L364.0 101.0L366.0 99.9L368.0 98.5L370.0 96.9L372.0 95.1L374.0 93.5L376.0 92.1L378.0 91.0L380.0 90.2L382.0 90.0L384.0 90.2L386.0 91.0L388.0 92.1L390.0 93.5L392.0 95.1L394.0 96.9L396.0 98.5L398.0 99.9L400.0 101.0L402.0 101.8L404.0 102.0L406.0 101.8L408.0 101.0L410.0 99.9L412.0 98.5L414.0 96.9L416.0 95.1L418.0 93.5L420.0 92.1L422.0 91.0L424.0 90.2L426.0 90.0L428.0 90.2L430.0 91.0L432.0 92.1L434.0 93.5L436.0 95.1L438.0 96.9L440.0 98.5L442.0 99.9L444.0 101.0L446.0 101.8L448.0 102.0L450.0 101.8L452.0 101.0L454.0 99.9L456.0 98.5L458.0 96.9L460.0 95.1L462.0 93.5L464.0 92.1L466.0 91.0L468.0 90.2L470.0 90.0L472.0 90.2L474.0 91.0L476.0 92.1L478.0 93.5L480.0 95.1L482.0 96.9L484.0 98.5L486.0 99.9L488.0 101.0L490.0 101.8L492.0 102.0L494.0 101.8L496.0 101.0L498.0 99.9L500.0 98.5L502.0 96.9L504.0 95.1L506.0 93.5L508.0 92.1L510.0 91.0L512.0 90.2L514.0 90.0L516.0 90.2L518.0 91.0L520.0 92.1L522.0 93.5L524.0 95.1L526.0 96.9L528.0 98.5L530.0 99.9L532.0 101.0L534.0 101.8L536.0 102.0L538.0 101.8L540.0 101.0L542.0 99.9L544.0 98.5L546.0 96.9L548.0 95.1L550.0 93.5L552.0 92.1L554.0 91.0L556.0 90.2L558.0 90.0L560.0 90.2L562.0 91.0L564.0 92.1L566.0 93.5L568.0 95.1L570.0 96.9L572.0 98.5L574.0 99.9L576.0 101.0L576.0 110.0L574.0 108.9L572.0 107.5L570.0 105.9L568.0 104.1L566.0 102.5L564.0 101.1L562.0 100.0L560.0 99.2L558.0 99.0L556.0 99.2L554.0 100.0L552.0 101.1L550.0 102.5L548.0 104.1L546.0 105.9L544.0 107.5L542.0 108.9L540.0 110.0L538.0 110.8L536.0 111.0L534.0 110.8L532.0 110.0L530.0 108.9L528.0 107.5L526.0 105.9L524.0 104.1L522.0 102.5L520.0 101.1L518.0 100.0L516.0 99.2L514.0 99.0L512.0 99.2L510.0 100.0L508.0 101.1L506.0 102.5L504.0 104.1L502.0 105.9L500.0 107.5L498.0 108.9L496.0 110.0L494.0 110.8L492.0 111.0L490.0 110.8L488.0 110.0L486.0 108.9L484.0 107.5L482.0 105.9L480.0 104.1L478.0 102.5L476.0 101.1L474.0 100.0L472.0 99.2L470.0 99.0L468.0 99.2L466.0 100.0L464.0 101.1L462.0 102.5L460.0 104.1L458.0 105.9L456.0 107.5L454.0 108.9L452.0 110.0L450.0 110.8L448.0 111.0L446.0 110.8L444.0 110.0L442.0 108.9L440.0 107.5L438.0 105.9L436.0 104.1L434.0 102.5L432.0 101.1L430.0 100.0L428.0 99.2L426.0 99.0L424.0 99.2L422.0 100.0L420.0 101.1L418.0 102.5L416.0 104.1L414.0 105.9L412.0 107.5L410.0 108.9L408.0 110.0L406.0 110.8L404.0 111.0L402.0 110.8L400.0 110.0L398.0 108.9L396.0 107.5L394.0 105.9L392.0 104.1L390.0 102.5L388.0 101.1L386.0 100.0L384.0 99.2L382.0 99.0L380.0 99.2L378.0 100.0L376.0 101.1L374.0 102.5L372.0 104.1L370.0 105.9L368.0 107.5L366.0 108.9L364.0 110.0L362.0 110.8L360.0 111.0L358.0 110.8L356.0 110.0L354.0 108.9L352.0 107.5L350.0 105.9L348.0 104.1L346.0 102.5L344.0 101.1L342.0 100.0L340.0 99.2L338.0 99.0L336.0 99.2L334.0 100.0L332.0 101.1L330.0 102.5L328.0 104.1L326.0 105.9L324.0 107.5L322.0 108.9L320.0 110.0L318.0 110.8L316.0 111.0L314.0 110.8L312.0 110.0L310.0 108.9L308.0 107.5L306.0 105.9L304.0 104.1L302.0 102.5L300.0 101.1L298.0 100.0L296.0 99.2L294.0 99.0L292.0 99.2L290.0 100.0L288.0 101.1L286.0 102.5L284.0 104.1L282.0 105.9L280.0 107.5L278.0 108.9L276.0 110.0L274.0 110.8L272.0 111.0L270.0 110.8L268.0 110.0L266.0 108.9L264.0 107.5L262.0 105.9L260.0 104.1L258.0 102.5L256.0 101.1L254.0 100.0L252.0 99.2L250.0 99.0L248.0 99.2L246.0 100.0L244.0 101.1L242.0 102.5L240.0 104.1L238.0 105.9L236.0 107.5L234.0 108.9L232.0 110.0L230.0 110.8L228.0 111.0L226.0 110.8L224.0 110.0L222.0 108.9L220.0 107.5L218.0 105.9L216.0 104.1L214.0 102.5L212.0 101.1L210.0 100.0L208.0 99.2L206.0 99.0L204.0 99.2L202.0 100.0L200.0 101.1L198.0 102.5L196.0 104.1L194.0 105.9L192.0 107.5L190.0 108.9L188.0 110.0L186.0 110.8L184.0 111.0L182.0 110.8L180.0 110.0L178.0 108.9L176.0 107.5L174.0 105.9L172.0 104.1L170.0 102.5L168.0 101.1L166.0 100.0L164.0 99.2L162.0 99.0L160.0 99.2L158.0 100.0L156.0 101.1L154.0 102.5L152.0 104.1L150.0 105.9L148.0 107.5L146.0 108.9L144.0 110.0L142.0 110.8L140.0 111.0L138.0 110.8L136.0 110.0L134.0 108.9L132.0 107.5L130.0 105.9L128.0 104.1L126.0 102.5L124.0 101.1L122.0 100.0L120.0 99.2L118.0 99.0L116.0 99.2L114.0 100.0L112.0 101.1L110.0 102.5L108.0 104.1L106.0 105.9L104.0 107.5L102.0 108.9L100.0 110.0L98.0 110.8L96.0 111.0L94.0 110.8L92.0 110.0L90.0 108.9L88.0 107.5L86.0 105.9L84.0 104.1L82.0 102.5L80.0 101.1L78.0 100.0L76.0 99.2L74.0 99.0L72.0 99.2L70.0 100.0L68.0 101.1L66.0 102.5L64.0 104.1L62.0 105.9L60.0 107.5L58.0 108.9L56.0 110.0L54.0 110.8L52.0 111.0L50.0 110.8L48.0 110.0L46.0 108.9L44.0 107.5L42.0 105.9L40.0 104.1L38.0 102.5L36.0 101.1L34.0 100.0L32.0 99.2L30.0 99.0L28.0 99.2L26.0 100.0L24.0 101.1Z\"/>\n  <path data-part=\"warm\" class=\"a3-warmth\" d=\"M24 92.1L24.0 92.1L26.0 91.0L28.0 90.2L30.0 90.0L32.0 90.2L34.0 91.0L36.0 92.1L38.0 93.5L40.0 95.1L42.0 96.9L44.0 98.5L46.0 99.9L48.0 101.0L50.0 101.8L52.0 102.0L54.0 101.8L56.0 101.0L58.0 99.9L60.0 98.5L62.0 96.9L64.0 95.1L66.0 93.5L68.0 92.1L70.0 91.0L72.0 90.2L74.0 90.0L76.0 90.2L78.0 91.0L80.0 92.1L82.0 93.5L84.0 95.1L86.0 96.9L88.0 98.5L90.0 99.9L92.0 101.0L94.0 101.8L96.0 102.0L98.0 101.8L100.0 101.0L102.0 99.9L104.0 98.5L106.0 96.9L108.0 95.1L110.0 93.5L112.0 92.1L114.0 91.0L116.0 90.2L118.0 90.0L120.0 90.2L122.0 91.0L124.0 92.1L126.0 93.5L128.0 95.1L130.0 96.9L132.0 98.5L134.0 99.9L136.0 101.0L138.0 101.8L140.0 102.0L142.0 101.8L144.0 101.0L146.0 99.9L148.0 98.5L150.0 96.9L152.0 95.1L154.0 93.5L156.0 92.1L158.0 91.0L160.0 90.2L162.0 90.0L164.0 90.2L166.0 91.0L168.0 92.1L170.0 93.5L172.0 95.1L174.0 96.9L176.0 98.5L178.0 99.9L180.0 101.0L182.0 101.8L184.0 102.0L186.0 101.8L188.0 101.0L190.0 99.9L192.0 98.5L194.0 96.9L196.0 95.1L198.0 93.5L200.0 92.1L202.0 91.0L204.0 90.2L206.0 90.0L208.0 90.2L210.0 91.0L212.0 92.1L214.0 93.5L216.0 95.1L218.0 96.9L220.0 98.5L222.0 99.9L224.0 101.0L226.0 101.8L228.0 102.0L230.0 101.8L232.0 101.0L234.0 99.9L236.0 98.5L238.0 96.9L240.0 95.1L242.0 93.5L244.0 92.1L246.0 91.0L248.0 90.2L250.0 90.0L252.0 90.2L254.0 91.0L256.0 92.1L258.0 93.5L260.0 95.1L262.0 96.9L264.0 98.5L266.0 99.9L268.0 101.0L270.0 101.8L272.0 102.0L274.0 101.8L276.0 101.0L278.0 99.9L280.0 98.5L282.0 96.9L284.0 95.1L286.0 93.5L288.0 92.1L290.0 91.0L292.0 90.2L294.0 90.0L296.0 90.2L298.0 91.0L300.0 92.1L302.0 93.5L304.0 95.1L306.0 96.9L308.0 98.5L310.0 99.9L312.0 101.0L314.0 101.8L316.0 102.0L318.0 101.8L320.0 101.0L322.0 99.9L324.0 98.5L326.0 96.9L328.0 95.1L330.0 93.5L332.0 92.1L334.0 91.0L336.0 90.2L338.0 90.0L340.0 90.2L342.0 91.0L344.0 92.1L346.0 93.5L348.0 95.1L350.0 96.9L352.0 98.5L354.0 99.9L356.0 101.0L358.0 101.8L360.0 102.0L362.0 101.8L364.0 101.0L366.0 99.9L368.0 98.5L370.0 96.9L372.0 95.1L374.0 93.5L376.0 92.1L378.0 91.0L380.0 90.2L382.0 90.0L384.0 90.2L386.0 91.0L388.0 92.1L390.0 93.5L392.0 95.1L394.0 96.9L396.0 98.5L398.0 99.9L400.0 101.0L402.0 101.8L404.0 102.0L406.0 101.8L408.0 101.0L410.0 99.9L412.0 98.5L414.0 96.9L416.0 95.1L418.0 93.5L420.0 92.1L422.0 91.0L424.0 90.2L426.0 90.0L428.0 90.2L430.0 91.0L432.0 92.1L434.0 93.5L436.0 95.1L438.0 96.9L440.0 98.5L442.0 99.9L444.0 101.0L446.0 101.8L448.0 102.0L450.0 101.8L452.0 101.0L454.0 99.9L456.0 98.5L458.0 96.9L460.0 95.1L462.0 93.5L464.0 92.1L466.0 91.0L468.0 90.2L470.0 90.0L472.0 90.2L474.0 91.0L476.0 92.1L478.0 93.5L480.0 95.1L482.0 96.9L484.0 98.5L486.0 99.9L488.0 101.0L490.0 101.8L492.0 102.0L494.0 101.8L496.0 101.0L498.0 99.9L500.0 98.5L502.0 96.9L504.0 95.1L506.0 93.5L508.0 92.1L510.0 91.0L512.0 90.2L514.0 90.0L516.0 90.2L518.0 91.0L520.0 92.1L522.0 93.5L524.0 95.1L526.0 96.9L528.0 98.5L530.0 99.9L532.0 101.0L534.0 101.8L536.0 102.0L538.0 101.8L540.0 101.0L542.0 99.9L544.0 98.5L546.0 96.9L548.0 95.1L550.0 93.5L552.0 92.1L554.0 91.0L556.0 90.2L558.0 90.0L560.0 90.2L562.0 91.0L564.0 92.1L566.0 93.5L568.0 95.1L570.0 96.9L572.0 98.5L574.0 99.9L576.0 101.0L576 430L24 430Z\" fill=\"url(#a3-warm)\" opacity=\"0\"/>\n</g>\n<path class=\"a3-surface\" d=\"M24.0 92.1C24.3 91.9 25.3 91.3 26.0 91.0C26.7 90.6 27.3 90.4 28.0 90.2C28.7 90.1 29.3 90.0 30.0 90.0C30.7 90.0 31.3 90.1 32.0 90.2C32.7 90.4 33.3 90.6 34.0 91.0C34.7 91.3 35.3 91.6 36.0 92.1C36.7 92.5 37.3 93.0 38.0 93.5C38.7 94.0 39.3 94.6 40.0 95.1C40.7 95.7 41.3 96.3 42.0 96.9C42.7 97.4 43.3 98.0 44.0 98.5C44.7 99.0 45.3 99.5 46.0 99.9C46.7 100.4 47.3 100.7 48.0 101.0C48.7 101.4 49.3 101.6 50.0 101.8C50.7 101.9 51.3 102.0 52.0 102.0C52.7 102.0 53.3 101.9 54.0 101.8C54.7 101.6 55.3 101.4 56.0 101.0C56.7 100.7 57.3 100.4 58.0 99.9C58.7 99.5 59.3 99.0 60.0 98.5C60.7 98.0 61.3 97.4 62.0 96.9C62.7 96.3 63.3 95.7 64.0 95.1C64.7 94.6 65.3 94.0 66.0 93.5C66.7 93.0 67.3 92.5 68.0 92.1C68.7 91.6 69.3 91.3 70.0 91.0C70.7 90.6 71.3 90.4 72.0 90.2C72.7 90.1 73.3 90.0 74.0 90.0C74.7 90.0 75.3 90.1 76.0 90.2C76.7 90.4 77.3 90.6 78.0 91.0C78.7 91.3 79.3 91.6 80.0 92.1C80.7 92.5 81.3 93.0 82.0 93.5C82.7 94.0 83.3 94.6 84.0 95.1C84.7 95.7 85.3 96.3 86.0 96.9C86.7 97.4 87.3 98.0 88.0 98.5C88.7 99.0 89.3 99.5 90.0 99.9C90.7 100.4 91.3 100.7 92.0 101.0C92.7 101.4 93.3 101.6 94.0 101.8C94.7 101.9 95.3 102.0 96.0 102.0C96.7 102.0 97.3 101.9 98.0 101.8C98.7 101.6 99.3 101.4 100.0 101.0C100.7 100.7 101.3 100.4 102.0 99.9C102.7 99.5 103.3 99.0 104.0 98.5C104.7 98.0 105.3 97.4 106.0 96.9C106.7 96.3 107.3 95.7 108.0 95.1C108.7 94.6 109.3 94.0 110.0 93.5C110.7 93.0 111.3 92.5 112.0 92.1C112.7 91.6 113.3 91.3 114.0 91.0C114.7 90.6 115.3 90.4 116.0 90.2C116.7 90.1 117.3 90.0 118.0 90.0C118.7 90.0 119.3 90.1 120.0 90.2C120.7 90.4 121.3 90.6 122.0 91.0C122.7 91.3 123.3 91.6 124.0 92.1C124.7 92.5 125.3 93.0 126.0 93.5C126.7 94.0 127.3 94.6 128.0 95.1C128.7 95.7 129.3 96.3 130.0 96.9C130.7 97.4 131.3 98.0 132.0 98.5C132.7 99.0 133.3 99.5 134.0 99.9C134.7 100.4 135.3 100.7 136.0 101.0C136.7 101.4 137.3 101.6 138.0 101.8C138.7 101.9 139.3 102.0 140.0 102.0C140.7 102.0 141.3 101.9 142.0 101.8C142.7 101.6 143.3 101.4 144.0 101.0C144.7 100.7 145.3 100.4 146.0 99.9C146.7 99.5 147.3 99.0 148.0 98.5C148.7 98.0 149.3 97.4 150.0 96.9C150.7 96.3 151.3 95.7 152.0 95.1C152.7 94.6 153.3 94.0 154.0 93.5C154.7 93.0 155.3 92.5 156.0 92.1C156.7 91.6 157.3 91.3 158.0 91.0C158.7 90.6 159.3 90.4 160.0 90.2C160.7 90.1 161.3 90.0 162.0 90.0C162.7 90.0 163.3 90.1 164.0 90.2C164.7 90.4 165.3 90.6 166.0 91.0C166.7 91.3 167.3 91.6 168.0 92.1C168.7 92.5 169.3 93.0 170.0 93.5C170.7 94.0 171.3 94.6 172.0 95.1C172.7 95.7 173.3 96.3 174.0 96.9C174.7 97.4 175.3 98.0 176.0 98.5C176.7 99.0 177.3 99.5 178.0 99.9C178.7 100.4 179.3 100.7 180.0 101.0C180.7 101.4 181.3 101.6 182.0 101.8C182.7 101.9 183.3 102.0 184.0 102.0C184.7 102.0 185.3 101.9 186.0 101.8C186.7 101.6 187.3 101.4 188.0 101.0C188.7 100.7 189.3 100.4 190.0 99.9C190.7 99.5 191.3 99.0 192.0 98.5C192.7 98.0 193.3 97.4 194.0 96.9C194.7 96.3 195.3 95.7 196.0 95.1C196.7 94.6 197.3 94.0 198.0 93.5C198.7 93.0 199.3 92.5 200.0 92.1C200.7 91.6 201.3 91.3 202.0 91.0C202.7 90.6 203.3 90.4 204.0 90.2C204.7 90.1 205.3 90.0 206.0 90.0C206.7 90.0 207.3 90.1 208.0 90.2C208.7 90.4 209.3 90.6 210.0 91.0C210.7 91.3 211.3 91.6 212.0 92.1C212.7 92.5 213.3 93.0 214.0 93.5C214.7 94.0 215.3 94.6 216.0 95.1C216.7 95.7 217.3 96.3 218.0 96.9C218.7 97.4 219.3 98.0 220.0 98.5C220.7 99.0 221.3 99.5 222.0 99.9C222.7 100.4 223.3 100.7 224.0 101.0C224.7 101.4 225.3 101.6 226.0 101.8C226.7 101.9 227.3 102.0 228.0 102.0C228.7 102.0 229.3 101.9 230.0 101.8C230.7 101.6 231.3 101.4 232.0 101.0C232.7 100.7 233.3 100.4 234.0 99.9C234.7 99.5 235.3 99.0 236.0 98.5C236.7 98.0 237.3 97.4 238.0 96.9C238.7 96.3 239.3 95.7 240.0 95.1C240.7 94.6 241.3 94.0 242.0 93.5C242.7 93.0 243.3 92.5 244.0 92.1C244.7 91.6 245.3 91.3 246.0 91.0C246.7 90.6 247.3 90.4 248.0 90.2C248.7 90.1 249.3 90.0 250.0 90.0C250.7 90.0 251.3 90.1 252.0 90.2C252.7 90.4 253.3 90.6 254.0 91.0C254.7 91.3 255.3 91.6 256.0 92.1C256.7 92.5 257.3 93.0 258.0 93.5C258.7 94.0 259.3 94.6 260.0 95.1C260.7 95.7 261.3 96.3 262.0 96.9C262.7 97.4 263.3 98.0 264.0 98.5C264.7 99.0 265.3 99.5 266.0 99.9C266.7 100.4 267.3 100.7 268.0 101.0C268.7 101.4 269.3 101.6 270.0 101.8C270.7 101.9 271.3 102.0 272.0 102.0C272.7 102.0 273.3 101.9 274.0 101.8C274.7 101.6 275.3 101.4 276.0 101.0C276.7 100.7 277.3 100.4 278.0 99.9C278.7 99.5 279.3 99.0 280.0 98.5C280.7 98.0 281.3 97.4 282.0 96.9C282.7 96.3 283.3 95.7 284.0 95.1C284.7 94.6 285.3 94.0 286.0 93.5C286.7 93.0 287.3 92.5 288.0 92.1C288.7 91.6 289.3 91.3 290.0 91.0C290.7 90.6 291.3 90.4 292.0 90.2C292.7 90.1 293.3 90.0 294.0 90.0C294.7 90.0 295.3 90.1 296.0 90.2C296.7 90.4 297.3 90.6 298.0 91.0C298.7 91.3 299.3 91.6 300.0 92.1C300.7 92.5 301.3 93.0 302.0 93.5C302.7 94.0 303.3 94.6 304.0 95.1C304.7 95.7 305.3 96.3 306.0 96.9C306.7 97.4 307.3 98.0 308.0 98.5C308.7 99.0 309.3 99.5 310.0 99.9C310.7 100.4 311.3 100.7 312.0 101.0C312.7 101.4 313.3 101.6 314.0 101.8C314.7 101.9 315.3 102.0 316.0 102.0C316.7 102.0 317.3 101.9 318.0 101.8C318.7 101.6 319.3 101.4 320.0 101.0C320.7 100.7 321.3 100.4 322.0 99.9C322.7 99.5 323.3 99.0 324.0 98.5C324.7 98.0 325.3 97.4 326.0 96.9C326.7 96.3 327.3 95.7 328.0 95.1C328.7 94.6 329.3 94.0 330.0 93.5C330.7 93.0 331.3 92.5 332.0 92.1C332.7 91.6 333.3 91.3 334.0 91.0C334.7 90.6 335.3 90.4 336.0 90.2C336.7 90.1 337.3 90.0 338.0 90.0C338.7 90.0 339.3 90.1 340.0 90.2C340.7 90.4 341.3 90.6 342.0 91.0C342.7 91.3 343.3 91.6 344.0 92.1C344.7 92.5 345.3 93.0 346.0 93.5C346.7 94.0 347.3 94.6 348.0 95.1C348.7 95.7 349.3 96.3 350.0 96.9C350.7 97.4 351.3 98.0 352.0 98.5C352.7 99.0 353.3 99.5 354.0 99.9C354.7 100.4 355.3 100.7 356.0 101.0C356.7 101.4 357.3 101.6 358.0 101.8C358.7 101.9 359.3 102.0 360.0 102.0C360.7 102.0 361.3 101.9 362.0 101.8C362.7 101.6 363.3 101.4 364.0 101.0C364.7 100.7 365.3 100.4 366.0 99.9C366.7 99.5 367.3 99.0 368.0 98.5C368.7 98.0 369.3 97.4 370.0 96.9C370.7 96.3 371.3 95.7 372.0 95.1C372.7 94.6 373.3 94.0 374.0 93.5C374.7 93.0 375.3 92.5 376.0 92.1C376.7 91.6 377.3 91.3 378.0 91.0C378.7 90.6 379.3 90.4 380.0 90.2C380.7 90.1 381.3 90.0 382.0 90.0C382.7 90.0 383.3 90.1 384.0 90.2C384.7 90.4 385.3 90.6 386.0 91.0C386.7 91.3 387.3 91.6 388.0 92.1C388.7 92.5 389.3 93.0 390.0 93.5C390.7 94.0 391.3 94.6 392.0 95.1C392.7 95.7 393.3 96.3 394.0 96.9C394.7 97.4 395.3 98.0 396.0 98.5C396.7 99.0 397.3 99.5 398.0 99.9C398.7 100.4 399.3 100.7 400.0 101.0C400.7 101.4 401.3 101.6 402.0 101.8C402.7 101.9 403.3 102.0 404.0 102.0C404.7 102.0 405.3 101.9 406.0 101.8C406.7 101.6 407.3 101.4 408.0 101.0C408.7 100.7 409.3 100.4 410.0 99.9C410.7 99.5 411.3 99.0 412.0 98.5C412.7 98.0 413.3 97.4 414.0 96.9C414.7 96.3 415.3 95.7 416.0 95.1C416.7 94.6 417.3 94.0 418.0 93.5C418.7 93.0 419.3 92.5 420.0 92.1C420.7 91.6 421.3 91.3 422.0 91.0C422.7 90.6 423.3 90.4 424.0 90.2C424.7 90.1 425.3 90.0 426.0 90.0C426.7 90.0 427.3 90.1 428.0 90.2C428.7 90.4 429.3 90.6 430.0 91.0C430.7 91.3 431.3 91.6 432.0 92.1C432.7 92.5 433.3 93.0 434.0 93.5C434.7 94.0 435.3 94.6 436.0 95.1C436.7 95.7 437.3 96.3 438.0 96.9C438.7 97.4 439.3 98.0 440.0 98.5C440.7 99.0 441.3 99.5 442.0 99.9C442.7 100.4 443.3 100.7 444.0 101.0C444.7 101.4 445.3 101.6 446.0 101.8C446.7 101.9 447.3 102.0 448.0 102.0C448.7 102.0 449.3 101.9 450.0 101.8C450.7 101.6 451.3 101.4 452.0 101.0C452.7 100.7 453.3 100.4 454.0 99.9C454.7 99.5 455.3 99.0 456.0 98.5C456.7 98.0 457.3 97.4 458.0 96.9C458.7 96.3 459.3 95.7 460.0 95.1C460.7 94.6 461.3 94.0 462.0 93.5C462.7 93.0 463.3 92.5 464.0 92.1C464.7 91.6 465.3 91.3 466.0 91.0C466.7 90.6 467.3 90.4 468.0 90.2C468.7 90.1 469.3 90.0 470.0 90.0C470.7 90.0 471.3 90.1 472.0 90.2C472.7 90.4 473.3 90.6 474.0 91.0C474.7 91.3 475.3 91.6 476.0 92.1C476.7 92.5 477.3 93.0 478.0 93.5C478.7 94.0 479.3 94.6 480.0 95.1C480.7 95.7 481.3 96.3 482.0 96.9C482.7 97.4 483.3 98.0 484.0 98.5C484.7 99.0 485.3 99.5 486.0 99.9C486.7 100.4 487.3 100.7 488.0 101.0C488.7 101.4 489.3 101.6 490.0 101.8C490.7 101.9 491.3 102.0 492.0 102.0C492.7 102.0 493.3 101.9 494.0 101.8C494.7 101.6 495.3 101.4 496.0 101.0C496.7 100.7 497.3 100.4 498.0 99.9C498.7 99.5 499.3 99.0 500.0 98.5C500.7 98.0 501.3 97.4 502.0 96.9C502.7 96.3 503.3 95.7 504.0 95.1C504.7 94.6 505.3 94.0 506.0 93.5C506.7 93.0 507.3 92.5 508.0 92.1C508.7 91.6 509.3 91.3 510.0 91.0C510.7 90.6 511.3 90.4 512.0 90.2C512.7 90.1 513.3 90.0 514.0 90.0C514.7 90.0 515.3 90.1 516.0 90.2C516.7 90.4 517.3 90.6 518.0 91.0C518.7 91.3 519.3 91.6 520.0 92.1C520.7 92.5 521.3 93.0 522.0 93.5C522.7 94.0 523.3 94.6 524.0 95.1C524.7 95.7 525.3 96.3 526.0 96.9C526.7 97.4 527.3 98.0 528.0 98.5C528.7 99.0 529.3 99.5 530.0 99.9C530.7 100.4 531.3 100.7 532.0 101.0C532.7 101.4 533.3 101.6 534.0 101.8C534.7 101.9 535.3 102.0 536.0 102.0C536.7 102.0 537.3 101.9 538.0 101.8C538.7 101.6 539.3 101.4 540.0 101.0C540.7 100.7 541.3 100.4 542.0 99.9C542.7 99.5 543.3 99.0 544.0 98.5C544.7 98.0 545.3 97.4 546.0 96.9C546.7 96.3 547.3 95.7 548.0 95.1C548.7 94.6 549.3 94.0 550.0 93.5C550.7 93.0 551.3 92.5 552.0 92.1C552.7 91.6 553.3 91.3 554.0 91.0C554.7 90.6 555.3 90.4 556.0 90.2C556.7 90.1 557.3 90.0 558.0 90.0C558.7 90.0 559.3 90.1 560.0 90.2C560.7 90.4 561.3 90.6 562.0 91.0C562.7 91.3 563.3 91.6 564.0 92.1C564.7 92.5 565.3 93.0 566.0 93.5C566.7 94.0 567.3 94.6 568.0 95.1C568.7 95.7 569.3 96.3 570.0 96.9C570.7 97.4 571.3 98.0 572.0 98.5C572.7 99.0 573.3 99.5 574.0 99.9C574.7 100.4 575.7 100.9 576.0 101.0\"/>\n<path class=\"a3-pores\" d=\"M115.8 91.0a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M423.8 91.0a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0\"/>\n<path class=\"a3-cut\" d=\"M24 92.1V430M576 101.0V430\"/>\n</g>\n<g class=\"a3-mon\">\n<rect class=\"a3-mon-bg\" x=\"24\" y=\"468\" width=\"552\" height=\"150\" rx=\"12\"/>\n<text class=\"a3-mon-title\" x=\"46\" y=\"496\">Finger skin temperature</text>\n<rect class=\"a3-open-band\" x=\"101.6\" y=\"508\" width=\"53.7\" height=\"78\"/>\n<text class=\"a3-mon-band\" x=\"165.0\" y=\"578\">← shunts open</text>\n<path class=\"a3-grid\" d=\"M86 519.4H548\"/>\n<text class=\"a3-tick\" x=\"78\" y=\"525.4\" text-anchor=\"end\">+2.7°</text>\n<path class=\"a3-axis\" d=\"M86 586H548\"/>\n<path class=\"a3-axis\" d=\"M100.9 586v5\"/><text class=\"a3-tick\" x=\"100.9\" y=\"610\" text-anchor=\"middle\">0</text><path class=\"a3-axis\" d=\"M249.9 586v5\"/><text class=\"a3-tick\" x=\"249.9\" y=\"610\" text-anchor=\"middle\">10</text><path class=\"a3-axis\" d=\"M399.0 586v5\"/><text class=\"a3-tick\" x=\"399.0\" y=\"610\" text-anchor=\"middle\">20</text><path class=\"a3-axis\" d=\"M548.0 586v5\"/><text class=\"a3-tick\" x=\"558.0\" y=\"610\" text-anchor=\"end\">30 min</text>\n<path class=\"a3-curve-ghost\" d=\"M86.0 586.0L87.5 586.0L89.0 586.0L90.5 586.0L92.0 586.0L93.5 586.0L94.9 586.0L96.4 586.0L97.9 586.0L99.4 586.0L100.9 586.0L102.4 584.1L103.9 579.1L105.4 571.6L106.9 562.6L108.4 552.7L109.8 542.8L111.3 533.8L112.8 526.3L114.3 521.3L115.8 519.4L117.3 520.0L118.8 520.7L120.3 521.3L121.8 521.9L123.3 522.5L124.7 523.2L126.2 523.8L127.7 524.4L129.2 525.0L130.7 525.5L132.2 526.1L133.7 526.7L135.2 527.3L136.7 527.8L138.2 528.4L139.7 529.0L141.1 529.5L142.6 530.0L144.1 530.6L145.6 531.1L147.1 531.6L148.6 532.2L150.1 532.7L151.6 533.2L153.1 533.7L154.6 534.2L156.0 534.7L157.5 535.2L159.0 535.7L160.5 536.2L162.0 536.7L163.5 537.1L165.0 537.6L166.5 538.1L168.0 538.5L169.5 539.0L170.9 539.4L172.4 539.9L173.9 540.3L175.4 540.8L176.9 541.2L178.4 541.6L179.9 542.1L181.4 542.5L182.9 542.9L184.4 543.3L185.9 543.7L187.3 544.1L188.8 544.5L190.3 544.9L191.8 545.3L193.3 545.7L194.8 546.1L196.3 546.5L197.8 546.9L199.3 547.3L200.8 547.6L202.2 548.0L203.7 548.4L205.2 548.7L206.7 549.1L208.2 549.4L209.7 549.8L211.2 550.1L212.7 550.5L214.2 550.8L215.7 551.2L217.1 551.5L218.6 551.8L220.1 552.2L221.6 552.5L223.1 552.8L224.6 553.1L226.1 553.5L227.6 553.8L229.1 554.1L230.6 554.4L232.1 554.7L233.5 555.0L235.0 555.3L236.5 555.6L238.0 555.9L239.5 556.2L241.0 556.5L242.5 556.7L244.0 557.0L245.5 557.3L247.0 557.6L248.4 557.9L249.9 558.1L251.4 558.4L252.9 558.7L254.4 558.9L255.9 559.2L257.4 559.4L258.9 559.7L260.4 560.0L261.9 560.2L263.3 560.4L264.8 560.7L266.3 560.9L267.8 561.2L269.3 561.4L270.8 561.7L272.3 561.9L273.8 562.1L275.3 562.4L276.8 562.6L278.3 562.8L279.7 563.0L281.2 563.3L282.7 563.5L284.2 563.7L285.7 563.9L287.2 564.1L288.7 564.3L290.2 564.5L291.7 564.7L293.2 564.9L294.6 565.1L296.1 565.3L297.6 565.5L299.1 565.7L300.6 565.9L302.1 566.1L303.6 566.3L305.1 566.5L306.6 566.7L308.1 566.9L309.5 567.1L311.0 567.3L312.5 567.4L314.0 567.6L315.5 567.8L317.0 568.0L318.5 568.1L320.0 568.3L321.5 568.5L323.0 568.7L324.5 568.8L325.9 569.0L327.4 569.1L328.9 569.3L330.4 569.5L331.9 569.6L333.4 569.8L334.9 569.9L336.4 570.1L337.9 570.3L339.4 570.4L340.8 570.6L342.3 570.7L343.8 570.8L345.3 571.0L346.8 571.1L348.3 571.3L349.8 571.4L351.3 571.6L352.8 571.7L354.3 571.8L355.7 572.0L357.2 572.1L358.7 572.2L360.2 572.4L361.7 572.5L363.2 572.6L364.7 572.8L366.2 572.9L367.7 573.0L369.2 573.1L370.7 573.3L372.1 573.4L373.6 573.5L375.1 573.6L376.6 573.8L378.1 573.9L379.6 574.0L381.1 574.1L382.6 574.2L384.1 574.3L385.6 574.4L387.0 574.6L388.5 574.7L390.0 574.8L391.5 574.9L393.0 575.0L394.5 575.1L396.0 575.2L397.5 575.3L399.0 575.4L400.5 575.5L401.9 575.6L403.4 575.7L404.9 575.8L406.4 575.9L407.9 576.0L409.4 576.1L410.9 576.2L412.4 576.3L413.9 576.4L415.4 576.5L416.9 576.6L418.3 576.7L419.8 576.8L421.3 576.8L422.8 576.9L424.3 577.0L425.8 577.1L427.3 577.2L428.8 577.3L430.3 577.4L431.8 577.4L433.2 577.5L434.7 577.6L436.2 577.7L437.7 577.8L439.2 577.8L440.7 577.9L442.2 578.0L443.7 578.1L445.2 578.2L446.7 578.2L448.1 578.3L449.6 578.4L451.1 578.5L452.6 578.5L454.1 578.6L455.6 578.7L457.1 578.7L458.6 578.8L460.1 578.9L461.6 578.9L463.1 579.0L464.5 579.1L466.0 579.1L467.5 579.2L469.0 579.3L470.5 579.3L472.0 579.4L473.5 579.5L475.0 579.5L476.5 579.6L478.0 579.7L479.4 579.7L480.9 579.8L482.4 579.8L483.9 579.9L485.4 580.0L486.9 580.0L488.4 580.1L489.9 580.1L491.4 580.2L492.9 580.2L494.3 580.3L495.8 580.4L497.3 580.4L498.8 580.5L500.3 580.5L501.8 580.6L503.3 580.6L504.8 580.7L506.3 580.7L507.8 580.8L509.3 580.8L510.7 580.9L512.2 580.9L513.7 581.0L515.2 581.0L516.7 581.1L518.2 581.1L519.7 581.2L521.2 581.2L522.7 581.3L524.2 581.3L525.6 581.3L527.1 581.4L528.6 581.4L530.1 581.5L531.6 581.5L533.1 581.6L534.6 581.6L536.1 581.7L537.6 581.7L539.1 581.7L540.5 581.8L542.0 581.8L543.5 581.9L545.0 581.9L546.5 581.9L548.0 582.0\"/>\n<path class=\"a3-curve\" data-part=\"curve\"/>\n<circle class=\"a3-dot\" data-part=\"mdot\" r=\"5.5\"/>\n</g>\n</svg></div><p class=\"a3-scene\" data-scene></p><span class=\"a3-sr\" role=\"status\" aria-live=\"polite\" data-status></span><div class=\"opt-controls\"><div class=\"opt-seg\" role=\"radiogroup\" aria-label=\"Show\" data-control=\"mode\"><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"flash\" aria-checked=\"true\" tabindex=\"0\">A hot flash</button><button type=\"button\" role=\"radio\" class=\"opt-seg-btn\" data-value=\"calm\" aria-checked=\"false\" tabindex=\"-1\">Between flashes</button></div></div><div class=\"opt-foot\"><span class=\"opt-hint\">Watch a flash · time speeds up after minute 7</span><dl class=\"opt-readout\" data-readout aria-hidden=\"true\"><div class=\"opt-stat\" data-stat=\"min\"><dt>Minute</dt><dd data-r=\"min\">—</dd></div><div class=\"opt-stat\" data-stat=\"skin\"><dt>Finger skin</dt><dd data-r=\"skin\">+0.0 °C</dd></div><div class=\"opt-stat\" data-stat=\"hr\"><dt>Heart rate</dt><dd data-r=\"hr\">+0 bpm</dd></div></dl></div></div><figcaption class=\"iso-legend\"><span class=\"iso-keys\"><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"ava\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M1.5 5h13\"/></svg>Shunt, wrapped in muscle</span><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"artb\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M1.5 5h13\"/></svg>Oxygen-rich blood</span><span class=\"iso-key\"><svg class=\"iso-swatch\" data-mark=\"nerve\" viewBox=\"0 0 16 10\" aria-hidden=\"true\"><path d=\"M1.5 5h13\"/></svg>Nerve keeping shunts shut</span></span><span class=\"iso-caption\"><span class=\"a3-par\">Fingertips, palms and toes have a shortcut in their skin: coiled shunts (arteriovenous anastomoses) that join small arteries straight to the veins under the surface, skipping the capillaries. Each is wrapped in muscle, and a nerve keeps it squeezed shut most of the time.</span><span class=\"a3-par\">In a hot flash the brain's heat-loss centre releases that squeeze. The shunts open, warm blood floods the veins just under the skin, and the finger's skin temperature rises about 2.7 °C within a minute while the heart beats about 10 beats a minute faster. The flash itself lasts a few minutes, but the finger stays warm for about half an hour.</span><span class=\"a3-par\"><small>Typical values from laboratory recordings of women with hot flashes; the size of the rise varies widely (1–7 °C). Time runs fast after minute 7. Drawn far larger than life and simplified: real skin has many more shunts and loops.</small></span></span></figcaption></figure>" + "</div>";
    mount(root.querySelector(".opt-figure"));
  }
}
customElements.define("optimal-fig-finger-skin", Fig);
})();
